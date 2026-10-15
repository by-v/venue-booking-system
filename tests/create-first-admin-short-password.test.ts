import { count } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { createFirstAdmin } from "@/modules/auth/create-first-admin";

describe("createFirstAdmin - password pendek", () => {
  it("menolak password kurang dari 12 karakter", async () => {
    await expect(
      createFirstAdmin({
        email: "admin-pendek@example.test",
        password: "a".repeat(11),
      }),
    ).rejects.toThrow(/Password minimal 12 karakter/);
  });

  it("tidak membuat akun saat password ditolak", async () => {
    await expect(
      createFirstAdmin({
        email: "admin-pendek@example.test",
        password: "pendek",
      }),
    ).rejects.toThrow(/Password minimal 12 karakter/);

    const [row] = await db.select({ value: count() }).from(user);
    expect(Number(row?.value ?? 0)).toBe(0);
  });
});
