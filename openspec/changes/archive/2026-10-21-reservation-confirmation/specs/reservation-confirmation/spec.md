# Spec Delta

## Purpose

Menjamin reservasi yang sudah memenuhi syarat dapat diterima secara atomik, memiliki nomor booking yang unik, mengunci seluruh tanggal acara dan setup, serta dapat dibatalkan dengan akibat dan pembebasan tanggal yang tercatat.

## ADDED Requirements

### Requirement: Syarat konfirmasi reservasi

Admin SHALL dapat mengonfirmasi reservasi hanya bila statusnya `PENDING` atau `DITANGGUHKAN`, jumlah pembayaran `TERVERIFIKASI` paling sedikit sama dengan DP minimum, dan seluruh tanggal acara serta tanggal setup yang diturunkan dari paket belum terkunci reservasi lain. Bila salah satu syarat tidak terpenuhi, sistem SHALL menolak konfirmasi tanpa mengubah status, tanggal, customer, atau nomor booking.

**Jejak:** BR-22; BR-04; BR-07; BR-18 (PROVISIONAL); US-060; state machine T3

**PROVISIONAL:** tanggal setup bawaan paket ikut dikunci dan diperiksa mengikuti BR-18, dengan default roadmap **ya**.

**GERBANG:** bila venue menyatakan setup bawaan tidak memblokir, yang berubah hanya himpunan tanggal setup; syarat DP, tanggal acara, dan atomisitas tidak berubah.

#### Scenario: DP terverifikasi kurang dari DP minimum

- **WHEN** total reservasi Rp20.000.000, DP minimum Rp5.000.000, dan pembayaran `TERVERIFIKASI` Rp4.900.000
- **THEN** sistem menolak konfirmasi dan reservasi tetap `PENDING`

#### Scenario: DP terverifikasi memenuhi batas

- **WHEN** total reservasi Rp20.000.000, DP minimum Rp5.000.000, pembayaran `TERVERIFIKASI` Rp5.000.000, dan seluruh tanggal target bebas
- **THEN** sistem menerima konfirmasi

#### Scenario: Pembayaran DICATAT tidak dihitung

- **WHEN** pembayaran Rp5.000.000 berstatus `DICATAT` dan tidak ada pembayaran `TERVERIFIKASI`
- **THEN** sistem menolak konfirmasi

#### Scenario: Tanggal acara sudah terkunci

- **WHEN** tanggal acara target sudah memiliki kunci `EVENT` milik reservasi lain
- **THEN** sistem menolak konfirmasi dan tidak mengubah data reservasi target

#### Scenario: Tanggal setup sudah terkunci

- **WHEN** salah satu tanggal setup target sudah memiliki kunci `SETUP` milik reservasi lain
- **THEN** sistem menolak konfirmasi

#### Scenario: Status tidak dapat dikonfirmasi

- **WHEN** admin mencoba mengonfirmasi reservasi `DITERIMA`, `DIBATALKAN`, `AUTO_CANCELLED`, atau `SELESAI`
- **THEN** sistem menolak konfirmasi

### Requirement: Konfirmasi atomik

Konfirmasi SHALL dijalankan dalam satu transaksi database yang mengunci reservasi, memeriksa syarat, mengunci seluruh tanggal, mengubah status menjadi `DITERIMA`, menerbitkan nomor booking, mengubah customer menjadi `CLIENT`, serta mencatat riwayat status dan aktivitas. Bila satu langkah gagal, seluruh perubahan dari percobaan itu SHALL dibatalkan.

**Jejak:** BR-22; BR-24; state machine T3; US-060; US-061

#### Scenario: Konfirmasi berhasil menulis seluruh perubahan

- **WHEN** reservasi memenuhi seluruh syarat konfirmasi
- **THEN** status menjadi `DITERIMA`, tanggal terkunci, nomor booking terbit, customer menjadi `CLIENT`, dan riwayat serta aktivitas tercatat

#### Scenario: Kegagalan setelah penguncian tanggal membatalkan seluruh transaksi

