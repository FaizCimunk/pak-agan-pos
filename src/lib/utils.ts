import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format number to Rupiah string: "Rp 125.000"
export function formatRupiah(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  if (isNaN(num)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

// Format pure number with dots: "125.000"
export function formatNominal(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
}

// Parse string with dots or formatting ("1.000.000") to pure integer (1000000)
export function parseNominal(str: string | number | null | undefined): number {
  if (typeof str === 'number') return isNaN(str) ? 0 : str;
  const digits = String(str || '').replace(/[^0-9]/g, '');
  return parseInt(digits, 10) || 0;
}

// Format number with dots as user types ("1000000" -> "1.000.000")
export function formatNominalInput(value: string | number | null | undefined): string {
  const num = parseNominal(value);
  if (num === 0) return '';
  return new Intl.NumberFormat('id-ID').format(num);
}

// Mendapatkan tanggal lokal hari ini dalam format YYYY-MM-DD (menghindari pergeseran tanggal zona UTC)
export function getTodayDateString(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Konversi tanggal/timestamp ISO apa pun ke tanggal YYYY-MM-DD zona waktu WIB (Asia/Jakarta)
export function toWibDateString(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return trimmed.slice(0, 10);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  }
  if (isNaN(dateInput.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateInput);
}

// Jam lokal WIB (0-23) untuk menentukan batas pergantian hari operasional (05:00 WIB)
export function getWibHour(dateInput: Date | string = new Date()): number {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return 12;
  const h = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    hour12: false,
  }).format(d);
  const parsed = Number(h);
  if (isNaN(parsed)) return 12;
  return parsed === 24 ? 0 : parsed;
}

// Konversi timestamp ISO ke tanggal operasional WIB: transaksi jam 00:00-04:59 dinihari (sebelum batas jam 05:00) masuk ke hari operasional sebelumnya
export function toWibBusinessDateString(dateInput?: string | Date | null, cutoffHour = 5): string {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  }
  const wibDate = toWibDateString(dateInput);
  if (!wibDate) return '';
  const hour = getWibHour(dateInput);
  if (hour < cutoffHour) {
    const prevMidday = new Date(`${wibDate}T12:00:00+07:00`).getTime() - 24 * 60 * 60 * 1000;
    return toWibDateString(new Date(prevMidday));
  }
  return wibDate;
}

export interface ShiftDateRef {
  id: string;
  cabang_id: string;
  waktu_buka?: string | null;
  waktu_tutup?: string | null;
  karyawan_id?: string | null;
  created_at?: string;
}

function isSyntheticShiftRef(shift?: ShiftDateRef | null): boolean {
  if (!shift) return true;
  const wb = shift.waktu_buka || '';
  return (
    wb.endsWith('T16:00:00.000Z') ||
    wb.includes('T16:00:00+00:00') ||
    (shift.karyawan_id || '').startsWith('kar-cbg-')
  );
}

// Tanggal operasional resmi satu shift kasir: selalu berpatokan pada tanggal saat kasir BUKA shift (bukan jam tutup dinihari 01:00-02:00)
export function getShiftOperationalDate(
  shift?: Pick<ShiftDateRef, 'waktu_buka' | 'waktu_tutup' | 'created_at'> | null
): string {
  if (!shift) return '';
  const openRef = shift.waktu_buka || shift.created_at || shift.waktu_tutup;
  return toWibDateString(openRef);
}

