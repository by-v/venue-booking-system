# Tasks

## 1. Skema, Constraint, dan Migrasi

Catatan apply: Kerjakan di branch `apply/reservation-confirmation`; jangan commit `opencode.json` dan jangan push. Hanya ubah skema lewat Drizzle. Jangan menulis data ke database dev selain migrasi. Preflight hanya membaca; bila menemukan data yang akan menghalangi constraint, hentikan apply dan laporkan. Gerbang 1.1 tidak menghentikan apply selama API tersedia sesuai design.

- [x] 1.1 [GERBANG] Verifikasi API terpasang yang dipakai design: `db.transaction`, `.for("update")`, `.onConflictDoUpdate()`, `.returning()`, `inArray()`, `.delete()`, `check()`, `unique()`, `index()`, `references(..., { onDelete })`, serta `DatabaseError.code`/`DatabaseError.constraint`; tulis path/baris ke Hasil Verifikasi V1; jika bertentangan dengan design, berhenti dan tanyakan user. (Nomor booking unik dan counter tahunan, Konfirmasi atomik, Penguncian tanggal acara dan setup)
- [x] 1.2 Perbarui `src/lib/db/reservation-schema.ts`: tabel `booking_counter`, kolom `reservation.booking_number`, kolom `reservation.dp_forfeited`, unique/format/required booking number, check counter, dan check DP hangus; ekspor tabel baru lewat `src/lib/db/schema.ts`; verifikasi `npm run typecheck` lulus. (Nomor booking unik dan counter tahunan, Pembatalan reservasi DITERIMA)
- [x] 1.3 Perbarui `src/lib/db/date-lock-schema.ts`: FK `reservation_id` ke `reservation.id` dengan `onDelete: "restrict"`, index `date_lock_reservation_id_idx`, dan komentar yang sesuai; verifikasi `npm run typecheck` lulus. (Penguncian tanggal acara dan setup)
- [x] 1.4 Jalankan `npm run db:generate`; verifikasi migrasi `migrations/0006_*.sql` memuat `booking_counter`, kolom `booking_number`/`dp_forfeited`, semua `CHECK`, unique booking number, FK `date_lock.reservation_id`, dan index `date_lock_reservation_id_idx`; pastikan tidak ada perubahan tabel/kolom lain di luar design. (Nomor booking unik dan counter tahunan, Penguncian tanggal acara dan setup, Pembatalan reservasi DITERIMA)
- [x] 1.5 Jalankan `npm run db:check` lalu preflight baca-saja: `npx tsx -e "import './src/lib/load-env'; import { Client } from 'pg'; (async () => { const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect(); const q = await c.query(\"select 'orphan_date_lock' as check, count(*)::int as total from date_lock dl left join reservation r on r.id = dl.reservation_id where dl.reservation_id is not null and r.id is null union all select 'existing_diterima', count(*)::int from reservation where status = 'DITERIMA'\"); console.log(q.rows); await c.end(); })();"`; kedua nilai harus 0. Bila tidak, berhenti dan laporkan baris terkait; jangan menghapus data atau mengarang nomor booking. (Penguncian tanggal acara dan setup, Nomor booking unik dan counter tahunan)
- [x] 1.6 Jalankan `npm run db:migrate` dua kali; verifikasi kedua eksekusi sukses (migrasi tercatat dan idempoten). (Skema dan constraint)
- [x] 1.7 Perbarui `tests/reservation-schema.test.ts`, `tests/date-lock-schema.test.ts`, dan tambahkan `tests/booking-counter-schema.test.ts` untuk menguji: counter menolak urutan negatif dan tahun ganda; `booking_number` menolak format salah dan duplikat, tetapi mengizinkan banyak NULL; `DITERIMA` tanpa nomor ditolak; `dp_forfeited` hanya benar saat `DIBATALKAN`; FK `date_lock.reservation_id` menolak reservasi tidak ada dan mengizinkan NULL; PK `date_lock` tetap menolak tanggal ganda. Perbarui fixture tes `date_lock` lama agar memakai reservasi nyata atau `null`; jalankan `npm run test -- tests/reservation-schema.test.ts tests/date-lock-schema.test.ts tests/booking-counter-schema.test.ts tests/schema-diff.test.ts`. (Syarat konfirmasi reservasi, Penguncian tanggal acara dan setup, Nomor booking unik dan counter tahunan, Pembatalan reservasi DITERIMA)
- [x] 1.8 Perbarui seluruh fixture tes yang membuat atau mengubah reservasi menjadi `DITERIMA` agar menyertakan `booking_number` valid dan unik: `tests/admin-reservation-queries.test.ts`, `tests/dashboard-queries.test.ts`, `tests/dashboard-view.test.tsx`, `tests/reservation-mutations.test.ts`, dan `tests/reservation-processing-mutations.test.ts`; perluas `tests/helpers/seed-reservation.ts` dengan opsi `bookingNumber` bila diperlukan; jangan mengubah perilaku yang diuji. Jalankan `npm run test -- tests/admin-reservation-queries.test.ts tests/dashboard-queries.test.ts tests/dashboard-view.test.tsx tests/reservation-mutations.test.ts tests/reservation-processing-mutations.test.ts`. (Nomor booking unik dan counter tahunan, Pembatalan reservasi DITERIMA)
- [x] 1.9 Perbarui seluruh fixture `date_lock` yang memakai `reservation_id` non-null agar menunjuk reservasi nyata atau memakai `null` bila tes tidak membutuhkan relasi: `tests/date-lock-schema.test.ts`, `tests/availability-queries.test.ts`, `tests/availability-route.test.ts`, `tests/dashboard-queries.test.ts`, `tests/reservation-mutations.test.ts`, dan `tests/reservation-route.test.ts`; jangan mengubah perilaku ketersediaan yang diuji. Jalankan `npm run test -- tests/date-lock-schema.test.ts tests/availability-queries.test.ts tests/availability-route.test.ts tests/dashboard-queries.test.ts tests/reservation-mutations.test.ts tests/reservation-route.test.ts`. (Penguncian tanggal acara dan setup)

