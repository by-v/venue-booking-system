import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({ headerStore: new Headers() }));

vi.mock("next/headers", () => ({
  headers: async () => mockState.headerStore,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string): never => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { getAdminSessionOrNull, requireAdminSession } from "@/modules/auth";
import { extractCookies, signInRequest } from "./helpers/auth-http";
import { createTestUser } from "./helpers/create-user";

beforeEach(() => {
  mockState.headerStore = new Headers();
});

describe("helper sesi admin", () => {
  it("getAdminSessionOrNull mengembalikan null tanpa cookie sesi", async () => {
    await expect(getAdminSessionOrNull()).resolves.toBeNull();
  }, 30000);

  it("getAdminSessionOrNull mengembalikan sesi valid dari database", async () => {
    const creds = await createTestUser();
    const res = await signInRequest(creds.email, creds.password);
    mockState.headerStore = new Headers({ cookie: extractCookies(res) });

    const session = await getAdminSessionOrNull();
    expect(session?.user.email).toBe(creds.email);
  }, 30000);

  it("requireAdminSession mengembalikan sesi valid dari database", async () => {
    const creds = await createTestUser();
    const res = await signInRequest(creds.email, creds.password);
    mockState.headerStore = new Headers({ cookie: extractCookies(res) });

    const session = await requireAdminSession();
    expect(session.user.email).toBe(creds.email);
  }, 30000);

  it("requireAdminSession mengalihkan ke /login saat tanpa sesi", async () => {
    await expect(requireAdminSession()).rejects.toThrow(
      "REDIRECT:/login?redirect=/admin",
    );
  }, 30000);
});
