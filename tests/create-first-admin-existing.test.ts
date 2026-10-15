import { describe, expect, it } from "vitest";
import { createFirstAdmin } from "@/modules/auth/create-first-admin";

// Tabel `user` dikosongkan `afterEach(truncateAll)` di tests/setup-db.ts,
// sehingga tiap tes memulai dari database uji yang bersih.
describe("createFirstAdmin - admin sudah ada", () => {
  it("menolak bila tabel user sudah berisi baris", async () => {
    await createFirstAdmin({
      email: "admin-pertama@example.test",
      password: "password-uji-123456",
    });

    await expect(
      createFirstAdmin({
        email: "admin-kedua@example.test",
        password: "password-uji-123456",
      }),
    ).rejects.toThrow(/Admin sudah ada/);
  });
});
