-- ==============================================================================
-- SISTEM POINT OF SALE (POS) & MANAGEMENT MULTI-CABANG "MINUMAN HERBAL PAK AGAN"
-- ARSITEKTUR DATABASE POSTGRESQL / SUPABASE DDL & SEED DATA
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM & DOMAINS (IF NEEDED, OR USE CHECK CONSTRAINTS)
-- Check constraints are preferred for portability with Supabase client generators.

-- ------------------------------------------------------------------------------
-- TABEL: cabang (9 Cabang Resmi Minuman Herbal Pak Agan)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cabang (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor INT UNIQUE NOT NULL CHECK (nomor BETWEEN 1 AND 9),
    kode VARCHAR(20) UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL,
    alamat TEXT NOT NULL,
    kota VARCHAR(50) NOT NULL,
    telepon VARCHAR(30) NOT NULL,
    target_omzet_bulanan NUMERIC(12, 2) DEFAULT 30000000,
    qris_merchant_name VARCHAR(100) DEFAULT 'Minuman Herbal Pak Agan',
    qris_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABEL: karyawan (Owner, Supervisor, Kasir Cabang)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS karyawan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabang_id UUID REFERENCES cabang(id) ON DELETE SET NULL,
    nama VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'supervisor', 'kasir')),
    telepon VARCHAR(30),
    pin_hash VARCHAR(128) NOT NULL, -- SHA-256 hash dari 4-6 digit PIN
    gaji_pokok NUMERIC(12, 2) DEFAULT 2500000,
    tunjangan NUMERIC(12, 2) DEFAULT 500000,
    plafon_kasbon NUMERIC(12, 2) DEFAULT 1000000,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABEL: kategori_menu
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kategori_menu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama VARCHAR(50) UNIQUE NOT NULL,
    icon VARCHAR(30) DEFAULT 'Coffee',
    urutan INT DEFAULT 0
);

-- ------------------------------------------------------------------------------
-- TABEL: menu (Katalog Minuman Herbal Resmi - Read Only di Kasir)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS menu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kategori_id UUID REFERENCES kategori_menu(id) ON DELETE SET NULL,
    kode VARCHAR(20) UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    harga NUMERIC(10, 2) NOT NULL CHECK (harga >= 0),
    gambar TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABEL: shift (Buka & Tutup Shift Laci Kasir)
