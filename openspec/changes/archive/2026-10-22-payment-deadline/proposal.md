# Proposal

## Why

BR-08 menetapkan pelunasan paling lambat 14 hari sebelum tanggal acara, tetapi sistem belum menampilkan batas tersebut. Admin belum dapat melihat kapan pelunasan jatuh tempo atau reservasi mana yang sudah melewati batas, sehingga risiko keterlambatan tidak terlihat dari data yang sudah ada.

Change ini hanya menambahkan batas pelunasan turunan dan penanda keterlambatan. T-01b masih TERBUKA: eksekusi pembatalan, akibat DP, dan status hasil tidak diputuskan, sehingga change ini tidak boleh mengubah status reservasi, membebaskan tanggal, atau menghanguskan DP.

## What Changes

- Menambahkan perhitungan turunan `payment_due_date` = tanggal acara dikurangi 14 hari kalender, memakai tanggal `YYYY-MM-DD` dan aturan WIB.
- Menambahkan penanda keterlambatan pelunasan yang dihitung dari `payment_due_date`, status pembayaran turunan, dan tanggal hari ini WIB. Batas bersifat inklusif: lunas pada `payment_due_date` masih tepat waktu; terlambat mulai hari berikutnya.
- Menampilkan batas pelunasan dan penanda keterlambatan pada detail reservasi admin yang sudah ada. Tidak ada layar, menu, atau widget dashboard baru.
- Membuat penanda mengikuti tanggal acara terkini, sehingga perubahan tanggal karena reschedule langsung mengubah batas pelunasan tanpa menyimpan nilai baru.
- Menambahkan tes batas tanggal, pembaruan setelah reschedule, status lunas, dan tampilan admin.
- Tidak mengubah status reservasi, pembayaran, kunci tanggal, ketersediaan, timer auto-cancel, atau data yang terlihat customer.
- Tidak menambahkan tabel, kolom, migrasi, dependensi, job, atau aksi tulis baru.

## Capabilities

### New Capabilities

- `payment-deadline`: Batas pelunasan turunan H-14 dan penanda keterlambatan yang hanya ditampilkan kepada admin, tanpa konsekuensi pembatalan selama T-01b belum diputuskan.

### Modified Capabilities

- Tidak ada. Perilaku pembayaran, reservasi, ketersediaan, reschedule, auto-cancel, dan Bukti Booking yang sudah ada tidak berubah.

## Impact

- Modul domain reservasi: fungsi murni baru untuk menghitung batas pelunasan dan keterlambatan; tipe detail reservasi dapat membawa nilai turunan tersebut.
- Query detail reservasi admin: menurunkan batas dan penanda dari `eventDate`, status pembayaran, dan tanggal hari ini WIB.
- Halaman detail reservasi admin: baris “Batas pelunasan” dan lencana “Pelunasan terlambat” pada ringkasan pembayaran yang sudah ada.
- Tes: unit tanggal dan batas inklusif, query/reschedule, tampilan admin, dan pemeriksaan tidak ada perubahan status atau data operasional.
- Tidak ada perubahan skema database, API publik, halaman publik, pembatas laju, atau dependensi.

## Di luar scope

- Eksekusi pembatalan karena pelunasan terlambat, DP hangus, status hasil, dan alasan pembatalan `PELUNASAN_TERLAMBAT` (T-01b tetap TERBUKA).
- Mengubah status reservasi menjadi `DIBATALKAN` atau status lain secara otomatis.
- Membebaskan `date_lock`, mengubah ketersediaan, atau mengubah timer auto-cancel.
- Menyimpan `payment_due_date`, `pelunasan_terlambat`, atau riwayat keterlambatan di database.
- Menampilkan batas pelunasan pada halaman publik, cek status, atau Bukti Booking.
- Notifikasi WhatsApp, email, job harian baru, atau pengingat otomatis.
- Widget dashboard, menu Pembayaran baru, halaman baru, atau laporan.
- Payment gateway, pembayaran otomatis, dan unggah bukti bayar oleh customer.

## Pertanyaan terbuka

- **T-01b (TERBUKA):** eksekusi pembatalan karena pelunasan terlambat belum diputuskan. Change ini hanya menampilkan batas dan penanda; tidak ada tindakan otomatis atau manual yang mengubah status.
- **Cakupan status penanda:** BR-08 tidak membatasi status reservasi. Usulan: penanda dihitung untuk reservasi yang belum `LUNAS`, termasuk status akhir, karena hanya informasi administratif dan tidak mengubah data. Ini perlu dikonfirmasi bila venue ingin membatasi ke status aktif saja.
- **Metode penanda:** BR-08 menyebut penanda `pelunasan_terlambat` tanpa menentukan apakah disimpan. Usulan: turunkan setiap kali dibaca agar tidak ada data basi setelah reschedule atau pembayaran berubah.
