'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, 
  Printer, 
  MessageCircle, 
  Building2, 
  Calendar, 
  Coins, 
  CreditCard, 
  ArrowRightLeft, 
  Receipt, 
  TrendingUp,
  ShoppingBag,
  UserCheck,
  CheckCircle2
} from 'lucide-react';
import { Cabang, Transaksi, PengeluaranKasbon, Shift, Karyawan } from '@/lib/types';
import { isBranchMatch } from '@/lib/db';
import { formatRupiah, formatWaktu, getTodayDateString } from '@/lib/utils';

interface DailyBranchReportModalProps {
  cabangList: Cabang[];
  karyawanList: Karyawan[];
  transaksiList: Transaksi[];
  expenseList: PengeluaranKasbon[];
  shifts?: Shift[];
  defaultCabangId?: string;
  defaultDate?: string;
  onClose: () => void;
}

export default function DailyBranchReportModal({
  cabangList,
  karyawanList,
  transaksiList,
  expenseList,
  shifts = [],
  defaultCabangId,
  defaultDate,
  onClose,
}: DailyBranchReportModalProps) {
  const [selectedCabangId, setSelectedCabangId] = useState<string>(
    defaultCabangId && defaultCabangId !== 'all' ? defaultCabangId : cabangList[0]?.id || 'cbg-1'
  );
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate || getTodayDateString());

  // Selected Cabang & PIC
  const targetCabang = cabangList.find(c => isBranchMatch(c.id, selectedCabangId)) || cabangList[0];
  const branchCashier = karyawanList.find(k => isBranchMatch(k.cabang_id, selectedCabangId) && k.role === 'kasir');

  // Dynamic Penanggung Jawab (PJ) Cabang based on selected cabang
  const pjNama = targetCabang?.pj_nama || branchCashier?.nama || targetCabang?.kasir_username || 'Penanggung Jawab Cabang';
  const pjTelepon = targetCabang?.pj_telepon || branchCashier?.telepon || targetCabang?.telepon || '0812-3456-7890';

  React.useEffect(() => {
    document.body.classList.add('printing-modal-open');
    return () => {
      document.body.classList.remove('printing-modal-open');
    };
  }, []);

  // Filtered Transactions for this branch & date
  const dayTransactions = useMemo(() => {
    return transaksiList.filter(t => 
      isBranchMatch(t.cabang_id, selectedCabangId) && 
      t.waktu.slice(0, 10) === selectedDate &&
      t.status === 'completed'
    );
  }, [transaksiList, selectedCabangId, selectedDate]);

  // Income Breakdown by Payment Method
  const totalTunai = dayTransactions
    .filter(t => t.metode_bayar === 'tunai')
    .reduce((sum, t) => sum + t.total, 0);

  const totalQris = dayTransactions
    .filter(t => t.metode_bayar === 'qris')
    .reduce((sum, t) => sum + t.total, 0);

  const totalTransfer = dayTransactions
    .filter(t => t.metode_bayar === 'transfer')
    .reduce((sum, t) => sum + t.total, 0);

  // Online Food Delivery Channels (ShopeeFood, GoFood, GrabFood)
  const totalShopeeFood = dayTransactions
    .filter(t => (t.metode_bayar as any) === 'shopeefood' || (t.metode_bayar as any) === 'shopeepay')
    .reduce((sum, t) => sum + t.total, 0);

  const totalGoFood = dayTransactions
    .filter(t => (t.metode_bayar as any) === 'gofood' || (t.metode_bayar as any) === 'gopay')
    .reduce((sum, t) => sum + t.total, 0);

  const totalGrabFood = dayTransactions
    .filter(t => (t.metode_bayar as any) === 'grabfood' || (t.metode_bayar as any) === 'ovo')
    .reduce((sum, t) => sum + t.total, 0);

  const totalOnlineMerchant = totalShopeeFood + totalGoFood + totalGrabFood;

  const totalOmzetKotor = totalTunai + totalQris + totalTransfer + totalOnlineMerchant;

  // Filtered Expenses for this branch & date
  const dayExpenses = useMemo(() => {
    return expenseList.filter(e => 
      isBranchMatch(e.cabang_id, selectedCabangId) && 
      (e.tanggal || '').slice(0, 10) === selectedDate &&
      e.status === 'approved'
    );
  }, [expenseList, selectedCabangId, selectedDate]);

  // Expense Breakdown
  const belanjaLaci = dayExpenses
    .filter(e => e.jenis === 'belanja' && (e.metode_pencairan === 'laci' || !e.metode_pencairan))
    .reduce((sum, e) => sum + e.nominal, 0);

  const belanjaTransfer = dayExpenses
    .filter(e => e.jenis === 'belanja' && e.metode_pencairan === 'transfer')
    .reduce((sum, e) => sum + e.nominal, 0);

  const kasbonLaci = dayExpenses
    .filter(e => e.jenis === 'kasbon' && (e.metode_pencairan === 'laci' || !e.metode_pencairan))
    .reduce((sum, e) => sum + e.nominal, 0);

  const kasbonTransfer = dayExpenses
    .filter(e => e.jenis === 'kasbon' && e.metode_pencairan === 'transfer')
    .reduce((sum, e) => sum + e.nominal, 0);

  const totalPengeluaranLaci = belanjaLaci + kasbonLaci;
  const totalPengeluaranBank = belanjaTransfer + kasbonTransfer;
  const grandTotalPengeluaran = totalPengeluaranLaci + totalPengeluaranBank;

  // Modal Awal Laci
  const modalAwal = 200000;

  // RECONCILIATION TOTALS (THE 3 GOLDEN PILLARS)
  // 1. Physical Cash in Drawer (Uang Tunai Kasir)
  const saldoFisikKasirWajib = modalAwal + totalTunai - totalPengeluaranLaci;

  // 2. Bank / Digital Transfer (Uang Masuk ke Rekening Owner)
  const totalDanaBankMasuk = totalQris + totalTransfer - totalPengeluaranBank;

  // 3. Online Delivery Channels (ShopeeFood, GoFood, GrabFood)
  const totalDanaMerchantOnline = totalOnlineMerchant;

  // 4. Net Daily Profit / Sisa Kas Operasional
  const sisaKasBersihHariIni = totalOmzetKotor - grandTotalPengeluaran;

  // Generate WhatsApp Message directly to Branch PJ (Penanggung Jawab Outlet)
  const generateWhatsAppUrl = () => {
    const rawPhone = pjTelepon || '081234567890';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '').replace(/^0/, '62');
    const dateFormatted = new Date(selectedDate).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const msg = [
      `*LAPORAN REKONSILIASI HARIAN - SERABI BAWEL & WEDANG GEPREK*`,
      `-----------------------------------------`,
      `🏢 *Outlet:* ${targetCabang?.nama}`,
      `📅 *Hari/Tanggal:* ${dateFormatted}`,
      `👤 *Penanggung Jawab (Kasir):* ${pjNama} (${pjTelepon})`,
      `-----------------------------------------`,
      `💵 *1. UANG FISIK DI LACI KASIR (WAJIB ADA / DISETOR):*`,
      `   • Modal Awal Laci: ${formatRupiah(modalAwal)}`,
      `   • (+) Penjualan Tunai: +${formatRupiah(totalTunai)}`,
      `   • (-) Belanja Kasir: -${formatRupiah(belanjaLaci)}`,
      `   • (-) Kasbon Staf Laci: -${formatRupiah(kasbonLaci)}`,
      `   👉 *TOTAL FISIK KASIR WAJIB: ${formatRupiah(saldoFisikKasirWajib)}*`,
      ``,
      `🏦 *2. DANA MASUK KE REKENING BANK OWNER (QRIS & TF):*`,
      `   • (+) QRIS Merchant: +${formatRupiah(totalQris)}`,
      `   • (+) Transfer Bank: +${formatRupiah(totalTransfer)}`,
      `   • (-) Belanja via Transfer: -${formatRupiah(belanjaTransfer)}`,
      `   👉 *TOTAL REKENING BANK: ${formatRupiah(totalDanaBankMasuk)}*`,
      ``,
      `🛵 *3. SALDO MERCHANT ONLINE (SHOPEEFOOD, GOFOOD, GRABFOOD):*`,
      `   • (+) ShopeeFood / ShopeePay: +${formatRupiah(totalShopeeFood)}`,
      `   • (+) GoFood (GoBiz Resto): +${formatRupiah(totalGoFood)}`,
      `   • (+) GrabFood (GrabMerchant): +${formatRupiah(totalGrabFood)}`,
      `   👉 *TOTAL MERCHANT ONLINE: ${formatRupiah(totalDanaMerchantOnline)}*`,
      `-----------------------------------------`,
      `📊 *RINGKASAN OMZET & PENGELUARAN:*`,
      `   • Total Omzet Penjualan: *${formatRupiah(totalOmzetKotor)}* (${dayTransactions.length} Struk)`,
      `     (Tunai: ${formatRupiah(totalTunai)} | Bank: ${formatRupiah(totalQris + totalTransfer)} | Ojol: ${formatRupiah(totalDanaMerchantOnline)})`,
      `   • Total Belanja Toko & Kasbon: *${formatRupiah(grandTotalPengeluaran)}*`,
      `   • Laba Operasional Bersih: *${formatRupiah(sisaKasBersihHariIni)}*`,
      `-----------------------------------------`,
      `_Laporan penutupan harian otomatis Backoffice POS Pak Agan._`
    ].join('\n');

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn printable-modal-backdrop print:static print:p-0 print:bg-white print:overflow-visible print:block print:inset-auto print:h-auto print:max-h-none">
      
      {/* Print Styles for A4 Portrait Document (Formal High-Contrast Black Ink) */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              font-size: 8.5pt !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              overflow: visible !important;
              height: auto !important;
            }
            .print\\:hidden, header, nav, button, footer {
              display: none !important;
            }
            .printable-modal-backdrop {
              position: static !important;
              display: block !important;
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
              overflow: visible !important;
              height: auto !important;
              max-height: none !important;
            }
            #printable-daily-report-wrapper {
              position: static !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              max-width: 100% !important;
              width: 100% !important;
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              padding: 0 !important;
              margin: 0 !important;
              display: block !important;
              visibility: visible !important;
              background: #ffffff !important;
            }
            #printable-daily-report-wrapper * {
              visibility: visible !important;
              color: #000000 !important;
              -webkit-text-fill-color: #000000 !important;
              text-shadow: none !important;
              box-shadow: none !important;
            }
            #printable-daily-report {
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              display: block !important;
              background: #ffffff !important;
            }

            /* Monochrome Black Ink Cards & Outlines */
            #printable-daily-report .bg-emerald-50\\/70,
            #printable-daily-report .bg-blue-50\\/70,
            #printable-daily-report .bg-amber-50\\/70,
            #printable-daily-report .bg-slate-50,
            #printable-daily-report .bg-emerald-50,
            #printable-daily-report .bg-blue-50,
            #printable-daily-report .bg-amber-50,
            #printable-daily-report .bg-rose-100,
            #printable-daily-report .bg-emerald-600 {
              background-color: #ffffff !important;
              background-image: none !important;
            }

            #printable-daily-report .border-emerald-300,
            #printable-daily-report .border-blue-300,
            #printable-daily-report .border-amber-300,
            #printable-daily-report .border-emerald-200,
            #printable-daily-report .border-blue-200,
            #printable-daily-report .border-amber-200,
            #printable-daily-report .border-slate-200,
            #printable-daily-report .border-slate-100 {
              border-color: #000000 !important;
            }

            /* Ensure 3-pillar layout prints side-by-side cleanly on A4 */
            #printable-daily-report .report-pillars-grid {
              display: grid !important;
              grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
              gap: 8px !important;
            }

            /* Expand tables to show all rows in print mode */
            #printable-daily-report .max-h-56,
            #printable-daily-report .overflow-y-auto {
              max-height: none !important;
              overflow: visible !important;
            }

            /* Badges & Stamps */
            #printable-daily-report span.rounded-full,
            #printable-daily-report span.rounded-lg,
            #printable-daily-report span.rounded {
              background-color: #ffffff !important;
              border: 1px solid #000000 !important;
              color: #000000 !important;
              font-weight: 800 !important;
            }

            /* Icon badges */
            #printable-daily-report .w-12.h-12,
            #printable-daily-report .w-10.h-10 {
              background: #ffffff !important;
              border: 1.5px solid #000000 !important;
            }
            #printable-daily-report svg {
              stroke: #000000 !important;
              color: #000000 !important;
            }

            /* Tables with sharp black ink lines */
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              border: 1.5px solid #000000 !important;
            }
            th, td {
              border: 1px solid #000000 !important;
              padding: 4px 6px !important;
              color: #000000 !important;
            }
            th {
              background-color: #f1f5f9 !important;
              font-weight: 800 !important;
              -webkit-print-color-adjust: exact !important;
              border-bottom: 2px solid #000000 !important;
              text-transform: uppercase !important;
              font-size: 8pt !important;
            }
            td span.font-mono, td span.tabular-nums {
              color: #000000 !important;
              font-weight: 700 !important;
            }
          }
        `
      }} />

      <div 
        id="printable-daily-report-wrapper"
        className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:h-auto print:overflow-visible print:border-none print:shadow-none print:rounded-none"
      >
        
        {/* Top Control Bar (Hidden on Print) */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center space-x-2">
            <span className="text-xl">📊</span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Laporan Rekonsiliasi Kas, Bank &amp; Merchant Cabang Harian
              </h3>
              <p className="text-[11px] text-slate-500">
                Pemisahan uang tunai fisik kasir vs rekening bank QRIS vs saldo merchant online (ShopeeFood, GoFood &amp; GrabFood)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Cabang Selector */}
            <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
              <Building2 className="w-3.5 h-3.5 text-brand-primary" />
              <select
                value={selectedCabangId}
                onChange={(e) => setSelectedCabangId(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer max-w-[170px] truncate"
              >
                {cabangList.map(c => (
                  <option key={c.id} value={c.id}>{c.nama}</option>
                ))}
              </select>
            </div>

            {/* Date Selector */}
            <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
              <Calendar className="w-3.5 h-3.5 text-brand-primary" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent font-mono text-xs font-bold text-slate-800 outline-none cursor-pointer"
              />
            </div>

            {/* WA Button to Branch PJ */}
            <a
              href={generateWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm flex items-center space-x-1.5 transition-all btn-tactile"
              title={`Kirim Ringkasan Laporan ke WhatsApp PJ Toko (${pjNama} - ${pjTelepon})`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Kirim WA PJ Toko</span>
            </a>

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs shadow-sm flex items-center space-x-1 transition-all btn-tactile"
              title="Cetak Laporan ke PDF / Printer A4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak PDF</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Report Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs bg-white flex-1 print:overflow-visible print:h-auto print:p-0 print:max-h-none" id="printable-daily-report">
          
          {/* 1. KOP RESMI LAPORAN */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white flex items-center justify-center shadow-md border border-emerald-400/40">
                <div className="flex items-center -space-x-1 text-xl">
                  <span>🥞</span>
                  <span>🍵</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-800">
                  SISTEM POS FINTECH RESMI • PAK AGAN
                </span>
                <h1 className="text-lg font-black text-slate-950 tracking-tight">
                  SERABI BAWEL &amp; WEDANG GEPREK
                </h1>
                <p className="text-[11px] text-slate-600 font-medium">
                  Laporan Rekonsiliasi Kas Laci, Rekening Bank &amp; Saldo Merchant Online (ShopeeFood, GoFood, GrabFood)
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right font-medium text-slate-600 text-[11px] space-y-0.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
              <div><strong className="text-slate-900">Cabang:</strong> {targetCabang?.nama}</div>
              <div><strong className="text-slate-900">Tanggal:</strong> {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <div><strong className="text-slate-900">Penanggung Jawab:</strong> {pjNama} ({pjTelepon})</div>
            </div>
          </div>

          {/* 2. TIGA PILAR UTAMA REKONSILIASI (CASH VS BANK VS MERCHANT OJOL) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 report-pillars-grid">
            
            {/* KARTU 1: UANG TUNAI FISIK LACI KASIR */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border-2 border-emerald-300 text-slate-800 space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2 mb-2.5">
                  <div className="flex items-center space-x-1.5 font-black text-xs text-emerald-900 uppercase">
                    <Coins className="w-4 h-4 text-emerald-700" />
                    <span>1. Uang Tunai Fisik di Kasir</span>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                    Wajib Disetor Tunai
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Modal Awal Kas Laci:</span>
                    <span className="font-mono font-semibold">{formatRupiah(modalAwal)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800 font-semibold">
                    <span>(+) Penjualan Tunai Masuk:</span>
                    <span className="font-mono font-bold">+{formatRupiah(totalTunai)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>(-) Belanja Toko dari Kasir:</span>
                    <span className="font-mono font-semibold">-{formatRupiah(belanjaLaci)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>(-) Kasbon Staf dari Kasir:</span>
                    <span className="font-mono font-semibold">-{formatRupiah(kasbonLaci)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-300 flex items-center justify-between mt-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">Total Uang Fisik Kasir:</span>
                  <span className="text-lg font-mono font-black text-emerald-950">
                    {formatRupiah(saldoFisikKasirWajib)}
                  </span>
                </div>
                <span className="text-[9px] font-extrabold text-emerald-800 bg-white px-2 py-1 rounded-lg border border-emerald-200">
                  ✓ Cocok Fisik
                </span>
              </div>
            </div>

            {/* KARTU 2: DANA MASUK KE REKENING BANK OWNER */}
            <div className="p-4 rounded-2xl bg-blue-50/70 border-2 border-blue-300 text-slate-800 space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-blue-200 pb-2 mb-2.5">
                  <div className="flex items-center space-x-1.5 font-black text-xs text-blue-900 uppercase">
                    <CreditCard className="w-4 h-4 text-blue-700" />
                    <span>2. Rekening Bank / QRIS</span>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-200 text-blue-900">
                    Cek Mutasi Rekening
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-blue-800 font-semibold">
                    <span>(+) Pemasukan QRIS Merchant:</span>
                    <span className="font-mono font-bold">+{formatRupiah(totalQris)}</span>
                  </div>
                  <div className="flex justify-between text-blue-800 font-semibold">
                    <span>(+) Pemasukan Transfer Bank:</span>
                    <span className="font-mono font-bold">+{formatRupiah(totalTransfer)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>(-) Belanja Ditalangi Transfer:</span>
                    <span className="font-mono">-{formatRupiah(belanjaTransfer)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>(-) Kasbon via Transfer:</span>
                    <span className="font-mono">-{formatRupiah(kasbonTransfer)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-blue-300 flex items-center justify-between mt-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-800 block">Total Masuk ke Bank:</span>
                  <span className="text-lg font-mono font-black text-blue-950">
                    {formatRupiah(totalDanaBankMasuk)}
                  </span>
                </div>
                <span className="text-[9px] font-extrabold text-blue-800 bg-white px-2 py-1 rounded-lg border border-blue-200">
                  ✓ Bank Valid
                </span>
              </div>
            </div>

            {/* KARTU 3: SALDO MERCHANT ONLINE (SHOPEEFOOD, GOFOOD, GRABFOOD) */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-300 text-slate-800 space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-amber-200 pb-2 mb-2.5">
                  <div className="flex items-center space-x-1.5 font-black text-xs text-amber-950 uppercase">
                    <span className="text-sm">🛵</span>
                    <span>3. Merchant Online (Ojol)</span>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                    Shopee • Go • Grab
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-amber-950 font-semibold items-center">
                    <span className="flex items-center space-x-1">
                      <span>🟠</span>
                      <span>ShopeeFood / ShopeePay:</span>
                    </span>
                    <span className="font-mono font-bold">+{formatRupiah(totalShopeeFood)}</span>
                  </div>
                  <div className="flex justify-between text-rose-950 font-semibold items-center">
                    <span className="flex items-center space-x-1">
                      <span>🛵</span>
                      <span>GoFood (GoBiz Resto):</span>
                    </span>
                    <span className="font-mono font-bold">+{formatRupiah(totalGoFood)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-950 font-semibold items-center">
                    <span className="flex items-center space-x-1">
                      <span>🟢</span>
                      <span>GrabFood (GrabMerchant):</span>
                    </span>
                    <span className="font-mono font-bold">+{formatRupiah(totalGrabFood)}</span>
                  </div>
                  <div className="text-[10px] text-amber-800/80 pt-1 italic flex items-center justify-between">
                    <span>Pencairan Merchant:</span>
                    <span className="font-medium text-[9px] bg-amber-100/80 px-1.5 py-0.5 rounded">Otomatis Cair H+1</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-300 flex items-center justify-between mt-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">Total Saldo Merchant:</span>
                  <span className="text-lg font-mono font-black text-amber-950">
                    {formatRupiah(totalDanaMerchantOnline)}
                  </span>
                </div>
                <span className="text-[9px] font-extrabold text-amber-900 bg-white px-2 py-1 rounded-lg border border-amber-200">
                  ✓ Saldo Ojol
                </span>
              </div>
            </div>

          </div>

          {/* 3. RINGKASAN OMZET & LABA KOTOR OPERASIONAL */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5 text-accent-gold" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Omzet Penjualan</span>
                <span className="text-lg font-mono font-black text-slate-900">
                  {formatRupiah(totalOmzetKotor)}
                </span>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  {dayTransactions.length} Struk • Tunai {formatRupiah(totalTunai)} | Bank {formatRupiah(totalQris + totalTransfer)} | Ojol {formatRupiah(totalDanaMerchantOnline)}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3 sm:border-l sm:pl-4 border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Belanja &amp; Kasbon</span>
                <span className="text-lg font-mono font-black text-rose-600">
                  -{formatRupiah(grandTotalPengeluaran)}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {dayExpenses.length} Pengeluaran Disetujui
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3 sm:border-l sm:pl-4 border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Laba Bersih Kasir Hari Ini</span>
                <span className="text-lg font-mono font-black text-brand-dark">
                  {formatRupiah(sisaKasBersihHariIni)}
                </span>
                <span className="text-[10px] text-emerald-700 block font-bold">
                  Omzet dikurangi Belanja &amp; Bon
                </span>
              </div>
            </div>
          </div>

          {/* 4. TABEL PENGELUARAN BELANJA & KASBON HARI INI */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-xs flex items-center justify-between">
              <span>Rincian Pengeluaran Toko &amp; Kasbon Cabang ({dayExpenses.length})</span>
              <span className="text-slate-500 font-normal text-[11px]">Metode Pencairan: Laci / Transfer</span>
            </h4>

            {dayExpenses.length === 0 ? (
              <div className="p-3 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nihil (Tidak ada pengeluaran belanja kasir maupun kasbon pada tanggal ini).
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Jam</th>
                      <th className="py-2 px-3">Jenis</th>
                      <th className="py-2 px-3">Pemohon</th>
                      <th className="py-2 px-3">Keperluan / Keterangan</th>
                      <th className="py-2 px-3">Sumber Dana</th>
                      <th className="py-2 px-3 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dayExpenses.map(exp => (
                      <tr key={exp.id}>
                        <td className="py-1.5 px-3 font-mono text-slate-500">
                          {formatWaktu(exp.tanggal).split(' ')[1] || '-'}
                        </td>
                        <td className="py-1.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            exp.jenis === 'belanja' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {exp.jenis}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 font-bold text-slate-800">{exp.pemohon_nama}</td>
                        <td className="py-1.5 px-3 text-slate-700">{exp.keperluan}</td>
                        <td className="py-1.5 px-3">
                          <span className="font-medium text-slate-600">
                            {exp.metode_pencairan === 'laci' ? '💵 Kas Laci Kasir' : '🏦 Transfer Bank'}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-600 tabular-nums">
                          -{formatRupiah(exp.nominal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 5. TABEL DAFTAR STRUK TRANSAKSI HARI INI */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-xs flex items-center justify-between">
              <span>Daftar Struk Transaksi Penjualan Hari Ini ({dayTransactions.length} Struk)</span>
              <span className="text-slate-500 font-normal text-[11px]">Real-Time Dari Tablet POS</span>
            </h4>

            {dayTransactions.length === 0 ? (
              <div className="p-3 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Belum ada transaksi pada tanggal ini.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-56 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">No. Invoice</th>
                      <th className="py-2 px-3">Jam</th>
                      <th className="py-2 px-3">Pelanggan</th>
                      <th className="py-2 px-3">Rincian Menu</th>
                      <th className="py-2 px-3">Metode</th>
                      <th className="py-2 px-3 text-right">Total Transaksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dayTransactions.map(t => (
                      <tr key={t.id}>
                        <td className="py-1.5 px-3 font-mono font-bold text-brand-primary">{t.invoice_no}</td>
                        <td className="py-1.5 px-3 font-mono text-slate-500">
                          {formatWaktu(t.waktu).split(' ')[1] || '-'}
                        </td>
                        <td className="py-1.5 px-3 font-medium text-slate-800">{t.nama_pelanggan}</td>
                        <td className="py-1.5 px-3 text-slate-600 max-w-xs truncate">
                          {t.items?.map(it => `${it.nama_menu} (${it.qty})`).join(', ') || 'Menu Serabi & Wedang'}
                        </td>
                        <td className="py-1.5 px-3 font-bold uppercase text-[10px]">
                          <span className={`px-2 py-0.5 rounded-full inline-flex items-center gap-1 border font-bold ${
                            t.metode_bayar === 'tunai' 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                              : t.metode_bayar === 'qris'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : t.metode_bayar === 'transfer'
                              ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                              : (t.metode_bayar as any) === 'shopeefood' || (t.metode_bayar as any) === 'shopeepay'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : (t.metode_bayar as any) === 'gofood' || (t.metode_bayar as any) === 'gopay'
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : (t.metode_bayar as any) === 'grabfood' || (t.metode_bayar as any) === 'ovo'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-slate-100 text-slate-800 border-slate-300'
                          }`}>
                            {t.metode_bayar === 'shopeefood' && '🟠 ShopeeFood'}
                            {t.metode_bayar === 'gofood' && '🛵 GoFood'}
                            {t.metode_bayar === 'grabfood' && '🟢 GrabFood'}
                            {t.metode_bayar === 'tunai' && '💵 Tunai'}
                            {t.metode_bayar === 'qris' && '📱 QRIS'}
                            {t.metode_bayar === 'transfer' && '🏦 Transfer'}
                            {!['shopeefood', 'gofood', 'grabfood', 'tunai', 'qris', 'transfer'].includes(t.metode_bayar) && t.metode_bayar}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {formatRupiah(t.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 6. LEMBAR PENGESAHAN & TANDA TANGAN SERAH TERIMA */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-12">
              <span className="font-bold text-slate-600 block">
                Diserahkan Oleh (Penanggung Jawab Outlet):
              </span>
              <div>
                <span className="font-black text-slate-900 underline block text-sm">
                  {pjNama}
                </span>
                <span className="text-[10px] text-slate-500 font-medium block">
                  {targetCabang?.nama || 'Kasir Cabang Bertugas'}
                </span>
                <span className="text-[9px] text-slate-400 font-mono block">
                  Kontak/WA: {pjTelepon}
                </span>
              </div>
            </div>

            <div className="space-y-12">
              <span className="font-bold text-slate-600 block">
                Diperiksa &amp; Diterima Oleh (Master Owner):
              </span>
              <div>
                <span className="font-black text-slate-900 underline block text-sm">
                  Pak Agan
                </span>
                <span className="text-[10px] text-slate-500 font-medium block">Owner Pusat &amp; Pemilik Brand</span>
                <span className="text-[9px] text-slate-400 font-mono block">Kantor Pusat Malioboro</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
