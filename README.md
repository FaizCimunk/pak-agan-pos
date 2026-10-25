# 🌿 Minuman Herbal Pak Agan - Enterprise POS Multi-Cabang (9 Cabang)

Sistem Point of Sale (POS) Multi-Cabang dan Dashboard Manajemen Keuangan Terpadu untuk brand **Minuman Herbal Pak Agan**. Dibangun menggunakan **Next.js 14 (App Router)**, **Tailwind CSS**, **Supabase PostgreSQL**, dan arsitektur **PWA Offline-First**.

---

## 🎨 1. Desain UI/UX Modern Ala Fintech (Bank-Grade Style)

- **Palet Warna**:
  - **Primary (Emerald / Dark Forest)**: `#064E3B` (`brand-dark`) & `#065F46` (`brand-primary`) sebagai identitas herbal pekat berkelas.
  - **Secondary / Accent (Gold Amber)**: `#D97706` (`accent-gold`) untuk CTA transaksi penting, badge status pending, dan highlight omzet.
  - **Background & Cards**: Abu-abu terang modern `#F8FAFC` (`slate-50`) dipadukan dengan kartu-kartu putih bersih berbayangan halus (`shadow-soft-sm` hingga `shadow-soft-md`).
- **Tipografi & Angka Format Bank**:
  - Font sans-serif modern: **Inter** dan **Plus Jakarta Sans**.
  - Seluruh nominal rupiah diformat rapi menggunakan **angka tabular monospaced** (`font-mono font-semibold` / `font-extrabold`) layaknya mutasi rekening bank digital (`Rp 125.000`).
- **Komponen Fintech**:
  - **Status Pill Badges**: Hijau untuk *Approved*, Kuning untuk *Pending*, Merah untuk *Rejected*.
  - **Quick Action Buttons**: Tombol sentuh besar dengan feedback getar/taktil halus (`btn-tactile active:scale-95`).
  - **Dashboard Metric Stat Cards**: Kartu metrik omzet global dengan badge persentase tren hijau/merah di pojok kanan kartu.

---

## 📱 2. Pembagian Platform & Tampilan Antarmuka

| Sektor | Platform | Gaya Antarmuka | Target Pengguna |
| :--- | :--- | :--- | :--- |
| **Cabang Outlet (9 Cabang)** | APK Android / PWA (`/pos`) | Tampilan Kasir Sentuh (POS Grid di kiri, Keranjang Pesanan di kanan). Minimalis, ramah tablet layar sentuh. | Kasir / Staf Outlet |
| **Admin Pusat** | Web App (`/admin`) | Dashboard Analytics Fintech. Navigasi tab, tabel mutasi rekening, ringkasan 9 cabang, approval center, dan payroll otomatis. | Owner (Pak Agan) |

---

## 🔄 3. Master Alur Operasional (End-to-End System Flow)

### A. Pengelolaan Master Data & Akun (Pusat Only)
- **Admin Pusat (Pak Agan)**: Mengatur seluruh data 9 cabang, master katalog minuman herbal (Wedang Jahe Merah, Temulawak, Kunyit Asam, Wedang Uwuh, STMJ Super, dll.), harga jual resmi, data karyawan, gaji pokok, tunjangan, dan plafon kasbon staf.
- **Akun Perangkat Cabang**: Terkunci pada `cabang_id` bersangkutan dan data menu bersifat *Read-Only* (kasir tidak bisa mengubah harga resmi pusat).
- **PIN Karyawan**: Staf menggunakan PIN 4–6 digit angka untuk absensi buka shift dan verifikasi kasbon. Admin Pusat memegang kendali penuh untuk membuat atau mereset PIN staf.

### B. Alur Buka & Tutup Shift di Tablet Kasir
- **Buka Shift**: Kasir memilih nama staf di tablet, memasukkan PIN pribadi, lalu menginput Modal Awal Laci (uang receh kembalian). Kasir tersebut terkunci sebagai Penanggung Jawab (PJ) shift.
- **Tutup Shift (End of Day)**: Kasir menghitung fisik uang lembaran/koin di laci. Sistem menghitung saldo pembukuan:
  $$\text{Saldo Akhir Sistem} = \text{Modal Awal} + \text{Tunai Masuk} - \text{Belanja (Approved)} - \text{Kasbon (Approved)}$$
