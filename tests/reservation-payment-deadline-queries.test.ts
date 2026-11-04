import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  dateLock,
  payment,
  reservation,
  reservationActivity,
  reservationStatusHistory,
} from "@/lib/db/schema";
import { addDays, todayInJakarta } from "@/modules/availability/dates";
import { getReservationDetail } from "@/modules/reservation/queries";

import { seedReservation } from "./helpers/seed-reservation";

describe("query batas pelunasan", () => {
  it("menurunkan batas dan belum menandai sebelum batas", async () => {
    const today = todayInJakarta();
    const eventDate = addDays(today, 30);
    const seeded = await seedReservation({
      reservationId: "reservasi-payment-deadline-belum",
      customerId: "customer-payment-deadline-belum",
      eventDate,
    });

    const detail = await getReservationDetail(seeded.reservationId);

    expect(detail?.eventDate).toBe(eventDate);
    expect(detail?.paymentDueDate).toBe(addDays(eventDate, -14));
    expect(detail?.paymentOverdue).toBe(false);
  });

  it("menandai reservasi belum lunas setelah batas", async () => {
    const today = todayInJakarta();
    const eventDate = addDays(today, -1);
    const seeded = await seedReservation({
      reservationId: "reservasi-payment-deadline-terlambat",
      customerId: "customer-payment-deadline-terlambat",
      eventDate,
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-9001",
      payments: [{ amountRupiah: 5_000_000 }],
    });

    const detail = await getReservationDetail(seeded.reservationId);

    expect(detail?.paymentDueDate).toBe(addDays(eventDate, -14));
    expect(detail?.financials.paymentStatus).toBe("DP");
    expect(detail?.paymentOverdue).toBe(true);
  });

  it("tidak menandai reservasi LUNAS setelah batas", async () => {
    const today = todayInJakarta();
    const eventDate = addDays(today, -1);
    const seeded = await seedReservation({
      reservationId: "reservasi-payment-deadline-lunas",
      customerId: "customer-payment-deadline-lunas",
      eventDate,
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-9002",
      payments: [{ amountRupiah: 20_000_000 }],
    });

    const detail = await getReservationDetail(seeded.reservationId);

    expect(detail?.financials.paymentStatus).toBe("LUNAS");
    expect(detail?.paymentOverdue).toBe(false);
  });

  it("mengikuti tanggal acara terbaru tanpa menyimpan nilai lama", async () => {
    const today = todayInJakarta();
    const eventDate = addDays(today, 20);
    const newEventDate = addDays(today, 60);
    const seeded = await seedReservation({
      reservationId: "reservasi-payment-deadline-reschedule",
      customerId: "customer-payment-deadline-reschedule",
      eventDate,
    });

    const before = await getReservationDetail(seeded.reservationId);
    await db
      .update(reservation)
      .set({ eventDate: newEventDate })
      .where(eq(reservation.id, seeded.reservationId));
    const after = await getReservationDetail(seeded.reservationId);

    expect(before?.paymentDueDate).toBe(addDays(eventDate, -14));
    expect(after?.paymentDueDate).toBe(addDays(newEventDate, -14));
    expect(after?.eventDate).toBe(newEventDate);
  });

  it("membaca detail tidak mengubah status, pembayaran, kunci tanggal, atau aktivitas", async () => {
    const seeded = await seedReservation({
      reservationId: "reservasi-payment-deadline-read",
      customerId: "customer-payment-deadline-read",
      eventDate: "2027-03-20",
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-9003",
      payments: [{ amountRupiah: 5_000_000 }],
      createDateLocks: true,
    });

    async function snapshot() {
      const [reservationRows, paymentRows, lockRows, activityRows, historyRows] =
        await Promise.all([
          db
            .select({ status: reservation.status, eventDate: reservation.eventDate })
            .from(reservation)
            .where(eq(reservation.id, seeded.reservationId)),
          db
            .select({ id: payment.id })
            .from(payment)
            .where(eq(payment.reservationId, seeded.reservationId)),
          db
            .select({ date: dateLock.date })
            .from(dateLock)
            .where(eq(dateLock.reservationId, seeded.reservationId)),
          db
            .select({ id: reservationActivity.id })
            .from(reservationActivity)
            .where(eq(reservationActivity.reservationId, seeded.reservationId)),
          db
            .select({ id: reservationStatusHistory.id })
            .from(reservationStatusHistory)
            .where(
              eq(reservationStatusHistory.reservationId, seeded.reservationId),
            ),
        ]);

      return {
        status: reservationRows[0]?.status,
        eventDate: reservationRows[0]?.eventDate,
        payments: paymentRows.map((row) => row.id).sort(),
        dateLocks: lockRows.map((row) => row.date).sort(),
        activities: activityRows.map((row) => row.id).sort(),
        statusHistory: historyRows.map((row) => row.id).sort(),
      };
    }

    const before = await snapshot();
    await getReservationDetail(seeded.reservationId);
    const after = await snapshot();

    expect(after).toEqual(before);
  });
});
