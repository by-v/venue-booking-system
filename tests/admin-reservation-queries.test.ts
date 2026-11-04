import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  customer,
  packageTable,
  payment,
  reservation,
  reservationActivity,
  reservationItem,
  reservationStatusHistory,
} from "@/lib/db/schema";
import type {
  ReservationSource,
  ReservationStatus,
} from "@/modules/reservation/types";
import {
  getPublicBookingByNumber,
  getReservationDetail,
  listReservations,
} from "@/modules/reservation/queries";

interface SeedReservationOptions {
  id: string;
  name: string;
  whatsapp: string;
  status?: ReservationStatus;
  source?: ReservationSource;
  eventDate?: string;
  packagePriceRupiah?: number;
  bookingNumber?: string;
  rescheduleCount?: number;
}

async function seedPackage(): Promise<void> {
  await db.insert(packageTable).values({
    id: "full-service",
    name: "Full Service",
    priceRupiah: 20_000_000,
    durationHours: 5,
    sessionCount: 1,
    setupDaysBefore: 0,
    active: true,
    sortOrder: 1,
  });
}

async function seedReservation({
  id,
  name,
  whatsapp,
  status = "PENDING",
  source,
  eventDate = "2027-03-20",
  packagePriceRupiah = 20_000_000,
  bookingNumber,
  rescheduleCount = 0,
}: SeedReservationOptions): Promise<void> {
  const customerId = `customer-${id}`;
  await db.insert(customer).values({
    id: customerId,
    name,
    whatsapp,
    status: "CALON",
  });
  await db.insert(reservation).values({
    id,
    customerId,
    packageId: "full-service",
    packageName: "Full Service",
    packagePriceRupiah,
    packageDurationHours: 5,
    packageSessionCount: 1,
    eventDate,
    eventType: "PERNIKAHAN",
    address: "Jl. Pelita II No. 1, Pekalongan",
    notes: null,
    status,
    source,
    bookingNumber,
    rescheduleCount,
  });
}

