import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  dateLock,
  payment,
  reservation,
  reservationActivity,
  reservationItem,
  reservationStatusHistory,
} from "@/lib/db/schema";
import {
  addReservationItem,
  cancelReservation,
  markDownPayment,
  markPaidOff,
  suspendReservation,
} from "@/modules/reservation/mutations";
import {
  calculateMinimumDp,
  calculateReservationTotal,
  derivePaymentStatus,
} from "@/modules/reservation/pricing";
import { RESERVATION_STATUSES } from "@/modules/reservation/types";

import { seedReservation } from "./helpers/seed-reservation";

async function activitiesOfType(type: string) {
  const rows = await db.select().from(reservationActivity);
  return rows.filter((row) => row.type === type);
}

async function paymentRows() {
  return db.select().from(payment);
}

async function verifiedTotal(): Promise<number> {
  const rows = await paymentRows();
  return rows
    .filter((row) => row.verificationStatus === "TERVERIFIKASI")
    .reduce((total, row) => total + row.amountRupiah, 0);
}

describe("mutasi pengolahan reservasi", () => {
  it("menambah item biaya, menghitung total dan DP minimum, serta mencatat aktivitas", async () => {
    const { reservationId, actorUserId, packagePriceRupiah } =
      await seedReservation();

    await addReservationItem({
      reservationId,
      description: "Sewa tenda tambahan",
      amountRupiah: 1_500_000,
      actorUserId,
    });

    const items = await db.select().from(reservationItem);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      reservationId,
      description: "Sewa tenda tambahan",
      amountRupiah: 1_500_000,
    });

    const total = calculateReservationTotal(
      packagePriceRupiah,
      items.map((item) => item.amountRupiah),
    );
    expect(total).toBe(21_500_000);
    expect(calculateMinimumDp(total)).toBe(5_375_000);

    const activities = await activitiesOfType("ITEM_ADDED");
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      reservationId,
      actorType: "ADMIN",
      actorUserId,
      isSubstantive: true,
    });
    expect(activities[0]?.note).toContain("Sewa tenda tambahan");
  });

  it("mencatat DP 25% otomatis saat tombol Sudah DP ditekan", async () => {
    const { reservationId, actorUserId } = await seedReservation();

    await markDownPayment({ reservationId, actorUserId });

    const rows = await paymentRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      reservationId,
      amountRupiah: 5_000_000,
      verificationStatus: "TERVERIFIKASI",
      recordedByUserId: actorUserId,
    });

    expect(derivePaymentStatus(20_000_000, await verifiedTotal())).toBe("DP");

    const activities = await activitiesOfType("PAYMENT_RECORDED");
    expect(activities).toHaveLength(1);
    expect(activities[0]?.note).toContain("DP 25%");
  });

  it("mencatat sisa hingga lunas saat tombol Lunas ditekan", async () => {
    const { reservationId, actorUserId } = await seedReservation();

    await markPaidOff({ reservationId, actorUserId });

    const rows = await paymentRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      reservationId,
      amountRupiah: 20_000_000,
      verificationStatus: "TERVERIFIKASI",
      recordedByUserId: actorUserId,
    });
    expect(derivePaymentStatus(20_000_000, await verifiedTotal())).toBe(
      "LUNAS",
    );

    const activities = await activitiesOfType("PAYMENT_RECORDED");
    expect(activities).toHaveLength(1);
    expect(activities[0]?.note).toContain("Pelunasan");
  });

  it("melunasi setelah DP hanya mencatat sisa pembayaran", async () => {
    const { reservationId, actorUserId } = await seedReservation();

    await markDownPayment({ reservationId, actorUserId });
    await markPaidOff({ reservationId, actorUserId });

    const rows = await paymentRows();
    expect(rows).toHaveLength(2);
    const amounts = rows.map((row) => row.amountRupiah).sort((a, b) => a - b);
    expect(amounts).toEqual([5_000_000, 15_000_000]);
    expect(await verifiedTotal()).toBe(20_000_000);
    expect(await activitiesOfType("PAYMENT_RECORDED")).toHaveLength(2);
  });

  it("menolak DP dan Lunas bila pembayaran sudah lunas", async () => {
    const { reservationId, actorUserId } = await seedReservation();
    await db.insert(payment).values({
      id: "pembayaran-lunas",
      reservationId,
      amountRupiah: 20_000_000,
      verificationStatus: "TERVERIFIKASI",
      recordedByUserId: actorUserId,
    });

    await expect(
      markDownPayment({ reservationId, actorUserId }),
    ).rejects.toMatchObject({ code: "PAYMENT_ALREADY_SETTLED" });
    await expect(
      markPaidOff({ reservationId, actorUserId }),
    ).rejects.toMatchObject({ code: "PAYMENT_ALREADY_SETTLED" });
    expect(await paymentRows()).toHaveLength(1);
  });

  it("menangguhkan lalu membatalkan reservasi dengan riwayat dan aktivitas", async () => {
    const { reservationId, actorUserId } = await seedReservation();

    await suspendReservation({
      reservationId,
      reason: "Menunggu kelengkapan berkas",
      actorUserId,
    });

    let reservations = await db
      .select()
      .from(reservation)
      .where(eq(reservation.id, reservationId));
    expect(reservations[0]?.status).toBe("DITANGGUHKAN");

    await cancelReservation({
      reservationId,
      reason: "Customer mundur",
      reasonCode: "MUNDUR_CUSTOMER",
      actorUserId,
    });

    reservations = await db
      .select()
      .from(reservation)
      .where(eq(reservation.id, reservationId));
    expect(reservations[0]?.status).toBe("DIBATALKAN");
    expect(reservations[0]?.status).not.toBe("DITOLAK");
    expect(RESERVATION_STATUSES).not.toContain("DITOLAK");

    const history = await db
      .select()
      .from(reservationStatusHistory)
      .where(eq(reservationStatusHistory.reservationId, reservationId));
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({
      fromStatus: "PENDING",
      toStatus: "DITANGGUHKAN",
      reason: "Menunggu kelengkapan berkas",
      reasonCode: null,
      actorType: "ADMIN",
      actorUserId,
    });
    expect(history[1]).toMatchObject({
      fromStatus: "DITANGGUHKAN",
      toStatus: "DIBATALKAN",
      reason: "Customer mundur",
      reasonCode: "MUNDUR_CUSTOMER",
      actorType: "ADMIN",
      actorUserId,
    });

    const activities = await activitiesOfType("STATUS_CHANGE");
    expect(activities).toHaveLength(2);
    expect(await db.select().from(dateLock)).toHaveLength(0);
  });

  it("menolak transisi status, item, dan pembayaran yang terlarang", async () => {
    const { reservationId, actorUserId } = await seedReservation({
      status: "DITANGGUHKAN",
    });

    await expect(
      suspendReservation({
        reservationId,
        reason: "Ulangi penangguhan",
        actorUserId,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });

    await db
      .update(reservation)
      .set({ status: "DITERIMA", bookingNumber: "HADCC-2026-0001" })
      .where(eq(reservation.id, reservationId));
    await expect(
      cancelReservation({
        reservationId,
        reason: "Batal",
        reasonCode: "DITOLAK_VENUE",
        actorUserId,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });

    await db
      .update(reservation)
      .set({ status: "DIBATALKAN" })
      .where(eq(reservation.id, reservationId));
    await expect(
      addReservationItem({
        reservationId,
        description: "Item setelah batal",
        amountRupiah: 1_000_000,
        actorUserId,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    await expect(
      markPaidOff({
        reservationId,
        actorUserId,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });
});
