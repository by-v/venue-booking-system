import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";

const AUTH_TABLES = [
  "user",
  "session",
  "account",
  "verification",
  "rate_limit",
];

describe("migrasi diterapkan sebelum suite", () => {
  it("tabel auth sudah ada di database uji saat tes dimulai", async () => {
    const result = await db.execute(
      sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
    );
    const tables = result.rows.map((row) => String(row.tablename));

    for (const table of AUTH_TABLES) {
      expect(tables).toContain(table);
    }
  });
});
