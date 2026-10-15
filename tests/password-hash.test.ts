import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { signInRequest } from "./helpers/auth-http";
import { createTestUser } from "./helpers/create-user";

describe("password disimpan sebagai hash", () => {
  it("kolom password berisi hash scrypt, bukan teks biasa", async () => {
    const creds = await createTestUser();

    const row = await db.execute(
      sql`SELECT password FROM account WHERE provider_id = 'credential' LIMIT 1`,
    );
    const stored = String(row.rows[0]?.password ?? "");

    expect(stored).not.toBe(creds.password);
    expect(stored).not.toContain(creds.password);
    expect(stored).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
  }, 30000);

  it("login dengan password asli berhasil setelah hashing", async () => {
    const creds = await createTestUser();

    const res = await signInRequest(creds.email, creds.password);
    expect(res.status).toBe(200);
  }, 30000);
});
