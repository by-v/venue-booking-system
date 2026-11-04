import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  bookingCounter,
  customer,
  dateLock,
  payment,
  reservation,
  reservationActivity,
  reservationStatusHistory,
} from "@/lib/db/schema";
import { lockDatesForEvent } from "@/modules/availability/dates";
import {
  bookingNumberYear,
  formatBookingNumber,
} from "@/modules/reservation/booking-number";
import {
  addReservationItem,
  confirmReservation,
} from "@/modules/reservation/mutations";
import { calculateReservationTotal } from "@/modules/reservation/pricing";

import { seedReservation } from "./helpers/seed-reservation";

async function addVerifiedPayment(
  reservationId: string,
  actorUserId: string,
  amountRupiah = 5_000_000,
): Promise<void> {
  await db.insert(payment).values({
    id: `pembayaran-${reservationId}`,
    reservationId,
    amountRupiah,
    verificationStatus: "TERVERIFIKASI",
    recordedByUserId: actorUserId,
  });
}

async function locksFor(reservationId: string) {
  const rows = await db
    .select({ date: dateLock.date, kind: dateLock.kind })
    .from(dateLock)
    .where(eq(dateLock.reservationId, reservationId));
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

async function stateOf(reservationId: string) {
  const rows = await db
    .select({
      status: reservation.status,
      bookingNumber: reservation.bookingNumber,
      dpForfeited: reservation.dpForfeited,
      customerId: reservation.customerId,
    })
    .from(reservation)
    .where(eq(reservation.id, reservationId));
  const selected = rows[0];
  if (!selected) {
    throw new Error("Reservasi tidak ditemukan");
  }

  const customerRows = await db
    .select({ status: customer.status })
    .from(customer)
    .where(eq(customer.id, selected.customerId));

  return {
    ...selected,
    customerStatus: customerRows[0]?.status,
  };
}

async function counterRowsFor(year: string) {
  return db
    .select()
    .from(bookingCounter)
    .where(eq(bookingCounter.year, Number(year)));
}

async function historyFor(reservationId: string) {
  return db
    .select()
    .from(reservationStatusHistory)
    .where(eq(reservationStatusHistory.reservationId, reservationId));
}

async function activitiesFor(reservationId: string) {
  return db
    .select()
    .from(reservationActivity)
    .where(eq(reservationActivity.reservationId, reservationId));
}

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (error: unknown) => error,
  );
}

