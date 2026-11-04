# Design

## Context

Change `availability-calendar` sudah selesai dan terarsip. Yang tersedia sekarang:

- Modul `src/modules/availability/` dengan fungsi tanggal murni (`todayInJakarta`, `addDays`, `lockDatesForEvent`, `buildAvailability`) dan query `getPublicAvailability`/`listDateLocksInRange`.
- Komponen presentasional `src/components/availability/availability-calendar.tsx` (Tersedia/Terisi/Dipilih) yang belum dipasang di rute mana pun.
- Tabel `date_lock` tanpa foreign key `reservation_id` dan tanpa tulisan dari aplikasi; halaman `/admin/kalender` baca-saja.
- Modul `src/modules/venue/` dengan `getPublicVenue`, `listActivePackages`, `buildWhatsAppLink`, dan skema Zod venue.
- Better Auth + Drizzle + PostgreSQL, pengujian Vitest terhadap PostgreSQL asli (`tests/setup-db.ts`), serta pemindai statis `tests/helpers/static-scanner.ts` yang mewajibkan `requireAdminSession()` pada berkas `'use server'` dan `page.{ts,tsx}` di `src/app/admin/**`, dan `getAdminSessionOrNull()` pada `route.{ts,tsx}` di `src/app/admin/**`.
- Belum ada tabel `customer`, `reservation`, atau penyimpanan pembatas laju form publik.

Change ini menambahkan penulisan database pertama dari halaman publik. Karena pengajuan PENDING tidak mengunci tanggal, change ini **tidak** menulis `date_lock`; penguncian tetap milik `reservation-confirmation`.

## Goals / Non-Goals

**Goals**

- Form publik tiga langkah di `/reservasi` yang memakai kalender dan query ketersediaan change 3.
- Menyimpan pengajuan sebagai customer `CALON` + reservasi `PENDING` dengan snapshot paket/harga, riwayat status awal, dan aktivitas pertama.
- Validasi tanggal sisi server: setelah hari ini (WIB), paket aktif, tanpa kunci acara/setup pada jendela paket.
- Pembatas laju berbasis database per sumber permintaan, tanpa captcha.
- Halaman admin daftar/cari/detail PENDING dan catatan tindak lanjut sebagai aktivitas.

**Non-Goals**

- Konfirmasi, penolakan, nomor booking, penguncian tanggal, pembayaran, item biaya, input admin langsung, cek status, reschedule, auto-cancel, dan tata letak mobile.
- Tidak ada dependensi baru; tidak ada Redis/Upstash; tidak ada panggilan WhatsApp API.
- Tidak mengubah `date_lock`.

## Decisions

### D1 - Skema tabel baru

Berkas `src/lib/db/reservation-schema.ts`, diekspor dari `src/lib/db/schema.ts` (pola `date-lock-schema.ts`). Nama kolom `snake_case`, nama properti Drizzle `camelCase`. Semua id bertipe `text` dan nilainya dibuat aplikasi dengan `crypto.randomUUID()` (tanpa default database, tanpa asumsi ekstensi `pgcrypto`).

`customer`

| Kolom | Tipe | Aturan |
|---|---|---|
| `id` | `text` | primary key |
| `name` | `text` | not null |
| `whatsapp` | `text` | not null, unique `customer_whatsapp_unique` |
| `status` | `text` | not null default `CALON`, check `in ('CALON','CLIENT')` |
| `created_at` | `timestamp` | default now, not null |
| `updated_at` | `timestamp` | default now, `$onUpdate`, not null |

`reservation`

