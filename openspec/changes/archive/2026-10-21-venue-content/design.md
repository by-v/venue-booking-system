# Design

## Context

Lihat `proposal.md` untuk motivasi dan batas scope. Fondasi dari change `foundation-auth` sudah ada dan dipakai ulang: Next.js 16.4.0 (App Router, `src/`), Drizzle ORM 0.45.4 dengan PostgreSQL, Better Auth 1.7.7, harness tes Vitest dengan PostgreSQL asli (`tests/setup-db.ts`, `tests/helpers/`), pemindai statis rute/aksi admin (`tests/helpers/static-scanner.ts`), pabrik pengguna uji (`tests/helpers/create-user.ts`), dan konvensi tabel `src/lib/db/*-schema.ts` yang diekspor dari `src/lib/db/schema.ts`.

Fakta yang membentuk desain:
- Belum ada tabel domain. Schema aktif hanya tabel Better Auth (`src/lib/db/auth-schema.ts`).
- `src/app/page.tsx` masih halaman scaffold Next.js; `src/app/admin/page.tsx` masih dashboard kosong; `src/proxy.ts` melindungi `/admin/:path*`; `src/app/globals.css` masih token bawaan Next.js.
- `src/modules/auth/helpers.ts` membangun parameter redirect tanpa encode; `src/app/login/page.tsx` selalu menampilkan pesan kredensial salah.
- `docs/design/ui-spec.md` bagian 2 (token visual) masih `TBD`; roadmap 5.2 menetapkannya WAJIB dari pemilik proyek dan grup pertama berhenti `[LANGKAH MANUAL]`.
- Dokumen handoff (7.2–7.5, 8.2–8.5, 36) **tidak ada** di repo; hanya kutipannya di `docs/roadmap.md` Change 2 yang tersedia. Nilai yang hanya ada di handoff dan tidak terverifikasi diperlakukan sebagai placeholder berlabel atau ditandai `[BELUM TERVERIFIKASI]`.

## Goals / Non-Goals

**Goals:**
- Skema dan migrasi tabel domain `venue`, `package`, `facility`, `package_facility`, `gallery_item` dengan constraint database yang menegakkan aturan (SK-1).
- Modul domain `src/modules/venue/` terpisah dari UI dan route handler untuk semua aturan dan akses data domain.
- Sistem desain (token + komponen) sekali pakai, mengikuti `docs/design/ui-spec.md` dan Tailwind v4 (TDR D9).
- Halaman publik Beranda, Tentang Kami, Fasilitas, Galeri, Kontak dan restyle `/login`.
- Kerangka admin (sidebar, header, logout, keadaan kosong/memuat/galat) dan CRUD Venue, Paket, Fasilitas, relasi paket-fasilitas, Galeri, dan Pengaturan venue lewat Server Action yang dilindungi helper.
- Seed data venue dari handoff tanpa data demo.
- Perbaikan US-025: encode parameter redirect dan pesan khusus untuk login yang dibatasi laju.

**Non-Goals:**
- Perhitungan ketersediaan/kalender, reservasi, pembayaran, nomor booking, Bukti Booking (change lain).
- Unggah berkas galeri ke object storage (change `deployment`).
- Tata letak mobile (change `responsive-pass`) dan desain mobile dari user.
- Statistik, testimoni, formulir pesan, konten fiktif, dan pustaka UI pihak ketiga.

## Decisions

### SK-1. Skema database dan constraint

File baru `src/lib/db/venue-schema.ts`, diekspor dari `src/lib/db/schema.ts` (mengikuti pola `auth-schema.ts`). Nama kolom pakai `snake_case` di DB dan `camelCase` di Drizzle, seperti `auth-schema.ts`. Migrasi dibuat dengan `npm run db:generate` (SQL) dan di-commit. Constraint ditegakkan di database, bukan hanya Zod.

