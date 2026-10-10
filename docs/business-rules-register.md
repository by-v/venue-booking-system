# Business Rules Register & State Machine
**Sistem Informasi Manajemen Reservasi Gedung, H.A. Djunaid Convention Center**
Versi: 1.1 (draft untuk review) | Tanggal: 10 Oktober 2026
Perubahan v1.1: BR-08 (batas pelunasan H-14), BR-31 (input booking oleh admin) disetujui; T-01 dipersempit menjadi T-01b; T-11 ditambahkan.

## 0. Cara membaca dokumen

**Label status aturan**

| Label | Arti |
|---|---|
| **FINAL** | Diputuskan langsung oleh Anda (handoff atau jawaban diskusi). |
| **FINAL-DEFAULT** | Default dari Technical Partner atas delegasi Anda. Dianggap berlaku kecuali diveto saat review. |
| **PROVISIONAL** | Asumsi kerja yang belum dikonfirmasi venue. Struktur data dibuat agar mudah diubah. |
| **TERBUKA** | Belum diputuskan. Tidak boleh diimplementasikan sebelum ada keputusan (lihat Bagian 5). |

**Konvensi umum**
- Zona waktu semua aturan tanggal: **WIB (Asia/Jakarta)**. Satuan tanggal acara: hari kalender.
- Uang disimpan sebagai **bilangan bulat rupiah**, tanpa desimal.
- "Admin" = role Admin/Staff (satu-satunya role operasional).
- Istilah dokumen customer: **Bukti Booking**. Tidak ada entitas "Invoice" (BR-10).

---

## 1. Business Rules Register

### A. Kalender, tanggal, setup

**BR-01 | Kalender per hari | FINAL**
Satu tanggal = maksimal satu job, berapa pun durasi acara. Paket 2 sesi (Walimah) berlangsung di hari yang sama dan hanya butuh satu tanggal.
*Uji:* dua reservasi DITERIMA untuk tanggal yang sama → yang kedua ditolak. Paket Walimah hanya menyimpan satu tanggal acara.

**BR-02 | Setup standar malam H-1 tidak memblokir | FINAL**
*Uji:* booking A tanggal 20 (paket Full Service). Booking B tanggal 21 tetap bisa dikonfirmasi.

**BR-03 | Hari setup tambahan | FINAL**
Jika persiapan butuh satu hari penuh, hari itu dibooking sebagai hari tambahan dengan harga sewa per hari. Biaya masuk ke total pesanan (BR-06). Nominal harga sewa per hari **belum diketahui**, diinput admin sebagai item biaya.
*Uji:* reservasi dengan hari tambahan 19 Mar untuk acara 20 Mar → tanggal 19 dan 20 terkunci, item biaya hari tambahan ada di total.

**BR-18 | Setup bawaan paket memblokir kalender | PROVISIONAL**
Paket menyimpan `setup_days_before`: Full Service = 0, Full Service Acara Malam = 0, Full Service + Outdoor = 2, Full Service + Walimah & Resepsi = 3. Hari-hari ini sudah termasuk harga paket **dan memblokir kalender** (H-1 sampai H-N dari tanggal acara).
*Catatan:* ini keputusan sementara, perlu dikonfirmasi venue (T-02). Jika venue tidak memblokir, perubahan hanya di fungsi perhitungan tanggal terkunci.
*Uji:* paket Outdoor acara 20 → tanggal 18, 19, 20 terkunci. Booking Full Service tanggal 19 ditolak.

**BR-26 | Validasi tanggal pengajuan | FINAL-DEFAULT**
Tanggal acara pada form harus **setelah hari ini** (WIB). Tanggal lampau ditolak. Batas minimum jarak hari pengajuan **TERBUKA** (T-04), sementara tidak ada batas selain "bukan lampau".
Tanggal acara beserta seluruh tanggal setup bawaan paket yang dipilih harus tidak terkunci booking lain, jika tidak form menolak (karena itu ketersediaan bergantung pada paket, bukan hanya tanggal).
*Uji:* tanggal kemarin ditolak. Paket Walimah pada tanggal yang H-3-nya sudah terkunci ditolak.

