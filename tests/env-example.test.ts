import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function parseEnvExample(): Record<string, string> {
  const raw = readFileSync(
    path.resolve(process.cwd(), ".env.example"),
    "utf8",
  );
  const entries: Record<string, string> = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    entries[key] = value;
  }

  return entries;
}

const REQUIRED_KEYS = [
  "DATABASE_URL",
  "TEST_DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "AUTH_SESSION_MAX_AGE",
];

describe(".env.example", () => {
  const vars = parseEnvExample();

  it("memuat semua variabel environment yang diperlukan", () => {
    for (const key of REQUIRED_KEYS) {
      expect(Object.keys(vars), `variabel ${key}`).toContain(key);
    }
  });

  it("tidak memuat secret nyata", () => {
    expect(vars.BETTER_AUTH_SECRET.toLowerCase()).toContain("change_me");
    expect(vars.BETTER_AUTH_SECRET).not.toMatch(/^[0-9a-f]{64}$/i);

    for (const key of ["DATABASE_URL", "TEST_DATABASE_URL"]) {
      const url = new URL(vars[key]);
      expect(url.password, `password ${key}`).toBe("YOUR_PASSWORD");
    }
  });

  it("tidak memuat nilai produksi", () => {
    for (const [key, value] of Object.entries(vars)) {
      const lowered = value.toLowerCase();
      expect(lowered, `nilai ${key}`).not.toContain("production");
      expect(lowered, `nilai ${key}`).not.toContain("vercel.app");
    }

    expect(new URL(vars.DATABASE_URL).hostname).toBe("localhost");
    expect(new URL(vars.TEST_DATABASE_URL).hostname).toBe("localhost");
    expect(new URL(vars.BETTER_AUTH_URL).hostname).toBe("localhost");
    expect(new URL(vars.TEST_DATABASE_URL).pathname).toBe("/venue_booking_test");
  });
});
