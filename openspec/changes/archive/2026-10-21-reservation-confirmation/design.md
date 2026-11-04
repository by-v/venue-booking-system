# Design

## Context

Change ini dibangun di atas `reservation-processing` yang sudah menyediakan item biaya, pembayaran manual, status pembayaran turunan, penangguhan, pembatalan sebelum diterima, riwayat status, dan aktivitas. Reservasi `PENDING`/`DITANGGUHKAN` belum mengunci tanggal, belum memiliki nomor booking, dan customer masih `CALON`. Tabel `date_lock` sudah ada dengan primary key `date`, tetapi `reservation_id` belum memiliki foreign key.

Lihat `proposal.md` untuk motivasi dan batas scope. Perilaku yang harus dipenuhi ada di `specs/reservation-confirmation/spec.md` dan delta `specs/reservation-submission/spec.md`.

Batasan yang memengaruhi desain:

- Tanggal memakai WIB/Asia/Jakarta; uang berupa integer rupiah.
- Data bisnis tidak dihapus. Pembebasan tanggal oleh pembatalan menghapus baris operasional `date_lock`, bukan data reservasi/pembayaran/riwayat.
- Semua aksi tulis admin berada di balik `requireAdminSession()` pada Server Action.
- Konflik tanggal harus ditegakkan database, bukan hanya aplikasi.
- Test memakai PostgreSQL asli dan database uji terpisah.

## Goals / Non-Goals

**Goals:**

- Menambahkan model data nomor booking tahunan, `dp_forfeited`, dan FK `date_lock.reservation_id` tanpa mengubah data lama secara destruktif.
- Menjalankan konfirmasi atomik dengan urutan kunci yang konsisten dan pemetaan pelanggaran unik tanggal ke galat domain.
- Menyediakan query daftar bentrok yang tidak mengubah reservasi lain.
- Menyediakan pembatalan `DITERIMA` yang membebaskan seluruh tanggal dan mempertahankan nomor booking.
- Menampilkan nomor booking, syarat konfirmasi, daftar bentrok, dan pembatalan `DITERIMA` pada UI admin yang sudah ada.

**Non-Goals:**

- Tidak menambah layar, route publik, atau alur pembayaran baru.
- Tidak mengubah perilaku pembatalan `PENDING`/`DITANGGUHKAN` pada change 5a.
- Tidak menambahkan pembatalan pihak venue (T-07), eksekusi pembatalan karena pelunasan terlambat (T-01b), reschedule, `SELESAI`, auto-cancel, refund, atau bukti booking.
- Tidak menyimpan total, status pembayaran, atau daftar bentrok sebagai kolom turunan.
- Tidak menambahkan snapshot baru untuk `setup_days_before`; lihat D2 dan Risks.

## Decisions

### D1 - Model data dan constraint

Tambahkan di `src/lib/db/reservation-schema.ts`:

**Tabel `booking_counter`**

- `year` integer primary key.
- `last_sequence` integer not null default 0.
- `updated_at` timestamp default now not null.
- `booking_counter_year`: `year between 2000 and 9999`.
- `booking_counter_sequence`: `last_sequence >= 0`.

Satu baris per tahun. Baris pertama dibuat saat konfirmasi pertama tahun itu; baris berikutnya diperbarui dengan upsert atomik.

**Kolom `reservation.booking_number`**

- text nullable; unik melalui `reservation_booking_number_unique`.
- `reservation_booking_number_format`: `booking_number is null or booking_number ~ '^HADCC-[0-9]{4}-[0-9]{4,}$'`.
- `reservation_booking_number_required`: `status <> 'DITERIMA' or booking_number is not null`.
- Nullable + unique memungkinkan banyak reservasi belum dikonfirmasi. PostgreSQL memperlakukan NULL sebagai nilai berbeda pada unique constraint biasa, sehingga reservasi `PENDING` tidak saling bentrok.

**Kolom `reservation.dp_forfeited`**

- boolean not null default false.
- `reservation_dp_forfeited`: `not dp_forfeited or status = 'DIBATALKAN'`.

