import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

const MIGRATION_TABLE_PATTERN = /migration|drizzle/i;

/**
 * Mengosongkan seluruh tabel aplikasi di schema `public` pada database uji.
 *
 * Fail-closed: menolak berjalan bila `SELECT current_database()` tidak
 * berakhiran `_test`. Tabel migrasi (schema `drizzle`) dan tabel yang namanya
 * memuat `migration`/`drizzle` dikecualikan sebagai sabuk pengaman.
 */
export async function truncateAll(): Promise<void> {
  const result = await db.execute(sql`SELECT current_database()`);
  const currentDb = result.rows[0]?.current_database;

  if (typeof currentDb !== "string" || !currentDb.endsWith("_test")) {
    throw new Error(`Refusing to truncate: connected to ${String(currentDb)}`);
  }

  const tables = await db.execute(sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
  `);

  const applicationTables = tables.rows
    .map((row) => row.tablename)
    .filter((name): name is string => typeof name === "string")
    .filter((name) => !MIGRATION_TABLE_PATTERN.test(name));

  if (applicationTables.length === 0) {
    return;
  }

  await db.execute(
    sql`TRUNCATE TABLE ${sql.join(
      applicationTables.map((name) => sql.identifier(name)),
      sql`, `,
    )} RESTART IDENTITY CASCADE`,
  );
}