| Tabel | Kolom kunci | Constraint database |
|---|---|---|
| `venue` | `id` integer PK, `name`, `address`, `capacity_min`, `capacity_max`, `description`, `admin_whatsapp` (nullable), `contact` (nullable), `email` (nullable), `instagram_url` (nullable), `map_url` (nullable), `updated_at` | `check("venue_singleton", sql\`id = 1\`)` menegakkan satu baris; `check("venue_capacity", sql\`capacity_min >= 0 and capacity_max >= capacity_min\`)` |
| `package` | `id` text PK, `name`, `price_rupiah` integer, `duration_hours` integer, `session_count` integer, `setup_days_before` integer, `active` boolean, `sort_order` integer, `created_at`, `updated_at` | `check("package_price_nonneg", sql\`price_rupiah >= 0\`)`; `check("package_duration_positive", sql\`duration_hours > 0\`)`; `check("package_sessions", sql\`session_count >= 1\`)`; `check("package_setup_days", sql\`setup_days_before >= 0\`)` |
| `facility` | `id` text PK, `name`, `description` (nullable), `active` boolean, `sort_order` integer | — (nama bebas; "Fasilitas SDA" disimpan apa adanya) |
| `package_facility` | `package_id` FK→`package.id`, `facility_id` FK→`facility.id` | `primaryKey({ columns: [packageId, facilityId] })` menegakkan relasi unik per pasangan; FK `onDelete: "restrict"` |
| `gallery_item` | `id` text PK, `title`, `category`, `image_path`, `caption` (nullable), `sort_order` integer, `active` boolean, `created_at`, `updated_at` | `check("gallery_category", sql\`category in ('PERNIKAHAN','WALIMAH_RESEPSI','SEMINAR','KONSER','ACARA_MALAM','ACARA_OUTDOOR','LAINNYA')\`)` (T-15) |

Dipakai Drizzle `pg-core`: `pgTable`, `primaryKey`, `check`, `integer`, `text`, `boolean`, `timestamp` (`node_modules/drizzle-orm/pg-core/checks.d.ts`, `primary-keys.d.ts`, `columns/`). Uang sebagai integer rupiah (konvensi register). Tidak ada transaksi khusus untuk CRUD satu tabel; penggantian relasi paket-fasilitas dibungkus `db.transaction(...)` (tambah/hapus tautan) agar konsisten.

**Asumsi:** relasi paket-fasilitas adalah konfigurasi, bukan data bisnis, sehingga pengurangan tautan tidak melanggar BR-12. Alternatif "tidak pernah menghapus relasi" ditolak karena menghalangi koreksi kesalahan input; FK `restrict` tetap menjamin paket/fasilitas itu sendiri tidak terhapus.

**Penyesuaian (keputusan pemilik proyek, 19 Okt 2026):** tabel `venue` menambah kolom `email` dan `instagram_url` (keduanya nullable) agar kontak terkonfirmasi (email dan Instagram resmi) tersimpan terstruktur dan tautan Instagram footer hanya muncul bila ada URL terkonfirmasi. Kolom `contact` tetap untuk kontak tambahan/telepon yang diisi admin.

### SK-2. Modul domain `src/modules/venue/`

Aturan bisnis dan akses data dipisah dari UI dan route handler (NFR-MNT-01, TDR D1). Modul tidak mengimpor dari `src/app` (dijaga `tests/module-boundary.test.ts`). Isi:
- `types.ts`: tipe domain (`Package`, `FacilityWithPackages`, `GalleryItem`, kategori jenis acara).
- `queries.ts`: baca publik (`getPublicVenue()`, `listActivePackages()`, `listFacilitiesWithPackages()`, `listActiveGallery()`) dan baca admin (`listAllPackages()`, dst).
- `mutations.ts`: tulis admin (venue, paket, fasilitas, relasi, galeri) — menerima input tervalidasi, tidak mengimpor API peramban.
- `whatsapp.ts`: fungsi murni `buildWhatsAppLink(number, message)` dan `WHATSAPP_MESSAGE_TEMPLATE` tetap (T-12).
- `seed-data.ts`: fungsi murni `buildVenueSeed()` yang mengembalikan payload venue/paket/fasilitas dari handoff, dipakai seed dan diuji tanpa database.
- `schema.ts`: skema Zod input admin (dipakai form dan Server Action).

**Alternatif ditolak:** menaruh query langsung di Server Component/Server Action (melanggar pemisahan modul) dan membuat ORM repository generik (over-engineering untuk lima tabel).

### SK-3. Sistem desain dan token

- Token visual didefinisikan sebagai variabel CSS di `src/app/globals.css` memakai blok `@theme inline` Tailwind v4 (sudah dipakai file yang ada; `node_modules/tailwindcss` 4.3.3). Nama token mengikuti `docs/design/ui-spec.md` bagian 2 (`color.ink`, `color.ivory`, `color.gold-*`, `color.status.*`, `font.heading`, `font.body`, `radius.*`, `shadow.*`).
- Font dimuat lewat `next/font` di `src/app/layout.tsx` (ui-spec bagian 2), `lang="id"`, metadata dari data venue.
- Komponen dasar di `src/components/ui/` dibuat sekali: Button (utama/garis tepi/hantu, memuat, nonaktif), Input/Select/Textarea (fokus, galat, nonaktif), Badge status, Card, Table dengan kolom Aksi, Skeleton, EmptyState, ErrorState dengan "Coba Lagi", dan Modal/lightbox. Tidak memakai pustaka UI pihak ketiga (TDR D9).

