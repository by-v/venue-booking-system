# Design

## Context

Change ini dibangun di atas `reservation-submission` yang sudah menyimpan customer, reservasi PENDING, snapshot paket, item biaya kosong, riwayat status, dan aktivitas. Belum ada tabel pembayaran, perhitungan total/DP, status pembayaran turunan, aksi penangguhan/pembatalan, atau dashboard berisi data.

Lihat `proposal.md` untuk motivasi dan batas scope. Perilaku yang harus dipenuhi ada di `specs/reservation-processing/spec.md` dan delta `specs/reservation-submission/spec.md`.

## Goals / Non-Goals

**Goals:**

- Menyimpan item biaya dan pembayaran tanpa menghapus data bisnis.
- Menghitung total, DP minimum, status pembayaran, dan sisa secara turunan.
- Menyediakan transisi status sebelum penerimaan dengan riwayat dan aktivitas.
- Menghubungkan daftar reservasi dan dashboard admin ke data nyata.
- Menjaga seluruh aksi tulis di balik sesi admin dan transaksi database.

**Non-Goals:**

- Konfirmasi, penguncian tanggal, nomor booking, dan perubahan customer menjadi CLIENT.
- Pembatalan reservasi DITERIMA, pembebasan tanggal, dan `dp_forfeited`.
- Reschedule, auto-cancel, SELESAI, bukti booking, cek status publik, dan pelunasan H-14.
- Diskon, refund, payment gateway, unggah bukti, dan otomatisasi WhatsApp.

## Decisions

### D1 - Model data pembayaran dan penanda pemeriksaan

Tambah tabel `payment`:

- `id` text primary key.
- `reservation_id` FK ke `reservation.id` dengan `onDelete: restrict`.
- `amount_rupiah` integer not null.
- `verification_status` text default `DICATAT`, check `DICATAT`, `TERVERIFIKASI`, `TIDAK_VALID`.
- `verification_reason` text nullable; check wajib terisi bila status `TIDAK_VALID`.
- `recorded_by_user_id` FK ke `user.id` (`set null`), `verified_by_user_id` FK ke `user.id` (`set null`).
- `status_changed_at` timestamp nullable, `created_at` dan `updated_at` timestamp.

Constraint:

- `payment_amount_positive`: `amount_rupiah > 0`.
- `payment_status_valid`: status hanya tiga nilai di atas.
- `payment_invalid_reason`: `verification_status <> 'TIDAK_VALID' OR (verification_reason IS NOT NULL AND btrim(verification_reason) <> '')`.
- `payment_status_changed_at`: `verification_status = 'DICATAT' OR status_changed_at IS NOT NULL`.

Tambah `reservation.perlu_pemeriksaan_admin` boolean default `false`.

Tambah `reservation_status_history.reason_code` text nullable dengan check `reason_code IS NULL OR reason_code IN ('MUNDUR_CUSTOMER','DITOLAK_VENUE')`. Kode hanya wajib untuk pembatalan; penangguhan memakai alasan teks.

Perluas check `reservation_activity.type` dengan `STATUS_CHANGE`, `ITEM_ADDED`, `PAYMENT_RECORDED`, dan `PAYMENT_STATUS_CHANGED`. Aktivitas baru mencatat ringkasan di `note`.

Perketat `reservation_item`: `amount_rupiah > 0` dan deskripsi tidak kosong. Tabel sudah ada, jadi perubahan berupa constraint baru.

**Alternatif ditolak:** menyimpan `total_rupiah` atau `payment_status` sebagai kolom biasa. Keduanya mudah basi setelah item/pembayaran berubah; BR-20 meminta status pembayaran diturunkan.

### D2 - Modul domain murni untuk keuangan

Tambahkan fungsi murni di `src/modules/reservation/pricing.ts`:

- `calculateReservationTotal(packagePriceRupiah, itemAmounts)`.
- `calculateMinimumDp(totalRupiah)` dengan pembulatan ke atas 25%.
- `derivePaymentStatus(totalRupiah, verifiedRupiah)`.
- `calculateRemainingPayment(totalRupiah, verifiedRupiah)`.

`estimateMinimumDp` yang sudah dipakai form publik dipertahankan sebagai pembungkus `calculateMinimumDp` agar perilaku form tidak berubah. Uang tetap integer rupiah.

Tipe baru di `types.ts`: `PAYMENT_VERIFICATION_STATUSES`, `PAYMENT_STATUSES`, `ReservationItem`, `Payment`, `ReservationFinancials`, `ReservationListItem` yang diperluas, dan `ReservationDetail` yang diperluas.

**Alternatif ditolak:** menghitung total/DP di komponen UI. Aturan yang sama dibutuhkan query admin, dashboard, dan change 5b; perhitungan harus berada di modul domain.

