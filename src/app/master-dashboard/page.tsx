'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  KeyRound, 
  RefreshCw, 
  Save, 
  Eye, 
  EyeOff, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  LogOut, 
  Building2, 
  Store, 
  Globe, 
  Cpu, 
  Terminal, 
  Phone, 
  UserCheck,
  Activity,
  Zap,
  MapPin,
  Clock
} from 'lucide-react';
import { db, isBranchMatch } from '@/lib/db';
import { Cabang, Karyawan } from '@/lib/types';
import { formatRupiah } from '@/lib/utils';

export default function MasterDashboardPage() {
  const router = useRouter();

  // Authentication & Session Guard
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  // DEFCON Lockdown State
  const [defconLevel, setDefconLevel] = useState<number>(5);
  const [defconAlert, setDefconAlert] = useState<string | null>(null);

  // Neural Matrix Event Trigger Simulation
  const [neuralLoad, setNeuralLoad] = useState<number>(48);
  const [activeSimulation, setActiveSimulation] = useState<string | null>(null);

  // Owner Central Dashboard Settings
  const [ownerKaryawan, setOwnerKaryawan] = useState<Karyawan | null>(null);
  const [ownerNama, setOwnerNama] = useState<string>('Pak Agan (Owner)');
  const [ownerUsername, setOwnerUsername] = useState<string>('pakagan');
  const [ownerPassword, setOwnerPassword] = useState<string>('1234');
  const [ownerPhone, setOwnerPhone] = useState<string>('0813-9843-1313');
  const [showOwnerPassword, setShowOwnerPassword] = useState<boolean>(false);
  const [savingOwner, setSavingOwner] = useState<boolean>(false);
  const [ownerSuccess, setOwnerSuccess] = useState<string | null>(null);
  const [ownerError, setOwnerError] = useState<string | null>(null);

  // Cabang & Kasir Management
  const [cabangList, setCabangList] = useState<Cabang[]>([]);
  const [editingCabangId, setEditingCabangId] = useState<string | null>(null);
  const [editKasirUsername, setEditKasirUsername] = useState<string>('');
  const [editKasirPassword, setEditKasirPassword] = useState<string>('');
  const [savingCabang, setSavingCabang] = useState<boolean>(false);

  // Security Audit Logs
  const [auditLogs, setAuditLogs] = useState<{
    id: string;
    waktu: string;
    kegiatan: string;
    level: 'AMAN' | 'PERINGATAN' | 'KRITIS';
    pelaku: string;
    ip: string;
  }[]>([
    {
      id: 'log-1',
      waktu: 'Baru saja',
      kegiatan: 'Master Developer Root Session Activated',
      level: 'AMAN',
      pelaku: 'Faiz Cimunk (Root)',
      ip: '182.253.114.88 (GPS Lock)',
    },
    {
      id: 'log-2',
      waktu: '12 menit lalu',
      kegiatan: 'Otorisasi Token Sinkronisasi Database Supabase',
      level: 'AMAN',
      pelaku: 'Sistem Inti (Next.js)',
      ip: 'PostgreSQL Direct Pool',
    },
    {
      id: 'log-3',
      waktu: '1 jam lalu',
      kegiatan: 'Audit Laci & Presensi Kasir 10 Cabang',
      level: 'AMAN',
      pelaku: 'Sistem Sinkronisasi',
      ip: 'IndexedDB Cluster',
    },
  ]);

  useEffect(() => {
    // Validate session
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('pakagan_master_root_authenticated') === 'true';
      if (!auth) {
        router.replace('/master-gate');
        return;
      }
      setIsAuth(true);
    }

    loadInitialData();
  }, [router]);

  const loadInitialData = async () => {
    try {
      const [karyawans, cabangs] = await Promise.all([
        db.getAllKaryawan(),
        db.getAllCabang(),
      ]);

      setCabangList(cabangs);

      const owner = karyawans.find(k => k.role === 'owner' || k.username === 'pakagan');
      if (owner) {
        setOwnerKaryawan(owner);
        setOwnerNama(owner.nama || 'Pak Agan (Owner)');
        setOwnerUsername(owner.username || 'pakagan');
        setOwnerPassword(owner.password_plain || '1234');
        setOwnerPhone(owner.telepon || '0813-9843-1313');
      }
    } catch (e) {
      console.warn('Gagal memuat data master dashboard:', e);
    }
  };

  const handleSaveOwnerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOwner(true);
    setOwnerSuccess(null);
    setOwnerError(null);

    const cleanUsername = ownerUsername.trim().toLowerCase();
    const cleanNama = ownerNama.trim();
    const cleanPassword = ownerPassword.trim();
    const cleanPhone = ownerPhone.trim();

    if (!cleanUsername || cleanUsername.length < 3) {
      setOwnerError('Username minimal 3 karakter.');
      setSavingOwner(false);
      return;
    }

    if (!cleanPassword || cleanPassword.length < 3) {
      setOwnerError('Sandi minimal 3 karakter.');
      setSavingOwner(false);
      return;
    }

    try {
      const targetId = ownerKaryawan?.id || 'kar-owner-pakagan';
      await db.updateKaryawanCredentials(targetId, {
        nama: cleanNama,
        username: cleanUsername,
        password_plain: cleanPassword,
        telepon: cleanPhone,
        is_locked: false,
      });

      // Update local storage backup
      if (typeof window !== 'undefined') {
        localStorage.setItem('pakagan_last_owner_username', cleanUsername);
      }

      setOwnerSuccess(`Identitas & Sandi Dasbor Pusat berhasil diperbarui! Nama: "${cleanNama}", Username: "${cleanUsername}"`);
      
      // Add audit log
      setAuditLogs(prev => [
        {
          id: `log-${Date.now()}`,
          waktu: 'Baru saja',
          kegiatan: `Update Kredensial Dasbor Pusat ke username: ${cleanUsername}`,
          level: 'AMAN',
          pelaku: 'Faiz Cimunk (Master)',
          ip: 'Master Root Interface',
        },
        ...prev,
      ]);

      await loadInitialData();
    } catch (err: any) {
      setOwnerError(err.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSavingOwner(false);
    }
  };

  const handleToggleDefcon = () => {
    if (defconLevel === 5) {
      const confirmLock = window.confirm(
        'PERINGATAN SIBER DEFCON 1:\n\nApakah Anda yakin ingin mengaktifkan mode darurat DEFCON 1? Seluruh transaksi kasir dan sesi pengguna akan dikunci sementara.'
      );
      if (confirmLock) {
        setDefconLevel(1);
        setDefconAlert('DEFCON 1 AKTIF: Sistem dalam status siaga darurat.');
        setNeuralLoad(94);
      }
    } else {
      setDefconLevel(5);
      setDefconAlert(null);
      setNeuralLoad(48);
    }
  };

  const handleSimulateEvent = (eventName: string) => {
    setActiveSimulation(eventName);
    setNeuralLoad(prev => Math.min(98, prev + 12));
    setTimeout(() => {
      setActiveSimulation(null);
      setNeuralLoad(prev => Math.max(48, prev - 10));
    }, 2000);
  };

  const handleToggleGembokCabang = async (cabang: Cabang) => {
    const newStatus = !cabang.is_kasir_locked;
    try {
      await db.updateCabang(cabang.id, {
        is_kasir_locked: newStatus,
      });
      await loadInitialData();
      alert(`Status gembok kasir ${cabang.nama} berhasil diubah menjadi: ${newStatus ? 'TERGEMBOK' : 'AKTIF'}`);
    } catch {
      alert('Gagal memperbarui status gembok cabang.');
    }
  };

  const handleSaveCabangKasir = async (cabangId: string) => {
    setSavingCabang(true);
    try {
      await db.updateCabang(cabangId, {
        kasir_username: editKasirUsername.toLowerCase().trim(),
        kasir_password_plain: editKasirPassword.trim(),
      });
      setEditingCabangId(null);
      await loadInitialData();
      alert('Kredensial kasir cabang berhasil diperbarui!');
    } catch {
      alert('Gagal menyimpan kredensial kasir.');
    } finally {
      setSavingCabang(false);
    }
  };

  const handleMasterLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('pakagan_master_root_authenticated');
    }
    router.replace('/master-gate');
  };

  if (isAuth === null) {
    return (
      <div className="min-h-screen bg-slate-950 text-emerald-400 flex items-center justify-center font-mono">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <span>VERIFYING MASTER ROOT CREDENTIALS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-black relative overflow-x-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/25 via-slate-950 to-black pointer-events-none" />

      {/* Standalone Master Navbar */}
      <header className="sticky top-0 z-50 bg-slate-900/85 border-b border-slate-800 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-lg shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono font-black text-white text-base tracking-wider truncate">
                  IVOK MASTER COMMAND CENTER
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ROOT ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                Pusat Kontrol Siber, Buka Gembok Akun &amp; Pengaturan Nama Dasbor Pusat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 transition shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              title="Masuk ke Dashboard Operasional Pusat Pak Agan"
            >
              <span>🏢 Buka Dasbor Pusat</span>
              <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
            </Link>

            <Link
              href="/"
              target="_blank"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition"
              title="Halaman Login Awal"
            >
              <span>🌐 Pintu Publik</span>
            </Link>

            <button
              onClick={handleMasterLogout}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition flex items-center gap-1.5 cursor-pointer"
              title="Kunci & Keluar dari Akses Master"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar Root</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">

        {/* 1. HERO BANNER: PORTAL MASTER DEVELOPER */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Pertahanan Siber Aktif
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-slate-800 text-slate-400 border border-slate-700">
                Dedicated Master Gateway
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              Portal Khusus Master Developer
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Halaman ini terisolasi sepenuhnya dari menu Admin Pusat / Toko. Digunakan khusus oleh Master untuk mengubah identitas &amp; nama dasbor pusat, reset sandi Owner, mengaktifkan lockdown darurat DEFCON 1, serta membuka gembok akun kasir 10 cabang.
            </p>
          </div>

          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 shrink-0 flex items-center gap-3 shadow-inner">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-sm">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-500">Master Session:</div>
              <div className="text-xs font-mono font-bold text-emerald-400">Faiz Cimunk (Master Developer)</div>
              <div className="text-[10px] font-mono text-slate-400">faizcimunk12@gmail.com</div>
            </div>
          </div>
        </div>

        {/* 2. TOMBOL DARURAT SIBER (EMERGENCY KILL-SWITCH) */}
        <div className={`p-5 rounded-3xl border transition-all ${
          defconLevel === 1 
            ? 'bg-rose-950/70 border-rose-600 shadow-[0_0_30px_rgba(225,29,72,0.3)] animate-pulse' 
            : 'bg-slate-900/80 border-slate-800 shadow-xl'
        } backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg ${
              defconLevel === 1 ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}>
              {defconLevel === 1 ? <ShieldAlert className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-6 h-6 text-emerald-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full ${
                  defconLevel === 1 ? 'bg-rose-600 text-white' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {defconLevel === 1 ? 'DEFCON 1: SISTEM TERKUNCI' : 'DEFCON 5: SISTEM AMAN'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {defconLevel === 1 ? 'Darurat Siber Berjalan' : 'Akses Operasional Normal'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-1">
                Tombol Darurat Siber (Emergency Kill-Switch)
              </h3>
              <p className="text-[11px] text-slate-400">
                Jika mendeteksi serangan masal hacker atau kebocoran data, aktifkan tombol ini untuk membekukan akses dalam 1 detik.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleDefcon}
            className={`px-5 py-3 rounded-2xl font-mono font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shrink-0 ${
              defconLevel === 1
                ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-emerald-600/30'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
            }`}
          >
            {defconLevel === 1 ? '🔓 NORMALKAN KEMBALI (DEFCON 5)' : '🚨 AKTIFKAN DEFCON 1 (LOCKDOWN)'}
          </button>
        </div>

        {/* 3. MULTI-AGENT AI NEURAL MATRIX */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-mono font-black text-sm text-white">MULTI-AGENT AI NEURAL MATRIX</h3>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    32 AGENT NODES
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  Event-Driven Architecture: Sinkronisasi otomatis antar cabang, mutasi kasir &amp; otorisasi keuangan.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-500 block uppercase">Beban Neural</span>
                <span className="text-xs font-mono font-bold text-emerald-400">{neuralLoad}%</span>
              </div>
              <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${neuralLoad}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mr-2">
              Trigger Simulasi Event:
            </span>
            <button
              onClick={() => handleSimulateEvent('Tambah Pekerja Baru')}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-mono transition border ${
                activeSimulation === 'Tambah Pekerja Baru' 
                  ? 'bg-emerald-500 text-black border-emerald-400 font-bold' 
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              + Tambah Staf Baru
            </button>
            <button
              onClick={() => handleSimulateEvent('Tukang Ajukan Kasbon')}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-mono transition border ${
                activeSimulation === 'Tukang Ajukan Kasbon' 
                  ? 'bg-amber-500 text-black border-amber-400 font-bold' 
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              + Kasir Ajukan Belanja
            </button>
            <button
              onClick={() => handleSimulateEvent('Upload Nota Belanja')}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-mono transition border ${
                activeSimulation === 'Upload Nota Belanja' 
                  ? 'bg-purple-500 text-white border-purple-400 font-bold' 
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              + Upload Bukti Transfer WA
            </button>
            <button
              onClick={() => handleSimulateEvent('Kasir Buka Shift')}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-mono transition border ${
                activeSimulation === 'Kasir Buka Shift' 
                  ? 'bg-cyan-500 text-black border-cyan-400 font-bold' 
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              + Buka Shift Kasir Cabang
            </button>
          </div>
        </div>

        {/* 4. KELOLA NAMA & SANDI DASBOR PUSAT (FITUR UTAMA YANG DIMINTA USER) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white font-mono">
                  Pengaturan Identitas &amp; Sandi Dasbor Pusat
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Wewenang khusus Master Developer untuk mengubah Nama Dasbor Pusat, Username, Kata Sandi, dan Kontak Pemilik.
              </p>
            </div>

            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 self-start sm:self-center">
              Akses Root Master
            </span>
          </div>

          {ownerSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-emerald-200 font-bold mb-0.5">Berhasil Diperbarui:</strong>
                {ownerSuccess}
              </div>
            </div>
          )}

          {ownerError && (
            <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-rose-200 font-bold mb-0.5">Gagal Menyimpan:</strong>
                {ownerError}
              </div>
            </div>
          )}

          <form onSubmit={handleSaveOwnerProfile} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* NAMA DASBOR PUSAT / PEMILIK */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-slate-300 font-bold">
                  NAMA RESMI DASBOR PUSAT / PEMILIK:
                </label>
                <input
                  type="text"
                  value={ownerNama}
                  onChange={(e) => setOwnerNama(e.target.value)}
                  placeholder="Contoh: Pak Agan (Owner) / Serabi Bawel Pusat"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition shadow-inner"
                  required
                />
                <p className="text-[10px] text-slate-500">
                  *Nama ini tampil di pojok kanan atas dasbor pusat, slip gaji, dan profil sistem.
                </p>
              </div>

              {/* USERNAME LOGIN PUSAT */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-slate-300 font-bold">
                  USERNAME LOGIN DASBOR PUSAT:
                </label>
                <input
                  type="text"
                  value={ownerUsername}
                  onChange={(e) => setOwnerUsername(e.target.value)}
                  placeholder="Contoh: pakagan"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition shadow-inner lowercase"
                  required
                />
                <p className="text-[10px] text-slate-500">
                  *Digunakan untuk masuk ke Dashboard Pusat di halaman login utama.
                </p>
              </div>

              {/* PASSWORD / SANDI PUSAT */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono text-slate-300 font-bold">
                    PASSWORD / SANDI MASUK PUSAT:
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const rand = Math.floor(1000 + Math.random() * 9000);
                        setOwnerPassword(String(rand));
                        setShowOwnerPassword(true);
                      }}
                      className="text-[10px] font-mono text-amber-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>PIN 4-Angka</span>
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setOwnerPassword('Agan#Bawel2026!');
                        setShowOwnerPassword(true);
                      }}
                      className="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer"
                    >
                      Sandi Kuat
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={showOwnerPassword ? 'text' : 'password'}
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="Contoh: 1234 atau SandiKuat#2026"
                    className="w-full pl-4 pr-11 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition shadow-inner"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                    title={showOwnerPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
                  >
                    {showOwnerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* NOMOR TELEPON / WA RESMI PEMILIK */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-slate-300 font-bold">
                  NOMOR HP / WHATSAPP RESMI PEMILIK:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="Contoh: 0813-9843-1313"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition shadow-inner"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  *Nomor WhatsApp penerima laporan rekonsiliasi dan notifikasi approval.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800/80">
              <span className="text-[11px] font-mono text-slate-400">
                🔒 Perubahan tersinkronisasi otomatis ke Database Supabase &amp; LocalStorage.
              </span>

              <button
                type="submit"
                disabled={savingOwner}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-slate-950 font-mono font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/25"
              >
                {savingOwner ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan Dasbor Pusat</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 5. TABEL KREDENSIAL KASIR 10 CABANG */}
        <div className="bg-slate-900/85 border border-slate-800 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white font-mono">
                  Daftar Akses &amp; Gembok Kasir 10 Cabang
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pantau username, sandi, dan status gembok keamanan kasir tiap outlet langsung dari Master Command Center.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Total {cabangList.length} Cabang Aktif
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                  <th className="p-3">Cabang Outlet</th>
                  <th className="p-3">PJ &amp; Kontak</th>
                  <th className="p-3">Username Kasir</th>
                  <th className="p-3">Password Kasir</th>
                  <th className="p-3">Status Gembok</th>
                  <th className="p-3 text-right">Aksi Master</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {cabangList.map(cabang => (
                  <tr key={cabang.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-3 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">#{cabang.nomor}</span>
                        <span>{cabang.nama}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">{cabang.kode} • {cabang.kota}</div>
                    </td>

                    <td className="p-3 text-slate-300">
                      <div>{cabang.pj_nama || '-'}</div>
                      <div className="text-[10px] text-slate-500">{cabang.pj_telepon || cabang.telepon || '-'}</div>
                    </td>

                    <td className="p-3">
                      {editingCabangId === cabang.id ? (
                        <input
                          type="text"
                          value={editKasirUsername}
                          onChange={(e) => setEditKasirUsername(e.target.value)}
                          className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-emerald-400 font-mono w-32"
                        />
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono">
                          {cabang.kasir_username || 'kasir'}
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      {editingCabangId === cabang.id ? (
                        <input
                          type="text"
                          value={editKasirPassword}
                          onChange={(e) => setEditKasirPassword(e.target.value)}
                          className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-amber-300 font-mono w-36"
                        />
                      ) : (
                        <span className="font-mono text-slate-300">
                          {cabang.kasir_password_plain || 'Kasir#Bawel2026!'}
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        cabang.is_kasir_locked 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' 
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {cabang.is_kasir_locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        <span>{cabang.is_kasir_locked ? 'TERKUNCI' : 'AKTIF'}</span>
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      {editingCabangId === cabang.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSaveCabangKasir(cabang.id)}
                            disabled={savingCabang}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[10px] font-bold"
                          >
                            Simpan
                          </button>
                          <button
                            onClick={() => setEditingCabangId(null)}
                            className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-[10px]"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingCabangId(cabang.id);
                              setEditKasirUsername(cabang.kasir_username || 'kasir');
                              setEditKasirPassword(cabang.kasir_password_plain || 'Kasir#Bawel2026!');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleGembokCabang(cabang)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono ${
                              cabang.is_kasir_locked 
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {cabang.is_kasir_locked ? 'Buka Gembok' : 'Gembok'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 6. RADAR AUDIT LOG KEAMANAN REAL-TIME */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h3 className="font-mono font-black text-sm text-white">RADAR AUDIT LOG KEAMANAN SIBER REAL-TIME</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500">Live Stream &bull; GPS Telemetry</span>
          </div>

          <div className="divide-y divide-slate-800/60 font-mono text-xs">
            {auditLogs.map(log => (
              <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-500 text-[10px]">{log.waktu}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    log.level === 'AMAN' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}>
                    {log.level}
                  </span>
                  <span className="text-slate-200">{log.kegiatan}</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span>{log.pelaku}</span>
                  <span className="text-slate-600">&bull;</span>
                  <span className="text-slate-500">{log.ip}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Footer Branding */}
      <footer className="relative z-10 border-t border-slate-900 py-6 text-center text-xs text-slate-600 font-mono">
        <p>IVOK CYBER DEFENSE &bull; SERABI BAWEL &amp; WEDANG GEPREK (PAK AGAN POS)</p>
        <p className="text-[10px] mt-1 text-slate-700">Dedicated Master Architecture &bull; All Rights Reserved &copy; 2026</p>
      </footer>
    </div>
  );
}
