# venue-content Specification

## Purpose
Menyediakan informasi venue untuk customer (venue, paket dan harga, fasilitas per paket, galeri, dan kontak WhatsApp) serta pengelolaan konten tersebut oleh admin, sebagai sumber data yang dipakai change ketersediaan dan reservasi berikutnya.

## Requirements

### Requirement: Informasi Venue Publik

Sistem SHALL menampilkan informasi venue dari database pada halaman Beranda dan Tentang Kami: nama venue, alamat, kapasitas 200 sampai 2.000 tamu, dan deskripsi dari venue. Sistem SHALL NOT menampilkan statistik, testimoni, atau klaim yang tidak berasal dari data nyata.

**Jejak:** US-010; `docs/design/ui-spec.md` 4.1 dan prinsip 3

#### Scenario: Data venue tampil dari database

- **WHEN** customer membuka Beranda atau Tentang Kami
- **THEN** nama venue, alamat, kapasitas, dan deskripsi ditampilkan dari tabel `venue`

#### Scenario: Tidak ada statistik fiktif

- **WHEN** halaman Beranda ditampilkan
- **THEN** tidak ada angka statistik seperti "1000+", "50+", "99%", atau "24/7", dan tidak ada testimoni fiktif

#### Scenario: Kapasitas ditampilkan dalam rentang

- **WHEN** data venue menampilkan kapasitas
- **THEN** nilainya berada pada rentang 200 sampai 2.000 tamu

#### Scenario: Data venue belum diisi

- **WHEN** data venue belum tersedia di database
- **THEN** halaman menampilkan keadaan kosong tanpa galat, bukan data karangan

### Requirement: Katalog Paket dan Harga

Sistem SHALL menampilkan paket aktif dari database dengan nama, harga (integer rupiah), durasi per sesi, dan jumlah sesi pada halaman Fasilitas dan langkah Pilih Paket. Perubahan harga oleh admin SHALL tampil pada kunjungan berikutnya tanpa deploy. `setup_days_before` SHALL NOT ditampilkan ke customer.

**Jejak:** US-011; BR-18 (PROVISIONAL); T-16

**PROVISIONAL:** makna `setup_days_before` (apakah memblokir kalender) mengikuti BR-18 dan masih menunggu konfirmasi venue (T-02); change ini hanya menyimpan dan menampilkan kepada admin.

**GERBANG:** Verifikasi bahwa ketersediaan kalender menurut paket dihitung di change `availability-calendar`, bukan di change ini.

#### Scenario: Paket aktif tampil dengan harga rupiah bulat

- **WHEN** customer membuka halaman Fasilitas atau langkah Pilih Paket
- **THEN** paket aktif ditampilkan dengan nama, harga sebagai integer rupiah, durasi per sesi, dan jumlah sesi

#### Scenario: Perubahan harga admin tampil tanpa deploy

- **WHEN** admin mengubah harga sebuah paket
- **THEN** kunjungan berikutnya ke halaman publik menampilkan harga baru tanpa proses deploy

#### Scenario: Paket nonaktif tidak ditampilkan

- **WHEN** sebuah paket berstatus nonaktif
- **THEN** paket itu tidak ditampilkan di halaman publik dan tidak tersedia untuk dipilih

#### Scenario: setup_days_before tidak bocor ke customer

- **WHEN** halaman publik menampilkan sebuah paket
- **THEN** nilai `setup_days_before` dan seluruh informasi setup paket tidak tampil ke customer

### Requirement: Fasilitas dan Relasi Paket

Sistem SHALL menampilkan fasilitas dari database dan relasinya ke paket pada halaman Fasilitas. Teks fasilitas SHALL ditampilkan apa adanya; "Fasilitas SDA" SHALL NOT diuraikan.

**Jejak:** US-012; T-09

#### Scenario: Fasilitas tampil dari database

- **WHEN** customer membuka halaman Fasilitas
- **THEN** fasilitas ditampilkan dari tabel `facility`

#### Scenario: "Fasilitas SDA" tampil apa adanya

- **WHEN** sebuah fasilitas bernama "Fasilitas SDA" ditampilkan
- **THEN** teksnya ditampilkan persis dan tidak diuraikan atau diberi keterangan tambahan

