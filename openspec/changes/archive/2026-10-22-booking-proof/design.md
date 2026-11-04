# Design

## Context

Change ini dibangun di atas `reservation-confirmation` yang sudah menerbitkan nomor booking `HADCC-<tahun>-<urut>` dan menyimpan `reservation.booking_number` unik, serta `reservation-processing` yang menyimpan pembayaran manual dan status pembayaran turunan. Halaman publik yang sudah ada: Beranda, Tentang Kami, Fasilitas, Galeri, Kontak, dan Reservasi. Belum ada halaman cek status maupun Bukti Booking.

Batasan yang memengaruhi desain:

- BR-05: status hanya dicek lewat nomor booking; PENDING/DITANGGUHKAN tidak punya nomor booking.
- BR-10: isi Bukti Booking sudah ditetapkan.
- BR-32 (FINAL-DEFAULT): rate limiting, galat generik, data minimal, nama customer disamarkan; tanpa faktor verifikasi tambahan.
- D6: Bukti Booking berupa halaman siap cetak; PDF dari fungsi cetak peramban.
- Waktu memakai WIB; uang integer rupiah.

## Goals / Non-Goals

**Goals:**

- Menyediakan `/cek-status` untuk mencari reservasi berdasarkan nomor booking.
- Menyediakan `/bukti-booking/[nomor]` yang siap dicetak dan memuat isi BR-10.
- Menambahkan query publik yang hanya mengembalikan data aman.
- Menegakkan rate limit berbasis database dan pesan galat generik.
- Menutup US-070, US-071, dan US-072 tanpa menambah dependensi atau migrasi baru.

**Non-Goals:**

- PDF server-side atau pustaka PDF baru.
- Faktor verifikasi tambahan (4 digit kontak, OTP, dan sejenisnya).
- Cek status untuk reservasi PENDING/DITANGGUHKAN atau kode pengajuan terpisah.
- Perubahan alur konfirmasi BR-22, pembayaran, status, atau nomor booking.
- Halaman admin baru.

## Decisions

### D1 - Query publik dan tipe data aman

Tambahkan di `src/modules/reservation/queries.ts`:

```text
getPublicBookingByNumber(bookingNumber: string): Promise<PublicBookingProof | null>
```

- Mencari `reservation` berdasarkan `bookingNumber` yang sudah dinormalisasi (trim dan uppercase).
- Hanya mengembalikan baris yang memiliki `booking_number`; reservasi `PENDING`/`DITANGGUHKAN` tidak akan cocok.
- Memilih hanya field publik: nomor booking, nama customer yang disamarkan, tanggal acara, jenis acara, nama paket, durasi, jumlah sesi, harga paket, total, DP minimum, pembayaran terverifikasi, sisa, status pembayaran, dan status booking.
- Tidak memilih `id`, `customer.id`, `whatsapp`, `address`, `notes`, aktivitas, atau riwayat status.
- Menghitung keuangan dengan fungsi yang sudah ada di `src/modules/reservation/pricing.ts`: `calculateReservationTotal`, `calculateMinimumDp`, `derivePaymentStatus`, dan `calculateRemainingPayment`.

Tambahkan tipe `PublicBookingProof` di `src/modules/reservation/types.ts`.

### D2 - Penyamaran nama customer

Tambahkan fungsi murni `maskCustomerName(name: string): string` di `src/modules/reservation/masking.ts`:

- Setiap kata dipertahankan huruf pertamanya, sisa huruf diganti `***`.
- Contoh: `Budi Santoso` menjadi `B*** S***`.
- Nama kosong atau hanya spasi menghasilkan `***`.

Fungsi ini dipakai query publik sebelum data dikembalikan, sehingga halaman tidak pernah menerima nama lengkap.

### D3 - Halaman `/cek-status`

- Server Component publik dengan `export const dynamic = "force-dynamic"`.
- Form `GET` mengirim `nomor` sebagai query string. Halaman membaca `searchParams.nomor`.
- Sebelum query, panggil pembatas laju:
  - `getClientIp(headers())` dan `hashClientIp()` dari `src/modules/reservation/request-ip.ts`.
  - `consumeSubmissionLimit({ key: \`cek-status:${hash}\`, max: STATUS_CHECK_LIMIT, windowSeconds: STATUS_CHECK_WINDOW_SECONDS })` dari `src/modules/reservation/rate-limit.ts`.
  - Tambahkan konstanta `STATUS_CHECK_LIMIT = 10` dan `STATUS_CHECK_WINDOW_SECONDS = 900` di modul rate-limit (reuse tabel `submission_rate_limit`, tanpa migrasi).