| Kolom | Tipe | Aturan |
|---|---|---|
| `id` | `text` | primary key |
| `customer_id` | `text` | not null, FK `customer.id` `onDelete: restrict` |
| `package_id` | `text` | not null, FK `package.id` `onDelete: restrict` |
| `package_name` | `text` | not null (snapshot) |
| `package_price_rupiah` | `integer` | not null, check `>= 0` (snapshot) |
| `package_duration_hours` | `integer` | not null, check `> 0` (snapshot) |
| `package_session_count` | `integer` | not null, check `>= 1` (snapshot) |
| `event_date` | `date` mode string | not null |
| `event_type` | `text` | not null, check kategori jenis acara kanonik T-15 |
| `address` | `text` | not null |
| `notes` | `text` | nullable |
| `status` | `text` | not null default `PENDING`, check `in ('PENDING','DITANGGUHKAN','DITERIMA','DIBATALKAN','AUTO_CANCELLED','SELESAI')` |
| `created_at` | `timestamp` | default now, not null |
| `updated_at` | `timestamp` | default now, `$onUpdate`, not null |

Catatan: `booking_number` (5b), kolom `source` (5c), dan `perlu_pemeriksaan_admin` (8) **tidak** ditambahkan di sini sesuai peta entitas roadmap.

`reservation_status_history`

| Kolom | Tipe | Aturan |
|---|---|---|
| `id` | `text` | primary key |
| `reservation_id` | `text` | not null, FK `reservation.id` `onDelete: restrict` |
| `from_status` | `text` | nullable, check status yang sama atau null |
| `to_status` | `text` | not null, check status |
| `reason` | `text` | nullable |
| `actor_type` | `text` | not null, check `in ('CUSTOMER','ADMIN','SYSTEM')` |
| `actor_user_id` | `text` | nullable, FK `user.id` `onDelete: set null` |
| `created_at` | `timestamp` | default now, not null |

`reservation_activity`

| Kolom | Tipe | Aturan |
|---|---|---|
| `id` | `text` | primary key |
| `reservation_id` | `text` | not null, FK `reservation.id` `onDelete: restrict` |
| `type` | `text` | not null, check `in ('SUBMISSION','FOLLOW_UP_NOTE')` |
| `note` | `text` | nullable; check `type <> 'FOLLOW_UP_NOTE' or note is not null` |
| `actor_type` | `text` | not null, check `in ('CUSTOMER','ADMIN','SYSTEM')` |
| `actor_user_id` | `text` | nullable, FK `user.id` `onDelete: set null` |
| `is_substantive` | `boolean` | not null default true |
| `created_at` | `timestamp` | default now, not null |

`reservation_item` (dibuat sekarang, diisi change 5a)

| Kolom | Tipe | Aturan |
|---|---|---|
| `id` | `text` | primary key |
| `reservation_id` | `text` | not null, FK `reservation.id` `onDelete: restrict` |
| `description` | `text` | not null |
| `amount_rupiah` | `integer` | not null, check `>= 0` |
| `created_at` | `timestamp` | default now, not null |

`submission_rate_limit`

| Kolom | Tipe | Aturan |
|---|---|---|
| `key` | `text` | primary key |
| `count` | `integer` | not null, check `>= 0` |
| `window_started_at` | `timestamp` | not null |

Constraint memakai `check(name, sql)` dan `unique(name).on(column)` dari `drizzle-orm/pg-core` (V1 di tasks). FK ke `user.id` mengambil pola yang sama dengan `account.userId` di `src/lib/db/auth-schema.ts`.

### D2 - Normalisasi nomor WhatsApp

Fungsi murni `normalizeWhatsApp` di `src/modules/reservation/phone.ts`:

1. Buang semua karakter non-digit.
2. Jika diawali `0`, ganti menjadi `62`.
3. Jika diawali `8`, tambahkan `62`.
4. Terima hanya hasil yang diawali `62` dengan panjang 10-15 digit.

Nilai tersimpan selalu `62...`. Skema Zod memakai `transform` lalu `refine` sehingga pesan galat tetap satu. Satu customer per nomor WhatsApp ditegakkan di dua lapis: unique constraint database dan upsert `ON CONFLICT` (D4).

### D3 - Validasi tanggal: hari ini ikut ditolak

BR-26 (FINAL-DEFAULT) berbunyi tanggal acara harus **setelah hari ini**; implementasi change 3 baru menolak tanggal `< today`. Change ini menyelaraskan keduanya:

