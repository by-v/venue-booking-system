import { and, between, eq, gte, inArray, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { dateLock } from "@/lib/db/date-lock-schema";
import { customer, reservation } from "@/lib/db/reservation-schema";
import { packageTable } from "@/lib/db/venue-schema";
import { addDays, toDateString, todayInJakarta } from "@/modules/availability/dates";

export interface MonthSummary {
  month: string; // YYYY-MM
  tersedia: number;
  pending: number;
  diterima: number;
  selesai: number;
  dibatalkan: number;
}

export interface CalendarEventEntry {
  kind: "EVENT";
  id: string;
  customerName: string;
  shortName: string;
  status: string;
  packageName: string;
  eventType: string;
  durationHours: number;
  bookingNumber: string | null;
  setupDates: string[];
}

export interface CalendarSetupEntry {
  kind: "SETUP";
  reservationId: string;
  customerName: string;
  shortName: string;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  inMonth: boolean;
  isToday: boolean;
  events: CalendarEventEntry[];
  setups: CalendarSetupEntry[];
}

export interface MonthCalendarStats {
  active: number;
  diterima: number;
  pending: number;
  ditangguhkan: number;
  dibatalkan: number;
  selesai: number;
}

export interface MonthCalendarGrid {
  month: string;
  today: string;
  days: CalendarDay[];
  stats: MonthCalendarStats;
}

interface MonthStatusRow {
  month: string;
  status: string;
  count: number;
}

interface CalendarReservationRow {
  id: string;
  eventDate: string;
  status: string;
  eventType: string;
  customerName: string | null;
  packageName: string | null;
  durationHours: number;
  bookingNumber: string | null;
}

function shortCustomerName(fullName: string): string {
  return fullName.split(" & ")[0]?.trim() || fullName;
}

function monthGridRange(month: string): { start: string; end: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, monthNumber - 1, 1));
  const leadingDays = (firstDay.getUTCDay() + 6) % 7;
  const start = addDays(toDateString(firstDay), -leadingDays);

  // Enam baris minggu agar tinggi grid stabil di semua bulan.
  return { start, end: addDays(start, 41) };
}

/**
 * Mendapatkan summary reservasi per bulan dalam 1 tahun untuk kalender admin.
 */
export async function getYearCalendarSummary(year: number): Promise<MonthSummary[]> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const results = await db
    .select({
      month: sql<string>`to_char(${reservation.eventDate}, 'YYYY-MM')`,
      status: reservation.status,
      count: sql<number>`count(*)`,
    })
    .from(reservation)
    .where(
      and(
        between(reservation.eventDate, startDate, endDate),
        sql`${reservation.status} != 'AUTO_CANCELLED'`
      )
    )
    .groupBy(
      sql`to_char(${reservation.eventDate}, 'YYYY-MM')`,
      reservation.status
    ) as MonthStatusRow[];

  // Generate all 12 months
  const months: MonthSummary[] = [];
  for (let m = 1; m <= 12; m++) {
    const monthStr = `${year}-${String(m).padStart(2, "0")}`;
    const monthData = results.filter((r: MonthStatusRow) => r.month === monthStr);

    months.push({
      month: monthStr,
      tersedia: 30, // Simplified: assume 30 days available by default
      pending:
        (monthData.find((r: MonthStatusRow) => r.status === "PENDING")?.count ?? 0) +
        (monthData.find((r: MonthStatusRow) => r.status === "DITANGGUHKAN")?.count ?? 0),
      diterima: monthData.find((r: MonthStatusRow) => r.status === "DITERIMA")?.count || 0,
      selesai: monthData.find((r: MonthStatusRow) => r.status === "SELESAI")?.count || 0,
      dibatalkan: monthData.find((r: MonthStatusRow) => r.status === "DIBATALKAN")?.count || 0,
    });
  }

  return months;
}

/**
 * Mendapatkan grid kalender satu bulan (termasuk tanggal bulan tetangga),
 * event per hari, tanggal setup, dan statistik status.
 */
