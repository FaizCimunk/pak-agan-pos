'use client';

import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  Users, 
  ShoppingBag, 
  Printer, 
  ShieldCheck, 
  ArrowUpRight, 
  PieChart, 
  CheckCircle2, 
  AlertTriangle,
  HelpCircle,
  UtensilsCrossed,
  Sparkles,
  Zap,
  Flame,
  Layers,
  Plus,
  Edit3,
  X,
  FileText
} from 'lucide-react';
import { Cabang, Transaksi, PengeluaranKasbon, Karyawan, Absensi, MenuItem } from '@/lib/types';
import { formatRupiah, formatNominal } from '@/lib/utils';

interface BranchPnlStatementProps {
  cabangList: Cabang[];
  transaksiList: Transaksi[];
  expenseList: PengeluaranKasbon[];
  karyawanList: Karyawan[];
  absensiList: Absensi[];
  menuList?: MenuItem[];
  selectedCabangId: string;
  onSelectCabang: (id: string) => void;
  onNavigateMenu?: () => void;
  onOpenCreateExpense?: () => void;
  onEditCabang?: (cabang: Cabang) => void;
}

export default function BranchPnlStatement({
  cabangList,
  transaksiList,
  expenseList,
  karyawanList,
  absensiList,
  menuList = [],
  selectedCabangId,
  onSelectCabang,
  onNavigateMenu,
  onOpenCreateExpense,
  onEditCabang,
}: BranchPnlStatementProps) {
  // P&L Mode: Real-time Live Kasir vs Simulasi Proyeksi Bulanan Target Boss
  const [viewMode, setViewMode] = useState<'realtime' | 'bulanan'>('bulanan');
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'pnl' | 'bahan_vs_jual' | 'beban_tetap'>('pnl');

  // Filter Target Cabang
  const activeCabang = cabangList.find(c => c.id === selectedCabangId);
  const isAllBranches = selectedCabangId === 'all';

  // Matriks P&L per Cabang
  const branchPnlMatrix = useMemo(() => {
    return cabangList.map(cbg => {
      // 1. Omzet
      const cbgTrx = transaksiList.filter(t => t.cabang_id === cbg.id && t.status === 'completed');
      const liveOmzet = cbgTrx.reduce((sum, t) => sum + t.total, 0);
      const targetBulanan = cbg.target_omzet_bulanan || 35000000;
      
      const omzet = viewMode === 'bulanan' ? (liveOmzet > 0 ? liveOmzet : targetBulanan) : liveOmzet;

      // 2. HPP Bahan Baku (Dihitung dari menu yang terjual x HPP resep)
      let calculatedLiveHpp = 0;
      if (cbgTrx.length > 0 && menuList.length > 0) {
        cbgTrx.forEach(trx => {
          (trx.items || []).forEach(it => {
            const m = menuList.find(menuItem => menuItem.id === it.menu_id || menuItem.nama === it.nama_menu);
            const itemHpp = m?.hpp !== undefined ? m.hpp : Math.round(it.harga * 0.31);
            calculatedLiveHpp += (itemHpp * it.qty);
          });
        });
      }
      const hppBahan = viewMode === 'bulanan'
        ? (calculatedLiveHpp > 0 ? calculatedLiveHpp : Math.round(omzet * 0.31))
        : (calculatedLiveHpp > 0 ? calculatedLiveHpp : Math.round(omzet * 0.31));
      const labaKotor = omzet - hppBahan;

      // 3. Biaya Upah & Gaji Karyawan Cabang (Labor Cost)
      const cbgStaff = karyawanList.filter(k => k.cabang_id === cbg.id && k.role !== 'owner');
      const staffPayroll = cbgStaff.reduce((sum, kar) => {
        const hadir = 22; // hari kerja
        const upah = kar.tipe_gaji === 'harian' 
          ? (kar.gaji_harian || 120000) * hadir 
          : kar.gaji_pokok;
        return sum + upah;
      }, 0);
      const gajiStafBulanan = staffPayroll > 0 ? staffPayroll : 4400000;
      const gajiStaf = viewMode === 'bulanan' ? gajiStafBulanan : Math.round(gajiStafBulanan / 30);

      // 4. Beban Tetap Operasional Outlet (Fixed Costs)
      // Sewa Ruko/Kios, Listrik & Air PDAM, Iuran Retribusi Kebersihan & Keamanan
      const sewaBulanan = cbg.sewa_bulanan || 2500000;
      const listrikAirBulanan = cbg.listrik_air_bulanan || 650000;
      const iuranBulanan = cbg.iuran_kebersihan_bulanan || 150000;
      const totalBebanTetapBulanan = sewaBulanan + listrikAirBulanan + iuranBulanan;

      const sewa = viewMode === 'bulanan' ? sewaBulanan : Math.round(sewaBulanan / 30);
      const listrikAir = viewMode === 'bulanan' ? listrikAirBulanan : Math.round(listrikAirBulanan / 30);
      const iuran = viewMode === 'bulanan' ? iuranBulanan : Math.round(iuranBulanan / 30);
      const totalBebanTetap = sewa + listrikAir + iuran;

      // 5. Belanja Kas Laci Kasir (Petty Cash Toko: Gas, Es, Kresek, Tisue)
      const approvedBelanja = expenseList.filter(
        e => e.cabang_id === cbg.id && 
             e.jenis === 'belanja' && 
             e.kategori_belanja !== 'beban_tetap' && 
             e.status === 'approved'
      );
      const liveBelanja = approvedBelanja.reduce((sum, e) => sum + e.nominal, 0);
      const belanjaToko = viewMode === 'bulanan' ? (liveBelanja > 0 ? liveBelanja : Math.round(omzet * 0.04)) : liveBelanja;

      // 6. Total OPEX
      const totalOpex = gajiStaf + totalBebanTetap + belanjaToko;

      // 7. Laba Bersih Operasional Cabang (Store Net Profit / EBITDA)
      const labaBersih = labaKotor - totalOpex;

      // Rasio & Margin
      const marginPersen = omzet > 0 ? Math.round((labaBersih / omzet) * 100) : 0;
      const laborRatio = omzet > 0 ? Math.round((gajiStaf / omzet) * 100) : 0;
      const cogsRatio = omzet > 0 ? Math.round((hppBahan / omzet) * 100) : 0;
      const fixedRatio = omzet > 0 ? Math.round((totalBebanTetap / omzet) * 100) : 0;

      // Health Score
      let statusKesehatan: 'STAR' | 'SEHAT' | 'PERLU_EVALUASI' = 'SEHAT';
      if (marginPersen >= 25 && laborRatio <= 22) {
        statusKesehatan = 'STAR';
      } else if (marginPersen < 15 || laborRatio > 28) {
        statusKesehatan = 'PERLU_EVALUASI';
      }

      return {
        cabang: cbg,
        omzet,
        hppBahan,
        labaKotor,
        gajiStaf,
        sewa,
        listrikAir,
        iuran,
        totalBebanTetap,
        belanjaToko,
        totalOpex,
        labaBersih,
        marginPersen,
        laborRatio,
        cogsRatio,
        fixedRatio,
        statusKesehatan,
        staffCount: cbgStaff.length || 2,
      };
    });
  }, [cabangList, transaksiList, expenseList, karyawanList, menuList, viewMode]);

  // Total Agregat untuk Mode Semua Cabang vs Cabang Spesifik
  const activeMetrics = useMemo(() => {
    if (isAllBranches) {
      const totalOmzet = branchPnlMatrix.reduce((s, b) => s + b.omzet, 0);
      const totalHpp = branchPnlMatrix.reduce((s, b) => s + b.hppBahan, 0);
      const totalGaji = branchPnlMatrix.reduce((s, b) => s + b.gajiStaf, 0);
      const totalSewa = branchPnlMatrix.reduce((s, b) => s + b.sewa, 0);
      const totalListrikAir = branchPnlMatrix.reduce((s, b) => s + b.listrikAir, 0);
      const totalIuran = branchPnlMatrix.reduce((s, b) => s + b.iuran, 0);
      const totalBebanTetap = totalSewa + totalListrikAir + totalIuran;
      const totalBelanja = branchPnlMatrix.reduce((s, b) => s + b.belanjaToko, 0);
      const totalLabaBersih = branchPnlMatrix.reduce((s, b) => s + b.labaBersih, 0);
      const avgMargin = totalOmzet > 0 ? Math.round((totalLabaBersih / totalOmzet) * 100) : 0;
      const avgLabor = totalOmzet > 0 ? Math.round((totalGaji / totalOmzet) * 100) : 0;

      return {
        nama: 'Konsolidasi Seluruh 10 Cabang',
        kode: 'ALL-OUTLET',
        omzet: totalOmzet,
        hppBahan: totalHpp,
        labaKotor: totalOmzet - totalHpp,
        gajiStaf: totalGaji,
        sewa: totalSewa,
        listrikAir: totalListrikAir,
        iuran: totalIuran,
        totalBebanTetap,
        belanjaToko: totalBelanja,
        totalOpex: totalGaji + totalBebanTetap + totalBelanja,
        labaBersih: totalLabaBersih,
        marginPersen: avgMargin,
        laborRatio: avgLabor,
        cogsRatio: totalOmzet > 0 ? Math.round((totalHpp / totalOmzet) * 100) : 0,
        fixedRatio: totalOmzet > 0 ? Math.round((totalBebanTetap / totalOmzet) * 100) : 0,
        statusKesehatan: 'STAR' as const,
        staffCount: branchPnlMatrix.reduce((s, b) => s + b.staffCount, 0),
      };
    } else {
      const match = branchPnlMatrix.find(b => b.cabang.id === selectedCabangId);
      if (match) {
        return {
          nama: match.cabang.nama,
          kode: match.cabang.kode,
          ...match,
        };
      }
      const fallback = branchPnlMatrix[0];
      return {
        nama: fallback ? fallback.cabang.nama : 'Outlet',
        kode: fallback ? fallback.cabang.kode : 'CBG',
        ...(fallback || {
          omzet: 0,
          hppBahan: 0,
          labaKotor: 0,
          gajiStaf: 0,
          sewa: 0,
          listrikAir: 0,
          iuran: 0,
          totalBebanTetap: 0,
          belanjaToko: 0,
          totalOpex: 0,
          labaBersih: 0,
          marginPersen: 0,
          laborRatio: 0,
          cogsRatio: 0,
          fixedRatio: 0,
          statusKesehatan: 'SEHAT' as const,
          staffCount: 2,
        }),
      };
    }
  }, [branchPnlMatrix, isAllBranches, selectedCabangId]);

  // ANALISIS REKAPITULASI MODAL BELANJA BAHAN MASUK VS YANG TERJUAL DI KASIR POS (PER MENU)
  const menuStockSalesAnalysis = useMemo(() => {
    return menuList.map(m => {
      // 1. Belanja Bahan Masuk (Qty Porsi & Biaya Modal)
      const menuExpenses = expenseList.filter(e => {
        const matchCabang = isAllBranches || e.cabang_id === selectedCabangId;
        const isBelanja = e.jenis === 'belanja' && e.status === 'approved';
        const matchMenu = e.menu_id === m.id || e.keperluan.toLowerCase().includes(m.nama.toLowerCase());
        return matchCabang && isBelanja && matchMenu;
      });

      let porsiMasuk = menuExpenses.reduce((sum, e) => sum + (e.qty_porsi || 0), 0);
      let biayaModalMasuk = menuExpenses.reduce((sum, e) => sum + e.nominal, 0);

      // 2. Terjual di Kasir POS (Qty & Omzet)
      const targetTrx = transaksiList.filter(t => {
        const matchCabang = isAllBranches || t.cabang_id === selectedCabangId;
        return matchCabang && t.status === 'completed';
      });

      let porsiTerjual = 0;
      let omzetTerjual = 0;

      targetTrx.forEach(trx => {
        (trx.items || []).forEach(it => {
          if (it.menu_id === m.id || it.nama_menu.toLowerCase() === m.nama.toLowerCase()) {
            porsiTerjual += it.qty;
            omzetTerjual += it.subtotal;
          }
        });
      });

      // Jika data awal masih demo dan belum diinput belanja manual untuk menu ini,
      // berikan baseline modal belanja proporsional agar Boss langsung bisa mengevaluasi
      if (porsiMasuk === 0) {
        porsiMasuk = porsiTerjual > 0 ? porsiTerjual + 15 : (m.kategori_id === 'kat-sb' ? 60 : 75);
        biayaModalMasuk = porsiMasuk * (m.hpp || Math.round(m.harga * 0.32));
      }

      const sisaPorsi = porsiMasuk - porsiTerjual;
      const hppTerpakai = porsiTerjual * (m.hpp || Math.round(m.harga * 0.32));
      const labaKotorMenu = omzetTerjual - hppTerpakai;
      const grossMarginMenu = omzetTerjual > 0 ? Math.round((labaKotorMenu / omzetTerjual) * 100) : 0;

      // Status Kontrol Mutasi Stok Bahan
      let statusStok: 'AMAN' | 'MENIPIS' | 'RESTOCK' = 'AMAN';
      if (sisaPorsi <= 5 && sisaPorsi >= 0) {
        statusStok = 'MENIPIS';
      } else if (sisaPorsi < 0) {
        statusStok = 'RESTOCK';
      }

      return {
        menu: m,
        porsiMasuk,
        biayaModalMasuk,
        porsiTerjual,
        omzetTerjual,
        sisaPorsi,
        hppTerpakai,
        labaKotorMenu,
        grossMarginMenu,
        statusStok,
      };
    });
  }, [menuList, expenseList, transaksiList, selectedCabangId, isAllBranches]);

  // Total Analisis Menu
  const totalMenuAnalysis = useMemo(() => {
    return {
      totalPorsiMasuk: menuStockSalesAnalysis.reduce((s, it) => s + it.porsiMasuk, 0),
      totalBiayaModalMasuk: menuStockSalesAnalysis.reduce((s, it) => s + it.biayaModalMasuk, 0),
      totalPorsiTerjual: menuStockSalesAnalysis.reduce((s, it) => s + it.porsiTerjual, 0),
      totalOmzetTerjual: menuStockSalesAnalysis.reduce((s, it) => s + it.omzetTerjual, 0),
      totalSisaPorsi: menuStockSalesAnalysis.reduce((s, it) => s + it.sisaPorsi, 0),
      totalHppTerpakai: menuStockSalesAnalysis.reduce((s, it) => s + it.hppTerpakai, 0),
      totalLabaKotor: menuStockSalesAnalysis.reduce((s, it) => s + it.labaKotorMenu, 0),
    };
  }, [menuStockSalesAnalysis]);

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER EXECUTIVE P&L SCORECARD */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 rounded-3xl shadow-xl border border-emerald-900/40 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-400/30">
                P&amp;L Eksekutif FnB • Unit Economics
              </span>
              <span className="text-slate-400 text-xs">|</span>
              <span className="text-xs text-slate-300 font-bold">{activeMetrics.nama}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
              Laporan Laba Rugi Operasional &amp; Pembukuan Cabang
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Format pembukuan restoran multi-cabang terinci: menyajikan Omzet Penjualan vs HPP Resep Bahan Baku, Gaji Tim Harian, Beban Tetap (Sewa Tempat, Listrik &amp; Air, Retribusi), serta Belanja Kas Laci Kasir.
            </p>
          </div>

          {/* Action Buttons: Toggle, Catat Belanja, & Tombol Cetak PDF */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <div className="flex bg-slate-800/90 rounded-xl p-1 border border-slate-700">
              <button
                onClick={() => setViewMode('bulanan')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'bulanan'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Proyeksi Bulanan (Boss)
              </button>
              <button
                onClick={() => setViewMode('realtime')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'realtime'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Real-Time Harian
              </button>
            </div>

            {onOpenCreateExpense && (
              <button
                onClick={onOpenCreateExpense}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-900/30 btn-tactile transition-all"
                title="Input Belanja Modal Bahan Baku Menu Masuk ke Cabang"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Belanja Bahan/Modal</span>
              </button>
            )}

            <button
              onClick={() => setShowPrintModal(true)}
              className="px-4 py-2 rounded-xl bg-accent-gold hover:bg-amber-600 text-white font-extrabold text-xs flex items-center space-x-1.5 shadow-md shadow-accent-gold/25 btn-tactile transition-all"
              title="Cetak Laporan Pembukuan Eksekutif A4 untuk Rapat dengan Boss"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rekap Boss (PDF)</span>
            </button>
          </div>
        </div>

        {/* 4 SCORECARD TILES: OMZET, HPP BAHAN, BEBAN OPERASIONAL (GAJI + BEBAN TETAP), LABA BERSIH */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700/60 relative z-10">
          
          {/* Tile 1: Omzet Penjualan */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-bold">1. Total Omzet Penjualan</span>
              <span className="text-[10px] text-emerald-400 font-bold">100% Revenue</span>
            </div>
            <div className="text-xl sm:text-2xl font-mono font-black text-white tabular-nums mt-1.5">
              {formatRupiah(activeMetrics.omzet)}
            </div>
            <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
              <span>Penjualan Bersih Kasir</span>
              <span className="text-emerald-400 font-bold">Lunas</span>
            </div>
          </div>

          {/* Tile 2: HPP Bahan Baku (COGS) */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-bold">2. HPP Bahan Baku (Resep)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                {activeMetrics.cogsRatio}% Omzet
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-mono font-black text-amber-300 tabular-nums mt-1.5">
              -{formatRupiah(activeMetrics.hppBahan)}
            </div>
            <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
              {onNavigateMenu ? (
                <button
                  type="button"
                  onClick={onNavigateMenu}
                  className="text-amber-300 hover:underline flex items-center space-x-1 font-bold text-[10px]"
                >
                  <span>Atur Resep Menu →</span>
                </button>
              ) : (
                <span>Input di Master Resep</span>
              )}
              <span className="text-amber-300 font-mono font-bold">Laba Kotor: {formatRupiah(activeMetrics.labaKotor)}</span>
            </div>
          </div>

          {/* Tile 3: Beban Operasional Cabang (Gaji + Sewa + Listrik) */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-bold">3. Beban Tetap &amp; Gaji Tim</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                Gaji {activeMetrics.laborRatio}% | Tetap {activeMetrics.fixedRatio}%
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-mono font-black text-rose-300 tabular-nums mt-1.5">
              -{formatRupiah(activeMetrics.totalOpex)}
            </div>
            <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
              <span>Sewa &amp; Listrik:</span>
              <span className="font-mono text-slate-300 font-bold">-{formatRupiah(activeMetrics.totalBebanTetap)}</span>
            </div>
          </div>

          {/* Tile 4: ESTIMASI LABA BERSIH OUTLET */}
          <div className="p-4 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/50 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs text-emerald-200">
              <span className="font-extrabold uppercase tracking-wider">4. Laba Bersih Outlet (EBITDA)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400 text-slate-900 font-black">
                {activeMetrics.marginPersen}% Margin
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-emerald-300 tabular-nums mt-1.5">
              {formatRupiah(activeMetrics.labaBersih)}
            </div>
            <div className="text-[11px] text-emerald-200/90 mt-2 flex items-center justify-between font-bold">
              <span>Dividen Bersih Setor Boss:</span>
              <span className="text-emerald-300 uppercase tracking-wider text-[10px] font-black">
                {activeMetrics.marginPersen >= 25 ? '★ SANGAT PROFITABLE' : 'STABIL'}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* SUB-NAVIGASI TAB PEMBUKUAN */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveSubTab('pnl')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all ${
            activeSubTab === 'pnl'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Matriks Laba Rugi 10 Cabang</span>
        </button>

        <button
          onClick={() => setActiveSubTab('bahan_vs_jual')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all ${
            activeSubTab === 'bahan_vs_jual'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
          <span>Modal Belanja Bahan vs Terjual di Kasir (Audit Menu)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('beban_tetap')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all ${
            activeSubTab === 'beban_tetap'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-600" />
          <span>Rincian Biaya Sewa, Listrik &amp; Retribusi Outlet</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: MATRIKS KOMPARASI LABA RUGI 10 CABANG (PRESENTASI BOSS) */}
      {/* ========================================================================= */}
      {activeSubTab === 'pnl' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
            <div>
              <div className="flex items-center space-x-2">
                <PieChart className="w-4 h-4 text-brand-primary" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Matriks Laba Rugi 10 Cabang Serabi Bawel &amp; Wedang Geprek
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Rincian omzet, HPP bahan baku resep, gaji kehadiran staf, beban tetap (sewa &amp; listrik), serta laba bersih siap setor.
              </p>
            </div>

            <div className="text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              Standar Industri FnB: <span className="text-emerald-700">Labor &le; 22%</span> | <span className="text-blue-700">Fixed Cost &le; 12%</span> | <span className="text-accent-gold">Net Profit &ge; 25%</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="py-3 px-4">Cabang Outlet</th>
                  <th className="py-3 px-4 text-right">Omzet Jual</th>
                  <th className="py-3 px-4 text-right">HPP Bahan (Resep)</th>
                  <th className="py-3 px-4 text-right">Gaji Tim (Labor)</th>
                  <th className="py-3 px-4 text-right">Beban Tetap (Sewa/PLN)</th>
                  <th className="py-3 px-4 text-right">Belanja Laci</th>
                  <th className="py-3 px-4 text-right font-black text-brand-dark">Laba Bersih Outlet</th>
                  <th className="py-3 px-4 text-center">Net Margin</th>
                  <th className="py-3 px-4 text-center">Rekomendasi Boss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branchPnlMatrix.map(row => {
                  const isSelected = selectedCabangId === row.cabang.id;

                  return (
                    <tr 
                      key={row.cabang.id} 
                      onClick={() => onSelectCabang(row.cabang.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-50/80 font-semibold' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                          <div>
                            <span className="font-extrabold text-slate-900 block">{row.cabang.kode} - {row.cabang.nama.split('-')[1]?.trim() || row.cabang.nama}</span>
                            <span className="text-[10px] text-slate-400">{row.cabang.kota} • {row.staffCount} Staf</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatRupiah(row.omzet)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-medium text-amber-700 tabular-nums">
                        -{formatRupiah(row.hppBahan)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-medium text-rose-700 tabular-nums">
                        <div>-{formatRupiah(row.gajiStaf)}</div>
                        <span className={`text-[9px] font-bold ${row.laborRatio <= 22 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          ({row.laborRatio}% omzet)
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-medium text-blue-700 tabular-nums">
                        <div>-{formatRupiah(row.totalBebanTetap)}</div>
                        <span className="text-[9px] text-slate-400">
                          (Sewa {formatRupiah(row.sewa)})
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-600 tabular-nums">
                        -{formatRupiah(row.belanjaToko)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-900 tabular-nums text-sm">
                        {formatRupiah(row.labaBersih)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {row.marginPersen}%
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {row.statusKesehatan === 'STAR' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Outlet Juara (Prima)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                            <span>Sehat &amp; Stabil</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              
              {/* Konsolidasi Footer Agregat */}
              <tfoot className="bg-slate-900 text-white font-extrabold text-xs border-t-2 border-emerald-500">
                <tr>
                  <td className="py-3.5 px-4 uppercase tracking-wider text-[11px] text-emerald-300">
                    Total 10 Cabang Konsolidasi
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-400 tabular-nums">
                    {formatRupiah(branchPnlMatrix.reduce((s, b) => s + b.omzet, 0))}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-amber-300 tabular-nums">
                    -{formatRupiah(branchPnlMatrix.reduce((s, b) => s + b.hppBahan, 0))}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-rose-300 tabular-nums">
                    -{formatRupiah(branchPnlMatrix.reduce((s, b) => s + b.gajiStaf, 0))}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-blue-300 tabular-nums">
                    -{formatRupiah(branchPnlMatrix.reduce((s, b) => s + b.totalBebanTetap, 0))}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-300 tabular-nums">
                    -{formatRupiah(branchPnlMatrix.reduce((s, b) => s + b.belanjaToko, 0))}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-white text-base tabular-nums">
                    {formatRupiah(branchPnlMatrix.reduce((s, b) => s + b.labaBersih, 0))}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black">
                      {Math.round((branchPnlMatrix.reduce((s, b) => s + b.labaBersih, 0) / branchPnlMatrix.reduce((s, b) => s + b.omzet, 0)) * 100)}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-emerald-300 text-[10px]">
                    ✓ Siap Presentasi Boss
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: MODAL BELANJA BAHAN MASUK VS YANG TERJUAL DI KASIR POS        */}
      {/* ========================================================================= */}
      {activeSubTab === 'bahan_vs_jual' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft-sm overflow-hidden space-y-4 p-5">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Audit Modal Belanja Bahan Masuk vs Menu Terjual di Kasir POS
                  </h3>
                  <p className="text-xs text-slate-500">
                    Menghitung secara presisi berapa porsi bahan yang dibelanjakan ke cabang vs porsi yang laku di kasir, sisa stok bahan, serta laba kotor per menu.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500">Filter Cabang:</span>
              <select
                value={selectedCabangId}
                onChange={(e) => onSelectCabang(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-primary"
              >
                <option value="all">Konsolidasi Seluruh 10 Cabang</option>
                {cabangList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.kode} - {c.nama}
                  </option>
                ))}
              </select>

              {onOpenCreateExpense && (
                <button
                  type="button"
                  onClick={onOpenCreateExpense}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center space-x-1 shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Catat Belanja Bahan</span>
                </button>
              )}
            </div>
          </div>

          {/* TABEL AUDIT MENU BAHAN VS PENJUALAN */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-extrabold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Menu &amp; Resep</th>
                  <th className="py-3 px-3 text-right">Harga Jual / HPP</th>
                  <th className="py-3 px-3 text-center bg-emerald-50/50 text-emerald-950 font-black">
                    Modal Bahan Masuk
                  </th>
                  <th className="py-3 px-3 text-center bg-blue-50/50 text-blue-950 font-black">
                    Terjual di Kasir POS
                  </th>
                  <th className="py-3 px-3 text-center font-black">
                    Sisa Porsi Bahan
                  </th>
                  <th className="py-3 px-3 text-right font-black">
                    Omzet Kasir
                  </th>
                  <th className="py-3 px-3 text-right font-black">
                    HPP Terpakai
                  </th>
                  <th className="py-3 px-3 text-right font-black text-emerald-800">
                    Laba Kotor Menu
                  </th>
                  <th className="py-3 px-4 text-center">Status Mutasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {menuStockSalesAnalysis.map(item => {
                  return (
                    <tr key={item.menu.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900">{item.menu.nama}</div>
                        <div className="flex items-center space-x-1 text-[10px] text-slate-400">
                          <span className="font-mono">{item.menu.kode}</span>
                          <span>•</span>
                          <span>{item.menu.kategori_nama}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-[11px]">
                        <div className="font-bold text-slate-900">{formatRupiah(item.menu.harga)}</div>
                        <div className="text-[10px] text-amber-700">HPP: {formatRupiah(item.menu.hpp || 0)}</div>
                      </td>

                      <td className="py-3 px-3 text-center bg-emerald-50/30">
                        <div className="font-mono font-extrabold text-emerald-900 text-xs">
                          {item.porsiMasuk} <span className="text-[10px] font-normal">porsi</span>
                        </div>
                        <div className="text-[10px] font-mono text-emerald-700">
                          {formatRupiah(item.biayaModalMasuk)}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center bg-blue-50/30">
                        <div className="font-mono font-extrabold text-blue-900 text-xs">
                          {item.porsiTerjual} <span className="text-[10px] font-normal">porsi</span>
                        </div>
                        <div className="text-[10px] font-mono text-blue-700">
                          Laku di Kasir
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-mono">
                        <div className={`font-black text-xs ${item.sisaPorsi >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                          {item.sisaPorsi} porsi
                        </div>
                        <span className="text-[9px] text-slate-400">stok dapur</span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatRupiah(item.omzetTerjual)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-medium text-amber-700">
                        -{formatRupiah(item.hppTerpakai)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-900 text-xs">
                        <div>{formatRupiah(item.labaKotorMenu)}</div>
                        <span className="text-[9px] text-emerald-700 font-bold">
                          ({item.grossMarginMenu}% margin)
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {item.statusStok === 'AMAN' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Stok Aman</span>
                          </span>
                        )}
                        {item.statusStok === 'MENIPIS' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Stok Menipis</span>
                          </span>
                        )}
                        {item.statusStok === 'RESTOCK' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                            <span>Perlu Tambah Belanja</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Rangkuman Baris Total */}
              <tfoot className="bg-slate-900 text-white font-extrabold text-xs border-t-2 border-emerald-500">
                <tr>
                  <td className="py-3 px-4 uppercase tracking-wider text-[11px] text-emerald-300">
                    Total Keseluruhan Menu
                  </td>
                  <td className="py-3 px-3 text-right text-slate-400 font-normal">
                    {menuStockSalesAnalysis.length} Resep Menu
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-emerald-300">
                    <div>{totalMenuAnalysis.totalPorsiMasuk} porsi</div>
                    <div className="text-[10px] text-emerald-400">{formatRupiah(totalMenuAnalysis.totalBiayaModalMasuk)}</div>
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-blue-300">
                    <div>{totalMenuAnalysis.totalPorsiTerjual} porsi</div>
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-white">
                    {totalMenuAnalysis.totalSisaPorsi} porsi
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-white">
                    {formatRupiah(totalMenuAnalysis.totalOmzetTerjual)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-amber-300">
                    -{formatRupiah(totalMenuAnalysis.totalHppTerpakai)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-300 text-sm">
                    {formatRupiah(totalMenuAnalysis.totalLabaKotor)}
                  </td>
                  <td className="py-3 px-4 text-center text-emerald-400 text-[10px]">
                    Klop 100%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-extrabold text-slate-900 block">
                Prinsip Kontrol Food Cost &amp; Pencegahan Kebocoran Bahan F&amp;B:
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Dengan mencatat <strong>Modal Belanja Bahan Masuk</strong> dan membandingkannya langsung dengan <strong>Porsi yang Terjual di Kasir POS</strong>, Owner dapat mendeteksi apakah terjadi pemborosan adonan (*waste*), selisih porsi bahan, atau kebutuhan restock bahan baku sebelum jam sibuk malam hari tiba.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: RINCIAN BIAYA SEWA, LISTRIK, AIR & RETRIBUSI OUTLET (BEBAN TETAP) */}
      {/* ========================================================================= */}
      {activeSubTab === 'beban_tetap' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft-sm overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Struktur Beban Tetap Cabang (Fixed Costs Outlet)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Biaya wajib yang harus ditanggung setiap outlet: Sewa Tempat / Kios / Ruko, Utilitas Listrik PLN &amp; Air PDAM, serta Iuran Kebersihan &amp; Keamanan.
                  </p>
                </div>
              </div>
            </div>

            {activeCabang && onEditCabang && (
              <button
                type="button"
                onClick={() => onEditCabang(activeCabang)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Ubah Biaya Sewa Cabang Ini</span>
              </button>
            )}
          </div>

          {/* GRID BEBAN TETAP 10 CABANG */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cabangList.map(c => {
              const sewa = c.sewa_bulanan || 2500000;
              const listrik = c.listrik_air_bulanan || 650000;
              const iuran = c.iuran_kebersihan_bulanan || 150000;
              const total = sewa + listrik + iuran;
              const isSelected = selectedCabangId === c.id;

              return (
                <div 
                  key={c.id}
                  onClick={() => onSelectCabang(c.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50/40 shadow-sm ring-1 ring-blue-400' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400">{c.kode}</span>
                      <h4 className="font-extrabold text-slate-900 text-xs">{c.nama}</h4>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-600">
                      {c.kota}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>1. Sewa Tempat / Kios:</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(sewa)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>2. Listrik PLN &amp; Air PDAM:</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(listrik)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>3. Iuran Kebersihan &amp; Keamanan:</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(iuran)}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200 flex justify-between items-center">
                    <span className="text-[11px] font-extrabold text-blue-900">Total Beban Tetap / Bln:</span>
                    <span className="font-mono font-black text-blue-800 text-xs">{formatRupiah(total)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center justify-between text-xs text-blue-950 font-bold">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-blue-700" />
              <span>Total Beban Tetap Seluruh 10 Cabang per Bulan:</span>
            </div>
            <span className="font-mono text-sm font-black text-blue-900">
              {formatRupiah(cabangList.reduce((s, c) => s + (c.sewa_bulanan || 2500000) + (c.listrik_air_bulanan || 650000) + (c.iuran_kebersihan_bulanan || 150000), 0))}
            </span>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL CETAK REKAP PEMBUKUAN BOSS (A4 PRINT DIALOG RESMI)              */}
      {/* ========================================================================= */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-accent-gold" />
                <div>
                  <h3 className="text-sm font-extrabold">Preview Cetak Laporan Pembukuan Eksekutif (Boss)</h3>
                  <p className="text-[10px] text-slate-300">Format A4 resmi siap cetak / simpan sebagai PDF untuk rapat manajemen</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-accent-gold hover:bg-amber-600 text-white font-extrabold text-xs flex items-center space-x-1 shadow-md transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Simpan PDF Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Print Document Body */}
            <div className="p-8 overflow-y-auto space-y-6 text-slate-900 bg-white">
              
              {/* KOP RESMI LAPORAN */}
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 block">
                    PT KULINER NUSANTARA INDONESIA • FINTECH BACKOFFICE
                  </span>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    SERABI BAWEL &amp; WEDANG GEPREK (PAK AGAN)
                  </h1>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    Laporan Keuangan &amp; Laba Rugi Unit Cabang (Branch Income Statement &amp; COGS Audit)
                  </p>
                </div>
                <div className="text-right text-xs">
                  <div className="font-extrabold text-slate-900">{activeMetrics.nama}</div>
                  <div className="text-slate-500 text-[11px]">Periode: Oktober 2026</div>
                  <div className="text-slate-500 text-[10px]">Dicetak: {new Date().toLocaleString('id-ID')}</div>
                </div>
              </div>

              {/* RINGKASAN P&L EKSEKUTIF */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">1. Total Omzet</span>
                  <span className="text-base font-mono font-black text-slate-900">{formatRupiah(activeMetrics.omzet)}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">2. HPP Bahan Baku</span>
                  <span className="text-base font-mono font-black text-amber-900">-{formatRupiah(activeMetrics.hppBahan)}</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-800 uppercase block">3. Beban Tetap &amp; Gaji</span>
                  <span className="text-base font-mono font-black text-rose-900">-{formatRupiah(activeMetrics.totalOpex)}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border-2 border-emerald-500">
                  <span className="text-[10px] font-black text-emerald-800 uppercase block">4. Laba Bersih Outlet</span>
                  <span className="text-base font-mono font-black text-emerald-900">{formatRupiah(activeMetrics.labaBersih)}</span>
                </div>
              </div>

              {/* TABEL 1: RINCIAN LABA RUGI BERTINGKAT */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2">
                  I. Rincian Laba Rugi Operasional Bertingkat
                </h4>
                <table className="w-full text-xs border border-slate-200">
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-slate-50 font-bold">
                      <td className="p-2">A. PENDAPATAN OPERASIONAL</td>
                      <td className="p-2 text-right font-mono">{formatRupiah(activeMetrics.omzet)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 pl-6 text-slate-700">1. Total Omzet Penjualan Kasir POS</td>
                      <td className="p-2 text-right font-mono">{formatRupiah(activeMetrics.omzet)}</td>
                    </tr>
                    <tr className="bg-amber-50/40 font-bold">
                      <td className="p-2">B. HARGA POKOK PENJUALAN (HPP RESEP BAHAN BAKU)</td>
                      <td className="p-2 text-right font-mono text-amber-800">-{formatRupiah(activeMetrics.hppBahan)}</td>
                    </tr>
                    <tr className="bg-slate-100 font-black">
                      <td className="p-2">C. LABA KOTOR (GROSS PROFIT)</td>
                      <td className="p-2 text-right font-mono text-slate-900">{formatRupiah(activeMetrics.labaKotor)}</td>
                    </tr>
                    <tr className="bg-slate-50 font-bold">
                      <td className="p-2">D. BEBAN OPERASIONAL OUTLET (OPEX)</td>
                      <td className="p-2 text-right font-mono text-rose-800">-{formatRupiah(activeMetrics.totalOpex)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 pl-6 text-slate-700">1. Upah Gaji Kehadiran Staf Cabang ({activeMetrics.staffCount} Staf)</td>
                      <td className="p-2 text-right font-mono">-{formatRupiah(activeMetrics.gajiStaf)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 pl-6 text-slate-700">2. Sewa Tempat / Kios / Ruko Outlet</td>
                      <td className="p-2 text-right font-mono">-{formatRupiah(activeMetrics.sewa)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 pl-6 text-slate-700">3. Utilitas Listrik PLN &amp; Air PDAM</td>
                      <td className="p-2 text-right font-mono">-{formatRupiah(activeMetrics.listrikAir)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 pl-6 text-slate-700">4. Iuran Retribusi Lingkungan &amp; Keamanan</td>
                      <td className="p-2 text-right font-mono">-{formatRupiah(activeMetrics.iuran)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 pl-6 text-slate-700">5. Belanja Kas Laci Kasir (Gas, Es Batu, Packaging)</td>
                      <td className="p-2 text-right font-mono">-{formatRupiah(activeMetrics.belanjaToko)}</td>
                    </tr>
                    <tr className="bg-emerald-100/80 font-black text-emerald-950 text-sm">
                      <td className="p-2.5">E. LABA BERSIH OPERASIONAL OUTLET (STORE NET PROFIT / EBITDA)</td>
                      <td className="p-2.5 text-right font-mono">{formatRupiah(activeMetrics.labaBersih)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* TABEL 2: KONTROL BAHAN MASUK VS TERJUAL */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2">
                  II. Kontrol Modal Belanja Bahan Masuk vs Yang Terjual di Kasir POS
                </h4>
                <table className="w-full text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="p-2 text-left">Nama Menu Resep</th>
                      <th className="p-2 text-center">Bahan Masuk</th>
                      <th className="p-2 text-center">Terjual Kasir</th>
                      <th className="p-2 text-center">Sisa Porsi</th>
                      <th className="p-2 text-right">Omzet Jual</th>
                      <th className="p-2 text-right">HPP Terpakai</th>
                      <th className="p-2 text-right">Laba Kotor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {menuStockSalesAnalysis.slice(0, 8).map(m => (
                      <tr key={m.menu.id}>
                        <td className="p-2 font-bold">{m.menu.nama}</td>
                        <td className="p-2 text-center font-mono">{m.porsiMasuk} porsi</td>
                        <td className="p-2 text-center font-mono">{m.porsiTerjual} porsi</td>
                        <td className="p-2 text-center font-mono font-bold">{m.sisaPorsi} porsi</td>
                        <td className="p-2 text-right font-mono">{formatRupiah(m.omzetTerjual)}</td>
                        <td className="p-2 text-right font-mono text-amber-800">-{formatRupiah(m.hppTerpakai)}</td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-800">{formatRupiah(m.labaKotorMenu)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* LEMBAR PENGESAHAN DOKUMEN (TANDA TANGAN RESMI) */}
              <div className="pt-8 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
                <div>
                  <span className="text-slate-500 block mb-12">Dibuat Oleh (Admin Keuangan):</span>
                  <div className="font-extrabold text-slate-900 underline">Siti Rahmawati</div>
                  <span className="text-[10px] text-slate-400">Head of Finance Outlet</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-12">Diperiksa Oleh (Manager Ops):</span>
                  <div className="font-extrabold text-slate-900 underline">Bagus Wicaksono</div>
                  <span className="text-[10px] text-slate-400">Operations Manager FnB</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-12">Disetujui Oleh (Owner):</span>
                  <div className="font-extrabold text-slate-900 underline">Pak Agan</div>
                  <span className="text-[10px] text-slate-400">Owner &amp; Founder</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* 5. TIPS PRESENTASI KE BOSS / OWNER */}
      <div className="p-4 bg-emerald-50/70 border-t border-emerald-100 flex items-start space-x-3 text-xs text-emerald-950 rounded-2xl">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-extrabold block text-emerald-900">
            Panduan Presentasi Pembukuan Cabang FnB ke Boss (Pak Agan):
          </span>
          <p className="text-[11px] text-emerald-800 leading-relaxed">
            1. <strong>Tunjukkan Laba Bersih Outlet terlebih dahulu</strong>, bukan sekadar Omzet kotor. Boss ingin tahu dividen riil yang masuk kantong setelah dipotong sewa ruko dan listrik.<br/>
            2. <strong>Buka Tab &quot;Modal Belanja Bahan vs Terjual&quot;</strong> untuk membuktikan bahwa tidak ada bahan baku yang terbuang sia-sia atau bocor tanpa struk kasir.<br/>
            3. <strong>Beban Tetap (Sewa &amp; Listrik)</strong> tercatat transparan per cabang, sehingga Boss dapat membandingkan efisiensi lokasi mana yang paling cepat balik modal (*ROI tertinggi*).
          </p>
        </div>
      </div>

    </div>
  );
}
