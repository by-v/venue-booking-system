# reservation-lifecycle Specification

## Purpose

Mengatur akhir siklus reservasi secara otomatis dan aman: pembatalan reservasi tidak aktif, penandaan reservasi yang memerlukan pemeriksaan admin, serta penyelesaian reservasi setelah tanggal acara.

## Requirements

### Requirement: Kandidat auto-cancel karena tidak ada aktivitas

Sistem SHALL menganggap reservasi `PENDING` atau `DITANGGUHKAN` sebagai kandidat Pemicu A pada hari batas WIB, yaitu tanggal aktivitas substantif terakhir ditambah tiga bulan kalender. Bila tanggal itu tidak ada pada bulan tujuan, sistem SHALL memakai hari terakhir bulan tersebut. Bila tidak ada aktivitas substantif, dasar perhitungan SHALL waktu pengajuan reservasi.

**Jejak:** BR-17; BR-17a; US-090; state machine T5

#### Scenario: Pengajuan 1 Januari menjadi kandidat 1 April

- **WHEN** reservasi diajukan 1 Januari tanpa aktivitas substantif berikutnya
- **THEN** reservasi menjadi kandidat auto-cancel pada 1 April menurut WIB

#### Scenario: Batas akhir bulan memakai hari terakhir bulan tujuan

- **WHEN** aktivitas substantif terakhir 30 November dan tidak ada aktivitas berikutnya
- **THEN** hari batas adalah 28 Februari, atau 29 Februari pada tahun kabisat

#### Scenario: Catatan tindak lanjut menggeser batas

- **WHEN** reservasi diajukan 1 Januari lalu mendapat catatan tindak lanjut pada 20 Februari
- **THEN** hari batas menjadi 20 Mei

#### Scenario: Status selain PENDING dan DITANGGUHKAN bukan kandidat

- **WHEN** reservasi berstatus `DITERIMA`, `DIBATALKAN`, `AUTO_CANCELLED`, atau `SELESAI`
- **THEN** reservasi tidak menjadi kandidat Pemicu A

### Requirement: Kandidat auto-cancel karena tanggal acara lewat

Sistem SHALL menganggap reservasi `PENDING` atau `DITANGGUHKAN` sebagai kandidat Pemicu B mulai hari kalender setelah tanggal acara menurut WIB, meskipun tiga bulan kalender belum terlewati. Pada hari tanggal acara itu sendiri, reservasi SHALL NOT menjadi kandidat Pemicu B.

**Jejak:** BR-17; US-090; state machine T5

#### Scenario: Acara 15 Februari menjadi kandidat 16 Februari

- **WHEN** reservasi `PENDING` memiliki tanggal acara 15 Februari dan belum lewat tiga bulan
- **THEN** reservasi menjadi kandidat auto-cancel pada 16 Februari

#### Scenario: Hari acara belum menjadi kandidat

- **WHEN** tanggal acara sama dengan hari ini menurut WIB
- **THEN** reservasi belum menjadi kandidat Pemicu B

### Requirement: Pembatalan otomatis tanpa pembayaran terverifikasi

Untuk kandidat yang tidak memiliki pembayaran berstatus `TERVERIFIKASI`, sistem SHALL mengubah status menjadi `AUTO_CANCELLED` dengan kode alasan `INACTIVITY_3M` untuk Pemicu A atau `EVENT_DATE_PASSED` untuk Pemicu B. Pembatalan SHALL NOT menghapus reservasi, riwayat, atau pembayaran.

**Jejak:** BR-12; BR-17; BR-24; US-090; state machine T5

#### Scenario: Kandidat tanpa pembayaran dibatalkan otomatis

- **WHEN** reservasi `PENDING` memenuhi Pemicu A atau Pemicu B dan tidak memiliki pembayaran `TERVERIFIKASI`
- **THEN** statusnya menjadi `AUTO_CANCELLED` dengan kode alasan yang sesuai

#### Scenario: Data reservasi tetap tersimpan

- **WHEN** reservasi dibatalkan otomatis
- **THEN** reservasi, riwayat status, dan riwayat pembayaran tetap ada dan hanya status yang berubah

### Requirement: Pembayaran terverifikasi menahan pembatalan otomatis

Bila kandidat memiliki paling sedikit satu pembayaran berstatus `TERVERIFIKASI`, sistem SHALL NOT mengubah statusnya menjadi `AUTO_CANCELLED`. Sistem SHALL menandai `perlu_pemeriksaan_admin` agar admin memutuskan secara manual. Penandaan SHALL NOT mengubah status, tanggal, atau data pembayaran.

**Jejak:** BR-17; BR-24; US-090; US-092

#### Scenario: Kandidat dengan pembayaran terverifikasi ditandai

- **WHEN** reservasi `PENDING` kena Pemicu A dan memiliki pembayaran `TERVERIFIKASI`
- **THEN** status tetap `PENDING` dan `perlu_pemeriksaan_admin` menjadi benar

#### Scenario: Kandidat dengan pembayaran terverifikasi ditandai