describe("mutasi konfirmasi reservasi", () => {
  it("mengonfirmasi PENDING, mengunci tanggal, menerbitkan nomor, dan mencatat jejak", async () => {
    const { reservationId, actorUserId } = await seedReservation({
      eventDate: "2027-03-20",
      setupDaysBefore: 2,
    });
    await addVerifiedPayment(reservationId, actorUserId, 5_000_000);

    const result = await confirmReservation({ reservationId, actorUserId });

    expect(result.bookingNumber).toBe(
      formatBookingNumber(bookingNumberYear(), 1),
    );
    expect(await locksFor(reservationId)).toEqual(
      lockDatesForEvent({ eventDate: "2027-03-20", setupDaysBefore: 2 }),
    );

    const state = await stateOf(reservationId);
    expect(state).toMatchObject({
      status: "DITERIMA",
      bookingNumber: result.bookingNumber,
      dpForfeited: false,
      customerStatus: "CLIENT",
    });

    const history = await historyFor(reservationId);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      fromStatus: "PENDING",
      toStatus: "DITERIMA",
      reasonCode: null,
      actorType: "ADMIN",
      actorUserId,
    });
    expect(history[0]?.reason).toContain("DP terverifikasi");

    const activities = await activitiesFor(reservationId);
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      type: "STATUS_CHANGE",
      actorType: "ADMIN",
      actorUserId,
    });
    expect(activities[0]?.note).toContain(result.bookingNumber);

    const counters = await counterRowsFor(bookingNumberYear());
    expect(counters).toHaveLength(1);
    expect(counters[0]?.lastSequence).toBe(1);
  });

  it("mengonfirmasi reservasi DITANGGUHKAN", async () => {
    const { reservationId, actorUserId } = await seedReservation({
      status: "DITANGGUHKAN",
      eventDate: "2027-03-20",
    });
    await addVerifiedPayment(reservationId, actorUserId, 5_000_000);

    await confirmReservation({ reservationId, actorUserId });

    const state = await stateOf(reservationId);
    expect(state.status).toBe("DITERIMA");
    expect(state.customerStatus).toBe("CLIENT");

    const history = await historyFor(reservationId);
    expect(history[0]).toMatchObject({
      fromStatus: "DITANGGUHKAN",
      toStatus: "DITERIMA",
    });
  });

  it("menolak DP di bawah minimum tanpa mengubah data", async () => {
    const { reservationId, actorUserId } = await seedReservation();
    await addVerifiedPayment(reservationId, actorUserId, 4_900_000);

    const error = await captureError(
      confirmReservation({ reservationId, actorUserId }),
    );

    expect(error).toMatchObject({ code: "DP_BELOW_MINIMUM" });
    expect(await stateOf(reservationId)).toMatchObject({
      status: "PENDING",
      bookingNumber: null,
      customerStatus: "CALON",
    });
    expect(await locksFor(reservationId)).toHaveLength(0);
    expect(await counterRowsFor(bookingNumberYear())).toHaveLength(0);
  });

  it("pembayaran belum sah tidak dihitung sebagai DP", async () => {
    const { reservationId, actorUserId } = await seedReservation();

    const error = await captureError(
      confirmReservation({ reservationId, actorUserId }),
    );

    expect(error).toMatchObject({ code: "DP_BELOW_MINIMUM" });
    expect(await stateOf(reservationId)).toMatchObject({
      status: "PENDING",
      bookingNumber: null,
      customerStatus: "CALON",
    });
    expect(await locksFor(reservationId)).toHaveLength(0);
  });

  it("menolak status yang tidak dapat dikonfirmasi", async () => {
    const bookingNumber = formatBookingNumber(bookingNumberYear(), 7);
    const { reservationId, actorUserId } = await seedReservation({
      status: "DITERIMA",
      bookingNumber,
    });

    const error = await captureError(
      confirmReservation({ reservationId, actorUserId }),
    );

    expect(error).toMatchObject({ code: "INVALID_STATE" });
    expect(await stateOf(reservationId)).toMatchObject({
      status: "DITERIMA",
      bookingNumber,
    });
    expect(await locksFor(reservationId)).toHaveLength(0);
  });

  it("perubahan total setelah konfirmasi tidak membuka tanggal", async () => {
    const { reservationId, actorUserId, packagePriceRupiah } =
      await seedReservation({
        eventDate: "2027-03-20",
        setupDaysBefore: 1,
      });
    await addVerifiedPayment(reservationId, actorUserId, 5_000_000);
    await confirmReservation({ reservationId, actorUserId });
    const locksAfterConfirmation = await locksFor(reservationId);

    await addReservationItem({
      reservationId,
      description: "Sewa tenda tambahan",
      amountRupiah: 1_500_000,
      actorUserId,
    });

    const total = calculateReservationTotal(packagePriceRupiah, [1_500_000]);
    expect(total).toBe(21_500_000);
    expect(await stateOf(reservationId)).toMatchObject({
      status: "DITERIMA",
    });
    expect(await locksFor(reservationId)).toEqual(locksAfterConfirmation);
  });
});

