import { count } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

describe("pembersihan antar-tes", () => {
  it("tes pertama memasukkan satu baris user", async () => {
    await db.insert(user).values({
      id: "clean-between-1",
      name: "Pengguna Uji",
      email: "clean-between-1@example.test",
      emailVerified: false,
    });

    const [row] = await db.select({ value: count() }).from(user);
    expect(Number(row?.value)).toBe(1);
  });

  it("tes kedua tidak melihat data dari tes pertama", async () => {
    const [row] = await db.select({ value: count() }).from(user);
    expect(Number(row?.value)).toBe(0);
  });
});
