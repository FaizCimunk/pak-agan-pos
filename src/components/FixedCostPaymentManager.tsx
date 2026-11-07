'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  CreditCard, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Pencil, 
  Plus, 
  RotateCcw, 
  Wallet, 
  FileText, 
  ArrowRight,
  TrendingUp,
  Store,
  DollarSign,
  ShieldCheck,
  X,
  FileCheck2,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { Cabang, PembayaranFixedCostBulanan } from '@/lib/types';
import { db } from '@/lib/db';
import { formatRupiah, getTodayDateString } from '@/lib/utils';

interface FixedCostPaymentManagerProps {
  cabangList: Cabang[];
  onEditCabang: (cabang: Cabang) => void;
  selectedCabangId?: string;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function FixedCostPaymentManager({
  cabangList,
  onEditCabang,
  selectedCabangId = 'all',
}: FixedCostPaymentManagerProps) {
  // Navigation Tabs: 'pembayaran' | 'tarif'
  const [activeSubTab, setActiveSubTab] = useState<'pembayaran' | 'tarif'>('pembayaran');

  // Month & Year Filter (Default: Oktober 2026)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(10); // 1-12

  const periodeBulanKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  // Filter Cabang & Filter Status Pelunasan
  const [filterCabang, setFilterCabang] = useState<string>(selectedCabangId);
  const [filterStatus, setFilterStatus] = useState<'all' | 'lunas' | 'belum'>('all');

  // Payments State
  const [payments, setPayments] = useState<PembayaranFixedCostBulanan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal Pembayaran State
  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
  const [targetCabang, setTargetCabang] = useState<Cabang | null>(null);
  const [targetJenisBiaya, setTargetJenisBiaya] = useState<'sewa' | 'listrik_wifi' | 'sampah_kebersihan' | 'semua_paket'>('sewa');
  const [payDate, setPayDate] = useState<string>(getTodayDateString());
  const [payMethod, setPayMethod] = useState<string>('Transfer BCA (Pak Agan)');
  const [payRefNo, setPayRefNo] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [payNominalCustom, setPayNominalCustom] = useState<number>(0);

  // Fetch payments on mount or period change
  const fetchPayments = async () => {
    setLoading(true);
    const data = await db.getFixedCostPayments(periodeBulanKey);
    setPayments(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();
    const handleUpdate = () => {
      fetchPayments();
    };
    window.addEventListener('pak_agan_db_updated', handleUpdate);
    return () => window.removeEventListener('pak_agan_db_updated', handleUpdate);
  }, [periodeBulanKey]);

  // Sync filterCabang if parent changes
  useEffect(() => {
    if (selectedCabangId) setFilterCabang(selectedCabangId);
  }, [selectedCabangId]);

  // Step Month
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

  // Branch payment status matrix
  const branchRows = useMemo(() => {
    return cabangList.map((c) => {
      const sewaNominal = c.sewa_bulanan || 3500000;
      const wifiNominal = c.listrik_air_bulanan || 650000;
      const iuranNominal = c.iuran_kebersihan_bulanan || 150000;
      const lainNominal = c.biaya_lain_bulanan || 0;
      const totalBeban = sewaNominal + wifiNominal + iuranNominal + lainNominal;

      // Find payments for this branch & period
      const sewaPay = payments.find(p => p.cabang_id === c.id && p.periode_bulan === periodeBulanKey && p.jenis_biaya === 'sewa');
      const wifiPay = payments.find(p => p.cabang_id === c.id && p.periode_bulan === periodeBulanKey && p.jenis_biaya === 'listrik_wifi');
      const iuranPay = payments.find(p => p.cabang_id === c.id && p.periode_bulan === periodeBulanKey && p.jenis_biaya === 'sampah_kebersihan');
      const paketPay = payments.find(p => p.cabang_id === c.id && p.periode_bulan === periodeBulanKey && p.jenis_biaya === 'semua_paket');

      const isSewaLunas = Boolean(paketPay?.status === 'lunas' || sewaPay?.status === 'lunas');
      const isWifiLunas = Boolean(paketPay?.status === 'lunas' || wifiPay?.status === 'lunas');
      const isIuranLunas = Boolean(paketPay?.status === 'lunas' || iuranPay?.status === 'lunas');

      let lunasCount = 0;
      if (isSewaLunas) lunasCount++;
      if (isWifiLunas) lunasCount++;
      if (isIuranLunas) lunasCount++;

      let nominalLunas = 0;
      if (isSewaLunas) nominalLunas += sewaNominal;
      if (isWifiLunas) nominalLunas += wifiNominal;
      if (isIuranLunas) nominalLunas += iuranNominal;
      if (paketPay?.status === 'lunas') nominalLunas = totalBeban;

      const nominalSisa = Math.max(0, totalBeban - nominalLunas);
      const isFullLunas = isSewaLunas && isWifiLunas && isIuranLunas;

      return {
        cabang: c,
        sewaNominal,
        wifiNominal,
        iuranNominal,
        lainNominal,
        totalBeban,
        sewaPay,
        wifiPay,
        iuranPay,
        paketPay,
        isSewaLunas,
        isWifiLunas,
        isIuranLunas,
        lunasCount,
        nominalLunas,
        nominalSisa,
        isFullLunas,
      };
    });
  }, [cabangList, payments, periodeBulanKey]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return branchRows.filter(r => {
      if (filterCabang !== 'all' && r.cabang.id !== filterCabang) return false;
      if (filterStatus === 'lunas' && !r.isFullLunas) return false;
      if (filterStatus === 'belum' && r.isFullLunas) return false;
      return true;
    });
  }, [branchRows, filterCabang, filterStatus]);

