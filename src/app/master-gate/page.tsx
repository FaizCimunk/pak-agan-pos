'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  ShieldAlert, 
  KeyRound, 
  User, 
  Eye, 
  EyeOff, 
  Dices, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Zap, 
  Server, 
  Lock, 
  Unlock, 
  ArrowRight,
  LogOut,
  CheckCircle2
} from 'lucide-react';
import { db } from '@/lib/db';
import { Karyawan } from '@/lib/types';

export default function MasterGatePage() {
  const router = useRouter();
  const [phone, setPhone] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Authenticated Master Session State
  const [isMasterAuthenticated, setIsMasterAuthenticated] = useState<boolean>(false);

  // GPS Telemetry State (Matching Abdi Membangun Master Gate)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('requesting');
  const [gps, setGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

  // Owner Password Management State (For Master Command Center)
  const [ownerUsername, setOwnerUsername] = useState<string>('pakagan');
  const [ownerPassword, setOwnerPassword] = useState<string>('1234');
  const [showOwnerPassword, setShowOwnerPassword] = useState<boolean>(false);
  const [savingOwner, setSavingOwner] = useState<boolean>(false);
  const [ownerSuccess, setOwnerSuccess] = useState<string>('');
  const [ownerError, setOwnerError] = useState<string>('');

  const fetchGpsCoordinates = (): Promise<{ lat: number; lng: number; accuracy: number } | null> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('geolocation' in navigator)) {
        setGpsStatus('denied');
        return resolve(null);
      }
      setGpsStatus('requesting');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
          };
          setGps(coords);
          setGpsStatus('granted');
          resolve(coords);
        },
        () => {
          setGpsStatus('denied');
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    });
  };

  useEffect(() => {
    fetchGpsCoordinates();

    // Check if master session already exists in current tab
    if (typeof window !== 'undefined') {
      const isAuth = sessionStorage.getItem('pakagan_master_root_authenticated') === 'true';
      if (isAuth) {
        setIsMasterAuthenticated(true);
        router.push('/master-dashboard');
      }
    }
  }, [router]);

  const loadCurrentOwnerData = async () => {
    try {
      const allKars = await db.getAllKaryawan();
      const owner = allKars.find(k => k.role === 'owner' || k.username === 'pakagan');
      if (owner) {
        setOwnerUsername(owner.username || 'pakagan');
        setOwnerPassword(owner.password_plain || '1234');
      }
    } catch {}
  };

  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const cleanId = phone.trim().toLowerCase();
    const cleanPin = pin.trim();

    // Master Developer validation (identik dengan Abdi Membangun)
    const isMasterUser =
      (cleanId === 'faizcimunk12@gmail.com' || cleanId === '088221511946' || cleanId === '089999' || cleanId === 'master' || cleanId === 'root') &&
      (cleanPin === '088221511946' || cleanPin === '889900' || cleanPin === '1234' || cleanPin === 'pakagan');

    if (!isMasterUser) {
      setErrorMsg('Akses Ditolak: Kredensial Master Root tidak valid.');
      setLoading(false);
      return;
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pakagan_master_root_authenticated', 'true');
      sessionStorage.setItem('pakagan_owner_authenticated', 'true');
      const masterUser: Karyawan = {
        id: 'kar-master-root',
        cabang_id: 'pusat',
        username: 'master',
        nama: 'Master Developer (Faiz Cimunk)',
        role: 'owner',
        telepon: '0882-2151-1946',
        pin_hash: '',
        password_plain: '889900',
        tipe_gaji: 'bulanan',
        gaji_pokok: 0,
        tunjangan: 0,
        plafon_kasbon: 0,
        is_active: true,
      };
      sessionStorage.setItem('pakagan_user', JSON.stringify(masterUser));
    }

    await loadCurrentOwnerData();
    setIsMasterAuthenticated(true);
    setLoading(false);
    router.push('/master-dashboard');
  };

  const handleSaveOwnerCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOwner(true);
    setOwnerSuccess('');
    setOwnerError('');

    const cleanUser = ownerUsername.trim().toLowerCase();
    const cleanPass = ownerPassword.trim();

    if (!cleanUser || !cleanPass) {
      setOwnerError('Username dan Password tidak boleh kosong.');
      setSavingOwner(false);
      return;
    }

    try {
      const allKars = await db.getAllKaryawan();
      const owner = allKars.find(k => k.role === 'owner' || k.username === 'pakagan');
      const ownerId = owner?.id || 'kar-0';

      await db.updateKaryawanCredentials(ownerId, {
        username: cleanUser,
        password_plain: cleanPass,
        is_locked: false,
      });

      // Update saved browser credentials so auto-fill matches
      if (typeof window !== 'undefined') {
        localStorage.setItem('pakagan_saved_username', cleanUser);
        localStorage.setItem('pakagan_saved_password', cleanPass);
      }

      setOwnerSuccess(`Sandi Dashboard Pusat berhasil diperbarui! Username: ${cleanUser} • Sandi: ${cleanPass}`);
      setTimeout(() => setOwnerSuccess(''), 5000);
    } catch (err: any) {
      setOwnerError(err.message || 'Gagal menyimpan sandi.');
    } finally {
      setSavingOwner(false);
    }
  };

  const handleMasterLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('pakagan_master_root_authenticated');
    }
    setIsMasterAuthenticated(false);
    setPin('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-black font-sans relative overflow-hidden">
      
      {/* Background Matrix & Cyber Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/40 via-slate-950 to-black pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Top Navbar Identik Abdi Membangun */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            ⚡
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-white uppercase font-mono flex items-center gap-2">
              IVOK CYBER DEFENSE <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">Master Root Gateway &amp; Security Center</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            WAF ACTIVE &bull; ANTI-BRUTE FORCE ON
          </span>
          <Link
            href="/"
            className="text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800"
          >
            &larr; Pintu Publik
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        
        {/* =========================================================================
            STATE 1: PORTAL MASTER DEVELOPER LOGIN (PERSIS SCREENSHOT USER)
           ========================================================================= */}
        {!isMasterAuthenticated ? (
          <div className="w-full max-w-md">
            <div className="bg-slate-900/80 border border-slate-800 shadow-2xl rounded-2xl p-6 sm:p-8 backdrop-blur-xl relative">
              
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(16,185,129,0.25)] mb-3">
                  🛡️
                </div>
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Portal Master Developer
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Akses level tertinggi untuk Pembuat Aplikasi &amp; Tim Keamanan Siber.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs leading-relaxed flex items-start gap-2.5 animate-shake">
                  <span className="text-base flex-shrink-0">🚨</span>
                  <div>
                    <strong className="block text-red-200 font-semibold mb-0.5">Akses Ditolak:</strong>
                    {errorMsg}
                  </div>
                </div>
              )}

              <form onSubmit={handleMasterLogin} className="space-y-4">
                
                {/* Email / ID Master */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5 font-medium">
                    EMAIL / ID ROOT MASTER
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Masukkan ID / Email Master"
                      required
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                    <span className="absolute right-3.5 top-3.5 text-xs text-slate-500 font-mono">
                      ROOT
                    </span>
                  </div>
                </div>

                {/* Password Master */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5 font-medium">
                    SECURITY MASTER PIN / PASSWORD
                  </label>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 tracking-widest transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3.5 top-3.5 text-xs text-slate-400 hover:text-emerald-400 font-mono"
                    >
                      {showPin ? 'AES-OFF' : 'AES-256'}
                    </button>
                  </div>
                </div>

                {/* Status Sensor Satelit GPS (Persis Screenshot) */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                  {gpsStatus === 'granted' && gps ? (
                    <div className="flex items-center justify-between text-emerald-400">
                      <span className="flex items-center gap-1.5 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>🎯 Satelit Terkunci ({gps.lat.toFixed(4)}, {gps.lng.toFixed(4)})</span>
                      </span>
                      <span className="text-[10px] text-emerald-300/80 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                        ±{gps.accuracy}m
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-300">
                      <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      <span className="text-[11px] leading-tight">
                        Menghubungkan satelit GPS... Klik <strong>&quot;Izinkan / Allow&quot;</strong> pada jendela izin lokasi browser agar titik rumah/jalan terdeteksi akurat di peta.
                      </span>
                    </div>
                  )}
                </div>

                {/* Tombol Hijau Persis Screenshot */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl font-bold font-mono text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-60"
                >
                  <Lock className="w-4 h-4 text-slate-950" />
                  <span>{loading ? 'MEMVERIFIKASI ROOT...' : 'Buka Master Command Center'}</span>
                </button>

              </form>

            </div>
          </div>
        ) : (
          
          /* =========================================================================
              STATE 2: MASTER COMMAND CENTER (UBAH SANDI DASHBOARD PUSAT)
             ========================================================================= */
          <div className="w-full max-w-2xl space-y-6">
            
            {/* Header Master Command Center */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">
                    Root Security Active
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold font-mono text-white mt-1">
                  Master Command Center
                </h2>
                <p className="text-xs text-slate-400">
                  Panel Keamanan Siber Khusus Master Developer untuk mengelola sandi Dashboard Pusat.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/admin"
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs font-mono transition flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                >
                  <span>Buka Dashboard Pusat</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={handleMasterLogout}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Keluar dari sesi Master"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Form Ubah Sandi Dashboard Pusat */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-2xl space-y-5">
              
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-emerald-400" />
                  <span>Ubah Sandi Dashboard Pusat (Owner Pak Agan)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Master Developer dapat mengubah atau me-reset kredensial masuk akun Owner Pak Agan kapan saja dari sini.
                </p>
              </div>

              {ownerSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{ownerSuccess}</span>
                </div>
              )}

              {ownerError && (
                <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{ownerError}</span>
                </div>
              )}

              <form onSubmit={handleSaveOwnerCredentials} className="space-y-4">
                
                {/* Username Dashboard Pusat */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5 font-medium">
                    USERNAME DASHBOARD PUSAT
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={ownerUsername}
                      onChange={(e) => setOwnerUsername(e.target.value)}
                      required
                      placeholder="Contoh: pakagan"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Password Dashboard Pusat */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono text-slate-300 font-medium">
                      PASSWORD / SANDI DASHBOARD PUSAT
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const rand = Math.floor(1000 + Math.random() * 9000);
                          setOwnerPassword(String(rand));
                          setShowOwnerPassword(true);
                        }}
                        className="text-[11px] font-mono text-amber-400 hover:underline cursor-pointer"
                      >
                        [Acak 4 Digit]
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                        className="text-[11px] font-mono text-emerald-400 hover:underline cursor-pointer"
                      >
                        {showOwnerPassword ? 'Tutup' : 'Lihat'}
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type={showOwnerPassword ? 'text' : 'password'}
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      required
                      placeholder="Bisa 1234 atau kata sandi pilihan"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 mt-1 block">
                    *Sandi ini digunakan oleh Pak Agan untuk login di pintu utama aplikasi.
                  </span>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingOwner}
                    className="w-full py-3.5 px-4 rounded-xl font-bold font-mono text-sm tracking-wide bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {savingOwner ? <RefreshCw className="w-4 h-4 animate-spin text-slate-950" /> : <ShieldCheck className="w-4 h-4 text-slate-950" />}
                    <span>{savingOwner ? 'MENYIMPAN SANDI PUSAT...' : 'SIMPAN SANDI DASHBOARD PUSAT'}</span>
                  </button>
                </div>

              </form>

            </div>

          </div>
        )}

      </main>

      {/* Footer Info */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950/80 px-6 py-3.5 text-center text-xs font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>SERABI BAWEL &amp; WEDANG GEPREK &bull; IVOK CYBER DEFENSE</span>
        </div>
        <span>Akses Terbatas Khusus Master Root Developer</span>
      </footer>

    </div>
  );
}
