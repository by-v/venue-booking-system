# Tasks

## 1. Skema, Migrasi, dan Tipe Data

Catatan apply: Kerjakan di branch `apply/reschedule`; jangan commit `opencode.json` dan jangan push. Perubahan database hanya lewat migrasi Drizzle. Tidak ada backfill manual karena `reschedule_count` memakai default 0. Tes skema memakai PostgreSQL asli. Tidak ada gerbang yang menghentikan apply selama API tersedia sesuai design.

- [x] 1.1 [GERBANG] Verifikasi API terpasang yang dipakai design: `db.transaction`, `.for("update")`, `unique`, `check`, `integer`, `date`, `references`, `onDelete`, dan `isUniqueViolation`; tulis path/baris ke Hasil Verifikasi V1; jika bertentangan dengan design, berhenti dan tanyakan user. (Perpindahan tanggal atomik, Riwayat reschedule)
- [x] 1.2 Tambahkan `rescheduleCount` pada `src/lib/db/reservation-schema.ts` sebagai integer not null default 0 dengan check 0/1, dan tabel `reschedule_history` sesuai design D1: id, reservation_id unik dengan FK restrict, old_event_date, new_event_date, actor_user_id FK set null, created_at, serta check tanggal lama berbeda; verifikasi `npm run typecheck` lulus. (Jatah dan status reschedule, Riwayat reschedule)
- [x] 1.3 Jalankan `npm run db:generate` untuk membuat migrasi `0008_*.sql`; periksa SQL dan pastikan hanya memuat kolom, check, tabel, FK, unique, dan index yang dirancang. (Jatah dan status reschedule, Riwayat reschedule)
- [x] 1.4 Jalankan `npm run db:migrate` dua kali; verifikasi migrasi pertama berhasil dan migrasi kedua tidak mengubah apa pun. (Jatah dan status reschedule)
- [x] 1.5 Tulis `tests/reservation-reschedule-schema.test.ts` terhadap PostgreSQL asli untuk: default `reschedule_count = 0`, penolakan nilai selain 0/1, unique `reservation_id` pada riwayat, FK reservasi, dan check `old_event_date <> new_event_date`; jalankan `npm run test -- tests/reservation-reschedule-schema.test.ts`. (Jatah dan status reschedule, Riwayat reschedule)
- [x] 1.6 Perluas `tests/helpers/seed-reservation.ts` bila diperlukan agar dapat membuat reservasi `DITERIMA` dengan kunci tanggal dan `reschedule_count = 0`; jalankan ulang tes 1.5. (Jatah dan status reschedule)

## 2. Aturan Tanggal dan Validasi Input

Catatan apply: Fungsi tanggal harus murni, memakai string `YYYY-MM-DD`, dan tidak menyentuh database. Batas satu bulan kalender memakai aturan hari terakhir bulan tujuan sesuai design D2. Tidak ada gerbang yang menghentikan apply di grup ini.

- [x] 2.1 Tambahkan `subtractOneCalendarMonth` di `src/modules/availability/dates.ts` sesuai design D2, termasuk klamp ke hari terakhir bulan tujuan; verifikasi `npm run typecheck` lulus. (Batas waktu permintaan reschedule)
- [x] 2.2 Tambahkan `src/modules/reservation/reschedule.ts` berisi `rescheduleDeadline`, `isRescheduleDeadlinePassed`, dan `canReschedule` sesuai design D2; verifikasi `npm run typecheck` lulus. (Batas waktu permintaan reschedule, Jatah dan status reschedule)
- [x] 2.3 Tulis `tests/reservation-reschedule-dates.test.ts` untuk: batas inklusif, penolakan setelah batas, akhir bulan 31 Maret ke 28/29 Februari, tahun kabisat, dan `canReschedule` untuk status/jatah/batas; jalankan `npm run test -- tests/reservation-reschedule-dates.test.ts`. (Batas waktu permintaan reschedule, Jatah dan status reschedule)
- [x] 2.4 Tambahkan `reservationRescheduleSchema` di `src/modules/reservation/schema.ts` untuk `reservationId` dan `newEventDate` dengan format `YYYY-MM-DD` serta validasi tanggal nyata; verifikasi `npm run typecheck` lulus. (Ketersediaan tanggal baru)
- [x] 2.5 Tulis `tests/reservation-reschedule-schema.test.ts` untuk input valid, format salah, tanggal tidak nyata, dan field wajib; jalankan `npm run test -- tests/reservation-reschedule-schema.test.ts`. (Ketersediaan tanggal baru)
- [x] 2.6 Jalankan `npm run typecheck` setelah grup ini selesai. (Batas waktu permintaan reschedule, Ketersediaan tanggal baru)

