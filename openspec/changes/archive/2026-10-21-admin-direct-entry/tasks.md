# Tasks

## 1. Skema, Constraint, dan Migrasi Sumber Reservasi

Catatan apply: Kerjakan di branch `apply/admin-direct-entry`; jangan commit `opencode.json` dan jangan push. Hanya ubah skema lewat Drizzle. Jangan menulis data ke database dev selain migrasi. Tidak ada gerbang yang menghentikan apply selama API tersedia sesuai design.

- [x] 1.1 [GERBANG] Verifikasi API terpasang yang dipakai design: `db.transaction`, `.for("update")`, `.onConflictDoUpdate()`, `.returning()`, `check()`, dan `pgTable()`; tulis path/baris ke Hasil Verifikasi V1; jika bertentangan dengan design, berhenti dan tanyakan user. (Sumber reservasi tercatat dan dapat dibedakan, Input reservasi langsung oleh admin)
- [x] 1.2 Perbarui `src/lib/db/reservation-schema.ts`: tambahkan kolom `source` text not null default `'FORM_PUBLIK'` dan check `reservation_source`; tambahkan `RESERVATION_SOURCES` dan tipe `ReservationSource` di `src/modules/reservation/types.ts`; verifikasi `npm run typecheck` lulus. (Sumber reservasi tercatat dan dapat dibedakan)
- [x] 1.3 Jalankan `npm run db:generate`; verifikasi migrasi `migrations/0007_*.sql` hanya menambah kolom `source` dengan default dan check `reservation_source`, tanpa mengubah tabel/kolom/constraint lain di luar design. (Sumber reservasi tercatat dan dapat dibedakan)
- [x] 1.4 Jalankan `npm run db:migrate` dua kali; verifikasi kedua eksekusi sukses dan migrasi tercatat idempoten. (Sumber reservasi tercatat dan dapat dibedakan)
- [x] 1.5 Perbarui `tests/reservation-schema.test.ts` untuk: baris baru tanpa `source` memakai default `FORM_PUBLIK`, nilai `FORM_PUBLIK` dan `INPUT_ADMIN` diterima, nilai lain ditolak check; jalankan `npm run test -- tests/reservation-schema.test.ts tests/schema-diff.test.ts`. (Sumber reservasi tercatat dan dapat dibedakan)

## 2. Tipe, Skema Input, dan Mutasi Input Admin

Catatan apply: Mutasi domain tidak memanggil `requireAdminSession`; proteksi sesi dilakukan Server Action. Jangan menduplikasi logika `submitReservation`; pakai helper bersama sesuai design D3. Tes memakai PostgreSQL asli. Tidak ada gerbang yang menghentikan apply di grup ini.

- [x] 2.1 Perluas `src/modules/reservation/types.ts`: tambahkan `source: ReservationSource` ke `ReservationListItem` dan `ReservationDetail`; verifikasi `npm run typecheck` lulus. (Sumber reservasi tercatat dan dapat dibedakan)
- [x] 2.2 Tambahkan `adminReservationInputSchema` dan tipe `AdminReservationInput` di `src/modules/reservation/schema.ts` sesuai design D5 (field sama dengan form publik ditambah `accept` boolean default `false`); verifikasi `npm run typecheck` lulus. (Input reservasi langsung oleh admin)
- [x] 2.3 Ekstrak helper privat bersama (mis. `persistReservation`) di `src/modules/reservation/mutations.ts` dari `submitReservation` dan set `source: "FORM_PUBLIK"` eksplisit; jalankan `npm run test -- tests/reservation-route.test.ts tests/reservation-mutations.test.ts` untuk memastikan perilaku pengajuan publik tidak berubah. (Pembuatan customer CALON dan reservasi PENDING, Sumber reservasi tercatat dan dapat dibedakan)
- [x] 2.4 Implementasikan `createAdminReservation(input & { actorUserId })` memakai helper 2.3 dengan `source: "INPUT_ADMIN"`, `actorType: "ADMIN"`, riwayat `Input admin langsung`, dan aktivitas `SUBMISSION` substantif; verifikasi `npm run typecheck` lulus. (Input reservasi langsung oleh admin, Konfirmasi langsung setelah input admin)
- [x] 2.5 Tulis `tests/reservation-admin-direct-entry-schema.test.ts` untuk validasi field wajib, normalisasi WhatsApp, jenis acara/paket, format tanggal, default `accept`, dan batas panjang catatan; jalankan `npm run test -- tests/reservation-admin-direct-entry-schema.test.ts`. (Input reservasi langsung oleh admin)
- [x] 2.6 Tulis `tests/reservation-admin-direct-entry-mutations.test.ts` untuk: input valid membuat customer `CALON` dan reservasi `PENDING` bersumber `INPUT_ADMIN` tanpa nomor booking/`date_lock`; nomor WhatsApp sama memakai customer yang sama tanpa menurunkan status `CLIENT`; paket nonaktif, tanggal lampau, dan tanggal acara/setup terkunci ditolak tanpa menulis data; riwayat `(baru) → PENDING` dan aktivitas memakai pelaku `ADMIN`; perluas `tests/helpers/seed-reservation.ts` bila diperlukan; jalankan `npm run test -- tests/reservation-admin-direct-entry-mutations.test.ts`. (Input reservasi langsung oleh admin, Konfirmasi langsung setelah input admin)

