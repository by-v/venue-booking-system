import "../src/lib/load-env";

import { confirm } from "@inquirer/prompts";
import { db } from "../src/lib/db";
import { runVenueSeed } from "../src/modules/venue/run-seed";

/**
 * Skrip seed data venue + paket + fasilitas (idempoten).
 *
 * Impor `../src/lib/load-env` WAJIB paling awal agar `.env.local` termuat
 * sebelum modul lain membaca environment.
 *
 * Jalankan: npx tsx scripts/seed-venue.ts
 */
async function main(): Promise<void> {
  await runVenueSeed({
    databaseUrl: process.env.DATABASE_URL,
    confirm: (message) => confirm({ message, default: false }),
  });
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$client.end();
  });