## 3. Mutasi Reschedule Atomik

Catatan apply: Semua langkah mutasi harus berada dalam satu `db.transaction`. Row lock reservasi wajib diambil sebelum validasi. Penolakan tidak boleh menulis apa pun. Tes memakai PostgreSQL asli dan tidak boleh memakai `skip`, `only`, atau `todo`. Tidak ada gerbang yang menghentikan apply di grup ini.

- [x] 3.1 Tambahkan `reschedule_count` pada select dan nilai kembalian `lockReservation` di `src/modules/reservation/mutations.ts`; verifikasi `npm run typecheck` lulus. (Jatah dan status reschedule)
- [x] 3.2 Implementasikan `rescheduleReservation` di `src/modules/reservation/mutations.ts` sesuai design D3: lock reservasi, validasi status/jatah/batas/tanggal baru, cek konflik dengan mengecualikan kunci sendiri, hapus kunci lama, insert kunci baru, update tanggal dan jatah, insert riwayat reschedule, riwayat status DITERIMA→DITERIMA, dan aktivitas substantif; verifikasi `npm run typecheck` lulus. (Perpindahan tanggal atomik, Riwayat reschedule)
- [x] 3.3 Tulis `tests/reservation-reschedule-mutations.test.ts` untuk jalur berhasil: kunci lama hilang, kunci acara dan setup baru ada, tanggal berubah, status tetap `DITERIMA`, nomor booking sama, `reschedule_count = 1`, riwayat reschedule/status/aktivitas tercatat; jalankan `npm run test -- tests/reservation-reschedule-mutations.test.ts`. (Perpindahan tanggal atomik, Riwayat reschedule)
- [x] 3.4 Perluas tes 3.3 untuk penolakan: status selain `DITERIMA`, jatah sudah habis, melewati batas, tanggal baru lewat/hari ini/sama, tanggal acara baru terkunci, dan tanggal setup baru terkunci; verifikasi tidak ada kunci, tanggal, jatah, nomor booking, atau riwayat yang berubah. (Jatah dan status reschedule, Batas waktu permintaan reschedule, Ketersediaan tanggal baru)
- [x] 3.5 Tulis `tests/reservation-reschedule-concurrency.test.ts` mengikuti pola `tests/reservation-confirmation-concurrency.test.ts`: dua reschedule bersamaan untuk reservasi yang sama, tepat satu berhasil, yang kalah tidak meninggalkan kunci tambahan atau jatah ganda; jalankan tes tersebut. (Reschedule bersamaan, Perpindahan tanggal atomik)
- [x] 3.6 Tambahkan tes atomisitas untuk dua reschedule bersamaan ke tanggal baru yang berbeda: hanya kunci tanggal dari pemenang yang tersisa dan data reservasi konsisten; jalankan ulang tes konkurensi. (Perpindahan tanggal atomik, Reschedule bersamaan)
- [x] 3.7 Jalankan `npm run typecheck` dan seluruh tes grup ini; verifikasi tanpa `skip`/`only`/`todo`. (Perpindahan tanggal atomik, Reschedule bersamaan, Riwayat reschedule)

## 4. Query dan Aksi Admin

Catatan apply: Aksi wajib memanggil `requireAdminSession()` sebelum parsing. Gunakan pola `runReservationAction` yang sudah ada. Jangan menambah rute publik. Tidak ada gerbang yang menghentikan apply di grup ini.