## 3. Query Sumber pada Daftar dan Detail

Catatan apply: Query hanya membaca dan tidak mengubah status reservasi lain. Tes memakai PostgreSQL asli. Tidak ada gerbang yang menghentikan apply di grup ini.

- [x] 3.1 Perbarui `listReservations` di `src/modules/reservation/queries.ts` untuk memilih `source` dan mengembalikannya pada `ReservationListItem`; verifikasi `npm run typecheck` lulus. (Sumber reservasi tercatat dan dapat dibedakan)
- [x] 3.2 Perbarui `getReservationDetail` untuk memilih `source` dan mengembalikannya pada `ReservationDetail`; verifikasi `npm run typecheck` lulus. (Sumber reservasi tercatat dan dapat dibedakan)
- [x] 3.3 Perbarui `tests/admin-reservation-queries.test.ts` untuk memverifikasi sumber `FORM_PUBLIK` dan `INPUT_ADMIN` tampil pada daftar dan detail tanpa mengubah filter/pencarian; jalankan `npm run test -- tests/admin-reservation-queries.test.ts`. (Sumber reservasi tercatat dan dapat dibedakan)

## 4. Server Action Input Langsung

Catatan apply: Server Action baru wajib memanggil `requireAdminSession()` sebelum parsing atau menulis. Gunakan Zod dan pola `?galat=` yang ada. "Simpan & Terima" memakai ulang `confirmReservation` yang ada; jangan menduplikasi logika konfirmasi. Tidak ada gerbang yang menghentikan apply di grup ini.

- [x] 4.1 Tambahkan `createAdminReservation(formData)` di `src/app/admin/reservasi/actions.ts` sesuai design D7: guard sesi, konversi `accept` eksplisit, panggil mutasi 2.4, panggil `confirmReservation` bila `accept`, revalidasi `/admin`, `/admin/reservasi`, detail, serta `/admin/kalender` dan `/reservasi` bila menerima, lalu arahkan ke detail atau kembali ke form dengan `?galat=`; verifikasi `npm run typecheck` lulus. (Input reservasi langsung oleh admin, Konfirmasi langsung setelah input admin, Akses admin untuk input langsung)
- [x] 4.2 Pastikan kegagalan konfirmasi (`DP_BELOW_MINIMUM`, `DATE_CONFLICT`, `INVALID_STATE`) meninggalkan reservasi `PENDING` tanpa nomor booking/kunci dan diarahkan ke detail dengan pesan Indonesia; verifikasi dengan `npm run typecheck` dan tinjau kode pemetaan `?galat=`. (Konfirmasi langsung setelah input admin)
- [x] 4.3 Perluas `tests/admin-actions-unauthorized.test.ts` dengan `createAdminReservation`; jalankan `npm run test -- tests/admin-actions-unauthorized.test.ts tests/static-scanner.test.ts tests/module-boundary.test.ts`. (Akses admin untuk input langsung)

## 5. UI Form Input Langsung dan Tampilan Sumber

Catatan apply: Ikuti `docs/design/ui-spec.md`; jangan menambah layar, statistik, atau widget di luar tombol input dan form yang dirujuk BR-31. Angka dan teks berasal dari data nyata. Halaman baru wajib memanggil `requireAdminSession()`. [BERHENTI] 5.6 menghentikan apply sampai user menyetujui hasil browser.

- [x] 5.1 Perbarui `src/app/admin/reservasi/page.tsx`: tambah tombol "Input reservasi" menuju `/admin/reservasi/baru` dan tampilkan label sumber pada tabel; verifikasi `npm run typecheck` lulus. (Sumber reservasi tercatat dan dapat dibedakan)
- [x] 5.2 Tambahkan halaman `src/app/admin/reservasi/baru/page.tsx` (guard sesi, paket aktif, tanggal hari ini WIB) dan komponen klien `direct-entry-form.tsx` dengan field nama, WhatsApp, alamat, jenis acara, paket, tanggal, catatan, dua tombol "Simpan sebagai PENDING" dan "Simpan & Terima", serta banner `?galat=`; verifikasi `npm run typecheck` lulus. (Input reservasi langsung oleh admin, Akses admin untuk input langsung)
- [x] 5.3 Tampilkan sumber reservasi pada header/ringkasan detail `src/app/admin/reservasi/[id]/page.tsx`; verifikasi `npm run typecheck` lulus. (Sumber reservasi tercatat dan dapat dibedakan)
- [x] 5.4 Perbarui `tests/admin-reservation.test.tsx` untuk: tombol input pada daftar; label sumber pada daftar dan detail; form input langsung tampil dengan dua tombol; banner galat; jalankan `npm run test -- tests/admin-reservation.test.tsx`. (Input reservasi langsung oleh admin, Sumber reservasi tercatat dan dapat dibedakan, Akses admin untuk input langsung)
- [x] 5.5 Jalankan `npm run lint` dan `npm run typecheck`; verifikasi tidak ada galat sebelum review visual. (Input reservasi langsung oleh admin)
- [x] 5.6 [BERHENTI] Minta user membuka `/admin/reservasi`, `/admin/reservasi/baru`, dan detail: input admin yang tersimpan `PENDING` tampil bersumber "Input admin", pengajuan publik lama tampil "Form publik", dan "Simpan & Terima" tanpa DP cukup tetap menyimpan `PENDING`; bandingkan dengan `docs/design/ui-spec.md`; berhenti menunggu persetujuan sebelum verifikasi akhir. (Sumber reservasi tercatat dan dapat dibedakan, Konfirmasi langsung setelah input admin)

