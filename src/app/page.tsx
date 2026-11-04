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

  const [showManualForm, setShowManualForm] = useState<boolean>(false);

  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center p-4 bg-gray-50 overflow-hidden select-none">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 w-full h-96 bg-gradient-to-b from-emerald-50 to-transparent pointer-events-none" />
      <div className="absolute -left-20 top-20 w-72 h-72 bg-emerald-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 pointer-events-none animate-pulse" />
      <div className="absolute -right-20 bottom-20 w-72 h-72 bg-amber-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 pointer-events-none animate-[pulse_4s_ease-in-out_infinite]" />

      <div className="w-full max-w-md relative z-10">
        {/* 3D Glass Card with Green Top Line */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(5,150,105,0.15)] border-t-[5px] border-emerald-600 relative overflow-hidden">
          {/* Subtle Inner Glow */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-50/50 to-transparent pointer-events-none" />

          {/* HD 3D Brand Emblem & Header */}
          <div className="relative z-10 flex flex-col items-center mb-6 text-center">
            {/* HD Custom Badge */}
            <div className="w-20 h-20 mb-3 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/30 to-emerald-500/20 rounded-full blur-lg" />
              
              <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 p-1 shadow-[0_10px_25px_rgba(6,78,59,0.35)] border-2 border-emerald-400/40 relative flex items-center justify-center overflow-hidden">
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

          {/* AKSES CEPAT 1-KLIK (TAMPIL UTAMA TANPA KETIK APA-APA) */}
          <div className="space-y-3 relative z-10 mb-5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-600 block text-center">
              Pilih Akses Masuk (1 Kali Sentuh):
            </span>

            {/* 1. OWNER PAK AGAN (PALING BESAR & JELAS) */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('pakagan', '1234')}
              className="w-full p-4.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 active:scale-[0.98] text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/25 flex items-center justify-between transition-all cursor-pointer border-2 border-amber-300"
            >
              <div className="flex items-center space-x-3 text-left">
                <div className="w-12 h-12 rounded-2xl bg-white/30 backdrop-blur-xs flex items-center justify-center text-2xl shadow-inner shrink-0">
                  👑
                </div>
                <div>
                  <span className="text-sm sm:text-base font-black text-slate-950 block leading-tight">
                    MASUK SEBAGAI BOSS (PAK AGAN)
                  </span>
                  <span className="text-xs text-amber-950 font-semibold block mt-0.5">
                    Uang Bersih BCA, 10 Toko, &amp; Gaji Staf
                  </span>
                </div>
              </div>
              <span className="text-xl font-black text-amber-950 pr-1">→</span>
            </button>

            {/* 2. KASIR TOKO (TABLET POS) */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('kasir_cbg1', '888001')}
              className="w-full p-3.5 bg-blue-50 hover:bg-blue-100 active:scale-[0.98] text-blue-950 border-2 border-blue-200 rounded-2xl font-bold flex items-center justify-between transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center space-x-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-blue-200/60 flex items-center justify-center text-xl shrink-0">
                  📟
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-black block">MASUK KASIR TOKO (POS TABLET)</span>
                  <span className="text-[11px] text-blue-700 font-medium">Layar Kasir, Pesanan, &amp; Cetak Struk 58mm</span>
                </div>
              </div>
              <span className="text-xs font-extrabold text-blue-700">Buka →</span>
            </button>

            {/* 3. PORTAL KARYAWAN */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('siti', '1234')}
              className="w-full p-3.5 bg-emerald-50 hover:bg-emerald-100 active:scale-[0.98] text-emerald-950 border-2 border-emerald-200 rounded-2xl font-bold flex items-center justify-between transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center space-x-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-emerald-200/60 flex items-center justify-center text-xl shrink-0">
                  👤
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-black block">PORTAL KARYAWAN (HP STAF)</span>
                  <span className="text-[11px] text-emerald-700 font-medium">Cek Slip Gaji Bersih &amp; Kehadiran Harian</span>
                </div>
              </div>
              <span className="text-xs font-extrabold text-emerald-700">Buka →</span>
            </button>
          </div>

          {/* TOGGLE FORM MANUAL (TERSEMBUNYI SECARA DEFAULT AGAR TETAP SIMPEL) */}
          <div className="pt-2 border-t border-slate-100 relative z-10 text-center">
            <button
              type="button"
              onClick={() => setShowManualForm(!showManualForm)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors py-1 cursor-pointer"
            >
              {showManualForm ? '▲ Tutup Login Manual' : '▾ Butuh Login dengan Nomor HP / Sandi Lain?'}
            </button>

            {showManualForm && (
              <form onSubmit={handleLogin} className="space-y-3.5 mt-3 pt-3 border-t border-slate-100 text-left">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nomor HP / ID Pengguna
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="0812xxxxxx / ID Pengguna"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 text-gray-900 bg-gray-50 text-xs font-medium"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-700">
                      PIN / Sandi Rahasia
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="text-[10px] text-emerald-700 font-bold"
                    >
                      {showPin ? 'Sembunyikan' : 'Lihat Sandi'}
                    </button>
                  </div>
                  <input
                    type={showPin ? 'text' : 'password'}
                    placeholder="PIN 1234 atau Sandi"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 text-gray-900 bg-gray-50 text-xs font-medium"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3 px-4 rounded-xl transition-all shadow-md active:scale-95"
                >
                  {loading ? 'MEMPROSES...' : 'MASUK DENGAN SANDI'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Powered by ivokgrup Pill Badge */}
        <AiBadgeFooter className="mt-4" />
      </div>
    </main>
  );
}
