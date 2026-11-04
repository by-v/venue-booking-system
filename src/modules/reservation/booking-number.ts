import { todayInJakarta } from "@/modules/availability/dates";

/**
 * Nomor booking tahunan (design D2). Tahun memakai tahun konfirmasi WIB,
 * bukan tahun tanggal acara. Modul ini murni dan tidak menyentuh database.
 */

export function bookingNumberYear(now: Date = new Date()): string {
  return todayInJakarta(now).slice(0, 4);
}

export function formatBookingNumber(
  year: number | string,
  sequence: number,
): string {
  return `HADCC-${year}-${String(sequence).padStart(4, "0")}`;
}

/** Format nomor booking publik (BR-05/BR-11); sama dengan constraint database. */
export const BOOKING_NUMBER_PATTERN = /^HADCC-[0-9]{4}-[0-9]{4,}$/;

export function normalizeBookingNumber(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidBookingNumber(value: string): boolean {
  return BOOKING_NUMBER_PATTERN.test(normalizeBookingNumber(value));
}