describe("konflik tanggal konfirmasi", () => {
  it("menolak tanggal acara yang sudah dikunci reservasi lain", async () => {
    const target = await seedReservation({
      reservationId: "reservasi-target",
      customerId: "customer-target",
      customerWhatsapp: "6281111111111",
      eventDate: "2027-03-20",
      setupDaysBefore: 1,
    });
    const other = await seedReservation({
      reservationId: "reservasi-lain",
      customerId: "customer-lain",
      customerWhatsapp: "6282222222222",
      eventDate: "2027-04-10",
    });
    await addVerifiedPayment(target.reservationId, target.actorUserId);
    await db.insert(dateLock).values({
      date: "2027-03-20",
      kind: "EVENT",
      reservationId: other.reservationId,
    });

    const error = await captureError(
      confirmReservation({
        reservationId: target.reservationId,
        actorUserId: target.actorUserId,
      }),
    );

    expect(error).toMatchObject({ code: "DATE_CONFLICT" });
    expect(await locksFor(target.reservationId)).toHaveLength(0);
    expect(await locksFor(other.reservationId)).toHaveLength(1);
    expect(await stateOf(target.reservationId)).toMatchObject({
      status: "PENDING",
      bookingNumber: null,
      customerStatus: "CALON",
    });
    expect(await counterRowsFor(bookingNumberYear())).toHaveLength(0);
    expect(await historyFor(target.reservationId)).toHaveLength(0);
  });

  it("menolak tanggal setup yang sudah dikunci reservasi lain", async () => {
    const target = await seedReservation({
      reservationId: "reservasi-target",
      customerId: "customer-target",
      customerWhatsapp: "6281111111111",
      eventDate: "2027-03-20",
      setupDaysBefore: 2,
    });
    const other = await seedReservation({
      reservationId: "reservasi-lain",
      customerId: "customer-lain",
      customerWhatsapp: "6282222222222",
      eventDate: "2027-04-10",
    });
    await addVerifiedPayment(target.reservationId, target.actorUserId);
    await db.insert(dateLock).values({
      date: "2027-03-19",
      kind: "SETUP",
      reservationId: other.reservationId,
    });

    const error = await captureError(
      confirmReservation({
        reservationId: target.reservationId,
        actorUserId: target.actorUserId,
      }),
    );

    expect(error).toMatchObject({ code: "DATE_CONFLICT" });
    expect(await locksFor(target.reservationId)).toHaveLength(0);
    expect(await stateOf(target.reservationId)).toMatchObject({
      status: "PENDING",
      bookingNumber: null,
      customerStatus: "CALON",
    });
  });

  it("constraint date_lock tetap menolak tanggal ganda", async () => {
    const first = await seedReservation({ reservationId: "reservasi-a" });
    const second = await seedReservation({
      reservationId: "reservasi-b",
      customerId: "customer-b",
      customerWhatsapp: "6282222222222",
      eventDate: "2027-04-10",
    });

    await db.insert(dateLock).values({
      date: "2027-03-20",
      kind: "EVENT",
      reservationId: first.reservationId,
    });

    await expect(
      db.insert(dateLock).values({
        date: "2027-03-20",
        kind: "SETUP",
        reservationId: second.reservationId,
      }),
    ).rejects.toThrow();
  });
});

describe("rollback konfirmasi", () => {
  it("membatalkan seluruh perubahan bila nomor booking bentrok", async () => {
    const year = bookingNumberYear();
    const existingNumber = formatBookingNumber(year, 1);
    const target = await seedReservation({
      reservationId: "reservasi-target",
      customerId: "customer-target",
      customerWhatsapp: "6281111111111",
      eventDate: "2027-05-20",
      setupDaysBefore: 1,
    });
    await seedReservation({
      reservationId: "reservasi-lain",
      customerId: "customer-lain",
      customerWhatsapp: "6282222222222",
      eventDate: "2027-06-10",
      bookingNumber: existingNumber,
    });
    await addVerifiedPayment(target.reservationId, target.actorUserId, 5_000_000);
    await db.insert(bookingCounter).values({
      year: Number(year),
      lastSequence: 0,
    });

    const error = await captureError(
      confirmReservation({
        reservationId: target.reservationId,
        actorUserId: target.actorUserId,
      }),
    );

    expect(error).toBeInstanceOf(Error);
    expect((error as { code?: unknown }).code).not.toBe("DATE_CONFLICT");
    expect(await locksFor(target.reservationId)).toHaveLength(0);
    expect(await stateOf(target.reservationId)).toMatchObject({
      status: "PENDING",
      bookingNumber: null,
      customerStatus: "CALON",
    });
    const counters = await counterRowsFor(year);
    expect(counters).toHaveLength(1);
    expect(counters[0]?.lastSequence).toBe(0);
    expect(await historyFor(target.reservationId)).toHaveLength(0);
    expect(await activitiesFor(target.reservationId)).toHaveLength(0);
  });
});
