import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Tabel domain venue (design SK-1). Nama kolom `snake_case` di database dan
 * `camelCase` di Drizzle, mengikuti pola `auth-schema.ts`.
 */

// Singleton venue: hanya boleh ada satu baris (id = 1).
export const venue = pgTable(
  "venue",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    address: text("address").notNull(),
    capacityMin: integer("capacity_min").notNull(),
    capacityMax: integer("capacity_max").notNull(),
    description: text("description").notNull(),
    adminWhatsapp: text("admin_whatsapp"),
    contact: text("contact"),
    email: text("email"),
    instagramUrl: text("instagram_url"),
    mapUrl: text("map_url"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    check("venue_singleton", sql`${table.id} = 1`),
    check(
      "venue_capacity",
      sql`${table.capacityMin} >= 0 and ${table.capacityMax} >= ${table.capacityMin}`,
    ),
  ],
);

// `package` adalah kata terlarang di mode strict, jadi nama ekspor berbeda
// dari nama tabel. Harga disimpan sebagai integer rupiah.
export const packageTable = pgTable(
  "package",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    priceRupiah: integer("price_rupiah").notNull(),
    durationHours: integer("duration_hours").notNull(),
    sessionCount: integer("session_count").notNull(),
    setupDaysBefore: integer("setup_days_before").notNull(),
    active: boolean("active").default(true).notNull(),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    check("package_price_nonneg", sql`${table.priceRupiah} >= 0`),
    check("package_duration_positive", sql`${table.durationHours} > 0`),
    check("package_sessions", sql`${table.sessionCount} >= 1`),
    check("package_setup_days", sql`${table.setupDaysBefore} >= 0`),
  ],
);

// "Fasilitas SDA" disimpan apa adanya (T-09); tidak ada constraint nama.
export const facility = pgTable("facility", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  sortOrder: integer("sort_order").notNull(),
});

// Relasi konfigurasi: unik per pasangan, FK `restrict` melindungi entitas.
export const packageFacility = pgTable(
  "package_facility",
  {
    packageId: text("package_id")
      .notNull()
      .references(() => packageTable.id, { onDelete: "restrict" }),
    facilityId: text("facility_id")
      .notNull()
      .references(() => facility.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.packageId, table.facilityId] })],
);

// Kategori galeri = jenis acara kanonik (T-15).
export const galleryItem = pgTable(
  "gallery_item",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    imagePath: text("image_path").notNull(),
    caption: text("caption"),
    sortOrder: integer("sort_order").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    check(
      "gallery_category",
      sql`${table.category} in ('PERNIKAHAN','WALIMAH_RESEPSI','SEMINAR','KONSER','ACARA_MALAM','ACARA_OUTDOOR','LAINNYA')`,
    ),
  ],
);
