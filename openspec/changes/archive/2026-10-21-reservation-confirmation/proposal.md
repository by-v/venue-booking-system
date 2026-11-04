# Proposal

## Why

Reservasi saat ini berhenti di `PENDING`/`DITANGGUHKAN`: tanggal belum terkunci, customer masih `CALON`, dan belum ada nomor booking. Admin belum dapat menjadikan pembayaran yang sudah diverifikasi sebagai kepemilikan tanggal secara aman. Change ini menutup celah tersebut dengan konfirmasi atomik dan pembatalan reservasi yang sudah diterima, sehingga kalender, nomor booking, dan status customer selalu konsisten.

## What Changes

- Menambahkan aksi konfirmasi untuk reservasi `PENDING` atau `DITANGGUHKAN` bila pembayaran `TERVERIFIKASI` mencapai DP minimum dan seluruh tanggal acara serta setup bebas.
- Membuat konfirmasi atomik dalam satu transaksi: mengunci tanggal acara dan setup, mengubah status menjadi `DITERIMA`, menerbitkan nomor booking, dan mengubah customer menjadi `CLIENT`.
- Menambahkan counter nomor booking per tahun dan format `HADCC-<tahun konfirmasi WIB>-<urut 4 digit>`; nomor unik, tidak berubah, dan tidak dipakai ulang setelah terbit.
- Menambahkan daftar reservasi lain pada tanggal yang sama yang sudah memiliki pembayaran tercatat sebagai bahan penilaian admin sebelum konfirmasi. Reservasi lain tidak diubah otomatis.
- Menambahkan pembatalan reservasi `DITERIMA` oleh admin dengan pihak pembatal `CUSTOMER`; pembatalan menandai `dp_forfeited`, membebaskan seluruh tanggal acara dan setup, serta mempertahankan nomor booking.
- Menampilkan nomor booking pada daftar dan detail reservasi admin serta memperluas pencarian daftar ke nomor booking.
- Menambahkan constraint database untuk FK `date_lock.reservation_id`, keunikan nomor booking, counter tahunan, dan kolom `dp_forfeited`.

## Capabilities

### New Capabilities

- `reservation-confirmation`: konfirmasi atomik, penguncian tanggal, penerbitan nomor booking, daftar bentrok, dan pembatalan reservasi `DITERIMA` beserta akibat DP hangus dan pembebasan tanggal.

### Modified Capabilities

- `reservation-submission`: daftar dan detail admin menampilkan nomor booking, dan pencarian daftar mencakup nomor booking selain nama dan WhatsApp.

## Impact

- Skema dan migrasi: `booking_counter`, `reservation.booking_number`, `reservation.dp_forfeited`, FK `date_lock.reservation_id`, serta constraint format dan keunikan nomor booking.
- Domain: mutasi konfirmasi dan pembatalan `DITERIMA`, helper tahun/nomor booking, query daftar bentrok, serta perluasan tipe dan query reservasi.
- UI admin: kartu konfirmasi dengan ringkasan syarat dan daftar bentrok, form pembatalan `DITERIMA`, nomor booking pada daftar/detail, dan pencarian nomor booking.
- Tes: PostgreSQL asli untuk konfirmasi bersamaan, DP kurang, konflik tanggal, rollback, counter tahunan, nomor unik/tidak dipakai ulang, pembatalan, serta constraint baru.
- Tidak ada dependensi baru dan tidak ada perubahan pada route publik atau API pengajuan.

## Di luar scope

- Pembatalan oleh pihak venue (T-07) tidak diasumsikan; hanya pihak `CUSTOMER` yang dicatat.
- Eksekusi pembatalan karena pelunasan terlambat (T-01b) tidak dibuat.
- Reschedule, perubahan tanggal setelah `DITERIMA`, penandaan `SELESAI`, auto-cancel, dan pembebasan tanggal karena alasan lain tidak termasuk.
- Bukti Booking, halaman cek status, pembatas laju cek status, dan cetak dokumen tetap menjadi change `booking-proof`.
- Input booking langsung oleh admin (`INPUT_ADMIN`), impor booking lama, diskon, refund, payment gateway, dan unggah bukti pembayaran tidak termasuk.

## Pertanyaan terbuka

- **T-07 (TERBUKA):** pembatalan oleh pihak venue belum didefinisikan. Change ini hanya menyediakan pihak `CUSTOMER`; opsi venue tidak ditampilkan dan tidak disimpan.
- **T-01b (TERBUKA):** eksekusi pembatalan karena pelunasan terlambat belum diputuskan. Change ini tidak mengubah status, membebaskan tanggal, atau menetapkan DP hangus karena pelunasan terlambat.

Keduanya tidak menahan implementasi karena roadmap menetapkan perilaku di luar scope untuk change ini.
