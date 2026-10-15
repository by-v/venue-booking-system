import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { signInRequest } from "./helpers/auth-http";
import { createTestUser } from "./helpers/create-user";

const IP = "203.0.113.12";
const headers = { "x-forwarded-for": IP };

describe("rate limit direset setelah jendela waktu", () => {
  it("setelah jendela 900 detik lewat, permintaan kembali diizinkan", async () => {
    const creds = await createTestUser();

    for (let i = 1; i <= 5; i += 1) {
      await signInRequest(creds.email, "password-salah-123456", headers);
    }

    const blocked = await signInRequest(
      creds.email,
      "password-salah-123456",
      headers,
    );
    expect(blocked.status).toBe(429);

    // Majukan `last_request` ke masa lalu (tanpa menunggu waktu nyata).
    await db.execute(
      sql`UPDATE rate_limit SET last_request = last_request - 901000`,
    );

    const afterReset = await signInRequest(
      creds.email,
      "password-salah-123456",
      headers,
    );
    expect(afterReset.status).toBe(401);
  }, 60000);
});
