# Tasks

## 1. Sistem Desain (Token dan Komponen Dasar)

Catatan apply: Grup ini adalah grup UI pertama. Selama tabel token di `docs/design/ui-spec.md` bagian 2 masih `TBD`, tugas 1.1 berhenti sebagai `[LANGKAH MANUAL]`. Gerbang 1.2 dan 1.3 gagal berarti berhenti dan bertanya; titik `[BERHENTI]` 1.9 tidak menghalangi kelanjutan grup berikutnya setelah user menyatakan setuju. Jangan menambah layar, tombol, atau token di luar `docs/design/ui-spec.md`.

- [x] 1.1 [LANGKAH MANUAL] Minta user mengisi tabel token di `docs/design/ui-spec.md` bagian 2 (nilai warna, font heading/body, radius/shadow/skala, dan logo SVG di `public/`). Agen berhenti dan menunggu konfirmasi; jangan mengubah dokumen itu sendiri. (Sistem desain, `ui-spec.md` bagian 2)
- [x] 1.2 [GERBANG] Verifikasi pemetaan token ke Tailwind v4 memakai `@theme inline` dan pemuatan font lewat `next/font` dari dokumentasi/tipe paket terpasang (cadangan: `node_modules/tailwindcss`, `node_modules/next/font`); tulis sumbernya ke Hasil Verifikasi (V1); jika gagal, berhenti dan tanyakan user. (Sistem desain, TDR D9)
- [x] 1.3 Definisikan token visual dan font di `src/app/globals.css` dan `src/app/layout.tsx` sesuai nilai 1.1 (`lang="id"`, metadata dari data venue), lalu bangun komponen dasar di `src/components/ui/` (Button, Input, Select, Textarea, Badge, Card, Table, Skeleton, EmptyState, ErrorState, Modal/lightbox); verifikasi `npm run typecheck` dan `npm run lint` lulus. (Sistem desain, TDR D9)
- [x] 1.4 Verifikasi tes render komponen dasar dengan menulis `tests/ui-components.test.ts` (Button memuat/nonaktif, Input galat, Badge status, ErrorState menampilkan "Coba Lagi") lalu menjalankan `npm run test -- tests/ui-components.test.ts`. (Sistem desain)
- [x] 1.5 [BERHENTI] Minta user membandingkan komponen dasar dengan `docs/design/ui-spec.md` di browser (halaman contoh/storyboard), lalu berhenti menunggu persetujuan visual.

## 2. Skema Database dan Migrasi

Catatan apply: Gerbang 2.1 gagal berarti berhenti dan bertanya. Tulis/migrasi hanya lewat `npm run db:generate` dan `npm run db:migrate`; tes skema memakai PostgreSQL asli lewat harness yang sudah ada. Jangan menulis data ke database dev.

- [x] 2.1 [GERBANG] Verifikasi sintaks constraint Drizzle (`check`, `primaryKey`, `uniqueIndex`) dan tipe kolom dari tipe paket terpasang (cadangan: `node_modules/drizzle-orm/pg-core/checks.d.ts`, `primary-keys.d.ts`, `columns/`); tulis sumbernya ke Hasil Verifikasi (V2); jika gagal, berhenti dan tanyakan user. (Skema database, SK-1)
- [x] 2.2 Buat `src/lib/db/venue-schema.ts` dengan tabel `venue`, `package`, `facility`, `package_facility`, `gallery_item` beserta seluruh constraint SK-1, dan ekspor dari `src/lib/db/schema.ts`; verifikasi `npm run typecheck` lulus. (Skema database, SK-1)
- [x] 2.3 Jalankan `npm run db:generate`; verifikasi berkas SQL baru muncul di `migrations/` dan memuat seluruh constraint SK-1 (singleton venue, harga/sesi/setup, PK gabungan relasi, FK `restrict`, check kategori galeri). (Skema database, SK-1)
- [x] 2.4 Jalankan `npm run db:migrate` dua kali; verifikasi kedua eksekusi sukses (idempoten). (Skema database, SK-1)
- [x] 2.5 Verifikasi constraint dengan menulis `tests/venue-schema.test.ts` terhadap PostgreSQL asli: `package_facility` duplikat ditolak; `price_rupiah` negatif ditolak; `session_count < 1` ditolak; `category` galeri di luar daftar ditolak; baris `venue` kedua ditolak; lalu menjalankan `npm run test -- tests/venue-schema.test.ts`. (Pengelolaan Paket oleh Admin, Pengelolaan Fasilitas dan Relasi ke Paket oleh Admin, Galeri Publik dengan Filter Jenis Acara)

