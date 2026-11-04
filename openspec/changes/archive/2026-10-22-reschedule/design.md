# Design

## Context

Change ini dibangun di atas `reservation-confirmation` (lihat `proposal.md`). Saat ini `reservation` sudah memiliki `event_date`, `booking_number`, `status`, dan `reschedule_count` belum ada. `date_lock` menyimpan satu baris per tanggal dengan primary key `date`, sehingga perpindahan tanggal harus dilakukan dengan hati-hati agar tidak melanggar keunikan atau meninggalkan kunci parsial. Detail reservasi admin sudah memiliki pola Server Action, transaksi, dan kartu tindakan pada `src/app/admin/reservasi/[id]/page.tsx`.

Batasan yang memengaruhi desain:

- BR-15: hanya `DITERIMA`, maksimal satu kali, batas satu bulan kalender, tanggal baru dan setup tersedia, atomik, nomor booking tetap.
- BR-20: `reschedule_count` bernilai 0 atau 1.
- BR-24 dan BR-17a: setiap perubahan harus tercatat pada riwayat status dan aktivitas substantif.
- BR-18 (PROVISIONAL): tanggal setup paket ikut diperiksa dan dipindahkan; default roadmap **ya**.
- D2: transaksi interaktif PostgreSQL melalui Drizzle.
- Waktu memakai WIB; tanggal disimpan sebagai string `YYYY-MM-DD`.

## Goals / Non-Goals

**Goals:**

- Menyediakan mutasi reschedule yang atomik dan aman terhadap permintaan bersamaan.
- Menyimpan jatah reschedule dan riwayat reschedule tanpa menghapus data lama.
- Menyediakan aksi admin pada detail reservasi yang sudah ada.
- Menjaga status `DITERIMA` dan nomor booking tetap.
- Menutup US-080 tanpa menambah dependensi baru.

**Non-Goals:**

- Form reschedule publik atau reschedule oleh customer.
- Perubahan paket, harga, item biaya, pembayaran, atau jenis acara.
- Halaman baru, notifikasi otomatis, auto-cancel, dan penandaan `SELESAI`.
- Menampilkan `payment_due_date`; nilai turunan itu baru ditampilkan pada change `payment-deadline`.
- Perubahan aturan ketersediaan atau blokir tanggal manual (T-08).

## Decisions

### D1 - Skema: jatah dan riwayat reschedule

Tambahkan pada `src/lib/db/reservation-schema.ts`:

- `reservation.reschedule_count` integer, `not null`, default `0`, dengan check `reschedule_count between 0 and 1`.
- Tabel `reschedule_history`:
  - `id` text primary key;
  - `reservation_id` text not null, FK ke `reservation.id` dengan `onDelete: "restrict"`;
  - `old_event_date` date not null;
  - `new_event_date` date not null;
  - `actor_user_id` text, FK ke `user.id` dengan `onDelete: "set null"`;
  - `created_at` timestamp default now not null;
  - unique `reservation_id` untuk menegakkan maksimal satu riwayat per reservasi;
  - check `old_event_date <> new_event_date`.

`reschedule_count` dipakai sebagai guard cepat dan untuk tampilan; unique `reservation_id` pada riwayat menjadi penegak terakhir maksimal satu kali di level database. Keduanya konsisten karena hanya mutasi reschedule yang menulis nilai tersebut. Alternatif hanya memakai hitungan baris riwayat ditolak karena UI dan spec membutuhkan jatah yang eksplisit (BR-20).

Migrasi dibuat dengan `npm run db:generate` dan diberi nomor urut berikutnya (saat ini `0007`). Tidak ada backfill: baris lama otomatis mendapat `reschedule_count = 0`.

### D2 - Fungsi tanggal murni

Tambahkan fungsi murni di `src/modules/availability/dates.ts`:

- `subtractOneCalendarMonth(dateString: string): string` — mengurangi satu bulan kalender dengan aturan: bila hari tidak ada pada bulan tujuan, pakai hari terakhir bulan tersebut. Contoh: `2026-03-31` → `2026-02-28`; `2028-03-31` → `2028-02-29`.
- Fungsi ini memakai `Date.UTC` seperti helper tanggal yang sudah ada, tanpa pustaka tanggal baru.

Tambahkan aturan domain di `src/modules/reservation/reschedule.ts`:

- `rescheduleDeadline(eventDate: string): string` — memanggil `subtractOneCalendarMonth`.
- `isRescheduleDeadlinePassed({ eventDate, today }): boolean` — `today > deadline`, sehingga tanggal batas masih diterima.
- `canReschedule({ status, rescheduleCount, eventDate, today }): boolean` — hanya `DITERIMA`, `rescheduleCount < 1`, dan belum melewati batas.

Aturan bulan kalender memakai konvensi yang sama dengan BR-17 untuk tanggal yang tidak ada pada bulan tujuan. Ini adalah rincian FINAL-DEFAULT BR-15 dan dicatat sebagai asumsi.

### D3 - Mutasi reschedule atomik

Tambahkan di `src/modules/reservation/mutations.ts`:

