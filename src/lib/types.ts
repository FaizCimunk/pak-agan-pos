// TypeScript Interfaces & Data Models for Minuman Herbal Pak Agan POS

export interface CustomFixedCostItem {
  id: string;
  nama: string;
  nominal: number;
}

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
  biaya_lain_bulanan?: number; // Beban tetap tambahan per bulan (keamanan RT, paguyuban, maintenance alat)
  keterangan_biaya_lain?: string; // Nama/deskripsi beban tetap tambahan
  biaya_lain_items?: CustomFixedCostItem[]; // Rincian multi-item beban tetap tambahan per bulan
  qris_merchant_name: string;
  qris_image_url?: string;
  is_active: boolean;
  // Kredensial Akses Kasir Toko (Terpisah dari Karyawan)
  kasir_username?: string;
  kasir_pin?: string;
  kasir_password_plain?: string;
  is_kasir_locked?: boolean;
  // Kontak Penanggung Jawab (PJ) Khusus Penerima Laporan Belanja & Approval WA
  pj_nama?: string;
  pj_telepon?: string;
  // Pengaturan Struk Kasir & Promo Khusus Toko
  struk_header?: string; // Header kustom struk thermal (default nama cabang)
  struk_footer?: string; // Pesan footer struk thermal
  struk_promo?: string; // Teks promo / diskon khusus cabang yang dicetak di struk
  created_at?: string;
}

export interface Karyawan {
  id: string;
  cabang_id: string;
  username?: string;
  nama: string;
  role: 'owner' | 'supervisor' | 'kasir' | 'kitchen' | 'helper' | 'karyawan';
  telepon: string;
  pin_hash: string;
  password_plain?: string; // Sandi teks untuk transparansi Master Admin
  is_locked?: boolean; // Status gembok keamanan akun
  tipe_gaji?: 'bulanan' | 'harian';
  gaji_harian?: number; // Contoh: Rp 100.000 / hari kehadiran
  tunjangan_harian?: number; // Contoh: Rp 20.000 uang makan / hari
  tabungan_rutin_mingguan?: number; // Contoh: Rp 200.000 / minggu disisihkan otomatis ke celengan staf
  total_tabungan?: number; // Akumulasi total saldo tabungan karyawan yang tersimpan aman di Boss
  gaji_pokok: number;
  tunjangan: number;
  plafon_kasbon: number;
  utang_nominal?: number; // Nominal utang/kasbon staf yang diatur langsung oleh Boss dari pusat
  bank_nama?: string; // Contoh: 'DANA', 'BCA', 'BRI', 'Mandiri', 'SeaBank', 'Tunai'
  no_rekening?: string; // Nomor rekening bank atau nomor HP DANA tujuan transfer gaji
  atas_nama_rekening?: string; // Nama pemilik rekening/e-wallet jika berbeda dengan nama staf
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
  approval_status?: 'pending' | 'approved' | 'rejected'; // Status ACC Owner sebelum masuk gaji & laporan
  approved_by?: string;
  approved_at?: string;
  alasan_penolakan?: string;
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
  harga_es?: number; // Harga khusus varian Es jika berbeda (misal: Panas 10.000, Es 12.000)
  hpp?: number; // Biaya Bahan Baku / HPP per porsi (Tepung, Durian, Rempah, Cup, dll)
  hpp_es?: number; // HPP khusus varian Es jika berbeda
  suhu_mode?: 'bisa_keduanya' | 'beda_harga_es' | 'khusus_panas' | 'khusus_es'; // Karakter Suhu Minuman
  // Variasi Harga / Porsi Kustom untuk Makanan, Serabi, atau Minuman (misal: Reguler vs Jumbo / Box)
  has_variasi_harga?: boolean;
  varian_nama_1?: string; // misal: "Reguler" / "Isi 2" / "Panas"
  varian_harga_1?: number;
  varian_hpp_1?: number;
  varian_nama_2?: string; // misal: "Jumbo" / "Box Isi 5" / "Es Dingin"
  varian_harga_2?: number;
  varian_hpp_2?: number;
  gambar: string;
  is_favorite: boolean;
  is_active: boolean;
  cabang_ids?: string[]; // Daftar ID Cabang yang menjual menu ini. Undefined atau kosong = Semua Cabang
  has_temperature_option?: boolean; // Pilihan varian Panas / Dingin (Es)
  default_temperature?: 'panas' | 'dingin';
  created_at?: string;
}

export interface Shift {
  id: string;
  cabang_id: string;
  cabang_nama?: string;
  karyawan_id: string;
  karyawan_nama?: string;
  waktu_buka: string;
  waktu_tutup?: string | null;
  modal_awal: number;
  total_tunai_masuk: number;
  total_qris_masuk: number;
  total_transfer_masuk: number;
  total_shopeefood_masuk?: number;
  total_gofood_masuk?: number;
  total_grabfood_masuk?: number;
  total_transaksi_shift?: number;
  total_belanja_approved: number;
  total_kasbon_approved: number;
  pending_expenses_count?: number;
  pending_expenses_total?: number;
  unpaid_bills_count?: number;
  unpaid_bills_total?: number;
  saldo_akhir_sistem: number;
  saldo_akhir_fisik: number;
  selisih: number;
  status: 'open' | 'closed';
  catatan?: string | null;
  created_at?: string;
}

export type PaymentMethod = 'tunai' | 'shopeefood' | 'gofood' | 'grabfood' | 'qris' | 'transfer';

export type KitchenStation = 'serabi' | 'wedang' | 'makanan' | 'semua';

