# Proposal

## Why

Change `availability-calendar` sudah menyediakan mesin ketersediaan dan kalender publik, tetapi customer belum dapat mengirim permintaan reservasi. Tanpa form pengajuan, admin tidak punya data calon customer maupun reservasi PENDING untuk ditindaklanjuti, dan alur konfirmasi di change berikutnya tidak memiliki titik awal. Change ini menghubungkan kalender ke form publik dan menyimpan pengajuan tanpa mengunci tanggal.

## What Changes

- Menambah halaman publik `/reservasi` dengan tiga langkah: pilih paket, pilih tanggal (memakai komponen kalender dan query ketersediaan yang sudah ada), lalu isi detail acara dan lihat ringkasan.
- Menambah form pengajuan dengan field FINAL-DEFAULT T-13: nama lengkap, nomor WhatsApp, alamat, jenis acara, paket, tanggal acara, dan catatan opsional.
- Menyimpan pengajuan sebagai `customer` berstatus `CALON` dan `reservation` berstatus `PENDING`, dengan snapshot paket dan harga. Tanggal **tidak** dikunci pada tahap ini.
- Menambah tabel `customer`, `reservation`, `reservation_item`, `reservation_status_history`, `reservation_activity`, dan penyimpanan pembatas laju form publik sesuai peta entitas roadmap Change 4.
- Memvalidasi tanggal di server: harus setelah hari ini (WIB), paket aktif, dan seluruh tanggal acara serta setup bawaan paket tidak terkunci. Validasi yang sama dipakai kalender agar hari ini tidak dapat dipilih.
- Menambah pembatas laju berbasis database untuk pengajuan form publik dan pesan galat generik saat batas terlampaui.
- Menampilkan pesan sukses tanpa nomor booking, dengan catatan bahwa permintaan belum dikonfirmasi dan belum mengunci tanggal, serta tombol WhatsApp ke admin.
- Menambah halaman admin `/admin/reservasi` untuk daftar dan pencarian reservasi PENDING, detail reservasi, serta catatan tindak lanjut yang tercatat sebagai aktivitas. Menu "Reservasi" ditambahkan ke sidebar admin.
- Menyesuaikan perilaku kalender publik: tanggal hari ini (WIB) diperlakukan sama seperti tanggal lampau, yaitu tidak dapat dipilih, agar konsisten dengan BR-26.

## Capabilities

### New Capabilities

- `reservation-submission`: pengajuan reservasi publik, pembuatan customer CALON dan reservasi PENDING, snapshot paket/harga, validasi tanggal, pembatas laju, pesan sukses WhatsApp, serta peninjauan awal dan catatan tindak lanjut oleh admin.

### Modified Capabilities

- `availability-calendar`: requirement "Ketersediaan publik menurut paket" diubah agar tanggal hari ini (WIB), bukan hanya tanggal lampau, ditandai tidak dapat dipilih.

## Impact

- **Kode baru**: `src/modules/reservation/` (types, schema, mutations, queries), `src/app/reservasi/page.tsx` dan komponen form klien, route handler publik `src/app/api/reservasi/route.ts` dan `src/app/api/ketersediaan/route.ts`, halaman admin `src/app/admin/reservasi/`, serta tes di `tests/`.
- **Kode diubah**: `src/app/admin/admin-shell.tsx` dan `src/app/admin/admin-icons.tsx` (menu Reservasi), `src/modules/availability/dates.ts` dan tesnya (hari ini tidak dapat dipilih), `src/lib/db/schema.ts` (ekspor skema reservasi).
- **Database**: tabel `customer` (WhatsApp unik), `reservation`, `reservation_item`, `reservation_status_history`, `reservation_activity`, dan `submission_rate_limit`; dibuat lewat migrasi Drizzle. Tidak ada perubahan pada `date_lock`.
- **Routes**: `/reservasi` publik, `POST /api/reservasi`, `GET /api/ketersediaan`, dan `/admin/reservasi` (dilindungi `requireAdminSession()`).
- **Dependencies**: tanpa dependensi baru; validasi memakai Zod, akses data memakai Drizzle, pembatas laju memakai PostgreSQL.
- **Dokumen sumber**: `docs/roadmap.md` Change 4 dan peta entitas; `docs/product-backlog.md` US-040 sampai US-044; `docs/business-rules-register.md` BR-17a, BR-19, BR-25, BR-26, BR-29, BR-24, BR-30, T-04, T-08, T-12, T-13, T-16, T-17; `docs/design/ui-spec.md` 4.1 (Reservasi) dan 4.2 (Reservasi/Pelanggan); TDR D2, D4, D5, D8, D9.

## Keputusan

1. Form publik tidak memakai Server Action karena pemindai statis mewajibkan `requireAdminSession()` pada setiap berkas `'use server'`; pengajuan memakai route handler `POST /api/reservasi`.
2. Pengajuan PENDING tidak menulis `date_lock`; pengecekan ketersediaan hanya mencegah pengajuan yang sudah pasti bentrok. Dua PENDING pada tanggal yang sama masih mungkin dan diselesaikan pada konfirmasi change 5b.
3. Harga dan identitas paket disalin ke reservasi (snapshot) agar perubahan paket tidak mengubah pengajuan lama (BR-29).
4. Satu customer per nomor WhatsApp; nomor dinormalisasi ke format `62...` sebelum disimpan dan dibandingkan (BR-25).
5. Tanggal acara harus **setelah hari ini** menurut WIB. Karena itu kalender publik juga menandai hari ini sebagai Terisi.
6. Pembatas laju disimpan di database, memakai kunci turunan IP dan parameter awal 5 pengajuan per 15 menit; parameter bersifat teknis dan dapat diubah tanpa mengubah aturan bisnis (D8).
7. Nomor booking belum dibuat; pesan sukses tidak memuat kode apa pun (BR-05, BR-19).
8. Item biaya, pembayaran, konfirmasi, dan penguncian tanggal berada di luar change ini.

## Pertanyaan Terbuka

1. **T-02 (BR-18 PROVISIONAL)**: apakah setup H-2/H-3 memblokir kalender. Default roadmap **ya** dipakai; pengajuan menolak tanggal yang bentrok dengan setup paket.
2. **T-04**: batas minimum jarak hari pengajuan. Default roadmap: hanya tanggal hari ini dan lampau yang ditolak; tidak ada batas H-7/H-14.
3. **T-08**: blokir tanggal manual oleh admin tidak dibuat, sehingga pengajuan hanya memeriksa kunci dari reservasi yang sudah dikonfirmasi.
4. **Harga hari setup tambahan**: belum diketahui dan tidak dipakai di change ini; nominal diinput admin sebagai item biaya pada change 5a.
5. **Isi templat WhatsApp sukses**: memakai templat yang menyebut nama, paket, dan tanggal acara. Nomor booking belum ada pada tahap PENDING.

## Di luar scope

- Konfirmasi, penolakan, nomor booking, dan penguncian tanggal (change `reservation-confirmation`).
- Pembayaran, DP, item biaya, dan perubahan status selain pembuatan PENDING awal (change `reservation-processing`).
- Input reservasi langsung oleh admin (change `admin-direct-entry`).
- Halaman Pelanggan sebagai daftar tersendiri, pencarian nomor booking, dan penggabungan data customer lanjutan.
- Cek status publik, Bukti Booking, reschedule, auto-cancel, catatan setup, dan pelunasan.
- Form kontak, chatbot, notifikasi otomatis, dan integrasi WhatsApp API.
- Tata letak mobile (change `responsive-pass`).
