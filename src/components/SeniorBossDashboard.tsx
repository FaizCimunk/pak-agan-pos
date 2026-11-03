'use client';

import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Users, 
  PackageCheck, 
  Coffee, 
  Receipt, 
  FileText, 
  Calendar, 
  Pencil, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Banknote, 
  Wallet, 
  ChevronRight, 
  ArrowLeft, 
  Search, 
  Check, 
  X,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  MapPin,
  Laptop,
  ShoppingBag,
  RotateCcw,
  Sparkles,
  Lock,
  KeyRound,
  Store,
  DollarSign
} from 'lucide-react';
import { Cabang, Transaksi, Karyawan, Absensi, MenuItem, BahanBaku, KirimanBahanPusat, PengeluaranKasbon } from '@/lib/types';
import { formatRupiah, formatNominal, parseNominal, formatWaktu } from '@/lib/utils';
import { db } from '@/lib/db';

interface SeniorBossDashboardProps {
  cabangList: Cabang[];
  selectedCabangId: string;
  onSelectCabangId: (id: string) => void;
  onEditCabang: (cabang: Cabang) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  transaksiList: Transaksi[];
  karyawanList: Karyawan[];
  absensiList: Absensi[];
  menuList: MenuItem[];
  bahanList: BahanBaku[];
  kirimanBahanList: KirimanBahanPusat[];
  expenseList?: PengeluaranKasbon[];
  onOpenKirimanModal: (cabangId?: string) => void;
  onRefreshData: () => Promise<void>;
  onOpenReportModal: () => void;
  onOpenPinReset?: (karyawan: Karyawan) => void;
  onOpenExpenseCreate?: () => void;
  onNavigateTab?: (tab: 'absensi' | 'bahan' | 'menu' | 'karyawan' | 'approval' | 'gaji' | 'payroll') => void;
  pendingApprovalCount?: number;
  onLogout?: () => void;
}

