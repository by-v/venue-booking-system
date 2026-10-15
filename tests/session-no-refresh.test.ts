import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  extractCookies,
  getSessionRequest,
  sessionTokenFromCookie,
  signInRequest,
} from "./helpers/auth-http";
import { createTestUser } from "./helpers/create-user";

describe("sesi tidak diperpanjang saat dipakai", () => {
  it("konfigurasi menonaktifkan penyegaran sesi", () => {
    expect(auth.options.session?.disableSessionRefresh).toBe(true);
  });

  it("expiresAt tidak berubah setelah sesi dipakai", async () => {
    const creds = await createTestUser();
    const login = await signInRequest(creds.email, creds.password);
    const cookie = extractCookies(login);
    const token = sessionTokenFromCookie(cookie);

    // Geser baseline ke masa lalu agar penyegaran mudah terdeteksi, tanpa
    // menunggu waktu nyata.
    await db.execute(
      sql`UPDATE session SET created_at = now() - interval '1 day', expires_at = now() + interval '2 days' WHERE token = ${token}`,
    );
    const before = await db.execute(
      sql`SELECT expires_at FROM session WHERE token = ${token}`,
    );
    const expiresBefore = String(before.rows[0]?.expires_at);

    const sessionRes = await getSessionRequest(cookie);
    const body = (await sessionRes.json()) as { session?: { token?: string } };
    expect(body.session?.token).toBe(token);

    const after = await db.execute(
      sql`SELECT expires_at FROM session WHERE token = ${token}`,
    );
    expect(String(after.rows[0]?.expires_at)).toBe(expiresBefore);
  }, 30000);
});
