'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  X, 
  Banknote, 
  QrCode, 
  CheckCircle2, 
  Printer, 
  ShieldCheck,
  Smartphone,
  Bike
} from 'lucide-react';
import { PaymentMethod, Cabang } from '@/lib/types';
import { formatRupiah, formatNominal, parseNominal } from '@/lib/utils';

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

  const handleSelectQuickCash = (val: number) => {
    setBayarInput(val);
  };

  const handleConfirm = () => {
    if (isKurang) return;
    onSuccess(method, bayar, kembali, autoPrint);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Pembayaran Kasir</span>
            <h3 className="text-base font-extrabold text-slate-900">Pilih Metode Pembayaran</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Total Tagihan Card */}
        <div className="px-5 py-3.5 bg-brand-subtle/60 border-b border-brand-light/50 flex items-center justify-between">
          <div>
            <span className="text-xs text-brand-dark font-medium">Total Tagihan Pesanan:</span>
            <div className="text-2xl font-mono font-extrabold text-brand-dark tabular-nums tracking-tight">
              {formatRupiah(total)}
            </div>
          </div>
          <div className="px-3 py-1 rounded-full bg-white text-brand-dark border border-brand-light text-xs font-bold">
            {cabang.nama.split('-')[1]?.trim() || cabang.nama}
          </div>
        </div>

        {/* 4 Metode Utama: Tunai, ShopeeFood, GoFood, GrabFood (+ QRIS) */}
        <div className="px-5 pt-3">
          <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider">
            Pilih Channel / Posisi Uang Masuk:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            
            {/* 1. TUNAI */}
            <button
              type="button"
              onClick={() => { setMethod('tunai'); setBayarInput(total); }}
              className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all ${
                method === 'tunai'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm ring-2 ring-emerald-500/20'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Banknote className="w-5 h-5 text-emerald-600 mb-1" />
              <span className="text-xs font-black">Tunai</span>
              <span className="text-[9px] text-slate-400">Kas Laci Meja</span>
            </button>

            {/* 2. SHOPEEFOOD / SHOPEEPAY */}
            <button
              type="button"
              onClick={() => { setMethod('shopeefood'); setBayarInput(total); }}
              className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all ${
                method === 'shopeefood'
                  ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-sm ring-2 ring-amber-500/20'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black mb-1">
                S
              </div>
              <span className="text-xs font-black">ShopeeFood</span>
              <span className="text-[9px] text-slate-400">ShopeePay</span>
            </button>

            {/* 3. GOFOOD / GOPAY */}
            <button
              type="button"
              onClick={() => { setMethod('gofood'); setBayarInput(total); }}
              className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all ${
                method === 'gofood'
                  ? 'bg-rose-50 border-rose-500 text-rose-950 shadow-sm ring-2 ring-rose-500/20'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-black mb-1">
                G
              </div>
              <span className="text-xs font-black">GoFood</span>
              <span className="text-[9px] text-slate-400">GoBiz / GoPay</span>
            </button>

            {/* 4. GRABFOOD / OVO */}
            <button
              type="button"
              onClick={() => { setMethod('grabfood'); setBayarInput(total); }}
              className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all ${
                method === 'grabfood'
                  ? 'bg-green-50 border-green-500 text-green-950 shadow-sm ring-2 ring-green-500/20'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-[10px] font-black mb-1">
                G
              </div>
              <span className="text-xs font-black">GrabFood</span>
              <span className="text-[9px] text-slate-400">GrabMerchant</span>
            </button>

          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3 text-xs">
          
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

          {/* TAB 2: SHOPEEFOOD / SHOPEEPAY */}
          {method === 'shopeefood' && (
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-950 space-y-2 text-center">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-lg font-black mx-auto shadow-sm">
                S
              </div>
              <h4 className="font-extrabold text-sm">Pesanan Masuk via ShopeeFood / ShopeePay</h4>
              <p className="text-[11px] text-amber-800 leading-snug">
                Pembayaran otomatis lunas melalui saldo merchant Shopee. Kasir tidak memegang uang fisik. Pendapatan ini otomatis tercatat di rekap <strong>ShopeePay</strong> di dashboard Boss.
              </p>
              <div className="font-mono font-black text-base text-amber-900 pt-1">
                Total Tagihan: {formatRupiah(total)}
              </div>
            </div>
          )}

          {/* TAB 3: GOFOOD / GOBIZ */}
          {method === 'gofood' && (
            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 text-rose-950 space-y-2 text-center">
              <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center text-lg font-black mx-auto shadow-sm">
                G
              </div>
              <h4 className="font-extrabold text-sm">Pesanan Masuk via GoFood / GoBiz</h4>
              <p className="text-[11px] text-rose-800 leading-snug">
                Pembayaran otomatis lunas melalui saldo GoBiz / GoPay. Kasir tidak memegang uang fisik. Pendapatan ini otomatis tercatat di rekap <strong>GoFood / GoPay</strong> di dashboard Boss.
              </p>
              <div className="font-mono font-black text-base text-rose-900 pt-1">
                Total Tagihan: {formatRupiah(total)}
              </div>
            </div>
          )}

          {/* TAB 4: GRABFOOD / GRABMERCHANT */}
          {method === 'grabfood' && (
            <div className="p-4 rounded-2xl bg-green-50/70 border border-green-200 text-green-950 space-y-2 text-center">
              <div className="w-10 h-10 rounded-2xl bg-green-600 text-white flex items-center justify-center text-lg font-black mx-auto shadow-sm">
                G
              </div>
              <h4 className="font-extrabold text-sm">Pesanan Masuk via GrabFood / GrabMerchant</h4>
              <p className="text-[11px] text-green-800 leading-snug">
                Pembayaran otomatis lunas melalui saldo GrabMerchant / OVO. Kasir tidak memegang uang fisik. Pendapatan ini otomatis tercatat di rekap <strong>GrabFood</strong> di dashboard Boss.
              </p>
              <div className="font-mono font-black text-base text-green-900 pt-1">
                Total Tagihan: {formatRupiah(total)}
              </div>
            </div>
          )}

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
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>

          <button
            onClick={handleConfirm}
            disabled={isKurang}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center space-x-1.5 transition-all btn-tactile ${
              isKurang
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Selesaikan &amp; Cetak</span>
          </button>
        </div>

      </div>
    </div>
  );
}