## 6. Verifikasi Akhir

Catatan apply: Grup ini hanya pemeriksaan integrasi; jangan menambah fitur. Jalankan perintah dengan jalur tes eksplisit dan pastikan tidak ada proses vitest lain yang aktif. Jangan commit ke `main`, jangan push, dan jangan commit `opencode.json`.

- [x] 6.1 Jalankan `npm run lint`; verifikasi tanpa galat. (Seluruh requirement)
- [x] 6.2 Jalankan `npm run typecheck`; verifikasi tanpa galat. (Seluruh requirement)
- [x] 6.3 Jalankan `npm run build`; verifikasi build berhasil dan `/admin/reservasi/baru` serta rute admin yang ada terbangun. (Input reservasi langsung oleh admin, Akses admin untuk input langsung)
- [x] 6.4 Jalankan `npm run test`; verifikasi seluruh tes lulus terhadap PostgreSQL asli dan tidak ada `skip`/`only`/`todo`. (Seluruh requirement)
- [x] 6.5 Jalankan `openspec validate admin-direct-entry`; verifikasi valid tanpa peringatan. (Seluruh requirement)
- [x] 6.6 Verifikasi `git ls-files` tidak melacak berkas `.env*` selain `.env.example`, dan `git diff --cached --name-only` tidak memuat `opencode.json`; verifikasi juga diff migrasi hanya menambah kolom `source` dan check `reservation_source`. (NFR-SEC-03, Sumber reservasi tercatat dan dapat dibedakan)
- [x] 6.7 Catat hasil akhir V2-V5 dan pastikan tidak ada push ke remote. (Seluruh requirement)

## Pemetaan Requirement ke Tes

| Requirement | Tugas tes utama |
|---|---|
| Input reservasi langsung oleh admin | 2.2, 2.4, 2.5, 2.6, 5.4 |
| Konfirmasi langsung setelah input admin | 2.4, 2.6, 4.2, 5.6 |
| Sumber reservasi tercatat dan dapat dibedakan | 1.2, 1.5, 2.1, 3.3, 5.1, 5.3, 5.4 |
| Akses admin untuk input langsung | 4.1, 4.3, 5.2 |
| Pembuatan customer CALON dan reservasi PENDING (delta) | 1.2, 2.3, 3.3 |

## Hasil Verifikasi

| Kode | Verifikasi | Sumber | Hasil |
| --- | --- | --- | --- |
| V1 | API Drizzle/PostgreSQL yang dipakai design | `node_modules/drizzle-orm/pg-core/db.d.ts:281`; `.../query-builders/select.d.ts:586`; `.../query-builders/insert.d.ts:114` (dan interface `onConflictDoUpdate` mulai baris 61); `.../pg-core/checks.d.ts:18`; `.../pg-core/table.d.ts:94` | Lulus: seluruh API tersedia sesuai design |
| V2 | Skema, constraint, dan migrasi | 1.2-1.5; `migrations/0007_stormy_morbius.sql`; `npm run db:migrate` dua kali | Lulus: migrasi hanya menambah kolom `source` default `FORM_PUBLIK` dan check `reservation_source`; `db:migrate` sukses dua kali; `npm run typecheck` lulus; tes skema 2 berkas/28 tes lulus |
| V3 | Mutasi dan skema input admin | 2.2-2.6; `tests/reservation-admin-direct-entry-schema.test.ts`; `tests/reservation-admin-direct-entry-mutations.test.ts`; `tests/reservation-route.test.ts`; `tests/reservation-mutations.test.ts` | Lulus: `npm run typecheck` lulus; tes skema input admin 11 tes lulus; tes mutasi input admin 6 tes lulus; tes publik 2 berkas/17 tes lulus (perilaku `submitReservation` tidak berubah) |
| V4 | Query sumber dan UI | 3.3, 5.4, 5.6 | Lulus: tes query 7 tes lulus; tes UI admin 20 tes lulus; tampilan sumber dan dua tombol telah ditinjau user di browser dan disetujui |
| V5 | Integrasi akhir dan batas scope | 6.1-6.7 | Lulus: `npm run lint` dan `npm run typecheck` bersih; `npm run build` berhasil termasuk rute `/admin/reservasi/baru`; `npm run test` 97 berkas/427 tes lulus tanpa skip/only/todo; `openspec validate admin-direct-entry` valid; hanya `.env.example` terlacak, tidak ada `opencode.json` di-commit; migrasi hanya menambah kolom `source` + check; tidak ada push |
