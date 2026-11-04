# Tasks

## 1. Skema dan Migrasi Tabel Reservasi

Catatan apply: Tulis/migrasi hanya lewat `npm run db:generate` dan `npm run db:migrate`; tes skema memakai PostgreSQL asli lewat harness yang sudah ada. Change ini tidak punya seed: jangan menulis data ke database dev. Jangan mengubah `date_lock`. Gerbang 1.1 gagal berarti berhenti dan bertanya.

- [x] 1.1 [GERBANG] Verifikasi API Drizzle terpasang yang dipakai design: `text`, `integer`, `boolean`, `date(name, { mode: "string" })`, `timestamp`, `check(name, sql)`, `unique(name).on(column)`, `references(..., { onDelete })`, `onConflictDoUpdate`, `ilike`, dan `db.transaction`; tulis sumber file dan baris ke Hasil Verifikasi (V1); jika hasilnya bertentangan dengan design, berhenti dan tanyakan user. (Pembuatan customer CALON dan reservasi PENDING)
- [x] 1.2 Buat `src/lib/db/reservation-schema.ts` dengan tabel `customer`, `reservation`, `reservation_status_history`, `reservation_activity`, `reservation_item`, dan `submission_rate_limit` sesuai design D1; ekspor dari `src/lib/db/schema.ts`; verifikasi `npm run typecheck` lulus. (Pembuatan customer CALON dan reservasi PENDING)
- [x] 1.3 Jalankan `npm run db:generate`; verifikasi berkas `migrations/0004_*.sql` memuat unique `customer.whatsapp`, seluruh `CHECK` status/tipe/amount, FK yang diminta, dan **tidak** mengubah `date_lock`. (Pembuatan customer CALON dan reservasi PENDING)
- [x] 1.4 Jalankan `npm run db:migrate` dua kali; verifikasi kedua eksekusi sukses (idempoten). (Pembuatan customer CALON dan reservasi PENDING)
- [x] 1.5 Verifikasi constraint terhadap PostgreSQL asli dengan menulis `tests/reservation-schema.test.ts` (WhatsApp duplikat ditolak; status/tipe/amount di luar daftar ditolak; FK `restrict` menolak hapus customer/paket yang masih dirujuk; `date_lock` tidak berubah) lalu jalankan `npm run test -- tests/reservation-schema.test.ts`. (Pembuatan customer CALON dan reservasi PENDING, Satu customer per nomor WhatsApp)

## 2. Modul Domain Reservasi

Catatan apply: Aturan bisnis hanya di `src/modules/reservation/`, tidak mengimpor `src/app` (dijaga tes boundary). Fungsi murni diuji tanpa database; query dan mutasi diuji terhadap PostgreSQL asli. Jangan menambah dependensi. Jangan menulis `date_lock`, nomor booking, atau item biaya.

