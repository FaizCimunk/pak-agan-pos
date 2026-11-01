'use client';

import React, { useState } from 'react';
import { 
  X, 
  KeyRound, 
  ShieldAlert, 
  Check, 
  Eye, 
  EyeOff, 
  Dices, 
  Lock, 
  Unlock, 
  User, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Karyawan } from '@/lib/types';
import { db } from '@/lib/db';

interface PinResetModalProps {
  karyawan: Karyawan;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PinResetModal({
  karyawan,
  onClose,
  onSuccess,
}: PinResetModalProps) {
  const [activeTab, setActiveTab] = useState<'password' | 'pin'>('password');
  const [username, setUsername] = useState<string>(karyawan.username || karyawan.nama.toLowerCase().replace(/\s+/g, ''));
  const [password, setPassword] = useState<string>(karyawan.password_plain || 'Serabi@2026#Bawel');
  const [pin, setPin] = useState<string>('1234');
  const [isLocked, setIsLocked] = useState<boolean>(!!karyawan.is_locked);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Password Strength Criteria validation
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
  const isPasswordValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSymbol;

  // Auto-generate strong password
  const generateStrongPassword = () => {
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowers = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '!@#$%&*';
    
    const randomPick = (str: string) => str[Math.floor(Math.random() * str.length)];

    const core = [
      randomPick(uppers),
      randomPick(uppers),
      randomPick(lowers),
      randomPick(lowers),
      randomPick(numbers),
      randomPick(numbers),
      randomPick(symbols),
      randomPick(symbols),
    ].sort(() => 0.5 - Math.random()).join('');

    const generated = `Serabi#${core}!`;
    setPassword(generated);
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim()) {
      setErrorMsg('Username tidak boleh kosong');
      return;
    }

    if (activeTab === 'password') {
      if (!isPasswordValid) {
        setErrorMsg('Password belum memenuhi seluruh kriteria keamanan (Huruf Besar, Huruf Kecil, Angka, & Tanda Baca)');
        return;
      }
    } else {
      if (!pin || pin.length < 4) {
        setErrorMsg('PIN minimal 4 digit angka');
        return;
      }
    }

    setLoading(true);
    try {
      await db.updateKaryawanCredentials(karyawan.id, {
        username: username.trim(),
        pin: pin,
        password_plain: password,
        is_locked: isLocked,
      });

      alert(`Kredensial & Sandi untuk ${karyawan.nama} berhasil diperbarui!`);
      onSuccess();
    } catch (e: any) {
      setErrorMsg('Gagal memperbarui: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700">Keamanan Ala Abdi Membangun</span>
              <h3 className="text-base font-extrabold text-slate-900">Kelola Kredensial &amp; Sandi Staf</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* User Info Card */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-extrabold text-slate-900 text-sm">{karyawan.nama}</div>
              <div className="text-slate-500 text-[11px]">
                Jabatan: <span className="font-bold capitalize text-slate-700">{karyawan.role}</span> • No HP: <span className="font-mono font-bold text-emerald-700">{karyawan.telepon}</span>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setIsLocked(!isLocked)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition flex items-center gap-1.5 ${
                isLocked 
                  ? 'bg-rose-50 text-rose-700 border-rose-300' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300'
              }`}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{isLocked ? 'TERGEMBOK' : 'AKTIF'}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Username Input */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Username ID Login:
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                placeholder="contoh: siti_rahma"
                className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                required
              />
              <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-bold">
                ID Unik
              </span>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Pilih Jenis Kredensial yang Diubah:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('password')}
                className={`py-2 px-3 rounded-xl font-bold border text-center transition-all ${
                  activeTab === 'password'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                🔐 Password Kuat
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pin')}
                className={`py-2 px-3 rounded-xl font-bold border text-center transition-all ${
                  activeTab === 'pin'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                🔢 PIN Cepat Tablet (4-6 Digit)
              </button>
            </div>
          </div>

          {/* Mode 1: Password Kuat (Huruf besar, angka, tanda baca) */}
          {activeTab === 'password' ? (
            <div className="space-y-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 block">
                  Password Sandi Rahasia:
                </label>
                <button
                  type="button"
                  onClick={generateStrongPassword}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 text-[10px] font-bold transition flex items-center gap-1"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Acak Sandi Kuat</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Huruf besar, angka & simbol..."
                  className="w-full px-3 py-2.5 pr-10 bg-white rounded-xl border border-slate-200 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-inner"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Requirement Checklist (Realtime) */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
                <div className="font-bold text-slate-700 text-[10px] uppercase tracking-wider mb-1">
                  Standar Keamanan Sandi Perusahaan:
                </div>

                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${hasMinLength ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>
                    {hasMinLength ? '✓' : '•'}
                  </span>
                  <span>Minimal 8 Karakter (Saat ini: {password.length})</span>
                </div>

                <div className={`flex items-center gap-1.5 ${hasUpperCase ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${hasUpperCase ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>
                    {hasUpperCase ? '✓' : '•'}
                  </span>
                  <span>Mengandung Huruf Besar (A-Z)</span>
                </div>

                <div className={`flex items-center gap-1.5 ${hasLowerCase ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${hasLowerCase ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>
                    {hasLowerCase ? '✓' : '•'}
                  </span>
                  <span>Mengandung Huruf Kecil (a-z)</span>
                </div>

                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${hasNumber ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>
                    {hasNumber ? '✓' : '•'}
                  </span>
                  <span>Mengandung Angka (0-9)</span>
                </div>

                <div className={`flex items-center gap-1.5 ${hasSymbol ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${hasSymbol ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>
                    {hasSymbol ? '✓' : '•'}
                  </span>
                  <span>Mengandung Tanda Baca / Simbol (!@#$%^&*)</span>
                </div>
              </div>
            </div>
          ) : (
            /* Mode 2: PIN Cepat Tablet (4-6 digit angka) */
            <div className="space-y-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
              <label className="font-bold text-slate-700 block">
                PIN Cepat Tablet (4 - 6 Digit Angka):
              </label>
              <input
                type="text"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="1234"
                className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 font-mono text-center text-2xl font-black tracking-[0.4em] text-slate-900 focus:outline-none focus:border-amber-500 shadow-inner"
                required
              />
              <p className="text-[10px] text-slate-500 text-center">
                PIN ini digunakan kasir untuk buka/tutup shift laci kas dan otorisasi cepat di tablet cabang.
              </p>
            </div>
          )}

          {/* Security Notice ala Abdi Membangun */}
          <div className="flex items-start space-x-2 text-[11px] text-amber-900 bg-amber-50/90 p-3 rounded-2xl border border-amber-200">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Master Admin (Pak Agan) memegang kendali penuh atas kredensial seluruh staf 10 cabang. Jika staf lupa sandi atau terjadi rotasi kasir, Admin Pusat dapat menggantinya langsung.
            </span>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl font-black text-xs bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-700/25 btn-tactile transition-all"
            >
              {loading ? 'Menyimpan...' : 'Simpan Kredensial'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
