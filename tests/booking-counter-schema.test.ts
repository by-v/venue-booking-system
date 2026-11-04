import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { bookingCounter } from "@/lib/db/schema";

describe("constraint skema booking_counter", () => {
  it("menerima tahun dan urutan awal yang valid", async () => {
    await db.insert(bookingCounter).values({ year: 2026 });

    const rows = await db.select().from(bookingCounter);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.lastSequence).toBe(0);
  });

  it("menolak tahun ganda", async () => {
    await db.insert(bookingCounter).values({ year: 2026, lastSequence: 1 });

    await expect(
      db.insert(bookingCounter).values({ year: 2026, lastSequence: 2 }),
    ).rejects.toThrow();
  });

  it("menolak urutan negatif", async () => {
    await expect(
      db.insert(bookingCounter).values({ year: 2026, lastSequence: -1 }),
    ).rejects.toThrow();
  });

  it("menolak tahun di luar 2000-9999", async () => {
    for (const year of [1999, 10000]) {
      await expect(
        db.insert(bookingCounter).values({ year, lastSequence: 0 }),
      ).rejects.toThrow();
    }
  });
});