## 3. Modul Domain dan Seed Data Venue

Catatan apply: Akses data dan aturan domain masuk `src/modules/venue/`, tidak mengimpor `src/app` (dijaga tes boundary yang ada). Fungsi baca/mutasi diuji terhadap PostgreSQL asli; fungsi murni diuji tanpa database. Jangan membuat data customer/reservasi/demo.

- [x] 3.1 Buat `src/modules/venue/types.ts`, `queries.ts` (`getPublicVenue`, `listActivePackages`, `listFacilitiesWithPackages`, `listActiveGallery`, dan query admin), dan `schema.ts` (skema Zod input admin); verifikasi `npm run typecheck` lulus. (Informasi Venue Publik, Katalog Paket dan Harga, Fasilitas dan Relasi Paket, Galeri Publik dengan Filter Jenis Acara, NFR-MNT-01)
- [x] 3.2 Buat `src/modules/venue/whatsapp.ts` dengan `buildWhatsAppLink(number, message)` dan `WHATSAPP_MESSAGE_TEMPLATE` tetap; verifikasi `npm run typecheck` lulus (tes murni di 3.3). (Kontak dan Tombol WhatsApp, T-12)
- [x] 3.3 Verifikasi tes murni pesan WhatsApp dengan menulis `tests/venue-whatsapp.test.ts` (tautan `wa.me` memakai nomor dan pesan ter-encode; nomor kosong tidak membuka tautan) lalu menjalankan `npm run test -- tests/venue-whatsapp.test.ts`. (Kontak dan Tombol WhatsApp)
- [x] 3.4 Buat `src/modules/venue/seed-data.ts` dengan fungsi murni `buildVenueSeed()` berisi venue, empat paket (harga Rp20 jt/22 jt/25 jt/35 jt; durasi 5 jam, Walimah 2 x 5 jam), dan fasilitas Full Service termasuk "Fasilitas SDA" apa adanya; verifikasi `npm run typecheck` lulus. (Seed Data Venue Tanpa Data Demo, T-09, T-17)
- [x] 3.5 Verifikasi tes murni seed dengan menulis `tests/venue-seed-data.test.ts` (venue dan empat paket ada, harga sesuai handoff, "Fasilitas SDA" apa adanya, tidak ada entri customer/reservasi/demo) lalu menjalankan `npm run test -- tests/venue-seed-data.test.ts`. (Seed Data Venue Tanpa Data Demo)
- [x] 3.6 Verifikasi query domain dengan menulis `tests/venue-queries.test.ts` terhadap PostgreSQL asli (query baca mengembalikan baris dari database uji, paket nonaktif tidak ikut `listActivePackages`, galeri nonaktif tidak ikut `listActiveGallery`, fasilitas beserta relasi paket) lalu menjalankan `npm run test -- tests/venue-queries.test.ts`. (Informasi Venue Publik, Katalog Paket dan Harga, Fasilitas dan Relasi Paket, Galeri Publik dengan Filter Jenis Acara)
- [x] 3.7 Buat `scripts/seed-venue.ts` (memuat `load-env`, memakai `buildVenueSeed()` dan `describeDatabaseTarget` yang ada, idempoten lewat `id` stabil, menampilkan target database dan meminta konfirmasi); verifikasi `npm run typecheck` lulus. (Seed Data Venue Tanpa Data Demo)
- [x] 3.8 [LANGKAH MANUAL] Minta user menjalankan `npx tsx scripts/seed-venue.ts` terhadap database dev dan melaporkan hasilnya; agen tidak menulis data ke database dev. Berhenti menunggu laporan user. (Seed Data Venue Tanpa Data Demo)
- [x] 3.9 Verifikasi tes idempotensi seed dengan menulis `tests/seed-venue-idempotent.test.ts` (menjalankan penulisan seed dua kali di database uji tidak menggandakan venue/paket/fasilitas) lalu menjalankan `npm run test -- tests/seed-venue-idempotent.test.ts`. (Seed Data Venue Tanpa Data Demo)

