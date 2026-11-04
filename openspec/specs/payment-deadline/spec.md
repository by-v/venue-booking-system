# payment-deadline Specification

## Purpose

Menampilkan batas pelunasan H-14 dan penanda keterlambatan kepada admin, serta menyediakan pembatalan oleh admin untuk reservasi `DITERIMA` yang melewati batas pelunasan tanpa mengubah status secara otomatis.

## Requirements

### Requirement: Batas pelunasan default diturunkan dari tanggal acara

Sistem SHALL memakai `payment_due_date` default sebesar tanggal acara reservasi dikurangi 14 hari kalender. Nilai default SHALL dihitung ulang dari tanggal acara terkini setiap kali dibaca. Admin SHALL dapat menetapkan batas manual yang disimpan sebagai override; bila override kosong, sistem SHALL kembali memakai default H-14. Tanggal aturan SHALL mengikuti WIB.

**Jejak:** BR-08; US-110; `docs/roadmap.md` Change 10; permintaan pemilik proyek 4 Nov 2026

#### Scenario: Acara 30 Maret memiliki batas default 16 Maret

- **WHEN** tanggal acara reservasi adalah 30 Maret 2026 dan tidak ada override
- **THEN** `payment_due_date` adalah 16 Maret 2026

#### Scenario: Batas melewati awal bulan

- **WHEN** tanggal acara reservasi adalah 1 Maret 2026
- **THEN** `payment_due_date` default adalah 15 Februari 2026

#### Scenario: Batas default mengikuti tanggal acara setelah reschedule

- **WHEN** tanggal acara berubah dari 30 Maret 2026 menjadi 10 April 2026 dan tidak ada override
- **THEN** `payment_due_date` berubah menjadi 27 Maret 2026 tanpa nilai lama tersimpan

#### Scenario: Override manual dipertahankan setelah reschedule

- **WHEN** admin menetapkan batas manual dan tanggal acara kemudian dipindahkan ke tanggal yang tetap sama dengan atau setelah batas manual
- **THEN** `payment_due_date` tetap memakai batas manual sampai admin mengubah atau mengosongkannya

#### Scenario: Override manual yang menjadi tidak valid dikembalikan ke default

- **WHEN** tanggal acara dipindahkan ke tanggal yang lebih awal dari batas manual
- **THEN** sistem menghapus override dan memakai kembali default H-14 dari tanggal acara baru

### Requirement: Admin dapat menyesuaikan batas pelunasan

Admin terautentikasi SHALL dapat menetapkan atau mengosongkan `payment_due_date` manual pada detail reservasi yang belum berstatus akhir. Batas manual SHALL berupa tanggal valid dan SHALL NOT melewati tanggal acara. Menyimpan batas manual SHALL mencatat aktivitas `DATA_UPDATED` dan SHALL NOT mengubah status reservasi, pembayaran, kunci tanggal, atau ketersediaan.

**Jejak:** BR-08; BR-17a; US-110; permintaan pemilik proyek 4 Nov 2026

#### Scenario: Admin memperpanjang batas pelunasan

- **WHEN** admin menetapkan batas manual 25 Maret 2026 untuk acara 30 Maret 2026
- **THEN** detail menampilkan 25 Maret 2026 sebagai batas pelunasan dan penanda dihitung dari tanggal itu

#### Scenario: Batas manual melewati tanggal acara ditolak

- **WHEN** admin menetapkan batas 1 April 2026 untuk acara 30 Maret 2026
- **THEN** sistem menolak perubahan dan batas sebelumnya tidak berubah

#### Scenario: Mengosongkan batas manual mengembalikan default

- **WHEN** admin mengosongkan batas manual
- **THEN** sistem memakai kembali default H-14 dari tanggal acara

### Requirement: Batas pelunasan inklusif dan penanda keterlambatan

Sistem SHALL menganggap pembayaran tepat waktu sampai dan termasuk `payment_due_date`. Sistem SHALL menandai `pelunasan_terlambat` ketika tanggal hari ini WIB lebih besar dari `payment_due_date` dan status pembayaran reservasi bukan `LUNAS`. Reservasi berstatus pembayaran `LUNAS` SHALL NOT ditandai terlambat.

**Jejak:** BR-08; BR-20; T-01b (FINAL); US-110

**GERBANG:** Penanda ini tetap hanya informasi sampai admin menjalankan pembatalan pelunasan terlambat secara eksplisit. Sistem SHALL NOT membatalkan reservasi secara otomatis karena keterlambatan pelunasan.

#### Scenario: Lunas pada batas masih tepat waktu

