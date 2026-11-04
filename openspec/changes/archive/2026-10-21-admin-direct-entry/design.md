# Design

## Context

Change ini dibangun di atas `reservation-submission` (form publik, customer `CALON`, reservasi `PENDING`, snapshot paket/harga), `reservation-processing` (item biaya, pembayaran manual, penangguhan, pembatalan sebelum diterima), dan `reservation-confirmation` (konfirmasi atomik BR-22, kunci tanggal `date_lock`, nomor booking, pembatalan `DITERIMA`).

Saat ini satu-satunya jalur pembuatan reservasi adalah `submitReservation()` yang dipanggil route handler publik `/api/reservasi`. Tidak ada kolom sumber data, tidak ada Server Action atau halaman admin untuk membuat reservasi, dan actor riwayat/aktivitas selalu `CUSTOMER`.

Lihat `proposal.md` untuk motivasi dan batas scope. Perilaku yang harus dipenuhi ada di `specs/admin-direct-entry/spec.md` dan delta `specs/reservation-submission/spec.md`.

Batasan yang memengaruhi desain:

- Tanggal memakai WIB/Asia/Jakarta; uang integer rupiah.
- Semua aksi tulis admin berada di balik `requireAdminSession()` pada Server Action.
- Konfirmasi atomik BR-22 sudah tersedia dan tidak diubah perilakunya.
- Reservasi `PENDING` tidak menulis `date_lock` dan tidak menerima nomor booking.
- Test memakai PostgreSQL asli dan database uji terpisah; tidak boleh melemahkan assertion.

## Goals / Non-Goals

**Goals:**

- Menambahkan sumber reservasi (`FORM_PUBLIK`/`INPUT_ADMIN`) sebagai kolom dengan constraint database.
- Menyediakan mutasi domain pembuatan reservasi oleh admin yang menulis sumber `INPUT_ADMIN`, pelaku `ADMIN`, dan menegakkan validasi paket/tanggal yang sama dengan form publik.
- Menyediakan halaman admin dan Server Action untuk input langsung, termasuk opsi menerima langsung yang memakai ulang `confirmReservation()` BR-22.
- Menampilkan sumber reservasi pada daftar dan detail admin.
- Menutup BR-31 dan T-11 tanpa menambah fitur di luar scope.

**Non-Goals:**

- Tidak menambahkan impor massal booking lama, reschedule, auto-cancel, bukti booking, atau cek status.
- Tidak mengubah alur pengajuan publik selain mencatat sumbernya.
- Tidak mengubah `confirmReservation()`, `cancelAcceptedReservation()`, atau aturan DP/kunci tanggal.
- Tidak menambah status, kode alasan pembatalan, atau peran admin baru.
- Tidak menambah tabel source atau skema database lain di luar satu kolom.

## Decisions

### D1 - Model data sumber reservasi

Tambahkan di `src/lib/db/reservation-schema.ts`:

**Kolom `reservation.source`**

- text not null default `'FORM_PUBLIK'`.
- `reservation_source`: `` `source` in ('FORM_PUBLIK','INPUT_ADMIN') ``.
- Tidak diindex: volume data penelitian kecil dan kolom tidak dipakai sebagai filter.

Tambahkan di `src/modules/reservation/types.ts`:

- `RESERVATION_SOURCES = ["FORM_PUBLIK", "INPUT_ADMIN"] as const`.
- `type ReservationSource = (typeof RESERVATION_SOURCES)[number]`.

Baris lama otomatis bernilai `FORM_PUBLIK` karena seluruh reservasi yang ada berasal dari form publik. Tidak ada backfill manual: booking lama memang tidak pernah masuk sistem (T-11) dan booking manual bukan baris reservasi.

**Alternatif ditolak:** tipe `enum` PostgreSQL. Skema yang ada memakai `text` + `check` untuk `status`, `event_type`, dan status pembayaran; memakai pola yang sama menjaga konsistensi migrasi dan tipe Drizzle. **Alternatif ditolak:** kolom boolean `is_input_admin`. Boolean tidak membedakan dua nilai secara eksplisit dan menyulitkan penambahan sumber lain di masa depan.

