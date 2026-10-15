import { describe, expect, it } from "vitest";
import { createFirstAdmin } from "@/modules/auth/create-first-admin";
import { runSeed } from "@/modules/auth/run-seed";
import {
  makeSeedPrompts,
  SEED_TEST_DATABASE_URL,
  unexpectedPrompt,
} from "./helpers/seed-prompts";

describe("seed admin - admin sudah ada", () => {
  it("menolak bila tabel user sudah berisi baris tanpa memanggil prompt", async () => {
    await createFirstAdmin({
      email: "admin-ada@example.test",
      password: "password-uji-123456",
    });

    await expect(
      runSeed({
        databaseUrl: SEED_TEST_DATABASE_URL,
        prompts: makeSeedPrompts({
          confirm: unexpectedPrompt("confirm"),
          email: unexpectedPrompt("email"),
          password: unexpectedPrompt("password"),
        }),
        log: () => {},
      }),
    ).rejects.toThrow(/Admin sudah ada/);
  });
});
