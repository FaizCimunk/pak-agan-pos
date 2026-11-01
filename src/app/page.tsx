'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import AiBadgeFooter from '@/components/AiBadgeFooter';

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!identifier.trim()) {
      setErrorMsg('Harap masukkan Nomor HP atau ID Pengguna.');
      return;
    }
    if (!pin) {
      setErrorMsg('Harap masukkan PIN / Sandi Rahasia.');
      return;
    }

    setLoading(true);
    try {
      const res = await db.authenticateUser(identifier.trim(), pin.trim());

      if (!res.success || !res.user) {
        setErrorMsg(res.message || 'Nomor HP / ID Pengguna atau Sandi salah.');
        setLoading(false);
        return;
      }

      const user = res.user;
      const cleanId = identifier.trim().toLowerCase();

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
      setErrorMsg('Terjadi kendala saat login: ' + (err.message || 'Error'));
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userIdentifier: string, userPin: string) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await db.authenticateUser(userIdentifier.trim(), userPin.trim());
      if (!res.success || !res.user) {
        setErrorMsg(res.message || 'Login gagal.');
        setLoading(false);
        return;
      }
      const user = res.user;
      const cleanId = userIdentifier.trim().toLowerCase();
      if (user.id.startsWith('kasir-') || cleanId.startsWith('kasir') || cleanId.startsWith('cabang') || cleanId.startsWith('cbg')) {
        localStorage.setItem('pakagan_device_cabang_id', user.cabang_id);
        sessionStorage.setItem('pakagan_kasir_session', user.nama || 'Kasir Cabang');
        sessionStorage.setItem('pakagan_user', JSON.stringify(user));
        router.push('/pos');
        return;
      }
      if (user.role === 'owner' || cleanId === 'pakagan' || cleanId === 'owner' || cleanId === 'admin') {
        sessionStorage.setItem('pakagan_user', JSON.stringify(user));
        sessionStorage.setItem('pakagan_owner_authenticated', 'true');
        router.push('/admin');
        return;
      }
      sessionStorage.setItem('pakagan_user', JSON.stringify(user));
      router.push('/karyawan');
    } catch (err: any) {
      setErrorMsg('Gagal masuk: ' + (err.message || 'Error'));
      setLoading(false);
    }
  };

  const setFastDemo = (userVal: string) => {
    setIdentifier(userVal);
    setPin('1234');
    setErrorMsg(null);
  };

  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center p-4 bg-gray-50 overflow-hidden select-none">
      {/* Decorative Background Elements (Exact Abdi Membangun aesthetic) */}
      <div className="absolute top-0 w-full h-96 bg-gradient-to-b from-emerald-50 to-transparent pointer-events-none" />
      <div className="absolute -left-20 top-20 w-72 h-72 bg-emerald-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 pointer-events-none animate-pulse" />
      <div className="absolute -right-20 bottom-20 w-72 h-72 bg-amber-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 pointer-events-none animate-[pulse_4s_ease-in-out_infinite]" />

      <div className="w-full max-w-sm relative z-10">
        {/* 3D Glass Card with Green Top Line */}
        <div className="bg-white rounded-3xl p-7 sm:p-8 shadow-[0_20px_50px_rgba(5,150,105,0.15)] border-t-[5px] border-emerald-600 relative overflow-hidden">
          {/* Subtle Inner Glow */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-50/50 to-transparent pointer-events-none" />

          {/* HD 3D Brand Emblem & Header */}
          <div className="relative z-10 flex flex-col items-center mb-7 text-center">
            {/* HD Custom Badge */}
            <div className="w-24 h-24 mb-3.5 relative flex items-center justify-center">
              {/* Radial warm glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/30 to-emerald-500/20 rounded-full blur-lg" />
              
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 p-1 shadow-[0_10px_25px_rgba(6,78,59,0.35)] border-2 border-emerald-400/40 relative flex items-center justify-center overflow-hidden">
                {/* Specular gloss sheen */}
                <div className="absolute -top-6 -right-6 w-16 h-16 bg-white/20 rounded-full blur-xs pointer-events-none" />
                
                {/* 3D Illustration elements */}
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

            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">
              SERABI BAWEL &amp; WEDANG GEPREK
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-gray-500 mt-1">
              Sistem Kasir &amp; Manajemen Multi-Cabang
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="relative z-10 mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold shadow-xs text-center flex items-center justify-center gap-1.5">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1">
                Nomor HP / ID Pengguna
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="0812xxxxxx / ID Pengguna"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/20 transition-all text-gray-900 bg-gray-50/50 shadow-inner font-medium text-sm"
                required
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs sm:text-sm font-bold text-gray-700">
                  PIN / Sandi Rahasia
                </label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold"
                >
                  {showPin ? 'Sembunyikan' : 'Tampilkan Sandi'}
                </button>
              </div>
              <input
                type={showPin ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="PIN 1234 atau Sandi Kuat (Huruf/Simbol)"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/20 transition-all text-gray-900 bg-gray-50/50 shadow-inner font-medium text-sm"
                required
              />
            </div>

            {/* Bold Green 3D Tactile CTA Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base sm:text-lg py-3.5 px-4 rounded-xl transition-all mt-6 disabled:opacity-50 shadow-[0_6px_0_rgb(5,150,105)] hover:shadow-[0_3px_0_rgb(5,150,105)] hover:translate-y-1 active:shadow-none active:translate-y-2 flex items-center justify-center gap-2 tracking-wider"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  MEMPROSES...
                </>
              ) : (
                'MASUK SEKARANG'
              )}
            </button>
          </form>

          {/* Akses Cepat 1-Klik Super Simpel & Ramah Orang Tua */}
          <div className="space-y-2.5 relative z-10 mb-6">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block text-center">
              Pilih Akses Masuk (1 Kali Sentuh):
            </span>

            {/* Owner Button (Paling Besar & Menonjol) */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('pakagan', '1234')}
              className="w-full p-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-98 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-between transition-all cursor-pointer border border-amber-300"
            >
              <div className="flex items-center space-x-3 text-left">
                <span className="text-2xl">👑</span>
                <div>
                  <span className="text-sm font-black text-slate-950 block leading-tight">MASUK SEBAGAI BOSS (PAK AGAN)</span>
                  <span className="text-[11px] text-amber-950 font-medium">Dashboard Finansial &amp; Uang Rekening BCA</span>
                </div>
              </div>
              <span className="text-base font-bold">→</span>
            </button>

            {/* Kasir Toko POS Button */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('kasir_cbg1', '888001')}
              className="w-full p-3.5 bg-blue-50 hover:bg-blue-100 active:scale-98 text-blue-900 border-2 border-blue-200 rounded-2xl font-bold flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-3 text-left">
                <span className="text-xl">📟</span>
                <div>
                  <span className="text-xs font-black block">MASUK KASIR TOKO (POS TABLET)</span>
                  <span className="text-[10px] text-blue-700">Layar Kasir, Pesanan, &amp; Cetak Struk 58mm</span>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-600">Buka →</span>
            </button>

            {/* Portal Karyawan Button */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('siti', '1234')}
              className="w-full p-3.5 bg-emerald-50 hover:bg-emerald-100 active:scale-98 text-emerald-950 border-2 border-emerald-200 rounded-2xl font-bold flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-3 text-left">
                <span className="text-xl">👤</span>
                <div>
                  <span className="text-xs font-black block">PORTAL KARYAWAN (HP STAF)</span>
                  <span className="text-[10px] text-emerald-700">Cek Slip Gaji Bersih &amp; Kehadiran</span>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700">Buka →</span>
            </button>
          </div>

          <div className="relative z-10 flex items-center my-4">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-slate-400 text-[10px] font-bold uppercase">Atau Login Manual</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>
        </div>

        {/* Powered by ivokgrup Pill Badge (Exact Abdi Membangun) */}
        <AiBadgeFooter className="mt-4" />
      </div>
    </main>
  );
}
