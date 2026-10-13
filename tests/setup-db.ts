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
