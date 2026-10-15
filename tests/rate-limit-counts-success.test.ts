import { describe, expect, it } from "vitest";
import { signInRequest } from "./helpers/auth-http";
import { createTestUser } from "./helpers/create-user";

const IP = "203.0.113.11";
const headers = { "x-forwarded-for": IP };

describe("rate limit menghitung login yang berhasil", () => {
  it("5 login berhasil lalu permintaan ke-6 diblokir", async () => {
    const creds = await createTestUser();

    for (let i = 1; i <= 5; i += 1) {
      const res = await signInRequest(creds.email, creds.password, headers);
      expect(res.status).toBe(200);
    }

    const sixth = await signInRequest(creds.email, creds.password, headers);
    expect(sixth.status).toBe(429);
  }, 60000);
});