- [x] 2.1 Buat `src/modules/reservation/types.ts` (status customer/reservasi, tipe aktor/aktivitas, `PackageSummary` reservasi, `ReservationListItem`, `ReservationDetail`), `phone.ts` (`normalizeWhatsApp`), dan `pricing.ts` (`estimateMinimumDp`); verifikasi `npm run typecheck` lulus. (Form pengajuan reservasi publik, Pembuatan customer CALON dan reservasi PENDING)
- [x] 2.2 Verifikasi fungsi murni dengan menulis `tests/reservation-phone.test.ts` dan `tests/reservation-pricing.test.ts` (`08`, `+62`, `62`, `8` menjadi `62...`; nomor tidak valid ditolak; DP minimum 25% dibulatkan ke atas) lalu jalankan kedua berkas dengan `npm run test -- tests/reservation-phone.test.ts tests/reservation-pricing.test.ts`. (Form pengajuan reservasi publik, Pembuatan customer CALON dan reservasi PENDING)
- [x] 2.3 Buat `src/modules/reservation/schema.ts` (`reservationSubmissionSchema` dan `followUpNoteSchema`) sesuai design D2/D3; verifikasi `npm run typecheck` lulus. (Form pengajuan reservasi publik, Validasi tanggal dan paket pengajuan, Catatan tindak lanjut admin tercatat sebagai aktivitas)
- [x] 2.4 Buat `src/modules/reservation/rate-limit.ts` (`consumeSubmissionLimit`) dan `request-ip.ts` (`getClientIp` + hash) sesuai design D5; verifikasi `npm run typecheck` lulus. (Pembatas laju pengajuan form publik)
- [x] 2.5 Verifikasi pembatas laju terhadap PostgreSQL asli dengan menulis `tests/reservation-rate-limit.test.ts` (permintaan ke-6 dalam jendela ditolak; sumber lain tetap lolos; jendela kedaluwarsa mereset hitungan) lalu jalankan `npm run test -- tests/reservation-rate-limit.test.ts`. (Pembatas laju pengajuan form publik)
- [x] 2.6 Buat `src/modules/reservation/queries.ts` (`listPendingReservations`, `getReservationDetail`) dan `mutations.ts` (`submitReservation`, `addFollowUpNote`) serta `errors.ts` sesuai design D4/D9; verifikasi `npm run typecheck` lulus. (Pembuatan customer CALON dan reservasi PENDING, Admin meninjau reservasi PENDING, Catatan tindak lanjut admin tercatat sebagai aktivitas)
- [x] 2.7 Verifikasi query dan mutasi terhadap PostgreSQL asli dengan menulis `tests/reservation-mutations.test.ts` dan `tests/admin-reservation-queries.test.ts` (customer baru + PENDING + riwayat + aktivitas; nomor dinormalisasi memakai satu customer; pengajuan ulang membuat reservasi baru; snapshot harga tetap setelah paket diubah; tanggal terkunci/setup terkunci/hari ini/lampau/paket nonaktif ditolak; PENDING tidak menulis `date_lock`; catatan admin tercatat sebagai aktivitas; pencarian nama/WhatsApp hanya PENDING) lalu jalankan kedua berkas dengan `npm run test -- tests/reservation-mutations.test.ts tests/admin-reservation-queries.test.ts`. (Pembuatan customer CALON dan reservasi PENDING, Validasi tanggal dan paket pengajuan, Admin meninjau reservasi PENDING, Catatan tindak lanjut admin tercatat sebagai aktivitas)

## 3. Koreksi Ketersediaan Hari Ini

Catatan apply: Grup ini menyelaraskan BR-26 dengan change 3 dan mengubah dua berkas tes lama. Tidak ada perubahan skema. Gerbang 3.1 tidak menghentikan apply selama default roadmap dipakai; bila user menolak penandaan hari ini, berhenti dan tanyakan.

- [x] 3.1 [GERBANG] Verifikasi ulang BR-26 ("setelah hari ini") dan `isPastDate` yang saat ini memakai `<` di `src/modules/availability/dates.ts`; tulis temuan ke Hasil Verifikasi (V2); konfirmasi delta `availability-calendar` menandai hari ini Terisi sebagai default. (Tanggal hari ini dan lampau tidak dapat dipilih)
- [x] 3.2 Ganti `isPastDate` menjadi `isPastOrToday` (`date <= today`) dan pakai di `buildAvailability`; perbarui komentar; verifikasi `npm run typecheck` lulus. (Tanggal hari ini dan lampau tidak dapat dipilih)
- [x] 3.3 Perbarui `tests/availability-dates.test.ts` dan `tests/availability-queries.test.ts` agar hari ini berstatus `TERISI`; jalankan `npm run test -- tests/availability-dates.test.ts tests/availability-queries.test.ts` dan verifikasi lulus. (Tanggal hari ini dan lampau tidak dapat dipilih)

## 4. Route Handler Publik

Catatan apply: Route publik tidak boleh memakai helper admin dan tidak boleh masuk `src/app/admin/**`. Respons tidak boleh memuat id internal, nomor booking, jenis kunci, atau `setup_days_before`. Jangan membuat Server Action publik.

