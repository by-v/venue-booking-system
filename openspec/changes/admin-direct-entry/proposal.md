# Proposal

## Why

BR-31 (FINAL) menyatakan admin dapat membuat reservasi/booking langsung tanpa form
publik, termasuk mencatat booking lama agar kalender akurat. Saat ini reservasi hanya
bisa lahir dari form publik, sehingga admin tidak dapat memasukkan booking yang
diterima di luar sistem dan aplikasi tidak dapat membedakan sumber data
(`FORM_PUBLIK`/`INPUT_ADMIN`) untuk kebutuhan penelitian.

## What Changes

- Tambah kolom `source` pada `reservation` dengan nilai `FORM_PUBLIK` atau
  `INPUT_ADMIN`, default `FORM_PUBLIK`, beserta constraint database.
- Tambah kemampuan admin membuat reservasi langsung melalui halaman admin, dengan
  data customer, paket, tanggal acara, jenis acara, alamat, dan catatan yang mengikuti
  aturan form publik (BR-25, BR-26, BR-27, BR-29).
- Reservasi input admin disimpan sebagai `PENDING` dengan sumber `INPUT_ADMIN` dan
  tetap tunduk pada BR-01 serta BR-18: tanggal acara dan seluruh tanggal setup bawaan
  paket tidak boleh sudah terkunci.
- Sediakan opsi “Simpan & Terima” yang menjalankan konfirmasi atomik BR-22 setelah
  reservasi tersimpan; bila DP terverifikasi kurang atau tanggal bentrok, konfirmasi
  ditolak dan reservasi tetap `PENDING` tanpa kunci tanggal atau nomor booking.
- Catat riwayat status awal dan aktivitas pengajuan dengan pelaku `ADMIN` untuk
  reservasi `INPUT_ADMIN`; reservasi `FORM_PUBLIK` tetap memakai pelaku `CUSTOMER`.
- Tampilkan sumber reservasi pada daftar/detail admin agar hasil input admin dapat
  dibedakan.
- Booking lama tidak diimpor secara massal (T-11); hanya input satu per satu lewat
  form admin.

## Capabilities

### New Capabilities

- `admin-direct-entry`: Admin membuat reservasi langsung dengan sumber `INPUT_ADMIN`,
  validasi tanggal/paket, opsi konfirmasi mengikuti BR-22, serta pencatatan sumber dan
  aktivitas yang membedakan input admin dari form publik.

### Modified Capabilities

- `reservation-submission`: Pengajuan form publik mencatat sumber `FORM_PUBLIK` pada
  reservasi yang dibuat.

## Impact

- Skema database: kolom `reservation.source` dan constraint nilai; migrasi baru.
- Modul domain reservasi: tipe sumber reservasi, skema input admin, mutasi pembuatan
  reservasi admin, dan jalur konfirmasi atomik yang dapat dipakai ulang.
- Query dan tipe reservasi: sumber pada daftar/detail bila ditampilkan.
- Server Action admin: aksi pembuatan reservasi langsung dengan pengaman
  `requireAdminSession()`.
- Halaman admin: tombol/tautan menuju form input baru dan halaman form.
- Tes: skema/migrasi, mutasi input admin, validasi tanggal, sumber, dan konfirmasi
  langsung terhadap PostgreSQL asli.

## Di luar scope

- Impor massal booking lama dan file eksternal.
- Perubahan alur pencatatan/verifikasi pembayaran, reschedule, auto-cancel,
  Bukti Booking, cek status, dan batas pelunasan.
- Status baru, pembatalan oleh venue, diskon, refund, atau payment gateway.
- Perubahan aturan DP minimum dan penguncian tanggal di luar BR-22.
- Data demo atau akun baru di database dev.

## Pertanyaan terbuka

- Tidak ada keputusan bisnis baru. T-02 tetap PROVISIONAL: setup bawaan paket ikut
  mengunci, memakai default roadmap **ya**. T-11 FINAL-DEFAULT: booking lama tidak
  diimpor; hanya input langsung yang dibuat.
