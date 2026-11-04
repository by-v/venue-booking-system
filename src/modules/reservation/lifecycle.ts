import {
  addCalendarMonths,
  dateInJakarta,
} from "@/modules/availability/dates";

import type {
  AutomaticReasonCode,
  ReservationStatus,
} from "./types";

/**
 * Aturan kandidat lifecycle reservasi (BR-13, BR-17, BR-17a). Semua fungsi di
 * sini murni dan memakai tanggal kalender WIB berbentuk `YYYY-MM-DD`.
 */

export interface AutoCancellationCandidateInput {
  status: ReservationStatus;
  eventDate: string;
  createdAt: Date;
  lastSubstantiveActivityAt: Date | null;
  today: string;
}

export interface AutoCancellationCandidate {
  candidate: boolean;
  reasonCode: AutomaticReasonCode | null;
  inactivityDeadline: string | null;
}

export function inactivityDeadline({
  createdAt,
  lastSubstantiveActivityAt,
}: Pick<
  AutoCancellationCandidateInput,
  "createdAt" | "lastSubstantiveActivityAt"
>): string {
  const baseDate = lastSubstantiveActivityAt ?? createdAt;
  return addCalendarMonths(dateInJakarta(baseDate), 3);
}

export function evaluateAutoCancellationCandidate(
  input: AutoCancellationCandidateInput,
): AutoCancellationCandidate {
  if (input.status !== "PENDING" && input.status !== "DITANGGUHKAN") {
    return {
      candidate: false,
      reasonCode: null,
      inactivityDeadline: null,
    };
  }

  const deadline = inactivityDeadline(input);
  const eventDatePassed = input.eventDate < input.today;
  const inactivityReached = input.today >= deadline;

  if (eventDatePassed) {
    return {
      candidate: true,
      reasonCode: "EVENT_DATE_PASSED",
      inactivityDeadline: deadline,
    };
  }

  if (inactivityReached) {
    return {
      candidate: true,
      reasonCode: "INACTIVITY_3M",
      inactivityDeadline: deadline,
    };
  }

  return {
    candidate: false,
    reasonCode: null,
    inactivityDeadline: deadline,
  };
}

export interface ReservationCompletionInput {
  status: ReservationStatus;
  eventDate: string;
  today: string;
}

/** Reservasi hanya selesai pada hari kalender setelah tanggal acara. */
export function isReservationCompletionDue({
  status,
  eventDate,
  today,
}: ReservationCompletionInput): boolean {
  return status === "DITERIMA" && eventDate < today;
}