**BR-27 | Kalender publik | FINAL-DEFAULT**
Publik hanya melihat **Tersedia / Terisi**. PENDING dan DITANGGUHKAN tidak tampil. Tanggal setup yang terkunci tampil "Terisi". Status "Unavailable" untuk blokir manual admin tidak dibuat (T-08).
*Uji:* reservasi PENDING tidak mengubah tampilan kalender. Setelah DITERIMA, tanggal event dan setup berubah menjadi Terisi.

### B. Harga, total, pembayaran

**BR-29 | Snapshot harga dan item biaya | FINAL-DEFAULT**
Saat form disubmit, harga paket disalin ke reservasi (snapshot). Perubahan harga paket oleh admin tidak memengaruhi reservasi yang sudah ada. Admin dapat menambah item biaya (deskripsi + nominal bulat). Total = harga paket snapshot + seluruh item. **Diskon tidak didukung** (T-05). Admin tidak boleh menetapkan total di bawah jumlah pembayaran terverifikasi.
*Uji:* harga paket naik setelah submit → total reservasi lama tidak berubah.

**BR-06 | Total mencakup seluruh biaya | FINAL**
Seluruh biaya yang dikenakan harus masuk total pesanan, termasuk layanan tambahan, fasilitas tambahan, dan hari setup tambahan.

**BR-07 | Minimum DP 25% | FINAL**
`min_dp = ceil(0.25 × total)` dalam rupiah, dihitung dari total **saat konfirmasi**.
*Uji:* total 20.000.000 → min DP 5.000.000. Total 22.000.001 → min DP 5.500.001 (pembulatan ke atas).

**BR-21 | Pembayaran tercatat vs terverifikasi | FINAL**
Pembayaran dicatat **hanya oleh admin** (customer mengirim bukti via WhatsApp, tidak ada upload di website). Setiap pembayaran punya status verifikasi: `DICATAT`, `TERVERIFIKASI`, `TIDAK_VALID`. Hanya `TERVERIFIKASI` yang dihitung terhadap DP dan pelunasan. Pembayaran tidak pernah dihapus, koreksi dilakukan dengan menandai `TIDAK_VALID` beserta alasan.
*Uji:* pembayaran DICATAT 5.000.000 tidak mengubah payment_status dan tidak memenuhi syarat konfirmasi.

**BR-09 | Tampilan nilai pembayaran | FINAL**
Sistem menampilkan: total, jumlah DP, total pembayaran terverifikasi, dan sisa (`total − terverifikasi`). Pembayaran DICATAT yang belum terverifikasi ditampilkan terpisah.

**BR-20 | Pemisahan status | FINAL-DEFAULT**
- `customer_status`: `CALON`, `CLIENT`.
- `reservation_status`: lihat Bagian 2.
- `payment_status` **diturunkan** dari pembayaran terverifikasi, tidak disimpan manual: `BELUM_DP` jika terverifikasi < min DP; `DP` jika ≥ min DP dan < total; `LUNAS` jika ≥ total.
- `reschedule_count`: 0 atau 1.

(Menyimpang dari handoff yang mengesankan `payment_status` sebagai field biasa. Alasan: mencegah ketidaksinkronan.)
*Uji:* total 20 jt: verifikasi 4 jt → BELUM_DP; 5 jt → DP; 20 jt → LUNAS.

**BR-08 | Batas pelunasan H-2 minggu | FINAL (batas hari: FINAL-DEFAULT; konsekuensi rinci: TERBUKA, T-01b)**
Pelunasan wajib selesai paling lambat **14 hari sebelum tanggal acara**. Menggantikan "H-1 hari" dan "H-1 bulan" pada versi sebelumnya.
- `payment_due_date = tanggal acara − 14 hari` (WIB), **diturunkan** dari tanggal acara terkini, tidak disimpan manual. Setelah reschedule, batas ikut berubah.
- Batas bersifat inklusif: lunas pada `payment_due_date` masih tepat waktu. Terlambat mulai hari berikutnya.
- Konsekuensi yang diputuskan: reservasi yang belum LUNAS setelah batas **dibatalkan**.
- Rincian eksekusi pembatalan **belum diputuskan** (T-01b). Sampai ada keputusan, sistem hanya menampilkan `payment_due_date` dan menandai `pelunasan_terlambat`, dan **tidak** mengubah status, membebaskan tanggal, atau menetapkan DP hangus karena pelunasan.
*Uji:* acara 30 Mar → batas pelunasan 16 Mar. Lunas 16 Mar → tepat waktu. Belum lunas 17 Mar → `pelunasan_terlambat`. Acara 1 Mar (tahun biasa) → batas 15 Feb.