// Atribusi tanggal operasional untuk transaksi/belanja/kasbon: ikat ke tanggal BUKA shift-nya dulu, lalu rentang shift cabang, terakhir cutoff 05:00 WIB
export function getBusinessDateForRecord(params: {
  timestamp?: string | null;
  shiftId?: string | null;
  cabangId?: string | null;
  shifts?: ShiftDateRef[];
  isBranchEqual?: (a: string, b: string) => boolean;
}): string {
  const { timestamp, shiftId, cabangId, shifts = [], isBranchEqual } = params;

  if (shiftId && shifts.length > 0) {
    const matched = shifts.find(s => s.id === shiftId && !isSyntheticShiftRef(s));
    if (matched) {
      const shiftDate = getShiftOperationalDate(matched);
      if (shiftDate) return shiftDate;
    }
  }

  if (timestamp && cabangId && shifts.length > 0) {
    const recMs = new Date(timestamp).getTime();
    if (!isNaN(recMs)) {
      const windowMatched = shifts.find(s => {
        if (isSyntheticShiftRef(s) || !s.waktu_buka) return false;
        const branchMatches = isBranchEqual ? isBranchEqual(s.cabang_id, cabangId) : s.cabang_id === cabangId;
        if (!branchMatches) return false;
        const openMs = new Date(s.waktu_buka).getTime();
        if (isNaN(openMs)) return false;
        const closeMs = s.waktu_tutup ? new Date(s.waktu_tutup).getTime() : openMs + 20 * 60 * 60 * 1000;
        return recMs >= openMs - 5 * 60 * 1000 && recMs <= closeMs + 5 * 60 * 1000;
      });
      if (windowMatched) {
        const shiftDate = getShiftOperationalDate(windowMatched);
        if (shiftDate) return shiftDate;
      }
    }
  }

  return toWibBusinessDateString(timestamp, 5);
}

export interface CustomFixedCostEntry {
  id: string;
  nama: string;
  nominal: number;
}

// Parse keterangan_biaya_lain & biaya_lain_bulanan menjadi array beban tetap tambahan (> 1 item)
export function parseCustomFixedCosts(cabang?: {
  biaya_lain_bulanan?: number;
  keterangan_biaya_lain?: string;
  biaya_lain_items?: CustomFixedCostEntry[];
} | null): CustomFixedCostEntry[] {
  if (!cabang) return [];
  if (Array.isArray(cabang.biaya_lain_items) && cabang.biaya_lain_items.length > 0) {
    return cabang.biaya_lain_items.map((it, idx) => ({
      id: it.id || `custom-${idx + 1}`,
      nama: String(it.nama || ''),
      nominal: Number(it.nominal || 0),
    }));
  }

  const totalNominal = Number(cabang.biaya_lain_bulanan || 0);
  const rawDesc = (cabang.keterangan_biaya_lain || '').trim();
  if (!rawDesc && totalNominal <= 0) return [];

  if (rawDesc.includes('|') || /\(Rp\s*[\d.,]+\)/i.test(rawDesc)) {
    const parts = rawDesc.split('|').map(p => p.trim()).filter(Boolean);
    const parsed: CustomFixedCostEntry[] = [];
    parts.forEach((part, idx) => {
      const m = part.match(/^(.*?)\s*\(Rp\s*([\d.,]+)\)\s*$/i);
      if (m) {
        parsed.push({
          id: `custom-${idx + 1}`,
          nama: m[1].trim() || `Beban Tambahan ${idx + 1}`,
          nominal: parseNominal(m[2]),
        });
      } else {
        parsed.push({
          id: `custom-${idx + 1}`,
          nama: part,
          nominal: parts.length === 1 ? totalNominal : 0,
        });
      }
    });
    if (parsed.length > 0) return parsed;
  }

  return [
    {
      id: 'custom-1',
      nama: rawDesc || 'Beban Tetap Tambahan',
      nominal: totalNominal,
    },
  ];
}