Kolom ini hanya menandai akibat pembatalan oleh customer. Nilai default `false` aman untuk seluruh baris lama.

**FK `date_lock.reservation_id`**

- `date_lock.reservation_id` tetap nullable dan sekarang mereferensikan `reservation.id` dengan `onDelete: "restrict"`.
- Tambahkan index `date_lock_reservation_id_idx` pada `reservation_id` untuk pembacaan/penghapusan kunci per reservasi.
- `null` tetap diizinkan untuk kunci manual lama, tetapi baris dengan `reservation_id` tidak null wajib menunjuk reservasi yang ada.

**Alternatif ditolak:** memakai PostgreSQL sequence global lalu menghitung nomor per tahun. Sequence tidak otomatis reset dan sulit dikaitkan dengan tahun WIB. Tabel counter per tahun lebih langsung dan bisa diuji.

**Alternatif ditolak:** kolom `cancellation_party` baru. Untuk change ini hanya pihak `CUSTOMER` yang didefinisikan, dan `reservation_status_history.reason_code = 'MUNDUR_CUSTOMER'` sudah mencatat pihak sekaligus alasan pada riwayat. Menambah kolom pihak akan menduplikasi informasi dan memperluas skema sebelum T-07 diputuskan.

### D2 - Nomor booking dan counter tahunan

Tambahkan modul murni `src/modules/reservation/booking-number.ts`:

- `bookingNumberYear(now = new Date())`: ambil empat digit tahun dari `todayInJakarta(now)`.
- `formatBookingNumber(year, sequence)`: `HADCC-${year}-${String(sequence).padStart(4, "0")}`.

Tahun memakai tahun konfirmasi WIB, bukan tahun tanggal acara. Urutan 1 menjadi `0001`; urutan 10000 menjadi `10000` karena `padStart` tidak memotong nilai yang lebih panjang.

Counter diperbarui di dalam transaksi konfirmasi dengan upsert:

```text
insert into booking_counter (year, last_sequence)
values (<tahun>, 1)
on conflict (year) do update
set last_sequence = booking_counter.last_sequence + 1,
    updated_at = now()
returning last_sequence
```

Nilai yang dikembalikan dipakai untuk membentuk nomor. Upsert mengunci baris counter sampai transaksi selesai, sehingga dua konfirmasi bersamaan pada tahun yang sama mendapat urutan berbeda. Jika transaksi konfirmasi gagal, kenaikan counter ikut rollback; urutan yang batal tidak pernah terbit dan boleh dipakai percobaan berikutnya. Nomor yang sudah commit tidak pernah dikurangi atau dipakai ulang, termasuk setelah pembatalan.

**Alternatif ditolak:** `max(booking_number)` untuk menentukan urutan berikutnya. Query itu tidak aman terhadap konfirmasi bersamaan dan tidak menangani tahun kosong dengan baik.

### D3 - Konfirmasi atomik

Tambahkan `confirmReservation(input: { reservationId, actorUserId }): Promise<{ bookingNumber }>` di `src/modules/reservation/mutations.ts`.

Perluas `lockReservation()` agar juga memuat `customerId`, `packageId`, dan `eventDate`. Pemanggil lama tetap memakai field yang sudah ada. Urutan transaksi:

1. `SELECT ... FOR UPDATE` pada baris reservasi.
2. Tolak bila status bukan `PENDING` atau `DITANGGUHKAN` dengan `INVALID_STATE`.
3. Hitung total dari harga paket snapshot + item biaya.
4. Hitung pembayaran `TERVERIFIKASI`; tolak dengan `DP_BELOW_MINIMUM` bila kurang dari `calculateMinimumDp(total)`.
5. Baca `packageTable.setupDaysBefore` milik paket reservasi. Bila paket tidak ada, lempar `PACKAGE_UNAVAILABLE` (FK `restrict` seharusnya mencegah kondisi ini).
6. Bentuk tanggal target dengan `lockDatesForEvent({ eventDate, setupDaysBefore })`.
7. Periksa `date_lock` pada seluruh tanggal target. Bila ada baris, lempar `DATE_CONFLICT`.
8. Sisipkan seluruh kunci `EVENT`/`SETUP` dalam satu operasi multi-baris.
9. Ambil urutan tahunan dari counter, bentuk nomor booking.
10. Ubah reservasi menjadi `DITERIMA` dan isi `booking_number` dalam satu `UPDATE`.
11. Ubah customer menjadi `CLIENT` (idempoten bila sudah `CLIENT`).
12. Sisipkan riwayat status `PENDING`/`DITANGGUHKAN` → `DITERIMA`, pelaku `ADMIN`, dengan alasan konfirmasi yang menjelaskan DP terverifikasi terpenuhi dan tanggal tersedia.
13. Sisipkan aktivitas `STATUS_CHANGE` yang memuat nomor booking.

