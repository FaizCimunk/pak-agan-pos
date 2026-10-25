# Panduan Arsitektur & Operasional Sistem POS Multi-Cabang "Minuman Herbal Pak Agan"

## 1. Ringkasan Sistem
Sistem Point of Sale (POS) Multi-Cabang (9 Cabang) terintegrasi dengan Dashboard Keuangan Fintech & Modul Payroll Otomatis berbasis Next.js 14 (App Router), Tailwind CSS (Emerald Herbal & Amber Gold Fintech), Supabase PostgreSQL, PWA Offline-First, dan Web Bluetooth API printer thermal 58mm.

## 2. Struktur Hak Akses & Isolasi Antarmuka (No Cross-Tampering)
Login dilakukan dari satu pintu masuk utama (`/`) tanpa tombol/tab switcher yang mencurigakan. Sistem secara cerdas mengarahkan ke antarmuka yang sesuai berdasarkan kredensial:

| Peran (Role) | Kredensial Login Demo (PIN: `1234`) | Rute Antarmuka | Deskripsi Hak Akses |
|---|---|---|---|
| **Owner (Pak Agan)** | `pakagan` / `0812-3456-7890` | `/admin` | Dedicated Fintech Sidebar: Omzet 9 cabang, Approval Center (uang laci / bukti transfer), **Menu Khusus Kelola Gaji Karyawan (ubah tarif harian, uang makan & plafon)**, Master Menu locked from pusat, Modul Presensi 9 Cabang, Akun Cabang & PIN staf, serta Payroll Kunci Gaji bulanan. |
| **Admin Cabang / Kasir Outlet** | `cabang1` s.d. `cabang9` | `/pos` | Tablet POS Sentuh terkunci permanen pada `cabang_id`. Menu read-only, shift modal kas laci, QRIS statis toko, printer bluetooth, offline IndexedDB antrean, dan **Presensi Tim Cabang (Ala Abdi Membangun)**. |
| **Staf Karyawan** | `siti` (Cabang 1), `anisa` (Cabang 2), `fajar` (Cabang 3) | `/karyawan` | Portal Pribadi Karyawan (Mobile-friendly): Monitor kehadiran harian (diverifikasi kepala cabang), akumulasi upah harian & uang makan, sisa plafon kasbon, form pengajuan bon langsung ke WhatsApp Pak Agan, dan arsip slip gaji digital bank-grade. |

## 3. Sistem Presensi Harian & Gaji Harian (Ala Abdi Membangun)
Mengadopsi pola kontrol proyek konstruksi Abdi Membangun:
1. **Presensi Dicatat oleh Admin Cabang / Kepala Outlet**: Karyawan tidak bisa mengisi absen sendiri dari HP guna mencegah manipulasi. Admin Cabang / Kasir PJ membuka tombol **"Presensi Staf"** di header `/pos` untuk menandai kehadiran (`Hadir`, `1/2 Hari`, `Izin`, `Sakit`, `Alpa`), jam kerja, dan catatan shift.
2. **Kalkulasi Upah Harian Transparan**:
   - Jika `tipe_gaji === 'harian'`:
     $$\text{Gaji Pokok} = \text{Total Hari Hadir} \times \text{Tarif Upah Harian}$$
     $$\text{Tunjangan} = \text{Total Hari Hadir} \times \text{Uang Makan Harian}$$
   - Contoh Siti Rahmawati (Cabang 1): 22 Hari Hadir $\times$ (Rp 100.000 upah + Rp 20.000 uang makan) = **Rp 2.640.000**.
3. **Potongan Kasbon & Take Home Pay**:
   $$\text{Gaji Bersih} = (\text{Gaji Pokok} + \text{Tunjangan}) - \text{Total Kasbon Approved}$$
4. **Pusat Rekap Presensi di Admin Pusat**: Pak Agan memiliki tab **"Absensi & Presensi"** di `/admin` untuk memonitor log presensi harian seluruh 9 cabang.
5. **Kunci Gaji Bulanan**: Pak Agan menekan tombol "Kunci Gaji" di `/admin` $\rightarrow$ seluruh kasbon periode tersebut berubah menjadi `is_settled: true`, slip mutasi bank digital diterbitkan, dan plafon kasbon staf kembali pulih untuk bulan berikutnya.
