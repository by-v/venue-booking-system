// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({ headerStore: new Headers() }));

vi.mock("next/headers", () => ({
  headers: async () => mockState.headerStore,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string): never => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => createElement("a", { href, ...rest }, children),
}));

import AdminPage from "@/app/admin/page";
import { todayInJakarta } from "@/modules/availability/dates";
import { extractCookies, signInRequest } from "./helpers/auth-http";
import { createTestUser } from "./helpers/create-user";

beforeEach(() => {
  mockState.headerStore = new Headers();
});

afterEach(() => {
  cleanup();
});

async function signInAsAdmin(): Promise<void> {
  const creds = await createTestUser();
  const res = await signInRequest(creds.email, creds.password);
  mockState.headerStore = new Headers({ cookie: extractCookies(res) });
}

describe("halaman dashboard /admin", () => {
  it("menampilkan dashboard bulan berjalan untuk sesi valid", async () => {
    await signInAsAdmin();

    render(await AdminPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", { name: "Ringkasan Reservasi" }),
    ).toBeTruthy();
    expect(screen.getByTestId("dashboard-active-count").textContent).toBe("0");
    expect(screen.getByText("Belum ada agenda")).toBeTruthy();
    expect(screen.getByText("Tidak ada tindak lanjut")).toBeTruthy();
    expect(screen.getByText("Belum ada reservasi")).toBeTruthy();

    const monthInput = screen.getByLabelText("Filter bulan");
    expect((monthInput as HTMLInputElement).value).toBe(
      todayInJakarta().slice(0, 7),
    );
  }, 30000);

  it("memakai bulan dari parameter ?bulan=", async () => {
    await signInAsAdmin();

    render(
      await AdminPage({
        searchParams: Promise.resolve({ bulan: "2027-03" }),
      }),
    );

    const monthInput = screen.getByLabelText("Filter bulan");
    expect((monthInput as HTMLInputElement).value).toBe("2027-03");
    expect(screen.getByText("Maret 2027")).toBeTruthy();
  }, 30000);

  it("tidak dapat diakses tanpa sesi valid (dialihkan ke /login)", async () => {
    await expect(
      AdminPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("REDIRECT:/login");
  }, 30000);
});
