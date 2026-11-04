# Tasks

## 1. Skema dan migrasi

Catatan apply: Grup ini hanya menambah tabel `setup_note`; jangan menyentuh `reservation`, `date_lock`, `package`, atau kode publik. Migrasi dijalankan setelah definisi schema ada. Kegagalan `npm run db:generate` tidak menghentikan apply bila penyebabnya konfigurasi lingkungan; catat dan hentikan bila SQL tidak dapat diperiksa.

- [x] 1.1 Tambahkan tabel `setup_note` di `src/lib/db/reservation-schema.ts` dengan kolom `id`, `reservation_id` unik dan FK `onDelete: "restrict"`, `note`, `updated_by_user_id` FK `onDelete: "set null"`, `created_at`, dan `updated_at`; tambahkan check panjang 1–1.000 karakter; ekspor melalui `src/lib/db/schema.ts`; verifikasi dengan `npm run typecheck`. (Requirement: Satu catatan setup per reservasi)
- [x] 1.2 Jalankan `npm run db:generate`, periksa migration baru (nomor berikutnya `0010`), dan pastikan SQL hanya membuat tabel/constraint `setup_note` tanpa perubahan tabel lama; verifikasi dengan membaca berkas migration yang dihasilkan. (Requirement: Satu catatan setup per reservasi)
- [x] 1.3 Tulis `tests/reservation-setup-schema.test.ts` untuk unique `reservation_id`, penolakan catatan kosong/lebih dari 1.000 karakter, FK reservasi, dan update `updated_at`; jalankan `npx vitest run tests/reservation-setup-schema.test.ts`. (Requirement: Satu catatan setup per reservasi)

## 2. Domain catatan setup

Catatan apply: Aturan bisnis berada di modul reservasi, bukan di komponen UI. Jangan menulis `reservation_activity`, `reservation_status_history`, `date_lock`, atau `payment` dari mutasi catatan. Semua tes domain memakai PostgreSQL asli melalui harness yang ada.

- [x] 2.1 Tambahkan tipe `SetupNote`/`setupNote` dan `setupNoteInputSchema` di `src/modules/reservation/types.ts` dan `src/modules/reservation/schema.ts`; validasi `reservationId` tidak kosong dan `note` trim 1–1.000 karakter; verifikasi dengan `npm run typecheck`. (Requirement: Satu catatan setup per reservasi)
- [x] 2.2 Implementasikan `saveSetupNote` di `src/modules/reservation/mutations.ts`: kunci reservasi dalam transaksi, insert bila belum ada atau update teks/pelaku/waktu bila sudah ada, dan pertahankan satu baris per reservasi; verifikasi dengan `npx vitest run tests/reservation-setup-mutations.test.ts`. (Requirement: Satu catatan setup per reservasi; Catatan setup tidak mengubah data operasional)
- [x] 2.3 Tulis `tests/reservation-setup-mutations.test.ts` untuk create, update mengganti teks tanpa menambah baris, penolakan reservasi tidak ada, status/tanggal/`date_lock`/pembayaran tidak berubah, tidak ada aktivitas substantif, dan dua penyimpanan bersamaan tetap menghasilkan satu baris; jalankan perintah tes tersebut. (Requirement: Satu catatan setup per reservasi; Catatan setup tidak mengubah data operasional)
- [x] 2.4 Perluas `getReservationDetail` di `src/modules/reservation/queries.ts` agar memuat `setupNote` dari tabel baru tanpa mengubah query publik; verifikasi dengan `npx vitest run tests/admin-reservation-queries.test.ts` dan tes baru `tests/reservation-setup-queries.test.ts`. (Requirement: Tampilan catatan setup pada detail reservasi admin; Catatan setup tidak terekspos ke publik)

## 3. Aksi admin dan tampilan

Catatan apply: Tidak ada layar atau menu baru. Form ditempatkan pada detail reservasi yang sudah ada. Aksi wajib memakai `requireAdminSession`; jangan melemahkan pemindai rute admin. Grup ini berhenti untuk review browser sebelum verifikasi akhir.

