# Proposal

## Why

`venue-content` sudah selesai: paket, harga, dan `setup_days_before` tersedia di database, tetapi sistem belum punya cara mengetahui tanggal mana yang sudah terpakai. Change `reservation-submission` berikutnya membutuhkan kalender yang menunjukkan Tersedia/Terisi menurut paket, dan change konfirmasi membutuhkan penjaga tanggal agar satu tanggal hanya dipakai satu job. Tanpa mesin ketersediaan dan tabel kunci tanggal, form reservasi tidak dapat menolak tanggal yang bertabrakan.

## What Changes

- Menambah tabel `date_lock` dengan **tanggal unik** yang menegakkan BR-01 di level database, jenis kunci `EVENT` atau `SETUP`, dan `reservation_id` tanpa foreign key (FK ditambahkan di change `reservation-confirmation` sesuai roadmap bagian 3).
- Menambah modul domain murni untuk ketersediaan: menghitung tanggal terkunci dari tanggal acara, `setup_days_before` paket, dan hari setup tambahan; memeriksa tanggal lampau menurut WIB; menentukan Tersedia/Terisi.
- Menambah query baca ketersediaan: daftar tanggal terkunci per rentang bulan dan status per tanggal untuk paket terpilih; data publik hanya berisi tanggal dan status, tanpa data customer, tanpa jenis kunci, dan tanpa `reservation_id`.
- Menambah komponen kalender publik (Tersedia/Terisi/Dipilih) yang menerima paket terpilih dan siap dipakai langkah "Pilih Tanggal" pada change `reservation-submission`; belum ada halaman publik baru.
- Menambah halaman admin Kalender (baca saja) yang menampilkan kunci acara dan setup secara terpisah, beserta menu "Kalender" pada kerangka admin.
- Menambah tes terhadap PostgreSQL asli untuk constraint tanggal unik dan jenis kunci, serta tes murni untuk perhitungan tanggal terkunci, H-1, H-2/H-3, dan tanggal lampau.

Tidak ada **BREAKING**: perubahan hanya menambah tabel, modul, dan layar admin baru.

## Capabilities

### New Capabilities

- `availability-calendar`: Penentuan tanggal terkunci dan ketersediaan per paket (BR-01, BR-02, BR-03, BR-18 PROVISIONAL, BR-26, BR-27), penyajian kalender publik Tersedia/Terisi/Dipilih tanpa data customer, dan kalender admin baca-saja yang membedakan kunci acara dan setup.

### Modified Capabilities

- Tidak ada. `venue-content` hanya menyediakan `setup_days_before`; requirement-nya tidak berubah. Kerangka admin dan menu ditambahkan sebagai bagian capability baru ini (ui-spec 4.2).

## Impact

- **Kode baru**: `src/modules/availability/` (`types.ts`, `dates.ts` untuk fungsi murni, `queries.ts`, `schema.ts` bila perlu), `src/lib/db/date-lock-schema.ts` (diekspor dari `src/lib/db/schema.ts`), `src/app/admin/kalender/page.tsx`, komponen kalender publik di `src/components/` (mis. `src/components/availability/calendar.tsx`), dan tes di `tests/`.
- **Kode diubah**: `src/app/admin/admin-shell.tsx` dan `src/app/admin/admin-icons.tsx` (menu Kalender), `src/lib/db/schema.ts` (ekspor skema baru).
- **Database**: tabel `date_lock` (`date` date unik/PK, `kind` text dengan `check in ('EVENT','SETUP')`, `reservation_id` text nullable tanpa FK, `created_at`), dibuat lewat migrasi Drizzle. Tidak ada perubahan tabel `venue`/`package`.
- **Routes**: `/admin/kalender` baru (dilindungi `requireAdminSession()`). Belum ada rute publik baru; komponen kalender dipakai change `reservation-submission`.
- **Dependencies**: tanpa pustaka tanggal baru; perhitungan tanggal memakai tanggal kalender (string `YYYY-MM-DD`) dan zona waktu Asia/Jakarta tanpa dependensi tambahan.
- **Dokumen sumber**: `docs/roadmap.md` Change 3; `docs/business-rules-register.md` BR-01, BR-02, BR-03, BR-18 (PROVISIONAL), BR-26, BR-27, T-02, T-04, T-08; `docs/design/ui-spec.md` 4.1 (langkah Pilih Tanggal), 4.2 (Kalender), penyesuaian 4 dan 14; `docs/product-backlog.md` US-030, US-031, US-032.

## Keputusan

1. `date_lock` dibuat **tanpa FK** ke `reservation` karena tabel itu belum ada; FK ditambahkan di change `reservation-confirmation` (roadmap bagian 3).
2. Tanggal disimpan sebagai tipe `date` (bukan timestamp) agar tidak bergeser oleh zona waktu; aturan "hari ini" memakai WIB.
3. Kunci setup berasal dari `setup_days_before` paket dan hari setup tambahan; hari tambahan dihitung sebagai tanggal terkunci, sedangkan nominal harganya tetap di luar scope change ini (BR-03, diinput admin sebagai item biaya pada change 5a).
4. Ketersediaan bergantung pada paket: tanggal H-2/H-3 paket Outdoor dan Walimah ikut Terisi (BR-18, PROVISIONAL).
5. PENDING dan DITANGGUHKAN tidak membuat kunci; kunci hanya dibuat saat konfirmasi DITERIMA (BR-22, dikerjakan change `reservation-confirmation`).
6. Admin melihat jenis kunci (acara/setup); publik hanya melihat Tersedia/Terisi (BR-27, ui-spec penyesuaian 14).
7. Tidak ada pemblokiran tanggal manual oleh admin (T-08).

## Pertanyaan Terbuka

1. **T-02 (BR-18 PROVISIONAL)**: apakah setup H-2/H-3 paket benar-benar memblokir kalender. Roadmap menetapkan default **ya**; implementasi memakai default itu dan ditandai PROVISIONAL. Bila venue menjawab tidak, hanya fungsi perhitungan tanggal terkunci yang berubah.
2. **T-04**: batas minimum jarak hari pengajuan. Default roadmap: hanya tanggal lampau yang ditolak; change ini tidak menambah batas lain.
3. **Harga sewa hari tambahan**: belum diketahui dan tidak dipakai di change ini; nominal diinput admin sebagai item biaya pada change 5a.
4. **T-08**: blokir tanggal manual oleh admin tidak dibuat, sehingga `date_lock` hanya berisi kunci dari reservasi yang akan datang.

## Di luar scope

- Form pengajuan reservasi, customer, tabel `reservation`/`reservation_item`, dan penulisan kunci tanggal (change `reservation-submission` dan `reservation-confirmation`).
- Konfirmasi, nomor booking, pembayaran, DP, dan pembatalan yang membebaskan tanggal.
- Halaman publik `/reservasi` dan alur pemilihan paket/tanggal; change ini hanya menyediakan komponen dan query.
- Pemblokiran tanggal manual oleh admin (T-08), kalender operasional lain, dan tampilan jam acara/setup (BR-01, ui-spec penyesuaian 4).
- Reschedule, auto-cancel, dan pelunasan.
- Pustaka kalender atau pustaka tanggal pihak ketiga.
- Tata letak mobile (change `responsive-pass`).
