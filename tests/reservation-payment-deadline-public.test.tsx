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
  headers: vi.fn(async () => new Headers({ "x-forwarded-for": "203.0.113.7" })),
}));

vi.mock("@/modules/venue/queries", () => ({
  getPublicVenue: vi.fn(async () => null),
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
import CekStatusPage from "@/app/cek-status/page";
import {
  consumeStatusCheckLimit,
} from "@/modules/reservation/rate-limit";
import { getPublicBookingByNumber } from "@/modules/reservation/queries";

import { seedReservation } from "./helpers/seed-reservation";

const bookingNumber = "HADCC-2027-9101";
const eventDate = "2027-03-20";
const dueDateLabel = "6 Maret 2027";

async function seedPublicReservation(): Promise<void> {
  await seedReservation({
    reservationId: "reservasi-payment-deadline-publik",
    customerId: "customer-payment-deadline-publik",
    status: "DITERIMA",
    bookingNumber,
    eventDate,
  });
}

describe("batas pelunasan tidak terekspos ke publik", () => {
  beforeEach(() => {
    vi.mocked(consumeStatusCheckLimit).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("query publik tidak mengembalikan batas atau penanda", async () => {
    await seedPublicReservation();

    const proof = await getPublicBookingByNumber(bookingNumber);

    expect(proof?.eventDate).toBe(eventDate);
    expect(proof).not.toHaveProperty("paymentDueDate");
    expect(proof).not.toHaveProperty("paymentOverdue");
  });

  it("cek status tidak menampilkan batas pelunasan", async () => {
    await seedPublicReservation();

    render(
      await CekStatusPage({
        searchParams: Promise.resolve({ nomor: bookingNumber }),
      }),
    );

    expect(screen.getByText(bookingNumber)).toBeTruthy();
    expect(screen.queryByText("Batas pelunasan")).toBeNull();
    expect(screen.queryByText("Pelunasan terlambat")).toBeNull();
    expect(screen.queryByText(dueDateLabel)).toBeNull();
  });

  it("Bukti Booking tidak menampilkan batas pelunasan", async () => {
    await seedPublicReservation();

    render(
      await BuktiBookingPage({
        params: Promise.resolve({ nomor: bookingNumber }),
      }),
    );

    expect(screen.getAllByText(bookingNumber).length).toBeGreaterThan(0);
    expect(screen.queryByText("Batas pelunasan")).toBeNull();
    expect(screen.queryByText("Pelunasan terlambat")).toBeNull();
    expect(screen.queryByText(dueDateLabel)).toBeNull();
  });
});