  // Target rows for metric summary (reacts to branch filter)
  const targetRowsForMetrics = useMemo(() => {
    if (filterCabang === 'all') {
      return branchRows;
    }
    return branchRows.filter(r => r.cabang.id === filterCabang);
  }, [branchRows, filterCabang]);

  // Aggregate Metrics for selected branch or all 10 branches
  const summaryMetrics = useMemo(() => {
    let grandTotalBeban = 0;
    let grandTotalLunas = 0;
    let fullLunasBranches = 0;

    targetRowsForMetrics.forEach(r => {
      grandTotalBeban += r.totalBeban;
      grandTotalLunas += r.nominalLunas;
      if (r.isFullLunas) fullLunasBranches++;
    });

    const grandTotalSisa = Math.max(0, grandTotalBeban - grandTotalLunas);
    const percentLunas = grandTotalBeban > 0 ? Math.round((grandTotalLunas / grandTotalBeban) * 100) : 0;

    const singleRow = filterCabang !== 'all' ? targetRowsForMetrics[0] : null;

    return {
      grandTotalBeban,
      grandTotalLunas,
      grandTotalSisa,
      percentLunas,
      fullLunasBranches,
      totalBranches: targetRowsForMetrics.length,
      singleRow,
      selectedBranchName: singleRow ? (singleRow.cabang.nama.split('-')[1]?.trim() || singleRow.cabang.nama) : '10 Toko',
      selectedBranchKode: singleRow ? singleRow.cabang.kode : '10 Toko',
    };
  }, [targetRowsForMetrics, filterCabang]);

