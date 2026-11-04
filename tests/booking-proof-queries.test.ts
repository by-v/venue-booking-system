import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  facility,
  packageFacility,
  reservation,
  reservationActivity,
  reservationStatusHistory,
} from "@/lib/db/schema";
import { getPublicBookingByNumber } from "@/modules/reservation/queries";

import { seedReservation } from "./helpers/seed-reservation";

async function seedFacilities(packageId = "paket-uji"): Promise<void> {
  await db.insert(facility).values([
    {
      id: "fasilitas-panggung",
      name: "Panggung",
      active: true,
      sortOrder: 1,
    },
    {
      id: "fasilitas-kursi",
      name: "Kursi Tambahan",
      active: true,
      sortOrder: 2,
    },
    {
      id: "fasilitas-nonaktif",
      name: "Fasilitas Lama",
      active: false,
      sortOrder: 3,
    },
  ]);
  await db.insert(packageFacility).values([
    { packageId, facilityId: "fasilitas-panggung" },
    { packageId, facilityId: "fasilitas-kursi" },
    { packageId, facilityId: "fasilitas-nonaktif" },
  ]);
}

describe("query publik berdasarkan nomor booking", () => {
  it("mengembalikan data publik reservasi DITERIMA", async () => {
    await seedReservation({
      reservationId: "reservasi-publik",
      customerId: "customer-publik",
      customerName: "Budi Santoso",
      customerWhatsapp: "628111222333",
      status: "DITERIMA",
      bookingNumber: "HADCC-2027-0001",
      packagePriceRupiah: 20_000_000,
      items: [{ description: "Tambahan kursi", amountRupiah: 2_000_000 }],
      payments: [
        { amountRupiah: 6_000_000, verificationStatus: "TERVERIFIKASI" },
      ],
    });
    await seedFacilities();

    const proof = await getPublicBookingByNumber("hadcc-2027-0001");

    expect(proof).toMatchObject({
      bookingNumber: "HADCC-2027-0001",
      maskedCustomerName: "B*** S***",
      eventDate: "2027-03-20",
      eventType: "PERNIKAHAN",
      packageName: "Paket Uji",
      packageDurationHours: 5,
      packageSessionCount: 1,
      packagePriceRupiah: 20_000_000,
      facilities: ["Panggung", "Kursi Tambahan"],
      totalRupiah: 22_000_000,
      minimumDpRupiah: 5_500_000,
      verifiedPaymentRupiah: 6_000_000,
      remainingRupiah: 16_000_000,
      paymentStatus: "DP",
      status: "DITERIMA",
    });
  });

  it("menerima nomor booking dengan spasi dan huruf kecil", async () => {
    await seedReservation({
      status: "DITERIMA",
      bookingNumber: "HADCC-2027-0002",
      customerName: "Rina Wati",
    });

    const proof = await getPublicBookingByNumber("  hadcc-2027-0002 ");

    expect(proof?.bookingNumber).toBe("HADCC-2027-0002");
    expect(proof?.maskedCustomerName).toBe("R*** W***");
  });

  it("tidak menemukan reservasi PENDING tanpa nomor booking", async () => {
    await seedReservation({
      reservationId: "reservasi-pending",
      customerId: "customer-pending",
      status: "PENDING",
    });

    const proof = await getPublicBookingByNumber("HADCC-2027-0001");

    expect(proof).toBeNull();
  });

  it("tidak menemukan reservasi DITANGGUHKAN tanpa nomor booking", async () => {
    await seedReservation({
      reservationId: "reservasi-ditangguhkan",
      customerId: "customer-ditangguhkan",
      status: "DITANGGUHKAN",
      bookingNumber: "HADCC-2027-0003",
    });

    const proof = await getPublicBookingByNumber("HADCC-2027-0003");
    expect(proof).toBeNull();

    await seedReservation({
      reservationId: "reservasi-ditangguhkan-tanpa-nomor",
      customerId: "customer-ditangguhkan-tanpa-nomor",
      customerWhatsapp: "628777666555",
      status: "DITANGGUHKAN",
    });

    const missing = await getPublicBookingByNumber("HADCC-2027-0004");
    expect(missing).toBeNull();
  });

  it("menolak format nomor yang tidak valid", async () => {
    await seedReservation({
      status: "DITERIMA",
      bookingNumber: "HADCC-2027-0005",
    });

    await expect(getPublicBookingByNumber("")).resolves.toBeNull();
    await expect(getPublicBookingByNumber("Budi Santoso")).resolves.toBeNull();
    await expect(getPublicBookingByNumber("HADCC-2027")).resolves.toBeNull();
    await expect(getPublicBookingByNumber("HADCC-2027-12a")).resolves.toBeNull();
  });

  it("tidak mengembalikan field sensitif", async () => {
    await seedReservation({
      reservationId: "reservasi-aman",
      customerId: "customer-aman",
      customerName: "Budi Santoso",
      customerWhatsapp: "628999888777",
      status: "DITERIMA",
      bookingNumber: "HADCC-2027-0006",
    });
    await db
      .update(reservation)
      .set({
        address: "Alamat internal yang tidak boleh tampil",
        notes: "Catatan internal yang tidak boleh tampil",
      })
      .where(eq(reservation.id, "reservasi-aman"));
    await db.insert(reservationActivity).values({
      id: "aktivitas-aman",
      reservationId: "reservasi-aman",
      type: "FOLLOW_UP_NOTE",
      note: "Catatan tindak lanjut internal",
      actorType: "ADMIN",
      isSubstantive: true,
    });
    await db.insert(reservationStatusHistory).values({
      id: "riwayat-aman",
      reservationId: "reservasi-aman",
      fromStatus: null,
      toStatus: "DITERIMA",
      actorType: "ADMIN",
    });

    const proof = await getPublicBookingByNumber("HADCC-2027-0006");

    expect(proof).not.toBeNull();
    expect(proof?.maskedCustomerName).toBe("B*** S***");
    expect(Object.keys(proof ?? {}).sort()).toEqual(
      [
        "bookingNumber",
        "eventDate",
        "eventType",
        "facilities",
        "maskedCustomerName",
        "minimumDpRupiah",
        "packageDurationHours",
        "packageName",
        "packagePriceRupiah",
        "packageSessionCount",
        "paymentStatus",
        "remainingRupiah",
        "status",
        "totalRupiah",
        "verifiedPaymentRupiah",
      ].sort(),
    );

    const serialized = JSON.stringify(proof);
    expect(serialized).not.toContain("628999888777");
    expect(serialized).not.toContain("Jl. Pelita II");
    expect(serialized).not.toContain("Alamat internal yang tidak boleh tampil");
    expect(serialized).not.toContain("Catatan internal yang tidak boleh tampil");
    expect(serialized).not.toContain("Catatan tindak lanjut internal");
    expect(serialized).not.toContain("aktivitas-aman");
    expect(serialized).not.toContain("riwayat-aman");
    expect(serialized).not.toContain("Budi Santoso");
    expect(serialized).not.toContain("customer-aman");
    expect(serialized).not.toContain("reservasi-aman");
  });
});