- **WHEN** `payment_due_date` adalah 16 Maret 2026, status pembayaran `LUNAS`, dan hari ini 16 Maret 2026
- **THEN** reservasi tidak ditandai `pelunasan_terlambat`

#### Scenario: Belum lunas pada batas belum terlambat

- **WHEN** `payment_due_date` adalah 16 Maret 2026, status pembayaran `DP`, dan hari ini 16 Maret 2026
- **THEN** reservasi belum ditandai `pelunasan_terlambat`

#### Scenario: Belum lunas sehari setelah batas ditandai terlambat

- **WHEN** `payment_due_date` adalah 16 Maret 2026, status pembayaran `DP`, dan hari ini 17 Maret 2026
- **THEN** reservasi ditandai `pelunasan_terlambat`

#### Scenario: Reservasi lunas tidak ditandai terlambat

- **WHEN** status pembayaran reservasi `LUNAS` dan hari ini sudah melewati `payment_due_date`
- **THEN** reservasi tidak ditandai `pelunasan_terlambat`

#### Scenario: Reschedule dapat menggeser penanda

- **WHEN** tanggal acara dipindahkan ke tanggal yang membuat `payment_due_date` baru belum lewat
- **THEN** penanda `pelunasan_terlambat` dihitung ulang dan tidak lagi aktif

### Requirement: Pembatalan pelunasan terlambat dijalankan admin

Admin terautentikasi SHALL dapat membatalkan reservasi berstatus `DITERIMA` yang batas pelunasan efektifnya sudah terlewati. Aksi SHALL hanya tersedia setelah tanggal hari ini WIB lebih besar dari `payment_due_date` efektif. Pembatalan SHALL mengubah status menjadi `DIBATALKAN`, mencatat kode alasan `PELUNASAN_TERLAMBAT`, membebaskan seluruh kunci tanggal acara dan setup, mempertahankan nomor booking, serta mencatat riwayat status dan aktivitas `STATUS_CHANGE`. Sistem SHALL NOT menjalankan pembatalan ini secara otomatis.

**Jejak:** BR-08; BR-12; BR-23; BR-24; T-01b (FINAL); T10; US-110

#### Scenario: Admin membatalkan karena pelunasan terlambat

- **WHEN** admin membatalkan reservasi `DITERIMA` setelah batas pelunasan terlewati dengan alasan wajib
- **THEN** status menjadi `DIBATALKAN`, riwayat mencatat `PELUNASAN_TERLAMBAT`, dan seluruh kunci tanggal dibebaskan

#### Scenario: Nomor booking dipertahankan

- **WHEN** reservasi `DITERIMA` yang memiliki nomor booking dibatalkan karena pelunasan terlambat
- **THEN** nomor booking tetap tersimpan dan tidak diterbitkan ulang

#### Scenario: Belum melewati batas ditolak

- **WHEN** admin mencoba membatalkan karena pelunasan terlambat pada hari yang sama dengan atau sebelum batas pelunasan
- **THEN** sistem menolak dengan `PAYMENT_DEADLINE_NOT_PASSED` dan tidak mengubah data

#### Scenario: Status selain DITERIMA ditolak

- **WHEN** aksi dijalankan pada reservasi `PENDING`, `DITANGGUHKAN`, `DIBATALKAN`, `AUTO_CANCELLED`, atau `SELESAI`
- **THEN** sistem menolak dengan `INVALID_STATE` dan tidak mengubah data

#### Scenario: Reservasi LUNAS tidak dapat dibatalkan sebagai pelunasan terlambat

- **WHEN** status pembayaran reservasi sudah `LUNAS`
- **THEN** sistem menolak dengan `PAYMENT_ALREADY_SETTLED`

#### Scenario: Tidak ada pembatalan otomatis

- **WHEN** reservasi `DITERIMA` melewati batas pelunasan dan admin tidak menjalankan aksi
- **THEN** status, tanggal, dan DP tidak berubah

### Requirement: Akibat DP dipilih admin secara eksplisit

Pembatalan pelunasan terlambat SHALL mewajibkan admin memilih akibat DP: `HANGUS` atau `TIDAK_HANGUS`. DP terverifikasi SHALL NOT otomatis menghanguskan DP dan SHALL NOT memblokir pembatalan. Nilai pilihan SHALL disimpan pada `dp_forfeited`.

**Jejak:** BR-08; BR-16; T-01b (FINAL); US-110

#### Scenario: Admin memilih DP hangus

- **WHEN** admin memilih `HANGUS` saat membatalkan karena pelunasan terlambat
- **THEN** `dp_forfeited` bernilai benar

#### Scenario: Admin memilih DP tidak hangus

- **WHEN** admin memilih `TIDAK_HANGUS` saat membatalkan karena pelunasan terlambat
- **THEN** `dp_forfeited` bernilai salah

