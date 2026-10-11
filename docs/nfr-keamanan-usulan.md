# NFR Keamanan (Usulan)
**Sistem Informasi Manajemen Reservasi Gedung, H.A. Djunaid Convention Center**
Versi: 0.1 | Tanggal: 12 Oktober 2026 | Status keseluruhan: **DIUSULKAN, belum disetujui**

## Mengapa dokumen ini ada

Spec `admin-auth` memuat requirement keamanan (rate limiting, atribut cookie, proteksi redirect, penegakan helper) yang **tidak ada** di handoff maupun Business Rules Register. Register hanya mengatur BR-14 (satu role operasional). Daftar NFR formal (langkah 5 di handoff) belum dibuat, jadi requirement tersebut tidak punya jejak yang jujur ke dokumen sumber.

Dokumen ini menjadi jejak sementara. Tiap butir berstatus **DIUSULKAN** dan perlu disetujui atau diveto sebelum diimplementasikan. Ini bukan daftar NFR lengkap (performa, usability, reliabilitas, backup, dan responsif masih harus dibahas pada langkah NFR formal).

## Butir usulan

| ID | Usulan | Alasan | Status |
|---|---|---|---|
| NFR-SEC-01 | Autentikasi admin: password minimal 12 karakter ditegakkan di konfigurasi auth, hashing memakai algoritma bawaan library, sesi disimpan di database dengan masa berlaku absolut yang dapat dikonfigurasi dan tidak diperpanjang saat dipakai, pencabutan sesi berlaku seketika. | Satu-satunya akun operasional (BR-14) memegang seluruh kendali status bisnis (prinsip otoritas admin, handoff bagian 40). | DIUSULKAN |
| NFR-SEC-02 | Cookie sesi: httpOnly, SameSite Lax atau Strict, dan Secure di production. Dibuktikan oleh tes yang memeriksa respons login nyata. | Mengurangi pencurian sesi lewat skrip dan CSRF. | DIUSULKAN |
| NFR-SEC-03 | Tidak ada registrasi publik. Akun hanya dibuat lewat skrip seed interaktif. | Tanpa ini siapa pun di internet dapat membuat akun yang otomatis berstatus Admin. Mengacu BR-14 (customer tanpa akun). | DIUSULKAN |
| NFR-SEC-04 | Pembatasan percobaan login: jumlah request ke jalur sign-in dibatasi per jendela waktu per sumber IP, disimpan di database. Angka awal (5 request per 900 detik) adalah parameter. **PROVISIONAL**: efektif hanya jika header IP diisi platform, bukan klien. | Halaman login publik di internet dan hanya satu akun admin. | DIUSULKAN (PROVISIONAL) |
| NFR-SEC-05 | Proteksi rute admin berlapis: pengecekan optimistis di proxy dan helper server wajib di setiap page, Server Action, dan Route Handler. Penegakan lewat tes statis. | Server Action dapat dipanggil langsung lewat POST dari mana pun, dan satu rute yang lupa dilindungi membuka seluruh back-office. | DIUSULKAN |
| NFR-SEC-06 | Redirect setelah login hanya ke path internal di bawah `/admin`. | Mencegah open redirect dari parameter URL. | DIUSULKAN |
| NFR-SEC-07 | Pengelolaan secret: `BETTER_AUTH_SECRET` wajib dan tanpa nilai default, berkas `.env*` tidak di-commit, seed tidak menerima password dari file atau environment dan meminta konfirmasi target database sebelum menulis. | Mencegah secret bocor dan seed menulis ke database yang salah. | DIUSULKAN |

## Di luar dokumen ini (tidak diubah)

- BR-32 (perlindungan halaman cek status booking: rate limiting dan data minimal) tetap berlaku untuk change `booking-proof`.
- Captcha dan anti-spam form publik (TDR D8) belum disetujui dan tidak termasuk di sini.

## Keputusan yang diminta

Setujui, ubah, atau veto per ID. Setelah disetujui, taruh dokumen ini di `docs/` dan perbarui statusnya. Sampai itu terjadi, requirement yang merujuk NFR-SEC diberi tanda "usulan".
