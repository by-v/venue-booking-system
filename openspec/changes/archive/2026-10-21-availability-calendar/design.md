# Design

## Context

Lihat `proposal.md` untuk motivasi dan batas scope. Kondisi repo yang membentuk desain:

- `venue-content` sudah selesai dan diarsipkan. Tabel `package` menyimpan `setup_days_before` (`src/lib/db/venue-schema.ts`), paket Outdoor = 2 dan Walimah = 3 sesuai seed.
- Belum ada tabel tanggal maupun modul ketersediaan. Belum ada `src/modules/availability/`.
- Kerangka admin (`src/app/admin/admin-shell.tsx`) memakai daftar `NAV_ITEMS` tetap; menu tanpa change tidak ditampilkan. Halaman admin wajib memanggil `requireAdminSession()` dan dijaga `tests/static-scanner.test.ts`.
- Halaman publik membaca data lewat modul domain, bukan query langsung di komponen (`src/app/page.tsx`, `src/modules/venue/queries.ts`). Modul domain tidak boleh mengimpor `src/app` (`tests/module-boundary.test.ts`, NFR-MNT-01).
- Harness tes memakai PostgreSQL asli (`tests/setup-db.ts`), `truncateAll()` membersihkan tabel antartes, dan migrasi diterapkan ke database uji sebelum tes berjalan.
- Tabel `reservation` belum ada; roadmap menetapkan `date_lock.reservation_id` dibuat tanpa FK dan FK ditambahkan di change `reservation-confirmation`.

## Goals / Non-Goals

**Goals:**
- Tabel `date_lock` dengan tanggal unik sebagai penjaga BR-01 di level database.
- Modul domain `src/modules/availability/` berisi perhitungan tanggal terkunci dan ketersediaan per paket, terpisah dari UI.
- Query publik yang hanya mengembalikan tanggal dan status, serta query admin yang mengembalikan jenis kunci.
- Komponen kalender publik (Tersedia/Terisi/Dipilih) yang siap dipakai change `reservation-submission`.
- Halaman admin `/admin/kalender` baca-saja dengan pembeda kunci acara dan setup.

**Non-Goals:**
- Tidak ada penulisan kunci dari UI pada change ini; kunci ditulis oleh alur konfirmasi di change `reservation-confirmation`.
- Tidak ada rute publik baru dan tidak ada form reservasi.
- Tidak ada harga hari tambahan, pemblokiran manual (T-08), atau perubahan skema `venue`/`package`.
- Tidak ada pustaka tanggal pihak ketiga.

## Decisions

### AC-1. Skema `date_lock`

File baru `src/lib/db/date-lock-schema.ts`, diekspor dari `src/lib/db/schema.ts` mengikuti pola `venue-schema.ts`.

| Kolom | Tipe Drizzle | Constraint |
|---|---|---|
| `date` | `date("date", { mode: "string" })` | `primaryKey()` → satu baris per tanggal (BR-01) |
| `kind` | `text("kind").notNull()` | `check("date_lock_kind", sql\`kind in ('EVENT','SETUP')\`)` |
| `reservation_id` | `text("reservation_id")` nullable | tanpa FK sampai change `reservation-confirmation` |
| `created_at` | `timestamp("created_at").defaultNow().notNull()` | — |

`date` memakai mode string karena `date()` dengan `{ mode: "string" }` menghasilkan `PgDateStringBuilder` dengan nilai `string` (`node_modules/drizzle-orm/pg-core/columns/date.d.ts`), sehingga tanggal tidak bergeser oleh zona waktu. `check()` tersedia pada `node_modules/drizzle-orm/pg-core/checks.d.ts` dan sudah dipakai di `venue-schema.ts`.

Constraint unik ditegakkan oleh primary key, bukan hanya validasi aplikasi; dua kunci pada tanggal yang sama akan gagal di database. Tidak ada transaksi khusus karena change ini tidak menulis data. **Alternatif ditolak:** kolom `timestamp` (rawan pergeseran zona waktu), `uniqueIndex` terpisah (primary key sudah cukup), dan enum PostgreSQL (lebih kaku; `text` + `check` mudah diubah).

### AC-2. Modul domain `src/modules/availability/`

- `types.ts`: `DateLockKind = "EVENT" | "SETUP"`, `DateLock`, `DayStatus = "TERSEDIA" | "TERISI"`, `AvailabilityDay`.
- `dates.ts` (fungsi murni, tanpa database):
  - `toDateString(date: Date): string` dan `addDays(dateString, amount): string` memakai `Date.UTC` agar aritmetika tanggal tidak terpengaruh DST.
  - `todayInJakarta(now = new Date()): string` memakai `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" })`.
  - `lockDatesForEvent({ eventDate, setupDaysBefore, extraSetupDates }): { date, kind }[]` — tanggal acara `EVENT`, `setupDaysBefore` hari sebelumnya `SETUP`, ditambah hari setup tambahan `SETUP`.
  - `isPastDate(date, today): boolean`.
  - `buildAvailability({ month, today, lockedDates, setupDaysBefore }): AvailabilityDay[]` — satu tanggal Tersedia bila tidak lewat dan tidak ada kunci pada rentang `[tanggal − setupDaysBefore, tanggal]`; selain itu Terisi.
- `queries.ts`:
  - `listDateLocksInRange(start, end): Promise<DateLock[]>` untuk admin (memuat `kind`).
  - `getPublicAvailability({ packageId, month, today }): Promise<AvailabilityDay[]>` — membaca paket aktif, mengambil tanggal terkunci pada rentang yang diperlukan, lalu memanggil `buildAvailability`. Hasil hanya `{ date, status }`; `setupDaysBefore`, `reservation_id`, dan `kind` tidak pernah keluar dari fungsi ini.
