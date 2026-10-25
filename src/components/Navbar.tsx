'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Store, 
  LayoutDashboard, 
  Wifi, 
  WifiOff, 
  Printer, 
  Clock, 
  DollarSign, 
  LogOut, 
  RefreshCw, 
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Cabang, Shift } from '@/lib/types';
import { printerService } from '@/lib/printer';
import { getPendingTransactions, executeAutoSync } from '@/lib/offline-sync';
import { db } from '@/lib/db';
import { formatRupiah } from '@/lib/utils';

interface NavbarProps {
  currentCabang?: Cabang | null;
  activeShift?: Shift | null;
  onOpenShiftClick?: () => void;
  onCloseShiftClick?: () => void;
  onExpenseClick?: () => void;
  cabangList?: Cabang[];
  onSelectCabang?: (c: Cabang) => void;
}

export default function Navbar({
  currentCabang,
  activeShift,
  onOpenShiftClick,
  onCloseShiftClick,
  onExpenseClick,
  cabangList = [],
  onSelectCabang,
}: NavbarProps) {
  const pathname = usePathname();
  const isPos = pathname?.startsWith('/pos');
  const isAdmin = pathname?.startsWith('/admin');

  // Network online/offline detection
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Bluetooth printer status
  const [printerConnected, setPrinterConnected] = useState<boolean>(false);
  const [printerName, setPrinterName] = useState<string | null>(null);

  // Monitor network status & pending queue
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = async () => {
      setIsOnline(true);
      await checkAndSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial pending check
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

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-soft-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Tagline */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-dark to-brand-primary flex items-center justify-center text-white shadow-md shadow-brand-dark/20 group-hover:scale-105 transition-transform">
                <span className="font-bold text-lg tracking-wider">🌿</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-brand-dark text-base tracking-tight">PAK AGAN</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-accent-light text-accent-gold border border-accent-amber/20">
                    POS v1.0
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-medium">Minuman Herbal & Rempah Nusantara</span>
              </div>
            </Link>

            {/* Branch Switcher (when in POS mode) */}
            {isPos && currentCabang && (
              <div className="hidden md:flex items-center pl-4 border-l border-slate-200">
                <div className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200/70 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold">
                  <Store className="w-3.5 h-3.5 text-brand-primary" />
                  <span>{currentCabang.nama}</span>
                  {cabangList.length > 0 && onSelectCabang && (
                    <select
                      className="bg-transparent text-xs font-bold text-slate-800 cursor-pointer outline-none ml-1"
                      value={currentCabang.id}
                      onChange={(e) => {
                        const target = cabangList.find(c => c.id === e.target.value);
                        if (target) onSelectCabang(target);
                      }}
                    >
                      {cabangList.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.kode} - {c.nama.split('-')[1]?.trim() || c.nama}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Center: System Status & Hardware Indicators */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Online / Offline Bank-Grade Pill */}
            <div 
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                isOnline 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
              }`}
              title={isOnline ? 'Terhubung Online ke Server' : 'Mode Offline Aktif: Transaksi disimpan di IndexedDB lokal'}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* Pending Offline Sync Badge */}
            {pendingSyncCount > 0 && (
              <button 
                onClick={checkAndSync}
                disabled={isSyncing || !isOnline}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-accent-gold border border-amber-200 hover:bg-amber-100 transition-colors"
                title={`${pendingSyncCount} transaksi menunggu sinkronisasi`}
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{pendingSyncCount} Pending Sync</span>
              </button>
            )}

            {/* Bluetooth Thermal Printer Pill */}
            {isPos && (
              <button
                onClick={handleConnectPrinter}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all btn-tactile ${
                  printerConnected
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
                title={printerConnected ? `Terkoneksi ke ${printerName}` : 'Klik untuk hubungkan printer Bluetooth ESC/POS'}
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden md:inline">
                  {printerConnected ? printerName || 'Printer ESC/POS' : 'Sambung Printer'}
                </span>
              </button>
            )}

            {/* Active Shift Status */}
            {isPos && (
              activeShift ? (
                <div className="flex items-center space-x-1.5 px-3 py-1 bg-brand-subtle text-brand-dark border border-brand-light rounded-full text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="font-semibold">{activeShift.karyawan_nama}</span>
                  <span className="hidden lg:inline text-slate-500">|</span>
                  <span className="hidden lg:inline font-mono font-bold text-brand-primary">
                    {formatRupiah(activeShift.saldo_akhir_sistem)}
                  </span>
                </div>
              ) : (
                <button
                  onClick={onOpenShiftClick}
                  className="px-3 py-1 bg-accent-gold text-white text-xs font-bold rounded-full hover:bg-accent-gold/90 transition-all btn-tactile shadow-sm shadow-accent-gold/30"
                >
                  Buka Shift
                </button>
              )
            )}
          </div>

          {/* Right Navigation Switches */}
          <div className="flex items-center space-x-2">
            {/* Switch between POS and Admin */}
            <Link
              href="/pos"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all btn-tactile ${
                isPos
                  ? 'bg-brand-dark text-white shadow-sm shadow-brand-dark/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Kasir POS</span>
            </Link>

            <Link
              href="/admin"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all btn-tactile ${
                isAdmin
                  ? 'bg-brand-dark text-white shadow-sm shadow-brand-dark/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Admin Pusat</span>
            </Link>

            {/* Quick POS Actions Dropdown / Buttons */}
            {isPos && activeShift && (
              <>
                <button
                  onClick={onExpenseClick}
                  className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-accent-gold border border-amber-200 rounded-lg text-xs font-bold btn-tactile transition-colors"
                  title="Ajukan Belanja Operasional Toko (Kas Kecil)"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Belanja Toko</span>
                </button>

                <button
                  onClick={onCloseShiftClick}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold btn-tactile transition-colors"
                  title="Tutup Shift & Hitung Uang Laci"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tutup Shift</span>
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
