// Hybrid Database Layer for Minuman Herbal Pak Agan POS
// Connects to Supabase PostgreSQL when available, and smoothly provides local reactive persistence for demo/offline.

import { supabase, isSupabaseConfigured } from './supabase';
import { 
  Cabang, 
  MenuItem, 
  KategoriMenu, 
  Karyawan, 
  Shift, 
  Transaksi, 
  PengeluaranKasbon, 
  Payroll,
  MetodePencairan,
  Absensi,
  BahanBaku,
  KirimanBahanPusat,
  AbsensiBahanHarian,
  FixedCostHarianCabang,
  PembayaranFixedCostBulanan,
  PembelianBahanGudang
} from './types';
import { 
  INITIAL_CABANG, 
  INITIAL_KATEGORI, 
  INITIAL_MENU, 
  INITIAL_KARYAWAN, 
  INITIAL_EXPENSES, 
  INITIAL_TRANSAKSI,
  INITIAL_ABSENSI,
  INITIAL_BAHAN_BAKU,
  MENU_BAHAN_RESEP,
  INITIAL_KIRIMAN_BAHAN,
  INITIAL_ABSENSI_BAHAN,
  INITIAL_PEMBELIAN_GUDANG,
  DEMO_WEEK_KARYAWAN,
  DEMO_WEEK_EXPENSES,
  DEMO_WEEK_TRANSAKSI,
  DEMO_WEEK_ABSENSI,
  INITIAL_FIXED_COST_PAYMENTS,
  DEFAULT_PIN_HASH 
} from './mock-data';
import { hashPin } from './utils';

// Local storage keys for hybrid offline/standalone simulation
const STORAGE_KEYS = {
  CABANG: 'pak_agan_cabang_v5_demo_week',
  MENU: 'pak_agan_menu_v5_demo_week',
  KARYAWAN: 'pak_agan_karyawan_v5_demo_week',
  SHIFTS: 'pak_agan_shifts_v5_demo_week',
  TRANSAKSI: 'pak_agan_transaksi_v5_demo_week',
  EXPENSES: 'pak_agan_expenses_v5_demo_week',
  PAYROLL: 'pak_agan_payroll_v5_demo_week',
  ABSENSI: 'pak_agan_absensi_v5_demo_week',
  BAHAN_BAKU: 'pak_agan_bahan_baku_v5_demo_week',
  PEMBELIAN_GUDANG: 'pak_agan_pembelian_gudang_v5_demo_week',
  KIRIMAN_BAHAN: 'pak_agan_kiriman_bahan_v5_demo_week',
  ABSENSI_BAHAN: 'pak_agan_absensi_bahan_v5_demo_week',
  FIXED_COST_PAYMENTS: 'pak_agan_fixed_cost_payments_v5_demo_week',
  ACTIVE_SHIFT_PREFIX: 'pak_agan_active_shift_v5_demo_week_',
};

// In-Memory state initialization
function loadLocal<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function saveLocal<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
    // Trigger storage event for cross-tab synchronization
    window.dispatchEvent(new Event('pak_agan_db_updated'));
  } catch (e) {
    console.warn('Gagal menyimpan ke localStorage:', e);
  }
}

