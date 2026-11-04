# Spec Delta

## Purpose

Menentukan tanggal yang terkunci dan ketersediaan per paket, lalu menyajikannya sebagai kalender publik Tersedia/Terisi/Dipilih serta kalender admin baca-saja yang membedakan kunci acara dan setup.

## ADDED Requirements

### Requirement: Satu tanggal hanya boleh memiliki satu kunci

Sistem SHALL menyimpan kunci tanggal pada tabel `date_lock` dengan tanggal yang unik, sehingga dua reservasi tidak dapat memakai tanggal yang sama berapa pun durasi acaranya. Setiap kunci SHALL memiliki jenis `EVENT` atau `SETUP`; jenis lain SHALL ditolak oleh database.

**Jejak:** BR-01, BR-22; US-032; `docs/roadmap.md` bagian 3 (tabel `date_lock`)

#### Scenario: Dua kunci pada tanggal yang sama ditolak

- **WHEN** tersimpan kunci `EVENT` untuk tanggal 2027-03-20
- **THEN** penyimpanan kunci kedua (jenis apa pun) untuk tanggal 2027-03-20 ditolak oleh constraint database

#### Scenario: Paket dua sesi hanya memakai satu tanggal acara

- **WHEN** reservasi memakai paket Walimah & Resepsi dua sesi pada tanggal 2027-03-20
- **THEN** sistem hanya menyimpan satu kunci `EVENT` untuk tanggal 2027-03-20

#### Scenario: Jenis kunci di luar daftar ditolak

- **WHEN** penyimpanan kunci mencoba jenis `MANUAL` atau teks lain di luar `EVENT` dan `SETUP`
- **THEN** database menolak baris tersebut

### Requirement: Tanggal terkunci dihitung dari paket dan hari setup tambahan

Sistem SHALL menghitung tanggal terkunci sebagai tanggal acara ditambah seluruh hari setup bawaan paket (`setup_days_before`) dan hari setup tambahan yang dipilih. Hari setup bawaan SHALL menjadi tanggal terkunci berjenis `SETUP`, sedangkan tanggal acara berjenis `EVENT`.

**Jejak:** BR-03, BR-18 (PROVISIONAL), BR-26; US-030; `docs/design/ui-spec.md` penyesuaian 4 dan 14

**PROVISIONAL:** bahwa setup bawaan paket memblokir kalender mengikuti BR-18 dan masih menunggu konfirmasi venue (T-02). Roadmap menetapkan default **ya**.

**GERBANG:** Bila venue menjawab bahwa setup bawaan tidak memblokir, perubahan hanya pada fungsi perhitungan tanggal terkunci; skema dan constraint tidak berubah.

#### Scenario: Setup standar malam H-1 tidak memblokir

- **WHEN** reservasi Full Service (setup 0 hari) memakai tanggal acara 2027-03-20
- **THEN** hanya tanggal 2027-03-20 yang terkunci, sehingga tanggal 2027-03-19 tetap Tersedia

#### Scenario: Setup paket Outdoor memblokir H-2 sampai H-1

- **WHEN** reservasi paket Full Service + Outdoor (setup 2 hari) memakai tanggal acara 2027-03-20
- **THEN** tanggal 2027-03-18, 2027-03-19, dan 2027-03-20 terkunci

#### Scenario: Hari setup tambahan ikut terkunci

- **WHEN** reservasi memakai tanggal acara 2027-03-20 dan satu hari setup tambahan 2027-03-19
- **THEN** tanggal 2027-03-19 dan 2027-03-20 terkunci

#### Scenario: Perhitungan melewati batas bulan

- **WHEN** tanggal acara 2027-04-01 memakai paket dengan setup 3 hari
- **THEN** tanggal 2027-03-29, 2027-03-30, 2027-03-31, dan 2027-04-01 terkunci

### Requirement: Ketersediaan publik menurut paket

