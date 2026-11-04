# Spec Delta

## MODIFIED Requirements

### Requirement: Admin meninjau reservasi PENDING

Sistem SHALL menyediakan halaman admin Reservasi yang hanya dapat diakses admin terautentikasi, menampilkan daftar reservasi dengan filter status, pencarian berdasarkan nama, nomor WhatsApp, atau nomor booking, serta total dan status pembayaran. Daftar dan detail SHALL menampilkan nomor booking bila sudah terbit. Filter default SHALL menampilkan `PENDING` dan `DITANGGUHKAN`. Status lain SHALL hanya tampil bila dipilih; status akhir SHALL NOT dihitung sebagai reservasi aktif.

**Jejak:** US-044; US-052; US-053; BR-19; NFR-SEC-05 (DISETUJUI); `docs/design/ui-spec.md` 4.2 (Reservasi/Pelanggan)

#### Scenario: Pengguna tanpa sesi dialihkan

- **WHEN** pengguna tanpa sesi membuka `/admin/reservasi`
- **THEN** pengguna dialihkan ke `/login` dan tidak melihat data reservasi

#### Scenario: Daftar PENDING dan pencarian

- **WHEN** admin membuka halaman Reservasi tanpa memilih filter lalu mencari nama atau nomor WhatsApp
- **THEN** daftar menampilkan reservasi `PENDING` dan `DITANGGUHKAN` yang cocok

#### Scenario: Pencarian nomor booking

- **WHEN** admin mencari nomor booking yang sudah terbit
- **THEN** daftar menampilkan reservasi dengan nomor booking tersebut pada filter yang sedang dipilih

#### Scenario: Pencarian dalam filter

- **WHEN** admin mencari nama, nomor WhatsApp, atau nomor booking setelah memilih filter status
- **THEN** daftar menampilkan reservasi yang cocok pada filter status yang sedang dipilih

#### Scenario: Filter status lain

- **WHEN** admin memilih filter `DITERIMA`, `DIBATALKAN`, atau `SEMUA`
- **THEN** daftar menampilkan reservasi dengan status yang dipilih tanpa mengubah statusnya

#### Scenario: Detail reservasi

- **WHEN** admin membuka detail satu reservasi
- **THEN** sistem menampilkan data customer, paket, tanggal acara, harga snapshot, total, status pembayaran, status reservasi, nomor booking bila sudah terbit, dan riwayat aktivitas