### D3 - Mutasi dalam transaksi dan penguncian baris

Semua mutasi baru berada di `src/modules/reservation/mutations.ts` atau modul pengolahan terpisah yang diimpor oleh Server Action. Setiap mutasi yang mengubah status atau memverifikasi pembayaran membuka `db.transaction` dan mengunci baris reservasi dengan `SELECT ... FOR UPDATE` sebelum membaca total atau status. API yang dipakai tersedia di `node_modules/drizzle-orm/pg-core/db.d.ts:281` (`transaction`) dan `node_modules/drizzle-orm/pg-core/query-builders/select.d.ts:586` (`for`).

- `addReservationItem`: kunci reservasi, tolak status akhir, sisipkan item, catat aktivitas `ITEM_ADDED`.
- `recordPayment`: kunci reservasi, tolak status akhir, sisipkan pembayaran `DICATAT`, catat aktivitas `PAYMENT_RECORDED`.
- `verifyPayment`: kunci reservasi dan muat pembayaran; hanya `DICATAT` yang boleh menjadi `TERVERIFIKASI`; hitung total dan jumlah terverifikasi; tolak bila melebihi total; perbarui pembayaran dan catat aktivitas `PAYMENT_STATUS_CHANGED`.
- `invalidatePayment`: kunci reservasi dan muat pembayaran; hanya `DICATAT`/`TERVERIFIKASI` yang boleh menjadi `TIDAK_VALID`; alasan wajib; bila status lama `TERVERIFIKASI`, set `perlu_pemeriksaan_admin = true`; catat aktivitas.
- `suspendReservation` dan `cancelReservation`: kunci reservasi, validasi transisi state machine, alasan wajib, perbarui status, sisipkan riwayat status dengan `reason_code` untuk pembatalan, catat aktivitas `STATUS_CHANGE`.

Pembayaran boleh dicatat/diverifikasi selama reservasi belum berstatus akhir (`DIBATALKAN`, `AUTO_CANCELLED`, `SELESAI`). Ini menyiapkan pelunasan setelah DITERIMA pada change 5b tanpa mengubah aturan konfirmasi.

Tidak ada operasi hapus atau ubah nominal pembayaran. Koreksi hanya melalui `TIDAK_VALID`.

**Alternatif ditolak:** validasi total hanya di aplikasi tanpa transaksi. Dua admin yang memverifikasi bersamaan dapat membuat jumlah terverifikasi melebihi total. Penguncian baris reservasi membuat pemeriksaan total dan penulisan status berurutan.

### D4 - Query dan agregasi

`getReservationDetail` diperluas untuk memuat item, pembayaran, total, DP minimum, status pembayaran, sisa, dan penanda pemeriksaan. Detail boleh menghitung total di aplikasi setelah memuat item dan pembayaran.

`listReservations` menggantikan daftar khusus PENDING:

- Filter `proses` (default): `PENDING` + `DITANGGUHKAN`.
- Filter `diterima`, `dibatalkan` (`DIBATALKAN` + `AUTO_CANCELLED`), dan `semua`.
- Pencarian nama/WhatsApp diterapkan di dalam filter.
- Total item dan total pembayaran terverifikasi diambil lewat scalar subquery agar join item dan pembayaran tidak saling menggandakan baris.

`getDashboardData(month)` mengembalikan:

- Jumlah aktif (`PENDING` + `DITERIMA` + `DITANGGUHKAN`).
- Empat kartu: PENDING, DITANGGUHKAN, DITERIMA, DIBATALKAN+AUTO_CANCELLED.
- Agenda DITERIMA dengan tanggal acara >= hari ini, urut menaik, beserta tanggal setup dari `date_lock`.
- Perlu tindak lanjut: reservasi PENDING, pembayaran `DICATAT`, dan reservasi `perlu_pemeriksaan_admin`.
- Reservasi terbaru.

Filter bulan memakai tanggal acara, bukan `created_at`. `sum()` Drizzle mengembalikan `string | null` (`node_modules/drizzle-orm/sql/functions/aggregate.d.ts:69`), jadi hasil dibaca sebagai angka dengan `Number(...)` dan nilai kosong menjadi 0.

**Alternatif ditolak:** menyimpan tabel ringkasan dashboard. Data berubah setiap aksi; query langsung lebih sederhana dan tidak menambah sinkronisasi.

### D5 - Server Action dan umpan balik galat

Aksi baru di `src/app/admin/reservasi/actions.ts`:

- `addReservationItem`
- `recordPayment`
- `verifyPayment`
- `invalidatePayment`
- `suspendReservation`
- `cancelReservation`

