# Spec Delta

## Purpose

Memungkinkan admin mengolah reservasi sebelum diterima: mencatat biaya dan pembayaran, menghitung total dan DP, menangguhkan atau membatalkan, serta membaca ringkasan operasional tanpa mengunci tanggal.

## ADDED Requirements

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

#### Scenario: Pembayaran DICATAT belum dihitung

- **WHEN** total Rp20.000.000 dan satu pembayaran Rp5.000.000 berstatus `DICATAT`
- **THEN** status pembayaran tetap `BELUM_DP`

### Requirement: Pencatatan dan verifikasi pembayaran

Admin SHALL dapat mencatat pembayaran dengan nominal bulat positif sebagai `DICATAT`, memverifikasi pembayaran `DICATAT` menjadi `TERVERIFIKASI`, dan menandai pembayaran `DICATAT` atau `TERVERIFIKASI` menjadi `TIDAK_VALID` dengan alasan wajib. Pembayaran SHALL NOT dihapus atau diubah nominalnya. Hanya pembayaran `TERVERIFIKASI` yang dihitung.

**Jejak:** BR-09; BR-12; BR-21; US-051

#### Scenario: Pembayaran baru berstatus DICATAT

- **WHEN** admin mencatat pembayaran Rp5.000.000
- **THEN** pembayaran tersimpan berstatus `DICATAT` dan belum dihitung terhadap DP

#### Scenario: Pembayaran DICATAT diverifikasi

- **WHEN** admin memverifikasi pembayaran `DICATAT` sebesar Rp5.000.000 pada total Rp20.000.000
- **THEN** pembayaran berstatus `TERVERIFIKASI` dan dihitung terhadap status pembayaran reservasi

#### Scenario: Pembayaran DICATAT ditandai tidak valid

- **WHEN** admin menandai pembayaran `DICATAT` sebagai `TIDAK_VALID` dengan alasan
- **THEN** baris pembayaran tetap ada dengan status `TIDAK_VALID` dan alasannya

#### Scenario: Pembayaran TERVERIFIKASI ditandai tidak valid

- **WHEN** admin menandai pembayaran `TERVERIFIKASI` sebagai `TIDAK_VALID` dengan alasan
- **THEN** baris pembayaran tetap ada, status pembayaran reservasi dihitung ulang, dan reservasi ditandai perlu pemeriksaan admin

#### Scenario: Alasan pembatalan verifikasi wajib

- **WHEN** admin menandai pembayaran menjadi `TIDAK_VALID` tanpa alasan
- **THEN** sistem menolak perubahan dan status pembayaran tidak berubah

#### Scenario: Nominal pembayaran tidak valid ditolak

- **WHEN** admin mencatat pembayaran bernominal nol, negatif, atau bukan bilangan bulat
- **THEN** sistem menolak pencatatan dan tidak membuat baris pembayaran

### Requirement: Batas pembayaran terverifikasi terhadap total

Sistem SHALL menolak verifikasi pembayaran yang membuat jumlah pembayaran `TERVERIFIKASI` melebihi total reservasi. Total reservasi SHALL NOT berada di bawah jumlah pembayaran `TERVERIFIKASI`.

**Jejak:** BR-29; US-050

#### Scenario: Verifikasi yang melebihi total ditolak

- **WHEN** total Rp20.000.000, pembayaran terverifikasi Rp19.500.000, dan admin mencoba memverifikasi pembayaran Rp1.000.000
- **THEN** sistem menolak verifikasi dan jumlah terverifikasi tetap Rp19.500.000

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

Sistem SHALL menandai reservasi `perlu_pemeriksaan_admin` bila pembayaran `TERVERIFIKASI` diubah menjadi `TIDAK_VALID`. Penandaan SHALL NOT membuka kembali tanggal atau mengubah status reservasi secara otomatis, dan SHALL tampil pada daftar perlu tindak lanjut dashboard.

**Jejak:** BR-20; BR-24; US-052; US-054; `docs/design/ui-spec.md` 4.2 (Dashboard)

#### Scenario: Pembayaran terverifikasi dibatalkan verifikasinya

- **WHEN** pembayaran `TERVERIFIKASI` diubah menjadi `TIDAK_VALID`
- **THEN** reservasi ditandai `perlu_pemeriksaan_admin` tanpa perubahan status reservasi

#### Scenario: Pembayaran DICATAT ditandai tidak valid

