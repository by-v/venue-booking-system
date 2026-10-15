import { count } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { createFirstAdmin } from "./create-first-admin";
import { describeDatabaseTarget } from "./describe-database-target";

/**
 * Alur seed admin pertama, terpisah dari I/O prompt agar dapat diuji tanpa
 * terminal. Skrip CLI (scripts/seed-admin.ts) menyuntikkan prompt nyata
 * (`@inquirer/prompts`), sedangkan tes menyuntikkan prompt palsu.
 *
 * Email dan password HANYA berasal dari prompt dan TIDAK PERNAH dicetak.
 */
export const emailSchema = z.string().email("Format email tidak valid");

export interface SeedPrompts {
  /** Konfirmasi sebelum menulis. Default jawaban prompt nyata: tidak. */
  confirm(message: string): Promise<boolean>;
  email(message: string): Promise<string>;
  password(message: string): Promise<string>;
}

export interface RunSeedOptions {
  databaseUrl: string | undefined;
  prompts: SeedPrompts;
  log?: (message: string) => void;
}

export interface SeedResult {
  status: "created" | "cancelled";
}

export async function runSeed({
  databaseUrl,
  prompts,
  log = console.log,
}: RunSeedOptions): Promise<SeedResult> {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL tidak diset");
  }

  const [row] = await db.select({ value: count() }).from(user);
  if (Number(row?.value ?? 0) > 0) {
    throw new Error("Admin sudah ada");
  }

  log(`Target database: ${describeDatabaseTarget(databaseUrl)}`);

  const proceed = await prompts.confirm("Lanjutkan membuat akun admin?");
  if (!proceed) {
    log("Dibatalkan. Tidak ada akun yang dibuat.");
    return { status: "cancelled" };
  }

  const emailInput = await prompts.email("Email admin:");
  const parsedEmail = emailSchema.safeParse(emailInput);
  if (!parsedEmail.success) {
    throw new Error(parsedEmail.error.issues[0]?.message ?? "Email tidak valid");
  }

  const password = await prompts.password("Password (min 12 karakter):");
  if (password.length < 12) {
    throw new Error("Password minimal 12 karakter");
  }

  await createFirstAdmin({ email: parsedEmail.data, password });

  log("Admin berhasil dibuat.");
  return { status: "created" };
}
