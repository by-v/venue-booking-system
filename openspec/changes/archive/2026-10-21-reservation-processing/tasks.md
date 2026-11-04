# Tasks

## 1. Skema, Constraint, dan Migrasi

Catatan apply: Kerjakan di branch `apply/reservation-processing`; jangan commit `opencode.json`. Hanya ubah skema lewat Drizzle dan jangan menulis data ke database dev. Jangan mengubah `date_lock`. Gerbang 1.1 tidak menghentikan apply selama API tersedia sesuai design; bila hasilnya bertentangan, berhenti dan tanyakan user.

- [x] 1.1 [GERBANG] Verifikasi API terpasang yang dipakai design: `boolean`, `check`, `references(..., { onDelete })`, `db.transaction`, `.for("update")`, dan `sum`; tulis path/baris ke Hasil Verifikasi V1; jika bertentangan dengan design, berhenti dan tanyakan user. (Item biaya dan total reservasi, Pencatatan dan verifikasi pembayaran, Penangguhan dan pembatalan reservasi belum diterima)
- [x] 1.2 Perbarui `src/lib/db/reservation-schema.ts`: tabel `payment`, kolom `reservation.perlu_pemeriksaan_admin`, kolom `reservation_status_history.reason_code`, perluasan tipe `reservation_activity`, serta constraint item biaya; ekspor lewat `src/lib/db/schema.ts`; verifikasi `npm run typecheck` lulus. (Item biaya dan total reservasi, Pencatatan dan verifikasi pembayaran, Penangguhan dan pembatalan reservasi belum diterima, Jejak aktivitas pengolahan)
- [x] 1.3 Jalankan `npm run db:generate`; verifikasi migrasi `migrations/0005_*.sql` memuat tabel `payment`, FK, seluruh `CHECK` baru, kolom penanda, kolom `reason_code`, perluasan tipe aktivitas, perubahan constraint item, dan **tidak** mengubah `date_lock`. (Item biaya dan total reservasi, Pencatatan dan verifikasi pembayaran, Penangguhan dan pembatalan reservasi belum diterima)
- [x] 1.4 Jalankan `npm run db:migrate` dua kali; verifikasi kedua eksekusi sukses (idempoten). (Item biaya dan total reservasi, Pencatatan dan verifikasi pembayaran)
- [x] 1.5 Perluas `tests/reservation-schema.test.ts` untuk constraint baru: pembayaran menolak nominal nol/negatif, status di luar daftar, `TIDAK_VALID` tanpa alasan, dan status non-`DICATAT` tanpa `status_changed_at`; item menolak nominal nol/negatif dan deskripsi kosong; `reason_code` di luar daftar ditolak; tipe aktivitas baru diterima; `perlu_pemeriksaan_admin` default `false`; status `DITOLAK` tetap ditolak; lalu jalankan `npm run test -- tests/reservation-schema.test.ts tests/schema-diff.test.ts tests/date-lock-schema.test.ts`. (Item biaya dan total reservasi, Pencatatan dan verifikasi pembayaran, Penangguhan dan pembatalan reservasi belum diterima, Jejak aktivitas pengolahan)

## 2. Perhitungan Keuangan dan Skema Input

Catatan apply: Fungsi murni diuji tanpa database; jangan menambah dependensi; perilaku `estimateMinimumDp` pada form publik harus tetap sama. Tidak ada gerbang yang menghentikan apply di grup ini.

