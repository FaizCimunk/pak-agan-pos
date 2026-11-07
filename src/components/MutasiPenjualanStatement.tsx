'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Receipt, 
  Calendar, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Eye, 
  Download, 
  Clock, 
  CreditCard, 
  Wallet, 
  Store, 
  RotateCcw, 
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { Transaksi, Cabang } from '@/lib/types';
import { isBranchMatch } from '@/lib/db';
import { formatRupiah, formatWaktu, getTodayDateString } from '@/lib/utils';
import ReceiptModal from './ReceiptModal';

interface MutasiPenjualanStatementProps {
  transaksiList: Transaksi[];
  cabangList: Cabang[];
  selectedCabangId?: string;
}

type PeriodMode = 'hari' | 'bulan' | 'tahun' | 'semua';

export default function MutasiPenjualanStatement({
  transaksiList,
  cabangList,
  selectedCabangId: propSelectedCabangId = 'all',
}: MutasiPenjualanStatementProps) {
  // Period & Date Filter States
  const [periodMode, setPeriodMode] = useState<PeriodMode>('hari');

  // Selalu default ke tanggal kalender HARI INI secara dinamis (misal 7 Nov 2026)
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateString());
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);

  // Sub-filters
  const [branchFilter, setBranchFilter] = useState<string>(propSelectedCabangId);
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination / Slide States ("biar tidak kebawah terus yah slide lah")
  const [pageSize, setPageSize] = useState<number>(10); // 10 data per slide/halaman
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Receipt Modal State
  const [receiptTrx, setReceiptTrx] = useState<Transaksi | null>(null);

  // Sync propSelectedCabangId if parent changes
  useEffect(() => {
    if (propSelectedCabangId) {
      setBranchFilter(propSelectedCabangId);
      setCurrentPage(1);
    }
  }, [propSelectedCabangId]);

  // Reset page when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [periodMode, selectedDate, selectedYear, selectedMonth, branchFilter, paymentFilter, searchQuery, pageSize]);

  // Format Helper for Transaction Date
  const parseTrxDateParts = (waktuStr: string) => {
    try {
      const d = new Date(waktuStr);
      if (isNaN(d.getTime())) {
        const clean = waktuStr ? waktuStr.slice(0, 10) : getTodayDateString();
        return {
          dateStr: clean,
          year: parseInt(clean.slice(0, 4)) || new Date().getFullYear(),
          month: parseInt(clean.slice(5, 7)) || (new Date().getMonth() + 1),
          day: parseInt(clean.slice(8, 10)) || new Date().getDate(),
        };
      }
      return {
        dateStr: getTodayDateString(d),
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
      };
    } catch {
      return {
        dateStr: waktuStr ? waktuStr.slice(0, 10) : getTodayDateString(),
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        day: new Date().getDate(),
      };
    }
  };

  // Filtered Transactions
  const filteredData = useMemo(() => {
    return transaksiList.filter((trx) => {
      // 1. Branch Filter
      if (branchFilter !== 'all' && !isBranchMatch(trx.cabang_id, branchFilter)) {
        return false;
      }

      // 2. Payment Method Filter
      if (paymentFilter !== 'all') {
        const normPay = (trx.metode_bayar || '').toLowerCase();
        if (paymentFilter === 'ojol') {
          if (!normPay.includes('gofood') && !normPay.includes('grab') && !normPay.includes('shopee')) {
            return false;
          }
        } else if (normPay !== paymentFilter) {
          return false;
        }
      }

      // 3. Period Filter (Hari, Bulan, Tahun, Semua)
      const parts = parseTrxDateParts(trx.waktu);
      if (periodMode === 'hari') {
        if (parts.dateStr !== selectedDate) return false;
      } else if (periodMode === 'bulan') {
        if (parts.year !== selectedYear || parts.month !== selectedMonth) return false;
      } else if (periodMode === 'tahun') {
        if (parts.year !== selectedYear) return false;
      }

      // 4. Search Filter (Invoice, Pelanggan, Kasir, Item Pesanan)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const invMatch = trx.invoice_no?.toLowerCase().includes(q);
        const custMatch = trx.nama_pelanggan?.toLowerCase().includes(q);
        const cashierMatch = trx.karyawan_nama?.toLowerCase().includes(q);
        const cabangMatch = trx.cabang_nama?.toLowerCase().includes(q);
        const itemMatch = trx.items?.some(it => it.nama_menu?.toLowerCase().includes(q));
        if (!invMatch && !custMatch && !cashierMatch && !cabangMatch && !itemMatch) {
          return false;
        }
      }

      return true;
    });
  }, [transaksiList, branchFilter, paymentFilter, periodMode, selectedDate, selectedYear, selectedMonth, searchQuery]);

  // Aggregate Metrics for Current Filter
  const metrics = useMemo(() => {
    let totalOmzet = 0;
    let countSuccess = 0;
    let totalTunai = 0;
    let totalQris = 0;
    let totalOjolTransfer = 0;

    for (const trx of filteredData) {
      if (trx.status === 'completed') {
        totalOmzet += trx.total;
        countSuccess++;
        const pay = (trx.metode_bayar || '').toLowerCase();
        if (pay === 'tunai') totalTunai += trx.total;
        else if (pay === 'qris') totalQris += trx.total;
        else totalOjolTransfer += trx.total;
      }
    }

    const aov = countSuccess > 0 ? Math.round(totalOmzet / countSuccess) : 0;

    return {
      totalOmzet,
      countSuccess,
      aov,
      totalTunai,
      totalQris,
      totalOjolTransfer,
    };
  }, [filteredData]);

  // Pagination / Slide Calculation
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredData.length);
  const paginatedTransactions = filteredData.slice(startIndex, endIndex);

  // Quick Date Controls
  const stepDate = (days: number) => {
    try {
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + days);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setSelectedDate(`${yyyy}-${mm}-${dd}`);
      }
    } catch {
      // ignore
    }
  };

  const stepMonth = (offset: number) => {
    let newM = selectedMonth + offset;
    let newY = selectedYear;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    } else if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    setSelectedMonth(newM);
    setSelectedYear(newY);
  };

  const stepYear = (offset: number) => {
    setSelectedYear(prev => prev + offset);
  };

  // Month names in Indonesian
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      alert('Tidak ada transaksi yang dapat diexport.');
      return;
    }

    const headers = ['No Invoice', 'Waktu', 'Cabang', 'Kasir', 'Pelanggan', 'Item Pesanan', 'Metode Bayar', 'Total Tagihan (Rp)', 'Status'];
    const rows = filteredData.map(t => [
      `"${t.invoice_no}"`,
      `"${formatWaktu(t.waktu)}"`,
      `"${t.cabang_nama || 'Cabang'}"`,
      `"${t.karyawan_nama || 'Kasir'}"`,
      `"${t.nama_pelanggan || '-'}"`,
      `"${t.items?.map(it => `${it.qty}x ${it.nama_menu}`).join('; ') || '-'}"`,
      `"${t.metode_bayar.toUpperCase()}"`,
      t.total,
      `"${t.status.toUpperCase()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Mutasi_Penjualan_${periodMode}_${selectedDate || selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get Branch Object for Receipt Modal
  const activeBranchForReceipt = useMemo(() => {
    if (!receiptTrx) return null;
    return cabangList.find(c => isBranchMatch(c.id, receiptTrx.cabang_id)) || cabangList[0];
  }, [receiptTrx, cabangList]);

  return (
    <div className="bg-white rounded-3xl border-t-[4px] border-emerald-600 border-x border-b border-slate-200/90 shadow-soft-sm overflow-hidden">
      
      {/* 1. HEADER UTAMA & NAVIGASI PERIODE (HARI, BULAN, TAHUN, SEMUA) */}
      <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Title & Badge */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white flex items-center justify-center shadow-md shrink-0">
              <Receipt className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                  Bank-Grade Audit Trail
                </span>
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">• Live Statement</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5">
                Buku Mutasi Penjualan Outlet
              </h3>
            </div>
          </div>

          {/* Tab Mode Periode: Hari | Bulan | Tahun | Semua */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setPeriodMode('hari')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                periodMode === 'hari'
                  ? 'bg-white text-emerald-900 shadow-sm border border-emerald-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Hari (Tanggal)</span>
            </button>

            <button
              type="button"
              onClick={() => setPeriodMode('bulan')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                periodMode === 'bulan'
                  ? 'bg-white text-emerald-900 shadow-sm border border-emerald-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-600" />
              <span>Bulan</span>
            </button>

            <button
              type="button"
              onClick={() => setPeriodMode('tahun')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                periodMode === 'tahun'
                  ? 'bg-white text-emerald-900 shadow-sm border border-emerald-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>Tahun</span>
            </button>

            <button
              type="button"
              onClick={() => setPeriodMode('semua')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                periodMode === 'semua'
                  ? 'bg-white text-emerald-900 shadow-sm border border-emerald-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span>Semua Riwayat</span>
            </button>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              title="Unduh Data CSV (Excel)"
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all ml-1 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>

        {/* 2. SUB-BAR: KONTROL TANGGAL / BULAN / TAHUN AKTIF */}
        <div className="mt-4 pt-3.5 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3">
          
          {/* Period-Specific Controls */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Mode Hari */}
            {periodMode === 'hari' && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => stepDate(-1)}
                  title="Kemarin"
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center space-x-2 px-2">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-xs font-extrabold text-slate-800 bg-transparent outline-none cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => stepDate(1)}
                  title="Besok"
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const todayStr = getTodayDateString();
                    setSelectedDate(todayStr);
                    try {
                      const d = new Date();
                      setSelectedYear(d.getFullYear());
                      setSelectedMonth(d.getMonth() + 1);
                    } catch {}
                  }}
                  className="text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ml-1"
                >
                  Hari Ini
                </button>
              </div>
            )}

            {/* Mode Bulan */}
            {periodMode === 'bulan' && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => stepMonth(-1)}
                  title="Bulan Lalu"
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Dropdown Bulan */}
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="text-xs font-extrabold text-slate-800 bg-transparent px-2 py-1 outline-none cursor-pointer"
                >
                  {monthNames.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>

                {/* Dropdown Tahun */}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-xs font-extrabold text-slate-800 bg-transparent px-2 py-1 outline-none cursor-pointer border-l border-slate-200"
                >
                  {[2024, 2025, 2026, 2027, 2028].map(yr => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => stepMonth(1)}
                  title="Bulan Depan"
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setSelectedMonth(now.getMonth() + 1);
                    setSelectedYear(now.getFullYear());
                  }}
                  className="text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg transition-colors cursor-pointer ml-1"
                >
                  Bulan Ini
                </button>
              </div>
            )}

            {/* Mode Tahun */}
            {periodMode === 'tahun' && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => stepYear(-1)}
                  title="Tahun Lalu"
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-xs font-extrabold text-slate-800 bg-transparent px-3 py-1 outline-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027, 2028].map(yr => (
                    <option key={yr} value={yr}>
                      Tahun Buku {yr}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => stepYear(1)}
                  title="Tahun Depan"
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mode Semua */}
            {periodMode === 'semua' && (
              <div className="flex items-center space-x-2 text-xs font-extrabold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Seluruh Catatan Mutasi Sejak Awal Berdiri</span>
              </div>
            )}
          </div>

          {/* Filter Cabang & Metode Bayar */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Filter Cabang */}
            <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-sm">
              <Store className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
              >
                <option value="all">Semua Cabang (10 Toko)</option>
                {cabangList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.kode} - {c.nama.split('-')[1]?.trim() || c.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Metode Bayar */}
            <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-sm">
              <Wallet className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
              >
                <option value="all">Semua Metode Bayar</option>
                <option value="tunai">Tunai POS (Cash Laci)</option>
                <option value="qris">QRIS Dinamis</option>
                <option value="transfer">Transfer Bank</option>
                <option value="ojol">Ojol (GoFood/Grab/Shopee)</option>
              </select>
            </div>

            {/* Realtime Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari invoice/pelanggan/menu..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-48 sm:w-56 shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Reset All Filters Button */}
            {(branchFilter !== 'all' || paymentFilter !== 'all' || searchQuery || periodMode !== 'hari') && (
              <button
                type="button"
                onClick={() => {
                  setBranchFilter('all');
                  setPaymentFilter('all');
                  setSearchQuery('');
                  setPeriodMode('hari');
                  setSelectedDate(getTodayDateString());
                }}
                title="Reset Semua Filter"
                className="flex items-center space-x-1 px-2 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

          </div>

        </div>

      </div>

      {/* 3. FINTECH SUMMARY CARDS PERIODE TERPILIH */}
      <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-sm">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Total Omzet Periode Ini
          </span>
          <div className="text-base sm:text-xl font-mono font-black text-emerald-800 tabular-nums mt-0.5">
            {formatRupiah(metrics.totalOmzet)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            {metrics.countSuccess} Struk Berhasil
          </span>
        </div>

        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-sm">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Rata-rata Tiket (AOV)
          </span>
          <div className="text-base sm:text-xl font-mono font-black text-slate-800 tabular-nums mt-0.5">
            {formatRupiah(metrics.aov)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Rata-rata per struk pesanan
          </span>
        </div>

        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-sm">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Tunai POS (Laci)
          </span>
          <div className="text-base sm:text-xl font-mono font-black text-emerald-700 tabular-nums mt-0.5">
            {formatRupiah(metrics.totalTunai)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Uang fisik kasir
          </span>
        </div>

        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-sm">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            QRIS &amp; Transfer/Ojol
          </span>
          <div className="text-base sm:text-xl font-mono font-black text-amber-600 tabular-nums mt-0.5">
            {formatRupiah(metrics.totalQris + metrics.totalOjolTransfer)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            QRIS: {formatRupiah(metrics.totalQris)}
          </span>
        </div>
      </div>

      {/* 4. SLIDE / PAGINATION BAR ATAS ("SLIDE BIAR TIDAK KEBAWAH TERUS") */}
      <div className="px-4 py-3 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        
        {/* Info Rows Counter */}
        <div className="flex items-center space-x-2 text-slate-500 font-medium">
          <span className="font-extrabold text-slate-800">
            {filteredData.length === 0 ? '0 Transaksi' : `Menampilkan ${startIndex + 1} - ${endIndex} dari ${filteredData.length} data`}
          </span>
          {searchQuery && (
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
              Filter pencarian aktif
            </span>
          )}
        </div>

        {/* Page Size & Slide Navigator Controls */}
        <div className="flex items-center space-x-3">
          
          {/* Baris per Slide */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-slate-400 font-bold">Baris:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-2 py-1 outline-none cursor-pointer"
            >
              <option value={5}>5 baris</option>
              <option value={10}>10 baris</option>
              <option value={20}>20 baris</option>
              <option value={50}>50 baris</option>
            </select>
          </div>

          {/* Slide Buttons */}
          <div className="flex items-center space-x-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
            {/* First Page */}
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(1)}
              title="Halaman Pertama"
              className="p-1 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Prev Page */}
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              title="Slide Mundur (Sebelumnya)"
              className="p-1 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Indicator Pill */}
            <span className="px-2 text-xs font-black text-slate-800">
              {safePage} / {totalPages}
            </span>

            {/* Next Page */}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              title="Slide Maju (Berikutnya)"
              className="p-1 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last Page */}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              title="Halaman Terakhir"
              className="p-1 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* 5. TABEL MUTASI PENJUALAN BANK-GRADE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-white uppercase tracking-wider font-extrabold text-[10px]">
            <tr>
              <th className="py-3 px-4">No. Invoice &amp; Waktu</th>
              <th className="py-3 px-4">Cabang Outlet</th>
              <th className="py-3 px-4">Kasir &amp; Pelanggan</th>
              <th className="py-3 px-4">Item Pesanan</th>
              <th className="py-3 px-4">Metode Bayar</th>
              <th className="py-3 px-4 text-right">Nominal Tagihan</th>
              <th className="py-3 px-4 text-center">Status &amp; Struk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-slate-400 text-xs">
                  <div className="flex flex-col items-center justify-center space-y-2.5 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shadow-inner">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <span className="font-extrabold text-slate-700 text-sm">
                      Tidak Ada Data Mutasi Transaksi
                    </span>
                    <span className="text-slate-400 text-center leading-relaxed">
                      {periodMode === 'hari' 
                        ? `Belum ada pesanan masuk pada tanggal ${selectedDate}. Silakan pilih tanggal lain atau beralih ke mode Bulan / Semua Riwayat.`
                        : 'Tidak ada pesanan yang sesuai dengan filter yang Anda tentukan.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPeriodMode('semua');
                        setBranchFilter('all');
                        setPaymentFilter('all');
                        setSearchQuery('');
                      }}
                      className="mt-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
                    >
                      Tampilkan Semua Riwayat Mutasi
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((trx) => (
                <tr 
                  key={trx.id} 
                  onClick={() => setReceiptTrx(trx)}
                  className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                >
                  {/* Invoice & Waktu */}
                  <td className="py-3 px-4">
                    <span className="font-mono font-black text-slate-900 group-hover:text-emerald-800 transition-colors block">
                      {trx.invoice_no}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-300 inline" />
                      <span>{formatWaktu(trx.waktu)}</span>
                    </span>
                  </td>

                  {/* Cabang */}
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-800 block">
                      {trx.cabang_nama?.split('-')[1]?.trim() || trx.cabang_nama || 'Cabang'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {cabangList.find(c => isBranchMatch(c.id, trx.cabang_id))?.kode || 'CBG'}
                    </span>
                  </td>

                  {/* Kasir & Pelanggan */}
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">
                      {trx.nama_pelanggan || 'Pelanggan Umum'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Kasir: {trx.karyawan_nama || 'Staf Kasir'}
                    </span>
                  </td>

                  {/* Items */}
                  <td className="py-3 px-4 text-slate-600 max-w-[220px]">
                    <div className="truncate font-medium text-[11px]" title={trx.items?.map(it => `${it.qty}x ${it.nama_menu}`).join(', ')}>
                      {trx.items?.map(it => `${it.qty}x ${it.nama_menu}`).join(', ') || '-'}
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      {trx.items?.reduce((s, it) => s + it.qty, 0) || 0} porsi
                    </span>
                  </td>

                  {/* Metode Bayar */}
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full font-black uppercase text-[10px] border shadow-xs inline-block ${
                      trx.metode_bayar === 'tunai'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : trx.metode_bayar === 'qris'
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : trx.metode_bayar === 'transfer'
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'bg-orange-50 text-orange-700 border-orange-300'
                    }`}>
                      {trx.metode_bayar}
                    </span>
                  </td>

                  {/* Nominal Tagihan */}
                  <td className="py-3 px-4 text-right font-mono font-black text-slate-900 tabular-nums text-sm group-hover:text-emerald-700 transition-colors">
                    {formatRupiah(trx.total)}
                  </td>

                  {/* Status & Action */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center space-x-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold flex items-center space-x-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>SUCCESS</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReceiptTrx(trx);
                        }}
                        title="Lihat / Cetak Struk"
                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-700" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 6. SLIDE / PAGINATION BAR BAWAH */}
      {filteredData.length > 0 && (
        <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 font-medium">
            Halaman <span className="font-extrabold text-slate-800">{safePage}</span> dari <span className="font-extrabold text-slate-800">{totalPages}</span> (Total {filteredData.length} Data)
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(1)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Awal
            </button>

            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            {/* Quick Page Jump Pills */}
            <div className="hidden md:flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - safePage) <= 1)
                .map((page, idx, arr) => {
                  const prevPage = arr[idx - 1];
                  const hasGap = prevPage && page - prevPage > 1;
                  return (
                    <React.Fragment key={page}>
                      {hasGap && <span className="px-1 text-slate-400">...</span>}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                          safePage === page
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Akhir
            </button>
          </div>
        </div>
      )}

      {/* 7. DIGITAL RECEIPT MODAL (INTERAKTIF POP-UP CETAK STRUK) */}
      {receiptTrx && activeBranchForReceipt && (
        <ReceiptModal
          transaksi={receiptTrx}
          cabang={activeBranchForReceipt}
          onClose={() => setReceiptTrx(null)}
        />
      )}

    </div>
  );
}
