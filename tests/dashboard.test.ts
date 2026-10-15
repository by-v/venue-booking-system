// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
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

import AdminPage from "@/app/admin/page";
import { extractCookies, signInRequest } from "./helpers/auth-http";
import { createTestUser } from "./helpers/create-user";

beforeEach(() => {
  mockState.headerStore = new Headers();
});

describe("halaman dashboard /admin", () => {
  it("menampilkan dashboard kosong untuk sesi valid", async () => {
    const creds = await createTestUser();
    const res = await signInRequest(creds.email, creds.password);
    mockState.headerStore = new Headers({ cookie: extractCookies(res) });

    render(await AdminPage());

    expect(screen.getByText("Admin Dashboard")).toBeTruthy();
  }, 30000);

  it("tidak dapat diakses tanpa sesi valid (dialihkan ke /login)", async () => {
    await expect(AdminPage()).rejects.toThrow("REDIRECT:/login");
  }, 30000);
});
