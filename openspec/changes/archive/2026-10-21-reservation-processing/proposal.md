# Proposal

## Why

Reservasi PENDING saat ini belum dapat diolah admin: belum ada item biaya, pencatatan pembayaran, status pembayaran turunan, tindakan penangguhan/pembatalan, maupun dashboard yang membaca data nyata. Tanpa kemampuan ini, change `reservation-confirmation` tidak dapat menghitung DP minimum dan memverifikasi syarat konfirmasi.

Change ini melanjutkan `reservation-submission` dan berhenti sebelum konfirmasi/penguncian tanggal. Fokusnya adalah pengolahan administratif reservasi yang belum diterima.

## What Changes

- Menambahkan item biaya per reservasi dan menghitung total sebagai harga paket snapshot + seluruh item.
- Menambahkan pencatatan pembayaran oleh admin dengan status `DICATAT`, `TERVERIFIKASI`, dan `TIDAK_VALID`; pembayaran tidak pernah dihapus dan koreksi dilakukan dengan menandai `TIDAK_VALID` beserta alasan.
- Menurunkan `payment_status` (`BELUM_DP`, `DP`, `LUNAS`) dari total dan jumlah pembayaran `TERVERIFIKASI`; tidak ada status pembayaran yang disimpan manual.
- Menampilkan total, DP minimum (`ceil(25% × total)`), total pembayaran terverifikasi, pembayaran tercatat yang belum terverifikasi, dan sisa pembayaran pada detail reservasi.
- Menambahkan transisi `PENDING → DITANGGUHKAN`, `PENDING → DIBATALKAN`, dan `DITANGGUHKAN → DIBATALKAN` dengan alasan wajib, riwayat status, dan aktivitas substantif. `DITOLAK` tidak menjadi status; penolakan memakai `DIBATALKAN` dengan kode alasan.
- Menandai reservasi `perlu_pemeriksaan_admin` bila pembayaran yang sudah `TERVERIFIKASI` kemudian dinyatakan `TIDAK_VALID`.
- Memperluas daftar admin Reservasi agar dapat menampilkan status selain PENDING melalui filter, serta menampilkan total dan status pembayaran.
- Menghubungkan dashboard admin ke data reservasi nyata: ringkasan reservasi aktif, empat kartu status, agenda mendatang, daftar perlu tindak lanjut, dan reservasi terbaru.
- Memperbarui capability `reservation-submission`: daftar admin tidak lagi hanya PENDING, dan catatan tindak lanjut dapat ditambahkan pada PENDING atau DITANGGUHKAN.

## Capabilities

### New Capabilities

- `reservation-processing`: pengolahan reservasi sebelum diterima, meliputi item biaya, total, pembayaran, status pembayaran turunan, penangguhan/pembatalan, riwayat, dan dashboard operasional.

### Modified Capabilities

- `reservation-submission`: daftar admin Reservasi diperluas dengan filter status, dan catatan tindak lanjut berlaku untuk reservasi PENDING maupun DITANGGUHKAN.

## Impact

- Database: tabel pembayaran baru, kolom penanda `perlu_pemeriksaan_admin`, kode alasan pada riwayat status, perluasan tipe aktivitas, dan penyesuaian constraint item biaya.
- Domain: modul perhitungan total/DP/status pembayaran, mutasi item biaya dan pembayaran, mutasi status, serta query dashboard.
- UI admin: detail reservasi, daftar reservasi, dan dashboard.
- Server Action baru untuk item biaya, pembayaran, verifikasi, pembatalan, dan penangguhan; seluruhnya wajib `requireAdminSession()`.
- Tes domain dengan PostgreSQL asli, tes render halaman admin, pemindai statis, dan verifikasi build.

## Di luar scope

- Konfirmasi reservasi, penguncian tanggal, nomor booking, dan perubahan customer `CALON → CLIENT` (change 5b).
- Pembatalan reservasi `DITERIMA`, pembebasan tanggal, dan `dp_forfeited` (change 5b).
- Reschedule, auto-cancel, penandaan `SELESAI`, pengingat pelunasan, dan eksekusi pembatalan karena pelunasan terlambat (T-01b).
- Bukti Booking, cek status publik, dan endpoint publik baru.
- Diskon, refund, payment gateway, pembayaran otomatis, unggah bukti bayar oleh customer, dan otomatisasi WhatsApp.
- Input booking langsung oleh admin dan impor booking lama.
- Blokir tanggal manual dan laporan Owner.

## Pertanyaan terbuka

- Apakah diskon atau harga hasil negosiasi akan didukung? Default roadmap: **tidak**; total hanya harga paket + item biaya (T-05).
- Apakah `DITOLAK` menjadi status tersendiri? Default roadmap: **tidak**; penolakan memakai `DIBATALKAN` dengan kode alasan (T-10).
- Berapa nominal harga sewa per hari untuk setup tambahan? Belum diketahui; admin menginputnya sebagai item biaya (terkait T-09).
- Apakah pelunasan terlambat membatalkan reservasi secara otomatis? Masih terbuka (T-01b); change ini tidak menangani batas pelunasan atau pembatalan otomatis.
