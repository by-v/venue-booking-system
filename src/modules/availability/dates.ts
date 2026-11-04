/**
 * Perhitungan tanggal ketersediaan (design AC-2 dan AC-5). Semua fungsi di
 * sini murni, memakai string tanggal `YYYY-MM-DD`, dan tidak menyentuh
 * database. Aturan tanggal mengikuti WIB (Asia/Jakarta).
 */

import type { AvailabilityDay, DateLock, DateLockKind } from "./types";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateString(dateString: string): {
  year: number;
  month: number;
  day: number;
} {
  const match = DATE_PATTERN.exec(dateString);
  if (!match) {
    throw new Error(`Tanggal tidak valid: ${dateString}`);
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function utcDate(dateString: string): Date {
  const { year, month, day } = parseDateString(dateString);
  const value = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(value.getTime())) {
    throw new Error(`Tanggal tidak valid: ${dateString}`);
  }
  return value;
}

/** Ubah `Date` menjadi string tanggal UTC `YYYY-MM-DD`. */
export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Tambah/kurangi hari pada string tanggal tanpa terpengaruh zona waktu. */
export function addDays(dateString: string, amount: number): string {
  const value = utcDate(dateString);
  value.setUTCDate(value.getUTCDate() + amount);
  return toDateString(value);
}

/**
 * Tambah/kurangi bulan kalender pada string tanggal. Bila hari tidak ada pada
 * bulan tujuan, dipakai hari terakhir bulan tersebut (BR-17).
 */
export function addCalendarMonths(
  dateString: string,
  months: number,
): string {
  if (!Number.isInteger(months)) {
    throw new Error(`Jumlah bulan tidak valid: ${months}`);
  }

  const { year, month, day } = parseDateString(dateString);
  const monthIndex = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(monthIndex / 12);
  const targetMonth = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();

  return toDateString(
    new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay))),
  );
}

/**
 * Kurangi satu bulan kalender dari string tanggal. Bila hari tidak ada pada
 * bulan tujuan, dipakai hari terakhir bulan tersebut (BR-17).
 */
export function subtractOneCalendarMonth(dateString: string): string {
  return addCalendarMonths(dateString, -1);
}

/** Tanggal kalender WIB dari sebuah timestamp, format `YYYY-MM-DD`. */
export function dateInJakarta(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Tanggal hari ini menurut WIB, dalam format `YYYY-MM-DD`. */
export function todayInJakarta(now: Date = new Date()): string {
  return dateInJakarta(now);
}

export interface LockDatesInput {
  eventDate: string;
  setupDaysBefore: number;
  extraSetupDates?: string[];
}

/**
 * Tanggal yang harus dikunci untuk satu reservasi: tanggal acara (`EVENT`),
 * hari setup bawaan paket (`SETUP`), dan hari setup tambahan (`SETUP`).
 * Hasil terurut menaik dan unik; tanggal acara menang bila bertabrakan.
 */
export function lockDatesForEvent({
  eventDate,
  setupDaysBefore,
  extraSetupDates = [],
}: LockDatesInput): DateLock[] {
  const byDate = new Map<string, DateLockKind>();

  for (let offset = setupDaysBefore; offset >= 1; offset -= 1) {
    byDate.set(addDays(eventDate, -offset), "SETUP");
  }

  for (const extraDate of extraSetupDates) {
    if (!byDate.has(extraDate)) {
      byDate.set(extraDate, "SETUP");
    }
  }

  byDate.set(eventDate, "EVENT");

  return [...byDate.entries()]
    .map(([date, kind]) => ({ date, kind }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Apakah tanggal sudah lewat atau sama dengan hari ini (WIB, BR-26). */
export function isPastOrToday(date: string, today: string): boolean {
  return date <= today;
}

/** Apakah tanggal masih dapat diajukan, yaitu setelah hari ini (BR-26). */
export function isBookableDate(date: string, today: string): boolean {
  return !isPastOrToday(date, today);
}

/** Semua tanggal dalam bulan `YYYY-MM`, terurut menaik. */
export function datesInMonth(month: string): string[] {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    throw new Error(`Bulan tidak valid: ${month}`);
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const cursor = new Date(Date.UTC(year, monthIndex, 1));
  const dates: string[] = [];

  while (cursor.getUTCMonth() === monthIndex) {
    dates.push(toDateString(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export interface BuildAvailabilityInput {
  month: string;
  today: string;
  lockedDates: string[];
  setupDaysBefore: number;
}

/**
 * Status setiap tanggal pada satu bulan untuk paket terpilih. Tanggal
 * Terisi bila hari ini/sudah lewat atau bila salah satu tanggal pada rentang
 * `[tanggal − setupDaysBefore, tanggal]` terkunci (BR-18, BR-26).
 */
export function buildAvailability({
  month,
  today,
  lockedDates,
  setupDaysBefore,
}: BuildAvailabilityInput): AvailabilityDay[] {
  const locked = new Set(lockedDates);

  return datesInMonth(month).map((date) => {
    if (isPastOrToday(date, today)) {
      return { date, status: "TERISI" as const };
    }

    for (let offset = 0; offset <= setupDaysBefore; offset += 1) {
      if (locked.has(addDays(date, -offset))) {
        return { date, status: "TERISI" as const };
      }
    }

    return { date, status: "TERSEDIA" as const };
  });
}
