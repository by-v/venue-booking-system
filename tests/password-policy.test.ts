import { describe, expect, it } from "vitest";
import { createAuth } from "@/lib/auth";

const MIN_PASSWORD_LENGTH = 12;

function signUp(auth: ReturnType<typeof createAuth>, password: string) {
  return auth.api.signUpEmail({
    body: {
      name: "Pengguna Uji",
      email: `password-policy-${password.length}@example.test`,
      password,
    },
  });
}

describe("kebijakan password", () => {
  it("minimum password yang dikonfigurasi adalah 12 karakter", () => {
    const auth = createAuth({ allowSignUp: true });
    expect(auth.options.emailAndPassword?.minPasswordLength).toBe(
      MIN_PASSWORD_LENGTH,
    );
  });

  it("menolak password pendek (kurang dari panjang minimum) dengan pesan galat", async () => {
    const auth = createAuth({ allowSignUp: true });
    const tooShort = "a".repeat(MIN_PASSWORD_LENGTH - 1);

    await expect(signUp(auth, tooShort)).rejects.toMatchObject({
      body: { code: "PASSWORD_TOO_SHORT", message: "Password too short" },
    });
  });

  it("menerima password tepat pada panjang minimum", async () => {
    const auth = createAuth({ allowSignUp: true });
    const atMinimum = "a".repeat(MIN_PASSWORD_LENGTH);

    const result = await signUp(auth, atMinimum);
    expect(result.user?.email).toBe(`password-policy-${MIN_PASSWORD_LENGTH}@example.test`);
  });
});
