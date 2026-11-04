// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getReservationDetail = vi.hoisted(() => vi.fn());
const getReservationConfirmationContext = vi.hoisted(() => vi.fn());

vi.mock("@/modules/auth", () => ({
  requireAdminSession: vi.fn(async () => ({
    user: { id: "admin-1", email: "admin@example.test" },
  })),
}));
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
import type { ReservationDetail } from "@/modules/reservation/types";

function detailWithSetupNote(
  setupNote: ReservationDetail["setupNote"],
): ReservationDetail {
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
    eventDate: "2027-03-20",
    eventType: "PERNIKAHAN",
    address: "Jl. Pelita II No. 1, Pekalongan",
    notes: null,
    status: "PENDING",
    paymentDueDate: "2027-03-06",
    paymentDueDateOverride: null,
    paymentOverdue: false,
    source: "FORM_PUBLIK",
    bookingNumber: null,
    dpForfeited: false,
    perluPemeriksaanAdmin: false,
    rescheduleCount: 0,
    setupNote,
    createdAt: new Date("2026-10-21T03:00:00Z"),
    items: [],
    payments: [],
    financials: {
      packagePriceRupiah: 20_000_000,
      itemTotalRupiah: 0,
      totalRupiah: 20_000_000,
      minimumDpRupiah: 5_000_000,
      verifiedPaymentRupiah: 0,
      remainingRupiah: 20_000_000,
      paymentStatus: "BELUM_DP",
    },
    activities: [],
    statusHistory: [],
  };
}

async function renderDetail() {
  render(
    await ReservasiDetailPage({
      params: Promise.resolve({ id: "res-1" }),
      searchParams: Promise.resolve({}),
    }),
  );
}

beforeEach(() => {
  getReservationDetail.mockResolvedValue(detailWithSetupNote(null));
  getReservationConfirmationContext.mockResolvedValue({
    lockDates: [],
    hasDateConflict: false,
    conflicts: [],
  });
});

afterEach(() => {
  cleanup();
});

describe("kartu catatan setup", () => {
  it("menampilkan keadaan kosong dan form pada detail reservasi", async () => {
    await renderDetail();

    expect(screen.getByRole("heading", { name: "Catatan setup" })).toBeTruthy();
    expect(
      screen.getByText("Belum ada catatan setup untuk reservasi ini."),
    ).toBeTruthy();
    expect(screen.getByLabelText("Catatan setup")).toHaveProperty(
      "value",
      "",
    );
    expect(
      screen.getByRole("button", { name: "Simpan catatan setup" }),
    ).toBeTruthy();
  });

  it("menampilkan catatan setup yang sudah ada", async () => {
    getReservationDetail.mockResolvedValue(
      detailWithSetupNote({
        id: "setup-note-1",
        reservationId: "res-1",
        note: "Meja registrasi di lobi utama.",
        updatedByUserId: "admin-1",
        createdAt: new Date("2026-10-21T04:00:00Z"),
        updatedAt: new Date("2026-10-21T05:00:00Z"),
      }),
    );

    await renderDetail();

    expect(
      screen.getByText("Meja registrasi di lobi utama.", { selector: "p" }),
    ).toBeTruthy();
    expect(screen.getByText(/Diperbarui/)).toBeTruthy();
    expect(screen.getByLabelText("Catatan setup")).toHaveProperty(
      "value",
      "Meja registrasi di lobi utama.",
    );
  });

  it("menjelaskan bahwa catatan tidak mengubah status, jadwal, pembayaran, atau timer", async () => {
    await renderDetail();

    expect(
      screen.getByText(
        /Hanya terlihat admin dan tidak mengubah status, jadwal, pembayaran, atau timer auto-cancel/,
      ),
    ).toBeTruthy();
  });
});