```text
rescheduleReservation({
  reservationId: string,
  newEventDate: string,
  actorUserId: string
}): Promise<void>
```

Alur di dalam `db.transaction`:

1. `lockReservation(tx, reservationId)` yang sudah memakai `.for("update")`; tambahkan `reschedule_count` pada select dan nilai kembalian.
2. Tolak bila status bukan `DITERIMA` (`INVALID_STATE`).
3. Tolak bila `rescheduleCount >= 1` (`RESCHEDULE_LIMIT_REACHED`).
4. Hitung `today = todayInJakarta()` dan `deadline = rescheduleDeadline(locked.eventDate)`; tolak bila `today > deadline` (`RESCHEDULE_DEADLINE_PASSED`).
5. Tolak bila `newEventDate` bukan tanggal setelah hari ini atau sama dengan tanggal lama (`DATE_NOT_BOOKABLE`).
6. Ambil `setupDaysBefore` paket; bila paket tidak ditemukan (`PACKAGE_UNAVAILABLE`).
7. Hitung `lockDatesForEvent({ eventDate: newEventDate, setupDaysBefore })`.
8. Periksa `date_lock` pada tanggal-tanggal baru, mengecualikan baris milik reservasi ini; bila ada baris lain atau kunci manual (`reservation_id is null`), tolak `DATE_CONFLICT`.
9. Hapus seluruh `date_lock` milik reservasi ini.
10. Insert kunci baru; tangkap unique violation `date_lock_pkey` sebagai `DATE_CONFLICT`.
11. Update `reservation` dengan `event_date = newEventDate` dan `reschedule_count = 1`.
12. Insert `reschedule_history` berisi tanggal lama, tanggal baru, pelaku, dan waktu.
13. Insert `reservation_status_history` dari `DITERIMA` ke `DITERIMA` dengan alasan reschedule dan pelaku admin.
14. Insert `reservation_activity` bertipe `STATUS_CHANGE` dengan catatan reschedule, pelaku admin, dan `isSubstantive = true`.

Semua langkah berada dalam satu transaksi; kegagalan pada salah satu langkah membatalkan seluruh perubahan. Row lock pada langkah 1 membuat dua permintaan reschedule bersamaan berjalan berurutan; permintaan kedua melihat `reschedule_count = 1` dan ditolak. Unique `date_lock.date` tetap menjadi penjaga terakhir bila reservasi lain mengambil tanggal baru di antara pemeriksaan dan insert.

Alternatif memakai dua transaksi (bebaskan dulu, lalu kunci baru) ditolak karena dapat meninggalkan reservasi tanpa kunci tanggal bila langkah kedua gagal.

### D4 - Skema input dan Server Action

Tambahkan `reservationRescheduleSchema` di `src/modules/reservation/schema.ts`:

- `reservationId` string minimal 1;
- `newEventDate` string dengan format `YYYY-MM-DD` dan validasi tanggal nyata, memakai pola yang sudah ada pada `reservationSubmissionSchema`.

Tambahkan `rescheduleReservation(formData)` di `src/app/admin/reservasi/actions.ts`:

1. `requireAdminSession()` sebelum parsing.
2. Parse dengan `reservationRescheduleSchema`.
3. Panggil mutasi dengan `actorUserId: session.user.id`.
4. Gunakan `runReservationAction` yang sudah ada dengan `revalidateAvailability: true` agar `/admin`, `/admin/reservasi`, detail, `/admin/kalender`, dan `/reservasi` diperbarui.
5. Petakan `ReservationError` dan `ZodError` ke `?galat=` yang sudah ada.

Tambahkan dua kode galat di `src/modules/reservation/errors.ts`:

- `RESCHEDULE_LIMIT_REACHED`
- `RESCHEDULE_DEADLINE_PASSED`

Pesan Indonesia ditambahkan pada `ERROR_MESSAGES` di halaman detail. `DATE_CONFLICT`, `DATE_NOT_BOOKABLE`, dan `INVALID_STATE` memakai pesan yang sudah ada.

### D5 - Detail reservasi admin

`getReservationDetail` di `src/modules/reservation/queries.ts` menambahkan `rescheduleCount` pada select dan tipe `ReservationDetail`.

Pada `src/app/admin/reservasi/[id]/page.tsx`:

- Hitung `canReschedule = reservation.status === "DITERIMA"`.
- Hitung `deadline = rescheduleDeadline(reservation.eventDate)` dan `deadlinePassed = isRescheduleDeadlinePassed(...)`.
- Tampilkan kartu **Reschedule** untuk reservasi `DITERIMA`:
  - tanggal acara saat ini;
  - batas permintaan (tanggal deadline);
  - sisa jatah (1 atau 0);
  - form `Input type="date"` bernama `newEventDate` dan tombol "Pindahkan tanggal" bila jatah masih ada dan batas belum lewat;
  - pesan "Reschedule sudah digunakan" bila jatah habis;
  - pesan "Batas reschedule sudah lewat" bila deadline lewat.
