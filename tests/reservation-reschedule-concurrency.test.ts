import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  dateLock,
  reservation,
  reservationActivity,
  reservationStatusHistory,
  rescheduleHistory,
} from "@/lib/db/schema";
import { addDays, todayInJakarta } from "@/modules/availability/dates";
import { rescheduleReservation } from "@/modules/reservation/mutations";

import { seedReservation } from "./helpers/seed-reservation";

async function countRows(table: "history" | "status" | "activity", reservationId: string) {
  if (table === "history") {
    const rows = await db
      .select({ id: rescheduleHistory.id })
      .from(rescheduleHistory)
      .where(eq(rescheduleHistory.reservationId, reservationId));
    return rows.length;
  }
  if (table === "status") {
    const rows = await db
      .select({ id: reservationStatusHistory.id })
      .from(reservationStatusHistory)
      .where(eq(reservationStatusHistory.reservationId, reservationId));
    return rows.length;
  }
  const rows = await db
    .select({ id: reservationActivity.id })
    .from(reservationActivity)
    .where(eq(reservationActivity.reservationId, reservationId));
  return rows.length;
}

async function finalState(reservationId: string) {
  const rows = await db
    .select()
    .from(reservation)
    .where(eq(reservation.id, reservationId));
  const locks = await db
    .select({ date: dateLock.date, kind: dateLock.kind })
    .from(dateLock)
    .where(eq(dateLock.reservationId, reservationId));

  return {
    row: rows[0],
    locks: locks.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

describe("konkurensi reschedule", () => {
  it("hanya mengizinkan satu reschedule untuk tanggal baru yang sama", async () => {
    const today = todayInJakarta();
    const oldDate = addDays(today, 90);
    const newDate = addDays(today, 120);
    const seeded = await seedReservation({
      reservationId: "reservasi-reschedule-bersamaan",
      customerId: "customer-reschedule-bersamaan",
      customerWhatsapp: "6281234500030",
      eventDate: oldDate,
      packageId: "paket-reschedule-bersamaan",
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0001",
      createDateLocks: true,
    });

    const results = await Promise.allSettled([
      rescheduleReservation({
        reservationId: seeded.reservationId,
        newEventDate: newDate,
        actorUserId: seeded.actorUserId,
      }),
      rescheduleReservation({
        reservationId: seeded.reservationId,
        newEventDate: newDate,
        actorUserId: seeded.actorUserId,
      }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(
      1,
    );
    const rejected = results.filter((result) => result.status === "rejected");
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({
      reason: { code: "RESCHEDULE_LIMIT_REACHED" },
    });

    const state = await finalState(seeded.reservationId);
    expect(state.row).toMatchObject({
      status: "DITERIMA",
      eventDate: newDate,
      bookingNumber: "HADCC-2026-0001",
      rescheduleCount: 1,
    });
    expect(state.locks).toEqual([{ date: newDate, kind: "EVENT" }]);
    expect(await countRows("history", seeded.reservationId)).toBe(1);
    expect(await countRows("status", seeded.reservationId)).toBe(1);
    expect(await countRows("activity", seeded.reservationId)).toBe(1);
  });

  it("hanya menyisakan kunci tanggal dari pemenang saat tanggal baru berbeda", async () => {
    const today = todayInJakarta();
    const oldDate = addDays(today, 90);
    const firstDate = addDays(today, 120);
    const secondDate = addDays(today, 150);
    const seeded = await seedReservation({
      reservationId: "reservasi-reschedule-dua-tanggal",
      customerId: "customer-reschedule-dua-tanggal",
      customerWhatsapp: "6281234500031",
      eventDate: oldDate,
      packageId: "paket-reschedule-dua-tanggal",
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0001",
      createDateLocks: true,
    });

    const results = await Promise.allSettled([
      rescheduleReservation({
        reservationId: seeded.reservationId,
        newEventDate: firstDate,
        actorUserId: seeded.actorUserId,
      }),
      rescheduleReservation({
        reservationId: seeded.reservationId,
        newEventDate: secondDate,
        actorUserId: seeded.actorUserId,
      }),
    ]);

    const winnerIndex = results.findIndex(
      (result) => result.status === "fulfilled",
    );
    expect(winnerIndex).toBeGreaterThanOrEqual(0);
    const winnerDate = winnerIndex === 0 ? firstDate : secondDate;

    const rejected = results.filter((result) => result.status === "rejected");
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({
      reason: { code: "RESCHEDULE_LIMIT_REACHED" },
    });

    const state = await finalState(seeded.reservationId);
    expect(state.row).toMatchObject({
      status: "DITERIMA",
      eventDate: winnerDate,
      bookingNumber: "HADCC-2026-0001",
      rescheduleCount: 1,
    });
    expect(state.locks).toEqual([{ date: winnerDate, kind: "EVENT" }]);
    expect(await countRows("history", seeded.reservationId)).toBe(1);
    expect(await countRows("status", seeded.reservationId)).toBe(1);
    expect(await countRows("activity", seeded.reservationId)).toBe(1);

    const history = await db
      .select()
      .from(rescheduleHistory)
      .where(eq(rescheduleHistory.reservationId, seeded.reservationId));
    expect(history[0]?.newEventDate).toBe(winnerDate);
  });
});
