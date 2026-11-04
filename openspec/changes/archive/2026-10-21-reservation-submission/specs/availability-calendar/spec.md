# Spec Delta

## MODIFIED Requirements

### Requirement: Ketersediaan publik menurut paket

Sistem SHALL menentukan status setiap tanggal sebagai Tersedia atau Terisi berdasarkan kunci tanggal yang ada dan paket yang dipilih. Tanggal yang menjadi kunci `EVENT` maupun `SETUP` SHALL tampil Terisi. Tanggal hari ini dan tanggal yang sudah lewat menurut WIB SHALL ditolak dan tidak dapat dipilih.

**Jejak:** BR-26, BR-27; US-030; `docs/design/ui-spec.md` 4.1 (langkah Pilih Tanggal)

#### Scenario: Tanggal terkunci tampil Terisi

- **WHEN** kalender publik ditampilkan untuk bulan yang memuat kunci tanggal 2027-03-18 (setup) dan 2027-03-20 (acara)
- **THEN** tanggal 2027-03-18 dan 2027-03-20 tampil Terisi, tanggal lain tampil Tersedia

#### Scenario: Ketersediaan bergantung pada paket

- **WHEN** customer memilih paket Full Service + Outdoor untuk tanggal acara 2027-03-20, lalu mengganti ke paket Full Service
- **THEN** tanggal 2027-03-18 dan 2027-03-19 menjadi Tersedia pada paket Full Service karena tidak ada setup bawaan, sementara 2027-03-20 tetap Terisi

#### Scenario: Tanggal lampau tidak dapat dipilih

- **WHEN** customer membuka kalender pada hari ini menurut WIB
- **THEN** tanggal sebelumnya ditandai tidak dapat dipilih

#### Scenario: Hari ini tidak dapat dipilih

- **WHEN** customer membuka kalender pada hari ini menurut WIB
- **THEN** tanggal hari ini ditandai tidak dapat dipilih

#### Scenario: Tanggal yang dipilih ditandai

- **WHEN** customer memilih tanggal yang berstatus Tersedia
- **THEN** kalender menampilkan tanggal itu sebagai Dipilih tanpa mengubah status tanggal lain