Semua memanggil `requireAdminSession()` paling awal. Validasi input memakai Zod. Domain error dan validasi dipetakan ke kode galat, lalu Server Action mengarahkan kembali ke detail dengan `?galat=<kode>`; halaman menampilkan pesan yang sesuai. `redirect` dan `revalidatePath` yang dipakai tersedia di `node_modules/next/dist/client/components/redirect.d.ts:17` dan `node_modules/next/dist/server/web/spec-extension/revalidate.d.ts:32`.

Setelah mutasi berhasil, revalidasi `/admin`, `/admin/reservasi`, dan detail reservasi. Tidak ada perubahan pada kalender publik karena change ini tidak menulis `date_lock`.

**Alternatif ditolak:** `useActionState` untuk tiap form. Pola redirect dengan kode galat lebih kecil, konsisten dengan Server Action admin yang sudah ada, dan tidak memerlukan komponen klien baru.

### D6 - UI admin

Daftar `/admin/reservasi`:

- Filter status: Diproses (default), Diterima, Dibatalkan, Semua.
- Pencarian nama/WhatsApp.
- Kolom: customer, tanggal acara, paket, total, status pembayaran, status reservasi, aksi Detail.

Detail `/admin/reservasi/[id]`:

- Ringkasan keuangan: total, DP minimum, terverifikasi, tercatat belum terverifikasi, sisa.
- Tabel item biaya dan form tambah item.
- Tabel pembayaran dengan status, waktu, alasan tidak valid, tombol verifikasi, dan form tandai tidak valid beralasan.
- Form penangguhan dan pembatalan hanya untuk status yang diizinkan; pembatalan memakai pilihan kode alasan.
- Form catatan tindak lanjut tersedia untuk PENDING dan DITANGGUHKAN.
- Riwayat status dan aktivitas memakai label baru.
- Banner galat dari `?galat=` memakai `role="alert"`.

Dashboard `/admin`:

- Filter bulan lewat `?bulan=YYYY-MM`, memakai `resolveMonth` yang sudah ada.
- Ringkasan jumlah aktif, stacked bar tiga status aktif, empat kartu status.
- Agenda mendatang, perlu tindak lanjut, dan reservasi terbaru.
- Keadaan kosong per widget; skeleton dan galat dipertahankan untuk tes tampilan.

### D7 - Keamanan dan batas modul

- Semua halaman admin tetap memanggil `requireAdminSession()`.
- Semua Server Action baru memanggil `requireAdminSession()` sebelum parsing atau menulis.
- Tidak ada route publik baru.
- Modul domain tidak mengimpor dari `src/app`.
- Pemindai statis yang ada harus tetap lulus.

## Risks / Trade-offs

- [Dua verifikasi bersamaan] → kunci baris reservasi dalam transaksi; uji dua transaksi berurutan pada PostgreSQL asli.
- [Total berubah setelah pembayaran terverifikasi] → status pembayaran diturunkan ulang; item hanya menambah total, dan verifikasi yang melebihi total ditolak.
- [Penanda perlu pemeriksaan tidak bisa dibersihkan di change ini] → penanda hanya untuk visibilitas; penghapusan penanda manual ditunda ke change yang menangani pemeriksaan.
- [Daftar admin berubah dari PENDING-only] → filter default tetap PENDING+DITANGGUHKAN, sehingga alur lama tidak berubah.
- [Query dashboard berat] → batasi agenda/reservasi terbaru, gunakan agregasi database, dan index tanggal/status bila diperlukan.

## Migration Plan

1. Perbarui skema Drizzle.
2. Jalankan `npm run db:generate`, periksa SQL migrasi, lalu `npm run db:migrate` pada database dev sesuai tugas.
3. Tes otomatis menjalankan migrasi pada database uji melalui harness yang ada.
4. Rollback lokal: kembalikan kode dan migrasi; tabel/kolom baru belum menyimpan data produksi.

Tidak ada backfill: kolom baru memiliki default, dan tabel pembayaran baru dimulai kosong.

## Referensi API terpasang

- `db.transaction` — `node_modules/drizzle-orm/pg-core/db.d.ts:281`
- `.for("update")` — `node_modules/drizzle-orm/pg-core/query-builders/select.d.ts:586`
- `sum()` — `node_modules/drizzle-orm/sql/functions/aggregate.d.ts:69`
- `redirect()` — `node_modules/next/dist/client/components/redirect.d.ts:17`
- `revalidatePath()` — `node_modules/next/dist/server/web/spec-extension/revalidate.d.ts:32`

## Open Questions

Tidak ada pertanyaan desain yang menahan implementasi. T-05 dan T-10 memakai default roadmap; T-01b tetap terbuka dan tidak memengaruhi change ini.
