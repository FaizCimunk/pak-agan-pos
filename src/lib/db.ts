// Hybrid Database Layer for Minuman Herbal Pak Agan POS
// Connects to Supabase PostgreSQL when available, and smoothly provides local reactive persistence for demo/offline.

import { supabase, isSupabaseConfigured } from './supabase';
import {
  queueOfflineTransaction,
  getPendingTransactions,
  removePendingTransaction,
  queueOfflineOp,
  getPendingOps,
  removePendingOp,
} from './offline-sync';
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
  TabunganKaryawanItem,
  PaymentMethod
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
import { hashPin, parseCustomFixedCosts, serializeCustomFixedCosts, toWibDateString, getBusinessDateForRecord } from './utils';

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
  OPEN_BILLS: 'pak_agan_open_bills_v1',
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

function saveLocalCache<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn('Gagal menyimpan cache ke localStorage:', e);
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

async function withQueryTimeout<T>(promise: PromiseLike<T>, ms = 10000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Query timeout after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isNavigatorOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function isDuplicatePgError(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && (err as { code?: string }).code === '23505');
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

let hasSyncedLocalCabangMap = false;

export function ensureLocalCabangNamesSynced(): void {
  if (hasSyncedLocalCabangMap || typeof window === 'undefined') return;
  hasSyncedLocalCabangMap = true;
  const local = loadLocal<Cabang[]>(STORAGE_KEYS.CABANG, []);
  if (local.length > 0) {
    syncCabangNamesToMap(local);
  }
}

export function getBranchName(idOrCodeOrUuid?: string | null): string {
  if (!idOrCodeOrUuid) return 'Cabang';
  ensureLocalCabangNamesSynced();
  const clean = idOrCodeOrUuid.trim().toLowerCase();
  const resolvedUuid = getBranchUuid(idOrCodeOrUuid);
  const match = CABANG_MAP_INFO.find(
    c =>
      (resolvedUuid && c.uuid.toLowerCase() === resolvedUuid.toLowerCase()) ||
      c.uuid.toLowerCase() === clean ||
      c.id.toLowerCase() === clean ||
      c.kode.toLowerCase() === clean ||
      String(c.nomor) === clean ||
      c.nama.toLowerCase().includes(clean)
  );
  return match ? match.nama : 'Cabang ' + idOrCodeOrUuid;
}

export function resolveLiveBranchName(cabangId?: string | null, storedNama?: string | null): string {
  ensureLocalCabangNamesSynced();
  const resolvedUuid = getBranchUuid(cabangId);
  if (resolvedUuid) {
    return getBranchName(resolvedUuid);
  }
  return storedNama || getBranchName(cabangId);
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

export function isAbsensiApproved(a?: Absensi | null): boolean {
  if (!a) return false;
  return !a.approval_status || a.approval_status === 'approved';
}

export function encodeKaryawanBankMarker(
  passwordPlain?: string | null,
  bankNama?: string,
  noRekening?: string,
  atasNamaRek?: string
): string {
  const cleanPass = (passwordPlain || '1234').replace(/\s*\[\[B(?:ANK)?:[^\]]*\]\]/g, '').trim() || '1234';
  const cleanBank = (bankNama || '').replace(/[|\[\]]/g, '').trim().slice(0, 20);
  const cleanRek = (noRekening || '').replace(/[|\[\]]/g, '').trim().slice(0, 32);
  const cleanAtas = (atasNamaRek || '').replace(/[|\[\]]/g, '').trim().slice(0, 28);
  if (!cleanBank && !cleanRek) return cleanPass.slice(0, 100);
  return `${cleanPass} [[B:${cleanBank}|${cleanRek}|${cleanAtas}]]`.slice(0, 100);
}

export function decodeKaryawanRecord(raw: any): Karyawan {
  const basePass = typeof raw?.password_plain === 'string' ? raw.password_plain : '';
  const match = basePass.match(/\[\[B(?:ANK)?:([^|\]]*)\|([^|\]]*)\|([^\]]*)\]\]/);
  const cleanPass = basePass.replace(/\s*\[\[B(?:ANK)?:[^\]]*\]\]/g, '').trim();
  const decodedBank = raw?.bank_nama || (match?.[1]?.trim() || undefined);
  const decodedRek = raw?.no_rekening || (match?.[2]?.trim() || undefined);
  const decodedAtas = raw?.atas_nama_rekening || (match?.[3]?.trim() || undefined);

  const rec: Karyawan = {
    ...raw,
    password_plain: cleanPass || raw?.password_plain,
    bank_nama: decodedBank,
    no_rekening: decodedRek,
    atas_nama_rekening: decodedAtas,
  };
  return rec.role === 'owner' ? { ...rec, cabang_id: 'pusat' } : rec;
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

export const KATEGORI_UUID_MAP: Record<string, string> = {
  'kat-sb': '6d639aab-ff78-40b3-87df-4c18a4977288',
  'kat-wg': '26606c3e-0efb-46e2-b7c5-52669da2b7e1',
  'kat-6': 'ccae656c-4c48-421f-aa93-efe6e5b28f43',
};

export function getKategoriUuid(idOrCode?: string | null): string | null {
  if (!idOrCode) return null;
  const clean = idOrCode.trim().toLowerCase();
  if (KATEGORI_UUID_MAP[clean]) return KATEGORI_UUID_MAP[clean];
  if (isValidUuid(idOrCode)) return idOrCode;
  return null;
}

export const KATEGORI_ID_BY_UUID: Record<string, string> = {
  '6d639aab-ff78-40b3-87df-4c18a4977288': 'kat-sb',
  '26606c3e-0efb-46e2-b7c5-52669da2b7e1': 'kat-wg',
  'ccae656c-4c48-421f-aa93-efe6e5b28f43': 'kat-6',
};

export function normalizeKategoriId(idOrUuid?: string | null): string {
  if (!idOrUuid) return 'kat-wg';
  const clean = idOrUuid.trim().toLowerCase();
  if (KATEGORI_ID_BY_UUID[clean]) return KATEGORI_ID_BY_UUID[clean];
  if (clean === 'kat-sb' || clean === 'kat-wg' || clean === 'kat-6') return clean;
  if (clean.includes('serabi')) return 'kat-sb';
  if (clean.includes('makanan') || clean.includes('camilan') || clean.includes('snack') || clean.includes('dapur')) return 'kat-6';
  return 'kat-wg';
}

export function decodeMenuRecord(raw: any): MenuItem {
  let deskripsiClean = raw.deskripsi || '';
  let meta: any = {};
  const metaMatch = typeof deskripsiClean === 'string' ? deskripsiClean.match(/\[\[VMETA:([\s\S]*?)\]\]/) : null;
  if (metaMatch) {
    try {
      meta = JSON.parse(metaMatch[1]);
    } catch {}
    deskripsiClean = deskripsiClean.replace(/\s*\[\[VMETA:[\s\S]*?\]\]/g, '').trim();
  }

  const rawKatId = raw.kategori_id || meta.kategori_id;
  const normKatId = normalizeKategoriId(rawKatId);
  const rawKatNama = raw.kategori?.nama || raw.kategori_nama;
  const resolvedKatNama = rawKatNama || (normKatId === 'kat-sb' ? '🥞 Serabi Bawel' : normKatId === 'kat-6' ? '🍲 Makanan & Camilan' : '🍵 Minuman');

  const hasVariasi = raw.has_variasi_harga !== undefined ? !!raw.has_variasi_harga : (meta.has_variasi_harga !== undefined ? !!meta.has_variasi_harga : false);
  const varNama1 = raw.varian_nama_1 || meta.varian_nama_1 || 'Reguler';
  const varHarga1 = raw.varian_harga_1 !== undefined ? Number(raw.varian_harga_1) : (meta.varian_harga_1 !== undefined ? Number(meta.varian_harga_1) : Number(raw.harga) || 15000);
  const varHpp1 = raw.varian_hpp_1 !== undefined ? Number(raw.varian_hpp_1) : (meta.varian_hpp_1 !== undefined ? Number(meta.varian_hpp_1) : (Number(raw.hpp) || 4800));
  const varNama2 = raw.varian_nama_2 || meta.varian_nama_2 || 'Jumbo';
  const varHarga2 = raw.varian_harga_2 !== undefined ? Number(raw.varian_harga_2) : (meta.varian_harga_2 !== undefined ? Number(meta.varian_harga_2) : (varHarga1 + 5000));
  const varHpp2 = raw.varian_hpp_2 !== undefined ? Number(raw.varian_hpp_2) : (meta.varian_hpp_2 !== undefined ? Number(meta.varian_hpp_2) : (varHpp1 + 2000));

  const suhuMode = raw.suhu_mode || meta.suhu_mode;
  const hargaEs = raw.harga_es !== undefined ? Number(raw.harga_es) : (meta.harga_es !== undefined ? Number(meta.harga_es) : undefined);
  const hppEs = raw.hpp_es !== undefined ? Number(raw.hpp_es) : (meta.hpp_es !== undefined ? Number(meta.hpp_es) : undefined);

  const isFood = normKatId === 'kat-sb' || normKatId === 'kat-6';

  return {
    ...raw,
    kategori_id: normKatId,
    kategori_nama: resolvedKatNama,
    deskripsi: deskripsiClean,
    has_variasi_harga: hasVariasi,
    varian_nama_1: hasVariasi ? varNama1 : undefined,
    varian_harga_1: hasVariasi ? varHarga1 : undefined,
    varian_hpp_1: hasVariasi ? varHpp1 : undefined,
    varian_nama_2: hasVariasi ? varNama2 : undefined,
    varian_harga_2: hasVariasi ? varHarga2 : undefined,
    varian_hpp_2: hasVariasi ? varHpp2 : undefined,
    suhu_mode: isFood ? undefined : suhuMode,
    harga_es: isFood ? undefined : hargaEs,
    hpp_es: isFood ? undefined : hppEs,
    has_temperature_option: !isFood && (suhuMode === 'bisa_keduanya' || suhuMode === 'beda_harga_es'),
    default_temperature: isFood ? undefined : (suhuMode === 'khusus_es' ? 'dingin' : 'panas'),
    harga: Number(raw.harga) || 15000,
    hpp: Number(raw.hpp) !== undefined ? Number(raw.hpp) : Math.round((Number(raw.harga) || 15000) * 0.32),
  };
}

export function syncCabangNamesToMap(cabangs: Array<{ id?: string; uuid?: string; nomor?: number; kode?: string; nama?: string }>): void {
  hasSyncedLocalCabangMap = true;
  for (const cbg of cabangs) {
    if (!cbg?.nama) continue;
    const targetUuid = getBranchUuid(cbg.id || cbg.kode || (cbg.nomor ? String(cbg.nomor) : ''));
    const entry = CABANG_MAP_INFO.find(
      m =>
        (targetUuid && m.uuid.toLowerCase() === targetUuid.toLowerCase()) ||
        (cbg.kode && m.kode.toLowerCase() === cbg.kode.toLowerCase()) ||
        (cbg.nomor && m.nomor === cbg.nomor)
    );
    if (entry) {
      entry.nama = cbg.nama;
    }
  }
}

export class PosDatabase {
  // --------------------------------------------------------------------------
  // CABANG (10 CABANG RESMI)
  // --------------------------------------------------------------------------
  async getCabangList(): Promise<Cabang[]> {
    const hydrateCabangList = (items: Cabang[]): Cabang[] =>
      items.map(c => ({
        ...c,
        biaya_lain_items: parseCustomFixedCosts(c),
      }));

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await withQueryTimeout(
          supabase.from('cabang').select('*').order('nomor', { ascending: true })
        );
        if (!error && data && data.length > 0) {
          syncCabangNamesToMap(data);
          const hydrated = hydrateCabangList(data);
          saveLocalCache(STORAGE_KEYS.CABANG, hydrated);
          return hydrated;
        }
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
      saveLocalCache(STORAGE_KEYS.CABANG, local);
    }
    syncCabangNamesToMap(local);
    return hydrateCabangList(local);
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

    // Kunci Paten Sistem: id, uuid, nomor, dan kode tidak pernah diubah agar semua relasi tetap utuh
    const {
      id: _ignoredId,
      kode: _ignoredKode,
      nomor: _ignoredNomor,
      biaya_lain_items: incomingItems,
      ...restUpdates
    } = updates as any;

    let mergedUpdates: any = { ...restUpdates };
    if (Array.isArray(incomingItems)) {
      const serialized = serializeCustomFixedCosts(incomingItems);
      mergedUpdates.biaya_lain_bulanan = serialized.biaya_lain_bulanan;
      mergedUpdates.keterangan_biaya_lain = serialized.keterangan_biaya_lain;
    }

    const updatedCabang: Cabang = {
      ...list[index],
      ...mergedUpdates,
    };
    updatedCabang.biaya_lain_items = Array.isArray(incomingItems)
      ? serializeCustomFixedCosts(incomingItems).biaya_lain_items
      : parseCustomFixedCosts(updatedCabang);