  // Handle Open Payment Modal
  const openPayModalFor = (cabang: Cabang, jenis: 'sewa' | 'listrik_wifi' | 'sampah_kebersihan' | 'semua_paket') => {
    setTargetCabang(cabang);
    setTargetJenisBiaya(jenis);
    setPayDate(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-02`);
    setPayMethod('Transfer BCA (Pak Agan)');
    setPayRefNo(`TRF-BCA-${Date.now().toString().slice(-8)}`);
    setPayNotes(`Pembayaran beban ${jenis === 'sewa' ? 'Sewa Ruko' : jenis === 'listrik_wifi' ? 'Listrik & Wi-Fi' : jenis === 'sampah_kebersihan' ? 'Iuran Sampah' : 'Paket Penuh'} ${cabang.nama}`);
    
    // Set nominal default
    if (jenis === 'sewa') setPayNominalCustom(cabang.sewa_bulanan || 3500000);
    else if (jenis === 'listrik_wifi') setPayNominalCustom(cabang.listrik_air_bulanan || 650000);
    else if (jenis === 'sampah_kebersihan') setPayNominalCustom(cabang.iuran_kebersihan_bulanan || 150000);
    else setPayNominalCustom((cabang.sewa_bulanan || 3500000) + (cabang.listrik_air_bulanan || 650000) + (cabang.iuran_kebersihan_bulanan || 150000));

    setPaymentModalOpen(true);
  };

  // Submit Payment
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCabang) return;

    await db.saveFixedCostPayment({
      cabang_id: targetCabang.id,
      cabang_nama: targetCabang.nama,
      periode_bulan: periodeBulanKey,
      jenis_biaya: targetJenisBiaya,
      nama_biaya: targetJenisBiaya === 'sewa' ? 'Sewa Ruko' : targetJenisBiaya === 'listrik_wifi' ? 'Listrik & Wi-Fi' : targetJenisBiaya === 'sampah_kebersihan' ? 'Iuran Sampah & Kebersihan' : 'Paket Penuh Beban Toko',
      nominal: payNominalCustom,
      status: 'lunas',
      tanggal_bayar: payDate,
      metode_bayar: payMethod,
      no_referensi: payRefNo,
      catatan: payNotes,
      dibayar_oleh: 'Pak Agan (Owner)'
    });

    setPaymentModalOpen(false);
    fetchPayments();
  };

  // Quick Toggle Lunas / Belum Lunas
  const handleQuickToggle = async (paymentId?: string, fallbackCabang?: Cabang, fallbackJenis?: 'sewa' | 'listrik_wifi' | 'sampah_kebersihan') => {
    if (paymentId) {
      await db.toggleFixedCostPaymentStatus(paymentId, 'belum_bayar');
      fetchPayments();
    } else if (fallbackCabang && fallbackJenis) {
      openPayModalFor(fallbackCabang, fallbackJenis);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER UTAMA DENGAN TAB SUB-NAVIGASI */}
      <div className="bg-white p-5 rounded-3xl border-t-[4px] border-emerald-600 border-x border-b border-slate-200/90 shadow-soft-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
            <Building2 className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                Siklus Bulanan &amp; Cashflow
              </span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">• 10 Toko Terkendali</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Pusat Pembayaran Biaya Tetap (Fixed Cost Toko)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola status pelunasan sewa ruko, listrik, wi-fi &amp; retribusi bulanan. Beban yang sudah lunas tidak akan memotong omzet harian berulang!
            </p>
          </div>
        </div>

        {/* Sub-Tabs: Pembayaran Bulanan vs Master Tarif */}
        <div className="flex items-center space-x-2 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('pembayaran')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'pembayaran'
                ? 'bg-white text-emerald-950 shadow-sm border border-emerald-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>Status Pembayaran Bulanan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('tarif')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'tarif'
                ? 'bg-white text-emerald-950 shadow-sm border border-emerald-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
            <span>Master Tarif Sewa Toko</span>
          </button>
        </div>

      </div>

      {/* 2. SUB-TAB 1: STATUS PEMBAYARAN BULANAN (PILIHAN BULAN & TAHUN) */}
      {activeSubTab === 'pembayaran' && (
        <div className="space-y-5">
          
          {/* Bar Kontrol Pemilih Bulan & Tahun */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-soft-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Periode Month Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
                Periode Bulan:
              </span>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => stepMonth(-1)}
                  title="Bulan Lalu"
                  className="p-1.5 hover:bg-white rounded-xl text-slate-600 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Dropdown Bulan */}
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="text-xs font-extrabold text-slate-900 bg-transparent px-2.5 py-1 outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>

                {/* Dropdown Tahun */}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-xs font-extrabold text-slate-900 bg-transparent px-2.5 py-1 outline-none cursor-pointer border-l border-slate-200"
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
                  className="p-1.5 hover:bg-white rounded-xl text-slate-600 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonth(10);
                    setSelectedYear(2026);
                  }}
                  className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200 px-2.5 py-1 rounded-xl transition-colors cursor-pointer ml-1"
                >
                  Oktober 2026
                </button>
              </div>
            </div>

            {/* Filter Outlet & Filter Status */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Filter Outlet */}
              <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200 text-xs">
                <Store className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterCabang}
                  onChange={(e) => setFilterCabang(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">Semua Cabang (10 Toko)</option>
                  {cabangList.map(c => (
                    <option key={c.id} value={c.id}>
                      #{c.nomor} • {c.kode} - {c.nama.split('-')[1]?.trim() || c.nama}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Status Pelunasan */}
              <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">Semua Status</option>
                  <option value="lunas">Sudah Lunas Penuh</option>
                  <option value="belum">Ada Tagihan Menunggu</option>
                </select>
              </div>

            </div>

          </div>

          {/* 4 Kartu Eksekutif Progress Pelunasan Beban 10 Cabang */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Total Kewajiban Beban */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft-sm">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                {filterCabang === 'all' 
                  ? 'Total Beban Tetap 10 Toko' 
                  : `Beban Tetap ${summaryMetrics.selectedBranchKode}`}
              </span>
              <div className="text-xl sm:text-2xl font-mono font-black text-slate-900 mt-1 tabular-nums">
                {formatRupiah(summaryMetrics.grandTotalBeban)}
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-1 block truncate">
                {filterCabang === 'all' 
                  ? `Periode ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} • 10 Cabang` 
                  : `${summaryMetrics.selectedBranchName} • Periode ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}
              </span>
            </div>