## 4. Kerangka Admin dan Perbaikan foundation-auth

Catatan apply: Setiap Server Action (`'use server'`) dan page di `src/app/admin/**` WAJIB memanggil helper proteksi; pemindai statis yang ada akan menolak bila lupa. Perbaikan US-025 mengubah `src/modules/auth/helpers.ts` dan `src/app/login/page.tsx` beserta tesnya. Jangan menampilkan menu tanpa change.

- [x] 4.1 Buat `src/app/admin/layout.tsx` (sidebar gelap, header, menu hanya Dashboard/Paket/Venue dan Fasilitas/Galeri/Pengaturan, tombol Keluar) yang memanggil `requireAdminSession()`; verifikasi `npm run test -- tests/static-scanner.test.ts` lulus. (Kerangka admin, NFR-SEC-05)
- [x] 4.2 Buat komponen logout klien yang memanggil `authClient.signOut()` lalu mengarahkan ke `/login`; verifikasi `npm run typecheck` lulus. (Tombol logout mengakhiri sesi)
- [x] 4.3 Ubah `src/app/admin/page.tsx` menjadi dashboard dengan keadaan kosong, skeleton saat memuat, dan keadaan galat dengan "Coba Lagi" (widget data ditunda ke change 4/5a/5b/8); verifikasi `npm run test -- tests/static-scanner.test.ts` lulus. (Dashboard menampilkan keadaan kosong, memuat, dan galat)
- [x] 4.4 Perbarui `src/modules/auth/helpers.ts` agar membangun parameter `redirect` dengan `encodeURIComponent(safePath)`, dan perbarui `tests/helpers-redirect.test.ts` mengharapkan nilai ter-encode; verifikasi `npm run test -- tests/helpers-redirect.test.ts tests/redirect-usage.test.ts`. (Parameter redirect ter-encode, US-025)
- [x] 4.5 Perbarui `src/app/login/page.tsx` untuk menampilkan pesan khusus saat `error.status === 429` (selain itu pesan kredensial salah), dan tambah kasus 429 di `tests/login-form.test.ts`; verifikasi `npm run test -- tests/login-form.test.ts`. (Login dibatasi laju menampilkan pesan khusus, US-025)
- [x] 4.6 [GERBANG] Verifikasi bahwa `BetterFetchError.status` tersedia pada galat klien Better Auth (cadangan: `node_modules/@better-fetch/fetch/dist/index.d.ts`); tulis sumbernya ke Hasil Verifikasi (V3); gerbang ini tidak menghentikan apply bila pesan 429 sudah dibuktikan tes 4.5. (Login dibatasi laju menampilkan pesan khusus)
- [x] 4.7 Verifikasi tes render kerangka admin dengan menulis `tests/admin-shell.test.ts` (menu tanpa change tidak tampil, dashboard menampilkan keadaan kosong/galat, tombol Keluar memanggil signOut) memakai pabrik pengguna uji yang ada, lalu menjalankan `npm run test -- tests/admin-shell.test.ts`. (Kerangka admin, Dashboard menampilkan keadaan kosong, memuat, dan galat)

## 5. Halaman Publik

