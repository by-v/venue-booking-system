// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-forwarded-for": "203.0.113.5" })),
}));

vi.mock("@/modules/venue/queries", () => ({
  getPublicVenue: vi.fn(async () => null),
}));

vi.mock("@/modules/reservation/queries", () => ({
  getPublicBookingByNumber: vi.fn(),
}));

vi.mock("@/modules/reservation/rate-limit", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/modules/reservation/rate-limit")>();
  return {
    ...actual,
    consumeStatusCheckLimit: vi.fn(),
  };
});

import CekStatusPage from "@/app/cek-status/page";
import {
  RateLimitError,
  consumeStatusCheckLimit,
} from "@/modules/reservation/rate-limit";
import { getPublicBookingByNumber } from "@/modules/reservation/queries";
import type { PublicBookingProof } from "@/modules/reservation/types";
import { GALLERY_CATEGORY_LABELS } from "@/modules/venue/types";

const proof: PublicBookingProof = {
  bookingNumber: "HADCC-2027-0001",
  maskedCustomerName: "B*** S***",
  eventDate: "2027-03-20",
  eventType: "PERNIKAHAN",
  packageName: "Paket Uji",
  packageDurationHours: 5,
  packageSessionCount: 1,
  packagePriceRupiah: 20_000_000,
  facilities: ["Panggung"],
  totalRupiah: 22_000_000,
  minimumDpRupiah: 5_500_000,
  verifiedPaymentRupiah: 6_000_000,
  remainingRupiah: 16_000_000,
  paymentStatus: "DP",
  status: "DITERIMA",
};

async function renderPage(nomor?: string): Promise<void> {
  const page = await CekStatusPage({
    searchParams: Promise.resolve(nomor === undefined ? {} : { nomor }),
  });
  render(page);
}

describe("halaman cek status", () => {
  beforeEach(() => {
    vi.mocked(consumeStatusCheckLimit).mockResolvedValue(undefined);
    vi.mocked(getPublicBookingByNumber).mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("menampilkan form nomor booking tanpa memproses pencarian", async () => {
    await renderPage();

    expect(
      screen.getByRole("textbox", { name: "Nomor booking" }),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "Cek Status" })).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Cek Status Reservasi" }).getAttribute(
        "href",
      ),
    ).toBe("/cek-status");
    expect(getPublicBookingByNumber).not.toHaveBeenCalled();
    expect(consumeStatusCheckLimit).not.toHaveBeenCalled();
  });

  it("menampilkan ringkasan dan tautan Cetak Bukti untuk nomor valid", async () => {
    vi.mocked(getPublicBookingByNumber).mockResolvedValue(proof);

    await renderPage("HADCC-2027-0001");

    expect(getPublicBookingByNumber).toHaveBeenCalledWith("HADCC-2027-0001");
    expect(screen.getByText("HADCC-2027-0001")).toBeDefined();
    expect(screen.getByText("B*** S***")).toBeDefined();
    expect(screen.getByText("20 Maret 2027")).toBeDefined();
    expect(screen.getByText(GALLERY_CATEGORY_LABELS.PERNIKAHAN)).toBeDefined();
    expect(screen.getByText("Rp22.000.000")).toBeDefined();
    expect(screen.getByText("Rp6.000.000")).toBeDefined();
    expect(screen.getByText("Rp16.000.000")).toBeDefined();
    expect(screen.getAllByText("Diterima").length).toBeGreaterThan(0);

    const printLink = screen.getByRole("link", { name: /Cetak Bukti/ });
    expect(printLink.getAttribute("href")).toBe(
      "/bukti-booking/HADCC-2027-0001",
    );
  });

  it("menampilkan pesan generik saat nomor tidak ditemukan", async () => {
    await renderPage("HADCC-2027-9999");

    expect(
      screen.getByRole("alert").textContent,
    ).toBe(
      "Nomor booking tidak ditemukan atau tidak valid. Periksa kembali nomor booking Anda.",
    );
  });

  it("menampilkan pesan generik yang sama untuk format tidak valid", async () => {
    await renderPage("nama-customer");

    expect(screen.getByRole("alert").textContent).toBe(
      "Nomor booking tidak ditemukan atau tidak valid. Periksa kembali nomor booking Anda.",
    );
    expect(getPublicBookingByNumber).not.toHaveBeenCalled();
  });

  it("menampilkan pesan generik saat batas percobaan terlampaui", async () => {
    vi.mocked(consumeStatusCheckLimit).mockRejectedValue(
      new RateLimitError(),
    );

    await renderPage("HADCC-2027-0001");

    expect(screen.getByRole("alert").textContent).toBe(
      "Nomor booking tidak ditemukan atau tidak valid. Periksa kembali nomor booking Anda.",
    );
    expect(getPublicBookingByNumber).not.toHaveBeenCalled();
  });
});