- **WHEN** konfirmasi gagal setelah satu atau lebih tanggal terkunci, misalnya karena penerbitan nomor booking gagal
- **THEN** tidak ada kunci tanggal, nomor booking, perubahan status, riwayat, aktivitas, atau perubahan customer yang tersisa dari percobaan itu

#### Scenario: Dua konfirmasi bentrok bersamaan

- **WHEN** dua admin mengonfirmasi dua reservasi berbeda yang memakai tanggal acara sama secara bersamaan
- **THEN** tepat satu konfirmasi berhasil dan konfirmasi lainnya ditolak karena konflik tanggal tanpa menyisakan kunci parsial

### Requirement: Penguncian tanggal acara dan setup

Konfirmasi yang berhasil SHALL membuat kunci `EVENT` untuk tanggal acara dan kunci `SETUP` untuk seluruh tanggal setup paket. Keunikan tanggal SHALL ditegakkan oleh constraint database, bukan hanya pemeriksaan aplikasi. Perubahan total atau pembayaran setelah konfirmasi SHALL NOT membuka kembali tanggal yang sudah terkunci.

**Jejak:** BR-01; BR-18 (PROVISIONAL); BR-22; US-060; US-061

**PROVISIONAL:** himpunan tanggal setup mengikuti BR-18 dan default roadmap **ya**.

**GERBANG:** bila venue menyatakan setup bawaan tidak memblokir, hanya himpunan tanggal setup yang berubah.

#### Scenario: Tanggal acara dan setup terkunci

- **WHEN** paket memiliki dua hari setup dan konfirmasi berhasil untuk tanggal acara 20 Maret 2027
- **THEN** sistem menyimpan kunci `SETUP` untuk 18 dan 19 Maret 2027 serta kunci `EVENT` untuk 20 Maret 2027

#### Scenario: Tanggal yang sama tidak dapat dikunci dua kali

- **WHEN** dua reservasi mencoba menyimpan kunci pada tanggal yang sama
- **THEN** database menolak kunci kedua

#### Scenario: Total berubah setelah konfirmasi

- **WHEN** admin menambah item biaya setelah reservasi `DITERIMA`
- **THEN** seluruh tanggal tetap terkunci dan hanya total serta sisa pembayaran yang berubah

### Requirement: Nomor booking unik dan counter tahunan

Sistem SHALL menerbitkan nomor booking hanya saat konfirmasi berhasil dengan format `HADCC-<tahun konfirmasi WIB>-<urut>`, urutan sedikitnya empat digit, unik, dan direset setiap tahun. Counter SHALL aman terhadap konfirmasi bersamaan. Nomor yang sudah terbit SHALL NOT berubah atau dipakai ulang, termasuk setelah pembatalan; bila urutan melebihi 9999, lebar digit bertambah.

**Jejak:** BR-11; BR-19; US-060; US-062

#### Scenario: Nomor pertama dan berikutnya pada tahun yang sama

- **WHEN** dua reservasi dikonfirmasi pada tahun 2026 dan belum ada nomor terbit
- **THEN** nomor yang diterbitkan adalah `HADCC-2026-0001` lalu `HADCC-2026-0002`

#### Scenario: Urutan direset pada tahun berikutnya

- **WHEN** reservasi dikonfirmasi pada 31 Desember 2026 dan reservasi lain dikonfirmasi pada 1 Januari 2027
- **THEN** nomor yang diterbitkan adalah `HADCC-2026-<urut>` lalu `HADCC-2027-0001`

#### Scenario: Tahun memakai WIB

- **WHEN** konfirmasi terjadi pada 1 Januari 2027 pukul 00.30 WIB
- **THEN** tahun pada nomor booking adalah 2027

#### Scenario: Urutan melewati 9999

- **WHEN** counter tahun berjalan sudah mencapai 9999 lalu satu konfirmasi berhasil
- **THEN** nomor berikutnya memakai urutan `10000` tanpa terpotong

