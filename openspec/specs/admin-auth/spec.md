# admin-auth Specification

## Purpose

Menyediakan autentikasi admin yang aman menggunakan Better Auth. Mencakup login, logout, sesi database-backed dengan masa berlaku absolut, proteksi rute `/admin`, rate limiting, dan skrip seed untuk membuat akun admin pertama.

**Jejak:** BR-14, NFR-SEC-01–07 (DISETUJUI)

## Requirements

### Requirement: Autentikasi Email dan Password

Sistem SHALL mengimplementasikan autentikasi admin dengan email dan password. Sesi SHALL disimpan di database dengan masa berlaku absolut dari `AUTH_SESSION_MAX_AGE` dan SHALL NOT diperpanjang saat dipakai.

**Jejak:** NFR-SEC-01 (DISETUJUI)

#### Scenario: Login berhasil

- **WHEN** admin memasukkan email dan password yang valid
- **THEN** sistem membuat sesi di database dan mengarahkan ke `/admin`

#### Scenario: Login gagal

- **WHEN** admin memasukkan email atau password yang salah
- **THEN** sistem menampilkan pesan "Email atau password salah"
- **AND** pesan tidak membedakan apakah email atau password yang salah

#### Scenario: Sesi tidak diperpanjang

- **WHEN** admin yang sudah login melakukan aktivitas
- **THEN** masa berlaku sesi tetap sama (tidak diperpanjang)

#### Scenario: Sesi kedaluwarsa

- **WHEN** masa berlaku sesi telah habis
- **THEN** admin harus login ulang untuk mengakses rute terproteksi

#### Scenario: AUTH_SESSION_MAX_AGE menentukan masa berlaku

- **WHEN** `AUTH_SESSION_MAX_AGE` diset ke nilai tertentu
- **THEN** masa berlaku sesi mengikuti nilai tersebut

### Requirement: Logout dan Pencabutan Sesi

Sistem SHALL menyediakan fungsi logout yang menghapus sesi dari database dan mengarahkan ke `/login`. Sesi yang dicabut atau kedaluwarsa SHALL langsung tidak berlaku tanpa cache sesi di cookie.

**Jejak:** NFR-SEC-01 (DISETUJUI)

#### Scenario: Logout berhasil

- **WHEN** admin yang sudah login melakukan logout
- **THEN** sesi dihapus dari database
- **AND** admin diarahkan ke `/login`

#### Scenario: Sesi yang dicabut tidak berlaku

- **WHEN** sesi telah dicabut dari database
- **THEN** request dengan cookie sesi tersebut ditolak tanpa menunggu cache expire

### Requirement: Registrasi Publik Dinonaktifkan

Registrasi publik SHALL dinonaktifkan. Permintaan HTTP ke endpoint sign-up SHALL ditolak. Sistem SHALL NOT menyediakan halaman registrasi publik.

**Jejak:** BR-14, NFR-SEC-03 (DISETUJUI)

#### Scenario: Endpoint sign-up ditolak

**GERBANG:** Status code penolakan ditentukan oleh tes (lihat bagian Better Auth Integration dengan Next.js dan bagian Proteksi Rute: Dua Helper Functions di design.md).

- **WHEN** user mengirim request ke endpoint sign-up
- **THEN** request ditolak dengan status code error (ditentukan tes)

#### Scenario: Tidak ada halaman registrasi

- **WHEN** user mengakses `/sign-up` atau rute registrasi lainnya
- **THEN** sistem mengembalikan 404

### Requirement: Satu Role Operasional

Sistem SHALL memiliki satu role operasional: Admin. Semua akun adalah Admin. Customer SHALL NOT memiliki akun.

**Jejak:** BR-14

#### Scenario: Semua akun adalah Admin

- **WHEN** akun dibuat melalui seed script
- **THEN** akun tersebut memiliki akses penuh sebagai Admin

### Requirement: Kebijakan Password

Password SHALL minimal 12 karakter. Kebijakan ini SHALL ditegakkan di konfigurasi auth, bukan hanya di seed script. Hashing password SHALL menggunakan algoritma bawaan Better Auth (scrypt).

**Jejak:** NFR-SEC-01 (DISETUJUI)

#### Scenario: Password minimal 12 karakter ditegakkan

- **WHEN** API auth dipanggil langsung (bukan lewat validasi seed) dengan password kurang dari 12 karakter
- **THEN** sistem menolak dengan pesan galat

#### Scenario: Password tidak tersimpan sebagai plaintext