export interface TransaksiItem {
  id?: string;
  transaksi_id?: string;
  menu_id: string;
  nama_menu: string;
  harga: number;
  hpp?: number; // HPP per porsi yang berlaku saat transaksi
  qty: number;
  subtotal: number;
  subtotal_hpp?: number; // Total HPP = hpp * qty
  catatan?: string;
  temperature?: 'panas' | 'dingin'; // Varian Panas / Dingin (Es)
  varian_nama?: string; // Nama varian porsi (misal: "Jumbo", "Box Isi 5", "Es Dingin")
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
  penanda?: string; // Penanda Pesanan / No. Antrean / Nama (misal: 'No. 01', 'Kak Rina', 'Bungkus')
  meja?: string; // Cadangan kompatibilitas
  waktu: string;
  subtotal: number;
  diskon: number;
  total: number;
  metode_bayar: PaymentMethod;
  bayar: number;
  kembali: number;
  status: 'completed' | 'cancelled' | 'pending_payment';
  is_offline_synced: boolean;
  offline_created_at?: string;
  items: TransaksiItem[];
  created_at?: string;
}

export interface CartItem {
  menu: MenuItem;
  qty: number;
  catatan: string;
  temperature?: 'panas' | 'dingin'; // Varian Panas / Dingin (Es)
  custom_harga?: number; // Harga varian khusus (misal harga_es atau varian_harga_2)
  custom_hpp?: number; // HPP varian khusus (misal hpp_es atau varian_hpp_2)
  varian_nama?: string; // Nama varian porsi (misal: "Jumbo", "Box Isi 5", "Es Dingin")
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
  periode_tanggal?: string; // Rentang periode mingguan (contoh: 03 Nov 2026 s.d. 09 Nov 2026)
  periode_bulan: number;
  periode_tahun: number;
  tipe_gaji?: 'bulanan' | 'harian';
  total_kehadiran_hari?: number;
  upah_harian?: number;
  gaji_pokok: number;
  tunjangan: number;
  potongan_kasbon: number;
  potongan_tabungan?: number; // Potongan simpanan tabungan mingguan (misal Rp 200.000)
  total_tabungan_snapshot?: number; // Total saldo tabungan staf terkumpul setelah payroll ini
  gaji_bersih: number;
  status: 'draft' | 'locked' | 'paid';
  tanggal_kunci: string;
  karyawan_telepon?: string;
  karyawan_bank_nama?: string;
  karyawan_no_rekening?: string;
  karyawan_atas_nama_rekening?: string;
  keterangan?: string;
  kasbon_details?: PengeluaranKasbon[];
}

export interface TabunganKaryawanItem {
  id: string;
  karyawan_id: string;
  karyawan_nama?: string;
  cabang_id?: string;
  cabang_nama?: string;
  tanggal: string; // YYYY-MM-DD
  tipe: 'setor' | 'tarik'; // 'setor' = Uang Masuk (+ Kredit), 'tarik' = Uang Keluar (- Debit)
  nominal: number;
  saldo_setelah: number; // Saldo dompet setelah mutasi (bisa positif, nol, atau minus jika ada utang)
  keterangan: string; // Deskripsi mutasi masuk/keluar
  kategori?: 'upah_hadir' | 'kasbon' | 'pencairan_gaji' | 'denda' | 'bonus' | 'koreksi' | 'manual';
  ref_id?: string; // ID absensi, ID pengeluaran kasbon, atau ID payroll terkait
  dicatat_oleh?: string;
  created_at?: string;
}

export interface BahanBaku {
  id: string;
  kode: string;
  nama: string;
  satuan: string; // 'kg' | 'gram' | 'liter' | 'ml' | 'porsi' | 'bungkus' | 'butir' | 'pcs'
  kategori: 'serabi' | 'wedang' | 'kemasan' | 'umum';
  stok_minimum?: number;
  stok_minimum_gudang?: number; // Batas aman minimum di Gudang Pusat
  harga_satuan?: number; // Harga Beli / Biaya Pokok per satuan (Rp)
}

export interface PembelianBahanGudang {
  id: string;
  tanggal: string; // YYYY-MM-DD
  bahan_id: string;
  bahan_nama: string;
  satuan: string;
  jumlah_beli: number;
  harga_satuan: number;
  total_bayar: number;
  sumber_pemasok: string; // Contoh: 'Petani Jahe Kulon Progo (Pak Slamet)', 'Pemasok Gula Aren Cilacap'
  sumber_dana: 'rekening_owner' | 'kas_pusat' | 'bon_petani';
  status_bayar: 'lunas' | 'titip_dp' | 'tempo';
  catatan?: string;
  pembeli_nama: string; // 'Pak Agan (Owner)'
  created_at?: string;
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
  harga_satuan?: number; // Nominal harga beli / modal pokok per satuan (Rp)
  total_nilai?: number;  // Total nominal nilai pasokan bahan (jumlah * harga_satuan) (Rp)
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

export interface PembayaranFixedCostBulanan {
  id: string;
  cabang_id: string;
  cabang_nama?: string;
  periode_bulan: string; // YYYY-MM, contoh: '2026-10'
  jenis_biaya: 'sewa' | 'listrik_wifi' | 'sampah_kebersihan' | 'biaya_lain' | 'semua_paket';
  nama_biaya: string;
  nominal: number;
  status: 'lunas' | 'belum_bayar';
  tanggal_bayar?: string; // YYYY-MM-DD
  metode_bayar?: string; // 'transfer_bca', 'transfer_mandiri', 'kas_laci', 'tunai'
  no_referensi?: string;
  catatan?: string;
  dibayar_oleh?: string;
  updated_at?: string;
}
