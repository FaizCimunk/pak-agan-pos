'use client';

import React, { useState } from 'react';
import { 
  X, 
  AlertCircle, 
  Coins, 
  CreditCard, 
  Save 
} from 'lucide-react';
import { Payroll, MetodePencairan } from '@/lib/types';
import { db } from '@/lib/db';
import { formatRupiah, formatNominal, parseNominal } from '@/lib/utils';

interface GiveLoanModalProps {
  payroll: Payroll;
  onClose: () => void;
  onSuccess: () => void;
}

export default function GiveLoanModal({
  payroll,
  onClose,
  onSuccess,
}: GiveLoanModalProps) {
  const [nominalDisplay, setNominalDisplay] = useState<string>('100.000');
  const [keperluan, setKeperluan] = useState<string>('');
  const [metode, setMetode] = useState<MetodePencairan>('transfer');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nominal = parseNominal(nominalDisplay);
    if (!nominal || nominal <= 0) {
      alert('Masukkan nominal hutangan yang valid');
      return;
    }

    if (!keperluan.trim()) {
      alert('Tuliskan keperluan pinjaman / hutangan');
      return;
    }

    const confirmLoan = confirm(
      `BERI PINJAMAN / HUTANGAN:\n\n` +
      `Karyawan: ${payroll.karyawan_nama}\n` +
      `Nominal: ${formatRupiah(nominal)}\n` +
      `Keperluan: ${keperluan}\n` +
      `Pencairan: ${metode === 'laci' ? 'Kas Laci Outlet' : 'Transfer Bank'}\n\n` +
      `Pinjaman ini akan langsung disetujui (Approved) dan otomatis memotong gaji pada perhitungan payroll berikutnya. Lanjutkan?`
    );
    if (!confirmLoan) return;

    setIsSubmitting(true);
    try {
      const created = await db.createPengeluaran({
        cabang_id: payroll.cabang_id,
        cabang_nama: payroll.cabang_nama,
        karyawan_id: payroll.karyawan_id,
        pemohon_nama: payroll.karyawan_nama || 'Karyawan',
        pemohon_telepon: payroll.karyawan_telepon,
        jenis: 'kasbon',
        keperluan: keperluan.trim(),
        nominal: nominal,
        metode_pencairan: metode,
        tanggal: new Date().toISOString(),
      });

      // Langsung approve oleh Owner
      await db.approvePengeluaran(created.id, {
        metode: metode,
        approvedBy: 'Pak Agan (Owner Pusat)',
      });

      alert(`Hutangan sebesar ${formatRupiah(nominal)} berhasil diberikan ke ${payroll.karyawan_nama}! Saldo kasbon telah diperbarui dan langsung memotong gaji.`);
      onSuccess();
    } catch (err: any) {
      alert('Gagal memberi hutangan: ' + (err.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/80">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700">Kasbon / Pinjaman Langsung</span>
            <h3 className="text-base font-extrabold text-rose-950">
              Beri Hutangan Urgent
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors shadow-2xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Penerima Hutangan:</span>
            <span className="text-sm font-extrabold text-slate-900 block">{payroll.karyawan_nama}</span>
            <span className="text-[11px] text-slate-500 block capitalize">{payroll.karyawan_role || 'Kasir Cabang'} • {payroll.cabang_nama}</span>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Nominal Pinjaman (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-sm">
                Rp
              </span>
              <input
                type="text"
                value={nominalDisplay}
                onChange={(e) => setNominalDisplay(formatNominal(parseNominal(e.target.value)))}
                placeholder="Contoh: 100.000"
                required
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 font-mono font-extrabold text-base text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Keperluan / Alasan Kasbon Urgent
            </label>
            <textarea
              rows={2}
              value={keperluan}
              onChange={(e) => setKeperluan(e.target.value)}
              placeholder="Contoh: Kasbon darurat keluarga / bensin motor"
              required
              className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Metode Pencairan Dana
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMetode('transfer')}
                className={`p-2.5 rounded-xl border font-bold text-[11px] flex items-center justify-center space-x-1.5 transition ${
                  metode === 'transfer'
                    ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Transfer Bank</span>
              </button>

              <button
                type="button"
                onClick={() => setMetode('laci')}
                className={`p-2.5 rounded-xl border font-bold text-[11px] flex items-center justify-center space-x-1.5 transition ${
                  metode === 'laci'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Kas Laci Kasir</span>
              </button>
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 btn-tactile transition-all"
            >
              {isSubmitting ? 'Menyimpan...' : 'Beri Hutangan'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