- [x] 2.1 Tambahkan konstanta dan tipe pembayaran di `src/modules/reservation/types.ts` (`PAYMENT_VERIFICATION_STATUSES`, `PAYMENT_STATUSES`, `ReservationItem`, `Payment`, `ReservationFinancials`) serta perluas `ReservationListItem` dan `ReservationDetail`; verifikasi `npm run typecheck` lulus. (Perhitungan DP minimum dan status pembayaran, Ringkasan keuangan reservasi admin)
- [x] 2.2 Implementasikan fungsi murni di `src/modules/reservation/pricing.ts`: `calculateReservationTotal`, `calculateMinimumDp`, `derivePaymentStatus`, dan `calculateRemainingPayment`; pertahankan `estimateMinimumDp` sebagai pembungkus; verifikasi `npm run typecheck` lulus. (Item biaya dan total reservasi, Perhitungan DP minimum dan status pembayaran, Ringkasan keuangan reservasi admin)
- [x] 2.3 Tambahkan skema Zod input item biaya, pencatatan pembayaran, pembatalan verifikasi, penangguhan, dan pembatalan reservasi di `src/modules/reservation/schema.ts`; verifikasi `npm run typecheck` lulus. (Pencatatan dan verifikasi pembayaran, Penangguhan dan pembatalan reservasi belum diterima, Akses admin untuk pengolahan reservasi)
- [x] 2.4 Perluas `tests/reservation-pricing.test.ts` untuk total paket + item, DP minimum 25% dibulatkan ke atas, status `BELUM_DP`/`DP`/`LUNAS`, sisa pembayaran, dan `DICATAT` tidak dihitung; jalankan `npm run test -- tests/reservation-pricing.test.ts`. (Item biaya dan total reservasi, Perhitungan DP minimum dan status pembayaran, Ringkasan keuangan reservasi admin)
- [x] 2.5 Tulis `tests/reservation-processing-schema.test.ts` untuk nominal bulat positif, deskripsi wajib, alasan pembatalan verifikasi wajib, kode alasan pembatalan hanya `MUNDUR_CUSTOMER`/`DITOLAK_VENUE`, dan alasan penangguhan/pembatalan wajib; jalankan `npm run test -- tests/reservation-processing-schema.test.ts`. (Pencatatan dan verifikasi pembayaran, Penangguhan dan pembatalan reservasi belum diterima)

## 3. Mutasi Item, Pembayaran, dan Status

Catatan apply: Mutasi domain tidak memanggil `requireAdminSession`; proteksi sesi dilakukan di Server Action. Gunakan `db.transaction` dan kunci baris reservasi untuk verifikasi pembayaran dan perubahan status. Jangan menulis `date_lock`, jangan menghapus pembayaran, dan jangan mengubah nominal pembayaran. Tes memakai PostgreSQL asli. Tidak ada gerbang yang menghentikan apply di grup ini.

- [x] 3.1 Tambahkan kode galat domain yang dibutuhkan (misalnya pembayaran tidak ditemukan, transisi tidak valid, alasan wajib, dan verifikasi melebihi total) di `src/modules/reservation/errors.ts`; verifikasi `npm run typecheck` lulus. (Pencatatan dan verifikasi pembayaran, Penangguhan dan pembatalan reservasi belum diterima)
- [x] 3.2 Implementasikan `addReservationItem` dan `recordPayment` dalam transaksi, termasuk pencatatan aktivitas `ITEM_ADDED` dan `PAYMENT_RECORDED`; verifikasi `npm run typecheck` lulus. (Item biaya dan total reservasi, Pencatatan dan verifikasi pembayaran, Jejak aktivitas pengolahan)
- [x] 3.3 Implementasikan `verifyPayment` dan `invalidatePayment`: kunci reservasi, validasi transisi, tolak verifikasi yang melebihi total, wajibkan alasan pembatalan verifikasi, set `perlu_pemeriksaan_admin` hanya saat pembayaran `TERVERIFIKASI` dibatalkan, dan catat aktivitas `PAYMENT_STATUS_CHANGED`; verifikasi `npm run typecheck` lulus. (Pencatatan dan verifikasi pembayaran, Batas pembayaran terverifikasi terhadap total, Penanda perlu pemeriksaan admin, Jejak aktivitas pengolahan)
- [x] 3.4 Implementasikan `suspendReservation` dan `cancelReservation`: kunci reservasi, validasi transisi `PENDING`/`DITANGGUHKAN`, wajibkan alasan, tulis `reason_code` pada pembatalan, catat riwayat status dan aktivitas `STATUS_CHANGE`; verifikasi `npm run typecheck` lulus. (Penangguhan dan pembatalan reservasi belum diterima, Jejak aktivitas pengolahan)
- [x] 3.5 Perluas `addFollowUpNote` agar menerima `PENDING` dan `DITANGGUHKAN`; verifikasi `npm run typecheck` lulus. (Catatan tindak lanjut admin tercatat sebagai aktivitas)
- [x] 3.6 Tulis `tests/reservation-processing-mutations.test.ts` untuk: total paket + item; DP minimum; status pembayaran turunan; pembayaran `DICATAT` tidak dihitung; verifikasi dan pembatalan verifikasi tanpa menghapus baris; penolakan verifikasi melebihi total; penanda `perlu_pemeriksaan_admin`; transisi status dan riwayat; `DITOLAK` bukan status; transisi terlarang; aktivitas item/pembayaran/status; dan tidak ada tulisan `date_lock`; jalankan `npm run test -- tests/reservation-processing-mutations.test.ts`. (Item biaya dan total reservasi, Perhitungan DP minimum dan status pembayaran, Pencatatan dan verifikasi pembayaran, Batas pembayaran terverifikasi terhadap total, Penangguhan dan pembatalan reservasi belum diterima, Penanda perlu pemeriksaan admin, Jejak aktivitas pengolahan)
- [x] 3.7 Perbarui `tests/reservation-mutations.test.ts` untuk catatan tindak lanjut pada `DITANGGUHKAN` dan pastikan perilaku pengajuan lama tetap lulus; jalankan `npm run test -- tests/reservation-mutations.test.ts`. (Catatan tindak lanjut admin tercatat sebagai aktivitas)
- [x] 3.8 Tulis `tests/reservation-payment-concurrency.test.ts` untuk dua verifikasi bersamaan yang masing-masing akan melebihi total; verifikasi tepat satu berhasil dan jumlah pembayaran terverifikasi tidak melebihi total; jalankan `npm run test -- tests/reservation-payment-concurrency.test.ts`. (Batas pembayaran terverifikasi terhadap total)

