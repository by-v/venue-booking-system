# reservation-processing Specification

## Purpose

Memungkinkan admin mengolah reservasi sebelum diterima: mencatat biaya dan pembayaran, menghitung total dan DP, menangguhkan atau membatalkan, serta membaca ringkasan operasional tanpa mengunci tanggal.

## Requirements

### Requirement: Item biaya dan total reservasi

Sistem SHALL memungkinkan admin menambahkan item biaya berisi deskripsi dan nominal bulat positif pada reservasi. Total reservasi SHALL sama dengan harga paket snapshot ditambah seluruh item biaya. Perubahan harga paket setelah pengajuan SHALL NOT mengubah total reservasi yang sudah ada. Diskon SHALL NOT didukung.

**Jejak:** BR-06; BR-29; T-05 (FINAL-DEFAULT); US-050; `docs/design/ui-spec.md` 4.2 (Reservasi)

#### Scenario: Item biaya menambah total

- **WHEN** reservasi memakai paket snapshot Rp20.000.000 dan admin menambahkan item biaya Rp1.500.000
- **THEN** total reservasi menjadi Rp21.500.000

#### Scenario: Harga paket berubah setelah pengajuan

- **WHEN** admin mengubah harga paket setelah reservasi tersimpan
- **THEN** total reservasi lama tetap memakai harga paket snapshot ditambah item biaya

#### Scenario: Item biaya tidak valid ditolak

- **WHEN** admin mengirim item biaya tanpa deskripsi, bernominal nol, negatif, atau bukan bilangan bulat
- **THEN** sistem menolak item dan total reservasi tidak berubah

### Requirement: Perhitungan DP minimum dan status pembayaran

Sistem SHALL menghitung DP minimum sebagai pembulatan ke atas 25% dari total. Sistem SHALL menurunkan status pembayaran dari jumlah pembayaran `TERVERIFIKASI`: `BELUM_DP` bila kurang dari DP minimum, `DP` bila mencapai DP minimum tetapi kurang dari total, dan `LUNAS` bila mencapai total. Status pembayaran SHALL NOT dapat ditetapkan manual.

**Jejak:** BR-07; BR-20; US-052

#### Scenario: DP minimum dibulatkan ke atas

- **WHEN** total reservasi Rp20.000.000
- **THEN** DP minimum Rp5.000.000

- **WHEN** total reservasi Rp22.000.001
- **THEN** DP minimum Rp5.500.001

#### Scenario: Status pembayaran diturunkan dari pembayaran terverifikasi

- **WHEN** total Rp20.000.000 dan pembayaran terverifikasi Rp4.000.000
- **THEN** status pembayaran `BELUM_DP`

- **WHEN** pembayaran terverifikasi menjadi Rp5.000.000
- **THEN** status pembayaran `DP`

- **WHEN** pembayaran terverifikasi menjadi Rp20.000.000
- **THEN** status pembayaran `LUNAS`

### Requirement: Pencatatan pembayaran otomatis

Admin SHALL dapat mencatat pembayaran melalui dua aksi otomatis pada detail reservasi: tombol "Sudah DP" yang mencatat kekurangan sampai DP minimum 25% terpenuhi, dan tombol "Lunas" yang mencatat seluruh sisa pembayaran. Kedua aksi SHALL menyimpan pembayaran berstatus `TERVERIFIKASI` tanpa input nominal bebas, dan SHALL menolak pencatatan bila total pembayaran sudah mencapai atau melebihi total reservasi. Riwayat pembayaran bersifat baca-saja.

**Jejak:** BR-09; BR-12; BR-21; US-051; permintaan pemilik proyek 4 Nov 2026

#### Scenario: Tombol Sudah DP mencatat 25%

- **WHEN** total reservasi Rp20.000.000 dan belum ada pembayaran, lalu admin menekan "Sudah DP"
- **THEN** sistem mencatat pembayaran Rp5.000.000 berstatus `TERVERIFIKASI`

#### Scenario: Sudah DP melengkapi pembayaran sebagian

- **WHEN** total Rp20.000.000, sudah ada pembayaran Rp2.000.000, lalu admin menekan "Sudah DP"
- **THEN** sistem mencatat kekurangan Rp3.000.000 agar DP minimum 25% terpenuhi

#### Scenario: Lunas tanpa DP lebih dulu

