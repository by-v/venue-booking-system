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
  it("menampilkan dashboard tahun berjalan untuk sesi valid", async () => {
    await signInAsAdmin();

    render(await AdminPage({ searchParams: Promise.resolve({}) }));

    const currentYear = todayInJakarta().slice(0, 4);
    expect(
      screen.getByRole("heading", {
        name: `Ringkasan Tahun ${currentYear}`,
      }),
    ).toBeTruthy();
    expect(screen.getByTestId("dashboard-total").textContent).toBe("0");
    expect(screen.getByText("Belum ada agenda")).toBeTruthy();
    expect(screen.getByText("Tidak ada tindak lanjut")).toBeTruthy();
    expect(screen.getByText("Belum ada reservasi")).toBeTruthy();

    const yearInput = screen.getByLabelText("Filter tahun");
    expect((yearInput as HTMLSelectElement).value).toBe(currentYear);
  }, 30000);

  it("memakai tahun dan bulan agenda dari parameter URL", async () => {
    await signInAsAdmin();

    render(
      await AdminPage({
        searchParams: Promise.resolve({ tahun: "2027", agenda: "2027-03" }),
      }),
    );

    const yearInput = screen.getByLabelText("Filter tahun");
    expect((yearInput as HTMLSelectElement).value).toBe("2027");
    const monthInput = screen.getByLabelText("Filter bulan");
    expect((monthInput as HTMLSelectElement).value).toBe("2027-03");
    expect(screen.getByText(/Maret 2027/)).toBeTruthy();
  }, 30000);

  it("tidak dapat diakses tanpa sesi valid (dialihkan ke /login)", async () => {
    await expect(
      AdminPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("REDIRECT:/login");
  }, 30000);
});
