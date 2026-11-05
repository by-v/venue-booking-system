// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => vi.fn());

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
  useRouter: () => ({ push }),
}));

import { MonthDetailView } from "@/app/admin/kalender/[year]/[month]/month-detail-view";
import type { CalendarDay } from "@/modules/calendar/queries";

const acceptedEvent = {
  kind: "EVENT" as const,
  id: "r1",
  customerName: "Siti Aisyah & Raka Pratama",
  shortName: "Siti Aisyah",
  status: "DITERIMA",
  packageName: "Paket Pernikahan",
  eventType: "PERNIKAHAN",
  durationHours: 5,
  bookingNumber: "HADCC-2026-0001",
  setupDates: ["2026-10-20"],
};

const pendingEvent = {
  kind: "EVENT" as const,
  id: "r2",
  customerName: "Nadia Putri",
  shortName: "Nadia Putri",
  status: "PENDING",
  packageName: "Paket Akad",
  eventType: "PERNIKAHAN",
  durationHours: 3,
  bookingNumber: null,
  setupDates: [],
};

const suspendedEvent = {
  kind: "EVENT" as const,
  id: "r3",
  customerName: "PT Sinar",
  shortName: "PT Sinar",
  status: "DITANGGUHKAN",
  packageName: "Paket Gathering",
  eventType: "SEMINAR",
  durationHours: 4,
  bookingNumber: null,
  setupDates: [],
};

function day(partial: Partial<CalendarDay> & { date: string }): CalendarDay {
  return {
    inMonth: true,
    isToday: false,
    events: [],
    setups: [],
    ...partial,
  };
}

const days: CalendarDay[] = [
  day({ date: "2026-10-17", isToday: true }),
  day({
    date: "2026-10-20",
    setups: [
      {
        kind: "SETUP",
        reservationId: "r1",
        customerName: "Siti Aisyah & Raka Pratama",
        shortName: "Siti Aisyah",
      },
    ],
  }),
  day({ date: "2026-10-21", events: [acceptedEvent] }),
  day({ date: "2026-10-22", events: [pendingEvent, suspendedEvent] }),
];

const stats = {
  active: 3,
  diterima: 1,
  pending: 1,
  ditangguhkan: 1,
  dibatalkan: 0,
  selesai: 0,
};

function renderView() {
  return render(
    <MonthDetailView
      year={2026}
      month={10}
      days={days}
      stats={stats}
      today="2026-10-17"
    />,
  );
}

afterEach(() => {
  cleanup();
  push.mockReset();
});

describe("tampilan bulan kalender admin", () => {
  it("menampilkan judul bulan dan ringkasan status", () => {
    renderView();

    expect(screen.getByRole("heading", { name: "Oktober 2026" })).toBeTruthy();
    expect(
      screen.getByText(
        "3 reservasi aktif · 1 diterima · 1 menunggu · 1 ditangguhkan",
      ),
    ).toBeTruthy();
  });

  it("menampilkan detail tanggal yang dipilih", () => {
    renderView();

    fireEvent.click(
      screen.getByRole("button", { name: "Pilih tanggal 21 Oktober 2026" }),
    );

    expect(screen.getByText("Rabu, 21 Oktober 2026")).toBeTruthy();
    expect(screen.getByText("Siti Aisyah & Raka Pratama")).toBeTruthy();
    expect(screen.getByText("Durasi acara")).toBeTruthy();
    expect(screen.getByText("5 jam")).toBeTruthy();
  });

  it("menyaring chip event berdasarkan status", () => {
    renderView();

    expect(screen.getAllByText("Siti Aisyah").length).toBeGreaterThan(0);
    expect(screen.getByText("Nadia Putri")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Menunggu" }));

    expect(screen.queryAllByText("Siti Aisyah")).toHaveLength(0);
    expect(screen.getByText("Nadia Putri")).toBeTruthy();
    expect(screen.queryByText("PT Sinar")).toBeNull();
  });

  it("menavigasi ke bulan sebelumnya dan kembali ke tampilan tahun", () => {
    renderView();

    fireEvent.click(
      screen.getByRole("button", { name: "Bulan sebelumnya" }),
    );
    expect(push).toHaveBeenCalledWith("/admin/kalender/2026/09");

    const yearLink = screen.getByRole("link", { name: "Tahun" });
    expect(yearLink.getAttribute("href")).toBe("/admin/kalender?year=2026");
  });
});
