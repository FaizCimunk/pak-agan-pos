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
  PackageCheck,
  KeyRound,
  Sparkles,
  Clock,
  RotateCw
} from 'lucide-react';
import { Cabang, Shift } from '@/lib/types';
import { printerService } from '@/lib/printer';
import { countAllPendingSync } from '@/lib/offline-sync';
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
  onOpenBillsClick?: () => void;
  openBillsCount?: number;
  orientationMode?: 'portrait' | 'landscape';
  onToggleOrientation?: () => void;
  orientationFeedback?: string | null;
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
  onOpenBillsClick,
  openBillsCount = 0,
  orientationMode = 'portrait',
  onToggleOrientation,
  orientationFeedback = null,
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
    window.addEventListener('pak_agan_offline_queue_updated', checkPending);

    checkPending();
    const interval = setInterval(checkPending, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pak_agan_offline_queue_updated', checkPending);
      clearInterval(interval);
    };
  }, []);

  const checkPending = async () => {
    const total = await countAllPendingSync();
    setPendingSyncCount(total);
  };

  const checkAndSync = async () => {
    setIsSyncing(true);
    try {
      await db.syncAllOfflineQueues();
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
        sessionStorage.removeItem('pakagan_user');
        localStorage.removeItem('pakagan_kasir_session');
        localStorage.removeItem('pakagan_user');
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
        
        {/* DESKTOP & TABLET / LANDSCAPE BAR (Screens >= sm / 640px) */}
        <div className="pos-header-bar hidden sm:flex px-2 sm:px-3 lg:px-4 py-0.5 sm:py-1 lg:py-1.5 items-center justify-between gap-1.5 sm:gap-2">
          {/* Left: Brand Identity & Locked Cabang */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-11 lg:h-11 rounded-lg lg:rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-950 border border-emerald-500/40 flex items-center justify-center text-white shadow-md shadow-emerald-950/20 shrink-0">
              <div className="flex items-center justify-center -space-x-1 drop-shadow-md">
                <span className="text-xs sm:text-sm lg:text-base select-none transform -rotate-6">🥞</span>
                <span className="text-xs sm:text-sm lg:text-base select-none transform rotate-6">🍵</span>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-extrabold text-slate-900 text-xs lg:text-base tracking-tight leading-none truncate">
                  <span className="hidden lg:inline">SERABI BAWEL &amp; WEDANG GEPREK</span>
                  <span className="lg:hidden">SERABI BAWEL</span>
                </span>
                <div className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] sm:text-[10px] font-extrabold shrink-0">
                  <Lock className="w-2.5 h-2.5 text-emerald-600" />
                  <span>{currentCabang?.kode || 'CBG'}</span>
                  <span className="hidden xl:inline">• {currentCabang?.nama?.split('-')[1]?.trim() || currentCabang?.nama || 'Cabang'}</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5 hidden md:block">
                Kasir Outlet • Cabang Resmi
              </div>
            </div>
          </div>

          {/* Right: Status, Putar Layar & Menu Toko */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 lg:space-x-2.5 shrink-0">
            {activeShift ? (
              <button
                onClick={() => setIsMenuOpen(true)}
                className="flex items-center space-x-1.5 px-2 py-1 bg-emerald-50/90 hover:bg-emerald-100/90 border border-emerald-200/90 rounded-xl text-[10px] sm:text-[11px] lg:text-xs transition-colors group cursor-pointer"
                title="Klik untuk buka Menu Toko"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100 animate-pulse shrink-0"></span>
                <span className="font-extrabold text-emerald-900 max-w-[80px] lg:max-w-none truncate">{shortCashierName}</span>
                <span className="text-emerald-300">|</span>
                <span className="font-mono font-black text-emerald-800">
                  {formatRupiah(activeShift.saldo_akhir_sistem)}
                </span>
              </button>
            ) : (
              <button
                onClick={onOpenShiftClick}
                className="px-2.5 py-1 bg-accent-gold text-white text-xs font-black rounded-xl hover:bg-amber-600 transition-all shadow-md shadow-amber-600/25 btn-tactile"
              >
                + Buka Shift
              </button>
            )}

            {/* Quick Open Bills Button */}
            <button
              type="button"
              onClick={onOpenBillsClick}
              className={`flex items-center space-x-1 px-2 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all border shrink-0 btn-tactile ${
                openBillsCount > 0
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-500/30 animate-pulse'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title="Daftar Tagihan Belum Dibayar (Bayar Nanti)"
            >
              <Clock className="w-3 h-3" />
              <span className="font-extrabold">{openBillsCount} <span className="hidden lg:inline">Tagihan</span></span>
            </button>

            {pendingSyncCount > 0 && (
              <button 
                onClick={checkAndSync}
                disabled={isSyncing || !isOnline}
                className="flex items-center space-x-1 px-1.5 py-1 rounded-xl text-[10px] font-bold bg-amber-50 text-accent-gold border border-amber-200 hover:bg-amber-100 transition-colors shrink-0"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline font-mono">{pendingSyncCount}</span>
              </button>
            )}

            {onToggleOrientation && (
              <button
                type="button"
                onClick={onToggleOrientation}
                className={`flex items-center space-x-1 px-2 py-1 rounded-xl text-[10px] sm:text-[11px] font-extrabold border transition-all shrink-0 btn-tactile cursor-pointer ${
                  orientationMode === 'landscape'
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                    : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                }`}
                title={
                  orientationMode === 'landscape'
                    ? 'Terkunci Miring (Landscape) — Klik untuk kunci balik ke Potret'
                    : 'Terkunci Potret — Klik untuk miringkan & kunci Landscape'
                }
              >
                <RotateCw className="w-3 h-3" />
                <span>{orientationMode === 'landscape' ? 'Potret' : 'Miringkan'}</span>
              </button>
            )}

            <div 
              className={`px-2 py-1.5 rounded-xl border text-[11px] font-extrabold flex items-center gap-1 shrink-0 ${
                isOnline 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
              }`}
              title={isOnline ? 'Koneksi Online (Sinkronisasi Cloud Aktif)' : 'Koneksi Terputus (Mode Offline — Data Disimpan Lokal)'}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="hidden md:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span className="hidden md:inline">Offline</span>
                </>
              )}
            </div>

            <button
              onClick={handleConnectPrinter}
              className={`p-1.5 sm:px-2 lg:px-2.5 lg:py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 shrink-0 ${
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
              className="flex items-center space-x-1.5 px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white font-black text-xs lg:text-sm shadow-md shadow-emerald-900/20 transition-all btn-tactile shrink-0"
            >
              <Menu className="w-4 h-4" />
              <span>Menu Toko</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-1.5 lg:p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors shrink-0"
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
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md inline-block max-w-[130px] truncate">
                    {currentCabang?.kode || 'CBG'} • {currentCabang?.nama?.split('-')[1]?.trim() || currentCabang?.nama || 'Cabang'}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.2 rounded-md border ${
                      isOnline
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                    }`}
                  >
                    {isOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                    <span>{isOnline ? 'Mode Online' : 'Mode Offline'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Sync Badge + Putar Layar + Tactile Menu Toko + Quick Logout */}
            <div className="flex items-center space-x-1 shrink-0">
              {pendingSyncCount > 0 && (
                <button
                  type="button"
                  onClick={checkAndSync}
                  disabled={isSyncing || !isOnline}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{pendingSyncCount}</span>
                </button>
              )}

              {onToggleOrientation && (
                <button
                  type="button"
                  onClick={onToggleOrientation}
                  title={
                    orientationMode === 'landscape'
                      ? 'Terkunci Miring (Landscape) — Ketuk untuk balik ke Potret'
                      : 'Terkunci Potret (Berdiri) — Ketuk untuk miringkan ke Landscape'
                  }
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-[10px] font-black border transition-all btn-tactile ${
                    orientationMode === 'landscape'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  <RotateCw className="w-3 h-3" />
                  <span>{orientationMode === 'landscape' ? 'Potret' : 'Miring'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 text-white font-black text-xs shadow-md shadow-emerald-900/20 btn-tactile"
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
              className="w-full flex items-center justify-between px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-xs"
            >
              <span>+ Buka Shift &amp; Isi Kas Awal</span>
              <span className="font-mono bg-black/15 px-2 py-0.5 rounded-lg">Kas: Rp 0</span>
            </button>
          )}

        </div>

        {/* Slim Offline / Pending Sync Notice Banner */}
        {(!isOnline || pendingSyncCount > 0) && (
          <div
            className={`px-4 py-1 text-[11px] font-bold flex items-center justify-center gap-2 border-t ${
              !isOnline
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {!isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Mode Offline Aktif — Data tetap aman tersimpan lokal{pendingSyncCount > 0 ? ` (${pendingSyncCount} menunggu sinkronisasi)` : ''} &amp; otomatis terkirim saat internet nyala.
                </span>
              </>
            ) : (
              <>
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>
                  Mode Online — {pendingSyncCount} data offline menunggu sinkronisasi ke Cloud...
                </span>
              </>
            )}
          </div>
        )}

        {/* Slim Orientation Lock Feedback Banner */}
        {orientationFeedback && (
          <div className="px-4 py-1 text-[11px] font-bold flex items-center justify-center gap-2 border-t bg-indigo-50 text-indigo-800 border-indigo-200 animate-fadeIn">
            <RotateCw className="w-3.5 h-3.5 shrink-0" />
            <span>{orientationFeedback}</span>
          </div>
        )}

      </header>

      {/* Kasgo-Style Operational Modal Drawer (Fully Responsive for Landscape & Portrait) */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsMenuOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[94vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Color Accent */}
            <div className="h-1.5 bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-700 shrink-0" />

            {/* Modal Header - Compact for Landscape */}
            <div className="px-3.5 py-2.5 sm:px-5 sm:py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-xs shrink-0">
                  <Store className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 truncate leading-tight">
                    Menu Operasional Toko
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    {currentCabang?.nama || 'Cabang Resmi'} • Kasir: <span className="font-bold text-slate-700">{shortCashierName}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors shrink-0"
                title="Tutup Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dedicated Status Card: Saldo Kas Laci Kasir & Kontrol Shift (Jelas & Bebas Terpotong) */}
            <div className="mx-3.5 mt-2.5 sm:mx-5 sm:mt-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/90 shadow-2xs flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  💵
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                      Saldo Kas Laci Kasir
                    </span>
                    {activeShift && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-200 text-emerald-950">
                        Shift Aktif
                      </span>
                    )}
                  </div>
                  <div className="font-mono font-black text-sm sm:text-base text-emerald-950 tabular-nums truncate">
                    {activeShift ? formatRupiah(activeShift.saldo_akhir_sistem) : 'Shift Belum Dibuka (Rp 0)'}
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                {!activeShift ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenShiftClick();
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs transition-all btn-tactile flex items-center space-x-1"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Buka Shift</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onCloseShiftClick();
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 shadow-2xs transition-colors flex items-center space-x-1"
                  >
                    <span>Tutup Shift</span>
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body: Kasgo Touch Grid Tiles (Ultra Compact in Landscape) */}
            <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-2 sm:space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">

                {/* Tile 0: Tagihan Meja Belum Dibayar (Bayar Nanti) */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenBillsClick?.();
                  }}
                  className="flex items-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-amber-50 hover:bg-amber-100/90 border border-amber-300 text-left transition-all btn-tactile group shadow-2xs sm:col-span-2"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 mr-2.5 shadow-xs">
                    <Clock className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-black text-amber-950 text-xs sm:text-sm truncate">
                        Tagihan / Pesanan Aktif (Bayar Nanti)
                      </span>
                      <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 border border-amber-400 shrink-0">
                        {openBillsCount} Pesanan Aktif
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900/80 font-normal leading-tight line-clamp-1">
                      Kelola pesanan belum lunas, cetak tiket dapur 3 ruangan &amp; pelunasan.
                    </p>
                  </div>
                </button>

                {/* Tile 1: Belanja Toko & Kasbon */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onExpenseClick();
                  }}
                  className="flex items-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-amber-50 hover:bg-amber-100/90 border border-amber-200 text-left transition-all btn-tactile group shadow-2xs"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mr-2.5 shadow-xs">
                    <ShoppingBag className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-black text-amber-950 text-xs sm:text-sm truncate">Belanja Toko</span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300 shrink-0">
                        Approval
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900/80 font-normal leading-tight line-clamp-1">
                      Ajukan belanja operasional toko &amp; pantau status approval.
                    </p>
                  </div>
                </button>

                {/* Tile 2: Presensi Staf Cabang */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onAttendanceClick?.();
                  }}
                  className="flex items-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-200 text-left transition-all btn-tactile group shadow-2xs"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mr-2.5 shadow-xs">
                    <CalendarCheck className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-black text-emerald-950 text-xs sm:text-sm truncate">Presensi Staf</span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 border border-emerald-300 shrink-0">
                        Tulis Nama
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-900/80 font-normal leading-tight line-clamp-1">
                      Absensi kehadiran harian staf &amp; akumulasi upah hari ini.
                    </p>
                  </div>
                </button>

                {/* Tile 3: Buka Kasir / Shift jika belum aktif, atau Tutup Shift jika sudah aktif */}
                {activeShift ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onCloseShiftClick();
                    }}
                    className="flex items-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-rose-50 hover:bg-rose-100/90 border border-rose-200 text-left transition-all btn-tactile group shadow-2xs"
                  >
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 mr-2.5 shadow-xs">
                      <LogOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-black text-rose-950 text-xs sm:text-sm truncate">Tutup Shift Kasir</span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-rose-200/70 text-rose-900 border border-rose-300 shrink-0">
                          Akhiri Hari
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-900/80 font-normal leading-tight line-clamp-1">
                        Hitung fisik uang kas laci, selisih &amp; kunci pembukuan.
                      </p>
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenShiftClick();
                    }}
                    className="flex items-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-emerald-50 hover:bg-emerald-100/90 border-2 border-emerald-500 text-left transition-all btn-tactile group shadow-2xs animate-pulse"
                  >
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 mr-2.5 shadow-xs">
                      <KeyRound className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-black text-emerald-950 text-xs sm:text-sm truncate">Buka Kasir / Shift</span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 border border-emerald-300 shrink-0">
                          Wajib
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-900 font-semibold leading-tight line-clamp-1">
                        Buka laci kasir &amp; isi modal kas awal.
                      </p>
                    </div>
                  </button>
                )}

                {/* Tile 4: Printer Bluetooth */}
                <button
                  type="button"
                  onClick={() => {
                    handleConnectPrinter();
                  }}
                  className="flex items-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-sky-50 hover:bg-sky-100/90 border border-sky-200 text-left transition-all btn-tactile group shadow-2xs"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 mr-2.5 shadow-xs">
                    <Printer className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-black text-sky-950 text-xs sm:text-sm truncate">Printer Bluetooth</span>
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border shrink-0 ${
                        printerConnected 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                          : 'bg-slate-200 text-slate-700 border-slate-300'
                      }`}>
                        {printerConnected ? '✓ Terhubung' : 'Sambungkan'}
                      </span>
                    </div>
                    <p className="text-[11px] text-sky-900/80 font-normal leading-tight line-clamp-1">
                      {printerConnected 
                        ? (printerName || 'Printer 58mm Aktif') 
                        : 'Sambungkan printer thermal Bluetooth 58mm.'}
                    </p>
                  </div>
                </button>

              </div>
            </div>

            {/* Modal Footer: Clean & Spacious (Bebas dari tulisan nyelempit / terpotong) */}
            <div className="px-4 py-2.5 sm:px-5 sm:py-3 bg-slate-50 border-t border-slate-200 flex flex-row items-center justify-between gap-2 shrink-0">
              <div className="flex items-center space-x-2 text-xs text-slate-500 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-bold text-slate-700 truncate">
                  {currentCabang?.nama || 'Outlet Resmi Serabi Bawel'}
                </span>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 bg-white border border-slate-200 transition-colors"
                >
                  Tutup Menu
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center space-x-1.5"
                  title="Keluar dari tablet kasir"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
