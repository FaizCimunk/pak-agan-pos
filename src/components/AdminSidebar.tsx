'use client';

import React from 'react';
import { 
  Receipt, 
  Clock, 
  Coffee, 
  FileText, 
  LogOut, 
  ShieldCheck,
  ChevronRight,
  CalendarCheck,
  UserCheck,
  ShoppingBag,
  Coins,
  PackageCheck,
  Building2,
  Store,
  X
} from 'lucide-react';

export type AdminTabId =
  | 'ringkasan'
  | 'mutasi'
  | 'absensi'
  | 'gaji'
  | 'approval'
  | 'payroll'
  | 'fixedcost'
  | 'karyawan'
  | 'profiltoko'
  | 'menu'
  | 'bahan';

interface AdminSidebarProps {
  activeTab: AdminTabId;
  onTabChange: (tab: AdminTabId) => void;
  pendingCount: number;
  pendingAbsensiCount?: number;
  onLogout: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function AdminSidebar({
  activeTab,
  onTabChange,
  pendingCount,
  pendingAbsensiCount = 0,
  onLogout,
  isMobileOpen = false,
  onCloseMobile,
}: AdminSidebarProps) {

  const operasionalItems: {
    id: AdminTabId;
    label: string;
    sub: string;
    icon: any;
    badge?: number | null;
  }[] = [
    {
      id: 'ringkasan',
      label: 'Ringkasan 10 Cabang',
      sub: 'Laporan kasir, laba bersih & toko',
      icon: Coins,
    },
    {
      id: 'mutasi',
      label: 'Buku Mutasi Penjualan',
      sub: 'Struk kasir, omzet & filter tanggal',
      icon: Receipt,
    },
    {
      id: 'absensi',
      label: 'Monitoring Presensi Cabang',
      sub: 'Presensi kasir & ACC kehadiran',
      icon: CalendarCheck,
      badge: pendingAbsensiCount > 0 ? pendingAbsensiCount : null,
    },
    {
      id: 'gaji',
      label: 'Belanja dan Kas Kecil',
      sub: 'Uang kas kasir & belanja kebutuhan',
      icon: ShoppingBag,
    },
    {
      id: 'approval',
      label: 'Pusat Persetujuan',
      sub: 'ACC belanja, kasbon & presensi',
      icon: Clock,
      badge: pendingCount > 0 ? pendingCount : null,
    },
  ];

  const settingItems: {
    id: AdminTabId;
    label: string;
    sub: string;
    icon: any;
  }[] = [
    {
      id: 'payroll',
      label: 'Rekap Gaji Saldo',
      sub: 'Gaji mingguan (/6 hari) & cetak PDF',
      icon: FileText,
    },
    {
      id: 'fixedcost',
      label: 'Fix Cost',
      sub: 'Atur sewa, wifi, sampah & listrik',
      icon: Building2,
    },
    {
      id: 'karyawan',
      label: 'Data Pekerja',
      sub: 'Profil, tarif upah, PIN & ploting',
      icon: UserCheck,
    },
    {
      id: 'profiltoko',
      label: 'Identitas Toko dan Struk',
      sub: 'Nama toko, sandi kasir, WA & promo',
      icon: Store,
    },
    {
      id: 'menu',
      label: 'Menu Kasir Cabang',
      sub: 'Lihat menu, harga & HPP per kasir',
      icon: Coffee,
    },
    {
      id: 'bahan',
      label: 'Absensi Bahan 10 Toko',
      sub: 'Stok dapur & pasokan bahan pusat',
      icon: PackageCheck,
    },
  ];

  const handleSelectTab = (tab: AdminTabId) => {
    onTabChange(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const renderMenuButton = (item: {
    id: AdminTabId;
    label: string;
    sub: string;
    icon: any;
    badge?: number | null;
  }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => handleSelectTab(item.id)}
        className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all btn-tactile ${
          isActive
            ? 'bg-emerald-800 text-white shadow-md shadow-emerald-900/20'
            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
        }`}
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
            isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className={`text-xs font-extrabold leading-tight truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
              {item.label}
            </div>
            <div className={`text-[10px] mt-0.5 leading-snug truncate ${isActive ? 'text-emerald-200' : 'text-slate-400'}`}>
              {item.sub}
            </div>
          </div>
        </div>

        {item.badge ? (
          <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-extrabold text-[10px] shadow-sm animate-pulse shrink-0">
            {item.badge}
          </span>
        ) : isActive ? (
          <ChevronRight className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
        ) : null}
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-950 border border-emerald-500/40 flex items-center justify-center text-white shadow-md shadow-emerald-950/25 shrink-0 relative overflow-hidden">
            <div className="flex items-center justify-center -space-x-1 drop-shadow-md">
              <span className="text-base select-none transform -rotate-6" title="Serabi Bawel">🥞</span>
              <span className="text-base select-none transform rotate-6" title="Wedang Geprek">🍵</span>
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-brand-dark text-sm sm:text-base tracking-tight leading-none truncate">
                SERABI BAWEL
              </span>
              <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full bg-accent-light text-accent-gold border border-accent-amber/20 shrink-0">
                PUSAT
              </span>
            </div>
            <div className="text-[10px] text-emerald-800 font-extrabold mt-0.5 flex items-center space-x-1 truncate">
              <span>Wedang Geprek</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-medium">Multi-Cabang</span>
            </div>
          </div>
        </div>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
            title="Tutup Menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="p-3 sm:p-4 space-y-4 flex-1 overflow-y-auto">
        {/* GRUP 1: OPERASIONAL HARIAN & PERSETUJUAN */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-3 py-1">
            Operasional Cabang
          </div>
          <div className="space-y-1">
            {operasionalItems.map(item => renderMenuButton(item))}
          </div>
        </div>

        {/* GRUP 2: MENU SETTING */}
        <div className="space-y-1 pt-2 border-t border-slate-100">
          <div className="text-[10px] uppercase font-black tracking-widest text-emerald-800 px-3 py-1 flex items-center justify-between">
            <span>Menu Setting</span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
              Pusat
            </span>
          </div>
          <div className="space-y-1">
            {settingItems.map(item => renderMenuButton(item))}
          </div>
        </div>
      </nav>

      {/* Footer Profile & Security */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/60 space-y-3">
        <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-extrabold text-slate-900 truncate">Pak Agan (Owner)</div>
            <div className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Hak Akses Penuh Pusat</span>
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full py-2 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Kunci / Keluar Dashboard</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Permanent Desktop Sidebar (Branding Serabi Bawel & Wedang Geprek) */}
      <aside className="hidden md:flex w-64 border-r border-slate-200/80 bg-white flex-col flex-shrink-0 z-30 shadow-soft-sm h-screen sticky top-0 overflow-hidden">
        {sidebarContent}
      </aside>

      {/* 2. Slide-out Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-72 max-w-[85vw] h-full bg-white shadow-2xl animate-in slide-in-from-left duration-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
          <div className="flex-1" onClick={onCloseMobile} />
        </div>
      )}
    </>
  );
}
