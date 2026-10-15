import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import {
  extractCookies,
  sessionTokenFromCookie,
  signInRequest,
} from "./helpers/auth-http";
import { createTestUser } from "./helpers/create-user";

describe("AUTH_SESSION_MAX_AGE menentukan masa berlaku", () => {
  it("konfigurasi sesi memakai nilai env", () => {
    expect(auth.options.session?.expiresIn).toBe(env.AUTH_SESSION_MAX_AGE);
  });

  it("masa berlaku sesi sama dengan AUTH_SESSION_MAX_AGE detik", async () => {
    const creds = await createTestUser();
    const login = await signInRequest(creds.email, creds.password);
    const token = sessionTokenFromCookie(extractCookies(login));

    const row = await db.execute(
      sql`SELECT EXTRACT(EPOCH FROM (expires_at - created_at))::int AS diff FROM session WHERE token = ${token}`,
    );
    expect(Number(row.rows[0]?.diff)).toBe(env.AUTH_SESSION_MAX_AGE);
  }, 30000);
});