Catatan apply: Gerbang 5.1 gagal (render dinamis tidak dapat dipastikan) berarti berhenti dan bertanya. Data selalu dari database; tidak ada statistik/testimoni/demo. Grup ini berakhir dengan `[BERHENTI]` untuk perbandingan visual manusia.

- [x] 5.1 [GERBANG] Verifikasi cara memaksa render dinamis di Next.js 16 (cadangan: dokumentasi Next.js terpasang di `node_modules/next` atau percobaan terukur); tulis sumbernya ke Hasil Verifikasi (V4); jika gagal, berhenti dan tanyakan user. (Halaman publik, SK-4)
- [x] 5.2 Buat Beranda (`src/app/page.tsx`) menampilkan nama venue, alamat, kapasitas, deskripsi, ringkasan paket, dan kartu jenis acara dari database; verifikasi `npm run typecheck` lulus. (Informasi Venue Publik)
- [x] 5.3 Buat `/tentang` menampilkan teks venue, alamat, dan tautan peta dari database; verifikasi `npm run typecheck` lulus. (Informasi Venue Publik)
- [x] 5.4 Buat `/fasilitas` menampilkan grid fasilitas, "Fasilitas SDA" apa adanya, dan ringkasan paket (harga, durasi, jumlah sesi, fasilitas) tanpa `setup_days_before`; verifikasi `npm run typecheck` lulus. (Fasilitas dan Relasi Paket, Katalog Paket dan Harga)
- [x] 5.5 Buat `/kontak` menampilkan alamat, kontak terkonfirmasi, dan tombol WhatsApp memakai `buildWhatsAppLink` tanpa formulir; verifikasi `npm run typecheck` lulus. (Kontak dan Tombol WhatsApp)
- [x] 5.6 Restyle `src/app/login/page.tsx` mengikuti desain tanpa mengubah perilaku autentikasi; verifikasi `npm run test -- tests/login-form.test.ts tests/login-success.test.ts tests/logout.test.ts`. (Halaman Login, Sistem desain)
- [x] 5.7 Verifikasi tes halaman publik dengan menulis `tests/public-pages.test.ts` (render memakai data domain tertanam/mock: nama venue dan kapasitas dari data, paket nonaktif tidak tampil, `setup_days_before` tidak muncul, tidak ada teks statistik fiktif, "Fasilitas SDA" apa adanya) lalu menjalankan `npm run test -- tests/public-pages.test.ts`. (Informasi Venue Publik, Katalog Paket dan Harga, Fasilitas dan Relasi Paket, Kontak dan Tombol WhatsApp)
- [x] 5.8 Perbarui `npm run lint`, `npm run typecheck`, dan `npm run build`; verifikasi semuanya lulus dan halaman publik terbangun tanpa galat. (Halaman publik)
- [x] 5.9 [BERHENTI] Minta user membuka halaman publik di browser dan membandingkan dengan `docs/design/ui-spec.md` (desktop-first, tanpa statistik fiktif), lalu berhenti menunggu persetujuan.

## 6. CRUD Admin

Catatan apply: Setiap Server Action di grup ini memanggil `requireAdminSession()` sebagai panggilan pertama dan divalidasi skema Zod modul domain. Data bisnis tidak dihapus: paket dan item galeri memakai status aktif; fasilitas tidak dihapus selama direferensikan. Jangan menambah kolom/layar di luar SK-1 dan `ui-spec.md`.

