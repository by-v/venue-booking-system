import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({ headerStore: new Headers() }));

vi.mock("next/headers", () => ({
  headers: async () => mockState.headerStore,
}));

import { GET } from "./fixtures/example-route";
import { extractCookies, signInRequest } from "./helpers/auth-http";
import { createTestUser } from "./helpers/create-user";

beforeEach(() => {
  mockState.headerStore = new Headers();
});

describe("Route Handler tanpa sesi", () => {
  it("mengembalikan 401 saat tidak ada sesi valid", async () => {
    const res = await GET();

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  }, 30000);

  it("mengembalikan 200 saat sesi valid", async () => {
    const creds = await createTestUser();
    const login = await signInRequest(creds.email, creds.password);
    mockState.headerStore = new Headers({ cookie: extractCookies(login) });

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  }, 30000);
});
