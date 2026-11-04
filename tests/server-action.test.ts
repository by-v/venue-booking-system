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

import { exampleAction } from "./fixtures/example-server-action";
import { extractCookies, signInRequest } from "./helpers/auth-http";
import { createTestUser } from "./helpers/create-user";

beforeEach(() => {
  mockState.headerStore = new Headers();
});

describe("Server Action tanpa sesi", () => {
  it("mengalihkan ke /login sebelum logika aksi berjalan", async () => {
    mockState.headerStore = new Headers({ "x-original-pathname": "/admin" });

    await expect(exampleAction()).rejects.toThrow(
      "REDIRECT:/login?redirect=%2Fadmin",
    );
  }, 30000);

  it("menjalankan aksi saat sesi valid", async () => {
    const creds = await createTestUser();
    const res = await signInRequest(creds.email, creds.password);
    mockState.headerStore = new Headers({ cookie: extractCookies(res) });

    await expect(exampleAction()).resolves.toBeUndefined();
  }, 30000);
});