- **WHEN** belum ada pembayaran dan admin menekan "Lunas"
- **THEN** sistem mencatat pembayaran sebesar seluruh total reservasi

#### Scenario: Pembayaran sudah lunas ditolak

- **WHEN** total pembayaran sudah mencapai total reservasi
- **THEN** sistem menolak aksi "Sudah DP" dan "Lunas" dengan `PAYMENT_ALREADY_SETTLED`

### Requirement: Batas pembayaran terverifikasi terhadap total

Sistem SHALL menolak pencatatan pembayaran yang membuat jumlah pembayaran `TERVERIFIKASI` melebihi total reservasi. Total reservasi SHALL NOT berada di bawah jumlah pembayaran `TERVERIFIKASI`.

**Jejak:** BR-29; US-050

#### Scenario: Pembayaran melebihi total ditolak

- **WHEN** total Rp20.000.000 dan pembayaran terverifikasi sudah Rp20.000.000, lalu admin menekan "Lunas"
- **THEN** sistem menolak pencatatan dan jumlah terverifikasi tetap Rp20.000.000

#### Scenario: Total bertambah karena item biaya

- **WHEN** total Rp20.000.000 dengan pembayaran terverifikasi Rp20.000.000, lalu admin menambahkan item biaya Rp1.000.000
- **THEN** total menjadi Rp21.000.000 dan status pembayaran berubah dari `LUNAS` menjadi `DP`

### Requirement: Penangguhan dan pembatalan reservasi belum diterima

Admin SHALL dapat mengubah `PENDING` menjadi `DITANGGUHKAN`, `PENDING` menjadi `DIBATALKAN`, dan `DITANGGUHKAN` menjadi `DIBATALKAN`. Setiap perubahan SHALL memerlukan alasan dan mencatat waktu, status lama, status baru, alasan, serta pelaku admin. Pembatalan SHALL mencatat kode alasan `MUNDUR_CUSTOMER` atau `DITOLAK_VENUE`. Transisi `DITANGGUHKAN` menjadi `PENDING` dan transisi dari status akhir SHALL ditolak.

**Jejak:** BR-24; BR-30; state machine T2 dan T4; T-10 (FINAL-DEFAULT); US-053

#### Scenario: Reservasi ditangguhkan

- **WHEN** admin menangguhkan reservasi `PENDING` dengan alasan
- **THEN** status menjadi `DITANGGUHKAN` dan riwayat mencatat waktu, status lama, status baru, alasan, serta pelaku admin

#### Scenario: Reservasi dibatalkan

- **WHEN** admin membatalkan reservasi `PENDING` atau `DITANGGUHKAN` dengan alasan dan kode alasan
- **THEN** status menjadi `DIBATALKAN` dan riwayat mencatat perubahan tersebut

#### Scenario: Penolakan memakai DIBATALKAN

- **WHEN** admin menolak pengajuan dengan kode alasan `DITOLAK_VENUE`
- **THEN** status reservasi menjadi `DIBATALKAN`, bukan `DITOLAK`

#### Scenario: Alasan wajib

- **WHEN** admin menangguhkan atau membatalkan reservasi tanpa alasan
- **THEN** sistem menolak perubahan dan status reservasi tidak berubah

#### Scenario: Kembali ke PENDING ditolak

- **WHEN** admin mencoba mengubah reservasi `DITANGGUHKAN` menjadi `PENDING`
- **THEN** sistem menolak perubahan

#### Scenario: Status akhir tidak dapat dibuka kembali

- **WHEN** admin mencoba mengubah reservasi `DIBATALKAN`, `AUTO_CANCELLED`, atau `SELESAI`
- **THEN** sistem menolak perubahan

### Requirement: Penanda perlu pemeriksaan admin

Sistem SHALL menandai reservasi `perlu_pemeriksaan_admin` ketika reservasi selesai atau menjadi kandidat pembatalan otomatis sementara masih ada sisa pembayaran. Penandaan SHALL NOT membuka kembali tanggal atau mengubah status reservasi secara otomatis, dan SHALL tampil pada daftar perlu tindak lanjut dashboard.

**Jejak:** BR-20; BR-24; US-052; US-054; `docs/design/ui-spec.md` 4.2 (Dashboard)

#### Scenario: Reservasi selesai dengan sisa pembayaran

