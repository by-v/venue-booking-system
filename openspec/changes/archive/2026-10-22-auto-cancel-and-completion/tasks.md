# Tasks

## 1. Skema, tipe, dan helper tanggal

Catatan apply: Grup ini hanya menyiapkan kontrak data dan helper tanggal; jangan membuat job, route, atau UI. Migration dibuat setelah schema berubah dan tidak boleh dijalankan ke database dev.

- [x] 1.1 Tambahkan kode alasan otomatis `INACTIVITY_3M` dan `EVENT_DATE_PASSED`, perluas tipe `reasonCode` pada riwayat status, dan pertahankan validasi pembatalan manual hanya untuk dua kode lama; verifikasi dengan `npm run typecheck`. (Requirement: Riwayat perubahan status otomatis dan manual)
- [x] 1.2 Perbarui constraint `reservation_status_history_reason_code` di Drizzle agar menerima dua kode baru tanpa menambah tabel atau kolom; verifikasi dengan `npm run typecheck`. (Requirement: Pembatalan otomatis tanpa pembayaran tercatat)
- [x] 1.3 Tambahkan `dateInJakarta` dan `addCalendarMonths` di modul tanggal, lalu delegasikan `subtractOneCalendarMonth` ke helper baru; verifikasi dengan `npx vitest run tests/reservation-lifecycle-dates.test.ts` setelah tes batas akhir bulan dan tahun kabisat dibuat. (Requirement: Kandidat auto-cancel karena tidak ada aktivitas)
- [x] 1.4 Jalankan `npm run db:generate`, periksa migration baru, dan pastikan hanya constraint alasan yang berubah serta tidak ada kolom `perlu_pemeriksaan_admin` baru; verifikasi dengan membaca SQL migration yang dihasilkan. (Requirement: Riwayat perubahan status otomatis dan manual)
- [x] 1.5 Tambahkan tes constraint yang menerima kedua kode otomatis dan menolak kode asing; verifikasi dengan `npx vitest run tests/reservation-lifecycle-schema.test.ts`. (Requirement: Riwayat perubahan status otomatis dan manual)

## 2. Aturan domain dan transaksi lifecycle

Catatan apply: Semua tes memakai PostgreSQL uji. Jangan memakai mock untuk aturan bisnis. Jangan membuat route atau UI pada grup ini.

- [x] 2.1 Implementasikan fungsi domain untuk menghitung batas tiga bulan, menentukan Pemicu A/Pemicu B, dan memilih kode alasan otomatis; verifikasi dengan `npx vitest run tests/reservation-lifecycle-candidates.test.ts` memakai contoh 1 Januari, 30 November, 20 Februari, dan acara 15 Februari. (Requirement: Kandidat auto-cancel karena tidak ada aktivitas; Kandidat auto-cancel karena tanggal acara lewat)
- [x] 2.2 Implementasikan pemrosesan transaksi untuk `PENDING`/`DITANGGUHKAN`: deteksi pembayaran `DICATAT`/`TERVERIFIKASI`, batalkan tanpa pembayaran, atau nyalakan `perlu_pemeriksaan_admin` bila ada pembayaran; verifikasi dengan `npx vitest run tests/reservation-lifecycle-auto-cancel.test.ts`, termasuk pembayaran `TIDAK_VALID` yang tidak melindungi reservasi. (Requirement: Pembatalan otomatis tanpa pembayaran tercatat; Pembayaran tercatat menahan pembatalan otomatis)
- [x] 2.3 Implementasikan penyelesaian otomatis `DITERIMA` setelah tanggal acara dan penanda sisa pembayaran; verifikasi dengan `npx vitest run tests/reservation-lifecycle-completion.test.ts`, termasuk kunci tanggal yang tetap ada dan status lain yang tidak disentuh. (Requirement: Penyelesaian otomatis reservasi DITERIMA; Penanda sisa pembayaran saat SELESAI)
- [x] 2.4 Pastikan job idempoten dan aman terhadap eksekusi bersamaan dengan row lock `SKIP LOCKED`; verifikasi dengan `npx vitest run tests/reservation-lifecycle-concurrency.test.ts` dan pastikan tidak ada riwayat atau transisi ganda. (Requirement: Job harian idempoten dan aman terhadap eksekusi bersamaan)
- [x] 2.5 Pastikan fungsi lifecycle tidak menulis aktivitas substantif saat hanya menandai reservasi; verifikasi dengan `npx vitest run tests/reservation-lifecycle-auto-cancel.test.ts tests/dashboard-queries.test.ts` dan periksa `is_substantive` serta daftar “Perlu Tindak Lanjut”. (Requirement: Riwayat perubahan status otomatis dan manual; Tampilan penyelesaian dan daftar perlu pemeriksaan)

## 3. Rute job harian

