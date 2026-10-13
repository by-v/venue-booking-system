import "./src/lib/load-env";
import path from "node:path";
import { defineConfig } from "vitest/config";
import { assertSafeTestDatabase } from "./tests/helpers/assert-safe-test-db";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

// Fail-closed: konfigurasi menolak berjalan bila database uji tidak aman
// (V5: `import.meta.dirname` tersedia di ESM Node >= 20.11; Node terpasang v24).
assertSafeTestDatabase({
  testUrl: testDatabaseUrl,
  devUrl: process.env.DATABASE_URL,
});

// assertSafeTestDatabase sudah menjamin nilai non-kosong; cast hanya untuk tipe.
const testDatabaseUrlValue = testDatabaseUrl as string;

// URL database dev asli disimpan agar `tests/setup-db.ts` dapat membandingkan
// database uji vs dev lewat guard sebelum mengalihkan `DATABASE_URL` proses uji
// ke `TEST_DATABASE_URL` (lihat catatan penyimpangan tugas 5.6).
const originalDevDatabaseUrl = process.env.DATABASE_URL as string;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    env: {
      DATABASE_URL: originalDevDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrlValue,
      BETTER_AUTH_SECRET: "test-secret-min-32-chars-long-xyz",
      BETTER_AUTH_URL: "http://localhost:3000",
    },
    setupFiles: ["./tests/setup-db.ts"],
    fileParallelism: false,
  },
});