- [x] 4.1 Tambahkan `rescheduleCount` pada `ReservationDetail` di `src/modules/reservation/types.ts` dan pada select `getReservationDetail` di `src/modules/reservation/queries.ts`; verifikasi `npm run typecheck` lulus. (Tampilan dan akses reschedule admin)
- [x] 4.2 Tambahkan kode `RESCHEDULE_LIMIT_REACHED` dan `RESCHEDULE_DEADLINE_PASSED` di `src/modules/reservation/errors.ts`; verifikasi `npm run typecheck` lulus. (Jatah dan status reschedule, Batas waktu permintaan reschedule)
- [x] 4.3 Tambahkan Server Action `rescheduleReservation` di `src/app/admin/reservasi/actions.ts` sesuai design D4: sesi admin, parse schema, panggil mutasi, revalidasi halaman terkait, dan petakan galat ke `?galat=`; verifikasi `npm run typecheck` lulus. (Tampilan dan akses reschedule admin, Perpindahan tanggal atomik)
- [x] 4.4 Tambahkan pesan galat reschedule pada `ERROR_MESSAGES` di `src/app/admin/reservasi/[id]/page.tsx`; verifikasi `npm run typecheck` lulus. (Jatah dan status reschedule, Batas waktu permintaan reschedule)
- [x] 4.5 Tulis/perluas tes aksi admin untuk: pengguna tanpa sesi dialihkan ke `/login`, input tidak valid menghasilkan galat, dan aksi yang berhasil memanggil mutasi dengan `actorUserId` sesi; jalankan tes tersebut. (Tampilan dan akses reschedule admin)
- [x] 4.6 Perluas `tests/admin-reservation-queries.test.ts` untuk memastikan `rescheduleCount` terbaca pada detail reservasi dan tidak bocor ke query publik; jalankan tes tersebut. (Tampilan dan akses reschedule admin, Riwayat reschedule)

## 5. UI Detail Reservasi dan Review Browser

Catatan apply: Tidak ada layar baru. Form ditempatkan pada halaman detail reservasi yang sudah ada sesuai design D5. Form hanya untuk `DITERIMA`; jatah habis atau batas lewat ditampilkan sebagai pesan, bukan form aktif. [BERHENTI] 5.5 menghentikan apply sampai user menyetujui hasil browser.

- [x] 5.1 Tambahkan kartu **Reschedule** pada `src/app/admin/reservasi/[id]/page.tsx` sesuai design D5: tanggal acara saat ini, batas permintaan, sisa jatah, input tanggal baru, dan tombol "Pindahkan tanggal"; verifikasi `npm run typecheck` lulus. (Tampilan dan akses reschedule admin)
- [x] 5.2 Tampilkan pesan "Reschedule sudah digunakan" saat jatah habis dan "Batas reschedule sudah lewat" saat deadline lewat; pastikan form tidak tampil untuk status selain `DITERIMA`; verifikasi `npm run typecheck` lulus. (Jatah dan status reschedule, Batas waktu permintaan reschedule)
- [x] 5.3 Perluas `tests/admin-reservation.test.tsx` untuk: form tampil pada `DITERIMA` dengan jatah 1, pesan jatah habis, pesan batas lewat, dan form tidak tampil pada status lain; jalankan `npm run test -- tests/admin-reservation.test.tsx`. (Tampilan dan akses reschedule admin)
- [x] 5.4 Perluas `tests/static-scanner.test.ts` atau `tests/module-boundary.test.ts` bila diperlukan untuk memastikan tidak ada form reschedule publik dan halaman publik tidak mengimpor aksi admin; jalankan tes terkait. (Tampilan dan akses reschedule admin)
- [x] 5.5 [BERHENTI] Minta user membuka detail reservasi `DITERIMA` dan memeriksa: tanggal saat ini, batas permintaan, sisa jatah, form tanggal baru, hasil setelah reschedule, pesan jatah habis, dan pesan batas lewat; bandingkan dengan design D5. Berhenti menunggu persetujuan sebelum verifikasi akhir. (Tampilan dan akses reschedule admin)
- [x] 5.6 Setelah review disetujui, catat aksi reschedule pada `docs/design/ui-spec.md` 4.2 (Reservasi) dan tabel penyesuaian bila diperlukan; pastikan tidak menambah layar baru. (Tampilan dan akses reschedule admin)

## 6. Verifikasi Akhir

Catatan apply: Grup ini hanya pemeriksaan integrasi; jangan menambah fitur. Jalankan perintah dengan jalur tes eksplisit dan pastikan tidak ada proses vitest lain yang aktif. Jangan commit ke `main`, jangan push, dan jangan commit `opencode.json`.