#### Scenario: Relasi paket-fasilitas tampil

- **WHEN** sebuah paket memiliki fasilitas terkait
- **THEN** daftar fasilitas paket itu tampil di halaman Fasilitas

#### Scenario: Fasilitas tanpa paket

- **WHEN** sebuah fasilitas belum dihubungkan ke paket mana pun
- **THEN** fasilitas itu tetap dapat ditampilkan pada daftar umum tanpa galat

### Requirement: Galeri Publik dengan Filter Jenis Acara

Sistem SHALL menampilkan item galeri aktif terurut dengan gambar dari `public/` atau URL, keterangan pada lightbox, dan filter menurut jenis acara. Kategori item galeri SHALL salah satu jenis acara.

**Jejak:** US-013; T-15; TDR D7; `docs/design/ui-spec.md` 4.1 dan penyesuaian 11

#### Scenario: Hanya item aktif yang tampil, terurut

- **WHEN** customer membuka halaman Galeri
- **THEN** hanya item berstatus aktif yang tampil, diurutkan sesuai nilai urutan

#### Scenario: Filter jenis acara

- **WHEN** customer memilih sebuah jenis acara
- **THEN** galeri hanya menampilkan item dengan kategori jenis acara tersebut

#### Scenario: Lightbox dengan keterangan

- **WHEN** customer membuka sebuah item galeri
- **THEN** lightbox menampilkan gambar dan keterangannya

#### Scenario: Galeri kosong

- **WHEN** tidak ada item galeri aktif
- **THEN** halaman menampilkan keadaan kosong tanpa galat

### Requirement: Kontak dan Tombol WhatsApp

Halaman Kontak SHALL menampilkan alamat, kontak terkonfirmasi, dan tombol WhatsApp yang membuka `wa.me` dengan pesan templat terisi, memakai nomor WhatsApp admin dari pengaturan venue. Sistem SHALL NOT menyediakan formulir pesan kontak.

**Jejak:** US-014; T-12; `docs/design/ui-spec.md` penyesuaian 3

#### Scenario: Tombol WhatsApp memakai nomor dari pengaturan venue

- **WHEN** customer membuka halaman Kontak
- **THEN** tombol WhatsApp menuju `wa.me` dengan nomor WhatsApp admin yang tersimpan di pengaturan venue

#### Scenario: Pesan templat terisi

- **WHEN** tombol WhatsApp diklik
- **THEN** tautan membawa pesan templat yang sudah terisi

#### Scenario: Tidak ada formulir pesan

- **WHEN** halaman Kontak ditampilkan
- **THEN** tidak ada formulir pengiriman pesan dan tidak ada penyimpanan pesan di sistem

#### Scenario: Nomor WhatsApp belum diisi

- **WHEN** nomor WhatsApp admin belum diisi di pengaturan venue
- **THEN** sistem tidak membuka tautan `wa.me` dengan nomor kosong

### Requirement: Pengelolaan Venue dan Pengaturan Kontak oleh Admin

Admin SHALL dapat mengubah data venue serta nomor WhatsApp admin dan kontak. Perubahan SHALL tersimpan di database dan hanya dapat dilakukan admin yang terautentikasi.

**Jejak:** US-020; T-12; NFR-SEC-05 (DISETUJUI)

#### Scenario: Admin mengubah data venue

- **WHEN** admin mengubah data venue dan menyimpannya
- **THEN** perubahan tersimpan di database dan tampil pada halaman publik

#### Scenario: Admin mengubah nomor WhatsApp

- **WHEN** admin mengubah nomor WhatsApp admin
- **THEN** tombol kontak memakai nomor baru

#### Scenario: Tanpa sesi aksi ditolak

- **WHEN** aksi pengelolaan venue dipanggil tanpa sesi admin valid
- **THEN** helper menolak sebelum logika aksi dijalankan

### Requirement: Pengelolaan Paket oleh Admin

Admin SHALL dapat membuat, mengubah, dan menonaktifkan paket dengan atribut: nama, durasi per sesi, jumlah sesi, harga (integer rupiah), `setup_days_before`, dan status aktif. Paket nonaktif SHALL NOT muncul di form pengajuan. Harga SHALL disimpan sebagai integer rupiah tanpa desimal.

