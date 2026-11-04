import { describe, expect, it } from "vitest";

import { setPackageActive, upsertPackage } from "@/modules/venue/mutations";
import { listActivePackages, listAllPackages } from "@/modules/venue/queries";
import type { PackageInput } from "@/modules/venue/schema";

function packageInput(
  overrides: Partial<PackageInput> & { id: string },
): PackageInput {
  return {
    name: "Full Service",
    priceRupiah: 20_000_000,
    durationHours: 5,
    sessionCount: 1,
    setupDaysBefore: 0,
    active: true,
    sortOrder: 1,
    ...overrides,
  };
}

describe("perubahan harga tampil tanpa deploy", () => {
  it("query baca publik mengembalikan harga yang baru saja diubah", async () => {
    await upsertPackage(packageInput({ id: "full-service" }));
    let active = await listActivePackages();
    expect(active[0]?.priceRupiah).toBe(20_000_000);

    await upsertPackage(
      packageInput({ id: "full-service", priceRupiah: 21_500_000 }),
    );
    active = await listActivePackages();
    expect(active[0]?.priceRupiah).toBe(21_500_000);
  });

  it("paket nonaktif hilang dari daftar aktif (dipakai form reservasi) tetapi tetap ada untuk admin", async () => {
    await upsertPackage(packageInput({ id: "full-service" }));

    await setPackageActive("full-service", false);

    expect(await listActivePackages()).toHaveLength(0);

    const all = await listAllPackages();
    expect(all.map((item) => item.id)).toEqual(["full-service"]);
    expect(all[0]?.active).toBe(false);

    await setPackageActive("full-service", true);
    expect((await listActivePackages()).map((item) => item.id)).toEqual([
      "full-service",
    ]);
  });
});
