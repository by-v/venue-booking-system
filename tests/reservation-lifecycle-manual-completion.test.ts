import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  dateLock,
  reservation,
  reservationActivity,
  reservationStatusHistory,
} from "@/lib/db/schema";
import { addDays, todayInJakarta } from "@/modules/availability/dates";
import { completeReservation } from "@/modules/reservation/mutations";
import type { ReservationStatus } from "@/modules/reservation/types";

import { seedReservation } from "./helpers/seed-reservation";

interface ReservationState {
  status: ReservationStatus;
  perluPemeriksaanAdmin: boolean;
  locks: string[];
  history: Array<{
    fromStatus: string | null;
    toStatus: string;
    reason: string | null;
    actorType: string;
    actorUserId: string | null;
  }>;
  activities: Array<{
    type: string;
    actorType: string;
    isSubstantive: boolean;
  }>;
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
        reason: reservationStatusHistory.reason,
        actorType: reservationStatusHistory.actorType,
        actorUserId: reservationStatusHistory.actorUserId,
      })
      .from(reservationStatusHistory)
      .where(eq(reservationStatusHistory.reservationId, reservationId)),
    db
      .select({
        type: reservationActivity.type,
        actorType: reservationActivity.actorType,
        isSubstantive: reservationActivity.isSubstantive,
      })
      .from(reservationActivity)
      .where(eq(reservationActivity.reservationId, reservationId)),
  ]);

  return {
    status: row.status as ReservationStatus,
    perluPemeriksaanAdmin: row.perluPemeriksaanAdmin,
    locks: locks.map((lock) => lock.date).sort(),
    history,
    activities,
  };
}

describe("penyelesaian manual reservasi", () => {
  it("menyelesaikan DITERIMA setelah tanggal acara dan mencatat admin", async () => {
    const today = todayInJakarta();
    const eventDate = addDays(today, -1);
    const { actorUserId } = await seedReservation({
      reservationId: "res-manual-selesai",
      customerId: "customer-manual-selesai",
      status: "DITERIMA",
      eventDate,
      bookingNumber: "HADCC-2026-0020",
      setupDaysBefore: 2,
      createDateLocks: true,
      payments: [{ amountRupiah: 20_000_000, verificationStatus: "TERVERIFIKASI" }],
    });
    const locksBefore = (await readState("res-manual-selesai")).locks;

    await completeReservation({
      reservationId: "res-manual-selesai",
      actorUserId,
    });

    const state = await readState("res-manual-selesai");
    expect(state.status).toBe("SELESAI");
    expect(state.perluPemeriksaanAdmin).toBe(false);
    expect(state.locks).toEqual(locksBefore);
    expect(state.history).toEqual([
      expect.objectContaining({
        fromStatus: "DITERIMA",
        toStatus: "SELESAI",
        reason: "Ditandai selesai oleh admin.",
        actorType: "ADMIN",
        actorUserId,
      }),
    ]);
    expect(state.activities).toEqual([
      expect.objectContaining({
        type: "STATUS_CHANGE",
        actorType: "ADMIN",
        isSubstantive: true,
      }),
    ]);
  });

  it("menyalakan penanda bila sisa pembayaran lebih dari nol", async () => {
    const today = todayInJakarta();
    const { actorUserId } = await seedReservation({
      reservationId: "res-manual-sisa",
      customerId: "customer-manual-sisa",
      status: "DITERIMA",
      eventDate: addDays(today, -1),
      bookingNumber: "HADCC-2026-0021",
      packagePriceRupiah: 20_000_000,
      items: [{ description: "Sewa tenda", amountRupiah: 1_500_000 }],
      payments: [
        { amountRupiah: 6_000_000, verificationStatus: "TERVERIFIKASI" },
      ],
    });

    await completeReservation({
      reservationId: "res-manual-sisa",
      actorUserId,
    });

    const state = await readState("res-manual-sisa");
    expect(state.status).toBe("SELESAI");
    expect(state.perluPemeriksaanAdmin).toBe(true);
  });

  it("menolak penyelesaian pada hari tanggal acara tanpa mengubah data", async () => {
    const today = todayInJakarta();
    const { actorUserId } = await seedReservation({
      reservationId: "res-manual-hari-acara",
      customerId: "customer-manual-hari-acara",
      status: "DITERIMA",
      eventDate: today,
      bookingNumber: "HADCC-2026-0022",
    });
    const before = await readState("res-manual-hari-acara");

    await expect(
      completeReservation({
        reservationId: "res-manual-hari-acara",
        actorUserId,
      }),
    ).rejects.toMatchObject({ code: "EVENT_DATE_NOT_PASSED" });

    expect(await readState("res-manual-hari-acara")).toEqual(before);
  });

  it("menolak penyelesaian untuk status selain DITERIMA", async () => {
    const today = todayInJakarta();
    const { actorUserId } = await seedReservation({
      reservationId: "res-manual-pending",
      customerId: "customer-manual-pending",
      status: "PENDING",
      eventDate: addDays(today, -1),
    });
    const before = await readState("res-manual-pending");

    await expect(
      completeReservation({
        reservationId: "res-manual-pending",
        actorUserId,
      }),
    ).rejects.toMatchObject({ code: "COMPLETION_NOT_ALLOWED" });

    expect(await readState("res-manual-pending")).toEqual(before);
  });

  it("menolak reservasi yang tidak ditemukan", async () => {
    const { actorUserId } = await seedReservation({
      reservationId: "res-manual-pendamping",
      customerId: "customer-manual-pendamping",
    });

    await expect(
      completeReservation({
        reservationId: "res-tidak-ada",
        actorUserId,
      }),
    ).rejects.toMatchObject({ code: "RESERVATION_NOT_FOUND" });
  });
});