**GERBANG:** Verifikasi format hash scrypt (lihat bagian Password Hashing: Scrypt (Better Auth Default) di design.md).

- **WHEN** akun credential dibuat melalui seed script
- **THEN** password tidak tersimpan sebagai plaintext di database
- **AND** akun credential tersebut dapat dipakai login

### Requirement: Rate Limiting Login

Sistem SHALL membatasi jumlah request ke jalur sign-in per jendela waktu per sumber IP. Pembatasan SHALL disimpan di database. Batas konkret: 5 request per 900 detik (15 menit).

**Jejak:** NFR-SEC-04 (DISETUJUI, PROVISIONAL)

**PROVISIONAL:** Efektif hanya jika header IP diisi oleh platform, bukan klien.

**GERBANG:** Verifikasi bahwa header IP untuk deployment platform (Vercel) diisi oleh platform dan tidak dapat dipalsukan klien (lihat bagian Konfigurasi Better Auth Tunggal di design.md).

**Catatan:** Request ke jalur sign-in yang berhasil juga dihitung terhadap batas.

#### Scenario: Request ke-6 ditolak

- **WHEN** sumber IP yang sama mengirim 6 request ke jalur sign-in dalam jendela 900 detik
- **THEN** request ke-6 ditolak (status ditentukan tes)

#### Scenario: Rate limit direset setelah jendela waktu

- **WHEN** jendela waktu 900 detik telah berlalu sejak request pertama
- **THEN** sumber IP yang sama dapat mengirim 5 request baru

### Requirement: Atribut Cookie Sesi

Cookie sesi SHALL memiliki atribut: httpOnly, SameSite Lax atau Strict, dan Secure di production.

**Jejak:** NFR-SEC-02 (DISETUJUI)

**GERBANG:** Nilai default Better Auth untuk httpOnly dan SameSite harus diverifikasi melalui tes yang memeriksa header Set-Cookie dari respons login nyata (lihat bagian Cookie Attributes (Better Auth) di design.md).

#### Scenario: Cookie memiliki atribut httpOnly

- **WHEN** respons login diperiksa
- **THEN** header Set-Cookie mengandung atribut httpOnly

#### Scenario: Cookie memiliki atribut SameSite

- **WHEN** respons login diperiksa
- **THEN** header Set-Cookie mengandung atribut SameSite=Lax atau SameSite=Strict

#### Scenario: Cookie Secure di production

- **WHEN** aplikasi berjalan di production
- **THEN** cookie sesi memiliki atribut Secure

### Requirement: Proteksi Rute /admin dengan Proxy dan Helper

Rute `/admin` dan semua subpath SHALL dilindungi dengan dua lapis:
1. Proxy melakukan pengecekan optimistis (keberadaan cookie tanpa nama literal)
2. Helper server WAJIB dipanggil di setiap page, Server Action, dan Route Handler di bawah `/admin`

Header path asli SHALL diatur oleh proxy pada REQUEST headers dan SHALL menimpa nilai dari klien.

**Jejak:** NFR-SEC-05 (DISETUJUI)

#### Scenario: Akses tanpa login ke /admin diredirect oleh proxy

- **WHEN** user tanpa cookie sesi mengakses `/admin`
- **THEN** proxy redirect ke `/login` dengan query parameter redirect

#### Scenario: Page memanggil requireAdminSession

- **WHEN** page di `/admin` diakses dengan sesi valid
- **THEN** helper `requireAdminSession()` memverifikasi sesi dari database

#### Scenario: Page tanpa sesi diredirect dengan path asli

- **WHEN** page di `/admin/settings` diakses tanpa sesi valid
- **THEN** helper redirect ke `/login?redirect=/admin/settings`

#### Scenario: Route Handler mengembalikan 401

- **WHEN** Route Handler di `/admin` dipanggil tanpa sesi valid
- **THEN** helper `getAdminSessionOrNull()` mengembalikan null
- **AND** handler mengembalikan respons 401

#### Scenario: Header path asli menimpa nilai klien

- **WHEN** request ke `/admin` diterima dengan header `x-original-pathname` dari klien
- **THEN** proxy menimpa header tersebut dengan pathname request sebenarnya

#### Scenario: Cookie ada tetapi sesi tidak valid

- **WHEN** request membawa cookie sesi tetapi sesi tidak valid atau kedaluwarsa
- **THEN** proxy meloloskan request
- **AND** helper menolak dan redirect ke `/login`

#### Scenario: /login dan /api/auth/* tidak diproteksi proxy