**GERBANG (tidak menghentikan apply kecuali token masih TBD):** Selama tabel token `docs/design/ui-spec.md` bagian 2 masih `TBD`, grup sistem desain berhenti sebagai `[LANGKAH MANUAL]` (roadmap 5.2) dan menunggu pemilik proyek mengisi nilai pasti, nama font, dan logo SVG. Setelah token terisi, tugas dilanjutkan.

**`[BELUM TERVERIFIKASI]`:** pemetaan nama token Tailwind v4 (`@theme inline`) ke utilitas kelas yang dipakai komponen, dan dukungan `next/font` untuk jenis huruf serif yang dipilih. Diverifikasi dari dokumentasi/tips paket saat grup sistem desain dikerjakan (dijadikan gerbang).

### SK-4. Halaman publik dan pembacaan data

- Halaman publik adalah Server Component yang membaca lewat modul domain (SK-2). Halaman: Beranda (`src/app/page.tsx`), `/tentang`, `/fasilitas`, `/galeri`, `/kontak`.
- Harga dan konten harus tampil dari database tanpa deploy. **`[BELUM TERVERIFIKASI]`:** cara memaksa render dinamis di Next.js 16 agar halaman tidak di-prerender statis saat build (kandidat: `export const dynamic = "force-dynamic"` atau API `connection()`). Diverifikasi sebagai gerbang sebelum menulis halaman; keputusan akhir dicatat di Hasil Verifikasi.
- Galeri: grid + filter jenis acara + lightbox (komponen klien). Gambar dari path `public/` atau URL absolut (TDR D7); tidak ada unggah berkas.
- Kontak: tombol WhatsApp `buildWhatsAppLink` dengan pesan templat tetap; tidak ada formulir. Nomor berasal dari `venue.admin_whatsapp`; bila kosong tombol tidak membuka `wa.me`.

### SK-5. Kerangka admin dan CRUD

- `src/app/admin/layout.tsx` menyediakan sidebar gelap, header, dan tombol logout (komponen klien memakai `authClient.signOut()` lalu `router.push("/login")`). Layout memanggil `requireAdminSession()` agar pemindai statis dan proteksi berlapis tetap berlaku.
- Menu sidebar hanya menampilkan yang sudah punya change: Dashboard, Paket, Venue dan Fasilitas, Galeri, Pengaturan (Keluar untuk logout). Menu Reservasi, Kalender, Pelanggan, Pembayaran tidak ditampilkan (ui-spec 4.2, NFR sekaligus aturan "menu tanpa change tidak ditampilkan").
- Dashboard menampilkan keadaan kosong, skeleton saat memuat, dan keadaan galat dengan "Coba Lagi"; widget terhubung data ditunda ke change 4/5a/5b/8 (roadmap).
- CRUD lewat Server Action di `src/app/admin/**/actions.ts` dengan direktif `'use server'` dan **wajib memanggil `requireAdminSession()`** sebagai panggilan pertama (ditegakkan `tests/static-scanner.test.ts`). Setiap aksi memvalidasi input dengan skema Zod modul domain, memanggil mutasi domain, lalu `revalidatePath`. Halaman form/daftar tetap page di `src/app/admin/**` yang memanggil helper.
- Paket dan item galeri memakai `active` sebagai pengganti hapus (BR-12, proposisi). Fasilitas tidak dihapus selama masih direferensikan (FK `restrict`).

### SK-6. Seed data venue

- Skrip baru `scripts/seed-venue.ts` memuat `load-env`, memakai `buildVenueSeed()` (murni) dan helper `describeDatabaseTarget` yang sudah ada, menampilkan target database dan meminta konfirmasi sebelum menulis (pola `scripts/seed-admin.ts`).
- Idempotensi: menulis dengan `id` tetap (venue `1`, paket/fasilitas dengan id/slug stabil) sehingga dijalankan ulang tidak menggandakan data.
- Data hanya dari handoff yang dikutip di `docs/roadmap.md` Change 2; tanpa data demo/customer/reservasi (T-17). "Fasilitas SDA" disimpan apa adanya (T-09).
- Karena menulis data ke database (bukan migrasi), menjalankan seed terhadap database dev adalah `[LANGKAH MANUAL]` yang dijalankan user (pola seed-admin); agen tidak menulis data dev.

