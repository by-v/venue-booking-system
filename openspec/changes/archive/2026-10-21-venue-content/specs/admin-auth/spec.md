# Spec Delta

## MODIFIED Requirements

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