Catatan apply: Rute ini bukan rute admin dan tidak memakai sesi admin; perlindungannya adalah `CRON_SECRET`. Jangan mencetak nilai secret dan jangan menambahkan `vercel.json`.

- [x] 3.1 Tambahkan `CRON_SECRET` ke `.env.example` sebagai placeholder kosong dan perbarui tes contoh environment; verifikasi dengan `npx vitest run tests/env-example.test.ts`. (Requirement: Otorisasi rute job)
- [x] 3.2 Implementasikan `GET` pada `src/app/api/cron/reservasi/route.ts` dengan perbandingan secret constant-time, penolakan `401` sebelum database, dan respons ringkasan tanpa secret; verifikasi dengan `npx vitest run tests/reservation-lifecycle-route.test.ts` untuk secret benar, salah, dan tidak tersedia. (Requirement: Otorisasi rute job)
- [x] 3.3 Pastikan permintaan tanpa secret tidak mengubah reservasi, riwayat, atau penanda; verifikasi dengan tes rute yang membandingkan keadaan database sebelum dan sesudah permintaan. (Requirement: Otorisasi rute job)

## 4. Penyelesaian manual dan UI admin

Catatan apply: Aksi manual hanya untuk `DITERIMA` setelah tanggal acara. Jangan mengubah folder `docs/` saat apply; jika ui-spec belum menyebut tombol ini, catat sebagai penyimpangan dokumentasi dan hentikan pada review browser 4.4.

- [x] 4.1 Tambahkan kode galat dan mutasi `completeReservation` yang memeriksa status, tanggal WIB, sisa pembayaran, dan mencatat riwayat pelaku admin serta aktivitas substantif; verifikasi dengan `npx vitest run tests/reservation-lifecycle-manual-completion.test.ts`. (Requirement: Penyelesaian manual oleh admin; Riwayat perubahan status otomatis dan manual)
- [x] 4.2 Tambahkan schema input dan Server Action penyelesaian yang memakai `requireAdminSession()` serta revalidasi halaman admin; verifikasi dengan `npx vitest run tests/admin-actions-unauthorized.test.ts tests/reservation-lifecycle-manual-completion.test.ts`. (Requirement: Penyelesaian manual oleh admin)
- [x] 4.3 Tampilkan form “Tandai selesai” pada kartu “Tindakan status” di detail reservasi `DITERIMA` yang tanggal acaranya sudah lewat, tanpa layar baru; verifikasi dengan `npx vitest run tests/admin-reservation-completion.test.tsx tests/admin-reservation.test.tsx tests/dashboard-view.test.tsx`. (Requirement: Tampilan penyelesaian dan daftar perlu pemeriksaan)
- [x] 4.4 [BERHENTI] Minta user membuka detail reservasi `DITERIMA` sebelum dan sesudah tanggal acara, memeriksa tombol “Tandai selesai”, hasil penyelesaian, penanda sisa pembayaran, dan daftar “Perlu Tindak Lanjut” di dashboard; bandingkan dengan BR-13 dan `docs/design/ui-spec.md` 4.2. Berhenti menunggu persetujuan sebelum verifikasi akhir. (Requirement: Tampilan penyelesaian dan daftar perlu pemeriksaan)

## 5. Verifikasi akhir

Catatan apply: Hanya verifikasi; jangan mengubah kode. Semua tes memakai PostgreSQL uji, tidak boleh ada `skip`/`only`/`todo`, dan jangan push ke remote.

- [x] 5.1 Jalankan `npm run lint`; verifikasi tanpa galat. (Seluruh requirement)
- [x] 5.2 Jalankan `npm run typecheck`; verifikasi tanpa galat. (Seluruh requirement)
- [x] 5.3 Jalankan `npm run build`; verifikasi build berhasil dan route `/api/cron/reservasi` serta halaman detail reservasi tetap terbangun. (Otorisasi rute job; Tampilan penyelesaian dan daftar perlu pemeriksaan)
- [x] 5.4 Jalankan `npm run test`; verifikasi seluruh tes lulus dan tidak ada `skip`/`only`/`todo`. (Seluruh requirement)
- [x] 5.5 Jalankan `openspec validate auto-cancel-and-completion` dan `openspec validate --specs`; verifikasi keduanya valid. (Seluruh requirement)
- [x] 5.6 Verifikasi `git ls-files` hanya melacak `.env.example` di antara berkas `.env*` dan `git diff --cached --name-only` tidak memuat `opencode.json`; catat hasil. (Otorisasi rute job; NFR-SEC-07)
- [x] 5.7 Catat hasil akhir dan pastikan tidak ada push ke remote; laporkan pertanyaan terbuka tentang pembersihan `perlu_pemeriksaan_admin` dan jadwal cron produksi. (Seluruh requirement)
