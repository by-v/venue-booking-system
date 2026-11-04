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
import { cancelReservationForLatePayment } from "@/modules/reservation/mutations";

import { seedReservation } from "./helpers/seed-reservation";

async function reservationRow(reservationId: string) {
  const rows = await db
    .select()
    .from(reservation)
    .where(eq(reservation.id, reservationId));
  const row = rows[0];
  if (!row) {
    throw new Error("Reservasi uji tidak ditemukan");
  }
  return row;
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

async function locksFor(reservationId: string) {
  return db
    .select()
    .from(dateLock)
    .where(eq(dateLock.reservationId, reservationId));
}

describe("pembatalan karena pelunasan terlambat", () => {
  it("membatalkan reservasi DITERIMA dan mempertahankan nomor booking", async () => {
    const today = todayInJakarta();
    const seeded = await seedReservation({
      reservationId: "reservasi-terlambat-hangus",
      customerId: "customer-terlambat-hangus",
      customerWhatsapp: "6281234600001",
      eventDate: addDays(today, -10),
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0101",
      createDateLocks: true,
      payments: [{ amountRupiah: 5_000_000 }],
    });

    await cancelReservationForLatePayment({
      reservationId: seeded.reservationId,
      reason: "Pelunasan tidak diselesaikan sampai batas",
      dpDecision: "HANGUS",
      actorUserId: seeded.actorUserId,
    });

    expect(await reservationRow(seeded.reservationId)).toMatchObject({
      status: "DIBATALKAN",
      dpForfeited: true,
      bookingNumber: "HADCC-2026-0101",
    });
    expect(await locksFor(seeded.reservationId)).toHaveLength(0);

    const history = await historyFor(seeded.reservationId);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      fromStatus: "DITERIMA",
      toStatus: "DIBATALKAN",
      reason: "Pelunasan tidak diselesaikan sampai batas",
      reasonCode: "PELUNASAN_TERLAMBAT",
      actorType: "ADMIN",
      actorUserId: seeded.actorUserId,
    });

    const activities = await activitiesFor(seeded.reservationId);
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      type: "STATUS_CHANGE",
      actorType: "ADMIN",
      actorUserId: seeded.actorUserId,
    });
    expect(activities[0]?.note).toContain("Pelunasan terlambat");
    expect(activities[0]?.note).toContain("DP hangus");
  });

  it("dapat menyimpan keputusan DP tidak hangus", async () => {
    const today = todayInJakarta();
    const seeded = await seedReservation({
      reservationId: "reservasi-terlambat-tidak-hangus",
      customerId: "customer-terlambat-tidak-hangus",
      customerWhatsapp: "6281234600002",
      eventDate: addDays(today, -10),
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0102",
      createDateLocks: true,
      payments: [{ amountRupiah: 5_000_000 }],
    });

    await cancelReservationForLatePayment({
      reservationId: seeded.reservationId,
      reason: "Kesepakatan venue mengembalikan DP",
      dpDecision: "TIDAK_HANGUS",
      actorUserId: seeded.actorUserId,
    });

    expect(await reservationRow(seeded.reservationId)).toMatchObject({
      status: "DIBATALKAN",
      dpForfeited: false,
    });
    const activities = await activitiesFor(seeded.reservationId);
    expect(activities[0]?.note).toContain("DP tidak hangus");
  });

  it("menolak pembatalan sebelum batas pelunasan terlewati", async () => {
    const today = todayInJakarta();
    const seeded = await seedReservation({
      reservationId: "reservasi-belum-terlambat",
      customerId: "customer-belum-terlambat",
      customerWhatsapp: "6281234600003",
      eventDate: addDays(today, 20),
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0103",
      createDateLocks: true,
      payments: [{ amountRupiah: 5_000_000 }],
    });

    await expect(
      cancelReservationForLatePayment({
        reservationId: seeded.reservationId,
        reason: "Belum jatuh tempo",
        dpDecision: "HANGUS",
        actorUserId: seeded.actorUserId,
      }),
    ).rejects.toMatchObject({ code: "PAYMENT_DEADLINE_NOT_PASSED" });

    expect(await reservationRow(seeded.reservationId)).toMatchObject({
      status: "DITERIMA",
      dpForfeited: false,
    });
    expect(await locksFor(seeded.reservationId)).toHaveLength(1);
    expect(await historyFor(seeded.reservationId)).toHaveLength(0);
  });

  it("menolak reservasi yang sudah LUNAS", async () => {
    const today = todayInJakarta();
    const seeded = await seedReservation({
      reservationId: "reservasi-sudah-lunas",
      customerId: "customer-sudah-lunas",
      customerWhatsapp: "6281234600004",
      eventDate: addDays(today, -10),
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0104",
      createDateLocks: true,
      payments: [{ amountRupiah: 20_000_000 }],
    });

    await expect(
      cancelReservationForLatePayment({
        reservationId: seeded.reservationId,
        reason: "Sudah lunas",
        dpDecision: "TIDAK_HANGUS",
        actorUserId: seeded.actorUserId,
      }),
    ).rejects.toMatchObject({ code: "PAYMENT_ALREADY_SETTLED" });

    expect(await reservationRow(seeded.reservationId)).toMatchObject({
      status: "DITERIMA",
      dpForfeited: false,
    });
  });

  it("menolak status selain DITERIMA", async () => {
    const today = todayInJakarta();
    const seeded = await seedReservation({
      reservationId: "reservasi-bukan-diterima",
      customerId: "customer-bukan-diterima",
      customerWhatsapp: "6281234600006",
      eventDate: addDays(today, -10),
      status: "PENDING",
      payments: [{ amountRupiah: 5_000_000 }],
    });

    await expect(
      cancelReservationForLatePayment({
        reservationId: seeded.reservationId,
        reason: "Status salah",
        dpDecision: "HANGUS",
        actorUserId: seeded.actorUserId,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("mewajibkan alasan pembatalan", async () => {
    const today = todayInJakarta();
    const seeded = await seedReservation({
      reservationId: "reservasi-tanpa-alasan",
      customerId: "customer-tanpa-alasan",
      customerWhatsapp: "6281234600007",
      eventDate: addDays(today, -10),
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0107",
      createDateLocks: true,
      payments: [{ amountRupiah: 5_000_000 }],
    });

    await expect(
      cancelReservationForLatePayment({
        reservationId: seeded.reservationId,
        reason: "   ",
        dpDecision: "HANGUS",
        actorUserId: seeded.actorUserId,
      }),
    ).rejects.toMatchObject({ code: "REASON_REQUIRED" });

    expect(await reservationRow(seeded.reservationId)).toMatchObject({
      status: "DITERIMA",
    });
  });
});

