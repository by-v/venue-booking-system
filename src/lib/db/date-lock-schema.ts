import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { reservation } from "./reservation-schema";

/**
 * Tabel kunci tanggal (design AC-1, BR-01). Satu tanggal hanya boleh
 * memiliki satu baris, ditegakkan oleh primary key pada kolom `date`.
 * Kunci manual boleh tanpa reservasi; kunci hasil konfirmasi menunjuk
 * reservasi dan tidak boleh menghapus reservasi yang masih ada.
 */
export const dateLock = pgTable(
  "date_lock",
  {
    date: date("date", { mode: "string" }).primaryKey(),
    kind: text("kind").notNull(),
    reservationId: text("reservation_id").references(() => reservation.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    check("date_lock_kind", sql`${table.kind} in ('EVENT','SETUP')`),
    index("date_lock_reservation_id_idx").on(table.reservationId),
  ],
);
