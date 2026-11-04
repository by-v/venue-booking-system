# reservation-submission Specification

## Purpose

Menerima pengajuan reservasi dari customer sebagai customer CALON dan reservasi PENDING, memvalidasi paket dan tanggal, serta memberi admin sarana awal untuk meninjau dan mencatat tindak lanjut tanpa mengunci tanggal.

## Requirements

### Requirement: Form pengajuan reservasi publik

Sistem SHALL menyediakan halaman `/reservasi` dengan langkah pilih paket, pilih tanggal, dan detail acara. Form SHALL memuat nama lengkap, nomor WhatsApp, alamat, jenis acara, paket, tanggal acara, dan catatan opsional; hanya paket aktif yang dapat dipilih, dan ringkasan SHALL menampilkan paket, tanggal, harga, serta perkiraan DP minimum 25% dengan keterangan bahwa total akhir ditetapkan admin.

**Jejak:** US-040; T-13; T-15; `docs/design/ui-spec.md` 4.1 (Reservasi)

#### Scenario: Paket aktif dapat dipilih

- **WHEN** customer membuka `/reservasi`
- **THEN** paket aktif dari database tampil pada langkah pilih paket dan paket nonaktif tidak tampil

#### Scenario: Field wajib harus diisi

- **WHEN** customer mengirim form tanpa nama, nomor WhatsApp, alamat, jenis acara, paket, atau tanggal
- **THEN** sistem menolak pengajuan dan menampilkan pesan validasi pada field yang kurang

#### Scenario: Catatan opsional

- **WHEN** customer mengirim form lengkap tanpa catatan
- **THEN** pengajuan tetap diterima dan catatan disimpan kosong

#### Scenario: Ringkasan menampilkan perkiraan DP

- **WHEN** customer memilih paket seharga Rp20.000.000
- **THEN** ringkasan menampilkan harga paket dan perkiraan DP minimum Rp5.000.000, dengan keterangan total akhir ditetapkan admin

### Requirement: Validasi tanggal dan paket pengajuan

Sistem SHALL menerima tanggal acara hanya bila tanggal itu setelah hari ini menurut WIB, paketnya aktif, dan tanggal acara beserta seluruh tanggal setup bawaan paket tidak terkunci reservasi lain. Penolakan SHALL NOT mengungkap jenis kunci atau data reservasi lain.

**Jejak:** BR-26; BR-18 (PROVISIONAL); BR-27; US-040; `docs/design/ui-spec.md` penyesuaian 4 dan 14

**PROVISIONAL:** bahwa setup bawaan paket ikut memblokir mengikuti BR-18 dan menunggu konfirmasi venue (T-02). Default roadmap **ya** dipakai.

**GERBANG:** Bila venue menjawab setup bawaan tidak memblokir, perubahan hanya pada perhitungan tanggal terkunci; validasi tanggal acara tidak berubah.

#### Scenario: Tanggal hari ini dan lampau ditolak

- **WHEN** customer mengirim tanggal acara hari ini atau tanggal sebelumnya menurut WIB
- **THEN** sistem menolak pengajuan dan menampilkan pesan bahwa tanggal acara harus setelah hari ini

#### Scenario: Tanggal acara yang terkunci ditolak

- **WHEN** tanggal acara sudah memiliki kunci `EVENT`
- **THEN** sistem menolak pengajuan tanpa menyebut jenis kunci atau reservasi pemiliknya

#### Scenario: Tanggal setup paket yang terkunci ditolak

- **WHEN** paket Walimah (setup 3 hari) dipilih untuk tanggal acara yang salah satu tanggal H-1 sampai H-3-nya terkunci
- **THEN** sistem menolak pengajuan

#### Scenario: Paket nonaktif ditolak

- **WHEN** customer mengirim paket yang sudah dinonaktifkan admin
- **THEN** sistem menolak pengajuan

### Requirement: Pembuatan customer CALON dan reservasi PENDING