export class PosDatabase {
  // --------------------------------------------------------------------------
  // CABANG (10 CABANG RESMI)
  // --------------------------------------------------------------------------
  async getCabangList(): Promise<Cabang[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('cabang').select('*').order('nomor', { ascending: true });
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn('Fallback to local cabang data:', e);
      }
    }
    const local = loadLocal<Cabang[]>(STORAGE_KEYS.CABANG, INITIAL_CABANG);
    // Jika data lokal masih di bawah 10 cabang, sinkronkan cabang yang kurang
    if (local.length < INITIAL_CABANG.length) {
      for (const initCbg of INITIAL_CABANG) {
        if (!local.some(c => c.id === initCbg.id)) {
          local.push(initCbg);
        }
      }
      saveLocal(STORAGE_KEYS.CABANG, local);
    }
    return local;
  }

  async getAllCabang(): Promise<Cabang[]> {
    return this.getCabangList();
  }

  async getCabangById(id: string): Promise<Cabang | undefined> {
    const list = await this.getCabangList();
    return list.find(c => c.id === id || String(c.nomor) === id || c.kode === id);
  }

  async updateCabang(id: string, updates: Partial<Cabang>): Promise<Cabang> {
    const list = await this.getCabangList();
    const index = list.findIndex(c => c.id === id || c.kode === id);
    if (index === -1) throw new Error(`Cabang dengan ID ${id} tidak ditemukan.`);

    const updatedCabang: Cabang = {
      ...list[index],
      ...updates,
    };
    list[index] = updatedCabang;
    saveLocal(STORAGE_KEYS.CABANG, list);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('cabang').update(updates).eq('id', id);
      } catch (e) {
        console.warn('Supabase updateCabang fallback local:', e);
      }
    }

    return updatedCabang;
  }

  async createCabang(newCabang: Partial<Cabang>): Promise<Cabang> {
    const list = await this.getCabangList();
    const nextNomor = list.length > 0 ? Math.max(...list.map(c => c.nomor || 0)) + 1 : 1;
    const cabang: Cabang = {
      id: newCabang.id || `cbg-${nextNomor}`,
      nomor: newCabang.nomor || nextNomor,
      kode: newCabang.kode || `CBG-${String(nextNomor).padStart(2, '0')}`,
      nama: newCabang.nama || `Cabang ${String(nextNomor).padStart(2, '0')}`,
      alamat: newCabang.alamat || '',
      kota: newCabang.kota || 'Yogyakarta',
      telepon: newCabang.telepon || '0812-0000-0000',
      target_omzet_bulanan: newCabang.target_omzet_bulanan || 35000000,
      qris_merchant_name: newCabang.qris_merchant_name || newCabang.nama || `Serabi Bawel Cabang ${nextNomor}`,
      is_active: newCabang.is_active ?? true,
      kasir_username: newCabang.kasir_username || `kasir_cbg${nextNomor}`,
      kasir_pin: newCabang.kasir_pin || `88800${nextNomor}`,
      kasir_password_plain: newCabang.kasir_password_plain || `Kasir@Cbg${nextNomor}!`,
      pj_nama: newCabang.pj_nama || '',
      pj_telepon: newCabang.pj_telepon || newCabang.telepon || '',
      created_at: new Date().toISOString(),
    };
    list.push(cabang);
    saveLocal(STORAGE_KEYS.CABANG, list);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('cabang').insert(cabang);
      } catch (e) {
        console.warn('Supabase createCabang fallback local:', e);
      }
    }

    return cabang;
  }

  async resetCabangDefault(): Promise<Cabang[]> {
    saveLocal(STORAGE_KEYS.CABANG, INITIAL_CABANG);
    return INITIAL_CABANG;
  }

  // --------------------------------------------------------------------------
  // MENU & KATALOG HERBAL RESMI (READ ONLY DI TABLET, MANAGED DI PUSAT)
  // --------------------------------------------------------------------------
  async getKategoriList(): Promise<KategoriMenu[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('kategori_menu').select('*').order('urutan', { ascending: true });
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn('Fallback to local kategori:', e);
      }
    }
    return INITIAL_KATEGORI;
  }

  async getMenuList(): Promise<MenuItem[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('menu').select('*, kategori:kategori_menu(nama)').order('created_at', { ascending: true });
        if (!error && data && data.length > 0) {
          return data.map(item => ({
            ...item,
            kategori_nama: item.kategori?.nama,
          }));
        }
      } catch (e) {
        console.warn('Fallback to local menu data:', e);
      }
    }
    return loadLocal<MenuItem[]>(STORAGE_KEYS.MENU, INITIAL_MENU);
  }

  async saveMenu(item: Partial<MenuItem>): Promise<MenuItem> {
    let current = await this.getMenuList();
    let savedItem: MenuItem;

    if (item.id) {
      // Update existing menu
      const index = current.findIndex(m => m.id === item.id);
      if (index !== -1) {
        savedItem = {
          ...current[index],
          ...item,
          harga: Number(item.harga) !== undefined && !isNaN(Number(item.harga)) ? Number(item.harga) : current[index].harga,
          hpp: Number(item.hpp) !== undefined && !isNaN(Number(item.hpp)) ? Number(item.hpp) : (current[index].hpp || Math.round((Number(item.harga) || 15000) * 0.32)),
        };
        current[index] = savedItem;
      } else {
        throw new Error(`Menu dengan ID ${item.id} tidak ditemukan.`);
      }
    } else {
      // Create new menu
      savedItem = {
        id: 'm-' + Date.now(),
        kategori_id: item.kategori_id || 'kat-wg',
        kategori_nama: item.kategori_nama || 'Wedang Geprek Rempah',
        kode: item.kode || `MN-${Math.floor(10 + Math.random() * 90)}`,
        nama: item.nama || 'Minuman Herbal Baru',
        deskripsi: item.deskripsi || '',
        harga: Number(item.harga) || 15000,
        hpp: Number(item.hpp) || Math.round((Number(item.harga) || 15000) * 0.32),
        gambar: item.gambar || 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&q=80',
        is_favorite: !!item.is_favorite,
        is_active: item.is_active ?? true,
        cabang_ids: item.cabang_ids || [],
        created_at: new Date().toISOString(),
      };
      current.push(savedItem);
    }

    saveLocal(STORAGE_KEYS.MENU, current);

    if (isSupabaseConfigured && supabase) {
      try {
        if (item.id) {
          await supabase.from('menu').update(savedItem).eq('id', item.id);
        } else {
          await supabase.from('menu').insert(savedItem);
        }
      } catch (e) {
        console.warn('Supabase saveMenu fallback local:', e);
      }
    }

    return savedItem;
  }

  async deleteMenu(id: string): Promise<boolean> {
    let current = await this.getMenuList();
    current = current.filter(m => m.id !== id);
    saveLocal(STORAGE_KEYS.MENU, current);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('menu').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase deleteMenu fallback local:', e);
      }
    }

    return true;
  }

  async resetMenuDefault(): Promise<MenuItem[]> {
    saveLocal(STORAGE_KEYS.MENU, INITIAL_MENU);
    return INITIAL_MENU;
  }

  // --------------------------------------------------------------------------
  // KARYAWAN & PIN AUTH
  // --------------------------------------------------------------------------
  async getAllKaryawan(): Promise<Karyawan[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('karyawan').select('*').order('nama', { ascending: true });
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn('Fallback to local karyawan:', e);
      }
    }
    const local = loadLocal<Karyawan[]>(STORAGE_KEYS.KARYAWAN, INITIAL_KARYAWAN);
    // Ensure owner is always pinned to 'pusat' to prevent any branch device collision
    return local.map(k => k.role === 'owner' ? { ...k, cabang_id: 'pusat' } : k);
  }

  async getKaryawanByCabang(cabangId: string): Promise<Karyawan[]> {
    const all = await this.getAllKaryawan();
    return all.filter(k => k.cabang_id === cabangId && k.is_active);
  }

  // Ploting Penempatan Cabang Karyawan / Kasir
  async assignKaryawanCabang(karyawanId: string, cabangId: string): Promise<Karyawan> {
    const list = await this.getAllKaryawan();
    const index = list.findIndex(k => k.id === karyawanId);
    if (index === -1) throw new Error('Karyawan tidak ditemukan');

    const updated = { ...list[index], cabang_id: cabangId };
    list[index] = updated;
    saveLocal(STORAGE_KEYS.KARYAWAN, list);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('karyawan').update({ cabang_id: cabangId }).eq('id', karyawanId);
      } catch (e) {
        console.warn('Supabase assignKaryawanCabang fallback local:', e);
      }
    }

    return updated;
  }

  async verifyKaryawanPin(karyawanId: string, inputPin: string): Promise<{ valid: boolean; karyawan?: Karyawan }> {
    const list = await this.getAllKaryawan();
    const kar = list.find(k => k.id === karyawanId);
    if (!kar) return { valid: false };

    if (kar.is_locked) return { valid: false };

    const cleanInput = inputPin.trim();
    const hashed = await hashPin(cleanInput);
    const hasConfiguredPin = Boolean(kar.pin_hash || kar.password_plain);

    // Keamanan Ketat: jika sudah diset PIN atau sandi kustom, bypass demo '1234' otomatis ditolak
    const isMatched = 
      (kar.pin_hash && kar.pin_hash === hashed) || 
      (kar.password_plain && kar.password_plain === cleanInput) ||
      (!hasConfiguredPin && cleanInput === '1234');

    return { valid: isMatched, karyawan: kar };
  }

  async authenticateUser(identifier: string, inputPin: string): Promise<{ success: boolean; user?: Karyawan; message?: string }> {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPin = inputPin.trim();
    const cleanDigits = cleanId.replace(/[^0-9]/g, '');

    // 1. CEK KREDENSIAL KASIR TOKO CABANG (TERPISAH DARI PEKERJA)
    const cabangList = await this.getAllCabang();
    const matchedBranch = cabangList.find(c => {
      const uKasir = (c.kasir_username || '').toLowerCase().trim();
      const cKode = (c.kode || '').toLowerCase().trim();
      if (uKasir && uKasir === cleanId) return true;
      if (cKode && cKode === cleanId) return true;
      if (cleanId === `cabang${c.nomor}` || cleanId === `cbg${c.nomor}` || cleanId === `cbg-${c.nomor}`) return true;
      return false;
    });

    if (matchedBranch) {
      if (matchedBranch.is_kasir_locked) {
        return { 
          success: false, 
          message: `Akses tablet kasir ${matchedBranch.nama} saat ini sedang DIGEMBOK / DINONAKTIFKAN oleh Admin Pusat! Hubungi Pak Agan untuk membuka akses.` 
        };
      }

      const validPin = (matchedBranch.kasir_pin || '').trim();
      const validPass = (matchedBranch.kasir_password_plain || '').trim();
      const hasConfigured = Boolean(validPin || validPass);

      // Keamanan Ketat: Hanya terima PIN atau Password aktif cabang terkini.
      // Sandi kemarin/lama dan bypass demo '1234' otomatis ditolak begitu sandi/PIN disimpan!
      const isBranchPinValid = 
        (validPin && cleanPin === validPin) || 
        (validPass && cleanPin === validPass) ||
        (!hasConfigured && cleanPin === '1234');

      if (!isBranchPinValid) {
        return { 
          success: false, 
          message: `PIN / Sandi Kasir Toko untuk ${matchedBranch.nama} salah! Gunakan kredensial resmi cabang terkini.` 
        };
      }

      const kasirUser: Karyawan = {
        id: `kasir-${matchedBranch.id}`,
        cabang_id: matchedBranch.id,
        username: matchedBranch.kasir_username || `kasir_cbg${matchedBranch.nomor}`,
        nama: `Kasir Toko - ${matchedBranch.nama}`,
        role: 'kasir',
        telepon: matchedBranch.pj_telepon || matchedBranch.telepon,
        pin_hash: '',
        password_plain: matchedBranch.kasir_password_plain || matchedBranch.kasir_pin || '',
        tipe_gaji: 'bulanan',
        gaji_pokok: 0,
        tunjangan: 0,
        plafon_kasbon: 0,
        is_active: true,
      };

      return { success: true, user: kasirUser };
    }

    // 2. CEK KREDENSIAL PEKERJA / STAF PERSONAL ATAU OWNER PUSAT
    const list = await this.getAllKaryawan();
    const user = list.find(k => {
      const uName = (k.username || '').toLowerCase().trim();
      const kNama = k.nama.toLowerCase().trim();
      const kPhoneDigits = (k.telepon || '').replace(/[^0-9]/g, '');

      if (uName && uName === cleanId) return true;
      if (cleanDigits && kPhoneDigits && (kPhoneDigits === cleanDigits || kPhoneDigits.endsWith(cleanDigits))) return true;
      if (kNama === cleanId) return true;

      // Shortcut aliases for Owner
      if (cleanId === 'owner' || cleanId === 'pakagan' || cleanId === 'admin') {
        return k.role === 'owner';
      }
      return false;
    });

    if (!user) {
      return { success: false, message: 'Nomor HP atau ID Pengguna tidak ditemukan.' };
    }

    if (user.is_locked) {
      return { 
        success: false, 
        message: 'Akun ini terkunci oleh Master Admin demi keamanan. Hubungi Pak Agan untuk membuka gembok.' 
      };
    }

    const hashed = await hashPin(cleanPin);
    const hasConfiguredUserCreds = Boolean(user.pin_hash || user.password_plain);

    // Keamanan Ketat Pekerja: Tolak sandi kemarin / lama dan bypass demo '1234'
    const isPinValid = 
      (user.pin_hash && user.pin_hash === hashed) || 
      (user.password_plain && user.password_plain === cleanPin) ||
      (!hasConfiguredUserCreds && cleanPin === '1234');

    if (!isPinValid) {
      return { success: false, message: 'PIN / Sandi rahasia salah.' };
    }

    return { success: true, user };
  }

  async getKaryawanById(karyawanId: string): Promise<Karyawan | undefined> {
    const list = await this.getAllKaryawan();
    return list.find(k => k.id === karyawanId);
  }

  async resetKaryawanPin(karyawanId: string, newPin: string): Promise<boolean> {
    const list = await this.getAllKaryawan();
    const hashed = await hashPin(newPin);
    const updated = list.map(k => k.id === karyawanId ? { ...k, pin_hash: hashed, password_plain: newPin } : k);
    saveLocal(STORAGE_KEYS.KARYAWAN, updated);
    return true;
  }

  async updateKaryawanCredentials(
    karyawanId: string,
    data: { username?: string; pin?: string; password_plain?: string; is_locked?: boolean }
  ): Promise<boolean> {
    const list = await this.getAllKaryawan();
    let newHash: string | undefined = undefined;
    if (data.pin) {
      newHash = await hashPin(data.pin);
    }
    const updated = list.map(k => {
      if (k.id === karyawanId) {
        return {
          ...k,
          ...(data.username ? { username: data.username.toLowerCase().trim() } : {}),
          ...(newHash ? { pin_hash: newHash } : {}),
          ...(data.password_plain ? { password_plain: data.password_plain } : {}),
          ...(typeof data.is_locked === 'boolean' ? { is_locked: data.is_locked } : {}),
        };
      }
      return k;
    });
    saveLocal(STORAGE_KEYS.KARYAWAN, updated);
    return true;
  }

  async createKaryawan(data: {
    nama: string;
    username?: string;
    role: 'kasir' | 'kitchen' | 'helper' | 'owner' | 'supervisor';
    cabang_id: string;
    telepon?: string;
    pin?: string;
    password_plain?: string;
    tipe_gaji?: 'harian' | 'bulanan';
    gaji_harian?: number;
    gaji_pokok?: number;
    tunjangan?: number;
    plafon_kasbon?: number;
  }): Promise<Karyawan> {
    const list = await this.getAllKaryawan();
    const pinHashed = await hashPin(data.pin || '1234');
    const autoUsername = (data.username || data.nama.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'staf') + Math.floor(10 + Math.random() * 90);
    const newK: Karyawan = {
      id: 'kar-' + Date.now(),
      nama: data.nama,
      username: autoUsername,
      role: data.role,
      cabang_id: data.cabang_id,
      telepon: data.telepon || '0812-0000-0000',
      pin_hash: pinHashed,
      password_plain: data.password_plain || data.pin || '1234',
      tipe_gaji: data.tipe_gaji || 'harian',
      gaji_harian: data.gaji_harian || 100000,
      gaji_pokok: data.gaji_pokok || 2200000,
      tunjangan: data.tunjangan || 0,
      plafon_kasbon: data.plafon_kasbon || 500000,
      is_locked: false,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    list.push(newK);
    saveLocal(STORAGE_KEYS.KARYAWAN, list);
    return newK;
  }

  async deleteKaryawan(karyawanId: string): Promise<boolean> {
    const list = await this.getAllKaryawan();
    const updated = list.filter(k => k.id !== karyawanId);
    saveLocal(STORAGE_KEYS.KARYAWAN, updated);
    return true;
  }

  async toggleKaryawanLock(karyawanId: string, isLocked: boolean): Promise<boolean> {
    return this.updateKaryawanCredentials(karyawanId, { is_locked: isLocked });
  }

  async updateKaryawanSalary(
    karyawanId: string, 
    data: { 
      gaji_pokok: number; 
      tunjangan: number; 
      plafon_kasbon: number; 
      tipe_gaji?: 'bulanan' | 'harian'; 
      gaji_harian?: number;
      tunjangan_harian?: number;
    }
  ): Promise<boolean> {
    const list = await this.getAllKaryawan();
    const updated = list.map(k => k.id === karyawanId ? { ...k, ...data } : k);
    saveLocal(STORAGE_KEYS.KARYAWAN, updated);
    return true;
  }

  async updateKaryawanUtang(karyawanId: string, utang: number): Promise<boolean> {
    const list = await this.getAllKaryawan();
    const updated = list.map(k => k.id === karyawanId ? { ...k, utang_nominal: utang } : k);
    saveLocal(STORAGE_KEYS.KARYAWAN, updated);
    return true;
  }

  async updateMenuHpp(menuId: string, hpp: number): Promise<boolean> {
    const list = await this.getMenuList();
    const updated = list.map(m => m.id === menuId ? { ...m, hpp } : m);
    saveLocal(STORAGE_KEYS.MENU, updated);
    return true;
  }

  // --------------------------------------------------------------------------
  // ABSENSI & PRESENSI HARIAN (DICATAT OLEH KEPALA CABANG / ADMIN OUTLET)
  // --------------------------------------------------------------------------
  async getAbsensiList(karyawanId?: string, cabangId?: string, tanggal?: string): Promise<Absensi[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('absensi').select('*').order('tanggal', { ascending: false });
        if (karyawanId) query = query.eq('karyawan_id', karyawanId);
        if (cabangId) query = query.eq('cabang_id', cabangId);
        if (tanggal) query = query.eq('tanggal', tanggal);
        const { data, error } = await query;
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn('Fallback to local absensi:', e);
      }
    }
    const all = loadLocal<Absensi[]>(STORAGE_KEYS.ABSENSI, INITIAL_ABSENSI);

    // Auto-migrasi jadwal shift jam operasional sore-malam Serabi & Wedang (16:00 - 23:30)
    let hasOutdated = false;
    for (const a of all) {
      if (
        a.jam_masuk === '08:00' ||
        a.jam_masuk === '08:05' ||
        a.jam_masuk === '07:55' ||
        a.jam_masuk === '08:10' ||
        a.jam_masuk?.startsWith('08:') ||
        a.jam_masuk?.startsWith('07:') ||
        a.jam_pulang === '16:00' ||
        a.jam_pulang === '16:05' ||
        a.catatan?.includes('Shift Pagi')
      ) {
        if (a.jam_masuk === '08:05') a.jam_masuk = '16:05';
        else if (a.jam_masuk === '07:55') a.jam_masuk = '15:55';
        else if (a.jam_masuk === '08:10') a.jam_masuk = '16:10';
        else if (a.jam_masuk === '08:00' || a.jam_masuk?.startsWith('08:') || a.jam_masuk?.startsWith('07:')) a.jam_masuk = '16:00';

        if (a.jam_pulang === '16:00' || a.jam_pulang === '16:05' || !a.jam_pulang) {
          a.jam_pulang = '23:30';
        }

        if (a.catatan?.includes('Shift Pagi Weekend') || a.catatan === 'Shift Weekend') {
          a.catatan = 'Shift Sore-Malam Weekend';
        } else if (a.catatan?.includes('Shift Pagi')) {
          a.catatan = a.catatan.replace('Shift Pagi', 'Shift Sore-Malam');
        } else if (!a.catatan || a.catatan === 'Hadir' || a.catatan === 'Tepat Waktu') {
          a.catatan = 'Shift Sore-Malam';
        }
        hasOutdated = true;
      }
    }
    if (hasOutdated) {
      saveLocal(STORAGE_KEYS.ABSENSI, all);
    }
    return all.filter(a => {
      if (karyawanId && a.karyawan_id !== karyawanId) return false;
      if (cabangId && a.cabang_id !== cabangId) return false;
      if (tanggal && a.tanggal !== tanggal) return false;
      return true;
    });
  }

  async getKehadiranCount(karyawanId: string, bulan?: number, tahun?: number): Promise<number> {
    const list = await this.getAbsensiList(karyawanId);
    const targetBulan = bulan || 10;
    const targetTahun = tahun || 2026;

    const filtered = list.filter(a => {
      if (a.status !== 'hadir' && a.status !== 'setengah_hari') return false;
      if (a.tanggal) {
        const parts = a.tanggal.split('-');
        if (parts.length >= 2) {
          const tTahun = parseInt(parts[0], 10);
          const tBulan = parseInt(parts[1], 10);
          return tTahun === targetTahun && tBulan === targetBulan;
        }
      }
      return true;
    });

    return filtered.length > 0 ? filtered.length : 22;
  }

  async saveBranchAttendance(
    entries: {
      karyawan_id: string;
      karyawan_nama: string;
      cabang_id: string;
      cabang_nama: string;
      tanggal: string;
      jam_masuk: string;
      jam_pulang?: string | null;
      status: 'hadir' | 'setengah_hari' | 'izin' | 'sakit' | 'alpa';
      upah_harian: number;
      catatan?: string;
      recorded_by: string;
    }[]
  ): Promise<boolean> {
    const all = loadLocal<Absensi[]>(STORAGE_KEYS.ABSENSI, INITIAL_ABSENSI);

    for (const item of entries) {
      const upahMultiplier = item.status === 'hadir' ? 1 : item.status === 'setengah_hari' ? 0.5 : 0;
      const upahTerhitung = item.upah_harian * upahMultiplier;

      const existingIndex = all.findIndex(
        a => a.karyawan_id === item.karyawan_id && a.tanggal === item.tanggal
      );

      const record: Absensi = {
        id: existingIndex >= 0 ? all[existingIndex].id : `abs-${item.karyawan_id}-${item.tanggal}`,
        karyawan_id: item.karyawan_id,
        karyawan_nama: item.karyawan_nama,
        cabang_id: item.cabang_id,
        cabang_nama: item.cabang_nama,
        tanggal: item.tanggal,
        jam_masuk: item.jam_masuk,
        jam_pulang: item.jam_pulang || null,
        status: item.status,
        upah_harian_terhitung: upahTerhitung,
        catatan: item.catatan || '',
        recorded_by: item.recorded_by,
      };

      if (existingIndex >= 0) {
        all[existingIndex] = record;
      } else {
        all.unshift(record);
      }
    }

    saveLocal(STORAGE_KEYS.ABSENSI, all);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('absensi').upsert(all);
      } catch (e) {
        console.warn('Failed upserting absensi to supabase:', e);
      }
    }

    return true;
  }

  // --------------------------------------------------------------------------
  // SHIFT OPERASIONAL (BUKA & TUTUP SHIFT LACI)
  // --------------------------------------------------------------------------
  async getActiveShift(cabangId: string): Promise<Shift | null> {
    const key = STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + cabangId;
    let shift = loadLocal<Shift | null>(key, null);
    if (shift && shift.status === 'open') {
      // Re-calculate real-time balance
      return await this.calculateShiftBalance(shift);
    }

    // Periksa arsip shift apakah ada shift yang berstatus open hari ini
    const shifts = loadLocal<Shift[]>(STORAGE_KEYS.SHIFTS, []);
    const existingOpen = shifts.find(s => s.cabang_id === cabangId && s.status === 'open');
    if (existingOpen) {
      saveLocal(key, existingOpen);
      return await this.calculateShiftBalance(existingOpen);
    }

    // Inisialisasi otomatis Shift Resmi Harian untuk cabang ini (1x per hari)
    // Modal awal laci Rp 200.000 standar resmi toko per hari (TIDAK DIDUPLIKASI)
    const cabangs = await this.getCabangList();
    const targetCabang = cabangs.find(c => c.id === cabangId) || cabangs[0];
    const defaultPj = targetCabang?.pj_nama || targetCabang?.kasir_username || 'Siti Rahmawati (PJ)';
    const todayDate = new Date().toISOString().slice(0, 10);

    const autoDailyShift: Shift = {
      id: `shift-${cabangId}-${todayDate}`,
      cabang_id: cabangId,
      karyawan_id: `kar-${cabangId}`,
      karyawan_nama: defaultPj,
      waktu_buka: `${todayDate}T16:00:00.000Z`,
      waktu_tutup: null,
      modal_awal: 200000,
      total_tunai_masuk: 0,
      total_qris_masuk: 0,
      total_transfer_masuk: 0,
      total_belanja_approved: 0,
      total_kasbon_approved: 0,
      saldo_akhir_sistem: 200000,
      saldo_akhir_fisik: 0,
      selisih: 0,
      status: 'open',
    };

    saveLocal(key, autoDailyShift);
    shifts.push(autoDailyShift);
    saveLocal(STORAGE_KEYS.SHIFTS, shifts);

    return await this.calculateShiftBalance(autoDailyShift);
  }

  async openShift({
    cabang_id,
    karyawan_id,
    karyawan_nama,
    modal_awal,
  }: {
    cabang_id: string;
    karyawan_id: string;
    karyawan_nama: string;
    modal_awal: number;
  }): Promise<Shift> {
    // Cegah buka shift ganda jika shift hari ini sudah aktif
    const existing = await this.getActiveShift(cabang_id);
    if (existing && existing.status === 'open') {
      return existing;
    }

    const newShift: Shift = {
      id: 'shift-' + Date.now(),
      cabang_id,
      karyawan_id,
      karyawan_nama,
      waktu_buka: new Date().toISOString(),
      waktu_tutup: null,
      modal_awal,
      total_tunai_masuk: 0,
      total_qris_masuk: 0,
      total_transfer_masuk: 0,
      total_belanja_approved: 0,
      total_kasbon_approved: 0,
      saldo_akhir_sistem: modal_awal,
      saldo_akhir_fisik: 0,
      selisih: 0,
      status: 'open',
    };

    saveLocal(STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + cabang_id, newShift);

    const shifts = loadLocal<Shift[]>(STORAGE_KEYS.SHIFTS, []);
    shifts.push(newShift);
    saveLocal(STORAGE_KEYS.SHIFTS, shifts);

    // Otomatis catat presensi masuk kasir sesuai jam aktual buka shift
    try {
      const now = new Date();
      const jamMasukAktual = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayDate = now.toISOString().slice(0, 10);
      const absensiList = loadLocal<Absensi[]>(STORAGE_KEYS.ABSENSI, INITIAL_ABSENSI);
      const existingAbs = absensiList.find(a => a.karyawan_id === karyawan_id && a.tanggal === todayDate);

      const karObj = await this.getKaryawanById(karyawan_id);
      const upah = karObj?.gaji_harian || 100000;

      const cabangList = await this.getCabangList();
      const cbgObj = cabangList.find(c => c.id === cabang_id);

      if (existingAbs) {
        existingAbs.jam_masuk = jamMasukAktual;
        existingAbs.status = 'hadir';
        if (!existingAbs.catatan || existingAbs.catatan.includes('Shift')) {
          existingAbs.catatan = `Buka Shift ${jamMasukAktual}`;
        }
      } else {
        absensiList.push({
          id: `abs-${karyawan_id}-${todayDate}`,
          karyawan_id,
          karyawan_nama,
          cabang_id,
          cabang_nama: cbgObj?.nama || 'Cabang Outlet',
          tanggal: todayDate,
          jam_masuk: jamMasukAktual,
          jam_pulang: '23:30',
          status: 'hadir',
          upah_harian_terhitung: upah,
          catatan: `Buka Shift ${jamMasukAktual}`,
          recorded_by: karyawan_nama,
        });
      }
      saveLocal(STORAGE_KEYS.ABSENSI, absensiList);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('pak_agan_db_updated'));
      }
    } catch (e) {
      console.warn('Gagal auto-catat absensi saat openShift:', e);
    }

    return newShift;
  }

  // Calculate live shift balance from transactions and approved expenses
  async calculateShiftBalance(shift: Shift): Promise<Shift> {
    const transactions = await this.getTransaksiList(shift.cabang_id);
    const expenses = await this.getPengeluaranList(shift.cabang_id);

    // Sum transactions in this shift
    const shiftTransactions = transactions.filter(t => 
      t.status === 'completed' && new Date(t.waktu) >= new Date(shift.waktu_buka)
    );

    let tunaiMasuk = 0;
    let qrisMasuk = 0;
    let transferMasuk = 0;

    for (const trx of shiftTransactions) {
      if (trx.metode_bayar === 'tunai') tunaiMasuk += trx.total;
      if (trx.metode_bayar === 'qris') qrisMasuk += trx.total;
      if (trx.metode_bayar === 'transfer') transferMasuk += trx.total;
    }

    // Sum approved expenses taken from drawer ('laci')
    const shiftExpenses = expenses.filter(e => 
      e.status === 'approved' && 
      e.metode_pencairan === 'laci' &&
      new Date(e.tanggal) >= new Date(shift.waktu_buka)
    );

    let belanjaApproved = 0;
    let kasbonApproved = 0;

    for (const exp of shiftExpenses) {
      if (exp.jenis === 'belanja') belanjaApproved += exp.nominal;
      if (exp.jenis === 'kasbon') kasbonApproved += exp.nominal;
    }

    // Saldo Akhir Sistem = Modal Awal + Tunai Masuk - Belanja (Approved) - Kasbon (Approved)
    const saldoSistem = shift.modal_awal + tunaiMasuk - belanjaApproved - kasbonApproved;

    const updatedShift: Shift = {
      ...shift,
      total_tunai_masuk: tunaiMasuk,
      total_qris_masuk: qrisMasuk,
      total_transfer_masuk: transferMasuk,
      total_belanja_approved: belanjaApproved,
      total_kasbon_approved: kasbonApproved,
      saldo_akhir_sistem: saldoSistem,
    };

    return updatedShift;
  }

  async closeShift(
    cabangId: string, 
    saldoFisikLaci: number, 
    catatan?: string
  ): Promise<Shift | null> {
    const active = await this.getActiveShift(cabangId);
    if (!active) return null;

    const calculated = await this.calculateShiftBalance(active);
    const selisih = saldoFisikLaci - calculated.saldo_akhir_sistem;

    const closedShift: Shift = {
      ...calculated,
      waktu_tutup: new Date().toISOString(),
      saldo_akhir_fisik: saldoFisikLaci,
      selisih: selisih,
      status: 'closed',
      catatan: catatan || (selisih === 0 ? 'Kas cocok pas' : selisih > 0 ? `Surplus +${selisih}` : `Tekor ${selisih}`),
    };

    // Remove active shift
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + cabangId);
    }

    // Update archive
    const shifts = loadLocal<Shift[]>(STORAGE_KEYS.SHIFTS, []);
    const idx = shifts.findIndex(s => s.id === closedShift.id);
    if (idx !== -1) {
      shifts[idx] = closedShift;
    } else {
      shifts.push(closedShift);
    }
    saveLocal(STORAGE_KEYS.SHIFTS, shifts);

    // Otomatis sinkronkan jam pulang presensi kasir sesuai jam aktual tutup shift
    try {
      const now = new Date();
      const jamPulangAktual = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayDate = (active.waktu_buka ? new Date(active.waktu_buka) : now).toISOString().slice(0, 10);
      const absensiList = loadLocal<Absensi[]>(STORAGE_KEYS.ABSENSI, INITIAL_ABSENSI);
      const existingAbs = absensiList.find(a => a.karyawan_id === active.karyawan_id && a.tanggal === todayDate);
      if (existingAbs) {
        existingAbs.jam_pulang = jamPulangAktual;
        saveLocal(STORAGE_KEYS.ABSENSI, absensiList);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('pak_agan_db_updated'));
        }
      }
    } catch (e) {
      console.warn('Gagal update jam_pulang saat closeShift:', e);
    }

    return closedShift;
  }

  // --------------------------------------------------------------------------
  // TRANSAKSI PENJUALAN
  // --------------------------------------------------------------------------
  async getTransaksiList(cabangId?: string): Promise<Transaksi[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('transaksi').select('*, items:transaksi_item(*)').order('waktu', { ascending: false });
        if (cabangId) query = query.eq('cabang_id', cabangId);
        const { data, error } = await query;
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn('Fallback to local transaksi:', e);
      }
    }
    const all = loadLocal<Transaksi[]>(STORAGE_KEYS.TRANSAKSI, INITIAL_TRANSAKSI);
    // Ensure all INITIAL_TRANSAKSI are included if missing (e.g. newly added demo channel orders)
    const existingIds = new Set(all.map(t => t.id));
    let hasNew = false;
    for (const initTrx of INITIAL_TRANSAKSI) {
      if (!existingIds.has(initTrx.id)) {
        all.push(initTrx);
        hasNew = true;
      }
    }
    if (hasNew) {
      all.sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime());
      saveLocal(STORAGE_KEYS.TRANSAKSI, all);
    }
    if (cabangId) return all.filter(t => t.cabang_id === cabangId);
    return all;
  }

  async createTransaksi(trx: Transaksi): Promise<Transaksi> {
    const all = loadLocal<Transaksi[]>(STORAGE_KEYS.TRANSAKSI, INITIAL_TRANSAKSI);
    all.unshift(trx);
    saveLocal(STORAGE_KEYS.TRANSAKSI, all);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('transaksi').insert([{
          id: trx.id,
          invoice_no: trx.invoice_no,
          cabang_id: trx.cabang_id,
          shift_id: trx.shift_id,
          karyawan_id: trx.karyawan_id,
          nama_pelanggan: trx.nama_pelanggan,
          waktu: trx.waktu,
          subtotal: trx.subtotal,
          diskon: trx.diskon,
          total: trx.total,
          metode_bayar: trx.metode_bayar,
          bayar: trx.bayar,
          kembali: trx.kembali,
          status: trx.status,
          is_offline_synced: trx.is_offline_synced,
        }]);

        if (!error && trx.items && trx.items.length > 0) {
          const itemsPayload = trx.items.map(it => ({
            transaksi_id: trx.id,
            menu_id: it.menu_id,
            nama_menu: it.nama_menu,
            harga: it.harga,
            qty: it.qty,
            subtotal: it.subtotal,
            catatan: it.catatan,
          }));
          await supabase.from('transaksi_item').insert(itemsPayload);
        }
      } catch (e) {
        console.warn('Error inserting into Supabase:', e);
      }
    }

    return trx;
  }

  // --------------------------------------------------------------------------
  // APPROVAL CENTER: BELANJA & KASBON
  // --------------------------------------------------------------------------
  async getPengeluaranList(cabangId?: string): Promise<PengeluaranKasbon[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('pengeluaran_kasbon').select('*').order('tanggal', { ascending: false });
        if (cabangId) query = query.eq('cabang_id', cabangId);
        const { data, error } = await query;
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn('Fallback to local expenses:', e);
      }
    }
    const all = loadLocal<PengeluaranKasbon[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    if (cabangId) return all.filter(e => e.cabang_id === cabangId);
    return all;
  }

  async createPengeluaran(item: Omit<PengeluaranKasbon, 'id' | 'status' | 'is_settled' | 'tanggal'> & { tanggal?: string }): Promise<PengeluaranKasbon> {
    const newItem: PengeluaranKasbon = {
      ...item,
      id: 'exp-' + Date.now(),
      status: 'pending',
      is_settled: false,
      tanggal: item.tanggal || new Date().toISOString(),
    };

    const all = loadLocal<PengeluaranKasbon[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    all.unshift(newItem);
    saveLocal(STORAGE_KEYS.EXPENSES, all);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('pengeluaran_kasbon').insert([newItem]);
      } catch (e) {
        console.warn('Failed insert to supabase pengeluaran:', e);
      }
    }

    return newItem;
  }

  async approvePengeluaran(
    id: string, 
    params: { metode: MetodePencairan; buktiTransferUrl?: string; approvedBy?: string }
  ): Promise<boolean> {
    const all = loadLocal<PengeluaranKasbon[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    const updated = all.map(e => {
      if (e.id === id) {
        return {
          ...e,
          status: 'approved' as const,
          metode_pencairan: params.metode,
          bukti_transfer_url: params.buktiTransferUrl || e.bukti_transfer_url,
          approved_by: params.approvedBy || 'Pak Agan (Owner)',
          approved_at: new Date().toISOString(),
        };
      }
      return e;
    });

    saveLocal(STORAGE_KEYS.EXPENSES, updated);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('pengeluaran_kasbon').update({
          status: 'approved',
          metode_pencairan: params.metode,
          bukti_transfer_url: params.buktiTransferUrl,
          approved_by: params.approvedBy || 'Pak Agan (Owner)',
          approved_at: new Date().toISOString(),
        }).eq('id', id);
      } catch (e) {
        console.warn('Failed update approval to supabase:', e);
      }
    }

    return true;
  }

  async rejectPengeluaran(id: string, alasan: string, rejectedBy?: string): Promise<boolean> {
    const all = loadLocal<PengeluaranKasbon[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    const updated = all.map(e => {
      if (e.id === id) {
        return {
          ...e,
          status: 'rejected' as const,
          alasan_penolakan: alasan,
          approved_by: rejectedBy || 'Pak Agan (Owner)',
          approved_at: new Date().toISOString(),
        };
      }
      return e;
    });

    saveLocal(STORAGE_KEYS.EXPENSES, updated);
    return true;
  }

  // --------------------------------------------------------------------------
  // PAYROLL & TUTUP BUKU BULANAN
  // Gaji Bersih = Gaji Pokok + Tunjangan - Total Kasbon Approved (is_settled: false)
  // --------------------------------------------------------------------------
  async getUnsettledKasbon(karyawanId?: string): Promise<PengeluaranKasbon[]> {
    const all = await this.getPengeluaranList();
    return all.filter(e => 
      e.jenis === 'kasbon' && 
      e.status === 'approved' && 
      !e.is_settled &&
      (!karyawanId || e.karyawan_id === karyawanId)
    );
  }

  async getPayrollList(): Promise<Payroll[]> {
    return loadLocal<Payroll[]>(STORAGE_KEYS.PAYROLL, []);
  }

  async lockPayroll(records: Payroll[]): Promise<boolean> {
    const existing = await this.getPayrollList();
    const stampedRecords = records.map(r => ({
      ...r,
      status: 'paid' as const,
      tanggal_kunci: r.tanggal_kunci || new Date().toISOString()
    }));
    const updatedPayrolls = [...stampedRecords, ...existing];
    saveLocal(STORAGE_KEYS.PAYROLL, updatedPayrolls);

    // Mark corresponding kasbon as settled
    const allExpenses = loadLocal<PengeluaranKasbon[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    const settledKaryawanIds = new Set(records.map(r => r.karyawan_id));

    const updatedExpenses = allExpenses.map(e => {
      if (e.jenis === 'kasbon' && e.status === 'approved' && settledKaryawanIds.has(e.karyawan_id || '')) {
        return { ...e, is_settled: true };
      }
      return e;
    });

    saveLocal(STORAGE_KEYS.EXPENSES, updatedExpenses);
    return true;
  }

  // --------------------------------------------------------------------------
  // PENCAIRAN GAJI TUNGGAL (INDIVIDUAL SALARY PAYOUT)
  // --------------------------------------------------------------------------
  async payoutKaryawanSalary(params: {
    payroll: Payroll;
    nominalDicairkan: number;
    biayaAdmin: number;
    buktiTransferUrl?: string;
    catatan?: string;
  }): Promise<boolean> {
    const existing = await this.getPayrollList();
    const paidRecord: Payroll = {
      ...params.payroll,
      status: 'paid',
      gaji_bersih: params.nominalDicairkan,
      tanggal_kunci: new Date().toISOString(),
      keterangan: params.catatan || (params.biayaAdmin > 0 ? `Transfer via Bank (Admin: ${params.biayaAdmin})` : 'Transfer M-Banking Penuh'),
    };

    // Replace or add
    const updatedPayrolls = [paidRecord, ...existing.filter(p => p.id !== params.payroll.id && !(p.karyawan_id === params.payroll.karyawan_id && p.periode_bulan === params.payroll.periode_bulan && p.periode_tahun === params.payroll.periode_tahun))];
    saveLocal(STORAGE_KEYS.PAYROLL, updatedPayrolls);

    // 1. Tandai seluruh kasbon karyawan ini sebagai LUNAS (is_settled: true)
    const allExpenses = loadLocal<PengeluaranKasbon[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    const updatedExpenses = allExpenses.map(e => {
      if (e.jenis === 'kasbon' && e.status === 'approved' && e.karyawan_id === params.payroll.karyawan_id) {
        return { ...e, is_settled: true };
      }
      return e;
    });

    // 2. Simpan mutasi penarikan dana payout agar muncul di Riwayat Penarikan Dana staf
    const payoutRecord: PengeluaranKasbon = {
      id: 'payout-' + Date.now(),
      cabang_id: params.payroll.cabang_id,
      cabang_nama: params.payroll.cabang_nama,
      karyawan_id: params.payroll.karyawan_id,
      pemohon_nama: params.payroll.karyawan_nama || 'Karyawan',
      pemohon_telepon: params.payroll.karyawan_telepon,
      jenis: 'kasbon',
      keperluan: `Pencairan Gaji (Pelunasan) - Slip #${params.payroll.slip_no}`,
      nominal: params.nominalDicairkan,
      status: 'approved',
      metode_pencairan: 'transfer',
      bukti_transfer_url: params.buktiTransferUrl,
      is_settled: true,
      tanggal: new Date().toISOString(),
      approved_by: 'Pak Agan (Owner Pusat)',
      approved_at: new Date().toISOString(),
    };
    updatedExpenses.unshift(payoutRecord);

    saveLocal(STORAGE_KEYS.EXPENSES, updatedExpenses);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    return true;
  }

  // --------------------------------------------------------------------------
  // MASTER BAHAN BAKU & RESEP
  // --------------------------------------------------------------------------
  async getBahanBakuList(): Promise<BahanBaku[]> {
    return loadLocal<BahanBaku[]>(STORAGE_KEYS.BAHAN_BAKU, INITIAL_BAHAN_BAKU);
  }

  async createBahanBaku(bahan: Omit<BahanBaku, 'id' | 'kode'> & { kode?: string }): Promise<BahanBaku> {
    const list = await this.getBahanBakuList();
    const nextNomor = list.length + 1;
    const newBahan: BahanBaku = {
      ...bahan,
      id: 'bh-' + nextNomor,
      kode: bahan.kode || `BH-${String(nextNomor).padStart(2, '0')}`,
    };
    list.push(newBahan);
    saveLocal(STORAGE_KEYS.BAHAN_BAKU, list);
    return newBahan;
  }

  async updateBahanBaku(id: string, updates: Partial<BahanBaku>): Promise<BahanBaku | null> {
    const list = await this.getBahanBakuList();
    const idx = list.findIndex(b => b.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    saveLocal(STORAGE_KEYS.BAHAN_BAKU, list);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }
    return list[idx];
  }

  // --------------------------------------------------------------------------
  // PEMBELIAN / KULAKAN BAHAN MASUK GUDANG PUSAT (NABUNG DARI PETANI/SUPPLIER)
  // --------------------------------------------------------------------------
  async getPembelianGudangList(): Promise<PembelianBahanGudang[]> {
    return loadLocal<PembelianBahanGudang[]>(STORAGE_KEYS.PEMBELIAN_GUDANG, INITIAL_PEMBELIAN_GUDANG);
  }

  async createPembelianGudang(data: Omit<PembelianBahanGudang, 'id' | 'created_at'>): Promise<PembelianBahanGudang> {
    const all = await this.getPembelianGudangList();
    const newBeli: PembelianBahanGudang = {
      ...data,
      id: 'pbl-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    all.unshift(newBeli);
    saveLocal(STORAGE_KEYS.PEMBELIAN_GUDANG, all);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }
    return newBeli;
  }

  // Hitung stok akumulasi di Gudang Pusat (Total Kulakan Petani - Total Dikirim ke Cabang)
  async getStokGudangPusat(): Promise<Record<string, { total_masuk: number; total_terkirim: number; sisa_gudang: number; nilai_gudang: number; unit_price: number }>> {
    const pembelian = await this.getPembelianGudangList();
    const allKiriman = await this.getKirimanBahanList();
    const bahanList = await this.getBahanBakuList();

    const result: Record<string, { total_masuk: number; total_terkirim: number; sisa_gudang: number; nilai_gudang: number; unit_price: number }> = {};

    for (const b of bahanList) {
      const masuk = pembelian.filter(p => p.bahan_id === b.id).reduce((sum, p) => sum + p.jumlah_beli, 0);
      const terkirim = allKiriman.filter(k => k.bahan_id === b.id).reduce((sum, k) => sum + k.jumlah, 0);
      const sisa = Math.max(0, masuk - terkirim);
      const unitPrice = b.harga_satuan || 20000;
      result[b.id] = {
        total_masuk: masuk,
        total_terkirim: terkirim,
        sisa_gudang: sisa,
        nilai_gudang: sisa * unitPrice,
        unit_price: unitPrice,
      };
    }

    return result;
  }

  // --------------------------------------------------------------------------
  // KIRIMAN BAHAN DARI PUSAT KE CABANG (SATU PER SATU)
  // --------------------------------------------------------------------------
  async getKirimanBahanList(cabangId?: string, tanggal?: string): Promise<KirimanBahanPusat[]> {
    const all = loadLocal<KirimanBahanPusat[]>(STORAGE_KEYS.KIRIMAN_BAHAN, INITIAL_KIRIMAN_BAHAN);
    return all.filter(k => {
      if (cabangId && cabangId !== 'all' && k.cabang_id !== cabangId) return false;
      if (tanggal && k.tanggal !== tanggal) return false;
      return true;
    });
  }

  async createKirimanBahan(data: Omit<KirimanBahanPusat, 'id' | 'created_at'>): Promise<KirimanBahanPusat> {
    const all = loadLocal<KirimanBahanPusat[]>(STORAGE_KEYS.KIRIMAN_BAHAN, INITIAL_KIRIMAN_BAHAN);
    const newKiriman: KirimanBahanPusat = {
      ...data,
      id: 'krm-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    all.unshift(newKiriman);
    saveLocal(STORAGE_KEYS.KIRIMAN_BAHAN, all);
    return newKiriman;
  }

  // --------------------------------------------------------------------------
  // ABSENSI BAHAN HARIAN (DITARIK DARI DATA KASIR DI TEMPAT)
  // --------------------------------------------------------------------------
  async calculateBahanTerpakaiDariKasir(cabangId: string, tanggal: string): Promise<Record<string, number>> {
    const transactions = await this.getTransaksiList(cabangId);
    const dayTransactions = transactions.filter(t => 
      t.status === 'completed' && t.waktu.startsWith(tanggal)
    );

    const terpakaiMap: Record<string, number> = {};

    for (const trx of dayTransactions) {
      for (const it of trx.items) {
        const resepList = MENU_BAHAN_RESEP[it.menu_id];
        if (resepList && resepList.length > 0) {
          for (const r of resepList) {
            terpakaiMap[r.bahan_id] = (terpakaiMap[r.bahan_id] || 0) + (r.qty * it.qty);
          }
        } else {
          // Default fallback pemakaian bahan berdasarkan kategori:
          if (it.nama_menu.toLowerCase().includes('serabi')) {
            terpakaiMap['bh-1'] = (terpakaiMap['bh-1'] || 0) + it.qty; // Adonan serabi
            terpakaiMap['bh-11'] = (terpakaiMap['bh-11'] || 0) + it.qty; // Kemasan
          } else if (it.nama_menu.toLowerCase().includes('wedang') || it.nama_menu.toLowerCase().includes('jahe')) {
            terpakaiMap['bh-7'] = (terpakaiMap['bh-7'] || 0) + it.qty; // Jahe emprit
            terpakaiMap['bh-11'] = (terpakaiMap['bh-11'] || 0) + it.qty; // Kemasan
          }
        }
      }
    }

    return terpakaiMap;
  }

  async getAbsensiBahanHarian(cabangId: string, tanggal: string): Promise<AbsensiBahanHarian[]> {
    const bahanList = await this.getBahanBakuList();
    const kirimanList = await this.getKirimanBahanList(cabangId, tanggal);
    const terpakaiMap = await this.calculateBahanTerpakaiDariKasir(cabangId, tanggal);
    const savedAbsensi = loadLocal<AbsensiBahanHarian[]>(STORAGE_KEYS.ABSENSI_BAHAN, INITIAL_ABSENSI_BAHAN);

    const cabang = await this.getCabangById(cabangId);
    const cabangNama = cabang ? cabang.nama : cabangId;

    return bahanList.map(bahan => {
      // Cari jika sudah pernah diabsen kasir
      const exist = savedAbsensi.find(a => 
        a.cabang_id === cabangId && 
        a.tanggal === tanggal && 
        a.bahan_id === bahan.id
      );

      // Total kiriman dari pusat untuk bahan ini di tanggal ini
      const totalKiriman = kirimanList
        .filter(k => k.bahan_id === bahan.id)
        .reduce((sum, k) => sum + k.jumlah, 0);

      // Terpakai otomatis dari transaksi kasir hari ini
      const terpakai = terpakaiMap[bahan.id] || 0;

      // Stok awal default (atau dari exist)
      const stokAwal = exist ? exist.stok_awal : (bahan.stok_minimum || 20);
      const sisaSistem = stokAwal + totalKiriman - terpakai;
      const sisaFisik = exist ? exist.sisa_fisik : sisaSistem;
      const selisih = sisaFisik - sisaSistem;

      return {
        id: exist?.id || `abs-bh-${cabangId}-${bahan.id}-${tanggal}`,
        cabang_id: cabangId,
        cabang_nama: cabangNama,
        tanggal,
        bahan_id: bahan.id,
        bahan_nama: bahan.nama,
        satuan: bahan.satuan,
        stok_awal: stokAwal,
        kiriman_pusat: totalKiriman,
        terpakai_kasir: terpakai,
        sisa_sistem: sisaSistem,
        sisa_fisik: sisaFisik,
        selisih,
        status: selisih === 0 ? 'cocok' : 'selisih',
        kasir_nama: exist?.kasir_nama || '',
        catatan: exist?.catatan || '',
        updated_at: exist?.updated_at || undefined,
      };
    });
  }

  async saveAbsensiBahanHarian(records: AbsensiBahanHarian[]): Promise<boolean> {
    const all = loadLocal<AbsensiBahanHarian[]>(STORAGE_KEYS.ABSENSI_BAHAN, INITIAL_ABSENSI_BAHAN);

    for (const r of records) {
      const idx = all.findIndex(a => 
        a.cabang_id === r.cabang_id && 
        a.tanggal === r.tanggal && 
        a.bahan_id === r.bahan_id
      );
      const updatedRecord: AbsensiBahanHarian = {
        ...r,
        updated_at: new Date().toISOString(),
      };
      if (idx !== -1) {
        all[idx] = updatedRecord;
      } else {
        all.unshift(updatedRecord);
      }
    }

    saveLocal(STORAGE_KEYS.ABSENSI_BAHAN, all);
    return true;
  }

  // --------------------------------------------------------------------------
  // FIXED COST TOKO HARIAN & PERHITUNGAN UANG BERSIH MASUK REKENING BOSS
  // --------------------------------------------------------------------------
  async calculateFixedCostHarian(cabangId: string, tanggal: string): Promise<FixedCostHarianCabang> {
    const cabang = await this.getCabangById(cabangId);
    const cabangNama = cabang ? cabang.nama : cabangId;

    // 1. Fixed Cost Harian Toko (Bulanan / 30 hari)
    const sewaBulanan = cabang?.sewa_bulanan || 3000000;
    const listrikAirBulanan = cabang?.listrik_air_bulanan || 600000;
    const iuranBulanan = cabang?.iuran_kebersihan_bulanan || 150000;

    const sewaHarian = Math.round(sewaBulanan / 30);
    const wifiListrikHarian = Math.round(listrikAirBulanan / 30);
    const iuranHarian = Math.round(iuranBulanan / 30);

    // 2. Gaji Karyawan yang Hadir Hari Ini (Tulis Nama)
    const absensiHariIni = await this.getAbsensiList(undefined, cabangId, tanggal);
    const totalGajiKaryawan = absensiHariIni.reduce((sum, a) => sum + (a.upah_harian_terhitung || 0), 0);

    // 3. Omzet Kotor Kasir & Total HPP Bahan Baku Terpakai Hari Ini
    const transactions = await this.getTransaksiList(cabangId);
    const dayTransactions = transactions.filter(t => 
      t.status === 'completed' && t.waktu.startsWith(tanggal)
    );

    let omzetKotor = 0;
    let totalHppBahan = 0;

    const allMenus = await this.getMenuList();
    const menuHppMap: Record<string, number> = {};
    allMenus.forEach(m => { menuHppMap[m.id] = m.hpp || 4000; });

    for (const trx of dayTransactions) {
      omzetKotor += trx.total;
      for (const it of trx.items) {
        const itemHpp = menuHppMap[it.menu_id] || 4000;
        totalHppBahan += (itemHpp * it.qty);
      }
    }

    // 4. Belanja Laci Darurat Approved Hari Ini
    const expenses = await this.getPengeluaranList(cabangId);
    const dayExpenses = expenses.filter(e => 
      e.status === 'approved' && 
      e.jenis === 'belanja' && 
      e.metode_pencairan === 'laci' && 
      e.tanggal.startsWith(tanggal)
    );
    const totalBelanjaLaci = dayExpenses.reduce((sum, e) => sum + e.nominal, 0);

    // Total Potongan Harian = Sewa Ruko + Wifi/Listrik + Iuran + Gaji Karyawan + HPP Bahan (+ Belanja Laci)
    const totalPotonganHarian = sewaHarian + wifiListrikHarian + iuranHarian + totalGajiKaryawan + totalHppBahan + totalBelanjaLaci;

    // Uang Bersih Masuk Rekening Boss = Omzet Kotor - Total Potongan Harian
    const uangBersihRekeningBoss = omzetKotor - totalPotonganHarian;

    return {
      cabang_id: cabangId,
      cabang_nama: cabangNama,
      tanggal,
      sewa_harian: sewaHarian,
      wifi_listrik_harian: wifiListrikHarian,
      iuran_harian: iuranHarian,
      total_gaji_karyawan: totalGajiKaryawan,
      total_hpp_bahan: totalHppBahan,
      total_belanja_laci: totalBelanjaLaci,
      total_potongan_harian: totalPotonganHarian,
      omzet_kotor: omzetKotor,
      uang_bersih_rekening_boss: uangBersihRekeningBoss,
    };
  }

  // --------------------------------------------------------------------------
  // RESET DATA DARI 0 (MURNI TANPA TRANSAKSI, EXPENSES, MAUPUN KASIR DEMO)
  // --------------------------------------------------------------------------
  async resetDatabaseToZero(): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(k => {
          if (k.startsWith('pak_agan') || k.startsWith('pakagan')) {
            localStorage.removeItem(k);
          }
        });
      } catch (e) {
        console.warn('Gagal reset storage:', e);
      }
      saveLocal(STORAGE_KEYS.CABANG, INITIAL_CABANG);
      saveLocal(STORAGE_KEYS.MENU, INITIAL_MENU);
      saveLocal(STORAGE_KEYS.BAHAN_BAKU, INITIAL_BAHAN_BAKU);
      saveLocal(STORAGE_KEYS.KIRIMAN_BAHAN, []);
      saveLocal(STORAGE_KEYS.ABSENSI_BAHAN, []);
      // Murni hanya Master Owner Pak Agan
      const pureOwnerOnly: Karyawan[] = [
        {
          id: 'kar-0',
          cabang_id: 'pusat',
          username: 'pakagan',
          nama: 'Pak Agan (Owner Pusat)',
          role: 'owner',
          telepon: '0812-3456-7890',
          pin_hash: DEFAULT_PIN_HASH,
          password_plain: 'Owner#Serabi2026!',
          is_locked: false,
          tipe_gaji: 'bulanan',
          gaji_pokok: 0,
          gaji_harian: 0,
          tunjangan: 0,
          plafon_kasbon: 0,
          is_active: true,
        }
      ];
      saveLocal(STORAGE_KEYS.KARYAWAN, pureOwnerOnly);
      saveLocal(STORAGE_KEYS.EXPENSES, []);
      saveLocal(STORAGE_KEYS.TRANSAKSI, []);
      saveLocal(STORAGE_KEYS.ABSENSI, []);
      saveLocal(STORAGE_KEYS.PAYROLL, []);
      saveLocal(STORAGE_KEYS.SHIFTS, []);
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }
  }

  // --------------------------------------------------------------------------
  // PEMBAYARAN FIXED COST BULANAN (Sewa, Wi-Fi & Listrik, Sampah/Kebersihan)
  // --------------------------------------------------------------------------
  async getFixedCostPayments(periodeBulan?: string, cabangId?: string): Promise<PembayaranFixedCostBulanan[]> {
    const all = loadLocal<PembayaranFixedCostBulanan[]>(STORAGE_KEYS.FIXED_COST_PAYMENTS, INITIAL_FIXED_COST_PAYMENTS);
    return all.filter(p => {
      if (periodeBulan && p.periode_bulan !== periodeBulan) return false;
      if (cabangId && cabangId !== 'all' && p.cabang_id !== cabangId) return false;
      return true;
    });
  }

  async saveFixedCostPayment(data: Partial<PembayaranFixedCostBulanan>): Promise<PembayaranFixedCostBulanan> {
    const all = loadLocal<PembayaranFixedCostBulanan[]>(STORAGE_KEYS.FIXED_COST_PAYMENTS, INITIAL_FIXED_COST_PAYMENTS);
    const existingIndex = all.findIndex(p => p.id === data.id);

    const now = new Date().toISOString();
    let updatedItem: PembayaranFixedCostBulanan;

    if (existingIndex >= 0) {
      updatedItem = {
        ...all[existingIndex],
        ...data,
        updated_at: now
      };
      all[existingIndex] = updatedItem;
    } else {
      updatedItem = {
        id: data.id || `fcp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        cabang_id: data.cabang_id || 'cbg-1',
        cabang_nama: data.cabang_nama || 'Cabang',
        periode_bulan: data.periode_bulan || '2026-10',
        jenis_biaya: data.jenis_biaya || 'sewa',
        nama_biaya: data.nama_biaya || 'Biaya Tetap',
        nominal: data.nominal || 0,
        status: data.status || 'lunas',
        tanggal_bayar: data.tanggal_bayar || now.slice(0, 10),
        metode_bayar: data.metode_bayar || 'Transfer BCA (Pak Agan)',
        no_referensi: data.no_referensi || '',
        catatan: data.catatan || '',
        dibayar_oleh: data.dibayar_oleh || 'Pak Agan (Owner)',
        updated_at: now
      };
      all.push(updatedItem);
    }

    saveLocal(STORAGE_KEYS.FIXED_COST_PAYMENTS, all);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }
    return updatedItem;
  }

  async toggleFixedCostPaymentStatus(id: string, newStatus: 'lunas' | 'belum_bayar'): Promise<PembayaranFixedCostBulanan | null> {
    const all = loadLocal<PembayaranFixedCostBulanan[]>(STORAGE_KEYS.FIXED_COST_PAYMENTS, INITIAL_FIXED_COST_PAYMENTS);
    const idx = all.findIndex(p => p.id === id);
    if (idx < 0) return null;

    all[idx].status = newStatus;
    if (newStatus === 'lunas' && !all[idx].tanggal_bayar) {
      all[idx].tanggal_bayar = new Date().toISOString().slice(0, 10);
    }
    all[idx].updated_at = new Date().toISOString();

    saveLocal(STORAGE_KEYS.FIXED_COST_PAYMENTS, all);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }
    return all[idx];
  }

  async deleteFixedCostPayment(id: string): Promise<boolean> {
    const all = loadLocal<PembayaranFixedCostBulanan[]>(STORAGE_KEYS.FIXED_COST_PAYMENTS, INITIAL_FIXED_COST_PAYMENTS);
    const filtered = all.filter(p => p.id !== id);
    saveLocal(STORAGE_KEYS.FIXED_COST_PAYMENTS, filtered);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }
    return true;
  }

  // --------------------------------------------------------------------------
  // MUAT DATA SIMULASI UJI COBA 1 MINGGU (19 - 25 OKTOBER 2026)
  // --------------------------------------------------------------------------
  async loadOneWeekSimulationData(): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(k => {
          if (k.startsWith('pak_agan') || k.startsWith('pakagan')) {
            localStorage.removeItem(k);
          }
        });
      } catch (e) {
        console.warn('Gagal load demo storage:', e);
      }
      saveLocal(STORAGE_KEYS.CABANG, INITIAL_CABANG);
      saveLocal(STORAGE_KEYS.MENU, INITIAL_MENU);
      saveLocal(STORAGE_KEYS.BAHAN_BAKU, INITIAL_BAHAN_BAKU);
      saveLocal(STORAGE_KEYS.KIRIMAN_BAHAN, INITIAL_KIRIMAN_BAHAN);
      saveLocal(STORAGE_KEYS.ABSENSI_BAHAN, INITIAL_ABSENSI_BAHAN);
      saveLocal(STORAGE_KEYS.KARYAWAN, DEMO_WEEK_KARYAWAN);
      saveLocal(STORAGE_KEYS.EXPENSES, DEMO_WEEK_EXPENSES);
      saveLocal(STORAGE_KEYS.TRANSAKSI, DEMO_WEEK_TRANSAKSI);
      saveLocal(STORAGE_KEYS.ABSENSI, DEMO_WEEK_ABSENSI);
      saveLocal(STORAGE_KEYS.PAYROLL, []);
      saveLocal(STORAGE_KEYS.SHIFTS, []);
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }
  }
}

export const db = new PosDatabase();
