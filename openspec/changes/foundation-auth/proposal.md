# Proposal

## Why

Sistem memerlukan fondasi teknis sebelum fitur bisnis (venue, reservasi, pembayaran) dapat diimplementasi. Tanpa autentikasi admin, tidak ada cara untuk mengelola booking atau melindungi operasi back-office. Change ini membangun infrastruktur dasar yang disepakati di TDR (D1-D5, D10): Next.js App Router, Drizzle ORM, Better Auth, Vitest dengan PostgreSQL asli.

## What Changes

- Inisialisasi Next.js (App Router, TypeScript) di root repo bersama `.opencode/`, `openspec/`, `docs/`.
- Konfigurasi PostgreSQL native Windows: database `venue_booking` (dev) dan `venue_booking_test` (test), tanpa Docker.
- Validasi environment variable dengan Zod (DATABASE_URL, TEST_DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, AUTH_SESSION_MAX_AGE).
- Autentikasi admin Better Auth: login, logout, sesi database-backed, proteksi rute `/admin` dengan helper `requireAdminSession()`.
- Skrip seed `scripts/seed-admin.ts` untuk admin pertama (email/password dari prompt interaktif).
- Rate limiting login: ditunda dengan syarat sebelum akun admin sungguhan.
- Infrastruktur test Vitest dengan harness PostgreSQL asli, validasi TEST_DATABASE_URL, migrasi sebelum tes.
- Halaman login dan dashboard admin kosong untuk verifikasi proteksi rute.

## Capabilities

### New Capabilities

- `project-foundation`: Fondasi teknis aplikasi (Next.js App Router dengan TypeScript, Drizzle ORM dengan PostgreSQL, validasi environment dengan Zod, migrasi database, dan infrastruktur pengujian dengan Vitest + PostgreSQL asli). Mengacu pada TDR D1, D2, D4, D5, D10.
- `admin-auth`: Autentikasi admin dengan Better Auth (login, logout, sesi, proteksi rute `/admin`, dashboard, seed script). Mengacu pada BR-14 (satu role Admin) dan TDR D3.

### Modified Capabilities

- Tidak ada. Ini adalah change pertama yang memperkenalkan kemampuan baru.

## Impact

- **Kode baru**: semua modul di `src/`, konfigurasi `drizzle.config.ts`, konfigurasi auth, seed script, setup test.
- **Dependencies**: `next`, `typescript`, `drizzle-orm`, `drizzle-kit`, `better-auth`, `zod`, `vitest`, `pg`, `tailwindcss`, `eslint`, `eslint-config-next`, `tsx`.
- **Database**: Dua database PostgreSQL native Windows: `venue_booking` (development) dan `venue_booking_test` (testing). Schema migrasi awal untuk tabel users/sessions. Tidak ada tabel domain.
- **Routes**: `/login` dan `/admin` (dashboard kosong). Rute `/admin` dilindungi auth.
- **Scripts**: `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run db:migrate`, `npm run db:generate`, `npx tsx scripts/seed-admin.ts`.
- **Documentation**: `.env.example`, README setup singkat.

## Di luar scope

- Tabel domain (venue, paket, reservasi, pembayaran, dan lainnya).
- Halaman publik, kalender, rate limiting form publik dan cek status (D8), captcha.
- Bukti Booking dan PDF.
- Cron/job terjadwal.
- Galeri dan object storage.
- Playwright (ekstra, bukan replace Vitest).
- Styling lanjutan (Tailwind standar saja).
- Deploy ke Vercel.

## Pertanyaan Terbuka

1. **Pembuatan akun staf tambahan**: BR-14 mengizinkan beberapa akun dengan satu role Admin. Change ini hanya menyediakan skrip seed untuk admin pertama. Pembuatan akun staf lain melalui UI atau skrip khusus menjadi pertanyaan untuk change berikutnya.