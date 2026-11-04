# Proposal

## Why

Sistem belum menampilkan apa pun tentang venue kepada customer, dan admin belum punya cara mengelola informasi venue, paket, fasilitas, galeri, serta kontak. Change berikutnya (`availability-calendar` dan `reservation-submission`) bergantung pada data yang dibuat di sini: daftar paket, harga rupiah, `setup_days_before`, dan fasilitas. Karena itu change ini juga membangun sistem desain (token, komponen) dan kerangka admin yang akan dipakai ulang oleh change-change berikutnya (`docs/roadmap.md` Change 2).

## What Changes

- Menambah skema dan migrasi tabel domain: `venue` (termasuk nomor WhatsApp admin dan kontak), `package` (harga rupiah integer, durasi per sesi, jumlah sesi, `setup_days_before`, aktif), `facility`, `package_facility`, dan `gallery_item` (`docs/roadmap.md` bagian 3).
- Menambah seed data venue dari handoff tanpa data demo: nama venue, alamat, kapasitas 200 sampai 2.000, empat paket dan harga (Rp20 jt, 22 jt, 25 jt, 35 jt; durasi 5 jam, Walimah 2 x 5 jam), fasilitas Full Service. "Fasilitas SDA" disimpan dan ditampilkan apa adanya (T-09).
- Membangun sistem desain: token visual dan komponen dasar mengikuti `docs/design/ui-spec.md` (Tailwind CSS dengan komponen sendiri, TDR D9), dipakai ulang lintas change.
- Membangun kerangka admin (sidebar gelap, header, logout, keadaan kosong/memuat/galat) dan menggantikan dashboard kosong; menu yang belum punya change tidak ditampilkan.
- Menambah halaman publik: Beranda, Tentang Kami, Fasilitas (dengan ringkasan paket), Galeri (grid, filter jenis acara, lightbox), Kontak (tombol WhatsApp, tanpa formulir), serta restyle `/login` mengikuti desain.
- Menambah CRUD admin untuk Venue, Paket, Fasilitas (dan relasinya ke paket), Galeri, dan Pengaturan venue (nomor WhatsApp admin, T-12); semua aksi admin dilindungi helper dan lolos pemindai statis.
- Memperbaiki sisa `foundation-auth` (US-025): parameter `redirect` ter-encode, dan login yang dibatasi laju (HTTP 429) menampilkan pesan khusus yang berbeda dari kredensial salah.
- Galeri tahap 1: gambar dari `public/` atau URL dengan CRUD metadata (judul, kategori, urutan, aktif); unggah ke object storage ditunda ke change `deployment` (TDR D7).

**BREAKING**: tidak ada. Change ini menambah kemampuan; dashboard `/admin` yang semula kosong berubah menjadi kerangka admin.

## Capabilities

### New Capabilities

- `venue-content`: Informasi venue untuk customer (venue, paket dan harga, fasilitas per paket, galeri, kontak WhatsApp) serta pengelolaan konten oleh admin (CRUD venue, paket, fasilitas, relasi paket-fasilitas, galeri, dan pengaturan kontak). Mengacu pada BR-18 (PROVISIONAL), T-09, T-12, T-16, T-17, T-18, TDR D7 dan D9, serta story US-010 sampai US-023 di `docs/product-backlog.md` dan layar change 2 di `docs/design/ui-spec.md`.

### Modified Capabilities

- `admin-auth`: (1) dashboard `/admin` berubah dari halaman kosong menjadi kerangka admin dengan sidebar, header, tombol logout, dan keadaan kosong/memuat/galat (US-024); (2) pembuatan parameter `redirect` meng-encode nilai path dan pembacaan mengikuti; (3) login yang dibatasi laju menampilkan pesan khusus, bukan pesan kredensial salah (US-025).

## Impact

