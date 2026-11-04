import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";
import { packageTable } from "./venue-schema";

/**
 * Tabel domain reservasi (design RS-1). Nama kolom `snake_case` di database
 * dan `camelCase` di Drizzle, mengikuti pola `venue-schema.ts`.
 *
 * `date_lock.reservation_id` menunjuk reservasi setelah change
 * `reservation-confirmation`; kunci manual tetap boleh tanpa reservasi.
 */

const RESERVATION_STATUSES =
  "'PENDING','DITANGGUHKAN','DITERIMA','DIBATALKAN','AUTO_CANCELLED','SELESAI'";

const EVENT_TYPES =
  "'PERNIKAHAN','WALIMAH_RESEPSI','SEMINAR','KONSER','ACARA_MALAM','ACARA_OUTDOOR','LAINNYA'";

const ACTOR_TYPES = "'CUSTOMER','ADMIN','SYSTEM'";

const PAYMENT_VERIFICATION_STATUSES = "'TERVERIFIKASI'";

const STATUS_HISTORY_REASON_CODES =
  "'MUNDUR_CUSTOMER','DITOLAK_VENUE','PELUNASAN_TERLAMBAT','INACTIVITY_3M','EVENT_DATE_PASSED'";

const RESERVATION_ACTIVITY_TYPES =
  "'SUBMISSION','FOLLOW_UP_NOTE','STATUS_CHANGE','ITEM_ADDED','PAYMENT_RECORDED','PAYMENT_STATUS_CHANGED','DATA_UPDATED'";

const RESERVATION_SOURCES = "'FORM_PUBLIK','INPUT_ADMIN'";

// Satu customer per nomor WhatsApp (BR-25). Nomor disimpan ternormalisasi
// `62...` oleh modul reservasi.
export const customer = pgTable(
  "customer",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    whatsapp: text("whatsapp").notNull(),
    status: text("status").default("CALON").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("customer_whatsapp_unique").on(table.whatsapp),
    check("customer_status", sql`${table.status} in ('CALON','CLIENT')`),
  ],
);

// Snapshot paket dan harga (BR-29) melindungi pengajuan lama dari perubahan
// paket. PENDING tidak menulis date_lock (BR-22).
export const reservation = pgTable(
  "reservation",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "restrict" }),
    packageId: text("package_id")
      .notNull()
      .references(() => packageTable.id, { onDelete: "restrict" }),
    packageName: text("package_name").notNull(),
    packagePriceRupiah: integer("package_price_rupiah").notNull(),
    packageDurationHours: integer("package_duration_hours").notNull(),
    packageSessionCount: integer("package_session_count").notNull(),
    eventDate: date("event_date", { mode: "string" }).notNull(),
    paymentDueDateOverride: date("payment_due_date_override", {
      mode: "string",
    }),
    eventType: text("event_type").notNull(),
    address: text("address").notNull(),
    notes: text("notes"),
    status: text("status").default("PENDING").notNull(),
    source: text("source").default("FORM_PUBLIK").notNull(),
    bookingNumber: text("booking_number"),
    dpForfeited: boolean("dp_forfeited").default(false).notNull(),
    perluPemeriksaanAdmin: boolean("perlu_pemeriksaan_admin")
      .default(false)
      .notNull(),
    rescheduleCount: integer("reschedule_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    check("reservation_status", sql`${table.status} in (${sql.raw(RESERVATION_STATUSES)})`),
    check("reservation_source", sql`${table.source} in (${sql.raw(RESERVATION_SOURCES)})`),
    check("reservation_event_type", sql`${table.eventType} in (${sql.raw(EVENT_TYPES)})`),
    check("reservation_price_nonneg", sql`${table.packagePriceRupiah} >= 0`),
    check(
      "reservation_duration_positive",
      sql`${table.packageDurationHours} > 0`,
    ),
    check("reservation_sessions", sql`${table.packageSessionCount} >= 1`),
    unique("reservation_booking_number_unique").on(table.bookingNumber),
    check(
      "reservation_booking_number_format",
      sql`${table.bookingNumber} is null or ${table.bookingNumber} ~ '^HADCC-[0-9]{4}-[0-9]{4,}$'`,
    ),
    check(
      "reservation_booking_number_required",
      sql`${table.status} <> 'DITERIMA' or ${table.bookingNumber} is not null`,
    ),
    check(
      "reservation_dp_forfeited",
      sql`not ${table.dpForfeited} or ${table.status} = 'DIBATALKAN'`,
    ),
    check(
      "reservation_reschedule_count",
      sql`${table.rescheduleCount} between 0 and 1`,
    ),
    check(
      "reservation_payment_due_date_override",
      sql`${table.paymentDueDateOverride} is null or ${table.paymentDueDateOverride} <= ${table.eventDate}`,
    ),
  ],
);

// Riwayat reschedule (BR-15). Satu reservasi hanya boleh memiliki satu
// riwayat; unique reservation_id menegakkan batas itu di level database.
export const rescheduleHistory = pgTable(
  "reschedule_history",
  {
    id: text("id").primaryKey(),
    reservationId: text("reservation_id")
      .notNull()
      .references(() => reservation.id, { onDelete: "restrict" }),
    oldEventDate: date("old_event_date", { mode: "string" }).notNull(),
    newEventDate: date("new_event_date", { mode: "string" }).notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("reschedule_history_reservation_unique").on(table.reservationId),
    check(
      "reschedule_history_dates_differ",
      sql`${table.oldEventDate} <> ${table.newEventDate}`,
    ),
  ],
);