## 2. Nomor Booking, Tipe, dan Skema Input

Catatan apply: Fungsi nomor booking harus murni dan tidak menyentuh database. Jangan menambah dependensi tanggal. Tipe baru harus dipakai oleh query, mutasi, dan UI; jangan membuat duplikat tipe. Tidak ada gerbang yang menghentikan apply di grup ini.

- [x] 2.1 Tambahkan `src/modules/reservation/booking-number.ts` dengan `bookingNumberYear(now?)` yang memakai `todayInJakarta()` dan `formatBookingNumber(year, sequence)` dengan `padStart(4, "0")`; verifikasi `npm run typecheck` lulus. (Nomor booking unik dan counter tahunan)
- [x] 2.2 Perluas `src/modules/reservation/types.ts`: `ReservationListItem.bookingNumber`, `ReservationDetail.bookingNumber` dan `dpForfeited`, serta tipe `ReservationConfirmationContext` dan `ReservationConflict` yang memuat tanggal target, pembayaran dicatat/terverifikasi, dan status; verifikasi `npm run typecheck` lulus. (Daftar reservasi bentrok, Tampilan konfirmasi dan pembatalan admin, Admin meninjau reservasi PENDING)
- [x] 2.3 Tambahkan error `DP_BELOW_MINIMUM` dan `DATE_CONFLICT` di `src/modules/reservation/errors.ts`; tambahkan skema input konfirmasi dan pembatalan `DITERIMA` di `src/modules/reservation/schema.ts` dengan `reasonCode` hanya `MUNDUR_CUSTOMER` dan alasan wajib; verifikasi `npm run typecheck` lulus. (Syarat konfirmasi reservasi, Pembatalan reservasi DITERIMA)
- [x] 2.4 Tulis `tests/booking-number.test.ts` untuk format urutan 1 (`0001`), 9999, 10000 (lebar bertambah), dan batas tahun WIB (31 Des 2026 23.59 WIB vs 1 Jan 2027 00.00 WIB); jalankan `npm run test -- tests/booking-number.test.ts`. (Nomor booking unik dan counter tahunan)
- [x] 2.5 Tulis `tests/reservation-confirmation-schema.test.ts` untuk id reservasi wajib, alasan pembatalan wajib, dan penolakan kode selain `MUNDUR_CUSTOMER`; jalankan `npm run test -- tests/reservation-confirmation-schema.test.ts`. (Pembatalan reservasi DITERIMA, Akses admin untuk konfirmasi dan pembatalan)

