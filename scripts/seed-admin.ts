import "../src/lib/load-env";

import { confirm, input, password } from "@inquirer/prompts";
import { db } from "../src/lib/db";
import { runSeed } from "../src/modules/auth/run-seed";

/**
 * Skrip seed admin pertama (interaktif).
 *
 * Impor `../src/lib/load-env` WAJIB paling awal agar `.env.local` termuat
 * sebelum modul lain membaca environment.
 *
 * Jalankan: npx tsx scripts/seed-admin.ts
 */
async function main(): Promise<void> {
  await runSeed({
    databaseUrl: process.env.DATABASE_URL,
    prompts: {
      confirm: (message) => confirm({ message, default: false }),
      email: (message) => input({ message }),
      // V15: opsi `mask` menutupi input dengan `*` agar password tak terlihat.
      password: (message) => password({ message, mask: true }),
    },
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
