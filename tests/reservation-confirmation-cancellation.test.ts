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
import {
  addDays,
  lockDatesForEvent,
  todayInJakarta,
} from "@/modules/availability/dates";
import {
  bookingNumberYear,
  formatBookingNumber,
} from "@/modules/reservation/booking-number";
import {
  cancelAcceptedReservation,
  cancelReservation,
  confirmReservation,
} from "@/modules/reservation/mutations";

import { seedReservation } from "./helpers/seed-reservation";

async function addVerifiedPayment(
  reservationId: string,
  actorUserId: string,
): Promise<void> {
  await db.insert(payment).values({
    id: `pembayaran-${reservationId}`,
    reservationId,
    amountRupiah: 5_000_000,
    verificationStatus: "TERVERIFIKASI",
    recordedByUserId: actorUserId,
  });
}

async function setCustomerStatus(
  customerId: string,
  status: "CALON" | "CLIENT",
): Promise<void> {
  await db.update(customer).set({ status }).where(eq(customer.id, customerId));
}

async function stateOf(reservationId: string) {
  const rows = await db
    .select({
      status: reservation.status,
      bookingNumber: reservation.bookingNumber,
      dpForfeited: reservation.dpForfeited,
      paymentDueDateOverride: reservation.paymentDueDateOverride,
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

async function locksFor(reservationId: string) {
  return db
    .select({ date: dateLock.date, kind: dateLock.kind })
    .from(dateLock)
    .where(eq(dateLock.reservationId, reservationId));
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

async function seedAcceptedWithLocks(bookingNumber: string) {
  const seeded = await seedReservation({
    status: "DITERIMA",
    bookingNumber,
    eventDate: "2027-03-20",
    setupDaysBefore: 2,
  });
  await setCustomerStatus(seeded.customerId, "CLIENT");
  await db.insert(dateLock).values(
    lockDatesForEvent({ eventDate: "2027-03-20", setupDaysBefore: 2 }).map(
      (lock) => ({
        date: lock.date,
        kind: lock.kind,
        reservationId: seeded.reservationId,
      }),
    ),
  );
  return seeded;
}

describe("konfirmasi mendadak", () => {
  it("menetapkan batas pelunasan tiga hari setelah konfirmasi", async () => {
    const today = todayInJakarta();
    const eventDate = addDays(today, 10);
    const seeded = await seedReservation({
      reservationId: "reservasi-konfirmasi-mendadak",
      customerId: "customer-konfirmasi-mendadak",
      customerWhatsapp: "6281234700001",
      eventDate,
      payments: [{ amountRupiah: 5_000_000 }],
    });

    await confirmReservation({
      reservationId: seeded.reservationId,
      actorUserId: seeded.actorUserId,
    });

    expect(await stateOf(seeded.reservationId)).toMatchObject({
      status: "DITERIMA",
      paymentDueDateOverride: addDays(today, 3),
    });
  });

  it("tidak menetapkan batas melewati tanggal acara", async () => {
    const today = todayInJakarta();
    const eventDate = addDays(today, 2);
    const seeded = await seedReservation({
      reservationId: "reservasi-konfirmasi-sangat-mendadak",
      customerId: "customer-konfirmasi-sangat-mendadak",
      customerWhatsapp: "6281234700002",
      eventDate,
      payments: [{ amountRupiah: 5_000_000 }],
    });

    await confirmReservation({
      reservationId: seeded.reservationId,
      actorUserId: seeded.actorUserId,
    });

    expect(await stateOf(seeded.reservationId)).toMatchObject({
      status: "DITERIMA",
      paymentDueDateOverride: eventDate,
    });
  });
});

describe("pembatalan reservasi DITERIMA", () => {
  it("membatalkan, menghapus seluruh kunci, dan menandai DP hangus", async () => {
    const bookingNumber = formatBookingNumber(bookingNumberYear(), 1);
    const { reservationId, actorUserId } =
      await seedAcceptedWithLocks(bookingNumber);

    await cancelAcceptedReservation({
      reservationId,
      reason: "Acara dibatalkan oleh keluarga",
      reasonCode: "MUNDUR_CUSTOMER",
      actorUserId,
    });

    const state = await stateOf(reservationId);
    expect(state).toMatchObject({
      status: "DIBATALKAN",
      dpForfeited: true,
      bookingNumber,
      customerStatus: "CLIENT",
    });
    expect(await locksFor(reservationId)).toHaveLength(0);
    const allLocks = await db.select().from(dateLock);
    expect(allLocks).toHaveLength(0);

    const history = await historyFor(reservationId);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      fromStatus: "DITERIMA",
      toStatus: "DIBATALKAN",
      reason: "Acara dibatalkan oleh keluarga",
      reasonCode: "MUNDUR_CUSTOMER",
      actorType: "ADMIN",
      actorUserId,
    });

    const activities = await activitiesFor(reservationId);
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      type: "STATUS_CHANGE",
      actorType: "ADMIN",
      actorUserId,
    });
    expect(activities[0]?.note).toContain("customer");
    expect(activities[0]?.note).toContain("DP hangus");
  });

  it("tetap berhasil bila reservasi lama tidak memiliki kunci", async () => {
    const bookingNumber = formatBookingNumber(bookingNumberYear(), 2);
    const { reservationId, actorUserId } = await seedReservation({
      status: "DITERIMA",
      bookingNumber,
      eventDate: "2027-03-25",
    });
    await setCustomerStatus("customer-uji", "CLIENT");

    await cancelAcceptedReservation({
      reservationId,
      reason: "Customer mengundurkan diri",
      reasonCode: "MUNDUR_CUSTOMER",
      actorUserId,
    });

    expect(await stateOf(reservationId)).toMatchObject({
      status: "DIBATALKAN",
      dpForfeited: true,
      bookingNumber,
      customerStatus: "CLIENT",
    });
  });

  it("menolak status selain DITERIMA", async () => {
    const { reservationId, actorUserId } = await seedReservation();

    const error = await captureError(
      cancelAcceptedReservation({
        reservationId,
        reason: "Customer mengundurkan diri",
        reasonCode: "MUNDUR_CUSTOMER",
        actorUserId,
      }),
    );

    expect(error).toMatchObject({ code: "INVALID_STATE" });
    expect(await stateOf(reservationId)).toMatchObject({
      status: "PENDING",
      dpForfeited: false,
      bookingNumber: null,
    });
    expect(await historyFor(reservationId)).toHaveLength(0);
  });

  it("mewajibkan alasan pembatalan", async () => {
    const bookingNumber = formatBookingNumber(bookingNumberYear(), 3);
    const { reservationId, actorUserId } =
      await seedAcceptedWithLocks(bookingNumber);

    const error = await captureError(
      cancelAcceptedReservation({
        reservationId,
        reason: "   ",
        reasonCode: "MUNDUR_CUSTOMER",
        actorUserId,
      }),
    );

    expect(error).toMatchObject({ code: "REASON_REQUIRED" });
    expect(await stateOf(reservationId)).toMatchObject({
      status: "DITERIMA",
      dpForfeited: false,
      bookingNumber,
    });
    expect(await locksFor(reservationId)).toHaveLength(3);
  });

  it("menolak kode alasan DITOLAK_VENUE pada aksi ini", async () => {
    const bookingNumber = formatBookingNumber(bookingNumberYear(), 4);
    const { reservationId, actorUserId } =
      await seedAcceptedWithLocks(bookingNumber);
    const invalidInput = {
      reservationId,
      reason: "Ditolak venue",
      reasonCode: "DITOLAK_VENUE",
      actorUserId,
    } as unknown as Parameters<typeof cancelAcceptedReservation>[0];

    const error = await captureError(
      cancelAcceptedReservation(invalidInput),
    );

    expect(error).toMatchObject({ code: "INVALID_REASON_CODE" });
    expect(await stateOf(reservationId)).toMatchObject({
      status: "DITERIMA",
      dpForfeited: false,
      bookingNumber,
    });
    expect(await locksFor(reservationId)).toHaveLength(3);
  });
});

