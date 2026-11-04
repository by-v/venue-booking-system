# Tasks

## 1. Aturan domain batas pelunasan

Catatan apply: Grup ini hanya menambah perhitungan murni; jangan menyentuh query, halaman admin, atau database. Tidak ada migrasi. Kegagalan `npm run db:generate` tidak relevan dan tidak boleh dijalankan.

- [x] 1.1 Tambahkan `src/modules/reservation/payment-deadline.ts` dengan `PAYMENT_DEADLINE_DAYS = 14`, `paymentDueDate(eventDate)` yang memakai `addDays` dari modul availability, dan `isPaymentOverdue({ eventDate, paymentStatus, today })` yang hanya `true` bila status bukan `LUNAS` dan `today > paymentDueDate(eventDate)`; verifikasi dengan `npm run typecheck`. (Requirement: Batas pelunasan diturunkan dari tanggal acara; Batas pelunasan inklusif dan penanda keterlambatan)
- [x] 1.2 Tulis `tests/reservation-payment-deadline.test.ts` untuk batas 30 Maret 2026 → 16 Maret 2026, 1 Maret 2026 → 15 Februari 2026, pergantian bulan/tahun, tepat pada batas, sehari setelah batas, status `LUNAS`, dan status `DP`; jalankan `npx vitest run tests/reservation-payment-deadline.test.ts`. (Requirement: Batas pelunasan diturunkan dari tanggal acara; Batas pelunasan inklusif dan penanda keterlambatan)

## 2. Nilai turunan pada detail reservasi

Catatan apply: Grup ini hanya membaca dan menurunkan nilai; jangan menambah mutasi, Server Action, job, route, atau tabel. `getPublicBookingByNumber` tidak boleh diubah.

- [x] 2.1 Tambahkan `paymentDueDate` dan `paymentOverdue` ke `ReservationDetail`, lalu isi keduanya di `getReservationDetail` memakai `todayInJakarta()` dan fungsi dari grup 1; verifikasi dengan `npm run typecheck`. (Requirement: Batas pelunasan diturunkan dari tanggal acara; Batas pelunasan inklusif dan penanda keterlambatan)
- [x] 2.2 Perbarui pembuat data `ReservationDetail` manual di `tests/admin-reservation.test.tsx`, `tests/admin-reservation-setup.test.tsx`, dan `tests/admin-reservation-completion.test.tsx` agar memuat nilai turunan baru; jalankan ketiga berkas dengan `npx vitest run ...` dan pastikan lulus. (Requirement: Batas pelunasan tampil pada detail reservasi admin)
- [x] 2.3 Tulis `tests/reservation-payment-deadline-queries.test.ts` terhadap PostgreSQL asli: batas dan penanda benar, batas mengikuti perubahan `eventDate`, dan membuka detail tidak mengubah status, `payment`, `date_lock`, atau `reservation_activity`; jalankan `npx vitest run tests/reservation-payment-deadline-queries.test.ts`. (Requirement: Batas pelunasan diturunkan dari tanggal acara; Batas pelunasan inklusif dan penanda keterlambatan; Batas pelunasan tidak mengubah data operasional)

## 3. Tampilan detail reservasi admin

Catatan apply: Gunakan kartu ringkasan pembayaran yang sudah ada di `src/app/admin/reservasi/[id]/page.tsx`; jangan menambah kartu, layar, menu, tombol, atau widget dashboard. Tidak ada aksi tulis.

- [x] 3.1 Tambahkan baris “Batas pelunasan” pada `<dl>` ringkasan pembayaran dan penanda “Pelunasan terlambat” hanya bila `paymentOverdue` bernilai `true`, dengan teks bahwa penanda hanya informasi dan tidak mengubah status atau DP; verifikasi dengan `npm run typecheck`. (Requirement: Batas pelunasan tampil pada detail reservasi admin; Batas pelunasan tidak mengubah data operasional)
- [x] 3.2 Tulis `tests/admin-reservation-payment-deadline.test.tsx` untuk detail sebelum batas, tepat pada batas, setelah batas dengan status bukan `LUNAS`, dan status `LUNAS`; jalankan `npx vitest run tests/admin-reservation-payment-deadline.test.tsx`. (Requirement: Batas pelunasan tampil pada detail reservasi admin; Batas pelunasan inklusif dan penanda keterlambatan)
- [x] 3.3 [BERHENTI] Minta user membuka detail reservasi di browser, memeriksa baris “Batas pelunasan”, penanda keterlambatan, dan memastikan tidak ada layar atau menu baru; perbaiki bila diminta sebelum lanjut ke grup 4. (Requirement: Batas pelunasan tampil pada detail reservasi admin)

