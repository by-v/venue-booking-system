import { count } from "drizzle-orm";
import { createAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

export interface CreateFirstAdminInput {
  email: string;
  password: string;
}

/**
 * Membuat akun admin pertama lewat Better Auth.
 *
 * Fungsi murni (tanpa I/O prompt) yang dipakai skrip seed (grup 11) dan helper
 * tes (7.13). Menolak bila password kurang dari 12 karakter atau bila tabel
 * `user` sudah berisi baris.
 */
export async function createFirstAdmin({
  email,
  password,
}: CreateFirstAdminInput) {
  if (password.length < 12) {
    throw new Error("Password minimal 12 karakter");
  }

  const [row] = await db.select({ value: count() }).from(user);
  if (Number(row?.value ?? 0) > 0) {
    throw new Error("Admin sudah ada");
  }

  const auth = createAuth({ allowSignUp: true });

  // V14: body `signUpEmail` memerlukan `name` selain `email` dan `password`.
  return auth.api.signUpEmail({
    body: {
      name: email,
      email,
      password,
    },
  });
}