    list[index] = updatedCabang;
    syncCabangNamesToMap([updatedCabang]);
    saveLocal(STORAGE_KEYS.CABANG, list);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const targetUuid = getBranchUuid(id) || id;
        const { error } = await supabase.from('cabang').update(mergedUpdates).eq('id', targetUuid);
        if (error) {
          console.warn('Supabase updateCabang error:', error);
        }
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
        const { data, error } = await supabase
          .from('menu')
          .select('*, kategori:kategori_menu(nama)')
          .order('created_at', { ascending: true });
        if (!error && Array.isArray(data)) {
          const mapped: MenuItem[] = data.map(item => decodeMenuRecord(item));
          saveLocal(STORAGE_KEYS.MENU, mapped);
          return mapped;
        }
      } catch (e) {
        console.warn('Fallback to local menu data:', e);
      }
    }
    const local = loadLocal<MenuItem[]>(STORAGE_KEYS.MENU, isSupabaseConfigured ? [] : INITIAL_MENU);
    return local.map(item => decodeMenuRecord(item));
  }

  async saveMenu(item: Partial<MenuItem>): Promise<MenuItem> {
    let current = await this.getMenuList();
    let savedItem: MenuItem;

    if (item.id) {
      // Update existing menu
      const index = current.findIndex(m => m.id === item.id);
      if (index !== -1) {
        savedItem = decodeMenuRecord({
          ...current[index],
          ...item,
          kategori_id: normalizeKategoriId(item.kategori_id || current[index].kategori_id),
          harga: Number(item.harga) !== undefined && !isNaN(Number(item.harga)) ? Number(item.harga) : current[index].harga,
          harga_es: item.harga_es !== undefined ? (item.harga_es ? Number(item.harga_es) : undefined) : current[index].harga_es,
          hpp: Number(item.hpp) !== undefined && !isNaN(Number(item.hpp)) ? Number(item.hpp) : (current[index].hpp || Math.round((Number(item.harga) || 15000) * 0.32)),
          hpp_es: item.hpp_es !== undefined ? (item.hpp_es ? Number(item.hpp_es) : undefined) : current[index].hpp_es,
          suhu_mode: item.suhu_mode !== undefined ? item.suhu_mode : current[index].suhu_mode,
          has_variasi_harga: item.has_variasi_harga !== undefined ? item.has_variasi_harga : current[index].has_variasi_harga,
          varian_nama_1: item.varian_nama_1 !== undefined ? item.varian_nama_1 : current[index].varian_nama_1,
          varian_harga_1: item.varian_harga_1 !== undefined ? item.varian_harga_1 : current[index].varian_harga_1,
          varian_hpp_1: item.varian_hpp_1 !== undefined ? item.varian_hpp_1 : current[index].varian_hpp_1,
          varian_nama_2: item.varian_nama_2 !== undefined ? item.varian_nama_2 : current[index].varian_nama_2,
          varian_harga_2: item.varian_harga_2 !== undefined ? item.varian_harga_2 : current[index].varian_harga_2,
          varian_hpp_2: item.varian_hpp_2 !== undefined ? item.varian_hpp_2 : current[index].varian_hpp_2,
        });
        current[index] = savedItem;
      } else {
        throw new Error(`Menu dengan ID ${item.id} tidak ditemukan.`);
      }
    } else {
      // Create new menu (pakai UUID agar konsisten antara lokal & Supabase saat edit/hapus)
      const newMenuId = generateUUID();
      savedItem = decodeMenuRecord({
        id: newMenuId,
        kategori_id: normalizeKategoriId(item.kategori_id),
        kategori_nama: item.kategori_nama,
        kode: item.kode || `MN-${Math.floor(10 + Math.random() * 90)}`,
        nama: item.nama || 'Minuman Herbal Baru',
        deskripsi: item.deskripsi || '',
        harga: Number(item.harga) || 15000,
        harga_es: item.harga_es ? Number(item.harga_es) : undefined,
        hpp: Number(item.hpp) || Math.round((Number(item.harga) || 15000) * 0.32),
        hpp_es: item.hpp_es ? Number(item.hpp_es) : undefined,
        suhu_mode: item.suhu_mode,
        has_variasi_harga: item.has_variasi_harga,
        varian_nama_1: item.varian_nama_1,
        varian_harga_1: item.varian_harga_1,
        varian_hpp_1: item.varian_hpp_1,
        varian_nama_2: item.varian_nama_2,
        varian_harga_2: item.varian_harga_2,
        varian_hpp_2: item.varian_hpp_2,
        gambar: item.gambar || 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&q=80',
        is_favorite: !!item.is_favorite,
        is_active: item.is_active ?? true,
        cabang_ids: item.cabang_ids || [],
        created_at: new Date().toISOString(),
      });
      current.push(savedItem);
    }

    saveLocal(STORAGE_KEYS.MENU, current);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const supabaseMenuId = getMenuUuid(savedItem.id) || getMenuUuid(savedItem.kode) || (isValidUuid(savedItem.id) ? savedItem.id : generateUUID());
        const supabaseKatId = getKategoriUuid(savedItem.kategori_id);

        const metaToSave = {
          kategori_id: savedItem.kategori_id,
          has_variasi_harga: savedItem.has_variasi_harga,
          varian_nama_1: savedItem.varian_nama_1,
          varian_harga_1: savedItem.varian_harga_1,
          varian_hpp_1: savedItem.varian_hpp_1,
          varian_nama_2: savedItem.varian_nama_2,
          varian_harga_2: savedItem.varian_harga_2,
          varian_hpp_2: savedItem.varian_hpp_2,
          suhu_mode: savedItem.suhu_mode,
          harga_es: savedItem.harga_es,
          hpp_es: savedItem.hpp_es,
        };
        const cleanDesk = (savedItem.deskripsi || '').replace(/\s*\[\[VMETA:[\s\S]*?\]\]/g, '').trim();
        const packedDeskripsi = cleanDesk ? `${cleanDesk} [[VMETA:${JSON.stringify(metaToSave)}]]` : `[[VMETA:${JSON.stringify(metaToSave)}]]`;

        const supabaseRow: any = {
          id: supabaseMenuId,
          kategori_id: supabaseKatId,
          kode: savedItem.kode,
          nama: savedItem.nama,
          deskripsi: packedDeskripsi,
          harga: savedItem.harga,
          hpp: savedItem.hpp || 0,
          gambar: savedItem.gambar || null,
          is_favorite: !!savedItem.is_favorite,
          is_active: savedItem.is_active !== false,
          cabang_ids: savedItem.cabang_ids || [],
        };

        await supabase.from('menu').upsert(supabaseRow, { onConflict: 'kode' });
      } catch (e) {
        console.warn('Supabase saveMenu fallback local:', e);
      }
    }

    return savedItem;
  }

  async deleteMenu(id: string): Promise<boolean> {
    let current = await this.getMenuList();
    const targetItem = current.find(m => m.id === id);
    current = current.filter(m => m.id !== id);
    saveLocal(STORAGE_KEYS.MENU, current);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const uuid = getMenuUuid(id) || (isValidUuid(id) ? id : null);
        if (uuid) {
          await supabase.from('menu').delete().eq('id', uuid);
        } else if (targetItem?.kode) {
          await supabase.from('menu').delete().eq('kode', targetItem.kode);
        }
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
  getAllKaryawanCached(): Karyawan[] {
    const local = loadLocal<Karyawan[]>(STORAGE_KEYS.KARYAWAN, INITIAL_KARYAWAN);
    return local.map(decodeKaryawanRecord);
  }

  async getAllKaryawan(): Promise<Karyawan[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await withQueryTimeout(
          supabase.from('karyawan').select('*').order('nama', { ascending: true })
        );
        if (!error && data && data.length > 0) {
          const decoded = data.map(decodeKaryawanRecord);
          saveLocalCache(STORAGE_KEYS.KARYAWAN, decoded);
          return decoded;
        }
      } catch (e) {
        console.warn('Fallback to local karyawan:', e);
      }
    }
    const local = loadLocal<Karyawan[]>(STORAGE_KEYS.KARYAWAN, INITIAL_KARYAWAN);
    return local.map(decodeKaryawanRecord);
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

  async verifyKaryawanPin(karyawanId: string, inputPassword: string): Promise<{ valid: boolean; karyawan?: Karyawan }> {
    const list = await this.getAllKaryawan();
    const kar = list.find(k => k.id === karyawanId);
    if (!kar || kar.is_locked) return { valid: false };

    const cleanInput = inputPassword.trim();
    if (!cleanInput) return { valid: false };

    if (kar.password_plain) {
      return { valid: kar.password_plain.trim() === cleanInput, karyawan: kar };
    }
    const hashed = await hashPin(cleanInput);
    return { valid: Boolean(kar.pin_hash && kar.pin_hash === hashed), karyawan: kar };
  }

  async authenticateUser(identifier: string, inputPassword: string): Promise<{ success: boolean; user?: Karyawan; message?: string }> {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPassword = inputPassword.trim();

    if (!cleanId || !cleanPassword) {
      return { success: false, message: 'Harap masukkan Username dan Password.' };
    }

    // 1. CEK KREDENSIAL KASIR TOKO CABANG (WAJIB SAMA PERSIS DENGAN USERNAME & PASSWORD DARI PUSAT)
    const cabangList = await this.getAllCabang();
    const matchedBranch = cabangList.find(c => {
      const uKasir = (c.kasir_username || '').toLowerCase().trim();
      return Boolean(uKasir && uKasir === cleanId);
    });

    if (matchedBranch) {
      if (matchedBranch.is_kasir_locked) {
        return { 
          success: false, 
          message: `Akses tablet kasir ${matchedBranch.nama} saat ini sedang DIGEMBOK / DINONAKTIFKAN oleh Admin Pusat! Hubungi Pak Agan untuk membuka akses.` 
        };
      }

      const validPass = (matchedBranch.kasir_password_plain || '').trim();
      if (!validPass || cleanPassword !== validPass) {
        return { 
          success: false, 
          message: `Username atau Password Kasir ${matchedBranch.nama} salah! Gunakan password terbaru yang diatur dari Dashboard Pusat.` 
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
        password_plain: validPass,
        tipe_gaji: 'bulanan',
        gaji_pokok: 0,
        tunjangan: 0,
        plafon_kasbon: 0,
        is_active: true,
      };

      return { success: true, user: kasirUser };
    }

    // 2. CEK KREDENSIAL OWNER / KARYAWAN (KHUSUS USERNAME + PASSWORD SAJA)
    const list = await this.getAllKaryawan();
    const user = list.find(k => {
      const uName = (k.username || '').toLowerCase().trim();
      return Boolean(uName && uName === cleanId);
    });

    if (!user) {
      return { success: false, message: 'Username tidak ditemukan. Periksa kembali Username dari Dashboard Pusat.' };
    }

    if (user.is_locked) {
      return { 
        success: false, 
        message: 'Akun ini terkunci oleh Master Admin demi keamanan. Hubungi Pak Agan untuk membuka gembok.' 
      };
    }

    const hashed = await hashPin(cleanPassword);
    const isPasswordValid = user.password_plain
      ? user.password_plain.trim() === cleanPassword
      : Boolean(user.pin_hash && user.pin_hash === hashed);

    if (!isPasswordValid) {
      return { success: false, message: 'Username atau Password salah.' };
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
    let targetRecord: Karyawan | undefined;
    const updated = list.map(k => {
      const isMatch = k.id === karyawanId || k.username === karyawanId || (targetKarUuid && getKaryawanUuid(k.id) === targetKarUuid);
      if (isMatch) {
        targetRecord = { ...k, pin_hash: hashed, password_plain: newPin };
        return targetRecord;
      }
      return k;
    });
    saveLocal(STORAGE_KEYS.KARYAWAN, updated);

    if (isSupabaseConfigured && supabase && targetRecord) {
      try {
        const karUuid = getKaryawanUuid(karyawanId);
        if (karUuid) {
          const encodedPass = encodeKaryawanBankMarker(
            newPin,
            targetRecord.bank_nama,
            targetRecord.no_rekening,
            targetRecord.atas_nama_rekening
          );
          await supabase.from('karyawan').update({ pin_hash: hashed, password_plain: encodedPass }).eq('id', karUuid);
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
    const activeSecret = data.password_plain || data.pin;
    let newHash: string | undefined = undefined;
    if (activeSecret) {
      newHash = await hashPin(activeSecret);
    }
    const targetKarUuid = getKaryawanUuid(karyawanId);
    let updatedTarget: Karyawan | undefined;
    const updated = list.map(k => {
      const isMatch = k.id === karyawanId || k.username === karyawanId || (targetKarUuid && getKaryawanUuid(k.id) === targetKarUuid);
      if (isMatch) {
        updatedTarget = {
          ...k,
          ...(data.username ? { username: data.username.toLowerCase().trim() } : {}),
          ...(newHash ? { pin_hash: newHash } : {}),
          ...(activeSecret ? { password_plain: activeSecret } : {}),
          ...(typeof data.is_locked === 'boolean' ? { is_locked: data.is_locked } : {}),
        };
        return updatedTarget;
      }
      return k;
    });
    saveLocal(STORAGE_KEYS.KARYAWAN, updated);

    if (isSupabaseConfigured && supabase && updatedTarget) {
      try {
        const karUuid = getKaryawanUuid(karyawanId);
        if (karUuid) {
          const payload: any = {};
          if (data.username) payload.username = data.username.toLowerCase().trim();
          if (newHash) payload.pin_hash = newHash;
          if (activeSecret) {
            payload.password_plain = encodeKaryawanBankMarker(
              activeSecret,
              updatedTarget.bank_nama,
              updatedTarget.no_rekening,
              updatedTarget.atas_nama_rekening
            );
          }
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
    bank_nama?: string;
    no_rekening?: string;
    atas_nama_rekening?: string;
  }): Promise<Karyawan> {
    const list = await this.getAllKaryawan();
    const cleanPin = (data.pin || '1234').trim();
    const pinHashed = await hashPin(cleanPin);
    const autoUsername = (data.username || data.nama.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'staf') + Math.floor(10 + Math.random() * 90);
    const newId = generateUUID();
    const branchUuid = getBranchUuid(data.cabang_id) || data.cabang_id;
    const cleanPassPlain = data.password_plain || cleanPin || '1234';
    const bankNama = (data.bank_nama || '').trim() || undefined;
    const noRekening = (data.no_rekening || '').trim() || undefined;
    const atasNamaRek = (data.atas_nama_rekening || data.nama || '').trim() || undefined;

    const newK: Karyawan = {
      id: newId,
      nama: data.nama.trim(),
      username: autoUsername,
      role: data.role,
      cabang_id: branchUuid,
      telepon: data.telepon || '0812-0000-0000',
      pin_hash: pinHashed,
      password_plain: cleanPassPlain,
      tipe_gaji: data.tipe_gaji || 'harian',
      gaji_harian: data.gaji_harian || 100000,
      gaji_pokok: data.gaji_pokok || ((data.gaji_harian || 100000) * 6),
      tunjangan: data.tunjangan || 0,
      plafon_kasbon: data.plafon_kasbon || 500000,
      tabungan_rutin_mingguan: data.tabungan_rutin_mingguan ?? 0,
      total_tabungan: 0,
      bank_nama: bankNama,
      no_rekening: noRekening,
      atas_nama_rekening: bankNama || noRekening ? atasNamaRek : undefined,
      is_locked: false,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    list.push(newK);
    saveLocal(STORAGE_KEYS.KARYAWAN, list);

    if (isSupabaseConfigured && supabase) {
      try {
        const supabaseBranchUuid = getBranchUuid(data.cabang_id) || CABANG_MAP_INFO[0].uuid;
        const encodedPass = encodeKaryawanBankMarker(cleanPassPlain, bankNama, noRekening, atasNamaRek);
        const supabasePayload: any = {
          id: newId,
          cabang_id: supabaseBranchUuid,
          username: autoUsername,
          nama: newK.nama,
          role: newK.role,
          telepon: newK.telepon,
          pin_hash: pinHashed,
          password_plain: encodedPass,
          is_locked: false,
          tipe_gaji: newK.tipe_gaji,
          gaji_harian: newK.gaji_harian,
          tunjangan_harian: 0,
          tabungan_rutin_mingguan: newK.tabungan_rutin_mingguan,
          total_tabungan: 0,
          gaji_pokok: newK.gaji_pokok,
          tunjangan: 0,
          plafon_kasbon: newK.plafon_kasbon,
          is_active: true,
        };
        const { error } = await supabase.from('karyawan').insert([supabasePayload]);
        if (error) {
          console.warn('Supabase createKaryawan fallback local:', error.message);
        }
      } catch (e) {
        console.warn('Supabase createKaryawan fallback local:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }
    return newK;
  }

  async deleteKaryawan(karyawanId: string): Promise<boolean> {
    const list = await this.getAllKaryawan();
    const targetKarUuid = getKaryawanUuid(karyawanId);
    const updated = list.filter(k => k.id !== karyawanId && !(targetKarUuid && getKaryawanUuid(k.id) === targetKarUuid));
    saveLocal(STORAGE_KEYS.KARYAWAN, updated);

    if (isSupabaseConfigured && supabase) {
      try {
        if (targetKarUuid) {
          await supabase.from('karyawan').delete().eq('id', targetKarUuid);
        }
      } catch (e) {
        console.warn('Supabase deleteKaryawan fallback local:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }
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
      bank_nama?: string;
      no_rekening?: string;
      atas_nama_rekening?: string;
      telepon?: string;
    }
  ): Promise<boolean> {
    const list = await this.getAllKaryawan();
    const targetKarUuid = getKaryawanUuid(karyawanId);
    let targetAfter: Karyawan | null = null;
    const updated = list.map(k => {
      const isMatch = k.id === karyawanId || (targetKarUuid && getKaryawanUuid(k.id) === targetKarUuid);
      if (!isMatch) return k;
      targetAfter = { ...k, ...data };
      return targetAfter;
    });
    saveLocal(STORAGE_KEYS.KARYAWAN, updated);

    if (isSupabaseConfigured && supabase) {
      try {
        const karUuid = targetKarUuid || (isValidUuid(karyawanId) ? karyawanId : null);
        if (karUuid && targetAfter) {
          const t: Karyawan = targetAfter;
          const supPayload: any = {
            gaji_pokok: data.gaji_pokok,
            tunjangan: data.tunjangan,
            plafon_kasbon: data.plafon_kasbon,
            ...(data.tipe_gaji ? { tipe_gaji: data.tipe_gaji } : {}),
            ...(data.gaji_harian !== undefined ? { gaji_harian: data.gaji_harian } : {}),
            ...(data.tunjangan_harian !== undefined ? { tunjangan_harian: data.tunjangan_harian } : {}),
            ...(data.tabungan_rutin_mingguan !== undefined ? { tabungan_rutin_mingguan: data.tabungan_rutin_mingguan } : {}),
            ...(data.total_tabungan !== undefined ? { total_tabungan: data.total_tabungan } : {}),
            ...(data.telepon !== undefined ? { telepon: data.telepon } : {}),
            password_plain: encodeKaryawanBankMarker(t.password_plain, t.bank_nama, t.no_rekening, t.atas_nama_rekening),
          };
          await supabase.from('karyawan').update(supPayload).eq('id', karUuid);
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
  // ABSENSI & PRESENSI HARIAN (DIAJUKAN KASIR, DI-ACC OWNER PUSAT)
  // --------------------------------------------------------------------------
  private decodeAbsensiRecord(raw: any): Absensi {
    let cleanNote = raw.catatan || '';
    let parsedStatus: 'pending' | 'approved' | 'rejected' | undefined = raw.approval_status;
    let parsedApprovedBy: string | undefined = raw.approved_by;
    let parsedReason: string | undefined = raw.alasan_penolakan;

    const match = cleanNote.match(/\s*\[\[ACC:(pending|approved|rejected)(?:\|([^\]]*))?\]\]\s*/);
    if (match) {
      const markerStatus = match[1] as 'pending' | 'approved' | 'rejected';
      const markerExtra = (match[2] || '').trim();
      if (!parsedStatus) parsedStatus = markerStatus;
      if (markerStatus === 'approved' && !parsedApprovedBy && markerExtra) {
        parsedApprovedBy = markerExtra;
      }
      if (markerStatus === 'rejected' && !parsedReason && markerExtra) {
        parsedReason = markerExtra;
      }
      cleanNote = cleanNote.replace(match[0], ' ').trim();
    }

    return {
      ...raw,
      catatan: cleanNote,
      approval_status: parsedStatus,
      approved_by: parsedApprovedBy,
      alasan_penolakan: parsedReason,
      cabang_nama: resolveLiveBranchName(raw.cabang_id, raw.cabang_nama),
    };
  }

  private encodeAbsensiNote(
    cleanNote: string | undefined,
    status: 'pending' | 'approved' | 'rejected',
    extra?: string
  ): string {
    const stripped = (cleanNote || '').replace(/\s*\[\[ACC:[^\]]*\]\]\s*/g, '').trim();
    const safeExtra = (extra || '').replace(/[\[\]|]/g, ' ').trim();
    const marker = safeExtra ? `[[ACC:${status}|${safeExtra}]]` : `[[ACC:${status}]]`;
    return stripped ? `${stripped} ${marker}` : marker;
  }

  getAbsensiListCached(karyawanId?: string, cabangId?: string, tanggal?: string): Absensi[] {
    const defaultLocal = isSupabaseConfigured ? [] : INITIAL_ABSENSI;
    let result = loadLocal<Absensi[]>(STORAGE_KEYS.ABSENSI, defaultLocal)
      .map(a => this.decodeAbsensiRecord(a))
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
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

  async getAbsensiList(karyawanId?: string, cabangId?: string, tanggal?: string): Promise<Absensi[]> {
    let cloudList: Absensi[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('absensi')
          .select('*')
          .order('tanggal', { ascending: false })
          .limit(tanggal ? 200 : 350);
        if (karyawanId && karyawanId !== 'all') {
          const karUuid = getKaryawanUuid(karyawanId);
          if (karUuid) query = query.eq('karyawan_id', karUuid);
        }
        if (cabangId && cabangId !== 'all') {
          const cbgUuid = getBranchUuid(cabangId);
          if (cbgUuid) query = query.eq('cabang_id', cbgUuid);
        }
        if (tanggal) query = query.eq('tanggal', tanggal);
        const { data, error } = await withQueryTimeout(query);
        if (!error && data) {
          cloudList = data.map((d: any) => this.decodeAbsensiRecord(d));
        }
      } catch (e) {
        console.warn('Fallback to local absensi:', e);
      }
    }
    const defaultLocal = isSupabaseConfigured ? [] : INITIAL_ABSENSI;
    const all = loadLocal<Absensi[]>(STORAGE_KEYS.ABSENSI, defaultLocal).map(a =>
      this.decodeAbsensiRecord(a)
    );

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
      saveLocalCache(STORAGE_KEYS.ABSENSI, all);
    }

    const getKey = (a: Absensi) => {
      const normKar = getKaryawanUuid(a.karyawan_id) || (a.karyawan_nama ? a.karyawan_nama.toLowerCase().trim() : a.karyawan_id);
      return `${normKar}-${a.tanggal}`;
    };

    const combinedMap = new Map<string, Absensi>();
    for (const a of cloudList) {
      combinedMap.set(getKey(a), a);
    }
    for (const a of all) {
      const key = getKey(a);
      const existingCloud = combinedMap.get(key);
      if (!existingCloud) {
        combinedMap.set(key, a);
      } else if (a.approved_at && (!existingCloud.approved_at || a.approved_at > existingCloud.approved_at)) {
        // Pertahankan keputusan ACC/Tolak lokal jika cloud belum memiliki kolom/update terbaru
        combinedMap.set(key, {
          ...existingCloud,
          approval_status: a.approval_status,
          approved_by: a.approved_by,
          approved_at: a.approved_at,
          alasan_penolakan: a.alasan_penolakan,
        });
      }
    }

    const combined = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    );
    if (cloudList.length > 0) {
      saveLocalCache(STORAGE_KEYS.ABSENSI, combined);
    }

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
      if (a.approval_status === 'pending' || a.approval_status === 'rejected') return false;
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

    return filtered.length;
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
      approval_status?: 'pending' | 'approved' | 'rejected';
      approved_by?: string;
      approved_at?: string;
    }[]
  ): Promise<boolean> {
    const all = loadLocal<Absensi[]>(STORAGE_KEYS.ABSENSI, INITIAL_ABSENSI);

    for (const item of entries) {
      const upahMultiplier = item.status === 'hadir' ? 1 : item.status === 'setengah_hari' ? 0.5 : 0;
      const upahTerhitung = item.upah_harian * upahMultiplier;
      const appStatus = item.approval_status || 'pending';

      const existingIndex = all.findIndex(
        a =>
          (a.karyawan_id === item.karyawan_id ||
            (getKaryawanUuid(a.karyawan_id) && getKaryawanUuid(a.karyawan_id) === getKaryawanUuid(item.karyawan_id))) &&
          a.tanggal === item.tanggal
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
        catatan: (item.catatan || '').replace(/\s*\[\[ACC:[^\]]*\]\]\s*/g, '').trim(),
        recorded_by: item.recorded_by,
        approval_status: appStatus,
        approved_by: appStatus === 'approved' ? (item.approved_by || all[existingIndex]?.approved_by || 'Pak Agan (Owner)') : undefined,
        approved_at: appStatus === 'approved' ? (item.approved_at || all[existingIndex]?.approved_at) : undefined,
      };

      if (existingIndex >= 0) {
        all[existingIndex] = record;
      } else {
        all.unshift(record);
      }
    }

    saveLocal(STORAGE_KEYS.ABSENSI, all);

    if (isSupabaseConfigured && supabase) {
      const syncedOk = await this.syncAbsensiEntriesToCloud(entries);
      if (!syncedOk && entries.length > 0) {
        const first = entries[0];
        await queueOfflineOp({
          id: `abs-${first.cabang_id}-${entries.length === 1 ? first.karyawan_id : 'batch'}-${first.tanggal}`,
          type: 'save_absensi',
          cabang_id: first.cabang_id,
          created_at: new Date().toISOString(),
          payload: entries,
        });
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }

    return true;
  }

  private async updateAbsensiApprovalBatch(
    records: Absensi[],
    targetStatus: 'approved' | 'rejected',
    meta: { approvedBy?: string; alasan?: string }
  ): Promise<boolean> {
    const nowIso = new Date().toISOString();
    const approver = meta.approvedBy || 'Pak Agan (Owner)';
    const all = loadLocal<Absensi[]>(STORAGE_KEYS.ABSENSI, INITIAL_ABSENSI);

    for (const rec of records) {
      const idx = all.findIndex(
        a =>
          a.id === rec.id ||
          ((a.karyawan_id === rec.karyawan_id ||
            (getKaryawanUuid(a.karyawan_id) && getKaryawanUuid(a.karyawan_id) === getKaryawanUuid(rec.karyawan_id))) &&
            a.tanggal === rec.tanggal)
      );

      const updatedRec: Absensi = {
        ...rec,
        catatan: (rec.catatan || '').replace(/\s*\[\[ACC:[^\]]*\]\]\s*/g, '').trim(),
        approval_status: targetStatus,
        approved_by: approver,
        approved_at: nowIso,
        alasan_penolakan: targetStatus === 'rejected' ? (meta.alasan || 'Kehadiran ditolak Owner') : undefined,
      };

      if (idx >= 0) {
        all[idx] = updatedRec;
      } else {
        all.unshift(updatedRec);
      }

      if (isSupabaseConfigured && supabase) {
        try {
          const karUuid = getKaryawanUuid(rec.karyawan_id) || (isValidUuid(rec.karyawan_id) ? rec.karyawan_id : null);
          const filterBuilder = isValidUuid(rec.id)
            ? supabase.from('absensi').update({
                approval_status: targetStatus,
                approved_by: approver,
                approved_at: nowIso,
                ...(targetStatus === 'rejected' ? { alasan_penolakan: meta.alasan || 'Kehadiran ditolak Owner' } : {}),
              }).eq('id', rec.id)
            : karUuid
            ? supabase.from('absensi').update({
                approval_status: targetStatus,
                approved_by: approver,
                approved_at: nowIso,
                ...(targetStatus === 'rejected' ? { alasan_penolakan: meta.alasan || 'Kehadiran ditolak Owner' } : {}),
              }).eq('karyawan_id', karUuid).eq('tanggal', rec.tanggal)
            : null;

          if (filterBuilder) {
            const { error } = await filterBuilder;
            if (error) {
              // Fallback aman melalui kolom catatan yang selalu ada
              const encodedNote = this.encodeAbsensiNote(
                updatedRec.catatan,
                targetStatus,
                targetStatus === 'approved' ? approver : (meta.alasan || 'Ditolak Owner')
              );
              if (isValidUuid(rec.id)) {
                await supabase.from('absensi').update({ catatan: encodedNote }).eq('id', rec.id);
              } else if (karUuid) {
                await supabase.from('absensi').update({ catatan: encodedNote }).eq('karyawan_id', karUuid).eq('tanggal', rec.tanggal);
              }
            }
          }
        } catch (e) {
          console.warn('Supabase updateAbsensiApproval error:', e);
        }
      }
    }

    saveLocal(STORAGE_KEYS.ABSENSI, all);

    // Otomatis sinkronisasi Upah Masuk (+ Kredit) ke Dompet Karyawan saat absensi di-ACC
    for (const rec of records) {
      if (!rec.karyawan_id) continue;
      const upah = Number(rec.upah_harian_terhitung) > 0
        ? Number(rec.upah_harian_terhitung)
        : (rec.status === 'hadir' ? 100000 : rec.status === 'setengah_hari' ? 50000 : 0);

      const existingLogs = loadLocal<TabunganKaryawanItem[]>(STORAGE_KEYS.TABUNGAN_KARYAWAN, INITIAL_TABUNGAN_KARYAWAN);

      if (targetStatus === 'approved' && upah > 0) {
        const alreadyCredited = existingLogs.some(
          l => l.karyawan_id === rec.karyawan_id && (
            l.ref_id === rec.id || 
            l.keterangan?.includes(`[ABS:${rec.id}]`) ||
            (l.kategori === 'upah_hadir' && l.tanggal === rec.tanggal && l.nominal === upah)
          )
        );
        if (!alreadyCredited) {
          await this.setorTabunganKaryawan(
            rec.karyawan_id,
            upah,
            `Upah Hadir Presensi (${rec.tanggal}) [ABS:${rec.id}]`,
            approver,
            {
              kategori: 'upah_hadir',
              refId: rec.id,
              tanggal: rec.tanggal,
              createdAt: nowIso,
            }
          );
        }
      } else if (targetStatus === 'rejected' && upah > 0) {
        const wasCredited = existingLogs.some(
          l => l.karyawan_id === rec.karyawan_id && (
            l.ref_id === rec.id || 
            l.keterangan?.includes(`[ABS:${rec.id}]`)
          )
        );
        const alreadyDebitedBack = existingLogs.some(
          l => l.karyawan_id === rec.karyawan_id && (
            l.ref_id === `batal-${rec.id}` || 
            l.keterangan?.includes(`[BATAL_ABS:${rec.id}]`)
          )
        );
        if (wasCredited && !alreadyDebitedBack) {
          await this.tarikTabunganKaryawan(
            rec.karyawan_id,
            upah,
            `Koreksi Pembatalan Presensi (${rec.tanggal}) [BATAL_ABS:${rec.id}]`,
            approver,
            {
              kategori: 'denda',
              refId: `batal-${rec.id}`,
              allowOverdraft: true,
              tanggal: rec.tanggal,
              createdAt: nowIso,
            }
          );
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }
    return true;
  }

  async approveAbsensi(absensi: Absensi, approverName = 'Pak Agan (Owner)'): Promise<boolean> {
    return this.updateAbsensiApprovalBatch([absensi], 'approved', { approvedBy: approverName });
  }

  async approveAllAbsensi(records: Absensi[], approverName = 'Pak Agan (Owner)'): Promise<boolean> {
    if (records.length === 0) return true;
    return this.updateAbsensiApprovalBatch(records, 'approved', { approvedBy: approverName });
  }

  async rejectAbsensi(absensi: Absensi, alasan = 'Data kehadiran tidak sesuai', approverName = 'Pak Agan (Owner)'): Promise<boolean> {
    return this.updateAbsensiApprovalBatch([absensi], 'rejected', { approvedBy: approverName, alasan });
  }

  // --------------------------------------------------------------------------
  // SHIFT OPERASIONAL (BUKA & TUTUP SHIFT LACI)
  // --------------------------------------------------------------------------
  private getWibDateString(dateInput: Date | string = new Date()): string {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  }

  private getWibHour(dateInput: Date = new Date()): number {
    const h = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      hour12: false,
    }).format(dateInput);
    return Number(h) || 0;
  }

  private isSyntheticAutoShift(shift: { waktu_buka?: string | null; karyawan_id?: string | null }): boolean {
    const wb = shift.waktu_buka || '';
    const isAutoTimestamp = wb.endsWith('T16:00:00.000Z') || wb.includes('T16:00:00+00:00');
    const isAutoKar = (shift.karyawan_id || '').startsWith('kar-cbg-');
    return isAutoTimestamp || isAutoKar;
  }

  private isShiftFromActiveBusinessDay(waktuBukaIso?: string | null): boolean {
    if (!waktuBukaIso) return false;
    const openMs = new Date(waktuBukaIso).getTime();
    if (isNaN(openMs)) return false;

    const now = new Date();
    const ageHours = (now.getTime() - openMs) / (1000 * 60 * 60);
    // Shift lebih dari 20 jam selalu dianggap sisa hari sebelumnya
    if (ageHours > 20) return false;

    const openWibDate = this.getWibDateString(waktuBukaIso);
    const nowWibDate = this.getWibDateString(now);
    const nowWibHour = this.getWibHour(now);

    // Pergantian hari operasional (lewat jam 05:00 WIB): shift kemarin tidak otomatis terbawa ke hari ini
    if (openWibDate && nowWibDate && openWibDate !== nowWibDate && nowWibHour >= 5) {
      return false;
    }

    return true;
  }

  private async closeStaleShiftSilently(shift: Shift): Promise<void> {
    const branchUuid = getBranchUuid(shift.cabang_id) || shift.cabang_id;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + shift.cabang_id);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + branchUuid);
    }

    const closeTime = new Date().toISOString();
    const shifts = loadLocal<Shift[]>(STORAGE_KEYS.SHIFTS, []);
    let changed = false;
    const updatedShifts = shifts.map(s => {
      if (s.id === shift.id && s.status === 'open') {
        changed = true;
        return {
          ...s,
          status: 'closed' as const,
          waktu_tutup: s.waktu_tutup || closeTime,
          catatan: s.catatan || 'Auto-tutup pergantian hari',
        };
      }
      return s;
    });
    if (changed) {
      saveLocal(STORAGE_KEYS.SHIFTS, updatedShifts);
    }

    if (isSupabaseConfigured && supabase && isValidUuid(shift.id)) {
      try {
        await supabase
          .from('shift')
          .update({
            status: 'closed',
            waktu_tutup: closeTime,
            catatan: 'Auto-tutup pergantian hari',
          })
          .eq('id', shift.id)
          .eq('status', 'open');
      } catch (e) {
        console.warn('Supabase closeStaleShift error:', e);
      }
    }
  }

  getActiveShiftCached(cabangId: string): Shift | null {
    const branchUuid = getBranchUuid(cabangId) || cabangId;
    const key = STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + branchUuid;
    const shift =
      loadLocal<Shift | null>(key, null) ||
      loadLocal<Shift | null>(STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + cabangId, null);
    if (
      shift &&
      shift.status === 'open' &&
      isBranchMatch(shift.cabang_id, cabangId) &&
      !this.isSyntheticAutoShift(shift) &&
      this.isShiftFromActiveBusinessDay(shift.waktu_buka)
    ) {
      return shift;
    }
    return null;
  }

  async getActiveShift(
    cabangId: string,
    prefetched?: { transactions?: Transaksi[]; expenses?: PengeluaranKasbon[] }
  ): Promise<Shift | null> {
    const branchUuid = getBranchUuid(cabangId) || cabangId;
    const key = STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + branchUuid;
    const shift =
      loadLocal<Shift | null>(key, null) ||
      loadLocal<Shift | null>(STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + cabangId, null);

    if (shift && shift.status === 'open' && isBranchMatch(shift.cabang_id, cabangId)) {
      if (!this.isSyntheticAutoShift(shift) && this.isShiftFromActiveBusinessDay(shift.waktu_buka)) {
        return await this.calculateShiftBalance(shift, prefetched);
      }
      await this.closeStaleShiftSilently(shift);
    }

    // 1. Periksa cloud Supabase apakah ada shift aktif hari ini untuk cabang ini
    if (isSupabaseConfigured && supabase && branchUuid) {
      try {
        const { data, error } = await withQueryTimeout(
          supabase
            .from('shift')
            .select('*')
            .eq('cabang_id', branchUuid)
            .eq('status', 'open')
            .order('waktu_buka', { ascending: false })
            .limit(5)
        );

        if (!error && data && data.length > 0) {
          for (const row of data) {
            const modalAwalVal =
              row.modal_awal !== null && row.modal_awal !== undefined ? Number(row.modal_awal) : 0;
            const saldoSistemVal =
              row.saldo_akhir_sistem !== null && row.saldo_akhir_sistem !== undefined
                ? Number(row.saldo_akhir_sistem)
                : modalAwalVal;

            const supaShift: Shift = {
              id: row.id,
              cabang_id: cabangId,
              karyawan_id: row.karyawan_id || `kar-${cabangId}`,
              karyawan_nama: row.karyawan_nama || 'Kasir Outlet',
              waktu_buka: row.waktu_buka,
              waktu_tutup: null,
              modal_awal: modalAwalVal,
              total_tunai_masuk: Number(row.total_tunai_masuk || 0),
              total_qris_masuk: Number(row.total_qris_masuk || 0),
              total_transfer_masuk: Number(row.total_transfer_masuk || 0),
              total_belanja_approved: Number(row.total_belanja_approved || 0),
              total_kasbon_approved: Number(row.total_kasbon_approved || 0),
              saldo_akhir_sistem: saldoSistemVal,
              saldo_akhir_fisik: 0,
              selisih: 0,
              status: 'open',
            };

            if (!this.isSyntheticAutoShift(supaShift) && this.isShiftFromActiveBusinessDay(supaShift.waktu_buka)) {
              saveLocalCache(key, supaShift);
              saveLocalCache(STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + cabangId, supaShift);
              return await this.calculateShiftBalance(supaShift, prefetched);
            } else {
              await this.closeStaleShiftSilently(supaShift);
            }
          }
        }
      } catch (e) {
        console.warn('Supabase getActiveShift error:', e);
      }
    }

    // 2. Periksa arsip shift lokal apakah ada shift aktif hari ini yang berstatus open
    const shifts = loadLocal<Shift[]>(STORAGE_KEYS.SHIFTS, []);
    const existingOpen = shifts.find(
      s =>
        isBranchMatch(s.cabang_id, cabangId) &&
        s.status === 'open' &&
        !this.isSyntheticAutoShift(s) &&
        this.isShiftFromActiveBusinessDay(s.waktu_buka)
    );
    if (existingOpen) {
      saveLocalCache(key, existingOpen);
      saveLocalCache(STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + cabangId, existingOpen);
      return await this.calculateShiftBalance(existingOpen, prefetched);
    }

    // Tidak ada shift aktif: kembalikan null agar kasir wajib mengisi modal awal laci terlebih dahulu
    return null;
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

    saveLocalCache(STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + branchUuid, newShift);
    saveLocal(STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + cabang_id, newShift);

    const shifts = loadLocal<Shift[]>(STORAGE_KEYS.SHIFTS, []);
    shifts.push(newShift);
    saveLocalCache(STORAGE_KEYS.SHIFTS, shifts);

    if (isSupabaseConfigured && supabase) {
      const syncedOk = await this.syncOpenShiftToCloud(newShift, karUuid);
      if (!syncedOk) {
        await queueOfflineOp({
          id: `open-shift-${newShift.id}`,
          type: 'open_shift',
          cabang_id: newShift.cabang_id,
          created_at: newShift.waktu_buka,
          payload: { shift: newShift, karUuid },
        });
      }
    }

    // Otomatis catat presensi masuk kasir sesuai jam aktual buka shift
    try {
      const now = new Date();
      const jamMasukAktual = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayDate = this.getWibDateString(now);
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
  async calculateShiftBalance(
    shift: Shift,
    prefetched?: { transactions?: Transaksi[]; expenses?: PengeluaranKasbon[] }
  ): Promise<Shift> {
    const [transactions, expenses] = await Promise.all([
      prefetched?.transactions
        ? Promise.resolve(prefetched.transactions)
        : this.getTransaksiList(shift.cabang_id),
      prefetched?.expenses
        ? Promise.resolve(prefetched.expenses)
        : this.getPengeluaranList(shift.cabang_id),
    ]);

    // Sum transactions in this shift strictly (prevent leaking earlier shifts into a newly opened shift)
    const shiftOpenTime = new Date(shift.waktu_buka).getTime();
    const shiftCloseTime = shift.waktu_tutup ? new Date(shift.waktu_tutup).getTime() : null;

    const shiftTransactions = transactions.filter(t => {
      if (t.status !== 'completed') return false;
      if (!isBranchMatch(t.cabang_id, shift.cabang_id)) return false;
      // 1. Jika transaksi sudah punya shift_id valid, wajib cocok dengan shift ini saja
      if (t.shift_id && isValidUuid(t.shift_id)) {
        return t.shift_id === shift.id;
      }
      if (t.shift_id && t.shift_id === shift.id) return true;
      // 2. Fallback transaksi tanpa shift_id: hanya yang terjadi sejak shift dibuka (toleransi 5 menit) hingga tutup
      const trxTime = new Date(t.waktu).getTime();
      if (isNaN(trxTime) || isNaN(shiftOpenTime)) return false;
      if (trxTime < shiftOpenTime - 5 * 60 * 1000) return false;
      if (shiftCloseTime && trxTime > shiftCloseTime) return false;
      return true;
    });

    let tunaiMasuk = 0;
    let qrisMasuk = 0;
    let transferMasuk = 0;
    let shopeefoodMasuk = 0;
    let gofoodMasuk = 0;
    let grabfoodMasuk = 0;

    for (const trx of shiftTransactions) {
      const pay = (trx.metode_bayar || '').toLowerCase().trim();
      const amt = Number(trx.total || 0);
      if (pay === 'tunai' || pay === 'cash') tunaiMasuk += amt;
      else if (pay === 'qris') qrisMasuk += amt;
      else if (pay.includes('transfer') || pay === 'tf' || pay === 'bank') transferMasuk += amt;
      else if (pay.includes('shopee')) shopeefoodMasuk += amt;
      else if (pay.includes('gofood') || pay.includes('gopay')) gofoodMasuk += amt;
      else if (pay.includes('grab') || pay.includes('ovo')) grabfoodMasuk += amt;
      else transferMasuk += amt;
    }

    // Sum approved expenses taken from drawer ('laci') strictly within this shift window
    const shiftExpenses = expenses.filter(e => {
      if (e.status !== 'approved') return false;
      if (e.metode_pencairan === 'transfer') return false;
      if (!isBranchMatch(e.cabang_id, shift.cabang_id)) return false;
      if (e.shift_id && isValidUuid(e.shift_id)) {
        return e.shift_id === shift.id;
      }
      if (e.shift_id && e.shift_id === shift.id) return true;
      const expTime = new Date(e.tanggal).getTime();
      if (isNaN(expTime) || isNaN(shiftOpenTime)) return false;
      if (expTime < shiftOpenTime - 5 * 60 * 1000) return false;
      if (shiftCloseTime && expTime > shiftCloseTime) return false;
      return true;
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
      total_shopeefood_masuk: shopeefoodMasuk,
      total_gofood_masuk: gofoodMasuk,
      total_grabfood_masuk: grabfoodMasuk,
      total_transaksi_shift: shiftTransactions.length,
      total_belanja_approved: belanjaApproved,
      total_kasbon_approved: kasbonApproved,
      saldo_akhir_sistem: saldoSistem,
    };

    if (updatedShift.status === 'open') {
      const branchUuid = getBranchUuid(updatedShift.cabang_id) || updatedShift.cabang_id;
      saveLocalCache(STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + branchUuid, updatedShift);
      if (updatedShift.cabang_id !== branchUuid) {
        saveLocalCache(STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + updatedShift.cabang_id, updatedShift);
      }
    }

    return updatedShift;
  }

  async closeShift(
    cabangId: string, 
    saldoFisikLaci: number, 
    catatan?: string,
    options?: {
      writeOffOpenBills?: boolean;
      unpaidBills?: Transaksi[];
    }
  ): Promise<Shift | null> {
    const active = await this.getActiveShift(cabangId);
    if (!active) return null;

    const calculated = await this.calculateShiftBalance(active);
    const selisih = saldoFisikLaci - calculated.saldo_akhir_sistem;

    const allExpenses = await this.getPengeluaranList(cabangId);
    const pendingForShift = allExpenses.filter(
      e =>
        e.status === 'pending' &&
        isBranchMatch(e.cabang_id, cabangId) &&
        (!e.shift_id || e.shift_id === active.id || new Date(e.tanggal).getTime() >= new Date(active.waktu_buka).getTime() - 5 * 60 * 1000)
    );
    const pendingTotal = pendingForShift.reduce((s, e) => s + Number(e.nominal || 0), 0);

    const unpaidBills = options?.unpaidBills ?? (await this.getOpenBills(cabangId));
    const unpaidTotal = unpaidBills.reduce((s, b) => s + Number(b.total || 0), 0);

    const noteParts: string[] = [];
    if (catatan && catatan.trim()) {
      noteParts.push(catatan.trim());
    } else {
      noteParts.push(selisih === 0 ? 'Kas cocok pas' : selisih > 0 ? `Surplus +${selisih}` : `Tekor ${selisih}`);
    }

    if (unpaidBills.length > 0 && unpaidTotal > 0) {
      const billLabels = unpaidBills
        .slice(0, 3)
        .map(b => `${b.penanda || b.meja || b.nama_pelanggan || b.invoice_no}`)
        .join(', ');
      const extraMore = unpaidBills.length > 3 ? ` +${unpaidBills.length - 3} lainnya` : '';
      const tag = options?.writeOffOpenBills ? 'KERUGIAN BELUM BAYAR' : 'TAGIHAN BELUM BAYAR';
      noteParts.push(
        `[${tag}: ${unpaidBills.length} pesanan (Rp ${unpaidTotal.toLocaleString('id-ID')}) - ${billLabels}${extraMore}]`
      );
    }

    if (pendingForShift.length > 0 && pendingTotal > 0) {
      noteParts.push(
        `[PENDING ACC PUSAT: ${pendingForShift.length} pengajuan (Rp ${pendingTotal.toLocaleString('id-ID')})]`
      );
    }

    const closedShift: Shift = {
      ...calculated,
      waktu_tutup: new Date().toISOString(),
      saldo_akhir_fisik: saldoFisikLaci,
      selisih: selisih,
      status: 'closed',
      catatan: noteParts.join(' | '),
      pending_expenses_count: pendingForShift.length,
      pending_expenses_total: pendingTotal,
      unpaid_bills_count: unpaidBills.length,
      unpaid_bills_total: unpaidTotal,
    };

    // Jika kasir menandai tagihan belum bayar sebagai kerugian shift ini:
    // 1. Catat ke tabel transaksi (status: 'cancelled') agar muncul di Menu 2 Buku Mutasi & pengurang Laba Bersih Pusat
    // 2. Bersihkan dari antrean open bills lokal kasir
    if (options?.writeOffOpenBills && unpaidBills.length > 0) {
      for (const bill of unpaidBills) {
        const cleanInvoice = bill.invoice_no
          ? (bill.invoice_no.startsWith('RUGI-')
            ? bill.invoice_no
            : bill.invoice_no.replace(/^INV-/, 'RUGI-'))
          : `RUGI-${Date.now().toString().slice(-6)}`;
        const label = bill.penanda || bill.meja || bill.nama_pelanggan || 'Pelanggan Kabur/Batal';
        const lossTrx: Transaksi = {
          ...bill,
          id: isValidUuid(bill.id) ? bill.id : generateUUID(),
          invoice_no: cleanInvoice,
          cabang_id: active.cabang_id,
          cabang_nama: active.cabang_nama || bill.cabang_nama,
          shift_id: active.id,
          karyawan_id: bill.karyawan_id || active.karyawan_id,
          karyawan_nama: bill.karyawan_nama || active.karyawan_nama,
          nama_pelanggan: label.startsWith('[RUGI TUTUP BUKU]') ? label : `[RUGI TUTUP BUKU] ${label}`,
          waktu: bill.waktu || closedShift.waktu_tutup || new Date().toISOString(),
          metode_bayar: 'tunai',
          bayar: 0,
          kembali: 0,
          status: 'cancelled',
          is_offline_synced: !isNavigatorOffline(),
        };
        try {
          await this.createTransaksi(lossTrx);
        } catch (lossErr) {
          console.warn('Gagal simpan transaksi kerugian tutup buku:', lossErr);
        }
      }

      const closedIds = new Set(unpaidBills.map(b => b.id));
      const existingBills = loadLocal<Transaksi[]>(STORAGE_KEYS.OPEN_BILLS, []);
      const remainingBills = existingBills.filter(b => !closedIds.has(b.id) && !isBranchMatch(b.cabang_id, cabangId));
      saveLocal(STORAGE_KEYS.OPEN_BILLS, remainingBills);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('pak_agan_open_bills_updated'));
      }
    }

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

    // Sync to Supabase (queue offline failover if offline/error)
    if (isSupabaseConfigured && supabase && isValidUuid(closedShift.id)) {
      const syncedOk = await this.syncCloseShiftToCloud(closedShift);
      if (!syncedOk) {
        await queueOfflineOp({
          id: `close-shift-${closedShift.id}`,
          type: 'close_shift',
          cabang_id: closedShift.cabang_id,
          created_at: closedShift.waktu_tutup || new Date().toISOString(),
          payload: closedShift,
        });
      }
    }

    // Otomatis sinkronkan jam pulang presensi kasir sesuai jam aktual tutup shift
    try {
      const now = new Date();
      const jamPulangAktual = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayDate = this.getWibDateString(active.waktu_buka || now);
      const absensiList = loadLocal<Absensi[]>(STORAGE_KEYS.ABSENSI, INITIAL_ABSENSI);
      const existingAbs = absensiList.find(a => a.karyawan_id === active.karyawan_id && a.tanggal === todayDate);
      if (existingAbs) {
        existingAbs.jam_pulang = jamPulangAktual;
        saveLocal(STORAGE_KEYS.ABSENSI, absensiList);
      }
    } catch (e) {
      console.warn('Gagal update jam_pulang saat closeShift:', e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }

    return closedShift;
  }

  // Ambil seluruh riwayat shift (buka & tutup buku kasir) terintegrasi Supabase + lokal + kalkulasi ulang
  async getShiftList(
    cabangId?: string,
    prefetched?: {
      transactions?: Transaksi[];
      expenses?: PengeluaranKasbon[];
      karyawans?: Karyawan[];
      cabangs?: Cabang[];
    }
  ): Promise<Shift[]> {
    let cloudShifts: any[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('shift').select('*').order('waktu_buka', { ascending: false }).limit(200);
        if (cabangId && cabangId !== 'all') {
          const targetUuid = getBranchUuid(cabangId);
          if (targetUuid) query = query.eq('cabang_id', targetUuid);
        }
        const { data, error } = await withQueryTimeout(query);
        if (!error && data) {
          cloudShifts = data;
        }
      } catch (e) {
        console.warn('Supabase getShiftList fallback local:', e);
      }
    }

    const localShifts = loadLocal<Shift[]>(STORAGE_KEYS.SHIFTS, []);
    const mergedMap = new Map<string, Shift>();

    for (const row of cloudShifts) {
      if (this.isSyntheticAutoShift(row)) continue;
      mergedMap.set(row.id, {
        id: row.id,
        cabang_id: row.cabang_id,
        cabang_nama: resolveLiveBranchName(row.cabang_id),
        karyawan_id: row.karyawan_id || '',
        karyawan_nama: row.karyawan_nama || undefined,
        waktu_buka: row.waktu_buka,
        waktu_tutup: row.waktu_tutup || null,
        modal_awal: Number(row.modal_awal || 0),
        total_tunai_masuk: Number(row.total_tunai_masuk || 0),
        total_qris_masuk: Number(row.total_qris_masuk || 0),
        total_transfer_masuk: Number(row.total_transfer_masuk || 0),
        total_belanja_approved: Number(row.total_belanja_approved || 0),
        total_kasbon_approved: Number(row.total_kasbon_approved || 0),
        saldo_akhir_sistem: Number(row.saldo_akhir_sistem || 0),
        saldo_akhir_fisik: Number(row.saldo_akhir_fisik || 0),
        selisih: Number(row.selisih || 0),
        status: row.status === 'closed' ? 'closed' : 'open',
        catatan: row.catatan || null,
        created_at: row.created_at,
      });
    }

    for (const ls of localShifts) {
      if (this.isSyntheticAutoShift(ls)) continue;
      const existing = mergedMap.get(ls.id);
      if (!existing || (ls.status === 'closed' && existing.status === 'open') || (!existing.catatan && ls.catatan)) {
        mergedMap.set(ls.id, {
          ...existing,
          ...ls,
          cabang_nama: resolveLiveBranchName(ls.cabang_id, ls.cabang_nama),
        });
      }
    }

    const scopeCabang = cabangId && cabangId !== 'all' ? cabangId : undefined;
    const [transactions, expenses, karyawans, cabangs] = await Promise.all([
      prefetched?.transactions ? Promise.resolve(prefetched.transactions) : this.getTransaksiList(scopeCabang),
      prefetched?.expenses ? Promise.resolve(prefetched.expenses) : this.getPengeluaranList(scopeCabang),
      prefetched?.karyawans ? Promise.resolve(prefetched.karyawans) : this.getAllKaryawan(),
      prefetched?.cabangs ? Promise.resolve(prefetched.cabangs) : this.getCabangList(),
    ]);

    const enriched: Shift[] = Array.from(mergedMap.values())
      .filter(s => !cabangId || cabangId === 'all' || isBranchMatch(s.cabang_id, cabangId))
      .map(s => {
        const shiftOpenTime = new Date(s.waktu_buka).getTime();
        const shiftCloseTime = s.waktu_tutup ? new Date(s.waktu_tutup).getTime() : null;

        const shiftTrx = transactions.filter(t => {
          if (t.status !== 'completed') return false;
          if (!isBranchMatch(t.cabang_id, s.cabang_id)) return false;
          if (t.shift_id && isValidUuid(t.shift_id)) return t.shift_id === s.id;
          if (t.shift_id && t.shift_id === s.id) return true;
          const trxTime = new Date(t.waktu).getTime();
          if (isNaN(trxTime) || isNaN(shiftOpenTime)) return false;
          if (trxTime < shiftOpenTime - 5 * 60 * 1000) return false;
          if (shiftCloseTime && trxTime > shiftCloseTime) return false;
          return true;
        });

        let tunai = 0, qris = 0, transfer = 0, shopee = 0, gofood = 0, grab = 0;
        for (const trx of shiftTrx) {
          const pay = (trx.metode_bayar || '').toLowerCase().trim();
          const amt = Number(trx.total || 0);
          if (pay === 'tunai' || pay === 'cash') tunai += amt;
          else if (pay === 'qris') qris += amt;
          else if (pay.includes('transfer') || pay === 'tf' || pay === 'bank') transfer += amt;
          else if (pay.includes('shopee')) shopee += amt;
          else if (pay.includes('gofood') || pay.includes('gopay')) gofood += amt;
          else if (pay.includes('grab') || pay.includes('ovo')) grab += amt;
          else transfer += amt;
        }

        const shiftExpApproved = expenses.filter(e => {
          if (e.status !== 'approved') return false;
          if (e.metode_pencairan === 'transfer') return false;
          if (!isBranchMatch(e.cabang_id, s.cabang_id)) return false;
          if (e.shift_id && isValidUuid(e.shift_id)) return e.shift_id === s.id;
          if (e.shift_id && e.shift_id === s.id) return true;
          const expTime = new Date(e.tanggal).getTime();
          if (isNaN(expTime) || isNaN(shiftOpenTime)) return false;
          if (expTime < shiftOpenTime - 5 * 60 * 1000) return false;
          if (shiftCloseTime && expTime > shiftCloseTime) return false;
          return true;
        });

        const shiftExpPending = expenses.filter(e => {
          if (e.status !== 'pending') return false;
          if (!isBranchMatch(e.cabang_id, s.cabang_id)) return false;
          if (e.shift_id && isValidUuid(e.shift_id)) return e.shift_id === s.id;
          if (e.shift_id && e.shift_id === s.id) return true;
          const expTime = new Date(e.tanggal).getTime();
          if (isNaN(expTime) || isNaN(shiftOpenTime)) return false;
          if (expTime < shiftOpenTime - 5 * 60 * 1000) return false;
          if (shiftCloseTime && expTime > shiftCloseTime) return false;
          return true;
        });

        const belanjaApp = shiftExpApproved
          .filter(e => e.jenis === 'belanja')
          .reduce((sum, e) => sum + Number(e.nominal || 0), 0);
        const kasbonApp = shiftExpApproved
          .filter(e => e.jenis === 'kasbon')
          .reduce((sum, e) => sum + Number(e.nominal || 0), 0);

        const saldoSistem = s.modal_awal + tunai - belanjaApp - kasbonApp;
        const fisik = Number(s.saldo_akhir_fisik || 0);
        const branchObj = cabangs.find(c => isBranchMatch(c.id, s.cabang_id));
        const karObj = karyawans.find(k => k.id === s.karyawan_id);

        const shiftLossTrx = transactions.filter(t => {
          if (t.status !== 'cancelled') return false;
          if (!isBranchMatch(t.cabang_id, s.cabang_id)) return false;
          if (t.shift_id && isValidUuid(t.shift_id)) return t.shift_id === s.id;
          if (t.shift_id && t.shift_id === s.id) return true;
          const trxTime = new Date(t.waktu).getTime();
          if (isNaN(trxTime) || isNaN(shiftOpenTime)) return false;
          if (trxTime < shiftOpenTime - 5 * 60 * 1000) return false;
          if (shiftCloseTime && trxTime > shiftCloseTime + 5 * 60 * 1000) return false;
          return true;
        });

        let unpaidCount = Number(s.unpaid_bills_count || 0);
        let unpaidTotal = Number(s.unpaid_bills_total || 0);
        if (unpaidCount === 0 && s.catatan) {
          const lossMatch = s.catatan.match(/\[(KERUGIAN|TAGIHAN)\s+BELUM BAYAR:\s*(\d+)\s*pesanan\s*\(([^)]+)\)/i);
          if (lossMatch) {
            unpaidCount = parseInt(lossMatch[2], 10) || 1;
            unpaidTotal = parseInt(lossMatch[3].replace(/[^0-9]/g, ''), 10) || 0;
          }
        }
        if (unpaidCount === 0 && shiftLossTrx.length > 0) {
          unpaidCount = shiftLossTrx.length;
          unpaidTotal = shiftLossTrx.reduce((sum, t) => sum + Number(t.total || 0), 0);
        }

        return {
          ...s,
          cabang_nama: resolveLiveBranchName(s.cabang_id, branchObj?.nama || s.cabang_nama),
          karyawan_nama: karObj?.nama || s.karyawan_nama || branchObj?.pj_nama || 'Kasir Outlet',
          total_tunai_masuk: tunai,
          total_qris_masuk: qris,
          total_transfer_masuk: transfer,
          total_shopeefood_masuk: shopee,
          total_gofood_masuk: gofood,
          total_grabfood_masuk: grab,
          total_transaksi_shift: shiftTrx.length,
          total_belanja_approved: belanjaApp,
          total_kasbon_approved: kasbonApp,
          pending_expenses_count: shiftExpPending.length,
          pending_expenses_total: shiftExpPending.reduce((sum, e) => sum + Number(e.nominal || 0), 0),
          unpaid_bills_count: unpaidCount,
          unpaid_bills_total: unpaidTotal,
          saldo_akhir_sistem: saldoSistem,
          saldo_akhir_fisik: fisik,
          selisih: s.status === 'closed' ? fisik - saldoSistem : 0,
        };
      });

    return enriched.sort((a, b) => new Date(b.waktu_buka).getTime() - new Date(a.waktu_buka).getTime());
  }

  // --------------------------------------------------------------------------
  // TRANSAKSI PENJUALAN
  // --------------------------------------------------------------------------
  async getTransaksiList(cabangId?: string): Promise<Transaksi[]> {
    let cloudList: Transaksi[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('transaksi')
          .select('*, items:transaksi_item(*)')
          .order('waktu', { ascending: false })
          .limit(cabangId && cabangId !== 'all' ? 300 : 500);
        if (cabangId && cabangId !== 'all') {
          const targetUuid = getBranchUuid(cabangId);
          if (targetUuid) {
            query = query.eq('cabang_id', targetUuid);
          }
        }
        const { data, error } = await withQueryTimeout(query);
        if (!error && data) {
          cloudList = data.map((d: any) => ({
            id: d.id,
            invoice_no: d.invoice_no,
            cabang_id: d.cabang_id,
            cabang_nama: resolveLiveBranchName(d.cabang_id, d.cabang_nama),
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
            items: (d.items || []).map((it: any) => {
              let cleanCatatan = it.catatan || '';
              let temp = it.temperature;
              let varianNama = it.varian_nama;
              let hpp = it.hpp !== undefined ? Number(it.hpp) : undefined;
              const metaMatch = typeof cleanCatatan === 'string' ? cleanCatatan.match(/\[\[IMETA:([\s\S]*?)\]\]/) : null;
              if (metaMatch) {
                try {
                  const meta = JSON.parse(metaMatch[1]);
                  if (meta.temp) temp = meta.temp;
                  if (meta.var) varianNama = meta.var;
                  if (meta.hpp !== undefined) hpp = Number(meta.hpp);
                } catch {}
                cleanCatatan = cleanCatatan.replace(/\s*\[\[IMETA:[\s\S]*?\]\]/g, '').trim();
              }
              return {
                id: it.id,
                transaksi_id: it.transaksi_id,
                menu_id: it.menu_id,
                nama_menu: it.nama_menu,
                harga: Number(it.harga),
                hpp,
                qty: Number(it.qty),
                subtotal: Number(it.subtotal),
                subtotal_hpp: hpp ? hpp * Number(it.qty) : undefined,
                catatan: cleanCatatan || undefined,
                temperature: temp,
                varian_nama: varianNama,
              };
            }),
          }));
        }
      } catch (e) {
        console.warn('Fallback to local transaksi:', e);
      }
    }

    const defaultLocal = isSupabaseConfigured ? [] : INITIAL_TRANSAKSI;
    const local = loadLocal<Transaksi[]>(STORAGE_KEYS.TRANSAKSI, defaultLocal);

    // Gabungkan cloud dan local dengan deduplikasi berdasar invoice_no atau id
    const combinedMap = new Map<string, Transaksi>();
    for (const trx of cloudList) {
      combinedMap.set(trx.invoice_no || trx.id, trx);
    }
    for (const trx of local) {
      const key = trx.invoice_no || trx.id;
      if (!combinedMap.has(key)) {
        const enrichedItems = (trx.items || []).map((it: any) => {
          let cleanCatatan = it.catatan || '';
          let temp = it.temperature;
          let varianNama = it.varian_nama;
          let hpp = it.hpp !== undefined ? Number(it.hpp) : undefined;
          const metaMatch = typeof cleanCatatan === 'string' ? cleanCatatan.match(/\[\[IMETA:([\s\S]*?)\]\]/) : null;
          if (metaMatch) {
            try {
              const meta = JSON.parse(metaMatch[1]);
              if (meta.temp) temp = meta.temp;
              if (meta.var) varianNama = meta.var;
              if (meta.hpp !== undefined) hpp = Number(meta.hpp);
            } catch {}
            cleanCatatan = cleanCatatan.replace(/\s*\[\[IMETA:[\s\S]*?\]\]/g, '').trim();
          }
          return {
            ...it,
            catatan: cleanCatatan || undefined,
            temperature: temp,
            varian_nama: varianNama,
            hpp,
            subtotal_hpp: hpp ? hpp * Number(it.qty) : undefined,
          };
        });
        combinedMap.set(key, {
          ...trx,
          cabang_nama: resolveLiveBranchName(trx.cabang_id, trx.cabang_nama),
          items: enrichedItems,
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

    // Simpan ke storage lokal perangkat untuk offline-first resilience (anti-duplikat UUID)
    const all = loadLocal<Transaksi[]>(STORAGE_KEYS.TRANSAKSI, INITIAL_TRANSAKSI);
    const existingIdx = all.findIndex(t => t.id === trx.id);
    if (existingIdx >= 0) {
      all[existingIdx] = trx;
    } else {
      all.unshift(trx);
    }
    saveLocal(STORAGE_KEYS.TRANSAKSI, all);

    // 2. Unggah langsung ke cloud Supabase (failover otomatis ke antrean offline jika gagal/offline)
    if (isSupabaseConfigured && supabase) {
      const syncedOk = await this.syncTransaksiToCloud(trx);
      trx.is_offline_synced = syncedOk;
      const updatedAll = loadLocal<Transaksi[]>(STORAGE_KEYS.TRANSAKSI, INITIAL_TRANSAKSI);
      const uIdx = updatedAll.findIndex(t => t.id === trx.id);
      if (uIdx >= 0) {
        updatedAll[uIdx] = { ...updatedAll[uIdx], is_offline_synced: syncedOk };
        saveLocalCache(STORAGE_KEYS.TRANSAKSI, updatedAll);
      }
      if (syncedOk) {
        await removePendingTransaction(trx.id);
      } else {
        await queueOfflineTransaction(trx);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }

    return trx;
  }

  // --------------------------------------------------------------------------
  // TAGIHAN BELUM DIBAYAR / PESANAN MEJA (BAYAR NANTI / OPEN BILLS)
  // --------------------------------------------------------------------------
  async getOpenBills(cabangId?: string): Promise<Transaksi[]> {
    const list = loadLocal<Transaksi[]>(STORAGE_KEYS.OPEN_BILLS, []);
    const filtered = (cabangId && cabangId !== 'all'
      ? list.filter(t => isBranchMatch(t.cabang_id, cabangId) && t.status === 'pending_payment')
      : list.filter(t => t.status === 'pending_payment')
    ).map(t => ({
      ...t,
      cabang_nama: resolveLiveBranchName(t.cabang_id, t.cabang_nama),
    }));
    
    return filtered.sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime());
  }

  async saveOpenBill(trx: Transaksi): Promise<Transaksi> {
    if (!isValidUuid(trx.id)) {
      trx.id = generateUUID();
    }
    trx.status = 'pending_payment';
    if (!trx.cabang_nama) {
      trx.cabang_nama = getBranchName(trx.cabang_id);
    }

    const list = loadLocal<Transaksi[]>(STORAGE_KEYS.OPEN_BILLS, []);
    const existingIndex = list.findIndex(t => t.id === trx.id || t.invoice_no === trx.invoice_no);
    if (existingIndex >= 0) {
      list[existingIndex] = trx;
    } else {
      list.unshift(trx);
    }
    saveLocal(STORAGE_KEYS.OPEN_BILLS, list);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
      window.dispatchEvent(new Event('pak_agan_open_bills_updated'));
    }
    return trx;
  }

  async payOpenBill(
    transaksiId: string,
    paymentDetails: {
      metode_bayar: PaymentMethod;
      bayar: number;
      kembali: number;
      shift_id?: string;
      karyawan_id?: string;
      karyawan_nama?: string;
    }
  ): Promise<Transaksi> {
    const list = loadLocal<Transaksi[]>(STORAGE_KEYS.OPEN_BILLS, []);
    const target = list.find(t => t.id === transaksiId || t.invoice_no === transaksiId);
    if (!target) {
      throw new Error('Pesanan meja belum dibayar tidak ditemukan.');
    }

    // 1. Update status menjadi completed dan ikat ke shift kasir yang menerima pelunasan
    const completedTrx: Transaksi = {
      ...target,
      shift_id: paymentDetails.shift_id || target.shift_id,
      karyawan_id: paymentDetails.karyawan_id || target.karyawan_id,
      karyawan_nama: paymentDetails.karyawan_nama || target.karyawan_nama,
      metode_bayar: paymentDetails.metode_bayar,
      bayar: paymentDetails.bayar,
      kembali: paymentDetails.kembali,
      status: 'completed',
      waktu: new Date().toISOString(), // Catat waktu pelunasan kasir
    };

    // 2. Hapus dari antrean open bills lokal
    const remaining = list.filter(t => t.id !== transaksiId && t.invoice_no !== transaksiId);
    saveLocal(STORAGE_KEYS.OPEN_BILLS, remaining);

    // 3. Masukkan ke createTransaksi (langsung sinkron realtime ke Supabase Cloud & Dashboard Pusat)
    const saved = await this.createTransaksi(completedTrx);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_open_bills_updated'));
    }

    return saved;
  }

  async cancelOpenBill(transaksiId: string): Promise<boolean> {
    const list = loadLocal<Transaksi[]>(STORAGE_KEYS.OPEN_BILLS, []);
    const remaining = list.filter(t => t.id !== transaksiId && t.invoice_no !== transaksiId);
    saveLocal(STORAGE_KEYS.OPEN_BILLS, remaining);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
      window.dispatchEvent(new Event('pak_agan_open_bills_updated'));
    }
    return true;
  }

  // --------------------------------------------------------------------------
  // APPROVAL CENTER: BELANJA & KASBON
  // --------------------------------------------------------------------------
  getPengeluaranListCached(cabangId?: string): PengeluaranKasbon[] {
    const defaultLocal = isSupabaseConfigured ? [] : INITIAL_EXPENSES;
    const all = loadLocal<PengeluaranKasbon[]>(STORAGE_KEYS.EXPENSES, defaultLocal)
      .map(exp => ({
        ...exp,
        cabang_nama: resolveLiveBranchName(exp.cabang_id, exp.cabang_nama),
      }))
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

    if (cabangId && cabangId !== 'all') {
      return all.filter(e => isBranchMatch(e.cabang_id, cabangId));
    }
    return all;
  }

  async getPengeluaranList(cabangId?: string): Promise<PengeluaranKasbon[]> {
    let cloudExpenses: PengeluaranKasbon[] = [];
    let cloudFetchOk = false;
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('pengeluaran_kasbon')
          .select('*')
          .order('tanggal', { ascending: false })
          .limit(cabangId && cabangId !== 'all' ? 250 : 400);
        if (cabangId && cabangId !== 'all') {
          const targetUuid = getBranchUuid(cabangId);
          if (targetUuid) query = query.eq('cabang_id', targetUuid);
        }
        const { data, error } = await withQueryTimeout(query);
        if (!error && data) {
          cloudFetchOk = true;
          cloudExpenses = data.map((d: any) => ({
            ...d,
            cabang_nama: resolveLiveBranchName(d.cabang_id, d.cabang_nama),
          }));
        }
      } catch (e) {
        console.warn('Fallback to local expenses:', e);
      }
    }

    const defaultLocal = isSupabaseConfigured ? [] : INITIAL_EXPENSES;
    const all = loadLocal<PengeluaranKasbon[]>(STORAGE_KEYS.EXPENSES, defaultLocal);
    const combinedMap = new Map<string, PengeluaranKasbon>();
    for (const exp of cloudExpenses) {
      combinedMap.set(exp.id, exp);
    }
    for (const exp of all) {
      const existingCloud = combinedMap.get(exp.id);
      if (!existingCloud) {
        combinedMap.set(exp.id, {
          ...exp,
          cabang_nama: resolveLiveBranchName(exp.cabang_id, exp.cabang_nama),
        });
      } else {
        const localNewerDecision =
          (exp.approved_at && (!existingCloud.approved_at || exp.approved_at >= existingCloud.approved_at)) ||
          (exp.status !== 'pending' && existingCloud.status === 'pending');
        const keepLocalSettled = Boolean(exp.is_settled && !existingCloud.is_settled);
        combinedMap.set(exp.id, {
          ...existingCloud,
          shift_id: existingCloud.shift_id || exp.shift_id,
          karyawan_id: existingCloud.karyawan_id || exp.karyawan_id,
          ...(localNewerDecision
            ? {
                status: exp.status,
                metode_pencairan: exp.metode_pencairan ?? existingCloud.metode_pencairan,
                bukti_transfer_url: exp.bukti_transfer_url ?? existingCloud.bukti_transfer_url,
                approved_by: exp.approved_by ?? existingCloud.approved_by,
                approved_at: exp.approved_at ?? existingCloud.approved_at,
                alasan_penolakan: exp.alasan_penolakan ?? existingCloud.alasan_penolakan,
              }
            : {}),
          ...(keepLocalSettled
            ? {
                is_settled: true,
              }
            : {}),
        });
      }
    }

    const combined = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    );
    if (cloudFetchOk && (!cabangId || cabangId === 'all' || cloudExpenses.length > 0)) {
      saveLocalCache(STORAGE_KEYS.EXPENSES, combined);
    }

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

    const all = loadLocal<PengeluaranKasbon[]>(STORAGE_KEYS.EXPENSES, isSupabaseConfigured ? [] : INITIAL_EXPENSES);
    all.unshift(newItem);
    saveLocalCache(STORAGE_KEYS.EXPENSES, all);

    if (isSupabaseConfigured && supabase) {
      const insertPayload = {
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
      };
      const syncedOk = await this.syncPengeluaranToCloud(insertPayload);
      if (!syncedOk) {
        await queueOfflineOp({
          id: `exp-${newId}`,
          type: 'create_pengeluaran',
          cabang_id: newItem.cabang_id,
          created_at: newItem.tanggal,
          payload: insertPayload,
        });
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
    const nowIso = new Date().toISOString();
    const approver = params.approvedBy || 'Pak Agan (Owner)';
    const all = loadLocal<PengeluaranKasbon[]>(STORAGE_KEYS.EXPENSES, isSupabaseConfigured ? [] : INITIAL_EXPENSES);
    let targetExp = all.find(e => e.id === id);

    let updated = all.some(e => e.id === id)
      ? all.map(e => {
          if (e.id === id) {
            targetExp = {
              ...e,
              status: 'approved' as const,
              metode_pencairan: params.metode,
              bukti_transfer_url: params.buktiTransferUrl || e.bukti_transfer_url,
              approved_by: approver,
              approved_at: nowIso,
            };
            return targetExp;
          }
          return e;
        })
      : all;

    saveLocalCache(STORAGE_KEYS.EXPENSES, updated);

    if (isSupabaseConfigured && supabase) {
      try {
        const updatePayload: Record<string, any> = {
          status: 'approved',
          metode_pencairan: params.metode,
          approved_by: approver,
          approved_at: nowIso,
        };
        if (params.buktiTransferUrl) {
          updatePayload.bukti_transfer_url = params.buktiTransferUrl;
        }

        const { data: updatedRow, error: updateErr } = await withQueryTimeout(
          supabase.from('pengeluaran_kasbon').update(updatePayload).eq('id', id).select('*').maybeSingle()
        );

        if (updateErr) {
          console.warn('Supabase approvePengeluaran update error:', updateErr);
        }

        if (updatedRow) {
          targetExp = {
            ...(targetExp || {}),
            ...(updatedRow as PengeluaranKasbon),
            cabang_nama: resolveLiveBranchName(updatedRow.cabang_id, updatedRow.cabang_nama),
          };
        } else if (targetExp) {
          // Jika baris belum ada di Supabase (misal dibuat saat offline), upsert sekalian
          const branchUuid = getBranchUuid(targetExp.cabang_id) || CABANG_MAP_INFO[0].uuid;
          await withQueryTimeout(
            supabase.from('pengeluaran_kasbon').upsert([
              {
                id: targetExp.id,
                cabang_id: branchUuid,
                shift_id: isValidUuid(targetExp.shift_id) ? targetExp.shift_id : null,
                karyawan_id: getKaryawanUuid(targetExp.karyawan_id),
                pemohon_nama: targetExp.pemohon_nama,
                pemohon_telepon: targetExp.pemohon_telepon || null,
                jenis: targetExp.jenis,
                kategori_belanja: targetExp.kategori_belanja || null,
                keperluan: targetExp.keperluan,
                nominal: targetExp.nominal,
                status: 'approved',
                metode_pencairan: params.metode,
                bukti_transfer_url: params.buktiTransferUrl || targetExp.bukti_transfer_url || null,
                approved_by: approver,
                approved_at: nowIso,
                is_settled: Boolean(targetExp.is_settled),
                tanggal: targetExp.tanggal,
              },
            ])
          );
        }

        if (targetExp) {
          const existsInUpdated = updated.some(e => e.id === targetExp!.id);
          updated = existsInUpdated
            ? updated.map(e => (e.id === targetExp!.id ? targetExp! : e))
            : [targetExp, ...updated];
          saveLocalCache(STORAGE_KEYS.EXPENSES, updated);
        }
      } catch (e) {
        console.warn('Failed update approval to supabase:', e);
      }
    }

    // Hitung ulang saldo shift terkait (baik shift aktif maupun shift yang sudah tutup buku)
    // agar kasir dan riwayat tutup buku langsung sinkron tanpa menunggu reload.
    if (targetExp?.shift_id) {
      try {
        const shifts = loadLocal<Shift[]>(STORAGE_KEYS.SHIFTS, []);
        let targetShift = shifts.find(s => s.id === targetExp!.shift_id);

        if (!targetShift && isSupabaseConfigured && supabase && isValidUuid(targetExp.shift_id)) {
          const { data: cloudShiftRow } = await withQueryTimeout(
            supabase.from('shift').select('*').eq('id', targetExp.shift_id).maybeSingle()
          );
          if (cloudShiftRow) {
            targetShift = {
              id: cloudShiftRow.id,
              cabang_id: cloudShiftRow.cabang_id,
              cabang_nama: resolveLiveBranchName(cloudShiftRow.cabang_id),
              karyawan_id: cloudShiftRow.karyawan_id || '',
              waktu_buka: cloudShiftRow.waktu_buka,
              waktu_tutup: cloudShiftRow.waktu_tutup || null,
              modal_awal: Number(cloudShiftRow.modal_awal || 0),
              total_tunai_masuk: Number(cloudShiftRow.total_tunai_masuk || 0),
              total_qris_masuk: Number(cloudShiftRow.total_qris_masuk || 0),
              total_transfer_masuk: Number(cloudShiftRow.total_transfer_masuk || 0),
              total_belanja_approved: Number(cloudShiftRow.total_belanja_approved || 0),
              total_kasbon_approved: Number(cloudShiftRow.total_kasbon_approved || 0),
              saldo_akhir_sistem: Number(cloudShiftRow.saldo_akhir_sistem || 0),
              saldo_akhir_fisik: Number(cloudShiftRow.saldo_akhir_fisik || 0),
              selisih: Number(cloudShiftRow.selisih || 0),
              status: cloudShiftRow.status === 'closed' ? 'closed' : 'open',
              catatan: cloudShiftRow.catatan || null,
            };
          }
        }

        if (targetShift) {
          const recalculated = await this.calculateShiftBalance(targetShift, { expenses: updated });
          const nextFisik = Number(targetShift.saldo_akhir_fisik || 0);
          const nextSelisih = targetShift.status === 'closed' ? nextFisik - recalculated.saldo_akhir_sistem : 0;
          const syncedShift: Shift = {
            ...recalculated,
            saldo_akhir_fisik: nextFisik,
            selisih: nextSelisih,
          };
          const hasShiftLocally = shifts.some(s => s.id === syncedShift.id);
          const nextShifts = hasShiftLocally
            ? shifts.map(s => (s.id === syncedShift.id ? syncedShift : s))
            : [syncedShift, ...shifts];
          saveLocalCache(STORAGE_KEYS.SHIFTS, nextShifts);

          if (isSupabaseConfigured && supabase && isValidUuid(syncedShift.id)) {
            await withQueryTimeout(
              supabase
                .from('shift')
                .update({
                  total_belanja_approved: syncedShift.total_belanja_approved,
                  total_kasbon_approved: syncedShift.total_kasbon_approved,
                  saldo_akhir_sistem: syncedShift.saldo_akhir_sistem,
                  selisih: syncedShift.selisih,
                })
                .eq('id', syncedShift.id)
            );
          }
        }
      } catch (syncErr) {
        console.warn('Shift resync after approval skipped:', syncErr);
      }
    }

    // Uang Keluar (- Debit): Kasbon yang di-ACC langsung memotong saldo dompet staf
    if (targetExp && targetExp.jenis === 'kasbon' && targetExp.karyawan_id && targetExp.nominal > 0) {
      try {
        const existingLogs = loadLocal<TabunganKaryawanItem[]>(STORAGE_KEYS.TABUNGAN_KARYAWAN, INITIAL_TABUNGAN_KARYAWAN);
        const alreadyDebited = existingLogs.some(
          l => l.karyawan_id === targetExp!.karyawan_id && (
            l.ref_id === targetExp!.id || 
            l.keterangan?.includes(`[EXP:${targetExp!.id}]`)
          )
        );
        if (!alreadyDebited) {
          await this.tarikTabunganKaryawan(
            targetExp.karyawan_id,
            targetExp.nominal,
            `Pengambilan Kasbon: ${targetExp.keperluan} [EXP:${targetExp.id}]`,
            approver,
            {
              kategori: 'kasbon',
              refId: targetExp.id,
              allowOverdraft: true,
              tanggal: (targetExp.tanggal || nowIso).slice(0, 10),
              createdAt: nowIso,
            }
          );
        }
      } catch (err) {
        console.warn('Gagal memotong saldo dompet untuk kasbon:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }

    return true;
  }

  async rejectPengeluaran(id: string, alasan: string, rejectedBy?: string): Promise<boolean> {
    const nowIso = new Date().toISOString();
    const approver = rejectedBy || 'Pak Agan (Owner)';
    const all = loadLocal<PengeluaranKasbon[]>(STORAGE_KEYS.EXPENSES, isSupabaseConfigured ? [] : INITIAL_EXPENSES);
    const targetItem = all.find(e => e.id === id);

    const updated = all.map(e => {
      if (e.id === id) {
        return {
          ...e,
          status: 'rejected' as const,
          alasan_penolakan: alasan,
          approved_by: approver,
          approved_at: nowIso,
        };
      }
      return e;
    });

    saveLocal(STORAGE_KEYS.EXPENSES, updated);

    // Jika kasbon yang sebelumnya di-ACC ditolak, kembalikan saldo ke dompet staf
    if (targetItem && targetItem.jenis === 'kasbon' && targetItem.karyawan_id && targetItem.nominal > 0) {
      try {
        const existingLogs = loadLocal<TabunganKaryawanItem[]>(STORAGE_KEYS.TABUNGAN_KARYAWAN, INITIAL_TABUNGAN_KARYAWAN);
        const wasDebited = existingLogs.some(
          l => l.karyawan_id === targetItem.karyawan_id && (
            l.ref_id === targetItem.id || 
            l.keterangan?.includes(`[EXP:${targetItem.id}]`)
          )
        );
        const alreadyRefunded = existingLogs.some(
          l => l.karyawan_id === targetItem.karyawan_id && (
            l.ref_id === `batal-${targetItem.id}` || 
            l.keterangan?.includes(`[BATAL_EXP:${targetItem.id}]`)
          )
        );
        if (wasDebited && !alreadyRefunded) {
          await this.setorTabunganKaryawan(
            targetItem.karyawan_id,
            targetItem.nominal,
            `Koreksi Pembatalan Kasbon: ${targetItem.keperluan} [BATAL_EXP:${targetItem.id}]`,
            approver,
            {
              kategori: 'bonus',
              refId: `batal-${targetItem.id}`,
              tanggal: nowIso.slice(0, 10),
              createdAt: nowIso,
            }
          );
        }
      } catch (err) {
        console.warn('Gagal mengembalikan saldo dompet untuk kasbon batal:', err);
      }
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('pengeluaran_kasbon').update({
          status: 'rejected',
          alasan_penolakan: alasan,
          approved_by: approver,
          approved_at: nowIso,
        }).eq('id', id);
      } catch (e) {
        console.warn('Failed update rejection to supabase:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
    }

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
            cabang_nama: resolveLiveBranchName(d.cabang_id, d.cabang_nama),
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
    return loadLocal<Payroll[]>(STORAGE_KEYS.PAYROLL, []).map(p => ({
      ...p,
      cabang_nama: resolveLiveBranchName(p.cabang_id, p.cabang_nama),
    }));
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
    dicatatOleh: string = 'Pak Agan (Owner)',
    meta?: {
      kategori?: 'upah_hadir' | 'bonus' | 'koreksi' | 'manual';
      refId?: string;
      tanggal?: string;
      createdAt?: string;
    }
  ): Promise<TabunganKaryawanItem> {
    const all = loadLocal<TabunganKaryawanItem[]>(STORAGE_KEYS.TABUNGAN_KARYAWAN, INITIAL_TABUNGAN_KARYAWAN);
    const kars = await this.getAllKaryawan();
    const kar = kars.find(k => k.id === karyawanId);
    
    const saldoAwal = Number(kar?.total_tabungan || 0);
    const saldoAkhir = saldoAwal + nominal;
    const newUtang = saldoAkhir < 0 ? Math.abs(saldoAkhir) : 0;
    const nowIso = meta?.createdAt || new Date().toISOString();
    const dateStr = meta?.tanggal || nowIso.slice(0, 10);

    const newItem: TabunganKaryawanItem = {
      id: `tab-${karyawanId}-${Date.now()}-${Math.floor(10 + Math.random() * 90)}`,
      karyawan_id: karyawanId,
      karyawan_nama: kar?.nama || 'Karyawan',
      cabang_id: kar?.cabang_id,
      tanggal: dateStr,
      tipe: 'setor',
      nominal,
      saldo_setelah: saldoAkhir,
      keterangan,
      kategori: meta?.kategori || 'manual',
      ref_id: meta?.refId,
      dicatat_oleh: dicatatOleh,
      created_at: nowIso,
    };

    all.unshift(newItem);
    saveLocal(STORAGE_KEYS.TABUNGAN_KARYAWAN, all);

    // Update saldo kumulatif & utang di data Karyawan
    const updatedKars = kars.map(k => k.id === karyawanId ? { ...k, total_tabungan: saldoAkhir, utang_nominal: newUtang } : k);
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
            dicatat_oleh: dicatatOleh,
            created_at: nowIso
          }]);
          await supabase.from('karyawan').update({ total_tabungan: saldoAkhir, utang_nominal: newUtang }).eq('id', karUuid);
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
    dicatatOleh: string = 'Pak Agan (Owner)',
    meta?: {
      kategori?: 'kasbon' | 'pencairan_gaji' | 'denda' | 'manual';
      refId?: string;
      allowOverdraft?: boolean;
      tanggal?: string;
      createdAt?: string;
    }
  ): Promise<TabunganKaryawanItem> {
    const all = loadLocal<TabunganKaryawanItem[]>(STORAGE_KEYS.TABUNGAN_KARYAWAN, INITIAL_TABUNGAN_KARYAWAN);
    const kars = await this.getAllKaryawan();
    const kar = kars.find(k => k.id === karyawanId);
    
    const saldoAwal = Number(kar?.total_tabungan || 0);
    if (!meta?.allowOverdraft && nominal > saldoAwal && saldoAwal > 0) {
      throw new Error(`Saldo dompet tidak mencukupi! Saldo saat ini: Rp ${saldoAwal.toLocaleString('id-ID')}`);
    }
    const saldoAkhir = saldoAwal - nominal;
    const newUtang = saldoAkhir < 0 ? Math.abs(saldoAkhir) : 0;
    const nowIso = meta?.createdAt || new Date().toISOString();
    const dateStr = meta?.tanggal || nowIso.slice(0, 10);

    const newItem: TabunganKaryawanItem = {
      id: `tab-tarik-${karyawanId}-${Date.now()}-${Math.floor(10 + Math.random() * 90)}`,
      karyawan_id: karyawanId,
      karyawan_nama: kar?.nama || 'Karyawan',
      cabang_id: kar?.cabang_id,
      tanggal: dateStr,
      tipe: 'tarik',
      nominal,
      saldo_setelah: saldoAkhir,
      keterangan,
      kategori: meta?.kategori || 'manual',
      ref_id: meta?.refId,
      dicatat_oleh: dicatatOleh,
      created_at: nowIso,
    };

    all.unshift(newItem);
    saveLocal(STORAGE_KEYS.TABUNGAN_KARYAWAN, all);

    // Update saldo kumulatif & utang di data Karyawan
    const updatedKars = kars.map(k => k.id === karyawanId ? { ...k, total_tabungan: saldoAkhir, utang_nominal: newUtang } : k);
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
            dicatat_oleh: dicatatOleh,
            created_at: nowIso
          }]);
          await supabase.from('karyawan').update({ total_tabungan: saldoAkhir, utang_nominal: newUtang }).eq('id', karUuid);
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

  async getKaryawanDompetSummary(karyawanId: string): Promise<{
    saldo: number;
    totalMasuk: number;
    totalKeluar: number;
    isMinus: boolean;
    utangNominal: number;
    logs: TabunganKaryawanItem[];
  }> {
    const logs = await this.getTabunganKaryawanList(karyawanId);
    const kars = await this.getAllKaryawan();
    const kar = kars.find(k => k.id === karyawanId);
    const saldo = Number(kar?.total_tabungan || 0);

    const totalMasuk = logs
      .filter(l => l.tipe === 'setor')
      .reduce((sum, l) => sum + Number(l.nominal || 0), 0);

    const totalKeluar = logs
      .filter(l => l.tipe === 'tarik')
      .reduce((sum, l) => sum + Number(l.nominal || 0), 0);

    return {
      saldo,
      totalMasuk,
      totalKeluar,
      isMinus: saldo < 0,
      utangNominal: saldo < 0 ? Math.abs(saldo) : 0,
      logs,
    };
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
    const labelPeriode = params.payroll.periode_tanggal || params.payroll.slip_no;
    const paidRecordId = isValidUuid(params.payroll.id) ? params.payroll.id : generateUUID();

    // 1. Catat pencairan/transfer gaji langsung mendebit saldo dompet staf
    if (params.nominalDicairkan > 0) {
      await this.tarikTabunganKaryawan(
        params.payroll.karyawan_id,
        params.nominalDicairkan,
        params.catatan || `Pencairan / Transfer Gaji (${labelPeriode})`,
        'Pak Agan (Owner Pusat)',
        {
          kategori: 'pencairan_gaji',
          refId: paidRecordId,
          allowOverdraft: true,
          tanggal: new Date().toISOString().slice(0, 10),
        }
      );
    }

    const latestKars = await this.getAllKaryawan();
    const latestKar = latestKars.find(k => k.id === params.payroll.karyawan_id);
    const updatedSaldoSimpanan = latestKar?.total_tabungan || 0;

    const paidRecord: Payroll = {
      ...params.payroll,
      id: paidRecordId,
      status: 'paid',
      potongan_tabungan: 0,
      total_tabungan_snapshot: updatedSaldoSimpanan,
      gaji_bersih: params.nominalDicairkan,
      tanggal_kunci: new Date().toISOString(),
      keterangan:
        params.catatan ||
        (updatedSaldoSimpanan === 0
          ? `Transfer Penuh ${params.nominalDicairkan.toLocaleString('id-ID')} (Saldo dompet lunas Rp 0)`
          : updatedSaldoSimpanan > 0
            ? `Transfer ${params.nominalDicairkan.toLocaleString('id-ID')} • Sisa saldo dompet ${updatedSaldoSimpanan.toLocaleString('id-ID')}`
            : `Transfer ${params.nominalDicairkan.toLocaleString('id-ID')} • Saldo minus/utang berjalan ${Math.abs(updatedSaldoSimpanan).toLocaleString('id-ID')}`),
    };

    // Replace or add
    const updatedPayrolls = [
      paidRecord,
      ...existing.filter(
        p =>
          p.id !== params.payroll.id &&
          p.id !== paidRecordId &&
          !(p.karyawan_id === params.payroll.karyawan_id && p.periode_tanggal && p.periode_tanggal === params.payroll.periode_tanggal)
      ),
    ];
    saveLocal(STORAGE_KEYS.PAYROLL, updatedPayrolls);

    // 2. Tandai seluruh kasbon approved karyawan ini s.d. periode ini sebagai LUNAS (is_settled: true)
    const settledLoanIds = new Set((params.payroll.kasbon_details || []).map(k => k.id));
    const allExpenses = loadLocal<PengeluaranKasbon[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    const updatedExpenses = allExpenses.map(e => {
      const matchLoan =
        settledLoanIds.size > 0
          ? settledLoanIds.has(e.id)
          : (e.jenis === 'kasbon' && e.status === 'approved' && e.karyawan_id === params.payroll.karyawan_id);
      if (matchLoan) {
        return { ...e, is_settled: true };
      }
      return e;
    });

    // 3. Simpan mutasi transfer bila ada dana yang benar-benar ditransfer (> 0)
    if (params.nominalDicairkan > 0) {
      const payoutRecord: PengeluaranKasbon = {
        id: 'payout-' + Date.now(),
        cabang_id: params.payroll.cabang_id,
        cabang_nama: params.payroll.cabang_nama,
        karyawan_id: params.payroll.karyawan_id,
        pemohon_nama: params.payroll.karyawan_nama || 'Karyawan',
        pemohon_telepon: params.payroll.karyawan_telepon,
        jenis: 'kasbon',
        keperluan: `Pencairan Gaji - ${labelPeriode} (Slip #${params.payroll.slip_no})`,
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
    }

    saveLocal(STORAGE_KEYS.EXPENSES, updatedExpenses);

    // Sync to Supabase (best-effort)
    if (isSupabaseConfigured && supabase) {
      try {
        const karUuid = getKaryawanUuid(params.payroll.karyawan_id);
        const branchUuid = getBranchUuid(params.payroll.cabang_id);
        if (karUuid && branchUuid) {
          await supabase.from('payroll').insert([{
            id: paidRecordId,
            karyawan_id: karUuid,
            cabang_id: branchUuid,
            slip_no: paidRecord.slip_no,
            periode_bulan: paidRecord.periode_bulan,
            periode_tahun: paidRecord.periode_tahun,
            tipe_gaji: paidRecord.tipe_gaji || 'harian',
            total_kehadiran_hari: paidRecord.total_kehadiran_hari || 0,
            upah_harian: paidRecord.upah_harian || 0,
            gaji_pokok: paidRecord.gaji_pokok,
            tunjangan: 0,
            potongan_kasbon: paidRecord.potongan_kasbon || 0,
            potongan_tabungan: 0,
            total_tabungan_snapshot: updatedSaldoSimpanan,
            gaji_bersih: params.nominalDicairkan,
            status: 'paid',
            tanggal_kunci: paidRecord.tanggal_kunci,
            karyawan_telepon: paidRecord.karyawan_telepon || null,
            keterangan: paidRecord.keterangan || null,
          }]);
          await supabase.from('pengeluaran_kasbon')
            .update({ is_settled: true })
            .eq('karyawan_id', karUuid)
            .eq('jenis', 'kasbon')
            .eq('status', 'approved');
        }
      } catch (e) {
        console.warn('Supabase payoutKaryawanSalary sync error:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pak_agan_db_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    return true;
  }

  async syncPastApprovedAbsensiToDompet(): Promise<{ syncedAbsensi: number; syncedKasbon: number; message: string }> {
    const allAbsensi = loadLocal<Absensi[]>(STORAGE_KEYS.ABSENSI, INITIAL_ABSENSI);
    const allExpenses = loadLocal<PengeluaranKasbon[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    const existingLogs = loadLocal<TabunganKaryawanItem[]>(STORAGE_KEYS.TABUNGAN_KARYAWAN, INITIAL_TABUNGAN_KARYAWAN);

    let syncedAbsensi = 0;
    let syncedKasbon = 0;

    // 1. Audit absensi approved yang belum ada kreditnya di dompet
    for (const a of allAbsensi) {
      if (a.approval_status === 'approved' && a.karyawan_id && (a.status === 'hadir' || a.status === 'setengah_hari')) {
        const upah = Number(a.upah_harian_terhitung) > 0
          ? Number(a.upah_harian_terhitung)
          : (a.status === 'hadir' ? 100000 : 50000);
        const alreadyCredited = existingLogs.some(
          l => l.karyawan_id === a.karyawan_id && (
            l.ref_id === a.id || 
            l.keterangan?.includes(`[ABS:${a.id}]`) ||
            (l.kategori === 'upah_hadir' && l.tanggal === a.tanggal && l.nominal === upah)
          )
        );
        if (!alreadyCredited && upah > 0) {
          await this.setorTabunganKaryawan(
            a.karyawan_id,
            upah,
            `Upah Hadir Presensi (${a.tanggal}) [ABS:${a.id}]`,
            a.approved_by || 'Pak Agan (Owner)',
            {
              kategori: 'upah_hadir',
              refId: a.id,
              tanggal: a.tanggal,
              createdAt: a.approved_at || a.created_at || new Date().toISOString(),
            }
          );
          syncedAbsensi++;
        }
      }
    }

    // 2. Audit kasbon approved yang belum ada debitnya di dompet
    for (const e of allExpenses) {
      if (e.jenis === 'kasbon' && e.status === 'approved' && e.karyawan_id && e.nominal > 0) {
        const alreadyDebited = existingLogs.some(
          l => l.karyawan_id === e.karyawan_id && (
            l.ref_id === e.id || 
            l.keterangan?.includes(`[EXP:${e.id}]`)
          )
        );
        if (!alreadyDebited) {
          await this.tarikTabunganKaryawan(
            e.karyawan_id,
            e.nominal,
            `Pengambilan Kasbon: ${e.keperluan} [EXP:${e.id}]`,
            e.approved_by || 'Pak Agan (Owner)',
            {
              kategori: 'kasbon',
              refId: e.id,
              allowOverdraft: true,
              tanggal: (e.tanggal || new Date().toISOString()).slice(0, 10),
              createdAt: e.approved_at || e.tanggal || new Date().toISOString(),
            }
          );
          syncedKasbon++;
        }
      }
    }

    return {
      syncedAbsensi,
      syncedKasbon,
      message: `Audit Dompet Selesai: ${syncedAbsensi} presensi masuk & ${syncedKasbon} kasbon berhasil disinkronkan ke buku dompet.`,
    };
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
            cabang_nama: resolveLiveBranchName(d.cabang_id, d.cabang_nama),
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
        combinedMap.set(k.id, {
          ...k,
          cabang_nama: resolveLiveBranchName(k.cabang_id, k.cabang_nama),
        });
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
    const biayaLainBulanan = cabang?.biaya_lain_bulanan || 0;

    const sewaHarian = Math.round(sewaBulanan / 30);
    const wifiListrikHarian = Math.round(listrikAirBulanan / 30);
    const iuranHarian = Math.round(iuranBulanan / 30);
    const biayaLainHarian = Math.round(biayaLainBulanan / 30);

    // 2. Gaji Karyawan yang Hadir Hari Ini (Tulis Nama)
    const absensiHariIni = await this.getAbsensiList(undefined, cabangId, tanggal);
    const totalGajiKaryawan = absensiHariIni.reduce((sum, a) => sum + (a.upah_harian_terhitung || 0), 0);

    // 3. Omzet Kotor Kasir & Total HPP Bahan Baku Terpakai Hari Ini (ikut tanggal buka kasir shift)
    const shifts = await this.getShiftList(cabangId);
    const transactions = await this.getTransaksiList(cabangId);
    const dayTransactions = transactions.filter(t => 
      t.status === 'completed' &&
      getBusinessDateForRecord({
        timestamp: t.waktu,
        shiftId: t.shift_id,
        cabangId: t.cabang_id,
        shifts,
        isBranchEqual: isBranchMatch,
      }) === tanggal
    );

    let omzetKotor = 0;
    let totalHppBahan = 0;

    const allMenus = await this.getMenuList();
    const menuHppMap: Record<string, number> = {};
    const menuHppEsMap: Record<string, number> = {};
    const menuObjMap: Record<string, MenuItem> = {};
    allMenus.forEach(m => { 
      const defaultHpp = m.hpp !== undefined && m.hpp > 0 ? m.hpp : Math.round(m.harga * 0.32) || 4000;
      const defaultHppEs = m.hpp_es !== undefined && m.hpp_es > 0 ? m.hpp_es : defaultHpp;
      menuHppMap[m.id] = defaultHpp;
      menuHppEsMap[m.id] = defaultHppEs;
      menuObjMap[m.id] = m;
      if (m.kode) {
        menuHppMap[m.kode] = defaultHpp;
        menuHppEsMap[m.kode] = defaultHppEs;
        menuObjMap[m.kode] = m;
      }
      if (m.nama) {
        menuHppMap[m.nama.toLowerCase()] = defaultHpp;
        menuHppEsMap[m.nama.toLowerCase()] = defaultHppEs;
        menuObjMap[m.nama.toLowerCase()] = m;
      }
    });

    for (const trx of dayTransactions) {
      omzetKotor += trx.total;
      for (const it of trx.items) {
        let itemHpp: number | undefined = (it.hpp !== undefined && it.hpp > 0) ? it.hpp : undefined;
        if (!itemHpp || itemHpp <= 0) {
          const matchedMenu = menuObjMap[it.menu_id] || (it.nama_menu ? menuObjMap[it.nama_menu.toLowerCase()] : undefined);
          if (matchedMenu && it.varian_nama && matchedMenu.has_variasi_harga) {
            if (matchedMenu.varian_nama_2 && it.varian_nama.toLowerCase() === matchedMenu.varian_nama_2.toLowerCase()) {
              itemHpp = matchedMenu.varian_hpp_2;
            } else if (matchedMenu.varian_nama_1 && it.varian_nama.toLowerCase() === matchedMenu.varian_nama_1.toLowerCase()) {
              itemHpp = matchedMenu.varian_hpp_1;
            }
          }
          if (!itemHpp || itemHpp <= 0) {
            const isDingin = it.temperature === 'dingin';
            itemHpp = isDingin
              ? (menuHppEsMap[it.menu_id] || (it.nama_menu && menuHppEsMap[it.nama_menu.toLowerCase()]) || menuHppMap[it.menu_id] || (it.nama_menu && menuHppMap[it.nama_menu.toLowerCase()]) || 4000)
              : (menuHppMap[it.menu_id] || (it.nama_menu && menuHppMap[it.nama_menu.toLowerCase()]) || 4000);
          }
        }
        totalHppBahan += ((itemHpp || 0) * it.qty);
      }
    }

    // 4. Belanja Laci Darurat Approved Hari Ini (ikut tanggal buka kasir shift)
    const expenses = await this.getPengeluaranList(cabangId);
    const dayExpenses = expenses.filter(e => 
      e.status === 'approved' && 
      e.jenis === 'belanja' && 
      e.metode_pencairan === 'laci' && 
      getBusinessDateForRecord({
        timestamp: e.tanggal,
        shiftId: e.shift_id,
        cabangId: e.cabang_id,
        shifts,
        isBranchEqual: isBranchMatch,
      }) === tanggal
    );
    const totalBelanjaLaci = dayExpenses.reduce((sum, e) => sum + e.nominal, 0);

    // Total Potongan Harian = Sewa Ruko + Wifi/Listrik + Iuran + Beban Tambahan + Gaji Karyawan + HPP Bahan (+ Belanja Laci)
    const totalPotonganHarian = sewaHarian + wifiListrikHarian + iuranHarian + biayaLainHarian + totalGajiKaryawan + totalHppBahan + totalBelanjaLaci;

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
      saveLocal(STORAGE_KEYS.MENU, []);
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
          cabang_nama: resolveLiveBranchName(p.cabang_id, p.cabang_nama)
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

  private offlineSyncInFlight: Promise<{ syncedCount: number; remainingCount: number }> | null = null;

  private async syncAbsensiEntriesToCloud(
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
      approval_status?: 'pending' | 'approved' | 'rejected';
      approved_by?: string;
      approved_at?: string;
    }[]
  ): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return true;
    if (isNavigatorOffline()) return false;

    try {
      for (const item of entries) {
        const branchUuid = getBranchUuid(item.cabang_id) || CABANG_MAP_INFO[0].uuid;
        const karUuid = getKaryawanUuid(item.karyawan_id) || (isValidUuid(item.karyawan_id) ? item.karyawan_id : null);
        const upahMultiplier = item.status === 'hadir' ? 1 : item.status === 'setengah_hari' ? 0.5 : 0;
        const appStatus = item.approval_status || 'pending';
        if (!karUuid) continue;

        const { error: delErr } = await withQueryTimeout(
          supabase.from('absensi').delete().eq('karyawan_id', karUuid).eq('tanggal', item.tanggal)
        );
        if (delErr) {
          console.warn('Supabase absensi pre-delete error:', delErr);
          return false;
        }

        const baseRow = {
          id: generateUUID(),
          karyawan_id: karUuid,
          karyawan_nama: item.karyawan_nama,
          cabang_id: branchUuid,
          cabang_nama: item.cabang_nama,
          tanggal: item.tanggal,
          jam_masuk: item.jam_masuk || '16:00',
          jam_pulang: item.jam_pulang || null,
          status: item.status,
          upah_harian_terhitung: item.upah_harian * upahMultiplier,
          catatan: (item.catatan || '').replace(/\s*\[\[ACC:[^\]]*\]\]\s*/g, '').trim(),
          recorded_by: item.recorded_by,
        };

        const { error: richErr } = await withQueryTimeout(
          supabase.from('absensi').insert({
            ...baseRow,
            approval_status: appStatus,
            approved_by: appStatus === 'approved' ? (item.approved_by || 'Pak Agan (Owner)') : null,
            approved_at: appStatus === 'approved' ? (item.approved_at || new Date().toISOString()) : null,
          })
        );

        if (richErr && !isDuplicatePgError(richErr)) {
          const { error: fallbackErr } = await withQueryTimeout(
            supabase.from('absensi').insert({
              ...baseRow,
              catatan: this.encodeAbsensiNote(baseRow.catatan, appStatus, item.approved_by),
            })
          );
          if (fallbackErr && !isDuplicatePgError(fallbackErr)) {
            console.warn('Supabase absensi fallback insert error:', fallbackErr);
            return false;
          }
        }
      }
      return true;
    } catch (e) {
      console.warn('Failed syncing absensi to supabase:', e);
      return false;
    }
  }

  private async syncOpenShiftToCloud(shift: Shift, karUuid: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return true;
    if (isNavigatorOffline()) return false;

    const branchUuid = getBranchUuid(shift.cabang_id) || CABANG_MAP_INFO[0].uuid;
    try {
      const { error: insertErr } = await withQueryTimeout(
        supabase.from('shift').insert([{
          id: shift.id,
          cabang_id: branchUuid,
          karyawan_id: karUuid,
          waktu_buka: shift.waktu_buka,
          modal_awal: shift.modal_awal,
          status: 'open',
        }])
      );
      if (!insertErr || isDuplicatePgError(insertErr)) return true;

      console.warn('Supabase openShift insert error, retrying fallback karyawan_id:', insertErr);
      const { data: fallbackKar } = await withQueryTimeout(
        supabase.from('karyawan').select('id').limit(1).maybeSingle()
      );
      if (fallbackKar?.id) {
        const { error: fbErr } = await withQueryTimeout(
          supabase.from('shift').insert([{
            id: shift.id,
            cabang_id: branchUuid,
            karyawan_id: fallbackKar.id,
            waktu_buka: shift.waktu_buka,
            modal_awal: shift.modal_awal,
            status: 'open',
          }])
        );
        if (!fbErr || isDuplicatePgError(fbErr)) return true;
      }
      return false;
    } catch (e) {
      console.warn('Supabase openShift insert error:', e);
      return false;
    }
  }

  private async syncCloseShiftToCloud(closedShift: Shift): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase || !isValidUuid(closedShift.id)) return true;
    if (isNavigatorOffline()) return false;

    const closePatch = {
      waktu_tutup: closedShift.waktu_tutup,
      total_tunai_masuk: closedShift.total_tunai_masuk,
      total_qris_masuk: closedShift.total_qris_masuk,
      total_transfer_masuk: closedShift.total_transfer_masuk,
      total_belanja_approved: closedShift.total_belanja_approved,
      total_kasbon_approved: closedShift.total_kasbon_approved,
      saldo_akhir_sistem: closedShift.saldo_akhir_sistem,
      saldo_akhir_fisik: closedShift.saldo_akhir_fisik,
      selisih: closedShift.selisih,
      status: 'closed' as const,
      catatan: closedShift.catatan,
    };

    try {
      const { data: updatedRows, error: updateErr } = await withQueryTimeout(
        supabase.from('shift').update(closePatch).eq('id', closedShift.id).select('id')
      );
      if (updateErr) {
        console.warn('Supabase closeShift update error:', updateErr);
        return false;
      }
      if (updatedRows && updatedRows.length > 0) return true;

      // Baris shift belum ada di cloud (mis. dibuka saat offline): lakukan upsert lengkap
      const branchUuid = getBranchUuid(closedShift.cabang_id) || CABANG_MAP_INFO[0].uuid;
      const karUuid = getKaryawanUuid(closedShift.karyawan_id) || KARYAWAN_UUID_MAP['kar-1'];
      const { error: upsertErr } = await withQueryTimeout(
        supabase.from('shift').upsert([{
          id: closedShift.id,
          cabang_id: branchUuid,
          karyawan_id: karUuid,
          waktu_buka: closedShift.waktu_buka,
          modal_awal: closedShift.modal_awal,
          ...closePatch,
        }], { onConflict: 'id' })
      );
      if (upsertErr) {
        console.warn('Supabase closeShift upsert error:', upsertErr);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Supabase closeShift update error:', e);
      return false;
    }
  }

  private async syncTransaksiToCloud(trx: Transaksi): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return true;
    if (isNavigatorOffline()) return false;

    try {
      const branchUuid = getBranchUuid(trx.cabang_id) || CABANG_MAP_INFO[0].uuid;
      let shiftUuid = isValidUuid(trx.shift_id) ? trx.shift_id : null;
      const karyawanUuid = isValidUuid(trx.karyawan_id)
        ? trx.karyawan_id
        : (trx.karyawan_id && KARYAWAN_UUID_MAP[trx.karyawan_id]) || null;

      if (shiftUuid) {
        try {
          const { data: shiftCheck } = await withQueryTimeout(
            supabase.from('shift').select('id').eq('id', shiftUuid).limit(1)
          );
          if (!shiftCheck || shiftCheck.length === 0) {
            const defaultKarUuid = karyawanUuid || KARYAWAN_UUID_MAP['kar-1'];
            const { error: sErr } = await withQueryTimeout(
              supabase.from('shift').insert([{
                id: shiftUuid,
                cabang_id: branchUuid,
                karyawan_id: defaultKarUuid,
                waktu_buka: trx.waktu || new Date().toISOString(),
                modal_awal: 0,
                status: 'open',
              }])
            );
            if (sErr && !isDuplicatePgError(sErr)) {
              shiftUuid = null;
            }
          }
        } catch {
          shiftUuid = null;
        }
      }

      const baseHeader = {
        id: trx.id,
        invoice_no: trx.invoice_no,
        cabang_id: branchUuid,
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
      };

      let { error } = await withQueryTimeout(
        supabase.from('transaksi').insert([{
          ...baseHeader,
          shift_id: shiftUuid,
          karyawan_id: karyawanUuid,
        }])
      );

      if (error && !isDuplicatePgError(error)) {
        console.warn('Retry inserting transaksi without FK constraints:', error);
        const retryRes = await withQueryTimeout(
          supabase.from('transaksi').insert([{
            ...baseHeader,
            shift_id: null,
            karyawan_id: null,
          }])
        );
        error = retryRes.error;
      }

      const alreadyExists = isDuplicatePgError(error);
      if (error && !alreadyExists) {
        console.error('Supabase transaksi insert final error:', error);
        return false;
      }

      if (!alreadyExists && trx.items && trx.items.length > 0) {
        const itemsPayload = trx.items.map(it => {
          const menuUuid = getMenuUuid(it.menu_id);
          let cleanCat = (it.catatan || '').replace(/\s*\[\[IMETA:[\s\S]*?\]\]/g, '').trim();
          const metaObj: any = {};
          if (it.temperature) metaObj.temp = it.temperature;
          if (it.varian_nama) metaObj.var = it.varian_nama;
          if (it.hpp !== undefined && it.hpp > 0) metaObj.hpp = it.hpp;

          const hasMeta = Object.keys(metaObj).length > 0;
          const packedCat = hasMeta
            ? (cleanCat ? `${cleanCat} [[IMETA:${JSON.stringify(metaObj)}]]` : `[[IMETA:${JSON.stringify(metaObj)}]]`)
            : (cleanCat || null);

          return {
            id: generateUUID(),
            transaksi_id: trx.id,
            menu_id: menuUuid,
            nama_menu: it.nama_menu,
            harga: it.harga,
            qty: it.qty,
            subtotal: it.subtotal,
            catatan: packedCat,
          };
        });
        const { error: itemsErr } = await withQueryTimeout(
          supabase.from('transaksi_item').insert(itemsPayload)
        );
        if (itemsErr && !isDuplicatePgError(itemsErr)) {
          console.error('Supabase transaksi_item insert error:', itemsErr);
        }
      }

      return true;
    } catch (e) {
      console.warn('Error inserting into Supabase:', e);
      return false;
    }
  }

  private async syncPengeluaranToCloud(insertPayload: Record<string, unknown>): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return true;
    if (isNavigatorOffline()) return false;

    try {
      const { error: insertErr } = await withQueryTimeout(
        supabase.from('pengeluaran_kasbon').insert([insertPayload])
      );
      if (!insertErr || isDuplicatePgError(insertErr)) return true;

      console.warn('Supabase createPengeluaran insert error, retrying without nullable FKs:', insertErr);
      const { error: retryErr } = await withQueryTimeout(
        supabase.from('pengeluaran_kasbon').insert([{
          ...insertPayload,
          shift_id: null,
          karyawan_id: null,
          menu_id: null,
        }])
      );
      if (!retryErr || isDuplicatePgError(retryErr)) return true;

      console.warn('Supabase createPengeluaran retry error:', retryErr);
      return false;
    } catch (e) {
      console.warn('Failed insert to supabase pengeluaran:', e);
      return false;
    }
  }

  async syncAllOfflineQueues(): Promise<{ syncedCount: number; remainingCount: number }> {
    if (this.offlineSyncInFlight) {
      return this.offlineSyncInFlight;
    }

    const runner = async (): Promise<{ syncedCount: number; remainingCount: number }> => {
      if (isNavigatorOffline() || !isSupabaseConfigured || !supabase) {
        const [ops, trxs] = await Promise.all([getPendingOps(), getPendingTransactions()]);
        return { syncedCount: 0, remainingCount: ops.length + trxs.length };
      }

      const [ops, trxs] = await Promise.all([getPendingOps(), getPendingTransactions()]);
      if (ops.length === 0 && trxs.length === 0) {
        return { syncedCount: 0, remainingCount: 0 };
      }

      let syncedCount = 0;

      // 1. Pastikan open_shift tersinkron dahulu agar FK shift_id tersedia bagi transaksi & close_shift
      for (const op of ops.filter(o => o.type === 'open_shift')) {
        const data = op.payload as { shift: Shift; karUuid: string };
        const ok = await this.syncOpenShiftToCloud(data.shift, data.karUuid);
        if (ok) {
          await removePendingOp(op.id);
          syncedCount++;
        }
      }

      // 2. Sinkronisasi seluruh antrean transaksi (cart + bayar open bill)
      if (trxs.length > 0) {
        const localAll = loadLocal<Transaksi[]>(STORAGE_KEYS.TRANSAKSI, INITIAL_TRANSAKSI);
        let localChanged = false;
        for (const trx of trxs) {
          const ok = await this.syncTransaksiToCloud(trx);
          if (ok) {
            const idx = localAll.findIndex(t => t.id === trx.id);
            if (idx >= 0) {
              localAll[idx] = { ...localAll[idx], is_offline_synced: true };
              localChanged = true;
            }
            await removePendingTransaction(trx.id);
            syncedCount++;
          }
        }
        if (localChanged) {
          saveLocalCache(STORAGE_KEYS.TRANSAKSI, localAll);
        }
      }

      // 3. Sinkronisasi pengeluaran/kasbon & absensi sebelum close_shift
      const postOpsOrder = ['create_pengeluaran', 'save_absensi', 'close_shift'] as const;
      for (const opType of postOpsOrder) {
        for (const op of ops.filter(o => o.type === opType)) {
          let ok = false;
          if (op.type === 'create_pengeluaran') {
            ok = await this.syncPengeluaranToCloud(op.payload as Record<string, unknown>);
          } else if (op.type === 'save_absensi') {
            ok = await this.syncAbsensiEntriesToCloud(op.payload as Parameters<PosDatabase['saveBranchAttendance']>[0]);
          } else if (op.type === 'close_shift') {
            ok = await this.syncCloseShiftToCloud(op.payload as Shift);
          }
          if (ok) {
            await removePendingOp(op.id);
            syncedCount++;
          }
        }
      }

      if (syncedCount > 0 && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('pak_agan_db_updated'));
      }

      const [remOps, remTrxs] = await Promise.all([getPendingOps(), getPendingTransactions()]);
      return { syncedCount, remainingCount: remOps.length + remTrxs.length };
    };

    this.offlineSyncInFlight = runner().finally(() => {
      this.offlineSyncInFlight = null;
    });
    return this.offlineSyncInFlight;
  }
}

export const db = new PosDatabase();
