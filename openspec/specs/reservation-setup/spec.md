# reservation-setup Specification

## Purpose

Menyediakan satu catatan setup internal per reservasi agar admin dapat menyimpan kebutuhan persiapan venue tanpa mencampurnya dengan catatan tindak lanjut atau data yang terlihat oleh customer.

## Requirements

### Requirement: Satu catatan setup per reservasi

Sistem SHALL menyimpan paling banyak satu catatan teks setup untuk setiap reservasi. Admin terautentikasi SHALL dapat membuat catatan baru atau memperbarui catatan yang sudah ada; pembaruan SHALL mengganti teks catatan yang lama, bukan menambahkan catatan kedua. Catatan SHALL berupa teks dan SHALL NOT berupa lampiran atau berkas.

**Jejak:** T-14 (PROVISIONAL); US-100; handoff 16; `docs/roadmap.md` Change 9

**PROVISIONAL:** bentuk satu catatan teks per reservasi mengikuti T-14 dan masih menunggu konfirmasi venue.

**GERBANG:** Bila venue meminta banyak catatan atau riwayat versi, requirement ini harus direvisi sebelum implementasi.

#### Scenario: Admin membuat catatan pertama

- **WHEN** admin menyimpan catatan setup pada reservasi yang belum memiliki catatan
- **THEN** satu catatan tersimpan dan ditampilkan pada detail reservasi

#### Scenario: Admin memperbarui catatan yang sudah ada

- **WHEN** admin menyimpan teks baru pada reservasi yang sudah memiliki catatan setup
- **THEN** teks lama diganti dan jumlah catatan tetap satu

#### Scenario: Catatan kedua tidak dibuat

- **WHEN** sistem mencoba menyimpan catatan setup kedua untuk reservasi yang sama
- **THEN** penyimpanan ditolak dan catatan yang sudah ada tidak berubah

#### Scenario: Catatan kosong ditolak

- **WHEN** admin menyimpan catatan setup tanpa teks
- **THEN** sistem menolak penyimpanan dan catatan sebelumnya tetap ada

### Requirement: Catatan setup hanya untuk admin

Catatan setup SHALL hanya dapat dibaca dan diubah oleh admin terautentikasi. Pengguna tanpa sesi SHALL dialihkan ke `/login` sebelum catatan dapat dibaca atau diubah.

**Jejak:** T-14; US-100; NFR-SEC-05 (DISETUJUI); `docs/design/ui-spec.md` 4.2 (Reservasi)

#### Scenario: Admin dapat menyimpan catatan

- **WHEN** admin terautentikasi menyimpan catatan setup
- **THEN** catatan tersimpan dan halaman detail menampilkan teks yang baru

#### Scenario: Pengguna tanpa sesi tidak dapat menyimpan

- **WHEN** pengguna tanpa sesi menjalankan aksi penyimpanan catatan setup
- **THEN** sistem mengalihkan ke `/login` sebelum catatan berubah

### Requirement: Catatan setup tidak mengubah data operasional

Menyimpan atau memperbarui catatan setup SHALL NOT mengubah status reservasi, tanggal acara, kunci tanggal, hari setup paket, pembayaran, atau ketersediaan. Catatan setup SHALL NOT dihitung sebagai aktivitas substantif yang menggeser batas auto-cancel.

**Jejak:** T-14; US-100; BR-17a; BR-02; BR-03; BR-18 (PROVISIONAL)

**PROVISIONAL:** BR-02, BR-03, dan BR-18 tetap berlaku tanpa perubahan; catatan setup bukan hari setup dan tidak memblokir kalender.

**GERBANG:** Perilaku ketersediaan dan setup paket tetap mengikuti `availability-calendar`; change ini tidak boleh mengubah kunci tanggal.

#### Scenario: Status reservasi tidak berubah

- **WHEN** admin menyimpan catatan setup pada reservasi `PENDING`
- **THEN** status tetap `PENDING` dan riwayat status tidak bertambah

#### Scenario: Kunci tanggal tidak berubah

- **WHEN** admin menyimpan catatan setup
- **THEN** tidak ada baris `date_lock` yang ditambah, diubah, atau dihapus

#### Scenario: Batas auto-cancel tidak bergeser

- **WHEN** admin menyimpan catatan setup pada reservasi `PENDING` atau `DITANGGUHKAN`
- **THEN** catatan tidak dihitung sebagai aktivitas substantif dan batas tiga bulan tidak berubah

### Requirement: Catatan setup tidak terekspos ke publik

Catatan setup SHALL NOT ditampilkan pada halaman publik, endpoint ketersediaan, cek status, atau Bukti Booking. Respons yang dapat diakses customer SHALL NOT memuat teks catatan setup.

**Jejak:** T-14; US-100; T-16 (data setup internal tidak ditampilkan ke customer)

#### Scenario: Halaman publik tidak memuat catatan

- **WHEN** customer membuka halaman publik yang terkait reservasi
- **THEN** teks catatan setup tidak muncul pada respons halaman

#### Scenario: Endpoint ketersediaan tidak memuat catatan

- **WHEN** endpoint ketersediaan dipanggil
- **THEN** responsnya tidak memuat catatan setup

#### Scenario: Cek status dan Bukti Booking tidak memuat catatan

- **WHEN** customer membuka cek status atau Bukti Booking
- **THEN** teks catatan setup tidak muncul pada halaman tersebut

### Requirement: Tampilan catatan setup pada detail reservasi admin

Detail reservasi admin SHALL menampilkan catatan setup yang tersimpan dan sarana untuk membuat atau memperbaruinya. Change ini SHALL NOT menambah layar baru.

**Jejak:** US-100; T-14; `docs/design/ui-spec.md` 4.2 (Reservasi)

#### Scenario: Catatan tampil pada detail reservasi

- **WHEN** admin membuka detail reservasi yang memiliki catatan setup
- **THEN** halaman menampilkan teks catatan setup

#### Scenario: Reservasi tanpa catatan menampilkan keadaan kosong

- **WHEN** admin membuka detail reservasi yang belum memiliki catatan setup
- **THEN** halaman menampilkan keadaan kosong dan form untuk menambahkan catatan

#### Scenario: Tidak ada layar baru

- **WHEN** admin membuka area admin setelah change ini
- **THEN** tidak ada menu atau layar baru untuk catatan setup
