# Spec Delta

## Purpose

Menyediakan cek status reservasi berdasarkan nomor booking dan Bukti Booking siap cetak, dengan perlindungan terhadap penebakan nomor serta data customer yang minimal.

## ADDED Requirements

### Requirement: Cek status berdasarkan nomor booking

Sistem SHALL menyediakan halaman publik `/cek-status` yang menerima nomor booking dan menampilkan status reservasi. Pencarian SHALL hanya menerima nomor booking; nama, nomor WhatsApp, atau kode lain SHALL NOT menjadi kunci pencarian. Hasil SHALL memuat nomor booking, tanggal acara, paket, total, DP terverifikasi, sisa, status pembayaran, dan status booking. Reservasi tanpa nomor booking (PENDING/DITANGGUHKAN) SHALL NOT dapat dicek dan SHALL NOT menampilkan kode pengajuan.

**Jejak:** BR-05; US-070; `docs/design/ui-spec.md` 4.1 (Cek Status)

#### Scenario: Customer mengecek status dengan nomor booking valid

- **WHEN** customer mengirim nomor booking yang terdaftar
- **THEN** sistem menampilkan nomor booking, tanggal acara, paket, total, DP terverifikasi, sisa, status pembayaran, dan status booking

#### Scenario: Pencarian selain nomor booking tidak diterima

- **WHEN** customer mencoba mencari memakai nama, nomor WhatsApp, atau kode lain
- **THEN** sistem tidak memproses pencarian tersebut dan tetap meminta nomor booking

#### Scenario: Reservasi PENDING tidak dapat dicek

- **WHEN** customer memasukkan nomor yang terkait reservasi PENDING atau DITANGGUHKAN
- **THEN** sistem tidak menemukan hasil karena reservasi tersebut tidak memiliki nomor booking

#### Scenario: Nomor booking tidak ditemukan

- **WHEN** customer mengirim nomor booking yang tidak terdaftar
- **THEN** sistem menampilkan pesan galat generik tanpa menyebut apakah nomor itu pernah ada

### Requirement: Bukti Booking siap cetak

Sistem SHALL menyediakan halaman Bukti Booking yang dapat dicetak dari peramban dan memuat isi BR-10: nomor booking, nama customer, tanggal acara, paket/jenis acara, durasi, fasilitas paket, total, DP, pembayaran terverifikasi, sisa, status pembayaran, dan status booking, dengan keterangan waktu cetak. Halaman SHALL NOT menghasilkan PDF server-side; tombol "Cetak Bukti" SHALL memakai fungsi cetak peramban. Bukti Booking SHALL hanya tersedia untuk reservasi yang memiliki nomor booking.

**Jejak:** BR-10; D6; US-071; `docs/design/ui-spec.md` penyesuaian 15

#### Scenario: Bukti Booking menampilkan isi BR-10 dan waktu cetak

- **WHEN** customer membuka Bukti Booking untuk reservasi yang sudah memiliki nomor booking
- **THEN** halaman menampilkan seluruh isi BR-10 dan keterangan waktu cetak

#### Scenario: Reservasi tanpa nomor booking tidak memiliki Bukti Booking

- **WHEN** reservasi masih PENDING atau DITANGGUHKAN
- **THEN** sistem tidak menyediakan halaman Bukti Booking untuk reservasi tersebut

#### Scenario: Cetak memakai fungsi peramban

- **WHEN** customer menekan tombol "Cetak Bukti"
- **THEN** peramban membuka dialog cetak dan tidak mengunduh PDF yang dihasilkan server

### Requirement: Perlindungan cek status

Sistem SHALL membatasi laju percobaan cek status berdasarkan sumber permintaan dan menyimpan penghitungnya di database. Permintaan yang melewati batas SHALL ditolak dengan pesan galat generik. Sistem SHALL menampilkan pesan galat yang sama untuk nomor booking tidak ditemukan dan format/nomor salah, serta SHALL NOT membocorkan keberadaan reservasi, data customer, atau detail internal. Nama customer pada hasil dan Bukti Booking SHALL disamarkan. Sistem SHALL NOT menambahkan faktor verifikasi tambahan tanpa persetujuan.

**Jejak:** BR-32 (FINAL-DEFAULT); US-072; NFR-SEC-05 (DISETUJUI)

#### Scenario: Percobaan melewati batas ditolak

- **WHEN** sumber yang sama melakukan percobaan cek status melebihi batas dalam jendela waktu yang berlaku
- **THEN** sistem menolak dengan pesan galat generik

#### Scenario: Sumber lain tidak terpengaruh

- **WHEN** satu sumber telah mencapai batas
- **THEN** sumber lain masih dapat melakukan cek status

#### Scenario: Nomor tidak ditemukan dan nomor salah memberi pesan sama

- **WHEN** customer mengirim nomor yang tidak terdaftar atau format yang salah
- **THEN** sistem menampilkan pesan galat yang sama tanpa membedakan keduanya

#### Scenario: Data yang tampil minimal

- **WHEN** hasil cek status atau Bukti Booking ditampilkan
- **THEN** nama customer disamarkan dan data internal seperti ID database, alamat, atau nomor WhatsApp tidak ditampilkan

#### Scenario: Tidak ada faktor verifikasi tambahan

- **WHEN** customer melakukan cek status hanya dengan nomor booking
- **THEN** sistem tidak meminta faktor verifikasi tambahan tanpa persetujuan
