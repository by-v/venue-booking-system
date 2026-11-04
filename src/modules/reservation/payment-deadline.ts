import { addDays } from "@/modules/availability/dates";

import type { PaymentStatus } from "./types";

/**
 * Batas pelunasan H-14 (BR-08). Semua perhitungan memakai string tanggal
 * `YYYY-MM-DD` dan tidak menyentuh database.
 */

export const PAYMENT_DEADLINE_DAYS = 14;

/** Tanggal acara dikurangi 14 hari kalender. */
export function paymentDueDate(eventDate: string): string {
  return addDays(eventDate, -PAYMENT_DEADLINE_DAYS);
}

/**
 * Batas pelunasan yang berlaku: override admin bila ada, jika tidak default
 * H-14 dari tanggal acara. Nilai ini stabil dan tidak bergeser seiring waktu;
 * batas pengganti booking mendadak disimpan sebagai override saat konfirmasi
 * atau reschedule.
 */
export function resolvePaymentDueDate(
  eventDate: string,
  override: string | null,
): string {
  return override ?? paymentDueDate(eventDate);
}

/**
 * Batas pengganti untuk booking mendadak: `min(tanggal acara, hari ini + 3)`.
 * Dipakai saat konfirmasi/reschedule, bukan saat membaca data.
 */
export function shortNoticePaymentDueDate(
  eventDate: string,
  today: string,
): string {
  const shortNoticeDeadline = addDays(today, 3);
  return eventDate < shortNoticeDeadline ? eventDate : shortNoticeDeadline;
}

export interface PaymentOverdueInput {
  eventDate: string;
  paymentStatus: PaymentStatus;
  today: string;
  paymentDueDateOverride?: string | null;
}

/**
 * Terlambat mulai hari setelah batas. Reservasi LUNAS tidak pernah ditandai
 * terlambat, dan batas pada hari yang sama masih tepat waktu.
 */
export function isPaymentOverdue({
  eventDate,
  paymentStatus,
  today,
  paymentDueDateOverride = null,
}: PaymentOverdueInput): boolean {
  return (
    paymentStatus !== "LUNAS" &&
    today > resolvePaymentDueDate(eventDate, paymentDueDateOverride)
  );
}

