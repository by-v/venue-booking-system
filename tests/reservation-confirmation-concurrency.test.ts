import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  bookingCounter,
  customer,
  dateLock,
  payment,
  reservation,
} from "@/lib/db/schema";
import { bookingNumberYear } from "@/modules/reservation/booking-number";
import { confirmReservation } from "@/modules/reservation/mutations";
import type { ReservationStatus } from "@/modules/reservation/types";

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

async function reservationState(reservationId: string): Promise<{
  status: ReservationStatus;
  bookingNumber: string | null;
  customerStatus: string | undefined;
}> {
  const rows = await db
    .select({
      status: reservation.status,
      bookingNumber: reservation.bookingNumber,
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
    status: selected.status as ReservationStatus,
    bookingNumber: selected.bookingNumber,
    customerStatus: customerRows[0]?.status,
  };
}

describe("konkurensi konfirmasi reservasi", () => {
  it("hanya mengizinkan satu konfirmasi untuk tanggal yang sama", async () => {
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

    const results = await Promise.allSettled([
      confirmReservation({
        reservationId: first.reservationId,
        actorUserId: first.actorUserId,
      }),
      confirmReservation({
        reservationId: second.reservationId,
        actorUserId: second.actorUserId,
      }),
    ]);

    const fulfilled = results.filter(
      (result) => result.status === "fulfilled",
    );
    const rejected = results.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({
      reason: { code: "DATE_CONFLICT" },
    });

    const winnerIndex = results.findIndex(
      (result) => result.status === "fulfilled",
    );
    const winner =
      winnerIndex === 0 ? first.reservationId : second.reservationId;
    const loser =
      winnerIndex === 0 ? second.reservationId : first.reservationId;

    const locks = await db.select().from(dateLock);
    expect(locks).toHaveLength(2);
    expect(locks.every((lock) => lock.reservationId === winner)).toBe(true);
    expect(locks.map((lock) => lock.kind).sort()).toEqual(["EVENT", "SETUP"]);

    expect(await reservationState(winner)).toMatchObject({
      status: "DITERIMA",
      customerStatus: "CLIENT",
    });
    const winnerState = await reservationState(winner);
    expect(winnerState.bookingNumber).toMatch(/^HADCC-\d{4}-0001$/);

    expect(await reservationState(loser)).toMatchObject({
      status: "PENDING",
      bookingNumber: null,
      customerStatus: "CALON",
    });

    const counters = await db
      .select()
      .from(bookingCounter)
      .where(eq(bookingCounter.year, Number(bookingNumberYear())));
    expect(counters).toHaveLength(1);
    expect(counters[0]?.lastSequence).toBe(1);
  });
});
