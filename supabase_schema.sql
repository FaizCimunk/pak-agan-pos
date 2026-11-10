-- ==============================================================================
-- SISTEM POS & DASHBOARD MULTI-CABANG "SERABI BAWEL & WEDANG GEPREK" (PAK AGAN)
-- ARSITEKTUR DATABASE POSTGRESQL / SUPABASE DDL & FULL SEED DATA (10 CABANG)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- TABEL: cabang (10 Cabang Resmi Serabi Bawel & Wedang Geprek Pak Agan)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cabang (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor INT UNIQUE NOT NULL CHECK (nomor BETWEEN 1 AND 10),
    kode VARCHAR(20) UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL,
    alamat TEXT NOT NULL,
    kota VARCHAR(50) NOT NULL,
    telepon VARCHAR(30) NOT NULL,
    target_omzet_bulanan NUMERIC(12, 2) DEFAULT 35000000,
    sewa_bulanan NUMERIC(12, 2) DEFAULT 3500000,
    listrik_air_bulanan NUMERIC(12, 2) DEFAULT 650000,
    iuran_kebersihan_bulanan NUMERIC(12, 2) DEFAULT 150000,
    biaya_lain_bulanan NUMERIC(12, 2) DEFAULT 0,
    keterangan_biaya_lain TEXT,
    qris_merchant_name VARCHAR(100) DEFAULT 'Serabi Bawel & Wedang Geprek',
    qris_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    kasir_username VARCHAR(50),
    kasir_pin VARCHAR(20),
    kasir_password_plain VARCHAR(100),
    is_kasir_locked BOOLEAN DEFAULT FALSE,
    pj_nama VARCHAR(100),
    pj_telepon VARCHAR(30),
    struk_header TEXT,
    struk_footer TEXT,
    struk_promo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABEL: karyawan (Owner Boss, Supervisor, Karyawan Toko, Kitchen, Helper)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS karyawan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabang_id UUID REFERENCES cabang(id) ON DELETE SET NULL,
    username VARCHAR(50),
    nama VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'supervisor', 'kasir', 'karyawan', 'kitchen', 'helper')),
    telepon VARCHAR(30),
    pin_hash VARCHAR(128) NOT NULL,
    password_plain VARCHAR(100),
    is_locked BOOLEAN DEFAULT FALSE,
    tipe_gaji VARCHAR(20) DEFAULT 'harian' CHECK (tipe_gaji IN ('bulanan', 'harian')),
    gaji_harian NUMERIC(12, 2) DEFAULT 100000,
    tunjangan_harian NUMERIC(12, 2) DEFAULT 20000,
    tabungan_rutin_mingguan NUMERIC(12, 2) DEFAULT 200000,
    total_tabungan NUMERIC(12, 2) DEFAULT 0,
    gaji_pokok NUMERIC(12, 2) DEFAULT 2600000,
    tunjangan NUMERIC(12, 2) DEFAULT 500000,
    plafon_kasbon NUMERIC(12, 2) DEFAULT 1000000,
    utang_nominal NUMERIC(12, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABEL: tabungan_karyawan_log (Buku Celengan Digital Tabungan Mingguan Staf)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tabungan_karyawan_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    karyawan_id UUID NOT NULL REFERENCES karyawan(id) ON DELETE CASCADE,
    cabang_id UUID REFERENCES cabang(id) ON DELETE SET NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    tipe VARCHAR(20) NOT NULL CHECK (tipe IN ('setor', 'tarik')),
    nominal NUMERIC(12, 2) NOT NULL CHECK (nominal > 0),
    saldo_setelah NUMERIC(12, 2) NOT NULL DEFAULT 0,
    keterangan TEXT NOT NULL,
    dicatat_oleh VARCHAR(100) DEFAULT 'Sistem Otomatis Boss',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABEL: absensi (Presensi Kehadiran & Kalkulasi Upah Harian)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS absensi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    karyawan_id UUID NOT NULL REFERENCES karyawan(id) ON DELETE CASCADE,
    karyawan_nama VARCHAR(100),
    cabang_id UUID NOT NULL REFERENCES cabang(id) ON DELETE CASCADE,
    cabang_nama VARCHAR(100),
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam_masuk TIME NOT NULL DEFAULT CURRENT_TIME,
    jam_pulang TIME,
    status VARCHAR(20) NOT NULL CHECK (status IN ('hadir', 'setengah_hari', 'izin', 'sakit', 'alpa')),
    upah_harian_terhitung NUMERIC(12, 2) NOT NULL DEFAULT 0,
    catatan TEXT,
    recorded_by VARCHAR(100) DEFAULT 'Kepala Cabang / Boss',
    approval_status VARCHAR(20) DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    alasan_penolakan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrasi aman untuk tabel absensi yang sudah berjalan di Supabase:
ALTER TABLE absensi ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved';
ALTER TABLE absensi ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);
ALTER TABLE absensi ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE absensi ADD COLUMN IF NOT EXISTS alasan_penolakan TEXT;

