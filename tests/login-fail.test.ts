import { describe, expect, it } from "vitest";
import { signInRequest } from "./helpers/auth-http";
import { createTestUser } from "./helpers/create-user";

describe("login gagal", () => {
  it("password salah ditolak tanpa menyebut bagian yang salah", async () => {
    const creds = await createTestUser();

    const res = await signInRequest(creds.email, "password-salah-123456");
    expect(res.status).toBe(401);

    const body = (await res.json()) as { message?: string; code?: string };
    expect(body.code).toBe("INVALID_EMAIL_OR_PASSWORD");
    expect(body.message).toBe("Invalid email or password");
  }, 30000);

  it("email tidak dikenal menghasilkan pesan yang sama (tidak membocorkan akun)", async () => {
    await createTestUser();

    const res = await signInRequest(
      "tidak-terdaftar@example.test",
      "password-salah-123456",
    );
    expect(res.status).toBe(401);

    const body = (await res.json()) as { message?: string; code?: string };
    expect(body.code).toBe("INVALID_EMAIL_OR_PASSWORD");
    expect(body.message).toBe("Invalid email or password");
  }, 30000);
});
