import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  extractCookies,
  getSessionRequest,
  signInRequest,
  signOutRequest,
} from "./helpers/auth-http";
import { createTestUser } from "./helpers/create-user";

describe("logout dan pencabutan sesi", () => {
  // Pengarahan ke `/login` setelah logout dilakukan oleh klien Better Auth,
  // bukan oleh route handler server, sehingga tidak dapat ditegakkan di lapis
  // ini dan dicatat sebagai pengujian manual. Yang ditegakkan di sini adalah
  // pencabutan sesi di database.
  it("logout menghapus sesi di database sehingga cookie lama tidak berlaku", async () => {
    const creds = await createTestUser();
    const login = await signInRequest(creds.email, creds.password);
    const cookie = extractCookies(login);

    const before = await db.execute(sql`SELECT count(*)::int AS c FROM session`);
    const logout = await signOutRequest(cookie);
    expect(logout.status).toBe(200);
    const after = await db.execute(sql`SELECT count(*)::int AS c FROM session`);
    expect(Number(after.rows[0]?.c)).toBe(Number(before.rows[0]?.c) - 1);

    const sessionRes = await getSessionRequest(cookie);
    expect(await sessionRes.text()).toBe("null");
  }, 30000);
});