## 3. Mutasi Konfirmasi Atomik

Catatan apply: Mutasi domain tidak memanggil `requireAdminSession`; proteksi sesi dilakukan Server Action. Gunakan `db.transaction`, kunci baris reservasi, dan urutan pada design D3. Jangan memakai `SERIALIZABLE` dan jangan memetakan semua unique violation menjadi konflik tanggal. Tes memakai PostgreSQL asli. [BERHENTI] 3.7 menghentikan apply sampai user menyetujui transaksi konfirmasi.

- [x] 3.1 Perluas `lockReservation()` di `src/modules/reservation/mutations.ts` agar memuat `customerId`, `packageId`, dan `eventDate` tanpa mengubah perilaku pemanggil lama; verifikasi `npm run typecheck` lulus. (Konfirmasi atomik, Penguncian tanggal acara dan setup)
- [x] 3.2 Implementasikan helper counter tahunan dan `confirmReservation` sesuai design D2-D4: validasi status, DP, paket, tanggal, insert multi-baris `date_lock`, upsert counter, bentuk nomor, update `DITERIMA`+`booking_number`, update customer `CLIENT`, riwayat, dan aktivitas. Petakan hanya `date_lock_pkey` ke `DATE_CONFLICT`; verifikasi `npm run typecheck` lulus. (Syarat konfirmasi reservasi, Konfirmasi atomik, Penguncian tanggal acara dan setup, Nomor booking unik dan counter tahunan)
- [x] 3.3 Perluas `tests/helpers/seed-reservation.ts` agar tes dapat membuat reservasi dengan `eventDate`, `setupDaysBefore`, status, id customer/reservasi berbeda, dan beberapa reservasi dalam satu paket; pertahankan default lama agar tes 5a tetap lulus; jalankan `npm run test -- tests/reservation-processing-mutations.test.ts tests/reservation-mutations.test.ts`. (Syarat konfirmasi reservasi, Konfirmasi atomik)
- [x] 3.4 Tulis `tests/reservation-confirmation-mutations.test.ts` untuk konfirmasi `PENDING` dan `DITANGGUHKAN` yang berhasil, DP tepat di batas, DP kurang (4,9 jt dari 20 jt), pembayaran `DICATAT` tidak dihitung, status terlarang, kunci `EVENT`+`SETUP`, customer menjadi `CLIENT`, riwayat dengan alasan konfirmasi dan aktivitas, dan total berubah setelah konfirmasi tanpa membuka tanggal; jalankan `npm run test -- tests/reservation-confirmation-mutations.test.ts`. (Syarat konfirmasi reservasi, Konfirmasi atomik, Penguncian tanggal acara dan setup, Nomor booking unik dan counter tahunan)
- [x] 3.5 Tambahkan tes konflik tanggal acara dan setup pada berkas yang sama: kunci milik reservasi lain membuat konfirmasi ditolak, status/DP/customer/nomor tidak berubah, dan tidak ada kunci parsial; uji juga pemeriksaan aplikasi dan constraint database; jalankan `npm run test -- tests/reservation-confirmation-mutations.test.ts`. (Syarat konfirmasi reservasi, Penguncian tanggal acara dan setup)
- [x] 3.6 Tambahkan tes rollback setelah kunci tanggal dan tes nomor booking: buat tabrakan unique `booking_number` setelah kunci disisipkan, pastikan seluruh transaksi rollback (tidak ada `date_lock`, status tetap, customer tetap `CALON`, counter tidak naik); lalu tulis `tests/reservation-confirmation-concurrency.test.ts` untuk dua konfirmasi tanggal sama secara bersamaan dengan tepat satu berhasil dan satu `DATE_CONFLICT`; jalankan `npm run test -- tests/reservation-confirmation-mutations.test.ts tests/reservation-confirmation-concurrency.test.ts`. (Konfirmasi atomik, Penguncian tanggal acara dan setup, Nomor booking unik dan counter tahunan)
- [x] 3.7 [BERHENTI] Tunjukkan diff transaksi `confirmReservation`, hasil tes 3.4-3.6, dan bukti tidak ada kunci parsial; berhenti menunggu persetujuan user sebelum grup pembatalan. (Disetujui user dengan instruksi melanjutkan ke grup berikutnya.)