### C. Konfirmasi, konflik, pembatalan

**BR-22 | Syarat konfirmasi dan penguncian tanggal | FINAL**
Admin dapat mengubah PENDING/DITANGGUHKAN → DITERIMA hanya jika **semua** terpenuhi:
1. pembayaran TERVERIFIKASI ≥ `min_dp` (BR-07);
2. tanggal acara dan seluruh tanggal setup (BR-18, BR-03) belum terkunci booking lain;
3. tindakan dilakukan admin.

Konfirmasi bersifat **atomik**: kunci seluruh tanggal, ubah status, terbitkan nomor booking, ubah customer CALON → CLIENT, semuanya berhasil atau semuanya batal. Penolakan karena tanggal terkunci harus dijamin di level database, bukan hanya validasi aplikasi.
Jika total berubah setelah konfirmasi, tanggal **tidak** terbuka kembali, hanya sisa pembayaran yang berubah.
*Uji:* DP terverifikasi 4,9 jt dari total 20 jt → konfirmasi ditolak. Dua admin konfirmasi dua reservasi bentrok bersamaan → tepat satu berhasil.

**BR-04 | Konflik tanggal: yang membayar lebih dulu | FINAL**
PENDING tidak mengunci dan tidak menjadi milik customer. Tanggal dimiliki reservasi yang **pembayarannya terverifikasi dan terkonfirmasi lebih dulu**. Saat admin mengonfirmasi, sistem menampilkan reservasi lain pada tanggal yang sama yang sudah punya pembayaran tercatat, agar admin dapat menilai urutan pembayaran. Penegakan akhir: konfirmasi pertama yang berhasil memperoleh tanggal.

**BR-28 | Reservasi pending lain saat satu dikonfirmasi | FINAL**
Reservasi PENDING/DITANGGUHKAN lain pada tanggal yang sama **tidak diubah otomatis**. Admin menanganinya manual. Penandaan "bentrok" di dashboard adalah backlog opsional.

**BR-16 | Pembatalan sepihak oleh customer | FINAL**
Pembatalan sepihak oleh customer → **DP hangus**. Sistem hanya mencatat penandaan `dp_forfeited = true`. Tidak ada aturan refund atau konsekuensi keuangan lain (belum diputuskan).

**BR-23 | Pembatalan reservasi DITERIMA | FINAL-DEFAULT**
Hanya admin yang mencatat pembatalan di sistem (customer tidak membatalkan sendiri). Pihak pembatal dicatat. Saat ini hanya `CUSTOMER` yang didefinisikan; pembatalan oleh pihak venue **tidak diasumsikan** (T-07). Setelah DIBATALKAN, seluruh tanggal event dan setup dibebaskan. Nomor booking tidak dipakai ulang.
*Uji:* setelah pembatalan, tanggal muncul sebagai Tersedia dan dapat dikonfirmasi reservasi lain.

**BR-12 | Data tidak dihapus | FINAL**
Pembatalan dan auto-cancel hanya mengubah status. Reservasi, riwayat status, dan riwayat pembayaran tidak dihapus oleh sistem.

### D. Auto-cancel dan SELESAI

**BR-17 | Auto-cancel | FINAL**
Cakupan: hanya status `PENDING` dan `DITANGGUHKAN`. `DITERIMA` dan status akhir tidak terkena.

*Pemicu A (tidak ada aktivitas):* tidak ada aktivitas substantif tercatat selama **3 bulan kalender** sejak aktivitas substantif terakhir. Tanggal batas = tanggal aktivitas terakhir + 3 bulan; jika tanggal itu tidak ada pada bulan tujuan, dipakai hari terakhir bulan tersebut. Reservasi menjadi kandidat pada hari batas (WIB).

*Pemicu B (tanggal acara lewat):* tanggal acara sudah terlewati. Reservasi menjadi kandidat mulai **hari kalender berikutnya** setelah tanggal acara.

*Hasil untuk kandidat:*
- Tanpa pembayaran tercatat (status apa pun) → `AUTO_CANCELLED`, alasan `INACTIVITY_3M` atau `EVENT_DATE_PASSED`.
- Dengan pembayaran tercatat (DICATAT atau TERVERIFIKASI) → **tidak dibatalkan otomatis**. Reservasi diberi penanda `perlu_pemeriksaan_admin`. Admin memutuskan manual (BR-24 tetap mencatat).
- Pemeriksaan dijalankan job terjadwal **harian**, WIB.

