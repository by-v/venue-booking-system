# Spec Delta

## MODIFIED Requirements

### Requirement: Pembuatan customer CALON dan reservasi PENDING

Sistem SHALL menyimpan pengajuan yang valid sebagai customer berstatus `CALON` dan reservasi berstatus `PENDING` dengan ID internal, snapshot nama paket, durasi, jumlah sesi, dan harga, serta sumber `FORM_PUBLIK`. Sistem SHALL menyimpan satu customer per nomor WhatsApp yang telah dinormalisasi; pengajuan ulang dengan nomor yang sama SHALL menambah reservasi baru pada customer tersebut. Pengajuan SHALL NOT membuat nomor booking atau kunci tanggal.

**Jejak:** BR-17a; BR-19; BR-25; BR-29; state machine T1; US-040; US-042

#### Scenario: Customer baru dan reservasi PENDING dibuat

- **WHEN** nomor WhatsApp belum pernah mengajukan dan form valid dikirim
- **THEN** sistem membuat customer `CALON`, reservasi `PENDING` dengan sumber `FORM_PUBLIK`, riwayat status awal, dan aktivitas pengajuan pertama

#### Scenario: Nomor WhatsApp dinormalisasi

- **WHEN** customer mengirim nomor `0812-3456-7890` lalu mengirim lagi dengan nomor `+62 812 3456 7890`
- **THEN** sistem memakai satu record customer yang sama untuk kedua pengajuan

#### Scenario: Pengajuan ulang membuat reservasi baru

- **WHEN** customer yang sama mengirim form lagi untuk tanggal lain
- **THEN** sistem menambah reservasi PENDING baru tanpa mengubah reservasi sebelumnya

#### Scenario: Harga paket disalin saat pengajuan

- **WHEN** admin mengubah harga paket setelah pengajuan tersimpan
- **THEN** harga pada reservasi lama tetap memakai harga saat pengajuan

#### Scenario: PENDING tidak mengunci tanggal

- **WHEN** pengajuan PENDING berhasil untuk tanggal 2027-03-20
- **THEN** sistem tidak membuat baris `date_lock` dan kalender publik tetap menampilkan tanggal itu sesuai kunci yang ada

#### Scenario: Dua pengajuan PENDING pada tanggal yang sama

- **WHEN** dua customer mengajukan tanggal acara yang sama dan keduanya valid
- **THEN** kedua reservasi PENDING tersimpan; tanggal belum terkunci sampai salah satu dikonfirmasi
