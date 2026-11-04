# Spec Delta

## Purpose

Memberi admin sarana membuat reservasi langsung tanpa form publik, mencatat sumber `INPUT_ADMIN`, serta menerima booking langsung dengan tetap menegakkan aturan tanggal dan DP yang berlaku.

## ADDED Requirements

### Requirement: Input reservasi langsung oleh admin

Admin terautentikasi SHALL dapat membuat reservasi baru tanpa form publik dengan data nama, nomor WhatsApp, alamat, jenis acara, paket, tanggal acara, dan catatan. Sistem SHALL menyimpan reservasi berstatus `PENDING`, mencatat sumber `INPUT_ADMIN`, serta tidak membuat nomor booking atau kunci tanggal. Validasi paket aktif, tanggal setelah hari ini WIB, dan tanggal acara serta setup yang bebas SHALL berlaku sama seperti pengajuan publik.

**Jejak:** BR-31; BR-25; BR-26; BR-27; BR-29; BR-18 (PROVISIONAL); state machine T11; US-064

**PROVISIONAL:** himpunan tanggal setup mengikuti BR-18 dengan default roadmap **ya**.

**GERBANG:** bila venue menyatakan setup bawaan tidak memblokir, hanya himpunan tanggal setup yang diperiksa berubah.

#### Scenario: Admin membuat reservasi input langsung

- **WHEN** admin mengirim form input langsung dengan data valid dan tanggal bebas
- **THEN** sistem membuat customer `CALON` dan reservasi `PENDING` dengan sumber `INPUT_ADMIN`, tanpa nomor booking dan tanpa kunci tanggal

#### Scenario: Pengguna tanpa sesi tidak dapat membuat reservasi

- **WHEN** pengguna tanpa sesi memanggil aksi input langsung
- **THEN** pengguna dialihkan ke `/login` dan tidak ada customer atau reservasi yang dibuat

#### Scenario: Tanggal acara atau setup yang terkunci ditolak

- **WHEN** admin memilih tanggal acara yang salah satu tanggal acara atau setup paketnya sudah memiliki kunci reservasi lain
- **THEN** sistem menolak input dan tidak membuat reservasi

#### Scenario: Paket nonaktif dan tanggal lampau ditolak

- **WHEN** admin memilih paket yang sudah dinonaktifkan atau tanggal acara hari ini atau sebelumnya menurut WIB
- **THEN** sistem menolak input

#### Scenario: Nomor WhatsApp yang sama memakai customer yang sama

- **WHEN** admin menginput reservasi dengan nomor WhatsApp customer yang sudah ada
- **THEN** sistem menambahkan reservasi baru pada customer tersebut tanpa membuat customer duplikat

#### Scenario: Riwayat dan aktivitas input admin memakai pelaku ADMIN

- **WHEN** input langsung berhasil disimpan
- **THEN** riwayat status awal mencatat `(baru) → PENDING` dengan pelaku `ADMIN` dan aktivitas pengajuan tercatat sebagai aktivitas substantif

### Requirement: Konfirmasi langsung setelah input admin

Setelah menyimpan reservasi `INPUT_ADMIN` sebagai `PENDING`, admin SHALL dapat memilih tindakan menerima yang menjalankan syarat konfirmasi BR-22. Bila syarat terpenuhi, sistem SHALL menjalankan konfirmasi atomik. Bila syarat tidak terpenuhi, sistem SHALL menolak dan mempertahankan reservasi `PENDING` tanpa nomor booking atau kunci tanggal.

**Jejak:** BR-22; BR-31; state machine T11; US-060; US-064

#### Scenario: Input langsung yang langsung diterima

- **WHEN** admin memilih menerima reservasi input langsung, pembayaran `TERVERIFIKASI` memenuhi DP minimum, dan seluruh tanggal target bebas
- **THEN** status menjadi `DITERIMA`, tanggal terkunci, nomor booking terbit, dan customer menjadi `CLIENT`

#### Scenario: DP kurang membuat reservasi tetap PENDING

- **WHEN** admin memilih menerima reservasi input langsung tetapi pembayaran `TERVERIFIKASI` kurang dari DP minimum
- **THEN** konfirmasi ditolak dan reservasi tetap `PENDING` tanpa kunci tanggal dan tanpa nomor booking

#### Scenario: Tanggal bentrok membuat reservasi tetap PENDING

- **WHEN** admin memilih menerima reservasi input langsung tetapi salah satu tanggal target sudah terkunci reservasi lain
- **THEN** konfirmasi ditolak dan reservasi tetap `PENDING` tanpa kunci parsial

### Requirement: Sumber reservasi tercatat dan dapat dibedakan

Setiap reservasi SHALL mencatat sumbernya: `FORM_PUBLIK` untuk pengajuan form publik dan `INPUT_ADMIN` untuk input admin. Daftar dan detail reservasi admin SHALL menampilkan sumber reservasi agar kedua asal data dapat dibedakan.

**Jejak:** BR-31; US-064

#### Scenario: Pengajuan form publik mencatat sumber FORM_PUBLIK

- **WHEN** customer mengirim form publik yang valid
- **THEN** reservasi tersimpan dengan sumber `FORM_PUBLIK`

#### Scenario: Input admin mencatat sumber INPUT_ADMIN

- **WHEN** admin menyimpan reservasi langsung
- **THEN** reservasi tersimpan dengan sumber `INPUT_ADMIN`

#### Scenario: Sumber tampil pada daftar dan detail admin

- **WHEN** admin membuka daftar atau detail reservasi
- **THEN** sumber reservasi tampil sehingga reservasi input admin dapat dibedakan dari pengajuan form publik

### Requirement: Akses admin untuk input langsung

Halaman dan aksi input reservasi langsung SHALL hanya dapat diakses admin terautentikasi. Pengguna tanpa sesi SHALL dialihkan ke `/login` sebelum data customer, reservasi, atau tanggal berubah.

**Jejak:** NFR-SEC-05 (DISETUJUI); US-064

#### Scenario: Pengguna tanpa sesi dialihkan dari halaman input

- **WHEN** pengguna tanpa sesi membuka halaman input reservasi langsung
- **THEN** pengguna dialihkan ke `/login` dan tidak melihat form

#### Scenario: Pengguna tanpa sesi tidak mengubah data

- **WHEN** pengguna tanpa sesi memanggil aksi input langsung
- **THEN** tidak ada customer, reservasi, kunci tanggal, atau nomor booking yang dibuat