### SK-7. Perbaikan US-025

- `src/modules/auth/helpers.ts`: bangun redirect dengan `encodeURIComponent(safePath)` agar konsisten dengan `src/proxy.ts` yang memakai `url.searchParams.set` (sudah meng-encode). `tests/helpers-redirect.test.ts` diperbarui mengharapkan nilai ter-encode.
- `src/app/login/page.tsx`: bedakan galat. `BetterFetchError` memiliki `status: number` (`node_modules/@better-fetch/fetch/dist/index.d.ts` baris 201–205). Bila `error.status === 429`, tampilkan pesan khusus (mis. "Terlalu banyak percobaan. Coba beberapa saat lagi."); selain itu "Email atau password salah". `tests/login-form.test.ts` menambah kasus 429.

### SK-8. Alternatif yang ditolak

- **Pustaka UI pihak ketiga** (mis. shadcn/Radix): ditolak TDR D9.
- **Enum PostgreSQL untuk kategori galeri**: ditolak; `check` pada kolom `text` lebih mudah diubah dan tetap ditegakkan DB. Kategori disimpan sebagai kunci kanonik (T-15).
- **Menyimpan harga sebagai `numeric`/teks**: ditolak; konvensi register menetapkan integer rupiah.
- **Menyatukan seed ke migrasi**: ditolak karena data venue adalah konten yang dapat berubah, bukan skema; dipakai skrip seed terpisah.
- **Halaman statis yang di-prerender**: ditolak karena harga harus mencerminkan perubahan admin tanpa deploy.

## Risks / Trade-offs

- **[Token TBD memblokir grup sistem desain]** → grup pertama `[LANGKAH MANUAL]` berhenti; tidak mengerjakan komponen sebelum token terisi.
- **[Dokumen handoff tidak ada di repo]** → hanya kutipan roadmap yang dipakai; sisanya placeholder berlabel atau `[BELUM TERVERIFIKASI]`.
- **[Kesesuaian visual hanya dinilai manusia]** → titik `[BERHENTI]` di akhir grup halaman publik dan galeri (roadmap, R8).
- **[Konten/foto asli belum ada]** → placeholder berlabel, tanpa klaim/statistik fiktif (R9).
- **[Render dinamis vs performa]** → memaksa render dinamis menambah query per request; dampak kecil untuk penelitian (D10, bukan produksi).
- **[Relasi paket-fasilitas dikurangi]** → FK `restrict` melindungi entitas; pengurangan tautan dianggap konfigurasi (asumsi SK-1).
- **[Pesan 429 bergantung perilaku klien Better Auth]** → diverifikasi lewat tipe `BetterFetchError.status` dan tes; jika status tidak tersedia, gerbang berhenti dan bertanya.
- **[Pemindai statis menolak aksi admin yang lupa helper]** → setiap Server Action admin memanggil `requireAdminSession()` sejak awal.

## Migration Plan

1. Tambah `src/lib/db/venue-schema.ts` dan ekspor dari `src/lib/db/schema.ts`.
2. `npm run db:generate` untuk membuat migrasi SQL; periksa SQL memuat seluruh constraint SK-1; commit migrasi.
3. `npm run db:migrate` (satu-satunya penulisan ke database dev yang dijalankan otomatis); jalankan dua kali untuk membuktikan idempoten.
4. Jalankan `scripts/seed-venue.ts` terhadap database dev **secara manual** (`[LANGKAH MANUAL]`) setelah konfirmasi; verifikasi data lewat `npm run db:check` dan halaman publik.
5. Rollback: migrasi bersifat maju-saja (foundation-auth); membatalkan data venue dilakukan dengan menjalankan ulang seed idempoten, bukan rollback skema.

## Open Questions

1. **Nilai token visual, nama font, dan logo SVG** — WAJIB dari pemilik proyek (roadmap 5.2). Menahan grup sistem desain.
2. **Teks, foto, dan kontak venue yang sebenarnya** — dari venue; yang belum ada memakai placeholder berlabel.
3. **Kata-kata templat pesan WhatsApp** — hanya dipandu handoff (tidak ada di repo); dipakai templat tetap dan dicatat sebagai asumsi sampai dikonfirmasi.
4. **`[BELUM TERVERIFIKASI]`:** API render dinamis Next.js 16 dan pemetaan token Tailwind v4; diverifikasi di gerbang grup terkait sebelum dipakai sebagai fakta.
