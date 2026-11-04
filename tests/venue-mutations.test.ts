import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  facility,
  packageFacility,
  packageTable,
} from "@/lib/db/schema";
import {
  deleteFacility,
  replaceFacilityPackages,
  updateVenueContact,
  updateVenueProfile,
  upsertFacility,
  upsertPackage,
} from "@/modules/venue/mutations";
import { getPublicVenue, listFacilitiesWithPackages } from "@/modules/venue/queries";
import { packageInputSchema, type PackageInput } from "@/modules/venue/schema";

function packageInput(
  overrides: Partial<PackageInput> & { id: string },
): PackageInput {
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

describe("mutasi domain venue", () => {
  it("membuat lalu mengubah paket", async () => {
    await upsertPackage(
      packageInput({ id: "full-service", priceRupiah: 20_000_000 }),
    );
    let rows = await db.select().from(packageTable);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.priceRupiah).toBe(20_000_000);

    await upsertPackage(
      packageInput({
        id: "full-service",
        priceRupiah: 22_000_000,
        name: "Full Service (baru)",
      }),
    );
    rows = await db.select().from(packageTable);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.priceRupiah).toBe(22_000_000);
    expect(rows[0]?.name).toBe("Full Service (baru)");
  });

  it("menolak harga desimal, harga negatif, dan sesi < 1", async () => {
    await expect(
      upsertPackage(packageInput({ id: "desimal", priceRupiah: 1.5 })),
    ).rejects.toBeTruthy();
    await expect(
      upsertPackage(packageInput({ id: "negatif", priceRupiah: -1 })),
    ).rejects.toBeTruthy();
    await expect(
      upsertPackage(packageInput({ id: "sesi", sessionCount: 0 })),
    ).rejects.toBeTruthy();

    expect(await db.select().from(packageTable)).toHaveLength(0);
  });

  it("menolak nilai tidak valid pada skema input admin", () => {
    expect(
      packageInputSchema.safeParse(packageInput({ id: "p", priceRupiah: 1.5 }))
        .success,
    ).toBe(false);
    expect(
      packageInputSchema.safeParse(packageInput({ id: "p", priceRupiah: -1 }))
        .success,
    ).toBe(false);
    expect(
      packageInputSchema.safeParse(packageInput({ id: "p", sessionCount: 0 }))
        .success,
    ).toBe(false);
  });

  it("menautkan relasi fasilitas-paket dan menolak duplikat", async () => {
    await upsertPackage(packageInput({ id: "full-service" }));
    await upsertPackage(packageInput({ id: "outdoor", sortOrder: 2 }));
    await upsertFacility({
      id: "ac",
      name: "AC",
      description: null,
      active: true,
      sortOrder: 1,
    });

    await replaceFacilityPackages("ac", ["full-service", "outdoor"]);
    let links = await db.select().from(packageFacility);
    expect(links).toHaveLength(2);

    await expect(
      replaceFacilityPackages("ac", ["full-service", "full-service"]),
    ).rejects.toBeTruthy();

    // Transaksi yang gagal tidak menghapus relasi lama.
    links = await db.select().from(packageFacility);
    expect(links).toHaveLength(2);

    const facilities = await listFacilitiesWithPackages();
    expect(facilities[0]?.packageIds.sort()).toEqual([
      "full-service",
      "outdoor",
    ]);
  });

  it("menolak menghapus fasilitas yang masih direferensikan paket", async () => {
    await upsertPackage(packageInput({ id: "full-service" }));
    await upsertFacility({
      id: "ac",
      name: "AC",
      description: null,
      active: true,
      sortOrder: 1,
    });
    await replaceFacilityPackages("ac", ["full-service"]);

    await expect(deleteFacility("ac")).rejects.toBeTruthy();
    expect(await db.select().from(facility)).toHaveLength(1);
  });

  it("mengubah venue dan nomor WhatsApp tersimpan", async () => {
    await updateVenueProfile({
      name: "H.A. Djunaid Convention Center",
      address: "Jl. Pelita II",
      capacityMin: 200,
      capacityMax: 2000,
      description: "Gedung pertemuan.",
    });
    await updateVenueContact({
      adminWhatsapp: "081234567890",
      contact: null,
      email: "wawangcc@gmail.com",
      instagramUrl: "https://www.instagram.com/h.a.djunaid",
      mapUrl: null,
    });

    const venue = await getPublicVenue();
    expect(venue?.name).toBe("H.A. Djunaid Convention Center");
    expect(venue?.adminWhatsapp).toBe("081234567890");
    expect(venue?.email).toBe("wawangcc@gmail.com");
  });
});
