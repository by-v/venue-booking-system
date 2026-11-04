import { subtractOneCalendarMonth } from "@/modules/availability/dates";

import type { ReservationStatus } from "./types";

/**
 * Aturan reschedule (BR-15). Fungsi di sini murni dan tidak menyentuh
 * database; tanggal memakai format `YYYY-MM-DD` dan konteks WIB.
 */

export function rescheduleDeadline(eventDate: string): string {
  return subtractOneCalendarMonth(eventDate);
}

export interface RescheduleDeadlineInput {
  eventDate: string;
  today: string;
}

export function isRescheduleDeadlinePassed({
  eventDate,
  today,
}: RescheduleDeadlineInput): boolean {
  return today > rescheduleDeadline(eventDate);
}

export interface RescheduleEligibilityInput {
  status: ReservationStatus;
  rescheduleCount: number;
  eventDate: string;
  today: string;
}

export function canReschedule({
  status,
  rescheduleCount,
  eventDate,
  today,
}: RescheduleEligibilityInput): boolean {
  return (
    status === "DITERIMA" &&
    rescheduleCount < 1 &&
    !isRescheduleDeadlinePassed({ eventDate, today })
  );
}
