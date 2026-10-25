'use client';

import React from 'react';
import { 
  Receipt, 
  Clock, 
  Coffee, 
  Users, 
  FileText, 
  LogOut, 
  ShieldCheck,
  ChevronRight,
  CalendarCheck,
  DollarSign,
  UserCheck,
  ShoppingBag,
  Coins
} from 'lucide-react';

interface AdminSidebarProps {
  activeTab: 'ringkasan' | 'approval' | 'gaji' | 'absensi' | 'payroll' | 'menu' | 'karyawan';
  onTabChange: (tab: 'ringkasan' | 'approval' | 'gaji' | 'absensi' | 'payroll' | 'menu' | 'karyawan') => void;
  pendingCount: number;
  onLogout: () => void;
}

export default function AdminSidebar({
  activeTab,
  onTabChange,
  pendingCount,
  onLogout,
}: AdminSidebarProps) {
  
  const operasionalItems = [
    {
      id: 'ringkasan',
      label: 'Ringkasan & Mutasi',
      sub: 'Omzet cabang & buku kas',
      icon: Receipt,
    },
    {
      id: 'absensi',
      label: 'Monitor Presensi Cabang',
      sub: 'Kehadiran harian 9 cabang',
      icon: CalendarCheck,
    },
    {
      id: 'menu',
      label: 'Master Menu & Resep',
      sub: 'Kunci harga dari pusat',
      icon: Coffee,
    },
  ];

  // Identik dengan Grup Abdi Membangun (SDM & KEUANGAN)
  const sdmKeuanganItems = [
    {
      id: 'karyawan',
      label: 'Data Pekerja',
      sub: 'Profil, tarif upah, PIN & ploting',
      icon: UserCheck,
    },
    {
      id: 'approval',
      label: 'Pusat Persetujuan',
      sub: 'Approval kasbon & belanja toko',
      icon: Clock,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      id: 'gaji',
      label: 'Belanja & Kas Kecil',
      sub: 'Uang kas kasir & belanja kebutuhan',
      icon: ShoppingBag,
    },
    {
      id: 'payroll',
      label: 'Rekap Gaji & Saldo',
      sub: 'Rekap gaji per tanggal & cetak PDF',
      icon: FileText,
    },
  ];

  return (
    <aside className="w-64 lg:w-72 bg-white border-r border-slate-200/90 flex flex-col shrink-0 h-screen sticky top-0 z-30 shadow-soft-sm">
      
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-950 border border-emerald-500/30 flex items-center justify-center text-white shadow-md shadow-emerald-950/20">
          <span className="text-xl">🥞</span>
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="font-extrabold text-brand-dark text-sm sm:text-base tracking-tight leading-none">SERABI BAWEL</span>
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-accent-light text-accent-gold border border-accent-amber/20">
              PUSAT
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            Wedang Geprek • Multi-Cabang
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="p-4 space-y-4 flex-1 overflow-y-auto">
        
        {/* GRUP 1: OPERASIONAL CABANG */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-3 py-1">
            Operasional Outlet
          </div>
          {operasionalItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as any)}
                className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all btn-tactile ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-md shadow-emerald-900/20'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    isActive ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className={`text-xs font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-800'}`}>
                      {item.label}
                    </div>
                    <div className={`text-[10px] mt-0.5 ${isActive ? 'text-emerald-200' : 'text-slate-400'}`}>
                      {item.sub}
                    </div>
                  </div>
                </div>

                {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-300" />}
              </button>
            );
          })}
        </div>

        {/* GRUP 2: SDM & KEUANGAN (Ala Abdi Membangun) */}
        <div className="space-y-1 pt-1">
          <div className="text-[10px] uppercase font-black tracking-widest text-emerald-800 px-3 py-1 flex items-center justify-between">
            <span>SDM &amp; Keuangan</span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">Bank-Grade</span>
          </div>
          {sdmKeuanganItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as any)}
                className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all btn-tactile ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-md shadow-emerald-900/20'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    isActive ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className={`text-xs font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-800'}`}>
                      {item.label}
                    </div>
                    <div className={`text-[10px] mt-0.5 ${isActive ? 'text-emerald-200' : 'text-slate-400'}`}>
                      {item.sub}
                    </div>
                  </div>
                </div>

                {item.badge ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-extrabold text-[10px] shadow-sm animate-pulse">
                    {item.badge}
                  </span>
                ) : isActive ? (
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-300" />
                ) : null}
              </button>
            );
          })}
        </div>

      </nav>

      {/* Footer Profile & Security */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/60 space-y-3">
        <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
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

    </aside>
  );
}