Semua langkah berada dalam satu `db.transaction`. Kegagalan pada langkah mana pun membatalkan kunci tanggal, nomor booking, status, customer, riwayat, dan aktivitas dari percobaan itu.

Pemeriksaan langkah 7 adalah validasi ramah pengguna, bukan penegakan akhir. Dua konfirmasi bersamaan dapat sama-sama lolos pemeriksaan; primary key `date_lock.date` tetap menjadi penentu. Karena itu, pelanggaran unik pada `date_lock_pkey` dipetakan ke `DATE_CONFLICT`. Pelanggaran unik lain, termasuk booking number, tidak boleh disamarkan sebagai konflik tanggal dan dibiarkan sebagai kegagalan invarian.

**Alternatif ditolak:** memakai `SERIALIZABLE` untuk seluruh transaksi. Unique constraint `date_lock` sudah cukup, lebih sederhana, dan tidak menambah retry serialization. **Alternatif ditolak:** memasukkan kunci tanggal setelah nomor booking. Urutan tanggal lebih dulu memastikan konflik tanggal tidak menghabiskan nomor yang sudah commit; nomor yang batal tetap rollback, tetapi urutan ini lebih mudah diuji dan dipahami.

### D4 - Pemetaan pelanggaran unik

Tambahkan helper internal di modul mutasi, misalnya `isUniqueViolation(error, constraint)`. Helper menelusuri `cause` (Drizzle membungkus galat driver sebagai `DrizzleQueryError`) dan memeriksa `code === "23505"` serta `constraint` dari `DatabaseError` PostgreSQL. Hanya `date_lock_pkey` yang dipetakan ke `ReservationError("DATE_CONFLICT")` pada konfirmasi. Galat lain dilempar ulang.

Tambahkan kode domain:

- `DP_BELOW_MINIMUM`
- `DATE_CONFLICT`

Keduanya dipetakan Server Action ke pesan Indonesia pada halaman detail, bukan menampilkan detail database.

**Alternatif ditolak:** memetakan semua `23505` menjadi konflik tanggal. Itu akan menyembunyikan bug nomor booking ganda atau pelanggaran unik lain dan membuat diagnosis salah.

### D5 - Daftar reservasi bentrok

Tambahkan `getReservationConfirmationContext(id)` di `src/modules/reservation/queries.ts`. Fungsi mengembalikan:

- `lockDates`: tanggal `EVENT` dan `SETUP` yang akan dikunci, hasil `lockDatesForEvent`.
- `hasDateConflict`: benar bila salah satu tanggal target sudah ada di `date_lock`.
- `conflicts`: reservasi lain yang relevan, berisi id, nama/WhatsApp customer, tanggal acara, status, total pembayaran `DICATAT`, total pembayaran `TERVERIFIKASI`, dan tanggal target yang ditempatinya (bila ada).

Sumber daftar bentrok:

1. Baris `date_lock` pada tanggal target yang dimiliki reservasi lain. Ini menangkap konflik tanggal acara maupun setup, termasuk reservasi `DITERIMA`.
2. Reservasi lain dengan `event_date` sama, status `PENDING`/`DITANGGUHKAN`/`DITERIMA`, dan sedikitnya satu pembayaran `DICATAT` atau `TERVERIFIKASI`. Ini memenuhi BR-04 agar admin dapat menilai urutan pembayaran meskipun reservasi lain belum mengunci tanggal.