**Jejak:** US-021; BR-18 (PROVISIONAL); konvensi uang integer rupiah

**PROVISIONAL:** atribut `setup_days_before` mengikuti BR-18 dan menunggu konfirmasi venue (T-02).

#### Scenario: Admin membuat paket

- **WHEN** admin membuat paket dengan data valid
- **THEN** paket tersimpan dan tampil di halaman publik

#### Scenario: Paket nonaktif tidak muncul di form

- **WHEN** sebuah paket berstatus nonaktif
- **THEN** paket itu tidak tersedia untuk dipilih pada form pengajuan reservasi

#### Scenario: Harga desimal atau negatif ditolak

- **WHEN** admin menyimpan harga yang bukan integer rupiah atau bernilai negatif
- **THEN** database menolak nilai tersebut

#### Scenario: Jumlah sesi minimal satu

- **WHEN** admin menyimpan paket dengan jumlah sesi kurang dari satu
- **THEN** penyimpanan ditolak

### Requirement: Pengelolaan Fasilitas dan Relasi ke Paket oleh Admin

Admin SHALL dapat mengelola fasilitas dan relasinya ke paket. Relasi paket-fasilitas SHALL unik per pasangan dan tampil di halaman publik.

**Jejak:** US-022

#### Scenario: Admin menautkan fasilitas ke paket

- **WHEN** admin menghubungkan sebuah fasilitas ke sebuah paket
- **THEN** relasi tersimpan dan tampil pada halaman publik paket tersebut

#### Scenario: Relasi duplikat ditolak

- **WHEN** admin menghubungkan fasilitas yang sama ke paket yang sama dua kali
- **THEN** constraint unik database menolak relasi duplikat

#### Scenario: Tanpa sesi aksi ditolak

- **WHEN** aksi pengelolaan fasilitas dipanggil tanpa sesi admin valid
- **THEN** helper menolak sebelum logika aksi dijalankan

### Requirement: Pengelolaan Galeri oleh Admin

Admin SHALL dapat mengelola metadata galeri: judul, kategori (jenis acara), urutan, status aktif, dan lokasi gambar (path `public/` atau URL). Sistem SHALL NOT menyediakan unggah berkas ke object storage pada change ini.

**Jejak:** US-023; TDR D7

#### Scenario: Admin menambah item galeri

- **WHEN** admin menambah item galeri dengan lokasi gambar dari `public/` atau URL
- **THEN** item tersimpan dan tampil di halaman galeri publik bila aktif

#### Scenario: Admin menonaktifkan item

- **WHEN** admin menonaktifkan sebuah item galeri
- **THEN** item itu tidak tampil di halaman galeri publik

#### Scenario: Unggah berkas tidak disediakan

- **WHEN** admin membuka pengelolaan galeri
- **THEN** tidak ada kontrol unggah berkas ke object storage

#### Scenario: Tanpa sesi aksi ditolak

- **WHEN** aksi pengelolaan galeri dipanggil tanpa sesi admin valid
- **THEN** helper menolak sebelum logika aksi dijalankan

### Requirement: Seed Data Venue Tanpa Data Demo

Seed SHALL memuat data venue dari handoff: nama venue, alamat, kapasitas 200 sampai 2.000, empat paket beserta harga (Rp20 jt, 22 jt, 25 jt, 35 jt; durasi 5 jam dan Walimah 2 x 5 jam), dan fasilitas Full Service termasuk "Fasilitas SDA" apa adanya. Seed SHALL NOT memuat data demo, customer, atau reservasi fiktif.

**Jejak:** T-17; T-09; `docs/roadmap.md` Change 2 data awal

#### Scenario: Seed mengisi venue dan empat paket

- **WHEN** seed dijalankan
- **THEN** satu data venue dan empat paket dengan harga rupiah dari handoff tersimpan

#### Scenario: "Fasilitas SDA" ada apa adanya

- **WHEN** seed selesai
- **THEN** fasilitas "Fasilitas SDA" tersimpan dengan teks persis

#### Scenario: Tidak ada data demo

- **WHEN** seed dijalankan
- **THEN** tidak ada data customer, reservasi, atau pembayaran fiktif yang dibuat