- Ganti `isPastDate` di `src/modules/availability/dates.ts` menjadi `isPastOrToday(date, today)` dengan makna `date <= today`.
- `buildAvailability` memakai `isPastOrToday`, sehingga hari ini berstatus `TERISI` dan tidak dapat dipilih di `AvailabilityCalendar` (komponen sudah men-disable `TERISI`).
- Perbarui `tests/availability-dates.test.ts` dan `tests/availability-queries.test.ts`: `today` `2027-03-10` menjadi `TERISI`.
- Modul reservasi memakai predikat yang sama (`isBookableDate(date, today) = date > today`) agar tidak ada aturan tanggal kedua.

### D4 - Transaksi pengajuan

`src/modules/reservation/mutations.ts` menyediakan `submitReservation(input)`:

1. `db.transaction` dari `drizzle-orm/node-postgres` (`session.d.ts` `transaction<T>(...)`).
2. Ambil paket aktif: `select id, name, price_rupiah, duration_hours, session_count, setup_days_before from package where id = ? and active = true limit 1`. Bila kosong -> `ReservationError("PACKAGE_UNAVAILABLE")`.
3. Tolak bila `!isBookableDate(eventDate, todayInJakarta())` -> `ReservationError("DATE_NOT_BOOKABLE")`.
4. `listDateLocksInRange(addDays(eventDate, -package.setupDaysBefore), eventDate)`; bila ada baris -> `ReservationError("DATE_NOT_BOOKABLE")`. Pengecekan ini mencakup kunci `EVENT` dan `SETUP`; pesan ke pengguna tidak membedakan keduanya (BR-27).
5. Upsert customer:
   `insert(customer).values({ id: randomUUID(), name, whatsapp }).onConflictDoUpdate({ target: customer.whatsapp, set: { name, updatedAt: new Date() } }).returning({ id: customer.id })`
   (API `onConflictDoUpdate` dari `node_modules/drizzle-orm/pg-core/query-builders/insert.d.ts`).
6. Insert `reservation` dengan snapshot dan `status: "PENDING"`.
7. Insert `reservation_status_history`: `fromStatus: null`, `toStatus: "PENDING"`, `reason: "Pengajuan form publik"`, `actorType: "CUSTOMER"`, `actorUserId: null`.
8. Insert `reservation_activity`: `type: "SUBMISSION"`, `actorType: "CUSTOMER"`, `isSubstantive: true`.
9. TIDAK menulis `date_lock`, `booking_number`, atau item biaya.

Konkurensi dua pengajuan nomor baru yang sama aman karena unique `customer.whatsapp` + `ON CONFLICT`; konkurensi dua customer pada tanggal sama sengaja dibiarkan (PENDING tidak mengunci).

`ReservationError` di `src/modules/reservation/errors.ts` membawa `code: "PACKAGE_UNAVAILABLE" | "DATE_NOT_BOOKABLE" | "RESERVATION_NOT_FOUND" | "INVALID_STATE"`.

### D5 - Pembatas laju berbasis database

`src/modules/reservation/rate-limit.ts`:

- Konstanta `SUBMISSION_LIMIT = 5`, `SUBMISSION_WINDOW_SECONDS = 900`.
- `consumeSubmissionLimit({ key, now })` menjalankan satu statement atomik ke `submission_rate_limit`:

```sql
INSERT INTO submission_rate_limit (key, count, window_started_at)
VALUES ($1, 1, $2)
ON CONFLICT (key) DO UPDATE
SET count = CASE
      WHEN submission_rate_limit.window_started_at <= $2::timestamptz - interval '900 seconds' THEN 1
      ELSE submission_rate_limit.count + 1
    END,
    window_started_at = CASE
      WHEN submission_rate_limit.window_started_at <= $2::timestamptz - interval '900 seconds' THEN $2::timestamptz
      ELSE submission_rate_limit.window_started_at
    END
RETURNING count;
```

