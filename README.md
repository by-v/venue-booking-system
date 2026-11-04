# Venue Booking System

Sistem Informasi Manajemen Reservasi Gedung untuk satu venue (H.A. Djunaid Convention Center, Pekalongan).

Repositori ini memuat fondasi teknis (change `foundation-auth`) dan konten venue (change `venue-content`): aplikasi Next.js App Router dengan TypeScript strict, koneksi PostgreSQL melalui Drizzle ORM, validasi environment dengan Zod, autentikasi admin dengan Better Auth, pengelolaan venue/paket/fasilitas/galeri, halaman publik, dan infrastruktur pengujian Vitest.

## Prasyarat

- **Node.js** 20.9 atau lebih baru (bawaan proyek: `npm`).
- **PostgreSQL** dengan utilitas `psql`, berjalan lokal pada `localhost:5432`.

Verifikasi:

```powershell
node -v
npm -v
psql --version
```

## 1. Siapkan role dan dua database

Masuk ke PostgreSQL sebagai superuser:

```powershell
psql -U postgres
```

Di dalam `psql`, jalankan (ganti `<isi-sendiri>` dengan password pilihan Anda):

```sql
CREATE ROLE app_user WITH LOGIN PASSWORD '<isi-sendiri>';
CREATE DATABASE venue_booking OWNER app_user;
CREATE DATABASE venue_booking_test OWNER app_user;
```

Keluar dari `psql` dengan `\q`.

## 2. Konfigurasi environment

Salin berkas contoh lalu isi nilainya:

```powershell
Copy-Item .env.example .env.local
```

Buat `BETTER_AUTH_SECRET` (minimal 32 karakter) dengan:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Tempelkan hasilnya ke `BETTER_AUTH_SECRET` di `.env.local`, dan isi `DATABASE_URL` serta `TEST_DATABASE_URL` dengan password role `app_user` (`YOUR_PASSWORD` diganti). `.env.local` tidak dilacak git.

## 3. Install dependensi

```powershell
npm install
```

## 4. Migrasi database

Jalankan `db:generate` **hanya saat skema berubah** (mis. `src/lib/db/schema.ts`, `src/lib/db/auth-schema.ts`, atau `src/lib/db/venue-schema.ts`):

```powershell
npm run db:generate
```

Terapkan migrasi ke database (idempoten, aman dijalankan berulang):

```powershell
npm run db:migrate
```

Memeriksa database aktif (opsional):

```powershell
npm run db:check
```

## 5. Seed admin pertama

Buat akun admin pertama secara interaktif:

```powershell
npx tsx scripts/seed-admin.ts
```

Skrip menampilkan target database, meminta konfirmasi (default: tidak), lalu meminta email dan password (tersembunyi, minimal 12 karakter). Skrip menolak bila tabel `user` sudah berisi baris.

## 6. Seed data venue

Isi data venue, paket, dan fasilitas awal dari seed domain (idempoten; tanpa data demo, pelanggan, atau reservasi):

```powershell
npx tsx scripts/seed-venue.ts
```

Skrip menampilkan target database dan meminta konfirmasi (default: tidak). Jalankan ulang aman karena `id` stabil mencegah duplikasi.

Untuk mengisi galeri dengan 17 foto venue di `public/galeri` (judul, kategori, keterangan), jalankan:

```powershell
npx tsx scripts/seed-gallery.ts
```

Seed galeri juga idempoten dan tidak menimpa item lain yang sudah dibuat lewat `/admin/galeri`. Setelah itu, foto tetap bisa diubah atau ditambahkan lewat halaman admin tersebut.

## 7. Jalankan aplikasi

```powershell
npm run dev
```

Buka `http://localhost:3000/login`.

## Kualitas kode

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

Tes berjalan serial dan memakai database uji (`TEST_DATABASE_URL`); harness menolak berjalan bila database uji tidak berakhiran `_test` atau sama dengan database development.

## Catatan keamanan

- Hanya `.env.example` (placeholder) yang dilacak git; seluruh berkas `.env*` lainnya diabaikan.
- Jangan menulis password atau secret nyata ke dalam berkas yang di-commit, termasuk `.env.example`.
