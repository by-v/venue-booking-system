# project-foundation Specification

## Purpose

Menyediakan fondasi teknis aplikasi Next.js App Router dengan TypeScript, termasuk konfigurasi database PostgreSQL dengan Drizzle ORM, validasi environment dengan Zod, mekanisme migrasi, dan infrastruktur pengujian dengan Vitest menggunakan PostgreSQL asli.

**Jejak:** TDR D1, D2, D4, D5, D10

## Requirements

### Requirement: Aplikasi Next.js App Router dengan TypeScript Strict

Aplikasi SHALL menggunakan Next.js dengan App Router dan TypeScript dengan strict mode aktif. Struktur folder SHALL memisahkan UI (pages), Server Actions, dan modul domain.

**Jejak:** TDR D1

#### Scenario: Build berhasil tanpa galat TypeScript

- **WHEN** developer menjalankan `npm run build`
- **THEN** aplikasi terbangun tanpa galat TypeScript

#### Scenario: Strict mode mendeteksi implicit any

- **WHEN** kode mengandung implicit any atau referensi nullish yang tidak diperiksa
- **THEN** TypeScript compiler menolak dengan galat

#### Scenario: Modul tidak mengimpor dari app

- **WHEN** modul di `src/modules` diperiksa
- **THEN** modul tersebut tidak mengimpor dari `src/app`
- **AND** arah ketergantungan ini diperiksa dengan tes statis

### Requirement: Koneksi PostgreSQL dengan Drizzle ORM

Aplikasi SHALL terhubung ke PostgreSQL melalui Drizzle ORM dengan SATU instance `db` yang mendukung transaksi interaktif. Database configuration SHALL menggunakan environment variable `DATABASE_URL`.

**Jejak:** TDR D2

#### Scenario: Koneksi database berhasil

- **WHEN** aplikasi menginisialisasi koneksi database
- **THEN** koneksi berhasil tanpa galat

#### Scenario: Transaksi dapat di-commit

- **WHEN** kode mengeksekusi transaksi dengan callback
- **THEN** transaksi dapat di-commit secara eksplisit

#### Scenario: Transaksi dapat di-rollback

- **WHEN** kode mengeksekusi transaksi dengan callback dan memanggil rollback
- **THEN** perubahan dalam transaksi dibatalkan

### Requirement: Validasi Environment dengan Zod

Variabel environment berikut SHALL divalidasi dengan Zod melalui fungsi murni `parseEnv(source)`:
- `DATABASE_URL`: connection string PostgreSQL (wajib)
- `BETTER_AUTH_SECRET`: minimal 32 karakter, tanpa nilai default (wajib); nilai placeholder dari `.env.example` (mengandung kata `CHANGE_ME`, tanpa membedakan huruf besar atau kecil) SHALL DITOLAK
- `BETTER_AUTH_URL`: base URL untuk Better Auth (wajib)
- `AUTH_SESSION_MAX_AGE`: opsional, default 604800 detik

**Jejak:** TDR D4, NFR-SEC-07 (DISETUJUI)

#### Scenario: Semua variabel valid

- **WHEN** semua variabel environment tersedia dan valid
- **THEN** `parseEnv()` mengembalikan objek tervalidasi tanpa galat

#### Scenario: Variabel wajib hilang

- **WHEN** `DATABASE_URL` tidak diset
- **THEN** `parseEnv()` melempar galat dengan pesan yang jelas

#### Scenario: Format variabel salah

- **WHEN** `DATABASE_URL` bukan URL yang valid
- **THEN** `parseEnv()` melempar galat validasi Zod

#### Scenario: BETTER_AUTH_SECRET terlalu pendek

- **WHEN** `BETTER_AUTH_SECRET` kurang dari 32 karakter
- **THEN** `parseEnv()` melempar galat dengan pesan minimal 32 karakter

#### Scenario: BETTER_AUTH_SECRET masih placeholder

- **WHEN** `BETTER_AUTH_SECRET` berisi nilai placeholder dari `.env.example`
- **THEN** `parseEnv()` melempar galat yang menyebut bahwa secret belum diganti

#### Scenario: Modul env menolak variabel tidak valid saat impor