## 4. Mutasi Pembatalan DITERIMA

Catatan apply: Aksi ini hanya untuk `DITERIMA` dan hanya pihak `CUSTOMER` melalui `reasonCode = MUNDUR_CUSTOMER`. Jangan mengubah `cancelReservation` 5a. Jangan menambah kolom pihak baru. Tes memakai PostgreSQL asli. [BERHENTI] 4.4 menghentikan apply sampai user menyetujui transaksi pembatalan.

- [x] 4.1 Implementasikan `cancelAcceptedReservation` sesuai design D6: kunci reservasi, validasi status dan kode alasan, hapus seluruh `date_lock` milik reservasi, set `DIBATALKAN` + `dp_forfeited = true`, tulis riwayat dan aktivitas; verifikasi `npm run typecheck` lulus. (Pembatalan reservasi DITERIMA, Penguncian tanggal acara dan setup)
- [x] 4.2 Tulis `tests/reservation-confirmation-cancellation.test.ts` untuk pembatalan berhasil, seluruh kunci acara/setup terhapus, `dp_forfeited` benar, nomor booking dipertahankan, customer tetap `CLIENT`, riwayat/aktivitas tercatat, status selain `DITERIMA` ditolak, alasan wajib, dan kode `DITOLAK_VENUE` ditolak oleh aksi ini; jalankan `npm run test -- tests/reservation-confirmation-cancellation.test.ts`. (Pembatalan reservasi DITERIMA)
- [x] 4.3 Tambahkan tes nomor tidak dipakai ulang: konfirmasi reservasi A (nomor `0001`), batalkan A, lalu konfirmasi reservasi B pada tanggal yang dibebaskan; B mendapat nomor berikutnya, A tetap `0001`, dan tanggal dapat dikunci kembali. Pastikan pembatalan 5a tetap menghasilkan `dp_forfeited = false`; jalankan `npm run test -- tests/reservation-confirmation-cancellation.test.ts tests/reservation-processing-mutations.test.ts`. (Pembatalan reservasi DITERIMA, Nomor booking unik dan counter tahunan)
- [x] 4.4 [BERHENTI] Tunjukkan diff transaksi `cancelAcceptedReservation`, hasil tes 4.2-4.3, dan bukti `cancelReservation` 5a tidak berubah; berhenti menunggu persetujuan user sebelum grup query. (Disetujui user dengan instruksi melanjutkan ke grup berikutnya.)

## 5. Query Daftar Bentrok, Nomor Booking, dan Detail

Catatan apply: Query hanya membaca. Jangan mengubah status reservasi lain saat membangun daftar bentrok. Pencarian nomor booking harus tetap bekerja bersama filter status dan filter bulan. Tes memakai PostgreSQL asli. Tidak ada gerbang yang menghentikan apply di grup ini.