- **WHEN** pembayaran `DICATAT` diubah menjadi `TIDAK_VALID`
- **THEN** reservasi SHALL NOT ditandai `perlu_pemeriksaan_admin` hanya karena perubahan itu

#### Scenario: Penanda tampil di dashboard

- **WHEN** reservasi memiliki `perlu_pemeriksaan_admin` bernilai benar
- **THEN** reservasi tampil pada daftar perlu tindak lanjut dashboard

### Requirement: Ringkasan keuangan reservasi admin

Detail reservasi admin SHALL menampilkan total, DP minimum, total pembayaran `TERVERIFIKASI`, pembayaran `DICATAT` yang belum terverifikasi secara terpisah, dan sisa pembayaran sebesar total dikurangi pembayaran `TERVERIFIKASI`.

**Jejak:** BR-09; US-052; `docs/design/ui-spec.md` 4.2 (Reservasi)

#### Scenario: Ringkasan dengan pembayaran tercatat dan terverifikasi

- **WHEN** total Rp20.000.000, pembayaran terverifikasi Rp5.000.000, dan pembayaran `DICATAT` Rp2.000.000
- **THEN** detail menampilkan total Rp20.000.000, DP minimum Rp5.000.000, terverifikasi Rp5.000.000, tercatat belum terverifikasi Rp2.000.000, dan sisa Rp15.000.000

#### Scenario: Ringkasan tanpa pembayaran

- **WHEN** reservasi belum memiliki pembayaran
- **THEN** detail menampilkan pembayaran terverifikasi Rp0, pembayaran tercatat Rp0, dan sisa sama dengan total

### Requirement: Jejak aktivitas pengolahan

Setiap penambahan item biaya, pencatatan pembayaran, perubahan status pembayaran, dan perubahan status reservasi SHALL mencatat aktivitas substantif berisi waktu, jenis, ringkasan, dan identitas admin. Aktivitas SHALL NOT dihapus.

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

Dashboard admin SHALL menampilkan jumlah reservasi aktif (`PENDING` + `DITERIMA` + `DITANGGUHKAN`), empat kartu status (`PENDING`, `DITANGGUHKAN`, `DITERIMA`, `DIBATALKAN` termasuk `AUTO_CANCELLED`), agenda `DITERIMA` mendatang terurut tanggal acara, daftar perlu tindak lanjut, dan reservasi terbaru dari data nyata. Ringkasan SHALL dapat difilter per bulan berdasarkan tanggal acara.

**Jejak:** US-054; `docs/design/ui-spec.md` 4.2 (Dashboard)

#### Scenario: Dashboard tanpa data

- **WHEN** belum ada reservasi
- **THEN** dashboard menampilkan angka nol dan keadaan kosong pada setiap widget

#### Scenario: Jumlah aktif tidak menghitung status akhir

- **WHEN** data berisi reservasi `PENDING`, `DITANGGUHKAN`, `DITERIMA`, `DIBATALKAN`, dan `AUTO_CANCELLED`
- **THEN** jumlah aktif hanya menghitung `PENDING`, `DITANGGUHKAN`, dan `DITERIMA`

#### Scenario: Perlu tindak lanjut

- **WHEN** data berisi reservasi `PENDING`, pembayaran `DICATAT`, dan reservasi bertanda perlu pemeriksaan
- **THEN** ketiganya tampil pada widget perlu tindak lanjut

#### Scenario: Agenda mendatang

- **WHEN** terdapat lebih dari satu reservasi `DITERIMA` dengan tanggal acara berbeda
- **THEN** agenda menampilkan reservasi `DITERIMA` yang belum lewat, terurut tanggal acara menaik

#### Scenario: Filter bulan

- **WHEN** admin memilih bulan tertentu
- **THEN** ringkasan menghitung reservasi dengan tanggal acara pada bulan itu

### Requirement: Akses admin untuk pengolahan reservasi

Seluruh aksi item biaya, pembayaran, verifikasi, penangguhan, dan pembatalan SHALL hanya dapat dijalankan admin terautentikasi; pengguna tanpa sesi SHALL dialihkan ke `/login` sebelum data diubah.

**Jejak:** NFR-SEC-05 (DISETUJUI); `docs/design/ui-spec.md` 4.2 (Reservasi)

#### Scenario: Pengguna tanpa sesi tidak dapat mengubah data

- **WHEN** pengguna tanpa sesi memanggil aksi pengolahan reservasi
- **THEN** aksi dialihkan ke `/login` dan tidak ada item, pembayaran, atau status yang berubah
