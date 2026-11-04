import { describe, expect, it } from "vitest";

import { buildVenueSeed } from "@/modules/venue/seed-data";

describe("seed data venue tanpa data demo", () => {
  it("memuat satu venue dan empat paket dengan harga sesuai handoff", () => {
    const seed = buildVenueSeed();

    expect(seed.venue.name).toBe("H.A. Djunaid Convention Center");
    expect(seed.venue.capacityMin).toBe(200);
    expect(seed.venue.capacityMax).toBe(2000);
    expect(seed.packages).toHaveLength(4);
    expect(seed.packages.map((p) => p.priceRupiah).sort((a, b) => a - b)).toEqual([
      20_000_000, 22_000_000, 25_000_000, 35_000_000,
    ]);
  });

  it("memuat durasi, jumlah sesi, dan hari setup sesuai aturan", () => {
    const seed = buildVenueSeed();

    for (const pkg of seed.packages) {
      expect(pkg.durationHours).toBe(5);
    }

    const sessions = Object.fromEntries(
      seed.packages.map((pkg) => [pkg.id, pkg.sessionCount]),
    );
    expect(sessions).toEqual({
      "full-service": 1,
      "full-service-acara-malam": 1,
      "full-service-outdoor": 1,
      "full-service-walimah-resepsi": 2,
    });

    const setup = Object.fromEntries(
      seed.packages.map((pkg) => [pkg.id, pkg.setupDaysBefore]),
    );
    expect(setup).toEqual({
      "full-service": 0,
      "full-service-acara-malam": 0,
      "full-service-outdoor": 2,
      "full-service-walimah-resepsi": 3,
    });
  });

  it('menyimpan "Fasilitas SDA" apa adanya', () => {
    const seed = buildVenueSeed();

    const sda = seed.facilities.find((item) => item.id === "fasilitas-sda");
    expect(sda?.name).toBe("Fasilitas SDA");
  });

  it("menautkan fasilitas ke paket dan menambah parkir hanya untuk Outdoor", () => {
    const seed = buildVenueSeed();

    const parking = seed.packageFacilities.filter(
      (link) => link.facilityId === "area-parkir-timur",
    );
    expect(parking).toEqual([
      { packageId: "full-service-outdoor", facilityId: "area-parkir-timur" },
    ]);

    // 8 fasilitas dasar untuk 4 paket + 1 tautan parkir.
    expect(seed.packageFacilities).toHaveLength(8 * 4 + 1);
  });

  it("tidak memuat entri customer, reservasi, atau demo", () => {
    const seed = buildVenueSeed();

    expect(Object.keys(seed).sort()).toEqual([
      "facilities",
      "packageFacilities",
      "packages",
      "venue",
    ]);

    const json = JSON.stringify(seed).toLowerCase();
    expect(json).not.toContain("customer");
    expect(json).not.toContain("reservation");
    expect(json).not.toContain("reservasi");
    expect(json).not.toContain("demo");
  });
});
