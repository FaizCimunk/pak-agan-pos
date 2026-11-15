'use client';

import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
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
  MessageCircle, 
  Copy, 
  Lock, 
  Unlock,
  CheckCircle2,
  X
} from 'lucide-react';
import { Cabang, Karyawan } from '@/lib/types';
import { db } from '@/lib/db';

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
  // Hanya 2 Tab: Akun Dashboard Pusat & Akun Kasir 10 Cabang (Menu Staf Karyawan ditiadakan)
  const [subTab, setSubTab] = useState<'owner' | 'kasir'>('owner');

  // Owner State
  const ownerUser = useMemo(() => {
    const found = karyawanList.find(k => k.role === 'owner' || k.username === 'pakagan');
    if (found) {
      const pass = found.password_plain && found.password_plain !== 'Owner#Serabi2026!' ? found.password_plain : '1234';
      return { ...found, password_plain: pass };
    }
    return {
      id: 'kar-0',
      cabang_id: 'pusat',
      username: 'pakagan',
      nama: 'Pak Agan (Owner Pusat)',
      role: 'owner' as const,
      telepon: '0813-9843-1313',
      pin_hash: '',
      password_plain: '1234',
      is_locked: false,
      tipe_gaji: 'bulanan' as const,
      gaji_pokok: 0,
      tunjangan: 0,
      plafon_kasbon: 0,
      is_active: true,
    };
  }, [karyawanList]);

  const [ownerUsername, setOwnerUsername] = useState<string>(ownerUser.username || 'pakagan');
  const [ownerPassword, setOwnerPassword] = useState<string>(ownerUser.password_plain || '1234');
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

  // Calculations
  const totalCabang = cabangList.length;
  const lockedCabangCount = cabangList.filter(c => c.is_kasir_locked).length;
  const unlockedCabangCount = totalCabang - lockedCabangCount;

  // Optional Random Password Helper
  const handleRandomPassword = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setOwnerPassword(String(randomNum));
    setShowOwnerPassword(true);
  };

  // Handle Save Owner Credentials (SIMPEL & PRAKTIS)
  const handleSaveOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerSuccessMsg('');
    setOwnerErrorMsg('');

    const cleanUsername = ownerUsername.trim().toLowerCase();
    const cleanPassword = ownerPassword.trim();

    if (!cleanUsername) {
      setOwnerErrorMsg('Username tidak boleh kosong.');
      return;
    }
    if (!cleanPassword) {
      setOwnerErrorMsg('Password tidak boleh kosong.');
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
      setOwnerSuccessMsg('Username & Password Dashboard Pusat berhasil disimpan!');
      setTimeout(() => setOwnerSuccessMsg(''), 4000);
    } catch (err: any) {
      setOwnerErrorMsg(err.message || 'Gagal menyimpan.');
    } finally {
      setSavingOwner(false);
    }
  };

  // Handle Toggle Lock Cabang
  const handleToggleLockCabang = async (cabang: Cabang) => {
    const newLockState = !cabang.is_kasir_locked;
    const confirmText = newLockState
      ? `Gembok akses kasir cabang "${cabang.nama}"? Tablet kasir cabang tidak bisa login sementara.`
      : `Buka kembali gembok akses kasir cabang "${cabang.nama}"?`;

    if (!window.confirm(confirmText)) return;

    try {
      await db.updateCabang(cabang.id, {
        is_kasir_locked: newLockState,
      });
      await onRefreshData();
      setKasirActionSuccess(
        newLockState 
          ? `Gembok kasir ${cabang.nama} berhasil DIAKTIFKAN.` 
          : `Gembok kasir ${cabang.nama} berhasil DIBUKA.`
      );
      setTimeout(() => setKasirActionSuccess(''), 4000);
    } catch (err: any) {
      alert('Gagal mengubah gembok: ' + err.message);
    }
  };

  // Open Edit Kasir Modal
  const handleOpenEditKasir = (cbg: Cabang) => {
    setEditingKasir(cbg);
    setEditKasirUsername(cbg.kasir_username || `kasir_cbg${cbg.nomor}`);
    setEditKasirPassword(cbg.kasir_password_plain || cbg.kasir_pin || '1234');
    setEditKasirLocked(!!cbg.is_kasir_locked);
    setShowEditKasirPassword(false);
    setKasirModalError('');
  };

  // Save Edit Kasir Modal (DARI PUSAT)
  const handleSaveKasirModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKasir) return;

    const cleanUser = editKasirUsername.trim().toLowerCase();
    const cleanPass = editKasirPassword.trim();

    if (!cleanUser) {
      setKasirModalError('Username kasir tidak boleh kosong.');
      return;
    }
    if (!cleanPass) {
      setKasirModalError('Password kasir tidak boleh kosong.');
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
      setKasirActionSuccess(`Kredensial kasir ${editingKasir.nama} berhasil diperbarui dari Pusat!`);
      setEditingKasir(null);
      setTimeout(() => setKasirActionSuccess(''), 4000);
    } catch (err: any) {
      setKasirModalError(err.message || 'Gagal menyimpan.');
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

  // Generate WhatsApp Share Link
  const generateKasirWaUrl = (cbg: Cabang) => {
    const rawPhone = cbg.pj_telepon || cbg.telepon || '081398431313';
    const cleanPhone = rawPhone.replace(/\D/g, '').replace(/^0/, '62');
    const pass = cbg.kasir_password_plain || cbg.kasir_pin || '1234';
    const user = cbg.kasir_username || `kasir_cbg${cbg.nomor}`;

    const msg = 
      `*SERABI BAWEL & WEDANG GEPREK*\n` +
      `*KREDENSIAL LOGIN KASIR CABANG*\n` +
      `------------------------------------\n` +
      `Halo Bapak/Ibu *${cbg.pj_nama || 'PJ Cabang'}*,\n\n` +
      `Berikut kredensial login tablet kasir resmi untuk:\n` +
      `• *Cabang:* ${cbg.nama} (${cbg.kode})\n` +
      `• *Username Kasir:* \`${user}\`\n` +
      `• *Password / PIN:* \`${pass}\`\n\n` +
      `_Pusat Manajemen Akun • Serabi Bawel & Wedang Geprek_`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
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

  return (
    <div className="space-y-6 animate-fadeIn pb-12">

      {/* =========================================================================
          HEADER BANNER BERSIH & RAMAH
         ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-soft-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <KeyRound className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Pusat Kontrol Akun
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                10 Cabang Toko
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Kelola Akun &amp; Kata Sandi
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Atur username &amp; sandi Dashboard Pusat Pak Agan serta seluruh kasir 10 cabang secara terpusat.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Sistem Aktif &bull; Terhubung Realtime</span>
        </div>

      </div>

      {/* =========================================================================
          NOTIFIKASI
         ========================================================================= */}
      {kasirActionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold shadow-2xs flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{kasirActionSuccess}</span>
        </div>
      )}

      {/* =========================================================================
          NAVIGASI 2 TAB (HANYA DASHBOARD PUSAT & KASIR 10 CABANG)
         ========================================================================= */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-soft-sm">
        
        {/* Tab 1: Dashboard Pusat */}
        <button
          type="button"
          onClick={() => setSubTab('owner')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            subTab === 'owner'
              ? 'bg-emerald-700 text-white shadow-md shadow-emerald-800/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Akun Dashboard Pusat (Pak Agan)</span>
        </button>

        {/* Tab 2: Kasir 10 Cabang */}
        <button
          type="button"
          onClick={() => setSubTab('kasir')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            subTab === 'kasir'
              ? 'bg-emerald-700 text-white shadow-md shadow-emerald-800/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Akun Kasir 10 Cabang</span>
          {lockedCabangCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
              {lockedCabangCount} Digembok
            </span>
          )}
        </button>

      </div>

      {/* =========================================================================
          TAB 1: AKUN DASHBOARD PUSAT (PAK AGAN)
         ========================================================================= */}
      {subTab === 'owner' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft-sm p-6 sm:p-8 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">👑</span>
                <h3 className="text-base font-black text-slate-900">
                  Ubah Username &amp; Sandi Dashboard Pusat
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Atur sandi yang mudah Anda ingat. Sandi ini digunakan untuk masuk ke Dashboard Backoffice.
              </p>
            </div>

            <div className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl self-start">
              Role: <strong className="text-emerald-800">Master Owner Pusat</strong>
            </div>
          </div>

          {ownerSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{ownerSuccessMsg}</span>
            </div>
          )}

          {ownerErrorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{ownerErrorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveOwner} className="space-y-5 max-w-lg">
            
            {/* Username Input */}
            <div>
              <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                Username Dashboard Pusat:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={ownerUsername}
                  onChange={(e) => setOwnerUsername(e.target.value)}
                  required
                  placeholder="Contoh: pakagan"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-xs font-bold text-slate-900 bg-slate-50"
                />
                <div className="absolute left-3 top-3 text-slate-400">
                  <User className="w-4 h-4 text-emerald-700" />
                </div>
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold text-slate-800">
                  Password / Sandi Baru:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRandomPassword}
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 transition cursor-pointer"
                    title="Buat 4 digit angka acak"
                  >
                    <Dices className="w-3 h-3 text-amber-600" />
                    <span>Acak Angka</span>
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
                  placeholder="Bisa angka 1234 atau kata sandi pilihan Anda"
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-xs font-bold text-slate-900 bg-slate-50"
                />
                <div className="absolute left-3 top-3 text-slate-400">
                  <KeyRound className="w-4 h-4 text-emerald-700" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 pl-1">
                *Bisa menggunakan sandi simpel (contoh: <code>1234</code>) atau sandi kata yang mudah diingat.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={savingOwner}
                className="px-6 py-3 rounded-2xl font-black text-xs text-white bg-emerald-700 hover:bg-emerald-800 transition-all shadow-md shadow-emerald-800/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {savingOwner ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{savingOwner ? 'MENYIMPAN...' : 'SIMPAN PERUBAHAN'}</span>
              </button>
            </div>

          </form>

        </div>
      )}

      {/* =========================================================================
          TAB 2: MATRIX KREDENSIAL 10 KASIR CABANG
         ========================================================================= */}
      {subTab === 'kasir' && (
        <div className="space-y-4">
          
          {/* Action Bar & Filter */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                value={searchKasir}
                onChange={(e) => setSearchKasir(e.target.value)}
                placeholder="Cari cabang, kode, username..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-xs font-bold text-slate-900 bg-slate-50"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div className="flex items-center gap-2">
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

          {/* Grid of Branches */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCabang.map((cbg) => {
              const isLocked = !!cbg.is_kasir_locked;
              const isPassShown = !!showKasirPasswords[cbg.id];
              const passPlain = cbg.kasir_password_plain || cbg.kasir_pin || '1234';
              const userKasir = cbg.kasir_username || `kasir_cbg${cbg.nomor}`;

              return (
                <div 
                  key={cbg.id}
                  className={`rounded-3xl border p-5 transition-all shadow-soft-sm bg-white ${
                    isLocked 
                      ? 'border-rose-300 ring-2 ring-rose-500/20' 
                      : 'border-slate-200/90 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {cbg.kode}
                        </span>
                        <h4 className="text-sm font-black text-slate-900">
                          {cbg.nama}
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        PJ: <strong>{cbg.pj_nama || '-'}</strong> ({cbg.pj_telepon || cbg.telepon || '-'})
                      </span>
                    </div>

                    <div className="shrink-0">
                      {isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
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
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/70 space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500 font-bold">
                        Username Kasir:
                      </span>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                        <code>{userKasir}</code>
                        <button
                          type="button"
                          onClick={() => handleCopyText(userKasir, `user-${cbg.id}`)}
                          className="text-slate-400 hover:text-emerald-700 cursor-pointer"
                          title="Salin"
                        >
                          {copiedId === `user-${cbg.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-slate-200/60 pt-2">
                      <span className="text-[11px] text-slate-500 font-bold">
                        Password / PIN Kasir:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">
                          {isPassShown ? passPlain : '••••••••'}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => setShowKasirPasswords(prev => ({ ...prev, [cbg.id]: !prev[cbg.id] }))}
                          className="text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {isPassShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyText(passPlain, `pass-${cbg.id}`)}
                          className="text-slate-400 hover:text-emerald-700 cursor-pointer"
                          title="Salin"
                        >
                          {copiedId === `pass-${cbg.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleToggleLockCabang(cbg)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isLocked 
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      <span>{isLocked ? 'Buka Gembok' : 'Gembok'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={generateKasirWaUrl(cbg)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition"
                        title="Kirim ke WA PJ"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Kirim WA</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleOpenEditKasir(cbg)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>Ubah Sandi</span>
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
          MODAL: EDIT KREDENSIAL KASIR CABANG (DARI PUSAT)
         ========================================================================= */}
      {editingKasir && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl border-t-[4px] border-emerald-600 animate-scaleUp">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Ubah Sandi Kasir: {editingKasir.nama}
                </h3>
                <span className="text-[11px] text-slate-400">
                  {editingKasir.kode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingKasir(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {kasirModalError && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{kasirModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveKasirModal} className="space-y-3.5">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username Kasir:
                </label>
                <input
                  type="text"
                  value={editKasirUsername}
                  onChange={(e) => setEditKasirUsername(e.target.value)}
                  required
                  placeholder="Contoh: kasir_cbg1"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Password / PIN Kasir:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowEditKasirPassword(!showEditKasirPassword)}
                    className="text-[10px] font-bold text-emerald-800 hover:underline cursor-pointer"
                  >
                    {showEditKasirPassword ? 'Tutup' : 'Lihat'}
                  </button>
                </div>

                <input
                  type={showEditKasirPassword ? 'text' : 'password'}
                  value={editKasirPassword}
                  onChange={(e) => setEditKasirPassword(e.target.value)}
                  required
                  placeholder="Bisa 1234 atau PIN"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editKasirLocked}
                    onChange={(e) => setEditKasirLocked(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 accent-rose-600 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Gembok Akses Cabang Ini
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingKasir(null)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingKasir}
                  className="px-4 py-2 rounded-xl text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 transition cursor-pointer disabled:opacity-50"
                >
                  {savingKasir ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
