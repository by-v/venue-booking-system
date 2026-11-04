# Tasks

## 1. Query Publik dan Tipe Data Aman

Catatan apply: Kerjakan di branch `apply/booking-proof`; jangan commit `opencode.json` dan jangan push. Tidak ada perubahan skema atau migrasi. Tes query memakai PostgreSQL asli. Tidak ada gerbang yang menghentikan apply selama API tersedia sesuai design.

- [x] 1.1 [GERBANG] Verifikasi API terpasang yang dipakai design: `db.select`, `eq`, `innerJoin`, `and`, `headers()`; tulis path/baris ke Hasil Verifikasi V1; jika bertentangan dengan design, berhenti dan tanyakan user. (Cek status berdasarkan nomor booking)
- [x] 1.2 Tambahkan `PublicBookingProof` di `src/modules/reservation/types.ts` dan fungsi murni `maskCustomerName` di `src/modules/reservation/masking.ts` sesuai design D2; verifikasi `npm run typecheck` lulus. (Perlindungan cek status)
- [x] 1.3 Implementasikan `getPublicBookingByNumber` di `src/modules/reservation/queries.ts` sesuai design D1: normalisasi nomor, cari berdasarkan `booking_number`, hitung keuangan dengan fungsi `pricing.ts`, dan kembalikan hanya field publik; verifikasi `npm run typecheck` lulus. (Cek status berdasarkan nomor booking, Bukti Booking siap cetak)
- [x] 1.4 Tulis `tests/booking-proof-masking.test.ts` untuk penyamaran nama dan `tests/booking-proof-queries.test.ts` untuk query publik: reservasi DITERIMA mengembalikan data, PENDING/DITANGGUHKAN tanpa nomor booking tidak ditemukan, nama tersamar, dan tidak ada field sensitif; jalankan `npm run test -- tests/booking-proof-masking.test.ts tests/booking-proof-queries.test.ts`. (Cek status berdasarkan nomor booking, Perlindungan cek status)
- [x] 1.5 Perluas `tests/helpers/seed-reservation.ts` bila diperlukan untuk membuat reservasi dengan nomor booking dan pembayaran terverifikasi; jalankan ulang tes 1.4. (Bukti Booking siap cetak)

## 2. Halaman Cek Status dan Rate Limit

Catatan apply: Halaman publik tidak boleh memanggil `requireAdminSession()`. Gunakan `searchParams` GET dan pesan galat generik yang sama untuk format salah, nomor tidak ditemukan, dan rate limit. Manfaatkan kembali tabel `submission_rate_limit`; jangan menambah migrasi. Tidak ada gerbang yang menghentikan apply di grup ini.

- [x] 2.1 Tambahkan `STATUS_CHECK_LIMIT`, `STATUS_CHECK_WINDOW_SECONDS`, dan `consumeStatusCheckLimit` di `src/modules/reservation/rate-limit.ts` yang memakai kembali `consumeSubmissionLimit`; verifikasi `npm run typecheck` lulus. (Perlindungan cek status)
- [x] 2.2 Buat `src/app/cek-status/page.tsx` dan komponen form sesuai design D3: input nomor booking, validasi format, panggil `getPublicBookingByNumber`, tampilkan ringkasan, dan tautan "Cetak Bukti"; verifikasi `npm run typecheck` lulus. (Cek status berdasarkan nomor booking)
- [x] 2.3 Hubungkan pembatas laju memakai `getClientIp(headers())` dan `hashClientIp()` dengan kunci `cek-status:<hash>`; pastikan galat generik untuk rate limit dan nomor tidak ditemukan; verifikasi `npm run typecheck` lulus. (Perlindungan cek status)
- [x] 2.4 Tambahkan tautan "Cek Status Reservasi" pada footer `src/components/public-shell.tsx` sesuai `docs/design/ui-spec.md` 4.1; verifikasi `npm run typecheck` lulus. (Cek status berdasarkan nomor booking)
- [x] 2.5 Tulis `tests/cek-status.test.tsx` (jsdom) untuk: form meminta nomor booking, hasil valid menampilkan ringkasan, nomor tidak ditemukan/format salah menampilkan pesan generik yang sama, rate limit menampilkan pesan generik, dan tautan "Cetak Bukti"; jalankan `npm run test -- tests/cek-status.test.tsx`. (Cek status berdasarkan nomor booking, Perlindungan cek status)

## 3. Halaman Bukti Booking Siap Cetak

Catatan apply: Ikuti `docs/design/ui-spec.md` penyesuaian 15; jangan menambah PDF server-side atau dependensi baru. Halaman publik tidak memanggil `requireAdminSession()`. [BERHENTI] 3.5 menghentikan apply sampai user menyetujui hasil browser.

- [x] 3.1 Buat `src/app/bukti-booking/[nomor]/page.tsx` sesuai design D4: query publik, rate limit, pesan generik untuk nomor tidak valid/tidak ditemukan, dan isi BR-10; verifikasi `npm run typecheck` lulus. (Bukti Booking siap cetak)
- [x] 3.2 Buat komponen klien tombol "Cetak Bukti" yang memanggil `window.print()`; verifikasi `npm run typecheck` lulus. (Bukti Booking siap cetak)
- [x] 3.3 Tambahkan gaya `@media print` untuk menyembunyikan navigasi/footer/tombol dan menampilkan konten Bukti Booking; verifikasi `npm run typecheck` lulus. (Bukti Booking siap cetak)
- [x] 3.4 Tulis `tests/bukti-booking.test.tsx` (jsdom) untuk: isi BR-10 tampil, nama customer tersamar, waktu cetak tertera, tombol memanggil `window.print`, dan nomor tidak valid menampilkan pesan generik; jalankan `npm run test -- tests/bukti-booking.test.tsx`. (Bukti Booking siap cetak, Perlindungan cek status)
- [x] 3.5 [BERHENTI] Minta user membuka `/cek-status` dan `/bukti-booking/<nomor>`: cek hasil valid, pesan galat generik, tautan "Cetak Bukti", dan dialog cetak peramban; bandingkan dengan `docs/design/ui-spec.md`; berhenti menunggu persetujuan sebelum verifikasi akhir. (Cek status berdasarkan nomor booking, Bukti Booking siap cetak)

