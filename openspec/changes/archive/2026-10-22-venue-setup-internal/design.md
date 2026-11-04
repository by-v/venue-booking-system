# Design

## Context

Lihat `proposal.md` untuk motivasi. Saat ini detail reservasi admin sudah memuat data reservasi, pembayaran, tindakan status, reschedule, dan catatan tindak lanjut di `src/app/admin/reservasi/[id]/page.tsx`. Catatan tindak lanjut disimpan sebagai `reservation_activity` dan hanya berlaku untuk `PENDING`/`DITANGGUHKAN`; catatan setup tidak boleh memakai jalur itu karena bersifat operasional, bukan aktivitas reservasi.

Tabel domain reservasi didefinisikan di `src/lib/db/reservation-schema.ts` dan diekspor melalui `src/lib/db/schema.ts`. Mutasi memakai transaksi Drizzle dan penguncian baris reservasi, seperti `src/modules/reservation/mutations.ts`. Server Action admin memakai `requireAdminSession` dan pola `runReservationAction` di `src/app/admin/reservasi/actions.ts`.

Batasan yang memengaruhi desain:

- T-14 (PROVISIONAL): satu catatan teks setup per reservasi, hanya admin.
- US-100: catatan tidak boleh ada di endpoint publik.
- BR-02, BR-03, BR-18 (PROVISIONAL): hari setup tetap ditentukan paket dan `date_lock`; catatan setup bukan hari setup.
- BR-17a: proses yang tidak substantif tidak boleh menggeser batas auto-cancel.
- D2: PostgreSQL dengan transaksi interaktif melalui Drizzle.
- Konvensi data: tidak ada penghapusan data bisnis; waktu memakai WIB untuk aturan tanggal.

## Goals / Non-Goals

**Goals:**

- Menyimpan tepat satu catatan setup per reservasi dengan batas panjang yang jelas.
- Menyediakan create/update catatan dari detail reservasi admin tanpa layar baru.
- Menjaga catatan tetap internal dan tidak mengubah status, kunci tanggal, pembayaran, atau ketersediaan.
- Menyediakan constraint database untuk keunikan dan validitas isi.
- Menutup US-100 dengan perubahan kecil dan tanpa dependensi baru.

**Non-Goals:**

- Banyak catatan, riwayat versi, atau lampiran.
- Catatan setup yang terlihat customer.
- Perubahan setup paket, ketersediaan, auto-cancel, dan status reservasi.
- Widget dashboard atau halaman admin baru.
- Menambah tipe aktivitas reservasi baru.

## Decisions

### D1 - Tabel `setup_note`

Tambahkan tabel baru di `src/lib/db/reservation-schema.ts`:

- `id` text primary key.
- `reservation_id` text not null, FK ke `reservation.id` dengan `onDelete: "restrict"`.
- `note` text not null.
- `updated_by_user_id` text, FK ke `user.id` dengan `onDelete: "set null"`.
- `created_at` timestamp default now not null.
- `updated_at` timestamp default now not null, diperbarui oleh aplikasi saat catatan diubah.
- Constraint unik `setup_note_reservation_unique` pada `reservation_id`.
- Constraint check `setup_note_length`: `char_length(note) between 1 and 1000`.

Satu baris per reservasi dipilih karena T-14 secara eksplisit meminta satu catatan. Alternatif tabel banyak baris ditolak karena akan menambah konsep riwayat yang tidak diminta. `reservation_id` unik menjadi penegak terakhir di database, bukan hanya validasi aplikasi.

Tidak ada backfill. Reservasi lama otomatis tidak memiliki catatan.

### D2 - Mutasi domain

Tambahkan `saveSetupNote` di `src/modules/reservation/mutations.ts` dengan input `reservationId`, `note`, dan `actorUserId`. Alur:

1. Mulai transaksi.
2. Kunci baris reservasi dengan pola `lockReservation` yang sudah ada, sehingga dua penyimpanan bersamaan tidak membuat dua baris.
3. Pastikan reservasi ada.
4. Cari baris `setup_note` berdasarkan `reservation_id`.
5. Jika belum ada, insert; jika sudah ada, update teks, `updated_by_user_id`, dan `updated_at`.
6. Commit.

Implementasi memakai insert/update eksplisit, bukan upsert, agar alur mudah dibaca dan tetap berada dalam transaksi yang sama dengan penguncian reservasi. Unique constraint tetap melindungi dari balapan di luar alur normal.

Mutasi SHALL NOT menulis `reservation_activity`, `reservation_status_history`, `date_lock`, atau `payment`. Dengan demikian catatan tidak dihitung sebagai aktivitas substantif dan tidak menggeser batas auto-cancel.

### D3 - Validasi input

Tambahkan `setupNoteInputSchema` di `src/modules/reservation/schema.ts`:

- `reservationId`: string tidak kosong setelah trim.
- `note`: string, trim, minimal 1 karakter, maksimal 1.000 karakter.

Teks kosong ditolak. Tidak ada aksi hapus terpisah; admin dapat mengganti isi catatan dengan teks baru. Batas 1.000 karakter disamakan dengan catatan tindak lanjut dan divalidasi juga oleh constraint database.