Hasil dua sumber digabung berdasarkan `reservation.id`; tanggal yang ditempati digabung. Reservasi tanpa pembayaran yang tidak mengunci tanggal target tidak ditampilkan. Reservasi final (`DIBATALKAN`, `AUTO_CANCELLED`, `SELESAI`) tidak ditampilkan sebagai calon bentrok. Kunci manual tanpa `reservation_id` tetap membuat `hasDateConflict` benar meskipun tidak ada baris reservasi yang bisa ditampilkan; UI harus menjelaskan bahwa tanggal sudah terkunci. Query tidak menulis atau mengubah status reservasi lain.

**Alternatif ditolak:** hanya memakai `date_lock`. Reservasi `PENDING` belum mengunci, sehingga daftar tidak akan menunjukkan bentrok pembayaran yang justru diminta BR-04. **Alternatif ditolak:** hanya memakai `event_date` yang sama. Konflik tanggal setup dapat terjadi tanpa tanggal acara yang sama.

### D6 - Pembatalan reservasi DITERIMA

Tambahkan `cancelAcceptedReservation(input: { reservationId, reason, reasonCode, actorUserId })` di modul mutasi. Skema input hanya menerima `reasonCode = "MUNDUR_CUSTOMER"` dan alasan wajib; ini merepresentasikan pihak `CUSTOMER` yang saat ini didefinisikan. `DITOLAK_VENUE` tetap dipakai oleh aksi pembatalan sebelum diterima dan tidak tersedia untuk aksi ini.

Urutan transaksi:

1. `SELECT ... FOR UPDATE` pada reservasi.
2. Tolak bila status bukan `DITERIMA` dengan `INVALID_STATE`.
3. Hapus seluruh `date_lock` dengan `reservation_id` reservasi ini.
4. Ubah reservasi menjadi `DIBATALKAN` dan `dp_forfeited = true` dalam satu `UPDATE`.
5. Sisipkan riwayat status `DITERIMA` → `DIBATALKAN` dengan `reason_code = 'MUNDUR_CUSTOMER'` dan alasan.
6. Sisipkan aktivitas `STATUS_CHANGE` yang menyebut pembatalan oleh customer dan DP hangus.

Nomor booking tidak diubah. Customer tetap `CLIENT`. Bila reservasi sudah tidak memiliki kunci karena data lama, penghapusan nol baris tetap valid dan pembatalan tetap mencatat status.

**Alternatif ditolak:** memperluas `cancelReservation` 5a agar menerima `DITERIMA`. Aksi lama memiliki aturan pihak/kode alasan yang berbeda dan dipakai untuk status sebelum diterima; memisahkan fungsi menjaga perilaku 5a tetap stabil.

### D7 - Query daftar dan detail

`listReservations`:

- Tambah `reservation.booking_number` ke select dan `ReservationListItem`.
- Perluas `searchCondition` dengan `ilike(reservation.booking_number, ...)` memakai `escapeLike` yang sudah ada. Pencarian nomor booking berlaku di dalam filter status yang sedang dipilih.
- Placeholder UI menjadi “Nama, nomor WhatsApp, atau nomor booking”.
- Nomor booking ditampilkan di bawah nama customer pada tabel agar tidak menambah lebar kolom.

`getReservationDetail`:

- Tambah `bookingNumber` dan `dpForfeited` ke `ReservationDetail`.
- Tidak mengubah perhitungan keuangan yang sudah ada.
- `getDashboardData` tetap memakai `ReservationListItem`; field baru tidak wajib ditampilkan di dashboard.

**Alternatif ditolak:** membuat query pencarian terpisah. Pencarian harus tetap bekerja bersama filter status dan filter bulan; memperluas kondisi yang ada lebih kecil risikonya.

### D8 - Server Action dan revalidasi

Tambahkan Server Action di `src/app/admin/reservasi/actions.ts`:

- `confirmReservation(formData)`
- `cancelAcceptedReservation(formData)`