describe("nomor booking setelah pembatalan", () => {
  it("menerbitkan nomor berikutnya dan dapat mengunci tanggal kembali", async () => {
    const first = await seedReservation({
      reservationId: "reservasi-a",
      customerId: "customer-a",
      customerWhatsapp: "6281111111111",
      eventDate: "2027-03-20",
      setupDaysBefore: 1,
    });
    const second = await seedReservation({
      reservationId: "reservasi-b",
      customerId: "customer-b",
      customerWhatsapp: "6282222222222",
      eventDate: "2027-03-20",
      setupDaysBefore: 1,
    });
    await addVerifiedPayment(first.reservationId, first.actorUserId);
    await addVerifiedPayment(second.reservationId, second.actorUserId);

    const firstConfirmation = await confirmReservation({
      reservationId: first.reservationId,
      actorUserId: first.actorUserId,
    });
    expect(firstConfirmation.bookingNumber).toBe(
      formatBookingNumber(bookingNumberYear(), 1),
    );

    await cancelAcceptedReservation({
      reservationId: first.reservationId,
      reason: "Customer mengundurkan diri",
      reasonCode: "MUNDUR_CUSTOMER",
      actorUserId: first.actorUserId,
    });
    expect(await stateOf(first.reservationId)).toMatchObject({
      status: "DIBATALKAN",
      dpForfeited: true,
      bookingNumber: firstConfirmation.bookingNumber,
      customerStatus: "CLIENT",
    });

    const secondConfirmation = await confirmReservation({
      reservationId: second.reservationId,
      actorUserId: second.actorUserId,
    });
    expect(secondConfirmation.bookingNumber).toBe(
      formatBookingNumber(bookingNumberYear(), 2),
    );
    expect(secondConfirmation.bookingNumber).not.toBe(
      firstConfirmation.bookingNumber,
    );

    const secondLocks = await locksFor(second.reservationId);
    expect(secondLocks).toHaveLength(2);
    expect(secondLocks.map((lock) => lock.kind).sort()).toEqual([
      "EVENT",
      "SETUP",
    ]);
    expect(await locksFor(first.reservationId)).toHaveLength(0);

    const counters = await db
      .select()
      .from(bookingCounter)
      .where(eq(bookingCounter.year, Number(bookingNumberYear())));
    expect(counters[0]?.lastSequence).toBe(2);
  });

  it("pembatalan 5a tetap menghasilkan dp_forfeited false", async () => {
    const { reservationId, actorUserId } = await seedReservation();

    await cancelReservation({
      reservationId,
      reason: "Customer membatalkan sebelum diterima",
      reasonCode: "MUNDUR_CUSTOMER",
      actorUserId,
    });

    expect(await stateOf(reservationId)).toMatchObject({
      status: "DIBATALKAN",
      dpForfeited: false,
    });
  });
});
