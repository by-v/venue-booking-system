import { z } from "zod";

import { GALLERY_CATEGORIES } from "@/modules/venue/types";

import { normalizeWhatsApp } from "./phone";
import { CANCELLATION_REASON_CODES } from "./types";

/**
 * Skema input form publik dan catatan admin (design RS-3). Dipakai route
 * handler dan Server Action sehingga validasi sama di server.
 */

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const reservationSubmissionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama lengkap minimal 2 karakter")
    .max(100, "Nama lengkap maksimal 100 karakter"),
  whatsapp: z
    .string()
    .trim()
    .min(1, "Nomor WhatsApp wajib diisi")
    .transform((value, ctx) => {
      const normalized = normalizeWhatsApp(value);
      if (!normalized) {
        ctx.addIssue({
          code: "custom",
          message: "Nomor WhatsApp tidak valid",
        });
        return z.NEVER;
      }
      return normalized;
    }),
  address: z
    .string()
    .trim()
    .min(5, "Alamat minimal 5 karakter")
    .max(200, "Alamat maksimal 200 karakter"),
  eventType: z.enum(GALLERY_CATEGORIES, {
    message: "Jenis acara harus salah satu pilihan",
  }),
  packageId: z.string().trim().min(1, "Paket wajib dipilih"),
  eventDate: z
    .string()
    .trim()
    .regex(DATE_PATTERN, "Tanggal harus berformat YYYY-MM-DD")
    .refine(isRealDate, "Tanggal tidak valid"),
  notes: z
    .string()
    .trim()
    .max(1000, "Catatan maksimal 1000 karakter")
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export const adminReservationInputSchema = reservationSubmissionSchema.extend({
  accept: z.boolean().default(false),
});

export const followUpNoteSchema = z.object({
  reservationId: z.string().trim().min(1, "Reservasi wajib dipilih"),
  note: z
    .string()
    .trim()
    .min(1, "Catatan wajib diisi")
    .max(1000, "Catatan maksimal 1000 karakter"),
});

export const setupNoteInputSchema = z.object({
  reservationId: z.string().trim().min(1, "Reservasi wajib dipilih"),
  note: z
    .string()
    .trim()
    .min(1, "Catatan setup wajib diisi")
    .max(1000, "Catatan setup maksimal 1000 karakter"),
});

const MAX_RUPIAH = 2_147_483_647;
const MAX_REASON_LENGTH = 1000;

const rupiahAmount = z.coerce
  .number()
  .int("Nominal harus bilangan bulat rupiah")
  .gt(0, "Nominal harus lebih dari 0")
  .max(MAX_RUPIAH, "Nominal melebihi batas yang didukung");

const reasonText = z
  .string()
  .trim()
  .min(1, "Alasan wajib diisi")
  .max(MAX_REASON_LENGTH, "Alasan maksimal 1000 karakter");

export const reservationItemInputSchema = z.object({
  reservationId: z.string().trim().min(1, "Reservasi wajib dipilih"),
  description: z
    .string()
    .trim()
    .min(1, "Deskripsi item wajib diisi")
    .max(200, "Deskripsi item maksimal 200 karakter"),
  amountRupiah: rupiahAmount,
});

export const paymentActionSchema = z.object({
  reservationId: z.string().trim().min(1, "Reservasi wajib dipilih"),
});

export const reservationSuspensionSchema = z.object({
  reservationId: z.string().trim().min(1, "Reservasi wajib dipilih"),
  reason: reasonText,
});

export const reservationConfirmationSchema = z.object({
  reservationId: z.string().trim().min(1, "Reservasi wajib dipilih"),
});

export const reservationCompletionSchema = z.object({
  reservationId: z.string().trim().min(1, "Reservasi wajib dipilih"),
});

export const reservationRescheduleSchema = z.object({
  reservationId: z.string().trim().min(1, "Reservasi wajib dipilih"),
  newEventDate: z
    .string()
    .trim()
    .regex(DATE_PATTERN, "Tanggal harus berformat YYYY-MM-DD")
    .refine(isRealDate, "Tanggal tidak valid"),
});

export const acceptedReservationCancellationSchema = z.object({
  reservationId: z.string().trim().min(1, "Reservasi wajib dipilih"),
  reason: reasonText,
  reasonCode: z.literal("MUNDUR_CUSTOMER", {
    message: "Pembatalan ini hanya untuk pihak customer",
  }),
});