Keduanya memanggil `requireAdminSession()` paling awal, memvalidasi Zod, memanggil mutasi domain, dan memakai pola `?galat=` yang sudah ada. `confirmReservation` mengabaikan nilai kembali nomor booking karena halaman detail akan membaca data terbaru.

Perluas `runReservationAction` dengan opsi revalidasi ketersediaan. Untuk konfirmasi dan pembatalan `DITERIMA`, revalidasi:

- `/admin`
- `/admin/reservasi`
- `/admin/reservasi/[id]`
- `/admin/kalender`
- `/reservasi`

Aksi keuangan/penangguhan lama tetap memakai revalidasi admin yang sudah ada. API `/api/ketersediaan` membaca database per permintaan dan tidak memerlukan revalidasi path.

**Alternatif ditolak:** selalu merevalidasi halaman publik pada setiap aksi pembayaran. Itu tidak perlu karena pembayaran tidak mengubah ketersediaan tanggal.

### D9 - UI admin

`/admin/reservasi`:

- Tetap memakai filter dan tabel saat ini.
- Nama customer diikuti nomor booking monospace bila sudah terbit.
- Placeholder pencarian diperbarui.
- Tidak menambah statistik atau widget.

`/admin/reservasi/[id]`:

- Header menampilkan nomor booking bila ada.
- Badge “DP hangus” ditampilkan bila `dp_forfeited` benar.
- Untuk `PENDING`/`DITANGGUHKAN`, tampilkan kartu “Konfirmasi reservasi” yang memuat:
  - tanggal acara dan tanggal setup target;
  - DP minimum dan pembayaran terverifikasi dari ringkasan keuangan;
  - daftar bentrok dari `getReservationConfirmationContext`;
  - penjelasan bila DP belum terpenuhi atau tanggal bentrok, termasuk pesan khusus bila `hasDateConflict` benar tetapi daftar reservasi kosong karena kunci manual;
  - tombol konfirmasi yang dinonaktifkan bila syarat tampilan belum terpenuhi.
- Tombol dinonaktifkan hanya bantuan UI. Mutasi tetap memeriksa ulang seluruh syarat.
- Untuk `DITERIMA`, tampilkan form pembatalan di kartu “Tindakan status”: pihak “Customer” sebagai teks tetap, alasan wajib, dan tombol “Batalkan dan tandai DP hangus”. Kode alasan dikirim sebagai input tersembunyi `MUNDUR_CUSTOMER`.
- Form pembatalan 5a untuk `PENDING`/`DITANGGUHKAN` tidak diubah.
- Status akhir tidak menampilkan form konfirmasi atau pembatalan `DITERIMA`.

**Alternatif ditolak:** dialog/modal konfirmasi baru. UI spec tidak meminta modal, dan pola form Server Action yang ada sudah cukup.

### D10 - Keamanan dan batas domain

- Semua query/mutasi baru berada di `src/modules/reservation/`; tidak mengimpor `src/app`.
- Semua aksi tulis admin memakai `requireAdminSession()` di Server Action.
- Tidak ada route publik baru.
- Pemindai statis admin dan batas modul harus tetap lulus.
- Alasan pembatalan dan pesan galat tidak membocorkan detail database.

## Risks / Trade-offs