            {/* 2. Sudah Dibayar Lunas */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border-t-[4px] border-emerald-600 border-x border-b border-slate-200/80 shadow-soft-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                  Sudah Dibayar Lunas
                </span>
                <span className="text-xs font-black text-emerald-700 font-mono">
                  {summaryMetrics.percentLunas}%
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-mono font-black text-emerald-800 mt-1 tabular-nums">
                {formatRupiah(summaryMetrics.grandTotalLunas)}
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                <div 
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${summaryMetrics.percentLunas}%` }}
                />
              </div>
            </div>

            {/* 3. Sisa Tagihan Menunggu */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border-t-[4px] border-amber-500 border-x border-b border-slate-200/80 shadow-soft-sm">
              <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">
                Sisa Menunggu Pelunasan
              </span>
              <div className="text-xl sm:text-2xl font-mono font-black text-amber-700 mt-1 tabular-nums">
                {formatRupiah(summaryMetrics.grandTotalSisa)}
              </div>
              <span className="text-[10px] text-amber-600/90 font-medium mt-1 block truncate">
                {summaryMetrics.grandTotalSisa === 0 
                  ? '✓ Beban periode ini telah lunas' 
                  : 'Kewajiban kas yang belum ditransfer'}
              </span>
            </div>

            {/* 4. Outlet Lunas Penuh / Status Cabang */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft-sm">
              {filterCabang === 'all' ? (
                <>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Outlet Selesai Dibayar
                  </span>
                  <div className="text-xl sm:text-2xl font-mono font-black text-slate-900 mt-1 tabular-nums">
                    {summaryMetrics.fullLunasBranches} / {summaryMetrics.totalBranches} Toko
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold mt-1 block truncate">
                    {summaryMetrics.fullLunasBranches === summaryMetrics.totalBranches 
                      ? '✓ Seluruh Toko Telah Lunas' 
                      : `${summaryMetrics.totalBranches - summaryMetrics.fullLunasBranches} Toko masih ada tagihan`}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Status Tagihan Outlet
                  </span>
                  <div className="text-xl sm:text-2xl font-mono font-black mt-1 tabular-nums">
                    {summaryMetrics.singleRow?.isFullLunas ? (
                      <span className="text-emerald-700 font-black">LUNAS PENUH</span>
                    ) : summaryMetrics.singleRow && summaryMetrics.singleRow.lunasCount > 0 ? (
                      <span className="text-amber-700 font-black">SEBAGIAN LUNAS</span>
                    ) : (
                      <span className="text-rose-600 font-black">BELUM DIBAYAR</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold mt-1 block truncate">
                    {summaryMetrics.singleRow 
                      ? `${summaryMetrics.singleRow.lunasCount} dari 3 Biaya Terbayar (Sewa, Wifi, Sampah)` 
                      : '1 Toko Terpilih'}
                  </span>
                </>
              )}
            </div>

          </div>

          {/* Banner Edukasi Akuntansi Cashflow */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 flex items-start space-x-3 shadow-xs">
            <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 leading-relaxed">
              <span className="font-extrabold text-emerald-900 block text-sm mb-0.5">
                💡 Alur Otomatis Pembayaran Fixed Cost ke Laporan Harian:
              </span>
              Ketika Boss mencatat beban cabang sebagai <span className="font-bold underline text-emerald-900">LUNAS</span> untuk bulan berjalan, di menu <strong>Ringkasan (Laporan Eksekutif Boss)</strong> tersedia tombol mode cerdas untuk membebaskan omzet harian dari potongan sewa ruko. Dengan begitu, uang bersih kasir hari ini tidak lagi terlihat minus secara tidak adil!
            </div>
          </div>

          {/* Tabel Status Pembayaran Tiap Toko */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center space-x-2">
                <FileCheck2 className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Daftar Status Pembayaran Beban Cabang ({MONTH_NAMES[selectedMonth - 1]} {selectedYear})
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono font-semibold">
                {filteredRows.length} Cabang Ditampilkan
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Outlet Cabang</th>
                    <th className="py-3.5 px-4">Sewa Ruko</th>
                    <th className="py-3.5 px-4">Wi-Fi &amp; Listrik</th>
                    <th className="py-3.5 px-4">Sampah &amp; Retribusi</th>
                    <th className="py-3.5 px-4 text-right">Total Beban</th>
                    <th className="py-3.5 px-4 text-center">Status Pembayaran</th>
                    <th className="py-3.5 px-4 text-center">Tindakan Owner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRows.map((row) => (
                    <tr key={row.cabang.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Outlet Info */}
                      <td className="py-4 px-4">
                        <span className="font-mono text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block mb-1">
                          #{row.cabang.nomor} • {row.cabang.kode}
                        </span>
                        <span className="font-black text-slate-900 block text-xs">
                          {row.cabang.nama}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {row.cabang.kota} • PJ: {row.cabang.pj_nama || '-'}
                        </span>
                      </td>

                      {/* Sewa Ruko */}
                      <td className="py-4 px-4">
                        <span className="font-mono font-bold text-slate-900 block">
                          {formatRupiah(row.sewaNominal)}
                        </span>
                        {row.isSewaLunas ? (
                          <div className="mt-1 flex items-center space-x-1">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-black text-[9px] flex items-center space-x-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>LUNAS</span>
                            </span>
                            <span className="text-[9px] text-slate-400">
                              {row.sewaPay?.tanggal_bayar ? `tgl ${row.sewaPay.tanggal_bayar.slice(8, 10)}` : ''}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openPayModalFor(row.cabang, 'sewa')}
                            className="mt-1 px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-bold transition-all cursor-pointer block"
                          >
                            + Bayar Sewa
                          </button>
                        )}
                      </td>

                      {/* Wi-Fi & Listrik */}
                      <td className="py-4 px-4">
                        <span className="font-mono font-bold text-slate-900 block">
                          {formatRupiah(row.wifiNominal)}
                        </span>
                        {row.isWifiLunas ? (
                          <div className="mt-1 flex items-center space-x-1">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-black text-[9px] flex items-center space-x-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>LUNAS</span>
                            </span>
                            <span className="text-[9px] text-slate-400">
                              {row.wifiPay?.tanggal_bayar ? `tgl ${row.wifiPay.tanggal_bayar.slice(8, 10)}` : ''}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openPayModalFor(row.cabang, 'listrik_wifi')}
                            className="mt-1 px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-bold transition-all cursor-pointer block"
                          >
                            + Bayar Listrik
                          </button>
                        )}
                      </td>

                      {/* Sampah & Kebersihan */}
                      <td className="py-4 px-4">
                        <span className="font-mono font-bold text-slate-900 block">
                          {formatRupiah(row.iuranNominal)}
                        </span>
                        {row.isIuranLunas ? (
                          <div className="mt-1 flex items-center space-x-1">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-black text-[9px] flex items-center space-x-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>LUNAS</span>
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openPayModalFor(row.cabang, 'sampah_kebersihan')}
                            className="mt-1 px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-bold transition-all cursor-pointer block"
                          >
                            + Bayar Sampah
                          </button>
                        )}
                      </td>

                      {/* Total Beban */}
                      <td className="py-4 px-4 text-right">
                        <span className="font-mono font-black text-slate-900 block text-xs">
                          {formatRupiah(row.totalBeban)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          ≈ {formatRupiah(Math.round(row.totalBeban / 30))}/hr
                        </span>
                      </td>

                      {/* Status Pembayaran */}
                      <td className="py-4 px-4 text-center">
                        {row.isFullLunas ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] border border-emerald-300 flex items-center space-x-1 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>LUNAS PENUH</span>
                            </span>
                            <span className="text-[9px] text-emerald-700 font-medium mt-0.5">
                              (3/3 Beban Terbayar)
                            </span>
                          </div>
                        ) : row.lunasCount > 0 ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-black text-[10px] border border-amber-300 flex items-center space-x-1 shadow-2xs">
                              <Clock className="w-3 h-3 text-amber-700" />
                              <span>SEBAGIAN ({row.lunasCount}/3)</span>
                            </span>
                            <span className="text-[9px] text-amber-700 font-mono mt-0.5">
                              Sisa: {formatRupiah(row.nominalSisa)}
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 font-black text-[10px] border border-rose-300 flex items-center space-x-1 shadow-2xs">
                              <AlertCircle className="w-3 h-3 text-rose-700" />
                              <span>BELUM BAYAR</span>
                            </span>
                            <span className="text-[9px] text-rose-600 font-mono mt-0.5">
                              {formatRupiah(row.totalBeban)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Tindakan Owner */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => openPayModalFor(row.cabang, 'semua_paket')}
                            title="Bayar / Catat Transfer Beban Toko"
                            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] transition-all btn-tactile cursor-pointer flex items-center space-x-1"
                          >
                            <CreditCard className="w-3 h-3 text-amber-400" />
                            <span>{row.isFullLunas ? 'Ubah Bayar' : 'Bayar Toko Ini'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onEditCabang(row.cabang)}
                            title="Edit Tarif Biaya Sewa Toko"
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* 3. SUB-TAB 2: MASTER TARIF SEWA & BIAYA TETAP TOKO */}
      {activeSubTab === 'tarif' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft-sm overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="font-extrabold text-slate-900 text-sm block">
                Master Besaran Biaya Tetap per Toko (Tarif Bulanan Standar)
              </span>
              <span className="text-xs text-slate-400">
                Ubah nilai sewa ruko, utilitas, atau retribusi yang berlaku per bulan untuk tiap cabang.
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">
              {cabangList.length} Cabang Terdaftar
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Outlet Cabang</th>
                  <th className="py-3 px-3.5">Biaya Sewa Ruko</th>
                  <th className="py-3 px-3.5">Wi-Fi &amp; Listrik</th>
                  <th className="py-3 px-3.5">Sampah &amp; Kebersihan</th>
                  <th className="py-3 px-3.5">Beban Tambahan</th>
                  <th className="py-3 px-3.5 text-right text-rose-300">Potongan (/30 Hari)</th>
                  <th className="py-3 px-3.5 text-center">Tindakan Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {cabangList.map(c => {
                  const sewa = c.sewa_bulanan || 3500000;
                  const wifi = c.listrik_air_bulanan || 650000;
                  const iuran = c.iuran_kebersihan_bulanan || 150000;
                  const lain = c.biaya_lain_bulanan || 0;
                  const harian = Math.round((sewa + wifi + iuran + lain) / 30);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-3.5">
                        <span className="font-mono text-[10px] font-bold text-slate-400 block">#{c.nomor} • {c.kode}</span>
                        <span className="font-extrabold text-slate-900 text-xs">{c.nama}</span>
                        <span className="text-[10px] text-slate-500 block">{c.kota} • PJ: {c.pj_nama || '-'}</span>
                      </td>
                      <td className="py-3.5 px-3.5">
                        <span className="font-mono font-bold text-slate-900 block">{formatRupiah(sewa)}/bln</span>
                        <span className="text-[10px] text-slate-400 font-mono">≈ {formatRupiah(Math.round(sewa / 30))}/hari</span>
                      </td>
                      <td className="py-3.5 px-3.5">
                        <span className="font-mono font-bold text-slate-900 block">{formatRupiah(wifi)}/bln</span>
                        <span className="text-[10px] text-slate-400 font-mono">≈ {formatRupiah(Math.round(wifi / 30))}/hari</span>
                      </td>
                      <td className="py-3.5 px-3.5">
                        <span className="font-mono font-bold text-slate-900 block">{formatRupiah(iuran)}/bln</span>
                        <span className="text-[10px] text-slate-400 font-mono">≈ {formatRupiah(Math.round(iuran / 30))}/hari</span>
                      </td>
                      <td className="py-3.5 px-3.5">
                        {lain > 0 ? (
                          <div>
                            <span className="font-mono font-bold text-amber-950 block">{formatRupiah(lain)}/bln</span>
                            <span className="text-[10px] text-slate-500 block truncate max-w-[130px]" title={c.keterangan_biaya_lain}>
                              {c.keterangan_biaya_lain || 'Beban Lain'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-mono font-bold text-rose-600 text-sm tabular-nums">
                        -{formatRupiah(harian)}/hari
                      </td>
                      <td className="py-3.5 px-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => onEditCabang(c)}
                          className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center space-x-1 mx-auto cursor-pointer shadow-xs"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Ubah Biaya Toko Ini</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. MODAL CATAT PEMBAYARAN BEBAN BULANAN */}
      {paymentModalOpen && targetCabang && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border-t-[4px] border-emerald-600 border-x border-b border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden p-6 space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Catat Pembayaran Beban Toko
                  </h3>
                  <span className="text-xs text-slate-500">
                    {targetCabang.nama} • Periode {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePayment} className="space-y-4 text-xs">
              
              {/* Jenis Beban yang Dibayar */}
              <div>
                <label className="block text-slate-700 font-extrabold uppercase text-[10px] tracking-wider mb-1.5">
                  Pilih Beban yang Dibayar:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetJenisBiaya('sewa');
                      setPayNominalCustom(targetCabang.sewa_bulanan || 3500000);
                    }}
                    className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                      targetJenisBiaya === 'sewa'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-[10px] text-slate-400">1. Sewa Ruko</span>
                    <span className="font-mono text-xs">{formatRupiah(targetCabang.sewa_bulanan || 3500000)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetJenisBiaya('listrik_wifi');
                      setPayNominalCustom(targetCabang.listrik_air_bulanan || 650000);
                    }}
                    className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                      targetJenisBiaya === 'listrik_wifi'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-[10px] text-slate-400">2. Wi-Fi &amp; Listrik</span>
                    <span className="font-mono text-xs">{formatRupiah(targetCabang.listrik_air_bulanan || 650000)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetJenisBiaya('sampah_kebersihan');
                      setPayNominalCustom(targetCabang.iuran_kebersihan_bulanan || 150000);
                    }}
                    className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                      targetJenisBiaya === 'sampah_kebersihan'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-[10px] text-slate-400">3. Sampah &amp; Iuran</span>
                    <span className="font-mono text-xs">{formatRupiah(targetCabang.iuran_kebersihan_bulanan || 150000)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetJenisBiaya('semua_paket');
                      setPayNominalCustom((targetCabang.sewa_bulanan || 3500000) + (targetCabang.listrik_air_bulanan || 650000) + (targetCabang.iuran_kebersihan_bulanan || 150000));
                    }}
                    className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                      targetJenisBiaya === 'semua_paket'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-[10px] text-slate-400">Paket Semua Beban</span>
                    <span className="font-mono text-xs text-emerald-700">Lunas Sekaligus</span>
                  </button>
                </div>
              </div>

              {/* Nominal Pembayaran */}
              <div>
                <label className="block text-slate-700 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                  Nominal yang Ditransfer / Dibayar (Rp):
                </label>
                <input
                  type="number"
                  value={payNominalCustom}
                  onChange={(e) => setPayNominalCustom(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm font-mono font-black text-slate-900 border border-slate-200 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              {/* Tanggal & Metode Bayar */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                    Tanggal Pembayaran:
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold text-slate-800 border border-slate-200 rounded-xl outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                    Metode Pembayaran:
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold text-slate-800 border border-slate-200 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="Transfer BCA (Pak Agan)">Transfer BCA (Pak Agan)</option>
                    <option value="Transfer Mandiri">Transfer Mandiri</option>
                    <option value="Kas Laci Cabang">Kas Laci Cabang</option>
                    <option value="Tunai Langsung">Tunai Langsung</option>
                  </select>
                </div>
              </div>

              {/* Nomor Referensi Transfer */}
              <div>
                <label className="block text-slate-700 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                  No. Bukti / Referensi Transfer (Opsional):
                </label>
                <input
                  type="text"
                  value={payRefNo}
                  onChange={(e) => setPayRefNo(e.target.value)}
                  placeholder="Contoh: TRF-BCA-9872192"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none"
                />
              </div>

              {/* Catatan / Keterangan */}
              <div>
                <label className="block text-slate-700 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                  Catatan Pembayaran:
                </label>
                <textarea
                  rows={2}
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Keterangan transfer ke pemilik ruko..."
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black shadow-md shadow-emerald-900/20 btn-tactile transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>SIMPAN &amp; TANDAI LUNAS</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
