import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalDatabaseUrl = process.env.DATABASE_URL;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

describe("load-env", () => {
  it("memuat .env.local sehingga variabel yang tidak diset shell terisi", async () => {
    delete process.env.DATABASE_URL;

    await import("@/lib/load-env");

    expect(process.env.DATABASE_URL).toBeTruthy();
  });

  it("tidak menimpa variabel shell yang sudah ada (override: false)", async () => {
    process.env.DATABASE_URL = "sentinel-shell-value";

    await import("@/lib/load-env");

    expect(process.env.DATABASE_URL).toBe("sentinel-shell-value");
  });
});