*Pembuatan aktivitas pertama:* pengajuan form = aktivitas substantif pertama.

*Uji:*
1. Pengajuan 1 Jan tanpa aktivitas → kandidat 1 Apr.
2. Pengajuan 30 Nov, tanpa aktivitas → kandidat 28 Feb (atau 29 Feb tahun kabisat).
3. Pengajuan 1 Jan, catatan tindak lanjut 20 Feb → kandidat 20 Mei.
4. Acara 15 Feb, status PENDING → kandidat 16 Feb meski belum 3 bulan.
5. Acara 15 Feb, PENDING dengan pembayaran DICATAT → tidak dibatalkan, ditandai.
6. BK-A dan BK-B milik customer yang sama → timer terpisah.
7. Status DITERIMA tidak tersentuh job.

**BR-17a | Definisi aktivitas substantif | FINAL (daftar field: FINAL-DEFAULT)**
*Mereset timer:*
- perubahan status;
- catatan tindak lanjut yang relevan (setiap entri catatan bertipe, misalnya "kontak WhatsApp", "catatan internal");
- perubahan data booking yang substantif (default: tanggal acara, paket, item biaya/total, jenis acara, kontak customer);
- komunikasi customer/admin **yang dicatat di sistem**;
- pencatatan pembayaran.

*Tidak mereset:*
- dilihat atau dibuka;
- koreksi teknis (typo) dan perubahan catatan non-substantif: admin menandai edit sebagai "koreksi teknis";
- proses sistem (job auto-cancel);
- submit ulang oleh customer (reservasi baru, timer sendiri, tidak memengaruhi reservasi lama).

*Konsekuensi yang diterima:* komunikasi WhatsApp tidak terlihat sistem. Jika admin berkomunikasi tetapi tidak mencatat, reservasi tetap bisa batal otomatis. Admin yang rutin menambah catatan dapat menahan reservasi di luar 3 bulan, batas mutlak hanya tanggal acara (Pemicu B). Setiap aktivitas tercatat di riwayat (siapa, kapan, apa) sehingga penahanan panjang terlihat.

**BR-13 | Status SELESAI | FINAL (rincian: FINAL-DEFAULT)**
Hanya untuk reservasi DITERIMA. Otomatis menjadi SELESAI pada hari kalender setelah tanggal acara (WIB), dan admin dapat menandainya manual setelah tanggal acara. Jika sisa pembayaran masih > 0 saat SELESAI, ditandai `perlu_pemeriksaan_admin` (tidak mengubah status).
*Uji:* acara 15 Feb, DITERIMA → SELESAI pada 16 Feb. Status PENDING tidak pernah menjadi SELESAI.

### E. Reschedule

**BR-15 | Reschedule | FINAL (rincian: FINAL-DEFAULT)**
- Hanya reservasi **DITERIMA**, maksimal **1 kali** (`reschedule_count` < 1).
- Customer meminta lewat WhatsApp. **Admin yang menginput** dan mengeksekusi di sistem (tidak ada form reschedule publik).
- Batas: tanggal permintaan (WIB) ≤ **tanggal acara lama − 1 bulan kalender**.
- Tanggal baru beserta tanggal setup paket harus tersedia. Jika tidak → ditolak.
- Eksekusi atomik: kunci tanggal baru, bebaskan tanggal lama, `reschedule_count = 1`, riwayat disimpan. Nomor booking **tidak berubah**. Status tetap DITERIMA.
- Reschedule yang ditolak (melewati batas atau tanggal baru terisi) **tidak** menghabiskan jatah.
- Melewati batas H-1 bulan: ditolak, tanggal lama tetap, **tidak** otomatis menjadi pembatalan.

*Uji:* acara 20 Mar, permintaan 20 Feb → boleh. Permintaan 21 Feb → ditolak. count = 1 → ditolak. Tanggal baru terkunci → ditolak, count tetap 0.

### F. Identitas, dokumen, akses

**BR-19 | Identitas reservasi | FINAL**
- **ID reservasi internal**: dibuat saat form disubmit, hanya terlihat admin.
- **Nomor booking**: `HADCC-<tahun>-<urut>`, dibuat **hanya** saat status menjadi DITERIMA, unik, tidak berubah setelah terbit, tidak dipakai ulang.