### D4 - Otorisasi dan Server Action

Tambahkan Server Action `saveSetupNote` di `src/app/admin/reservasi/actions.ts`:

- Panggil `requireAdminSession` sebelum parsing atau mutasi.
- Parse input dengan `setupNoteInputSchema`.
- Jalankan mutasi dengan `actorUserId` dari sesi.
- Gunakan `runReservationAction` agar galat domain/Zod diarahkan ke detail reservasi dan halaman detail di-revalidate.
- Tidak me-revalidate ketersediaan karena catatan tidak memengaruhi kalender.

Pengguna tanpa sesi dialihkan ke `/login` oleh `requireAdminSession`, mengikuti pola aksi admin yang sudah ada.

### D5 - Query detail dan tampilan

Perluas `getReservationDetail` di `src/modules/reservation/queries.ts` agar memuat `setupNote` dari tabel baru. Query publik yang sudah ada tidak diubah dan tidak boleh membaca `setup_note`.

Pada `src/app/admin/reservasi/[id]/page.tsx`, tambahkan kartu “Catatan setup”:

- Menampilkan teks catatan jika ada.
- Menampilkan keadaan kosong jika belum ada.
- Menampilkan `Textarea` dengan nilai awal catatan dan `maxLength={1000}`.
- Tombol “Simpan catatan setup”.
- Keterangan bahwa catatan hanya terlihat admin dan tidak mengubah status, jadwal, pembayaran, atau timer auto-cancel.

Kartu ditempatkan pada halaman detail yang sudah ada; tidak ada menu atau layar baru. Form tersedia untuk semua status reservasi karena brief tidak membatasi status dan catatan bersifat operasional. Asumsi ini dicatat sebagai keputusan PROVISIONAL dan dapat dipersempit saat review.

### D6 - Pencegahan kebocoran ke publik

`setup_note` hanya dibaca oleh `getReservationDetail`, yang dipakai halaman admin. Tidak ada route API baru. Halaman publik, `/api/ketersediaan`, cek status, dan Bukti Booking tetap memakai query masing-masing dan tidak diubah.

Tes kebocoran dilakukan pada respons route publik dan query yang dipakai halaman publik. Jika di masa depan ada kebutuhan menampilkan catatan, itu harus menjadi requirement baru, bukan perubahan diam-diam.

### D7 - Migrasi dan pengujian

Migrasi dibuat dengan `npm run db:generate`; nomor berikutnya saat ini adalah `0010`. Periksa SQL yang dihasilkan: hanya `CREATE TABLE setup_note`, constraint, dan index/unique yang terkait. Tidak ada perubahan pada tabel lama.

Pengujian utama:

- Schema: unique per reservasi, check panjang, FK, dan perilaku update.
- Mutasi: create, update mengganti teks, penolakan reservasi tidak ada, status/kunci/pembayaran tidak berubah, tidak ada aktivitas substantif.
- Otorisasi: Server Action tanpa sesi dialihkan ke `/login`.
- Publik: respons ketersediaan, cek status, dan Bukti Booking tidak memuat teks catatan.
- UI: kartu tampil, keadaan kosong, dan setelah penyimpanan menampilkan teks baru.

## Risks / Trade-offs

- **[Catatan internal bisa membocorkan informasi operasional]** → Hanya query detail admin yang membaca tabel; tambahkan tes kebocoran pada permukaan publik.
- **[Admin mengira catatan setup mereset timer auto-cancel]** → Teks bantuan di UI menyatakan catatan tidak mengubah status atau timer; mutasi tidak menulis aktivitas substantif.
- **[Satu catatan menghilangkan riwayat perubahan]** → Sesuai T-14; hanya pelaku dan waktu pembaruan terakhir yang disimpan. Bila venue membutuhkan riwayat, change lanjutan harus menambah model baru.
- **[Dua penyimpanan bersamaan]** → Kunci baris reservasi dalam transaksi dan unique `reservation_id`.
- **[Status akhir masih dapat diubah catatannya]** → Diasumsikan boleh karena catatan bersifat operasional; dicatat sebagai keputusan PROVISIONAL.

## Migration Plan

1. Tambahkan definisi tabel dan ekspor schema.
2. Jalankan `npm run db:generate`, periksa migration `0010`, lalu `npm run db:migrate` pada database yang sesuai.
3. Deploy kode yang membaca/menulis tabel.
4. Rollback: drop tabel `setup_note`; tidak ada data lain yang bergantung padanya.

## Open Questions

- Apakah venue membutuhkan lebih dari satu catatan atau riwayat versi di masa depan? Untuk sekarang tidak, sesuai T-14.
- Apakah catatan perlu ditampilkan pada halaman publik tertentu di masa depan? Untuk sekarang tidak, dan perubahan itu membutuhkan requirement baru.
- Apakah status akhir sebaiknya tetap dapat diubah catatannya? Diusulkan ya; dapat dipersempit saat review tanpa mengubah struktur tabel.
