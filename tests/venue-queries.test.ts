import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  facility,
  galleryItem,
  packageFacility,
  packageTable,
  venue,
} from "@/lib/db/schema";
import {
  getPublicVenue,
  listActiveGallery,
  listActivePackages,
  listFacilitiesWithPackages,
} from "@/modules/venue/queries";

function pkg(overrides: Partial<typeof packageTable.$inferInsert> & { id: string }) {
  return {
    name: "Paket",
    priceRupiah: 1_000_000,
    durationHours: 5,
    sessionCount: 1,
    setupDaysBefore: 0,
    active: true,
    sortOrder: 1,
    ...overrides,
  };
}

describe("query domain venue", () => {
  it("mengembalikan venue dari database", async () => {
    await db.insert(venue).values({
      id: 1,
      name: "H.A. Djunaid Convention Center",
      address: "Jl. Pelita II",
      capacityMin: 200,
      capacityMax: 2000,
      description: "Gedung pertemuan.",
      email: "wawangcc@gmail.com",
    });

    const result = await getPublicVenue();
    expect(result?.name).toBe("H.A. Djunaid Convention Center");
    expect(result?.email).toBe("wawangcc@gmail.com");
  });

  it("mengembalikan null saat venue belum diisi", async () => {
    expect(await getPublicVenue()).toBeNull();
  });

  it("tidak menyertakan paket nonaktif", async () => {
    await db.insert(packageTable).values([
      pkg({ id: "aktif", sortOrder: 1 }),
      pkg({ id: "nonaktif", active: false, sortOrder: 2 }),
    ]);

    const packages = await listActivePackages();
    expect(packages.map((item) => item.id)).toEqual(["aktif"]);
  });

  it("tidak menyertakan galeri nonaktif", async () => {
    await db.insert(galleryItem).values([
      {
        id: "aktif",
        title: "Aktif",
        category: "SEMINAR",
        imagePath: "/galeri/venue-01.jpeg",
        sortOrder: 1,
        active: true,
      },
      {
        id: "nonaktif",
        title: "Nonaktif",
        category: "KONSER",
        imagePath: "/galeri/venue-02.jpeg",
        sortOrder: 2,
        active: false,
      },
    ]);

    const gallery = await listActiveGallery();
    expect(gallery.map((item) => item.id)).toEqual(["aktif"]);
  });

  it("mengembalikan fasilitas aktif beserta relasi paket", async () => {
    await db.insert(packageTable).values(pkg({ id: "full-service" }));
    await db
      .insert(facility)
      .values({ id: "ac", name: "AC", sortOrder: 1 });
    await db
      .insert(packageFacility)
      .values({ packageId: "full-service", facilityId: "ac" });

    const facilities = await listFacilitiesWithPackages();
    expect(facilities).toHaveLength(1);
    expect(facilities[0]?.name).toBe("AC");
    expect(facilities[0]?.packageIds).toEqual(["full-service"]);
  });
});