- [x] 6.1 Buat mutasi domain `src/modules/venue/mutations.ts` (venue, paket, fasilitas, relasi paket-fasilitas dalam transaksi, galeri); verifikasi `npm run typecheck` lulus. (Pengelolaan Venue dan Pengaturan Kontak oleh Admin, Pengelolaan Paket oleh Admin, Pengelolaan Fasilitas dan Relasi ke Paket oleh Admin, Pengelolaan Galeri oleh Admin)
- [x] 6.2 Verifikasi tes mutasi dengan menulis `tests/venue-mutations.test.ts` terhadap PostgreSQL asli (buat/ubah paket; harga desimal/negatif dan sesi < 1 ditolak; tautkan relasi dan duplikat ditolak; ubah venue dan nomor WhatsApp tersimpan) lalu menjalankan `npm run test -- tests/venue-mutations.test.ts`. (Pengelolaan Paket oleh Admin, Pengelolaan Fasilitas dan Relasi ke Paket oleh Admin, Pengelolaan Venue dan Pengaturan Kontak oleh Admin)
- [x] 6.3 Buat halaman admin Venue dan Pengaturan venue beserta Server Action-nya; verifikasi `npm run test -- tests/static-scanner.test.ts` lulus. (Pengelolaan Venue dan Pengaturan Kontak oleh Admin)
- [x] 6.4 Buat halaman admin Paket (daftar + form) beserta Server Action-nya; verifikasi `npm run test -- tests/static-scanner.test.ts` lulus. (Pengelolaan Paket oleh Admin)
- [x] 6.5 Buat halaman admin Fasilitas dan pengelolaan relasi paket-fasilitas beserta Server Action-nya; verifikasi `npm run test -- tests/static-scanner.test.ts` lulus. (Pengelolaan Fasilitas dan Relasi ke Paket oleh Admin)
- [x] 6.6 Verifikasi tes bahwa aksi admin tanpa sesi ditolak dengan menulis `tests/admin-actions-unauthorized.test.ts` (helper menolak sebelum logika aksi) memakai pola `tests/fixtures/` yang ada, lalu menjalankan `npm run test -- tests/admin-actions-unauthorized.test.ts`. (Pengelolaan Venue dan Pengaturan Kontak oleh Admin, Pengelolaan Fasilitas dan Relasi ke Paket oleh Admin, Pengelolaan Galeri oleh Admin, NFR-SEC-05)
- [x] 6.7 Verifikasi tes integrasi harga tanpa deploy dengan menulis `tests/admin-price-no-deploy.test.ts` (ubah harga paket, query baca publik mengembalikan harga baru, paket nonaktif hilang dari daftar form) lalu menjalankan `npm run test -- tests/admin-price-no-deploy.test.ts`. (Katalog Paket dan Harga, Pengelolaan Paket oleh Admin)
- [x] 6.8 [BERHENTI] Minta user mencoba CRUD di browser (Venue, Paket, Fasilitas, relasi, Pengaturan venue) dan membandingkan dengan desain, lalu berhenti menunggu persetujuan.

## 7. Galeri Tahap 1

Catatan apply: Gambar dari `public/` atau URL; tidak ada unggah berkas ke object storage (TDR D7). Item galeri memakai status aktif, bukan hapus. Grup ini berakhir dengan `[BERHENTI]` untuk perbandingan visual.

- [x] 7.1 Buat halaman admin Galeri (CRUD metadata judul, kategori jenis acara, urutan, aktif, lokasi gambar) beserta Server Action-nya tanpa kontrol unggah berkas; verifikasi `npm run test -- tests/static-scanner.test.ts` lulus. (Pengelolaan Galeri oleh Admin, TDR D7)
- [x] 7.2 Buat halaman publik `/galeri` (grid, filter jenis acara, lightbox dengan keterangan, keadaan kosong) memakai `listActiveGallery`; verifikasi `npm run typecheck` lulus. (Galeri Publik dengan Filter Jenis Acara)
- [x] 7.3 Verifikasi tes galeri dengan menulis `tests/gallery.test.ts` (hanya item aktif terurut, filter jenis acara menyaring, kategori di luar daftar ditolak di database, lightbox memuat keterangan) terhadap PostgreSQL asli, lalu menjalankan `npm run test -- tests/gallery.test.ts`. (Galeri Publik dengan Filter Jenis Acara, Pengelolaan Galeri oleh Admin)
- [x] 7.4 Verifikasi `npm run lint`, `npm run typecheck`, dan `npm run build` lulus setelah galeri terpasang. (Galeri)
- [x] 7.5 [BERHENTI] Minta user membuka `/galeri` dan halaman admin Galeri di browser, membandingkan dengan desain, lalu berhenti menunggu persetujuan.