- [x] 5.1 Perbarui `listReservations` di `src/modules/reservation/queries.ts`: pilih `booking_number`, tambahkan ke `ReservationListItem`, dan perluas `searchCondition` dengan `ilike` nomor booking memakai `escapeLike`; verifikasi `npm run typecheck` lulus. (Admin meninjau reservasi PENDING)
- [x] 5.2 Implementasikan `getReservationConfirmationContext(id)` sesuai design D5: hitung tanggal target, baca kunci milik reservasi lain, baca reservasi tanggal sama dengan pembayaran `DICATAT`/`TERVERIFIKASI`, gabungkan, dan kembalikan `hasDateConflict` tanpa menulis data; verifikasi `npm run typecheck` lulus. (Daftar reservasi bentrok, Tampilan konfirmasi dan pembatalan admin)
- [x] 5.3 Perluas `getReservationDetail` dengan `booking_number` dan `dp_forfeited`; verifikasi `npm run typecheck` lulus. (Tampilan konfirmasi dan pembatalan admin, Admin meninjau reservasi PENDING)
- [x] 5.4 Perbarui `tests/admin-reservation-queries.test.ts` untuk nomor booking pada daftar/detail, pencarian nomor booking di dalam filter, dan nilai `dp_forfeited`; jalankan `npm run test -- tests/admin-reservation-queries.test.ts`. (Admin meninjau reservasi PENDING, Tampilan konfirmasi dan pembatalan admin)
- [x] 5.5 Tulis `tests/reservation-confirmation-queries.test.ts` untuk: reservasi tanggal sama dengan pembayaran tampil; reservasi tanggal sama tanpa pembayaran tidak tampil; kunci setup milik reservasi lain tampil sebagai konflik; kunci manual tanpa `reservation_id` membuat `hasDateConflict` benar meski daftar reservasi kosong; status final tidak tampil; tanggal target dan `hasDateConflict` benar; query tidak mengubah status reservasi lain; jalankan `npm run test -- tests/reservation-confirmation-queries.test.ts`. (Daftar reservasi bentrok)

## 6. Server Action Admin

Catatan apply: Setiap Server Action baru wajib memanggil `requireAdminSession()` sebelum parsing atau menulis. Gunakan Zod dan pola `?galat=` yang ada. Revalidasi halaman ketersediaan hanya untuk konfirmasi dan pembatalan `DITERIMA`. Pemindai statis tidak boleh dilanggar. Tidak ada gerbang yang menghentikan apply di grup ini.

- [x] 6.1 Tambahkan `confirmReservation` dan `cancelAcceptedReservation` di `src/app/admin/reservasi/actions.ts` dengan guard sesi, skema Zod, pemetaan `DP_BELOW_MINIMUM`/`DATE_CONFLICT`, dan revalidasi `/admin`, `/admin/reservasi`, detail, `/admin/kalender`, serta `/reservasi`; verifikasi `npm run typecheck` lulus. (Akses admin untuk konfirmasi dan pembatalan, Syarat konfirmasi reservasi, Pembatalan reservasi DITERIMA)
- [x] 6.2 Perluas `tests/admin-actions-unauthorized.test.ts` dengan `confirmReservation` dan `cancelAcceptedReservation`; jalankan `npm run test -- tests/admin-actions-unauthorized.test.ts tests/static-scanner.test.ts tests/module-boundary.test.ts`. (Akses admin untuk konfirmasi dan pembatalan)
- [x] 6.3 Pastikan pemetaan galat halaman memuat pesan untuk `DP_BELOW_MINIMUM` dan `DATE_CONFLICT` serta tidak menampilkan detail database; verifikasi dengan `npm run typecheck` dan tinjau `?galat=` pada kode aksi. (Syarat konfirmasi reservasi, Akses admin untuk konfirmasi dan pembatalan)

