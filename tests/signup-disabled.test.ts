import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { signUpRequest } from "./helpers/auth-http";

describe("registrasi publik dinonaktifkan", () => {
  it("permintaan ke endpoint sign-up ditolak dan tidak membuat akun", async () => {
    const before = await db.execute(sql`SELECT count(*)::int AS c FROM "user"`);

    const res = await signUpRequest(
      "pendaftar-baru@example.test",
      "password-uji-123456",
    );
    expect(res.status).toBe(404);

    const after = await db.execute(sql`SELECT count(*)::int AS c FROM "user"`);
    expect(Number(after.rows[0]?.c)).toBe(Number(before.rows[0]?.c));
  }, 30000);
});