- Bila rate limit terlampaui, tampilkan pesan generik yang sama dengan nomor tidak ditemukan.
- Normalisasi dan validasi format nomor dengan regex `^HADCC-[0-9]{4}-[0-9]{4,}$`; format salah dan nomor tidak ditemukan memakai pesan generik yang sama.
- Bila ditemukan, tampilkan ringkasan (nomor, tanggal, paket, total, DP terverifikasi, sisa, status pembayaran, status booking) dan tautan "Cetak Bukti" ke `/bukti-booking/{nomor}`.
- Tidak menampilkan nama lengkap, WhatsApp, alamat, atau ID internal.

### D4 - Halaman `/bukti-booking/[nomor]`

- Server Component publik dengan `export const dynamic = "force-dynamic"`.
- Memakai query dan pembatas laju yang sama (kunci `bukti-booking:${hash}`) untuk mencegah enumerasi.
- Bila nomor tidak valid/tidak ditemukan, tampilkan pesan generik, bukan data.
- Isi halaman mengikuti BR-10: nomor booking, nama customer tersamar, tanggal acara, paket/jenis acara, durasi, fasilitas paket, total, DP, pembayaran terverifikasi, sisa, status pembayaran, dan status booking.
- Fasilitas paket diambil dari relasi paket-fasilitas yang sudah ada; bila tidak tersedia, tampilkan daftar kosong tanpa mengarang data.
- Waktu cetak ditampilkan dari waktu render server dengan format Indonesia dan label "Dicetak pada".
- Tombol "Cetak Bukti" adalah komponen klien kecil yang memanggil `window.print()`.
- Gaya cetak memakai `@media print` untuk menyembunyikan navigasi, footer, dan tombol, serta menampilkan konten Bukti Booking.

### D5 - Navigasi publik

- Tambahkan tautan "Cek Status Reservasi" pada footer `src/components/public-shell.tsx` sesuai `docs/design/ui-spec.md` 4.1. Tidak menambah menu utama baru.

### D6 - Keamanan dan batas domain

- Halaman publik tidak memanggil `requireAdminSession()`.
- Query publik berada di modul domain reservasi dan tidak mengimpor `src/app`.
- Pesan galat tidak membedakan nomor tidak ditemukan, format salah, dan rate limit.
- Tidak ada data pribadi selain nama tersamar; nomor WhatsApp dan alamat tidak pernah dikirim ke halaman publik.
- Tidak menambah dependensi atau migrasi database.

## Risks / Trade-offs

- [Nomor booking berurutan mudah ditebak] → Rate limit per sumber, galat generik, dan data minimal (BR-32). Faktor verifikasi tambahan sengaja tidak ditambahkan.
- [Nomor booking muncul di query string] → Konsisten dengan BR-05 yang memang memakai nomor booking sebagai satu-satunya kunci; rate limit tetap membatasi enumerasi.
- [Gaya cetak berbeda antar peramban] → Memakai `@media print` standar dan tombol `window.print()`; tidak menambah pustaka PDF.
- [Fasilitas paket tidak tersedia di snapshot reservasi] → Mengambil dari relasi paket saat ini; bila paket berubah, Bukti Booking memakai data terkini sesuai BR-10.

## Migration Plan

1. Tidak ada perubahan skema atau migrasi baru.
2. `booking_number` dan `submission_rate_limit` sudah tersedia dari change sebelumnya.
3. Tidak ada backfill.

## Referensi API terpasang

- `db.select`, `eq`, `innerJoin`, `and` — `node_modules/drizzle-orm/pg-core/query-builders/select.d.ts`
- `headers()` — `node_modules/next/dist/server/request/headers.d.ts`
- `window.print()` — API peramban standar
- `calculateReservationTotal`, `calculateMinimumDp`, `derivePaymentStatus`, `calculateRemainingPayment` — `src/modules/reservation/pricing.ts`

## Open Questions

Tidak ada pertanyaan desain yang menahan implementasi. BR-32 berstatus FINAL-DEFAULT sehingga rate limit, galat generik, dan data minimal langsung dipakai.
