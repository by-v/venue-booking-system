import { eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  dateLock,
  reservation,
  reservationActivity,
  reservationStatusHistory,
} from "@/lib/db/schema";
import { runReservationLifecycle } from "@/modules/reservation/mutations";
import type { ReservationStatus } from "@/modules/reservation/types";

import { seedReservation } from "./helpers/seed-reservation";

interface ReservationState {
  status: ReservationStatus;
  perluPemeriksaanAdmin: boolean;
  locks: string[];
  history: Array<{
    fromStatus: string | null;
    toStatus: string;
    reasonCode: string | null;
    actorType: string;
  }>;
  activities: number;
}

async function readState(reservationId: string): Promise<ReservationState> {
  const rows = await db
    .select()
    .from(reservation)
    .where(eq(reservation.id, reservationId));
  const row = rows[0];
  if (!row) {
    throw new Error("Reservasi uji tidak ditemukan");
  }

  const [locks, history, activities] = await Promise.all([
    db
      .select({ date: dateLock.date })
      .from(dateLock)
      .where(eq(dateLock.reservationId, reservationId)),
    db
      .select({
        fromStatus: reservationStatusHistory.fromStatus,
        toStatus: reservationStatusHistory.toStatus,
        reasonCode: reservationStatusHistory.reasonCode,
        actorType: reservationStatusHistory.actorType,
      })
      .from(reservationStatusHistory)
      .where(eq(reservationStatusHistory.reservationId, reservationId)),
    db
      .select({ id: reservationActivity.id })
      .from(reservationActivity)
      .where(eq(reservationActivity.reservationId, reservationId)),
  ]);

  return {
    status: row.status as ReservationStatus,
    perluPemeriksaanAdmin: row.perluPemeriksaanAdmin,
    locks: locks.map((lock) => lock.date).sort(),
    history,
    activities: activities.length,
  };
}

