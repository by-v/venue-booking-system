import { sql } from "drizzle-orm";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { db } from "@/lib/db";

// Tabel probe nyata di database uji (tabel Better Auth belum ada sampai grup 7).
const PROBE_TABLE = "db_test_probe";

async function currentDatabaseName(): Promise<unknown> {
  const result = await db.execute(sql`SELECT current_database()`);
  return result.rows[0]?.current_database;
}

async function assertTestDatabase(): Promise<void> {
  const currentDb = await currentDatabaseName();
  if (typeof currentDb !== "string" || !currentDb.endsWith("_test")) {
    throw new Error(
      `Refusing to modify tables: connected to ${String(currentDb)}`,
    );
  }
}

async function countProbeRows(): Promise<number> {
  const result = await db.execute(
    sql`SELECT count(*)::int AS count FROM ${sql.identifier(PROBE_TABLE)}`,
  );
  return Number(result.rows[0]?.count);
}

describe("instance db", () => {
  beforeAll(async () => {
    await assertTestDatabase();
    await db.execute(sql`DROP TABLE IF EXISTS ${sql.identifier(PROBE_TABLE)}`);
    await db.execute(
      sql`CREATE TABLE ${sql.identifier(PROBE_TABLE)} (id serial PRIMARY KEY, note text NOT NULL)`,
    );
  });

  beforeEach(async () => {
    await assertTestDatabase();
    await db.execute(
      sql`TRUNCATE TABLE ${sql.identifier(PROBE_TABLE)} RESTART IDENTITY`,
    );
  });

  afterAll(async () => {
    await db.execute(sql`DROP TABLE IF EXISTS ${sql.identifier(PROBE_TABLE)}`);
  });

  it("membuka koneksi ke database uji", async () => {
    const result = await db.execute(sql`SELECT 1 AS ok`);
    expect(Number(result.rows[0]?.ok)).toBe(1);

    const currentDb = await currentDatabaseName();
    expect(typeof currentDb).toBe("string");
    expect((currentDb as string).endsWith("_test")).toBe(true);
  });

  it("dapat men-commit transaksi secara eksplisit", async () => {
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`INSERT INTO ${sql.identifier(PROBE_TABLE)} (note) VALUES ('committed')`,
      );
    });

    expect(await countProbeRows()).toBe(1);
  });

  it("membatalkan perubahan saat transaksi di-rollback", async () => {
    await expect(
      db.transaction(async (tx) => {
        await tx.execute(
          sql`INSERT INTO ${sql.identifier(PROBE_TABLE)} (note) VALUES ('rolled-back')`,
        );
        tx.rollback();
      }),
    ).rejects.toThrow();

    expect(await countProbeRows()).toBe(0);
  });
});