**BR-11 | Format nomor booking | FINAL (format rinci: FINAL-DEFAULT)**
`HADCC-<tahun konfirmasi (WIB)>-<urut 4 digit>`, urutan reset tiap tahun (`HADCC-2026-0001`, `HADCC-2027-0001`). Penerbitan harus aman dari duplikat (counter per tahun dengan penguncian). Jika urutan melebihi 9999 pada satu tahun, lebar digit bertambah.

**BR-10 | Bukti Booking | FINAL (rincian: FINAL-DEFAULT)**
Satu-satunya dokumen untuk customer. Isi: nomor booking, nama customer, tanggal acara, paket/jenis acara, durasi, fasilitas paket, total, DP, pembayaran terverifikasi, sisa, status pembayaran, status booking. Isi mengikuti **data terkini** dengan keterangan waktu cetak. Format keluaran (PDF atau halaman) diputuskan di desain.

**BR-05 | Cek status | FINAL**
Hanya lewat nomor booking. Status tidak ditampilkan publik. Konsekuensi: customer PENDING/DITANGGUHKAN tidak punya sarana cek status di sistem dan menanyakan via WhatsApp (tidak ada kode pengajuan terpisah).

**BR-32 | Perlindungan cek status | FINAL-DEFAULT**
Nomor berurutan mudah ditebak, maka: rate limiting, pesan galat yang tidak membedakan "tidak ada" dan "salah", dan data yang tampil minimal (nama disamarkan). Faktor verifikasi tambahan (misalnya 4 digit akhir kontak) **tidak** ditambahkan tanpa persetujuan.

**BR-14 | Peran | FINAL**
Satu role operasional: Admin/Staff. Owner tidak memiliki akun. Laporan untuk Owner adalah backlog yang butuh persetujuan eksplisit (T-06).

**BR-25 | Customer | FINAL-DEFAULT**
Satu record customer per nomor WhatsApp. Submit ulang dengan nomor sama menambah reservasi baru pada customer yang sama. Penandaan duplikat tidak dibuat. `CALON` menjadi `CLIENT` saat reservasi pertamanya DITERIMA dan tidak kembali ke CALON.

**BR-24 | Pencatatan perubahan | FINAL**
Setiap perubahan status (manual maupun otomatis) mencatat: waktu, status sebelumnya, status baru, alasan, pelaku (user admin atau `SYSTEM`). Tersedia juga riwayat aktivitas (BR-17a) dan riwayat pembayaran.

**BR-30 | Status akhir | FINAL-DEFAULT**
`DIBATALKAN`, `AUTO_CANCELLED`, `SELESAI` (dan `DITOLAK` jika disetujui) tidak dapat dibuka kembali. Pengajuan ulang = reservasi baru.

**BR-31 | Reservasi diinput langsung oleh admin | FINAL (rincian: TERBUKA, T-11)**
Admin dapat membuat reservasi/booking langsung tanpa form publik, termasuk mencatat **booking lama** yang selama ini ditandai manual (tanggal dilingkari) agar kalender akurat sejak awal. Sumber data dicatat (`FORM_PUBLIK` atau `INPUT_ADMIN`), sehingga reservasi hasil input admin dapat dibedakan di laporan penelitian.
Reservasi hasil input admin tetap tunduk pada BR-01, BR-18, dan BR-22 (tidak boleh ada tanggal ganda). Rincian aturan untuk booking lama ada di T-11.
*Uji:* booking lama untuk 12 Des yang diinput admin membuat 12 Des tampil Terisi di kalender publik. Input kedua untuk 12 Des ditolak.

---

## 2. State Machine Reservasi

**Status:** `PENDING`, `DITANGGUHKAN`, `DITERIMA`, `DIBATALKAN`, `AUTO_CANCELLED`, `SELESAI`. Usulan: `DITOLAK` (lihat Bagian 4).

