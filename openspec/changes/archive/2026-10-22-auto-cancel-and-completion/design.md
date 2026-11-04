# Design

## Context

Change ini menyentuh modul reservasi, tanggal, route handler, dan UI admin. Lihat `proposal.md` untuk motivasi dan `specs/reservation-lifecycle/spec.md` untuk perilaku yang harus dipenuhi.

Kondisi repo yang relevan:

- `reservation.perlu_pemeriksaan_admin` sudah ada sejak change 5a, dan `getDashboardData` sudah memasukkannya ke daftar “Perlu Tindak Lanjut”. Change ini memakai kembali kolom dan widget itu.
- `todayInJakarta()` dan operasi tanggal berbasis string `YYYY-MM-DD` sudah tersedia di `src/modules/availability/dates.ts`; `subtractOneCalendarMonth()` sudah menangani klaim akhir bulan.
- Mutasi status yang ada memakai transaksi, row lock reservasi, `reservation_status_history`, dan `reservation_activity` di `src/modules/reservation/mutations.ts`.
- Belum ada route job, `CRON_SECRET`, atau fungsi penyelesaian reservasi.
- Route handler Next.js menggunakan Web `Request`/`Response` dan dapat diekspor sebagai `GET`; lihat `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` baris 6-40 dan `15-route-handlers.md` baris 31-51.

## Goals / Non-Goals

**Goals:**

- Menjalankan BR-17 dan BR-13 harian dengan satu job idempoten yang menghitung berdasarkan tanggal WIB.
- Menjaga reservasi dengan pembayaran tercatat agar tidak dibatalkan otomatis.
- Menyediakan aksi admin untuk menyelesaikan reservasi setelah tanggal acara.
- Menjaga jejak status dengan pelaku `SYSTEM` atau admin.
- Memakai kembali kolom penanda dan widget dashboard yang sudah ada.

**Non-Goals:**

- Tidak menambah tabel baru.
- Tidak menghapus kunci tanggal saat reservasi menjadi `SELESAI`.
- Tidak menambahkan penjadwalan `vercel.json`; itu change `deployment`.
- Tidak mengubah aturan pembatalan manual, DP, atau pelunasan.
- Tidak membersihkan `perlu_pemeriksaan_admin` secara otomatis.

## Decisions

### D1. Modul domain dan adapter tipis

Aturan kandidat, batas tiga bulan, dan pemilihan alasan ditempatkan di modul domain reservasi, bukan di route handler. Route handler job hanya:

1. memeriksa secret;
2. memanggil fungsi domain `runReservationLifecycle({ today })`;
3. mengembalikan ringkasan hasil.

Fungsi transaksi ditempatkan bersama mutasi reservasi yang ada agar memakai pola lock, riwayat, dan perhitungan pembayaran yang sama. UI admin memanggil Server Action, bukan route job.

Alternatif yang ditolak: menaruh query dan aturan tanggal langsung di route. Itu menyulitkan pengujian tanpa HTTP dan menyebarkan aturan BR-17 ke lapisan transport.

### D2. Perhitungan tanggal WIB dan bulan kalender

- `todayInJakarta()` tetap menjadi sumber tanggal “hari ini”.
- Helper baru `dateInJakarta(value: Date)` mengubah timestamp aktivitas menjadi tanggal kalender WIB.
- Helper baru `addCalendarMonths(dateString, months)` menambah bulan kalender dengan klaim ke hari terakhir bulan tujuan. `subtractOneCalendarMonth()` yang sudah ada didelegasikan ke helper ini dengan nilai `-1` agar aturan akhir bulan hanya punya satu implementasi.
- Pemicu A memakai tanggal aktivitas substantif terakhir. Bila tidak ada, dipakai tanggal `reservation.createdAt` dalam WIB.
- Kandidat Pemicu A adalah hari batas itu sendiri dan hari-hari berikutnya: `today >= lastSubstantiveDate + 3 bulan`.
- Pemicu B adalah `eventDate < today`; hari acara belum menjadi kandidat.

Contoh BR-17 dijadikan tes murni: 1 Januari → 1 April; 30 November → 28/29 Februari; aktivitas 20 Februari menggeser batas ke 20 Mei.

Alternatif yang ditolak: menambah bulan langsung pada `Date` JavaScript tanpa klaim hari. Itu menghasilkan tanggal meluap ke bulan berikutnya untuk 31 Januari + 3 bulan.

### D3. Kandidat, pembayaran, dan transaksi

Satu transaksi mengambil reservasi berstatus `PENDING`, `DITANGGUHKAN`, atau `DITERIMA` yang relevan, beserta:

- tanggal aktivitas substantif terakhir;
- keberadaan pembayaran `DICATAT` atau `TERVERIFIKASI`.

Query memakai row lock `FOR UPDATE SKIP LOCKED` agar dua eksekusi job tidak memproses baris yang sama. Dukungan Drizzle untuk opsi ini terlihat pada `node_modules/drizzle-orm/pg-core/query-builders/select.types.d.ts` baris 60-72 (`for("update", { skipLocked: true })`). Semantik PostgreSQL `SKIP LOCKED` dijelaskan di <https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE>.

Untuk setiap baris:

1. `PENDING`/`DITANGGUHKAN` yang memenuhi Pemicu A atau B:
   - bila ada pembayaran `DICATAT`/`TERVERIFIKASI`, set `perlu_pemeriksaan_admin = true`, status tetap;
   - bila tidak ada, ubah status menjadi `AUTO_CANCELLED`, tulis riwayat status dengan pelaku `SYSTEM` dan kode alasan;
2. `DITERIMA` yang `eventDate < today`: ubah status menjadi `SELESAI`, hitung sisa, tulis riwayat status dengan pelaku `SYSTEM`;
3. status lain atau baris yang tidak memenuhi syarat tidak disentuh.

Transaksi mengunci reservasi sebelum memutuskan, sehingga admin dan job tidak saling menimpa. Bila satu langkah gagal, seluruh transaksi dibatalkan dan job dapat diulang pada eksekusi berikutnya. `SKIP LOCKED` membuat eksekusi bersamaan memproses himpunan baris yang berbeda, bukan menggandakan riwayat.

Pembayaran `TIDAK_VALID` tidak dihitung sebagai pembayaran tercatat karena BR-17 hanya menyebut `DICATAT` dan `TERVERIFIKASI`.

### D4. Kode alasan dan migrasi

Tambahkan kode alasan otomatis:

- `INACTIVITY_3M`
- `EVENT_DATE_PASSED`

`reason_code` pada `reservation_status_history` saat ini dibatasi oleh constraint `reservation_status_history_reason_code` hanya untuk dua alasan pembatalan manual (migration `migrations/0005_dear_lady_mastermind.sql` baris 20-28). Perlu migrasi baru yang mengganti constraint agar menerima dua kode otomatis. Tidak ada tabel atau kolom baru; `perlu_pemeriksaan_admin` sudah ada di migration `migrations/0005_dear_lady_mastermind.sql` baris 20.

Tipe domain dipisahkan agar validasi pembatalan manual tetap hanya menerima `MUNDUR_CUSTOMER` dan `DITOLAK_VENUE`, sedangkan riwayat status menerima gabungan seluruh kode. Label UI riwayat status diperluas untuk dua kode baru.

Alternatif yang ditolak: menyimpan kode hanya di kolom `reason` tanpa kode terstruktur. Itu memenuhi teks bebas tetapi menghilangkan kemampuan Query/penelitian membedakan pemicu A dan B.

### D5. Penandaan tanpa membatalkan

Untuk kandidat dengan pembayaran, job hanya menyalakan `perlu_pemeriksaan_admin`. Job tidak menulis aktivitas substantif dan tidak mengubah tanggal, status, atau pembayaran. Ini menjaga BR-17a: proses job tidak boleh menggeser timer tiga bulan. Karena status belum final, admin masih dapat memakai aksi manual yang ada.

Job tidak menulis `reservation_activity` sama sekali; riwayat status hanya ditulis saat status benar-benar berubah. Riwayat aktivitas yang sudah ada tetap tersedia untuk penelitian.

### D6. Penyelesaian otomatis dan manual

Penyelesaian memakai aturan yang sama untuk kedua jalur:

- hanya `DITERIMA`;
- hanya bila `today > eventDate` menurut WIB;
- status menjadi `SELESAI`;
- total dihitung dari harga paket snapshot ditambah item biaya;
- pembayaran `TERVERIFIKASI` dijumlahkan;
- bila total − terverifikasi > 0, set `perlu_pemeriksaan_admin = true`;
- kunci tanggal tidak dihapus.

Job mencatat pelaku `SYSTEM`. Aksi admin mencatat pelaku admin, alasan “Ditandai selesai oleh admin.”, dan aktivitas substantif `STATUS_CHANGE`. Aksi manual ditolak bila status bukan `DITERIMA` atau tanggal acara belum lewat.

`perlu_pemeriksaan_admin` hanya dinyalakan, tidak pernah dimatikan oleh proses ini. Register belum menetapkan kapan penanda dicabut.

### D7. Perlindungan rute job

Rute baru: `src/app/api/cron/reservasi/route.ts` dengan `GET`.

