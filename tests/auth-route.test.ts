import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/auth/[...all]/route";
import {
  authRequest,
  extractCookies,
  getSessionRequest,
  signInRequest,
} from "./helpers/auth-http";
import { createTestUser } from "./helpers/create-user";

describe("route handler /api/auth/[...all]", () => {
  it("melayani login kredensial valid dan membuat sesi", async () => {
    const creds = await createTestUser();

    const res = await signInRequest(creds.email, creds.password);
    expect(res.status).toBe(200);

    const cookie = extractCookies(res);
    expect(cookie).toContain("session_token");

    const sessionRes = await getSessionRequest(cookie);
    const body = (await sessionRes.json()) as { user?: { email?: string } };
    expect(body.user?.email).toBe(creds.email);
  }, 30000);

  // V12: percobaan login pertama menunjukkan header `Origin` TIDAK wajib;
  // permintaan tanpa `Origin` tetap dilayani (200) pada setup ini.
  it("tidak memerlukan header Origin (tanpa Origin tetap 200)", async () => {
    const creds = await createTestUser();

    const res = await POST(
      authRequest("/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: creds.email, password: creds.password }),
      }),
    );

    expect(res.status).toBe(200);
  }, 30000);
});
