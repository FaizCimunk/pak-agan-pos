// TypeScript Interfaces & Data Models for Minuman Herbal Pak Agan POS

export interface Cabang {
  id: string;
  nomor: number;
  kode: string;
  nama: string;
  alamat: string;
  kota: string;
  telepon: string;
  target_omzet_bulanan: number;
  sewa_bulanan?: number; // Biaya sewa tempat / ruko / kios per bulan
  listrik_air_bulanan?: number; // Biaya utilitas (listrik PLN, air PDAM, Wi-Fi) per bulan
  iuran_kebersihan_bulanan?: number; // Retribusi sampah, keamanan pasar/lingkungan per bulan
  qris_merchant_name: string;
  qris_image_url?: string;
  is_active: boolean;
  // Kredensial Akses Kasir Toko (Terpisah dari Karyawan)
  kasir_username?: string;
  kasir_pin?: string;
  kasir_password_plain?: string;
  // Kontak Penanggung Jawab (PJ) Khusus Penerima Laporan Belanja & Approval WA
  pj_nama?: string;
  pj_telepon?: string;
  created_at?: string;
}

export interface Karyawan {
  id: string;
  cabang_id: string;
  username?: string;
  nama: string;
  role: 'owner' | 'supervisor' | 'kasir' | 'kitchen' | 'helper';
  telepon: string;
  pin_hash: string;
  password_plain?: string; // Sandi teks untuk transparansi Master Admin ala Abdi Membangun
  is_locked?: boolean; // Status gembok keamanan akun
  tipe_gaji?: 'bulanan' | 'harian';
  gaji_harian?: number; // Contoh: Rp 100.000 / hari kehadiran
  tunjangan_harian?: number; // Contoh: Rp 20.000 uang makan / hari
  gaji_pokok: number;
  tunjangan: number;
  plafon_kasbon: number;
  utang_nominal?: number; // Nominal utang/kasbon staf yang diatur langsung oleh Boss dari pusat
  is_active: boolean;
  created_at?: string;
}

export interface Absensi {
  id: string;
  karyawan_id: string;
  karyawan_nama?: string;
  cabang_id: string;
  cabang_nama?: string;
  tanggal: string; // YYYY-MM-DD
  jam_masuk: string;
  jam_pulang?: string | null;
  status: 'hadir' | 'setengah_hari' | 'izin' | 'sakit' | 'alpa';
  upah_harian_terhitung: number;
  catatan?: string;
  recorded_by?: string; // Dicatat oleh Kepala Cabang / Admin
  created_at?: string;
}

export interface KategoriMenu {
  id: string;
  nama: string;
  icon: string;
  urutan: number;
}

export interface MenuItem {
  id: string;
  kategori_id: string;
  kategori_nama?: string;
  kode: string;
  nama: string;
  deskripsi: string;
  harga: number;
  hpp?: number; // Biaya Bahan Baku / HPP per porsi (Tepung, Durian, Rempah, Cup, dll)
  gambar: string;
  is_favorite: boolean;
  is_active: boolean;
  created_at?: string;
}

export interface Shift {
  id: string;
  cabang_id: string;
  karyawan_id: string;
  karyawan_nama?: string;
  waktu_buka: string;
  waktu_tutup?: string | null;
  modal_awal: number;
  total_tunai_masuk: number;
  total_qris_masuk: number;
  total_transfer_masuk: number;
  total_belanja_approved: number;
  total_kasbon_approved: number;
  saldo_akhir_sistem: number;
  saldo_akhir_fisik: number;
  selisih: number;
  status: 'open' | 'closed';
  catatan?: string | null;
  created_at?: string;
}

export type PaymentMethod = 'tunai' | 'shopeefood' | 'gofood' | 'grabfood' | 'qris' | 'transfer';

export interface TransaksiItem {
  id?: string;
  transaksi_id?: string;
  menu_id: string;
  nama_menu: string;
  harga: number;
  qty: number;
  subtotal: number;
  catatan?: string;
}

export interface Transaksi {
  id: string;
  invoice_no: string;
  cabang_id: string;
  cabang_nama?: string;
  shift_id?: string;
  karyawan_id?: string;
  karyawan_nama?: string;
  nama_pelanggan: string;
  waktu: string;
  subtotal: number;
  diskon: number;
  total: number;
  metode_bayar: PaymentMethod;
  bayar: number;
  kembali: number;
  status: 'completed' | 'cancelled';
  is_offline_synced: boolean;
  offline_created_at?: string;
  items: TransaksiItem[];
  created_at?: string;
}

