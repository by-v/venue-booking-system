# reschedule Specification

## Purpose

Menyediakan perpindahan tanggal reservasi yang sudah diterima oleh admin, maksimal satu kali, dengan batas waktu, perpindahan kunci tanggal atomik, dan riwayat yang tetap tercatat.

## Requirements

### Requirement: Jatah dan status reschedule

Sistem SHALL mengizinkan reschedule hanya untuk reservasi `DITERIMA` yang belum pernah di-reschedule. Permintaan untuk status lain atau saat jatah sudah habis SHALL ditolak tanpa mengubah tanggal, kunci tanggal, nomor booking, status, riwayat, atau jatah.

**Jejak:** BR-15; BR-20; state machine T8; US-080

#### Scenario: Reschedule pertama berhasil

- **WHEN** admin meminta reschedule untuk reservasi `DITERIMA` yang belum pernah di-reschedule
- **THEN** sistem memproses perpindahan tanggal dan jatah reschedule menjadi habis

#### Scenario: Status selain DITERIMA ditolak

- **WHEN** admin meminta reschedule untuk reservasi `PENDING`, `DITANGGUHKAN`, `DIBATALKAN`, `AUTO_CANCELLED`, atau `SELESAI`
- **THEN** sistem menolak tanpa mengubah data reservasi

#### Scenario: Reschedule kedua ditolak

- **WHEN** admin meminta reschedule untuk reservasi yang jatah reschedule-nya sudah habis
- **THEN** sistem menolak dan tanggal serta jatah yang ada tetap tidak berubah

### Requirement: Batas waktu permintaan reschedule

Sistem SHALL menerima permintaan reschedule hanya bila tanggal permintaan menurut WIB tidak melewati tanggal acara lama dikurangi satu bulan kalender. Batas SHALL inklusif. Bila tanggal tujuan tidak ada pada bulan tersebut, sistem SHALL memakai hari terakhir bulan itu. Penolakan SHALL NOT menghabiskan jatah atau mengubah tanggal lama.

**Jejak:** BR-15 (rincian FINAL-DEFAULT); US-080

#### Scenario: Permintaan tepat pada batas diterima

- **WHEN** tanggal acara lama 20 Maret dan admin meminta reschedule pada 20 Februari
- **THEN** sistem menerima permintaan tersebut

#### Scenario: Permintaan melewati batas ditolak

- **WHEN** tanggal acara lama 20 Maret dan admin meminta reschedule pada 21 Februari
- **THEN** sistem menolak, tanggal lama tetap, dan jatah reschedule tetap tersedia

#### Scenario: Batas akhir bulan memakai hari terakhir bulan tujuan

- **WHEN** tanggal acara lama 31 Maret dan admin meminta reschedule pada 28 Februari tahun bukan kabisat
- **THEN** sistem menerima permintaan tersebut; pada 1 Maret permintaan ditolak

### Requirement: Ketersediaan tanggal baru

Tanggal acara baru SHALL setelah hari ini menurut WIB, berbeda dari tanggal acara lama, dan seluruh tanggal acara serta tanggal setup paketnya SHALL bebas dari kunci reservasi lain atau kunci manual. Bila tidak tersedia, reschedule SHALL ditolak tanpa membebaskan kunci lama atau menghabiskan jatah.

**Jejak:** BR-01; BR-15; BR-18 (PROVISIONAL); US-080

**PROVISIONAL:** tanggal setup bawaan paket ikut diperiksa dan dipindahkan mengikuti BR-18, dengan default roadmap **ya**.

**GERBANG:** bila venue menyatakan setup bawaan tidak memblokir, hanya himpunan tanggal setup yang diperiksa dan dipindahkan yang berubah.

#### Scenario: Tanggal baru dan setup tersedia

- **WHEN** tanggal acara baru setelah hari ini dan seluruh tanggal acara serta setup paketnya bebas
- **THEN** sistem menerima reschedule

#### Scenario: Tanggal acara baru sudah terkunci

- **WHEN** tanggal acara baru atau salah satu tanggal setup paketnya sudah dikunci reservasi lain atau kunci manual
- **THEN** sistem menolak, seluruh kunci tanggal lama tetap, dan jatah reschedule tidak berkurang

#### Scenario: Tanggal baru tidak valid atau sudah lewat

- **WHEN** admin mengirim tanggal acara baru yang sudah lewat, hari ini, atau sama dengan tanggal acara lama
- **THEN** sistem menolak tanpa mengubah data reservasi

