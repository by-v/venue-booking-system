// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const consumeStatusCheckLimit = vi.hoisted(() =>
  vi.fn(async () => undefined),
);

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

vi.mock("@/modules/reservation/rate-limit", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/modules/reservation/rate-limit")>();
  return {
    ...actual,
    consumeStatusCheckLimit,
  };
});

import BuktiBookingPage from "@/app/bukti-booking/[nomor]/page";
import CekStatusPage from "@/app/cek-status/page";
import { GET } from "@/app/api/ketersediaan/route";
import { db } from "@/lib/db";
import { setupNote } from "@/lib/db/schema";
import { getPublicBookingByNumber } from "@/modules/reservation/queries";

import { seedReservation } from "./helpers/seed-reservation";

const BOOKING_NUMBER = "HADCC-2099-0001";
const SETUP_NOTE_TEXT =
  "Catatan setup rahasia: kunci gudang samping dan sound check pukul 15.00.";
const BASE_URL = "http://localhost:3000";

beforeEach(async () => {
  const seeded = await seedReservation({
    reservationId: "reservasi-setup-publik",
    customerId: "customer-setup-publik",
    customerName: "Siti Aminah",
    customerWhatsapp: "6281234567890",
    status: "DITERIMA",
    bookingNumber: BOOKING_NUMBER,
    eventDate: "2099-03-20",
    createDateLocks: true,
  });

  await db.insert(setupNote).values({
    id: "setup-note-publik",
    reservationId: seeded.reservationId,
    note: SETUP_NOTE_TEXT,
    updatedByUserId: seeded.actorUserId,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("catatan setup tidak terekspos ke publik", () => {
  it("tidak muncul pada respons endpoint ketersediaan", async () => {
    const response = await GET(
      new Request(
        `${BASE_URL}/api/ketersediaan?packageId=paket-uji&bulan=2099-03`,
      ),
    );

    expect(response.status).toBe(200);
    const serialized = await response.text();
    expect(serialized).not.toContain(SETUP_NOTE_TEXT);
    expect(serialized).not.toContain("setup_note");
  });

  it("tidak muncul pada data Bukti Booking publik", async () => {
    const proof = await getPublicBookingByNumber(BOOKING_NUMBER);

    expect(proof).not.toBeNull();
    expect(proof).not.toHaveProperty("setupNote");
    expect(JSON.stringify(proof)).not.toContain(SETUP_NOTE_TEXT);
  });

  it("tidak muncul pada halaman cek status", async () => {
    const page = await CekStatusPage({
      searchParams: Promise.resolve({ nomor: BOOKING_NUMBER }),
    });
    render(page);

    expect(screen.getByText(BOOKING_NUMBER)).toBeDefined();
    expect(document.body.textContent).not.toContain(SETUP_NOTE_TEXT);
  });

  it("tidak muncul pada halaman Bukti Booking", async () => {
    const page = await BuktiBookingPage({
      params: Promise.resolve({ nomor: BOOKING_NUMBER }),
    });
    render(page);

    expect(screen.getAllByText(BOOKING_NUMBER).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain(SETUP_NOTE_TEXT);
  });
});