export interface CartItem {
  menu: MenuItem;
  qty: number;
  catatan: string;
}

export type PengeluaranJenis = 'belanja' | 'kasbon';
export type PengeluaranStatus = 'pending' | 'approved' | 'rejected';
export type MetodePencairan = 'laci' | 'transfer';

export interface PengeluaranKasbon {
  id: string;
  cabang_id: string;
  cabang_nama?: string;
  shift_id?: string;
  karyawan_id?: string;
  pemohon_nama: string;
  pemohon_telepon?: string;
  jenis: PengeluaranJenis;
  kategori_belanja?: 'operasional_laci' | 'stok_bahan' | 'beban_tetap';
  menu_id?: string;
  qty_porsi?: number;
  keperluan: string;
  nominal: number;
  status: PengeluaranStatus;
  metode_pencairan?: MetodePencairan;
  bukti_transfer_url?: string;
  is_settled: boolean;
  tanggal: string;
  approved_by?: string;
  approved_at?: string;
  alasan_penolakan?: string;
  created_at?: string;
}

export interface Payroll {
  id: string;
  karyawan_id: string;
  karyawan_nama?: string;
  karyawan_role?: string;
  cabang_id: string;
  cabang_nama?: string;
  slip_no: string;
  periode_bulan: number;
  periode_tahun: number;
  tipe_gaji?: 'bulanan' | 'harian';
  total_kehadiran_hari?: number;
  upah_harian?: number;
  gaji_pokok: number;
  tunjangan: number;
  potongan_kasbon: number;
  gaji_bersih: number;
  status: 'draft' | 'locked' | 'paid';
  tanggal_kunci: string;
  karyawan_telepon?: string;
  keterangan?: string;
  kasbon_details?: PengeluaranKasbon[];
}

export interface BahanBaku {
  id: string;
  kode: string;
  nama: string;
  satuan: string; // 'kg' | 'liter' | 'porsi' | 'bungkus' | 'butir' | 'pcs'
  kategori: 'serabi' | 'wedang' | 'kemasan' | 'umum';
  stok_minimum?: number;
}

export interface ResepMenuBahan {
  menu_id: string;
  bahan_id: string;
  jumlah_per_porsi: number;
}

export interface KirimanBahanPusat {
  id: string;
  cabang_id: string;
  cabang_nama?: string;
  bahan_id: string;
  bahan_nama: string;
  jumlah: number;
  satuan: string;
  tanggal: string; // YYYY-MM-DD
  dikirim_oleh: string;
  catatan?: string;
  created_at?: string;
}

export interface AbsensiBahanHarian {
  id: string;
  cabang_id: string;
  cabang_nama?: string;
  tanggal: string; // YYYY-MM-DD
  bahan_id: string;
  bahan_nama: string;
  satuan: string;
  stok_awal: number;
  kiriman_pusat: number;
  terpakai_kasir: number; // Ditarik otomatis dari transaksi kasir di tempat
  sisa_sistem: number;   // (stok_awal + kiriman_pusat - terpakai_kasir)
  sisa_fisik: number;    // Diisi kasir di tempat saat absensi bahan
  selisih: number;       // (sisa_fisik - sisa_sistem)
  status: 'cocok' | 'selisih';
  kasir_nama?: string;
  catatan?: string;
  updated_at?: string;
}

export interface FixedCostHarianCabang {
  cabang_id: string;
  cabang_nama: string;
  tanggal: string;
  sewa_harian: number;           // sewa_bulanan / 30
  wifi_listrik_harian: number;   // utilitas bulanan / 30
  iuran_harian: number;          // iuran bulanan / 30
  total_gaji_karyawan: number;   // dari absensi staf hadir hari ini
  total_hpp_bahan: number;       // total hpp menu terjual dari kasir
  total_belanja_laci: number;    // belanja laci approved hari ini
  total_potongan_harian: number; // jumlah seluruh fixed cost & beban
  omzet_kotor: number;           // total penjualan hari ini
  uang_bersih_rekening_boss: number; // omzet_kotor - total_potongan_harian
}