### Requirement: Perpindahan tanggal atomik

Reschedule yang berhasil SHALL dijalankan dalam satu transaksi yang membebaskan seluruh kunci tanggal lama, mengunci tanggal acara baru beserta setup, mengubah tanggal acara, menaikkan jatah reschedule, dan mencatat riwayat. Status SHALL tetap `DITERIMA` dan nomor booking SHALL NOT berubah. Bila satu langkah gagal, seluruh perubahan SHALL dibatalkan.

**Jejak:** BR-15; BR-19; BR-24; NFR-REL-01; state machine T8; US-080

#### Scenario: Kunci tanggal berpindah dan nomor booking tetap

- **WHEN** reschedule berhasil
- **THEN** kunci tanggal lama tidak ada lagi, kunci tanggal baru beserta setup ada, tanggal acara berubah, status tetap `DITERIMA`, dan nomor booking sama seperti sebelumnya

#### Scenario: Kegagalan di tengah transaksi tidak menyisakan perubahan

- **WHEN** salah satu langkah reschedule gagal setelah transaksi dimulai
- **THEN** tanggal acara, kunci tanggal, jatah, nomor booking, status, dan riwayat kembali seperti sebelum percobaan

### Requirement: Reschedule bersamaan

Sistem SHALL menjamin bahwa dua permintaan reschedule untuk reservasi yang sama tidak sama-sama berhasil. Tepat satu permintaan SHALL berhasil dan permintaan lainnya SHALL ditolak tanpa mengubah data.

**Jejak:** BR-15; NFR-REL-01; US-080

#### Scenario: Dua admin memproses reschedule bersamaan

- **WHEN** dua permintaan reschedule untuk reservasi yang sama dijalankan bersamaan
- **THEN** tepat satu berhasil, sedangkan permintaan lainnya ditolak dan tidak meninggalkan kunci tanggal tambahan atau jatah ganda

### Requirement: Riwayat reschedule

Setiap reschedule yang berhasil SHALL mencatat tanggal acara lama, tanggal acara baru, waktu, dan pelaku admin pada riwayat reschedule. Sistem SHALL juga mencatat perubahan status `DITERIMA` ke `DITERIMA` pada riwayat status dan aktivitas substantif. Riwayat SHALL NOT dihapus.

**Jejak:** BR-15; BR-17a; BR-24; state machine T8; US-080

#### Scenario: Riwayat menyimpan tanggal lama dan baru

- **WHEN** reschedule berhasil
- **THEN** riwayat memuat tanggal acara lama, tanggal acara baru, waktu, dan admin yang mengeksekusi

#### Scenario: Aktivitas reschedule tercatat

- **WHEN** reschedule berhasil
- **THEN** detail reservasi menampilkan riwayat status `DITERIMA` ke `DITERIMA` dan aktivitas reschedule yang bersifat substantif

### Requirement: Tampilan dan akses reschedule admin

Detail reservasi admin SHALL menampilkan form reschedule hanya untuk reservasi `DITERIMA` yang jatah reschedule-nya masih tersedia. Form SHALL meminta tanggal acara baru serta menampilkan batas waktu dan sisa jatah. Aksi SHALL hanya dapat dijalankan admin terautentikasi dan tidak tersedia sebagai form publik.

**Jejak:** US-080; NFR-SEC-05 (DISETUJUI); `docs/design/ui-spec.md` 4.2 (Reservasi)

#### Scenario: Form tampil untuk reservasi yang memenuhi syarat

- **WHEN** admin membuka detail reservasi `DITERIMA` yang belum pernah di-reschedule
- **THEN** halaman menampilkan form tanggal acara baru, batas waktu permintaan, dan sisa jatah

#### Scenario: Form tidak tampil saat jatah habis atau status tidak sesuai

- **WHEN** admin membuka detail reservasi yang sudah pernah di-reschedule atau statusnya bukan `DITERIMA`
- **THEN** form reschedule tidak ditampilkan atau ditampilkan sebagai tidak tersedia

#### Scenario: Pengguna tanpa sesi tidak dapat mengeksekusi reschedule

- **WHEN** pengguna tanpa sesi mencoba menjalankan aksi reschedule
- **THEN** sistem mengalihkan ke `/login` sebelum tanggal atau data reservasi diubah

#### Scenario: Tidak ada form reschedule publik

- **WHEN** customer membuka halaman publik
- **THEN** tidak ada sarana untuk mengubah tanggal reservasi