## 4. Query Daftar, Detail, dan Dashboard

Catatan apply: Query hanya membaca data; status pembayaran dan total tidak disimpan. Filter daftar default adalah `PENDING` + `DITANGGUHKAN`; filter bulan dashboard memakai tanggal acara. Jangan membuat route publik baru. Tes memakai PostgreSQL asli. Tidak ada gerbang yang menghentikan apply di grup ini.

- [x] 4.1 Perbarui `src/modules/reservation/types.ts` untuk tipe filter daftar, data keuangan detail, pembayaran, item, agenda, dan data dashboard; verifikasi `npm run typecheck` lulus. (Admin meninjau reservasi PENDING, Ringkasan keuangan reservasi admin, Dashboard operasional)
- [x] 4.2 Implementasikan `listReservations` di `src/modules/reservation/queries.ts` dengan filter `proses` (default), `diterima`, `dibatalkan` (termasuk `AUTO_CANCELLED`), dan `semua`; sertakan pencarian nama/WhatsApp, total, dan status pembayaran memakai scalar subquery; verifikasi `npm run typecheck` lulus. (Admin meninjau reservasi PENDING, Ringkasan keuangan reservasi admin)
- [x] 4.3 Perluas `getReservationDetail` untuk memuat item, pembayaran, total, DP minimum, pembayaran terverifikasi, pembayaran `DICATAT`, sisa, dan `perlu_pemeriksaan_admin`; verifikasi `npm run typecheck` lulus. (Ringkasan keuangan reservasi admin, Penanda perlu pemeriksaan admin)
- [x] 4.4 Implementasikan `getDashboardData` untuk jumlah aktif, empat kartu status, agenda `DITERIMA` mendatang beserta tanggal setup, perlu tindak lanjut, reservasi terbaru, dan filter bulan; verifikasi `npm run typecheck` lulus. (Dashboard operasional, Penanda perlu pemeriksaan admin)
- [x] 4.5 Perbarui `tests/admin-reservation-queries.test.ts` untuk daftar default, filter status, pencarian dalam filter, total, status pembayaran, detail keuangan, item, pembayaran, dan penanda pemeriksaan; jalankan `npm run test -- tests/admin-reservation-queries.test.ts`. (Admin meninjau reservasi PENDING, Ringkasan keuangan reservasi admin, Penanda perlu pemeriksaan admin)
- [x] 4.6 Tulis `tests/dashboard-queries.test.ts` untuk hitungan aktif, empat kartu status, `AUTO_CANCELLED` masuk kartu dibatalkan, agenda terurut dan menyertakan tanggal setup, perlu tindak lanjut (PENDING, `DICATAT`, penanda), reservasi terbaru, dan filter bulan berdasarkan tanggal acara; jalankan `npm run test -- tests/dashboard-queries.test.ts`. (Dashboard operasional, Penanda perlu pemeriksaan admin)

## 5. Aksi Admin dan Halaman Reservasi

Catatan apply: Setiap Server Action baru wajib memanggil `requireAdminSession()` sebelum parsing atau menulis. Domain error dipetakan ke `?galat=` pada detail; jangan menulis `date_lock`. Form tindakan hanya tampil untuk status yang diizinkan. Pemindai statis tidak boleh dilanggar. [BERHENTI] 5.7 menghentikan apply sampai user menyetujui hasil browser.

