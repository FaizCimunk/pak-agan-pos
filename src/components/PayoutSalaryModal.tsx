'use client';

import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  CreditCard,
  Copy,
  Check
} from 'lucide-react';
import { Payroll } from '@/lib/types';
import { db } from '@/lib/db';
import { formatRupiah, formatNominal, parseNominal } from '@/lib/utils';

interface PayoutSalaryModalProps {
  payroll: Payroll;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PayoutSalaryModal({
  payroll,
  onClose,
  onSuccess,
}: PayoutSalaryModalProps) {
  const totalGajiTersedia = payroll.gaji_bersih || 0;

  // Default payout amount: full salary available (tanpa potongan admin bank)
  const [payoutAmount, setPayoutAmount] = useState<number>(totalGajiTersedia);
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [copiedRek, setCopiedRek] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sisa Saldo Pekerja Nanti = Gaji Tersedia - Nominal Dicairkan (Tanpa Biaya Admin)
  const sisaSaldoNanti = totalGajiTersedia - payoutAmount;
  const isOverBudget = sisaSaldoNanti < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (payoutAmount <= 0) {
      alert('Nominal yang dicairkan harus lebih dari Rp 0');
      return;
    }

    if (isOverBudget) {
      alert('Nominal yang dicairkan melebihi total gaji yang tersedia!');
      return;
    }

    const rekInfo = payroll.karyawan_no_rekening
      ? `${payroll.karyawan_bank_nama || 'Bank'} • ${payroll.karyawan_no_rekening} (a.n. ${payroll.karyawan_atas_nama_rekening || payroll.karyawan_nama})`
      : 'Belum diisi / Tunai';

    const confirmPayout = confirm(
      `KONFIRMASI PENCAIRAN GAJI (TRANSFER):\n\n` +
      `Karyawan: ${payroll.karyawan_nama} (${payroll.karyawan_role || 'Kasir Cabang'})\n` +
      `Tujuan Transfer: ${rekInfo}\n` +
      `Nominal Transfer: ${formatRupiah(payoutAmount)}\n` +
      `Sisa Saldo Pekerja Nanti: ${formatRupiah(sisaSaldoNanti)}\n\n` +
      `Setelah dicairkan, kasbon periode ini otomatis LUNAS dan slip tercatat sebagai Terbayar. Lanjutkan?`
    );
    if (!confirmPayout) return;

    setIsSubmitting(true);
    try {
      await db.payoutKaryawanSalary({
        payroll: payroll,
        nominalDicairkan: payoutAmount,
        biayaAdmin: 0,
        buktiTransferUrl: receiptFileName ? `https://storage.pakagan.id/transfers/${receiptFileName}` : undefined,
        catatan: payroll.karyawan_no_rekening
          ? `Transfer ke ${payroll.karyawan_bank_nama || 'Rekening'} ${payroll.karyawan_no_rekening} (Lunas Tanpa Potongan Admin)`
          : `Transfer via M-Banking / Tunai (Lunas Tanpa Potongan Admin)`,
      });

      alert(`Gaji ${payroll.karyawan_nama} sebesar ${formatRupiah(payoutAmount)} berhasil dicairkan! Saldo kasbon telah lunas.`);
      onSuccess();
    } catch (err: any) {
      alert('Gagal mencairkan gaji: ' + (err.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Cairkan Gaji {payroll.karyawan_nama}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium capitalize">
              {payroll.karyawan_role || 'Kasir Cabang'} • {payroll.cabang_nama}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Rekening Bank / DANA Tujuan Transfer */}
          <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-between gap-2">
            <div className="flex items-start space-x-2 min-w-0">
              <CreditCard className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase text-sky-700 block">
                  Tujuan Transfer ({payroll.karyawan_bank_nama || 'Rekening / DANA'}):
                </span>
                {payroll.karyawan_no_rekening ? (
                  <>
                    <span className="font-mono font-black text-sm text-sky-950 block truncate">
                      {payroll.karyawan_no_rekening}
                    </span>
                    <span className="text-[10px] text-sky-800 block">
                      a.n. {payroll.karyawan_atas_nama_rekening || payroll.karyawan_nama}
                    </span>
                  </>
                ) : (
                  <span className="text-[11px] text-amber-800 font-semibold block">
                    Nomor rekening / DANA belum diisi (bisa diisi via tombol Ubah Gaji &amp; Rekening).
                  </span>
                )}
              </div>
            </div>
            {payroll.karyawan_no_rekening && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(payroll.karyawan_no_rekening || '');
                  setCopiedRek(true);
                  setTimeout(() => setCopiedRek(false), 1800);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-sky-100 border border-sky-300 text-sky-900 font-bold text-[10.5px] inline-flex items-center space-x-1 shrink-0"
              >
                {copiedRek ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedRek ? 'Disalin' : 'Salin'}</span>
              </button>
            )}
          </div>

          {/* Total Gaji Tersedia (Kotak Hijau Screenshot 2) */}
          <div className="p-3.5 bg-emerald-50 text-emerald-900 rounded-2xl font-bold border border-emerald-200 flex items-center justify-between">
            <span className="text-xs">Total Gaji Tersedia:</span>
            <span className="font-mono text-base font-black text-emerald-950">
              {formatRupiah(totalGajiTersedia)}
            </span>
          </div>

          {/* Nominal Dicairkan (Diterima Pekerja) */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Nominal yang Dicairkan (Diterima Pekerja)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-sm">
                Rp
              </span>
              <input
                type="text"
                value={payoutAmount === 0 ? '' : formatNominal(payoutAmount)}
                onChange={(e) => {
                  const val = parseNominal(e.target.value);
                  setPayoutAmount(val);
                }}
                placeholder="Contoh: 450.000"
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 font-mono font-black text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Nominal uang yang ditransfer ke rekening bank / e-wallet karyawan.
            </p>
          </div>

          {/* Upload Bukti Transfer */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Upload Bukti Transfer
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setReceiptFileName(file.name);
                }}
                className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-700 bg-slate-50 rounded-xl p-2 border border-slate-200"
              />
            </div>
            {receiptFileName && (
              <span className="text-[10px] text-emerald-700 font-bold block">
                ✓ File terpilih: {receiptFileName}
              </span>
            )}
          </div>

          {/* Rangkuman Otomatis untuk Bos */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Transfer via M-Banking:</span>
              <strong className="font-mono font-bold text-slate-900">
                {formatRupiah(payoutAmount)}
              </strong>
            </div>

            <div className="w-full h-px bg-slate-200 my-1" />

            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700">Sisa Saldo Pekerja Nanti:</span>
              <strong className={`font-mono text-sm font-black ${
                isOverBudget ? 'text-red-600' : sisaSaldoNanti === 0 ? 'text-emerald-700' : 'text-blue-700'
              }`}>
                {isOverBudget ? `-${formatRupiah(Math.abs(sisaSaldoNanti))}` : formatRupiah(sisaSaldoNanti)}
              </strong>
            </div>

            {isOverBudget && (
              <div className="p-2 rounded-xl bg-red-100 text-red-700 text-[10px] font-bold flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>⚠️ Nominal transfer melebihi total hak gaji yang tersedia!</span>
              </div>
            )}

            {sisaSaldoNanti === 0 && !isOverBudget && (
              <div className="text-[10px] text-emerald-700 font-bold text-right pt-0.5">
                ✓ Lunas Penuh (Saldo Pekerja Menjadi Rp 0)
              </div>
            )}
          </div>

          {/* Submit & Cancel Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isOverBudget || payoutAmount <= 0}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-700/25 btn-tactile transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Memproses...' : 'Cairkan Gaji'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
