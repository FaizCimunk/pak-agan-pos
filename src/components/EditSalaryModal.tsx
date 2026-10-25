'use client';

import React, { useState } from 'react';
import { X, DollarSign, Coins, ShieldCheck, Check } from 'lucide-react';
import { Karyawan } from '@/lib/types';
import { db } from '@/lib/db';
import { formatRupiah, formatNominal, parseNominal } from '@/lib/utils';

interface EditSalaryModalProps {
  karyawan: Karyawan;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditSalaryModal({
  karyawan,
  onClose,
  onSuccess,
}: EditSalaryModalProps) {
  const [tipeGaji, setTipeGaji] = useState<'bulanan' | 'harian'>(karyawan.tipe_gaji || 'harian');
  const [gajiPokok, setGajiPokok] = useState<number>(karyawan.gaji_pokok || 2600000);
  const [gajiHarian, setGajiHarian] = useState<number>(karyawan.gaji_harian || 120000);
  const [plafonKasbon, setPlafonKasbon] = useState<number>(karyawan.plafon_kasbon || 1000000);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await db.updateKaryawanSalary(karyawan.id, {
        tipe_gaji: tipeGaji,
        gaji_pokok: tipeGaji === 'harian' ? (22 * gajiHarian) : gajiPokok,
        gaji_harian: gajiHarian,
        tunjangan_harian: 0,
        tunjangan: 0,
        plafon_kasbon: plafonKasbon,
      });
      alert(`Gaji harian & plafon kasbon ${karyawan.nama} berhasil diperbarui!`);
      onSuccess();
    } catch (e: any) {
      alert('Gagal memperbarui: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-brand-subtle/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-primary text-white flex items-center justify-center font-bold shadow-sm">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Ubah Gaji & Plafon Kasbon</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {karyawan.nama} ({karyawan.role.toUpperCase()})
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
        <div className="p-6 space-y-4 text-xs">
          
          {/* Tipe Gaji Selector */}
          <div>
            <label className="font-bold text-slate-700 block mb-1.5">
              Skema Penggajian Staf:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipeGaji('bulanan')}
                className={`py-2 px-3 rounded-xl font-bold border transition-all ${
                  tipeGaji === 'bulanan'
                    ? 'border-brand-primary bg-brand-subtle text-brand-dark'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                Gaji Pokok Bulanan
              </button>
              <button
                type="button"
                onClick={() => setTipeGaji('harian')}
                className={`py-2 px-3 rounded-xl font-bold border transition-all ${
                  tipeGaji === 'harian'
                    ? 'border-brand-primary bg-brand-subtle text-brand-dark'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                Upah Harian Lepas
              </button>
            </div>
          </div>

          {/* Gaji Pokok / Harian */}
          {tipeGaji === 'bulanan' ? (
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Gaji Pokok Bulanan (Rp)
              </label>
              <input
                type="text"
                value={gajiPokok === 0 ? '' : formatNominal(gajiPokok)}
                onChange={(e) => setGajiPokok(parseNominal(e.target.value))}
                placeholder="Contoh: 2.600.000"
                className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:border-brand-primary"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Gaji Harian per Kehadiran (Rp)
                </label>
                <input
                  type="text"
                  value={gajiHarian === 0 ? '' : formatNominal(gajiHarian)}
                  onChange={(e) => setGajiHarian(parseNominal(e.target.value))}
                  placeholder="Contoh: 120.000"
                  className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] space-y-1">
                <div className="font-bold flex justify-between">
                  <span>Simulasi 22 Hari Kerja:</span>
                  <span className="font-mono text-xs font-black">{formatRupiah(22 * gajiHarian)}</span>
                </div>
                <div className="text-[10px] text-emerald-700">
                  Total Gaji = 22 hari × {formatRupiah(gajiHarian)} (Langsung bersih tanpa pecahan uang makan).
                </div>
              </div>
            </div>
          )}

          {/* Plafon Kasbon */}
          <div>
            <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
              <span>Batas Plafon Kasbon Maksimal (Rp)</span>
              <span className="text-[10px] text-accent-gold font-bold">Mencegah Over-Bon</span>
            </label>
            <input
              type="text"
              value={plafonKasbon === 0 ? '' : formatNominal(plafonKasbon)}
              onChange={(e) => setPlafonKasbon(parseNominal(e.target.value))}
              placeholder="Contoh: 1.000.000"
              className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono font-bold text-sm text-accent-gold focus:outline-none focus:border-brand-primary"
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-accent-gold shrink-0 mt-0.5" />
            <span>
              Perubahan gaji & plafon ini langsung terhubung dengan kalkulator gaji payroll bulanan dan batas kasbon di portal staf karyawan.
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-extrabold text-xs bg-brand-primary hover:bg-brand-dark text-white shadow-md shadow-brand-dark/20 btn-tactile transition-all"
          >
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>

      </div>
    </div>
  );
}
