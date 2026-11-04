# Design

## Context

Lihat `proposal.md` untuk motivasi. Batas pelunasan belum ada di kode: tidak ada kolom `payment_due_date`, tidak ada fungsi turunan, dan ringkasan pembayaran pada `src/app/admin/reservasi/[id]/page.tsx` hanya menampilkan total, DP minimum, pembayaran terverifikasi, pembayaran tercatat, sisa, dan status pembayaran.

Fondasi yang dipakai ulang:

- `src/modules/availability/dates.ts` sudah menyediakan `addDays` untuk aritmetika string tanggal `YYYY-MM-DD` dan `todayInJakarta` untuk tanggal WIB.
- `src/modules/reservation/pricing.ts` sudah menurunkan `PaymentStatus` (`BELUM_DP`, `DP`, `LUNAS`).
- `getReservationDetail` di `src/modules/reservation/queries.ts` sudah memuat `eventDate` dan `financials.paymentStatus` untuk halaman admin.
- `docs/roadmap.md` Change 10 menetapkan hanya batas H-14 dan penanda; eksekusi pembatalan tetap di luar scope karena T-01b TERBUKA.

## Goals / Non-Goals

**Goals:**

- Menyediakan satu sumber perhitungan batas pelunasan dan keterlambatan yang murni dan dapat diuji.
- Menampilkan batas dan penanda pada ringkasan pembayaran detail reservasi admin.
- Memastikan batas selalu mengikuti `eventDate` terkini, termasuk setelah reschedule.
- Menjaga tidak ada perubahan status, pembayaran, `date_lock`, ketersediaan, atau timer auto-cancel.

**Non-Goals:**

- Menyimpan batas atau penanda di database.
- Membatalkan reservasi, menghanguskan DP, atau menetapkan status hasil karena keterlambatan.
- Menambah job, notifikasi, widget dashboard, halaman Pembayaran, atau aksi tulis.
- Menampilkan batas atau penanda pada permukaan publik.

## Decisions

### D1 - Modul domain murni `payment-deadline`

Tambahkan `src/modules/reservation/payment-deadline.ts`:

- `PAYMENT_DEADLINE_DAYS = 14`.
- `paymentDueDate(eventDate: string): string` memakai `addDays(eventDate, -PAYMENT_DEADLINE_DAYS)`.
- `isPaymentOverdue(input: { eventDate: string; paymentStatus: PaymentStatus; today: string }): boolean` mengembalikan `true` hanya bila `paymentStatus !== "LUNAS"` dan `today > paymentDueDate(eventDate)`.

Fungsi tidak menyentuh database dan tidak mengubah input. Perbandingan string `YYYY-MM-DD` aman karena formatnya urut secara leksikografis. Alternatif menyimpan nilai turunan ditolak karena akan basi setelah reschedule, pembayaran, atau perubahan tanggal acara.

### D2 - Turunkan nilai pada query detail admin

Perluas `ReservationDetail` di `src/modules/reservation/types.ts` dengan:

- `paymentDueDate: string`.
- `paymentOverdue: boolean`.

`getReservationDetail` di `src/modules/reservation/queries.ts` mengisi kedua nilai memakai `todayInJakarta()` dan fungsi D1. Query publik seperti `getPublicBookingByNumber` tidak diubah dan tidak menerima field ini.

Alternatif menghitung langsung di komponen halaman ditolak karena aturan bisnis akan tersebar di UI dan sulit diuji terhadap PostgreSQL asli.

### D3 - Tampilan pada ringkasan pembayaran

Pada `src/app/admin/reservasi/[id]/page.tsx`, tambahkan baris “Batas pelunasan” di `<dl>` ringkasan pembayaran yang sudah ada, memakai `formatEventDate(reservation.paymentDueDate)`.

Bila `reservation.paymentOverdue` bernilai `true`, tampilkan penanda “Pelunasan terlambat” dengan komponen `Badge` yang sudah ada dan warna peringatan, serta teks bantuan bahwa penanda hanya informasi dan tidak mengubah status atau DP. Bila tidak terlambat, tidak ada penanda tambahan.

Tidak ada kartu, layar, menu, atau tombol baru. Tampilan mengikuti `docs/design/ui-spec.md` 4.2 yang sudah memuat detail reservasi dan pembayaran.

### D4 - Tidak ada perubahan operasional

Change ini tidak menambah mutasi, Server Action, job, atau route. `getReservationDetail` hanya membaca data. Tidak ada penulisan ke `reservation`, `payment`, `date_lock`, `reservation_activity`, atau `reservation_status_history`.

Konsekuensi T-01b yang belum diputuskan tidak diaktifkan. Tidak ada kode yang menandai DP hangus, membebaskan tanggal, atau mengubah status menjadi `DIBATALKAN`.

### D5 - Pengujian

- Unit murni: `paymentDueDate` untuk 30 Maret 2026, 1 Maret 2026, dan pergantian bulan/tahun; `isPaymentOverdue` untuk tepat pada batas, sehari setelah batas, `LUNAS`, dan `DP`.
- Query: `getReservationDetail` mengembalikan batas dan penanda yang benar; setelah reschedule, batas mengikuti `eventDate` baru.
- UI: detail admin menampilkan “Batas pelunasan” dan penanda hanya saat terlambat.
- Publik: cek status dan Bukti Booking tidak memuat batas atau penanda.
- Regresi: status, pembayaran, `date_lock`, dan aktivitas tidak berubah saat detail dibuka atau nilai diturunkan.

## Risks / Trade-offs

- **[Penanda dapat berubah tanpa audit trail]** → Penanda bersifat turunan dan bukan status; tidak ada riwayat yang perlu disimpan. Bila venue membutuhkan riwayat keterlambatan, itu change baru.
- **[Status akhir juga dapat bertanda terlambat]** → BR-08 tidak membatasi status. Penanda hanya informasi dan tidak mengubah data; batas status dapat dipersempit saat review.
- **[Pengujian bergantung tanggal hari ini]** → Uji batas memakai fungsi murni dengan `today` eksplisit; uji query memakai tanggal relatif terhadap `todayInJakarta`.
- **[Admin mengira penanda membatalkan reservasi]** → Teks bantuan menyatakan penanda hanya informasi dan T-01b belum dijalankan.
- **[Nilai turunan membebani query detail]** → Perhitungan hanya aritmetika string tanggal dan tidak menambah query database.

## Migration Plan

1. Tambahkan modul domain dan tes unit.
2. Tambahkan field turunan pada tipe dan query detail admin.
3. Tampilkan batas dan penanda pada halaman detail.
4. Jalankan lint, typecheck, build, dan seluruh tes.

Tidak ada migrasi database. Rollback cukup menghapus field turunan dan tampilan; tidak ada data yang perlu dipulihkan.

## Open Questions

- Apakah penanda perlu dibatasi hanya untuk status aktif (`PENDING`, `DITANGGUHKAN`, `DITERIMA`) setelah venue memberi jawaban? Untuk sekarang BR-08 dipakai apa adanya untuk reservasi yang belum `LUNAS`.
- Apakah venue membutuhkan riwayat kapan suatu reservasi pertama kali terlambat? Belum diminta dan tidak disimpan.