| # | Dari → Ke | Pelaku | Syarat (guard) | Efek |
|---|---|---|---|---|
| T1 | (baru) → PENDING | Customer | Validasi form, tanggal lolos BR-26 | Buat/temukan customer (CALON), ID internal, snapshot harga, aktivitas pertama. Buka WhatsApp admin. Tanggal **tidak** terkunci. |
| T2 | PENDING → DITANGGUHKAN | Admin | Alasan wajib | Catat riwayat, reset timer. |
| T3 | PENDING / DITANGGUHKAN → DITERIMA | Admin | BR-22 | Kunci tanggal, nomor booking, CLIENT, Bukti Booking tersedia. |
| T4 | PENDING / DITANGGUHKAN → DIBATALKAN | Admin | Alasan wajib | Tidak ada tanggal yang perlu dibebaskan. |
| T5 | PENDING / DITANGGUHKAN → AUTO_CANCELLED | SYSTEM | BR-17, tanpa pembayaran tercatat | Alasan `INACTIVITY_3M` atau `EVENT_DATE_PASSED`. |
| T6 | DITERIMA → DIBATALKAN | Admin | Pihak pembatal dicatat (BR-23) | Bebaskan tanggal. Jika pihak = CUSTOMER → `dp_forfeited = true`. |
| T7 | DITERIMA → SELESAI | SYSTEM atau Admin | Setelah tanggal acara (BR-13) | Tanggal tetap tercatat sebagai riwayat. |
| T8 | DITERIMA → DITERIMA (reschedule) | Admin | BR-15 | Pindah kunci tanggal, `reschedule_count = 1`. Bukan perubahan status, tetapi tercatat di riwayat. |
| T9 | DITANGGUHKAN → PENDING | — | **Tidak diizinkan** (default) | DITANGGUHKAN dapat langsung ke DITERIMA, DIBATALKAN, atau AUTO_CANCELLED. |
| T10 | DITERIMA → DIBATALKAN (pelunasan terlambat) | **Belum ditetapkan** (T-01b) | `payment_due_date` terlewati dan belum LUNAS | **Belum diaktifkan.** Hanya penanda `pelunasan_terlambat` yang aktif. |
| T11 | (baru) → PENDING atau DITERIMA | Admin | BR-31 dan guard terkait | Reservasi input admin. Bila langsung DITERIMA berlaku BR-22 (rincian booking lama: T-11). |

Transisi lain, termasuk dari status akhir, **tidak diizinkan**.

```
                 T2
   (form) T1  ┌──────────┐
      ▼       ▼          │
   PENDING ──────► DITANGGUHKAN
      │  │  │          │  │  │
      │  │  └─T5──┐ ┌──T5┘  │
      │  T4        ▼ ▼       T4
      │  └──► AUTO_CANCELLED ◄┘ (via T5)
      │           DIBATALKAN ◄──(T4)
      T3                       ▲
      └──────► DITERIMA ──T6───┘
                  │ ▲
                  │ └─T8 (reschedule, status tetap)
                  └─T7──► SELESAI
```

## 3. State Machine Pembayaran

**Catatan pembayaran (`verification_status`):** `DICATAT → TERVERIFIKASI` (admin), `DICATAT → TIDAK_VALID` (admin, alasan wajib). `TERVERIFIKASI → TIDAK_VALID` hanya dengan alasan tertulis dan tercatat di riwayat (koreksi kesalahan). Tidak ada penghapusan.

**`payment_status` reservasi (diturunkan, BR-20):** `BELUM_DP → DP → LUNAS` mengikuti jumlah TERVERIFIKASI. Karena diturunkan, status dapat turun bila pembayaran dinyatakan TIDAK_VALID. Hal itu **tidak** otomatis membuka kembali tanggal. Reservasi ditandai `perlu_pemeriksaan_admin`.

---

## 4. Usulan Status DITOLAK (belum final, perlu keputusan eksplisit)

| Aspek | `DITOLAK` (usulan) | `DIBATALKAN` |
|---|---|---|
| Makna | Venue menolak pengajuan | Proses dihentikan karena mundurnya customer, tidak ada kesepakatan, atau pembatalan setelah DITERIMA |
| Dari status | PENDING, DITANGGUHKAN | PENDING, DITANGGUHKAN, DITERIMA |
| Efek DP | Tidak ada | DP hangus hanya bila pihak pembatal = customer pada DITERIMA (BR-16) |
| Tanggal | Tidak ada kunci | Dibebaskan bila dari DITERIMA |

**Transisi tambahan jika disetujui:** `PENDING → DITOLAK`, `DITANGGUHKAN → DITOLAK` (admin, alasan wajib, tanpa pembayaran terverifikasi).