## 4. Pengujian Keamanan dan Batas Data

Catatan apply: Tes memakai PostgreSQL asli dan tidak melemahkan assertion. Jangan menambah fitur di luar spec. Tidak ada gerbang yang menghentikan apply di grup ini.

- [x] 4.1 Tulis `tests/booking-proof-rate-limit.test.ts` untuk: batas terlampaui ditolak, sumber berbeda tidak saling memengaruhi, dan jendela waktu direset; jalankan `npm run test -- tests/booking-proof-rate-limit.test.ts`. (Perlindungan cek status)
- [x] 4.2 Perluas `tests/booking-proof-queries.test.ts` untuk memastikan hasil tidak memuat `id` internal, `whatsapp`, `address`, `notes`, aktivitas, atau riwayat status, dan nama selalu tersamar; jalankan `npm run test -- tests/booking-proof-queries.test.ts`. (Perlindungan cek status)
- [x] 4.3 Verifikasi bahwa halaman `/cek-status` dan `/bukti-booking/[nomor]` tidak memakai `requireAdminSession()` dan tidak mengimpor modul admin; jalankan `npm run test -- tests/static-scanner.test.ts tests/module-boundary.test.ts`. (Perlindungan cek status)

## 5. Verifikasi Akhir

Catatan apply: Grup ini hanya pemeriksaan integrasi; jangan menambah fitur. Jalankan perintah dengan jalur tes eksplisit dan pastikan tidak ada proses vitest lain yang aktif. Jangan commit ke `main`, jangan push, dan jangan commit `opencode.json`.

- [x] 5.1 Jalankan `npm run lint`; verifikasi tanpa galat. (Seluruh requirement)
- [x] 5.2 Jalankan `npm run typecheck`; verifikasi tanpa galat. (Seluruh requirement)
- [x] 5.3 Jalankan `npm run build`; verifikasi build berhasil dan rute `/cek-status` serta `/bukti-booking/[nomor]` terbangun. (Cek status berdasarkan nomor booking, Bukti Booking siap cetak)
- [x] 5.4 Jalankan `npm run test`; verifikasi seluruh tes lulus terhadap PostgreSQL asli dan tidak ada `skip`/`only`/`todo`. (Seluruh requirement)
- [x] 5.5 Jalankan `openspec validate booking-proof`; verifikasi valid tanpa peringatan. (Seluruh requirement)
- [x] 5.6 Verifikasi `git ls-files` tidak melacak berkas `.env*` selain `.env.example`, dan `git diff --cached --name-only` tidak memuat `opencode.json`. (NFR-SEC-03, Perlindungan cek status)
- [x] 5.7 Catat hasil akhir V2-V5 dan pastikan tidak ada push ke remote. (Seluruh requirement)

## Pemetaan Requirement ke Tes

| Requirement | Tugas tes utama |
|---|---|
| Cek status berdasarkan nomor booking | 1.3, 1.4, 2.2, 2.5 |
| Bukti Booking siap cetak | 1.3, 1.4, 3.1, 3.2, 3.4 |
| Perlindungan cek status | 1.2, 2.1, 2.3, 2.5, 3.4, 4.1, 4.2, 4.3 |

## Hasil Verifikasi

| Kode | Verifikasi | Sumber | Hasil |
| --- | --- | --- | --- |
| V1 | API yang dipakai design | `node_modules` terpasang | `db.select`/`innerJoin` di `drizzle-orm/pg-core/query-builders/select.d.ts` (contoh baris 163); `eq` di `drizzle-orm/sql/expressions/conditions.d.ts:27`; `and` di `conditions.d.ts:63`; `headers()` di `next/dist/server/request/headers.d.ts`. Sesuai design. |
| V2 | Query publik dan penyamaran | `npm run typecheck`; `npm run test -- tests/booking-proof-masking.test.ts tests/booking-proof-queries.test.ts` | Lulus. 10 tes lulus (4 masking, 6 query) terhadap PostgreSQL asli. |
| V3 | Halaman cek status dan rate limit | `npm run typecheck`; `npm run test -- tests/cek-status.test.tsx` | Lulus. 5 tes jsdom lulus (form, ringkasan, galat generik format/tidak ditemukan, rate limit). |
| V4 | Bukti Booking dan UI | Review browser user; `npm run test -- tests/bukti-booking.test.tsx tests/cek-status.test.tsx` | Disetujui user setelah review browser. 10 tes jsdom lulus. |
| V5 | Integrasi akhir dan batas scope | `npm run lint`; `npm run typecheck`; `npm run build`; `npm run test`; `openspec validate booking-proof`; pemeriksaan git | Lulus. Lint/typecheck bersih; build memuat `/cek-status` dan `/bukti-booking/[nomor]`; 103 file tes/452 tes lulus; tanpa skip/only/todo; spec valid; hanya `.env.example` terlacak; tidak ada push. |