describe("penyelesaian otomatis lifecycle", () => {
  it("menyelesaikan DITERIMA pada hari setelah tanggal acara", async () => {
    await seedReservation({
      reservationId: "res-selesai-otomatis",
      customerId: "customer-selesai-otomatis",
      status: "DITERIMA",
      eventDate: "2026-02-15",
      bookingNumber: "HADCC-2026-0001",
      setupDaysBefore: 2,
      createDateLocks: true,
      payments: [
        { amountRupiah: 20_000_000, verificationStatus: "TERVERIFIKASI" },
      ],
    });
    const locksBefore = (await readState("res-selesai-otomatis")).locks;

    await runReservationLifecycle({ today: "2026-02-15" });
    expect((await readState("res-selesai-otomatis")).status).toBe(
      "DITERIMA",
    );

    const summary = await runReservationLifecycle({ today: "2026-02-16" });

    expect(summary).toMatchObject({
      today: "2026-02-16",
      completed: 1,
      cancelled: 0,
      flagged: 0,
    });

    const state = await readState("res-selesai-otomatis");
    expect(state.status).toBe("SELESAI");
    expect(state.perluPemeriksaanAdmin).toBe(false);
    expect(state.locks).toEqual(locksBefore);
    expect(state.history).toEqual([
      expect.objectContaining({
        fromStatus: "DITERIMA",
        toStatus: "SELESAI",
        actorType: "SYSTEM",
      }),
    ]);
    expect(state.activities).toBe(0);
  });

  it("menandai sisa pembayaran saat menjadi SELESAI", async () => {
    await seedReservation({
      reservationId: "res-selesai-sisa",
      customerId: "customer-selesai-sisa",
      status: "DITERIMA",
      eventDate: "2026-02-15",
      bookingNumber: "HADCC-2026-0002",
      packagePriceRupiah: 20_000_000,
      items: [{ description: "Sewa tenda", amountRupiah: 1_500_000 }],
      payments: [
        { amountRupiah: 6_000_000, verificationStatus: "TERVERIFIKASI" },
      ],
    });

    const summary = await runReservationLifecycle({ today: "2026-02-16" });

    expect(summary).toMatchObject({ completed: 1, flagged: 1 });
    const state = await readState("res-selesai-sisa");
    expect(state.status).toBe("SELESAI");
    expect(state.perluPemeriksaanAdmin).toBe(true);
  });

  it("pembayaran lunas tidak menyalakan penanda", async () => {
    await seedReservation({
      reservationId: "res-selesai-lunas",
      customerId: "customer-selesai-lunas",
      status: "DITERIMA",
      eventDate: "2026-02-15",
      bookingNumber: "HADCC-2026-0003",
      packagePriceRupiah: 20_000_000,
      items: [{ description: "Sewa tenda", amountRupiah: 1_500_000 }],
      payments: [
        { amountRupiah: 21_500_000, verificationStatus: "TERVERIFIKASI" },
      ],
    });

    const summary = await runReservationLifecycle({ today: "2026-02-16" });

    expect(summary).toMatchObject({ completed: 1, flagged: 0 });
    const state = await readState("res-selesai-lunas");
    expect(state.status).toBe("SELESAI");
    expect(state.perluPemeriksaanAdmin).toBe(false);
  });

  it("tidak menyelesaikan status selain DITERIMA", async () => {
    await seedReservation({
      reservationId: "res-pending-selesai",
      customerId: "customer-pending-selesai",
      customerWhatsapp: "6281200000001",
      status: "PENDING",
      eventDate: "2027-03-20",
    });
    await seedReservation({
      reservationId: "res-ditangguhkan-selesai",
      customerId: "customer-ditangguhkan-selesai",
      customerWhatsapp: "6281200000002",
      status: "DITANGGUHKAN",
      eventDate: "2027-03-21",
    });
    await seedReservation({
      reservationId: "res-dibatalkan-selesai",
      customerId: "customer-dibatalkan-selesai",
      customerWhatsapp: "6281200000003",
      status: "DIBATALKAN",
      eventDate: "2026-02-15",
    });
    await seedReservation({
      reservationId: "res-auto-selesai",
      customerId: "customer-auto-selesai",
      customerWhatsapp: "6281200000004",
      status: "AUTO_CANCELLED",
      eventDate: "2026-02-15",
    });
    await seedReservation({
      reservationId: "res-final-selesai",
      customerId: "customer-final-selesai",
      customerWhatsapp: "6281200000005",
      status: "SELESAI",
      eventDate: "2026-02-15",
    });

    await runReservationLifecycle({ today: "2026-02-16" });

    const rows = await db
      .select({ id: reservation.id, status: reservation.status })
      .from(reservation)
      .where(inArray(reservation.id, ["res-pending-selesai", "res-ditangguhkan-selesai", "res-dibatalkan-selesai", "res-auto-selesai", "res-final-selesai"]));

    expect(
      Object.fromEntries(rows.map((row) => [row.id, row.status])),
    ).toEqual({
      "res-pending-selesai": "PENDING",
      "res-ditangguhkan-selesai": "DITANGGUHKAN",
      "res-dibatalkan-selesai": "DIBATALKAN",
      "res-auto-selesai": "AUTO_CANCELLED",
      "res-final-selesai": "SELESAI",
    });
  });

  it("idempoten saat dijalankan dua kali", async () => {
    await seedReservation({
      reservationId: "res-selesai-idempoten",
      customerId: "customer-selesai-idempoten",
      status: "DITERIMA",
      eventDate: "2026-02-15",
      bookingNumber: "HADCC-2026-0004",
    });

    await runReservationLifecycle({ today: "2026-02-16" });
    const first = await readState("res-selesai-idempoten");
    const summary = await runReservationLifecycle({ today: "2026-02-16" });
    const second = await readState("res-selesai-idempoten");

    expect(summary).toMatchObject({ completed: 0, cancelled: 0, flagged: 0 });
    expect(second).toEqual(first);
  });
});