**Opsi A:** tambahkan `DITOLAK` sebagai status.
**Opsi B (rekomendasi):** tidak menambah status. Gunakan `DIBATALKAN` dengan kode alasan `DITOLAK_VENUE` atau `MUNDUR_CUSTOMER`. Alasan: state machine lebih sederhana, dan pelaporan penelitian tetap bisa memisahkan keduanya lewat alasan.
Selama belum diputuskan, implementasi menyiapkan enum status yang dapat diperluas dan **tidak** membuat transisi DITOLAK.

---

## 5. Daftar TERBUKA

| ID | Isu | Mengapa terbuka | Dampak bila belum diputuskan |
|---|---|---|---|
| **T-01b** | **Eksekusi pembatalan karena pelunasan terlambat** | Batas sudah final (H-14, BR-08), tetapi belum diputuskan: (1) otomatis oleh sistem atau dieksekusi admin setelah ditandai; (2) apakah DP hangus; (3) status hasil: DIBATALKAN dengan alasan `PELUNASAN_TERLAMBAT` atau status/alasan lain; (4) booking yang dikonfirmasi kurang dari 14 hari sebelum acara (batas sudah lewat saat konfirmasi) dan reschedule ke tanggal kurang dari 14 hari dari sekarang. | Hanya menahan change `payment-deadline`. Penanda `pelunasan_terlambat` tetap dibuat. |
| T-02 | Setup H-2/H-3 paket memblokir kalender dan masuk harga paket? | Asumsi PROVISIONAL (BR-18). | Perlu konfirmasi venue sebelum seed data paket. |
| ~~T-03~~ | Admin input booking langsung dan booking lama | **Disetujui** → BR-31 | Rincian di T-11 |
| T-11 | Rincian input booking lama oleh admin: (1) apakah booking lama harus memenuhi syarat DP 25% terverifikasi atau boleh dicatat dengan pembayaran historis; (2) apakah booking lama mendapat nomor booking `HADCC`, dan tahunnya; (3) apakah booking lama yang acaranya sudah lewat dicatat sebagai SELESAI | Tidak ada data tentang bentuk catatan manual venue saat ini | Hanya menahan bagian booking lama dari change `reservation-management`. |
| T-04 | Batas minimum jarak hari pengajuan | Belum ada data venue | Hanya tanggal lampau yang ditolak. |
| T-05 | Diskon / harga hasil negosiasi | Tidak ada keputusan | Total hanya paket + item. |
| T-06 | Laporan untuk Owner | Role Owner ditolak, laporan belum dibahas | Tidak dibuat. |
| T-07 | Pembatalan oleh pihak venue | Handoff belum mengatur | Hanya pembatalan oleh customer yang bisa dicatat dengan akibat DP hangus. |
| T-08 | Blokir tanggal manual oleh admin (acara internal, perawatan) | Status "Unavailable" di handoff bersifat opsional | Tidak dibuat. |
| T-09 | Arti "Fasilitas SDA", harga sewa per hari, contoh nota manual | Harus dari venue | Tampilkan teks "Fasilitas SDA" apa adanya. Jangan diuraikan. |
| T-10 | DITOLAK (Bagian 4) | Menunggu keputusan | Enum status dibuat extensible. |

---

## 6. Dampak ke desain (input untuk ERD dan OpenSpec, belum mengikat stack)

1. Tabel kunci tanggal dengan tanggal unik (penjaga BR-01 dan BR-22 di level database).
2. Satu reservasi, banyak tanggal terkunci (event, setup paket, setup tambahan).
3. Item biaya snapshot (paket + tambahan), pembayaran banyak baris, `payment_status` diturunkan.
4. Counter nomor booking per tahun dengan penguncian.
5. Riwayat status dan riwayat aktivitas (sumber timer auto-cancel).
6. Scheduled job harian (WIB) untuk auto-cancel dan auto-SELESAI. Ini menjadi kriteria pemilihan hosting.
7. Konfirmasi dan reschedule dalam satu transaksi database. Database harus mendukung transaksi dan constraint unik.

## 7. Usulan pemecahan OpenSpec change

`foundation-auth` → `venue-content` → `availability-calendar` → `reservation-submission` → `reservation-management` (termasuk input admin, BR-31) → `booking-proof` (nomor booking, Bukti Booking, cek status) → `reschedule` → `auto-cancel-and-completion` → `venue-setup-internal` → `payment-deadline` (batas H-14 final, eksekusi pembatalan menunggu T-01b).