- **Kode baru**: `src/modules/venue/` (aturan domain venue, paket, fasilitas, galeri; terpisah dari UI dan route handler), `src/lib/db/venue-schema.ts` (atau lanjutan `schema.ts`), komponen desain di `src/components/`, halaman publik `src/app/` (Beranda, `/tentang`, `/fasilitas`, `/galeri`, `/kontak`), halaman admin `src/app/admin/` (venue, paket, fasilitas, galeri, pengaturan), Server Action CRUD admin, dan seed data venue di `scripts/`.
- **Kode diubah**: `src/app/layout.tsx` (font lewat `next/font`), `src/app/globals.css` (token desain), `src/app/page.tsx` (Beranda menggantikan halaman scaffold Next.js), `src/app/login/page.tsx` (restyle dan pesan 429), `src/app/admin/page.tsx` (kerangka admin), `src/modules/auth/helpers.ts` (encode parameter `redirect`).
- **Database**: tabel baru `venue`, `package`, `facility`, `package_facility`, `gallery_item` lewat migrasi Drizzle. Uang disimpan sebagai integer rupiah. Constraint database menegakkan aturan (mis. `package_facility` unik per pasangan, harga non-negatif).
- **Aset**: logo SVG di `public/`; foto venue dan teks asli dari venue, yang belum ada memakai placeholder berlabel. Tidak ada statistik, testimoni, atau data demo fiktif.
- **Routes publik baru**: `/tentang`, `/fasilitas`, `/galeri`, `/kontak`. Rute `/admin/*` baru tetap dilindungi proxy dan helper.
- **Dependencies**: tanpa pustaka UI pihak ketiga (TDR D9). Font lewat `next/font` (bawaan Next.js).
- **Dokumen sumber**: `docs/roadmap.md` bagian Change 2; `docs/business-rules-register.md` BR-18, T-09, T-12, T-16, T-17, T-18; `docs/technical-decision-record.md` D7, D9; `docs/product-backlog.md` E2/E3; `docs/design/ui-spec.md`.

## Keputusan

1. Token dan komponen desain dibangun sekali di change ini, lalu dipakai ulang (TDR D9, `ui-spec.md` bagian 6).
2. Galeri tahap 1 memakai gambar dari `public/` atau URL dengan metadata di database; unggah ke object storage ditunda ke change `deployment` (TDR D7).
3. `setup_days_before` disimpan di paket (BR-18 PROVISIONAL) tetapi **tidak** ditampilkan ke customer; hanya admin melihatnya (T-16).
4. Seed hanya memuat data venue dari handoff, tanpa data demo (T-17).
5. Nomor WhatsApp admin dan kontak disimpan di pengaturan venue dan diisi admin; pesan WhatsApp berupa templat (T-12).
6. "Fasilitas SDA" disimpan dan ditampilkan apa adanya, tidak diuraikan (T-09).
7. Data bisnis tidak dihapus; paket dan item galeri memakai penanda aktif/nonaktif sebagai ganti hapus.

## Pertanyaan Terbuka

1. **Token visual, nama font, dan logo SVG** (roadmap 5.2, WAJIB dari pemilik proyek sebelum Change 2 grup 1). Selama tabel token di `docs/design/ui-spec.md` bagian 2 masih `TBD`, grup pertama berhenti sebagai `[LANGKAH MANUAL]`.
2. **Foto asli venue, teks asli, dan kontak terkonfirmasi** (roadmap 5.2): yang belum ada memakai placeholder berlabel; tidak ada konten fiktif.
3. **T-02 (BR-18 PROVISIONAL)**: apakah setup H-2/H-3 paket memblokir kalender dan masuk harga paket masih menunggu konfirmasi venue. Change ini menyimpan `setup_days_before` dan **tidak** menghitung ketersediaan (itu di `availability-calendar`).
4. **T-09**: arti "Fasilitas SDA" dan harga sewa per hari hari tambahan masih harus dari venue; tidak diuraikan.

## Di luar scope

- Kalender dan mesin ketersediaan tanggal (BR-01, BR-02, BR-03, BR-26, BR-27) — change `availability-calendar`.
- Form pengajuan reservasi, customer, reservasi, pembayaran, nomor booking, dan Bukti Booking.
- Unggah berkas galeri ke object storage (Vercel Blob) — change `deployment`.
- Pembatas laju form publik dan halaman cek status (BR-32) — change `booking-proof`/`reservation-submission`.
- Pembuatan akun staf tambahan (satu akun admin dari seed; T-18).
- Testimoni, statistik fiktif, formulir pesan kontak, ikon sosial tanpa tautan terkonfirmasi, dan fitur apa pun yang tidak ada di register atau `ui-spec.md`.
- Role Owner dan laporan, diskon, refund, multi-venue, payment gateway, chatbot/AI.
