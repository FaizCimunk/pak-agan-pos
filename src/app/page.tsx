'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Store, 
  ShieldCheck, 
  ArrowRight, 
  Smartphone, 
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown
} from 'lucide-react';
import { db } from '@/lib/db';
import { Cabang } from '@/lib/types';
import AiBadgeFooter from '@/components/AiBadgeFooter';

type LoginRoleTab = 'owner' | 'kasir' | 'karyawan';

export default function LoginPage() {
  const router = useRouter();

  // Active Role Tab for UX Guidance
  const [activeTab, setActiveTab] = useState<LoginRoleTab>('owner');
  const [identifier, setIdentifier] = useState<string>('pakagan');
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Branch list for Kasir Tablet quick selector
  const [cabangList, setCabangList] = useState<Cabang[]>([]);
  const [selectedCabangUsername, setSelectedCabangUsername] = useState<string>('kasir_cbg1');

  useEffect(() => {
    db.getAllCabang().then(list => setCabangList(list)).catch(() => {});
  }, []);

  // When switching tabs, update recommended identifier placeholder
  const handleTabChange = (tab: LoginRoleTab) => {
    setActiveTab(tab);
    setErrorMsg(null);
    setPin('');

    if (tab === 'owner') {
      setIdentifier('pakagan');
    } else if (tab === 'kasir') {
      setIdentifier(selectedCabangUsername || 'kasir_cbg1');
    } else {
      setIdentifier('');
    }
  };

  const handleBranchSelect = (username: string) => {
    setSelectedCabangUsername(username);
    setIdentifier(username);
    setPin('');
    setErrorMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const targetIdentifier = identifier.trim();
    const targetPin = pin.trim();

    if (!targetIdentifier) {
      setErrorMsg('Harap masukkan Username, ID Kasir, atau Nomor WhatsApp.');
      return;
    }
    if (!targetPin) {
      setErrorMsg('Harap masukkan PIN atau Sandi Keamanan.');
      return;
    }

    setLoading(true);
    try {
      const res = await db.authenticateUser(targetIdentifier, targetPin);

      if (!res.success || !res.user) {
        setErrorMsg(res.message || 'Username atau Sandi salah. Periksa kembali kredensial Anda.');
        setLoading(false);
        return;
      }

      const user = res.user;
      const cleanId = targetIdentifier.toLowerCase();

      // 1. Tablet Kasir Toko Cabang -> Masuk ke Layar POS Kasir Cabang
      if (user.id.startsWith('kasir-') || cleanId.startsWith('kasir') || cleanId.startsWith('cabang') || cleanId.startsWith('cbg')) {
        const targetCabangId = user.cabang_id;
        if (typeof window !== 'undefined') {
          localStorage.setItem('pakagan_device_cabang_id', targetCabangId);
          sessionStorage.setItem('pakagan_kasir_session', user.nama || 'Kasir Cabang');
          sessionStorage.setItem('pakagan_user', JSON.stringify(user));
        }
        router.push('/pos');
        return;
      }

      // 2. Admin Pusat (Owner Pak Agan) -> Masuk ke Executive Backoffice
      if (user.role === 'owner' || cleanId === 'pakagan' || cleanId === 'owner' || cleanId === 'admin') {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pakagan_user', JSON.stringify(user));
          sessionStorage.setItem('pakagan_owner_authenticated', 'true');
        }
        router.push('/admin');
        return;
      }

      // 3. Staf Pekerja Personal (Siti, Budi, Dewi, dll) -> Masuk ke Portal Karyawan
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pakagan_user', JSON.stringify(user));
      }
      router.push('/karyawan');
    } catch (err: any) {
      setErrorMsg('Terjadi kendala saat memverifikasi login: ' + (err.message || 'Error'));
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center p-4 bg-slate-900/5 select-none overflow-x-hidden">
      {/* Decorative Fintech Ambient Lighting */}
      <div className="absolute top-0 w-full h-80 bg-gradient-to-b from-emerald-100/60 to-transparent pointer-events-none" />
      <div className="absolute -left-20 top-20 w-80 h-80 bg-emerald-500 rounded-full mix-blend-multiply filter blur-[120px] opacity-25 pointer-events-none animate-pulse" />
      <div className="absolute -right-20 bottom-20 w-80 h-80 bg-amber-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-20 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* 3D Glass Card with Emerald Top Border */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(5,150,105,0.18)] border-t-[5px] border-emerald-600 relative overflow-hidden">
          
          {/* Subtle Inner Gradient Header */}
          <div className="absolute top-0 left-0 w-full h-28 bg-gradient-to-b from-emerald-50/70 to-transparent pointer-events-none" />

          {/* BRAND EMBLEM & HEADER */}
          <div className="relative z-10 flex flex-col items-center mb-6 text-center">
            
            {/* HD 3D Custom Logo Badge */}
            <div className="w-20 h-20 mb-3 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/40 to-emerald-500/30 rounded-2xl blur-lg" />
              
              <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-emerald-950 p-1 shadow-[0_10px_25px_rgba(6,78,59,0.4)] border-2 border-emerald-400/50 relative flex items-center justify-center overflow-hidden">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="flex items-center justify-center gap-0.5 text-2xl drop-shadow-md">
                    <span>🥞</span>
                    <span>🍵</span>
                  </div>
                  <span className="text-[9px] font-black tracking-widest text-amber-300 uppercase mt-0.5 drop-shadow">
                    HD ASLI
                  </span>
                </div>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              SERABI BAWEL &amp; WEDANG GEPREK
            </h1>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Sistem Kasir &amp; Manajemen Multi-Cabang
            </p>
            <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Portal Resmi Masuk Sistem</span>
            </span>
          </div>

          {/* ROLE TAB SELECTOR (3 ROLE TERPISAH DENGAN JELAS) */}
          <div className="relative z-10 mb-5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block text-center mb-2">
              Pilih Peran Akun Anda:
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleTabChange('owner')}
                className={`py-2 px-1.5 rounded-xl text-xs font-extrabold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  activeTab === 'owner'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="text-sm">👑</span>
                <span className="truncate">Owner Boss</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('kasir')}
                className={`py-2 px-1.5 rounded-xl text-xs font-extrabold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  activeTab === 'kasir'
                    ? 'bg-blue-600 text-white shadow-md font-black scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="text-sm">📟</span>
                <span className="truncate">Kasir Toko</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('karyawan')}
                className={`py-2 px-1.5 rounded-xl text-xs font-extrabold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  activeTab === 'karyawan'
                    ? 'bg-emerald-700 text-white shadow-md font-black scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="text-sm">👤</span>
                <span className="truncate">Karyawan</span>
              </button>
            </div>
          </div>

          {/* ERROR ALERT NOTIFICATION */}
          {errorMsg && (
            <div className="relative z-10 mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold shadow-xs flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMsg}</div>
            </div>
          )}

          {/* MAIN SECURE LOGIN FORM */}
          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            
            {/* OPTIONAL QUICK BRANCH SELECTOR FOR KASIR TABLET */}
            {activeTab === 'kasir' && cabangList.length > 0 && (
              <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200/80 space-y-1.5">
                <label className="text-[11px] font-black text-blue-950 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-blue-700" />
                  <span>Pilih Cabang Tablet Kasir:</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedCabangUsername}
                    onChange={(e) => handleBranchSelect(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-blue-200 rounded-xl text-xs font-extrabold text-blue-950 focus:outline-none focus:border-blue-600 cursor-pointer appearance-none shadow-xs"
                  >
                    {cabangList.map((c) => (
                      <option key={c.id} value={c.kasir_username || c.kode}>
                        {c.kode} - {c.nama} ({c.kota})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-blue-700 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
                <span className="text-[10px] text-blue-700 font-semibold block">
                  *Otomatis menghubungkan tablet ke sistem kasir &amp; laci cabang terpilih.
                </span>
              </div>
            )}

            {/* INPUT IDENTIFIER (USERNAME / NO HP / ID TOKO) */}
            <div>
              <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                {activeTab === 'owner' ? 'Username Owner Pusat:' :
                 activeTab === 'kasir' ? 'Username / ID Tablet Kasir:' :
                 'Username / Nomor WhatsApp Karyawan:'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    activeTab === 'owner' ? 'pakagan' :
                    activeTab === 'kasir' ? 'kasir_cbg1' :
                    'siti / 0812-xxxx-xxxx'
                  }
                  required
                  autoCapitalize="none"
                  className="w-full pl-10 pr-3.5 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 bg-slate-50 text-xs font-bold transition-all shadow-inner"
                />
                <div className="w-5 h-5 absolute left-3 top-3 flex items-center justify-center text-slate-400">
                  {activeTab === 'owner' ? <User className="w-4 h-4 text-amber-600" /> :
                   activeTab === 'kasir' ? <Store className="w-4 h-4 text-blue-600" /> :
                   <Smartphone className="w-4 h-4 text-emerald-600" />}
                </div>
              </div>
            </div>

            {/* INPUT PASSWORD / PIN */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold text-slate-800">
                  {activeTab === 'kasir' ? 'PIN Cepat Tablet (6 Angka) / Sandi:' : 'Sandi Rahasia / PIN:'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-[11px] text-emerald-800 font-black hover:underline cursor-pointer flex items-center gap-1"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPin ? 'Tutup' : 'Lihat'}</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder={
                    activeTab === 'owner' ? 'Masukkan Sandi Owner Pak Agan' :
                    activeTab === 'kasir' ? 'PIN Tablet (Contoh: 888001)' :
                    'PIN 4 Angka / Sandi Akun'
                  }
                  required
                  className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 bg-slate-50 text-xs font-bold transition-all shadow-inner"
                />
                <div className="w-5 h-5 absolute left-3 top-3 flex items-center justify-center text-slate-400">
                  <KeyRound className="w-4 h-4 text-emerald-700" />
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON (TEBAL & TAKTIL HIJAU EMERALD) */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer btn-tactile ${
                activeTab === 'owner'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-amber-500/30 border border-amber-300'
                  : activeTab === 'kasir'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-blue-600/30 border border-blue-400'
                  : 'bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white shadow-emerald-800/30 border border-emerald-500'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <span>{loading ? 'MEMVERIFIKASI KREDENSIAL...' : 'MASUK SEKARANG'}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>

          </form>

          {/* FOOTER HELPER INFO */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center relative z-10 space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Enkripsi Bank-Grade Aktif &bull; Terhubung ke 10 Cabang Resmi</span>
            </div>
            
            <p className="text-[10px] text-slate-400">
              Lupa sandi akun atau PIN tablet? Hubungi{' '}
              <a
                href="https://wa.me/6281234567890?text=Halo%20Pak%20Agan,%20saya%20butuh%20bantuan%20reset%20kredensial%20login%20POS%20Serabi%20Bawel."
                target="_blank"
                rel="noreferrer"
                className="font-bold text-emerald-800 hover:underline"
              >
                Owner Pusat (Pak Agan)
              </a>
            </p>
          </div>

        </div>

        {/* Powered by ivokgrup Pill Badge */}
        <AiBadgeFooter className="mt-4" />

      </div>
    </main>
  );
}