// Serialisasi array beban tambahan agar kompatibel 100% dengan kolom Supabase keterangan_biaya_lain & biaya_lain_bulanan
export function serializeCustomFixedCosts(items: CustomFixedCostEntry[]): {
  biaya_lain_bulanan: number;
  keterangan_biaya_lain: string;
  biaya_lain_items: CustomFixedCostEntry[];
} {
  const cleaned = items
    .map((it, idx) => ({
      id: it.id || `custom-${idx + 1}`,
      nama: (it.nama || '').trim(),
      nominal: Math.max(0, Number(it.nominal || 0)),
    }))
    .filter(it => it.nominal > 0 || it.nama.length > 0);

  const total = cleaned.reduce((sum, it) => sum + it.nominal, 0);
  if (cleaned.length === 0 || total <= 0) {
    return {
      biaya_lain_bulanan: 0,
      keterangan_biaya_lain: '',
      biaya_lain_items: [],
    };
  }

  const summary = cleaned
    .filter(it => it.nominal > 0 || it.nama.length > 0)
    .map(it => `${it.nama || 'Beban Tambahan'} (Rp ${formatNominal(it.nominal)})`)
    .join(' | ');

  return {
    biaya_lain_bulanan: total,
    keterangan_biaya_lain: summary,
    biaya_lain_items: cleaned,
  };
}

// Format Date & Time to Indonesian representation (e.g. "7 Nov 2026, 20:30")
export function formatWaktu(dateString?: string | null, includeSeconds: boolean = false): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
  if (includeSeconds) {
    options.second = '2-digit';
  }
  return new Intl.DateTimeFormat('id-ID', options).format(date).replace(/\./g, ':');
}