- Membaca header `Authorization`.
- Membaca `process.env.CRON_SECRET`; tidak dimasukkan ke schema environment wajib agar build, tes, dan proses non-job tidak gagal saat secret belum dipasang.
- Bila secret tidak ada, header tidak ada, atau nilainya salah, kembalikan `401` sebelum query database.
- Perbandingan memakai `crypto.timingSafeEqual` atas digest SHA-256 dari nilai yang diharapkan dan nilai yang diterima, sehingga panjang nilai tidak membocorkan perbandingan. Tipe Node tersedia di `node_modules/@types/node/crypto.d.ts` baris 2548.
- Respons sukses hanya memuat tanggal acuan WIB dan jumlah `cancelled`, `flagged`, `completed`; nilai secret tidak pernah dikembalikan.

Vercel mengirim nilai `CRON_SECRET` sebagai header `Authorization` dan menyarankan endpoint membandingkannya; lihat <https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs>. Vercel juga menegaskan pengiriman cron bersifat best-effort dan dapat berjalan ganda, sehingga idempotensi di D3 diperlukan; lihat bagian “Cron job delivery and idempotency” pada halaman yang sama.

`CRON_SECRET` ditambahkan ke `.env.example` sebagai placeholder kosong, bukan nilai nyata.

Alternatif yang ditolak: memakai sesi admin untuk job. Cron tidak memiliki cookie sesi, dan roadmap menetapkan secret khusus.

### D8. UI admin

- Detail reservasi `DITERIMA` setelah tanggal acara menampilkan form “Tandai selesai” di kartu “Tindakan status” yang sudah ada. Tidak ada layar baru.
- Sebelum tanggal acara, tombol tidak ditampilkan. Ini mengikuti BR-13, sehingga aturan sistem menang atas ui-spec yang belum menyebut tombol ini.
- Aksi memakai Server Action yang memanggil `requireAdminSession()` dan `runReservationAction`, sehingga pola redirect dan revalidasi halaman sama dengan aksi status lain.
- Dashboard tidak diubah; widget “Perlu Tindak Lanjut” sudah membaca `perlu_pemeriksaan_admin` dan menampilkan alasan “Perlu diperiksa”.

## Risks / Trade-offs

- **Transaksi job mengunci banyak baris** → job hanya mengambil status aktif yang relevan, memakai `SKIP LOCKED`, dan dijalankan harian; dataset penelitian kecil. Kegagalan membatalkan seluruh transaksi, bukan menyisakan status setengah jadi.
- **Zona waktu salah** → semua perbandingan memakai tanggal WIB dan helper murni yang diuji dengan contoh BR-17, termasuk tahun kabisat.
- **Pembatalan otomatis tidak dapat dibuka kembali** → hanya dilakukan bila tidak ada pembayaran `DICATAT`/`TERVERIFIKASI`; kasus dengan pembayaran hanya ditandai. Jalankan job di database uji dan tinjau hasil sebelum produksi.
- **Penanda tidak pernah dibersihkan** → sesuai register saat ini. Risiko daftar tindak lanjut memuat reservasi final yang sudah ditangani dicatat sebagai pertanyaan terbuka untuk change berikutnya.
- **Secret bocor lewat log** → route tidak mencatat header dan respons tidak memuat secret; `.env*` tetap tidak dilacak git.
- **Dua pemicu terpenuhi bersamaan** → status yang dihasilkan sama. Design memilih `EVENT_DATE_PASSED` sebagai kode prioritas karena tanggal acara sudah lewat; ini asumsi teknis, bukan aturan bisnis baru.

## Migration Plan

1. Ubah tipe dan schema `reason_code`, lalu jalankan `npm run db:generate` dan periksa migration baru. Migrasi hanya melonggarkan constraint; tidak ada backfill.
2. Tambahkan helper tanggal dan modul lifecycle; jalankan tes unit dan tes mutasi terhadap PostgreSQL uji.
3. Tambahkan route job dan `CRON_SECRET` ke `.env.example`. Uji rute dengan secret benar/salah; jangan mencetak nilai secret.
4. Tambahkan aksi manual dan UI; lakukan review browser.
5. Setelah deploy, panggil rute sekali dengan `Authorization` yang benar dan periksa ringkasan hasil serta riwayat status. Rollback kode tidak membatalkan status yang sudah diubah job; karena itu verifikasi di database uji wajib sebelum produksi.

## Open Questions

- Kapan `perlu_pemeriksaan_admin` dicabut? Register belum menetapkannya; change ini sengaja tidak menebak.
- Jam eksekusi cron ditentukan di change `deployment`; job tidak bergantung pada jam tersebut karena memakai tanggal WIB.
