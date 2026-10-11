# Proposal

## Why

Sistem memerlukan fondasi teknis sebelum fitur bisnis (venue, reservasi, pembayaran) dapat diimplementasikan. Tanpa autentikasi admin, tidak ada cara mengelola booking atau melindungi operasi back-office. Change ini membangun fondasi yang disepakati pada TDR D1–D5 dan D10: Next.js App Router, Drizzle ORM dengan PostgreSQL native Windows, Better Auth, dan Vitest dengan PostgreSQL asli. Requirement keamanan tambahan (rate limiting, atribut cookie, proteksi rute berlapis, proteksi open redirect, pengelolaan seed/secret) dirujuk ke `docs/nfr-keamanan-usulan.md` dan diberi tanda USULAN.

## What Changes

- Inisialisasi Next.js (App Router, TypeScript strict) di root repo bersama `.opencode/`, `openspec/`, `docs/`.
- Konfigurasi PostgreSQL native Windows (tanpa Docker): database `venue_booking` (dev) dan `venue_booking_test` (uji), role khusus aplikasi non-superuser.
- Validasi environment dengan Zod (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `AUTH_SESSION_MAX_AGE`), `.env.example` tanpa secret, dan `.gitignore` yang mengabaikan `.env*` kecuali `.env.example`.
- Koneksi database dengan Drizzle ORM (satu instance `db`, transaksi interaktif) dan mekanisme migrasi maju yang idempoten.
- Autentikasi admin Better Auth: login, logout, sesi database-backed dengan masa berlaku absolut (`AUTH_SESSION_MAX_AGE`), satu role Admin (BR-14).
- Registrasi publik dinonaktifkan; endpoint sign-up ditolak dan `/sign-up` mengembalikan 404.
- Rate limiting login termasuk scope: penyimpanan database, 5 request per 900 detik per IP, ditandai PROVISIONAL (NFR-SEC-04 USULAN).
- Proteksi rute `/admin` berlapis: proxy melakukan pengecekan optimistis dan helper server wajib di setiap page, Server Action, dan Route Handler, ditegakkan lewat tes statis.
- Proteksi open redirect: redirect pasca-login hanya ke path internal di bawah `/admin`.
- Halaman `/login` (form Zod bersama klien/server) dan dashboard `/admin` kosong untuk membuktikan proteksi rute.
- Skrip seed `scripts/seed-admin.ts` untuk admin pertama (email/password dari prompt interaktif, konfirmasi target database).
- Infrastruktur tes Vitest dengan harness PostgreSQL asli: database uji terpisah, pengaman akhiran `_test`, eksekusi serial, dan `truncateAll()`.

## Capabilities

### New Capabilities

- `project-foundation`: Fondasi teknis aplikasi (Next.js App Router dengan TypeScript strict, Drizzle ORM dengan PostgreSQL native Windows, validasi environment dengan Zod, migrasi database, dan infrastruktur pengujian Vitest + PostgreSQL asli). Mengacu pada TDR D1, D2, D4, D5, D10.
- `admin-auth`: Autentikasi admin dengan Better Auth (login, logout, sesi absolut, registrasi publik dinonaktifkan, satu role Admin, kebijakan password, rate limiting, atribut cookie, proteksi rute `/admin`, proteksi open redirect, halaman login/dashboard, seed admin pertama). Mengacu pada BR-14 dan NFR-SEC-01–07 (USULAN), serta TDR D3.

### Modified Capabilities

- Tidak ada. Ini adalah change pertama yang memperkenalkan kemampuan baru.

## Impact

