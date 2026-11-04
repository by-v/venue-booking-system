import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  customer,
  dateLock,
  packageTable,
  payment,
  reservation,
} from "@/lib/db/schema";
import { addDays, todayInJakarta } from "@/modules/availability/dates";
import { getDashboardData } from "@/modules/reservation/queries";
import type { ReservationStatus } from "@/modules/reservation/types";

interface SeedReservationOptions {
  id: string;
  name: string;
  whatsapp: string;
  status: ReservationStatus;
  eventDate: string;
  perluPemeriksaanAdmin?: boolean;
  bookingNumber?: string;
}

function nextMonthOf(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 7);
}

async function seedPackage(): Promise<void> {
  await db.insert(packageTable).values({
    id: "full-service",
    name: "Full Service",
    priceRupiah: 20_000_000,
    durationHours: 5,
    sessionCount: 1,
    setupDaysBefore: 0,
    active: true,
    sortOrder: 1,
  });
}

async function seedReservation({
  id,
  name,
  whatsapp,
  status,
  eventDate,
  perluPemeriksaanAdmin = false,
  bookingNumber,
}: SeedReservationOptions): Promise<void> {
  const customerId = `customer-${id}`;
  await db.insert(customer).values({
    id: customerId,
    name,
    whatsapp,
    status: "CALON",
  });
  await db.insert(reservation).values({
    id,
    customerId,
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
    bookingNumber,
    perluPemeriksaanAdmin,
    createdAt: new Date(`${eventDate}T03:00:00Z`),
  });
}

describe("query dashboard", () => {
  it("menghitung ringkasan, agenda, tindak lanjut, dan reservasi terbaru per bulan", async () => {
    await seedPackage();

    const today = todayInJakarta();
    const month = addDays(today, 35).slice(0, 7);
    const nextMonth = nextMonthOf(month);
    const date = (day: string) => `${month}-${day}`;

    await seedReservation({
      id: "res-pending",
      name: "Siti Aminah",
      whatsapp: "6281234567890",
      status: "PENDING",
      eventDate: date("01"),
    });
    await seedReservation({
      id: "res-suspended",
      name: "Budi Santoso",
      whatsapp: "6281311112222",
      status: "DITANGGUHKAN",
      eventDate: date("02"),
    });
    await seedReservation({
      id: "res-accepted-1",
      name: "Rina Wati",
      whatsapp: "6281355556666",
      status: "DITERIMA",
      eventDate: date("10"),
      perluPemeriksaanAdmin: true,
      bookingNumber: "HADCC-2026-0001",
    });
    await seedReservation({
      id: "res-accepted-2",
      name: "Dewi Lestari",
      whatsapp: "6281377778888",
      status: "DITERIMA",
      eventDate: date("05"),
      bookingNumber: "HADCC-2026-0002",
    });
    await seedReservation({
      id: "res-cancelled",
      name: "Agus Salim",
      whatsapp: "6281399990000",
      status: "DIBATALKAN",
      eventDate: date("03"),
    });
    await seedReservation({
      id: "res-auto",
      name: "Maya Sari",
      whatsapp: "6281212121212",
      status: "AUTO_CANCELLED",
      eventDate: date("04"),
    });
    await seedReservation({
      id: "res-finished",
      name: "Joko Susilo",
      whatsapp: "6281222223333",
      status: "SELESAI",
      eventDate: date("06"),
    });
    await seedReservation({
      id: "res-next-month",
      name: "Lina Marlina",
      whatsapp: "6281244445555",
      status: "DITERIMA",
      eventDate: `${nextMonth}-05`,
      bookingNumber: "HADCC-2026-0003",
    });

    await db.insert(dateLock).values([
      {
        date: date("08"),
        kind: "SETUP",
        reservationId: "res-accepted-1",
      },
      {
        date: date("09"),
        kind: "SETUP",
        reservationId: "res-accepted-1",
      },
      {
        date: date("04"),
        kind: "SETUP",
        reservationId: "res-accepted-2",
      },
    ]);

    const dashboard = await getDashboardData(month);

    expect(dashboard.month).toBe(month);
    expect(dashboard.activeCount).toBe(4);
    expect(dashboard.statusCards).toEqual({
      pending: 1,
      suspended: 1,
      accepted: 2,
      cancelled: 2,
    });

    expect(dashboard.agenda.map((row) => row.id)).toEqual([
      "res-accepted-2",
      "res-accepted-1",
    ]);
    expect(dashboard.agenda[0]?.setupDates).toEqual([date("04")]);
    expect(dashboard.agenda[1]?.setupDates).toEqual([date("08"), date("09")]);

    const followUps = new Map(
      dashboard.followUps.map((row) => [row.id, row]),
    );
    expect([...followUps.keys()].sort()).toEqual([
      "res-accepted-1",
      "res-pending",
    ]);
    expect(followUps.get("res-pending")?.reasons).toEqual(["PENDING"]);
    expect(followUps.get("res-accepted-1")?.reasons).toEqual([
      "PERLU_PEMERIKSAAN",
    ]);

    expect(dashboard.recentReservations.map((row) => row.id)).toEqual([
      "res-accepted-1",
      "res-finished",
      "res-accepted-2",
      "res-auto",
      "res-cancelled",
    ]);
  });

  it("membatasi ringkasan pada bulan tanggal acara yang dipilih", async () => {
    await seedPackage();

    const today = todayInJakarta();
    const month = addDays(today, 35).slice(0, 7);
    const nextMonth = nextMonthOf(month);

    await seedReservation({
      id: "res-current",
      name: "Siti Aminah",
      whatsapp: "6281234567890",
      status: "PENDING",
      eventDate: `${month}-10`,
    });
    await seedReservation({
      id: "res-next",
      name: "Budi Santoso",
      whatsapp: "6281311112222",
      status: "DITERIMA",
      eventDate: `${nextMonth}-10`,
      bookingNumber: "HADCC-2026-0001",
    });
    await db
      .update(reservation)
      .set({ createdAt: new Date(`${nextMonth}-01T03:00:00Z`) })
      .where(eq(reservation.id, "res-current"));

    const currentMonth = await getDashboardData(month);
    expect(currentMonth.activeCount).toBe(1);
    expect(currentMonth.statusCards).toEqual({
      pending: 1,
      suspended: 0,
      accepted: 0,
      cancelled: 0,
    });
    expect(currentMonth.agenda).toHaveLength(0);
    expect(currentMonth.recentReservations.map((row) => row.id)).toEqual([
      "res-current",
    ]);

    const next = await getDashboardData(nextMonth);
    expect(next.activeCount).toBe(1);
    expect(next.statusCards).toEqual({
      pending: 0,
      suspended: 0,
      accepted: 1,
      cancelled: 0,
    });
    expect(next.agenda.map((row) => row.id)).toEqual(["res-next"]);
    expect(next.recentReservations.map((row) => row.id)).toEqual(["res-next"]);
  });
});
