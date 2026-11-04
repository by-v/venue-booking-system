/**
 * Galat domain reservasi. Route handler dan Server Action memetakan kode ini
 * ke pesan generik; detail database tidak pernah keluar ke customer.
 */

export const RESERVATION_ERROR_CODES = [
  "PACKAGE_UNAVAILABLE",
  "DATE_NOT_BOOKABLE",
  "RESERVATION_NOT_FOUND",
  "INVALID_STATE",
  "DP_BELOW_MINIMUM",
  "DATE_CONFLICT",
  "PAYMENT_NOT_FOUND",
  "PAYMENT_EXCEEDS_TOTAL",
  "REASON_REQUIRED",
  "INVALID_REASON_CODE",
  "INVALID_AMOUNT",
  "INVALID_DESCRIPTION",
  "INVALID_SETUP_NOTE",
  "RESCHEDULE_LIMIT_REACHED",
  "RESCHEDULE_DEADLINE_PASSED",
  "COMPLETION_NOT_ALLOWED",
  "EVENT_DATE_NOT_PASSED",
  "CUSTOMER_WHATSAPP_TAKEN",
  "TOTAL_BELOW_VERIFIED_PAYMENT",
  "INVALID_PAYMENT_DUE_DATE",
  "PAYMENT_DEADLINE_NOT_PASSED",
  "PAYMENT_ALREADY_SETTLED",
  "INVALID_CUSTOMER_NAME",
  "INVALID_EVENT_DATE",
  "INVALID_ADDRESS",
  "INVALID_EVENT_TYPE",
  "PACKAGE_NOT_FOUND",
] as const;

export type ReservationErrorCode = (typeof RESERVATION_ERROR_CODES)[number];

export class ReservationError extends Error {
  constructor(
    public readonly code: ReservationErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "ReservationError";
  }
}
