import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { truncateAll } from "./helpers/truncate";

const APP_TABLE = "truncate_probe_app";
const MIGRATION_TABLE = "truncate_probe_migrations";

async function currentDatabaseName(): Promise<unknown> {
  const result = await db.execute(sql`SELECT current_database()`);
  return result.rows[0]?.current_database;
}

async function countRows(table: string): Promise<number> {
  const result = await db.execute(
    sql`SELECT count(*)::int AS count FROM ${sql.identifier(table)}`,
  );
  return Number(result.rows[0]?.count);
}

describe("truncateAll", () => {
  beforeAll(async () => {
    const currentDb = await currentDatabaseName();
    if (typeof currentDb !== "string" || !currentDb.endsWith("_test")) {
      throw new Error(
        `Refusing to modify tables: connected to ${String(currentDb)}`,
      );
    }

    await db.execute(
      sql`DROP TABLE IF EXISTS ${sql.identifier(APP_TABLE)}, ${sql.identifier(MIGRATION_TABLE)}`,
    );
    await db.execute(
      sql`CREATE TABLE ${sql.identifier(APP_TABLE)} (id serial PRIMARY KEY, note text)`,
    );
    await db.execute(
      sql`CREATE TABLE ${sql.identifier(MIGRATION_TABLE)} (id serial PRIMARY KEY, note text)`,
    );
    await db.execute(
      sql`INSERT INTO ${sql.identifier(APP_TABLE)} (note) VALUES ('a'), ('b')`,
    );
    await db.execute(
      sql`INSERT INTO ${sql.identifier(MIGRATION_TABLE)} (note) VALUES ('keep')`,
    );
  });

  afterAll(async () => {
    await db.execute(
      sql`DROP TABLE IF EXISTS ${sql.identifier(APP_TABLE)}, ${sql.identifier(MIGRATION_TABLE)}`,
    );
  });

  it("mengosongkan tabel aplikasi tetapi tidak tabel migrasi", async () => {
    expect(await countRows(APP_TABLE)).toBe(2);
    expect(await countRows(MIGRATION_TABLE)).toBe(1);

    await truncateAll();

    expect(await countRows(APP_TABLE)).toBe(0);
    expect(await countRows(MIGRATION_TABLE)).toBe(1);
  });
});