## 8. Verifikasi Akhir

Catatan apply: Grup ini hanya pemeriksaan integrasi; tidak menambah fitur. Jalankan perintah dengan jalur berkas tes eksplisit. Jangan menandai tugas selesai sebelum perintah benar-benar lulus.

- [x] 8.1 Jalankan `npm run lint`; verifikasi tanpa galat. (Definisi selesai)
- [x] 8.2 Jalankan `npm run typecheck`; verifikasi tanpa galat. (Definisi selesai)
- [x] 8.3 Jalankan `npm run build`; verifikasi build berhasil. (Definisi selesai)
- [x] 8.4 Jalankan `npm run test`; verifikasi seluruh tes lulus terhadap PostgreSQL asli dan tidak ada `skip`/`only`/`todo`. (Definisi selesai)
- [x] 8.5 Jalankan `openspec validate venue-content`; verifikasi tanpa peringatan. (Definisi selesai)
- [x] 8.6 Verifikasi `git ls-files` tidak melacak berkas `.env*` selain `.env.example`. (Definisi selesai)
- [x] 8.7 Perbarui README dengan langkah skema/migrasi dan seed venue (`npm run db:generate`, `npm run db:migrate`, `npx tsx scripts/seed-venue.ts`), lalu verifikasi perintah yang tidak butuh rahasia dapat dijalankan apa adanya. (Definisi selesai)

## Hasil Verifikasi

| Kode | Verifikasi | Sumber | Hasil |
| --- | --- | --- | --- |
| V1 | Pemetaan token Tailwind v4 dan `next/font` | `node_modules/tailwindcss/theme.css` & `index.css` (blok `@theme default`/`@theme inline`); `node_modules/tailwindcss/dist/lib.mjs` (registrasi `--radius-*` dan `rounded-full`); `node_modules/next/dist/compiled/@next/font/dist/google/index.d.ts:7089` (`Inter`) | Lulus: `@theme inline` memetakan `--color-*`, `--font-*`, `--text-*`, `--radius-*`, `--shadow-*` ke utilitas; `radius.full` memakai `rounded-full` bawaan (`calc(infinity * 1px)`); `npm run build` lulus. |
| V2 | Sintaks constraint Drizzle | `node_modules/drizzle-orm/pg-core/checks.d.ts` (`check(name, SQL)`), `primary-keys.d.ts` (`primaryKey({ name?, columns })`), `indexes.d.ts:78` (`uniqueIndex(name?)`), `columns/` (`integer`, `text`, `boolean`, `timestamp`) | Lulus: seluruh API constraint tersedia pada drizzle-orm 0.45.4. |
| V3 | `BetterFetchError.status` pada galat klien | `node_modules/@better-fetch/fetch/dist/index.d.ts:201-203` (`declare class BetterFetchError extends Error { status: number; statusText: string }`), dipakai tipe klien Better Auth | Lulus: `error.status` bertipe `number`; pesan 429 dibuktikan `tests/login-form.test.ts` (kasus "status 429 menampilkan pesan khusus"). |
| V4 | Cara render dinamis Next.js 16 | `next.config.ts` (tanpa `cacheComponents`); `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.md:25` (`dynamic` dihapus hanya saat Cache Components aktif); `.../02-guides/caching-without-cache-components.md:87-97` (`force-dynamic`); `node_modules/next/dist/build/segment-config/app/app-segment-config.d.ts:62` (`dynamic?: 'auto' \| 'error' \| 'force-static' \| 'force-dynamic'`) | Lulus: `export const dynamic = "force-dynamic"` pada halaman publik; `npm run build` menandai `/`, `/tentang`, `/fasilitas`, `/kontak` sebagai `ƒ` (Dynamic), bukan statis. |
