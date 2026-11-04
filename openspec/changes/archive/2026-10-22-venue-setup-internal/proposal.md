# Proposal

## Why

T-14 (PROVISIONAL) dan US-100 meminta admin dapat menyimpan satu catatan teks setup per reservasi. Saat ini informasi setup hanya diturunkan dari paket dan `date_lock`; tidak ada tempat untuk mencatat kebutuhan operasional yang tidak boleh terlihat oleh customer. Tanpa catatan internal, detail persiapan venue tersebar di luar sistem dan berisiko hilang atau tercampur dengan catatan tindak lanjut reservasi.

Change ini menambahkan catatan setup internal yang minimal, hanya untuk admin, dan tidak mengubah ketersediaan, status, tanggal, pembayaran, atau aturan setup paket.

## What Changes

- Menambahkan tabel `setup_note` dengan satu baris per reservasi: teks catatan, pelaku pembaruan, dan waktu pembaruan. `reservation_id` unik menjadi penegak “satu catatan per reservasi”.
- Menambahkan kemampuan admin terautentikasi untuk membuat atau memperbarui catatan setup pada halaman detail reservasi yang sudah ada. Tidak ada layar baru.
- Menampilkan catatan setup hanya di area admin. Catatan tidak boleh muncul pada halaman publik, endpoint ketersediaan, cek status, atau Bukti Booking.
- Menjaga catatan tetap terpisah dari catatan tindak lanjut: menyimpan catatan setup tidak mengubah status reservasi dan tidak dihitung sebagai aktivitas substantif yang menggeser batas auto-cancel.
- Menambahkan tes aturan bisnis terhadap PostgreSQL asli untuk keunikan satu catatan per reservasi, pembaruan catatan, otorisasi admin, dan tidak bocornya catatan ke permukaan publik.
- Menandai perilaku ini **PROVISIONAL** dan **GERBANG** karena bentuk satu catatan teks berasal dari T-14 dan masih dapat berubah bila venue meminta format lain.

## Capabilities

### New Capabilities

- `reservation-setup`: Catatan setup internal per reservasi yang hanya dapat dibaca dan diubah admin, tanpa memengaruhi status, jadwal, pembayaran, atau data publik.

### Modified Capabilities

- Tidak ada. Ketersediaan, setup paket, reservasi, dan pengolahan reservasi yang sudah ada tidak berubah perilakunya.

## Impact

- Skema database: migrasi baru menambahkan tabel `setup_note`; tidak mengubah `reservation`, `date_lock`, atau `package`.
- Modul domain reservasi: tipe, skema input, query detail, mutasi catatan setup, dan pesan galat.
- Halaman admin: kartu “Catatan setup” pada detail reservasi yang sudah ada.
- Halaman publik, endpoint ketersediaan, cek status, dan Bukti Booking tidak berubah.
- Tes: schema/migrasi, mutasi terhadap PostgreSQL asli, otorisasi aksi admin, dan pemeriksaan tidak ada kebocoran ke permukaan publik.
- Tidak menambah dependensi baru.

## Di luar scope

- Beberapa catatan atau riwayat versi catatan setup.
- Lampiran, unggah berkas, gambar setup, atau integrasi penyimpanan.
- Notifikasi otomatis, WhatsApp, atau komunikasi customer.
- Menampilkan catatan setup kepada customer atau pada endpoint publik.
- Perubahan hari setup paket, kunci tanggal, ketersediaan, reschedule, pembayaran, status, auto-cancel, dan penyelesaian reservasi.
- Widget dashboard baru atau halaman admin baru.
- Mengubah data reservasi lain selain catatan setup.

## Pertanyaan terbuka

- **Status reservasi yang boleh memiliki catatan:** brief T-14 tidak membatasi status. Diusulkan catatan dapat dibuat atau diperbarui pada reservasi yang ada, termasuk status akhir, karena catatan bersifat operasional dan tidak mengubah data bisnis. Usulan ini ditandai PROVISIONAL dan perlu dikonfirmasi.
- **Batas panjang dan teks kosong:** diusulkan maksimum 1.000 karakter seperti catatan tindak lanjut, tanpa aksi hapus terpisah. Perilaku teks kosong akan ditetapkan di design.
- **Pengaruh terhadap timer auto-cancel:** diusulkan catatan setup tidak dihitung sebagai aktivitas substantif (BR-17a) karena bukan komunikasi customer atau perubahan data booking. Usulan ini perlu dikonfirmasi.
- **Penempatan UI:** `docs/design/ui-spec.md` 4.2 menyebut “catatan” pada detail reservasi, tetapi belum merinci catatan setup. Diusulkan kartu baru pada detail reservasi yang sudah ada, tanpa layar baru.