- [x] 3.1 Tambahkan Server Action `saveSetupNote` di `src/app/admin/reservasi/actions.ts` dengan `requireAdminSession`, parsing `setupNoteInputSchema`, pemanggilan mutasi, dan revalidasi detail; tambahkan kasus `saveSetupNote` ke `tests/admin-actions-unauthorized.test.ts`; jalankan `npx vitest run tests/admin-actions-unauthorized.test.ts`. (Requirement: Catatan setup hanya untuk admin)
- [x] 3.2 Tambahkan kartu “Catatan setup” pada `src/app/admin/reservasi/[id]/page.tsx`: tampilkan catatan atau keadaan kosong, `Textarea` maksimal 1.000 karakter, tombol simpan, dan keterangan bahwa catatan hanya untuk admin serta tidak mengubah status/jadwal/pembayaran/timer auto-cancel; verifikasi dengan `npx vitest run tests/admin-reservation-setup.test.tsx`. (Requirement: Tampilan catatan setup pada detail reservasi admin)
- [x] 3.3 Tulis `tests/admin-reservation-setup.test.tsx` untuk kartu tampil pada detail, keadaan kosong, catatan yang ada tampil, dan teks bantuan; jalankan perintah tes tersebut. (Requirement: Tampilan catatan setup pada detail reservasi admin)
- [x] 3.4 [BERHENTI] Minta user membuka detail reservasi di browser, memeriksa kartu “Catatan setup”, menyimpan catatan, memperbarui catatan, dan memastikan tidak ada layar/menu baru; bandingkan dengan `docs/design/ui-spec.md` 4.2. Berhenti menunggu persetujuan sebelum verifikasi akhir. (Requirement: Tampilan catatan setup pada detail reservasi admin)

## 4. Pemeriksaan kebocoran publik

Catatan apply: Tidak ada route atau halaman publik baru. Tes ini memastikan catatan setup tidak ikut pada respons yang dapat diakses customer. Jangan mengubah data publik untuk membuat tes lulus.

- [x] 4.1 Tulis `tests/reservation-setup-public.test.tsx` yang memeriksa respons `/api/ketersediaan`, halaman cek status, dan Bukti Booking tidak memuat teks catatan setup; jalankan `npx vitest run tests/reservation-setup-public.test.tsx`. (Requirement: Catatan setup tidak terekspos ke publik)
- [x] 4.2 Periksa bahwa tidak ada query publik yang membaca `setup_note` dan tidak ada teks catatan pada serialisasi komponen publik; catat hasil pemeriksaan dan jalankan `npx vitest run tests/availability-route.test.ts tests/cek-status.test.tsx tests/bukti-booking.test.tsx`. (Requirement: Catatan setup tidak terekspos ke publik)

## 5. Verifikasi akhir

Catatan apply: Semua perintah harus dijalankan setelah grup 1–4 selesai dan review browser disetujui. Jangan push, jangan commit `opencode.json`, dan jangan commit `AGENTS.md`. Jika salah satu perintah gagal, perbaiki penyebabnya atau hentikan apply; jangan menandai tugas ini selesai sebelum lulus.

- [x] 5.1 Jalankan `npm run lint`; verifikasi tanpa galat. (Seluruh requirement)
- [x] 5.2 Jalankan `npm run typecheck`; verifikasi tanpa galat. (Seluruh requirement)
- [x] 5.3 Jalankan `npm run build`; verifikasi build berhasil dan halaman detail reservasi tetap terbangun. (Seluruh requirement)
- [x] 5.4 Jalankan `npm run test`; verifikasi seluruh tes lulus dan tidak ada `skip`/`only`/`todo`. (Seluruh requirement)
- [x] 5.5 Jalankan `openspec validate venue-setup-internal` dan `openspec validate --specs`; verifikasi keduanya valid. (Seluruh requirement)
- [x] 5.6 Verifikasi `git ls-files` hanya melacak `.env.example` di antara berkas `.env*` dan `git diff --cached --name-only` tidak memuat `opencode.json`; catat hasil. (Seluruh requirement)
- [x] 5.7 Catat hasil akhir, penyimpangan kecil, dan pertanyaan terbuka; pastikan tidak ada push ke remote. (Seluruh requirement)

## Hasil Verifikasi

- `npm run lint` — lulus tanpa galat.
- `npm run typecheck` — lulus tanpa galat.
- `npm run build` — berhasil; `/admin/reservasi/[id]` dan seluruh rute publik terbangun.
- `npm run test` — **121 berkas tes, 547 tes lulus**; tidak ada `skip`/`only`/`todo`.
- `openspec validate venue-setup-internal --strict` — valid.
- `openspec validate --specs` — 11 spec valid, 0 gagal (info panjang requirement adalah catatan lama, bukan galat).
- `git ls-files '.env*'` — hanya `.env.example` yang terlacak.
- Tidak ada push ke remote.

## Penyimpangan Kecil

- Tes kebocoran publik memakai ekstensi `.tsx` karena merender komponen React, bukan `.ts` seperti teks tugas awal.
- `opencode.json` tidak di-commit. `AGENTS.md` tetap untracked.
- Catatan setup diizinkan pada semua status reservasi sesuai keputusan design; belum ada pembatasan status akhir.
- Tidak ada riwayat versi catatan setup; hanya pelaku dan waktu pembaruan terakhir yang disimpan.

## Pertanyaan Terbuka

- Apakah venue membutuhkan banyak catatan atau riwayat versi di masa depan?
- Apakah catatan setup perlu ditampilkan pada permukaan publik tertentu di masa depan? Saat ini tidak.
- Apakah status akhir sebaiknya tetap dapat diubah catatannya?