## 4. Pemeriksaan permukaan publik

Catatan apply: Grup ini hanya menambah tes; jangan mengubah halaman publik, cek status, Bukti Booking, atau query publik. Bila ada kebocoran, perbaiki hanya dengan menghapus field dari jalur publik, bukan menambah data.

- [x] 4.1 Tulis `tests/reservation-payment-deadline-public.test.tsx` yang memakai reservasi sintetis dan query publik asli untuk memastikan cek status dan Bukti Booking tidak memuat “Batas pelunasan”, tanggal batas, atau penanda “Pelunasan terlambat”; jalankan `npx vitest run tests/reservation-payment-deadline-public.test.tsx`. (Requirement: Batas pelunasan hanya untuk admin)
- [x] 4.2 Periksa bahwa `getPublicBookingByNumber`, `getPublicVenue`, dan route ketersediaan tidak membaca `paymentDueDate` atau `paymentOverdue`; catat hasil pemeriksaan dan jalankan tes publik terkait dengan `npx vitest run tests/cek-status.test.tsx tests/bukti-booking.test.tsx tests/availability-route.test.ts`. (Requirement: Batas pelunasan hanya untuk admin)

## 5. Verifikasi akhir

Catatan apply: Jalankan verifikasi setelah semua grup selesai. Jangan push, jangan commit `opencode.json`, dan jangan menambahkan `vercel.json`.

- [x] 5.1 Jalankan `npm run lint`; verifikasi tanpa galat. (Seluruh requirement)
- [x] 5.2 Jalankan `npm run typecheck`; verifikasi tanpa galat. (Seluruh requirement)
- [x] 5.3 Jalankan `npm run build`; verifikasi build berhasil dan `/admin/reservasi/[id]` tetap terbangun. (Seluruh requirement)
- [x] 5.4 Jalankan `npm run test`; verifikasi seluruh tes lulus dan tidak ada `skip`/`only`/`todo`. (Seluruh requirement)
- [x] 5.5 Jalankan `openspec validate payment-deadline --strict` dan `openspec validate --specs`; verifikasi keduanya valid. (Seluruh requirement)
- [x] 5.6 Verifikasi `git ls-files '.env*'` hanya memuat `.env.example`, `git diff --cached --name-only` tidak memuat `opencode.json`, dan tidak ada push ke remote; catat hasil. (Seluruh requirement)
- [x] 5.7 Catat hasil akhir, penyimpangan kecil, dan pertanyaan terbuka T-01b; pastikan tidak ada perubahan status, pembayaran, `date_lock`, atau ketersediaan yang dijalankan oleh change ini. (Seluruh requirement)

## Hasil Verifikasi

- `npm run lint` — lulus tanpa galat.
- `npm run typecheck` — lulus tanpa galat.
- `npm run build` — berhasil; `/admin/reservasi/[id]` dan seluruh rute publik terbangun.
- `npm run test` — **125 berkas tes, 569 tes lulus**; tidak ada `skip`/`only`/`todo`.
- `openspec validate payment-deadline --strict` — valid.
- `openspec validate --specs` — 12 spec valid, 0 gagal (info panjang requirement adalah catatan lama, bukan galat).
- `git ls-files '.env*'` — hanya `.env.example` yang terlacak.
- `git diff --cached --name-only` — kosong; `opencode.json` tidak di-commit.
- Tidak ada push ke remote.

## Penyimpangan Kecil

- Tes permukaan publik memakai ekstensi `.tsx` karena merender komponen React.
- Penanda keterlambatan berlaku untuk semua reservasi belum `LUNAS` tanpa pembatasan status reservasi, sesuai BR-08 dan keputusan design.
- Review browser pengguna sempat mencatat dan memverifikasi pembayaran serta mengonfirmasi reservasi pada database dev; tidak ada penulisan database dev yang dilakukan oleh kode atau tes change ini.

## Pertanyaan Terbuka

- **T-01b (TERBUKA):** eksekusi pembatalan karena pelunasan terlambat, akibat DP, dan status hasil belum diputuskan; change ini tidak menjalankannya.
- Apakah penanda perlu dibatasi hanya untuk status aktif (`PENDING`, `DITANGGUHKAN`, `DITERIMA`) setelah venue memberi jawaban?
- Apakah venue membutuhkan riwayat kapan suatu reservasi pertama kali terlambat? Saat ini penanda hanya turunan saat dibaca.
