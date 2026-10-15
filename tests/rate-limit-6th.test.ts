import { describe, expect, it } from "vitest";
import { signInRequest } from "./helpers/auth-http";
import { createTestUser } from "./helpers/create-user";

const IP = "203.0.113.10";
const headers = { "x-forwarded-for": IP };

describe("rate limit login", () => {
  it("permintaan ke-6 dalam jendela waktu diblokir", async () => {
    const creds = await createTestUser();

    for (let i = 1; i <= 5; i += 1) {
      const res = await signInRequest(
        creds.email,
        "password-salah-123456",
        headers,
      );
      expect(res.status).toBe(401);
    }

    const sixth = await signInRequest(
      creds.email,
      "password-salah-123456",
      headers,
    );
    expect(sixth.status).toBe(429);
  }, 30000);
});
