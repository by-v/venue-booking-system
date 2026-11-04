import { and, asc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { dateLock, packageTable } from "@/lib/db/schema";
import {
  addDays,
  buildAvailability,
  datesInMonth,
  todayInJakarta,
} from "./dates";
import type { AvailabilityDay, DateLock, DateLockKind } from "./types";

/**
 * Akses data ketersediaan (design AC-2). Query publik hanya mengembalikan
 * tanggal dan status; `kind`, `reservation_id`, dan `setup_days_before`
 * tidak pernah keluar dari modul ini.
 */

export async function listDateLocksInRange(
  start: string,
  end: string,
): Promise<DateLock[]> {
  const rows = await db
    .select({ date: dateLock.date, kind: dateLock.kind })
    .from(dateLock)
    .where(and(gte(dateLock.date, start), lte(dateLock.date, end)))
    .orderBy(asc(dateLock.date));

  return rows.map((row) => ({
    date: row.date,
    kind: row.kind as DateLockKind,
  }));
}

export interface PublicAvailabilityInput {
  packageId: string;
  month: string;
  today?: string;
}

/**
 * Ketersediaan satu bulan untuk paket aktif terpilih. Bila paket tidak ada
 * atau nonaktif, hasilnya kosong (tidak ada tanggal yang dapat dipilih).
 */
export async function getPublicAvailability({
  packageId,
  month,
  today = todayInJakarta(),
}: PublicAvailabilityInput): Promise<AvailabilityDay[]> {
  const packages = await db
    .select({ setupDaysBefore: packageTable.setupDaysBefore })
    .from(packageTable)
    .where(and(eq(packageTable.id, packageId), eq(packageTable.active, true)))
    .limit(1);

  const selected = packages[0];
  if (!selected) {
    return [];
  }

  const monthDates = datesInMonth(month);
  const monthStart = monthDates[0];
  const monthEnd = monthDates[monthDates.length - 1];
  if (!monthStart || !monthEnd) {
    return [];
  }

  const locks = await listDateLocksInRange(
    addDays(monthStart, -selected.setupDaysBefore),
    monthEnd,
  );

  return buildAvailability({
    month,
    today,
    lockedDates: locks.map((lock) => lock.date),
    setupDaysBefore: selected.setupDaysBefore,
  });
}
