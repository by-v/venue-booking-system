import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  facility,
  galleryItem,
  packageFacility,
  packageTable,
  venue,
} from "@/lib/db/schema";

function validVenue(id = 1) {
  return {
    id,
    name: "H.A. Djunaid Convention Center",
    address: "Jl. Pelita II, Buaran, Pekalongan Selatan",
    capacityMin: 200,
    capacityMax: 2000,
    description: "Gedung pertemuan.",
  };
}

function validPackage(id = "full-service") {
  return {
    id,
    name: "Full Service",
    priceRupiah: 20_000_000,
    durationHours: 5,
    sessionCount: 1,
    setupDaysBefore: 0,
    sortOrder: 1,
  };
}

function validFacility(id = "ac") {
  return { id, name: "AC", sortOrder: 1 };
}

describe("constraint skema venue", () => {
  it("menolak relasi package_facility duplikat", async () => {
    await db.insert(venue).values(validVenue());
    await db.insert(packageTable).values(validPackage());
    await db.insert(facility).values(validFacility());

    await db
      .insert(packageFacility)
      .values({ packageId: "full-service", facilityId: "ac" });

    await expect(
      db
        .insert(packageFacility)
        .values({ packageId: "full-service", facilityId: "ac" }),
    ).rejects.toThrow();
  });

  it("menolak harga paket negatif", async () => {
    await expect(
      db
        .insert(packageTable)
        .values({ ...validPackage(), priceRupiah: -1 }),
    ).rejects.toThrow();
  });

  it("menolak jumlah sesi kurang dari satu", async () => {
    await expect(
      db.insert(packageTable).values({ ...validPackage(), sessionCount: 0 }),
    ).rejects.toThrow();
  });

  it("menolak kategori galeri di luar daftar jenis acara", async () => {
    await expect(
      db.insert(galleryItem).values({
        id: "galeri-1",
        title: "Dokumentasi",
        category: "TIDAK_ADA",
        imagePath: "/galeri/venue-01.jpeg",
        sortOrder: 1,
      }),
    ).rejects.toThrow();
  });

  it("menolak baris venue kedua (singleton)", async () => {
    await db.insert(venue).values(validVenue(1));

    await expect(db.insert(venue).values(validVenue(2))).rejects.toThrow();
  });

  it("menerima data venue dan paket yang valid", async () => {
    await db.insert(venue).values(validVenue());
    await db.insert(packageTable).values(validPackage());

    const rows = await db.select().from(packageTable);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.priceRupiah).toBe(20_000_000);
  });
});