- Bila `count > SUBMISSION_LIMIT`, lempar `RateLimitError`; route mengembalikan 429 dengan pesan generik.
- `key = sha256(ip)` dari `node:crypto`; `ip` diambil `getClientIp(headers)` (`x-forwarded-for` pertama, lalu `x-real-ip`, fallback `"unknown"`).
- Tidak ada dependensi baru. Header IP mengikuti catatan NFR-SEC-04: perilaku sebenarnya bergantung platform deploy; karena itu pembatas laju **tidak** diklaim sebagai pertahanan penuh.

### D6 - Route handler, bukan Server Action

- `POST /api/reservasi` (`src/app/api/reservasi/route.ts`) dan `GET /api/ketersediaan` (`src/app/api/ketersediaan/route.ts`) adalah route handler Node.
- Alasan: pemindai statis mewajibkan `requireAdminSession()` pada setiap berkas `'use server'` di `src/**`; route handler publik tidak boleh memakai helper admin. Route handler juga mudah diuji seperti tes Better Auth (`new Request(...)`).
- `POST /api/reservasi`: baca JSON (tolak body bukan JSON -> 400), `reservationSubmissionSchema.safeParse`, konsumsi pembatas laju, `submitReservation`, lalu `201 { ok: true }` tanpa id internal/nomor booking. `PACKAGE_UNAVAILABLE` dan `DATE_NOT_BOOKABLE` sama-sama 400 dengan pesan generik "Tanggal atau paket tidak tersedia."; `RateLimitError` -> 429 "Terlalu banyak percobaan. Coba lagi nanti."; galat tak terduga -> 500 generik.
- `GET /api/ketersediaan?packageId=...&bulan=YYYY-MM`: validasi dengan Zod (`monthSchema` change 3), panggil `getPublicAvailability`, balas `{ days }` dengan `Cache-Control: no-store`. Hasil hanya `{ date, status }` (BR-27).

### D7 - Form publik tiga langkah

- `src/app/reservasi/page.tsx` (server, `export const dynamic = "force-dynamic"`) memuat `getPublicVenue()`, `listActivePackageSummaries()`, `todayInJakarta()`, dan `adminWhatsapp`, lalu merender `ReservationForm` klien.
- `listActivePackageSummaries()` baru di `src/modules/venue/queries.ts` mengembalikan `PackageSummary` (`id`, `name`, `priceRupiah`, `durationHours`, `sessionCount`) **tanpa** `setupDaysBefore`, agar data yang diserialisasi ke komponen klien tidak membocorkan hari setup (T-16).
- `src/app/reservasi/reservation-form.tsx` (`"use client"`) mengelola tiga langkah: pilih paket, pilih tanggal, detail acara + ringkasan.
- Kalender mengambil `GET /api/ketersediaan` saat paket/bulan berubah (`useEffect` + `AbortController`), memakai `AvailabilityCalendar` dengan status `TERSEDIA`/`TERISI`. Bulan berjalan berasal dari prop `today` server agar konsisten WIB.
- Ringkasan memakai `estimateMinimumDp(priceRupiah) = Math.ceil(priceRupiah * 0.25)` di `src/modules/reservation/pricing.ts`, dengan keterangan "total akhir ditetapkan admin".
- Submit `fetch("/api/reservasi", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })`; tombol dinonaktifkan saat mengirim.
- Sukses menampilkan pesan tanpa kode, catatan "permintaan belum dikonfirmasi dan belum mengunci tanggal", dan tombol WhatsApp memakai `buildWhatsAppLink(adminWhatsapp, template)`; template memuat nama, paket, dan tanggal acara (T-12). Bila nomor admin kosong, tombol tidak dirender (perilaku `buildWhatsAppLink` mengembalikan `null`).
- Validasi klien menampilkan pesan per field; server tetap memvalidasi ulang. Galat 400 menampilkan pesan generik di atas form, bukan field-level palsu.

### D8 - Halaman admin

