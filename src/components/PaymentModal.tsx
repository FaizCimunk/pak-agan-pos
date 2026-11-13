'use client';

import React, { useState, useRef } from 'react';
import { 
  X, 
  Banknote, 
  QrCode, 
  CheckCircle2, 
  Printer, 
  Building2
} from 'lucide-react';
import { PaymentMethod, Cabang } from '@/lib/types';
import { formatRupiah, formatNominal, parseNominal } from '@/lib/utils';

const NON_CASH_CHANNEL_INFO: Record<
  Exclude<PaymentMethod, 'tunai'>,
  { label: string; note: string; containerCls: string; badgeCls: string; amountCls: string }
> = {
  qris: {
    label: 'QRIS',
    note: 'Scan QRIS di meja kasir — otomatis masuk rekap QRIS',
    containerCls: 'bg-blue-50/80 border-blue-200 text-blue-950',
    badgeCls: 'bg-blue-700 text-white',
    amountCls: 'text-blue-950',
  },
  transfer: {
    label: 'Transfer Bank',
    note: 'Transfer rekening toko — otomatis masuk rekap Transfer',
    containerCls: 'bg-indigo-50/80 border-indigo-200 text-indigo-950',
    badgeCls: 'bg-indigo-700 text-white',
    amountCls: 'text-indigo-950',
  },
  shopeefood: {
    label: 'ShopeeFood / ShopeePay',
    note: 'Non-tunai Shopee — otomatis masuk rekap ShopeeFood',
    containerCls: 'bg-amber-50/80 border-amber-200 text-amber-950',
    badgeCls: 'bg-amber-600 text-white',
    amountCls: 'text-amber-950',
  },
  gofood: {
    label: 'GoFood / GoBiz',
    note: 'Non-tunai GoFood — otomatis masuk rekap GoFood',
    containerCls: 'bg-rose-50/80 border-rose-200 text-rose-950',
    badgeCls: 'bg-rose-600 text-white',
    amountCls: 'text-rose-950',
  },
  grabfood: {
    label: 'GrabFood',
    note: 'Non-tunai GrabFood — otomatis masuk rekap GrabFood',
    containerCls: 'bg-green-50/80 border-green-200 text-green-950',
    badgeCls: 'bg-green-700 text-white',
    amountCls: 'text-green-950',
  },
};

interface PaymentModalProps {
  total: number;
  cabang: Cabang;
  onClose: () => void;
  onSuccess: (method: PaymentMethod, bayar: number, kembali: number, autoPrint: boolean) => void;
}

