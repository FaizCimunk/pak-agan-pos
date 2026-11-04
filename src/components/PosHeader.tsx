'use client';

import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Wifi, 
  WifiOff, 
  Printer, 
  RefreshCw, 
  DollarSign, 
  LogOut,
  Lock,
  Settings,
  FileText,
  CalendarCheck,
  ShoppingBag,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  PackageCheck
} from 'lucide-react';
import { Cabang, Shift } from '@/lib/types';
import { printerService } from '@/lib/printer';
import { getPendingTransactions, executeAutoSync } from '@/lib/offline-sync';
import { db } from '@/lib/db';
import { formatRupiah } from '@/lib/utils';

interface PosHeaderProps {
  currentCabang: Cabang;
  activeShift: Shift | null;
  onOpenShiftClick: () => void;
  onCloseShiftClick: () => void;
  onExpenseClick: () => void;
  onAttendanceClick?: () => void;
  onMaterialStockClick?: () => void;
  onDailyReportClick?: () => void;
  onDeviceSettingsClick: () => void;
}

export default function PosHeader({
  currentCabang,
  activeShift,
  onOpenShiftClick,
  onCloseShiftClick,
  onExpenseClick,
  onAttendanceClick,
  onMaterialStockClick,
  onDailyReportClick,
  onDeviceSettingsClick,
}: PosHeaderProps) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [printerConnected, setPrinterConnected] = useState<boolean>(false);
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = async () => {
      setIsOnline(true);
      await checkAndSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkPending();
    const interval = setInterval(checkPending, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const checkPending = async () => {
    const list = await getPendingTransactions();
    setPendingSyncCount(list.length);
  };

  const checkAndSync = async () => {
    setIsSyncing(true);
    try {
      await executeAutoSync(async (transactions) => {
        for (const trx of transactions) {
          await db.createTransaksi({ ...trx, is_offline_synced: true });
        }
        return true;
      });
      await checkPending();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectPrinter = async () => {
    const res = await printerService.connect();
    if (res.success) {
      setPrinterConnected(true);
      setPrinterName(res.name || 'Printer Kasir');
    } else {
      alert(res.message || 'Gagal menyambung ke Bluetooth');
    }
  };

  const handleLogout = () => {
    if (confirm('Keluar dari sesi tablet kasir?')) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pakagan_kasir_session');
        window.location.href = '/';
      }
    }
  };

  // Shorten cashier name on mobile screens
  const shortCashierName = activeShift?.karyawan_nama
    ? activeShift.karyawan_nama.split('(')[0].trim()
    : 'Kasir';

  return (
    <>
      {/* Kasgo-Style Header with Full Mobile Responsiveness */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-soft-sm">
        
        {/* DESKTOP & TABLET BAR (Screens >= sm / 640px) */}
        <div className="hidden sm:flex px-4 py-2 items-center justify-between">
          {/* Left: Brand Identity & Locked Cabang */}
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-950 border border-emerald-500/40 flex items-center justify-center text-white shadow-md shadow-emerald-950/20 shrink-0">
              <div className="flex items-center justify-center -space-x-1 drop-shadow-md">
                <span className="text-base select-none transform -rotate-6">🥞</span>
                <span className="text-base select-none transform rotate-6">🍵</span>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight leading-none">
                  SERABI BAWEL &amp; WEDANG GEPREK
                </span>
                <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold shrink-0">
                  <Lock className="w-2.5 h-2.5 text-emerald-600" />
                  <span>{currentCabang.kode} • {currentCabang.nama.split('-')[1]?.trim() || currentCabang.nama}</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                Kasir Outlet • Cabang Resmi
              </div>
            </div>
          </div>

          {/* Right: Status & Menu Toko */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {activeShift ? (
              <button
                onClick={() => setIsMenuOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50/90 hover:bg-emerald-100/90 border border-emerald-200/90 rounded-xl text-xs transition-colors group cursor-pointer"
                title="Klik untuk buka Menu Toko"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100 animate-pulse shrink-0"></span>
                <span className="font-extrabold text-emerald-900">{shortCashierName}</span>
                <span className="text-emerald-300">|</span>
                <span className="font-mono font-black text-emerald-800">
                  {formatRupiah(activeShift.saldo_akhir_sistem)}
                </span>
              </button>
            ) : (
              <button
                onClick={onOpenShiftClick}
                className="px-3.5 py-1.5 bg-accent-gold text-white text-xs font-black rounded-xl hover:bg-amber-600 transition-all shadow-md shadow-amber-600/25 btn-tactile"
              >
                + Buka Shift
              </button>
            )}

            {pendingSyncCount > 0 && (
              <button 
                onClick={checkAndSync}
                disabled={isSyncing || !isOnline}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-accent-gold border border-amber-200 hover:bg-amber-100 transition-colors shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline font-mono">{pendingSyncCount} Sync</span>
              </button>
            )}

            <div 
              className={`p-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 shrink-0 ${
                isOnline 
                  ? 'bg-slate-50 text-slate-600 border-slate-200' 
                  : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
              }`}
              title={isOnline ? 'Koneksi Online' : 'Koneksi Terputus (Mode Offline)'}
            >
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-rose-600" />
              )}
            </div>

            <button
              onClick={handleConnectPrinter}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 shrink-0 ${
                printerConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
              title={printerConnected ? `Printer tersambung: ${printerName}` : 'Klik untuk sambung printer thermal'}
            >
              <Printer className={`w-3.5 h-3.5 ${printerConnected ? 'text-emerald-700' : 'text-slate-500'}`} />
              <span className="hidden xl:inline text-[11px]">
                {printerConnected ? (printerName || 'Printer ON') : 'Printer BT'}
              </span>
            </button>

            <button
              onClick={() => setIsMenuOpen(true)}
              className="flex items-center space-x-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-900/20 transition-all btn-tactile shrink-0"
            >
              <Menu className="w-4 h-4" />
              <span>Menu Toko</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors shrink-0"
              title="Keluar dari Tablet Kasir"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MOBILE SMARTPHONE BAR (< 640px Screen - Zero Overflow, 100% Fit) */}
        <div className="sm:hidden px-3 py-2 space-y-2">
          {/* Top Bar: Brand, Locked Branch, and Menu Toko */}
          <div className="flex items-center justify-between gap-2">
            
            {/* Brand + Branch */}
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-950 border border-emerald-500/30 flex items-center justify-center text-white shadow-sm shrink-0">
                <div className="flex items-center justify-center -space-x-1 text-xs">
                  <span>🥞</span>
                  <span>🍵</span>
                </div>
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-slate-900 text-xs block leading-tight truncate">
                  SERABI BAWEL
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md inline-block">
                  {currentCabang.kode}
                </span>
              </div>
            </div>

            {/* Right: Tactile Menu Toko + Quick Logout */}
            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 text-white font-black text-xs shadow-md shadow-emerald-900/20 btn-tactile"
              >
                <Menu className="w-3.5 h-3.5" />
                <span>Menu Toko</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                title="Keluar"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

          {/* Bottom Bar: Cashier & Cash in Drawer Status Pill */}
          {activeShift ? (
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="w-full flex items-center justify-between px-3 py-1.5 bg-emerald-50/90 border border-emerald-200/80 rounded-xl text-xs font-bold text-emerald-950"
            >
              <div className="flex items-center space-x-1.5 min-w-0 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 animate-pulse shrink-0" />
                <span className="truncate">{shortCashierName}</span>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0 font-mono">
                <span className="text-[10px] text-emerald-700 font-sans font-medium">Kas Laci:</span>
                <span className="font-black text-emerald-900">{formatRupiah(activeShift.saldo_akhir_sistem)}</span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenShiftClick}
              className="w-full py-1.5 bg-accent-gold text-white text-xs font-black rounded-xl hover:bg-amber-600 text-center shadow-xs"
            >
              + Buka Shift Kasir Hari Ini
            </button>
          )}

        </div>

      </header>

      {/* Kasgo-Style Operational Modal Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Color Accent */}
            <div className="h-2 bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-700 shrink-0" />

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-700 flex items-center justify-center text-white shadow-md shadow-emerald-900/20 shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                    Menu Operasional Toko
                  </h3>
                  <p className="text-xs text-slate-500 font-medium truncate">
                    {currentCabang.nama} • Kasir: <span className="font-bold text-slate-700">{shortCashierName}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Kasgo Touch Grid Tiles */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">

                {/* Tile 1: Laporan Kasir & Rekonsiliasi Kas */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDailyReportClick?.();
                  }}
                  className="flex items-start p-3.5 sm:p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-left transition-all btn-tactile group shadow-md shadow-slate-950/20 border border-slate-800"
                >
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-800 group-hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0 mr-3 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-white text-xs sm:text-sm truncate">Laporan Kasir</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 shrink-0">
                        Formal Hitam
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-300 font-normal leading-relaxed">
                      Rekonsiliasi kas laci fisik vs sistem &amp; cetak PDF formal tinta hitam.
                    </p>
                  </div>
                </button>

                {/* Tile 2: Belanja Toko & Kasbon */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onExpenseClick();
                  }}
                  className="flex items-start p-3.5 sm:p-4 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-left transition-all btn-tactile group shadow-soft-sm"
                >
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mr-3 shadow-md shadow-amber-600/20">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-amber-950 text-xs sm:text-sm truncate">Belanja Toko</span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 border border-amber-300 shrink-0">
                        Approval WA
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-amber-900/80 font-normal leading-relaxed">
                      Ajukan beli gas LPG, es batu, atau bahan darurat via kas laci.
                    </p>
                  </div>
                </button>

                {/* Tile 3: Presensi Staf Cabang */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onAttendanceClick?.();
                  }}
                  className="flex items-start p-3.5 sm:p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-left transition-all btn-tactile group shadow-soft-sm"
                >
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mr-3 shadow-md shadow-emerald-700/20">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-emerald-950 text-xs sm:text-sm truncate">Presensi Staf</span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 border border-emerald-300 shrink-0">
                        Tulis Nama
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-emerald-900/80 font-normal leading-relaxed">
                      Absensi kehadiran harian, tulis nama staf, &amp; upah hari ini.
                    </p>
                  </div>
                </button>

                {/* Tile 3.5: Absensi Bahan Harian Kasir */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onMaterialStockClick?.();
                  }}
                  className="flex items-start p-3.5 sm:p-4 rounded-2xl bg-teal-50 hover:bg-teal-100/80 border border-teal-200 text-left transition-all btn-tactile group shadow-soft-sm"
                >
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 mr-3 shadow-md shadow-teal-800/20">
                    <PackageCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-teal-950 text-xs sm:text-sm truncate">Absensi Bahan</span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-200/70 text-teal-900 border border-teal-300 shrink-0">
                        ⚡ Dari Kasir
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-teal-900/80 font-normal leading-relaxed">
                      Cek stok bahan, pemakaian otomatis dari kasir, &amp; selisih dapur.
                    </p>
                  </div>
                </button>

                {/* Tile 4: Tutup Shift Kasir */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onCloseShiftClick();
                  }}
                  className="flex items-start p-3.5 sm:p-4 rounded-2xl bg-rose-50 hover:bg-rose-100/80 border border-rose-200 text-left transition-all btn-tactile group shadow-soft-sm"
                >
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 mr-3 shadow-md shadow-rose-700/20">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-rose-950 text-xs sm:text-sm truncate">Tutup Shift Kasir</span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-200/70 text-rose-900 border border-rose-300 shrink-0">
                        Akhiri Hari
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-rose-900/80 font-normal leading-relaxed">
                      Hitung fisik uang kas laci, selisih kas, &amp; kunci pembukuan shift.
                    </p>
                  </div>
                </button>

                {/* Tile 5: Printer Bluetooth */}
                <button
                  type="button"
                  onClick={() => {
                    handleConnectPrinter();
                  }}
                  className="flex items-start p-3.5 sm:p-4 rounded-2xl bg-sky-50 hover:bg-sky-100/80 border border-sky-200 text-left transition-all btn-tactile group shadow-soft-sm"
                >
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 mr-3 shadow-md shadow-sky-700/20">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-sky-950 text-xs sm:text-sm truncate">Printer Bluetooth</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${
                        printerConnected 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                          : 'bg-slate-200 text-slate-700 border-slate-300'
                      }`}>
                        {printerConnected ? '✓ Terhubung' : 'Sambungkan'}
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-sky-900/80 font-normal leading-relaxed">
                      {printerConnected 
                        ? `Tersambung ke ${printerName || 'Printer 58mm'}. Struk langsung cetak otomatis.` 
                        : 'Klik untuk mencari & memasangkan printer thermal Bluetooth 58mm.'}
                    </p>
                  </div>
                </button>

                {/* Tile 6: Kunci Perangkat Tablet */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDeviceSettingsClick();
                  }}
                  className="flex items-start p-3.5 sm:p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all btn-tactile group shadow-soft-sm"
                >
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-700 text-white flex items-center justify-center shrink-0 mr-3 shadow-md shadow-slate-800/20">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-slate-900 text-xs sm:text-sm truncate">Kunci Tablet Cabang</span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300 shrink-0">
                        PIN Otorisasi
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-600 font-normal leading-relaxed">
                      Setup perpindahan tablet ke cabang lain atau ganti identitas mesin POS.
                    </p>
                  </div>
                </button>

              </div>
            </div>

            {/* Modal Footer: Current Cash in Drawer & Logout */}
            <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center space-x-2 text-xs text-slate-600 w-full sm:w-auto justify-between sm:justify-start">
                <span className="font-medium">Kas Laci Saat Ini:</span>
                <span className="font-mono font-black text-emerald-800 text-sm">
                  {activeShift ? formatRupiah(activeShift.saldo_akhir_sistem) : 'Rp 0'}
                </span>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center space-x-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar Kasir</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
