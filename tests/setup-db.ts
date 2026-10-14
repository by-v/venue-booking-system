import "@/lib/load-env";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { afterAll, afterEach } from "vitest";
import { assertSafeTestDatabase } from "./helpers/assert-safe-test-db";
import { TEST_DB_ADVISORY_LOCK_KEY } from "./helpers/db-lock";
import { Client } from "pg";

// Fail-closed: batalkan seluruh suite bila database uji tidak aman.
assertSafeTestDatabase({
  testUrl: process.env.TEST_DATABASE_URL,
  devUrl: process.env.DATABASE_URL,
});

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const lockClient = new Client({ connectionString: process.env.TEST_DATABASE_URL });
let lockHeld = false;
try {
  await lockClient.connect();
  await lockClient.query("SELECT pg_advisory_lock($1)", [
    TEST_DB_ADVISORY_LOCK_KEY,
  ]);
  lockHeld = true;
} catch (err) {
  try {
    await lockClient.end();
  } catch {}
  throw err;
}

const { db } = await import("@/lib/db");
const { truncateAll } = await import("./helpers/truncate");

const currentDbResult = await db.execute(sql`SELECT current_database() AS db`);
const currentDbName = String(currentDbResult.rows[0]?.db ?? "");
if (!currentDbName.endsWith("_test")) {
  try {
    if (lockHeld) {
      await lockClient.query("SELECT pg_advisory_unlock($1)", [
        TEST_DB_ADVISORY_LOCK_KEY,
      ]);
    }
    await lockClient.end();
  } catch {}
  throw new Error(
    `Database aktif bukan database uji, migrasi dibatalkan (${currentDbName})`,
  );
}

await migrate(db, { migrationsFolder: "./migrations" });

afterEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  try {
    if (lockHeld) {
      await lockClient.query("SELECT pg_advisory_unlock($1)", [
        TEST_DB_ADVISORY_LOCK_KEY,
      ]);
    }
  } finally {
    try {
      await lockClient.end();
    } catch {}
  }
});
