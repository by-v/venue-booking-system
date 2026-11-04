/**
 * Tipe domain ketersediaan (design AC-2). Modul ini tidak mengimpor dari
 * `src/app` (NFR-MNT-01).
 */

export const DATE_LOCK_KINDS = ["EVENT", "SETUP"] as const;

export type DateLockKind = (typeof DATE_LOCK_KINDS)[number];

export const DAY_STATUSES = ["TERSEDIA", "TERISI"] as const;

export type DayStatus = (typeof DAY_STATUSES)[number];

export interface DateLock {
  date: string;
  kind: DateLockKind;
}

export interface AvailabilityDay {
  date: string;
  status: DayStatus;
}