#### Scenario: Pilihan DP wajib

- **WHEN** admin mengirim pembatalan tanpa pilihan akibat DP yang valid
- **THEN** sistem menolak input dan tidak membatalkan reservasi

### Requirement: Batas pelunasan pengganti untuk booking mendadak

Saat konfirmasi, reschedule, atau perubahan tanggal acara menghasilkan batas pelunasan efektif yang sudah lewat dan tidak ada override yang masih berlaku, sistem SHALL menetapkan batas manual pengganti sebesar `min(tanggal acara, hari ini + 3 hari)`. Admin SHALL tetap dapat mengubah atau mengosongkan batas tersebut melalui pengaturan batas pelunasan manual.

**Jejak:** BR-08; BR-15; T-01b (FINAL); US-110

#### Scenario: Konfirmasi kurang dari 14 hari sebelum acara

- **WHEN** admin mengonfirmasi reservasi untuk acara 10 hari lagi tanpa override
- **THEN** batas pelunasan disimpan sebagai hari ini + 3 hari

#### Scenario: Acara kurang dari tiga hari lagi

- **WHEN** admin mengonfirmasi reservasi untuk acara 2 hari lagi
- **THEN** batas pelunasan disimpan sebesar tanggal acara

#### Scenario: Reschedule ke tanggal mendadak

- **WHEN** admin memindahkan acara ke tanggal yang membuat default H-14 sudah lewat
- **THEN** batas pelunasan pengganti ditetapkan dan dapat diubah admin kemudian

### Requirement: Batas pelunasan tampil pada detail reservasi admin

Detail reservasi admin SHALL menampilkan `payment_due_date` dan, bila berlaku, penanda `pelunasan_terlambat` pada ringkasan pembayaran yang sudah ada. Change ini SHALL NOT menambah layar, menu, atau widget dashboard baru.

**Jejak:** BR-08; US-110; `docs/design/ui-spec.md` 4.2 (Reservasi)

#### Scenario: Admin melihat batas pelunasan

- **WHEN** admin membuka detail reservasi
- **THEN** halaman menampilkan tanggal batas pelunasan efektif, yaitu override admin bila ada atau default yang diturunkan dari tanggal acara

#### Scenario: Admin melihat penanda keterlambatan

- **WHEN** admin membuka detail reservasi yang belum lunas dan sudah melewati batas pelunasan
- **THEN** ringkasan pembayaran menampilkan penanda `pelunasan_terlambat`

#### Scenario: Tidak ada layar baru

- **WHEN** admin membuka area admin setelah change ini
- **THEN** tidak ada menu atau layar baru untuk batas pelunasan

### Requirement: Batas pelunasan tidak mengubah data operasional secara otomatis

Menghitung atau menampilkan batas pelunasan SHALL NOT mengubah status reservasi, pembayaran, `date_lock`, ketersediaan, atau batas auto-cancel. Perubahan hanya terjadi bila admin secara eksplisit menjalankan aksi pembatalan pelunasan terlambat atau menyimpan batas manual.

**Jejak:** BR-08; BR-17a; BR-24; T-01b (FINAL)

#### Scenario: Membuka detail tidak mengubah status

- **WHEN** admin membuka detail reservasi yang sudah melewati batas pelunasan
- **THEN** status reservasi dan riwayat status tidak berubah

#### Scenario: Tidak ada pembatalan otomatis

- **WHEN** reservasi belum lunas melewati `payment_due_date` dan admin tidak menjalankan aksi
- **THEN** sistem tidak mengubah status, tidak membebaskan tanggal, dan tidak menandai DP hangus

#### Scenario: Tidak ada perubahan pembayaran atau kunci tanggal saat menampilkan

- **WHEN** batas pelunasan ditampilkan
- **THEN** tidak ada baris `payment` atau `date_lock` yang ditambah, diubah, atau dihapus

### Requirement: Batas pelunasan hanya untuk admin

Batas pelunasan dan penanda keterlambatan SHALL NOT ditampilkan pada halaman publik, cek status, atau Bukti Booking. Respons yang dapat diakses customer SHALL NOT memuat nilai tersebut.

**Jejak:** BR-05; BR-10; US-070; US-110

#### Scenario: Cek status tidak memuat batas pelunasan

- **WHEN** customer membuka cek status
- **THEN** halaman tidak menampilkan `payment_due_date` atau penanda keterlambatan

#### Scenario: Bukti Booking tidak memuat batas pelunasan

- **WHEN** customer membuka atau mencetak Bukti Booking
- **THEN** dokumen tidak memuat `payment_due_date` atau penanda keterlambatan
