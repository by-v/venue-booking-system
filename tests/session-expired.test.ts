import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  extractCookies,
  getSessionRequest,
  sessionTokenFromCookie,
  signInRequest,
} from "./helpers/auth-http";
import { createTestUser } from "./helpers/create-user";

describe("sesi kedaluwarsa", () => {
  it("sesi dengan expires_at lampau ditolak tanpa menunggu", async () => {
    const creds = await createTestUser();
    const login = await signInRequest(creds.email, creds.password);
    const cookie = extractCookies(login);
    const token = sessionTokenFromCookie(cookie);

    await db.execute(
      sql`UPDATE session SET expires_at = now() - interval '1 day' WHERE token = ${token}`,
    );

    const res = await getSessionRequest(cookie);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("null");
  }, 30000);
});
