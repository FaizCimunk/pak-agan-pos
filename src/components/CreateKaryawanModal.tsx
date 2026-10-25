'use client';

import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  Building2, 
  Phone, 
  Key, 
  Lock, 
  Coins, 
  DollarSign, 
  Sparkles, 
  Save, 
  Eye, 
  EyeOff,
  UserCheck
} from 'lucide-react';
import { Cabang } from '@/lib/types';
import { db } from '@/lib/db';
import { formatNominal, parseNominal, generateStrongPassword } from '@/lib/utils';

interface CreateKaryawanModalProps {
  cabangList: Cabang[];
  defaultCabangId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateKaryawanModal({
  cabangList,
  defaultCabangId,
  onClose,
  onSuccess,
}: CreateKaryawanModalProps) {
  const [nama, setNama] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [cabangId, setCabangId] = useState<string>(
    defaultCabangId && defaultCabangId !== 'all' ? defaultCabangId : cabangList[0]?.id || 'cbg-1'
  );
  const [role, setRole] = useState<'kasir' | 'kitchen'>('kasir');
  const [telepon, setTelepon] = useState<string>('');
  const [pin, setPin] = useState<string>('1234');
  const [password, setPassword] = useState<string>('Kasir#Bawel2026!');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [gajiHarianDisplay, setGajiHarianDisplay] = useState<string>('100.000');
  const [plafonKasbonDisplay, setPlafonKasbonDisplay] = useState<string>('500.000');
  const [saving, setSaving] = useState<boolean>(false);

  // Auto-generate strong password ala Abdi Membangun
  const handleGeneratePassword = () => {
    const strong = generateStrongPassword();
    setPassword(strong);
    setShowPassword(true);
  };

  const handleNameChange = (val: string) => {
    setNama(val);
    if (!username || username.startsWith('kasir')) {
      const clean = val.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean) setUsername(clean.slice(0, 10));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      alert('Nama karyawan wajib diisi');
      return;
    }
    if (!username.trim()) {
      alert('Username wajib diisi');
      return;
    }
    if (!pin.trim() || pin.length < 4) {
      alert('PIN cepat kasir minimal 4 digit');
      return;
    }

    const uHarian = parseNominal(gajiHarianDisplay) || 100000;
    const plafon = parseNominal(plafonKasbonDisplay) || 500000;

    setSaving(true);
    try {
      await db.createKaryawan({
        nama: nama.trim(),
        username: username.trim().toLowerCase(),
        role: role,
        cabang_id: cabangId,
        telepon: telepon.trim() || '0812-0000-0000',
        pin: pin.trim(),
        password_plain: password.trim(),
        tipe_gaji: 'harian',
        gaji_harian: uHarian,
        gaji_pokok: uHarian * 22,
        plafon_kasbon: plafon,
      });

      alert(`Karyawan "${nama}" berhasil didaftarkan! Staf dapat langsung login di POS tablet cabang.`);
      onSuccess();
    } catch (err: any) {
      alert('Gagal mendaftarkan karyawan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-50/80 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-primary text-white flex items-center justify-center font-bold shadow-sm shadow-brand-dark/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Tambah Karyawan / Kasir Baru
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Daftarkan profil pekerja, cabang penempatan, tarif gaji harian &amp; PIN login
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          
          {/* Nama & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Nama Lengkap Pekerja:
              </label>
              <input
                type="text"
                value={nama}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Contoh: Siti Rahmawati"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Role / Posisi Jabatan:
              </label>
              <select
                value={role}
                onChange={(e: any) => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-primary"
              >
                <option value="kasir">Kasir Cabang (Penanggung Jawab Outlet &amp; Tablet POS)</option>
                <option value="kitchen">Pekerja Outlet (Kru Dapur / Serabi &amp; Wedang)</option>
              </select>
            </div>
          </div>

          {/* Penempatan Cabang */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Penempatan Cabang:
            </label>
            <div className="relative">
              <select
                value={cabangId}
                onChange={(e) => setCabangId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-primary"
              >
                {cabangList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.kode} - {c.nama} ({c.kota})
                  </option>
                ))}
              </select>
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Nomor HP & Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Nomor WhatsApp / HP:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={telepon}
                  onChange={(e) => setTelepon(e.target.value)}
                  placeholder="0813-xxxx-xxxx"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-brand-primary"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Username Login:
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="siti / cabang1"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          {/* PIN Cepat & Password Kuat */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-[11px] font-extrabold text-slate-700 block">
              Kredensial Keamanan &amp; PIN Tablet Kasir:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* PIN Cepat Tablet (4-6 Angka) */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  PIN Cepat Tablet POS:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="1234"
                    required
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl font-mono font-black text-center tracking-widest text-slate-900 focus:outline-none focus:border-brand-primary"
                  />
                  <Key className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                </div>
                <span className="text-[9px] text-slate-400 mt-0.5 block">Default demo: 1234</span>
              </div>

              {/* Password Kuat */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-600">
                    Sandi Akun:
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[10px] text-brand-primary hover:underline font-bold flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Acak Sandi</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-brand-primary text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Gaji Harian & Plafon Kasbon */}
          <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-emerald-950">
                Skema Gaji Murni Harian &amp; Kasbon:
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                Otomatis Presensi Hadir
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Gaji Harian per Kehadiran:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-slate-400">Rp</span>
                  <input
                    type="text"
                    value={gajiHarianDisplay}
                    onChange={(e) => setGajiHarianDisplay(formatNominal(e.target.value))}
                    required
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <span className="text-[9px] text-slate-500 mt-1 block">
                  Simulasi 22 Hari: <strong>Rp {formatNominal(((parseNominal(gajiHarianDisplay) || 100000) * 22).toString())}</strong>
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Plafon Maksimal Kasbon:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-slate-400">Rp</span>
                  <input
                    type="text"
                    value={plafonKasbonDisplay}
                    onChange={(e) => setPlafonKasbonDisplay(formatNominal(e.target.value))}
                    required
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <span className="text-[9px] text-slate-500 mt-1 block">
                  Batas pinjaman kas kecil kasir
                </span>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-dark text-white font-extrabold text-xs shadow-md shadow-brand-dark/20 btn-tactile flex items-center space-x-1.5 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Mendaftarkan...' : 'Simpan Karyawan'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