- [x] 4.1 Buat `src/app/api/ketersediaan/route.ts` (`GET`, validasi `packageId` + `bulan` dengan Zod, `getPublicAvailability`, `Cache-Control: no-store`) dan verifikasi dengan `tests/availability-route.test.ts` (hasil hanya `date`/`status`; parameter tidak valid 400) lalu jalankan `npm run test -- tests/availability-route.test.ts`. (Ketersediaan publik menurut paket)
- [x] 4.2 Buat `src/app/api/reservasi/route.ts` (`POST`, JSON + Zod, pembatas laju, `submitReservation`, 201 `{ ok: true }`, 400 generik, 429 generik, 500 generik) sesuai design D6 dan verifikasi dengan `tests/reservation-route.test.ts` (201 tanpa id/kode; validasi 400; tanggal terkunci/hari ini 400 tanpa membocorkan alasan; permintaan ke-6 429) lalu jalankan `npm run test -- tests/reservation-route.test.ts`. (Form pengajuan reservasi publik, Pembatas laju pengajuan form publik, Pesan sukses tanpa nomor booking)
- [x] 4.3 Jalankan `npm run test -- tests/static-scanner.test.ts tests/module-boundary.test.ts`; verifikasi pemindai tidak melaporkan pelanggaran dan modul tidak mengimpor `src/app`. (NFR-SEC-05, NFR-MNT-01)

## 5. Halaman Publik `/reservasi`

Catatan apply: Halaman publik menulis ke database lewat route handler yang sudah diuji; jangan menambah tulisan `date_lock`. Data ke komponen klien tidak boleh memuat `setup_days_before`. Akhiri grup dengan [BERHENTI] untuk review visual user.

- [x] 5.1 Tambahkan `PackageSummary` di `src/modules/venue/types.ts` dan `listActivePackageSummaries` di `src/modules/venue/queries.ts` (tanpa `setupDaysBefore`); verifikasi `npm run typecheck` lulus. (Form pengajuan reservasi publik)
- [x] 5.2 Buat `src/app/reservasi/page.tsx` (server, `force-dynamic`) dan `src/app/reservasi/reservation-form.tsx` (klien, tiga langkah, kalender, ringkasan DP, submit fetch, sukses tanpa kode + tombol WhatsApp) sesuai design D7; verifikasi `npm run typecheck` lulus. (Form pengajuan reservasi publik, Pesan sukses tanpa nomor booking)
- [x] 5.3 Verifikasi render dengan menulis `tests/reservation-form.test.tsx` (paket aktif tampil; memilih tanggal memanggil API ketersediaan; field wajib divalidasi; submit sukses menampilkan pesan tanpa kode dan tombol WhatsApp; nomor admin kosong tanpa tombol `wa.me`) lalu jalankan `npm run test -- tests/reservation-form.test.tsx`. (Form pengajuan reservasi publik, Pesan sukses tanpa nomor booking)
- [x] 5.4 Jalankan `npm run lint`, `npm run typecheck`, dan `npm run build`; verifikasi build berhasil dan rute `/reservasi` beserta `/api/reservasi` serta `/api/ketersediaan` terbangun. (Form pengajuan reservasi publik)
- [x] 5.5 [BERHENTI] Minta user membuka `/reservasi` di browser, mencoba paket/tanggal/validasi/sukses, membandingkan dengan `docs/design/ui-spec.md` 4.1, lalu berhenti menunggu persetujuan sebelum grup admin.

## 6. Halaman Admin Reservasi

Catatan apply: Setiap `page.tsx` di `src/app/admin/**` dan berkas `'use server'` wajib memanggil helper proteksi; pemindai statis menolak bila lupa. Halaman hanya menampilkan reservasi PENDING dan tidak mengubah status, tanggal, atau pembayaran. Akhiri grup dengan [BERHENTI].

