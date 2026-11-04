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

import { requireAdminSession } from "@/modules/auth";

beforeEach(() => {
  mockState.headerStore = new Headers();
});

describe("requireAdminSession membawa path asli pada redirect", () => {
  it("mengalihkan ke /login?redirect=/admin/settings", async () => {
    mockState.headerStore = new Headers({
      "x-original-pathname": "/admin/settings",
    });

    await expect(requireAdminSession()).rejects.toThrow(
      "REDIRECT:/login?redirect=%2Fadmin%2Fsettings",
    );
  }, 30000);

  it("mengalihkan ke /login?redirect=/admin untuk path /admin", async () => {
    mockState.headerStore = new Headers({ "x-original-pathname": "/admin" });

    await expect(requireAdminSession()).rejects.toThrow(
      "REDIRECT:/login?redirect=%2Fadmin",
    );
  }, 30000);

  it("mengamankan header path asli yang berbahaya lewat resolveSafeRedirect", async () => {
    mockState.headerStore = new Headers({
      "x-original-pathname": "https://evil.com/admin",
    });

    await expect(requireAdminSession()).rejects.toThrow(
      "REDIRECT:/login?redirect=%2Fadmin",
    );
  }, 30000);
});