## 7. UI Daftar dan Detail Reservasi

Catatan apply: Ikuti `docs/design/ui-spec.md` 4.2; jangan menambah layar, statistik, atau widget. Angka dan teks berasal dari data nyata. Tombol yang dinonaktifkan hanya bantuan UI; server tetap memeriksa ulang. [BERHENTI] 7.5 menghentikan apply sampai user menyetujui hasil browser.

- [x] 7.1 Perbarui `src/app/admin/reservasi/page.tsx`: tampilkan nomor booking di bawah nama customer bila ada dan ubah placeholder pencarian menjadi “Nama, nomor WhatsApp, atau nomor booking”; verifikasi `npm run typecheck` lulus. (Admin meninjau reservasi PENDING, Tampilan konfirmasi dan pembatalan admin)
- [x] 7.2 Perbarui `src/app/admin/reservasi/[id]/page.tsx`: nomor booking di header, badge DP hangus, panggilan `getReservationConfirmationContext` untuk status yang dapat dikonfirmasi, kartu konfirmasi dengan tanggal target/DP/daftar bentrok/tombol, form pembatalan `DITERIMA` dengan pihak Customer dan alasan, serta pesan galat baru; verifikasi `npm run typecheck` lulus. (Tampilan konfirmasi dan pembatalan admin, Daftar reservasi bentrok, Akses admin untuk konfirmasi dan pembatalan)
- [x] 7.3 Perbarui `tests/admin-reservation.test.tsx` untuk: nomor booking pada daftar/detail; kartu konfirmasi pada PENDING/DITANGGUHKAN; tombol nonaktif saat DP kurang atau tanggal bentrok; daftar bentrok tampil; pesan tanggal terkunci saat `hasDateConflict` benar tanpa baris reservasi; konfirmasi tidak tampil pada DITERIMA/status akhir; form pembatalan DITERIMA dengan pihak Customer; badge DP hangus; dan banner galat baru; jalankan `npm run test -- tests/admin-reservation.test.tsx`. (Tampilan konfirmasi dan pembatalan admin, Daftar reservasi bentrok, Pembatalan reservasi DITERIMA)
- [x] 7.4 Jalankan `npm run lint` dan `npm run typecheck`; verifikasi tidak ada galat sebelum review visual. (Tampilan konfirmasi dan pembatalan admin)
- [x] 7.5 [BERHENTI] Minta user membuka `/admin/reservasi` dan detail: satu PENDING dengan DP cukup tanpa bentrok, satu PENDING dengan DP kurang atau bentrok, satu DITERIMA, dan satu DIBATALKAN dengan DP hangus; bandingkan dengan `docs/design/ui-spec.md` 4.2; berhenti menunggu persetujuan sebelum verifikasi akhir. (Disetujui user dengan instruksi masuk grup 8.)

## 8. Verifikasi Akhir

Catatan apply: Grup ini hanya pemeriksaan integrasi; jangan menambah fitur. Jalankan perintah dengan jalur tes eksplisit dan pastikan tidak ada proses vitest lain yang aktif. Jangan commit ke `main`, jangan push, dan jangan commit `opencode.json`.

- [x] 8.1 Jalankan `npm run lint`; verifikasi tanpa galat. (Seluruh requirement)
- [x] 8.2 Jalankan `npm run typecheck`; verifikasi tanpa galat. (Seluruh requirement)
- [x] 8.3 Jalankan `npm run build`; verifikasi build berhasil dan `/admin`, `/admin/reservasi`, serta `/admin/reservasi/[id]` terbangun. (Tampilan konfirmasi dan pembatalan admin, Admin meninjau reservasi PENDING)
- [x] 8.4 Jalankan `npm run test`; verifikasi seluruh tes lulus terhadap PostgreSQL asli dan tidak ada `skip`/`only`/`todo`. (Seluruh requirement)
- [x] 8.5 Jalankan `openspec validate reservation-confirmation`; verifikasi valid tanpa peringatan. (Seluruh requirement)
- [x] 8.6 Verifikasi `git ls-files` tidak melacak berkas `.env*` selain `.env.example`, dan `git diff --cached --name-only` tidak memuat `opencode.json`; verifikasi juga diff tidak memuat perubahan `date_lock` di luar FK/index yang direncanakan. (NFR-SEC-03, Penguncian tanggal acara dan setup)
- [x] 8.7 Catat hasil akhir V5 dan pastikan tidak ada push ke remote. (Seluruh requirement)

