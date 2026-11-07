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
  PembelianBahanGudang,
  TabunganKaryawanItem
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
  INITIAL_TABUNGAN_KARYAWAN,
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
  TABUNGAN_KARYAWAN: 'pak_agan_tabungan_karyawan_v1',
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

// ----------------------------------------------------------------------------
// SUPABASE UUID & MULTI-CABANG COMPATIBILITY NORMALIZERS
// ----------------------------------------------------------------------------
export const CABANG_MAP_INFO = [
  { nomor: 1, kode: 'CBG-01', id: 'cbg-1', uuid: '033131aa-c935-475c-bba5-c8d383207cdc', nama: 'Cabang 01 - Malioboro Pusat' },
  { nomor: 2, kode: 'CBG-02', id: 'cbg-2', uuid: '1725e780-62fd-4fc7-9579-8bc1072f9bde', nama: 'Cabang 02 - Seturan Premium' },
  { nomor: 3, kode: 'CBG-03', id: 'cbg-3', uuid: 'd820c1e2-ff24-45db-a5e9-afc3693858fa', nama: 'Cabang 03 - Jakal KM 5 Kampus' },
  { nomor: 4, kode: 'CBG-04', id: 'cbg-4', uuid: '13f42afb-cc08-4432-88e3-7c2a3f9ae58e', nama: 'Cabang 04 - Gejayan Santai' },
  { nomor: 5, kode: 'CBG-05', id: 'cbg-5', uuid: '7420a530-75ff-4738-9d8a-33f524c6f0a0', nama: 'Cabang 05 - Bantul Heritage' },
  { nomor: 6, kode: 'CBG-06', id: 'cbg-6', uuid: 'c944d25a-ad4d-4f7c-8b15-53f1835a4bc3', nama: 'Cabang 06 - Solo Paragon' },
  { nomor: 7, kode: 'CBG-07', id: 'cbg-7', uuid: 'cf96130a-3d7f-414c-a24d-63ff531832c6', nama: 'Cabang 07 - Simpang Lima' },
  { nomor: 8, kode: 'CBG-08', id: 'cbg-8', uuid: '36f63123-9e00-4f0e-a994-aca423217563', nama: 'Cabang 08 - Sudirman CBD' },
  { nomor: 9, kode: 'CBG-09', id: 'cbg-9', uuid: 'b989aa0d-0287-4beb-8756-2b04762410ec', nama: 'Cabang 09 - Dago Asri' },
  { nomor: 10, kode: 'CBG-10', id: 'cbg-10', uuid: 'f3704352-1bc3-490d-9e95-c305c8238c12', nama: 'Cabang 10 - Gubeng Raya' },
];

export const MENU_UUID_MAP: Record<string, string> = {
  'SB-01': '0f86c544-4c70-4aac-a1e7-b645b62df6f1',
  'sb-1': '0f86c544-4c70-4aac-a1e7-b645b62df6f1',
  'sb-durian': '0f86c544-4c70-4aac-a1e7-b645b62df6f1',
  'SB-02': 'c88c523f-3cc2-473d-9a42-4920afc6ba92',
  'sb-2': 'c88c523f-3cc2-473d-9a42-4920afc6ba92',
  'sb-keju': 'c88c523f-3cc2-473d-9a42-4920afc6ba92',
  'SB-03': '9206368e-c97d-4bb4-8ccb-075c986965fe',
  'sb-3': '9206368e-c97d-4bb4-8ccb-075c986965fe',
  'sb-oncom': '9206368e-c97d-4bb4-8ccb-075c986965fe',
  'SB-04': '89b3c8a8-be68-4ea8-a085-54a51d84f2e5',
  'sb-4': '89b3c8a8-be68-4ea8-a085-54a51d84f2e5',
  'sb-pandan': '89b3c8a8-be68-4ea8-a085-54a51d84f2e5',
  'SB-05': 'e994bca7-37b4-42f2-a4f5-5ea7d641cab7',
  'sb-5': 'e994bca7-37b4-42f2-a4f5-5ea7d641cab7',
  'sb-telur': 'e994bca7-37b4-42f2-a4f5-5ea7d641cab7',
  'WD-01': 'b9ae10a9-726c-4e04-9146-f016a0fa2ad1',
  'wd-1': 'b9ae10a9-726c-4e04-9146-f016a0fa2ad1',
  'wd-jahe': 'b9ae10a9-726c-4e04-9146-f016a0fa2ad1',
  'WD-02': '2f00cac6-f672-493a-9139-758845aa4767',
  'wd-2': '2f00cac6-f672-493a-9139-758845aa4767',
  'wd-uwuh': '2f00cac6-f672-493a-9139-758845aa4767',
  'WD-03': '3b128a5e-f6c3-4d22-b716-d3c7da74711a',
  'wd-3': '3b128a5e-f6c3-4d22-b716-d3c7da74711a',
  'wd-ronde': '3b128a5e-f6c3-4d22-b716-d3c7da74711a',
  'WD-04': 'bffba394-9b97-449a-8016-07c55255fea3',
  'wd-4': 'bffba394-9b97-449a-8016-07c55255fea3',
  'wd-kopi': 'bffba394-9b97-449a-8016-07c55255fea3',
  'ES-01': 'cdaea903-ea85-4589-bcea-b452f930bae0',
  'es-1': 'cdaea903-ea85-4589-bcea-b452f930bae0',
  'es-kunyit': 'cdaea903-ea85-4589-bcea-b452f930bae0',
  'ES-02': '144f051e-a93d-4de6-a1a5-d0dca503a965',
  'es-2': '144f051e-a93d-4de6-a1a5-d0dca503a965',
  'es-beras': '144f051e-a93d-4de6-a1a5-d0dca503a965',
  'ST-01': 'f16c3c3e-4e87-4209-bdbe-d6b24fbe99b0',
  'st-1': 'f16c3c3e-4e87-4209-bdbe-d6b24fbe99b0',
  'st-stmj': 'f16c3c3e-4e87-4209-bdbe-d6b24fbe99b0',
  'ST-02': '90b24ec2-cc5c-486f-af83-932701cf53ee',
  'st-2': '90b24ec2-cc5c-486f-af83-932701cf53ee',
  'st-bajigur': '90b24ec2-cc5c-486f-af83-932701cf53ee',
  'CM-01': '03761f55-7207-4034-a0c9-0d1ccbab67fe',
  'cm-1': '03761f55-7207-4034-a0c9-0d1ccbab67fe',
  'cm-pisang': '03761f55-7207-4034-a0c9-0d1ccbab67fe',
  'CM-02': '870a21f6-523a-4851-9385-aee4daf5074a',
  'cm-2': '870a21f6-523a-4851-9385-aee4daf5074a',
  'cm-singkong': '870a21f6-523a-4851-9385-aee4daf5074a',
};

