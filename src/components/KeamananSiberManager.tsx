'use client';

import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  KeyRound, 
  User, 
  Eye, 
  EyeOff, 
  Dices, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Store, 
  Users, 
  MessageCircle, 
  Copy, 
  AlertTriangle,
  Radio,
  Server,
  Zap,
  CheckCircle2,
  X
} from 'lucide-react';
import { Cabang, Karyawan } from '@/lib/types';
import { db } from '@/lib/db';
import { formatKaryawanRole } from '@/lib/utils';

interface KeamananSiberManagerProps {
  cabangList: Cabang[];
  karyawanList: Karyawan[];
  onRefreshData: () => Promise<void>;
}

export default function KeamananSiberManager({
  cabangList,
  karyawanList,
  onRefreshData,
}: KeamananSiberManagerProps) {
  // Navigation Sub-tab
  const [subTab, setSubTab] = useState<'owner' | 'kasir' | 'karyawan'>('owner');

  // Owner State
  const ownerUser = useMemo(() => {
    return karyawanList.find(k => k.role === 'owner' || k.username === 'pakagan') || {
      id: 'kar-0',
      cabang_id: 'pusat',
      username: 'pakagan',
      nama: 'Pak Agan (Owner Pusat)',
      role: 'owner' as const,
      telepon: '0813-9843-1313',
      pin_hash: '',
      password_plain: 'Owner#Serabi2026!',
      is_locked: false,
      tipe_gaji: 'bulanan' as const,
      gaji_pokok: 0,
      tunjangan: 0,
      plafon_kasbon: 0,
      is_active: true,
    };
  }, [karyawanList]);

  const [ownerUsername, setOwnerUsername] = useState<string>(ownerUser.username || 'pakagan');
  const [ownerPassword, setOwnerPassword] = useState<string>(ownerUser.password_plain || 'Owner#Serabi2026!');
  const [showOwnerPassword, setShowOwnerPassword] = useState<boolean>(false);
  const [savingOwner, setSavingOwner] = useState<boolean>(false);
  const [ownerSuccessMsg, setOwnerSuccessMsg] = useState<string>('');
  const [ownerErrorMsg, setOwnerErrorMsg] = useState<string>('');

  // Kasir State
  const [searchKasir, setSearchKasir] = useState<string>('');
  const [filterKasirStatus, setFilterKasirStatus] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [showKasirPasswords, setShowKasirPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit Kasir Modal State
  const [editingKasir, setEditingKasir] = useState<Cabang | null>(null);
  const [editKasirUsername, setEditKasirUsername] = useState<string>('');
  const [editKasirPassword, setEditKasirPassword] = useState<string>('');
  const [editKasirLocked, setEditKasirLocked] = useState<boolean>(false);
  const [showEditKasirPassword, setShowEditKasirPassword] = useState<boolean>(false);
  const [savingKasir, setSavingKasir] = useState<boolean>(false);
  const [kasirModalError, setKasirModalError] = useState<string>('');
  const [kasirActionSuccess, setKasirActionSuccess] = useState<string>('');

  // Karyawan State
  const [searchKaryawan, setSearchKaryawan] = useState<string>('');
  const [filterKaryawanRole, setFilterKaryawanRole] = useState<string>('all');
  const [filterKaryawanCabang, setFilterKaryawanCabang] = useState<string>('all');
  const [editingKaryawan, setEditingKaryawan] = useState<Karyawan | null>(null);
  const [editKaryawanUsername, setEditKaryawanUsername] = useState<string>('');
  const [editKaryawanPassword, setEditKaryawanPassword] = useState<string>('');
  const [editKaryawanLocked, setEditKaryawanLocked] = useState<boolean>(false);
  const [showEditKaryawanPassword, setShowEditKaryawanPassword] = useState<boolean>(false);
  const [savingKaryawan, setSavingKaryawan] = useState<boolean>(false);
  const [karyawanModalError, setKaryawanModalError] = useState<string>('');
  const [karyawanActionSuccess, setKaryawanActionSuccess] = useState<string>('');

  // DEFCON Lockdown Modal State
  const [showGlobalLockConfirm, setShowGlobalLockConfirm] = useState<boolean>(false);
  const [showGlobalUnlockConfirm, setShowGlobalUnlockConfirm] = useState<boolean>(false);
  const [processingGlobalDefcon, setProcessingGlobalDefcon] = useState<boolean>(false);

  // Telemetry Calculations
  const totalCabang = cabangList.length;
  const lockedCabangCount = cabangList.filter(c => c.is_kasir_locked).length;
  const unlockedCabangCount = totalCabang - lockedCabangCount;
  const totalKaryawan = karyawanList.filter(k => k.role !== 'owner').length;
  const lockedKaryawanCount = karyawanList.filter(k => k.is_locked && k.role !== 'owner').length;

  // DEFCON Level
  const defconLevel = useMemo(() => {
    if (lockedCabangCount === totalCabang && totalCabang > 0) return 1; // Emergency Lockdown
    if (lockedCabangCount > 0) return 2; // Warning / Partial Lockdown
    return 5; // Normal Peace
  }, [lockedCabangCount, totalCabang]);

  // Strong Password Generator Helper
  const generateStrongPassword = (prefix = 'Serabi') => {
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowers = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '!@#$%&*';
    const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];

    const core = [
      pick(uppers),
      pick(uppers),
      pick(lowers),
      pick(lowers),
      pick(numbers),
      pick(numbers),
      pick(symbols),
      pick(symbols),
    ].sort(() => 0.5 - Math.random()).join('');

    return `${prefix}#${core}!`;
  };

  // Password Strength Checker
  const checkPasswordStrength = (pwd: string) => {
    return {
      hasMinLen: pwd.length >= 8,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSymbol: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pwd),
    };
  };

  // Handle Save Owner Credentials
  const handleSaveOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerSuccessMsg('');
    setOwnerErrorMsg('');

    const cleanUsername = ownerUsername.trim().toLowerCase();
    const cleanPassword = ownerPassword.trim();

    if (!cleanUsername) {
      setOwnerErrorMsg('Username Master Owner tidak boleh kosong.');
      return;
    }

    const strength = checkPasswordStrength(cleanPassword);
    if (!strength.hasMinLen || !strength.hasUpper || !strength.hasLower || !strength.hasNumber || !strength.hasSymbol) {
      setOwnerErrorMsg('Password belum memenuhi standar keamanan tinggi (Wajib: min. 8 karakter, huruf besar, huruf kecil, angka, dan simbol).');
      return;
    }

    setSavingOwner(true);
    try {
      await db.updateKaryawanCredentials(ownerUser.id, {
        username: cleanUsername,
        password_plain: cleanPassword,
        is_locked: false,
      });

      // Synchronize active browser session & local credentials so remember me stays updated
      if (typeof window !== 'undefined') {
        const savedRemember = localStorage.getItem('pakagan_remember_login');
        if (savedRemember !== 'false') {
          localStorage.setItem('pakagan_saved_username', cleanUsername);
          localStorage.setItem('pakagan_saved_password', cleanPassword);
        }
        const sessionUser = sessionStorage.getItem('pakagan_user');
        if (sessionUser) {
          try {
            const parsed = JSON.parse(sessionUser);
            parsed.username = cleanUsername;
            parsed.password_plain = cleanPassword;
            sessionStorage.setItem('pakagan_user', JSON.stringify(parsed));
          } catch {}
        }
      }

      await onRefreshData();
      setOwnerSuccessMsg('Kredensial Master Owner berhasil diperbarui! Akses terlindungi enkripsi SHA-256.');
      setTimeout(() => setOwnerSuccessMsg(''), 5000);
    } catch (err: any) {
      setOwnerErrorMsg(err.message || 'Gagal menyimpan kredensial owner.');
    } finally {
      setSavingOwner(false);
    }
  };

  // Handle Quick Toggle Lock Cabang
  const handleToggleLockCabang = async (cabang: Cabang) => {
    const newLockState = !cabang.is_kasir_locked;
    const confirmText = newLockState
      ? `🔒 KONFIRMASI GEMBOK KASIR:\n\nApakah Anda yakin ingin menggembok tablet kasir cabang "${cabang.nama}" (${cabang.kode})?\n\nSetelah digembok, kasir tidak akan bisa login ke laci kasir demi keamanan.`
      : `🔓 BUKA GEMBOK KASIR:\n\nBuka kembali akses login kasir untuk cabang "${cabang.nama}"?`;

    if (!window.confirm(confirmText)) return;

    try {
      await db.updateCabang(cabang.id, {
        is_kasir_locked: newLockState,
      });
      await onRefreshData();
      setKasirActionSuccess(
        newLockState 
          ? `Gembok kasir ${cabang.nama} BERHASIL DIAKTIFKAN. Akses tablet terputus.` 
          : `Gembok kasir ${cabang.nama} berhasil DIBUKA. Kasir siap login kembali.`
      );
      setTimeout(() => setKasirActionSuccess(''), 4000);
    } catch (err: any) {
      alert('Gagal mengubah status gembok: ' + err.message);
    }
  };

  // Open Edit Kasir Modal
  const handleOpenEditKasir = (cbg: Cabang) => {
    setEditingKasir(cbg);
    setEditKasirUsername(cbg.kasir_username || `kasir_${cbg.kode?.toLowerCase() || 'cbg'}`);
    setEditKasirPassword(cbg.kasir_password_plain || 'Kasir#Bawel2026!');
    setEditKasirLocked(!!cbg.is_kasir_locked);
    setShowEditKasirPassword(false);
    setKasirModalError('');
  };

  // Save Edit Kasir Modal
  const handleSaveKasirModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKasir) return;

    const cleanUser = editKasirUsername.trim().toLowerCase();
    const cleanPass = editKasirPassword.trim();

    if (!cleanUser) {
      setKasirModalError('Username kasir tidak boleh kosong.');
      return;
    }
    if (cleanPass.length < 6) {
      setKasirModalError('Password kasir minimal 6 karakter.');
      return;
    }

    setSavingKasir(true);
    setKasirModalError('');
    try {
      await db.updateCabang(editingKasir.id, {
        kasir_username: cleanUser,
        kasir_password_plain: cleanPass,
        is_kasir_locked: editKasirLocked,
      });

      await onRefreshData();
      setKasirActionSuccess(`Kredensial kasir untuk ${editingKasir.nama} berhasil disimpan & disinkronkan ke tablet cabang!`);
      setEditingKasir(null);
      setTimeout(() => setKasirActionSuccess(''), 5000);
    } catch (err: any) {
      setKasirModalError(err.message || 'Gagal menyimpan kredensial kasir.');
    } finally {
      setSavingKasir(false);
    }
  };

  // Handle Copy to Clipboard
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Generate WhatsApp Share Link for Kasir Credentials
  const generateKasirWaUrl = (cbg: Cabang) => {
    const rawPhone = cbg.pj_telepon || cbg.telepon || '081398431313';
    const cleanPhone = rawPhone.replace(/\D/g, '').replace(/^0/, '62');
    const pass = cbg.kasir_password_plain || 'Kasir#Bawel2026!';
    const user = cbg.kasir_username || `kasir_${cbg.kode?.toLowerCase() || 'cbg'}`;
    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const msg = 
      `*SERABI BAWEL & WEDANG GEPREK*\n` +
      `*PEMBERITAHUAN KREDENSIAL LOGIN KASIR RESMI*\n` +
      `----------------------------------------\n` +
      `Halo Bapak/Ibu *${cbg.pj_nama || 'Penanggung Jawab Cabang'}*,\n\n` +
      `Berikut adalah kredensial akses login tablet kasir resmi untuk:\n` +
      `• *Cabang:* ${cbg.nama} (${cbg.kode})\n` +
      `• *Username Kasir:* \`${user}\`\n` +
      `• *Password Kasir:* \`${pass}\`\n` +
      `• *Status Akses:* ${cbg.is_kasir_locked ? '⚠️ DIGEMBOK SEMENTARA' : '✅ AKTIF & SIAP LOGIN'}\n` +
      `• *Waktu Update:* ${dateStr} WIB\n\n` +
      `*KEAMANAN KETAT:* Harap jaga kerahasiaan sandi ini demi keamanan laci kasir dan omzet toko cabang.\n\n` +
      `_Pusat Keamanan Siber • Serabi Bawel & Wedang Geprek Grup_`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  // Handle DEFCON Emergency Global Lockdown / Unlock
  const handleExecuteGlobalDefcon = async (shouldLock: boolean) => {
    setProcessingGlobalDefcon(true);
    try {
      await db.setAllCabangKasirLock(shouldLock);
      await onRefreshData();
      setShowGlobalLockConfirm(false);
      setShowGlobalUnlockConfirm(false);
      setKasirActionSuccess(
        shouldLock 
          ? '🚨 DEFCON 1 DIAKTIFKAN: Seluruh tablet kasir 10 cabang berhasil DIGEMBOK secara serentak!'
          : '🔓 DEFCON 5 DIAKTIFKAN: Seluruh gembok kasir cabang berhasil DIBUKA KEMBALI.'
      );
      setTimeout(() => setKasirActionSuccess(''), 5000);
    } catch (err: any) {
      alert('Gagal mengeksekusi DEFCON: ' + err.message);
    } finally {
      setProcessingGlobalDefcon(false);
    }
  };

  // Open Edit Karyawan Modal
  const handleOpenEditKaryawan = (kar: Karyawan) => {
    setEditingKaryawan(kar);
    setEditKaryawanUsername(kar.username || kar.nama.toLowerCase().replace(/\s+/g, ''));
    setEditKaryawanPassword(kar.password_plain || '1234');
    setEditKaryawanLocked(!!kar.is_locked);
    setShowEditKaryawanPassword(false);
    setKaryawanModalError('');
  };

  // Save Edit Karyawan Modal
  const handleSaveKaryawanModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKaryawan) return;

    const cleanUser = editKaryawanUsername.trim().toLowerCase();
    const cleanPass = editKaryawanPassword.trim();

    if (!cleanUser) {
      setKaryawanModalError('Username staf tidak boleh kosong.');
      return;
    }
    if (cleanPass.length < 4) {
      setKaryawanModalError('Password staf minimal 4 karakter.');
      return;
    }

    setSavingKaryawan(true);
    setKaryawanModalError('');
    try {
      await db.updateKaryawanCredentials(editingKaryawan.id, {
        username: cleanUser,
        password_plain: cleanPass,
        is_locked: editKaryawanLocked,
      });

      await onRefreshData();
      setKaryawanActionSuccess(`Kredensial untuk staf ${editingKaryawan.nama} berhasil diperbarui!`);
      setEditingKaryawan(null);
      setTimeout(() => setKaryawanActionSuccess(''), 5000);
    } catch (err: any) {
      setKaryawanModalError(err.message || 'Gagal menyimpan kredensial staf.');
    } finally {
      setSavingKaryawan(false);
    }
  };

  // Filtered Kasir Cabang
  const filteredCabang = useMemo(() => {
    return cabangList.filter(c => {
      const matchSearch = 
        c.nama.toLowerCase().includes(searchKasir.toLowerCase()) ||
        c.kode.toLowerCase().includes(searchKasir.toLowerCase()) ||
        (c.kasir_username || '').toLowerCase().includes(searchKasir.toLowerCase()) ||
        (c.kota || '').toLowerCase().includes(searchKasir.toLowerCase()) ||
        (c.pj_nama || '').toLowerCase().includes(searchKasir.toLowerCase());

      const matchStatus = 
        filterKasirStatus === 'all' ? true :
        filterKasirStatus === 'locked' ? c.is_kasir_locked :
        !c.is_kasir_locked;

      return matchSearch && matchStatus;
    });
  }, [cabangList, searchKasir, filterKasirStatus]);

  // Filtered Karyawan
  const filteredKaryawan = useMemo(() => {
    return karyawanList.filter(k => {
      if (k.role === 'owner') return false; // Handled in Owner tab

      const matchSearch = 
        k.nama.toLowerCase().includes(searchKaryawan.toLowerCase()) ||
        (k.username || '').toLowerCase().includes(searchKaryawan.toLowerCase()) ||
        (k.telepon || '').includes(searchKaryawan);

      const matchRole = filterKaryawanRole === 'all' || k.role === filterKaryawanRole;
      const matchCabang = filterKaryawanCabang === 'all' || k.cabang_id === filterKaryawanCabang;

      return matchSearch && matchRole && matchCabang;
    });
  }, [karyawanList, searchKaryawan, filterKaryawanRole, filterKaryawanCabang]);

  const ownerStrength = checkPasswordStrength(ownerPassword);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">

      {/* =========================================================================
          CYBER DEFENSE HERO HUD (INSPIRED BY IVOK CYBER DEFENSE, WITH EMERALD-AMBER PALETTE)
         ========================================================================= */}
      <div className="relative rounded-3xl bg-slate-950 border border-emerald-500/30 p-6 sm:p-8 shadow-[0_25px_60px_rgba(2,44,34,0.35)] overflow-hidden text-white">
        
        {/* Futuristic Background Circuit / Ambient Glow */}
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800/80 pb-6">
          
          {/* Logo & Headline */}
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-800 to-slate-950 p-0.5 shadow-lg shadow-emerald-950/60 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <div className="w-full h-full rounded-2xl bg-slate-950/90 flex flex-col items-center justify-center">
                <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400 animate-pulse" />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 shadow-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  IVOK CYBER DEFENSE v4.2
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700">
                  ISOLASI TOTAL • F&amp;B POS
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                Pusat Keamanan Siber &amp; Kredensial Multi-Cabang
              </h2>
              <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
                Kendali penuh proteksi sandi Owner Pak Agan, akun kasir 10 cabang, gembok darurat laci kasir, dan penangkal serangan brute-force.
              </p>
            </div>
          </div>

          {/* DEFCON Status Box */}
          <div className="shrink-0 flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 backdrop-blur-md">
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                Status Siaga Sistem
              </span>
              <span className={`text-xs sm:text-sm font-black ${
                defconLevel === 1 ? 'text-rose-400 animate-pulse' :
                defconLevel === 2 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {defconLevel === 1 ? '🚨 DEFCON 1 • EMERGENCY LOCKDOWN' :
                 defconLevel === 2 ? '⚠️ DEFCON 2 • BEBERAPA KASIR DIGEMBOK' :
                 '🛡️ DEFCON 5 • SISTEM AMAN TERKENDALI'}
              </span>
            </div>
            <div className={`w-3.5 h-3.5 rounded-full ${
              defconLevel === 1 ? 'bg-rose-500 shadow-[0_0_12px_#f43f5e]' :
              defconLevel === 2 ? 'bg-amber-500 shadow-[0_0_12px_#f59e0b]' :
              'bg-emerald-400 shadow-[0_0_12px_#34d399]'
            }`} />
          </div>

        </div>

        {/* Security Matrix Badges & DEFCON Global Controls */}
        <div className="relative z-10 pt-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Security Features Pills */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-emerald-300">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>WAF ACTIVE</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-cyan-300">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>ANTI-BRUTE FORCE ON</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-purple-500/30 text-purple-300">
              <Server className="w-3.5 h-3.5 text-purple-400" />
              <span>ZERO-TRUST DB ISOLATED</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-amber-500/30 text-amber-300">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>AES-256 / SHA-256</span>
            </span>
          </div>

          {/* Emergency Global Actions */}
          <div className="flex items-center gap-2">
            {lockedCabangCount < totalCabang ? (
              <button
                type="button"
                onClick={() => setShowGlobalLockConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700 text-xs font-black transition shadow-lg cursor-pointer hover:shadow-rose-900/40"
                title="Kunci seluruh akses login tablet kasir di 10 cabang secara serentak"
              >
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>GEMBOK SEMUA KASIR</span>
              </button>
            ) : null}

            {lockedCabangCount > 0 && (
              <button
                type="button"
                onClick={() => setShowGlobalUnlockConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600 text-xs font-black transition shadow-lg cursor-pointer hover:shadow-emerald-900/40"
                title="Buka kembali seluruh gembok tablet kasir 10 cabang"
              >
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                <span>BUKA SEMUA GEMBOK</span>
              </button>
            )}
          </div>

        </div>

      </div>

      {/* =========================================================================
          GLOBAL NOTIFICATION TOAST
         ========================================================================= */}
      {kasirActionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold shadow-soft-sm flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{kasirActionSuccess}</span>
        </div>
      )}

      {karyawanActionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold shadow-soft-sm flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{karyawanActionSuccess}</span>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB NAVIGATION
         ========================================================================= */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-soft-sm">
        
        {/* Tab 1: Master Owner */}
        <button
          type="button"
          onClick={() => setSubTab('owner')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            subTab === 'owner'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <User className={`w-4 h-4 ${subTab === 'owner' ? 'text-amber-400' : 'text-slate-500'}`} />
          <span>Akun Master Owner (Pak Agan)</span>
        </button>

        {/* Tab 2: 10 Kasir Cabang */}
        <button
          type="button"
          onClick={() => setSubTab('kasir')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            subTab === 'kasir'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Store className={`w-4 h-4 ${subTab === 'kasir' ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span>Matrix Kredensial 10 Kasir Cabang</span>
          {lockedCabangCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
              {lockedCabangCount} Terkunci
            </span>
          )}
        </button>

        {/* Tab 3: Staf Karyawan */}
        <button
          type="button"
          onClick={() => setSubTab('karyawan')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            subTab === 'karyawan'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className={`w-4 h-4 ${subTab === 'karyawan' ? 'text-blue-400' : 'text-slate-500'}`} />
          <span>Kredensial Staf Karyawan ({totalKaryawan})</span>
        </button>

      </div>

      {/* =========================================================================
          TAB 1: AKUN MASTER OWNER (PAK AGAN)
         ========================================================================= */}
      {subTab === 'owner' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft-sm p-6 sm:p-8 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">👑</span>
                <h3 className="text-lg font-black text-slate-900">
                  Kredensial Akses Master Owner (Pak Agan)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Akun dengan hak akses tertinggi. Dapat mengelola seluruh backoffice, laporan laba rugi 10 cabang, gaji, dan persetujuan.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-900 px-3.5 py-2 rounded-2xl text-xs font-bold self-start">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Status: Terlindungi Sandi Kuat</span>
            </div>
          </div>

          {ownerSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{ownerSuccessMsg}</span>
            </div>
          )}

          {ownerErrorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{ownerErrorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveOwner} className="space-y-6 max-w-2xl">
            
            {/* Read-Only Account Identity Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 block uppercase">
                  Nama Resmi Owner
                </span>
                <span className="text-xs font-extrabold text-slate-800">
                  {ownerUser.nama || 'Pak Agan (Owner Pusat)'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 block uppercase">
                  Nomor Telepon / WhatsApp Resmi
                </span>
                <span className="text-xs font-extrabold text-slate-800">
                  {ownerUser.telepon || '0813-9843-1313'}
                </span>
              </div>
            </div>

            {/* Field: Username Master */}
            <div>
              <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                Username Master Owner:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={ownerUsername}
                  onChange={(e) => setOwnerUsername(e.target.value)}
                  required
                  placeholder="Contoh: pakagan"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs font-bold text-slate-900 bg-white"
                />
                <div className="absolute left-3 top-3.5 text-slate-400">
                  <User className="w-4 h-4 text-emerald-700" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 pl-1">
                *Digunakan saat login di pintu utama aplikasi. Default: <code>pakagan</code>
              </p>
            </div>

            {/* Field: Password Master */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold text-slate-800">
                  Password Master Baru:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const generated = generateStrongPassword('Owner');
                      setOwnerPassword(generated);
                      setShowOwnerPassword(true);
                      setOwnerErrorMsg('');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition cursor-pointer"
                  >
                    <Dices className="w-3.5 h-3.5 text-amber-600" />
                    <span>Acak Sandi Kuat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-800 hover:underline cursor-pointer"
                  >
                    {showOwnerPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showOwnerPassword ? 'Tutup' : 'Lihat'}</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type={showOwnerPassword ? 'text' : 'password'}
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  required
                  placeholder="Masukkan password master baru"
                  className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs font-bold text-slate-900 bg-white"
                />
                <div className="absolute left-3 top-3.5 text-slate-400">
                  <KeyRound className="w-4 h-4 text-emerald-700" />
                </div>
              </div>

              {/* Password Strength Checklist */}
              <div className="mt-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Kriteria Keamanan Sandi Anti-Serangan Siber:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${ownerStrength.hasMinLen ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    {ownerStrength.hasMinLen ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <span className="w-3.5 h-3.5 text-center leading-none">○</span>}
                    <span>Min. 8 Karakter</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${ownerStrength.hasUpper ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    {ownerStrength.hasUpper ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <span className="w-3.5 h-3.5 text-center leading-none">○</span>}
                    <span>Huruf Besar (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${ownerStrength.hasLower ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    {ownerStrength.hasLower ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <span className="w-3.5 h-3.5 text-center leading-none">○</span>}
                    <span>Huruf Kecil (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${ownerStrength.hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    {ownerStrength.hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <span className="w-3.5 h-3.5 text-center leading-none">○</span>}
                    <span>Angka (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${ownerStrength.hasSymbol ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    {ownerStrength.hasSymbol ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <span className="w-3.5 h-3.5 text-center leading-none">○</span>}
                    <span>Tanda Baca / Simbol</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={savingOwner}
                className="px-6 py-3.5 rounded-2xl font-black text-xs text-white bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900 transition-all shadow-md shadow-emerald-700/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingOwner ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{savingOwner ? 'MENYIMPAN KEAMANAN SIBER...' : 'SIMPAN KREDENSIAL MASTER OWNER'}</span>
              </button>
            </div>

          </form>

        </div>
      )}

      {/* =========================================================================
          TAB 2: MATRIX KREDENSIAL 10 KASIR CABANG
         ========================================================================= */}
      {subTab === 'kasir' && (
        <div className="space-y-5">
          
          {/* Action Bar & Filter */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft-sm p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchKasir}
                onChange={(e) => setSearchKasir(e.target.value)}
                placeholder="Cari cabang, kode, kota, username kasir..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-xs font-bold text-slate-900 bg-slate-50"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>

            {/* Filter Status */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                Filter Status:
              </span>
              <button
                type="button"
                onClick={() => setFilterKasirStatus('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  filterKasirStatus === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({cabangList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterKasirStatus('unlocked')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  filterKasirStatus === 'unlocked'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Terbuka ({unlockedCabangCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterKasirStatus('locked')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  filterKasirStatus === 'locked'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Digembok ({lockedCabangCount})
              </button>
            </div>

          </div>

          {/* Grid Cards of 10 Branches */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCabang.map((cbg) => {
              const isLocked = !!cbg.is_kasir_locked;
              const isPassShown = !!showKasirPasswords[cbg.id];
              const passPlain = cbg.kasir_password_plain || 'Kasir#Bawel2026!';
              const userKasir = cbg.kasir_username || `kasir_${cbg.kode?.toLowerCase() || 'cbg'}`;

              return (
                <div 
                  key={cbg.id}
                  className={`rounded-3xl border p-5 transition-all shadow-soft-sm relative overflow-hidden bg-white ${
                    isLocked 
                      ? 'border-rose-300 ring-2 ring-rose-500/20' 
                      : 'border-slate-200/90 hover:border-emerald-400'
                  }`}
                >
                  {/* Top Bar: Code, Name, Lock Badge */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {cbg.kode || 'CBG'}
                        </span>
                        <h4 className="text-sm font-black text-slate-900">
                          {cbg.nama}
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        {cbg.kota || 'Yogyakarta'} &bull; PJ: <strong>{cbg.pj_nama || '-'}</strong> ({cbg.pj_telepon || cbg.telepon || '-'})
                      </span>
                    </div>

                    <div className="shrink-0">
                      {isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                          <Lock className="w-3 h-3 text-rose-600" />
                          <span>DIGEMBOK</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Unlock className="w-3 h-3 text-emerald-600" />
                          <span>TERBUKA</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Credential Data Box */}
                  <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 space-y-2 mb-4">
                    
                    {/* Username Kasir */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500 font-bold">
                        Username Kasir:
                      </span>
                      <div className="flex items-center gap-1.5 font-mono font-black text-slate-800">
                        <code>{userKasir}</code>
                        <button
                          type="button"
                          onClick={() => handleCopyText(userKasir, `user-${cbg.id}`)}
                          className="text-slate-400 hover:text-emerald-700 p-0.5 cursor-pointer"
                          title="Salin username"
                        >
                          {copiedId === `user-${cbg.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Password Kasir */}
                    <div className="flex items-center justify-between text-xs border-t border-slate-200/60 pt-2">
                      <span className="text-[11px] text-slate-500 font-bold">
                        Password Kasir:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 tracking-wide">
                          {isPassShown ? passPlain : '••••••••••••'}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => setShowKasirPasswords(prev => ({ ...prev, [cbg.id]: !prev[cbg.id] }))}
                          className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                          title={isPassShown ? 'Sembunyikan' : 'Lihat Sandi'}
                        >
                          {isPassShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyText(passPlain, `pass-${cbg.id}`)}
                          className="text-slate-400 hover:text-emerald-700 p-0.5 cursor-pointer"
                          title="Salin password"
                        >
                          {copiedId === `pass-${cbg.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    
                    {/* Lock / Unlock Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleLockCabang(cbg)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                        isLocked 
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      <span>{isLocked ? 'Buka Gembok' : 'Gembok Cabang'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {/* WhatsApp Notify PJ */}
                      <a
                        href={generateKasirWaUrl(cbg)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-extrabold transition shadow-2xs"
                        title="Kirim kredensial baru ke nomor WhatsApp PJ Cabang"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Kirim WA PJ</span>
                      </a>

                      {/* Edit Modal Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditKasir(cbg)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition shadow-xs cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>Ubah Kredensial</span>
                      </button>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* =========================================================================
          TAB 3: MATRIX KREDENSIAL KARYAWAN & STAF
         ========================================================================= */}
      {subTab === 'karyawan' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft-sm p-6 space-y-5">
          
          {/* Header & Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4 border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Kredensial Login Staf &amp; Karyawan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mengatur sandi staf untuk presensi, request belanja kas kecil, kasbon, dan melihat slip gaji digital.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchKaryawan}
                  onChange={(e) => setSearchKaryawan(e.target.value)}
                  placeholder="Cari nama / username..."
                  className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              {/* Filter Cabang */}
              <select
                value={filterKaryawanCabang}
                onChange={(e) => setFilterKaryawanCabang(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50"
              >
                <option value="all">Semua Cabang</option>
                {cabangList.map(c => (
                  <option key={c.id} value={c.id}>{c.nama}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table of Employees */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Nama Staf</th>
                  <th className="py-3 px-3">Role / Jabatan</th>
                  <th className="py-3 px-3">Cabang</th>
                  <th className="py-3 px-3">Username</th>
                  <th className="py-3 px-3">Password / PIN</th>
                  <th className="py-3 px-3">Status Gembok</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredKaryawan.map((kar) => {
                  const branchObj = cabangList.find(c => c.id === kar.cabang_id);
                  const isLocked = !!kar.is_locked;

                  return (
                    <tr key={kar.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {kar.nama}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                          {formatKaryawanRole(kar.role)}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-500">
                        {branchObj?.nama || kar.cabang_id}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-800">
                        {kar.username || '-'}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-800">
                        {kar.password_plain || '••••'}
                      </td>
                      <td className="py-3.5 px-3">
                        {isLocked ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-extrabold text-[10px] flex items-center gap-1 w-max">
                            <Lock className="w-3 h-3" />
                            <span>Terkunci</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[10px] flex items-center gap-1 w-max">
                            <Unlock className="w-3 h-3" />
                            <span>Normal</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenEditKaryawan(kar)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                          <span>Reset Sandi</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT KREDENSIAL KASIR CABANG
         ========================================================================= */}
      {editingKasir && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border-t-[5px] border-emerald-600 relative animate-scaleUp">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Ubah Kredensial Kasir: {editingKasir.nama}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Kode: {editingKasir.kode} &bull; {editingKasir.kota}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingKasir(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {kasirModalError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{kasirModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveKasirModal} className="space-y-4">
              
              {/* Username Kasir */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                  Username Kasir Cabang:
                </label>
                <input
                  type="text"
                  value={editKasirUsername}
                  onChange={(e) => setEditKasirUsername(e.target.value)}
                  required
                  placeholder="Contoh: kasir_tebet"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-xs font-bold text-slate-900 bg-slate-50"
                />
              </div>

              {/* Password Kasir */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold text-slate-800">
                    Password Kasir Cabang:
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const pwd = generateStrongPassword('Kasir');
                        setEditKasirPassword(pwd);
                        setShowEditKasirPassword(true);
                      }}
                      className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 transition cursor-pointer"
                    >
                      <Dices className="w-3 h-3 text-amber-600" />
                      <span>Acak Sandi</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditKasirPassword(!showEditKasirPassword)}
                      className="text-[10.5px] font-extrabold text-emerald-800 hover:underline cursor-pointer"
                    >
                      {showEditKasirPassword ? 'Tutup' : 'Lihat'}
                    </button>
                  </div>
                </div>

                <input
                  type={showEditKasirPassword ? 'text' : 'password'}
                  value={editKasirPassword}
                  onChange={(e) => setEditKasirPassword(e.target.value)}
                  required
                  placeholder="Contoh: Kasir#Bawel2026!"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-xs font-bold text-slate-900 bg-slate-50"
                />
              </div>

              {/* Checkbox Gembok Status */}
              <div className="pt-1">
                <label className="flex items-center space-x-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editKasirLocked}
                    onChange={(e) => setEditKasirLocked(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 accent-rose-600 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 block">
                      Gembok / Nonaktifkan Akses Kasir Cabang Ini
                    </span>
                    <span className="text-[10.5px] text-slate-400 block leading-tight">
                      Centang jika ada indikasi kecurangan kasir atau tablet sedang diaudit.
                    </span>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingKasir(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-extrabold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingKasir}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingKasir ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <SaveIcon />}
                  <span>{savingKasir ? 'Menyimpan...' : 'Simpan Kredensial'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT KREDENSIAL KARYAWAN / STAF
         ========================================================================= */}
      {editingKaryawan && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border-t-[5px] border-emerald-600 relative animate-scaleUp">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Reset Sandi Staf: {editingKaryawan.nama}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Role: {formatKaryawanRole(editingKaryawan.role)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingKaryawan(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {karyawanModalError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{karyawanModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveKaryawanModal} className="space-y-4">
              
              {/* Username */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                  Username Staf:
                </label>
                <input
                  type="text"
                  value={editKaryawanUsername}
                  onChange={(e) => setEditKaryawanUsername(e.target.value)}
                  required
                  placeholder="Contoh: agus"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-xs font-bold text-slate-900 bg-slate-50"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold text-slate-800">
                    Password / PIN Baru:
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const pwd = generateStrongPassword('Staf');
                        setEditKaryawanPassword(pwd);
                        setShowEditKaryawanPassword(true);
                      }}
                      className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 transition cursor-pointer"
                    >
                      <Dices className="w-3 h-3 text-amber-600" />
                      <span>Acak Sandi</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditKaryawanPassword(!showEditKaryawanPassword)}
                      className="text-[10.5px] font-extrabold text-emerald-800 hover:underline cursor-pointer"
                    >
                      {showEditKaryawanPassword ? 'Tutup' : 'Lihat'}
                    </button>
                  </div>
                </div>

                <input
                  type={showEditKaryawanPassword ? 'text' : 'password'}
                  value={editKaryawanPassword}
                  onChange={(e) => setEditKaryawanPassword(e.target.value)}
                  required
                  placeholder="Masukkan password atau PIN staf"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-xs font-bold text-slate-900 bg-slate-50"
                />
              </div>

              {/* Gembok Akun Staf */}
              <div className="pt-1">
                <label className="flex items-center space-x-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editKaryawanLocked}
                    onChange={(e) => setEditKaryawanLocked(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 accent-rose-600 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 block">
                      Gembok Akun Staf Ini
                    </span>
                    <span className="text-[10.5px] text-slate-400 block leading-tight">
                      Staf tidak akan bisa login ke portal karyawan jika akunnya digembok.
                    </span>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingKaryawan(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-extrabold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingKaryawan}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingKaryawan ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <SaveIcon />}
                  <span>{savingKaryawan ? 'Menyimpan...' : 'Simpan Kredensial'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONFIRM GLOBAL LOCKDOWN (DEFCON 1)
         ========================================================================= */}
      {showGlobalLockConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border-t-[5px] border-rose-600 relative animate-scaleUp">
            
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Konfirmasi Lockdown Darurat (DEFCON 1)
                </h3>
                <span className="text-[11px] text-rose-600 font-extrabold">
                  Tindakan Keamanan Siber Tingkat Tinggi
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Apakah Anda yakin ingin <strong>MENGGEMBOK SELURUH AKSES KASIR DI 10 CABANG</strong> secara serentak?
              <br /><br />
              Setelah gembok aktif, seluruh tablet kasir toko cabang tidak akan bisa melakukan transaksi baru hingga Pak Agan membuka kembali gembok melalui dashboard ini.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={processingGlobalDefcon}
                onClick={() => setShowGlobalLockConfirm(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-extrabold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={processingGlobalDefcon}
                onClick={() => handleExecuteGlobalDefcon(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 transition shadow-lg shadow-rose-600/30 flex items-center gap-2 cursor-pointer"
              >
                {processingGlobalDefcon ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span>{processingGlobalDefcon ? 'MENGGEMBOK...' : 'YA, GEMBOK SEMUA KASIR'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONFIRM GLOBAL UNLOCK (DEFCON 5)
         ========================================================================= */}
      {showGlobalUnlockConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border-t-[5px] border-emerald-600 relative animate-scaleUp">
            
            <div className="flex items-center gap-3 text-emerald-700 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Unlock className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Buka Seluruh Gembok Kasir Cabang
                </h3>
                <span className="text-[11px] text-emerald-700 font-extrabold">
                  Kembalikan Operasional ke Normal (DEFCON 5)
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Tindakan ini akan membuka seluruh gembok kasir di 10 cabang toko sehingga kasir dapat kembali login dan memproses transaksi penjualan.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={processingGlobalDefcon}
                onClick={() => setShowGlobalUnlockConfirm(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-extrabold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={processingGlobalDefcon}
                onClick={() => handleExecuteGlobalDefcon(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 transition shadow-lg shadow-emerald-700/30 flex items-center gap-2 cursor-pointer"
              >
                {processingGlobalDefcon ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                <span>{processingGlobalDefcon ? 'MEMBUKA...' : 'BUKA SEMUA GEMBOK'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

function SaveIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
