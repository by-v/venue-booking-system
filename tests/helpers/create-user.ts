import { createFirstAdmin } from "@/modules/auth/create-first-admin";

export interface TestUserCredentials {
  email: string;
  password: string;
}

let counter = 0;

/**
 * Pabrik pengguna uji: membuat admin pertama lewat `createFirstAdmin`.
 *
 * Dipakai tes grup 7 dan 9. Karena `createFirstAdmin` menolak bila tabel
 * `user` sudah berisi baris, panggil satu kali per tes (data dibersihkan
 * `afterEach(truncateAll)` di `tests/setup-db.ts`).
 */
export async function createTestUser(
  overrides: Partial<TestUserCredentials> = {},
): Promise<TestUserCredentials> {
  counter += 1;
  const credentials: TestUserCredentials = {
    email: overrides.email ?? `admin-${counter}-${Date.now()}@example.test`,
    password: overrides.password ?? "password-uji-123456",
  };

  await createFirstAdmin(credentials);

  return credentials;
}