- **WHEN** reservasi `DITANGGUHKAN` kena Pemicu B dan memiliki pembayaran `TERVERIFIKASI`
- **THEN** status tetap `DITANGGUHKAN` dan `perlu_pemeriksaan_admin` menjadi benar

#### Scenario: Penandaan berulang tidak mengubah data lain

- **WHEN** job dijalankan lagi untuk reservasi yang sudah ditandai
- **THEN** status dan data reservasi tetap sama

### Requirement: Penyelesaian otomatis reservasi DITERIMA

Sistem SHALL mengubah status reservasi `DITERIMA` menjadi `SELESAI` pada hari kalender setelah tanggal acara menurut WIB. Sistem SHALL NOT mengubah status lain menjadi `SELESAI` secara otomatis dan SHALL NOT membebaskan kunci tanggal acara atau setup.

**Jejak:** BR-13; BR-30; US-091; state machine T7

#### Scenario: Acara 15 Februari selesai pada 16 Februari

- **WHEN** reservasi `DITERIMA` memiliki tanggal acara 15 Februari
- **THEN** pada 16 Februari statusnya menjadi `SELESAI`

#### Scenario: Hari acara belum menjadi SELESAI

- **WHEN** tanggal acara sama dengan hari ini menurut WIB
- **THEN** reservasi `DITERIMA` tetap `DITERIMA`

#### Scenario: Status selain DITERIMA tidak disentuh

- **WHEN** job berjalan dan menemukan reservasi `PENDING`, `DITANGGUHKAN`, atau status akhir
- **THEN** status tersebut tidak diubah menjadi `SELESAI`

#### Scenario: Kunci tanggal tidak dibebaskan

- **WHEN** reservasi `DITERIMA` menjadi `SELESAI`
- **THEN** kunci tanggal acara dan setup tetap tercatat sebagai riwayat

### Requirement: Penanda sisa pembayaran saat SELESAI

Saat reservasi `DITERIMA` menjadi `SELESAI`, baik otomatis maupun manual, sistem SHALL menandai `perlu_pemeriksaan_admin` bila sisa pembayaran lebih dari nol. Sisa SHALL dihitung dari total reservasi dikurangi pembayaran `TERVERIFIKASI`. Penandaan SHALL NOT mengubah status atau data pembayaran.

**Jejak:** BR-13; BR-20; US-091; US-092

#### Scenario: Sisa pembayaran menyebabkan penanda

- **WHEN** reservasi `DITERIMA` menjadi `SELESAI` dan pembayaran terverifikasi kurang dari total
- **THEN** `perlu_pemeriksaan_admin` menjadi benar dan status tetap `SELESAI`

#### Scenario: Pembayaran lunas tidak menambah penanda

- **WHEN** reservasi `DITERIMA` menjadi `SELESAI` dan pembayaran terverifikasi sama dengan total
- **THEN** `perlu_pemeriksaan_admin` tidak diubah menjadi benar oleh proses penyelesaian

### Requirement: Penyelesaian manual oleh admin

Admin terautentikasi SHALL dapat menandai reservasi `DITERIMA` menjadi `SELESAI` hanya setelah tanggal acara menurut WIB. Sistem SHALL menolak permintaan untuk status lain, tanggal acara yang belum lewat, atau pengguna tanpa sesi tanpa mengubah data. Penyelesaian manual SHALL mengikuti aturan penanda sisa pembayaran dan mencatat pelaku admin.

**Jejak:** BR-13; BR-24; US-091; NFR-SEC-05; state machine T7; `docs/design/ui-spec.md` 4.2 (Reservasi)

#### Scenario: Admin menandai selesai setelah tanggal acara

- **WHEN** admin menandai reservasi `DITERIMA` yang tanggal acaranya sudah lewat
- **THEN** statusnya menjadi `SELESAI` dan riwayat mencatat pelaku admin

#### Scenario: Admin tidak dapat menandai selesai terlalu cepat

- **WHEN** admin mencoba menandai `SELESAI` pada hari tanggal acara atau sebelumnya
- **THEN** sistem menolak dan status tetap `DITERIMA`

#### Scenario: Status selain DITERIMA ditolak

- **WHEN** admin mencoba menandai `SELESAI` pada reservasi `PENDING`, `DITANGGUHKAN`, `DIBATALKAN`, atau `AUTO_CANCELLED`
- **THEN** sistem menolak tanpa mengubah data

#### Scenario: Pengguna tanpa sesi tidak dapat menyelesaikan reservasi

- **WHEN** pengguna tanpa sesi mencoba menjalankan aksi penyelesaian
- **THEN** sistem mengalihkan ke `/login` sebelum status berubah

### Requirement: Job harian idempoten dan aman terhadap eksekusi bersamaan

Job SHALL dapat dijalankan berulang atau bersamaan tanpa menggandakan perubahan status, riwayat, atau penanda. Setiap reservasi SHALL mengalami paling banyak satu transisi oleh job, dan status akhir yang sudah tercapai SHALL NOT berubah. Kegagalan satu bagian SHALL NOT meninggalkan perubahan setengah jadi.

