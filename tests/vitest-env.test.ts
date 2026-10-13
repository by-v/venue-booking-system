import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

function databaseNameFromUrl(url: string): string {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
}

describe("environment Vitest", () => {
  it("mengarahkan koneksi aplikasi di bawah tes ke database uji", () => {
    expect(databaseNameFromUrl(env.DATABASE_URL)).toMatch(/_test$/);
    expect(env.DATABASE_URL).toBe(process.env.TEST_DATABASE_URL);
  });

  it("benar-benar terhubung ke database uji", async () => {
    const result = await db.execute(sql`SELECT current_database()`);
    const currentDb = result.rows[0]?.current_database;

    expect(typeof currentDb).toBe("string");
    expect((currentDb as string).endsWith("_test")).toBe(true);
  });
});
