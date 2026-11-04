import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { reservationStatusHistory } from "@/lib/db/schema";

import { seedReservation } from "./helpers/seed-reservation";

describe("constraint kode alasan riwayat status lifecycle", () => {
  it("menerima kode alasan otomatis INACTIVITY_3M dan EVENT_DATE_PASSED", async () => {
    const { reservationId } = await seedReservation({
      reservationId: "reservasi-lifecycle-schema",
      customerId: "customer-lifecycle-schema",
    });

    await db.insert(reservationStatusHistory).values([
      {
        id: "riwayat-lifecycle-inactivity",
        reservationId,
        fromStatus: "PENDING",
        toStatus: "AUTO_CANCELLED",
        reason: "Tidak ada aktivitas substantif selama tiga bulan.",
        reasonCode: "INACTIVITY_3M",
        actorType: "SYSTEM",
      },
      {
        id: "riwayat-lifecycle-event-passed",
        reservationId,
        fromStatus: "PENDING",
        toStatus: "AUTO_CANCELLED",
        reason: "Tanggal acara sudah lewat.",
        reasonCode: "EVENT_DATE_PASSED",
        actorType: "SYSTEM",
      },
    ]);

    const rows = await db.select().from(reservationStatusHistory);
    expect(rows.map((row) => row.reasonCode).sort()).toEqual([
      "EVENT_DATE_PASSED",
      "INACTIVITY_3M",
    ]);
  });

  it("menolak kode alasan asing", async () => {
    const { reservationId } = await seedReservation({
      reservationId: "reservasi-lifecycle-schema-asing",
      customerId: "customer-lifecycle-schema-asing",
    });

    await expect(
      db.insert(reservationStatusHistory).values({
        id: "riwayat-lifecycle-asing",
        reservationId,
        fromStatus: "PENDING",
        toStatus: "AUTO_CANCELLED",
        reason: "Kode tidak dikenal.",
        reasonCode: "LAINNYA",
        actorType: "SYSTEM",
      }),
    ).rejects.toThrow();
  });
});
