# Proposal

## Why

BR-05 (FINAL) menyatakan status reservasi hanya dapat dicek lewat nomor booking; customer dengan reservasi PENDING/DITANGGUHKAN tidak memiliki sarana cek status dan bertanya via WhatsApp. BR-10 (FINAL) menetapkan Bukti Booking sebagai satu-satunya dokumen customer. BR-32 (FINAL-DEFAULT) mewajibkan perlindungan terhadap penebakan nomor booking. Saat ini belum ada halaman cek status maupun Bukti Booking, sehingga customer tidak dapat memverifikasi reservasi yang sudah diterima dan tidak memiliki dokumen cetak.

## What Changes

- Tambah halaman publik `/cek-status` untuk mencari reservasi berdasarkan nomor booking dan menampilkan ringkasan status.
- Tambah halaman siap cetak Bukti Booking yang memuat isi BR-10 dan waktu cetak; PDF dihasilkan dari fungsi cetak peramban (D6), bukan server-side.
- Tambah perlindungan cek status: rate limiting berbasis database, pesan galat generik yang tidak membedakan nomor tidak ada vs salah, dan data minimal dengan nama customer disamarkan (BR-32).
- Reservasi PENDING/DITANGGUHKAN tidak memiliki nomor booking sehingga tidak dapat dicek (BR-05); tidak ada kode pengajuan terpisah.
- Tidak menambah faktor verifikasi tambahan (mis. 4 digit kontak) tanpa persetujuan (BR-32).
- Tidak mengubah alur konfirmasi, pembayaran, atau status reservasi.

## Capabilities

### New Capabilities

- `booking-proof`: Cek status berdasarkan nomor booking dan Bukti Booking siap cetak, dengan perlindungan rate limit, galat generik, dan data minimal.

### Modified Capabilities

- Tidak ada.

## Impact

- Halaman publik: `/cek-status`, `/bukti-booking/[nomor]`.
- Modul domain reservasi: query publik berdasarkan nomor booking, tipe data publik, penyamaran nama.
- Rate limiting: memakai kembali `submission_rate_limit` serta `consumeSubmissionLimit`/`getRequestIpHash` yang ada; tanpa migrasi baru.
- Tes: query dan rate limit terhadap PostgreSQL asli; halaman/form terhadap jsdom; verifikasi build/rute.

## Di luar scope

- PDF server-side atau pustaka PDF baru (D6: halaman siap cetak).
- Faktor verifikasi tambahan (4 digit kontak, OTP, dan sejenisnya) tanpa persetujuan.
- Perubahan alur konfirmasi BR-22, pembayaran, status, dan nomor booking.
- Cek status untuk reservasi PENDING/DITANGGUHKAN atau kode pengajuan terpisah.
- Halaman admin baru, impor data, reschedule, auto-cancel, atau batas pelunasan.

## Pertanyaan terbuka

- Tidak ada keputusan bisnis baru. BR-32 berstatus FINAL-DEFAULT: rate limiting, galat generik, dan data minimal dipakai; faktor verifikasi tambahan tidak ditambahkan tanpa persetujuan.
- Batas dan jendela rate limit mengikuti default implementasi yang ada dan dapat disesuaikan tanpa mengubah perilaku spec.
