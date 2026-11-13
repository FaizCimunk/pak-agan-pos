'use client';

import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  CreditCard,
  Copy,
  Check,
  Wallet,
  ArrowDownLeft,
  CheckCircle2
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
  // Saldo dompet riil staf saat ini
  const saldoDompet = Number(payroll.total_tabungan_snapshot !== undefined ? payroll.total_tabungan_snapshot : (payroll.gaji_bersih || 0));
  const gajiDraftPeriode = Number(payroll.gaji_bersih || 0);
  
  // Default: jika saldo dompet > 0, defaultnya adalah saldo dompet tersebut (bisa ditarik lunas jadi Rp 0)
  const defaultAmount = saldoDompet > 0 ? saldoDompet : Math.max(0, gajiDraftPeriode);
  const [payoutAmount, setPayoutAmount] = useState<number>(defaultAmount);
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [copiedRek, setCopiedRek] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const saldoAkhirPreview = saldoDompet - payoutAmount;
  const isOverBudget = saldoDompet > 0 && payoutAmount > saldoDompet;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (payoutAmount < 0) {
      alert('Nominal transfer tidak boleh negatif');
      return;
    }

    if (payoutAmount === 0 && saldoDompet <= 0) {
      alert('Tidak ada saldo dompet maupun nominal yang dapat ditransfer.');
      return;
    }

    const rekInfo = payroll.karyawan_no_rekening
      ? `${payroll.karyawan_bank_nama || 'Bank'} • ${payroll.karyawan_no_rekening} (a.n. ${payroll.karyawan_atas_nama_rekening || payroll.karyawan_nama})`
      : 'Belum diisi / Tunai';

    const confirmPayout = confirm(
      `KONFIRMASI PENCAIRAN / TRANSFER GAJI:\n\n` +
      `Karyawan: ${payroll.karyawan_nama}\n` +
      `Tujuan: ${rekInfo}\n` +
      `Nominal Ditransfer Sekarang: ${formatRupiah(payoutAmount)}\n` +
      `Sisa Saldo Dompet Setelah Transfer: ${saldoAkhirPreview === 0 ? 'Rp 0 (LUNAS)' : formatRupiah(saldoAkhirPreview)}\n\n` +
      `Lanjutkan proses transfer ini?`
    );
    if (!confirmPayout) return;

    setIsSubmitting(true);
    try {
      await db.payoutKaryawanSalary({
        payroll: payroll,
        nominalDicairkan: payoutAmount,
        biayaAdmin: 0,
        buktiTransferUrl: receiptFileName ? `https://storage.pakagan.id/transfers/${receiptFileName}` : undefined,
        catatan:
          saldoAkhirPreview === 0
            ? `Pencairan Penuh ${formatRupiah(payoutAmount)} ke ${payroll.karyawan_bank_nama || 'Rekening'} (Saldo Jadi Rp 0)`
            : saldoAkhirPreview > 0
              ? `Pencairan Sebagian ${formatRupiah(payoutAmount)} • Sisa Saldo Tersimpan ${formatRupiah(saldoAkhirPreview)}`
              : `Pencairan Gaji ${formatRupiah(payoutAmount)}`,
      });

      alert(
        saldoAkhirPreview === 0
          ? `Berhasil! Gaji ${payroll.karyawan_nama} sebesar ${formatRupiah(payoutAmount)} telah dicairkan penuh. Saldo dompet staf kini Rp 0.`
          : `Berhasil mencairkan ${formatRupiah(payoutAmount)}. Sisa saldo tersimpan ${formatRupiah(saldoAkhirPreview)}.`
      );
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
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Pencairan / Transfer Gaji Staf
            </h3>
            <p className="text-[11px] text-slate-500 font-medium capitalize">
              {payroll.karyawan_nama} • {payroll.cabang_nama}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
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
                    Nomor rekening / DANA belum diisi (pencairan tunai).
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
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-sky-100 border border-sky-300 text-sky-900 font-bold text-[10.5px] inline-flex items-center space-x-1 shrink-0 cursor-pointer"
              >
                {copiedRek ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedRek ? 'Disalin' : 'Salin'}</span>
              </button>
            )}
          </div>

          {/* Info Saldo Dompet Saat Ini */}
          <div className={`p-4 rounded-2xl border ${
            saldoDompet > 0
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
              : saldoDompet < 0
                ? 'bg-rose-50 border-rose-300 text-rose-950'
                : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider flex items-center space-x-1">
                <Wallet className="w-3.5 h-3.5" />
                <span>Saldo Dompet Staf Saat Ini:</span>
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                saldoDompet > 0
                  ? 'bg-emerald-200 text-emerald-900'
                  : saldoDompet < 0
                    ? 'bg-rose-200 text-rose-900'
                    : 'bg-slate-200 text-slate-800'
              }`}>
                {saldoDompet > 0 ? 'Siap Cair' : saldoDompet < 0 ? 'Utang Minus' : 'Rp 0'}
              </span>
            </div>
            <div className="text-2xl font-black font-mono tracking-tight mt-1">
              {saldoDompet < 0 ? `-${formatRupiah(Math.abs(saldoDompet))}` : formatRupiah(saldoDompet)}
            </div>
            <p className="text-[10.5px] mt-1 opacity-90">
              {saldoDompet > 0
                ? 'Otomatis dihitung dari akumulasi absensi approved dikurangi kasbon yang sudah diambil.'
                : saldoDompet < 0
                  ? 'Staf memiliki utang/kasbon berjalan. Upah absensi berikutnya akan otomatis memotong minus ini.'
                  : 'Seluruh gaji telah ditarik lunas sebelumnya.'}
            </p>
          </div>

          {/* Nominal Ditransfer Sekarang */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Nominal yang Ditransfer Sekarang:
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-sm">
                Rp
              </span>
              <input
                type="text"
                value={payoutAmount === 0 ? '0' : formatNominal(payoutAmount)}
                onChange={(e) => {
                  const val = parseNominal(e.target.value);
                  setPayoutAmount(val);
                }}
                placeholder="0"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 font-mono font-black text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            {/* Tombol Bantu Cepat */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {saldoDompet > 0 && (
                <button
                  type="button"
                  onClick={() => setPayoutAmount(saldoDompet)}
                  className={`px-3 py-1 rounded-lg text-[10.5px] font-bold border transition cursor-pointer ${
                    payoutAmount === saldoDompet
                      ? 'bg-emerald-700 text-white border-emerald-800'
                      : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  ⚡ Tarik Lunas ({formatRupiah(saldoDompet)} → Saldo Jadi Rp 0)
                </button>
              )}
              {payoutAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setPayoutAmount(0)}
                  className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Simpan Semua (Rp 0 TF)
                </button>
              )}
            </div>
          </div>

          {/* Upload Bukti Transfer */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Upload Bukti Transfer (Opsional)
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

          {/* Rangkuman Mutasi */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Nominal Ditransfer Sekarang:</span>
              <strong className="font-mono font-bold text-slate-900">
                {formatRupiah(payoutAmount)}
              </strong>
            </div>

            <div className="w-full h-px bg-slate-200 my-1" />

            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700">Sisa Saldo Dompet Staf Jadi:</span>
              <strong className={`font-mono text-sm font-black ${
                saldoAkhirPreview === 0
                  ? 'text-emerald-700'
                  : saldoAkhirPreview > 0
                    ? 'text-slate-800'
                    : 'text-rose-600'
              }`}>
                {saldoAkhirPreview === 0
                  ? 'Rp 0 (Lunas)'
                  : saldoAkhirPreview > 0
                    ? formatRupiah(saldoAkhirPreview)
                    : `-${formatRupiah(Math.abs(saldoAkhirPreview))}`}
              </strong>
            </div>

            {saldoAkhirPreview === 0 && payoutAmount > 0 && (
              <div className="text-[10.5px] text-emerald-800 font-bold bg-emerald-100/70 p-2 rounded-xl border border-emerald-200 flex items-center space-x-1.5 mt-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Seluruh hak gaji dicairkan penuh, saldo dompet menjadi Rp 0.</span>
              </div>
            )}
          </div>

          {/* Submit & Cancel Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (payoutAmount <= 0 && saldoDompet <= 0)}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-md shadow-emerald-700/25 btn-tactile transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span>{isSubmitting ? 'Memproses...' : 'Konfirmasi Transfer Gaji'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
