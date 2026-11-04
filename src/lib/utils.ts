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

// Format Date & Time to Indonesian representation
export function formatWaktu(dateString?: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

  const text = `🥞 *SLIP GAJI DIGITAL & BUKTI TRANSFER* 🥞\n` +
    `*SERABI BAWEL & WEDANG GEPREK*\n` +
    `================================\n` +
    `📄 *No. Slip :* ${slipNo}\n` +
    `📅 *Periode  :* ${periodeLabel}\n` +
    `🏢 *Outlet   :* ${cabangNama}\n` +
    `👤 *Nama Staf:* *${nama}* (${(role || 'kasir').toUpperCase()})\n` +
    `================================\n\n` +
    `*RINCIAN PENGHASILAN:*\n` +
    `• Gaji Harian : ${formatRupiah(gajiPokok)} ${tipeGaji === 'harian' ? `(${totalHari || 22} Hari Hadir @ ${formatRupiah(upahHarian || 120000)})` : ''}\n` +
    `• *Total Gaji Kotor* : *${formatRupiah(gajiPokok)}*\n\n` +
    `*POTONGAN HUTANG / KASBON:*\n` +
    `• Total Kasbon Berjalan   : -${formatRupiah(potonganKasbon)}\n` +
    `• Status Pelunasan        : *LUNAS (Dipotong Otomatis Saat Pencairan)*\n\n` +
    `================================\n` +
    `*TOTAL GAJI BERSIH (TAKE HOME PAY)*\n` +
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
