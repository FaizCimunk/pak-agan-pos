'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Store, 
  MapPin, 
  Phone, 
  Target, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  FileText,
  ShieldCheck,
  Check,
  KeyRound,
  UserCheck,
  MessageCircle,
  Eye,
  EyeOff,
  Laptop,
  Lock
} from 'lucide-react';
import { Cabang, Karyawan } from '@/lib/types';
import { db, isBranchMatch } from '@/lib/db';
import { formatNominal, parseNominal, formatRupiah, formatKaryawanRole } from '@/lib/utils';

interface EditCabangModalProps {
  cabang: Cabang | null;
  isNew?: boolean;
  onClose: () => void;
  onSuccess: (cabang: Cabang) => void;
}

export default function EditCabangModal({
  cabang,
  isNew = false,
  onClose,
  onSuccess,
}: EditCabangModalProps) {
  const [nama, setNama] = useState<string>('');
  const [kode, setKode] = useState<string>('');
  const [kota, setKota] = useState<string>('');
  const [alamat, setAlamat] = useState<string>('');
  const [telepon, setTelepon] = useState<string>('');
  const [targetOmzet, setTargetOmzet] = useState<number>(35000000);
  const [sewaBulanan, setSewaBulanan] = useState<number>(3500000);
  const [listrikAirBulanan, setListrikAirBulanan] = useState<number>(650000);
  const [iuranKebersihanBulanan, setIuranKebersihanBulanan] = useState<number>(150000);
  const [qrisMerchantName, setQrisMerchantName] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  // Kredensial Kasir Toko (Username & Password saja)
  const [kasirUsername, setKasirUsername] = useState<string>('');
  const [kasirPassword, setKasirPassword] = useState<string>('');
  const [showKasirPassword, setShowKasirPassword] = useState<boolean>(false);
  // Kontak Penanggung Jawab Khusus Penerima Laporan Belanja & Approval
  const [allKaryawan, setAllKaryawan] = useState<Karyawan[]>([]);
  const [pjNama, setPjNama] = useState<string>('');
  const [pjTelepon, setPjTelepon] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    db.getAllKaryawan()
      .then(list => setAllKaryawan(list.filter(k => k.role !== 'owner')))
      .catch(e => console.warn('Gagal memuat karyawan cabang:', e));
  }, []);

  const branchWorkers = cabang ? allKaryawan.filter(k => isBranchMatch(k.cabang_id, cabang.id)) : [];

  const handleSelectPjWorker = (karyawanId: string) => {
    if (!karyawanId || karyawanId === '__manual__') return;
    const picked = allKaryawan.find(k => k.id === karyawanId);
    if (!picked) return;
    setPjNama(picked.nama);
    if (picked.telepon) {
      setPjTelepon(picked.telepon);
    }
  };

  useEffect(() => {
    if (cabang) {
      setNama(cabang.nama || '');
      setKode(cabang.kode || '');
      setKota(cabang.kota || '');
      setAlamat(cabang.alamat || '');
      setTelepon(cabang.telepon || '');
      setTargetOmzet(cabang.target_omzet_bulanan || 35000000);
      setSewaBulanan(cabang.sewa_bulanan || 3500000);
      setListrikAirBulanan(cabang.listrik_air_bulanan || 650000);
      setIuranKebersihanBulanan(cabang.iuran_kebersihan_bulanan || 150000);
      setQrisMerchantName(cabang.qris_merchant_name || cabang.nama || '');
      setIsActive(cabang.is_active ?? true);
      setKasirUsername(cabang.kasir_username || `kasir_cbg${cabang.nomor}`);
      setKasirPassword(cabang.kasir_password_plain || `Kasir@Cbg${cabang.nomor}!`);
      setPjNama(cabang.pj_nama || '');
      setPjTelepon(cabang.pj_telepon || cabang.telepon || '');
    } else {
      setNama('');
      setKode('CBG-NEW');
      setKota('Yogyakarta');
      setAlamat('');
      setTelepon('0812-');
      setTargetOmzet(35000000);
      setSewaBulanan(3500000);
      setListrikAirBulanan(650000);
      setIuranKebersihanBulanan(150000);
      setQrisMerchantName('');
      setIsActive(true);
      setKasirUsername('kasir_new');
      setKasirPassword('Kasir@Baru2026!');
      setPjNama('');
      setPjTelepon('0812-');
    }
  }, [cabang]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nama.trim()) {
      setErrorMsg('Nama cabang tidak boleh kosong!');
      return;
    }

    if (!kode.trim()) {
      setErrorMsg('Kode cabang wajib diisi!');
      return;
    }

    if (!kasirUsername.trim() || !kasirPassword.trim()) {
      setErrorMsg('Username dan Password Kasir Toko wajib diisi!');
      return;
    }

    setLoading(true);

    try {
      let saved: Cabang;
      if (isNew || !cabang) {
        saved = await db.createCabang({
          nama: nama.trim(),
          kode: kode.trim().toUpperCase(),
          kota: kota.trim() || 'Indonesia',
          alamat: alamat.trim(),
          telepon: telepon.trim(),
          target_omzet_bulanan: targetOmzet,
          sewa_bulanan: sewaBulanan,
          listrik_air_bulanan: listrikAirBulanan,
          iuran_kebersihan_bulanan: iuranKebersihanBulanan,
          qris_merchant_name: qrisMerchantName.trim() || nama.trim(),
          is_active: isActive,
          kasir_username: kasirUsername.trim().toLowerCase(),
          kasir_pin: '',
          kasir_password_plain: kasirPassword.trim(),
          pj_nama: pjNama.trim(),
          pj_telepon: pjTelepon.trim(),
        });
      } else {
        saved = await db.updateCabang(cabang.id, {
          nama: nama.trim(),
          kota: kota.trim() || 'Indonesia',
          alamat: alamat.trim(),
          telepon: telepon.trim(),
          target_omzet_bulanan: targetOmzet,
          sewa_bulanan: sewaBulanan,
          listrik_air_bulanan: listrikAirBulanan,
          iuran_kebersihan_bulanan: iuranKebersihanBulanan,
          qris_merchant_name: qrisMerchantName.trim() || nama.trim(),
          is_active: isActive,
          kasir_username: kasirUsername.trim().toLowerCase(),
          kasir_pin: '',
          kasir_password_plain: kasirPassword.trim(),
          pj_nama: pjNama.trim(),
          pj_telepon: pjTelepon.trim(),
        });
      }

      setSuccessMsg(`Data ${saved.nama} berhasil disimpan!`);
      setTimeout(() => {
        onSuccess(saved);
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan perubahan cabang');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  {isNew ? 'Tambah Cabang Outlet Baru' : 'Ubah Data Cabang & Biaya Tetap (Fixed Cost)'}
                </h3>
                {cabang && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    #{cabang.nomor} • {cabang.kode}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Sesuaikan nama cabang, sewa ruko, Wi-Fi &amp; listrik, password kasir, dan penanggung jawab
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-bold">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* Nama Cabang */}
          <div>
            <label className="font-bold text-slate-800 block mb-1 flex items-center justify-between">
              <span>Nama Resmi Cabang Outlet</span>
              <span className="text-[10px] text-emerald-700 font-bold">*Bisa diubah bebas</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Cabang 01 - Tebet Raya Jakarta"
                className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              *Nama ini otomatis tercetak di <strong>struk thermal kasir</strong>, <strong>header tablet POS</strong>, dan <strong>laporan rekapitulasi gaji</strong>.
            </p>
          </div>

          {/* Kode & Kota */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                <span>Kode Paten Cabang</span>
                <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center space-x-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Kunci Paten</span>
                </span>
              </label>
              <input
                type="text"
                value={kode}
                readOnly
                disabled
                placeholder="CBG-01"
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl font-mono font-black text-xs text-slate-600 uppercase cursor-not-allowed select-none shadow-inner"
                title="Kode Paten ini dikunci permanen agar seluruh relasi keuangan, mutasi kasir, staf, dan struk tidak pernah error."
              />
              <p className="text-[10px] text-emerald-800 font-medium mt-1">
                🔒 Kunci utama database. Relasi keuangan &amp; staf tetap paten pada cabang ini.
              </p>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Kota / Wilayah
              </label>
              <input
                type="text"
                value={kota}
                onChange={(e) => setKota(e.target.value)}
                placeholder="Contoh: Jakarta Selatan"
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                required
              />
            </div>
          </div>

          {/* Alamat Fisik */}
          <div>
            <label className="font-bold text-slate-700 block mb-1 flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Alamat Fisik Outlet</span>
            </label>
            <textarea
              rows={2}
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              placeholder="Contoh: Jl. Tebet Barat Dalam Raya No. 42, RT 05 / RW 03..."
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Kontak Telepon & Target Omzet */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center space-x-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Telepon Umum Cabang</span>
              </label>
              <input
                type="text"
                value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                placeholder="0812-xxxx-xxxx"
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center space-x-1">
                <Target className="w-3.5 h-3.5 text-amber-600" />
                <span>Target Omzet Bulanan (Rp)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                  Rp
                </span>
                <input
                  type="text"
                  value={targetOmzet === 0 ? '' : formatNominal(targetOmzet)}
                  onChange={(e) => setTargetOmzet(parseNominal(e.target.value))}
                  placeholder="35.000.000"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* KOTAK 1: KREDENSIAL AKSES KASIR TOKO */}
          <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-blue-950 flex items-center space-x-1.5 text-xs">
                <Laptop className="w-4 h-4 text-blue-700" />
                <span>Kredensial Akses Kasir Toko (Username &amp; Password)</span>
              </label>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white text-blue-800 border border-blue-300">
                Khusus Kasir Toko
              </span>
            </div>
            <p className="text-[10px] text-blue-700 leading-snug">
              Hanya Username &amp; Password ini yang bisa dipakai membuka kasir cabang ini (tanpa PIN).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">
                  Username Kasir Toko:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={kasirUsername}
                    onChange={(e) => setKasirUsername(e.target.value.toLowerCase())}
                    placeholder="Contoh: kasir_cbg1"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-700">
                    Password Masuk Kasir:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKasirPassword(!showKasirPassword)}
                    className="text-[9px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-0.5"
                  >
                    {showKasirPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showKasirPassword ? 'Tutup' : 'Intip'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showKasirPassword ? 'text' : 'password'}
                    value={kasirPassword}
                    onChange={(e) => setKasirPassword(e.target.value)}
                    placeholder="Contoh: Kasir@Cbg1!"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <span className="text-[9px] text-slate-400 mt-0.5 block">
                  Password resmi login &amp; buka shift kasir
                </span>
              </div>
            </div>
          </div>

          {/* KOTAK 2: PENANGGUNG JAWAB OUTLET & WHATSAPP LAPORAN BELANJA / APPROVAL */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-emerald-950 flex items-center space-x-1.5 text-xs">
                <MessageCircle className="w-4 h-4 text-emerald-700" />
                <span>Penanggung Jawab (PJ) &amp; No. WhatsApp Laporan</span>
              </label>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white text-emerald-800 border border-emerald-300">
                Tujuan WA Belanja
              </span>
            </div>

            {!isNew && (
              <div>
                <label className="text-[10px] font-bold text-emerald-950 block mb-1 flex items-center space-x-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Pilih PJ dari Pekerja Cabang (Otomatis Ubah No. WA):</span>
                </label>
                <select
                  value={
                    allKaryawan.find(
                      k => k.nama.toLowerCase().trim() === pjNama.toLowerCase().trim()
                    )?.id || '__manual__'
                  }
                  onChange={(e) => handleSelectPjWorker(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-emerald-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-emerald-600 cursor-pointer"
                >
                  <option value="__manual__">
                    -- Pilih Pekerja Cabang ({branchWorkers.length} staf) atau isi manual di bawah --
                  </option>
                  {branchWorkers.length > 0 && (
                    <optgroup label={`Pekerja ${nama || cabang?.nama || 'Cabang Ini'}`}>
                      {branchWorkers.map(w => (
                        <option key={w.id} value={w.id}>
                          👤 {w.nama} ({formatKaryawanRole(w.role).toUpperCase()} • WA: {w.telepon || '-'})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {allKaryawan.filter(k => !branchWorkers.some(bw => bw.id === k.id)).length > 0 && (
                    <optgroup label="Pekerja Cabang Lainnya">
                      {allKaryawan
                        .filter(k => !branchWorkers.some(bw => bw.id === k.id))
                        .map(w => (
                          <option key={w.id} value={w.id}>
                            👤 {w.nama} ({formatKaryawanRole(w.role).toUpperCase()} • WA: {w.telepon || '-'})
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">
                  Nama Penanggung Jawab (PJ) Cabang:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={pjNama}
                    onChange={(e) => setPjNama(e.target.value)}
                    placeholder="Otomatis dari pilihan pekerja atau ketik manual"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <span className="text-[9px] text-slate-400 mt-0.5 block">
                  Kepala Toko / Penanggung Jawab
                </span>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1 flex items-center justify-between">
                  <span>No. WhatsApp PJ (Otomatis Data Karyawan):</span>
                  <span className="text-emerald-700 font-bold text-[9px]">Otomatis Kirim WA</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={pjTelepon}
                    onChange={(e) => setPjTelepon(e.target.value)}
                    placeholder="Contoh: 0812-1000-0101"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-mono font-bold text-xs text-emerald-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <span className="text-[9px] text-slate-400 mt-0.5 block">
                  Format: 0812xxxx atau 62812xxxx
                </span>
              </div>
            </div>
          </div>

          {/* Section: Beban Tetap Operasional Outlet (Fixed Costs) */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-amber-950 flex items-center space-x-1.5 text-xs">
                <Building2 className="w-4 h-4 text-accent-gold" />
                <span>Beban Tetap Toko (Fixed Cost: Sewa Ruko, Wi-Fi &amp; Listrik)</span>
              </label>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white text-amber-800 border border-amber-200">
                P&amp;L Eksekutif Boss
              </span>
            </div>
            <p className="text-[10px] text-amber-900 leading-snug">
              Biaya operasional ini otomatis dibagi 30 hari untuk memotong omzet harian toko saat menghitung <strong>Uang Bersih Masuk Rekening Boss</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-700 block mb-1">
                  1. Sewa Ruko / Kios (Rp/bln):
                </span>
                <input
                  type="text"
                  value={sewaBulanan === 0 ? '' : formatNominal(sewaBulanan)}
                  onChange={(e) => setSewaBulanan(parseNominal(e.target.value))}
                  placeholder="3.500.000"
                  className="w-full px-2.5 py-1.5 bg-white rounded-xl border border-slate-300 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                />
                <span className="text-[9px] text-slate-400 mt-0.5 block font-mono">
                  ≈ {formatRupiah(Math.round(sewaBulanan / 30))}/hari
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-700 block mb-1">
                  2. Listrik, Air &amp; Wi-Fi (Rp/bln):
                </span>
                <input
                  type="text"
                  value={listrikAirBulanan === 0 ? '' : formatNominal(listrikAirBulanan)}
                  onChange={(e) => setListrikAirBulanan(parseNominal(e.target.value))}
                  placeholder="650.000"
                  className="w-full px-2.5 py-1.5 bg-white rounded-xl border border-slate-300 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                />
                <span className="text-[9px] text-slate-400 mt-0.5 block font-mono">
                  ≈ {formatRupiah(Math.round(listrikAirBulanan / 30))}/hari
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-700 block mb-1">
                  3. Iuran &amp; Retribusi (Rp/bln):
                </span>
                <input
                  type="text"
                  value={iuranKebersihanBulanan === 0 ? '' : formatNominal(iuranKebersihanBulanan)}
                  onChange={(e) => setIuranKebersihanBulanan(parseNominal(e.target.value))}
                  placeholder="150.000"
                  className="w-full px-2.5 py-1.5 bg-white rounded-xl border border-slate-300 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                />
                <span className="text-[9px] text-slate-400 mt-0.5 block font-mono">
                  ≈ {formatRupiah(Math.round(iuranKebersihanBulanan / 30))}/hari
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between sm:items-center pt-2 border-t border-amber-200/60 text-[11px] font-extrabold text-amber-900 gap-1">
              <span>Total Beban Tetap Cabang:</span>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs">{formatRupiah(sewaBulanan + listrikAirBulanan + iuranKebersihanBulanan)}/bln</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-200/70 text-amber-950 font-mono text-[10px]">
                  Potongan: {formatRupiah(Math.round((sewaBulanan + listrikAirBulanan + iuranKebersihanBulanan) / 30))}/hari
                </span>
              </div>
            </div>
          </div>

          {/* QRIS Merchant Name */}
          <div>
            <label className="font-bold text-slate-700 block mb-1 flex items-center space-x-1">
              <QrCode className="w-3.5 h-3.5 text-slate-400" />
              <span>Nama Merchant QRIS (Jika ada)</span>
            </label>
            <input
              type="text"
              value={qrisMerchantName}
              onChange={(e) => setQrisMerchantName(e.target.value)}
              placeholder="Contoh: SERABI BAWEL - CABANG TEBET"
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Status Cabang Active Toggle */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-800 block text-xs">Status Operasional Cabang</span>
              <span className="text-[10px] text-slate-500">Cabang aktif dapat melayani pesanan kasir dan presensi staf</span>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors border ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              {isActive ? '✓ Aktif Beroperasi' : 'Non-Aktif / Tutup'}
            </button>
          </div>

        </form>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
          >
            {loading ? (
              <span>Menyimpan...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Simpan Perubahan Cabang</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
