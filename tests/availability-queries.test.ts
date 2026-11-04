import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { dateLock, packageTable } from "@/lib/db/schema";
import {
  getPublicAvailability,
  listDateLocksInRange,
} from "@/modules/availability/queries";

function pkg(
  id: string,
  setupDaysBefore: number,
  active = true,
): typeof packageTable.$inferInsert {
  return {
    id,
    name: `Paket ${id}`,
    priceRupiah: 20_000_000,
    durationHours: 5,
    sessionCount: 1,
    setupDaysBefore,
    active,
    sortOrder: 1,
  };
}

async function seedLocks(): Promise<void> {
  await db.insert(dateLock).values([
    { date: "2027-03-18", kind: "SETUP", reservationId: null },
    { date: "2027-03-20", kind: "EVENT", reservationId: null },
  ]);
}

describe("query domain ketersediaan", () => {
  it("membaca kunci tanggal dalam rentang beserta jenisnya", async () => {
    await seedLocks();

    const locks = await listDateLocksInRange("2027-03-01", "2027-03-31");
    expect(locks).toEqual([
      { date: "2027-03-18", kind: "SETUP" },
      { date: "2027-03-20", kind: "EVENT" },
    ]);

    expect(await listDateLocksInRange("2027-04-01", "2027-04-30")).toEqual([]);
  });

  it("menandai tanggal terkunci sebagai Terisi untuk paket tanpa setup", async () => {
    await db.insert(packageTable).values(pkg("full-service", 0));
    await seedLocks();

    const days = await getPublicAvailability({
      packageId: "full-service",
      month: "2027-03",
      today: "2027-03-01",
    });

    const byDate = new Map(days.map((day) => [day.date, day.status]));
    expect(byDate.get("2027-03-18")).toBe("TERISI");
    expect(byDate.get("2027-03-19")).toBe("TERSEDIA");
    expect(byDate.get("2027-03-20")).toBe("TERISI");
  });

  it("ketersediaan bergantung pada jendela setup paket", async () => {
    await db.insert(packageTable).values(pkg("outdoor", 2));
    await seedLocks();

    const days = await getPublicAvailability({
      packageId: "outdoor",
      month: "2027-03",
      today: "2027-03-01",
    });

    const byDate = new Map(days.map((day) => [day.date, day.status]));
    expect(byDate.get("2027-03-18")).toBe("TERISI");
    expect(byDate.get("2027-03-19")).toBe("TERISI");
    expect(byDate.get("2027-03-20")).toBe("TERISI");
    expect(byDate.get("2027-03-21")).toBe("TERISI");
    expect(byDate.get("2027-03-22")).toBe("TERISI");
    expect(byDate.get("2027-03-23")).toBe("TERSEDIA");
  });

  it("menandai tanggal lampau dan hari ini sebagai Terisi", async () => {
    await db.insert(packageTable).values(pkg("full-service", 0));

    const days = await getPublicAvailability({
      packageId: "full-service",
      month: "2027-03",
      today: "2027-03-10",
    });

    const byDate = new Map(days.map((day) => [day.date, day.status]));
    expect(byDate.get("2027-03-09")).toBe("TERISI");
    expect(byDate.get("2027-03-10")).toBe("TERISI");
    expect(byDate.get("2027-03-11")).toBe("TERSEDIA");
  });

  it("hasil publik hanya berisi tanggal dan status", async () => {
    await db.insert(packageTable).values(pkg("outdoor", 2));
    await seedLocks();

    const days = await getPublicAvailability({
      packageId: "outdoor",
      month: "2027-03",
      today: "2027-03-01",
    });

    for (const day of days) {
      expect(Object.keys(day).sort()).toEqual(["date", "status"]);
    }
  });

  it("bulan tanpa kunci mengembalikan semua tanggal Tersedia", async () => {
    await db.insert(packageTable).values(pkg("full-service", 0));

    const days = await getPublicAvailability({
      packageId: "full-service",
      month: "2027-04",
      today: "2027-03-01",
    });

    expect(days).toHaveLength(30);
    expect(days.every((day) => day.status === "TERSEDIA")).toBe(true);
  });

  it("paket nonaktif tidak memiliki ketersediaan", async () => {
    await db.insert(packageTable).values(pkg("nonaktif", 0, false));

    expect(
      await getPublicAvailability({
        packageId: "nonaktif",
        month: "2027-04",
        today: "2027-03-01",
      }),
    ).toEqual([]);
  });
});