### D2 - Pengajuan publik mencatat FORM_PUBLIK

`submitReservation()` diubah agar menulis `source: "FORM_PUBLIK"` secara eksplisit (bukan hanya mengandalkan default) supaya perilaku terbaca di kode dan teruji. Actor riwayat status tetap `CUSTOMER` dan `actorUserId` tetap `null`. Tidak ada perubahan perilaku lain.

### D3 - Mutasi pembuatan reservasi oleh admin

Tambahkan `createAdminReservation(input: AdminReservationInput & { actorUserId: string }): Promise<{ id: string }>` di `src/modules/reservation/mutations.ts`.

Logika inti form publik dan input admin identik: paket aktif, tanggal dapat dipesan (hari ini WIB atau setelahnya), dan tidak ada `date_lock` pada rentang tanggal setup sampai tanggal acara. Perbedaannya hanya `source`, `actorType`, `actorUserId`, dan alasan riwayat. Karena itu, ekstrak helper privat bersama:

```text
persistReservation(tx, {
  input,
  source,
  actorType,        // "CUSTOMER" | "ADMIN"
  actorUserId,      // null | id admin
  historyReason     // "Pengajuan form publik" | "Input admin langsung"
}): Promise<string>
```

Helper ini: memuat paket aktif, memvalidasi tanggal, memeriksa `date_lock`, meng-upsert customer per nomor WhatsApp (BR-25), menyisipkan reservasi `PENDING` dengan snapshot paket/harga (BR-29) dan `source`, lalu menyisipkan riwayat status `(baru) → PENDING` dan aktivitas `SUBMISSION` yang substantif. `submitReservation()` dan `createAdminReservation()` memanggil helper ini di dalam `db.transaction` masing-masing.

Aktor `ADMIN` pada input langsung memakai `actorUserId` dari sesi. Customer baru tetap `CALON`; customer lama tidak diturunkan statusnya karena upsert hanya memperbarui `name`.

**Alternatif ditolak:** menyalin seluruh isi `submitReservation()`. Duplikasi membuat aturan snapshot dan tanggal mudah menyimpang di kemudian hari. **Alternatif ditolak:** memakai ulang `submitReservation()` langsung. Fungsi itu mengunci `source = FORM_PUBLIK` dan actor `CUSTOMER`, sehingga tidak dapat merepresentasikan input admin.

### D4 - "Simpan & Terima" memakai ulang konfirmasi BR-22

Server Action membuat reservasi `PENDING` lebih dulu melalui `createAdminReservation()`. Bila admin memilih "Simpan & Terima", Server Action kemudian memanggil `confirmReservation()` yang sudah ada. Karena `confirmReservation()` memiliki transaksi sendiri, dua langkah ini berjalan berurutan:

- konfirmasi berhasil → status `DITERIMA`, tanggal terkunci, nomor booking terbit, customer `CLIENT`;
- konfirmasi gagal (`DP_BELOW_MINIMUM`, `DATE_CONFLICT`, `INVALID_STATE`) → reservasi tetap `PENDING` tanpa nomor booking dan tanpa kunci tanggal, dan Server Action mengarahkan ke detail dengan kode galat.

Ini persis perilaku yang diminta spec: reservasi tetap tersimpan `PENDING` bila syarat langsung terima belum terpenuhi. Atomisitas yang dijanjikan BR-22 tetap terjaga karena ia berlaku pada aksi konfirmasi itu sendiri, bukan pada penggabungan buat + terima.

**Alternatif ditolak:** menyisipkan reservasi langsung berstatus `DITERIMA` dan mengunci tanggal di `createAdminReservation()`. Itu menduplikasi logika konfirmasi dan membuka celah melanggar BR-22 (DP dan kunci tanggal). **Alternatif ditolak:** memanggil `db.transaction` bersarang. `confirmReservation()` membuka transaksi sendiri; menjalankannya di dalam transaksi pemanggil tidak didukung pola yang ada.

