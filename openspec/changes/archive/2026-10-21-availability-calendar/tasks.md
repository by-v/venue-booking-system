# Tasks

## 1. Skema dan Migrasi `date_lock`

Catatan apply: Gerbang 1.1 gagal berarti berhenti dan bertanya. Tulis/migrasi hanya lewat `npm run db:generate` dan `npm run db:migrate`; tes skema memakai PostgreSQL asli lewat harness yang sudah ada. Change ini tidak punya seed: jangan menulis data ke database dev.

- [x] 1.1 [GERBANG] Verifikasi `date(name, { mode: "string" })`, `primaryKey()`, dan `check()` Drizzle dari tipe paket terpasang (`node_modules/drizzle-orm/pg-core/columns/date.d.ts`, `primary-keys.d.ts`, `checks.d.ts`); tulis sumbernya ke Hasil Verifikasi (V1); jika hasilnya bertentangan dengan design, berhenti dan tanyakan user. (Satu tanggal hanya boleh memiliki satu kunci)
- [x] 1.2 Buat `src/lib/db/date-lock-schema.ts` dengan tabel `date_lock` (`date` primary key mode string, `kind` dengan `check in ('EVENT','SETUP')`, `reservation_id` nullable tanpa FK, `created_at`) dan ekspor dari `src/lib/db/schema.ts`; verifikasi `npm run typecheck` lulus. (Satu tanggal hanya boleh memiliki satu kunci)
- [x] 1.3 Jalankan `npm run db:generate`; verifikasi berkas SQL baru di `migrations/` memuat primary key `date`, `check` jenis kunci, dan **tidak** memuat foreign key untuk `reservation_id`. (Satu tanggal hanya boleh memiliki satu kunci)
- [x] 1.4 Jalankan `npm run db:migrate` dua kali; verifikasi kedua eksekusi sukses (idempoten). (Satu tanggal hanya boleh memiliki satu kunci)
- [x] 1.5 Verifikasi tes constraint dengan menulis `tests/date-lock-schema.test.ts` terhadap PostgreSQL asli: kunci kedua pada tanggal yang sama ditolak; `kind` di luar `EVENT`/`SETUP` ditolak; satu tanggal acara Walimah hanya menyimpan satu baris; lalu menjalankan `npm run test -- tests/date-lock-schema.test.ts`. (Satu tanggal hanya boleh memiliki satu kunci)

## 2. Modul Domain Ketersediaan

Catatan apply: Aturan bisnis hanya di `src/modules/availability/`, tidak mengimpor `src/app` (dijaga tes boundary). Fungsi murni diuji tanpa database; query diuji terhadap PostgreSQL asli. Jangan menambah dependensi tanggal. Hasil query publik tidak boleh memuat `reservation_id`, `kind`, atau `setupDaysBefore`.

- [x] 2.1 [GERBANG] Verifikasi keluaran `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" })` dan aritmetika `Date.UTC` di Node 20 (jalankan potongan kode kecil dengan `node -e`), termasuk tanggal yang berdekatan dengan pergantian hari UTC; tulis sumber dan hasilnya ke Hasil Verifikasi (V2); jika format tidak `YYYY-MM-DD`, berhenti dan tanyakan user. (Ketersediaan publik menurut paket)
- [x] 2.2 Buat `src/modules/availability/types.ts` dan `dates.ts` (`toDateString`, `addDays`, `todayInJakarta`, `lockDatesForEvent`, `isPastDate`, `buildAvailability`) sesuai design AC-2; verifikasi `npm run typecheck` lulus. (Tanggal terkunci dihitung dari paket dan hari setup tambahan, Ketersediaan publik menurut paket)
- [x] 2.3 Verifikasi tes murni dengan menulis `tests/availability-dates.test.ts` (Full Service hanya mengunci tanggal acara; Outdoor mengunci H-2 sampai H; Walimah H-3 sampai H; hari setup tambahan ikut terkunci; acara 1 April dengan setup 3 hari mengunci 29–31 Maret; tanggal lampau terdeteksi; hari ini memakai WIB) lalu menjalankan `npm run test -- tests/availability-dates.test.ts`. (Tanggal terkunci dihitung dari paket dan hari setup tambahan, Ketersediaan publik menurut paket)
- [x] 2.4 Buat `src/modules/availability/queries.ts` (`listDateLocksInRange`, `getPublicAvailability`) dan `schema.ts` untuk validasi parameter bulan `YYYY-MM`; verifikasi `npm run typecheck` lulus. (Ketersediaan publik menurut paket, Data ketersediaan publik tidak membocorkan data customer, Kalender admin baca-saja dengan jenis kunci)
- [x] 2.5 Verifikasi tes query terhadap PostgreSQL asli dengan menulis `tests/availability-queries.test.ts` (kunci dalam rentang terbaca; `getPublicAvailability` menandai tanggal terkunci dan jendela setup paket sebagai Terisi; tanggal lampau Terisi; hasil publik hanya berisi `date` dan `status` tanpa `reservationId`, `kind`, atau `setupDaysBefore`; bulan kosong mengembalikan semua Tersedia) lalu menjalankan `npm run test -- tests/availability-queries.test.ts`. (Ketersediaan publik menurut paket, Data ketersediaan publik tidak membocorkan data customer)

## 3. Komponen Kalender Publik

Catatan apply: Komponen hanya presentasional dan tidak melakukan query. Jangan menambahkan rute publik atau memasang kalender di `/reservasi` (itu change 4). Tampilan mengikuti token dan komponen yang sudah ada di `src/components/ui/`.