export default function SeniorBossDashboard({
  cabangList,
  selectedCabangId,
  onSelectCabangId,
  onEditCabang,
  selectedDate,
  onDateChange,
  transaksiList,
  karyawanList,
  absensiList,
  menuList,
  bahanList,
  kirimanBahanList,
  expenseList = [],
  onOpenKirimanModal,
  onRefreshData,
  onOpenReportModal,
  onOpenPinReset,
  onOpenExpenseCreate,
  onNavigateTab,
  pendingApprovalCount = 0,
  onLogout,
}: SeniorBossDashboardProps) {
  // Modal State for the 9 Big Action Buttons & Status Boxes
  const [activeModal, setActiveModal] = useState<
    null | 'toko' | 'gaji' | 'bahan' | 'menu' | 'riwayat' | 'posisi_uang' | 'uang_bersih_detail' | 'fixed_cost_detail' | 'variable_cost_detail' | 'kas_kecil' | 'akun'
  >(null);

  // Sub-tabs for Gaji modal
  const [gajiModalTab, setGajiModalTab] = useState<'absensi' | 'utang'>('absensi');

  // Editing state for direct Utang Karyawan in modal
  const [editingUtangKaryawanId, setEditingUtangKaryawanId] = useState<string | null>(null);
  const [utangInputValue, setUtangInputValue] = useState<number>(0);
  const [savingUtang, setSavingUtang] = useState<boolean>(false);

  // Editing state for direct Menu HPP in modal
  const [editingMenuHppId, setEditingMenuHppId] = useState<string | null>(null);
  const [hppInputValue, setHppInputValue] = useState<number>(0);
  const [savingHpp, setSavingHpp] = useState<boolean>(false);

  // Channel filter for Riwayat Kasir
  const [channelFilter, setChannelFilter] = useState<'all' | 'tunai' | 'qris' | 'shopeefood' | 'gofood' | 'grabfood'>('all');

  // Currently active branch
  const activeCabang = cabangList.find(c => c.id === selectedCabangId) || null;
  const isAllCabang = selectedCabangId === 'all';

  // Target branches for financial calculations
  const targetBranches = useMemo(() => {
    if (isAllCabang) return cabangList;
    return cabangList.filter(c => c.id === selectedCabangId);
  }, [cabangList, selectedCabangId, isAllCabang]);

  // Target transactions on selectedDate
  const targetTrx = useMemo(() => {
    return transaksiList.filter(t => {
      const matchBranch = isAllCabang || t.cabang_id === selectedCabangId;
      const matchDate = t.waktu && t.waktu.startsWith(selectedDate);
      return matchBranch && matchDate && t.status === 'completed';
    });
  }, [transaksiList, isAllCabang, selectedCabangId, selectedDate]);

  // Omzet Kotor & Breakdown Uangnya Ada di Mana
  const omzetKotor = useMemo(() => {
    return targetTrx.reduce((sum, t) => sum + t.total, 0);
  }, [targetTrx]);

  const tunaiLaci = useMemo(() => {
    return targetTrx
      .filter(t => t.metode_bayar === 'tunai' || !t.metode_bayar)
      .reduce((sum, t) => sum + t.total, 0);
  }, [targetTrx]);

  const qrisTotal = useMemo(() => {
    return targetTrx
      .filter(t => t.metode_bayar === 'qris')
      .reduce((sum, t) => sum + t.total, 0);
  }, [targetTrx]);

  const shopeePay = useMemo(() => {
    return targetTrx
      .filter(t => (t.metode_bayar as any) === 'shopeefood' || (t.metode_bayar as any) === 'shopeepay')
      .reduce((sum, t) => sum + t.total, 0);
  }, [targetTrx]);

  const goPay = useMemo(() => {
    return targetTrx
      .filter(t => (t.metode_bayar as any) === 'gofood' || (t.metode_bayar as any) === 'gopay')
      .reduce((sum, t) => sum + t.total, 0);
  }, [targetTrx]);

  const grabFood = useMemo(() => {
    return targetTrx
      .filter(t => (t.metode_bayar as any) === 'grabfood' || (t.metode_bayar as any) === 'ovo')
      .reduce((sum, t) => sum + t.total, 0);
  }, [targetTrx]);

  // FIXED COST TOKO HARI INI:
  const sewaHarian = useMemo(() => {
    return targetBranches.reduce((sum, c) => sum + Math.round((c.sewa_bulanan || 3500000) / 30), 0);
  }, [targetBranches]);

  const wifiHarian = useMemo(() => {
    return targetBranches.reduce((sum, c) => {
      const wifi = c.listrik_air_bulanan || 650000;
      const iuran = c.iuran_kebersihan_bulanan || 150000;
      return sum + Math.round((wifi + iuran) / 30);
    }, 0);
  }, [targetBranches]);

  const targetAbsensiToday = useMemo(() => {
    return absensiList.filter(a => {
      const matchBranch = isAllCabang || a.cabang_id === selectedCabangId;
      const matchDate = a.tanggal === selectedDate;
      const isPresent = a.status === 'hadir' || a.status === 'setengah_hari';
      return matchBranch && matchDate && isPresent;
    });
  }, [absensiList, isAllCabang, selectedCabangId, selectedDate]);

  const gajiStafHadir = useMemo(() => {
    return targetAbsensiToday.reduce((sum, a) => sum + (a.upah_harian_terhitung || 100000), 0);
  }, [targetAbsensiToday]);

  const totalFixedCostHarian = sewaHarian + wifiHarian + gajiStafHadir;

  // VARIABLE COST HARI INI (HPP Modal Porsi yang Terjual di Kasir):
  const menuHppMap = useMemo(() => {
    const map: Record<string, number> = {};
    menuList.forEach(m => {
      map[m.id] = m.hpp || (m.kategori_id === 'kat-wg' ? 4000 : 5000);
    });
    return map;
  }, [menuList]);

  const totalHppBahan = useMemo(() => {
    let sumHpp = 0;
    targetTrx.forEach(trx => {
      trx.items.forEach(it => {
        const itemHpp = menuHppMap[it.menu_id] || 4000;
        sumHpp += itemHpp * it.qty;
      });
    });
    return sumHpp;
  }, [targetTrx, menuHppMap]);

  const totalVariableCostHarian = totalHppBahan;

  // UANG BERSIH MASUK REKENING BOSS HARI INI
  const uangBersihBoss = omzetKotor - (totalFixedCostHarian + totalVariableCostHarian);

  // Quick Date Helpers
  const handleSetYesterday = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().slice(0, 10));
  };

  const handleSetToday = () => {
    onDateChange('2026-10-25');
  };

  // Direct Utang Save by Boss
  const handleSaveUtang = async (karyawanId: string) => {
    setSavingUtang(true);
    try {
      await db.updateKaryawanUtang(karyawanId, utangInputValue);
      await onRefreshData();
      setEditingUtangKaryawanId(null);
    } catch (e) {
      alert('Gagal menyimpan potongan utang.');
    } finally {
      setSavingUtang(false);
    }
  };

  // Direct HPP Save by Boss
  const handleSaveHpp = async (menuId: string) => {
    setSavingHpp(true);
    try {
      await db.updateMenuHpp(menuId, hppInputValue);
      await onRefreshData();
      setEditingMenuHppId(null);
    } catch (e) {
      alert('Gagal menyimpan modal HPP.');
    } finally {
      setSavingHpp(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-3.5 select-none font-sans pb-6">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER KUNING PERSIS SALSA LAUNDRY (media_1793195318661.png)       */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-500 rounded-3xl p-4 text-slate-950 shadow-lg border-2 border-amber-300 relative overflow-hidden">
        {/* Specular sheen */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-md pointer-events-none" />

        <div className="flex items-center justify-between">
          {/* Logo Brand Emblem */}
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-950 text-white flex items-center justify-center text-xl shadow-md shrink-0">
              🥞
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="bg-slate-950 text-amber-300 px-2 py-0.5 rounded-lg text-xs font-black tracking-tight">
                  Serabi Bawel
                </span>
                <span className="font-extrabold text-xs text-slate-950">
                  Wedang Geprek
                </span>
              </div>
              <p className="text-[11px] font-bold text-amber-950 mt-0.5">
                🇮🇩 Laporan Hari Ini : Total Omzet : <span className="font-black font-mono">{formatRupiah(omzetKotor)}</span>
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono font-black text-amber-950 bg-amber-300/80 px-2 py-1 rounded-xl">
            10 Cabang
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUB-BAR: AVATAR, LOGOUT, ROLE OWNER & DATE SELECTOR                    */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center space-x-2">
          {/* Avatar Icon Circle */}
          <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm shadow-sm font-bold">
            👤
          </div>

          {/* Logout / Switch Role Circle */}
          <button
            type="button"
            onClick={() => {
              if (onLogout) {
                onLogout();
              } else {
                window.location.href = '/';
              }
            }}
            className="w-9 h-9 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-95 text-white flex items-center justify-center text-sm shadow-sm transition-all cursor-pointer"
            title="Kunci / Keluar Dashboard"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Yellow Pill: Owner Pak Agan */}
          <div className="px-3.5 py-1.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-sm flex items-center space-x-1 border border-amber-300">
            <span>👑</span>
            <span>Owner (Pak Agan)</span>
          </div>
        </div>

        {/* Tanggal Hari Ini & Tombol Kemarin */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={handleSetYesterday}
            className="px-2 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 text-[10px] font-bold active:scale-95"
            title="Kemarin"
          >
            ◀
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="px-2 py-1 bg-white border border-slate-200 rounded-xl text-[11px] font-mono font-bold text-slate-800 outline-none cursor-pointer shadow-2xs"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. STORE CARD (PERSIS SALSA LAUNDRY DENGAN PENSIL KUNING DI KANAN ATAS)   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-soft-sm relative overflow-hidden">
        {/* Tombol Pensil Kuning di Kanan Atas (Ubah Sewa & Wi-Fi) */}
        <button
          type="button"
          onClick={() => {
            if (activeCabang) {
              onEditCabang(activeCabang);
            } else if (cabangList[0]) {
              onEditCabang(cabangList[0]);
            }
          }}
          className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 flex items-center justify-center shadow-md transition-all cursor-pointer border border-amber-300"
          title="Ubah Biaya Sewa Ruko & Wi-Fi Toko Ini"
        >
          <Pencil className="w-4 h-4 text-slate-900 fill-slate-900" />
        </button>

        {/* Identitas Cabang Aktif */}
        <div className="flex items-start space-x-3 pr-10">
          <div className="w-12 h-12 rounded-2xl bg-amber-100/80 border border-amber-300 flex items-center justify-center text-2xl shadow-xs shrink-0">
            🍵
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-black tracking-wider text-emerald-800 block">
              {isAllCabang ? 'KONSOLIDASI SELURUH GERAI' : `OUTLET #${activeCabang?.nomor || '1'} • ${activeCabang?.kode || 'CBG'}`}
            </span>
            <h2 className="text-base font-black text-slate-900 leading-tight truncate">
              {isAllCabang ? 'Seluruh 10 Cabang Resmi (Pak Agan)' : (activeCabang?.nama || 'Cabang Resmi')}
            </h2>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {isAllCabang ? '10 Toko Aktif di Seluruh Wilayah' : (activeCabang?.alamat || activeCabang?.kota || 'Yogyakarta')}
            </p>
          </div>
        </div>

        {/* Dropdown Ganti Cabang Langsung di Bawah Nama Toko */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center space-x-2">
          <span className="text-[11px] font-bold text-slate-500 shrink-0">Pilih Toko:</span>
          <select
            value={selectedCabangId}
            onChange={(e) => onSelectCabangId(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs font-black text-slate-900 outline-none cursor-pointer truncate shadow-2xs"
          >
            <option value="all">🏢 Konsolidasi Semua 10 Cabang</option>
            {cabangList.map(c => (
              <option key={c.id} value={c.id}>
                {c.kode} - {c.nama.split('-')[1]?.trim() || c.nama} ({c.kota})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. 3 STATUS STAT BOXES (PERSIS 3 KOTAK KUNING SALSA LAUNDRY)              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-3 gap-2">
        {/* Kotak 1: Uang Bersih Masuk BCA */}
        <button
          type="button"
          onClick={() => setActiveModal('uang_bersih_detail')}
          className="p-3 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black shadow-md text-center flex flex-col items-center justify-center active:scale-95 transition-transform border border-amber-300 cursor-pointer"
        >
          <div className="flex items-center space-x-1 text-[10px] uppercase tracking-wider text-amber-950">
            <span>💰 Uang BCA</span>
          </div>
          <div className="text-xs sm:text-sm font-black font-mono tracking-tight text-slate-950 mt-0.5 truncate w-full">
            {formatRupiah(uangBersihBoss)}
          </div>
          <span className="text-[9px] text-amber-950/80 font-bold block">Pak Agan</span>
        </button>

        {/* Kotak 2: Fixed Cost Hari Ini */}
        <button
          type="button"
          onClick={() => setActiveModal('fixed_cost_detail')}
          className="p-3 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black shadow-md text-center flex flex-col items-center justify-center active:scale-95 transition-transform border border-amber-300 cursor-pointer"
        >
          <div className="flex items-center space-x-1 text-[10px] uppercase tracking-wider text-amber-950">
            <span>🏢 Fixed Cost</span>
          </div>
          <div className="text-xs sm:text-sm font-black font-mono tracking-tight text-slate-950 mt-0.5 truncate w-full">
            -{formatRupiah(totalFixedCostHarian)}
          </div>
          <span className="text-[9px] text-amber-950/80 font-bold block">Sewa &amp; Staf</span>
        </button>

        {/* Kotak 3: Variable Cost / HPP Modal */}
        <button
          type="button"
          onClick={() => setActiveModal('variable_cost_detail')}
          className="p-3 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black shadow-md text-center flex flex-col items-center justify-center active:scale-95 transition-transform border border-amber-300 cursor-pointer"
        >
          <div className="flex items-center space-x-1 text-[10px] uppercase tracking-wider text-amber-950">
            <span>🥞 HPP Modal</span>
          </div>
          <div className="text-xs sm:text-sm font-black font-mono tracking-tight text-slate-950 mt-0.5 truncate w-full">
            -{formatRupiah(totalVariableCostHarian)}
          </div>
          <span className="text-[9px] text-amber-950/80 font-bold block">Porsi Kasir</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 5. THE 3x3 GRID OF 9 BIG SQUARE APP CARDS (PERSIS SALSA LAUNDRY 9 KOTAK)  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        
        {/* KOTAK 1: 10 TOKO & SEWA */}
        <button
          type="button"
          onClick={() => setActiveModal('toko')}
          className="p-3.5 bg-white hover:bg-slate-50 active:scale-95 rounded-2xl border border-slate-200/90 shadow-soft-sm text-center flex flex-col items-center justify-center transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-2xl mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
            🏢
          </div>
          <span className="font-black text-slate-900 text-xs block leading-tight">10 Toko</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Sewa &amp; Wi-Fi</span>
        </button>

        {/* KOTAK 2: PRESENSI & GAJI STAF */}
        {/* KOTAK 2: PRESENSI & GAJI STAF */}
        <button
          type="button"
          onClick={() => {
            if (onNavigateTab) {
              onNavigateTab('absensi');
            } else {
              setGajiModalTab('absensi');
              setActiveModal('gaji');
            }
          }}
          className="p-3.5 bg-white hover:bg-slate-50 active:scale-95 rounded-2xl border border-slate-200/90 shadow-soft-sm text-center flex flex-col items-center justify-center transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-2xl mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
            👥
          </div>
          <span className="font-black text-slate-900 text-xs block leading-tight">Presensi</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Hadir &amp; Utang</span>
        </button>

        {/* KOTAK 3: STOK & KIRIM BAHAN */}
        <button
          type="button"
          onClick={() => {
            if (onNavigateTab) {
              onNavigateTab('bahan');
            } else {
              setActiveModal('bahan');
            }
          }}
          className="p-3.5 bg-white hover:bg-slate-50 active:scale-95 rounded-2xl border border-slate-200/90 shadow-soft-sm text-center flex flex-col items-center justify-center transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center text-2xl mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
            📦
          </div>
          <span className="font-black text-slate-900 text-xs block leading-tight">Stok Bahan</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Kasir &amp; Pusat</span>
        </button>

        {/* KOTAK 4: MENU & MODAL HPP */}
        <button
          type="button"
          onClick={() => {
            if (onNavigateTab) {
              onNavigateTab('menu');
            } else {
              setActiveModal('menu');
            }
          }}
          className="p-3.5 bg-white hover:bg-slate-50 active:scale-95 rounded-2xl border border-slate-200/90 shadow-soft-sm text-center flex flex-col items-center justify-center transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-700 flex items-center justify-center text-2xl mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
            🥞
          </div>
          <span className="font-black text-slate-900 text-xs block leading-tight">Menu &amp; HPP</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Modal Porsi</span>
        </button>

        {/* KOTAK 5: RIWAYAT KASIR & OJOL */}
        <button
          type="button"
          onClick={() => setActiveModal('riwayat')}
          className="p-3.5 bg-white hover:bg-slate-50 active:scale-95 rounded-2xl border border-slate-200/90 shadow-soft-sm text-center flex flex-col items-center justify-center transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center text-2xl mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
            🛵
          </div>
          <span className="font-black text-slate-900 text-xs block leading-tight">Riwayat</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Struk &amp; Ojol</span>
        </button>

        {/* KOTAK 6: LAPORAN RESMI & PDF */}
        <button
          type="button"
          onClick={() => {
            if (onNavigateTab) {
              onNavigateTab('payroll');
            } else {
              onOpenReportModal();
            }
          }}
          className="p-3.5 bg-white hover:bg-slate-50 active:scale-95 rounded-2xl border border-slate-200/90 shadow-soft-sm text-center flex flex-col items-center justify-center transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center text-2xl mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
            📊
          </div>
          <span className="font-black text-slate-900 text-xs block leading-tight">Laporan</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Cetak PDF A4</span>
        </button>

        {/* KOTAK 7: POSISI UANG (TUNAI, QRIS, SHOPEE, GOJEK, GRAB) */}
        <button
          type="button"
          onClick={() => setActiveModal('posisi_uang')}
          className="p-3.5 bg-white hover:bg-slate-50 active:scale-95 rounded-2xl border border-slate-200/90 shadow-soft-sm text-center flex flex-col items-center justify-center transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center text-2xl mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
            💳
          </div>
          <span className="font-black text-slate-900 text-xs block leading-tight">Posisi Uang</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Laci &amp; Dompet</span>
        </button>

        {/* KOTAK 8: KAS KECIL & APPROVAL */}
        <button
          type="button"
          onClick={() => {
            if (onNavigateTab) {
              onNavigateTab('approval');
            } else {
              setActiveModal('kas_kecil');
            }
          }}
          className="p-3.5 bg-white hover:bg-slate-50 active:scale-95 rounded-2xl border border-slate-200/90 shadow-soft-sm text-center flex flex-col items-center justify-center transition-all cursor-pointer group relative"
        >
          {pendingApprovalCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-[11px] shadow-md animate-bounce ring-2 ring-white">
              {pendingApprovalCount}
            </span>
          )}
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center text-2xl mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
            📝
          </div>
          <span className="font-black text-slate-900 text-xs block leading-tight">Kas &amp; Approval</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Belanja Toko</span>
        </button>

        {/* KOTAK 9: KELOLA AKUN & PIN */}
        <button
          type="button"
          onClick={() => {
            if (onNavigateTab) {
              onNavigateTab('karyawan');
            } else {
              setActiveModal('akun');
            }
          }}
          className="p-3.5 bg-white hover:bg-slate-50 active:scale-95 rounded-2xl border border-slate-200/90 shadow-soft-sm text-center flex flex-col items-center justify-center transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-2xl mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
            ⚙️
          </div>
          <span className="font-black text-slate-900 text-xs block leading-tight">Akun &amp; PIN</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Sandi Tablet</span>
        </button>

      </div>

      {/* ========================================================================= */}
      {/* 6. BOTTOM STICKY BUTTON (PERSIS SALSA LAUNDRY TOMBOL KUNING TRANSAKSI)    */}
      {/* ========================================================================= */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => window.location.href = '/pos'}
          className="w-full py-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-500 hover:from-amber-500 hover:to-amber-600 active:scale-98 text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-lg border-2 border-amber-300 flex items-center justify-center gap-2 tracking-wide cursor-pointer"
        >
          <span className="text-xl">📟</span>
          <span>BUKA LAYAR KASIR TOKO (POS TABLET)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 7. MODALS SIMPEL & JELAS                                                  */}
      {/* ========================================================================= */}

      {/* MODAL 1: KELOLA 10 TOKO & SEWA */}
      {activeModal === 'toko' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/60">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🏢</span>
                <div>
                  <h3 className="font-black text-sm text-slate-900">10 Toko &amp; Biaya Sewa/Wifi</h3>
                  <p className="text-[10px] text-slate-500">Ketik sewa ruko &amp; Wi-Fi untuk potong omzet harian</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 flex-1 text-xs">
              {cabangList.map(c => (
                <div key={c.id} className="p-3 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-[10px] text-slate-400">#{c.nomor} • {c.kode}</span>
                      <h4 className="font-extrabold text-xs text-slate-900">{c.nama}</h4>
                      <p className="text-[10px] text-slate-500">{c.kota} • PJ: {c.pj_nama || 'Kepala Toko'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEditCabang(c)}
                      className="px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center space-x-1 shadow-xs cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Ubah</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200/60 text-[10px]">
                    <div>
                      <span className="text-slate-500 block">Sewa Ruko:</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(c.sewa_bulanan || 3500000)}/bln</span>
                      <span className="text-[9px] text-slate-400 block font-mono">≈ {formatRupiah(Math.round((c.sewa_bulanan || 3500000) / 30))}/hr</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Wi-Fi &amp; Listrik:</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(c.listrik_air_bulanan || 650000)}/bln</span>
                      <span className="text-[9px] text-slate-400 block font-mono">≈ {formatRupiah(Math.round((c.listrik_air_bulanan || 650000) / 30))}/hr</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PRESENSI & GAJI STAF */}
      {activeModal === 'gaji' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/60">
              <div className="flex items-center space-x-2">
                <span className="text-xl">👥</span>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Presensi &amp; Gaji Karyawan</h3>
                  <p className="text-[10px] text-slate-500">Cek staf hadir &amp; kelola utang pemotong gaji</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-tab Pill: [ 📅 Staf Hadir ] vs [ 💰 Rekap Upah & Utang ] */}
            <div className="p-2.5 bg-slate-100 border-b border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGajiModalTab('absensi')}
                className={`flex-1 py-1.5 px-2 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  gajiModalTab === 'absensi'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>📅 Hadir Hari Ini</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  gajiModalTab === 'absensi' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {targetAbsensiToday.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setGajiModalTab('utang')}
                className={`flex-1 py-1.5 px-2 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  gajiModalTab === 'utang'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>💰 Rekap &amp; Utang</span>
              </button>
            </div>

            {/* TAB 1: ABSENSI MASUK HARI INI */}
            {gajiModalTab === 'absensi' && (
              <div className="p-3.5 overflow-y-auto space-y-2.5 flex-1 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-xs text-emerald-950 block">
                      Total {targetAbsensiToday.length} Staf Hadir Kerja
                    </span>
                    <span className="text-[10px] text-emerald-800">
                      Fixed Cost Toko: -{formatRupiah(gajiStafHadir)}/hari
                    </span>
                  </div>
                  <span className="font-mono font-bold text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-lg">
                    {selectedDate}
                  </span>
                </div>

                {targetAbsensiToday.length === 0 ? (
                  <div className="text-center py-8 space-y-1 text-slate-400">
                    <p className="font-bold text-slate-700 text-xs">Belum ada staf yang clock-in hari ini</p>
                    <p className="text-[10px]">Presensi staf masuk otomatis saat shift kasir dibuka.</p>
                  </div>
                ) : (
                  targetAbsensiToday.map(abs => {
                    const kar = karyawanList.find(k => k.id === abs.karyawan_id);
                    const cbg = cabangList.find(c => c.id === abs.cabang_id);
                    return (
                      <div key={abs.id} className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-xs text-slate-900">{abs.karyawan_nama || kar?.nama}</h4>
                            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                              🟢 {abs.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                            {cbg?.nama || 'Outlet'} • Jam: <span className="font-mono font-bold text-slate-800">{abs.jam_masuk || '08:00'}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 block">Upah Harian:</span>
                          <span className="font-mono font-black text-xs text-emerald-800">
                            {formatRupiah(abs.upah_harian_terhitung || kar?.gaji_harian || 100000)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: REKAP HARI KERJA & KETIK UTANG */}
            {gajiModalTab === 'utang' && (
              <div className="p-3.5 overflow-y-auto space-y-2.5 flex-1 text-xs">
                {karyawanList.filter(k => k.role !== 'owner').map(kar => {
                  const branch = cabangList.find(c => c.id === kar.cabang_id);
                  const absensiCount = absensiList.filter(a => a.karyawan_id === kar.id && (a.status === 'hadir' || a.status === 'setengah_hari')).length;
                  const upahTotal = absensiCount * (kar.gaji_harian || 100000);
                  const currentUtang = kar.utang_nominal || 0;
                  const gajiBersih = Math.max(0, upahTotal - currentUtang);
                  const isEditingThis = editingUtangKaryawanId === kar.id;

                  return (
                    <div key={kar.id} className="p-3 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900">{kar.nama}</h4>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {branch?.nama || 'Outlet'} • {kar.role}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {absensiCount} Hari Hadir
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1 bg-white p-2 rounded-xl border border-slate-200 text-[10px]">
                        <div>
                          <span className="text-slate-400 block">Upah:</span>
                          <span className="font-mono font-bold text-slate-900">{formatRupiah(upahTotal)}</span>
                        </div>

                        {/* Kolom Potong Utang / Bon */}
                        <div>
                          <span className="text-rose-500 font-bold block">Potong Utang:</span>
                          {isEditingThis ? (
                            <div className="flex items-center space-x-1 mt-0.5">
                              <input
                                type="text"
                                value={utangInputValue === 0 ? '' : formatNominal(utangInputValue)}
                                onChange={(e) => setUtangInputValue(parseNominal(e.target.value))}
                                placeholder="0"
                                className="w-16 px-1 py-0.5 border border-rose-300 rounded font-mono font-bold text-[10px]"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveUtang(kar.id)}
                                disabled={savingUtang}
                                className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[9px] font-bold"
                              >
                                OK
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1 mt-0.5">
                              <span className="font-mono font-bold text-rose-700">-{formatRupiah(currentUtang)}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingUtangKaryawanId(kar.id);
                                  setUtangInputValue(currentUtang);
                                }}
                                className="text-amber-700 hover:text-amber-900 font-bold text-[9px] underline ml-0.5 cursor-pointer"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>

                        <div>
                          <span className="text-emerald-700 font-bold block">Gaji Bersih:</span>
                          <span className="font-mono font-black text-emerald-800">{formatRupiah(gajiBersih)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: STOK BAHAN KASIR + TOMBOL KIRIM PUSAT */}
      {activeModal === 'bahan' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/60">
              <div className="flex items-center space-x-2">
                <span className="text-xl">📦</span>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Stok Bahan Toko &amp; Kirim Pusat</h3>
                  <p className="text-[10px] text-slate-500">Cek rekap fisik kasir + tambah pasokan pusat</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tombol Besar Tambah Pasokan Kiriman Bahan dari Pusat */}
            <div className="p-3 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
              <div>
                <span className="font-extrabold text-xs text-emerald-950 block">Kirim Pasokan dari Pusat?</span>
                <span className="text-[10px] text-emerald-800">Catat pasokan adonan serabi &amp; rempah</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  onOpenKirimanModal(selectedCabangId !== 'all' ? selectedCabangId : undefined);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-xs flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Kirim Bahan</span>
              </button>
            </div>

            <div className="p-3.5 overflow-y-auto space-y-2 flex-1 text-xs">
              {bahanList.map(bhn => (
                <div key={bhn.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-[9px] text-slate-400">{bhn.kode}</span>
                    <h4 className="font-bold text-slate-900 text-xs">{bhn.nama}</h4>
                    <span className="text-[10px] text-slate-500 capitalize">{bhn.kategori} • {bhn.satuan}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                    ✓ Terpantau
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: MENU & MODAL HPP */}
      {activeModal === 'menu' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-orange-50/60">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🥞</span>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Modal HPP Menu Serabi &amp; Wedang</h3>
                  <p className="text-[10px] text-slate-500">Ketik modal per porsi untuk memotong omzet harian</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 overflow-y-auto space-y-2 flex-1 text-xs">
              {menuList.map(item => {
                const isEditingThis = editingMenuHppId === item.id;
                const currentHpp = item.hpp || (item.kategori_id === 'kat-wg' ? 4000 : 5000);

                return (
                  <div key={item.id} className="p-2.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[9px] text-slate-400">{item.kode} • {item.kategori_nama || 'Menu'}</span>
                      <h4 className="font-extrabold text-xs text-slate-900">{item.nama}</h4>
                      <span className="text-[10px] font-mono text-slate-600">Jual: {formatRupiah(item.harga)}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block">Modal HPP:</span>
                      {isEditingThis ? (
                        <div className="flex items-center space-x-1 mt-0.5">
                          <input
                            type="text"
                            value={hppInputValue === 0 ? '' : formatNominal(hppInputValue)}
                            onChange={(e) => setHppInputValue(parseNominal(e.target.value))}
                            placeholder="0"
                            className="w-16 px-1 py-0.5 border border-emerald-400 rounded font-mono font-bold text-[10px]"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveHpp(item.id)}
                            disabled={savingHpp}
                            className="px-1.5 py-0.5 bg-emerald-700 text-white rounded text-[9px] font-bold"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 mt-0.5">
                          <span className="font-mono font-black text-rose-600 text-xs">{formatRupiah(currentHpp)}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMenuHppId(item.id);
                              setHppInputValue(currentHpp);
                            }}
                            className="text-amber-700 hover:text-amber-900 font-bold text-[9px] underline ml-0.5 cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: RIWAYAT KASIR & OJOL */}
      {activeModal === 'riwayat' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/60">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🛵</span>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Riwayat Struk Kasir &amp; Ojol</h3>
                  <p className="text-[10px] text-slate-500">Filter transaksi Tunai, Shopee, Gojek, Grab</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value as any)}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold text-xs"
              >
                <option value="all">Semua Channel</option>
                <option value="tunai">💵 Tunai (Laci)</option>
                <option value="qris">📱 QRIS (BCA / E-Wallet)</option>
                <option value="shopeefood">🟠 ShopeeFood</option>
                <option value="gofood">🛵 GoFood</option>
                <option value="grabfood">🟢 GrabFood</option>
              </select>
              <span className="font-mono text-[11px] text-slate-500 font-bold">{selectedDate}</span>
            </div>

            <div className="p-3.5 overflow-y-auto space-y-2 flex-1 text-xs">
              {targetTrx.filter(t => {
                if (channelFilter === 'all') return true;
                if (channelFilter === 'tunai') return t.metode_bayar === 'tunai' || !t.metode_bayar;
                return t.metode_bayar === channelFilter;
              }).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Belum ada transaksi pada channel ini.
                </div>
              ) : (
                targetTrx.filter(t => {
                  if (channelFilter === 'all') return true;
                  if (channelFilter === 'tunai') return t.metode_bayar === 'tunai' || !t.metode_bayar;
                  return t.metode_bayar === channelFilter;
                }).map(trx => {
                  const itemsStr = trx.items.map(it => `${it.qty}x ${it.nama_menu}`).join(', ');
                  return (
                    <div key={trx.id} className="p-2.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-[9px] text-slate-400">#{trx.invoice_no}</span>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-slate-200 text-slate-800">
                            {trx.metode_bayar || 'Tunai'}
                          </span>
                        </div>
                        <p className="font-extrabold text-xs text-slate-900 truncate mt-0.5">{itemsStr}</p>
                        <span className="text-[9px] text-slate-400 font-mono block">{formatWaktu(trx.waktu)}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-xs text-slate-900 block">{formatRupiah(trx.total)}</span>
                        <span className="text-[9px] text-emerald-700 font-bold">✓ Sukses</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: POSISI UANG (LACI & DOMPET DIGITAL) */}
      {activeModal === 'posisi_uang' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/60">
              <div className="flex items-center space-x-2">
                <span className="text-xl">💳</span>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Posisi Uang Penjualan Hari Ini</h3>
                  <p className="text-[10px] text-slate-500">Uang omzet tersimpan di laci fisik &amp; akun ojol</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto text-xs">
              {/* Tunai Laci */}
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="text-2xl">💵</span>
                  <div>
                    <span className="font-black text-xs text-emerald-950 block">Tunai di Laci Kasir</span>
                    <span className="text-[10px] text-emerald-700">Uang fisik cash di meja kasir</span>
                  </div>
                </div>
                <span className="font-mono font-black text-sm text-emerald-900">{formatRupiah(tunaiLaci)}</span>
              </div>

              {/* QRIS (BCA / All E-Wallet) */}
              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="text-2xl">📱</span>
                  <div>
                    <span className="font-black text-xs text-blue-950 block">QRIS Dinamis</span>
                    <span className="text-[10px] text-blue-700">Scan QR langsung masuk rekening BCA Pak Agan</span>
                  </div>
                </div>
                <span className="font-mono font-black text-sm text-blue-900">{formatRupiah(qrisTotal)}</span>
              </div>

              {/* ShopeePay */}
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="text-2xl">🟠</span>
                  <div>
                    <span className="font-black text-xs text-amber-950 block">ShopeePay / ShopeeFood</span>
                    <span className="text-[10px] text-amber-700">Saldo dompet merchant Shopee</span>
                  </div>
                </div>
                <span className="font-mono font-black text-sm text-amber-900">{formatRupiah(shopeePay)}</span>
              </div>

              {/* GoPay */}
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="text-2xl">🛵</span>
                  <div>
                    <span className="font-black text-xs text-rose-950 block">GoPay / GoFood</span>
                    <span className="text-[10px] text-rose-700">Saldo GoBiz merchant</span>
                  </div>
                </div>
                <span className="font-mono font-black text-sm text-rose-900">{formatRupiah(goPay)}</span>
              </div>

              {/* GrabFood */}
              <div className="p-3 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="text-2xl">🟢</span>
                  <div>
                    <span className="font-black text-xs text-green-950 block">GrabFood / OVO</span>
                    <span className="text-[10px] text-green-700">Saldo GrabMerchant</span>
                  </div>
                </div>
                <span className="font-mono font-black text-sm text-green-900">{formatRupiah(grabFood)}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-black">
                <span className="text-slate-700">Total Omzet Kasir:</span>
                <span className="font-mono text-slate-900 text-sm">{formatRupiah(omzetKotor)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: RINCIAN UANG BERSIH MASUK REKENING BCA PAK AGAN */}
      {activeModal === 'uang_bersih_detail' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950">
              <div className="flex items-center space-x-2">
                <span className="text-xl">💰</span>
                <div>
                  <h3 className="font-black text-sm">Rincian Bersih Masuk Rekening BCA</h3>
                  <p className="text-[10px] text-amber-950 font-bold">Otomatis terhitung per hari</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-950/20 text-slate-950 flex items-center justify-center cursor-pointer font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl space-y-2 border border-slate-200">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Total Omzet Penjualan Kasir:</span>
                  <span className="font-mono font-bold text-slate-900">+{formatRupiah(omzetKotor)}</span>
                </div>
                <div className="flex justify-between items-center text-rose-600">
                  <span>Fixed Cost (Sewa, Wi-Fi, Gaji Staf):</span>
                  <span className="font-mono font-bold">-{formatRupiah(totalFixedCostHarian)}</span>
                </div>
                <div className="flex justify-between items-center text-rose-600">
                  <span>Variable Cost (Modal Bahan HPP):</span>
                  <span className="font-mono font-bold">-{formatRupiah(totalVariableCostHarian)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="font-black text-slate-900">Uang Bersih Boss:</span>
                  <span className="font-mono font-black text-base text-amber-600">{formatRupiah(uangBersihBoss)}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Rekening Tujuan Transfer:</span>
                </div>
                <p className="font-mono font-black text-sm text-slate-900 pl-5">
                  BCA 8820-192-881
                </p>
                <p className="text-[11px] text-slate-600 pl-5">
                  a/n Pak Agan
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: RINCIAN FIXED COST DETAIL */}
      {activeModal === 'fixed_cost_detail' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-amber-50">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🏢</span>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Rincian Fixed Cost Toko / Hari</h3>
                  <p className="text-[10px] text-slate-500">Biaya sewa, Wi-Fi, dan gaji karyawan toko hadir</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl space-y-2 border border-slate-200">
                <div className="flex justify-between items-center text-slate-700">
                  <span>• Sewa Ruko Cabang:</span>
                  <span className="font-mono font-bold text-slate-900">-{formatRupiah(sewaHarian)}/hr</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>• Wi-Fi &amp; Listrik Toko:</span>
                  <span className="font-mono font-bold text-slate-900">-{formatRupiah(wifiHarian)}/hr</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>• Gaji Staf Hadir ({targetAbsensiToday.length} staf):</span>
                  <span className="font-mono font-bold text-rose-600">-{formatRupiah(gajiStafHadir)}/hr</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-black">
                  <span className="text-slate-900">Total Fixed Cost:</span>
                  <span className="font-mono text-rose-600 text-sm">-{formatRupiah(totalFixedCostHarian)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  if (activeCabang) onEditCabang(activeCabang);
                }}
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Ubah Biaya Sewa &amp; Wi-Fi Toko</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 9: RINCIAN VARIABLE COST / HPP MODAL */}
      {activeModal === 'variable_cost_detail' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-orange-50">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🥞</span>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Rincian Variable Cost (Modal Bahan HPP)</h3>
                  <p className="text-[10px] text-slate-500">Otomatis terpotong sesuai porsi yang terjual di kasir</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl space-y-2 border border-slate-200">
                <div className="flex justify-between items-center text-slate-700">
                  <span>Modal HPP Bahan Terpakai:</span>
                  <span className="font-mono font-black text-rose-600 text-sm">-{formatRupiah(totalHppBahan)}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Dihitung otomatis per porsi serabi bakar tanah liat dan wedang rempah yang terjual hari ini.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveModal('menu');
                }}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Atur Modal HPP Menu Serabi &amp; Wedang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 10: KAS KECIL & BELANJA TOKO */}
      {activeModal === 'kas_kecil' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-teal-50">
              <div className="flex items-center space-x-2">
                <span className="text-xl">📝</span>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Belanja Toko &amp; Kas Kecil</h3>
                  <p className="text-[10px] text-slate-500">Persetujuan belanja darurat kasir cabang</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-teal-50/80 border-b border-teal-200 flex items-center justify-between">
              <div>
                <span className="font-black text-xs text-teal-950 block">Catat Belanja Operasional</span>
                <span className="text-[10px] text-teal-700">Gas elpiji, plastik kresek, es batu, dll</span>
              </div>
              {onOpenExpenseCreate && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    onOpenExpenseCreate();
                  }}
                  className="px-3 py-1.5 bg-teal-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer"
                >
                  + Tambah
                </button>
              )}
            </div>

            <div className="p-3.5 overflow-y-auto space-y-2 flex-1 text-xs">
              {expenseList.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  Belum ada pengajuan kas kecil hari ini.
                </div>
              ) : (
                expenseList.slice(0, 10).map(exp => (
                  <div key={exp.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[9px] text-slate-400">{exp.id}</span>
                      <h4 className="font-bold text-slate-900 text-xs">{exp.keperluan}</h4>
                      <span className="text-[10px] text-slate-500">{exp.pemohon_nama} • {exp.cabang_nama}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-black text-xs text-slate-900 block">{formatRupiah(exp.nominal)}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                        exp.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        exp.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {exp.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 11: KELOLA AKUN & PIN */}
      {activeModal === 'akun' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50">
              <div className="flex items-center space-x-2">
                <span className="text-xl">⚙️</span>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Kelola Akun, Sandi &amp; PIN</h3>
                  <p className="text-[10px] text-slate-500">Reset PIN tablet kasir &amp; kunci keamanan</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 overflow-y-auto space-y-2.5 flex-1 text-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Daftar Akun Karyawan &amp; Kasir:</span>
              {karyawanList.map(kar => (
                <div key={kar.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">{kar.nama}</h4>
                    <p className="text-[10px] text-slate-500 font-mono">
                      ID: {kar.username || kar.telepon} • Role: {kar.role}
                    </p>
                  </div>
                  {onOpenPinReset && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal(null);
                        onOpenPinReset(kar);
                      }}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      Reset PIN
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
