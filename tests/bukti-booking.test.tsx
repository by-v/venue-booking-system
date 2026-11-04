// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  headers: vi.fn(async () => new Headers({ "x-forwarded-for": "203.0.113.9" })),
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

import BuktiBookingPage from "@/app/bukti-booking/[nomor]/page";
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
  facilities: ["Panggung", "Kursi Tambahan"],
  totalRupiah: 22_000_000,
  minimumDpRupiah: 5_500_000,
  verifiedPaymentRupiah: 6_000_000,
  remainingRupiah: 16_000_000,
  paymentStatus: "DP",
  status: "DITERIMA",
};

async function renderPage(nomor = "HADCC-2027-0001"): Promise<void> {
  const page = await BuktiBookingPage({
    params: Promise.resolve({ nomor }),
  });
  render(page);
}

describe("halaman Bukti Booking", () => {
  const printSpy = vi.fn();

  beforeEach(() => {
    vi.mocked(consumeStatusCheckLimit).mockResolvedValue(undefined);
    vi.mocked(getPublicBookingByNumber).mockResolvedValue(proof);
    Object.defineProperty(window, "print", {
      configurable: true,
      writable: true,
      value: printSpy,
    });
  });

  afterEach(() => {
    cleanup();
    printSpy.mockReset();
    vi.clearAllMocks();
  });

  it("menampilkan seluruh isi BR-10 dan waktu cetak", async () => {
    await renderPage();

    expect(getPublicBookingByNumber).toHaveBeenCalledWith("HADCC-2027-0001");
    expect(screen.getAllByText("HADCC-2027-0001").length).toBeGreaterThan(0);
    expect(screen.getByText("B*** S***")).toBeDefined();
    expect(screen.getByText("20 Maret 2027")).toBeDefined();
    expect(
      screen.getByText(GALLERY_CATEGORY_LABELS.PERNIKAHAN),
    ).toBeDefined();
    expect(screen.getByText("Paket Uji")).toBeDefined();
    expect(screen.getByText("5 jam, 1 sesi")).toBeDefined();
    expect(
      screen.getByText("Panggung, Kursi Tambahan"),
    ).toBeDefined();
    expect(screen.getByText("Rp22.000.000")).toBeDefined();
    expect(screen.getByText("Rp5.500.000")).toBeDefined();
    expect(screen.getByText("Rp6.000.000")).toBeDefined();
    expect(screen.getByText("Rp16.000.000")).toBeDefined();
    expect(screen.getByText("DP")).toBeDefined();
    expect(screen.getByText("Diterima")).toBeDefined();
    expect(screen.getByText(/^Dicetak pada /)).toBeDefined();
  });

  it("memicu dialog cetak peramban saat Cetak Bukti ditekan", async () => {
    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Cetak Bukti" }));

    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it("menampilkan pesan generik saat nomor tidak ditemukan", async () => {
    vi.mocked(getPublicBookingByNumber).mockResolvedValue(null);

    await renderPage("HADCC-2027-9999");

    expect(screen.getByRole("alert").textContent).toBe(
      "Nomor booking tidak ditemukan atau tidak valid. Periksa kembali nomor booking Anda.",
    );
  });

  it("menampilkan pesan generik yang sama untuk format tidak valid", async () => {
    await renderPage("bukan-nomor-booking");

    expect(screen.getByRole("alert").textContent).toBe(
      "Nomor booking tidak ditemukan atau tidak valid. Periksa kembali nomor booking Anda.",
    );
    expect(getPublicBookingByNumber).not.toHaveBeenCalled();
  });

  it("menampilkan pesan generik saat batas percobaan terlampaui", async () => {
    vi.mocked(consumeStatusCheckLimit).mockRejectedValue(
      new RateLimitError(),
    );

    await renderPage();

    expect(screen.getByRole("alert").textContent).toBe(
      "Nomor booking tidak ditemukan atau tidak valid. Periksa kembali nomor booking Anda.",
    );
    expect(getPublicBookingByNumber).not.toHaveBeenCalled();
  });
});
