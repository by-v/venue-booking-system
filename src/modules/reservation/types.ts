/**
 * Tipe domain reservasi (design RS-1/D9). Modul ini tidak mengimpor dari
 * `src/app` (NFR-MNT-01).
 */

import type { DateLock } from "@/modules/availability/types";
import type { GalleryCategory } from "@/modules/venue/types";

export type { PackageSummary } from "@/modules/venue/types";

export const CUSTOMER_STATUSES = ["CALON", "CLIENT"] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const RESERVATION_STATUSES = [
  "PENDING",
  "DITANGGUHKAN",
  "DITERIMA",
  "DIBATALKAN",
  "AUTO_CANCELLED",
  "SELESAI",
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const RESERVATION_SOURCES = ["FORM_PUBLIK", "INPUT_ADMIN"] as const;

export type ReservationSource = (typeof RESERVATION_SOURCES)[number];

export const ACTOR_TYPES = ["CUSTOMER", "ADMIN", "SYSTEM"] as const;

export type ActorType = (typeof ACTOR_TYPES)[number];

export const RESERVATION_ACTIVITY_TYPES = [
  "SUBMISSION",
  "FOLLOW_UP_NOTE",
  "STATUS_CHANGE",
  "ITEM_ADDED",
  "PAYMENT_RECORDED",
  "PAYMENT_STATUS_CHANGED",
  "DATA_UPDATED",
] as const;

export type ReservationActivityType =
  (typeof RESERVATION_ACTIVITY_TYPES)[number];

export const PAYMENT_VERIFICATION_STATUSES = ["TERVERIFIKASI"] as const;

export type PaymentVerificationStatus =
  (typeof PAYMENT_VERIFICATION_STATUSES)[number];

export const PAYMENT_STATUSES = ["BELUM_DP", "DP", "LUNAS"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const CANCELLATION_REASON_CODES = [
  "MUNDUR_CUSTOMER",
  "DITOLAK_VENUE",
] as const;

export type CancellationReasonCode =
  (typeof CANCELLATION_REASON_CODES)[number];

export const AUTOMATIC_REASON_CODES = [
  "INACTIVITY_3M",
  "EVENT_DATE_PASSED",
] as const;

export type AutomaticReasonCode = (typeof AUTOMATIC_REASON_CODES)[number];

export const STATUS_HISTORY_REASON_CODES = [
  ...CANCELLATION_REASON_CODES,
  "PELUNASAN_TERLAMBAT",
  ...AUTOMATIC_REASON_CODES,
] as const;

export type StatusHistoryReasonCode =
  (typeof STATUS_HISTORY_REASON_CODES)[number];

export interface ReservationItem {
  id: string;
  reservationId: string;
  description: string;
  amountRupiah: number;
  createdAt: Date;
}

export interface Payment {
  id: string;
  reservationId: string;
  amountRupiah: number;
  verificationStatus: PaymentVerificationStatus;
  recordedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SetupNote {
  id: string;
  reservationId: string;
  note: string;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReservationFinancials {
  packagePriceRupiah: number;
  itemTotalRupiah: number;
  totalRupiah: number;
  minimumDpRupiah: number;
  verifiedPaymentRupiah: number;
  remainingRupiah: number;
  paymentStatus: PaymentStatus;
}

export const RESERVATION_LIST_FILTERS = [
  "proses",
  "diterima",
  "dibatalkan",
  "semua",
] as const;

export type ReservationListFilter =
  (typeof RESERVATION_LIST_FILTERS)[number];

export interface ReservationListQuery {
  filter?: ReservationListFilter;
  search?: string;
  month?: string;
  year?: number;
}

export interface ReservationListItem {
  id: string;
  customerName: string;
  customerWhatsapp: string;
  eventDate: string;
  eventType: GalleryCategory;
  packageName: string;
  packagePriceRupiah: number;
  totalRupiah: number;
  verifiedPaymentRupiah: number;
  paymentStatus: PaymentStatus;
  status: ReservationStatus;
  source: ReservationSource;
  bookingNumber: string | null;
  createdAt: Date;
}

export interface ReservationActivityItem {
  id: string;
  type: ReservationActivityType;
  note: string | null;
  actorType: ActorType;
  isSubstantive: boolean;
  createdAt: Date;
}

export interface ReservationStatusHistoryItem {
  id: string;
  fromStatus: ReservationStatus | null;
  toStatus: ReservationStatus;
  reason: string | null;
  reasonCode: StatusHistoryReasonCode | null;
  actorType: ActorType;
  createdAt: Date;
}

export interface ReservationDetail {
  id: string;
  customer: {
    id: string;
    name: string;
    whatsapp: string;
  };
  packageId: string;
  packageName: string;
  packagePriceRupiah: number;
  packageDurationHours: number;
  packageSessionCount: number;
  eventDate: string;
  eventType: GalleryCategory;
  address: string;
  notes: string | null;
  status: ReservationStatus;
  paymentDueDate: string;
  paymentDueDateOverride: string | null;
  paymentOverdue: boolean;
  source: ReservationSource;
  bookingNumber: string | null;
  dpForfeited: boolean;
  perluPemeriksaanAdmin: boolean;
  rescheduleCount: number;
  setupNote: SetupNote | null;
  createdAt: Date;
  items: ReservationItem[];
  payments: Payment[];
  financials: ReservationFinancials;
  activities: ReservationActivityItem[];
  statusHistory: ReservationStatusHistoryItem[];
}

/**
 * Data reservasi yang boleh ditampilkan di halaman publik (design D1). Tidak
 * memuat ID internal, WhatsApp, alamat, catatan, aktivitas, atau riwayat.
 */
export interface PublicBookingProof {
  bookingNumber: string;
  maskedCustomerName: string;
  eventDate: string;
  eventType: GalleryCategory;
  packageName: string;
  packageDurationHours: number;
  packageSessionCount: number;
  packagePriceRupiah: number;
  facilities: string[];
  totalRupiah: number;
  minimumDpRupiah: number;
  verifiedPaymentRupiah: number;
  remainingRupiah: number;
  paymentStatus: PaymentStatus;
  status: ReservationStatus;
}

export interface ReservationConflict {
  id: string;
  customerName: string;
  customerWhatsapp: string;
  eventDate: string;
  status: ReservationStatus;
  verifiedPaymentRupiah: number;
  occupiedDates: DateLock[];
}

export interface ReservationConfirmationContext {
  lockDates: DateLock[];
  hasDateConflict: boolean;
  conflicts: ReservationConflict[];
}

export interface ReservationAgendaItem {
  id: string;
  customerName: string;
  customerWhatsapp: string;
  eventDate: string;
  eventType: GalleryCategory;
  packageName: string;
  status: ReservationStatus;
  setupDates: string[];
}

export const DASHBOARD_FOLLOW_UP_REASONS = [
  "PENDING",
  "PERLU_PEMERIKSAAN",
] as const;

export type DashboardFollowUpReason =
  (typeof DASHBOARD_FOLLOW_UP_REASONS)[number];

export interface DashboardFollowUpItem {
  id: string;
  customerName: string;
  customerWhatsapp: string;
  eventDate: string;
  packageName: string;
  status: ReservationStatus;
  reasons: DashboardFollowUpReason[];
}

export interface DashboardStats {
  total: number;
  pending: number;
  suspended: number;
  accepted: number;
  completed: number;
  cancelled: number;
  acceptedValueRupiah: number;
  verifiedPaymentRupiah: number;
  remainingRupiah: number;
  conversionPercent: number;
  averageValueRupiah: number;
}

export interface DashboardData {
  year: number;
  agendaMonth: string | null;
  availableYears: number[];
  stats: DashboardStats;
  agenda: ReservationAgendaItem[];
  followUps: DashboardFollowUpItem[];
  recentReservations: ReservationListItem[];
}
