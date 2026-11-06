'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowRight, 
  KeyRound,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { db } from '@/lib/db';
import AiBadgeFooter from '@/components/AiBadgeFooter';

export default function LoginPage() {
  const router = useRouter();

  // Unified Single-Door Login State
  const [identifier, setIdentifier] = useState<string>('pakagan');
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

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

      // 1. Tablet Kasir Toko Cabang -> Otomatis diarahkan ke Layar POS Kasir Cabang
      if (user.id.startsWith('kasir-') || user.role === 'kasir' || cleanId.startsWith('kasir') || cleanId.startsWith('cabang') || cleanId.startsWith('cbg')) {
        const targetCabangId = user.cabang_id;
        if (typeof window !== 'undefined') {
          localStorage.setItem('pakagan_device_cabang_id', targetCabangId);
          sessionStorage.setItem('pakagan_kasir_session', user.nama || 'Kasir Cabang');
          sessionStorage.setItem('pakagan_user', JSON.stringify(user));
        }
        router.push('/pos');
        return;
      }

      // 2. Admin Pusat (Owner Pak Agan) -> Otomatis diarahkan ke Executive Backoffice
      if (user.role === 'owner' || cleanId === 'pakagan' || cleanId === 'owner' || cleanId === 'admin') {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pakagan_user', JSON.stringify(user));
          sessionStorage.setItem('pakagan_owner_authenticated', 'true');
        }
        router.push('/admin');
        return;
      }

      // 3. Staf Pekerja Personal (Siti, Budi, Dewi, dll) -> Otomatis diarahkan ke Portal Karyawan
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
      {/* Decorative Ambient Lighting */}
      <div className="absolute top-0 w-full h-80 bg-gradient-to-b from-emerald-100/60 to-transparent pointer-events-none" />
      <div className="absolute -left-20 top-20 w-80 h-80 bg-emerald-500 rounded-full mix-blend-multiply filter blur-[120px] opacity-25 pointer-events-none animate-pulse" />
      <div className="absolute -right-20 bottom-20 w-80 h-80 bg-amber-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-20 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* 3D Card with Emerald Top Border */}
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
            <span className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wider shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Portal Terpadu Satu Pintu</span>
            </span>
          </div>

          {/* ERROR ALERT NOTIFICATION */}
          {errorMsg && (
            <div className="relative z-10 mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold shadow-xs flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMsg}</div>
            </div>
          )}

          {/* MAIN SECURE UNIFIED LOGIN FORM */}
          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            
            {/* INPUT IDENTIFIER (USERNAME / NO HP / ID TOKO) */}
            <div>
              <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                Username / ID Akun / No. WhatsApp:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Contoh: pakagan / kasir_cbg1 / siti"
                  required
                  autoCapitalize="none"
                  className="w-full pl-10 pr-3.5 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 bg-slate-50 text-xs font-bold transition-all shadow-inner"
                />
                <div className="w-5 h-5 absolute left-3 top-3.5 flex items-center justify-center text-slate-400">
                  <User className="w-4 h-4 text-emerald-700" />
                </div>
              </div>
            </div>

            {/* INPUT PASSWORD / PIN */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold text-slate-800">
                  Sandi Rahasia / PIN:
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
                  placeholder="Masukkan Sandi Keamanan atau PIN"
                  required
                  className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 bg-slate-50 text-xs font-bold transition-all shadow-inner"
                />
                <div className="w-5 h-5 absolute left-3 top-3.5 flex items-center justify-center text-slate-400">
                  <KeyRound className="w-4 h-4 text-emerald-700" />
                </div>
              </div>
            </div>

            {/* AUTO-ROUTING HINT BANNER */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-[10px] text-slate-500 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Sistem otomatis mendeteksi akses Anda (Owner, Kasir, atau Karyawan) setelah login.</span>
            </div>

            {/* SUBMIT BUTTON (TEBAL & TAKTIL HIJAU EMERALD) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl font-black text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer btn-tactile bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900 text-white shadow-emerald-700/30 border border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>{loading ? 'MEMVERIFIKASI KREDENSIAL...' : 'MASUK KE SISTEM'}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>

          </form>

          {/* FOOTER HELPER INFO */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center relative z-10">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Enkripsi Bank-Grade Aktif &bull; Terhubung ke 10 Cabang Resmi</span>
            </div>
          </div>

        </div>

        {/* Powered by ivokgrup Pill Badge */}
        <AiBadgeFooter className="mt-4" />

      </div>
    </main>
  );
}