-- ------------------------------------------------------------------------------
-- TABEL: kategori_menu
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kategori_menu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama VARCHAR(50) UNIQUE NOT NULL,
    icon VARCHAR(30) DEFAULT 'Utensils',
    urutan INT DEFAULT 0
);

-- ------------------------------------------------------------------------------
-- TABEL: menu (Katalog Serabi Bawel & Wedang Geprek Resmi Terkunci dari Pusat)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS menu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kategori_id UUID REFERENCES kategori_menu(id) ON DELETE SET NULL,
    kode VARCHAR(20) UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    harga NUMERIC(10, 2) NOT NULL CHECK (harga >= 0),
    hpp NUMERIC(10, 2) DEFAULT 0,
    gambar TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    cabang_ids TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABEL: shift (Buka & Tutup Shift Laci Kasir Cabang)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shift (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabang_id UUID NOT NULL REFERENCES cabang(id) ON DELETE CASCADE,
    karyawan_id UUID NOT NULL REFERENCES karyawan(id) ON DELETE RESTRICT,
    waktu_buka TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    waktu_tutup TIMESTAMPTZ,
    modal_awal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_tunai_masuk NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_qris_masuk NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_transfer_masuk NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_belanja_approved NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_kasbon_approved NUMERIC(12, 2) NOT NULL DEFAULT 0,
    saldo_akhir_sistem NUMERIC(12, 2) NOT NULL DEFAULT 0,
    saldo_akhir_fisik NUMERIC(12, 2) NOT NULL DEFAULT 0,
    selisih NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABEL: transaksi (Penjualan Kasir POS Multi-Cabang)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaksi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_no VARCHAR(50) UNIQUE NOT NULL,
    cabang_id UUID NOT NULL REFERENCES cabang(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shift(id) ON DELETE SET NULL,
    karyawan_id UUID REFERENCES karyawan(id) ON DELETE SET NULL,
    nama_pelanggan VARCHAR(100) DEFAULT 'Pelanggan Walk-in',
    waktu TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    subtotal NUMERIC(12, 2) NOT NULL,
    diskon NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL,
    metode_bayar VARCHAR(30) NOT NULL CHECK (metode_bayar IN ('tunai', 'shopeefood', 'gofood', 'grabfood', 'qris', 'transfer')),
    bayar NUMERIC(12, 2) NOT NULL,
    kembali NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
    is_offline_synced BOOLEAN NOT NULL DEFAULT FALSE,
    offline_created_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABEL: transaksi_item
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaksi_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaksi_id UUID NOT NULL REFERENCES transaksi(id) ON DELETE CASCADE,
    menu_id UUID REFERENCES menu(id) ON DELETE SET NULL,
    nama_menu VARCHAR(100) NOT NULL,
    harga NUMERIC(10, 2) NOT NULL,
    qty INT NOT NULL CHECK (qty > 0),
    subtotal NUMERIC(12, 2) NOT NULL,
    catatan TEXT
);

-- ------------------------------------------------------------------------------
-- TABEL: pengeluaran_kasbon (Approval Center Belanja Laci & Kasbon Staf)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pengeluaran_kasbon (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabang_id UUID NOT NULL REFERENCES cabang(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shift(id) ON DELETE SET NULL,
    karyawan_id UUID REFERENCES karyawan(id) ON DELETE SET NULL,
    pemohon_nama VARCHAR(100) NOT NULL,
    pemohon_telepon VARCHAR(30),
    jenis VARCHAR(20) NOT NULL CHECK (jenis IN ('belanja', 'kasbon')),
    kategori_belanja VARCHAR(30) CHECK (kategori_belanja IN ('operasional_laci', 'stok_bahan', 'beban_tetap')),
    menu_id UUID REFERENCES menu(id) ON DELETE SET NULL,
    qty_porsi INT,
    keperluan TEXT NOT NULL,
    nominal NUMERIC(12, 2) NOT NULL CHECK (nominal > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    metode_pencairan VARCHAR(20) CHECK (metode_pencairan IN ('laci', 'transfer')),
    bukti_transfer_url TEXT,
    is_settled BOOLEAN NOT NULL DEFAULT FALSE,
    tanggal TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    alasan_penolakan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABEL: payroll (Tutup Buku Gaji Staf & Slip Digital)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    karyawan_id UUID NOT NULL REFERENCES karyawan(id) ON DELETE CASCADE,
    cabang_id UUID NOT NULL REFERENCES cabang(id) ON DELETE CASCADE,
    slip_no VARCHAR(50) UNIQUE NOT NULL,
    periode_bulan INT NOT NULL CHECK (periode_bulan BETWEEN 1 AND 12),
    periode_tahun INT NOT NULL,
    tipe_gaji VARCHAR(20) DEFAULT 'harian' CHECK (tipe_gaji IN ('bulanan', 'harian')),
    total_kehadiran_hari INT DEFAULT 0,
    upah_harian NUMERIC(12, 2) DEFAULT 0,
    gaji_pokok NUMERIC(12, 2) NOT NULL,
    tunjangan NUMERIC(12, 2) NOT NULL,
    potongan_kasbon NUMERIC(12, 2) NOT NULL DEFAULT 0,
    potongan_tabungan NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_tabungan_snapshot NUMERIC(12, 2) NOT NULL DEFAULT 0,
    gaji_bersih NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'locked' CHECK (status IN ('draft', 'locked', 'paid')),
    tanggal_kunci TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    karyawan_telepon VARCHAR(30),
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABEL: bahan_baku (Master Stok Gudang Pusat & Toko)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bahan_baku (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(20) UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL,
    satuan VARCHAR(20) NOT NULL,
    kategori VARCHAR(20) NOT NULL CHECK (kategori IN ('serabi', 'wedang', 'kemasan', 'umum')),
    stok_minimum NUMERIC(10, 2) DEFAULT 5,
    stok_minimum_gudang NUMERIC(10, 2) DEFAULT 20,
    harga_satuan NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABEL: kiriman_bahan_pusat (Distribusi Pasokan Bahan dari Gudang ke Toko)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kiriman_bahan_pusat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabang_id UUID NOT NULL REFERENCES cabang(id) ON DELETE CASCADE,
    bahan_id UUID NOT NULL REFERENCES bahan_baku(id) ON DELETE CASCADE,
    bahan_nama VARCHAR(100) NOT NULL,
    jumlah NUMERIC(10, 2) NOT NULL CHECK (jumlah > 0),
    satuan VARCHAR(20) NOT NULL,
    harga_satuan NUMERIC(12, 2) DEFAULT 0,
    total_nilai NUMERIC(12, 2) DEFAULT 0,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    dikirim_oleh VARCHAR(100) DEFAULT 'Gudang Pusat Pak Agan',
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABEL: absensi_bahan_harian (Audit Stok Harian Kasir Toko)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS absensi_bahan_harian (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabang_id UUID NOT NULL REFERENCES cabang(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    bahan_id UUID NOT NULL REFERENCES bahan_baku(id) ON DELETE CASCADE,
    bahan_nama VARCHAR(100) NOT NULL,
    satuan VARCHAR(20) NOT NULL,
    stok_awal NUMERIC(10, 2) DEFAULT 0,
    kiriman_pusat NUMERIC(10, 2) DEFAULT 0,
    terpakai_kasir NUMERIC(10, 2) DEFAULT 0,
    sisa_sistem NUMERIC(10, 2) DEFAULT 0,
    sisa_fisik NUMERIC(10, 2) DEFAULT 0,
    selisih NUMERIC(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'cocok' CHECK (status IN ('cocok', 'selisih')),
    kasir_nama VARCHAR(100),
    catatan TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABEL: pembayaran_fixed_cost_bulanan (Rekap Pembayaran Beban Tetap Ruko/Toko)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pembayaran_fixed_cost_bulanan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabang_id UUID NOT NULL REFERENCES cabang(id) ON DELETE CASCADE,
    periode_bulan VARCHAR(10) NOT NULL,
    jenis_biaya VARCHAR(30) NOT NULL CHECK (jenis_biaya IN ('sewa', 'listrik_wifi', 'sampah_kebersihan', 'biaya_lain', 'semua_paket')),
    nama_biaya VARCHAR(100) NOT NULL,
    nominal NUMERIC(12, 2) NOT NULL CHECK (nominal > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'lunas' CHECK (status IN ('lunas', 'belum_bayar')),
    tanggal_bayar DATE DEFAULT CURRENT_DATE,
    metode_bayar VARCHAR(30) DEFAULT 'transfer_bca',
    no_referensi VARCHAR(50),
    catatan TEXT,
    dibayar_oleh VARCHAR(100) DEFAULT 'Pak Agan (Owner Pusat)',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- INDEXES UNTUK KINERJA TINGGI & PENCARIAN CEPAT
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transaksi_cabang_waktu ON transaksi(cabang_id, waktu DESC);
CREATE INDEX IF NOT EXISTS idx_transaksi_shift ON transaksi(shift_id);
CREATE INDEX IF NOT EXISTS idx_transaksi_item_transaksi ON transaksi_item(transaksi_id);
CREATE INDEX IF NOT EXISTS idx_shift_cabang_status ON shift(cabang_id, status);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_cabang_status ON pengeluaran_kasbon(cabang_id, status);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_kasbon_settled ON pengeluaran_kasbon(karyawan_id, status, is_settled);
CREATE INDEX IF NOT EXISTS idx_tabungan_karyawan ON tabungan_karyawan_log(karyawan_id, tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_absensi_cabang_tanggal ON absensi(cabang_id, tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_absensi_bahan_cabang_tgl ON absensi_bahan_harian(cabang_id, tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_periode ON payroll(periode_tahun, periode_bulan);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Memberikan akses penuh bagi klien anon / web app kasir & dashboard Boss
-- ------------------------------------------------------------------------------
ALTER TABLE cabang ENABLE ROW LEVEL SECURITY;
ALTER TABLE karyawan ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabungan_karyawan_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE kategori_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengeluaran_kasbon ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE bahan_baku ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiriman_bahan_pusat ENABLE ROW LEVEL SECURITY;
ALTER TABLE absensi_bahan_harian ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembayaran_fixed_cost_bulanan ENABLE ROW LEVEL SECURITY;

-- Buat Policy Terbuka (Public Full Access via Anon Key)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN (
            'cabang', 'karyawan', 'tabungan_karyawan_log', 'absensi', 
            'kategori_menu', 'menu', 'shift', 'transaksi', 'transaksi_item', 
            'pengeluaran_kasbon', 'payroll', 'bahan_baku', 'kiriman_bahan_pusat', 
            'absensi_bahan_harian', 'pembayaran_fixed_cost_bulanan'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public access %I" ON %I;', t, t);
        EXECUTE format('CREATE POLICY "Public access %I" ON %I FOR ALL USING (true) WITH CHECK (true);', t, t);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- SUPABASE REALTIME CONFIGURATION
-- Notifikasi instan laci kasir, approval WhatsApp, dan saldo tabungan
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- Menambahkan tabel ke publikasi realtime secara aman
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE pengeluaran_kasbon;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE shift;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE transaksi;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE absensi;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE tabungan_karyawan_log;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- ------------------------------------------------------------------------------
-- STORAGE BUCKET: bukti-transfer
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bukti-transfer', 'bukti-transfer', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Bukti Transfer" ON storage.objects;
CREATE POLICY "Public Bukti Transfer" ON storage.objects FOR ALL USING (bucket_id = 'bukti-transfer') WITH CHECK (bucket_id = 'bukti-transfer');

-- ==============================================================================
-- MASTER SEED DATA LENGKAP: 10 CABANG, MENU RESMI, KARYAWAN & BAHAN BAKU
-- ==============================================================================

-- 1. Insert 10 Cabang Resmi Serabi Bawel & Wedang Geprek Pak Agan
INSERT INTO cabang (
    nomor, kode, nama, alamat, kota, telepon, 
    target_omzet_bulanan, sewa_bulanan, listrik_air_bulanan, iuran_kebersihan_bulanan,
    qris_merchant_name, kasir_username, kasir_pin, kasir_password_plain, pj_nama, pj_telepon
) VALUES
(1, 'CBG-01', 'Cabang 01 - Malioboro Pusat', 'Jl. Malioboro No. 45, Danurejan, Kota Yogyakarta', 'Yogyakarta', '0812-1000-0101', 45000000, 4500000, 750000, 200000, 'Serabi Bawel - Malioboro', 'kasir_cbg1', '888001', 'Kasir@Cbg1!', 'Siti Rahmawati (PJ Malioboro)', '0812-1000-0101'),
(2, 'CBG-02', 'Cabang 02 - Seturan Premium', 'Jl. Seturan Raya No. 12B, Caturtunggal, Depok', 'Sleman', '0812-1000-0202', 38000000, 3500000, 650000, 150000, 'Serabi Bawel - Seturan', 'kasir_cbg2', '888002', 'Kasir@Cbg2!', 'Budi Santoso (PJ Seturan)', '0812-1000-0202'),
(3, 'CBG-03', 'Cabang 03 - Jakal KM 5 Kampus', 'Jl. Kaliurang KM 5.2 No. 88, Caturtunggal', 'Sleman', '0812-1000-0303', 35000000, 3200000, 600000, 150000, 'Serabi Bawel - Jakal KM 5', 'kasir_cbg3', '888003', 'Kasir@Cbg3!', 'Dewi Lestari (PJ Jakal)', '0812-1000-0303'),
(4, 'CBG-04', 'Cabang 04 - Gejayan Santai', 'Jl. Affandi (Gejayan) No. 20, Condongcatur', 'Sleman', '0812-1000-0404', 32000000, 3000000, 550000, 150000, 'Serabi Bawel - Gejayan', 'kasir_cbg4', '888004', 'Kasir@Cbg4!', 'Agus Pratama (PJ Gejayan)', '0812-1000-0404'),
(5, 'CBG-05', 'Cabang 05 - Bantul Heritage', 'Jl. Jenderal Sudirman No. 102, Bantul Kota', 'Bantul', '0812-1000-0505', 28000000, 2500000, 500000, 120000, 'Serabi Bawel - Bantul', 'kasir_cbg5', '888005', 'Kasir@Cbg5!', 'Rian Pratama (PJ Bantul)', '0812-1000-0505'),
(6, 'CBG-06', 'Cabang 06 - Solo Paragon', 'Jl. Yosodipuro No. 77, Mangkubumen, Banjarsari', 'Surakarta', '0812-1000-0606', 36000000, 3400000, 650000, 180000, 'Serabi Bawel - Solo', 'kasir_cbg6', '888006', 'Kasir@Cbg6!', 'Wahyu Nugroho (PJ Solo)', '0812-1000-0606'),
(7, 'CBG-07', 'Cabang 07 - Simpang Lima', 'Kawasan Kuliner Simpang Lima No. 15, Pleburan', 'Semarang', '0812-1000-0707', 40000000, 3800000, 700000, 200000, 'Serabi Bawel - Semarang', 'kasir_cbg7', '888007', 'Kasir@Cbg7!', 'Aris Setiawan (PJ Semarang)', '0812-1000-0707'),
(8, 'CBG-08', 'Cabang 08 - Sudirman CBD', 'Jl. Jend. Sudirman Kav. 25, Karet, Setiabudi', 'Jakarta Selatan', '0812-1000-0808', 55000000, 5000000, 900000, 250000, 'Serabi Bawel - Jakarta CBD', 'kasir_cbg8', '888008', 'Kasir@Cbg8!', 'Dimas Anggara (PJ Jakarta)', '0812-1000-0808'),
(9, 'CBG-09', 'Cabang 09 - Dago Asri', 'Jl. Ir. H. Juanda (Dago) No. 142, Coblong', 'Bandung', '0812-1000-0909', 42000000, 4000000, 750000, 200000, 'Serabi Bawel - Dago Asri', 'kasir_cbg9', '888009', 'Kasir@Cbg9!', 'Fajar Hidayat (PJ Bandung)', '0812-1000-0909'),
(10, 'CBG-10', 'Cabang 10 - Gubeng Raya', 'Jl. Raya Gubeng No. 58, Gubeng', 'Surabaya', '0812-1000-1010', 46000000, 4200000, 850000, 220000, 'Serabi Bawel - Surabaya Gubeng', 'kasir_cbg10', '888010', 'Kasir@Cbg10!', 'Eko Prasetyo (PJ Surabaya)', '0812-1000-1010')
ON CONFLICT (nomor) DO UPDATE SET
    kode = EXCLUDED.kode,
    nama = EXCLUDED.nama,
    alamat = EXCLUDED.alamat,
    kota = EXCLUDED.kota,
    telepon = EXCLUDED.telepon,
    target_omzet_bulanan = EXCLUDED.target_omzet_bulanan,
    sewa_bulanan = EXCLUDED.sewa_bulanan,
    listrik_air_bulanan = EXCLUDED.listrik_air_bulanan,
    iuran_kebersihan_bulanan = EXCLUDED.iuran_kebersihan_bulanan,
    qris_merchant_name = EXCLUDED.qris_merchant_name,
    kasir_username = EXCLUDED.kasir_username,
    kasir_pin = EXCLUDED.kasir_pin,
    kasir_password_plain = EXCLUDED.kasir_password_plain,
    pj_nama = EXCLUDED.pj_nama,
    pj_telepon = EXCLUDED.pj_telepon;

-- 2. Insert Kategori Menu
INSERT INTO kategori_menu (nama, icon, urutan) VALUES
('Serabi Tradisional & Modern', 'Flame', 1),
('Wedang Hangat Tradisional', 'Coffee', 2),
('Es Herbal & Jamu Segar', 'Sparkles', 3),
('STMJ & Stamina', 'Zap', 4),
('Camilan Nusantara', 'Cookie', 5)
ON CONFLICT (nama) DO UPDATE SET
    icon = EXCLUDED.icon,
    urutan = EXCLUDED.urutan;

-- 3. Insert Master Menu Serabi Bawel & Wedang Geprek
DO $$
DECLARE
    kat_serabi UUID;
    kat_hangat UUID;
    kat_es UUID;
    kat_stamina UUID;
    kat_camilan UUID;
BEGIN
    SELECT id INTO kat_serabi FROM kategori_menu WHERE nama = 'Serabi Tradisional & Modern' LIMIT 1;
    SELECT id INTO kat_hangat FROM kategori_menu WHERE nama = 'Wedang Hangat Tradisional' LIMIT 1;
    SELECT id INTO kat_es FROM kategori_menu WHERE nama = 'Es Herbal & Jamu Segar' LIMIT 1;
    SELECT id INTO kat_stamina FROM kategori_menu WHERE nama = 'STMJ & Stamina' LIMIT 1;
    SELECT id INTO kat_camilan FROM kategori_menu WHERE nama = 'Camilan Nusantara' LIMIT 1;

    INSERT INTO menu (kategori_id, kode, nama, deskripsi, harga, hpp, is_favorite, gambar) VALUES
    -- Serabi Bawel Flagship
    (kat_serabi, 'SB-01', 'Serabi Bawel Kinca Durian', 'Serabi tungku tanah liat lembut berpori disiram kuah kinca durian montong asli manis gurih legit.', 18000, 5500, true, 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=500&q=80'),
    (kat_serabi, 'SB-02', 'Serabi Bawel Cokelat Keju', 'Serabi hangat empuk berpori dengan limpahan parutan keju cheddar gurih dan taburan meises cokelat premium.', 16000, 4800, true, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80'),
    (kat_serabi, 'SB-03', 'Serabi Bawel Oncom Pedas', 'Varian gurih asin pedas khas Priangan dengan taburan tumis oncom berbumbu cabai rawit & daun kemangi.', 15000, 4200, true, 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?w=500&q=80'),
    (kat_serabi, 'SB-04', 'Serabi Bawel Pandan Polos', 'Aroma wangi daun suji pandan asli alami dengan kuah santan aren gurih kental terpisah.', 13000, 3500, false, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80'),
    (kat_serabi, 'SB-05', 'Serabi Bawel Telur Sosis Mayo', 'Topping telur orak-arik segar, irisan sosis sapi premium, saus keju gurih dan mayones lumer.', 18000, 5800, false, 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?w=500&q=80'),

    -- Wedang Geprek & Hangat
    (kat_hangat, 'WD-01', 'Wedang Jahe Merah Emprit', 'Jahe merah bakar geprek, gula aren murni Cilacap, kayu manis dan serai wangi.', 15000, 3800, true, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&q=80'),
    (kat_hangat, 'WD-02', 'Wedang Uwuh Komplit Imogiri', 'Secang merah, cengkeh, jahe geprek, kayu manis, pala, daun serai, gula batu.', 18000, 4500, true, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&q=80'),
    (kat_hangat, 'WD-03', 'Wedang Ronde Gula Jawa', 'Bola ketan kenyal isi kacang tanah manis tumbuk, kuah jahe wangi daun pandan.', 20000, 5200, true, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80'),
    (kat_hangat, 'WD-04', 'Kopi Jahe Rempah Pak Agan', 'Robusta lereng Merapi dipadukan jahe bakar geprek dan rempah kapulaga.', 18000, 4600, false, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&q=80'),

    -- Es Herbal & Jamu Segar
    (kat_es, 'ES-01', 'Es Kunyit Asam Sirih Dingin', 'Kunyit biang segar, asam jawa matang, sirih temu kunci, disajikan dingin menyegarkan.', 16000, 3800, true, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80'),
    (kat_es, 'ES-02', 'Es Beras Kencur Wangi', 'Beras sangrai aromatik, kencur segar pilihan, gula kelapa murni.', 16000, 3800, true, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80'),

    -- STMJ & Stamina
    (kat_stamina, 'ST-01', 'STMJ Super Jahe Merah', 'Susu sapi murni Boyolali, Telur bebek kampung, Madu hutan randu, Jahe merah bakar.', 25000, 7500, true, 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&q=80'),
    (kat_stamina, 'ST-02', 'Wedang Bajigur Santan Gurih', 'Santan kelapa murni, gula merah, jahe bakar, daun pandan, irisan kolang kaling.', 16000, 4000, false, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&q=80'),

    -- Camilan Tradisional
    (kat_camilan, 'CM-01', 'Pisang Goreng Wijen Madu', 'Pisang raja pilihan digoreng renyah bertabur wijen sangrai dan kucuran madu randu.', 15000, 4200, false, 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?w=500&q=80'),
    (kat_camilan, 'CM-02', 'Singkong Keju Merekah', 'Singkong keju digoreng empuk merekah dengan limpahan keju parut gurih.', 15000, 4000, false, 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=500&q=80')
    ON CONFLICT (kode) DO UPDATE SET
        kategori_id = EXCLUDED.kategori_id,
        nama = EXCLUDED.nama,
        deskripsi = EXCLUDED.deskripsi,
        harga = EXCLUDED.harga,
        hpp = EXCLUDED.hpp,
        gambar = EXCLUDED.gambar;
END $$;

-- 4. Insert Karyawan Awal (Owner Pak Agan + 10 Karyawan Toko)
-- PIN Default: '1234' (hash: 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4)
DO $$
DECLARE
    cbg1 UUID; cbg2 UUID; cbg3 UUID; cbg4 UUID; cbg5 UUID;
    cbg6 UUID; cbg7 UUID; cbg8 UUID; cbg9 UUID; cbg10 UUID;
    pin_def VARCHAR(128) := '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';
BEGIN
    SELECT id INTO cbg1 FROM cabang WHERE nomor = 1;
    SELECT id INTO cbg2 FROM cabang WHERE nomor = 2;
    SELECT id INTO cbg3 FROM cabang WHERE nomor = 3;
    SELECT id INTO cbg4 FROM cabang WHERE nomor = 4;
    SELECT id INTO cbg5 FROM cabang WHERE nomor = 5;
    SELECT id INTO cbg6 FROM cabang WHERE nomor = 6;
    SELECT id INTO cbg7 FROM cabang WHERE nomor = 7;
    SELECT id INTO cbg8 FROM cabang WHERE nomor = 8;
    SELECT id INTO cbg9 FROM cabang WHERE nomor = 9;
    SELECT id INTO cbg10 FROM cabang WHERE nomor = 10;

    -- Owner Boss Pusat (Pak Agan)
    INSERT INTO karyawan (cabang_id, username, nama, role, telepon, pin_hash, password_plain, gaji_pokok, tunjangan, plafon_kasbon, tipe_gaji)
    VALUES (cbg1, 'pakagan', 'Pak Agan (Owner Pusat)', 'owner', '0812-3456-7890', pin_def, 'Owner#Serabi2026!', 15000000, 5000000, 0, 'bulanan')
    ON CONFLICT DO NOTHING;

    -- Staf Karyawan per Cabang
    INSERT INTO karyawan (cabang_id, username, nama, role, telepon, pin_hash, password_plain, tipe_gaji, gaji_harian, tabungan_rutin_mingguan, total_tabungan, gaji_pokok, tunjangan, plafon_kasbon) VALUES
    (cbg1, 'siti', 'Siti Rahmawati', 'karyawan', '0812-3456-7890', pin_def, 'Siti@Bawel123', 'harian', 100000, 200000, 600000, 2600000, 500000, 500000),
    (cbg2, 'budi', 'Budi Santoso', 'karyawan', '0813-9876-5432', pin_def, 'Budi@Seturan456', 'harian', 100000, 200000, 400000, 2600000, 500000, 500000),
    (cbg3, 'dewi', 'Dewi Lestari', 'karyawan', '0812-8765-4321', pin_def, 'Dewi@Jakal789', 'harian', 100000, 100000, 200000, 2600000, 500000, 500000),
    (cbg4, 'agus', 'Agus Pratama', 'karyawan', '0813-1234-5678', pin_def, 'Agus@Gejayan321', 'harian', 95000, 200000, 0, 2500000, 500000, 500000),
    (cbg1, 'rian', 'Rian Hidayat', 'karyawan', '0812-9988-7766', pin_def, 'Rian@Dapur111', 'harian', 95000, 150000, 0, 2500000, 500000, 500000),
    (cbg5, 'tri', 'Tri Handoko', 'karyawan', '0813-5555-6666', pin_def, 'Tri@Bantul555', 'harian', 95000, 200000, 0, 2500000, 500000, 500000),
    (cbg6, 'wahyu', 'Wahyu Nugroho', 'karyawan', '0813-6666-7777', pin_def, 'Wahyu@Solo666', 'harian', 95000, 200000, 0, 2500000, 500000, 500000),
    (cbg7, 'dewis', 'Dewi Susanti', 'karyawan', '0813-7777-8888', pin_def, 'Dewi@Semarang777', 'harian', 100000, 200000, 0, 2600000, 500000, 500000),
    (cbg8, 'rianf', 'Rian Firmansyah', 'karyawan', '0813-8888-9999', pin_def, 'Rian@Jakarta888', 'harian', 120000, 250000, 0, 3100000, 700000, 800000),
    (cbg9, 'lilis', 'Lilis Kurniasih', 'karyawan', '0813-9999-0000', pin_def, 'Lilis@Bandung999', 'harian', 105000, 200000, 0, 2700000, 600000, 600000),
    (cbg10, 'eko', 'Eko Prasetyo', 'karyawan', '0812-1000-1010', pin_def, 'Eko@Surabaya101', 'harian', 95000, 200000, 0, 2500000, 500000, 500000)
    ON CONFLICT DO NOTHING;
END $$;

-- 5. Insert Master Bahan Baku Utama
INSERT INTO bahan_baku (kode, nama, satuan, kategori, stok_minimum, stok_minimum_gudang, harga_satuan) VALUES
('BB-SRB-01', 'Tepung Beras Pilihan', 'kg', 'serabi', 10, 100, 14000),
('BB-SRB-02', 'Santan Kelapa Segar', 'liter', 'serabi', 8, 80, 18000),
('BB-SRB-03', 'Gula Aren Murni Cilacap', 'kg', 'serabi', 5, 50, 28000),
('BB-SRB-04', 'Daging Durian Montong Asli', 'kg', 'serabi', 3, 30, 85000),
('BB-SRB-05', 'Keju Cheddar Olahan', 'kg', 'serabi', 3, 20, 62000),
('BB-SRB-06', 'Meises Cokelat Premium', 'kg', 'serabi', 3, 20, 35000),
('BB-SRB-07', 'Oncom Matang Bumbu', 'kg', 'serabi', 2, 15, 25000),
('BB-WDG-01', 'Jahe Merah Emprit Bakar', 'kg', 'wedang', 5, 60, 32000),
('BB-WDG-02', 'Racikan Rempah Uwuh Komplit', 'bungkus', 'wedang', 25, 200, 3000),
('BB-WDG-03', 'Bola Ketan Ronde Manis', 'porsi', 'wedang', 20, 100, 4000),
('BB-WDG-04', 'Susu Murni Segar Boyolali', 'liter', 'wedang', 10, 50, 16000),
('BB-WDG-05', 'Madu Randu Asli Hutan', 'liter', 'wedang', 2, 20, 95000),
('BB-KMS-01', 'Dus Box Serabi 1 Porsi', 'pcs', 'kemasan', 50, 500, 850),
('BB-KMS-02', 'Paper Cup Wedang Hangat 12oz', 'pcs', 'kemasan', 50, 500, 650)
ON CONFLICT (kode) DO UPDATE SET
    nama = EXCLUDED.nama,
    satuan = EXCLUDED.satuan,
    kategori = EXCLUDED.kategori,
    harga_satuan = EXCLUDED.harga_satuan;