/**
 * Schema untuk pembatalan reservasi karena pelunasan terlambat.
 * Alasan wajib diisi dan keputusan DP harus dipilih (hangus atau tidak).
 */
export const latePaymentCancellationSchema = z.object({
  reservationId: z.string().trim().min(1, "Reservasi wajib dipilih"),
  reason: z
    .string()
    .trim()
    .min(1, "Alasan pembatalan wajib diisi")
    .max(1000, "Alasan pembatalan maksimal 1000 karakter"),
  dpDecision: z.enum(["HANGUS", "TIDAK_HANGUS"], {
    message: "Keputusan DP wajib dipilih",
  }),
});

/**
 * Schema untuk update batas pelunasan manual oleh admin.
 */
export const paymentDueDateUpdateSchema = z.object({
  reservationId: z.string().trim().min(1, "Reservasi wajib dipilih"),
  paymentDueDate: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z
      .string()
      .trim()
      .regex(DATE_PATTERN, "Tanggal harus berformat YYYY-MM-DD")
      .refine(isRealDate, "Tanggal tidak valid")
      .nullable(),
  ),
});

/** Field edit opsional: string kosong dan null dianggap tidak diisi. */
function optionalText() {
  return z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  );
}

/**
 * Schema untuk update data reservasi oleh admin.
 */
export const reservationDataUpdateSchema = z.object({
  reservationId: z.string().trim().min(1, "Reservasi wajib dipilih"),
  name: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z
      .string()
      .trim()
      .min(2, "Nama lengkap minimal 2 karakter")
      .max(100, "Nama lengkap maksimal 100 karakter")
      .optional(),
  ),
  whatsapp: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z
      .string()
      .trim()
      .optional()
      .transform((value, ctx) => {
        if (value === undefined) {
          return undefined;
        }
        const normalized = normalizeWhatsApp(value);
        if (!normalized) {
          ctx.addIssue({
            code: "custom",
            message: "Nomor WhatsApp tidak valid",
          });
          return z.NEVER;
        }
        return normalized;
      }),
  ),
  address: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z
      .string()
      .trim()
      .min(10, "Alamat minimal 10 karakter")
      .max(200, "Alamat maksimal 200 karakter")
      .optional(),
  ),
  eventType: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(GALLERY_CATEGORIES).optional(),
  ),
  packageId: optionalText(),
  eventDate: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z
      .string()
      .trim()
      .regex(DATE_PATTERN, "Tanggal harus berformat YYYY-MM-DD")
      .refine(isRealDate, "Tanggal tidak valid")
      .optional(),
  ),
  notes: z.preprocess(
    (value) => (value === null ? undefined : value),
    z.string().trim().max(1000).optional(),
  ),
});

export const reservationCancellationSchema = z.object({
  reservationId: z.string().trim().min(1, "Reservasi wajib dipilih"),
  reason: reasonText,
  reasonCode: z.enum(CANCELLATION_REASON_CODES, {
    message: "Kode alasan pembatalan tidak valid",
  }),
});

export type ReservationSubmissionInput = z.infer<
  typeof reservationSubmissionSchema
>;
export type AdminReservationInput = z.infer<
  typeof adminReservationInputSchema
>;
export type FollowUpNoteInput = z.infer<typeof followUpNoteSchema>;
export type SetupNoteInput = z.infer<typeof setupNoteInputSchema>;
export type ReservationItemInput = z.infer<typeof reservationItemInputSchema>;
export type PaymentActionInput = z.infer<typeof paymentActionSchema>;
export type ReservationSuspensionInput = z.infer<
  typeof reservationSuspensionSchema
>;
export type ReservationConfirmationInput = z.infer<
  typeof reservationConfirmationSchema
>;
export type ReservationRescheduleInput = z.infer<
  typeof reservationRescheduleSchema
>;
export type ReservationCompletionInput = z.infer<
  typeof reservationCompletionSchema
>;
export type AcceptedReservationCancellationInput = z.infer<
  typeof acceptedReservationCancellationSchema
>;
export type LatePaymentCancellationInput = z.infer<
  typeof latePaymentCancellationSchema
>;
export type PaymentDueDateUpdateInput = z.infer<
  typeof paymentDueDateUpdateSchema
>;
export type ReservationDataUpdateInput = z.infer<
  typeof reservationDataUpdateSchema
>;
export type ReservationCancellationInput = z.infer<
  typeof reservationCancellationSchema
>;
