import type { SeedPrompts } from "@/modules/auth/run-seed";

/** Kredensial sintetis untuk tes alur seed (bukan rahasia nyata). */
export const SEED_TEST_EMAIL = "admin-seed@example.test";
export const SEED_TEST_PASSWORD = "password-uji-123456";
export const SEED_TEST_DATABASE_URL =
  "postgresql://app_user:tidak-nyata@localhost:5432/venue_booking_test";

export function makeSeedPrompts(
  overrides: Partial<SeedPrompts> = {},
): SeedPrompts {
  return {
    confirm: async () => true,
    email: async () => SEED_TEST_EMAIL,
    password: async () => SEED_TEST_PASSWORD,
    ...overrides,
  };
}

/** Prompt yang HARUS tidak dipanggil; melempar galat bila dipanggil. */
export function unexpectedPrompt(name: string): () => never {
  return () => {
    throw new Error(`prompt ${name} tidak boleh dipanggil`);
  };
}
