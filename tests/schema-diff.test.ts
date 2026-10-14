import { getTableColumns, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { createAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

const AUTH_TABLES: Array<[string, PgTable]> = [
  ["user", schema.user],
  ["session", schema.session],
  ["account", schema.account],
  ["verification", schema.verification],
  ["rate_limit", schema.rateLimit],
];

async function publicTables(): Promise<string[]> {
  const result = await db.execute(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  return result.rows.map((row) => String(row.tablename));
}

async function columnsOf(table: string): Promise<string[]> {
  const result = await db.execute(
    sql`SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${table}
        ORDER BY column_name`,
  );
  return result.rows.map((row) => String(row.column_name));
}

describe("selisih skema Drizzle dan basis data", () => {
  it("tidak ada selisih: setiap tabel auth ada beserta rateLimit", async () => {
    const tables = await publicTables();
    for (const [name] of AUTH_TABLES) {
      expect(tables).toContain(name);
    }
  });

  it("kolom setiap tabel auth sama dengan definisi skema Drizzle", async () => {
    for (const [name, table] of AUTH_TABLES) {
      const expected = Object.values(getTableColumns(table))
        .map((column) => column.name)
        .sort();
      const actual = await columnsOf(name);
      expect(actual).toEqual(expected);
    }
  });

  it("Better Auth tidak membuat tabel baru saat operasi auth dijalankan", async () => {
    const auth = createAuth({ allowSignUp: true });
    const before = await publicTables();

    // Operasi baca yang menyentuh konfigurasi auth; tidak boleh memicu
    // pembuatan tabel (Better Auth tidak melakukan migrasi otomatis).
    await auth.api.getSession({ headers: new Headers() });

    const after = await publicTables();
    expect(after).toEqual(before);
  });
});
