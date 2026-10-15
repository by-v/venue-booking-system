import { count } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { runSeed } from "@/modules/auth/run-seed";
import { makeSeedPrompts, SEED_TEST_DATABASE_URL } from "./helpers/seed-prompts";

describe("seed admin - password pendek", () => {
  it("menolak password kurang dari 12 karakter dan tidak membuat akun", async () => {
    const shortPassword = "pendek";
    const logs: string[] = [];

    await expect(
      runSeed({
        databaseUrl: SEED_TEST_DATABASE_URL,
        prompts: makeSeedPrompts({ password: async () => shortPassword }),
        log: (message) => logs.push(message),
      }),
    ).rejects.toThrow(/Password minimal 12 karakter/);

    const [row] = await db.select({ value: count() }).from(user);
    expect(Number(row?.value ?? 0)).toBe(0);

    // Password tidak pernah muncul di keluaran.
    expect(logs.join("\n")).not.toContain(shortPassword);
  });
});
