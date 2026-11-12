'use client';

import React, { useState } from 'react';
import { X, DollarSign, ShieldCheck, Check, PiggyBank, Calendar, Wallet, CreditCard, Phone } from 'lucide-react';
import { Karyawan } from '@/lib/types';
import { db } from '@/lib/db';
import { formatRupiah, formatNominal, parseNominal, formatKaryawanRole } from '@/lib/utils';

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
  const [gajiHarian, setGajiHarian] = useState<number>(karyawan.gaji_harian || 100000);
  const [gajiMingguan, setGajiMingguan] = useState<number>((karyawan.gaji_harian || 100000) * 6);
  const [plafonKasbon, setPlafonKasbon] = useState<number>(karyawan.plafon_kasbon || 500000);
  const [bankNama, setBankNama] = useState<string>(karyawan.bank_nama || '');
  const [noRekening, setNoRekening] = useState<string>(karyawan.no_rekening || '');
  const [atasNamaRek, setAtasNamaRek] = useState<string>(karyawan.atas_nama_rekening || karyawan.nama || '');
  const [telepon, setTelepon] = useState<string>(karyawan.telepon || '');
  const [loading, setLoading] = useState<boolean>(false);

  // Estimasi Gaji Standar (6 & 7 Hari Kerja)
  const estimasiKotor6Hari = 6 * gajiHarian;
  const estimasiKotor7Hari = 7 * gajiHarian;

  const handleSave = async () => {
    setLoading(true);
    try {
      await db.updateKaryawanSalary(karyawan.id, {
        tipe_gaji: 'harian',
        gaji_pokok: 6 * gajiHarian,
        gaji_harian: gajiHarian,
        tabungan_rutin_mingguan: 0,
        tunjangan_harian: 0,
        tunjangan: 0,
        plafon_kasbon: plafonKasbon,
        bank_nama: bankNama.trim(),
        no_rekening: noRekening.trim(),
        atas_nama_rekening: atasNamaRek.trim() || karyawan.nama,
        telepon: telepon.trim() || karyawan.telepon,
      });
      alert(`Tarif upah & rekening ${karyawan.nama} berhasil diperbarui!`);
      onSuccess();
    } catch (e: any) {
      alert('Gagal memperbarui: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/70 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold shadow-sm">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Ubah Upah Harian &amp; Rekening</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {karyawan.nama} ({formatKaryawanRole(karyawan.role).toUpperCase()}) • Saldo Simpanan: <span className="font-bold text-emerald-800">{formatRupiah(karyawan.total_tabungan || 0)}</span>
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

        {/* Form Body (Scrollable) */}
        <div className="p-6 space-y-4 text-xs overflow-y-auto">
          
          {/* Banner Skema Upah Harian */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse shrink-0" />
              <div>
                <span className="text-xs font-black text-emerald-950 block">
                  Upah Berdasarkan Kehadiran Harian
                </span>
                <span className="text-[10.5px] text-emerald-800 font-medium">
                  Jika saat transfer masih ada sisa gaji, otomatis masuk ke Saldo Simpanan staf (seperti rekening bank).
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Dual Input: Standar 6 Hari Kerja vs Upah Harian (Bagi 6 Otomatis) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <label className="font-extrabold text-slate-800 block mb-1">
                  <span>Patokan Upah 6 Hari Kerja:</span>
                </label>
                <input
                  type="text"
                  value={gajiMingguan === 0 ? '' : formatNominal(gajiMingguan)}
                  onChange={(e) => {
                    const val = parseNominal(e.target.value);
                    setGajiMingguan(val);
                    setGajiHarian(Math.round(val / 6));
                  }}
                  placeholder="Contoh: 570.000"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Acuan standar 6 hari kerja (÷ 6)
                </span>
              </div>

              <div>
                <label className="font-extrabold text-emerald-900 block mb-1 flex items-center justify-between">
                  <span>Upah Harian (Otomatis ÷ 6):</span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                    Beban Toko /Hari
                  </span>
                </label>
                <input
                  type="text"
                  value={gajiHarian === 0 ? '' : formatNominal(gajiHarian)}
                  onChange={(e) => {
                    const val = parseNominal(e.target.value);
                    setGajiHarian(val);
                    setGajiMingguan(val * 6);
                  }}
                  placeholder="Contoh: 95.000"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-emerald-400 font-mono font-black text-sm text-emerald-900 focus:outline-none focus:border-emerald-600 ring-2 ring-emerald-500/20"
                />
                <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
                  = Masuk ke upah per 1x hadir
                </span>
              </div>
            </div>

            {/* Pilihan Cepat Tarif Upah */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] font-bold text-slate-600">Pilihan Cepat:</span>
              {[
                { label: '95rb/hr (570rb/6hr)', w: 570000, d: 95000 },
                { label: '100rb/hr (600rb/6hr)', w: 600000, d: 100000 },
                { label: '120rb/hr (720rb/6hr)', w: 720000, d: 120000 },
                { label: '125rb/hr (750rb/6hr)', w: 750000, d: 125000 },
                { label: '150rb/hr (900rb/6hr)', w: 900000, d: 150000 },
              ].map((preset) => (
                <button
                  key={preset.w}
                  type="button"
                  onClick={() => {
                    setGajiMingguan(preset.w);
                    setGajiHarian(preset.d);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                    gajiMingguan === preset.w
                      ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Ringkasan Tarif */}
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-slate-800 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between font-bold text-emerald-950">
                <span className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Simulasi 6 Hari Hadir:</span>
                </span>
                <span className="font-mono font-black text-emerald-800">
                  {formatRupiah(estimasiKotor6Hari)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 text-[10.5px]">
                <span>• Bila Masuk 7 Hari Penuh:</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatRupiah(estimasiKotor7Hari)}
                </span>
              </div>
            </div>
          </div>

          {/* Plafon Kasbon */}
          <div>
            <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
              <span>Batas Plafon Kasbon Maksimal (Rp):</span>
              <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Mencegah Over-Bon
              </span>
            </label>
            <input
              type="text"
              value={plafonKasbon === 0 ? '' : formatNominal(plafonKasbon)}
              onChange={(e) => setPlafonKasbon(parseNominal(e.target.value))}
              placeholder="Contoh: 500.000"
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>

          {/* Rekening Bank / DANA & WhatsApp */}
          <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sky-950 flex items-center space-x-1.5 text-xs">
                <CreditCard className="w-4 h-4 text-sky-700" />
                <span>Rekening Bank / Kirim Gaji &amp; No. WA:</span>
              </span>
            </div>

            <div>
              <label className="text-[10.5px] font-bold text-slate-700 block mb-1">
                Nama Bank / Aplikasi / Metode Kirim (Isi Sendiri):
              </label>
              <input
                type="text"
                value={bankNama}
                onChange={(e) => setBankNama(e.target.value)}
                placeholder="Ketik sendiri: DANA, BCA, BRI, BSI, OVO, SeaBank, Tunai..."
                className="w-full px-3 py-1.5 bg-white border border-sky-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-sky-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10.5px] font-bold text-slate-700 block mb-1">
                  {bankNama.trim()
                    ? bankNama.trim().toLowerCase() === 'tunai'
                      ? 'Keterangan Kirim:'
                      : `Nomor ${bankNama.trim()}:`
                    : 'Nomor Rekening / Tujuan:'}
                </label>
                <input
                  type="text"
                  value={noRekening}
                  onChange={(e) => setNoRekening(e.target.value)}
                  placeholder="No. rekening / No. HP / keterangan"
                  className="w-full px-3 py-1.5 bg-white border border-sky-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-600"
                />
              </div>

              <div>
                <label className="text-[10.5px] font-bold text-slate-700 block mb-1">
                  Atas Nama Penerima:
                </label>
                <input
                  type="text"
                  value={atasNamaRek}
                  onChange={(e) => setAtasNamaRek(e.target.value)}
                  placeholder={karyawan.nama}
                  className="w-full px-3 py-1.5 bg-white border border-sky-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-sky-600"
                />
              </div>
            </div>

            <div>
              <label className="text-[10.5px] font-bold text-slate-700 block mb-1 flex items-center space-x-1">
                <Phone className="w-3 h-3 text-slate-500" />
                <span>Nomor WhatsApp (Kirim Slip Gaji):</span>
              </label>
              <input
                type="text"
                value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                placeholder="0812-xxxx-xxxx"
                className="w-full px-3 py-1.5 bg-white border border-sky-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-black text-xs bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-900/20 btn-tactile transition-all cursor-pointer flex items-center space-x-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{loading ? 'Menyimpan...' : 'Simpan Upah & Rekening'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