### D5 - Skema input admin

Tambahkan `adminReservationInputSchema` di `src/modules/reservation/schema.ts` dengan field yang sama seperti `reservationSubmissionSchema` (nama, WhatsApp, alamat, jenis acara, paket, tanggal, catatan) ditambah `accept` boolean default `false`, beserta tipe `AdminReservationInput`.

`accept` tidak diambil dengan `z.coerce.boolean()` karena string `"false"` akan terkonversi menjadi `true`. Server Action membaca checkbox secara eksplisit (`formData.get("accept") === "on"`) lalu meneruskan boolean ke skema. Field lain tetap memakai transform WhatsApp dan validasi tanggal yang sudah ada agar pesan galat konsisten.

### D6 - Query dan tipe daftar/detail

- Tambah `source: ReservationSource` ke `ReservationListItem` dan `ReservationDetail`.
- Tambah `reservation.source` ke select `listReservations()` dan `getReservationDetail()`.
- Tidak menambahkan pencarian berdasarkan sumber dan tidak mengubah filter status.
- `getDashboardData()` memakai `ReservationListItem`; field `source` boleh ikut terbawa tetapi tidak ditampilkan di dashboard.

### D7 - Server Action input langsung

Tambahkan `createAdminReservation(formData)` di `src/app/admin/reservasi/actions.ts`:

1. `requireAdminSession()` paling awal.
2. Parse `adminReservationInputSchema`; konversi `accept` secara eksplisit.
3. Panggil `createAdminReservation({ ...parsed, actorUserId: session.user.id })`.
4. Bila `accept`, panggil `confirmReservation({ reservationId: id, actorUserId: session.user.id })` di dalam blok `try/catch`; pada `ReservationError`, arahkan ke `/admin/reservasi/{id}?galat={code}` tanpa melempar ulang.
5. Revalidasi `/admin`, `/admin/reservasi`, `/admin/reservasi/{id}`, dan bila menerima langsung juga `/admin/kalender` serta `/reservasi`.
6. Arahkan ke `/admin/reservasi/{id}`.

Galat pembuatan (paket tidak tersedia, tanggal lampau, tanggal terkunci) diarahkan kembali ke form `/admin/reservasi/baru?galat={code}`. Halaman detail sudah memetakan kode galat domain ke pesan Indonesia; kode yang sama dipakai agar tidak ada detail database yang bocor.

Aksi ini tidak memakai `runReservationAction()` karena helper itu memerlukan id reservasi yang sudah ada dan selalu mengarah ke halaman detail; alur form memerlukan tujuan redirect yang berbeda saat pembuatan gagal.

### D8 - UI admin

`/admin/reservasi`:

- Tambah tombol "Input reservasi" yang mengarah ke `/admin/reservasi/baru`.
- Tampilkan sumber pada tabel (misalnya label kecil "Input admin" pada baris) agar hasil input admin dapat dibedakan.

`/admin/reservasi/baru`:

- Halaman Server Component yang memanggil `requireAdminSession()` dan memuat `listActivePackageSummaries()` serta `todayInJakarta()`.
- Komponen klien `direct-entry-form.tsx` memakai komponen `Input`, `Select`, `Textarea`, `Button`, dan `AvailabilityCalendar` yang sudah ada, dengan tata letak form reservasi admin (bukan wizard publik).
- Dua tombol kirim: "Simpan sebagai PENDING" dan "Simpan & Terima". Nilai `accept` dikirim melalui input tersembunyi/`formData`.
- Menampilkan pesan galat dari `?galat=` dengan pemetaan kode domain.
- Rute statis `/admin/reservasi/baru` diprioritaskan Next.js di atas segmen dinamis `/admin/reservasi/[id]`; id reservasi berupa UUID sehingga tidak ada tabrakan.

`/admin/reservasi/[id]`:

- Header atau ringkasan menampilkan label sumber ("Form publik" atau "Input admin").

**Alternatif ditolak:** dialog/modal di daftar. Form membutuhkan pemilihan paket dan tanggal, sehingga halaman tersendiri lebih sesuai pola halaman admin lain (`/admin/venue`, `/admin/paket`).