export const KARYAWAN_UUID_MAP: Record<string, string> = {
  'owner': 'b75325fa-cedb-407d-a42d-9a21a05a0be8',
  'pakagan': 'b75325fa-cedb-407d-a42d-9a21a05a0be8',
  'kar-1': '9d4ff5e1-cadc-40bc-86a0-d337263a5d46',
  'siti': '9d4ff5e1-cadc-40bc-86a0-d337263a5d46',
  'kar-2': '303b5220-d49e-4240-b074-3e1dca97c545',
  'budi': '303b5220-d49e-4240-b074-3e1dca97c545',
  'kar-3': 'bf55cca2-7491-4b59-a7c1-20ff40de8844',
  'dewi': 'bf55cca2-7491-4b59-a7c1-20ff40de8844',
  'kar-4': '19a1fcf0-d3a1-4ad1-a381-8a3423207698',
  'agus': '19a1fcf0-d3a1-4ad1-a381-8a3423207698',
  'kar-5': 'edf9966c-17df-4643-b5a3-91bb7e776f73',
  'rian': 'edf9966c-17df-4643-b5a3-91bb7e776f73',
  'kar-6': '9399d8ce-ac8c-4349-88c8-3531d6a5c0ab',
  'tri': '9399d8ce-ac8c-4349-88c8-3531d6a5c0ab',
  'kar-7': 'bc23bd72-aa92-4e60-997c-d4ce0deae62f',
  'wahyu': 'bc23bd72-aa92-4e60-997c-d4ce0deae62f',
  'kar-8': 'c240488a-16c3-47be-87b5-1e800d46d3cd',
  'dewis': 'c240488a-16c3-47be-87b5-1e800d46d3cd',
  'kar-9': '031105ad-0af4-43b1-8c50-2d8351874998',
  'rianf': '031105ad-0af4-43b1-8c50-2d8351874998',
  'kar-10': 'a56239fd-78f5-47f3-aaca-f969a4881b13',
  'lilis': 'a56239fd-78f5-47f3-aaca-f969a4881b13',
  'kar-11': '61058e79-6467-4f8a-acd9-e23aa02b9973',
  'eko': '61058e79-6467-4f8a-acd9-e23aa02b9973',
};