- [x] 6.1 Jalankan `npm run lint`; verifikasi tanpa galat. (Seluruh requirement)
- [x] 6.2 Jalankan `npm run typecheck`; verifikasi tanpa galat. (Seluruh requirement)
- [x] 6.3 Jalankan `npm run build`; verifikasi build berhasil dan halaman detail reservasi tetap terbangun. (Perpindahan tanggal atomik, Tampilan dan akses reschedule admin)
- [x] 6.4 Jalankan `npm run test`; verifikasi seluruh tes lulus terhadap PostgreSQL asli dan tidak ada `skip`/`only`/`todo`. (Seluruh requirement)
- [x] 6.5 Jalankan `openspec validate reschedule`; verifikasi valid tanpa peringatan. (Seluruh requirement)
- [x] 6.6 Verifikasi `git ls-files` tidak melacak berkas `.env*` selain `.env.example`, dan `git diff --cached --name-only` tidak memuat `opencode.json`. (NFR-SEC-03, Tampilan dan akses reschedule admin)
- [x] 6.7 Catat hasil akhir V1-V6 dan pastikan tidak ada push ke remote. (Seluruh requirement)

## Pemetaan Requirement ke Tes

| Requirement | Tugas tes utama |
|---|---|
| Jatah dan status reschedule | 1.2, 1.5, 2.2, 2.3, 3.1, 3.4, 4.2, 4.4, 5.2, 5.3 |
| Batas waktu permintaan reschedule | 2.1, 2.2, 2.3, 3.4, 4.2, 4.4, 5.2, 5.3 |
| Ketersediaan tanggal baru | 2.4, 2.5, 3.2, 3.4 |
| Perpindahan tanggal atomik | 1.1, 3.2, 3.3, 3.5, 3.6, 3.7, 6.3 |
| Reschedule bersamaan | 3.5, 3.6, 3.7 |
| Riwayat reschedule | 1.1, 1.2, 1.5, 3.2, 3.3, 4.6 |
| Tampilan dan akses reschedule admin | 4.1, 4.3, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.6 |

## Hasil Verifikasi

| Kode | Verifikasi | Sumber | Hasil |
| --- | --- | --- | --- |
| V1 | API yang dipakai design | `node_modules` terpasang | Sesuai design: `db.transaction` di `drizzle-orm/pg-core/db.d.ts:281`; `.for` di `pg-core/query-builders/select.d.ts:586`; `unique` di `pg-core/unique-constraint.d.ts:4`; `check` di `pg-core/checks.d.ts:18`; `integer` di `pg-core/columns/integer.d.ts:23`; `date` di `pg-core/columns/date.d.ts:45`; `references` di `pg-core/columns/common.d.ts:45`; `onDelete` di `pg-core/foreign-keys.d.ts:19`; `isUniqueViolation` lokal di `src/modules/reservation/mutations.ts:103`. |
| V2 | Skema dan migrasi | `npm run db:generate`; `npm run db:migrate`; `tests/reservation-reschedule-schema.test.ts` | Lulus. Migrasi `0008_bizarre_polaris.sql` dibuat dan diperiksa; migrasi diterapkan dua kali berhasil; 5 tes constraint lulus terhadap PostgreSQL uji. |
| V3 | Aturan tanggal dan validasi input | `tests/reservation-reschedule-dates.test.ts`; `tests/reservation-reschedule-schema.test.ts` | Lulus. 6 tes aturan tanggal dan 9 tes skema input/constraint lulus terhadap PostgreSQL uji. |
| V4 | Mutasi dan konkurensi | `tests/reservation-reschedule-mutations.test.ts`; `tests/reservation-reschedule-concurrency.test.ts` | Lulus. 7 tes mutasi dan 2 tes konkurensi lulus; total 24 tes grup 2-3 lulus, tanpa `skip`/`only`/`todo`. |
| V5 | Query, aksi, dan UI | `tests/admin-reservation-queries.test.ts`; tes aksi admin; `tests/admin-reservation.test.tsx`; review browser user | Lulus. Query/aksi/UI otomatis lulus; review browser user disetujui dan `docs/design/ui-spec.md` 4.2 diperbarui tanpa layar baru. |
| V6 | Integrasi akhir dan batas scope | `npm run lint`; `npm run typecheck`; `npm run build`; `npm run test`; `openspec validate reschedule`; pemeriksaan git | Lulus. Lint dan typecheck tanpa galat; build Next.js berhasil dan `/admin/reservasi/[id]` tetap terbangun; 107 berkas/484 tes lulus; `openspec validate reschedule` valid; hanya `.env.example` yang terlacak dari `.env*`; `opencode.json` tidak di-commit; branch `apply/reschedule`, tanpa push. |