- **WHEN** reservasi menjadi `SELESAI` dan total pembayaran terverifikasi masih di bawah total reservasi
- **THEN** reservasi ditandai `perlu_pemeriksaan_admin` tanpa perubahan status reservasi

#### Scenario: Kandidat pembatalan otomatis dengan pembayaran pelindung

- **WHEN** reservasi memenuhi syarat pembatalan otomatis tetapi memiliki pembayaran `TERVERIFIKASI`
- **THEN** sistem hanya menandai `perlu_pemeriksaan_admin` dan tidak membatalkan reservasi

#### Scenario: Penanda tampil di dashboard

- **WHEN** reservasi memiliki `perlu_pemeriksaan_admin` bernilai benar
- **THEN** reservasi tampil pada daftar perlu tindak lanjut dashboard

### Requirement: Ringkasan keuangan reservasi admin

Detail reservasi admin SHALL menampilkan total, DP minimum, total pembayaran `TERVERIFIKASI`, dan sisa pembayaran sebesar total dikurangi pembayaran `TERVERIFIKASI`. Ringkasan keuangan dan riwayat pembayaran SHALL digabung dalam satu kartu di bagian atas halaman, beserta tombol "Sudah DP" dan "Lunas", sehingga admin tidak perlu menggulir untuk mencatat pembayaran.

**Jejak:** BR-09; US-052; `docs/design/ui-spec.md` 4.2 (Reservasi); permintaan pemilik proyek 4 Nov 2026

#### Scenario: Ringkasan dengan pembayaran terverifikasi

- **WHEN** total Rp20.000.000 dan pembayaran terverifikasi Rp5.000.000
- **THEN** detail menampilkan total Rp20.000.000, DP minimum Rp5.000.000, sudah dibayar Rp5.000.000, dan sisa Rp15.000.000

#### Scenario: Ringkasan tanpa pembayaran

- **WHEN** reservasi belum memiliki pembayaran
- **THEN** detail menampilkan pembayaran terverifikasi Rp0 dan sisa sama dengan total

### Requirement: Koreksi data reservasi oleh admin

Admin terautentikasi SHALL dapat memperbarui seluruh data yang diisi customer pada reservasi yang belum berstatus akhir: nama, nomor WhatsApp, alamat, jenis acara, catatan, paket, dan tanggal acara. Perubahan SHALL memakai validasi yang sama dengan input publik. Mengubah paket SHALL memperbarui snapshot harga, durasi, dan jumlah sesi. Mengubah paket atau tanggal SHALL memeriksa bentrok dan, untuk reservasi `DITERIMA`, mengganti kunci tanggal acara dan setup. Total reservasi hasil perubahan SHALL NOT lebih kecil dari pembayaran `TERVERIFIKASI`, dan nomor WhatsApp SHALL tetap unik per customer. Setiap perubahan SHALL mencatat aktivitas `DATA_UPDATED`.

**Jejak:** BR-25; BR-29; BR-31; permintaan pemilik proyek 4 Nov 2026

#### Scenario: Admin mengoreksi typo nama dan alamat

- **WHEN** admin memperbarui nama dan alamat reservasi `PENDING`
- **THEN** detail reservasi menampilkan nilai baru dan aktivitas `DATA_UPDATED` tercatat

#### Scenario: Admin memperbarui paket

- **WHEN** admin memilih paket aktif lain
- **THEN** snapshot harga, durasi, dan jumlah sesi mengikuti paket baru

#### Scenario: Tanggal baru bentrok

- **WHEN** admin mengubah tanggal acara ke tanggal yang terkunci reservasi lain
- **THEN** sistem menolak perubahan dan data lama tidak berubah

#### Scenario: Paket baru di bawah pembayaran terverifikasi

- **WHEN** harga paket baru lebih kecil dari jumlah pembayaran `TERVERIFIKASI`
- **THEN** sistem menolak perubahan

#### Scenario: Status akhir tidak dapat diedit

- **WHEN** admin mencoba mengedit reservasi `DIBATALKAN`, `AUTO_CANCELLED`, atau `SELESAI`
- **THEN** sistem menolak perubahan

### Requirement: Jejak aktivitas pengolahan

Setiap penambahan item biaya, pencatatan pembayaran, perubahan status pembayaran, perubahan status reservasi, dan koreksi data reservasi SHALL mencatat aktivitas substantif berisi waktu, jenis, ringkasan, dan identitas admin. Aktivitas SHALL NOT dihapus.

