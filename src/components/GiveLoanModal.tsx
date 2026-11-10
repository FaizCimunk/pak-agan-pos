'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, 
  Coins, 
  CreditCard,
  UserCheck
} from 'lucide-react';
import { Payroll, MetodePencairan, Karyawan, Cabang } from '@/lib/types';
import { db, isBranchMatch } from '@/lib/db';
import { formatRupiah, formatNominal, parseNominal } from '@/lib/utils';

interface GiveLoanModalProps {
  payroll?: Payroll | null;
  karyawanList?: Karyawan[];
  cabangList?: Cabang[];
  defaultCabangId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function GiveLoanModal({
  payroll,
  karyawanList = [],
  cabangList = [],
  defaultCabangId,
  onClose,
  onSuccess,
}: GiveLoanModalProps) {
  const selectableWorkers = useMemo(() => {
    return karyawanList.filter(k => {
      if (k.role === 'owner') return false;
      if (defaultCabangId && defaultCabangId !== 'all') {
        return isBranchMatch(k.cabang_id, defaultCabangId);
      }
      return true;
    });
  }, [karyawanList, defaultCabangId]);

  const [selectedKaryawanId, setSelectedKaryawanId] = useState<string>(
    payroll?.karyawan_id || selectableWorkers[0]?.id || karyawanList.find(k => k.role !== 'owner')?.id || ''
  );
  const [nominalDisplay, setNominalDisplay] = useState<string>('100.000');
  const [keperluan, setKeperluan] = useState<string>('Kasbon mingguan staf');
  const [metode, setMetode] = useState<MetodePencairan>('transfer');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const selectedWorker = useMemo(() => {
    return karyawanList.find(k => k.id === selectedKaryawanId) || null;
  }, [karyawanList, selectedKaryawanId]);

  const targetName = payroll?.karyawan_nama || selectedWorker?.nama || 'Karyawan';
  const targetRole = payroll?.karyawan_role || selectedWorker?.role || 'kasir';
  const targetCabangId = payroll?.cabang_id || selectedWorker?.cabang_id || cabangList[0]?.id || 'cbg-1';
  const targetBranchObj = cabangList.find(c => isBranchMatch(c.id, targetCabangId));
  const targetCabangNama = payroll?.cabang_nama || targetBranchObj?.nama || 'Cabang';
  const targetPhone = payroll?.karyawan_telepon || selectedWorker?.telepon;
  const targetBank = payroll?.karyawan_bank_nama || selectedWorker?.bank_nama;
  const targetRek = payroll?.karyawan_no_rekening || selectedWorker?.no_rekening;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalKarId = payroll?.karyawan_id || selectedKaryawanId;
    if (!finalKarId) {
      alert('Pilih karyawan penerima kasbon terlebih dahulu.');
      return;
    }

    const nominal = parseNominal(nominalDisplay);
    if (!nominal || nominal <= 0) {
      alert('Masukkan nominal kasbon yang valid');
      return;
    }

    if (!keperluan.trim()) {
      alert('Tuliskan keperluan / catatan kasbon');
      return;
    }

    const confirmLoan = confirm(
      `CATAT KASBON STAF (LANGSUNG DI-ACC PUSAT):\n\n` +
      `Karyawan: ${targetName}\n` +
      `Cabang: ${targetCabangNama}\n` +
      `Nominal: ${formatRupiah(nominal)}\n` +
      `Keterangan: ${keperluan}\n` +
      `Sumber Dana: ${metode === 'laci' ? 'Kas Laci Outlet' : 'Transfer Bank / DANA'}\n\n` +
      `Kasbon ini langsung berstatus Disetujui dan otomatis memotong Gaji Mingguan ${targetName}. Lanjutkan?`
    );
    if (!confirmLoan) return;

    setIsSubmitting(true);
    try {
      const created = await db.createPengeluaran({
        cabang_id: targetCabangId,
        cabang_nama: targetCabangNama,
        karyawan_id: finalKarId,
        pemohon_nama: targetName,
        pemohon_telepon: targetPhone,
        jenis: 'kasbon',
        keperluan: keperluan.trim(),
        nominal: nominal,
        metode_pencairan: metode,
        tanggal: new Date().toISOString(),
      });

      // Langsung approve oleh Owner Pusat agar otomatis memotong gaji mingguan
      await db.approvePengeluaran(created.id, {
        metode: metode,
        approvedBy: 'Pak Agan (Owner Pusat)',
      });

      alert(`Kasbon ${formatRupiah(nominal)} untuk ${targetName} berhasil dicatat & otomatis memotong gaji mingguan!`);
      onSuccess();
    } catch (err: any) {
      alert('Gagal mencatat kasbon: ' + (err.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/80">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700">
              Admin Pusat • Otomatis Potong Gaji Mingguan
            </span>
            <h3 className="text-base font-extrabold text-rose-950">
              Catat Kasbon Karyawan
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
          
          {payroll ? (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Penerima Kasbon:</span>
              <span className="text-sm font-extrabold text-slate-900 block">{targetName}</span>
              <span className="text-[11px] text-slate-500 block capitalize">{targetRole} • {targetCabangNama}</span>
              {targetRek && (
                <span className="text-[10.5px] text-sky-800 font-mono font-bold block mt-1">
                  💳 Tujuan Transfer: {targetBank || 'Bank'} • {targetRek}
                </span>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <UserCheck className="w-3.5 h-3.5 text-rose-600" />
                <span>Pilih Karyawan Penerima Kasbon:</span>
              </label>
              <select
                value={selectedKaryawanId}
                onChange={(e) => setSelectedKaryawanId(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-rose-500"
              >
                {(selectableWorkers.length > 0 ? selectableWorkers : karyawanList.filter(k => k.role !== 'owner')).map(k => {
                  const br = cabangList.find(c => isBranchMatch(c.id, k.cabang_id));
                  return (
                    <option key={k.id} value={k.id}>
                      {k.nama} — {br?.kode || 'CBG'} ({br?.nama.split('-')[1]?.trim() || 'Outlet'})
                    </option>
                  );
                })}
              </select>
              {targetRek && (
                <div className="text-[10.5px] text-sky-800 font-mono font-bold px-2.5 py-1.5 bg-sky-50 rounded-xl border border-sky-200">
                  💳 Rekening Transfer: {targetBank || 'Bank'} • {targetRek}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Nominal Kasbon (Rp)
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
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[50000, 100000, 200000, 300000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setNominalDisplay(formatNominal(amt))}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-[10px] font-bold border border-slate-200"
                >
                  {formatRupiah(amt)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Keperluan / Catatan Kasbon
            </label>
            <textarea
              rows={2}
              value={keperluan}
              onChange={(e) => setKeperluan(e.target.value)}
              placeholder="Contoh: Ambil bon mingguan / transfer DANA"
              required
              className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Sumber Pencairan Dana
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
                <span>Transfer Bank / DANA</span>
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
              {isSubmitting ? 'Menyimpan...' : 'Simpan Kasbon'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