- [Tanggal setup memakai konfigurasi paket saat konfirmasi, bukan snapshot] → UI konfirmasi menampilkan tanggal setup target sebelum tombol dijalankan; konfigurasi paket adalah sumber aturan BR-18. Bila venue mengubah setup setelah pengajuan, admin melihat tanggal yang akan dikunci. Snapshot setup dapat ditambahkan pada change mendatang bila diperlukan.
- [Counter tahunan menjadi baris panas saat banyak konfirmasi bersamaan] → satu venue dengan volume rendah; upsert singkat dan hanya terjadi saat konfirmasi. Alternatif sequence global tidak menyelesaikan reset tahunan.
- [Pemeriksaan tanggal di aplikasi bisa basi] → primary key `date_lock.date` adalah penegakan akhir; pelanggaran `date_lock_pkey` dipetakan ke `DATE_CONFLICT` dan seluruh transaksi rollback.
- [Constraint `DITERIMA` wajib bernomor dapat gagal pada data lama] → lakukan preflight sebelum migrasi; bila ada baris `DITERIMA` tanpa nomor, hentikan apply dan laporkan, jangan mengarang nomor.
- [FK `date_lock.reservation_id` dapat gagal pada baris yatim] → preflight baris `reservation_id` yang tidak punya pasangan; hentikan apply bila ada, jangan menghapus data otomatis.
- [Pihak pembatal hanya direpresentasikan lewat `reason_code`] → hanya `CUSTOMER` yang didefinisikan; T-07 tetap terbuka. Jika venue nanti dapat membatalkan, change tersebut harus menambah representasi pihak yang eksplisit.
- [Pencarian nomor booking memakai `ILIKE` tanpa index] → volume data penelitian kecil; index dapat ditambahkan bila query melambat.
- [Nomor urut yang batal karena rollback dapat dipakai lagi] → nomor tersebut tidak pernah terbit; larangan pakai ulang berlaku untuk nomor yang sudah commit.
- [UI menonaktifkan tombol tetapi status berubah di tab lain] → Server Action tetap memeriksa status, DP, dan tanggal; UI bukan penegak aturan.

## Migration Plan

1. Perbarui skema Drizzle: `booking_counter`, kolom `booking_number`/`dp_forfeited`, constraint baru, FK dan index `date_lock`.
2. Sebelum migrasi, jalankan preflight pada database dev dan uji:
   - `date_lock` dengan `reservation_id` tidak null yang tidak punya baris `reservation`;
   - `reservation` berstatus `DITERIMA` dengan `booking_number` null.
   Bila ada hasil, hentikan apply dan laporkan; jangan backfill nomor atau menghapus baris otomatis.
3. Jalankan `npm run db:generate`, periksa SQL `0006_*.sql` memuat seluruh tabel/kolom/constraint/FK/index yang dimaksud dan tidak mengubah kolom lain.
4. Jalankan `npm run db:migrate` dua kali pada database dev; kedua eksekusi harus sukses.
5. Test otomatis menjalankan migrasi pada database uji melalui harness yang ada.
6. Rollback lokal: kembalikan kode dan migrasi, lalu pada database dev lepaskan FK/index, hapus kolom `booking_number`/`dp_forfeited`, dan hapus tabel `booking_counter`; ambil backup lebih dulu bila sudah ada nomor booking. Tidak ada deployment produksi pada konteks penelitian ini.
7. Tidak ada backfill nomor booking. Nomor hanya terbit melalui konfirmasi baru.

## Referensi API terpasang

- `db.transaction` — `node_modules/drizzle-orm/pg-core/db.d.ts`
- `.for("update")` — `node_modules/drizzle-orm/pg-core/query-builders/select.d.ts`
- `.onConflictDoUpdate()` dan `.returning()` — `node_modules/drizzle-orm/pg-core/query-builders/insert.d.ts`
- `inArray()` — `node_modules/drizzle-orm/sql/expressions/conditions.d.ts`
- `check()` — `node_modules/drizzle-orm/pg-core/checks.d.ts`
- `unique()` — `node_modules/drizzle-orm/pg-core/unique-constraint.d.ts`
- `.delete()` — `node_modules/drizzle-orm/pg-core/query-builders/delete.d.ts`
- `DrizzleQueryError.cause` — `node_modules/drizzle-orm/errors.d.ts`
- `DatabaseError.code` dan `DatabaseError.constraint` — `node_modules/pg-protocol/dist/messages.d.ts`
- `redirect()` — `node_modules/next/dist/client/components/redirect.d.ts`
- `revalidatePath()` — `node_modules/next/dist/server/web/spec-extension/revalidate.d.ts`

## Open Questions

Tidak ada pertanyaan desain yang menahan implementasi. T-07 (pembatalan venue) dan T-01b (eksekusi pembatalan karena pelunasan terlambat) tetap terbuka dan berada di luar scope change ini.