- Tambah menu `{ href: "/admin/reservasi", label: "Reservasi", Icon: ReservationIcon }` di `src/app/admin/admin-shell.tsx`; ikon baru di `src/app/admin/admin-icons.tsx` mengikuti gaya `CalendarIcon`/`PackageIcon`. Menu "Pelanggan" dan "Pembayaran" tetap disembunyikan.
- `src/app/admin/reservasi/page.tsx` (server) memanggil `requireAdminSession()`, membaca `?q=`, memanggil `listPendingReservations(q)`, dan menampilkan tabel: nama + WhatsApp customer, tanggal acara, paket, harga snapshot, aksi "Detail". Pencarian memakai `ilike` pada nama dan WhatsApp dengan pola `%` yang di-escape.
- `src/app/admin/reservasi/[id]/page.tsx` (server) memanggil `requireAdminSession()`, `getReservationDetail(id)`; bila tidak ada -> `notFound()`. Menampilkan data customer, paket snapshot, tanggal acara, alamat, catatan, status, riwayat status, dan aktivitas.
- Form catatan memakai Server Action `addFollowUpNote` di `src/app/admin/reservasi/actions.ts` (`"use server"` -> wajib `requireAdminSession()`), Zod `followUpNoteSchema`, lalu `addFollowUpNote` mutation. Aksi memanggil `revalidatePath("/admin/reservasi")` dan `revalidatePath(`/admin/reservasi/${id}`)`.
- `addFollowUpNote` mutation memverifikasi reservasi ada dan berstatus `PENDING`, lalu insert `reservation_activity` `FOLLOW_UP_NOTE` dengan `actorType: "ADMIN"` dan `actorUserId` dari sesi. Catatan kosong ditolak skema sebelum mutasi.

### D9 - Query dan tipe publik

- `listPendingReservations(search?: string)` mengembalikan `ReservationListItem[]` (tanpa id internal ke komponen klien? id dipakai di tautan detail admin, jadi hanya dirender server).
- `getReservationDetail(id)` mengembalikan `ReservationDetail | null`.
- `getReservationDetail` mengurutkan aktivitas `createdAt asc` dan riwayat status `createdAt asc`.
- Modul reservasi **tidak** mengimpor dari `src/app` (dijaga `tests/module-boundary.test.ts`).

## Migration Plan

1. Tambah `src/lib/db/reservation-schema.ts`, ekspor dari `src/lib/db/schema.ts`.
2. `npm run db:generate` -> berkas `migrations/0004_*.sql` + snapshot baru.
3. Periksa SQL: unique `customer.whatsapp`, semua `CHECK`, FK, dan tidak ada perubahan `date_lock`.
4. `npm run db:migrate` dua kali (idempoten) terhadap database uji/dev sesuai alur proyek.
5. Tidak ada seed baru untuk change ini; jangan menulis data ke database dev.

Rollback: migrasi hanya menambah tabel; rollback manual adalah `DROP TABLE` berurutan anak -> induk. Tidak ada kolom lama yang diubah.

## Testing Strategy

- **Murni tanpa database**: `tests/reservation-phone.test.ts` (normalisasi `08`/`+62`/`62`/`8`), `tests/reservation-pricing.test.ts` (`estimateMinimumDp`), `tests/availability-dates.test.ts` yang diperbarui (`isPastOrToday`, hari ini `TERISI`).
- **PostgreSQL asli**:
  - `tests/reservation-schema.test.ts`: unique WhatsApp, check status/tipe/amount, FK restrict, dan `date_lock` tetap kosong setelah pengajuan.
  - `tests/reservation-mutations.test.ts`: customer baru + PENDING + riwayat + aktivitas; pengajuan ulang nomor sama menambah reservasi tanpa menggandakan customer; snapshot harga tidak berubah setelah paket diubah; tanggal terkunci/setup terkunci/lampau/hari ini/paket nonaktif ditolak; dua PENDING tanggal sama tersimpan.
  - `tests/reservation-rate-limit.test.ts`: permintaan ke-6 ditolak; sumber lain tetap lolos; jendela reset.
  - `tests/admin-reservation-queries.test.ts`: `listPendingReservations` mencari nama/WhatsApp dan hanya PENDING; `getReservationDetail` mengembalikan aktivitas.
  - `tests/admin-actions-unauthorized.test.ts` diperluas dengan `addFollowUpNote`.
