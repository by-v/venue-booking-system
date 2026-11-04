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
}));

import KalenderAdminPage from "@/app/admin/kalender/page";

afterEach(() => {
  cleanup();
  getYearCalendarSummary.mockReset();
});

describe("halaman kalender admin", () => {
  it("menampilkan year overview dengan summary per bulan", async () => {
    getYearCalendarSummary.mockResolvedValue([
      { month: "2027-01", tersedia: 25, pending: 2, diterima: 3, selesai: 1, dibatalkan: 0 },
      { month: "2027-02", tersedia: 22, pending: 1, diterima: 4, selesai: 2, dibatalkan: 0 },
      { month: "2027-03", tersedia: 20, pending: 3, diterima: 5, selesai: 2, dibatalkan: 1 },
    ]);

    render(
      await KalenderAdminPage({
        searchParams: { year: "2027" },
      }),
    );

    expect(screen.getByRole("heading", { name: /Kalender Admin/i })).toBeTruthy();
    expect(screen.getByText(/Tahun 2027/i)).toBeTruthy();
    expect(screen.getByText(/Januari 2027/i)).toBeTruthy();
    expect(screen.getByText(/Februari 2027/i)).toBeTruthy();
  });

  it("menampilkan badge count untuk pending dan diterima", async () => {
    getYearCalendarSummary.mockResolvedValue([
      { month: "2027-03", tersedia: 20, pending: 3, diterima: 5, selesai: 0, dibatalkan: 0 },
    ]);

    const { container } = render(
      await KalenderAdminPage({
        searchParams: { year: "2027" },
      }),
    );

    const pendingBadges = container.querySelectorAll('.bg-yellow-100');
    const diterimaBadges = container.querySelectorAll('.bg-red-100');
    
    expect(pendingBadges.length).toBeGreaterThan(0);
    expect(diterimaBadges.length).toBeGreaterThan(0);
  });

  it("menampilkan sticky legend dengan status warna", async () => {
    getYearCalendarSummary.mockResolvedValue([]);

    render(
      await KalenderAdminPage({
        searchParams: { year: "2027" },
      }),
    );

    expect(screen.getByText("Tersedia")).toBeTruthy();
    expect(screen.getByText("Pending")).toBeTruthy();
    expect(screen.getByText("Terisi")).toBeTruthy();
    expect(screen.getByText("Selesai")).toBeTruthy();
  });
});
