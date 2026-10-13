import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const validEnv = {
  DATABASE_URL: "postgresql://app_user:secret@localhost:5432/venue_booking",
  BETTER_AUTH_SECRET: "0123456789abcdef0123456789abcdef",
  BETTER_AUTH_URL: "http://localhost:3000",
};

describe("parseEnv", () => {
  it("menerima environment yang valid", () => {
    const parsed = parseEnv(validEnv);

    expect(parsed.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(parsed.BETTER_AUTH_SECRET).toBe(validEnv.BETTER_AUTH_SECRET);
    expect(parsed.BETTER_AUTH_URL).toBe(validEnv.BETTER_AUTH_URL);
    expect(parsed.AUTH_SESSION_MAX_AGE).toBe(604800);
    expect(parsed.NODE_ENV).toBe("development");
  });

  it("menolak variabel wajib yang hilang", () => {
    expect(() =>
      parseEnv({ ...validEnv, BETTER_AUTH_SECRET: undefined }),
    ).toThrow();
    expect(() =>
      parseEnv({ ...validEnv, DATABASE_URL: undefined }),
    ).toThrow();
    expect(() =>
      parseEnv({ ...validEnv, BETTER_AUTH_URL: undefined }),
    ).toThrow();
  });

  it("menolak format yang salah", () => {
    expect(() =>
      parseEnv({ ...validEnv, DATABASE_URL: "bukan-url" }),
    ).toThrow();
    expect(() =>
      parseEnv({ ...validEnv, BETTER_AUTH_URL: "bukan-url" }),
    ).toThrow();
  });

  it("menolak BETTER_AUTH_SECRET kurang dari 32 karakter", () => {
    expect(() =>
      parseEnv({ ...validEnv, BETTER_AUTH_SECRET: "terlalu-pendek" }),
    ).toThrow(/minimal 32 karakter/);
  });

  it("menolak BETTER_AUTH_SECRET yang masih memuat placeholder CHANGE_ME tanpa membedakan huruf besar/kecil", () => {
    const upper = "CHANGE_ME".padEnd(40, "x");
    const lower = "change_me".padEnd(40, "x");

    expect(() =>
      parseEnv({ ...validEnv, BETTER_AUTH_SECRET: upper }),
    ).toThrow(/CHANGE_ME/);
    expect(() =>
      parseEnv({ ...validEnv, BETTER_AUTH_SECRET: lower }),
    ).toThrow(/CHANGE_ME/);
  });
});