- [x] 3.1 Buat `src/components/availability/availability-calendar.tsx` yang menerima `days`, `selectedDate`, `onSelect`, dan `monthLabel`, menampilkan keadaan Tersedia/Terisi/Dipilih tanpa alasan kunci atau hari setup; verifikasi `npm run typecheck` lulus. (Ketersediaan publik menurut paket, Data ketersediaan publik tidak membocorkan data customer)
- [x] 3.2 Verifikasi tes render dengan menulis `tests/availability-calendar.test.tsx` (tanggal Tersedia dapat dipilih; tanggal Terisi tidak memicu `onSelect`; tanggal terpilih ditandai "Dipilih"; tidak ada teks jenis kunci atau `setup_days_before`) lalu menjalankan `npm run test -- tests/availability-calendar.test.tsx`. (Ketersediaan publik menurut paket, Data ketersediaan publik tidak membocorkan data customer)
- [x] 3.3 Jalankan `npm run lint` dan `npm run typecheck`; verifikasi keduanya lulus tanpa galat. (Ketersediaan publik menurut paket)

## 4. Halaman Admin Kalender

Catatan apply: Halaman `/admin/kalender` dan setiap aksi admin wajib memanggil helper proteksi; pemindai statis menolak bila lupa. Halaman bersifat baca-saja: jangan membuat Server Action, tombol tambah/ubah/hapus, atau formulir kunci tanggal. Menu Reservasi/Pelanggan/Pembayaran tetap tidak ditampilkan.

- [x] 4.1 Tambahkan menu "Kalender" ke `NAV_ITEMS` di `src/app/admin/admin-shell.tsx` dan ikonnya di `src/app/admin/admin-icons.tsx`, mengikuti gaya ikon yang ada; verifikasi `npm run typecheck` lulus. (Kalender admin baca-saja dengan jenis kunci)
- [x] 4.2 Buat `src/app/admin/kalender/page.tsx` yang memanggil `requireAdminSession()`, membaca parameter `?bulan=YYYY-MM` dengan nilai bawaan bulan berjalan WIB, memvalidasi lewat skema Zod, dan menampilkan grid dengan penanda `EVENT`/`SETUP` serta keadaan kosong; verifikasi `npm run typecheck` lulus. (Kalender admin baca-saja dengan jenis kunci)
- [x] 4.3 Verifikasi halaman admin tanpa sesi ditolak dengan menulis `tests/admin-calendar-guard.test.ts` memakai pola `tests/fixtures/` dan pabrik pengguna uji yang ada, lalu menjalankan `npm run test -- tests/admin-calendar-guard.test.ts`. (Kalender admin baca-saja dengan jenis kunci)
- [x] 4.4 Verifikasi tes render admin dengan menulis `tests/admin-calendar.test.tsx` (kunci `EVENT` dan `SETUP` tampil dengan penanda berbeda; tidak ada tombol atau formulir tulis; bulan tanpa kunci menampilkan keadaan kosong) lalu menjalankan `npm run test -- tests/admin-calendar.test.tsx`. (Kalender admin baca-saja dengan jenis kunci)
- [x] 4.5 Jalankan `npm run test -- tests/static-scanner.test.ts`; verifikasi pemindai tidak melaporkan pelanggaran pada `src/`. (Kalender admin baca-saja dengan jenis kunci, NFR-SEC-05)
- [x] 4.6 [BERHENTI] Minta user membuka `/admin/kalender` di browser, membandingkan dengan `docs/design/ui-spec.md` 4.2, lalu berhenti menunggu persetujuan.

## 5. Verifikasi Akhir

Catatan apply: Grup ini hanya pemeriksaan integrasi; tidak menambah fitur. Jalankan perintah dengan jalur berkas tes eksplisit dan pastikan tidak ada proses vitest lain yang aktif.

- [x] 5.1 Jalankan `npm run lint`; verifikasi tanpa galat.
- [x] 5.2 Jalankan `npm run typecheck`; verifikasi tanpa galat.
- [x] 5.3 Jalankan `npm run build`; verifikasi build berhasil dan `/admin/kalender` terbangun.
- [x] 5.4 Jalankan `npm run test`; verifikasi seluruh tes lulus terhadap PostgreSQL asli dan tidak ada `skip`/`only`/`todo`.
- [x] 5.5 Jalankan `openspec validate availability-calendar`; verifikasi tanpa peringatan.
- [x] 5.6 Verifikasi `git ls-files` tidak melacak berkas `.env*` selain `.env.example`.

## Hasil Verifikasi

| Kode | Verifikasi | Sumber | Hasil |
| --- | --- | --- | --- |
| V1 | API Drizzle untuk `date_lock` | `node_modules/drizzle-orm/pg-core/columns/date.d.ts` (`date<TMode>(name, config)`; `mode: "string"` → `PgDateStringBuilder` dengan `data: string`), `checks.d.ts` (`check(name: string, value: SQL)`), `primary-keys.d.ts` (`primaryKey({ columns })`); migrasi `migrations/0003_abandoned_black_widow.sql` | Lulus: SQL memuat `"date" date PRIMARY KEY NOT NULL`, `CONSTRAINT "date_lock_kind" CHECK ("date_lock"."kind" in ('EVENT','SETUP'))`, dan `reservation_id` tanpa FK. |
| V2 | Format tanggal WIB dan aritmetika `Date.UTC` | `node -v` (v24.21.0) dan `node -e` dengan `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" })` + `Date.UTC` | Lulus: `2027-03-19T16:59Z` → `2027-03-19`, `2027-03-19T17:00Z` → `2027-03-20`; `Date.UTC` menghasilkan `2027-02-28` (mundur 1 hari dari 1 Maret) dan `2027-03-29` (3 hari sebelum 1 April). Catatan: lingkungan memakai Node 24, bukan Node 20; API yang dipakai sama dan tersedia di Node 20. |
