// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getYearCalendarSummary = vi.hoisted(() => vi.fn());

vi.mock("@/modules/auth", () => ({
  requireAdminSession: vi.fn(async () => ({
    user: { email: "admin@example.test" },
  })),
}));

vi.mock("@/modules/calendar/queries", () => ({
  getYearCalendarSummary,
}));

vi.mock("@/modules/availability/dates", () => ({
  todayInJakarta: () => "2027-01-15",
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
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  redirect: (url: string): never => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import KalenderAdminPage from "@/app/admin/kalender/page";

const emptyMonth = {
  month: "2027-01",
  tersedia: 30,
  pending: 0,
  diterima: 0,
  selesai: 0,
  dibatalkan: 0,
};

afterEach(() => {
  cleanup();
  getYearCalendarSummary.mockReset();
});

describe("halaman kalender admin", () => {
  it("menampilkan year overview dengan dua belas bulan", async () => {
    getYearCalendarSummary.mockResolvedValue([
      ...Array.from({ length: 12 }, (_, index) => ({
        ...emptyMonth,
        month: `2027-${String(index + 1).padStart(2, "0")}`,
      })),
    ]);

    render(
      await KalenderAdminPage({
        searchParams: Promise.resolve({ year: "2027" }),
      }),
    );

    expect(screen.getByRole("heading", { name: "Kalender" })).toBeTruthy();
    expect(screen.getByText("2027")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Januari" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Desember" })).toBeTruthy();
  });

  it("menampilkan badge count untuk pending dan diterima", async () => {
    getYearCalendarSummary.mockResolvedValue([
      ...Array.from({ length: 12 }, (_, index) => ({
        ...emptyMonth,
        month: `2027-${String(index + 1).padStart(2, "0")}`,
        pending: index === 2 ? 3 : 0,
        diterima: index === 2 ? 5 : 0,
      })),
    ]);

    const { container } = render(
      await KalenderAdminPage({
        searchParams: Promise.resolve({ year: "2027" }),
      }),
    );

    expect(container.querySelectorAll(".bg-yellow-100").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".bg-green-100").length).toBeGreaterThan(0);
  });

  it("menampilkan legenda status di bagian bawah", async () => {
    getYearCalendarSummary.mockResolvedValue([]);

    render(
      await KalenderAdminPage({
        searchParams: Promise.resolve({ year: "2027" }),
      }),
    );

    expect(screen.getByText("Diterima")).toBeTruthy();
    expect(screen.getByText("Menunggu")).toBeTruthy();
    expect(screen.getByText("Dibatalkan")).toBeTruthy();
  });

  it("mengarahkan ?bulan=YYYY-MM ke tampilan bulan", async () => {
    getYearCalendarSummary.mockResolvedValue([]);

    await expect(
      KalenderAdminPage({
        searchParams: Promise.resolve({ bulan: "2027-03" }),
      }),
    ).rejects.toThrow("REDIRECT:/admin/kalender/2027/03");
  });
});
