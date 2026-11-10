'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Calculator, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Receipt,
  Coins,
  DollarSign
} from 'lucide-react';
import { Shift, Cabang, PengeluaranKasbon } from '@/lib/types';
import { db } from '@/lib/db';
import { printerService } from '@/lib/printer';
import { formatRupiah, formatNominal, parseNominal } from '@/lib/utils';

interface ShiftCloseModalProps {
  shift: Shift;
  cabang: Cabang;
  onClose: () => void;
  onSuccess: (closedShift: Shift) => void;
}

export default function ShiftCloseModal({
  shift,
  cabang,
  onClose,
  onSuccess,
}: ShiftCloseModalProps) {
  const [calculatedShift, setCalculatedShift] = useState<Shift>(shift);
  const [saldoFisik, setSaldoFisik] = useState<number>(0);
  const [catatan, setCatatan] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showDenomHelper, setShowDenomHelper] = useState<boolean>(false);
  const [pendingList, setPendingList] = useState<PengeluaranKasbon[]>([]);

  // Denominations counter
  const [counts, setCounts] = useState<{ [key: number]: number }>({
    100000: 0,
    50000: 0,
    20000: 0,
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
    500: 0,
  });

  // Calculate real-time shift numbers on mount
  useEffect(() => {
    async function loadNumbers() {
      const refreshed = await db.calculateShiftBalance(shift);
      setCalculatedShift(refreshed);
      // Pre-fill physical with system balance for easy counting
      setSaldoFisik(refreshed.saldo_akhir_sistem);

      try {
        const allExp = await db.getPengeluaranList(cabang.id);
        const pending = allExp.filter(e => e.status === 'pending');
        setPendingList(pending);
      } catch (err) {
        console.warn('Failed loading pending expenses:', err);
      }
    }
    loadNumbers();
  }, [shift, cabang.id]);

  const handleDenomChange = (denom: number, count: number) => {
    const nextCounts = { ...counts, [denom]: Math.max(0, count) };
    setCounts(nextCounts);
    const sum = Object.entries(nextCounts).reduce((acc, [d, c]) => acc + (Number(d) * c), 0);
    setSaldoFisik(sum);
  };

  const selisih = saldoFisik - calculatedShift.saldo_akhir_sistem;
  const isSubmittingRef = useRef<boolean>(false);

  const handleCloseShift = async () => {
    if (isSubmittingRef.current || loading) return;
    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const closed = await db.closeShift(cabang.id, saldoFisik, catatan);
      if (closed) {
        // Try Bluetooth ESC/POS printing
        const bytes = printerService.buildShiftCloseCommands(closed, cabang);
        await printerService.printRaw(bytes);

        onSuccess(closed);
      }
    } catch (e: any) {
      alert('Gagal menutup shift: ' + e.message);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Tutup Shift & Rekap Kas</span>
            <h3 className="text-base font-extrabold text-slate-900">End of Day Laci Kasir</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          {/* PJ & Cabang Meta */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">PJ Shift:</span>
              <span className="font-extrabold text-slate-800">{calculatedShift.karyawan_nama}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block font-medium">Cabang:</span>
              <span className="font-bold text-slate-800">{cabang.nama.split('-')[1]?.trim() || cabang.nama}</span>
            </div>
          </div>

          {/* Fintech Breakdown Card */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-soft-sm space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Mutasi Kas Laci (Bank-Grade Balance)
            </h4>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>(+) Modal Awal Laci:</span>
              <span className="font-mono font-semibold tabular-nums">{formatRupiah(calculatedShift.modal_awal)}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
              <span>(+) Penjualan Tunai Masuk:</span>
              <span className="font-mono font-bold tabular-nums">+{formatRupiah(calculatedShift.total_tunai_masuk)}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-rose-600">
              <span>(-) Belanja Toko (Approved Laci):</span>
              <span className="font-mono font-semibold tabular-nums">-{formatRupiah(calculatedShift.total_belanja_approved)}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-rose-600">
              <span>(-) Kasbon Staf (Approved Laci):</span>
              <span className="font-mono font-semibold tabular-nums">-{formatRupiah(calculatedShift.total_kasbon_approved)}</span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-slate-900">
              <span className="text-xs">SALDO FISIK KASIR WAJIB ADA:</span>
              <span className="text-lg font-mono font-extrabold text-brand-dark tabular-nums">
                {formatRupiah(calculatedShift.saldo_akhir_sistem)}
              </span>
            </div>
          </div>

          {/* Pending Expense Alert Banner (Belanja Toko & Kasbon Belum Di-Approve) */}
          {pendingList.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 font-extrabold text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Ada {pendingList.length} Pengajuan Berstatus Menunggu (Pending)</span>
                </div>
                <span className="font-mono font-black text-amber-950 bg-amber-200/80 px-2 py-0.5 rounded-md text-[11px]">
                  {formatRupiah(pendingList.reduce((s, e) => s + Number(e.nominal || 0), 0))}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Sesuai SOP, pengajuan belanja toko / kasbon yang <b>belum di-approve Admin Pusat</b> di Peninjauan Dashboard Utama <b>TIDAK memotong saldo laci kasir</b> saat ini. Begitu di-approve, nominal akan otomatis terpotong resmi.
              </p>
            </div>
          )}

          {/* Bank / QRIS Digital Inflow Summary */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-bold text-blue-900 border-b border-blue-200 pb-1">
              <span>🏦 Uang Masuk ke Rekening Bank (Owner):</span>
              <span className="font-mono font-black">
                {formatRupiah((calculatedShift.total_qris_masuk || 0) + (calculatedShift.total_transfer_masuk || 0))}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 text-[11px]">
              <span>• QRIS Merchant Masuk:</span>
              <span className="font-mono font-semibold">+{formatRupiah(calculatedShift.total_qris_masuk || 0)}</span>
            </div>
            <div className="flex justify-between text-slate-600 text-[11px]">
              <span>• Transfer Bank Masuk:</span>
              <span className="font-mono font-semibold">+{formatRupiah(calculatedShift.total_transfer_masuk || 0)}</span>
            </div>
          </div>

          {/* Online Delivery Merchant Summary (ShopeeFood, GoFood, GrabFood) */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-bold text-amber-950 border-b border-amber-200 pb-1">
              <span>🛵 Saldo Merchant Online (Ojol / App):</span>
              <span className="font-mono font-black">
                {formatRupiah(
                  (calculatedShift.total_shopeefood_masuk || 0) +
                    (calculatedShift.total_gofood_masuk || 0) +
                    (calculatedShift.total_grabfood_masuk || 0)
                )}
              </span>
            </div>
            <div className="flex justify-between text-slate-700 text-[11px]">
              <span>• ShopeeFood / ShopeePay:</span>
              <span className="font-mono font-semibold">+{formatRupiah(calculatedShift.total_shopeefood_masuk || 0)}</span>
            </div>
            <div className="flex justify-between text-slate-700 text-[11px]">
              <span>• GoFood (GoBiz / GoPay):</span>
              <span className="font-mono font-semibold">+{formatRupiah(calculatedShift.total_gofood_masuk || 0)}</span>
            </div>
            <div className="flex justify-between text-slate-700 text-[11px]">
              <span>• GrabFood (GrabMerchant):</span>
              <span className="font-mono font-semibold">+{formatRupiah(calculatedShift.total_grabfood_masuk || 0)}</span>
            </div>
          </div>

          {/* Total Omzet Shift Ini */}
          <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-900 text-white flex items-center justify-between text-xs shadow-soft-sm">
            <div>
              <span className="font-extrabold block">Total Omzet Penjualan Shift Ini</span>
              <span className="text-[10px] text-emerald-200">
                Tunai + QRIS/Transfer + Shopee/Go/Grab ({calculatedShift.total_transaksi_shift || 0} struk lunas)
              </span>
            </div>
            <span className="font-mono font-black text-base tabular-nums">
              {formatRupiah(
                (calculatedShift.total_tunai_masuk || 0) +
                  (calculatedShift.total_qris_masuk || 0) +
                  (calculatedShift.total_transfer_masuk || 0) +
                  (calculatedShift.total_shopeefood_masuk || 0) +
                  (calculatedShift.total_gofood_masuk || 0) +
                  (calculatedShift.total_grabfood_masuk || 0)
              )}
            </span>
          </div>

          {/* Physical Cash Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Coins className="w-4 h-4 text-accent-gold" />
                <span>Uang Fisik di Laci Kasir</span>
              </label>
              <button
                type="button"
                onClick={() => setShowDenomHelper(!showDenomHelper)}
                className="text-xs text-brand-primary hover:underline font-bold"
              >
                {showDenomHelper ? 'Sembunyikan Rincian Lembar' : 'Kalkulator Lembaran Uang'}
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-sm">
                Rp
              </span>
              <input
                type="text"
                value={saldoFisik === 0 ? '' : formatNominal(saldoFisik)}
                onChange={(e) => setSaldoFisik(parseNominal(e.target.value))}
                placeholder="0"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 font-mono font-bold text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              />
            </div>

            {/* Denomination Helper Grid */}
            {showDenomHelper && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[100000, 50000, 20000, 10000, 5000, 2000, 1000, 500].map((denom) => (
                  <div key={denom} className="flex flex-col bg-white p-1.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-mono text-slate-400 font-bold">{formatRupiah(denom)}</span>
                    <input
                      type="number"
                      min={0}
                      value={counts[denom] || 0}
                      onChange={(e) => handleDenomChange(denom, Number(e.target.value) || 0)}
                      placeholder="0 lembar"
                      className="mt-1 px-1.5 py-1 text-center font-mono font-bold text-xs border rounded focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selisih Indicator */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
            selisih === 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : selisih > 0
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center space-x-2">
              {selisih === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              <span>
                {selisih === 0 ? 'Status Kas: Tepat / Pas' : selisih > 0 ? 'Surplus / Lebih Uang:' : 'Tekor / Kurang Uang:'}
              </span>
            </div>
            <span className="font-mono text-sm font-extrabold tabular-nums">
              {selisih === 0 ? 'Rp 0' : selisih > 0 ? `+${formatRupiah(selisih)}` : `-${formatRupiah(Math.abs(selisih))}`}
            </span>
          </div>

          {/* Catatan Shift */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Catatan Penutupan Shift (Opsional)
            </label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Titip uang kasbon di laci..."
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-primary"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/80 transition-colors"
          >
            Batal
          </button>

          <button
            onClick={handleCloseShift}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-extrabold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all btn-tactile flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>{loading ? 'Menutup Shift...' : 'Cetak Rekap & Tutup Shift'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