- **Kode baru**: `src/lib/` (env, load-env, auth, db), `src/modules/auth/` (helper dan resolveSafeRedirect), `src/app/` (route handler, halaman login, dashboard), `src/proxy.ts` (atau `src/middleware.ts` menurut versi Next.js, lihat V16), `drizzle.config.ts`, `vitest.config.ts`, `migrations/`, `tests/`, `scripts/seed-admin.ts`.
- **Dependencies**: `better-auth`, `drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg`, `zod`, `dotenv`, `@inquirer/prompts`, `tsx`, `vitest`, `ts-morph`, `jsdom` (dev), `@testing-library/react` (dev), `@vitejs/plugin-react` (dev, hanya bila V17 mensyaratkan), ditambah paket bawaan scaffold Next.js (`next`, `react`, `typescript`, `eslint`, `eslint-config-next`, `tailwindcss`).
- **Database**: Dua database PostgreSQL native Windows: `venue_booking` (development) dan `venue_booking_test` (testing) dengan role `app_user`. Schema awal hanya tabel Better Auth (termasuk `rateLimit`); tanpa tabel domain.
- **Routes**: `/login`, `/admin` (dashboard kosong), dan `/api/auth/[...all]`. Rute `/admin` dilindungi.
- **Scripts**: `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run db:migrate`, `npm run db:generate`, dan `npx tsx scripts/seed-admin.ts`.
- **Documentation**: `.env.example` dan README (prasyarat, role/database, migrasi, seed).

## Keputusan

1. Monolit Next.js (App Router, TypeScript strict) tanpa server API terpisah (TDR D1).
2. Akses database memakai Drizzle ORM dengan transaksi interaktif (TDR D2).
3. Autentikasi admin memakai Better Auth, satu role Admin, customer tanpa akun (TDR D3, BR-14).
4. Validasi environment dengan Zod, skema sama di form dan server (TDR D4).
5. Pengujian aturan bisnis dan auth memakai Vitest dengan PostgreSQL asli, bukan mock (TDR D5).
6. PostgreSQL native Windows tanpa Docker, dua database terpisah dan role khusus non-superuser (TDR D10).
7. Sesi database-backed dengan masa berlaku absolut (default 604800 detik) dan tidak diperpanjang saat dipakai (NFR-SEC-01 USULAN).
8. Satu fungsi `createAuth({ allowSignUp })`; sign-up publik dinonaktifkan pada instance aplikasi.
9. Rate limiting login (Better Auth, penyimpanan database) masuk change ini: 5 request per 900 detik per IP, ditandai PROVISIONAL; efektivitasnya bergantung pada header IP yang diisi platform (TDR D11, NFR-SEC-04 USULAN).
10. Form login memakai client SDK Better Auth yang mengirim HTTP ke route handler sehingga selalu melewati rate limiter; tes memanggil route handler langsung (TDR D12).

## Pertanyaan Terbuka

1. **Pembuatan akun staf tambahan** (change berikutnya): BR-14 mengizinkan beberapa akun dengan satu role Admin; change ini hanya menyediakan skrip seed untuk admin pertama.
2. **Persetujuan NFR keamanan** (`docs/nfr-keamanan-usulan.md`): NFR-SEC-01 sampai NFR-SEC-07 berstatus DIUSULKAN; requirement yang merujuknya diberi tanda USULAN sampai disetujui.
3. **Penyedia database untuk deploy (TDR D10)**: dev/uji memakai PostgreSQL native Windows; penyedia untuk deploy belum diputuskan.
4. **Format Bukti Booking (TDR D6)** dan **captcha form publik (TDR D8)**: belum diputuskan dan tidak termasuk change ini.

## Di luar scope

- Tabel domain (venue, paket, reservasi, pembayaran, dan lainnya).
- Halaman publik, kalender, pengajuan reservasi, dan input booking oleh admin (BR-31).
- Perlindungan cek status booking dan rate limiting form publik (BR-32) — menjadi bagian change `booking-proof`.
- Bukti Booking dan PDF (TDR D6), captcha (TDR D8).
- Cron/job terjadwal (auto-cancel dan SELESAI).
- Galeri dan object storage (TDR D7).
- Reschedule, pembayaran, dan verifikasi pembayaran.
- Role Owner dan laporan (ditolak, BR-14).
- Diskon dan refund.
- Playwright (di luar Vitest).
- Styling lanjutan (Tailwind standar saja).
- Deploy ke Vercel.