## Pemetaan Requirement ke Tes

| Requirement | Tugas tes utama |
|---|---|
| Syarat konfirmasi reservasi | 3.4, 3.5 |
| Konfirmasi atomik | 3.4, 3.6 |
| Penguncian tanggal acara dan setup | 1.7, 1.9, 3.4, 3.5, 3.6 |
| Nomor booking unik dan counter tahunan | 1.7, 1.8, 2.4, 3.4, 3.6, 4.3 |
| Daftar reservasi bentrok | 5.5, 7.3 |
| Pembatalan reservasi DITERIMA | 1.7, 2.5, 4.2, 4.3, 7.3 |
| Tampilan konfirmasi dan pembatalan admin | 5.4, 7.3, 7.5 |
| Akses admin untuk konfirmasi dan pembatalan | 6.2, 6.3 |
| Admin meninjau reservasi PENDING (delta) | 5.4, 7.3 |

## Hasil Verifikasi

| Kode | Verifikasi | Sumber | Hasil |
| --- | --- | --- | --- |
| V1 | API Drizzle/PostgreSQL yang dipakai design | `node_modules/drizzle-orm/pg-core/db.d.ts:281`; `.../query-builders/select.d.ts:586`; `.../query-builders/insert.d.ts:114-171`; `.../query-builders/delete.d.ts:77`; `.../sql/expressions/conditions.d.ts:169-171`; `.../pg-core/checks.d.ts:18`; `.../pg-core/unique-constraint.d.ts:4`; `.../pg-core/indexes.d.ts:77`; `.../pg-core/columns/common.d.ts:45`; `node_modules/pg-protocol/dist/messages.d.ts:34-49` | Lulus: seluruh API tersedia sesuai design |
| V2 | Preflight dan migrasi | 1.5-1.9; `migrations/0006_*.sql`; `npm run db:migrate` dua kali | Lulus: preflight `orphan_date_lock=0`, `existing_diterima=0`; migrasi `0006_moaning_pyro.sql` memuat seluruh kolom/constraint/FK/index tanpa perubahan di luar design; migrasi dijalankan dua kali dan sukses; tes 1.7-1.9 lulus (37, 37, dan 36 tes) |
| V3 | Transaksi konfirmasi dan pembatalan | 3.6, 3.7, 4.4; tes mutasi dan konkurensi | Lulus: tes mutasi konfirmasi/pembatalan, konkurensi, dan pembatalan reservasi DITERIMA lulus dalam `npm run test` (95 berkas, 401 tes) |
| V4 | Query dan UI | 5.4, 5.5, 7.3, 7.5 | Lulus: tes query bentrok/daftar/detail dan `tests/admin-reservation.test.tsx` lulus; review browser disetujui user saat masuk grup 8 |
| V5 | Integrasi akhir dan batas scope | 8.1-8.7 | Lulus: `lint`, `typecheck`, dan `build` tanpa galat; `/admin`, `/admin/reservasi`, `/admin/reservasi/[id]` terbangun; 95 berkas/401 tes lulus; tidak ada `skip`/`only`/`todo`; `openspec validate` valid; hanya `.env.example` yang terlacak; diff `date_lock` hanya FK/index; `opencode.json` tidak di-commit dan tidak ada push |
