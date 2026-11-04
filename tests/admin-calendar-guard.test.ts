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

import KalenderAdminPage from "@/app/admin/kalender/page";
import { extractCookies, signInRequest } from "./helpers/auth-http";
import { createTestUser } from "./helpers/create-user";

beforeEach(() => {
  mockState.headerStore = new Headers();
});

const searchParams = { year: "2027" };

describe("proteksi halaman /admin/kalender", () => {
  it("mengalihkan pengguna tanpa sesi ke /login", async () => {
    await expect(KalenderAdminPage({ searchParams })).rejects.toThrow(
      "REDIRECT:/login",
    );
  }, 30000);

  it("menampilkan halaman untuk sesi admin valid", async () => {
    const creds = await createTestUser();
    const res = await signInRequest(creds.email, creds.password);
    mockState.headerStore = new Headers({ cookie: extractCookies(res) });

    await expect(
      KalenderAdminPage({ searchParams }),
    ).resolves.toBeTruthy();
  }, 30000);
});