describe("query admin reservasi", () => {
  it("default menampilkan PENDING dan DITANGGUHKAN dengan filter status lain", async () => {
    await seedPackage();
    await seedReservation({
      id: "res-pending",
      name: "Siti Aminah",
      whatsapp: "6281234567890",
      status: "PENDING",
    });
    await seedReservation({
      id: "res-suspended",
      name: "Budi Santoso",
      whatsapp: "6281311112222",
      status: "DITANGGUHKAN",
    });
    await seedReservation({
      id: "res-accepted",
      name: "Rina Wati",
      whatsapp: "6281355556666",
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0001",
    });
    await seedReservation({
      id: "res-cancelled",
      name: "Dewi Lestari",
      whatsapp: "6281377778888",
      status: "DIBATALKAN",
    });
    await seedReservation({
      id: "res-auto",
      name: "Agus Salim",
      whatsapp: "6281399990000",
      status: "AUTO_CANCELLED",
    });
    await seedReservation({
      id: "res-finished",
      name: "Maya Sari",
      whatsapp: "6281212121212",
      status: "SELESAI",
    });

    const defaultList = await listReservations();
    expect(defaultList.map((row) => row.id).sort()).toEqual([
      "res-pending",
      "res-suspended",
    ]);

    const accepted = await listReservations({ filter: "diterima" });
    expect(accepted.map((row) => row.id)).toEqual(["res-accepted"]);
    expect(accepted[0]?.bookingNumber).toBe("HADCC-2026-0001");

    const cancelled = await listReservations({ filter: "dibatalkan" });
    expect(cancelled.map((row) => row.id).sort()).toEqual([
      "res-auto",
      "res-cancelled",
    ]);

    const all = await listReservations({ filter: "semua" });
    expect(all).toHaveLength(6);
  });

  it("menerapkan pencarian nama, WhatsApp, dan nomor booking di dalam filter", async () => {
    await seedPackage();
    await seedReservation({
      id: "res-pending",
      name: "Siti Aminah",
      whatsapp: "6281234567890",
      status: "PENDING",
    });
    await seedReservation({
      id: "res-accepted",
      name: "Budi Santoso",
      whatsapp: "6281311112222",
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0001",
    });

    await expect(
      listReservations({ filter: "proses", search: "Siti" }),
    ).resolves.toHaveLength(1);
    await expect(
      listReservations({ filter: "proses", search: "0813" }),
    ).resolves.toHaveLength(0);
    await expect(
      listReservations({ filter: "diterima", search: "Budi" }),
    ).resolves.toHaveLength(1);
    await expect(
      listReservations({ filter: "diterima", search: "0812" }),
    ).resolves.toHaveLength(0);
    await expect(
      listReservations({ filter: "semua", search: "6281311112222" }),
    ).resolves.toHaveLength(1);

    const byBookingNumber = await listReservations({
      filter: "diterima",
      search: "HADCC-2026-0001",
    });
    expect(byBookingNumber).toHaveLength(1);
    expect(byBookingNumber[0]).toMatchObject({
      id: "res-accepted",
      bookingNumber: "HADCC-2026-0001",
    });
    await expect(
      listReservations({ filter: "proses", search: "HADCC-2026-0001" }),
    ).resolves.toHaveLength(0);
    await expect(
      listReservations({
        filter: "diterima",
        month: "2027-03",
        search: "HADCC-2026-0001",
      }),
    ).resolves.toHaveLength(1);
    await expect(
      listReservations({
        filter: "diterima",
        month: "2027-04",
        search: "HADCC-2026-0001",
      }),
    ).resolves.toHaveLength(0);
  });

  it("menghitung total paket + item dan status pembayaran pada daftar", async () => {
    await seedPackage();
    await seedReservation({
      id: "res-pending",
      name: "Siti Aminah",
      whatsapp: "6281234567890",
      status: "PENDING",
    });
    await seedReservation({
      id: "res-suspended",
      name: "Budi Santoso",
      whatsapp: "6281311112222",
      status: "DITANGGUHKAN",
    });
    await seedReservation({
      id: "res-accepted",
      name: "Rina Wati",
      whatsapp: "6281355556666",
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0001",
    });

    await db.insert(reservationItem).values({
      id: "item-pending",
      reservationId: "res-pending",
      description: "Sewa tenda",
      amountRupiah: 1_500_000,
    });
    await db.insert(payment).values({
      id: "payment-suspended",
      reservationId: "res-suspended",
      amountRupiah: 6_000_000,
      verificationStatus: "TERVERIFIKASI",
    });
    await db.insert(payment).values({
      id: "payment-accepted",
      reservationId: "res-accepted",
      amountRupiah: 20_000_000,
      verificationStatus: "TERVERIFIKASI",
    });

    const rows = await listReservations({ filter: "semua" });
    const pending = rows.find((row) => row.id === "res-pending");
    const suspended = rows.find((row) => row.id === "res-suspended");
    const accepted = rows.find((row) => row.id === "res-accepted");

    expect(pending).toMatchObject({
      totalRupiah: 21_500_000,
      verifiedPaymentRupiah: 0,
      paymentStatus: "BELUM_DP",
    });
    expect(suspended).toMatchObject({
      totalRupiah: 20_000_000,
      verifiedPaymentRupiah: 6_000_000,
      paymentStatus: "DP",
    });
    expect(accepted).toMatchObject({
      totalRupiah: 20_000_000,
      verifiedPaymentRupiah: 20_000_000,
      paymentStatus: "LUNAS",
    });
  });

  it("mengembalikan detail keuangan, item, pembayaran, dan penanda pemeriksaan", async () => {
    await seedPackage();
    await seedReservation({
      id: "res-detail",
      name: "Siti Aminah",
      whatsapp: "6281234567890",
      status: "PENDING",
    });
    await db
      .update(reservation)
      .set({ perluPemeriksaanAdmin: true })
      .where(eq(reservation.id, "res-detail"));

    await db.insert(reservationItem).values({
      id: "item-1",
      reservationId: "res-detail",
      description: "Sewa tenda tambahan",
      amountRupiah: 1_500_000,
    });
    await db.insert(payment).values({
      id: "payment-verified",
      reservationId: "res-detail",
      amountRupiah: 6_000_000,
      verificationStatus: "TERVERIFIKASI",
    });
    await db.insert(reservationActivity).values({
      id: "activity-submission",
      reservationId: "res-detail",
      type: "SUBMISSION",
      note: null,
      actorType: "CUSTOMER",
      actorUserId: null,
      isSubstantive: true,
    });
    await db.insert(reservationStatusHistory).values({
      id: "history-submission",
      reservationId: "res-detail",
      fromStatus: null,
      toStatus: "PENDING",
      reason: "Pengajuan form publik",
      reasonCode: null,
      actorType: "CUSTOMER",
      actorUserId: null,
    });

    const detail = await getReservationDetail("res-detail");
    expect(detail).toMatchObject({
      id: "res-detail",
      customer: {
        name: "Siti Aminah",
        whatsapp: "6281234567890",
      },
      packageName: "Full Service",
      packagePriceRupiah: 20_000_000,
      eventDate: "2027-03-20",
      eventType: "PERNIKAHAN",
      status: "PENDING",
      source: "FORM_PUBLIK",
      perluPemeriksaanAdmin: true,
      financials: {
        packagePriceRupiah: 20_000_000,
        itemTotalRupiah: 1_500_000,
        totalRupiah: 21_500_000,
        minimumDpRupiah: 5_375_000,
        verifiedPaymentRupiah: 6_000_000,
        remainingRupiah: 15_500_000,
        paymentStatus: "DP",
      },
    });
    expect(detail?.items).toHaveLength(1);
    expect(detail?.items[0]).toMatchObject({
      description: "Sewa tenda tambahan",
      amountRupiah: 1_500_000,
    });
    expect(detail?.payments).toHaveLength(1);
    expect(
      detail?.payments.map((rowPayment) => rowPayment.verificationStatus).sort(),
    ).toEqual(["TERVERIFIKASI"]);
    expect(detail?.activities).toHaveLength(1);
    expect(detail?.statusHistory).toHaveLength(1);
    expect(detail?.statusHistory[0]).toMatchObject({
      fromStatus: null,
      toStatus: "PENDING",
      reasonCode: null,
      actorType: "CUSTOMER",
    });
  });

  it("mengembalikan nomor booking dan dp_forfeited pada daftar dan detail", async () => {
    await seedPackage();
    await seedReservation({
      id: "res-cancelled-dp",
      name: "Dewi Lestari",
      whatsapp: "6281377778888",
      status: "DIBATALKAN",
      bookingNumber: "HADCC-2026-0009",
    });
    await db
      .update(reservation)
      .set({ dpForfeited: true })
      .where(eq(reservation.id, "res-cancelled-dp"));

    const rows = await listReservations({
      filter: "dibatalkan",
      search: "HADCC-2026-0009",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "res-cancelled-dp",
      status: "DIBATALKAN",
      bookingNumber: "HADCC-2026-0009",
    });

    await expect(getReservationDetail("res-cancelled-dp")).resolves.toMatchObject({
      id: "res-cancelled-dp",
      status: "DIBATALKAN",
      bookingNumber: "HADCC-2026-0009",
      dpForfeited: true,
    });
  });

  it("menampilkan sumber FORM_PUBLIK dan INPUT_ADMIN pada daftar dan detail", async () => {
    await seedPackage();
    await seedReservation({
      id: "res-publik",
      name: "Siti Aminah",
      whatsapp: "6281234567890",
      source: "FORM_PUBLIK",
    });
    await seedReservation({
      id: "res-admin",
      name: "Budi Santoso",
      whatsapp: "6281311112222",
      source: "INPUT_ADMIN",
    });

    const rows = await listReservations({ filter: "proses" });
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.id === "res-publik")?.source).toBe(
      "FORM_PUBLIK",
    );
    expect(rows.find((row) => row.id === "res-admin")?.source).toBe(
      "INPUT_ADMIN",
    );

    await expect(getReservationDetail("res-publik")).resolves.toMatchObject({
      id: "res-publik",
      source: "FORM_PUBLIK",
    });
    await expect(getReservationDetail("res-admin")).resolves.toMatchObject({
      id: "res-admin",
      source: "INPUT_ADMIN",
    });
  });

  it("membaca rescheduleCount pada detail tanpa membocorkannya ke publik", async () => {
    await seedPackage();
    await seedReservation({
      id: "res-reschedule-count",
      name: "Rina Wati",
      whatsapp: "6281355556666",
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0010",
      rescheduleCount: 1,
    });

    await expect(getReservationDetail("res-reschedule-count")).resolves.toMatchObject(
      {
        id: "res-reschedule-count",
        status: "DITERIMA",
        rescheduleCount: 1,
      },
    );

    const proof = await getPublicBookingByNumber("HADCC-2026-0010");
    expect(proof).toMatchObject({
      bookingNumber: "HADCC-2026-0010",
      status: "DITERIMA",
    });
    expect(proof).not.toHaveProperty("rescheduleCount");
  });

  it("mengembalikan null untuk reservasi yang tidak ada", async () => {
    await expect(getReservationDetail("tidak-ada")).resolves.toBeNull();
  });
});