Sistem SHALL menentukan status setiap tanggal sebagai Tersedia atau Terisi berdasarkan kunci tanggal yang ada dan paket yang dipilih. Tanggal yang menjadi kunci `EVENT` maupun `SETUP` SHALL tampil Terisi. Tanggal yang sudah lewat menurut WIB SHALL ditolak dan tidak dapat dipilih.

**Jejak:** BR-26, BR-27; US-030; `docs/design/ui-spec.md` 4.1 (langkah Pilih Tanggal)

#### Scenario: Tanggal terkunci tampil Terisi

- **WHEN** kalender publik ditampilkan untuk bulan yang memuat kunci tanggal 2027-03-18 (setup) dan 2027-03-20 (acara)
- **THEN** tanggal 2027-03-18 dan 2027-03-20 tampil Terisi, tanggal lain tampil Tersedia

#### Scenario: Ketersediaan bergantung pada paket

- **WHEN** customer memilih paket Full Service + Outdoor untuk tanggal acara 2027-03-20, lalu mengganti ke paket Full Service
- **THEN** tanggal 2027-03-18 dan 2027-03-19 menjadi Tersedia pada paket Full Service karena tidak ada setup bawaan, sementara 2027-03-20 tetap Terisi

#### Scenario: Tanggal lampau tidak dapat dipilih

- **WHEN** customer memilih tanggal sebelum hari ini menurut WIB
- **THEN** sistem menolak tanggal tersebut dan kalender menandainya tidak dapat dipilih

#### Scenario: Tanggal yang dipilih ditandai

- **WHEN** customer memilih tanggal yang berstatus Tersedia
- **THEN** kalender menampilkan tanggal itu sebagai Dipilih tanpa mengubah status tanggal lain

### Requirement: Data ketersediaan publik tidak membocorkan data customer

Data ketersediaan yang disajikan ke publik SHALL hanya memuat tanggal dan status ketersediaan. Data itu SHALL NOT memuat identitas customer, `reservation_id`, jenis kunci, atau keterangan setup.

**Jejak:** BR-27; NFR-SEC-05; `docs/design/ui-spec.md` penyesuaian 14; US-030

#### Scenario: Respons ketersediaan hanya berisi tanggal dan status

- **WHEN** sistem menyajikan ketersediaan bulan kepada publik
- **THEN** setiap entri hanya berisi tanggal dan status Tersedia/Terisi, tanpa nama, nomor WhatsApp, `reservation_id`, atau jenis kunci

#### Scenario: Alasan kunci tidak diungkap

- **WHEN** sebuah tanggal Terisi karena kunci `SETUP`
- **THEN** publik tetap hanya melihat status Terisi dan tidak dapat membedakan acara dari setup

### Requirement: Kalender admin baca-saja dengan jenis kunci

Sistem SHALL menampilkan halaman admin Kalender yang memperlihatkan kunci `EVENT` dan `SETUP` secara terbedakan untuk bulan yang dipilih. Halaman itu SHALL bersifat baca-saja: tidak ada kontrol untuk membuat, mengubah, atau menghapus kunci tanggal.

**Jejak:** BR-01; US-031; `docs/design/ui-spec.md` 4.2 (Kalender) dan penyesuaian 4 dan 14; NFR-SEC-05

#### Scenario: Admin melihat jenis kunci

- **WHEN** admin membuka halaman Kalender pada bulan yang memuat kunci `EVENT` dan `SETUP`
- **THEN** kedua tanggal tampil dengan penanda jenis yang berbeda

#### Scenario: Kalender admin tidak menyediakan aksi tulis

- **WHEN** admin membuka halaman Kalender
- **THEN** tidak ada tombol atau formulir untuk menambah, mengubah, atau menghapus kunci tanggal

#### Scenario: Halaman admin terlindungi

- **WHEN** pengguna tanpa sesi membuka `/admin/kalender`
- **THEN** pengguna dialihkan ke `/login` dan tidak melihat data kalender