- [x] 6.1 Tambahkan `ReservationIcon` di `src/app/admin/admin-icons.tsx` dan menu "Reservasi" di `NAV_ITEMS` `src/app/admin/admin-shell.tsx`; perbarui `tests/admin-shell.test.tsx` (Reservasi tampil; Pelanggan dan Pembayaran tetap tersembunyi) lalu jalankan `npm run test -- tests/admin-shell.test.tsx`. (Admin meninjau reservasi PENDING)
- [x] 6.2 Buat `src/app/admin/reservasi/page.tsx` (guard, `?q=`, tabel PENDING, pencarian nama/WhatsApp, tautan detail, keadaan kosong) dan verifikasi `npm run typecheck` lulus. (Admin meninjau reservasi PENDING)
- [x] 6.3 Buat `src/app/admin/reservasi/[id]/page.tsx` (guard, detail customer/paket/tanggal/harga/status, riwayat status, aktivitas, form catatan) dan `src/app/admin/reservasi/actions.ts` (`"use server"`, `requireAdminSession`, `followUpNoteSchema`, `revalidatePath`) sesuai design D8; verifikasi `npm run typecheck` lulus. (Admin meninjau reservasi PENDING, Catatan tindak lanjut admin tercatat sebagai aktivitas)
- [x] 6.4 Verifikasi halaman admin dengan menulis `tests/admin-reservation.test.tsx` dan memperluas `tests/admin-actions-unauthorized.test.ts` dengan `addFollowUpNote` (daftar/search/detail tampil; catatan kosong ditolak; tanpa sesi dialihkan ke `/login`); jalankan `npm run test -- tests/admin-reservation.test.tsx tests/admin-actions-unauthorized.test.ts tests/static-scanner.test.ts`. (Admin meninjau reservasi PENDING, Catatan tindak lanjut admin tercatat sebagai aktivitas, NFR-SEC-05)
- [x] 6.5 [BERHENTI] Minta user membuka `/admin/reservasi` dan satu detail reservasi di browser, membandingkan dengan `docs/design/ui-spec.md` 4.2, lalu berhenti menunggu persetujuan sebelum verifikasi akhir.

## 7. Verifikasi Akhir

Catatan apply: Grup ini hanya pemeriksaan integrasi; tidak menambah fitur. Jalankan perintah dengan jalur berkas tes eksplisit dan pastikan tidak ada proses vitest lain yang aktif.

- [x] 7.1 Jalankan `npm run lint`; verifikasi tanpa galat. (NFR-MNT-01)
- [x] 7.2 Jalankan `npm run typecheck`; verifikasi tanpa galat. (NFR-MNT-01)
- [x] 7.3 Jalankan `npm run build`; verifikasi build berhasil dan `/reservasi`, `/api/reservasi`, `/api/ketersediaan`, serta `/admin/reservasi` terbangun. (Form pengajuan reservasi publik, Admin meninjau reservasi PENDING)
- [x] 7.4 Jalankan `npm run test`; verifikasi seluruh tes lulus terhadap PostgreSQL asli dan tidak ada `skip`/`only`/`todo`. (Seluruh requirement)
- [x] 7.5 Jalankan `openspec validate reservation-submission`; verifikasi tanpa peringatan. (Seluruh requirement)
- [x] 7.6 Verifikasi `git ls-files` tidak melacak berkas `.env*` selain `.env.example`. (NFR-SEC-03)

## Hasil Verifikasi

| Kode | Verifikasi | Sumber | Hasil |
| --- | --- | --- | --- |
| V1 | API Drizzle untuk tabel reservasi | `node_modules/drizzle-orm/pg-core/columns/text.d.ts:32`, `integer.d.ts:24`, `boolean.d.ts:22`, `timestamp.d.ts:67`, `columns/date.d.ts:47`, `checks.d.ts:18`, `unique-constraint.d.ts:4`, `columns/common.d.ts:45` (`references(ref, actions)`) dan `common.d.ts:15` (`onDelete?: UpdateDeleteAction`), `query-builders/insert.d.ts:171` (`onConflictDoUpdate`), `sql/expressions/conditions.d.ts:364` (`ilike`), `node-postgres/session.d.ts:50` (`transaction<T>`) | Lulus: semua API tersedia sesuai design D1; `date(name, { mode: "string" })` menghasilkan builder string, `onDelete: "restrict" | "set null"` diterima `ReferenceConfig['actions']`, dan `onConflictDoUpdate` menerima `target`/`set`. |
| V2 | BR-26 dan perilaku `isPastDate` | `docs/business-rules-register.md:46-49` (BR-26: tanggal acara harus setelah hari ini WIB), `src/modules/availability/dates.ts:99-102` (sebelum 3.2, `isPastDate` memakai `<`), `openspec/changes/reservation-submission/specs/availability-calendar/spec.md:7,26-29` (delta mewajibkan hari ini Terisi) | Lulus dengan default roadmap: BR-26 menolak hari ini, sedangkan `isPastDate` saat ini hanya menolak tanggal lampau. Delta menandai hari ini `TERISI`; perubahan dilakukan pada 3.2 dan tes lama diperbarui pada 3.3. |
