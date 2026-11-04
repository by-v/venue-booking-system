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
import {
  extractCookies,
  signInRequest,
  signOutRequest,
} from "./helpers/auth-http";
import { createTestUser } from "./helpers/create-user";

beforeEach(() => {
  mockState.headerStore = new Headers();
});

describe("cookie valid tetapi sesi sudah dicabut", () => {
  it("getAdminSessionOrNull menolak cookie setelah logout", async () => {
    const creds = await createTestUser();
    const login = await signInRequest(creds.email, creds.password);
    const cookie = extractCookies(login);

    await signOutRequest(cookie);

    mockState.headerStore = new Headers({ cookie });
    await expect(getAdminSessionOrNull()).resolves.toBeNull();
  }, 30000);

  it("requireAdminSession mengalihkan ke /login setelah sesi dicabut", async () => {
    const creds = await createTestUser();
    const login = await signInRequest(creds.email, creds.password);
    const cookie = extractCookies(login);

    await signOutRequest(cookie);

    mockState.headerStore = new Headers({
      cookie,
      "x-original-pathname": "/admin/settings",
    });
    await expect(requireAdminSession()).rejects.toThrow(
      "REDIRECT:/login?redirect=%2Fadmin%2Fsettings",
    );
  }, 30000);
});
