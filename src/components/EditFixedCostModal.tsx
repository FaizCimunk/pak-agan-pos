'use client';

import React, { useState, useEffect } from 'react';
import { X, Building2, Check, AlertCircle, CheckCircle2, DollarSign, PlusCircle, Trash2 } from 'lucide-react';
import { Cabang } from '@/lib/types';
import { db } from '@/lib/db';
import { formatNominal, parseNominal, formatRupiah } from '@/lib/utils';

interface EditFixedCostModalProps {
  cabang: Cabang | null;
  onClose: () => void;
  onSuccess: (updated: Cabang) => void;
}

export default function EditFixedCostModal({
  cabang,
  onClose,
  onSuccess,
}: EditFixedCostModalProps) {
  const [sewaBulanan, setSewaBulanan] = useState<number>(3500000);
  const [listrikAirBulanan, setListrikAirBulanan] = useState<number>(650000);
  const [iuranKebersihanBulanan, setIuranKebersihanBulanan] = useState<number>(150000);
  const [biayaLainBulanan, setBiayaLainBulanan] = useState<number>(0);
  const [keteranganBiayaLain, setKeteranganBiayaLain] = useState<string>('Biaya Keamanan & Retribusi Tambahan');
  const [showBiayaLain, setShowBiayaLain] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    if (cabang) {
      setSewaBulanan(cabang.sewa_bulanan || 3500000);
      setListrikAirBulanan(cabang.listrik_air_bulanan || 650000);
      setIuranKebersihanBulanan(cabang.iuran_kebersihan_bulanan || 150000);
      setBiayaLainBulanan(cabang.biaya_lain_bulanan || 0);
      setKeteranganBiayaLain(cabang.keterangan_biaya_lain || 'Biaya Keamanan & Retribusi Tambahan');
      if (cabang.biaya_lain_bulanan && cabang.biaya_lain_bulanan > 0) {
        setShowBiayaLain(true);
      }
    }
  }, [cabang]);

  if (!cabang) return null;

  const totalBulanan = sewaBulanan + listrikAirBulanan + iuranKebersihanBulanan + (showBiayaLain ? biayaLainBulanan : 0);
  const sewaHarian = Math.round(sewaBulanan / 30);
  const wifiHarian = Math.round(listrikAirBulanan / 30);
  const iuranHarian = Math.round(iuranKebersihanBulanan / 30);
  const lainHarian = Math.round((showBiayaLain ? biayaLainBulanan : 0) / 30);
  const totalHarian = Math.round(totalBulanan / 30);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const updated = await db.updateCabang(cabang.id, {
        sewa_bulanan: sewaBulanan,
        listrik_air_bulanan: listrikAirBulanan,
        iuran_kebersihan_bulanan: iuranKebersihanBulanan,
        biaya_lain_bulanan: showBiayaLain ? biayaLainBulanan : 0,
        keterangan_biaya_lain: showBiayaLain ? keteranganBiayaLain : '',
      });

      setSuccessMsg(`Fixed Cost untuk ${cabang.nama} berhasil diperbarui!`);
      setTimeout(() => {
        onSuccess(updated);
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan biaya tetap cabang');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50 via-emerald-50 to-teal-50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 text-xl font-bold">
              🏢
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                  Pengaturan Beban Toko (Fixed Cost)
                </h3>
              </div>
              <p className="text-[11px] font-bold text-emerald-800 mt-0.5">
                {cabang.nama} • <span className="font-mono">{cabang.kode}</span> ({cabang.kota})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto">
          
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

          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 text-[11px] leading-relaxed">
            💡 <strong>Sistem Otomatis Bagi 30 Hari:</strong> Nilai bulanan di bawah ini otomatis dibagi 30 hari untuk memotong omzet harian sistem di menu <strong>Ringkasan</strong> secara adil dan akurat tanpa perlu hitung manual.
          </div>

          {/* 1. Sewa Ruko */}
          <div className="space-y-1 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80">
            <label className="font-extrabold text-slate-800 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-[10px]">1</span>
                Biaya Sewa Ruko / Kios
              </span>
              <span className="text-[11px] text-emerald-700 font-bold font-mono">≈ {formatRupiah(sewaHarian)}/hari</span>
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">Rp</span>
              <input
                type="text"
                value={sewaBulanan === 0 ? '' : formatNominal(sewaBulanan)}
                onChange={(e) => setSewaBulanan(parseNominal(e.target.value))}
                placeholder="3.500.000"
                className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-300 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              *Biaya kontrak/sewa tempat outlet ini per bulan.
            </p>
          </div>

          {/* 2. Wi-Fi & Listrik */}
          <div className="space-y-1 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80">
            <label className="font-extrabold text-slate-800 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-[10px]">2</span>
                Biaya Wi-Fi, Listrik &amp; Air (Utilitas)
              </span>
              <span className="text-[11px] text-emerald-700 font-bold font-mono">≈ {formatRupiah(wifiHarian)}/hari</span>
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">Rp</span>
              <input
                type="text"
                value={listrikAirBulanan === 0 ? '' : formatNominal(listrikAirBulanan)}
                onChange={(e) => setListrikAirBulanan(parseNominal(e.target.value))}
                placeholder="650.000"
                className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-300 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              *Rata-rata tagihan internet Wi-Fi toko, pulsa token PLN, dan PDAM per bulan.
            </p>
          </div>

          {/* 3. Iuran Sampah & Kebersihan */}
          <div className="space-y-1 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80">
            <label className="font-extrabold text-slate-800 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-[10px]">3</span>
                Iuran Sampah &amp; Kebersihan Lingkungan
              </span>
              <span className="text-[11px] text-emerald-700 font-bold font-mono">≈ {formatRupiah(iuranHarian)}/hari</span>
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">Rp</span>
              <input
                type="text"
                value={iuranKebersihanBulanan === 0 ? '' : formatNominal(iuranKebersihanBulanan)}
                onChange={(e) => setIuranKebersihanBulanan(parseNominal(e.target.value))}
                placeholder="150.000"
                className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-300 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              *Retribusi rutin pengangkutan sampah atau kebersihan lingkungan.
            </p>
          </div>

          {/* 4. Beban Tetap Tambahan Lainnya (Fleksibel) */}
          {showBiayaLain ? (
            <div className="space-y-2 bg-amber-50/60 p-3.5 rounded-2xl border border-amber-300">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-slate-800 flex items-center gap-1.5 text-xs">
                  <span className="w-5 h-5 rounded-md bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-[10px]">4</span>
                  Beban Tetap Tambahan Khusus Toko Ini
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowBiayaLain(false);
                    setBiayaLainBulanan(0);
                  }}
                  className="text-rose-600 hover:text-rose-800 text-[11px] font-bold inline-flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Hapus Beban Ini</span>
                </button>
              </div>

              <div>
                <input
                  type="text"
                  value={keteranganBiayaLain}
                  onChange={(e) => setKeteranganBiayaLain(e.target.value)}
                  placeholder="Misal: Iuran Paguyuban Pasar / Keamanan Malam RT"
                  className="w-full px-3 py-1.5 bg-white rounded-xl border border-amber-300 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">Rp</span>
                <input
                  type="text"
                  value={biayaLainBulanan === 0 ? '' : formatNominal(biayaLainBulanan)}
                  onChange={(e) => setBiayaLainBulanan(parseNominal(e.target.value))}
                  placeholder="100.000"
                  className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-amber-300 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-amber-900 font-bold">
                <span>*Otomatis dipotong dari omzet harian:</span>
                <span className="font-mono text-emerald-800">≈ {formatRupiah(lainHarian)}/hari</span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowBiayaLain(true)}
              className="w-full py-2.5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-600 text-slate-600 hover:text-emerald-700 font-extrabold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer bg-slate-50/50 hover:bg-emerald-50/30"
            >
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              <span>+ Tambah Biaya Tetap Toko Lainnya (Keamanan / Paguyuban / Alat)</span>
            </button>
          )}

          {/* Kotak Ringkasan Beban Harian Toko */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-100 to-amber-200 border border-amber-300 text-slate-950 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] uppercase font-black text-amber-900 block tracking-wider">
                Total Fixed Cost {cabang.kode}
              </span>
              <span className="text-base font-black font-mono text-slate-950">
                {formatRupiah(totalBulanan)}
                <span className="text-xs font-normal text-slate-700"> /bln</span>
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-black text-rose-800 block tracking-wider">
                Potongan per Hari
              </span>
              <span className="text-base font-black font-mono text-rose-700">
                -{formatRupiah(totalHarian)}
                <span className="text-xs font-normal text-rose-900/60"> /hari</span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-extrabold shadow-md shadow-emerald-800/20 transition cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Menyimpan...' : 'Simpan Biaya Toko'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
