import { db } from "@/lib/db";
import { reservation, customer } from "@/lib/db/reservation-schema";
import { packageTable } from "@/lib/db/venue-schema";
import { and, between, eq, sql, gte, desc } from "drizzle-orm";

export interface MonthSummary {
  month: string; // YYYY-MM
  tersedia: number;
  pending: number;
  diterima: number;
  selesai: number;
  dibatalkan: number;
}

export interface EventInDay {
  id: string;
  customerName: string;
  shortName: string;
  status: string;
  packageName: string;
  eventType: string;
}

export interface DayDetail {
  date: string; // YYYY-MM-DD
  status: "TERSEDIA" | "PENDING" | "DITERIMA" | "SELESAI" | "DIBATALKAN";
  reservationCount: number;
  events?: EventInDay[];
}

interface MonthStatusRow {
  month: string;
  status: string;
  count: number;
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
    const monthStr = `${year}-${String(m).padStart(2, '0')}`;
    const monthData = results.filter((r: MonthStatusRow) => r.month === monthStr);

    months.push({
      month: monthStr,
      tersedia: 30, // Simplified: assume 30 days available by default
      pending: monthData.find((r: MonthStatusRow) => r.status === 'PENDING' || r.status === 'DITANGGUHKAN')?.count || 0,
      diterima: monthData.find((r: MonthStatusRow) => r.status === 'DITERIMA')?.count || 0,
      selesai: monthData.find((r: MonthStatusRow) => r.status === 'SELESAI')?.count || 0,
      dibatalkan: monthData.find((r: MonthStatusRow) => r.status === 'DIBATALKAN')?.count || 0,
    });
  }

  return months;
}

/**
 * Mendapatkan detail reservasi per tanggal dalam 1 bulan untuk kalender admin.
 * Include customer name dan package name dengan JOIN.
 */
export async function getMonthCalendarDetail(month: string): Promise<DayDetail[]> {
  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  
  const startDate = `${month}-01`;
  const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`;

  const reservations = await db
    .select({
      eventDate: reservation.eventDate,
      id: reservation.id,
      status: reservation.status,
      eventType: reservation.eventType,
      customerId: reservation.customerId,
      packageId: reservation.packageId,
      customerName: customer.name,
      packageName: packageTable.name,
    })
    .from(reservation)
    .leftJoin(customer, eq(reservation.customerId, customer.id))
    .leftJoin(packageTable, eq(reservation.packageId, packageTable.id))
    .where(
      and(
        between(reservation.eventDate, startDate, endDate),
        sql`${reservation.status} != 'AUTO_CANCELLED'`
      )
    );

  // Generate all days in month
  const days: DayDetail[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`;
    const dayReservations = reservations.filter(r => r.eventDate === dateStr);
    
    let status: DayDetail['status'] = 'TERSEDIA';
    const events: EventInDay[] = [];

    if (dayReservations.length > 0) {
      // Priority: DITERIMA > PENDING > SELESAI > DIBATALKAN
      const hasAccepted = dayReservations.some(r => r.status === 'DITERIMA');
      const hasPending = dayReservations.some(r => r.status === 'PENDING' || r.status === 'DITANGGUHKAN');
      const hasCompleted = dayReservations.some(r => r.status === 'SELESAI');
      const hasCancelled = dayReservations.some(r => r.status === 'DIBATALKAN');

      if (hasAccepted) status = 'DITERIMA';
      else if (hasPending) status = 'PENDING';
      else if (hasCompleted) status = 'SELESAI';
      else if (hasCancelled) status = 'DIBATALKAN';

      // Build events array
      dayReservations.forEach(r => {
        const fullName = r.customerName || 'Customer';
        const shortName = fullName.split(' & ')[0] || fullName.split(' ')[0];
        
        events.push({
          id: r.id,
          customerName: fullName,
          shortName: shortName,
          status: r.status,
          packageName: r.packageName || 'Paket',
          eventType: r.eventType || 'LAINNYA',
        });
      });
    }

    days.push({
      date: dateStr,
      status,
      reservationCount: dayReservations.length,
      events: events.length > 0 ? events : undefined,
    });
  }

  return days;
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
  const today = new Date().toISOString().split('T')[0];
  
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