#### Scenario: Nomor tidak dipakai ulang setelah pembatalan

- **WHEN** reservasi dengan nomor `HADCC-2026-0001` dibatalkan lalu reservasi lain dikonfirmasi
- **THEN** reservasi baru mendapat nomor berikutnya dan `HADCC-2026-0001` tetap menjadi milik reservasi yang dibatalkan

#### Scenario: Konfirmasi bersamaan tetap unik

- **WHEN** dua reservasi pada tanggal berbeda dikonfirmasi bersamaan pada tahun yang sama
- **THEN** kedua nomor booking berbeda dan tidak ada nomor yang hilang karena race counter

### Requirement: Daftar reservasi bentrok

Sebelum konfirmasi, detail reservasi SHALL menampilkan reservasi lain yang menempati tanggal target atau memiliki tanggal acara yang sama dan sudah memiliki pembayaran `DICATAT` atau `TERVERIFIKASI`. Daftar SHALL memuat identitas reservasi, tanggal acara, status, dan jumlah pembayaran tercatat atau terverifikasi. Konfirmasi SHALL NOT mengubah status reservasi lain secara otomatis.

**Jejak:** BR-04; BR-28; US-063; `docs/design/ui-spec.md` 4.2 (Reservasi)

#### Scenario: Reservasi lain pada tanggal sama dengan pembayaran

- **WHEN** admin membuka detail reservasi yang akan dikonfirmasi dan ada reservasi lain pada tanggal acara yang sama dengan pembayaran `DICATAT`
- **THEN** reservasi lain tampil pada daftar bentrok sebelum tombol konfirmasi dijalankan

#### Scenario: Reservasi lain tanpa pembayaran tidak tampil

- **WHEN** ada reservasi lain pada tanggal acara yang sama tetapi belum memiliki pembayaran `DICATAT` atau `TERVERIFIKASI`
- **THEN** reservasi itu tidak tampil pada daftar bentrok

#### Scenario: Tanggal target terkunci reservasi lain

- **WHEN** salah satu tanggal target sudah dikunci reservasi `DITERIMA`
- **THEN** reservasi pemilik kunci tampil sebagai bentrok dan konfirmasi ditolak

#### Scenario: Reservasi pending lain tidak diubah otomatis

- **WHEN** satu reservasi berhasil dikonfirmasi dan ada reservasi `PENDING` lain pada tanggal yang sama
- **THEN** reservasi `PENDING` lain tetap `PENDING` tanpa pembatalan, penangguhan, atau perubahan tanggal otomatis

### Requirement: Pembatalan reservasi DITERIMA

Admin SHALL dapat membatalkan reservasi `DITERIMA` dengan alasan wajib dan pihak pembatal `CUSTOMER`. Pembatalan SHALL mengubah status menjadi `DIBATALKAN`, menandai `dp_forfeited` benar, membebaskan seluruh kunci tanggal acara dan setup, mempertahankan nomor booking, dan mencatat riwayat status serta aktivitas. Customer SHALL tetap `CLIENT`.

**Jejak:** BR-12; BR-16; BR-23; BR-24; BR-25; state machine T6; US-062

#### Scenario: Customer membatalkan reservasi diterima

- **WHEN** admin membatalkan reservasi `DITERIMA` atas nama pihak `CUSTOMER` dengan alasan
- **THEN** status menjadi `DIBATALKAN`, `dp_forfeited` bernilai benar, dan riwayat mencatat pihak serta alasan

#### Scenario: Tanggal dibebaskan setelah pembatalan

- **WHEN** reservasi `DITERIMA` dengan kunci tanggal acara dan dua tanggal setup dibatalkan
- **THEN** seluruh kunci tanggal itu dihapus dan tanggal tampil tersedia kembali

#### Scenario: Nomor booking dipertahankan

- **WHEN** reservasi `DITERIMA` yang memiliki nomor booking dibatalkan
- **THEN** nomor booking tetap tersimpan pada reservasi dan tidak diterbitkan ulang untuk reservasi lain