// Format waktu jam:menit saja (contoh: "20:30")
export function formatJam(dateString?: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// Format tanggal saja (contoh: "7 Nov 2026")
export function formatTanggal(dateString?: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

// Generate Invoice Number: INV/YYYYMMDD/CBGXX/XXXX
export function generateInvoiceNumber(cabangKode: string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const cleanKode = cabangKode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return `INV/${yyyy}${mm}${dd}/${cleanKode}/${randomSuffix}`;
}

// SHA-256 Hash helper for PIN verification
export async function hashPin(pin: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback for non-subtle crypto (demo pin '1234')
  if (pin === '1234') return '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';
  return pin;
}

// Generate WhatsApp link for Pengeluaran / Kasbon approval
export function generateWhatsAppApprovalLink({
  ownerPhone = '6281234567890',
  cabangNama,
  staffNama,
  jenis,
  nominal,
  keperluan,
}: {
  ownerPhone?: string;
  cabangNama: string;
  staffNama: string;
  jenis: 'belanja' | 'kasbon';
  nominal: number;
  keperluan: string;
}): string {
  const cleanPhone = ownerPhone.replace(/[^0-9]/g, '');
  const targetPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
  
  const text = `🌿 *PENGAJUAN ${jenis.toUpperCase()} - MINUMAN HERBAL PAK AGAN* 🌿\n\n` +
    `📍 *Cabang:* ${cabangNama}\n` +
    `👤 *Staff Kasir:* ${staffNama}\n` +
    `💰 *Nominal:* ${formatRupiah(nominal)}\n` +
    `📝 *Keperluan:* ${keperluan}\n` +
    `🕒 *Waktu:* ${formatWaktu(new Date().toISOString())}\n\n` +
    `Mohon approval via Web Dashboard Pak Agan POS.\n` +
    `_Terima kasih berkah selalu._`;

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
}

// Format Employee Role so standard staff is universally referred to as "Karyawan"
export function formatKaryawanRole(role?: string): string {
  if (!role) return 'Karyawan';
  const r = role.toLowerCase();
  if (r === 'owner') return 'Owner Pusat';
  return 'Karyawan';
}

// Generate WhatsApp link for Employee Digital Payroll Slip
export function generateWhatsAppPayrollSlipLink({
  telepon,
  nama,
  role,
  cabangNama,
  slipNo,
  periodeLabel,
  gajiPokok,
  tunjangan = 0,
  potonganKasbon,
  potonganTabungan = 0,
  totalTabungan = 0,
  gajiBersih,
  totalHari,
  tipeGaji,
  upahHarian,
}: {
  telepon?: string;
  nama: string;
  role: string;
  cabangNama: string;
  slipNo: string;
  periodeLabel: string;
  gajiPokok: number;
  tunjangan?: number;
  potonganKasbon: number;
  potonganTabungan?: number;
  totalTabungan?: number;
  gajiBersih: number;
  totalHari?: number;
  tipeGaji?: string;
  upahHarian?: number;
}): string {
  const cleanPhone = (telepon || '').replace(/\D/g, '');
  const targetPhone = cleanPhone.startsWith('0')
    ? '62' + cleanPhone.slice(1)
    : cleanPhone.startsWith('62')
      ? cleanPhone
      : '6281234567890';

  const tabunganSection = (totalTabungan && totalTabungan > 0)
    ? `\n*INFO SALDO SIMPANAN STAF:*\n• Saldo Simpanan Tersimpan : *${formatRupiah(totalTabungan)}*\n`
    : '';

  const text = `🥞 *SLIP GAJI DIGITAL & BUKTI TRANSFER* 🥞\n` +
    `*SERABI BAWEL & WEDANG GEPREK*\n` +
    `================================\n` +
    `📄 *No. Slip :* ${slipNo}\n` +
    `📅 *Periode  :* ${periodeLabel}\n` +
    `🏢 *Outlet   :* ${cabangNama}\n` +
    `👤 *Nama Staf:* *${nama}* (${formatKaryawanRole(role).toUpperCase()})\n` +
    `================================\n\n` +
    `*RINCIAN PENGHASILAN:*\n` +
    `• Upah Harian : ${formatRupiah(gajiPokok)} ${tipeGaji === 'harian' ? `(${totalHari || 22} Hari Hadir @ ${formatRupiah(upahHarian || 100000)})` : ''}\n` +
    `• *Total Gaji Kotor* : *${formatRupiah(gajiPokok)}*\n\n` +
    `*POTONGAN HUTANG / KASBON:*\n` +
    `• Total Kasbon Berjalan   : -${formatRupiah(potonganKasbon)}\n` +
    `• Status Pelunasan        : *LUNAS (Dipotong Otomatis Saat Pencairan)*\n` +
    tabunganSection +
    `\n================================\n` +
    `*TOTAL GAJI BERSIH DITRANSFER (TAKE HOME)*\n` +
    `👉 *${formatRupiah(gajiBersih)}*\n` +
    `================================\n\n` +
    `_Status: TELAH DITRANSFER / LUNAS RESMI_\n` +
    `_Terima kasih atas kerja keras, dedikasi, dan keramahan Anda dalam melayani pelanggan Serabi Bawel & Wedang Geprek._\n\n` +
    `Salam hormat,\n` +
    `*Pak Agan - Manajemen Pusat*`;

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
}

// Generate strong password with upper, lower, number, and special character
export function generateStrongPassword(): string {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%&*';

  let pass = '';
  pass += uppers[Math.floor(Math.random() * uppers.length)];
  pass += lowers[Math.floor(Math.random() * lowers.length)];
  pass += numbers[Math.floor(Math.random() * numbers.length)];
  pass += symbols[Math.floor(Math.random() * symbols.length)];

  const all = uppers + lowers + numbers + symbols;
  for (let i = 0; i < 4; i++) {
    pass += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle
  const shuffled = pass.split('').sort(() => 0.5 - Math.random()).join('');
  return `Serabi#${shuffled}!`;
}

// Format tanggal YYYY-MM-DD / ISO timestamp menjadi DD-MM-YYYY (urutan tanggal Indonesia)
export function formatTanggalId(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  const normalized = typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())
    ? dateInput.trim()
    : toWibDateString(dateInput);
  if (!normalized || !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return typeof dateInput === 'string' ? dateInput : '-';
  }
  const [yyyy, mm, dd] = normalized.split('-');
  return `${dd}-${mm}-${yyyy}`;
}