- [x] 5.1 Tambahkan Server Action `addReservationItem`, `recordPayment`, `verifyPayment`, `invalidatePayment`, `suspendReservation`, dan `cancelReservation` di `src/app/admin/reservasi/actions.ts` dengan guard sesi, Zod, pemetaan galat, dan `revalidatePath` untuk `/admin`, `/admin/reservasi`, dan detail; verifikasi `npm run typecheck` lulus. (Akses admin untuk pengolahan reservasi, Pencatatan dan verifikasi pembayaran, Penangguhan dan pembatalan reservasi belum diterima, Item biaya dan total reservasi)
- [x] 5.2 Perluas `tests/admin-actions-unauthorized.test.ts` dengan seluruh aksi baru; jalankan `npm run test -- tests/admin-actions-unauthorized.test.ts tests/static-scanner.test.ts tests/module-boundary.test.ts`. (Akses admin untuk pengolahan reservasi)
- [x] 5.3 Perbarui `src/app/admin/reservasi/page.tsx` dengan filter status, pencarian, kolom total/status pembayaran, dan keadaan kosong; verifikasi `npm run typecheck` lulus. (Admin meninjau reservasi PENDING)
- [x] 5.4 Perbarui `src/app/admin/reservasi/[id]/page.tsx` dengan ringkasan keuangan, tabel dan form item biaya, tabel dan form pembayaran, form penangguhan/pembatalan, banner galat `?galat=`, label aktivitas baru, dan form catatan untuk `PENDING`/`DITANGGUHKAN`; verifikasi `npm run typecheck` lulus. (Ringkasan keuangan reservasi admin, Pencatatan dan verifikasi pembayaran, Penangguhan dan pembatalan reservasi belum diterima, Catatan tindak lanjut admin tercatat sebagai aktivitas)
- [x] 5.5 Perbarui `tests/admin-reservation.test.tsx` untuk daftar default/filter, total/status pembayaran, ringkasan detail, form item/pembayaran, tindakan status yang tampil sesuai status, banner galat, dan label aktivitas; jalankan `npm run test -- tests/admin-reservation.test.tsx`. (Admin meninjau reservasi PENDING, Ringkasan keuangan reservasi admin, Pencatatan dan verifikasi pembayaran, Penangguhan dan pembatalan reservasi belum diterima)
- [x] 5.6 Jalankan `npm run lint` dan `npm run typecheck`; verifikasi tidak ada galat sebelum review visual. (Akses admin untuk pengolahan reservasi)
- [x] 5.7 [BERHENTI] Minta user membuka `/admin/reservasi`, satu detail reservasi berstatus `PENDING`, dan satu reservasi `DITANGGUHKAN` di browser; bandingkan dengan `docs/design/ui-spec.md` 4.2; berhenti menunggu persetujuan sebelum grup dashboard.

## 6. Halaman Dashboard

Catatan apply: Semua angka dan teks berasal dari data nyata; jangan menambah statistik, data demo, atau widget di luar `docs/design/ui-spec.md` 4.2 dan US-054. Pertahankan keadaan kosong, memuat, dan galat. [BERHENTI] 6.5 menghentikan apply sampai user menyetujui hasil browser.

- [x] 6.1 Perbarui `src/app/admin/dashboard-view.tsx` untuk menerima data dashboard dan menampilkan ringkasan, stacked bar status aktif, empat kartu status, agenda, perlu tindak lanjut, reservasi terbaru, filter bulan, serta keadaan kosong/memuat/galat; verifikasi `npm run typecheck` lulus. (Dashboard operasional)
- [x] 6.2 Perbarui `src/app/admin/page.tsx` untuk memanggil `getDashboardData` dengan `resolveMonth` dari `?bulan=` dan meneruskan data ke view; verifikasi `npm run typecheck` lulus. (Dashboard operasional)
- [x] 6.3 Perbarui `tests/dashboard.test.ts` dan tulis `tests/dashboard-view.test.tsx` untuk keadaan kosong, hitungan aktif, empat kartu, agenda, perlu tindak lanjut, reservasi terbaru, filter bulan, serta keadaan memuat/galat; jalankan `npm run test -- tests/dashboard.test.ts tests/dashboard-view.test.tsx`. (Dashboard operasional, Penanda perlu pemeriksaan admin)
- [x] 6.4 Jalankan `npm run lint` dan `npm run typecheck`; verifikasi tidak ada galat sebelum review visual. (Dashboard operasional)
- [x] 6.5 [BERHENTI] Minta user membuka `/admin` di browser, mencoba filter bulan, dan membandingkan seluruh widget dengan `docs/design/ui-spec.md` 4.2; berhenti menunggu persetujuan sebelum verifikasi akhir.

