'use client';

import React, { useState } from 'react';
import { X, DollarSign, Coins, ShieldCheck, Check, PiggyBank, Calendar, Wallet } from 'lucide-react';
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
  const [tipeGaji, setTipeGaji] = useState<'bulanan' | 'harian'>(karyawan.tipe_gaji || 'harian');
  const [gajiPokok, setGajiPokok] = useState<number>(karyawan.gaji_pokok || 2600000);
  const [gajiHarian, setGajiHarian] = useState<number>(karyawan.gaji_harian || 100000);
  const [gajiMingguan, setGajiMingguan] = useState<number>((karyawan.gaji_harian || 100000) * 6);
  const [tabunganMingguan, setTabunganMingguan] = useState<number>(karyawan.tabungan_rutin_mingguan ?? 200000);
  const [plafonKasbon, setPlafonKasbon] = useState<number>(karyawan.plafon_kasbon || 500000);
  const [loading, setLoading] = useState<boolean>(false);

  // Estimasi Gaji Mingguan & Bersih Transfer
  const estimasiKotor6Hari = 6 * gajiHarian;
  const estimasiKotor7Hari = 7 * gajiHarian;
  const estimasiTransferMingguan = Math.max(0, estimasiKotor6Hari - tabunganMingguan);
  const estimasiSebulan26Hari = 26 * gajiHarian;
  const estimasiTabunganSebulan = 4 * tabunganMingguan;

  const handleSave = async () => {
    setLoading(true);
    try {
      await db.updateKaryawanSalary(karyawan.id, {
        tipe_gaji: tipeGaji,
        gaji_pokok: tipeGaji === 'harian' ? (26 * gajiHarian) : gajiPokok,
        gaji_harian: gajiHarian,
        tabungan_rutin_mingguan: tabunganMingguan,
        tunjangan_harian: 0,
        tunjangan: 0,
        plafon_kasbon: plafonKasbon,
      });
      alert(`Skema gaji mingguan & celengan tabungan ${karyawan.nama} berhasil diperbarui!`);
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
              <h3 className="text-base font-extrabold text-slate-900">Ubah Gaji Mingguan &amp; Tabungan</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {karyawan.nama} ({formatKaryawanRole(karyawan.role).toUpperCase()}) • Saldo Tabungan: <span className="font-bold text-emerald-800">{formatRupiah(karyawan.total_tabungan || 0)}</span>
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
          
          {/* Tipe Gaji Selector (Fokus Utama: Upah Harian Diambil Tiap Minggu) */}
          <div>
            <label className="font-extrabold text-slate-700 block mb-1.5">
              Skema Penggajian Staf Toko:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipeGaji('harian')}
                className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                  tipeGaji === 'harian'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 font-black'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                Upah Harian (Diambil Mingguan)
              </button>
              <button
                type="button"
                onClick={() => setTipeGaji('bulanan')}
                className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                  tipeGaji === 'bulanan'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 font-black'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                Gaji Pokok Bulanan (Tetap)
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
                className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Dual Input: Gaji Mingguan (Total) vs Upah Harian (Bagi 6 Otomatis) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="font-extrabold text-slate-800 block mb-1">
                    <span>Gaji Mingguan Total (6 Hari Kerja):</span>
                  </label>
                  <input
                    type="text"
                    value={gajiMingguan === 0 ? '' : formatNominal(gajiMingguan)}
                    onChange={(e) => {
                      const val = parseNominal(e.target.value);
                      setGajiMingguan(val);
                      setGajiHarian(Math.round(val / 6));
                    }}
                    placeholder="Contoh: 600.000"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Gaji 1 minggu (staf libur 1 hari)
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
                    placeholder="Contoh: 100.000"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-emerald-400 font-mono font-black text-sm text-emerald-900 focus:outline-none focus:border-emerald-600 ring-2 ring-emerald-500/20"
                  />
                  <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
                    = Masuk ke laba rugi toko /hari
                  </span>
                </div>
              </div>

              {/* Pilihan Cepat Gaji Mingguan */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10.5px] font-bold text-slate-600">Pilihan Cepat:</span>
                {[
                  { label: '600rb /mgg (100rb/hr)', w: 600000, d: 100000 },
                  { label: '720rb /mgg (120rb/hr)', w: 720000, d: 120000 },
                  { label: '750rb /mgg (125rb/hr)', w: 750000, d: 125000 },
                  { label: '900rb /mgg (150rb/hr)', w: 900000, d: 150000 },
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

              {/* Rincian Siklus Mingguan & Sebulan Tanpa Bon */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200 text-slate-800 text-[11px] space-y-2">
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5 font-bold text-emerald-950">
                  <span className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Gaji Diambil Tiap Minggu (6 Hari Kerja):</span>
                  </span>
                  <span className="font-mono text-xs font-black text-emerald-800">
                    {formatRupiah(estimasiKotor6Hari)} /minggu
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 text-[10.5px]">
                  <span>• Bila Masuk 7 Hari Penuh (Tanpa Libur):</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatRupiah(estimasiKotor7Hari)} /minggu
                  </span>
                </div>

                <div className="border-t border-dashed border-emerald-200 pt-1.5 flex items-center justify-between font-extrabold text-slate-900">
                  <span className="flex items-center space-x-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Jumlah Sebulan Penuh (Jika Tanpa Bon/Kasbon):</span>
                  </span>
                  <span className="font-mono text-xs font-black text-emerald-900 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                    {formatRupiah(estimasiSebulan26Hari)} /bulan
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  *Jika staf rajin hadir (26 hari kerja) dan tidak mengambil kasbon, total uang yang dibawa pulang utuh mencapai {formatRupiah(estimasiSebulan26Hari)}.
                </p>
              </div>
            </div>
          )}

          {/* FITUR CELENGAN / TABUNGAN KARYAWAN OTOMATIS */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-300 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-black text-amber-950 flex items-center space-x-1.5 text-xs">
                <PiggyBank className="w-4 h-4 text-amber-700" />
                <span>Titip Tabungan Rutin Mingguan:</span>
              </label>
              <span className="text-[10px] font-bold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-full">
                Otomatis Simpan di Boss
              </span>
            </div>

            <p className="text-[10.5px] text-amber-900/90 leading-tight">
              Karyawan dapat menyisihkan sebagian upah mingguan untuk ditabung. Nominal ini otomatis dipotong dari transfer gaji mingguan dan dicatat ke <strong>Buku Tabungan Karyawan</strong>.
            </p>

            {/* Tombol Pilihan Cepat Tabungan */}
            <div className="grid grid-cols-4 gap-1.5 pt-0.5">
              {[0, 50000, 100000, 200000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTabunganMingguan(amt)}
                  className={`py-1.5 px-1 rounded-xl text-[10.5px] font-extrabold border transition-all text-center ${
                    tabunganMingguan === amt
                      ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                      : 'bg-white text-amber-950 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  {amt === 0 ? 'Tanpa Nabung' : formatRupiah(amt)}
                </button>
              ))}
            </div>

            <div className="pt-1 flex items-center space-x-2">
              <span className="text-[11px] font-bold text-amber-950 shrink-0">Nominal Kustom:</span>
              <input
                type="text"
                value={tabunganMingguan === 0 ? '' : formatNominal(tabunganMingguan)}
                onChange={(e) => setTabunganMingguan(parseNominal(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-1.5 bg-white rounded-xl border border-amber-300 font-mono font-bold text-xs text-amber-950 focus:outline-none focus:border-amber-600"
              />
            </div>

            {/* Simulasi Nyata Transfer Gaji Mingguan */}
            {tabunganMingguan > 0 && (
              <div className="p-2.5 rounded-xl bg-white/90 border border-amber-200 text-[10.5px] space-y-1 text-slate-800">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Upah Kotor 6 Hari Kerja:</span>
                  <span className="font-mono font-bold">{formatRupiah(estimasiKotor6Hari)}</span>
                </div>
                <div className="flex justify-between items-center text-amber-900 font-bold">
                  <span>• Disisihkan ke Celengan Tabungan:</span>
                  <span className="font-mono text-rose-700">-{formatRupiah(tabunganMingguan)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200 pt-1 font-black text-emerald-900">
                  <span>Uang Bersih Ditransfer ke Rekening/Kasir:</span>
                  <span className="font-mono text-xs">{formatRupiah(estimasiTransferMingguan)} /minggu</span>
                </div>
                <div className="text-[9.5px] text-amber-800 font-medium pt-0.5">
                  ★ Saldo tabungan staf akan bertambah <strong>{formatRupiah(tabunganMingguan)}</strong> tiap minggu ({formatRupiah(estimasiTabunganSebulan)} sebulan) dan bisa ditarik kapan saja.
                </div>
              </div>
            )}
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
            <span>{loading ? 'Menyimpan...' : 'Simpan Skema Gaji & Tabungan'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