- **WHEN** request menuju `/login` atau `/api/auth/*`
- **THEN** proxy tidak memblokir request tersebut

#### Scenario: Server Action tanpa sesi tidak menjalankan logika aksi

- **WHEN** Server Action dipanggil tanpa sesi valid
- **THEN** helper menolak sebelum logika aksi dijalankan

### Requirement: Penegakan Pemanggilan Helper

Setiap file dengan directive `'use server'` di `src/**` serta setiap page dan route di `src/app/admin/**` SHALL memanggil helper yang sesuai. Pemeriksaan SHALL memverifikasi PEMANGGILAN (bukan hanya import). Daftar pengecualian kosong secara default.

**Jejak:** NFR-SEC-05 (DISETUJUI)

#### Scenario: File 'use server' wajib memanggil helper

- **WHEN** file dengan `'use server'` di `src/**` diperiksa
- **THEN** file tersebut harus memanggil `requireAdminSession()`

#### Scenario: Page di /admin wajib memanggil helper

- **WHEN** file page di `src/app/admin/**` diperiksa
- **THEN** file tersebut harus memanggil `requireAdminSession()`

#### Scenario: Route di /admin wajib memanggil helper

- **WHEN** file route di `src/app/admin/**/route.{ts,tsx}` diperiksa
- **THEN** file tersebut harus memanggil `getAdminSessionOrNull()`

#### Scenario: Tes statis mendeteksi file tanpa helper

- **WHEN** tes statis dijalankan
- **THEN** file yang tidak memanggil helper dilaporkan sebagai gagal

### Requirement: Proteksi Open Redirect

Setelah login, redirect SHALL hanya ke path internal `/admin` atau path yang diawali `/admin/`. Fallback SHALL `/admin`. Parameter `redirect` SHALL di-encode saat dibuat sehingga nilai path tetap utuh saat dibaca kembali.

**Jejak:** NFR-SEC-06 (DISETUJUI); US-025

#### Scenario: https://evil.com ditolak

- **WHEN** parameter redirect adalah `https://evil.com`
- **THEN** sistem redirect ke `/admin`

#### Scenario: https://evil.com/admin ditolak

- **WHEN** parameter redirect adalah `https://evil.com/admin`
- **THEN** sistem redirect ke `/admin`

#### Scenario: //evil.com ditolak

- **WHEN** parameter redirect adalah `//evil.com`
- **THEN** sistem redirect ke `/admin`

#### Scenario: /\evil.com ditolak

- **WHEN** parameter redirect adalah `/\evil.com`
- **THEN** sistem redirect ke `/admin`

#### Scenario: /%2F/evil.com ditolak

- **WHEN** parameter redirect adalah `/%2F/evil.com`
- **THEN** sistem redirect ke `/admin`

#### Scenario: Karakter tab ditolak

- **WHEN** parameter redirect mengandung karakter tab sebenarnya (bukan string "\t")
- **THEN** sistem redirect ke `/admin`

#### Scenario: /administrator ditolak

- **WHEN** parameter redirect adalah `/administrator`
- **THEN** sistem redirect ke `/admin`

#### Scenario: /admin/../login ditolak

- **WHEN** parameter redirect adalah `/admin/../login`
- **THEN** sistem redirect ke `/admin`

#### Scenario: /admin%2F.. ditolak

- **WHEN** parameter redirect adalah `/admin%2F..`
- **THEN** sistem redirect ke `/admin`

#### Scenario: /admin%5C.. ditolak

- **WHEN** parameter redirect adalah `/admin%5C..`
- **THEN** sistem redirect ke `/admin`

#### Scenario: /admin/%2e%2e/login ditolak

- **WHEN** parameter redirect adalah `/admin/%2e%2e/login`
- **THEN** sistem redirect ke `/admin`

#### Scenario: /admin diterima

- **WHEN** parameter redirect adalah `/admin`
- **THEN** sistem redirect ke `/admin`

#### Scenario: /admin/settings diterima

- **WHEN** parameter redirect adalah `/admin/settings`
- **THEN** sistem redirect ke `/admin/settings`

#### Scenario: Parameter redirect kosong atau tidak ada

- **WHEN** parameter redirect kosong atau tidak ada
- **THEN** sistem redirect ke `/admin`

#### Scenario: Sanitasi redirect dipakai di dua titik

- **WHEN** parameter redirect dibuat dan ketika dipakai di halaman login
- **THEN** `resolveSafeRedirect()` dipakai di kedua titik tersebut

