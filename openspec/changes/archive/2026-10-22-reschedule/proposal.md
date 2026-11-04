# Proposal

## Why

BR-15 (FINAL, rincian FINAL-DEFAULT) mengizinkan satu kali reschedule untuk reservasi `DITERIMA`, tetapi sistem belum memiliki sarana bagi admin untuk melakukannya. Tanpa reschedule yang tercatat, perubahan tanggal hanya dapat dilakukan di luar sistem sehingga kunci tanggal, riwayat, dan kalender berisiko tidak sinkron. Change ini menutup US-080 dengan perpindahan tanggal yang atomik dan tetap mempertahankan nomor booking.

## What Changes

- Tambah kemampuan admin memindahkan tanggal reservasi `DITERIMA` paling banyak **satu kali**.
- Batas permintaan: tanggal permintaan (WIB) tidak boleh melewati tanggal acara lama dikurangi satu bulan kalender.
- Tanggal acara baru beserta tanggal setup paket harus tersedia; jika tidak, reschedule ditolak dan jatah tidak berkurang.
- Eksekusi atomik dalam satu transaksi: kunci tanggal baru, bebaskan tanggal lama, simpan riwayat reschedule, naikkan `reschedule_count` menjadi 1, dan catat riwayat status/aktivitas. Status tetap `DITERIMA` dan nomor booking tidak berubah.
- Tambah kolom `reservation.reschedule_count` (0 atau 1) dan tabel `reschedule_history` untuk menyimpan tanggal lama, tanggal baru, pelaku, dan waktu.
- Tambah aksi Server Action admin dan form reschedule pada halaman detail reservasi yang sudah ada. Tidak ada form reschedule publik.
- Tambah pesan galat khusus untuk batas waktu, jatah habis, status tidak sesuai, dan tanggal baru tidak tersedia.
- Tambah tes aturan bisnis terhadap PostgreSQL asli, termasuk penolakan yang tidak menghabiskan jatah dan reschedule bersamaan.

## Capabilities

### New Capabilities

- `reschedule`: Perpindahan tanggal reservasi `DITERIMA` oleh admin, maksimal satu kali, dengan batas satu bulan kalender, perpindahan kunci tanggal atomik, nomor booking tetap, dan riwayat yang tercatat.

### Modified Capabilities

- Tidak ada. Perilaku konfirmasi, pembatalan, nomor booking, dan pengolahan reservasi yang sudah ada tidak berubah.

## Impact

- Skema database: migrasi baru menambah `reservation.reschedule_count` dan tabel `reschedule_history`; tidak ada perubahan pada `date_lock`.
- Modul domain reservasi: tipe, skema input, fungsi tanggal, mutasi reschedule, query detail, dan pesan galat.
- Halaman admin: aksi dan form reschedule pada detail reservasi yang sudah ada; tidak ada halaman baru.
- Halaman publik dan Bukti Booking tidak berubah; tanggal yang ditampilkan otomatis mengikuti `reservation.event_date` terkini.
- Tes: aturan tanggal murni, mutasi terhadap PostgreSQL asli, konkurensi, schema/migrasi, aksi admin, dan tampilan detail.
- Tidak menambah dependensi baru.

## Di luar scope

- Reschedule oleh customer atau form reschedule publik (BR-15: admin yang mengeksekusi).
- Reschedule kedua atau perubahan jatah selain 0/1.
- Perubahan paket, jenis acara, harga, item biaya, atau pembayaran pada saat reschedule.
- Pembatalan, auto-cancel, penandaan `SELESAI`, dan eksekusi batas pelunasan (change 8 dan 10).
- Menampilkan `payment_due_date` baru; batas pelunasan tetap diturunkan dari tanggal acara dan akan ditampilkan pada change `payment-deadline`.
- Notifikasi otomatis atau otomatisasi WhatsApp.
- Blokir tanggal manual dan perubahan aturan ketersediaan (T-08).

## Pertanyaan terbuka

- `docs/design/ui-spec.md` belum mencantumkan aksi reschedule. Diusulkan form ditempatkan pada halaman detail reservasi admin yang sudah ada, tanpa layar baru, karena BR-15 tetap membutuhkan sarana eksekusi admin. Penempatan ini dicatat di design dan perlu disetujui saat review UI.
- BR-15 tidak merinci perilaku tanggal akhir bulan saat mengurangi satu bulan kalender (misalnya 31 Maret dikurangi satu bulan). Diusulkan aturan yang sama dengan BR-17: bila tanggal tujuan tidak ada, dipakai hari terakhir bulan tersebut. Aturan ini ditandai FINAL-DEFAULT dan dapat disesuaikan bila venue menentukan lain.
- Tidak ada item TERBUKA (T-xx) lain yang menghambat change ini.
