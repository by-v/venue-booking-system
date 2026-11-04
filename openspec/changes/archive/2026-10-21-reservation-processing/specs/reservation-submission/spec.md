# Spec Delta

## MODIFIED Requirements

### Requirement: Admin meninjau reservasi PENDING

Sistem SHALL menyediakan halaman admin Reservasi yang hanya dapat diakses admin terautentikasi, menampilkan daftar reservasi dengan filter status, pencarian berdasarkan nama atau nomor WhatsApp, serta total dan status pembayaran. Filter default SHALL menampilkan `PENDING` dan `DITANGGUHKAN`. Status lain SHALL hanya tampil bila dipilih; status akhir SHALL NOT dihitung sebagai reservasi aktif.

**Jejak:** US-044; US-052; US-053; NFR-SEC-05 (DISETUJUI); `docs/design/ui-spec.md` 4.2 (Reservasi/Pelanggan)

#### Scenario: Pengguna tanpa sesi dialihkan

- **WHEN** pengguna tanpa sesi membuka `/admin/reservasi`
- **THEN** pengguna dialihkan ke `/login` dan tidak melihat data reservasi

#### Scenario: Daftar PENDING dan pencarian

- **WHEN** admin membuka halaman Reservasi tanpa memilih filter lalu mencari nama atau nomor WhatsApp
- **THEN** daftar menampilkan reservasi `PENDING` dan `DITANGGUHKAN` yang cocok

#### Scenario: Pencarian dalam filter

- **WHEN** admin mencari nama atau nomor WhatsApp setelah memilih filter status
- **THEN** daftar menampilkan reservasi yang cocok pada filter status yang sedang dipilih

#### Scenario: Filter status lain

- **WHEN** admin memilih filter `DITERIMA`, `DIBATALKAN`, atau `SEMUA`
- **THEN** daftar menampilkan reservasi dengan status yang dipilih tanpa mengubah statusnya

#### Scenario: Detail reservasi

- **WHEN** admin membuka detail satu reservasi
- **THEN** sistem menampilkan data customer, paket, tanggal acara, harga snapshot, total, status pembayaran, status reservasi, dan riwayat aktivitas

### Requirement: Catatan tindak lanjut admin tercatat sebagai aktivitas

Admin SHALL dapat menambahkan catatan tindak lanjut pada reservasi `PENDING` atau `DITANGGUHKAN`. Setiap catatan SHALL tercatat sebagai aktivitas substantif dengan waktu, isi catatan, dan identitas admin; catatan kosong SHALL ditolak dan aksi SHALL hanya tersedia bagi admin terautentikasi.

**Jejak:** US-044; BR-17a; BR-24; NFR-SEC-05 (DISETUJUI)

#### Scenario: Catatan tersimpan sebagai aktivitas

- **WHEN** admin menyimpan catatan tindak lanjut pada reservasi `PENDING`
- **THEN** aktivitas baru tercatat dengan waktu, isi catatan, dan identitas admin

#### Scenario: Catatan pada reservasi DITANGGUHKAN

- **WHEN** admin menyimpan catatan tindak lanjut pada reservasi `DITANGGUHKAN`
- **THEN** aktivitas baru tercatat dengan waktu, isi catatan, dan identitas admin

#### Scenario: Catatan kosong ditolak

- **WHEN** admin menyimpan catatan kosong
- **THEN** sistem menolak dan tidak menambah aktivitas

#### Scenario: Pengguna tanpa sesi tidak dapat menambah catatan

- **WHEN** pengguna tanpa sesi memanggil aksi catatan
- **THEN** aksi dialihkan ke `/login` sebelum menyimpan aktivitas
