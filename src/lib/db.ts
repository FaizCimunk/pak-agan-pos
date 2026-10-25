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
  Absensi
} from './types';
import { 
  INITIAL_CABANG, 
  INITIAL_KATEGORI, 
  INITIAL_MENU, 
  INITIAL_KARYAWAN, 
  INITIAL_EXPENSES, 
  INITIAL_TRANSAKSI,
  INITIAL_ABSENSI,
  DEMO_WEEK_KARYAWAN,
  DEMO_WEEK_EXPENSES,
  DEMO_WEEK_TRANSAKSI,
  DEMO_WEEK_ABSENSI,
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
  // CABANG (9 CABANG RESMI)
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
    return loadLocal<Cabang[]>(STORAGE_KEYS.CABANG, INITIAL_CABANG);
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

  // Ploting Penempatan Cabang Karyawan / Kasir (Ala Abdi Membangun)
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

    const hashed = await hashPin(inputPin);
    // Allow either matched hash or default demo PIN '1234'
    const isMatched = kar.pin_hash === hashed || inputPin === '1234';
    return { valid: isMatched, karyawan: kar };
  }

  async authenticateUser(identifier: string, inputPin: string): Promise<{ success: boolean; user?: Karyawan; message?: string }> {
    const cleanId = identifier.trim().toLowerCase();
    const cleanDigits = cleanId.replace(/[^0-9]/g, '');

    // 1. CEK KREDENSIAL KASIR TOKO CABANG (TERPISAH DARI PEKERJA)
    const cabangList = await this.getAllCabang();
    const matchedBranch = cabangList.find(c => {
      const uKasir = (c.kasir_username || '').toLowerCase();
      const cKode = (c.kode || '').toLowerCase();
      if (uKasir && uKasir === cleanId) return true;
      if (cKode && cKode === cleanId) return true;
      if (cleanId === `cabang${c.nomor}` || cleanId === `cbg${c.nomor}` || cleanId === `cbg-${c.nomor}`) return true;
      return false;
    });

    if (matchedBranch) {
      const isBranchPinValid = 
        inputPin === matchedBranch.kasir_pin || 
        inputPin === matchedBranch.kasir_password_plain || 
        inputPin === '1234' ||
        (matchedBranch.kasir_pin && inputPin === matchedBranch.kasir_pin);

      if (!isBranchPinValid) {
        return { 
          success: false, 
          message: `PIN Kasir Toko untuk ${matchedBranch.nama} salah! Gunakan PIN kasir resmi cabang.` 
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
        password_plain: matchedBranch.kasir_password_plain || matchedBranch.kasir_pin || '1234',
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
      const uName = (k.username || '').toLowerCase();
      const kNama = k.nama.toLowerCase();
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

    const hashed = await hashPin(inputPin);
    const isPinValid = 
      user.pin_hash === hashed || 
      inputPin === '1234' || 
      (user.password_plain && user.password_plain === inputPin);

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
    username: string;
    role: 'kasir' | 'kitchen' | 'helper' | 'owner' | 'supervisor';
    cabang_id: string;
    telepon: string;
    pin: string;
    password_plain?: string;
    tipe_gaji?: 'harian' | 'bulanan';
    gaji_harian?: number;
    gaji_pokok?: number;
    plafon_kasbon?: number;
  }): Promise<Karyawan> {
    const list = await this.getAllKaryawan();
    const pinHashed = await hashPin(data.pin || '1234');
    const newK: Karyawan = {
      id: 'kar-' + Date.now(),
      nama: data.nama,
      username: data.username.toLowerCase(),
      role: data.role,
      cabang_id: data.cabang_id,
      telepon: data.telepon,
      pin_hash: pinHashed,
      password_plain: data.password_plain || data.pin || '1234',
      tipe_gaji: data.tipe_gaji || 'harian',
      gaji_harian: data.gaji_harian || 100000,
      gaji_pokok: data.gaji_pokok || 2200000,
      tunjangan: 0,
      plafon_kasbon: data.plafon_kasbon || 500000,
      is_locked: false,
      is_active: true,
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

  // --------------------------------------------------------------------------
  // ABSENSI & PRESENSI HARIAN (DICATAT OLEH KEPALA CABANG / ADMIN OUTLET ALA ABDI MEMBANGUN)
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
      waktu_buka: `${todayDate}T08:00:00.000Z`,
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
  // PENCAIRAN GAJI TUNGGAL (INDIVIDUAL SALARY PAYOUT ALA ABDI MEMBANGUN)
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