- Sistem mencatat selisih fisik vs sistem (tekor atau surplus), lalu printer Bluetooth mencetak struk rekap shift thermal 58mm untuk ditandatangani staf PJ.

### C. Alur Transaksi & Toleransi Offline (Offline Resilience)
- **Metode Bayar Tunai (Cash)**: Aktif online maupun offline. Kasir input uang diterima $\rightarrow$ sistem menghitung kembalian $\rightarrow$ cetak struk via Bluetooth ESC/POS.
- **Metode Bayar QRIS Statis**: Menampilkan barcode QRIS resmi toko di layar tablet dengan nominal tagihan tebal. Kasir memeriksa notifikasi sukses di HP pembeli lalu menekan tombol konfirmasi. Bebas potongan biaya MDR.
- **Koneksi Printer Bluetooth**: Menggunakan Web Bluetooth API (perintah biner ESC/POS). Cetak struk tetap berfungsi lancar saat internet padam karena komunikasi perangkat bersifat lokal.
- **Logika Offline (IndexedDB)**: Jika Wi-Fi padam, transaksi tunai otomatis ditampung di `transaksi_pending` memori tablet. Begitu internet pulih (`navigator.onLine`), sistem otomatis mengeksekusi sinkronisasi dan membersihkan antrean lokal.

### D. Alur Belanja Cabang & Kasbon Karyawan
- **Pengajuan Kasir**: Kasir mengajukan belanja operasional (misal: beli es batu/gas elpiji/rempah pasar) atau kasbon staf via PIN di tablet. Status awal: `pending`.
- **Tautan Instan WhatsApp**: Tombol otomatis membuat link WhatsApp terformat rapi langsung ke nomor Pak Agan.
- **Approval Pusat**: Pak Agan meninjau di dashboard. Jika dicairkan via transfer bank, admin mengunggah screenshot bukti transfer ke Supabase Storage (`bukti-transfer`). Jika dicairkan via kas laci, klik Setujui via Laci.
- **Eksekusi Kasir**: Berkat Supabase Realtime / reactivity, status di tablet otomatis berubah hijau (`approved`). Saldo kas laci otomatis terpotong di sistem jika disetujui via laci.
- **Pemeriksaan Struk Fisik**: Kasir tidak perlu upload nota belanja ke aplikasi. Struk kertas belanja disimpan di amplop kasir toko untuk diperiksa langsung oleh Kepala Toko/Supervisor di lokasi.

### E. Alur Payroll Otomatis (Tutup Buku Bulanan)
- Kasbon yang disetujui otomatis masuk daftar potongan dengan status `is_settled: false`.
- Pada tanggal penggajian, sistem menghitung otomatis:
  $$\text{Gaji Bersih} = \text{Gaji Pokok} + \text{Tunjangan} - \text{Total Kasbon Approved}$$
- Pak Agan menekan tombol **"Kunci Gaji"**: seluruh kasbon periode tersebut berubah menjadi `is_settled: true`, slip gaji digital bergaya mutasi bank diterbitkan (dapat dicetak / download PDF), dan saldo kasbon staf bulan berikutnya kembali ke Rp 0.

---

## 🗄️ 4. Struktur Database & SQL Schema (Supabase)

File `supabase_schema.sql` telah disediakan lengkap berisi DDL tabel, constraint, index performa, Row Level Security (RLS), Supabase Realtime publication, dan Storage bucket `bukti-transfer`.

Tabel-tabel utama:
1. `cabang` (9 Cabang Minuman Herbal Pak Agan)
2. `karyawan` (Owner, Supervisor, Kasir)
3. `kategori_menu` & `menu` (Katalog Minuman Herbal Resmi)
4. `shift` (Pencatatan Buka & Tutup Shift Laci)
5. `transaksi` & `transaksi_item` (Penjualan Kasir)
6. `pengeluaran_kasbon` (Approval Belanja & Kasbon)
7. `payroll` (Mutasi Tutup Buku Gaji Bulanan)

---

## 🚀 5. Cara Menjalankan Aplikasi

```bash
# 1. Pindah ke direktori proyek
cd d:\Antigravity\pak-agan-pos

# 2. Instal dependensi (sudah terinstal)
npm install

# 3. Jalankan server development
npm run dev

# 4. Buka di browser:
# - Portal Utama: http://localhost:3000
# - Kasir POS Tablet: http://localhost:3000/pos
# - Dashboard Admin Pak Agan: http://localhost:3000/admin
```
