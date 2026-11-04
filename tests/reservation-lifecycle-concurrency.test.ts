import { eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  reservation,
  reservationActivity,
  reservationStatusHistory,
} from "@/lib/db/schema";
import { runReservationLifecycle } from "@/modules/reservation/mutations";

import { seedReservation } from "./helpers/seed-reservation";

describe("idempotensi dan konkurensi job lifecycle", () => {
  it("dua eksekusi bersamaan menghasilkan tepat satu transisi per reservasi", async () => {
    await seedReservation({
      reservationId: "res-concurrent-cancel",
      customerId: "customer-concurrent-cancel",
      customerWhatsapp: "6281200000101",
      status: "PENDING",
      eventDate: "2027-03-20",
    });
    await db
      .update(reservation)
      .set({ createdAt: new Date("2026-01-01T03:00:00Z") })
      .where(eq(reservation.id, "res-concurrent-cancel"));

    await seedReservation({
      reservationId: "res-concurrent-flag",
      customerId: "customer-concurrent-flag",
      customerWhatsapp: "6281200000102",
      status: "PENDING",
      eventDate: "2027-03-21",
      payments: [
        { amountRupiah: 2_000_000, verificationStatus: "TERVERIFIKASI" },
      ],
    });
    await db
      .update(reservation)
      .set({ createdAt: new Date("2026-01-01T03:00:00Z") })
      .where(eq(reservation.id, "res-concurrent-flag"));

    await seedReservation({
      reservationId: "res-concurrent-complete",
      customerId: "customer-concurrent-complete",
      customerWhatsapp: "6281200000103",
      status: "DITERIMA",
      eventDate: "2026-02-15",
      bookingNumber: "HADCC-2026-0010",
    });

    const summaries = await Promise.all([
      runReservationLifecycle({ today: "2026-04-01" }),
      runReservationLifecycle({ today: "2026-04-01" }),
    ]);

    const totals = summaries.reduce(
      (sum, item) => ({
        cancelled: sum.cancelled + item.cancelled,
        flagged: sum.flagged + item.flagged,
        completed: sum.completed + item.completed,
      }),
      { cancelled: 0, flagged: 0, completed: 0 },
    );
    expect(totals).toEqual({ cancelled: 1, flagged: 2, completed: 1 });

    const history = await db
      .select({
        reservationId: reservationStatusHistory.reservationId,
        toStatus: reservationStatusHistory.toStatus,
      })
      .from(reservationStatusHistory)
      .where(
        inArray(reservationStatusHistory.reservationId, [
          "res-concurrent-cancel",
          "res-concurrent-flag",
          "res-concurrent-complete",
        ]),
      );
    expect(history).toHaveLength(2);
    expect(history.map((row) => row.toStatus).sort()).toEqual([
      "AUTO_CANCELLED",
      "SELESAI",
    ]);

    const activities = await db
      .select({ id: reservationActivity.id })
      .from(reservationActivity)
      .where(
        inArray(reservationActivity.reservationId, [
          "res-concurrent-cancel",
          "res-concurrent-flag",
          "res-concurrent-complete",
        ]),
      );
    expect(activities).toHaveLength(0);

    const rows = await db
      .select({
        id: reservation.id,
        status: reservation.status,
        perluPemeriksaanAdmin: reservation.perluPemeriksaanAdmin,
      })
      .from(reservation)
      .where(
        inArray(reservation.id, [
          "res-concurrent-cancel",
          "res-concurrent-flag",
          "res-concurrent-complete",
        ]),
      );
    expect(
      Object.fromEntries(
        rows.map((row) => [
          row.id,
          { status: row.status, flagged: row.perluPemeriksaanAdmin },
        ]),
      ),
    ).toEqual({
      "res-concurrent-cancel": {
        status: "AUTO_CANCELLED",
        flagged: false,
      },
      "res-concurrent-flag": { status: "PENDING", flagged: true },
      "res-concurrent-complete": { status: "SELESAI", flagged: true },
    });

    const before = await db
      .select()
      .from(reservationStatusHistory)
      .where(
        inArray(reservationStatusHistory.reservationId, [
          "res-concurrent-cancel",
          "res-concurrent-flag",
          "res-concurrent-complete",
        ]),
      );
    await runReservationLifecycle({ today: "2026-04-01" });
    const after = await db
      .select()
      .from(reservationStatusHistory)
      .where(
        inArray(reservationStatusHistory.reservationId, [
          "res-concurrent-cancel",
          "res-concurrent-flag",
          "res-concurrent-complete",
        ]),
      );
    expect(after).toEqual(before);
  });
});
