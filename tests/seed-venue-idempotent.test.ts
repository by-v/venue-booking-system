import { count } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  facility,
  packageFacility,
  packageTable,
  venue,
} from "@/lib/db/schema";
import { applyVenueSeed } from "@/modules/venue/run-seed";
import { buildVenueSeed } from "@/modules/venue/seed-data";

async function countRows(table: PgTable): Promise<number> {
  const [row] = await db.select({ value: count() }).from(table);
  return Number(row?.value ?? 0);
}

describe("seed venue idempoten", () => {
  it("menulis dua kali tidak menggandakan venue, paket, atau fasilitas", async () => {
    const seed = buildVenueSeed();

    await applyVenueSeed(seed);
    await applyVenueSeed(seed);

    expect(await countRows(venue)).toBe(1);
    expect(await countRows(packageTable)).toBe(seed.packages.length);
    expect(await countRows(facility)).toBe(seed.facilities.length);
    expect(await countRows(packageFacility)).toBe(
      seed.packageFacilities.length,
    );
  });

  it("menjaga jumlah baris tetap sama saat seed dijalankan berulang", async () => {
    const seed = buildVenueSeed();

    await applyVenueSeed(seed);
    await applyVenueSeed(seed);
    await applyVenueSeed(seed);

    expect(await countRows(venue)).toBe(1);
    expect(await countRows(packageTable)).toBe(4);
    expect(await countRows(facility)).toBe(9);
    expect(await countRows(packageFacility)).toBe(33);
  });
});
