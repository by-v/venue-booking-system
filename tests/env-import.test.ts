import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("impor modul env", () => {
  it("melempar galat saat impor bila environment tidak valid", async () => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "bukan-url");
    vi.stubEnv("BETTER_AUTH_SECRET", "0123456789abcdef0123456789abcdef");
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");

    await expect(import("@/lib/env")).rejects.toThrow();
  });

  it("berhasil diimpor bila environment valid", async () => {
    vi.resetModules();
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://app_user:secret@localhost:5432/venue_booking",
    );
    vi.stubEnv("BETTER_AUTH_SECRET", "0123456789abcdef0123456789abcdef");
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");

    const mod = await import("@/lib/env");
    expect(mod.env.DATABASE_URL).toBe(
      "postgresql://app_user:secret@localhost:5432/venue_booking",
    );
  });
});