#### Scenario: Customer tetap CLIENT

- **WHEN** reservasi pertama seorang customer `CLIENT` dibatalkan
- **THEN** status customer tetap `CLIENT` dan tidak kembali menjadi `CALON`

#### Scenario: Pihak pembatal selain CUSTOMER ditolak

- **WHEN** aksi pembatalan `DITERIMA` menerima pihak selain `CUSTOMER`
- **THEN** sistem menolak pembatalan dan tidak mengubah status atau tanggal

#### Scenario: Alasan wajib

- **WHEN** admin membatalkan reservasi `DITERIMA` tanpa alasan
- **THEN** sistem menolak pembatalan

#### Scenario: Status selain DITERIMA ditolak oleh aksi ini

- **WHEN** aksi pembatalan `DITERIMA` dijalankan pada reservasi `PENDING`, `DIBATALKAN`, atau `SELESAI`
- **THEN** sistem menolak dan tidak mengubah data

### Requirement: Tampilan konfirmasi dan pembatalan admin

Detail reservasi admin SHALL menampilkan nomor booking bila sudah terbit, ringkasan syarat konfirmasi, tanggal yang akan dikunci, daftar bentrok, dan tombol konfirmasi untuk reservasi `PENDING` atau `DITANGGUHKAN`. Untuk reservasi `DITERIMA`, detail SHALL menampilkan form pembatalan dengan pihak `Customer` dan alasan, serta penanda DP hangus setelah pembatalan. Aksi SHALL tidak ditampilkan untuk status yang tidak diizinkan.

**Jejak:** US-060; US-062; US-063; `docs/design/ui-spec.md` 4.2 (Reservasi)

#### Scenario: Tombol konfirmasi hanya untuk status yang dapat dikonfirmasi

- **WHEN** admin membuka detail reservasi `PENDING` atau `DITANGGUHKAN`
- **THEN** ringkasan syarat, tanggal target, daftar bentrok, dan tombol konfirmasi tampil

#### Scenario: Konfirmasi tidak tersedia untuk status lain

- **WHEN** admin membuka detail reservasi `DITERIMA` atau status akhir
- **THEN** tombol konfirmasi tidak tampil

#### Scenario: Syarat belum terpenuhi dijelaskan

- **WHEN** pembayaran terverifikasi belum mencapai DP minimum atau tanggal target bentrok
- **THEN** detail menjelaskan syarat yang belum terpenuhi dan tombol konfirmasi tidak dapat dijalankan

#### Scenario: Form pembatalan DITERIMA

- **WHEN** admin membuka detail reservasi `DITERIMA`
- **THEN** form pembatalan menampilkan pihak `Customer`, kolom alasan wajib, dan tombol pembatalan

#### Scenario: DP hangus terlihat setelah pembatalan

- **WHEN** reservasi `DITERIMA` dibatalkan oleh customer
- **THEN** detail menampilkan penanda bahwa DP hangus

### Requirement: Akses admin untuk konfirmasi dan pembatalan

Konfirmasi dan pembatalan reservasi `DITERIMA` SHALL hanya dapat dijalankan admin terautentikasi. Pengguna tanpa sesi SHALL dialihkan ke `/login` sebelum data reservasi, tanggal, customer, atau nomor booking diubah.

**Jejak:** NFR-SEC-05 (DISETUJUI); `docs/design/ui-spec.md` 4.2 (Reservasi)

#### Scenario: Pengguna tanpa sesi tidak dapat mengonfirmasi

- **WHEN** pengguna tanpa sesi memanggil aksi konfirmasi
- **THEN** pengguna dialihkan ke `/login` dan tidak ada data yang berubah

#### Scenario: Pengguna tanpa sesi tidak dapat membatalkan reservasi diterima

- **WHEN** pengguna tanpa sesi memanggil aksi pembatalan `DITERIMA`
- **THEN** pengguna dialihkan ke `/login` dan tidak ada kunci tanggal atau status yang berubah
