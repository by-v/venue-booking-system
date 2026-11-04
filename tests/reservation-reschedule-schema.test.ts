import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { rescheduleHistory, reservation } from "@/lib/db/schema";
import { reservationRescheduleSchema } from "@/modules/reservation/schema";

import { seedReservation } from "./helpers/seed-reservation";

describe("constraint reschedule", () => {
  it("memberi default reschedule_count 0 dan menerima nilai 1", async () => {
    const { reservationId } = await seedReservation({
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0001",
    });

    const initial = await db
      .select({ rescheduleCount: reservation.rescheduleCount })
      .from(reservation)
      .where(eq(reservation.id, reservationId));

    expect(initial[0]?.rescheduleCount).toBe(0);

    await db
      .update(reservation)
      .set({ rescheduleCount: 1 })
      .where(eq(reservation.id, reservationId));

    const updated = await db
      .select({ rescheduleCount: reservation.rescheduleCount })
      .from(reservation)
      .where(eq(reservation.id, reservationId));

    expect(updated[0]?.rescheduleCount).toBe(1);
  });

  it("menolak reschedule_count di luar 0 dan 1", async () => {
    const { reservationId } = await seedReservation({
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0001",
    });

    for (const rescheduleCount of [-1, 2]) {
      await expect(
        db
          .update(reservation)
          .set({ rescheduleCount })
          .where(eq(reservation.id, reservationId)),
      ).rejects.toThrow();
    }
  });

  it("menerima satu riwayat dan menolak reservation_id duplikat", async () => {
    const { reservationId, actorUserId } = await seedReservation({
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0001",
    });

    await db.insert(rescheduleHistory).values({
      id: "reschedule-1",
      reservationId,
      oldEventDate: "2027-03-20",
      newEventDate: "2027-04-10",
      actorUserId,
    });

    await expect(
      db.insert(rescheduleHistory).values({
        id: "reschedule-2",
        reservationId,
        oldEventDate: "2027-04-10",
        newEventDate: "2027-05-01",
        actorUserId,
      }),
    ).rejects.toThrow();

    const rows = await db
      .select()
      .from(rescheduleHistory)
      .where(eq(rescheduleHistory.reservationId, reservationId));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      oldEventDate: "2027-03-20",
      newEventDate: "2027-04-10",
    });
  });

  it("menolak tanggal lama dan tanggal baru yang sama", async () => {
    const { reservationId, actorUserId } = await seedReservation({
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0001",
    });

    await expect(
      db.insert(rescheduleHistory).values({
        id: "reschedule-sama",
        reservationId,
        oldEventDate: "2027-03-20",
        newEventDate: "2027-03-20",
        actorUserId,
      }),
    ).rejects.toThrow();

    const rows = await db.select().from(rescheduleHistory);
    expect(rows).toHaveLength(0);
  });

  it("menolak riwayat untuk reservasi yang tidak ada", async () => {
    await expect(
      db.insert(rescheduleHistory).values({
        id: "reschedule-tanpa-reservasi",
        reservationId: "reservasi-tidak-ada",
        oldEventDate: "2027-03-20",
        newEventDate: "2027-04-10",
      }),
    ).rejects.toThrow();

    const rows = await db.select().from(rescheduleHistory);
    expect(rows).toHaveLength(0);
  });
});

describe("validasi input reschedule", () => {
  it("menerima input valid dan merapikan spasi", () => {
    const parsed = reservationRescheduleSchema.parse({
      reservationId: "  reservasi-1  ",
      newEventDate: "  2027-04-10  ",
    });

    expect(parsed).toEqual({
      reservationId: "reservasi-1",
      newEventDate: "2027-04-10",
    });
  });

  it("menolak format tanggal yang salah", () => {
    const parsed = reservationRescheduleSchema.safeParse({
      reservationId: "reservasi-1",
      newEventDate: "10-04-2027",
    });

    expect(parsed.success).toBe(false);
  });

  it("menolak tanggal yang tidak nyata", () => {
    const parsed = reservationRescheduleSchema.safeParse({
      reservationId: "reservasi-1",
      newEventDate: "2027-02-30",
    });

    expect(parsed.success).toBe(false);
  });

  it("menolak field wajib yang kosong atau hilang", () => {
    expect(
      reservationRescheduleSchema.safeParse({
        reservationId: "   ",
        newEventDate: "2027-04-10",
      }).success,
    ).toBe(false);

    expect(
      reservationRescheduleSchema.safeParse({
        reservationId: "reservasi-1",
      }).success,
    ).toBe(false);
  });
});