-- Saldo Akhir Sistem = Modal Awal + Tunai Masuk - Belanja (Approved) - Kasbon (Approved)
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
-- TABEL: transaksi (Penjualan Kasir)
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
    metode_bayar VARCHAR(20) NOT NULL CHECK (metode_bayar IN ('tunai', 'qris', 'transfer')),
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
-- TABEL: pengeluaran_kasbon
-- Approval Center: Belanja Operasional & Kasbon Karyawan
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pengeluaran_kasbon (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabang_id UUID NOT NULL REFERENCES cabang(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shift(id) ON DELETE SET NULL,
    karyawan_id UUID REFERENCES karyawan(id) ON DELETE SET NULL,
    pemohon_nama VARCHAR(100) NOT NULL,
    jenis VARCHAR(20) NOT NULL CHECK (jenis IN ('belanja', 'kasbon')),
    keperluan TEXT NOT NULL,
    nominal NUMERIC(12, 2) NOT NULL CHECK (nominal > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    metode_pencairan VARCHAR(20) CHECK (metode_pencairan IN ('laci', 'transfer')),
    bukti_transfer_url TEXT,
    is_settled BOOLEAN NOT NULL DEFAULT FALSE, -- Kasbon otomatis masuk payroll bulanan jika is_settled = false
    tanggal TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    alasan_penolakan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABEL: payroll (Tutup Buku Bulanan & Mutasi Slip Gaji)
-- Gaji Bersih = Gaji Pokok + Tunjangan - Total Kasbon Approved
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    karyawan_id UUID NOT NULL REFERENCES karyawan(id) ON DELETE CASCADE,
    cabang_id UUID NOT NULL REFERENCES cabang(id) ON DELETE CASCADE,
    slip_no VARCHAR(50) UNIQUE NOT NULL,
    periode_bulan INT NOT NULL CHECK (periode_bulan BETWEEN 1 AND 12),
    periode_tahun INT NOT NULL,
    gaji_pokok NUMERIC(12, 2) NOT NULL,
    tunjangan NUMERIC(12, 2) NOT NULL,
    potongan_kasbon NUMERIC(12, 2) NOT NULL DEFAULT 0,
    gaji_bersih NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'locked' CHECK (status IN ('draft', 'locked', 'paid')),
    tanggal_kunci TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- INDEXES UNTUK PERFORMA FINTECH & MUTASI CEPAT
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transaksi_cabang_waktu ON transaksi(cabang_id, waktu DESC);
CREATE INDEX IF NOT EXISTS idx_transaksi_shift ON transaksi(shift_id);
CREATE INDEX IF NOT EXISTS idx_transaksi_item_transaksi ON transaksi_item(transaksi_id);
CREATE INDEX IF NOT EXISTS idx_shift_cabang_status ON shift(cabang_id, status);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_cabang_status ON pengeluaran_kasbon(cabang_id, status);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_kasbon_settled ON pengeluaran_kasbon(karyawan_id, status, is_settled);
CREATE INDEX IF NOT EXISTS idx_payroll_periode ON payroll(periode_tahun, periode_bulan);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE cabang ENABLE ROW LEVEL SECURITY;
ALTER TABLE karyawan ENABLE ROW LEVEL SECURITY;
ALTER TABLE kategori_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengeluaran_kasbon ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;

-- Policy Publik / Anon (Kasir dan Dashboard dapat membaca master data resmi)
CREATE POLICY "Public read cabang" ON cabang FOR SELECT USING (true);
CREATE POLICY "Public read menu" ON menu FOR SELECT USING (true);
CREATE POLICY "Public read kategori" ON kategori_menu FOR SELECT USING (true);
CREATE POLICY "Public read active karyawan" ON karyawan FOR SELECT USING (is_active = true);

-- Policy untuk Transaksi & Shift (Kasir dapat insert & select untuk cabangnya)
CREATE POLICY "Kasir insert transaksi" ON transaksi FOR INSERT WITH CHECK (true);
CREATE POLICY "Kasir read transaksi" ON transaksi FOR SELECT USING (true);
CREATE POLICY "Kasir insert transaksi_item" ON transaksi_item FOR INSERT WITH CHECK (true);
CREATE POLICY "Kasir read transaksi_item" ON transaksi_item FOR SELECT USING (true);

CREATE POLICY "Kasir manage shift" ON shift FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Kasir manage pengeluaran" ON pengeluaran_kasbon FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Owner manage all" ON payroll FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Owner manage menu" ON menu FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Owner manage karyawan" ON karyawan FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- SUPABASE REALTIME CONFIGURATION
-- Mendengarkan perubahan status approval kasbon & belanja secara instan di tablet
-- ------------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE pengeluaran_kasbon;
ALTER PUBLICATION supabase_realtime ADD TABLE shift;
ALTER PUBLICATION supabase_realtime ADD TABLE transaksi;

-- ------------------------------------------------------------------------------
-- STORAGE BUCKET: bukti-transfer
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bukti-transfer', 'bukti-transfer', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access Bukti Transfer"
ON storage.objects FOR SELECT
USING (bucket_id = 'bukti-transfer');

CREATE POLICY "Authenticated Upload Bukti Transfer"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bukti-transfer');

-- ==============================================================================
-- MASTER SEED DATA: 9 CABANG, KARYAWAN, MENU HERBAL PAK AGAN
-- ==============================================================================

-- 1. Insert 9 Cabang Resmi Minuman Herbal Pak Agan
INSERT INTO cabang (nomor, kode, nama, alamat, kota, telepon, target_omzet_bulanan) VALUES
(1, 'CBG-01', 'Cabang 01 - Malioboro Pusat', 'Jl. Malioboro No. 45, Danurejan', 'Yogyakarta', '0812-1000-0101', 45000000),
(2, 'CBG-02', 'Cabang 02 - Seturan Premium', 'Jl. Seturan Raya No. 12B, Depok, Sleman', 'Sleman', '0812-1000-0202', 38000000),
(3, 'CBG-03', 'Cabang 03 - Jakal KM 5 Kampus', 'Jl. Kaliurang KM 5.2 No. 88', 'Sleman', '0812-1000-0303', 35000000),
(4, 'CBG-04', 'Cabang 04 - Gejayan Santai', 'Jl. Affandi (Gejayan) No. 20, Condongcatur', 'Sleman', '0812-1000-0404', 32000000),
(5, 'CBG-05', 'Cabang 05 - Bantul Heritage', 'Jl. Jenderal Sudirman No. 102, Bantul', 'Bantul', '0812-1000-0505', 28000000),
(6, 'CBG-06', 'Cabang 06 - Solo Paragon', 'Jl. Yosodipuro No. 77, Mangkubumen', 'Surakarta', '0812-1000-0606', 36000000),
(7, 'CBG-07', 'Cabang 07 - Simpang Lima', 'Kawasan Kuliner Simpang Lima No. 15', 'Semarang', '0812-1000-0707', 40000000),
(8, 'CBG-08', 'Cabang 08 - Sudirman CBD', 'Jl. Jend. Sudirman Kav. 25, Karet', 'Jakarta Selatan', '0812-1000-0808', 55000000),
(9, 'CBG-09', 'Cabang 09 - Dago Asri', 'Jl. Ir. H. Juanda (Dago) No. 142', 'Bandung', '0812-1000-0909', 42000000)
ON CONFLICT (nomor) DO NOTHING;

-- 2. Insert Kategori Menu
INSERT INTO kategori_menu (nama, icon, urutan) VALUES
('Wedang Hangat Tradisional', 'Flame', 1),
('Es Herbal & Jamu Segar', 'Sparkles', 2),
('Jamu Rebusan Asli', 'ShieldCheck', 3),
('STMJ & Stamina', 'Zap', 4),
('Camilan & Wedang Ronde', 'Cookie', 5)
ON CONFLICT (nama) DO NOTHING;

-- 3. Insert Master Menu Minuman Herbal Pak Agan
-- Harga resmi terkunci dari pusat
DO $$
DECLARE
    kat_hangat UUID;
    kat_es UUID;
    kat_jamu UUID;
    kat_stamina UUID;
    kat_camilan UUID;
BEGIN
    SELECT id INTO kat_hangat FROM kategori_menu WHERE nama = 'Wedang Hangat Tradisional' LIMIT 1;
    SELECT id INTO kat_es FROM kategori_menu WHERE nama = 'Es Herbal & Jamu Segar' LIMIT 1;
    SELECT id INTO kat_jamu FROM kategori_menu WHERE nama = 'Jamu Rebusan Asli' LIMIT 1;
    SELECT id INTO kat_stamina FROM kategori_menu WHERE nama = 'STMJ & Stamina' LIMIT 1;
    SELECT id INTO kat_camilan FROM kategori_menu WHERE nama = 'Camilan & Wedang Ronde' LIMIT 1;

    INSERT INTO menu (kategori_id, kode, nama, deskripsi, harga, is_favorite, gambar) VALUES
    -- Wedang Hangat
    (kat_hangat, 'WD-01', 'Wedang Jahe Merah Emprit', 'Jahe merah bakar geprek, gula aren asli, kayu manis dan serai wangi.', 15000, true, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=80'),
    (kat_hangat, 'WD-02', 'Wedang Uwuh Komplit Imogiri', 'Secang merah, cengkeh, jahe, kayu manis, pala, daun serai, gula batu.', 18000, true, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&q=80'),
    (kat_hangat, 'WD-03', 'Wedang Ronde Gula Jawa', 'Bola ketan kenyal isi kacang tanah manis, kuah jahe wangi daun pandan.', 20000, true, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80'),
    (kat_hangat, 'WD-04', 'Kopi Jahe Rempah Pak Agan', 'Robusta lereng Merapi dipadukan jahe bakar dan rempah kapulaga.', 18000, false, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80'),
    
    -- Es Herbal & Jamu Segar
    (kat_es, 'ES-01', 'Es Kunyit Asam Sirih Dingin', 'Kunyit biang segar, asam jawa matang, sirih temu kunci, disajikan dingin.', 16000, true, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80'),
    (kat_es, 'ES-02', 'Es Beras Kencur Wangi', 'Beras sangrai aromatik, kencur segar pilihan, gula kelapa murni.', 16000, true, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80'),
    (kat_es, 'ES-03', 'Liang Cha Herbal Dingin', 'Teh herbal 5 macam bunga dan akar penurun panas dalam beraroma sejuk.', 17000, false, 'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?w=400&q=80'),
    (kat_es, 'ES-04', 'Es Gula Asam Segar Selasih', 'Sari asam jawa murni berpadu biji selasih dan jeruk nipis peras.', 14000, false, 'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=400&q=80'),

    -- Jamu Rebusan Asli
    (kat_jamu, 'JM-01', 'Temulawak Madu Hutan', 'Temulawak rimpang tua, madu randu murni penambah nafsu makan & liver.', 17000, false, 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&q=80'),
    (kat_jamu, 'JM-02', 'Pahitan Brotowali Sambiloto', 'Rebusan brotowali, daun sambiloto, alang-alang untuk detoksifikasi alami.', 15000, false, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=80'),

    -- STMJ & Stamina
    (kat_stamina, 'ST-01', 'STMJ Super Jahe Merah', 'Susu sapi murni segar Boyolali, Telur bebek kampung, Madu hutan, Jahe merah.', 25000, true, 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=400&q=80'),
    (kat_stamina, 'ST-02', 'Wedang Bajigur Santan Gurih', 'Santan kelapa segar, gula merah, jahe bakar, daun pandan, irisan kolang kaling.', 16000, false, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=80'),

    -- Camilan
    (kat_camilan, 'CM-01', 'Pisang Goreng Wijen Madu', 'Pisang raja pilihan digoreng renyah bertabur wijen dan kucuran madu.', 15000, false, 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?w=400&q=80'),
    (kat_camilan, 'CM-02', 'Singkong Keju Goreng Merekah', 'Singkong merekah empuk dengan taburan keju cheddar gurih.', 15000, false, 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=400&q=80')
    ON CONFLICT (kode) DO NOTHING;
END $$;

-- 4. Insert Karyawan Awal (Owner Pak Agan + Kasir Cabang)
-- PIN: '1234' (hash: 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4)
DO $$
DECLARE
    cbg1 UUID; cbg2 UUID; cbg3 UUID; cbg4 UUID; cbg5 UUID;
    cbg6 UUID; cbg7 UUID; cbg8 UUID; cbg9 UUID;
    pin_default VARCHAR(128) := '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'; -- '1234'
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

    -- Owner (Pak Agan)
    INSERT INTO karyawan (cabang_id, nama, role, telepon, pin_hash, gaji_pokok, tunjangan, plafon_kasbon)
    VALUES (cbg1, 'Pak Agan (Owner)', 'owner', '0812-3456-7890', pin_default, 15000000, 5000000, 0);

    -- Supervisor Regional
    INSERT INTO karyawan (cabang_id, nama, role, telepon, pin_hash, gaji_pokok, tunjangan, plafon_kasbon)
    VALUES (cbg1, 'Budi Santoso (Supervisor)', 'supervisor', '0812-7788-9900', pin_default, 4500000, 1000000, 1500000);

    -- Kasir per Cabang
    INSERT INTO karyawan (cabang_id, nama, role, telepon, pin_hash, gaji_pokok, tunjangan, plafon_kasbon) VALUES
    (cbg1, 'Siti Rahmawati', 'kasir', '0813-1111-2222', pin_default, 2700000, 500000, 1000000),
    (cbg1, 'Dimas Prasetyo', 'kasir', '0813-1111-3333', pin_default, 2600000, 500000, 1000000),
    (cbg2, 'Anisa Nur', 'kasir', '0813-2222-3333', pin_default, 2600000, 500000, 1000000),
    (cbg3, 'Fajar Hidayat', 'kasir', '0813-3333-4444', pin_default, 2600000, 500000, 1000000),
    (cbg4, 'Ratna Sari', 'kasir', '0813-4444-5555', pin_default, 2600000, 500000, 1000000),
    (cbg5, 'Tri Handoko', 'kasir', '0813-5555-6666', pin_default, 2500000, 500000, 1000000),
    (cbg6, 'Wahyu Nugroho', 'kasir', '0813-6666-7777', pin_default, 2600000, 500000, 1000000),
    (cbg7, 'Dewi Lestari', 'kasir', '0813-7777-8888', pin_default, 2700000, 500000, 1000000),
    (cbg8, 'Rian Firmansyah', 'kasir', '0813-8888-9999', pin_default, 3300000, 700000, 1500000),
    (cbg9, 'Lilis Kurniasih', 'kasir', '0813-9999-0000', pin_default, 2900000, 600000, 1200000);
END $$;