**Jejak:** BR-12; BR-17a; BR-24; US-050; US-051; US-053

#### Scenario: Item biaya tercatat sebagai aktivitas

- **WHEN** admin menambahkan item biaya
- **THEN** aktivitas substantif baru tercatat dengan waktu, jenis, ringkasan, dan identitas admin

#### Scenario: Pembayaran tercatat sebagai aktivitas

- **WHEN** admin mencatat atau mengubah status pembayaran
- **THEN** aktivitas substantif baru tercatat dengan waktu, jenis, ringkasan, dan identitas admin

#### Scenario: Perubahan status tercatat sebagai aktivitas

- **WHEN** admin menangguhkan atau membatalkan reservasi
- **THEN** aktivitas substantif baru tercatat bersama riwayat status

### Requirement: Dashboard operasional

Dashboard admin SHALL menampilkan statistik volume per tahun berdasarkan tanggal acara (`Total Job Masuk`, `PENDING`, `DITANGGUHKAN`, `DITERIMA`, `SELESAI`, dan `DIBATALKAN` termasuk `AUTO_CANCELLED`), statistik finansial dan insight (`Nilai Diterima`, `Pembayaran Masuk`, `Sisa Piutang`, `Konversi`, dan `Rata-rata Nilai`) untuk reservasi `DITERIMA` + `SELESAI`, agenda `DITERIMA` + `SELESAI` terurut tanggal acara, daftar perlu tindak lanjut, dan reservasi terbaru dari data nyata. Filter periode utama SHALL berupa tahun dan berlaku untuk seluruh widget. Agenda SHALL dapat difilter per bulan di dalam tahun terpilih dan setiap baris agenda SHALL menautkan ke detail reservasi.

**Jejak:** US-054; `docs/design/ui-spec.md` 4.2 (Dashboard)

#### Scenario: Dashboard tanpa data

- **WHEN** belum ada reservasi
- **THEN** dashboard menampilkan angka nol dan keadaan kosong pada setiap widget

#### Scenario: Filter tahun berlaku untuk semua widget

- **WHEN** admin memilih tahun tertentu
- **THEN** kartu statistik, agenda, tindak lanjut, dan reservasi terbaru hanya menghitung reservasi dengan tanggal acara pada tahun itu

#### Scenario: Statistik finansial hanya menghitung reservasi berhasil

- **WHEN** tahun terpilih berisi reservasi `DITERIMA`, `SELESAI`, `PENDING`, dan `DIBATALKAN`
- **THEN** `Nilai Diterima` menjumlahkan harga paket dan item biaya hanya untuk `DITERIMA` + `SELESAI`, `Pembayaran Masuk` menjumlahkan pembayaran `TERVERIFIKASI` pada reservasi yang sama, dan `Sisa Piutang` adalah selisih keduanya

#### Scenario: Perlu tindak lanjut

- **WHEN** tahun terpilih berisi reservasi `PENDING` dan reservasi bertanda perlu pemeriksaan
- **THEN** keduanya tampil pada widget perlu tindak lanjut

#### Scenario: Agenda per tahun dan bulan

- **WHEN** admin memilih tahun dan/atau bulan agenda
- **THEN** agenda menampilkan seluruh reservasi `DITERIMA` + `SELESAI` pada periode itu, terurut tanggal acara menaik, dan tombol lihat semua menuju kalender bulan terkait atau kalender tahun bila semua bulan dipilih

#### Scenario: Agenda dapat dibuka

- **WHEN** admin mengklik baris agenda
- **THEN** admin diarahkan ke halaman detail reservasi tersebut

### Requirement: Akses admin untuk pengolahan reservasi

Seluruh aksi item biaya, pembayaran, penangguhan, dan pembatalan SHALL hanya dapat dijalankan admin terautentikasi; pengguna tanpa sesi SHALL dialihkan ke `/login` sebelum data diubah.

**Jejak:** NFR-SEC-05 (DISETUJUI); `docs/design/ui-spec.md` 4.2 (Reservasi)

#### Scenario: Pengguna tanpa sesi tidak dapat mengubah data

- **WHEN** pengguna tanpa sesi memanggil aksi pengolahan reservasi
- **THEN** aksi dialihkan ke `/login` dan tidak ada item, pembayaran, atau status yang berubah
