'use client';

import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Building2, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Save, 
  Receipt, 
  Printer, 
  MessageCircle, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  MapPin, 
  Tag, 
  Lock, 
  Unlock 
} from 'lucide-react';
import { Cabang } from '@/lib/types';
import { db } from '@/lib/db';
import { generateStrongPassword, formatRupiah } from '@/lib/utils';

interface ProfilTokoManagerProps {
  cabangList: Cabang[];
  onRefreshData: () => Promise<void>;
}

export default function ProfilTokoManager({
  cabangList,
  onRefreshData,
}: ProfilTokoManagerProps) {
  const [selectedCabangId, setSelectedCabangId] = useState<string>(cabangList[0]?.id || 'cbg-1');
  
  // Form States
  const [nama, setNama] = useState<string>('');
  const [kode, setKode] = useState<string>('');
  const [kota, setKota] = useState<string>('');
  const [alamat, setAlamat] = useState<string>('');
  const [telepon, setTelepon] = useState<string>('');
  
  // Kasir Credentials
  const [kasirUsername, setKasirUsername] = useState<string>('');
  const [kasirPassword, setKasirPassword] = useState<string>('');
  const [kasirPin, setKasirPin] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isKasirLocked, setIsKasirLocked] = useState<boolean>(false);
  
  // PJ & WhatsApp
  const [pjNama, setPjNama] = useState<string>('');
  const [pjTelepon, setPjTelepon] = useState<string>('');
  
  // Struk & Promo
  const [strukHeader, setStrukHeader] = useState<string>('SERABI BAWEL & WEDANG GEPREK');
  const [strukFooter, setStrukFooter] = useState<string>('Khasiat Alami, Tubuh Sehat\nTerima Kasih Atas Kunjungan Anda');
  const [strukPromo, setStrukPromo] = useState<string>('');
  const [qrisMerchantName, setQrisMerchantName] = useState<string>('');
  
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const activeCabang = cabangList.find(c => c.id === selectedCabangId) || cabangList[0];

  // Load selected cabang into form
  useEffect(() => {
    if (activeCabang) {
      setNama(activeCabang.nama || '');
      setKode(activeCabang.kode || '');
      setKota(activeCabang.kota || '');
      setAlamat(activeCabang.alamat || '');
      setTelepon(activeCabang.telepon || '');
      
      setKasirUsername(activeCabang.kasir_username || `kasir_${activeCabang.kode?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'toko'}`);
      setKasirPassword(activeCabang.kasir_password_plain || 'Kasir#Bawel2026!');
      setKasirPin(activeCabang.kasir_pin || `88800${activeCabang.nomor || 1}`);
      setIsKasirLocked(activeCabang.is_kasir_locked || false);
      
      setPjNama(activeCabang.pj_nama || '');
      setPjTelepon(activeCabang.pj_telepon || activeCabang.telepon || '');
      
      setStrukHeader(activeCabang.struk_header || 'SERABI BAWEL & WEDANG GEPREK');
      setStrukFooter((activeCabang.struk_footer || 'Khasiat Alami, Tubuh Sehat\nTerima Kasih Atas Kunjungan Anda').replace(/---?\s*www\.pakagan\.id\s*---?/gi, '').replace(/www\.pakagan\.id/gi, '').trim());
      setStrukPromo(activeCabang.struk_promo || '');
      setQrisMerchantName(activeCabang.qris_merchant_name || `Minuman Herbal Pak Agan - ${activeCabang.nama}`);
      
      setSuccessMsg('');
      setErrorMsg('');
    }
  }, [activeCabang]);

  const handleGeneratePassword = () => {
    const pwd = generateStrongPassword();
    setKasirPassword(pwd);
    setShowPassword(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCabang) return;
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await db.updateCabang(activeCabang.id, {
        nama: nama.trim(),
        kode: kode.trim(),
        kota: kota.trim(),
        alamat: alamat.trim(),
        telepon: telepon.trim(),
        kasir_username: kasirUsername.trim(),
        kasir_password_plain: kasirPassword.trim(),
        kasir_pin: kasirPin.trim(),
        is_kasir_locked: isKasirLocked,
        pj_nama: pjNama.trim(),
        pj_telepon: pjTelepon.trim(),
        struk_header: strukHeader.trim(),
        struk_footer: strukFooter.trim(),
        struk_promo: strukPromo.trim(),
        qris_merchant_name: qrisMerchantName.trim(),
      });

      setSuccessMsg(`Pengaturan dan struk untuk ${nama} berhasil disimpan!`);
      await onRefreshData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan profil cabang');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header Title */}
      <div className="bg-white p-5 rounded-3xl border-t-[4px] border-emerald-600 border-x border-b border-slate-200/80 shadow-soft-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-emerald-700/20 shrink-0">
            🏪
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                Konfigurasi Cabang &amp; Kredensial
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                • Struk Thermal 58mm &amp; Promo Per-Toko
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
              Identitas Toko, Akun Tablet Kasir &amp; Format Struk
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Atur nama resmi outlet, username &amp; sandi login tablet kasir, kontak penanggung jawab, serta pesan promo kustom pada struk tiap cabang yang berbeda-beda.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-emerald-50 px-3.5 py-2 rounded-2xl border border-emerald-200 text-emerald-800 text-xs font-bold self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{cabangList.length} Outlet Resmi Terdaftar</span>
        </div>
      </div>

      {/* Switcher Tab Outlet Cabang (Pilih Toko Cepat - Dibuat ke Bawah / Wrap) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-soft-sm space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
            <Store className="w-3.5 h-3.5 text-emerald-700" />
            <span>Pilih Toko Cabang ({cabangList.length} Outlet Resmi Terdaftar):</span>
          </span>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
            Aktif: {activeCabang?.nama}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {cabangList.map(c => {
            const isSelected = c.id === selectedCabangId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCabangId(c.id)}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition flex items-center space-x-1.5 cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-md shadow-emerald-800/20 ring-2 ring-emerald-500/30'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300'
                }`}
              >
                <span className="opacity-90">#{c.nomor}</span>
                <span className="font-mono">{c.kode}</span>
                <span className="text-[11px] opacity-75 font-normal">({c.kota})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid: Kolom Form Pengaturan (Kiri) & Live Thermal Receipt Preview (Kanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* KOLOM KIRI (7 Kolom): FORM PENGATURAN TOKO */}
        <form onSubmit={handleSave} className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-soft-sm p-6 space-y-6">
          
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-2 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center space-x-2 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. IDENTITAS RESMI OUTLET */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                1. Identitas Resmi Outlet Cabang
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1 sm:col-span-2">
                <label className="font-extrabold text-slate-700 block flex items-center justify-between">
                  <span>Nama Resmi Cabang Outlet:</span>
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Bebas Diubah Kapan Saja
                  </span>
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Misal: Cabang 01 - Malioboro Pusat"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white text-xs"
                  required
                />
                <p className="text-[10px] text-slate-400">
                  *Nama ini tercetak di struk kasir, header tablet POS, dan slip laporan. Bebas diganti kapan pun tanpa merusak riwayat transaksi/staf.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 block flex items-center justify-between">
                  <span>Kode Paten Cabang:</span>
                  <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center space-x-1">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Kunci Paten Sistem</span>
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={kode}
                    readOnly
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl font-mono font-black text-slate-700 text-xs uppercase cursor-not-allowed select-none shadow-inner"
                    title="Kode Paten ini dikunci permanen agar relasi keuangan, mutasi kas, staf, dan struk tidak pernah error/bug."
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                    ID #{activeCabang?.nomor || 1}
                  </div>
                </div>
                <p className="text-[10px] text-emerald-800 font-medium">
                  🔒 Kunci utama database. Relasi keuangan, staf &amp; laporan tetap paten pada cabang ini meskipun namanya diubah.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 block">
                  Kota / Wilayah:
                </label>
                <input
                  type="text"
                  value={kota}
                  onChange={(e) => setKota(e.target.value)}
                  placeholder="Yogyakarta"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white text-xs"
                  required
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-extrabold text-slate-700 block">
                  Alamat Fisik Outlet:
                </label>
                <textarea
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  rows={2}
                  placeholder="Jl. Malioboro No. 45, Danurejan, Kota Yogyakarta"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white text-xs"
                  required
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-extrabold text-slate-700 block">
                  Nomor Telepon Outlet (Tercetak di Struk):
                </label>
                <input
                  type="text"
                  value={telepon}
                  onChange={(e) => setTelepon(e.target.value)}
                  placeholder="0812-1000-0101"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white text-xs"
                  required
                />
              </div>
            </div>
          </div>

          {/* 2. KREDENSIAL LOGIN KASIR TABLET POS */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  2. Akun &amp; Sandi Kasir Tablet Toko Ini
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsKasirLocked(!isKasirLocked)}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold flex items-center space-x-1 cursor-pointer transition ${
                  isKasirLocked 
                    ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                {isKasirLocked ? <Lock className="w-3 h-3 text-rose-700" /> : <Unlock className="w-3 h-3 text-emerald-700" />}
                <span>{isKasirLocked ? 'AKUN KASIR TERGEMBOK' : 'AKUN KASIR AKTIF'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 block">
                  Username Login Kasir:
                </label>
                <input
                  type="text"
                  value={kasirUsername}
                  onChange={(e) => setKasirUsername(e.target.value.toLowerCase())}
                  placeholder="kasir_malioboro"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white text-xs lowercase"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 block">
                  PIN Cepat Tablet Kasir (6 Angka):
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={kasirPin}
                  onChange={(e) => setKasirPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="888001"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white text-xs tracking-widest"
                  required
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-slate-700">
                    Sandi Kuat Tablet Kasir (Password):
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[10px] font-bold text-amber-700 hover:text-amber-900 inline-flex items-center space-x-1 cursor-pointer bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200"
                  >
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>Generate Sandi Kuat</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={kasirPassword}
                    onChange={(e) => setKasirPassword(e.target.value)}
                    placeholder="Kasir#Bawel2026!"
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white text-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  *Sandi ini digunakan saat staf kasir membuka aplikasi di tablet outlet ini.
                </p>
              </div>
            </div>
          </div>

          {/* 3. PENANGGUNG JAWAB (PJ) & WHATSAPP */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <MessageCircle className="w-4 h-4 text-emerald-700" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                3. Penanggung Jawab (PJ) &amp; No. WhatsApp Laporan
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 block">
                  Nama Kepala Toko / PJ:
                </label>
                <input
                  type="text"
                  value={pjNama}
                  onChange={(e) => setPjNama(e.target.value)}
                  placeholder="Misal: Siti Rahmawati (PJ)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 block">
                  Nomor WhatsApp PJ (Penerima Laporan):
                </label>
                <input
                  type="text"
                  value={pjTelepon}
                  onChange={(e) => setPjTelepon(e.target.value)}
                  placeholder="0812-1000-0101"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white text-xs"
                  required
                />
                <p className="text-[10px] text-slate-400">
                  *Penerima bukti transfer approval kasbon &amp; belanja dari pusat.
                </p>
              </div>
            </div>
          </div>

          {/* 4. PENGATURAN STRUK KASIR & PROMO KHUSUS CABANG */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <Receipt className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                4. Pengaturan Struk Kasir &amp; Promo Khusus Cabang Ini
              </h4>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 block">
                  Header Kustom Struk:
                </label>
                <input
                  type="text"
                  value={strukHeader}
                  onChange={(e) => setStrukHeader(e.target.value)}
                  placeholder="SERABI BAWEL & WEDANG GEPREK"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white text-xs uppercase"
                />
              </div>

              {/* Promo Khusus Toko Ini (Tiap Toko Beda) */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-300 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-amber-950 flex items-center space-x-1.5 text-xs">
                    <Tag className="w-4 h-4 text-amber-700" />
                    <span>Pesan Promo Khusus di Struk ({activeCabang.kode}):</span>
                  </label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full">
                    Beda Tiap Cabang
                  </span>
                </div>
                <textarea
                  value={strukPromo}
                  onChange={(e) => setStrukPromo(e.target.value)}
                  rows={2}
                  placeholder="Misal: PROMO PELAJAR: Beli 5 Serabi Gratis 1 Wedang Jahe! (Tunjukkan Struk Ini)"
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-bold text-amber-950 focus:outline-none focus:border-emerald-600 text-xs"
                />
                <p className="text-[10px] text-amber-900/80">
                  💡 <strong>Otomatis Tercetak di Struk Pelanggan:</strong> Teks promo ini akan dicetak tebal dengan kotak khusus di bagian bawah struk thermal kasir cabang ini.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 block">
                  Pesan Footer / Ucapan di Struk:
                </label>
                <textarea
                  value={strukFooter}
                  onChange={(e) => setStrukFooter(e.target.value)}
                  rows={2}
                  placeholder="Khasiat Alami, Tubuh Sehat&#10;Terima Kasih Atas Kunjungan Anda"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 block">
                  Nama Merchant QRIS Toko:
                </label>
                <input
                  type="text"
                  value={qrisMerchantName}
                  onChange={(e) => setQrisMerchantName(e.target.value)}
                  placeholder="Minuman Herbal Pak Agan - Malioboro"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* Tombol Simpan */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-black text-xs shadow-lg shadow-emerald-800/20 btn-tactile transition cursor-pointer flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : `Simpan Pengaturan ${nama || activeCabang.kode}`}</span>
            </button>
          </div>

        </form>

        {/* KOLOM KANAN (5 Kolom): LIVE THERMAL RECEIPT SIMULATOR (58MM) */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-lg border border-slate-800">
            <div className="flex items-center space-x-2">
              <Printer className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                Simulasi Nyata Struk Thermal 58mm
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tampilan realtime persis struk fisik yang akan keluar dari printer kasir {activeCabang.kode}.
            </p>
          </div>

          {/* KERTAS STRUK THERMAL SIMULATOR */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden font-mono text-[11px] text-slate-900 relative">
            {/* Lubang Kertas Roll Atas */}
            <div className="h-3 bg-gradient-to-b from-slate-200 to-white" />

            <div className="p-5 space-y-2 select-none">
              
              {/* Header Struk */}
              <div className="text-center space-y-0.5">
                <div className="font-black text-sm uppercase tracking-tight">
                  {strukHeader || 'SERABI BAWEL & WEDANG GEPREK'}
                </div>
                <div className="text-[10px] text-slate-500">
                  Serabi Tungku &amp; Rempah Alami
                </div>
                <div className="font-extrabold text-xs text-slate-800">
                  {nama || activeCabang.nama}
                </div>
                <div className="text-[10px] text-slate-600 leading-tight">
                  {alamat || activeCabang.alamat}
                </div>
                <div className="text-[10px] text-slate-600">
                  Telp/WA: {telepon || activeCabang.telepon}
                </div>
              </div>

              <div className="border-t border-dashed border-slate-400 my-2" />

              {/* Meta Transaksi */}
              <div className="space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>No. Struk:</span>
                  <span className="font-bold">INV/20261025/0088</span>
                </div>
                <div className="flex justify-between">
                  <span>Waktu:</span>
                  <span>25/10/2026 14:32</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir:</span>
                  <span>{kasirUsername || 'Kasir Cabang'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Metode Bayar:</span>
                  <span className="font-bold uppercase">QRIS</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-400 my-2" />

              {/* Contoh Item Pesanan */}
              <div className="space-y-1.5 text-[11px]">
                <div className="space-y-0.5">
                  <div className="font-bold">Serabi Kinca Durian Bakar</div>
                  <div className="flex justify-between text-slate-600 pl-2 text-[10px]">
                    <span>2x @Rp 12.000</span>
                    <span className="font-bold text-slate-900">Rp 24.000</span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="font-bold">Wedang Jahe Emprit Rempah</div>
                  <div className="flex justify-between text-slate-600 pl-2 text-[10px]">
                    <span>1x @Rp 10.000</span>
                    <span className="font-bold text-slate-900">Rp 10.000</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-400 my-2" />

              {/* Total Tagihan */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between font-bold">
                  <span>Subtotal:</span>
                  <span>Rp 34.000</span>
                </div>
                <div className="flex justify-between font-black text-sm border-t border-slate-300 pt-1">
                  <span>TOTAL:</span>
                  <span className="text-emerald-800">Rp 34.000</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Bayar (QRIS):</span>
                  <span>Rp 34.000</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600 font-bold">
                  <span>Kembali:</span>
                  <span>Rp 0</span>
                </div>
              </div>

              {/* KOTAK PROMO KHUSUS CABANG DI STRUK */}
              {strukPromo ? (
                <div className="my-3 p-2 border-2 border-dashed border-amber-500 bg-amber-50 text-center rounded-xl">
                  <div className="font-black text-[10px] text-amber-900 uppercase tracking-wider">
                    *** PROMO SPESIAL TOKO INI ***
                  </div>
                  <div className="font-bold text-[11px] text-amber-950 mt-0.5 leading-snug">
                    {strukPromo}
                  </div>
                </div>
              ) : (
                <div className="my-2 p-1.5 border border-dashed border-slate-300 text-center text-[10px] text-slate-400 rounded-lg italic">
                  *Belum ada promo khusus yang diaktifkan di struk
                </div>
              )}

              <div className="border-t border-dashed border-slate-400 my-2" />

              {/* Footer Struk Toko */}
              <div className="text-center text-[10px] text-slate-600 pt-1 whitespace-pre-line leading-relaxed">
                {(strukFooter || 'Khasiat Alami, Tubuh Sehat\nTerima Kasih Atas Kunjungan Anda').replace(/---?\s*www\.pakagan\.id\s*---?/gi, '').replace(/www\.pakagan\.id/gi, '').trim()}
              </div>

              {/* FOOTER PROMOSI PATEN PERMANEN IVOKGRUP (SELURUH CABANG) */}
              <div className="mt-3 pt-2.5 border-t border-dashed border-slate-300 text-center space-y-1">
                <div className="text-[9px] font-black uppercase tracking-wider text-slate-900 leading-snug">
                  Digitalisasi Operasional Multi-Cabang, POS &amp; Keuangan Terintegrasi.
                </div>
                <div className="text-[8px] text-slate-600 font-medium">
                  Dipercaya oleh 1.000+ Pengusaha Berkembang.
                </div>
                <div className="text-[8px] text-emerald-800 font-mono font-bold tracking-tight">
                  Solusi Bisnis Cerdas bersama ivokgrup.com
                </div>
              </div>

            </div>

            {/* Gerigi Potongan Kertas Thermal (Zigzag Cut Effect) */}
            <div 
              className="h-3 w-full bg-slate-100" 
              style={{
                backgroundImage: 'radial-gradient(circle, transparent, transparent 50%, #ffffff 50%, #ffffff 100%)',
                backgroundSize: '10px 10px'
              }}
            />
          </div>

        </div>

      </div>

    </div>
  );
}