## 7. Verifikasi Akhir

Catatan apply: Grup ini hanya pemeriksaan integrasi; jangan menambah fitur. Jalankan perintah dengan jalur tes eksplisit dan pastikan tidak ada proses vitest lain yang aktif. Jangan commit ke `main`, jangan push, dan jangan commit `opencode.json`.

- [x] 7.1 Jalankan `npm run lint`; verifikasi tanpa galat. (Seluruh requirement)
- [x] 7.2 Jalankan `npm run typecheck`; verifikasi tanpa galat. (Seluruh requirement)
- [x] 7.3 Jalankan `npm run build`; verifikasi build berhasil dan `/admin`, `/admin/reservasi`, serta `/admin/reservasi/[id]` terbangun. (Dashboard operasional, Admin meninjau reservasi PENDING)
- [x] 7.4 Jalankan `npm run test`; verifikasi seluruh tes lulus terhadap PostgreSQL asli dan tidak ada `skip`/`only`/`todo`. (Seluruh requirement)
- [x] 7.5 Jalankan `openspec validate reservation-processing`; verifikasi tanpa peringatan. (Seluruh requirement)
- [x] 7.6 Verifikasi `git ls-files` tidak melacak berkas `.env*` selain `.env.example`, dan `git diff --cached --name-only` tidak memuat `opencode.json`. (NFR-SEC-03)
- [x] 7.7 Verifikasi `git diff --name-only` tidak memuat `date_lock` atau berkas migrasi yang mengubah `date_lock`; catat hasil akhir di Hasil Verifikasi V3. (Item biaya dan total reservasi, Dashboard operasional)

## Pemetaan Requirement ke Tes

| Requirement | Tugas tes utama |
|---|---|
| Item biaya dan total reservasi | 2.4, 3.6 |
| Perhitungan DP minimum dan status pembayaran | 2.4, 3.6 |
| Pencatatan dan verifikasi pembayaran | 2.5, 3.6, 5.5 |
| Batas pembayaran terverifikasi terhadap total | 3.6, 3.8 |
| Penangguhan dan pembatalan reservasi belum diterima | 2.5, 3.6, 5.5 |
| Penanda perlu pemeriksaan admin | 3.6, 4.6, 6.3 |
| Ringkasan keuangan reservasi admin | 2.4, 4.5, 5.5 |
| Jejak aktivitas pengolahan | 3.6, 5.5 |
| Dashboard operasional | 4.6, 6.3 |
| Akses admin untuk pengolahan reservasi | 5.2 |
| Admin meninjau reservasi PENDING (delta) | 4.5, 5.5 |
| Catatan tindak lanjut admin tercatat sebagai aktivitas (delta) | 3.7, 5.5 |

## Hasil Verifikasi

| Kode | Verifikasi | Sumber | Hasil |
| --- | --- | --- | --- |
| V1 | API Drizzle yang dipakai design | `node_modules/drizzle-orm/pg-core/columns/boolean.d.ts:21-22`, `checks.d.ts:18`, `columns/common.d.ts:15,45`, `pg-core/db.d.ts:281`, `pg-core/query-builders/select.d.ts:586`, `sql/functions/aggregate.d.ts:69` | Lulus: seluruh API tersedia sesuai design. |
| V2 | Migrasi dan constraint baru | `migrations/0005_dear_lady_mastermind.sql`; `npm run db:migrate` (dua kali); `npm run test -- tests/reservation-schema.test.ts tests/schema-diff.test.ts tests/date-lock-schema.test.ts` | Lulus: migrasi memuat `payment`, FK, semua check, penanda, `reason_code`, tipe aktivitas, dan constraint item; `date_lock` tidak berubah; 3 berkas/24 tes lulus. |
| V3 | Integrasi akhir dan batas scope | `npm run lint`; `npm run typecheck`; `npm run build`; `npm run test`; `openspec validate reservation-processing`; `git ls-files`; `git diff --cached --name-only`; `git diff --name-only main...HEAD`; `migrations/0005_dear_lady_mastermind.sql` | Lulus: lint dan typecheck bersih; build berhasil dengan `/admin`, `/admin/reservasi`, dan `/admin/reservasi/[id]`; 88 berkas/338 tes lulus tanpa `skip`/`only`/`todo`; change valid; hanya `.env.example` yang terlacak dan `opencode.json` tidak masuk staged; tidak ada path `date_lock`, dan migrasi `0005` tidak mengubah `date_lock` (hanya memuat snapshot konteks). |
