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
import { Shift, Cabang, PengeluaranKasbon, Transaksi } from '@/lib/types';
import { db } from '@/lib/db';
import { printerService } from '@/lib/printer';
import { formatRupiah, formatNominal, parseNominal } from '@/lib/utils';

interface ShiftCloseModalProps {
  shift: Shift;
  cabang: Cabang;
  onClose: () => void;
  onSuccess: (closedShift: Shift) => void;
  onShiftBalanceUpdated?: (refreshedShift: Shift) => void;
}

export default function ShiftCloseModal({
  shift,
  cabang,
  onClose,
  onSuccess,
  onShiftBalanceUpdated,
}: ShiftCloseModalProps) {
  const [calculatedShift, setCalculatedShift] = useState<Shift>(shift);
  const [saldoFisik, setSaldoFisik] = useState<number>(shift.saldo_akhir_sistem);
  const [catatan, setCatatan] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showDenomHelper, setShowDenomHelper] = useState<boolean>(false);
  const [pendingList, setPendingList] = useState<PengeluaranKasbon[]>([]);
  const [unpaidBills, setUnpaidBills] = useState<Transaksi[]>([]);
  const [writeOffUnpaidBills, setWriteOffUnpaidBills] = useState<boolean>(false);

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

  // Calculate real-time shift numbers on mount (instan dari cache lokal + segarkan dari cloud)
  useEffect(() => {
    let cancelled = false;
    async function loadNumbers() {
      // 1. Hydrate segera data lokal agar daftar "Bayar Nanti" & "Menunggu ACC" langsung terlihat tanpa tunggu jaringan
      try {
        const cachedExp = db.getPengeluaranListCached(cabang.id);
        setPendingList(cachedExp.filter(e => e.status === 'pending'));
        const localBills = await db.getOpenBills(cabang.id);
        if (!cancelled) setUnpaidBills(localBills);
      } catch (e) {
        console.warn('Pre-load open bills/pending warning:', e);
      }

      // 2. Segarkan perhitungan kas sistem + daftar pengajuan pending terbaru dari Supabase
      try {
        const [allExp, openBillsList] = await Promise.all([
          db.getPengeluaranList(cabang.id),
          db.getOpenBills(cabang.id),
        ]);
        if (cancelled) return;
        setPendingList(allExp.filter(e => e.status === 'pending'));
        setUnpaidBills(openBillsList);

        const refreshed = await db.calculateShiftBalance(shift, { expenses: allExp });
        if (cancelled) return;
        setCalculatedShift(refreshed);
        setSaldoFisik(refreshed.saldo_akhir_sistem);
        onShiftBalanceUpdated?.(refreshed);
      } catch (err) {
        console.warn('Failed loading shift closing numbers:', err);
      }
    }
    loadNumbers();
    return () => {
      cancelled = true;
    };
  }, [shift.id, cabang.id]);

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
      const closed = await db.closeShift(cabang.id, saldoFisik, catatan, {
        writeOffOpenBills: writeOffUnpaidBills,
        unpaidBills,
      });
      if (closed) {
        // Try Bluetooth ESC/POS printing (best-effort)
        try {
          const bytes = printerService.buildShiftCloseCommands(closed, cabang);
          await printerService.printRaw(bytes);
        } catch (printErr) {
          console.warn('Bluetooth shift print skipped:', printErr);
        }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full h-full sm:h-auto max-h-[98vh] shadow-2xl border border-slate-100 overflow-hidden flex flex-col min-h-0">
        
        {/* Header - Compact for Landscape */}
        <div className="px-4 py-2 sm:px-5 sm:py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Tutup Shift &amp; Rekap Kas</span>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">End of Day Laci Kasir</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body (min-h-0 guarantees smooth scrolling and no cutoff) */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 min-h-0 space-y-2.5">
          
          {/* PJ & Cabang Meta */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 block font-medium text-[10px]">PJ Shift:</span>
              <span className="font-extrabold text-slate-800">{calculatedShift.karyawan_nama}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block font-medium text-[10px]">Cabang:</span>
              <span className="font-bold text-slate-800">{cabang.nama.split('-')[1]?.trim() || cabang.nama}</span>
            </div>
          </div>

          {/* Fintech Breakdown Card */}
          <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-soft-sm space-y-1.5">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
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
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 font-extrabold text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Ada {pendingList.length} Pengajuan Menunggu ACC Owner</span>
                </div>
                <span className="font-mono font-black text-amber-950 bg-amber-200/80 px-2 py-0.5 rounded-md text-[11px] shrink-0">
                  {formatRupiah(pendingList.reduce((s, e) => s + Number(e.nominal || 0), 0))}
                </span>
              </div>
              <div className="bg-white/80 rounded-xl border border-amber-200 p-2 space-y-1 max-h-24 overflow-y-auto">
                {pendingList.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-800 truncate pr-2">
                      • [{exp.jenis === 'kasbon' ? 'Kasbon' : 'Belanja'}] {exp.keperluan || exp.pemohon_nama}
                    </span>
                    <span className="font-mono font-bold text-amber-800 shrink-0">{formatRupiah(exp.nominal)}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Sesuai SOP, pengajuan yang belum di-ACC Admin Pusat <b>TIDAK memotong saldo laci saat tutup shift ini</b>. Jika Admin Pusat telat membuka Peninjauan dan meng-ACC di hari berikutnya, nominal tetap otomatis tercatat ke <b>tanggal pengajuan &amp; shift hari ini</b>.
              </p>
            </div>
          )}

          {/* Unpaid Open Bills Alert Banner (Pelanggan Belum/Lupa Bayar -> Potensi Kerugian) */}
          {unpaidBills.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 text-xs space-y-2 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 font-extrabold text-rose-950">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{unpaidBills.length} Tagihan Belum Dibayar (Bayar Nanti)</span>
                </div>
                <span className="font-mono font-black text-rose-950 bg-rose-200/80 px-2 py-0.5 rounded-md text-[11px] shrink-0">
                  Potensi Rugi {formatRupiah(unpaidBills.reduce((s, b) => s + Number(b.total || 0), 0))}
                </span>
              </div>

              <div className="bg-white/80 rounded-xl border border-rose-200 p-2 space-y-1 max-h-24 overflow-y-auto">
                {unpaidBills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-800 truncate pr-2">
                      • {bill.penanda || bill.meja || bill.nama_pelanggan} ({bill.items.reduce((s, i) => s + i.qty, 0)} item)
                    </span>
                    <span className="font-mono font-bold text-rose-700 shrink-0">{formatRupiah(bill.total)}</span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] leading-relaxed text-rose-900">
                Tagihan ini belum dibayar sehingga <b>tidak masuk hitungan kas sistem</b>. Keterangan &amp; nominalnya otomatis dilampirkan ke rekap tutup shift sebagai audit kerugian / piutang.
              </p>

              <label className="flex items-start space-x-2 p-2 rounded-xl bg-white border border-rose-200 cursor-pointer hover:bg-rose-50/50 transition">
                <input
                  type="checkbox"
                  checked={writeOffUnpaidBills}
                  onChange={(e) => setWriteOffUnpaidBills(e.target.checked)}
                  className="mt-0.5 rounded border-rose-400 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-[11px] font-bold text-slate-800 leading-snug">
                  Tandai sebagai Kerugian Tutup Buku (bersihkan daftar &quot;Bayar Nanti&quot; karena pelanggan lupa / tidak jadi bayar)
                </span>
              </label>
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

          {/* Ringkasan Peringatan Cepat di Bagian Bawah agar Kasir Tidak Terlewat Saat Scroll */}
          {(pendingList.length > 0 || unpaidBills.length > 0) && (
            <div className="p-2.5 rounded-xl bg-slate-900 text-white text-[11px] flex flex-wrap items-center justify-between gap-2">
              {pendingList.length > 0 && (
                <span className="inline-flex items-center gap-1 font-bold text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {pendingList.length} Pengajuan Menunggu ACC ({formatRupiah(pendingList.reduce((s, e) => s + Number(e.nominal || 0), 0))})
                </span>
              )}
              {unpaidBills.length > 0 && (
                <span className="inline-flex items-center gap-1 font-bold text-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {unpaidBills.length} Bayar Nanti Belum Lunas ({formatRupiah(unpaidBills.reduce((s, b) => s + Number(b.total || 0), 0))})
                </span>
              )}
            </div>
          )}

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
        <div className="px-4 py-2 sm:px-6 sm:py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end space-x-3 shrink-0">
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