#### Scenario: Parameter redirect ter-encode saat dibuat

- **WHEN** sistem membuat parameter `redirect` berisi path seperti `/admin/settings`
- **THEN** nilai path di-encode pada URL sehingga halaman login membacanya kembali sebagai `/admin/settings` melalui `searchParams.get("redirect")`

### Requirement: Halaman Login dan Dashboard

Sistem SHALL menyediakan halaman `/login` dengan form email dan password yang divalidasi dengan skema Zod yang sama di klien dan server; login yang dibatasi laju SHALL menampilkan pesan khusus yang berbeda dari pesan kredensial salah. Sistem SHALL menyediakan kerangka admin `/admin` dengan sidebar gelap, header, tombol logout, dan keadaan kosong, memuat, serta galat.

**Jejak:** NFR-SEC-01, NFR-SEC-05 (DISETUJUI); US-024, US-025

#### Scenario: Form login menampilkan validasi klien

- **WHEN** user memasukkan email tidak valid di form login
- **THEN** pesan validasi ditampilkan tanpa mengirim request ke server

#### Scenario: Form login menampilkan validasi server

- **WHEN** user memasukkan data valid di form login tetapi kredensial salah
- **THEN** server mengembalikan pesan galat

#### Scenario: Login dibatasi laju menampilkan pesan khusus

- **WHEN** login ditolak karena pembatasan laju (HTTP 429)
- **THEN** form menampilkan pesan khusus tentang percobaan yang terlalu banyak, bukan pesan "Email atau password salah"

#### Scenario: Dashboard hanya dapat diakses dengan sesi valid

- **WHEN** user dengan sesi valid mengakses `/admin`
- **THEN** kerangka admin ditampilkan

#### Scenario: Tombol logout mengakhiri sesi

- **WHEN** admin menekan tombol logout di kerangka admin
- **THEN** sesi diakhiri dan admin diarahkan ke `/login`

#### Scenario: Dashboard menampilkan keadaan kosong, memuat, dan galat

- **WHEN** dashboard memuat data atau gagal memuat data
- **THEN** dashboard menampilkan keadaan kosong, skeleton saat memuat, dan keadaan galat dengan tombol "Coba Lagi"

#### Scenario: Menu tanpa change tidak ditampilkan

- **WHEN** kerangka admin ditampilkan
- **THEN** hanya menu yang sudah memiliki change yang ditampilkan

### Requirement: Seed Admin Pertama

Sistem SHALL menyediakan skrip seed interaktif untuk membuat akun admin pertama. Skrip SHALL:
- Meminta email dan password tanpa nilai default dan tanpa membaca dari environment
- Memvalidasi password minimal 12 karakter
- Menolak jika sudah ada baris di tabel `user`
- Menampilkan host dan nama database target
- Meminta konfirmasi sebelum menulis ke database

**Jejak:** NFR-SEC-07 (DISETUJUI)

**GERBANG:** Akun hasil seed harus dapat login (lihat bagian Seed Script untuk Admin Pertama di design.md untuk verifikasi bentuk argumen `signUpEmail`).

#### Scenario: Email dan password diminta secara interaktif

- **WHEN** skrip seed dijalankan
- **THEN** skrip meminta input email dan password dari terminal

#### Scenario: Password minimal 12 karakter

- **WHEN** user memasukkan password kurang dari 12 karakter
- **THEN** skrip menolak dengan pesan galat

#### Scenario: Seed menolak jika admin sudah ada

- **WHEN** tabel `user` sudah berisi baris
- **THEN** skrip menolak dengan pesan "Admin sudah ada"

#### Scenario: Target database ditampilkan

- **WHEN** skrip seed dijalankan
- **THEN** host dan nama database dari `DATABASE_URL` ditampilkan

#### Scenario: Konfirmasi sebelum menulis

- **WHEN** skrip seed menampilkan target database
- **THEN** skrip meminta konfirmasi (y/n) sebelum membuat akun

#### Scenario: Konfirmasi dijawab tidak

- **WHEN** user menjawab konfirmasi dengan "n"
- **THEN** tidak ada akun yang dibuat
- **AND** skrip berhenti tanpa galat

#### Scenario: Akun hasil seed dapat login

**GERBANG:** Verifikasi dengan tes integrasi bahwa akun yang dibuat oleh seed script dapat login.

- **WHEN** akun dibuat melalui seed script
- **THEN** akun tersebut dapat login dengan email dan password yang dimasukkan