### D9 - Keamanan dan batas domain

- Semua mutasi/query baru tetap di `src/modules/reservation/`; modul tidak mengimpor `src/app`.
- Halaman `/admin/reservasi/baru` dan Server Action `createAdminReservation` memanggil `requireAdminSession()`.
- Tidak ada route publik baru; form memakai endpoint ketersediaan publik yang sudah ada.
- Pemindai statis admin (NFR-SEC-05) harus mengenali halaman dan aksi baru; tugas verifikasi mencakup pengecekan ini.
- Pesan galat tidak membocorkan detail database.

## Risks / Trade-offs

- [Buat dan terima berjalan di dua transaksi] → Bila konfirmasi gagal, reservasi tetap `PENDING` sesuai spec. Pesan galat menjelaskan hal ini; admin dapat melengkapi pembayaran lalu mengonfirmasi. Atomisitas BR-22 tetap utuh pada aksi konfirmasi.
- [Kolom `source` not null ditambahkan ke tabel berisi] → PostgreSQL modern menambahkan kolom dengan default tanpa menulis ulang tabel; nilai default `FORM_PUBLIK` benar untuk seluruh baris lama. Bila ada baris hasil input manual di luar sistem, baris itu memang tidak pernah ada di database.
- [Kolom `accept` dari checkbox mudah salah konversi] → Konversi eksplisit `=== "on"` di Server Action, bukan `z.coerce.boolean()`.
- [Form admin dapat dipakai untuk memasukkan data fiktif] → Tidak ada perubahan keamanan data; validasi, sumber, pelaku, dan riwayat tetap tercatat untuk audit penelitian.
- [Reuse `AvailabilityCalendar` membutuhkan data ketersediaan per paket] → Memakai endpoint ketersediaan yang sudah dipakai form publik; tidak menambah API.
- [Sumber ditampilkan tanpa filter] → Cukup untuk membedakan asal data pada penelitian; filter sumber dapat ditambah pada change lain bila diperlukan.

## Migration Plan

1. Perbarui skema Drizzle: kolom `reservation.source` dan `check` `reservation_source`.
2. Jalankan `npm run db:generate`; periksa SQL `0007_*.sql` hanya menambah satu kolom dengan default dan satu constraint, tanpa mengubah kolom/tabel lain.
3. Jalankan `npm run db:migrate` dua kali pada database dev; kedua eksekusi harus sukses.
4. Test otomatis menjalankan migrasi pada database uji melalui harness yang ada.
5. Rollback lokal: hapus constraint lalu kolom `source`; data reservasi lain tidak berubah. Tidak ada deployment produksi pada konteks penelitian ini.
6. Tidak ada backfill: baris lama memakai default `FORM_PUBLIK`.

## Referensi API terpasang

- `db.transaction` — `node_modules/drizzle-orm/pg-core/db.d.ts`
- `.onConflictDoUpdate()` dan `.returning()` — `node_modules/drizzle-orm/pg-core/query-builders/insert.d.ts`
- `.for("update")` — `node_modules/drizzle-orm/pg-core/query-builders/select.d.ts`
- `check()` — `node_modules/drizzle-orm/pg-core/checks.d.ts`
- `pgTable()` — `node_modules/drizzle-orm/pg-core/table.d.ts`
- `redirect()` — `node_modules/next/dist/client/components/redirect.d.ts`
- `revalidatePath()` — `node_modules/next/dist/server/web/spec-extension/revalidate.d.ts`
- `z.object()` dan `z.enum()` — `node_modules/zod/index.d.ts`

## Open Questions

Tidak ada pertanyaan desain yang menahan implementasi. Pengguna memilih reservasi input tersimpan `PENDING` dan opsi "Simpan & Terima" memakai guard BR-22 tanpa fitur pembayaran baru. T-02 tetap PROVISIONAL (setup memblokir, default **ya**) dan T-11 FINAL-DEFAULT (tanpa impor booking lama).
