# Proposal

## Why

BR-17 dan BR-13 mewajibkan reservasi yang tidak aktif dibatalkan otomatis serta reservasi `DITERIMA` menjadi `SELESAI` setelah tanggal acara, tetapi belum ada job harian yang menjalankannya. Tanpa otomasi, reservasi `PENDING`/`DITANGGUHKAN` dapat menumpuk tanpa keputusan, sedangkan reservasi `DITERIMA` yang acaranya sudah lewat tetap terlihat aktif. Change ini juga memastikan reservasi dengan pembayaran tercatat tidak dibatalkan otomatis, melainkan ditandai untuk diperiksa admin.

## What Changes

- Menambahkan job harian WIB yang idempoten dan dilindungi `CRON_SECRET` untuk menjalankan BR-17 dan BR-13.
- Membatalkan otomatis reservasi `PENDING` dan `DITANGGUHKAN` menjadi `AUTO_CANCELLED` bila tidak ada aktivitas substantif selama tiga bulan kalender atau tanggal acara sudah lewat.
- Tidak membatalkan reservasi yang memiliki pembayaran `DICATAT` atau `TERVERIFIKASI`; reservasi tersebut ditandai `perlu_pemeriksaan_admin` dan diserahkan ke keputusan admin.
- Menandai `SELESAI` secara otomatis pada hari kalender setelah tanggal acara untuk reservasi `DITERIMA`.
- Menambahkan aksi admin untuk menandai `SELESAI` secara manual setelah tanggal acara.
- Menandai `perlu_pemeriksaan_admin` bila sisa pembayaran masih lebih dari nol saat reservasi menjadi `SELESAI`.
- Mencatat setiap perubahan status dengan waktu, status lama, status baru, alasan, dan pelaku `SYSTEM` atau admin, serta menyimpan kode alasan `INACTIVITY_3M` atau `EVENT_DATE_PASSED` untuk pembatalan otomatis.
- Memverifikasi bahwa reservasi bertanda `perlu_pemeriksaan_admin` tampil pada daftar “Perlu Tindak Lanjut” dashboard yang sudah ada. Tidak ada layar baru.

## Capabilities

### New Capabilities

- `reservation-lifecycle`: otomasi pembatalan reservasi tidak aktif, penandaan reservasi yang memerlukan pemeriksaan, serta penyelesaian reservasi setelah tanggal acara.

### Modified Capabilities

Tidak ada. Perilaku manual sebelum dan sesudah konfirmasi tetap diatur oleh `reservation-processing` dan `reservation-confirmation`.

## Di luar scope

- Eksekusi pembatalan karena pelunasan terlambat (T-01b) dan `payment_due_date`; itu change `payment-deadline`.
- Perubahan aturan DP, pembayaran, refund, atau penghapusan data.
- Penghapusan kunci tanggal pada reservasi yang menjadi `SELESAI`; tanggal tetap tercatat sebagai riwayat.
- Pembuatan layar, statistik, atau tombol baru di luar detail reservasi dan dashboard yang sudah ada.
- Penjadwalan produksi di Vercel dan konfigurasi `vercel.json`; itu change `deployment`. Change ini hanya menyediakan rute yang siap dipanggil job.
- Pembersihan otomatis penanda `perlu_pemeriksaan_admin` setelah admin mengambil keputusan. Register tidak menetapkan aturannya.

## Pertanyaan terbuka

- **Kapan `perlu_pemeriksaan_admin` dibersihkan?** Register hanya menetapkan bahwa penanda dipasang, bukan kapan dicabut. Change ini mempertahankan penanda agar admin tetap melihatnya; keputusan pembersihan ditunda.
- **Prioritas kode alasan bila Pemicu A dan Pemicu B terpenuhi bersamaan?** Hasilnya sama, yaitu `AUTO_CANCELLED`. Design memilih `EVENT_DATE_PASSED` sebagai kode yang tercatat karena tanggal acara sudah lewat; ini keputusan teknis yang tidak mengubah status.
- **Jam eksekusi job?** Di luar change ini. Deployment akan memilih jadwal harian; perhitungan selalu memakai tanggal WIB, bukan jam eksekusi.

## Impact

- **Rute:** route handler job baru di bawah `src/app/api/`, dilindungi `CRON_SECRET`.
- **Domain:** modul `reservation` untuk aturan tiga bulan kalender, kandidat, transaksi pembatalan/penyelesaian, dan riwayat; helper tanggal WIB untuk menambah bulan dan membaca tanggal kalender dari timestamp.
- **Database:** perluasan constraint `reservation_status_history.reason_code` untuk `INACTIVITY_3M` dan `EVENT_DATE_PASSED`; kolom `perlu_pemeriksaan_admin` sudah ada dan dipakai ulang.
- **UI admin:** aksi “Tandai selesai” pada detail reservasi `DITERIMA` setelah tanggal acara; dashboard memakai widget “Perlu Tindak Lanjut” yang sudah ada.
- **Konfigurasi:** `CRON_SECRET` pada environment dan `.env.example`.
- **Tes:** aturan tanggal, kandidat, pembatalan, penandaan, penyelesaian otomatis/manual, idempotensi, konkurensi job, otorisasi rute, dan tampilan admin.