// Catatan setup internal (T-14, PROVISIONAL). Satu baris per reservasi;
// unique reservation_id menegakkan batas itu di level database.
export const setupNote = pgTable(
  "setup_note",
  {
    id: text("id").primaryKey(),
    reservationId: text("reservation_id")
      .notNull()
      .references(() => reservation.id, { onDelete: "restrict" }),
    note: text("note").notNull(),
    updatedByUserId: text("updated_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("setup_note_reservation_unique").on(table.reservationId),
    check(
      "setup_note_length",
      sql`char_length(${table.note}) between 1 and 1000 and btrim(${table.note}) <> ''`,
    ),
  ],
);

// Counter nomor booking per tahun konfirmasi WIB (BR-11, BR-19). Upsert
// atomik di transaksi konfirmasi memberi urutan yang aman terhadap race.
export const bookingCounter = pgTable(
  "booking_counter",
  {
    year: integer("year").primaryKey(),
    lastSequence: integer("last_sequence").default(0).notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    check(
      "booking_counter_year",
      sql`${table.year} between 2000 and 9999`,
    ),
    check("booking_counter_sequence", sql`${table.lastSequence} >= 0`),
  ],
);

// Riwayat perubahan status (BR-24). Pengajuan pertama mencatat
// (baru) -> PENDING dengan pelaku CUSTOMER (state machine T1).
export const reservationStatusHistory = pgTable(
  "reservation_status_history",
  {
    id: text("id").primaryKey(),
    reservationId: text("reservation_id")
      .notNull()
      .references(() => reservation.id, { onDelete: "restrict" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    reason: text("reason"),
    reasonCode: text("reason_code"),
    actorType: text("actor_type").notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    check(
      "reservation_status_history_from",
      sql`${table.fromStatus} is null or ${table.fromStatus} in (${sql.raw(RESERVATION_STATUSES)})`,
    ),
    check(
      "reservation_status_history_to",
      sql`${table.toStatus} in (${sql.raw(RESERVATION_STATUSES)})`,
    ),
    check(
      "reservation_status_history_actor",
      sql`${table.actorType} in (${sql.raw(ACTOR_TYPES)})`,
    ),
    check(
      "reservation_status_history_reason_code",
      sql`${table.reasonCode} is null or ${table.reasonCode} in (${sql.raw(STATUS_HISTORY_REASON_CODES)})`,
    ),
  ],
);

// Aktivitas substantif (BR-17a). Pengajuan, catatan tindak lanjut, perubahan
// status, item biaya, dan perubahan pembayaran termasuk aktivitas substantif.
export const reservationActivity = pgTable(
  "reservation_activity",
  {
    id: text("id").primaryKey(),
    reservationId: text("reservation_id")
      .notNull()
      .references(() => reservation.id, { onDelete: "restrict" }),
    type: text("type").notNull(),
    note: text("note"),
    actorType: text("actor_type").notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    isSubstantive: boolean("is_substantive").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    check(
      "reservation_activity_type",
      sql`${table.type} in (${sql.raw(RESERVATION_ACTIVITY_TYPES)})`,
    ),
    check(
      "reservation_activity_note",
      sql`${table.type} <> 'FOLLOW_UP_NOTE' or ${table.note} is not null`,
    ),
    check(
      "reservation_activity_actor",
      sql`${table.actorType} in (${sql.raw(ACTOR_TYPES)})`,
    ),
  ],
);

// Item biaya dibuat sekarang, diisi change 5a (peta entitas roadmap).
export const reservationItem = pgTable(
  "reservation_item",
  {
    id: text("id").primaryKey(),
    reservationId: text("reservation_id")
      .notNull()
      .references(() => reservation.id, { onDelete: "restrict" }),
    description: text("description").notNull(),
    amountRupiah: integer("amount_rupiah").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    check("reservation_item_amount_positive", sql`${table.amountRupiah} > 0`),
    check(
      "reservation_item_description",
      sql`btrim(${table.description}) <> ''`,
    ),
  ],
);

// Pembayaran manual admin (BR-21). Setiap baris langsung dianggap sah karena
// admin mencatatnya lewat tombol "Sudah DP" atau "Lunas".
export const payment = pgTable(
  "payment",
  {
    id: text("id").primaryKey(),
    reservationId: text("reservation_id")
      .notNull()
      .references(() => reservation.id, { onDelete: "restrict" }),
    amountRupiah: integer("amount_rupiah").notNull(),
    verificationStatus: text("verification_status")
      .default("TERVERIFIKASI")
      .notNull(),
    verificationReason: text("verification_reason"),
    verifiedByUserId: text("verified_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    recordedByUserId: text("recorded_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    statusChangedAt: timestamp("status_changed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    check("payment_amount_positive", sql`${table.amountRupiah} > 0`),
    check(
      "payment_status_valid",
      sql`${table.verificationStatus} in (${sql.raw(PAYMENT_VERIFICATION_STATUSES)})`,
    ),
  ],
);

// Pembatas laju form publik (D8). Kunci adalah hash sumber permintaan;
// jendela tetap (fixed window) dihitung modul reservasi.
export const submissionRateLimit = pgTable(
  "submission_rate_limit",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    windowStartedAt: timestamp("window_started_at").notNull(),
  },
  (table) => [
    check("submission_rate_limit_count", sql`${table.count} >= 0`),
  ],
);
