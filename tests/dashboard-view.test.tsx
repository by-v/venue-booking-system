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
  year: 2026,
  agendaMonth: null,
  availableYears: [2026],
  stats: {
    total: 0,
    pending: 0,
    suspended: 0,
    accepted: 0,
    completed: 0,
    cancelled: 0,
    acceptedValueRupiah: 0,
    verifiedPaymentRupiah: 0,
    remainingRupiah: 0,
    conversionPercent: 0,
    averageValueRupiah: 0,
  },
  agenda: [],
  followUps: [],
  recentReservations: [],
};

const DATA_WITH_RESERVATIONS: DashboardData = {
  year: 2026,
  agendaMonth: null,
  availableYears: [2025, 2026],
  stats: {
    total: 8,
    pending: 1,
    suspended: 1,
    accepted: 2,
    completed: 1,
    cancelled: 2,
    acceptedValueRupiah: 62_000_000,
    verifiedPaymentRupiah: 5_000_000,
    remainingRupiah: 57_000_000,
    conversionPercent: 38,
    averageValueRupiah: 20_666_667,
  },
  agenda: [
    {
      id: "res-accepted",
      customerName: "Rina Wati",
      customerWhatsapp: "6281355556666",
      eventDate: "2026-10-10",
      eventType: "PERNIKAHAN",
      packageName: "Full Service",
      status: "DITERIMA",
      setupDates: ["2026-10-08", "2026-10-09"],
    },
    {
      id: "res-finished",
      customerName: "Joko Susilo",
      customerWhatsapp: "6281222223333",
      eventDate: "2026-09-06",
      eventType: "SEMINAR",
      packageName: "Full Service",
      status: "SELESAI",
      setupDates: [],
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

    expect(screen.getByTestId("dashboard-total").textContent).toBe("0");
    expect(screen.getByTestId("dashboard-accepted-value").textContent).toBe(
      "Rp0",
    );
    expect(screen.getByTestId("dashboard-conversion").textContent).toBe("0%");
    expect(screen.getByText("Belum ada agenda")).toBeTruthy();
    expect(screen.getByText("Tidak ada tindak lanjut")).toBeTruthy();
    expect(screen.getByText("Belum ada reservasi")).toBeTruthy();
  });

  it("menampilkan kartu statistik volume, finansial, dan insight", () => {
    render(<DashboardView data={DATA_WITH_RESERVATIONS} />);

    expect(screen.getByTestId("dashboard-total").textContent).toBe("8");
    expect(screen.getByTestId("dashboard-pending").textContent).toBe("1");
    expect(screen.getByTestId("dashboard-suspended").textContent).toBe("1");
    expect(screen.getByTestId("dashboard-accepted").textContent).toBe("2");
    expect(screen.getByTestId("dashboard-completed").textContent).toBe("1");
    expect(screen.getByTestId("dashboard-cancelled").textContent).toBe("2");
    expect(screen.getByTestId("dashboard-accepted-value").textContent).toBe(
      "Rp62.000.000",
    );
    expect(screen.getByTestId("dashboard-verified-payment").textContent).toBe(
      "Rp5.000.000",
    );
    expect(screen.getByTestId("dashboard-remaining").textContent).toBe(
      "Rp57.000.000",
    );
    expect(screen.getByTestId("dashboard-conversion").textContent).toBe("38%");
    expect(screen.getByTestId("dashboard-average-value").textContent).toBe(
      "Rp20.666.667",
    );
  });

  it("mengelompokkan agenda per bulan dan menampilkan tanggal setup", () => {
    render(<DashboardView data={DATA_WITH_RESERVATIONS} />);

    expect(screen.getByText("Agenda Reservasi 2026")).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 3, name: /Oktober/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 3, name: /September/ }),
    ).toBeTruthy();
    expect(screen.getByText("Rina Wati")).toBeTruthy();
    expect(screen.getByText("Pernikahan · Full Service")).toBeTruthy();
    expect(
      screen.getByText("Setup: 8 Oktober 2026, 9 Oktober 2026"),
    ).toBeTruthy();
    expect(screen.getAllByText("Selesai").length).toBeGreaterThan(0);
  });

  it("setiap agenda dapat diklik menuju detail reservasi", () => {
    render(<DashboardView data={DATA_WITH_RESERVATIONS} />);

    const link = screen.getByRole("link", { name: /Rina Wati/ });
    expect(link.getAttribute("href")).toBe("/admin/reservasi/res-accepted");
  });

  it("menampilkan filter tahun dan filter bulan agenda", () => {
    render(<DashboardView data={DATA_WITH_RESERVATIONS} />);

    const yearInput = screen.getByLabelText("Filter tahun");
    expect((yearInput as HTMLSelectElement).value).toBe("2026");

    const monthInput = screen.getByLabelText("Filter bulan");
    expect((monthInput as HTMLSelectElement).value).toBe("");
    expect(
      screen.getByRole("option", { name: "Semua bulan" }),
    ).toBeTruthy();
    expect(screen.getByRole("option", { name: "November" })).toBeTruthy();
  });

  it("mengarahkan Lihat semua ke kalender tahun saat semua bulan", () => {
    render(<DashboardView data={DATA_WITH_RESERVATIONS} />);

    const link = screen.getByRole("link", { name: "Lihat semua" });
    expect(link.getAttribute("href")).toBe("/admin/kalender?year=2026");
  });

  it("mengarahkan Lihat semua ke kalender bulan saat bulan dipilih", () => {
    render(
      <DashboardView
        data={{ ...DATA_WITH_RESERVATIONS, agendaMonth: "2026-10" }}
      />,
    );

    const link = screen.getByRole("link", { name: "Lihat semua" });
    expect(link.getAttribute("href")).toBe("/admin/kalender/2026/10");
    expect(screen.getByText("Oktober 2026 · 2 agenda")).toBeTruthy();
  });

  it("menampilkan alasan perlu tindak lanjut", () => {
    render(<DashboardView data={DATA_WITH_RESERVATIONS} />);

    expect(screen.getByText("Siti Aminah")).toBeTruthy();
    expect(screen.getByText("Dewi Lestari")).toBeTruthy();
    expect(screen.getByText("Permintaan menunggu")).toBeTruthy();
    expect(screen.getByText("Perlu diperiksa")).toBeTruthy();
  });

  it("menampilkan reservasi terbaru", () => {
    render(<DashboardView data={DATA_WITH_RESERVATIONS} />);

    expect(screen.getByText("Agus Salim")).toBeTruthy();
    expect(screen.getByText("Seminar · 15 Oktober 2026")).toBeTruthy();
    expect(screen.getByText("Rp20.000.000")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Agus Salim" }).getAttribute("href"),
    ).toBe("/admin/reservasi/res-recent");
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
