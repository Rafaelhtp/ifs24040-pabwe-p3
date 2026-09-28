# 📰 LifeDash - PABWE Praktikum 3

Proyek ini adalah Single Page Application (SPA) interaktif yang dibangun menggunakan **HTML5, Tailwind CSS, dan Vanilla JavaScript**. Proyek ini dibuat untuk memenuhi tugas Praktikum 3 mata kuliah Pemrograman Aplikasi Berbasis Web (PABWE).

Tema desain UI diadaptasi dari gaya *Graphic Design Editorial / Tactile Print* yang menonjolkan tekstur kertas, tipografi klasik (Serif), dan elemen *brutalist*.

## 🧑‍💻 Identitas
- **Nama:** Rafael Nobel Hutapea
- **NIM:** 11S24040
- **Kelas/Prodi:** 13IF2/Informatika

## ✨ Fitur Utama
Aplikasi ini memiliki 3 tab utama dengan penyimpanan lokal (`localStorage`) yang terpisah:
1. **Keuangan (Expense Tracker):** Fitur CRUD untuk mencatat pemasukan dan pengeluaran harian beserta kalkulasi saldo otomatis.
2. **Bookmark (Link Manager):** Fitur untuk mengarsipkan tautan web favorit dengan validasi URL.
3. **Kuis (Kuis Interaktif):** Kuis pilihan ganda dengan *timer* 15 detik per soal dan sistem *High Score*.

### 🧭 Routing Tab (Query URL)
Tab aktif ditentukan oleh parameter URL `?tab=`, dikelola dengan `URLSearchParams` dan History API (`pushState` / `replaceState` / `popstate`):
- `?tab=expense` → Keuangan
- `?tab=bookmark` → Bookmark
- `?tab=quiz` → Kuis

Jika parameter kosong atau tidak valid, aplikasi otomatis diarahkan ke `?tab=expense`. Tombol Back/Forward browser berfungsi normal.

### 🛡️ Kualitas Kode
- Tidak ada atribut inline (`onclick`, dll); semua event memakai `addEventListener` dan *event delegation*.
- Konfirmasi hapus memakai **modal**, bukan `confirm()` bawaan browser.
- Validasi di JavaScript: jumlah (bilangan bulat positif, maksimal Rp 1 triliun), URL (`http://`/`https://`), dan field wajib. Pesan error tampil inline, bukan `alert()`.
- Data pengguna di-*escape* sebelum dirender ke DOM (mencegah XSS).

## 🚀 Teknologi yang Digunakan
- HTML5 (Semantic)
- Tailwind CSS (via CDN)
- Vanilla JavaScript (ES6+)
- Tabler Icons & Google Fonts (Playfair Display & Lora)
- Web Storage API (`localStorage`)