- **WHEN** modul env dimuat dengan variabel environment tidak valid
- **THEN** modul menolak berjalan dengan galat saat impor

### Requirement: Berkas .env.example Tanpa Secret

Proyek SHALL menyediakan `.env.example` yang berisi semua variabel environment yang diperlukan dengan nilai placeholder. Berkas ini SHALL NOT berisi secret atau nilai produksi.

**Jejak:** TDR D4

#### Scenario: Developer menyalin .env.example

- **WHEN** developer menyalin `.env.example` ke `.env.local`
- **THEN** berkas berisi semua variabel dengan placeholder yang jelas

#### Scenario: Tidak ada secret di .env.example

- **WHEN** `.env.example` diperiksa
- **THEN** tidak ada password, API key, atau nilai sensitif

### Requirement: Git Ignore untuk Environment Files

Proyek SHALL menyertakan `.gitignore` yang mengecualikan semua berkas `.env*` KECUALI `.env.example`.

**Jejak:** TDR D4

#### Scenario: Gitignore melindungi env files

- **WHEN** git status diperiksa
- **THEN** `.env.local`, `.env.production`, dan berkas `.env*` lainnya diabaikan
- **AND** `.env.example` tetap dilacak

### Requirement: Pemuatan .env.local oleh Tool

Tool eksternal (migrasi, seed, tes) SHALL memuat `.env.local` dengan path eksplisit tanpa menimpa variabel yang sudah ada.

**Jejak:** TDR D4, D5

#### Scenario: Drizzle Kit membaca environment

- **WHEN** menjalankan `npx drizzle-kit migrate`
- **THEN** koneksi menggunakan `DATABASE_URL` dari `.env.local`

#### Scenario: Vitest membaca environment

- **WHEN** tes dijalankan
- **THEN** Vitest memuat `.env.local` lalu menggantikan `DATABASE_URL` untuk proses uji dengan nilai `TEST_DATABASE_URL`
- **AND** seluruh koneksi aplikasi di bawah tes menuju database uji

#### Scenario: Seed script membaca environment

- **WHEN** menjalankan seed script
- **THEN** script memuat environment dari `.env.local`

#### Scenario: Variabel tidak ditimpa

- **WHEN** variabel environment sudah diset di shell
- **THEN** nilai dari shell dipertahankan, tidak ditimpa dari `.env.local`

### Requirement: Migrasi Database

Sistem SHALL menyediakan mekanisme migrasi yang hanya maju (tidak ada rollback). Migrasi SHALL idempoten (aman dijalankan berulang). Status migrasi SHALL tercatat di database. File migrasi SHALL di-commit ke repository.

**Jejak:** TDR D2

#### Scenario: Menjalankan migrasi

- **WHEN** developer menjalankan command migrasi
- **THEN** skema database diperbarui sesuai file migrasi terbaru

#### Scenario: Tidak ada migrasi pending

- **WHEN** developer menjalankan migrasi ketika semua sudah diterapkan
- **THEN** sistem melaporkan tidak ada migrasi baru

#### Scenario: Migrasi idempoten

- **WHEN** migrasi yang sama dijalankan dua kali
- **THEN** migrasi kedua tidak mengubah skema dan tidak gagal

### Requirement: Tabel Better Auth dari Migrasi

Semua tabel Better Auth, termasuk tabel `rateLimit`, SHALL dibuat HANYA dari migrasi. Tabel SHALL NOT dibuat otomatis saat runtime.

**Jejak:** TDR D2, D3

#### Scenario: Tabel rateLimit ada dari migrasi

- **WHEN** migrasi dijalankan
- **THEN** tabel `rateLimit` ada di database

#### Scenario: Tidak ada selisih skema

- **WHEN** aplikasi Better Auth diinisialisasi di environment test
- **THEN** Better Auth tidak melaporkan selisih skema

#### Scenario: Database tanpa migrasi tidak membuat tabel otomatis

**GERBANG:** Verifikasi bagaimana selisih skema dilaporkan (log atau galat) agar dapat diperiksa tes.

- **WHEN** aplikasi dijalankan pada database tanpa migrasi
- **THEN** aplikasi tidak membuat tabel Better Auth sendiri
- **AND** aplikasi gagal atau melaporkan selisih skema

