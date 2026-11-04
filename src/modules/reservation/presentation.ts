import {
  GALLERY_CATEGORY_LABELS,
  type GalleryCategory,
} from "@/modules/venue/types";

import type { PaymentStatus, ReservationStatus } from "./types";

/** Label dan format bersama halaman publik (BR-05, BR-10, BR-32). */

export const GENERIC_STATUS_CHECK_ERROR =
  "Nomor booking tidak ditemukan atau tidak valid. Periksa kembali nomor booking Anda.";

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: "Menunggu",
  DITANGGUHKAN: "Ditangguhkan",
  DITERIMA: "Diterima",
  DIBATALKAN: "Dibatalkan",
  AUTO_CANCELLED: "Dibatalkan otomatis",
  SELESAI: "Selesai",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  BELUM_DP: "Belum DP",
  DP: "DP",
  LUNAS: "Lunas",
};

export function formatEventDate(date: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function formatPrintTimestamp(value: Date): string {
  const formatted = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(value);
  return `${formatted} WIB`;
}

export function eventTypeLabel(eventType: GalleryCategory): string {
  return GALLERY_CATEGORY_LABELS[eventType];
}
