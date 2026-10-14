import "@/lib/load-env";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { afterEach } from "vitest";
import { assertSafeTestDatabase } from "./helpers/assert-safe-test-db";

// Fail-closed: batalkan seluruh suite bila database uji tidak aman.
assertSafeTestDatabase({
  testUrl: process.env.TEST_DATABASE_URL,
  devUrl: process.env.DATABASE_URL,
});

// Setelah guard lulus, arahkan aplikasi di bawah tes ke database uji.
// (Tugas 5.6: `DATABASE_URL` proses uji diganti `TEST_DATABASE_URL`; penempatan
// di sini, bukan di `vitest.config.ts`, agar guard di atas tetap dapat
// membandingkan database uji dengan database dev yang sebenarnya.)
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

// Impor db setelah pengalihan DATABASE_URL agar modul yang membaca `env`
// (src/lib/db/index.ts) memakai database uji.
const { db } = await import("@/lib/db");
const { truncateAll } = await import("./helpers/truncate");

// Fail-closed: penerapan migrasi hanya boleh menyentuh database uji.
const currentDbResult = await db.execute(sql`SELECT current_database() AS db`);
const currentDbName = String(currentDbResult.rows[0]?.db ?? "");
if (!currentDbName.endsWith("_test")) {
  throw new Error(
    `Database aktif bukan database uji, migrasi dibatalkan (${currentDbName})`,
  );
}

await migrate(db, { migrationsFolder: "./migrations" });

afterEach(async () => {
  await truncateAll();
});
