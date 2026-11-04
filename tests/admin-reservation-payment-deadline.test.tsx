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
import { paymentDueDate } from "@/modules/reservation/payment-deadline";
import type {
  PaymentStatus,
  ReservationDetail,
} from "@/modules/reservation/types";

function formatEventDate(date: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function detailFor({
  eventDate,
  paymentOverdue,
  paymentStatus = "DP",
}: {
  eventDate: string;
  paymentOverdue: boolean;
  paymentStatus?: PaymentStatus;
}): ReservationDetail {
  const verifiedPaymentRupiah =
    paymentStatus === "LUNAS"
      ? 20_000_000
      : paymentStatus === "DP"
        ? 5_000_000
        : 0;

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
    status: "PENDING",
    paymentDueDate: paymentDueDate(eventDate),
    paymentDueDateOverride: null,
    paymentOverdue,
    source: "FORM_PUBLIK",
    bookingNumber: null,
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
      verifiedPaymentRupiah,
      remainingRupiah: 20_000_000 - verifiedPaymentRupiah,
      paymentStatus,
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

describe("batas pelunasan pada detail reservasi admin", () => {
  it("menampilkan batas pelunasan sebelum batas tanpa penanda", async () => {
    const eventDate = addDays(todayInJakarta(), 30);
    await renderDetail(
      detailFor({ eventDate, paymentOverdue: false, paymentStatus: "BELUM_DP" }),
    );

    expect(screen.getByText("Batas pelunasan")).toBeTruthy();
    expect(
      screen.getByText(formatEventDate(paymentDueDate(eventDate))),
    ).toBeTruthy();
    expect(screen.queryByText("Pelunasan terlambat")).toBeNull();
  });

  it("tidak menampilkan penanda tepat pada batas", async () => {
    const eventDate = addDays(todayInJakarta(), 14);
    await renderDetail(
      detailFor({ eventDate, paymentOverdue: false, paymentStatus: "DP" }),
    );

    expect(screen.queryByText("Pelunasan terlambat")).toBeNull();
  });

  it("menampilkan penanda setelah batas untuk reservasi belum lunas", async () => {
    const eventDate = addDays(todayInJakarta(), -1);
    await renderDetail(
      detailFor({ eventDate, paymentOverdue: true, paymentStatus: "DP" }),
    );

    expect(screen.getByText("Pelunasan terlambat")).toBeTruthy();
    expect(
      screen.getByText(
        "Pembatalan tidak berjalan otomatis. Bila perlu, admin dapat membatalkan reservasi melalui tindakan di bawah.",
      ),
    ).toBeTruthy();
  });

  it("tidak menampilkan penanda untuk reservasi LUNAS", async () => {
    const eventDate = addDays(todayInJakarta(), -1);
    await renderDetail(
      detailFor({ eventDate, paymentOverdue: false, paymentStatus: "LUNAS" }),
    );

    expect(screen.queryByText("Pelunasan terlambat")).toBeNull();
    expect(screen.getByText("Lunas")).toBeTruthy();
  });
});
