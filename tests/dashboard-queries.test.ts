import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  customer,
  dateLock,
  packageTable,
  payment,
  reservation,
  reservationItem,
} from "@/lib/db/schema";
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

const YEAR = 2031;
const MONTH = `${YEAR}-05`;
const NEXT_MONTH = `${YEAR}-07`;
const NEXT_YEAR = `${YEAR + 1}`;

describe("query dashboard", () => {
  it("menghitung statistik, agenda, tindak lanjut, dan reservasi terbaru per tahun", async () => {
    await seedPackage();

    const date = (day: string) => `${MONTH}-${day}`;

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
      bookingNumber: "HADCC-2031-0001",
    });
    await seedReservation({
      id: "res-accepted-2",
      name: "Dewi Lestari",
      whatsapp: "6281377778888",
      status: "DITERIMA",
      eventDate: date("05"),
      bookingNumber: "HADCC-2031-0002",
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
      eventDate: `${NEXT_MONTH}-05`,
      bookingNumber: "HADCC-2031-0003",
    });
    await seedReservation({
      id: "res-next-year",
      name: "Hendra Wijaya",
      whatsapp: "6281266667777",
      status: "DITERIMA",
      eventDate: `${NEXT_YEAR}-05-05`,
      bookingNumber: "HADCC-2031-0004",
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

    await db.insert(reservationItem).values({
      id: "item-accepted-1",
      reservationId: "res-accepted-1",
      description: "Dekorasi tambahan",
      amountRupiah: 2_000_000,
    });
    await db.insert(payment).values({
      id: "payment-accepted-1",
      reservationId: "res-accepted-1",
      amountRupiah: 5_000_000,
      verificationStatus: "TERVERIFIKASI",
    });

    const dashboard = await getDashboardData(YEAR, MONTH);

    expect(dashboard.year).toBe(YEAR);
    expect(dashboard.agendaMonth).toBe(MONTH);
    expect(dashboard.availableYears).toContain(YEAR);
    expect(dashboard.availableYears).toContain(YEAR + 1);

    expect(dashboard.stats).toMatchObject({
      total: 8,
      pending: 1,
      suspended: 1,
      accepted: 3,
      completed: 1,
      cancelled: 2,
    });
    expect(dashboard.stats.acceptedValueRupiah).toBe(82_000_000);
    expect(dashboard.stats.verifiedPaymentRupiah).toBe(5_000_000);
    expect(dashboard.stats.remainingRupiah).toBe(77_000_000);
    expect(dashboard.stats.conversionPercent).toBe(50);
    expect(dashboard.stats.averageValueRupiah).toBe(20_500_000);

    expect(dashboard.agenda.map((row) => row.id)).toEqual([
      "res-accepted-2",
      "res-finished",
      "res-accepted-1",
    ]);
    expect(dashboard.agenda[0]?.status).toBe("DITERIMA");
    expect(dashboard.agenda[1]?.status).toBe("SELESAI");
    expect(dashboard.agenda[0]?.setupDates).toEqual([date("04")]);
    expect(dashboard.agenda[2]?.setupDates).toEqual([date("08"), date("09")]);

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
      "res-next-month",
      "res-accepted-1",
      "res-finished",
      "res-accepted-2",
      "res-auto",
    ]);
  });

  it("menampilkan semua agenda setahun saat bulan tidak dipilih", async () => {
    await seedPackage();

    await seedReservation({
      id: "res-month-one",
      name: "Siti Aminah",
      whatsapp: "6281234567890",
      status: "DITERIMA",
      eventDate: `${YEAR}-02-10`,
      bookingNumber: "HADCC-2031-1001",
    });
    await seedReservation({
      id: "res-month-two",
      name: "Budi Santoso",
      whatsapp: "6281311112222",
      status: "SELESAI",
      eventDate: `${YEAR}-08-10`,
    });
    await seedReservation({
      id: "res-other-year",
      name: "Hendra Wijaya",
      whatsapp: "6281266667777",
      status: "DITERIMA",
      eventDate: `${NEXT_YEAR}-02-10`,
      bookingNumber: "HADCC-2031-1002",
    });

    const dashboard = await getDashboardData(YEAR);

    expect(dashboard.agendaMonth).toBeNull();
    expect(dashboard.agenda.map((row) => row.id)).toEqual([
      "res-month-one",
      "res-month-two",
    ]);
    expect(dashboard.stats.total).toBe(2);
    expect(dashboard.stats.accepted).toBe(1);
    expect(dashboard.stats.completed).toBe(1);
    expect(dashboard.stats.conversionPercent).toBe(100);
  });

  it("mengabaikan bulan agenda yang bukan bagian dari tahun terpilih", async () => {
    const dashboard = await getDashboardData(YEAR, `${NEXT_YEAR}-02`);
    expect(dashboard.agendaMonth).toBeNull();
    expect(dashboard.agenda).toHaveLength(0);
  });
});