Sistem SHALL menyimpan pengajuan yang valid sebagai customer berstatus `CALON` dan reservasi berstatus `PENDING` dengan ID internal, snapshot nama paket, durasi, jumlah sesi, dan harga, serta sumber `FORM_PUBLIK`. Sistem SHALL menyimpan satu customer per nomor WhatsApp yang telah dinormalisasi; pengajuan ulang dengan nomor yang sama SHALL menambah reservasi baru pada customer tersebut. Pengajuan SHALL NOT membuat nomor booking atau kunci tanggal.

**Jejak:** BR-17a; BR-19; BR-25; BR-29; state machine T1; US-040; US-042

#### Scenario: Customer baru dan reservasi PENDING dibuat

- **WHEN** nomor WhatsApp belum pernah mengajukan dan form valid dikirim
- **THEN** sistem membuat customer `CALON`, reservasi `PENDING` dengan sumber `FORM_PUBLIK`, riwayat status awal, dan aktivitas pengajuan pertama

#### Scenario: Nomor WhatsApp dinormalisasi

- **WHEN** customer mengirim nomor `0812-3456-7890` lalu mengirim lagi dengan nomor `+62 812 3456 7890`
- **THEN** sistem memakai satu record customer yang sama untuk kedua pengajuan

#### Scenario: Pengajuan ulang membuat reservasi baru

- **WHEN** customer yang sama mengirim form lagi untuk tanggal lain
- **THEN** sistem menambah reservasi PENDING baru tanpa mengubah reservasi sebelumnya

#### Scenario: Harga paket disalin saat pengajuan

- **WHEN** admin mengubah harga paket setelah pengajuan tersimpan
- **THEN** harga pada reservasi lama tetap memakai harga saat pengajuan

#### Scenario: PENDING tidak mengunci tanggal

- **WHEN** pengajuan PENDING berhasil untuk tanggal 2027-03-20
- **THEN** sistem tidak membuat baris `date_lock` dan kalender publik tetap menampilkan tanggal itu sesuai kunci yang ada

#### Scenario: Dua pengajuan PENDING pada tanggal yang sama

- **WHEN** dua customer mengajukan tanggal acara yang sama dan keduanya valid
- **THEN** kedua reservasi PENDING tersimpan; tanggal belum terkunci sampai salah satu dikonfirmasi

### Requirement: Pesan sukses tanpa nomor booking

Setelah pengajuan berhasil, sistem SHALL menampilkan pesan sukses tanpa nomor booking atau kode pengajuan, menjelaskan bahwa permintaan belum dikonfirmasi dan belum mengunci tanggal, serta menyediakan tombol WhatsApp ke nomor admin dengan pesan templat yang memuat nama, paket, dan tanggal acara.

**Jejak:** BR-05; BR-19; US-041; T-12; `docs/design/ui-spec.md` 4.1 (Reservasi)

#### Scenario: Sukses tanpa kode

- **WHEN** pengajuan valid tersimpan
- **THEN** pesan sukses tampil tanpa nomor booking dan tanpa kode pengajuan

#### Scenario: Tombol WhatsApp tersedia

- **WHEN** nomor WhatsApp admin tersedia di pengaturan venue
- **THEN** pesan sukses menampilkan tombol yang membuka `wa.me` dengan pesan berisi nama, paket, dan tanggal acara

#### Scenario: Nomor admin belum diisi

- **WHEN** nomor WhatsApp admin belum tersedia
- **THEN** pesan sukses tetap tampil tanpa tombol WhatsApp yang membuka nomor kosong

### Requirement: Pembatas laju pengajuan form publik

Sistem SHALL membatasi laju pengajuan form publik berdasarkan sumber permintaan dan menyimpan penghitungnya di database. Permintaan yang melewati batas SHALL ditolak dengan pesan galat generik dan SHALL NOT membuat customer, reservasi, riwayat, atau aktivitas.

**Jejak:** US-043; TDR D8; NFR-SEC-05 (DISETUJUI)

#### Scenario: Permintaan melewati batas ditolak

- **WHEN** sumber yang sama mengirim pengajuan melebihi batas dalam jendela waktu yang berlaku
- **THEN** sistem menolak dengan pesan galat generik dan tidak menyimpan reservasi

#### Scenario: Sumber lain tidak terpengaruh

- **WHEN** satu sumber telah mencapai batas
- **THEN** sumber lain masih dapat mengirim pengajuan

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
