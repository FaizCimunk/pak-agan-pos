'use client';

import React from 'react';
import { 
  Receipt, 
  Clock, 
  Coffee, 
  Users, 
  LogOut, 
  ShieldCheck,
  ChevronRight,
  Coins,
  X
} from 'lucide-react';

export type AdminTabId = 'ringkasan' | 'mutasi' | 'approval' | 'modal_hpp' | 'outlet_pekerja';

interface AdminSidebarProps {
  activeTab: AdminTabId;
  onTabChange: (tab: AdminTabId) => void;
  pendingCount: number;
  onLogout: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function AdminSidebar({
  activeTab,
  onTabChange,
  pendingCount,
  onLogout,
  isMobileOpen = false,
  onCloseMobile,
}: AdminSidebarProps) {

  const menuItems: {
    id: AdminTabId;
    label: string;
    sub: string;
    icon: any;
    badge?: number | null;
  }[] = [
    {
      id: 'ringkasan',
      label: '1. Ringkasan & 10 Cabang',
      sub: 'Laporan kasir, laba bersih & toko',
      icon: Coins,
    },
    {
      id: 'mutasi',
      label: '2. Buku Mutasi Transaksi',
      sub: 'Aliran kas keluar-masuk & struk',
      icon: Receipt,
    },
    {
      id: 'approval',
      label: '3. Pusat Persetujuan',
      sub: 'ACC Presensi & Nota Belanja/Kasbon',
      icon: Clock,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      id: 'modal_hpp',
      label: '4. Resep, HPP & Fixed Cost',
      sub: 'Menu/HPP, Stok Bahan & Sewa Toko',
      icon: Coffee,
    },
    {
      id: 'outlet_pekerja',
      label: '5. Outlet & Pekerja',
      sub: 'Tim & PIN, Gaji PDF & Profil Toko',
      icon: Users,
    },
  ];

  const handleSelectTab = (tab: AdminTabId) => {
    onTabChange(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
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

      {/* Navigation List: 5 Menu Terpusat */}
      <nav className="p-3 sm:p-4 space-y-2 flex-1 overflow-y-auto">
        <div className="text-[10px] uppercase font-black tracking-widest text-emerald-800 px-3 py-1 flex items-center justify-between">
          <span>Menu Kendali Pusat (5)</span>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">Ringkas</span>
        </div>

        <div className="space-y-1.5">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all btn-tactile ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-md shadow-emerald-900/20'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={`text-xs font-extrabold leading-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>
                      {item.label}
                    </div>
                    <div className={`text-[10px] mt-0.5 leading-snug ${isActive ? 'text-emerald-200' : 'text-slate-400'}`}>
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
          })}
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
