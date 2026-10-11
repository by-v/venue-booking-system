# Technical Decision Record
**Sistem Informasi Manajemen Reservasi Gedung, H.A. Djunaid Convention Center**
Versi: 1.1 | Tanggal: 12 Oktober 2026
Perubahan v1.1: D10 diputuskan (dev/uji); D11 dan D12 ditambahkan.

Dokumen ini mencatat keputusan teknis. Aturan bisnis ada di `docs/business-rules-register.md`.
Nomor versi paket **tidak** dikunci di sini. Versi diverifikasi saat pemasangan dan dicatat oleh lockfile.

## 1. Konteks

- Sistem dibangun untuk **kebutuhan penelitian**, tidak untuk operasional venue sungguhan.
- Target deploy: **Vercel**, plan Hobby sudah memadai selama sistem tidak dipakai komersial.
- Bahasa utama: TypeScript. Database: PostgreSQL.
- Data uji customer, reservasi, dan pembayaran bersifat **sintetis** dan diberi label jelas.
  Data venue nyata hanya yang ada di handoff (nama, alamat, kapasitas, paket, harga).

## 2. Keputusan

| ID | Keputusan | Status |
|---|---|---|
| D1 | Monolit **Next.js (App Router, TypeScript)**. Tanpa server API terpisah. Aturan bisnis ditaruh di modul domain TypeScript murni, terpisah dari UI, Server Action, dan Route Handler. | Disetujui |
| D2 | Akses database: **Drizzle ORM** (alternatif: Prisma). Constraint dan migrasi tertentu ditulis sebagai SQL. Driver harus mendukung **transaksi interaktif** (dibutuhkan untuk konfirmasi dan reschedule). | Disetujui |
| D3 | Autentikasi admin: **Better Auth**, satu role Admin (BR-14), customer tanpa akun. Penyempitan dari "Auth.js atau Better Auth": tim Auth.js sendiri menyarankan proyek baru memakai Better Auth, sedangkan Auth.js hanya mendapat patch keamanan. | Disetujui (penyempitan perlu konfirmasi) |
| D4 | Validasi dengan **Zod**; skema yang sama dipakai di form dan server. | Disetujui |
| D5 | Pengujian: **Vitest** untuk aturan bisnis dengan **PostgreSQL asli** (bukan mock); **Playwright** untuk black-box (ditambahkan pada change yang membutuhkannya). | Disetujui |
| D6 | Bukti Booking: format (PDF atau halaman cetak, BR-10) **belum diputuskan**. Jika PDF, memakai library ringan, bukan headless browser. | Terbuka |
| D7 | Galeri: object storage (mis. Vercel Blob atau setara). Hanya admin yang mengunggah. | Disetujui |
| D8 | Rate limiting form publik dan cek status (BR-32) membutuhkan penyimpanan bersama atau aturan firewall platform. Captcha **belum disetujui**. | Disetujui sebagian |
| D9 | UI: Tailwind CSS dan komponen UI siap pakai (mis. shadcn/ui). | Disetujui |
| D10 | Database dev dan uji: **PostgreSQL native Windows** (tanpa Docker), role khusus aplikasi (bukan superuser), dua database terpisah `venue_booking` dan `venue_booking_test`. Penyedia database untuk deploy masih **terbuka**. | Diputuskan untuk dev/uji; deploy terbuka |
| D11 | Rate limiting login (Better Auth, penyimpanan database) masuk change `foundation-auth`. Efektivitasnya bergantung pada header IP yang diisi platform. | Disetujui (PROVISIONAL, lihat `docs/nfr-keamanan-usulan.md`) |
| D12 | Form login memakai client SDK Better Auth yang mengirim HTTP ke route handler, sehingga selalu melewati rate limiter. Tes memanggil route handler langsung. | Disetujui |

## 3. Batasan platform yang memengaruhi desain (Vercel)

- **Cron:** pada Hobby hanya sekali sehari dengan presisi per jam (sekitar ±59 menit), memakai UTC, dan pengirimannya best-effort. Konsekuensi: job auto-cancel dan auto-SELESAI harus **idempoten**, menghitung berdasarkan **tanggal WIB** (bukan jam eksekusi), dan bisa menyusul hari yang terlewat. Rute job dilindungi secret.
- **Serverless:** tidak ada disk permanen. Karena itu galeri memakai object storage, dan rate limiting tidak boleh mengandalkan memori aplikasi.
- **Penggunaan komersial** tidak diperbolehkan pada Hobby. Jika kelak venue ingin memakai sistem sungguhan, rencana hosting ditinjau ulang.

## 4. Urutan OpenSpec change

Mengikuti register Bagian 7: `foundation-auth` → `venue-content` → `availability-calendar` → `reservation-submission` → `reservation-management` → `booking-proof` → `reschedule` → `auto-cancel-and-completion` → `venue-setup-internal` → `payment-deadline` (eksekusi pembatalan menunggu T-01b).
Satu change dimulai hanya setelah change sebelumnya selesai dan diuji.

## 5. Hal yang sengaja belum diputuskan

Struktur folder kode, versi paket, format Bukti Booking (D6), captcha (D8), penyedia database untuk deploy (D10), dan seluruh item TERBUKA di register Bagian 5.
