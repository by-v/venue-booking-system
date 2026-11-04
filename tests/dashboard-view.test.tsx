// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

import { DashboardView } from "@/app/admin/dashboard-view";
import type { DashboardData } from "@/modules/reservation/types";

const EMPTY_DATA: DashboardData = {
  month: "2026-10",
  activeCount: 0,
  statusCards: {
    pending: 0,
    suspended: 0,
    accepted: 0,
    cancelled: 0,
  },
  agenda: [],
  followUps: [],
  recentReservations: [],
};

const DATA_WITH_RESERVATIONS: DashboardData = {
  month: "2026-10",
  activeCount: 4,
  statusCards: {
    pending: 1,
    suspended: 1,
    accepted: 2,
    cancelled: 2,
  },
  agenda: [
    {
      id: "res-accepted",
      customerName: "Rina Wati",
      customerWhatsapp: "6281355556666",
      eventDate: "2026-10-10",
      eventType: "PERNIKAHAN",
      packageName: "Full Service",
      setupDates: ["2026-10-08", "2026-10-09"],
    },
  ],
  followUps: [
    {
      id: "res-pending",
      customerName: "Siti Aminah",
      customerWhatsapp: "6281234567890",
      eventDate: "2026-10-01",
      packageName: "Full Service",
      status: "PENDING",
      reasons: ["PENDING"],
    },
    {
      id: "res-check",
      customerName: "Dewi Lestari",
      customerWhatsapp: "6281377778888",
      eventDate: "2026-10-05",
      packageName: "Full Service",
      status: "DITERIMA",
      reasons: ["PERLU_PEMERIKSAAN"],
    },
  ],
  recentReservations: [
    {
      id: "res-recent",
      customerName: "Agus Salim",
      customerWhatsapp: "6281399990000",
      eventDate: "2026-10-15",
      eventType: "SEMINAR",
      packageName: "Full Service",
      packagePriceRupiah: 20_000_000,
      totalRupiah: 20_000_000,
      verifiedPaymentRupiah: 5_000_000,
      paymentStatus: "DP",
      status: "DITERIMA",
      source: "FORM_PUBLIK",
      bookingNumber: "HADCC-2026-0001",
      createdAt: new Date("2026-09-20T03:00:00Z"),
    },
  ],
};

afterEach(() => {
  cleanup();
});

describe("tampilan dashboard admin", () => {
  it("menampilkan keadaan kosong tanpa data", () => {
    render(<DashboardView />);

    expect(screen.getByText("Belum ada data")).toBeTruthy();
  });

  it("menampilkan angka nol dan keadaan kosong pada setiap widget", () => {
    render(<DashboardView data={EMPTY_DATA} />);

    expect(screen.getByTestId("dashboard-active-count").textContent).toBe("0");
    expect(screen.getByText("Belum ada agenda")).toBeTruthy();
    expect(screen.getByText("Tidak ada tindak lanjut")).toBeTruthy();
    expect(screen.getByText("Belum ada reservasi")).toBeTruthy();
  });

  it("menampilkan ringkasan, batang status, dan empat kartu status", () => {
    const { container } = render(
      <DashboardView data={DATA_WITH_RESERVATIONS} />,
    );

    expect(screen.getByTestId("dashboard-active-count").textContent).toBe("4");
    expect(
      screen.getByRole("img", {
        name: /Komposisi status aktif: 1 menunggu, 2 diterima, 1 ditangguhkan/,
      }),
    ).toBeTruthy();

    expect(
      container
        .querySelector('[data-status-segment="pending"]')
        ?.getAttribute("style"),
    ).toBe("width: 25%;");
    expect(
      container.querySelector('[data-status-card="pending"]')?.textContent,
    ).toContain("1");
    expect(
      container.querySelector('[data-status-card="accepted"]')?.textContent,
    ).toContain("2");
    expect(
      container.querySelector('[data-status-card="suspended"]')?.textContent,
    ).toContain("1");
    expect(
      container.querySelector('[data-status-card="cancelled"]')?.textContent,
    ).toContain("2");
  });

  it("menampilkan agenda beserta tanggal setup", () => {
    render(<DashboardView data={DATA_WITH_RESERVATIONS} />);

    expect(screen.getByText("Rina Wati")).toBeTruthy();
    expect(screen.getByText("Pernikahan · Full Service")).toBeTruthy();
    expect(
      screen.getByText("Setup: 8 Oktober 2026, 9 Oktober 2026"),
    ).toBeTruthy();
    expect(screen.getByText("10 Oktober 2026")).toBeTruthy();
  });

  it("menampilkan alasan perlu tindak lanjut", () => {
    render(<DashboardView data={DATA_WITH_RESERVATIONS} />);

    expect(screen.getByText("Siti Aminah")).toBeTruthy();
    expect(screen.getByText("Dewi Lestari")).toBeTruthy();
    expect(screen.getByText("Permintaan menunggu")).toBeTruthy();
    expect(screen.getByText("Perlu diperiksa")).toBeTruthy();
  });

  it("menampilkan reservasi terbaru dan filter bulan", () => {
    render(<DashboardView data={DATA_WITH_RESERVATIONS} />);

    const monthInput = screen.getByLabelText("Filter bulan");
    expect((monthInput as HTMLInputElement).value).toBe("2026-10");
    expect(screen.getByText("Oktober 2026")).toBeTruthy();

    expect(screen.getByText("Agus Salim")).toBeTruthy();
    expect(screen.getByText("Seminar")).toBeTruthy();
    expect(screen.getByText("Rp20.000.000")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Detail reservasi Agus Salim" }),
    ).toBeTruthy();
  });

  it("menampilkan skeleton saat memuat", () => {
    render(<DashboardView status="loading" />);

    expect(screen.getByLabelText("Memuat dashboard")).toBeTruthy();
  });

  it("menampilkan galat dan Coba Lagi memanggil ulang", () => {
    const onRetry = vi.fn();
    render(<DashboardView status="error" onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: "Coba Lagi" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