- Form tidak ditampilkan untuk status selain `DITERIMA`.
- Tidak ada halaman baru; ini penyesuaian pada layar Reservasi yang sudah ada.

`docs/design/ui-spec.md` belum memuat aksi reschedule. Sesuai prinsip "aturan sistem menang atas desain", form ditempatkan pada detail reservasi yang sudah ada karena BR-15 membutuhkan sarana eksekusi admin. Penempatan ini dicatat sebagai asumsi dan akan diperiksa pada review browser.

### D6 - Pengujian

- `tests/reservation-reschedule-dates.test.ts`: batas satu bulan kalender, akhir bulan, tahun kabisat, batas inklusif, dan `canReschedule`.
- `tests/reservation-reschedule-mutations.test.ts` terhadap PostgreSQL asli:
  - berhasil memindahkan kunci lama ke kunci baru;
  - status tetap `DITERIMA`, nomor booking tetap, `reschedule_count = 1`;
  - riwayat reschedule, riwayat status, dan aktivitas tercatat;
  - status selain `DITERIMA` ditolak;
  - reschedule kedua ditolak;
  - melewati batas ditolak dan jatah tetap 0;
  - tanggal baru terkunci ditolak dan kunci lama tetap;
  - tanggal baru lewat/sama ditolak;
  - kegagalan tidak menyisakan kunci parsial.
- `tests/reservation-reschedule-concurrency.test.ts`: dua reschedule bersamaan, tepat satu berhasil.
- `tests/reservation-reschedule-schema.test.ts`: validasi input dan bentuk data.
- `tests/reservation-schema.test.ts` atau tes skema terkait: check `reschedule_count`, unique `reservation_id`, FK, dan check tanggal lama berbeda.
- `tests/admin-actions-unauthorized.test.ts`: aksi reschedule tanpa sesi dialihkan ke login.
- `tests/admin-reservation.test.tsx`: kartu reschedule tampil hanya untuk `DITERIMA`, form dan pesan jatah/batas tampil sesuai kondisi.
- `tests/static-scanner.test.ts` dan `tests/module-boundary.test.ts` tetap lulus.

## Risks / Trade-offs

- [Dua admin melakukan reschedule bersamaan] → Row lock reservasi dan pengecekan `reschedule_count` di dalam transaksi; unique riwayat menjadi penjaga tambahan.
- [Reservasi lain mengambil tanggal baru setelah pemeriksaan] → Insert kunci baru menangkap unique violation `date_lock_pkey` dan memetakannya ke `DATE_CONFLICT`.
- [Tanggal baru beririsan dengan tanggal lama] → Pemeriksaan konflik mengecualikan kunci milik reservasi sendiri, lalu kunci lama dihapus sebelum kunci baru dimasukkan.
- [Batas akhir bulan ambigu] → Memakai aturan hari terakhir bulan tujuan seperti BR-17; dicatat sebagai rincian FINAL-DEFAULT.
- [UI belum ada di ui-spec] → Form ditempatkan pada detail reservasi yang ada, tanpa layar baru; perubahan hanya pada lokasi tampilan, bukan perilaku domain.
- [Jatah dan riwayat tidak sinkron] → Keduanya ditulis dalam transaksi yang sama; unique `reservation_id` mencegah dua riwayat.

## Migration Plan

1. Ubah `reservation-schema.ts`, lalu jalankan `npm run db:generate` untuk membuat migrasi `0008_*.sql`.
2. Periksa migrasi: hanya menambah kolom `reschedule_count` dengan default 0, check 0/1, tabel `reschedule_history`, FK, unique, dan check tanggal.
3. Jalankan `npm run db:migrate` dua kali untuk memastikan idempoten.
4. Tidak ada backfill manual; reservasi lama otomatis bernilai 0.
5. Rollback (bila diperlukan di lingkungan pengembangan): hapus tabel `reschedule_history` lalu kolom `reschedule_count`; tidak ada data bisnis yang dihapus.

## Referensi API terpasang

- `db.transaction`, `.for("update")`, `.insert`, `.update`, `.delete`, dan `isUniqueViolation` — sudah dipakai di `src/modules/reservation/mutations.ts` (`confirmReservation`, `cancelAcceptedReservation`).
- `lockDatesForEvent`, `addDays`, `isBookableDate`, `todayInJakarta` — `src/modules/availability/dates.ts`.
- `date`, `integer`, `check`, `unique`, `index`, `references` — `src/lib/db/reservation-schema.ts` dan `src/lib/db/date-lock-schema.ts`.
- `requireAdminSession` dan `runReservationAction` — `src/app/admin/reservasi/actions.ts`.
- `getReservationDetail` dan tipe `ReservationDetail` — `src/modules/reservation/queries.ts` dan `src/modules/reservation/types.ts`.

## Open Questions

- Penempatan form reschedule pada detail reservasi admin belum tercantum di `docs/design/ui-spec.md`. Bila pemilik proyek menghendaki layar terpisah, yang berubah hanya D5 dan tugas UI; perilaku domain, spec, dan migrasi tidak berubah.