- `schema.ts`: skema Zod rentang bulan (`YYYY-MM`) untuk halaman admin.

Aturan bisnis berada di `dates.ts` dan `queries.ts`, bukan di komponen atau Server Action (NFR-MNT-01). **Alternatif ditolak:** menghitung ketersediaan di komponen klien dengan mengirim `setupDaysBefore` (membocorkan data setup ke customer) dan menyimpan status ketersediaan di database (data turunan yang bisa tidak sinkron).

### AC-3. Kalender publik

Komponen presentasional di `src/components/availability/availability-calendar.tsx`:

- Menerima `days: AvailabilityDay[]`, `selectedDate?: string`, `onSelect?: (date: string) => void`, dan `monthLabel`.
- Menampilkan grid bulan dengan tiga keadaan: Tersedia, Terisi (tidak dapat diklik), Dipilih. Teks memakai token desain yang sudah ada; tidak menampilkan alasan kunci atau hari setup (BR-27, ui-spec penyesuaian 14).
- Komponen tidak melakukan query sendiri; data dihitung server-side oleh `getPublicAvailability` dan diteruskan sebagai props. Karena itu nilai `setup_days_before` tidak ikut ke peramban.
- Belum dipasang di rute publik mana pun. Change `reservation-submission` yang menempatkannya di langkah "Pilih Tanggal" `/reservasi` (ui-spec 4.1).

**`[BELUM TERVERIFIKASI]`:** format keluaran `Intl.DateTimeFormat("en-CA")` di Node 20 (apakah selalu `YYYY-MM-DD`) dan perilaku `Date.UTC` untuk penambahan hari. Diverifikasi sebagai gerbang sebelum menulis fungsi tanggal.

### AC-4. Halaman admin Kalender

- Rute `/admin/kalender` (Server Component) memanggil `requireAdminSession()` sebagai panggilan pertama.
- Bulan dipilih lewat parameter kueri `?bulan=YYYY-MM` dengan nilai bawaan bulan berjalan WIB; validasi memakai skema Zod; nilai tidak valid jatuh ke bulan berjalan.
- Menampilkan grid tanggal dengan penanda berbeda untuk `EVENT` dan `SETUP`, plus keterangan singkat. Tidak ada tombol tambah/ubah/hapus.
- Menu "Kalender" ditambahkan ke `NAV_ITEMS` di `src/app/admin/admin-shell.tsx` dengan ikon baru di `admin-icons.tsx`; menu Reservasi/Pelanggan/Pembayaran tetap tidak ditampilkan.

### AC-5. Zona waktu dan batas hari

Semua aturan tanggal memakai WIB. "Hari ini" dihitung dari `Intl.DateTimeFormat` dengan `timeZone: "Asia/Jakarta"`, bukan zona waktu server. Tanggal lampau ditolak; tidak ada batas jarak hari lain (T-04 default). Perhitungan tanggal memakai string `YYYY-MM-DD` dan `Date.UTC`, sehingga pergeseran bulan/tahun (mis. 1 April dengan setup 3 hari → 29–31 Maret) ditangani tanpa pustaka.

## Risks / Trade-offs

- **[Kunci tanggal hanya berguna setelah change konfirmasi menulisnya]** → change ini menguji constraint dan query dengan data sintetis di database uji; alur tulis menyusul di `reservation-confirmation`.
- **[T-02 PROVISIONAL]** → `setup_days_before` memblokir kalender sesuai default roadmap; fungsi `lockDatesForEvent`/`buildAvailability` adalah satu-satunya tempat yang perlu diubah bila venue menjawab tidak.
- **[Kebocoran data customer lewat kalender]** → query publik hanya mengembalikan tanggal dan status; jenis kunci dan `reservation_id` hanya ada di query admin.
- **[Batas bulan dan WIB]** → seluruh aritmetika memakai string tanggal dan `Date.UTC`; "hari ini" memakai WIB, diuji pada pergantian bulan dan tahun.
- **[Kinerja query rentang]** → satu query per bulan pada tabel kecil; tidak perlu cache.
- **[Pemindai statis menolak halaman admin tanpa helper]** → `/admin/kalender` memanggil `requireAdminSession()` sejak awal.
- **[Halaman admin tanpa data]** → bulan kosong menampilkan keadaan kosong, bukan galat.

## Migration Plan

1. Tambah `src/lib/db/date-lock-schema.ts` dan ekspor dari `src/lib/db/schema.ts`.
2. `npm run db:generate`; periksa SQL memuat primary key `date`, `check` jenis, dan kolom `reservation_id` tanpa FK.
3. `npm run db:migrate` dua kali untuk membuktikan idempoten. Tidak ada seed: `date_lock` hanya diisi oleh alur konfirmasi di change berikutnya.
4. Rollback: migrasi maju-saja; tabel `date_lock` kosong dan belum dipakai UI publik sehingga aman dibiarkan bila change dibatalkan.
5. Setelah change diarsipkan, change `reservation-submission` memakai `getPublicAvailability` dan komponen kalender; change `reservation-confirmation` menambahkan FK `reservation_id`.

## Open Questions

1. **T-02**: konfirmasi venue apakah setup H-2/H-3 memblokir. Default roadmap dipakai (ya) dan ditandai PROVISIONAL.
2. **Harga hari tambahan**: belum diketahui; tidak dipakai di change ini dan diinput admin sebagai item biaya pada change 5a.
3. **T-08**: pemblokiran tanggal manual tidak dibuat; bila nanti diputuskan, jenis kunci baru akan mengubah `check` `kind` dan spec.
