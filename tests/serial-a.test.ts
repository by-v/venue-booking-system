import { sql } from "drizzle-orm";
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";

// Kunci advisory eksklusif yang dipakai bersama oleh tests/serial-a.test.ts dan
// tests/serial-b.test.ts. Bila kedua berkas berjalan paralel, salah satu berkas
// gagal memperoleh kunci sehingga suite gagal (membuktikan eksekusi tidak serial).
const SERIAL_LOCK_KEY = 734512981;

// Jendela menahan kunci. Cukup lebar agar tumpang tindih antar berkas paralel
// selalu terdeteksi, namun tidak memperlambat suite secara berlebihan.
const HOLD_MS = 300;

// Koneksi khusus agar kunci sesi (session-level) dipegang oleh satu koneksi
// yang sama dari sebelum semua tes sampai sesudah semua tes.
const lockPool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
let lockClient: PoolClient | undefined;

beforeAll(async () => {
  const client = await lockPool.connect();
  const result = await client.query(
    "SELECT pg_try_advisory_lock($1) AS locked",
    [SERIAL_LOCK_KEY],
  );

  if (result.rows[0]?.locked !== true) {
    client.release();
    throw new Error(
      "serial-a gagal memperoleh kunci serial: berkas tes database lain berjalan bersamaan (eksekusi tidak serial)",
    );
  }

  lockClient = client;
});

afterAll(async () => {
  if (lockClient) {
    await lockClient.query("SELECT pg_advisory_unlock($1)", [SERIAL_LOCK_KEY]);
    lockClient.release();
    lockClient = undefined;
  }
  await lockPool.end();
});

describe("tes database serial (serial-a)", () => {
  it("berbagi database uji dan memegang kunci serial secara eksklusif", async () => {
    const current = await db.execute(sql`SELECT current_database()`);
    const currentDb = current.rows[0]?.current_database;

    expect(typeof currentDb).toBe("string");
    expect((currentDb as string).endsWith("_test")).toBe(true);

    // Selama berkas ini memegang kunci, sesi lain tidak boleh memperolehnya.
    const other = await lockPool.connect();
    try {
      const probe = await other.query(
        "SELECT pg_try_advisory_lock($1) AS locked",
        [SERIAL_LOCK_KEY],
      );
      const acquiredByOther = probe.rows[0]?.locked === true;

      if (acquiredByOther) {
        await other.query("SELECT pg_advisory_unlock($1)", [SERIAL_LOCK_KEY]);
      }

      expect(acquiredByOther).toBe(false);
    } finally {
      other.release();
    }

    // Tahan kunci melewati jendela waktu agar berkas paralel terdeteksi.
    await new Promise((resolve) => setTimeout(resolve, HOLD_MS));
  });
});
