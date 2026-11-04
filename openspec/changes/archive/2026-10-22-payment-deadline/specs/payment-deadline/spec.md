# Spec Delta

## Purpose

Menampilkan batas pelunasan H-14 dan penanda keterlambatan kepada admin agar risiko pelunasan terlihat, tanpa menjalankan konsekuensi pembatalan yang masih menunggu keputusan T-01b.

## ADDED Requirements

### Requirement: Batas pelunasan diturunkan dari tanggal acara

Sistem SHALL menurunkan `payment_due_date` dari tanggal acara reservasi dikurangi 14 hari kalender. Nilai SHALL dihitung ulang dari tanggal acara terkini setiap kali dibaca dan SHALL NOT disimpan sebagai nilai manual. Tanggal aturan SHALL mengikuti WIB.

**Jejak:** BR-08; US-110; `docs/roadmap.md` Change 10

#### Scenario: Acara 30 Maret memiliki batas 16 Maret

- **WHEN** tanggal acara reservasi adalah 30 Maret 2026
- **THEN** `payment_due_date` adalah 16 Maret 2026

#### Scenario: Batas melewati awal bulan

- **WHEN** tanggal acara reservasi adalah 1 Maret 2026
- **THEN** `payment_due_date` adalah 15 Februari 2026

#### Scenario: Batas mengikuti tanggal acara setelah reschedule

- **WHEN** tanggal acara berubah dari 30 Maret 2026 menjadi 10 April 2026
- **THEN** `payment_due_date` berubah menjadi 27 Maret 2026 tanpa nilai lama tersimpan

### Requirement: Batas pelunasan inklusif dan penanda keterlambatan

Sistem SHALL menganggap pembayaran tepat waktu sampai dan termasuk `payment_due_date`. Sistem SHALL menandai `pelunasan_terlambat` ketika tanggal hari ini WIB lebih besar dari `payment_due_date` dan status pembayaran reservasi bukan `LUNAS`. Reservasi berstatus pembayaran `LUNAS` SHALL NOT ditandai terlambat.

**Jejak:** BR-08; BR-20; T-01b (TERBUKA); US-110

**GERBANG:** Penanda ini hanya informasi. Eksekusi pembatalan, akibat DP, dan status hasil tetap menunggu T-01b dan SHALL NOT dijalankan oleh change ini.

#### Scenario: Lunas pada batas masih tepat waktu

- **WHEN** `payment_due_date` adalah 16 Maret 2026, status pembayaran `LUNAS`, dan hari ini 16 Maret 2026
- **THEN** reservasi tidak ditandai `pelunasan_terlambat`

#### Scenario: Belum lunas pada batas belum terlambat

- **WHEN** `payment_due_date` adalah 16 Maret 2026, status pembayaran `DP`, dan hari ini 16 Maret 2026
- **THEN** reservasi belum ditandai `pelunasan_terlambat`

#### Scenario: Belum lunas sehari setelah batas ditandai terlambat

- **WHEN** `payment_due_date` adalah 16 Maret 2026, status pembayaran `DP`, dan hari ini 17 Maret 2026
- **THEN** reservasi ditandai `pelunasan_terlambat`

#### Scenario: Reservasi lunas tidak ditandai terlambat

- **WHEN** status pembayaran reservasi `LUNAS` dan hari ini sudah melewati `payment_due_date`
- **THEN** reservasi tidak ditandai `pelunasan_terlambat`

#### Scenario: Reschedule dapat menggeser penanda

- **WHEN** tanggal acara dipindahkan ke tanggal yang membuat `payment_due_date` baru belum lewat
- **THEN** penanda `pelunasan_terlambat` dihitung ulang dan tidak lagi aktif

### Requirement: Batas pelunasan tampil pada detail reservasi admin

Detail reservasi admin SHALL menampilkan `payment_due_date` dan, bila berlaku, penanda `pelunasan_terlambat` pada ringkasan pembayaran yang sudah ada. Change ini SHALL NOT menambah layar, menu, atau widget dashboard baru.

**Jejak:** BR-08; US-110; `docs/design/ui-spec.md` 4.2 (Reservasi)

#### Scenario: Admin melihat batas pelunasan

- **WHEN** admin membuka detail reservasi
- **THEN** halaman menampilkan tanggal batas pelunasan yang diturunkan dari tanggal acara

#### Scenario: Admin melihat penanda keterlambatan

- **WHEN** admin membuka detail reservasi yang belum lunas dan sudah melewati batas pelunasan
- **THEN** ringkasan pembayaran menampilkan penanda `pelunasan_terlambat`

#### Scenario: Tidak ada layar baru

- **WHEN** admin membuka area admin setelah change ini
- **THEN** tidak ada menu atau layar baru untuk batas pelunasan

### Requirement: Batas pelunasan tidak mengubah data operasional

Menghitung atau menampilkan batas pelunasan SHALL NOT mengubah status reservasi, pembayaran, `date_lock`, ketersediaan, atau batas auto-cancel. Sistem SHALL NOT membatalkan reservasi, menghanguskan DP, atau menetapkan status hasil karena keterlambatan pelunasan.

**Jejak:** BR-08; BR-17a; BR-24; T-01b (TERBUKA)

#### Scenario: Membuka detail tidak mengubah status

- **WHEN** admin membuka detail reservasi yang sudah melewati batas pelunasan
- **THEN** status reservasi dan riwayat status tidak berubah

#### Scenario: Tidak ada pembatalan otomatis

- **WHEN** reservasi belum lunas melewati `payment_due_date`
- **THEN** sistem tidak mengubah status, tidak membebaskan tanggal, dan tidak menandai DP hangus

#### Scenario: Tidak ada perubahan pembayaran atau kunci tanggal

- **WHEN** batas pelunasan ditampilkan
- **THEN** tidak ada baris `payment` atau `date_lock` yang ditambah, diubah, atau dihapus

### Requirement: Batas pelunasan hanya untuk admin

Batas pelunasan dan penanda keterlambatan SHALL NOT ditampilkan pada halaman publik, cek status, atau Bukti Booking. Respons yang dapat diakses customer SHALL NOT memuat nilai tersebut.

**Jejak:** BR-05; BR-10; US-070; US-110

#### Scenario: Cek status tidak memuat batas pelunasan

- **WHEN** customer membuka cek status
- **THEN** halaman tidak menampilkan `payment_due_date` atau penanda keterlambatan

#### Scenario: Bukti Booking tidak memuat batas pelunasan

- **WHEN** customer membuka atau mencetak Bukti Booking
- **THEN** dokumen tidak memuat `payment_due_date` atau penanda keterlambatan
