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
  const gajiPeriodeIni = payroll.gaji_bersih || 0;
  const saldoSimpananAwal = payroll.total_tabungan_snapshot || 0;
  const totalHakMaksimal = gajiPeriodeIni + saldoSimpananAwal;

  // Default: transfer penuh gaji periode ini (tanpa menyentuh simpanan lama)
  const [payoutAmount, setPayoutAmount] = useState<number>(gajiPeriodeIni);
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [copiedRek, setCopiedRek] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const sisaMasukSimpanan = Math.max(0, gajiPeriodeIni - payoutAmount);
  const tarikDariSimpanan = Math.max(0, payoutAmount - gajiPeriodeIni);
  const saldoSimpananAkhir = Math.max(0, saldoSimpananAwal + sisaMasukSimpanan - tarikDariSimpanan);
  const isOverBudget = payoutAmount > totalHakMaksimal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (payoutAmount < 0) {
      alert('Nominal transfer tidak boleh negatif');
      return;
    }

    if (payoutAmount === 0 && gajiPeriodeIni <= 0) {
      alert('Tidak ada gaji periode ini maupun dana yang ditransfer.');
      return;
    }

    if (isOverBudget) {
      alert('Nominal transfer melebihi total hak gaji + saldo simpanan staf!');
      return;
    }

    const rekInfo = payroll.karyawan_no_rekening
      ? `${payroll.karyawan_bank_nama || 'Bank'} • ${payroll.karyawan_no_rekening} (a.n. ${payroll.karyawan_atas_nama_rekening || payroll.karyawan_nama})`
      : 'Belum diisi / Tunai';

    const ringkasanSimpanan =
      sisaMasukSimpanan > 0
        ? `Otomatis Masuk Saldo Simpanan: +${formatRupiah(sisaMasukSimpanan)}\nSaldo Simpanan Baru: ${formatRupiah(saldoSimpananAkhir)}`
        : tarikDariSimpanan > 0
          ? `Ambil dari Saldo Simpanan: -${formatRupiah(tarikDariSimpanan)}\nSisa Saldo Simpanan: ${formatRupiah(saldoSimpananAkhir)}`
          : `Gaji periode ini dibayar penuh (Saldo Simpanan tetap ${formatRupiah(saldoSimpananAkhir)})`;

    const confirmPayout = confirm(
      `KONFIRMASI TRANSFER GAJI (ALA REKENING BANK):\n\n` +
      `Karyawan: ${payroll.karyawan_nama} (${formatRupiah(gajiPeriodeIni)} periode ini)\n` +
      `Tujuan Transfer: ${rekInfo}\n` +
      `Nominal Ditransfer Sekarang: ${formatRupiah(payoutAmount)}\n` +
      `${ringkasanSimpanan}\n\n` +
      `Kasbon periode ini otomatis ditandai LUNAS. Lanjutkan?`
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
          sisaMasukSimpanan > 0
            ? `Transfer ${formatRupiah(payoutAmount)} • Sisa ${formatRupiah(sisaMasukSimpanan)} otomatis masuk Saldo Simpanan`
            : tarikDariSimpanan > 0
              ? `Transfer ${formatRupiah(payoutAmount)} (Gaji + cairkan simpanan ${formatRupiah(tarikDariSimpanan)})`
              : payroll.karyawan_no_rekening
                ? `Transfer penuh ke ${payroll.karyawan_bank_nama || 'Rekening'} ${payroll.karyawan_no_rekening}`
                : `Transfer penuh via M-Banking / Tunai`,
      });

      const doneMsg =
        sisaMasukSimpanan > 0
          ? `Berhasil! Ditransfer ${formatRupiah(payoutAmount)} dan sisa ${formatRupiah(sisaMasukSimpanan)} otomatis masuk Saldo Simpanan ${payroll.karyawan_nama} (Saldo jadi ${formatRupiah(saldoSimpananAkhir)}).`
          : `Gaji ${payroll.karyawan_nama} sebesar ${formatRupiah(payoutAmount)} berhasil dicairkan!`;
      alert(doneMsg);
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
              Transfer &amp; Simpan Gaji — {payroll.karyawan_nama}
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
                    Nomor rekening / DANA belum diisi (bisa diisi via tombol Edit).
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

          {/* Info Hak Gaji & Saldo Simpanan Saat Ini */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-emerald-50 text-emerald-900 rounded-2xl border border-emerald-200">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">Gaji Periode Ini:</span>
              <span className="font-mono text-sm font-black text-emerald-950">
                {formatRupiah(gajiPeriodeIni)}
              </span>
            </div>
            <div className="p-3 bg-amber-50 text-amber-950 rounded-2xl border border-amber-200">
              <span className="text-[10px] font-bold uppercase text-amber-800 block">Saldo Simpanan Staf:</span>
              <span className="font-mono text-sm font-black text-amber-950">
                {formatRupiah(saldoSimpananAwal)}
              </span>
            </div>
          </div>

          {/* Nominal Ditransfer Sekarang */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Nominal yang Ditransfer Sekarang (Sisa Otomatis Masuk Simpanan)
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
              <button
                type="button"
                onClick={() => setPayoutAmount(gajiPeriodeIni)}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition cursor-pointer ${
                  payoutAmount === gajiPeriodeIni
                    ? 'bg-emerald-700 text-white border-emerald-800'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Transfer Penuh ({formatRupiah(gajiPeriodeIni)})
              </button>
              {gajiPeriodeIni > 0 && (
                <button
                  type="button"
                  onClick={() => setPayoutAmount(0)}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition cursor-pointer ${
                    payoutAmount === 0
                      ? 'bg-amber-600 text-white border-amber-700'
                      : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  Simpan Semua (Rp 0 TF)
                </button>
              )}
              {saldoSimpananAwal > 0 && (
                <button
                  type="button"
                  onClick={() => setPayoutAmount(totalHakMaksimal)}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition cursor-pointer ${
                    payoutAmount === totalHakMaksimal
                      ? 'bg-sky-700 text-white border-sky-800'
                      : 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  + Gabung Simpanan ({formatRupiah(totalHakMaksimal)})
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

          {/* Rangkuman Mutasi Ala Bank */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Ditransfer Sekarang:</span>
              <strong className="font-mono font-bold text-slate-900">
                {formatRupiah(payoutAmount)}
              </strong>
            </div>

            {sisaMasukSimpanan > 0 && (
              <div className="flex justify-between text-xs text-emerald-800 font-bold">
                <span>Sisa Otomatis Masuk Simpanan (+):</span>
                <strong className="font-mono font-black">
                  +{formatRupiah(sisaMasukSimpanan)}
                </strong>
              </div>
            )}

            {tarikDariSimpanan > 0 && !isOverBudget && (
              <div className="flex justify-between text-xs text-sky-800 font-bold">
                <span>Diambil dari Saldo Simpanan (-):</span>
                <strong className="font-mono font-black">
                  -{formatRupiah(tarikDariSimpanan)}
                </strong>
              </div>
            )}

            <div className="w-full h-px bg-slate-200 my-1" />

            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700">Saldo Simpanan Staf Jadi:</span>
              <strong className={`font-mono text-sm font-black ${
                isOverBudget ? 'text-red-600' : sisaMasukSimpanan > 0 ? 'text-emerald-700' : 'text-amber-800'
              }`}>
                {isOverBudget ? `Kurang ${formatRupiah(payoutAmount - totalHakMaksimal)}` : formatRupiah(saldoSimpananAkhir)}
              </strong>
            </div>

            {isOverBudget && (
              <div className="p-2 rounded-xl bg-red-100 text-red-700 text-[10px] font-bold flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>⚠️ Melebihi Gaji Periode Ini + Saldo Simpanan ({formatRupiah(totalHakMaksimal)})!</span>
              </div>
            )}

            {!isOverBudget && payoutAmount === gajiPeriodeIni && (
              <div className="text-[10px] text-emerald-700 font-bold text-right pt-0.5">
                ✓ Gaji periode ini dibayar penuh
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
              disabled={isSubmitting || isOverBudget || (payoutAmount <= 0 && gajiPeriodeIni <= 0)}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-700/25 btn-tactile transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Memproses...' : payoutAmount === 0 ? 'Simpan ke Saldo' : 'Transfer & Simpan'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