export function isValidUuid(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function getBranchUuid(idOrCode?: string | null): string | null {
  if (!idOrCode) return null;
  const clean = idOrCode.trim().toLowerCase();
  const match = CABANG_MAP_INFO.find(
    c => c.uuid.toLowerCase() === clean || 
         c.id.toLowerCase() === clean || 
         c.kode.toLowerCase() === clean || 
         String(c.nomor) === clean ||
         `cbg${c.nomor}` === clean ||
         `cbg-${c.nomor}` === clean ||
         `cabang${c.nomor}` === clean
  );
  return match ? match.uuid : (isValidUuid(idOrCode) ? idOrCode : null);
}

export function getBranchName(idOrCodeOrUuid?: string | null): string {
  if (!idOrCodeOrUuid) return 'Cabang';
  const clean = idOrCodeOrUuid.trim().toLowerCase();
  const match = CABANG_MAP_INFO.find(
    c => c.uuid.toLowerCase() === clean || 
         c.id.toLowerCase() === clean || 
         c.kode.toLowerCase() === clean || 
         String(c.nomor) === clean ||
         c.nama.toLowerCase().includes(clean)
  );
  return match ? match.nama : 'Cabang ' + idOrCodeOrUuid;
}

export function isBranchMatch(idA?: string | null, idB?: string | null): boolean {
  if (!idA || !idB) return false;
  if (idA === idB) return true;
  if (idB === 'all' || idA === 'all') return true;
  const uuidA = getBranchUuid(idA);
  const uuidB = getBranchUuid(idB);
  if (uuidA && uuidB && uuidA.toLowerCase() === uuidB.toLowerCase()) return true;
  return false;
}

export function getKaryawanUuid(idOrUsername?: string | null): string | null {
  if (!idOrUsername) return null;
  const clean = idOrUsername.trim().toLowerCase();
  if (KARYAWAN_UUID_MAP[clean]) return KARYAWAN_UUID_MAP[clean];
  if (isValidUuid(idOrUsername)) return idOrUsername;
  return null;
}

export function getMenuUuid(idOrCode?: string | null): string | null {
  if (!idOrCode) return null;
  const clean = idOrCode.trim();
  if (MENU_UUID_MAP[clean]) return MENU_UUID_MAP[clean];
  if (MENU_UUID_MAP[clean.toUpperCase()]) return MENU_UUID_MAP[clean.toUpperCase()];
  if (MENU_UUID_MAP[clean.toLowerCase()]) return MENU_UUID_MAP[clean.toLowerCase()];
  if (isValidUuid(idOrCode)) return idOrCode;
  return null;
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
    return list.find(c => isBranchMatch(c.id, id));
  }

  async updateCabang(id: string, updates: Partial<Cabang>): Promise<Cabang> {
    const list = await this.getCabangList();
    const index = list.findIndex(c => isBranchMatch(c.id, id));
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
        const targetUuid = getBranchUuid(id) || id;
        await supabase.from('cabang').update(updates).eq('id', targetUuid);
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
    return all.filter(k => isBranchMatch(k.cabang_id, cabangId) && k.is_active);
  }

  // Ploting Penempatan Cabang Karyawan / Kasir
  async assignKaryawanCabang(karyawanId: string, cabangId: string): Promise<Karyawan> {
    const list = await this.getAllKaryawan();
    const index = list.findIndex(k => k.id === karyawanId);
    if (index === -1) throw new Error('Karyawan tidak ditemukan');

    const updated = { ...list[index], cabang_id: cabangId };
    list[index] = updated;
    saveLocal(STORAGE_KEYS.KARYAWAN, list);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const branchUuid = getBranchUuid(cabangId);
        const karUuid = getKaryawanUuid(karyawanId);
        if (karUuid && branchUuid) {
          await supabase.from('karyawan').update({ cabang_id: branchUuid }).eq('id', karUuid);
        }
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
    const targetKarUuid = getKaryawanUuid(karyawanId);
    const updated = list.map(k => {
      const isMatch = k.id === karyawanId || k.username === karyawanId || (targetKarUuid && getKaryawanUuid(k.id) === targetKarUuid);
      return isMatch ? { ...k, pin_hash: hashed, password_plain: newPin } : k;
    });
    saveLocal(STORAGE_KEYS.KARYAWAN, updated);

    if (isSupabaseConfigured && supabase) {
      try {
        const karUuid = getKaryawanUuid(karyawanId);
        if (karUuid) {
          await supabase.from('karyawan').update({ pin_hash: hashed, password_plain: newPin }).eq('id', karUuid);
        }
      } catch (e) {
        console.warn('Supabase resetKaryawanPin error:', e);
      }
    }
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
    const targetKarUuid = getKaryawanUuid(karyawanId);
    const updated = list.map(k => {
      const isMatch = k.id === karyawanId || k.username === karyawanId || (targetKarUuid && getKaryawanUuid(k.id) === targetKarUuid);
      if (isMatch) {
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

    if (isSupabaseConfigured && supabase) {
      try {
        const karUuid = getKaryawanUuid(karyawanId);
        if (karUuid) {
          const payload: any = {};
          if (data.username) payload.username = data.username.toLowerCase().trim();
          if (newHash) payload.pin_hash = newHash;
          if (data.password_plain) payload.password_plain = data.password_plain;
          if (typeof data.is_locked === 'boolean') payload.is_locked = data.is_locked;
          await supabase.from('karyawan').update(payload).eq('id', karUuid);
        }
      } catch (e) {
        console.warn('Supabase updateKaryawanCredentials error:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }
    return true;
  }

  async createKaryawan(data: {
    nama: string;
    username?: string;
    role: 'kasir' | 'kitchen' | 'helper' | 'owner' | 'supervisor' | 'karyawan';
    cabang_id: string;
    telepon?: string;
    pin?: string;
    password_plain?: string;
    tipe_gaji?: 'harian' | 'bulanan';
    gaji_harian?: number;
    gaji_pokok?: number;
    tunjangan?: number;
    plafon_kasbon?: number;
    tabungan_rutin_mingguan?: number;
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
      gaji_pokok: data.gaji_pokok || 2600000,
      tunjangan: data.tunjangan || 0,
      plafon_kasbon: data.plafon_kasbon || 500000,
      tabungan_rutin_mingguan: data.tabungan_rutin_mingguan ?? 200000,
      total_tabungan: 0,
      is_locked: false,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    list.push(newK);
    saveLocal(STORAGE_KEYS.KARYAWAN, list);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }
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
      tabungan_rutin_mingguan?: number;
      total_tabungan?: number;
    }
  ): Promise<boolean> {
    const list = await this.getAllKaryawan();
    const updated = list.map(k => k.id === karyawanId ? { ...k, ...data } : k);
    saveLocal(STORAGE_KEYS.KARYAWAN, updated);

    if (isSupabaseConfigured && supabase) {
      try {
        const karUuid = getKaryawanUuid(karyawanId);
        if (karUuid) {
          await supabase.from('karyawan').update(data).eq('id', karUuid);
        }
      } catch (e) {
        console.warn('Supabase updateKaryawanSalary error:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }
    return true;
  }

  async updateKaryawanUtang(karyawanId: string, utang: number): Promise<boolean> {
    const list = await this.getAllKaryawan();
    const updated = list.map(k => k.id === karyawanId ? { ...k, utang_nominal: utang } : k);
    saveLocal(STORAGE_KEYS.KARYAWAN, updated);

    if (isSupabaseConfigured && supabase) {
      try {
        const karUuid = getKaryawanUuid(karyawanId);
        if (karUuid) {
          await supabase.from('karyawan').update({ utang_nominal: utang }).eq('id', karUuid);
        }
      } catch (e) {
        console.warn('Supabase updateKaryawanUtang error:', e);
      }
    }
    return true;
  }

  async updateMenuHpp(menuId: string, hpp: number): Promise<boolean> {
    const list = await this.getMenuList();
    const updated = list.map(m => m.id === menuId ? { ...m, hpp } : m);
    saveLocal(STORAGE_KEYS.MENU, updated);

    if (isSupabaseConfigured && supabase) {
      try {
        const menuUuid = getMenuUuid(menuId) || menuId;
        if (isValidUuid(menuUuid)) {
          await supabase.from('menu').update({ hpp }).eq('id', menuUuid);
        }
      } catch (e) {
        console.warn('Supabase updateMenuHpp error:', e);
      }
    }
    return true;
  }

  // --------------------------------------------------------------------------
  // ABSENSI & PRESENSI HARIAN (DICATAT OLEH KEPALA CABANG / ADMIN OUTLET)
  // --------------------------------------------------------------------------
  async getAbsensiList(karyawanId?: string, cabangId?: string, tanggal?: string): Promise<Absensi[]> {
    let cloudList: Absensi[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('absensi').select('*').order('tanggal', { ascending: false });
        if (karyawanId && karyawanId !== 'all') {
          const karUuid = getKaryawanUuid(karyawanId);
          if (karUuid) query = query.eq('karyawan_id', karUuid);
        }
        if (cabangId && cabangId !== 'all') {
          const cbgUuid = getBranchUuid(cabangId);
          if (cbgUuid) query = query.eq('cabang_id', cbgUuid);
        }
        if (tanggal) query = query.eq('tanggal', tanggal);
        const { data, error } = await query;
        if (!error && data) {
          cloudList = data.map((d: any) => ({
            ...d,
            cabang_nama: d.cabang_nama || getBranchName(d.cabang_id)
          }));
        }
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

    const combinedMap = new Map<string, Absensi>();
    for (const a of cloudList) {
      combinedMap.set(`${a.karyawan_id}-${a.tanggal}`, a);
    }
    for (const a of all) {
      const key = `${a.karyawan_id}-${a.tanggal}`;
      if (!combinedMap.has(key)) {
        combinedMap.set(key, {
          ...a,
          cabang_nama: a.cabang_nama || getBranchName(a.cabang_id)
        });
      }
    }

    const combined = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    );

    let result = combined;
    if (cabangId && cabangId !== 'all') {
      result = result.filter(a => isBranchMatch(a.cabang_id, cabangId));
    }
    if (karyawanId && karyawanId !== 'all') {
      result = result.filter(a => a.karyawan_id === karyawanId || getKaryawanUuid(a.karyawan_id) === getKaryawanUuid(karyawanId));
    }
    if (tanggal) {
      result = result.filter(a => a.tanggal === tanggal);
    }
    return result;
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
        const payload = entries.map(item => {
          const branchUuid = getBranchUuid(item.cabang_id) || CABANG_MAP_INFO[0].uuid;
          const karUuid = getKaryawanUuid(item.karyawan_id) || KARYAWAN_UUID_MAP['kar-1'];
          const upahMultiplier = item.status === 'hadir' ? 1 : item.status === 'setengah_hari' ? 0.5 : 0;
          return {
            id: generateUUID(),
            karyawan_id: karUuid,
            karyawan_nama: item.karyawan_nama,
            cabang_id: branchUuid,
            cabang_nama: item.cabang_nama,
            tanggal: item.tanggal,
            status: item.status,
            upah_harian_terhitung: item.upah_harian * upahMultiplier,
            catatan: item.catatan || '',
            recorded_by: item.recorded_by
          };
        });
        await supabase.from('absensi').insert(payload);
      } catch (e) {
        console.warn('Failed inserting absensi to supabase:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }

    return true;
  }

  // --------------------------------------------------------------------------
  // SHIFT OPERASIONAL (BUKA & TUTUP SHIFT LACI)
  // --------------------------------------------------------------------------
  async getActiveShift(cabangId: string): Promise<Shift | null> {
    const branchUuid = getBranchUuid(cabangId) || cabangId;
    const key = STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + branchUuid;
    let shift = loadLocal<Shift | null>(key, null) || loadLocal<Shift | null>(STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + cabangId, null);
    if (shift && shift.status === 'open') {
      // Re-calculate real-time balance
      return await this.calculateShiftBalance(shift);
    }

    // 1. Periksa cloud Supabase apakah ada shift yang berstatus open untuk cabang ini
    if (isSupabaseConfigured && supabase) {
      try {
        if (branchUuid) {
          const { data, error } = await supabase
            .from('shift')
            .select('*')
            .eq('cabang_id', branchUuid)
            .eq('status', 'open')
            .order('waktu_buka', { ascending: false })
            .limit(1);

          if (!error && data && data.length > 0) {
            const row = data[0];
            const supaShift: Shift = {
              id: row.id,
              cabang_id: cabangId,
              karyawan_id: row.karyawan_id || `kar-${cabangId}`,
              karyawan_nama: row.karyawan_nama || 'Kasir Outlet',
              waktu_buka: row.waktu_buka,
              waktu_tutup: null,
              modal_awal: Number(row.modal_awal) || 200000,
              total_tunai_masuk: Number(row.total_tunai_masuk || 0),
              total_qris_masuk: Number(row.total_qris_masuk || 0),
              total_transfer_masuk: Number(row.total_transfer_masuk || 0),
              total_belanja_approved: Number(row.total_belanja_approved || 0),
              total_kasbon_approved: Number(row.total_kasbon_approved || 0),
              saldo_akhir_sistem: Number(row.saldo_akhir_sistem || row.modal_awal || 200000),
              saldo_akhir_fisik: 0,
              selisih: 0,
              status: 'open',
            };
            saveLocal(key, supaShift);
            saveLocal(STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + cabangId, supaShift);
            return await this.calculateShiftBalance(supaShift);
          }
        }
      } catch (e) {
        console.warn('Supabase getActiveShift error:', e);
      }
    }

    // 2. Periksa arsip shift lokal apakah ada shift yang berstatus open
    const shifts = loadLocal<Shift[]>(STORAGE_KEYS.SHIFTS, []);
    const existingOpen = shifts.find(s => isBranchMatch(s.cabang_id, cabangId) && s.status === 'open');
    if (existingOpen) {
      saveLocal(key, existingOpen);
      return await this.calculateShiftBalance(existingOpen);
    }

    // 3. Jika belum pernah dibuka sama sekali hari ini (awal instalasi / perangkat baru),
    // aktifkan otomatis Shift Hari Ini agar kasir langsung memiliki kas laci Rp 200.000
    const hasClosedToday = shifts.some(s => isBranchMatch(s.cabang_id, cabangId) && s.status === 'closed');
    if (hasClosedToday) {
      // Kasir sudah pernah tutup shift, biarkan kasir memilih '+ Buka Shift' secara sadar
      return null;
    }

    const cabangs = await this.getCabangList();
    const targetCabang = cabangs.find(c => isBranchMatch(c.id, cabangId)) || cabangs[0];
    const defaultPj = targetCabang?.pj_nama || targetCabang?.kasir_username || 'Siti Rahmawati (PJ)';
    const todayDate = new Date().toISOString().slice(0, 10);

    const autoDailyShift: Shift = {
      id: generateUUID(),
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

    if (isSupabaseConfigured && supabase) {
      try {
        const branchUuid = getBranchUuid(cabangId);
        if (branchUuid) {
          await supabase.from('shift').insert([{
            id: autoDailyShift.id,
            cabang_id: branchUuid,
            waktu_buka: autoDailyShift.waktu_buka,
            modal_awal: 200000,
            status: 'open'
          }]);
        }
      } catch (e) {
        console.warn('Supabase auto shift insert fallback:', e);
      }
    }

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

    const shiftUuid = generateUUID();
    const branchUuid = getBranchUuid(cabang_id) || CABANG_MAP_INFO[0].uuid;
    const karUuid = getKaryawanUuid(karyawan_id) || KARYAWAN_UUID_MAP['kar-1'];

    const newShift: Shift = {
      id: shiftUuid,
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

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('shift').insert([{
          id: shiftUuid,
          cabang_id: branchUuid,
          karyawan_id: karUuid,
          waktu_buka: newShift.waktu_buka,
          modal_awal: modal_awal,
          status: 'open'
        }]);
      } catch (e) {
        console.warn('Supabase openShift insert error:', e);
      }
    }

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

    // Sum transactions in this shift (tahan ganti HP, reconnect, atau toleransi pembukaan shift)
    const shiftOpenDate = (shift.waktu_buka || '').slice(0, 10);
    const shiftOpenTime = new Date(shift.waktu_buka).getTime();

    const shiftTransactions = transactions.filter(t => {
      if (t.status !== 'completed') return false;
      if (!isBranchMatch(t.cabang_id, shift.cabang_id)) return false;
      // 1. Cocok dengan ID shift
      if (t.shift_id && t.shift_id === shift.id) return true;
      // 2. Waktu transaksi >= waktu buka shift (dengan toleransi 15 menit jika kasir sempat cetak duluan)
      const trxTime = new Date(t.waktu).getTime();
      if (!isNaN(trxTime) && trxTime >= shiftOpenTime - (15 * 60 * 1000)) return true;
      // 3. Tanggal transaksi sama dengan hari ini dan shift belum pernah ditutup
      const trxDate = (t.waktu || '').slice(0, 10);
      if (trxDate && trxDate === shiftOpenDate && !shift.waktu_tutup) return true;
      return false;
    });

    let tunaiMasuk = 0;
    let qrisMasuk = 0;
    let transferMasuk = 0;

    for (const trx of shiftTransactions) {
      const pay = (trx.metode_bayar || '').toLowerCase().trim();
      if (pay === 'tunai') tunaiMasuk += Number(trx.total || 0);
      else if (pay === 'qris') qrisMasuk += Number(trx.total || 0);
      else if (pay === 'transfer') transferMasuk += Number(trx.total || 0);
    }

    // Sum approved expenses taken from drawer ('laci')
    const shiftExpenses = expenses.filter(e => {
      if (e.status !== 'approved') return false;
      if (e.metode_pencairan !== 'laci') return false;
      if (!isBranchMatch(e.cabang_id, shift.cabang_id)) return false;
      const expDate = (e.tanggal || '').slice(0, 10);
      if (expDate && expDate === shiftOpenDate && !shift.waktu_tutup) return true;
      const expTime = new Date(e.tanggal).getTime();
      return !isNaN(expTime) && expTime >= shiftOpenTime - (15 * 60 * 1000);
    });

    let belanjaApproved = 0;
    let kasbonApproved = 0;

    for (const exp of shiftExpenses) {
      if (exp.jenis === 'belanja') belanjaApproved += Number(exp.nominal || 0);
      if (exp.jenis === 'kasbon') kasbonApproved += Number(exp.nominal || 0);
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
    const branchUuid = getBranchUuid(cabangId) || cabangId;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + cabangId);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + branchUuid);
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

    // Sync to Supabase
    if (isSupabaseConfigured && supabase && isValidUuid(closedShift.id)) {
      try {
        await supabase.from('shift').update({
          waktu_tutup: closedShift.waktu_tutup,
          total_tunai_masuk: closedShift.total_tunai_masuk,
          total_qris_masuk: closedShift.total_qris_masuk,
          total_transfer_masuk: closedShift.total_transfer_masuk,
          total_belanja_approved: closedShift.total_belanja_approved,
          total_kasbon_approved: closedShift.total_kasbon_approved,
          saldo_akhir_sistem: closedShift.saldo_akhir_sistem,
          saldo_akhir_fisik: closedShift.saldo_akhir_fisik,
          selisih: closedShift.selisih,
          status: 'closed',
          catatan: closedShift.catatan
        }).eq('id', closedShift.id);
      } catch (e) {
        console.warn('Supabase closeShift update error:', e);
      }
    }

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
    let cloudList: Transaksi[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('transaksi').select('*, items:transaksi_item(*)').order('waktu', { ascending: false });
        if (cabangId && cabangId !== 'all') {
          const targetUuid = getBranchUuid(cabangId);
          if (targetUuid) {
            query = query.eq('cabang_id', targetUuid);
          }
        }
        const { data, error } = await query;
        if (!error && data) {
          cloudList = data.map((d: any) => ({
            id: d.id,
            invoice_no: d.invoice_no,
            cabang_id: d.cabang_id,
            cabang_nama: d.cabang_nama || getBranchName(d.cabang_id),
            shift_id: d.shift_id,
            karyawan_id: d.karyawan_id,
            nama_pelanggan: d.nama_pelanggan,
            waktu: d.waktu,
            subtotal: Number(d.subtotal),
            diskon: Number(d.diskon || 0),
            total: Number(d.total),
            metode_bayar: d.metode_bayar,
            bayar: Number(d.bayar),
            kembali: Number(d.kembali || 0),
            status: d.status,
            is_offline_synced: d.is_offline_synced,
            items: (d.items || []).map((it: any) => ({
              id: it.id,
              transaksi_id: it.transaksi_id,
              menu_id: it.menu_id,
              nama_menu: it.nama_menu,
              harga: Number(it.harga),
              qty: Number(it.qty),
              subtotal: Number(it.subtotal),
              catatan: it.catatan,
            })),
          }));
        }
      } catch (e) {
        console.warn('Fallback to local transaksi:', e);
      }
    }

    const local = loadLocal<Transaksi[]>(STORAGE_KEYS.TRANSAKSI, INITIAL_TRANSAKSI);

    // Gabungkan cloud dan local dengan deduplikasi berdasar invoice_no atau id
    const combinedMap = new Map<string, Transaksi>();
    for (const trx of cloudList) {
      combinedMap.set(trx.invoice_no || trx.id, trx);
    }
    for (const trx of local) {
      const key = trx.invoice_no || trx.id;
      if (!combinedMap.has(key)) {
        combinedMap.set(key, {
          ...trx,
          cabang_nama: trx.cabang_nama || getBranchName(trx.cabang_id),
        });
      }
    }

    const combined = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime()
    );

    if (cabangId && cabangId !== 'all') {
      return combined.filter(t => isBranchMatch(t.cabang_id, cabangId));
    }
    return combined;
  }

  async createTransaksi(trx: Transaksi): Promise<Transaksi> {
    // 1. Pastikan ID transaksi berformat UUID valid
    if (!isValidUuid(trx.id)) {
      trx.id = generateUUID();
    }
    
    // Pastikan cabang_nama terisi
    if (!trx.cabang_nama) {
      trx.cabang_nama = getBranchName(trx.cabang_id);
    }

    // Simpan ke storage lokal perangkat untuk offline-first resilience
    const all = loadLocal<Transaksi[]>(STORAGE_KEYS.TRANSAKSI, INITIAL_TRANSAKSI);
    all.unshift(trx);
    saveLocal(STORAGE_KEYS.TRANSAKSI, all);

    // 2. Unggah langsung ke cloud Supabase (Real-Time Live POS)
    if (isSupabaseConfigured && supabase) {
      try {
        const branchUuid = getBranchUuid(trx.cabang_id) || CABANG_MAP_INFO[0].uuid;
        const shiftUuid = isValidUuid(trx.shift_id) ? trx.shift_id : null;
        const karyawanUuid = isValidUuid(trx.karyawan_id) 
          ? trx.karyawan_id 
          : (trx.karyawan_id && KARYAWAN_UUID_MAP[trx.karyawan_id]) || null;

        const { error } = await supabase.from('transaksi').insert([{
          id: trx.id,
          invoice_no: trx.invoice_no,
          cabang_id: branchUuid,
          shift_id: shiftUuid,
          karyawan_id: karyawanUuid,
          nama_pelanggan: trx.nama_pelanggan || 'Pelanggan Walk-in',
          waktu: trx.waktu || new Date().toISOString(),
          subtotal: trx.subtotal,
          diskon: trx.diskon || 0,
          total: trx.total,
          metode_bayar: trx.metode_bayar,
          bayar: trx.bayar,
          kembali: trx.kembali,
          status: trx.status || 'completed',
          is_offline_synced: true,
        }]);

        if (error) {
          console.error('Supabase transaksi insert error:', error);
        } else {
          trx.is_offline_synced = true;
          if (trx.items && trx.items.length > 0) {
            const itemsPayload = trx.items.map(it => {
              const menuUuid = getMenuUuid(it.menu_id);
              return {
                id: generateUUID(),
                transaksi_id: trx.id,
                menu_id: menuUuid,
                nama_menu: it.nama_menu,
                harga: it.harga,
                qty: it.qty,
                subtotal: it.subtotal,
                catatan: it.catatan || null,
              };
            });
            const { error: itemsErr } = await supabase.from('transaksi_item').insert(itemsPayload);
            if (itemsErr) {
              console.error('Supabase transaksi_item insert error:', itemsErr);
            }
          }
        }
      } catch (e) {
        console.warn('Error inserting into Supabase:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }

    return trx;
  }

  // --------------------------------------------------------------------------
  // APPROVAL CENTER: BELANJA & KASBON
  // --------------------------------------------------------------------------
  async getPengeluaranList(cabangId?: string): Promise<PengeluaranKasbon[]> {
    let cloudExpenses: PengeluaranKasbon[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('pengeluaran_kasbon').select('*').order('tanggal', { ascending: false });
        if (cabangId && cabangId !== 'all') {
          const targetUuid = getBranchUuid(cabangId);
          if (targetUuid) query = query.eq('cabang_id', targetUuid);
        }
        const { data, error } = await query;
        if (!error && data) {
          cloudExpenses = data.map((d: any) => ({
            ...d,
            cabang_nama: d.cabang_nama || getBranchName(d.cabang_id),
          }));
        }
      } catch (e) {
        console.warn('Fallback to local expenses:', e);
      }
    }

    const all = loadLocal<PengeluaranKasbon[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    const combinedMap = new Map<string, PengeluaranKasbon>();
    for (const exp of cloudExpenses) {
      combinedMap.set(exp.id, exp);
    }
    for (const exp of all) {
      if (!combinedMap.has(exp.id)) {
        combinedMap.set(exp.id, {
          ...exp,
          cabang_nama: exp.cabang_nama || getBranchName(exp.cabang_id),
        });
      }
    }

    const combined = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    );

    if (cabangId && cabangId !== 'all') {
      return combined.filter(e => isBranchMatch(e.cabang_id, cabangId));
    }
    return combined;
  }

  async createPengeluaran(item: Omit<PengeluaranKasbon, 'id' | 'status' | 'is_settled' | 'tanggal'> & { tanggal?: string }): Promise<PengeluaranKasbon> {
    const newId = generateUUID();
    const branchUuid = getBranchUuid(item.cabang_id) || CABANG_MAP_INFO[0].uuid;
    const shiftUuid = isValidUuid(item.shift_id) ? item.shift_id : null;
    const karyawanUuid = isValidUuid(item.karyawan_id) 
      ? item.karyawan_id 
      : (item.karyawan_id && KARYAWAN_UUID_MAP[item.karyawan_id]) || null;
    const menuUuid = isValidUuid(item.menu_id) 
      ? item.menu_id 
      : (item.menu_id && MENU_UUID_MAP[item.menu_id]) || null;

    const newItem: PengeluaranKasbon = {
      ...item,
      id: newId,
      cabang_id: branchUuid,
      cabang_nama: item.cabang_nama || getBranchName(branchUuid),
      status: 'pending',
      is_settled: false,
      tanggal: item.tanggal || new Date().toISOString(),
    };

    const all = loadLocal<PengeluaranKasbon[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    all.unshift(newItem);
    saveLocal(STORAGE_KEYS.EXPENSES, all);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('pengeluaran_kasbon').insert([{
          id: newId,
          cabang_id: branchUuid,
          shift_id: shiftUuid,
          karyawan_id: karyawanUuid,
          pemohon_nama: item.pemohon_nama,
          pemohon_telepon: item.pemohon_telepon || null,
          jenis: item.jenis,
          kategori_belanja: item.kategori_belanja || null,
          menu_id: menuUuid,
          qty_porsi: item.qty_porsi || null,
          keperluan: item.keperluan,
          nominal: item.nominal,
          status: 'pending',
          metode_pencairan: item.metode_pencairan || null,
          bukti_transfer_url: item.bukti_transfer_url || null,
          is_settled: false,
          tanggal: newItem.tanggal,
        }]);
      } catch (e) {
        console.warn('Failed insert to supabase pengeluaran:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
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
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('payroll').select('*').order('tanggal_kunci', { ascending: false });
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            ...d,
            gaji_pokok: Number(d.gaji_pokok),
            tunjangan: Number(d.tunjangan),
            potongan_kasbon: Number(d.potongan_kasbon || 0),
            potongan_tabungan: Number(d.potongan_tabungan || 0),
            total_tabungan_snapshot: Number(d.total_tabungan_snapshot || 0),
            gaji_bersih: Number(d.gaji_bersih),
            upah_harian: Number(d.upah_harian || 0)
          }));
        }
      } catch (e) {
        console.warn('Fallback to local payroll:', e);
      }
    }
    return loadLocal<Payroll[]>(STORAGE_KEYS.PAYROLL, []);
  }

  // --------------------------------------------------------------------------
  // TABUNGAN RUTIN KARYAWAN (CELENGAN MINGGUAN KARYAWAN DISIMPAN OWNER)
  // --------------------------------------------------------------------------
  async getTabunganKaryawanList(karyawanId?: string): Promise<TabunganKaryawanItem[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('tabungan_karyawan_log').select('*').order('created_at', { ascending: false });
        if (karyawanId) {
          const karUuid = getKaryawanUuid(karyawanId);
          if (karUuid) query = query.eq('karyawan_id', karUuid);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            ...d,
            nominal: Number(d.nominal),
            saldo_setelah: Number(d.saldo_setelah)
          }));
        }
      } catch (e) {
        console.warn('Fallback to local tabungan:', e);
      }
    }
    const all = loadLocal<TabunganKaryawanItem[]>(STORAGE_KEYS.TABUNGAN_KARYAWAN, INITIAL_TABUNGAN_KARYAWAN);
    if (!karyawanId) return all;
    return all.filter(t => t.karyawan_id === karyawanId);
  }

  async setorTabunganKaryawan(
    karyawanId: string, 
    nominal: number, 
    keterangan: string,
    dicatatOleh: string = 'Pak Agan (Owner)'
  ): Promise<TabunganKaryawanItem> {
    const all = loadLocal<TabunganKaryawanItem[]>(STORAGE_KEYS.TABUNGAN_KARYAWAN, INITIAL_TABUNGAN_KARYAWAN);
    const kars = await this.getAllKaryawan();
    const kar = kars.find(k => k.id === karyawanId);
    
    const saldoAwal = kar?.total_tabungan || 0;
    const saldoAkhir = saldoAwal + nominal;

    const newItem: TabunganKaryawanItem = {
      id: `tab-${karyawanId}-${Date.now()}`,
      karyawan_id: karyawanId,
      karyawan_nama: kar?.nama || 'Karyawan',
      cabang_id: kar?.cabang_id,
      tanggal: new Date().toISOString().slice(0, 10),
      tipe: 'setor',
      nominal,
      saldo_setelah: saldoAkhir,
      keterangan,
      dicatat_oleh: dicatatOleh,
      created_at: new Date().toISOString(),
    };

    all.unshift(newItem);
    saveLocal(STORAGE_KEYS.TABUNGAN_KARYAWAN, all);

    // Update saldo kumulatif di data Karyawan
    const updatedKars = kars.map(k => k.id === karyawanId ? { ...k, total_tabungan: saldoAkhir } : k);
    saveLocal(STORAGE_KEYS.KARYAWAN, updatedKars);

    // Sync to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const karUuid = getKaryawanUuid(karyawanId);
        const branchUuid = getBranchUuid(kar?.cabang_id);
        if (karUuid) {
          await supabase.from('tabungan_karyawan_log').insert([{
            id: generateUUID(),
            karyawan_id: karUuid,
            cabang_id: branchUuid,
            tanggal: newItem.tanggal,
            tipe: 'setor',
            nominal: nominal,
            saldo_setelah: saldoAkhir,
            keterangan: keterangan,
            dicatat_oleh: dicatatOleh
          }]);
          await supabase.from('karyawan').update({ total_tabungan: saldoAkhir }).eq('id', karUuid);
        }
      } catch (e) {
        console.warn('Supabase setorTabungan error:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }

    return newItem;
  }

  async tarikTabunganKaryawan(
    karyawanId: string, 
    nominal: number, 
    keterangan: string,
    dicatatOleh: string = 'Pak Agan (Owner)'
  ): Promise<TabunganKaryawanItem> {
    const all = loadLocal<TabunganKaryawanItem[]>(STORAGE_KEYS.TABUNGAN_KARYAWAN, INITIAL_TABUNGAN_KARYAWAN);
    const kars = await this.getAllKaryawan();
    const kar = kars.find(k => k.id === karyawanId);
    
    const saldoAwal = kar?.total_tabungan || 0;
    if (nominal > saldoAwal) {
      throw new Error(`Saldo tabungan tidak mencukupi! Saldo saat ini: Rp ${saldoAwal.toLocaleString('id-ID')}`);
    }
    const saldoAkhir = Math.max(0, saldoAwal - nominal);

    const newItem: TabunganKaryawanItem = {
      id: `tab-tarik-${karyawanId}-${Date.now()}`,
      karyawan_id: karyawanId,
      karyawan_nama: kar?.nama || 'Karyawan',
      cabang_id: kar?.cabang_id,
      tanggal: new Date().toISOString().slice(0, 10),
      tipe: 'tarik',
      nominal,
      saldo_setelah: saldoAkhir,
      keterangan,
      dicatat_oleh: dicatatOleh,
      created_at: new Date().toISOString(),
    };

    all.unshift(newItem);
    saveLocal(STORAGE_KEYS.TABUNGAN_KARYAWAN, all);

    // Update saldo kumulatif di data Karyawan
    const updatedKars = kars.map(k => k.id === karyawanId ? { ...k, total_tabungan: saldoAkhir } : k);
    saveLocal(STORAGE_KEYS.KARYAWAN, updatedKars);

    // Sync to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const karUuid = getKaryawanUuid(karyawanId);
        const branchUuid = getBranchUuid(kar?.cabang_id);
        if (karUuid) {
          await supabase.from('tabungan_karyawan_log').insert([{
            id: generateUUID(),
            karyawan_id: karUuid,
            cabang_id: branchUuid,
            tanggal: newItem.tanggal,
            tipe: 'tarik',
            nominal: nominal,
            saldo_setelah: saldoAkhir,
            keterangan: keterangan,
            dicatat_oleh: dicatatOleh
          }]);
          await supabase.from('karyawan').update({ total_tabungan: saldoAkhir }).eq('id', karUuid);
        }
      } catch (e) {
        console.warn('Supabase tarikTabungan error:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }

    return newItem;
  }

  async lockPayroll(records: Payroll[]): Promise<boolean> {
    const existing = await this.getPayrollList();
    const stampedRecords = records.map(r => ({
      ...r,
      id: isValidUuid(r.id) ? r.id : generateUUID(),
      status: 'paid' as const,
      tanggal_kunci: r.tanggal_kunci || new Date().toISOString()
    }));
    const updatedPayrolls = [...stampedRecords, ...existing];
    saveLocal(STORAGE_KEYS.PAYROLL, updatedPayrolls);

    // Mark corresponding kasbon as settled locally
    const allExpenses = loadLocal<PengeluaranKasbon[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    const settledKaryawanIds = new Set(records.map(r => r.karyawan_id));

    const updatedExpenses = allExpenses.map(e => {
      if (e.jenis === 'kasbon' && e.status === 'approved' && settledKaryawanIds.has(e.karyawan_id || '')) {
        return { ...e, is_settled: true };
      }
      return e;
    });

    saveLocal(STORAGE_KEYS.EXPENSES, updatedExpenses);

    // Sync to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const payrollPayload = stampedRecords.map(r => ({
          id: r.id,
          karyawan_id: getKaryawanUuid(r.karyawan_id) || KARYAWAN_UUID_MAP['kar-1'],
          cabang_id: getBranchUuid(r.cabang_id) || CABANG_MAP_INFO[0].uuid,
          slip_no: r.slip_no,
          periode_bulan: r.periode_bulan,
          periode_tahun: r.periode_tahun,
          tipe_gaji: r.tipe_gaji || 'harian',
          total_kehadiran_hari: r.total_kehadiran_hari || 0,
          upah_harian: r.upah_harian || 0,
          gaji_pokok: r.gaji_pokok,
          tunjangan: r.tunjangan,
          potongan_kasbon: r.potongan_kasbon || 0,
          potongan_tabungan: r.potongan_tabungan || 0,
          total_tabungan_snapshot: r.total_tabungan_snapshot || 0,
          gaji_bersih: r.gaji_bersih,
          status: 'paid',
          tanggal_kunci: r.tanggal_kunci,
          karyawan_telepon: r.karyawan_telepon || null,
          keterangan: r.keterangan || null
        }));
        await supabase.from('payroll').insert(payrollPayload);

        // Update settled kasbon in Supabase
        for (const karId of Array.from(settledKaryawanIds)) {
          const karUuid = getKaryawanUuid(karId);
          if (karUuid) {
            await supabase.from('pengeluaran_kasbon')
              .update({ is_settled: true })
              .eq('karyawan_id', karUuid)
              .eq('jenis', 'kasbon')
              .eq('status', 'approved');
          }
        }
      } catch (e) {
        console.warn('Supabase lockPayroll insert error:', e);
      }
    }

    // Auto-Setor Tabungan Karyawan jika payroll menyertakan potongan tabungan rutin
    for (const r of records) {
      if (r.potongan_tabungan && r.potongan_tabungan > 0) {
        await this.setorTabunganKaryawan(
          r.karyawan_id,
          r.potongan_tabungan,
          `Auto-Simpan Tabungan Gaji Mingguan (Slip #${r.slip_no})`
        );
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }
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

    // Auto-Setor Tabungan Karyawan jika payroll menyertakan potongan tabungan rutin
    if (params.payroll.potongan_tabungan && params.payroll.potongan_tabungan > 0) {
      await this.setorTabunganKaryawan(
        params.payroll.karyawan_id,
        params.payroll.potongan_tabungan,
        `Auto-Simpan Tabungan Gaji Mingguan (Slip #${params.payroll.slip_no})`
      );
    }

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
    let cloudList: KirimanBahanPusat[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('kiriman_bahan_pusat').select('*').order('tanggal', { ascending: false });
        if (cabangId && cabangId !== 'all') {
          const targetUuid = getBranchUuid(cabangId);
          if (targetUuid) query = query.eq('cabang_id', targetUuid);
        }
        if (tanggal) query = query.eq('tanggal', tanggal);
        const { data, error } = await query;
        if (!error && data) {
          cloudList = data.map((d: any) => ({
            ...d,
            jumlah: Number(d.jumlah),
            harga_satuan: Number(d.harga_satuan || 0),
            total_nilai: Number(d.total_nilai || 0)
          }));
        }
      } catch (e) {
        console.warn('Fallback to local kiriman bahan:', e);
      }
    }

    const all = loadLocal<KirimanBahanPusat[]>(STORAGE_KEYS.KIRIMAN_BAHAN, INITIAL_KIRIMAN_BAHAN);
    const combinedMap = new Map<string, KirimanBahanPusat>();
    for (const k of cloudList) {
      combinedMap.set(k.id, k);
    }
    for (const k of all) {
      if (!combinedMap.has(k.id)) {
        combinedMap.set(k.id, k);
      }
    }
    const combined = Array.from(combinedMap.values());
    return combined.filter(k => {
      if (cabangId && cabangId !== 'all' && !isBranchMatch(k.cabang_id, cabangId)) return false;
      if (tanggal && k.tanggal !== tanggal) return false;
      return true;
    });
  }

  async createKirimanBahan(data: Omit<KirimanBahanPusat, 'id' | 'created_at'>): Promise<KirimanBahanPusat> {
    const all = loadLocal<KirimanBahanPusat[]>(STORAGE_KEYS.KIRIMAN_BAHAN, INITIAL_KIRIMAN_BAHAN);
    const newId = generateUUID();
    const branchUuid = getBranchUuid(data.cabang_id) || CABANG_MAP_INFO[0].uuid;

    const newKiriman: KirimanBahanPusat = {
      ...data,
      id: newId,
      cabang_id: branchUuid,
      created_at: new Date().toISOString(),
    };
    all.unshift(newKiriman);
    saveLocal(STORAGE_KEYS.KIRIMAN_BAHAN, all);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: bData } = await supabase.from('bahan_baku').select('id').eq('nama', data.bahan_nama).limit(1);
        const bahanUuid = bData && bData[0] ? bData[0].id : (isValidUuid(data.bahan_id) ? data.bahan_id : null);

        if (bahanUuid) {
          await supabase.from('kiriman_bahan_pusat').insert([{
            id: newId,
            cabang_id: branchUuid,
            bahan_id: bahanUuid,
            bahan_nama: data.bahan_nama,
            jumlah: data.jumlah,
            satuan: data.satuan,
            harga_satuan: data.harga_satuan || 0,
            total_nilai: data.total_nilai || 0,
            tanggal: data.tanggal,
            dikirim_oleh: data.dikirim_oleh || 'Gudang Pusat Pak Agan',
            catatan: data.catatan || null
          }]);
        }
      } catch (e) {
        console.warn('Supabase createKirimanBahan error:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }
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
        isBranchMatch(a.cabang_id, cabangId) && 
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
        isBranchMatch(a.cabang_id, r.cabang_id) && 
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

    if (isSupabaseConfigured && supabase) {
      try {
        const payload = records.map(r => {
          const branchUuid = getBranchUuid(r.cabang_id) || CABANG_MAP_INFO[0].uuid;
          return {
            cabang_id: branchUuid,
            tanggal: r.tanggal,
            bahan_id: isValidUuid(r.bahan_id) ? r.bahan_id : null,
            bahan_nama: r.bahan_nama,
            satuan: r.satuan,
            stok_awal: r.stok_awal,
            kiriman_pusat: r.kiriman_pusat,
            terpakai_kasir: r.terpakai_kasir,
            sisa_sistem: r.sisa_sistem,
            sisa_fisik: r.sisa_fisik,
            selisih: r.selisih,
            status: r.status,
            kasir_nama: r.kasir_nama || null,
            catatan: r.catatan || null,
            updated_at: new Date().toISOString()
          };
        }).filter(r => r.bahan_id !== null);

        if (payload.length > 0) {
          await supabase.from('absensi_bahan_harian').upsert(payload);
        }
      } catch (e) {
        console.warn('Supabase saveAbsensiBahanHarian error:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }

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
    let cloudPayments: PembayaranFixedCostBulanan[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('pembayaran_fixed_cost_bulanan').select('*').order('created_at', { ascending: false });
        if (periodeBulan) query = query.eq('periode_bulan', periodeBulan);
        if (cabangId && cabangId !== 'all') {
          const targetUuid = getBranchUuid(cabangId);
          if (targetUuid) query = query.eq('cabang_id', targetUuid);
        }
        const { data, error } = await query;
        if (!error && data) {
          cloudPayments = data.map((d: any) => ({
            id: d.id,
            cabang_id: d.cabang_id,
            cabang_nama: getBranchName(d.cabang_id),
            periode_bulan: d.periode_bulan,
            jenis_biaya: d.jenis_biaya,
            nama_biaya: d.nama_biaya,
            nominal: Number(d.nominal),
            status: d.status,
            tanggal_bayar: d.tanggal_bayar,
            metode_bayar: d.metode_bayar,
            no_referensi: d.no_referensi,
            catatan: d.catatan,
            dibayar_oleh: d.dibayar_oleh,
            updated_at: d.updated_at
          }));
        }
      } catch (e) {
        console.warn('Fallback to local fixed cost:', e);
      }
    }

    const all = loadLocal<PembayaranFixedCostBulanan[]>(STORAGE_KEYS.FIXED_COST_PAYMENTS, INITIAL_FIXED_COST_PAYMENTS);
    const combinedMap = new Map<string, PembayaranFixedCostBulanan>();
    for (const p of cloudPayments) {
      combinedMap.set(p.id, p);
    }
    for (const p of all) {
      if (!combinedMap.has(p.id)) {
        combinedMap.set(p.id, {
          ...p,
          cabang_nama: p.cabang_nama || getBranchName(p.cabang_id)
        });
      }
    }

    const combined = Array.from(combinedMap.values());
    return combined.filter(p => {
      if (periodeBulan && p.periode_bulan !== periodeBulan) return false;
      if (cabangId && cabangId !== 'all' && !isBranchMatch(p.cabang_id, cabangId)) return false;
      return true;
    });
  }

  async saveFixedCostPayment(data: Partial<PembayaranFixedCostBulanan>): Promise<PembayaranFixedCostBulanan> {
    const all = loadLocal<PembayaranFixedCostBulanan[]>(STORAGE_KEYS.FIXED_COST_PAYMENTS, INITIAL_FIXED_COST_PAYMENTS);
    const existingIndex = all.findIndex(p => p.id === data.id);
    const now = new Date().toISOString();
    const branchUuid = getBranchUuid(data.cabang_id) || CABANG_MAP_INFO[0].uuid;
    const paymentId = (data.id && isValidUuid(data.id)) ? data.id : generateUUID();

    let updatedItem: PembayaranFixedCostBulanan;

    if (existingIndex >= 0) {
      updatedItem = {
        ...all[existingIndex],
        ...data,
        cabang_id: branchUuid,
        cabang_nama: data.cabang_nama || getBranchName(branchUuid),
        updated_at: now
      };
      all[existingIndex] = updatedItem;
    } else {
      updatedItem = {
        id: paymentId,
        cabang_id: branchUuid,
        cabang_nama: data.cabang_nama || getBranchName(branchUuid),
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

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('pembayaran_fixed_cost_bulanan').upsert([{
          id: updatedItem.id,
          cabang_id: branchUuid,
          periode_bulan: updatedItem.periode_bulan,
          jenis_biaya: updatedItem.jenis_biaya,
          nama_biaya: updatedItem.nama_biaya,
          nominal: updatedItem.nominal,
          status: updatedItem.status,
          tanggal_bayar: updatedItem.tanggal_bayar,
          metode_bayar: updatedItem.metode_bayar,
          no_referensi: updatedItem.no_referensi || null,
          catatan: updatedItem.catatan || null,
          dibayar_oleh: updatedItem.dibayar_oleh,
          updated_at: now
        }]);
      } catch (e) {
        console.warn('Supabase saveFixedCostPayment error:', e);
      }
    }

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

    if (isSupabaseConfigured && supabase && isValidUuid(id)) {
      try {
        await supabase.from('pembayaran_fixed_cost_bulanan').update({
          status: newStatus,
          tanggal_bayar: all[idx].tanggal_bayar,
          updated_at: all[idx].updated_at
        }).eq('id', id);
      } catch (e) {
        console.warn('Supabase toggleFixedCostPaymentStatus error:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }
    return all[idx];
  }

  async deleteFixedCostPayment(id: string): Promise<boolean> {
    const all = loadLocal<PembayaranFixedCostBulanan[]>(STORAGE_KEYS.FIXED_COST_PAYMENTS, INITIAL_FIXED_COST_PAYMENTS);
    const filtered = all.filter(p => p.id !== id);
    saveLocal(STORAGE_KEYS.FIXED_COST_PAYMENTS, filtered);

    if (isSupabaseConfigured && supabase && isValidUuid(id)) {
      try {
        await supabase.from('pembayaran_fixed_cost_bulanan').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase deleteFixedCostPayment error:', e);
      }
    }

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
