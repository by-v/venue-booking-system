import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  extractCookies,
  getSessionRequest,
  signInRequest,
} from "./helpers/auth-http";
import { createTestUser } from "./helpers/create-user";

describe("login berhasil", () => {
  it("kredensial valid membuat sesi di database dan cookie berlaku", async () => {
    const creds = await createTestUser();
    const before = await db.execute(sql`SELECT count(*)::int AS c FROM session`);

    const res = await signInRequest(creds.email, creds.password);
    expect(res.status).toBe(200);

    const after = await db.execute(sql`SELECT count(*)::int AS c FROM session`);
    expect(Number(after.rows[0]?.c)).toBe(Number(before.rows[0]?.c) + 1);

    const sessionRes = await getSessionRequest(extractCookies(res));
    const body = (await sessionRes.json()) as { user?: { email?: string } };
    expect(body.user?.email).toBe(creds.email);
  }, 30000);
});