### Requirement: Database Uji Terpisah

Sistem SHALL menggunakan database PostgreSQL terpisah untuk tes. Harness SHALL menolak berjalan jika:
- `TEST_DATABASE_URL` tidak diset
- Nama database dari hasil parse URL tidak berakhiran `_test`
- Nama database sama dengan database development

**Jejak:** TDR D5

#### Scenario: Harness menolak tanpa TEST_DATABASE_URL

- **WHEN** harness setup dijalankan tanpa `TEST_DATABASE_URL`
- **THEN** harness menolak dengan galat yang jelas

#### Scenario: Harness menolak database tanpa suffix _test

- **WHEN** `TEST_DATABASE_URL` menunjuk database yang tidak berakhiran `_test`
- **THEN** harness menolak dengan pesan galat

#### Scenario: Harness menolak database sama dengan dev

- **WHEN** nama database test sama dengan nama database development
- **THEN** harness menolak dengan pesan galat

#### Scenario: Tes ditolak bila terhubung ke database dev

- **WHEN** tes berjalan dan `SELECT current_database()` mengembalikan database dev
- **THEN** tes dibatalkan dengan galat

### Requirement: Pengecekan current_database()

Sistem SHALL menjalankan `SELECT current_database()` dan memverifikasi hasilnya berakhiran `_test` sebelum:
- Menerapkan migrasi ke database test
- Setiap operasi pembersihan tabel

**Jejak:** TDR D5

#### Scenario: Pengecekan sebelum migrasi

- **WHEN** harness setup menerapkan migrasi
- **THEN** pengecekan `current_database()` dilakukan terlebih dahulu

#### Scenario: Pengecekan sebelum pembersihan

- **WHEN** helper `truncateAll()` dijalankan
- **THEN** pengecekan `current_database()` dilakukan sebelum TRUNCATE

### Requirement: Migrasi dan Pembersihan Database Uji

Migrasi SHALL diterapkan ke database test sebelum tes berjalan. Pembersihan antar tes SHALL mengosongkan semua tabel aplikasi (bukan tabel migrasi).

**Jejak:** TDR D5

#### Scenario: Migrasi diterapkan sebelum tes

- **WHEN** suite tes dimulai
- **THEN** semua migrasi diterapkan ke database test terlebih dahulu

#### Scenario: Database dibersihkan antar tes

- **WHEN** setiap test case selesai
- **THEN** semua tabel aplikasi dikosongkan dengan TRUNCATE CASCADE

#### Scenario: Tabel migrasi tidak dibersihkan

**GERBANG:** Verifikasi letak dan nama tabel migrasi (lihat bagian Database Test di design.md).

- **WHEN** pembersihan dijalankan
- **THEN** tabel migrasi Drizzle tidak di-truncate

### Requirement: Tes Database Serial

Tes yang menggunakan database SHALL berjalan secara serial (tidak paralel) untuk mencegah race condition pada database uji tunggal.

**Jejak:** TDR D5

#### Scenario: Tes database tidak bertabrakan

- **WHEN** beberapa test file yang menggunakan database dijalankan
- **THEN** tes berjalan satu per satu, tidak paralel

### Requirement: Skrip NPM Tersedia

Proyek SHALL menyediakan skrip npm berikut yang dapat dijalankan dan lulus:
- `npm run lint`: ESLint tanpa galat
- `npm run typecheck`: TypeScript compiler tanpa galat
- `npm run build`: Build Next.js berhasil
- `npm run test`: Semua tes Vitest lulus

**Jejak:** TDR D1, D4, D5

#### Scenario: Lint lulus

- **WHEN** developer menjalankan `npm run lint`
- **THEN** ESLint melaporkan tanpa galat

#### Scenario: Typecheck lulus

- **WHEN** developer menjalankan `npm run typecheck`
- **THEN** TypeScript compiler melaporkan tanpa galat

#### Scenario: Build lulus

- **WHEN** developer menjalankan `npm run build`
- **THEN** aplikasi terbangun tanpa galat

#### Scenario: Tes lulus

- **WHEN** developer menjalankan `npm run test`
- **THEN** semua tes Vitest lulus
