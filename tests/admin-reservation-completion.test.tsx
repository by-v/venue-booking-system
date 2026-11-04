// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminSession = vi.hoisted(() =>
  vi.fn(async () => ({
    user: { id: "admin-1", email: "admin@example.test" },
  })),
);
const getReservationDetail = vi.hoisted(() => vi.fn());
const getReservationConfirmationContext = vi.hoisted(() => vi.fn());

vi.mock("@/modules/auth", () => ({ requireAdminSession }));
vi.mock("@/modules/reservation/queries", () => ({
  getReservationDetail,
  getReservationConfirmationContext,
}));
vi.mock("@/modules/reservation/mutations", () => ({
  addFollowUpNote: vi.fn(),
  addReservationItem: vi.fn(),
  cancelAcceptedReservation: vi.fn(),
  cancelReservation: vi.fn(),
  completeReservation: vi.fn(),
  confirmReservation: vi.fn(),
  createAdminReservation: vi.fn(),
  markDownPayment: vi.fn(),
  markPaidOff: vi.fn(),
  rescheduleReservation: vi.fn(),
  saveSetupNote: vi.fn(),
  suspendReservation: vi.fn(),
  updatePaymentDueDate: vi.fn(),
  updateReservationData: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
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

import ReservasiDetailPage from "@/app/admin/reservasi/[id]/page";
import { addDays, todayInJakarta } from "@/modules/availability/dates";
import type { ReservationDetail } from "@/modules/reservation/types";

function detailFor(eventDate: string, status: "DITERIMA" | "SELESAI" = "DITERIMA"): ReservationDetail {
  return {
    id: "res-1",
    customer: {
      id: "cust-1",
      name: "Siti Aminah",
      whatsapp: "6281234567890",
    },
    packageId: "full-service",
    packageName: "Full Service",
    packagePriceRupiah: 20_000_000,
    packageDurationHours: 5,
    packageSessionCount: 1,
    eventDate,
    eventType: "PERNIKAHAN",
    address: "Jl. Pelita II No. 1, Pekalongan",
    notes: null,
    status,
    paymentDueDate: addDays(eventDate, -14),
    paymentDueDateOverride: null,
    paymentOverdue: false,
    source: "FORM_PUBLIK",
    bookingNumber: "HADCC-2026-0001",
    dpForfeited: false,
    perluPemeriksaanAdmin: false,
    rescheduleCount: 0,
    setupNote: null,
    createdAt: new Date("2026-01-01T03:00:00Z"),
    items: [],
    payments: [],
    financials: {
      packagePriceRupiah: 20_000_000,
      itemTotalRupiah: 0,
      totalRupiah: 20_000_000,
      minimumDpRupiah: 5_000_000,
      verifiedPaymentRupiah: 20_000_000,
      remainingRupiah: 0,
      paymentStatus: "LUNAS",
    },
    activities: [],
    statusHistory: [],
  };
}

async function renderDetail(detail: ReservationDetail): Promise<void> {
  getReservationDetail.mockResolvedValue(detail);
  render(
    await ReservasiDetailPage({
      params: Promise.resolve({ id: detail.id }),
    }),
  );
}

beforeEach(() => {
  getReservationConfirmationContext.mockResolvedValue(null);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("aksi penyelesaian pada detail reservasi", () => {
  it("menampilkan Tandai selesai setelah tanggal acara", async () => {
    await renderDetail(detailFor(addDays(todayInJakarta(), -1)));

    expect(
      screen.getByRole("heading", { name: "Tindakan status" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Tandai selesai" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/tanggal acara sudah lewat/),
    ).toBeTruthy();
  });

  it("tidak menampilkan aksi pada hari tanggal acara", async () => {
    await renderDetail(detailFor(todayInJakarta()));

    expect(
      screen.queryByRole("button", { name: "Tandai selesai" }),
    ).toBeNull();
  });

  it("tidak menampilkan aksi sebelum tanggal acara", async () => {
    await renderDetail(detailFor(addDays(todayInJakarta(), 1)));

    expect(
      screen.queryByRole("button", { name: "Tandai selesai" }),
    ).toBeNull();
  });

  it("tidak menampilkan aksi untuk reservasi yang sudah SELESAI", async () => {
    await renderDetail(
      detailFor(addDays(todayInJakarta(), -1), "SELESAI"),
    );

    expect(
      screen.queryByRole("button", { name: "Tandai selesai" }),
    ).toBeNull();
    expect(
      screen.getByText(
        "Tidak ada tindakan status yang tersedia untuk reservasi ini.",
      ),
    ).toBeTruthy();
  });
});