- **Route handler**: `tests/reservation-route.test.ts` memanggil `POST` dengan `new Request`, memeriksa 201/400/429 dan bahwa error tidak mengungkap kunci; `tests/availability-route.test.ts` memeriksa `{ days }` hanya `date`/`status`.
- **Render**: `tests/reservation-form.test.tsx` (jsdom, `fetch` di-mock): paket aktif tampil, memilih tanggal memanggil API, submit sukses tanpa kode, tombol WhatsApp, nomor admin kosong; `tests/admin-reservation.test.tsx`: daftar/search/detail/catatan.
- **Statis**: `tests/static-scanner.test.ts` dan `tests/module-boundary.test.ts` tetap lulus; `tests/admin-shell.test.tsx` diperbarui (menu Reservasi tampil, Pelanggan/Pembayaran tetap tersembunyi).

## Risks / Trade-offs

- **Hari ini berubah menjadi Terisi** mengubah perilaku change 3 dan dua berkas tes lama. Ini disengaja agar BR-26 konsisten; perubahan tercatat pada delta `availability-calendar`.
- **Pembatas laju berbasis IP** dapat dilewati header `x-forwarded-for` dan bergantung platform deploy (catatan NFR-SEC-04). Batas 5/15 menit adalah parameter teknis, bukan aturan bisnis.
- **PENDING tidak mengunci** berarti dua customer dapat mengajukan tanggal sama. Ini sesuai BR-22/state machine; konfirmasi 5b yang menentukan pemenang.
- **Snapshot paket** menambah kolom duplikat, tetapi melindungi pengajuan lama dari perubahan harga/nama paket (BR-29) dan dipakai Bukti Booking di change 6.
- **Upsert customer memperbarui nama** pada pengajuan ulang; riwayat nama lama tidak disimpan. Tidak ada kebutuhan penelitian untuk menyimpannya di change ini.
- **Pencarian nomor booking belum ada** karena kolomnya baru dibuat di 5b; pencarian change 4 hanya nama dan WhatsApp. US-044 bagian "nomor booking" terpenuhi saat 5b.

## Decision Trace

| Keputusan | Sumber |
|---|---|
| Field form dan status CALON/PENDING | T-13, T-15, BR-25, state machine T1, US-040 |
| Snapshot harga dan identitas paket | BR-29, US-040 |
| Tanggal setelah hari ini, setup ikut memblokir | BR-26, BR-18 (PROVISIONAL), T-02, T-04 |
| PENDING tidak mengunci tanggal | BR-22, state machine T1, roadmap Change 4 |
| Riwayat status dan aktivitas | BR-17a, BR-24, peta entitas roadmap Change 4 |
| Pembatas laju database | US-043, TDR D8, NFR-SEC-04, NFR-SEC-05 |
| Pesan sukses tanpa kode + WhatsApp | BR-05, BR-19, US-041, T-12 |
| Admin daftar/cari/detail/catatan | US-044, ui-spec 4.2 |
| Route handler publik, bukan Server Action | NFR-SEC-05 helper admin + pemindai statis; TDR D5 |
| Tanpa dependensi tanggal baru | TDR D2/D4/D9 dan instruksi change 3 |

## Open Questions / Gates

1. **GERBANG D3**: bila user/venue menolak penandaan hari ini sebagai Terisi, kembalikan perilaku change 3 dan tolak hari ini hanya di `submitReservation`. Design default tetap menandai Terisi karena BR-26.
2. **PROVISIONAL T-02**: setup bawaan memblokir kalender. Bila berubah, hanya perhitungan jendela kunci yang berubah; validasi tanggal acara tetap.
3. Batas pembatas laju 5 per 15 menit belum punya jejak aturan bisnis; ditetapkan sebagai parameter teknis dan dapat disesuaikan tanpa mengubah spec.