export async function getMonthCalendarGrid(
  month: string,
  today: string = todayInJakarta()
): Promise<MonthCalendarGrid> {
  const { start, end } = monthGridRange(month);

  const reservationRows = (await db
    .select({
      id: reservation.id,
      eventDate: reservation.eventDate,
      status: reservation.status,
      eventType: reservation.eventType,
      customerName: customer.name,
      packageName: packageTable.name,
      durationHours: reservation.packageDurationHours,
      bookingNumber: reservation.bookingNumber,
    })
    .from(reservation)
    .leftJoin(customer, eq(reservation.customerId, customer.id))
    .leftJoin(packageTable, eq(reservation.packageId, packageTable.id))
    .where(
      and(
        between(reservation.eventDate, start, end),
        ne(reservation.status, "AUTO_CANCELLED")
      )
    )) as CalendarReservationRow[];

  const eventsById = new Map<string, CalendarEventEntry>();
  const eventsByDate = new Map<string, CalendarEventEntry[]>();

  for (const row of reservationRows) {
    const fullName = row.customerName || "Customer";
    const entry: CalendarEventEntry = {
      kind: "EVENT",
      id: row.id,
      customerName: fullName,
      shortName: shortCustomerName(fullName),
      status: row.status,
      packageName: row.packageName || "Paket",
      eventType: row.eventType || "LAINNYA",
      durationHours: row.durationHours,
      bookingNumber: row.bookingNumber,
      setupDates: [],
    };

    eventsById.set(row.id, entry);
    const existing = eventsByDate.get(row.eventDate) ?? [];
    existing.push(entry);
    eventsByDate.set(row.eventDate, existing);
  }

  // Tanggal setup diambil dari date_lock agar hanya kunci nyata yang tampil.
  const setupRows =
    eventsById.size > 0
      ? await db
          .select({
            date: dateLock.date,
            reservationId: dateLock.reservationId,
            customerName: customer.name,
          })
          .from(dateLock)
          .innerJoin(reservation, eq(dateLock.reservationId, reservation.id))
          .leftJoin(customer, eq(reservation.customerId, customer.id))
          .where(
            and(
              eq(dateLock.kind, "SETUP"),
              inArray(dateLock.reservationId, [...eventsById.keys()]),
              ne(reservation.status, "AUTO_CANCELLED")
            )
          )
      : [];

  const setupsByDate = new Map<string, CalendarSetupEntry[]>();

  for (const row of setupRows) {
    if (!row.reservationId) continue;

    const event = eventsById.get(row.reservationId);
    if (event) {
      event.setupDates.push(row.date);
    }

    if (row.date < start || row.date > end) continue;

    const fullName = row.customerName || event?.customerName || "Customer";
    const entries = setupsByDate.get(row.date) ?? [];

    if (!entries.some((entry) => entry.reservationId === row.reservationId)) {
      entries.push({
        kind: "SETUP",
        reservationId: row.reservationId,
        customerName: fullName,
        shortName: shortCustomerName(fullName),
      });
    }

    setupsByDate.set(row.date, entries);
  }

  for (const event of eventsById.values()) {
    event.setupDates.sort();
  }

  const days: CalendarDay[] = [];
  const stats: MonthCalendarStats = {
    active: 0,
    diterima: 0,
    pending: 0,
    ditangguhkan: 0,
    dibatalkan: 0,
    selesai: 0,
  };

  for (let index = 0; index < 42; index += 1) {
    const date = addDays(start, index);
    const events = eventsByDate.get(date) ?? [];
    const inMonth = date.startsWith(month);

    if (inMonth) {
      for (const event of events) {
        if (event.status === "DITERIMA") stats.diterima += 1;
        else if (event.status === "PENDING") stats.pending += 1;
        else if (event.status === "DITANGGUHKAN") stats.ditangguhkan += 1;
        else if (event.status === "DIBATALKAN") stats.dibatalkan += 1;
        else if (event.status === "SELESAI") stats.selesai += 1;
      }
    }

    days.push({
      date,
      inMonth,
      isToday: date === today,
      events,
      setups: setupsByDate.get(date) ?? [],
    });
  }

  stats.active = stats.diterima + stats.pending + stats.ditangguhkan;

  return { month, today, days, stats };
}

/**
 * Mendapatkan detail lengkap reservasi untuk tanggal tertentu.
 */
export async function getDateReservations(date: string) {
  return await db
    .select({
      id: reservation.id,
      status: reservation.status,
      eventDate: reservation.eventDate,
      eventType: reservation.eventType,
      createdAt: reservation.createdAt,
      customerName: customer.name,
      packageName: packageTable.name,
    })
    .from(reservation)
    .leftJoin(customer, eq(reservation.customerId, customer.id))
    .leftJoin(packageTable, eq(reservation.packageId, packageTable.id))
    .where(
      and(
        eq(reservation.eventDate, date),
        sql`${reservation.status} != 'AUTO_CANCELLED'`
      )
    )
    .orderBy(reservation.createdAt);
}

/**
 * Mendapatkan upcoming reservasi untuk section "Agenda berikutnya".
 */
export async function getUpcomingReservations(limit: number = 5) {
  const today = todayInJakarta();

  return await db
    .select({
      id: reservation.id,
      status: reservation.status,
      eventDate: reservation.eventDate,
      eventType: reservation.eventType,
      customerName: customer.name,
      packageName: packageTable.name,
    })
    .from(reservation)
    .leftJoin(customer, eq(reservation.customerId, customer.id))
    .leftJoin(packageTable, eq(reservation.packageId, packageTable.id))
    .where(
      and(
        gte(reservation.eventDate, today),
        sql`${reservation.status} IN ('DITERIMA', 'PENDING')`
      )
    )
    .orderBy(reservation.eventDate, reservation.createdAt)
    .limit(limit);
}