**Jejak:** BR-17; BR-24; NFR-REL-01; US-090; US-091

#### Scenario: Job dijalankan dua kali

- **WHEN** job yang sama dijalankan dua kali pada hari yang sama
- **THEN** eksekusi kedua tidak menambah riwayat atau mengubah status yang sudah diproses

#### Scenario: Dua eksekusi job bersamaan

- **WHEN** dua eksekusi job berjalan bersamaan untuk reservasi yang sama
- **THEN** tepat satu transisi terjadi dan tidak ada riwayat ganda

#### Scenario: Status akhir tidak dibuka kembali

- **WHEN** job menemukan reservasi yang sudah `AUTO_CANCELLED` atau `SELESAI`
- **THEN** status dan riwayatnya tidak berubah

### Requirement: Otorisasi rute job

Rute job SHALL hanya menjalankan pemrosesan bila permintaan memakai `GET` dan menyertakan header `Authorization: Bearer <CRON_SECRET>` yang cocok dengan secret server. Bila secret server tidak tersedia, header tidak ada, atau nilainya salah, sistem SHALL menolak permintaan sebelum menyentuh database dan SHALL NOT membocorkan nilai secret.

**Jejak:** BR-17; NFR-SEC-07 (DISETUJUI); roadmap change 8; TDR bagian cron

#### Scenario: Permintaan tanpa secret ditolak

- **WHEN** rute job dipanggil tanpa header `Authorization`
- **THEN** sistem mengembalikan `401` dan tidak mengubah data reservasi

#### Scenario: Secret salah ditolak

- **WHEN** rute job dipanggil dengan `Authorization` yang tidak cocok
- **THEN** sistem mengembalikan `401` dan tidak mengubah data reservasi

#### Scenario: Secret server tidak dikonfigurasi

- **WHEN** `CRON_SECRET` tidak tersedia di server
- **THEN** rute job menolak permintaan dan tidak menjalankan pemrosesan

#### Scenario: Secret benar menjalankan job

- **WHEN** rute job dipanggil dengan header yang cocok
- **THEN** job memproses kandidat dan mengembalikan ringkasan hasil tanpa nilai secret

### Requirement: Riwayat perubahan status otomatis dan manual

Setiap perubahan status oleh job atau admin SHALL mencatat waktu, status sebelumnya, status baru, alasan, dan pelaku `SYSTEM` atau admin. Pembatalan otomatis SHALL menyimpan kode alasan `INACTIVITY_3M` atau `EVENT_DATE_PASSED`. Riwayat SHALL NOT dihapus.

**Jejak:** BR-12; BR-24; US-090; US-091

#### Scenario: Pembatalan otomatis mencatat SYSTEM

- **WHEN** job mengubah reservasi menjadi `AUTO_CANCELLED`
- **THEN** riwayat mencatat status lama, `AUTO_CANCELLED`, kode alasan, waktu, dan pelaku `SYSTEM`

#### Scenario: Penyelesaian manual mencatat admin

- **WHEN** admin menandai reservasi menjadi `SELESAI`
- **THEN** riwayat mencatat status lama, `SELESAI`, alasan, waktu, dan pelaku admin

#### Scenario: Proses job bukan aktivitas substantif

- **WHEN** job berjalan dan menandai reservasi yang memiliki pembayaran tercatat
- **THEN** proses job tidak dihitung sebagai aktivitas substantif yang menggeser batas tiga bulan

### Requirement: Tampilan penyelesaian dan daftar perlu pemeriksaan

Detail reservasi admin SHALL menampilkan aksi â€œTandai selesaiâ€ hanya untuk reservasi `DITERIMA` yang tanggal acaranya sudah lewat. Dashboard SHALL menampilkan reservasi bertanda `perlu_pemeriksaan_admin` pada daftar â€œPerlu Tindak Lanjutâ€ yang sudah ada. Change ini SHALL NOT menambah layar baru.

**Jejak:** US-091; US-092; `docs/design/ui-spec.md` 4.2 (Dashboard dan Reservasi)

#### Scenario: Aksi tampil setelah tanggal acara

- **WHEN** admin membuka detail reservasi `DITERIMA` yang tanggal acaranya sudah lewat
- **THEN** halaman menampilkan aksi â€œTandai selesaiâ€

#### Scenario: Aksi tidak tampil sebelum tanggal acara

- **WHEN** admin membuka detail reservasi `DITERIMA` pada hari tanggal acara atau sebelumnya
- **THEN** aksi â€œTandai selesaiâ€ tidak tersedia

#### Scenario: Reservasi bertanda tampil di dashboard

- **WHEN** reservasi memiliki `perlu_pemeriksaan_admin` benar
- **THEN** reservasi muncul pada daftar â€œPerlu Tindak Lanjutâ€ dashboard dengan alasan â€œPerlu diperiksaâ€

#### Scenario: Tidak ada layar baru

- **WHEN** pengguna membuka area admin setelah change ini
- **THEN** tidak ada menu atau layar baru untuk otomasi status