export default function PaymentModal({
  total,
  cabang,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('tunai');
  const [bayarInput, setBayarInput] = useState<number>(total);
  const [autoPrint, setAutoPrint] = useState<boolean>(true);

  // Quick cash buttons
  const quickCashOptions = [
    { label: 'Uang Pas', value: total },
    { label: 'Rp 20.000', value: 20000 },
    { label: 'Rp 50.000', value: 50000 },
    { label: 'Rp 100.000', value: 100000 },
    { label: 'Rp 200.000', value: 200000 },
  ].filter(opt => opt.value >= total || opt.label === 'Uang Pas');

  const bayar = method === 'tunai' ? bayarInput : total;
  const kembali = Math.max(0, bayar - total);
  const isKurang = method === 'tunai' && bayar < total;
  const isSubmittingRef = useRef<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSelectQuickCash = (val: number) => {
    setBayarInput(val);
  };

  const handleConfirm = () => {
    if (isKurang || isSubmittingRef.current || submitting) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    onSuccess(method, bayar, kembali, autoPrint);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full h-full sm:h-auto max-h-[98vh] shadow-2xl border border-slate-100 overflow-hidden flex flex-col min-h-0">
        
        {/* Modal Header */}
        <div className="px-4 py-2 sm:px-5 sm:py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Pembayaran Kasir</span>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">Pilih Metode Pembayaran</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Total Tagihan Card */}
        <div className="px-4 py-2 sm:px-5 sm:py-2.5 bg-brand-subtle/60 border-b border-brand-light/50 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[11px] text-brand-dark font-medium">Total Tagihan Pesanan:</span>
            <div className="text-xl sm:text-2xl font-mono font-extrabold text-brand-dark tabular-nums tracking-tight">
              {formatRupiah(total)}
            </div>
          </div>
          <div className="px-2.5 py-0.5 rounded-full bg-white text-brand-dark border border-brand-light text-xs font-bold">
            {cabang.nama.split('-')[1]?.trim() || cabang.nama}
          </div>
        </div>

        {/* 5 Metode Utama: Tunai, QRIS, ShopeeFood, GoFood, GrabFood */}
        <div className="px-4 pt-2.5 sm:px-5 shrink-0">
          <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
            Pilih Channel / Posisi Uang Masuk:
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            
            {/* 1. TUNAI */}
            <button
              type="button"
              onClick={() => { setMethod('tunai'); setBayarInput(total); }}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl border text-center transition-all cursor-pointer ${
                method === 'tunai'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm ring-2 ring-emerald-500/20'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Banknote className="w-5 h-5 text-emerald-600 mb-1" />
              <span className="text-xs font-black">Tunai</span>
              <span className="text-[9px] text-slate-400">Kas Laci</span>
            </button>

            {/* 2. QRIS */}
            <button
              type="button"
              onClick={() => { setMethod('qris'); setBayarInput(total); }}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl border text-center transition-all cursor-pointer ${
                method === 'qris'
                  ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm ring-2 ring-blue-500/20'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <QrCode className="w-5 h-5 text-blue-600 mb-1" />
              <span className="text-xs font-black">QRIS</span>
              <span className="text-[9px] text-slate-400">Scan QR</span>
            </button>

            {/* 3. TRANSFER BANK */}
            <button
              type="button"
              onClick={() => { setMethod('transfer'); setBayarInput(total); }}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl border text-center transition-all cursor-pointer ${
                method === 'transfer'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-sm ring-2 ring-indigo-500/20'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-5 h-5 text-indigo-600 mb-1" />
              <span className="text-xs font-black">Transfer</span>
              <span className="text-[9px] text-slate-400">Rek Pusat</span>
            </button>

            {/* 4. SHOPEEFOOD / SHOPEEPAY */}
            <button
              type="button"
              onClick={() => { setMethod('shopeefood'); setBayarInput(total); }}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl border text-center transition-all cursor-pointer ${
                method === 'shopeefood'
                  ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-sm ring-2 ring-amber-500/20'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black mb-1">
                S
              </div>
              <span className="text-xs font-black">Shopee</span>
              <span className="text-[9px] text-slate-400">ShopeePay</span>
            </button>

            {/* 5. GOFOOD / GOPAY */}
            <button
              type="button"
              onClick={() => { setMethod('gofood'); setBayarInput(total); }}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl border text-center transition-all cursor-pointer ${
                method === 'gofood'
                  ? 'bg-rose-50 border-rose-500 text-rose-950 shadow-sm ring-2 ring-rose-500/20'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-black mb-1">
                G
              </div>
              <span className="text-xs font-black">GoFood</span>
              <span className="text-[9px] text-slate-400">GoPay</span>
            </button>

            {/* 6. GRABFOOD / OVO */}
            <button
              type="button"
              onClick={() => { setMethod('grabfood'); setBayarInput(total); }}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl border text-center transition-all cursor-pointer ${
                method === 'grabfood'
                  ? 'bg-green-50 border-green-500 text-green-950 shadow-sm ring-2 ring-green-500/20'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-[10px] font-black mb-1">
                G
              </div>
              <span className="text-xs font-black">GrabFood</span>
              <span className="text-[9px] text-slate-400">Merchant</span>
            </button>

          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 min-h-0 space-y-3 text-xs">
          
          {/* TAB 1: TUNAI */}
          {method === 'tunai' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nominal Uang Fisik Diterima dari Pelanggan
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-sm">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={bayarInput === 0 ? '' : formatNominal(bayarInput)}
                    onChange={(e) => setBayarInput(parseNominal(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirm();
                      }
                    }}
                    placeholder="0"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                  Pilihan Cepat Uang Pas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickCashOptions.map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleSelectQuickCash(opt.value)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${
                        bayarInput === opt.value
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Change/Short Notice */}
              <div className={`p-3 rounded-xl border font-mono ${
                isKurang
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : kembali === 0
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">
                    {isKurang ? 'Uang Masih Kurang:' : kembali === 0 ? 'Uang Pas Diterima' : 'Kembalian Pelanggan:'}
                  </span>
                  <span className="text-base font-extrabold tabular-nums">
                    {isKurang ? formatRupiah(total - bayarInput) : formatRupiah(kembali)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* NON-TUNAI (QRIS / Transfer / ShopeeFood / GoFood / GrabFood) - Ringkas & Nominal Jelas */}
          {method !== 'tunai' && (() => {
            const info = NON_CASH_CHANNEL_INFO[method];
            return (
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${info.containerCls}`}>
                <div className="space-y-1 min-w-0">
                  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${info.badgeCls}`}>
                    {info.label}
                  </span>
                  <p className="text-[11px] font-semibold leading-snug opacity-85">
                    {info.note}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold uppercase opacity-70 block">Nominal Pas</span>
                  <span className={`text-xl font-mono font-black tabular-nums ${info.amountCls}`}>
                    {formatRupiah(total)}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Print Checkbox */}
          <div className="pt-2 flex items-center space-x-2 border-t border-slate-100">
            <input
              type="checkbox"
              id="auto-print"
              checked={autoPrint}
              onChange={(e) => setAutoPrint(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="auto-print" className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5 cursor-pointer">
              <Printer className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cetak Struk Thermal 58mm Kasir</span>
            </label>
          </div>

        </div>

        {/* Modal Actions */}
        <div className="px-4 py-2 sm:px-5 sm:py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>

          <button
            onClick={handleConfirm}
            disabled={isKurang || submitting}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center space-x-1.5 transition-all btn-tactile ${
              isKurang || submitting
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Memproses Transaksi...' : 'Selesaikan & Cetak'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
