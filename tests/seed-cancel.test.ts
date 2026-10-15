import { count } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { runSeed } from "@/modules/auth/run-seed";
import {
  makeSeedPrompts,
  SEED_TEST_DATABASE_URL,
  SEED_TEST_PASSWORD,
  unexpectedPrompt,
} from "./helpers/seed-prompts";

describe("seed admin - dibatalkan", () => {
  it("tidak membuat akun dan berhenti tanpa galat saat konfirmasi dijawab tidak", async () => {
    const logs: string[] = [];

    const result = await runSeed({
      databaseUrl: SEED_TEST_DATABASE_URL,
      prompts: makeSeedPrompts({
        confirm: async () => false,
        email: unexpectedPrompt("email"),
        password: unexpectedPrompt("password"),
      }),
      log: (message) => logs.push(message),
    });

    expect(result).toEqual({ status: "cancelled" });

    const [row] = await db.select({ value: count() }).from(user);
    expect(Number(row?.value ?? 0)).toBe(0);

    // Keluaran menampilkan target database tanpa password.
    expect(logs.join("\n")).toContain("Target database:");
    expect(logs.join("\n")).not.toContain(SEED_TEST_PASSWORD);
  });
});
