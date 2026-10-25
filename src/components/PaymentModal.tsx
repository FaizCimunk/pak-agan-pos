'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  X, 
  Banknote, 
  QrCode, 
  CreditCard, 
  CheckCircle2, 
  Printer, 
  ArrowRight,
  ShieldCheck,
  AlertCircle
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Pembayaran Kasir</span>
            <h3 className="text-base font-extrabold text-slate-900">Pilih Metode & Selesaikan</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Total Tagihan Card */}
        <div className="px-6 py-4 bg-brand-subtle/60 border-b border-brand-light/50 flex items-center justify-between">
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

        {/* Payment Method Tabs */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => { setMethod('tunai'); setBayarInput(total); }}
              className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-lg text-xs font-bold transition-all btn-tactile ${
                method === 'tunai'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>Tunai</span>
            </button>

            <button
              onClick={() => { setMethod('qris'); setBayarInput(total); }}
              className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-lg text-xs font-bold transition-all btn-tactile ${
                method === 'qris'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-4 h-4 text-accent-gold" />
              <span>QRIS Statis</span>
            </button>

            <button
              onClick={() => { setMethod('transfer'); setBayarInput(total); }}
              className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-lg text-xs font-bold transition-all btn-tactile ${
                method === 'transfer'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>Transfer</span>
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: TUNAI */}
          {method === 'tunai' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Nominal Uang Diterima dari Pelanggan
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
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 font-mono font-bold text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap gap-2">
                {quickCashOptions.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectQuickCash(opt.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-mono font-bold border transition-all btn-tactile ${
                      bayarInput === opt.value
                        ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Kembalian Box */}
              <div className={`p-4 rounded-2xl border transition-all ${
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
                  <span className="text-lg font-mono font-extrabold tabular-nums">
                    {isKurang ? formatRupiah(total - bayarInput) : formatRupiah(kembali)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: QRIS STATIS */}
          {method === 'qris' && (
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-md">
                <Image
                  src={cabang.qris_image_url || 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=00020101021226610014ID.LINKAJA.WWW01189360091100000000005204581253033605802ID5927MINUMAN+HERBAL+PAK+AGAN'}
                  alt="QRIS Minuman Herbal Pak Agan"
                  width={220}
                  height={220}
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-800 text-sm">
                  {cabang.qris_merchant_name}
                </h4>
                <div className="text-xl font-mono font-extrabold text-brand-dark tabular-nums">
                  {formatRupiah(total)}
                </div>
                <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                  Minta pembeli scan barcode di atas melalui aplikasi BCA, Livin, GoPay, OVO, atau ShopeePay. Kasir wajib memeriksa notifikasi sukses di layar HP pembeli.
                </p>
              </div>

              <div className="w-full p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center justify-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-accent-gold" />
                <span>QRIS Statis Toko Resmi (Bebas Biaya MDR)</span>
              </div>
            </div>
          )}

          {/* TAB 3: TRANSFER BANK */}
          {method === 'transfer' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-blue-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase">Rekening Resmi Pak Agan</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-200 text-blue-800">BCA</span>
                </div>
                <div className="font-mono font-bold text-lg text-slate-900">
                  8830-1928-3011
                </div>
                <div className="text-xs text-slate-600">
                  a.n. <strong className="text-slate-900">AGAN HERBAL NUSANTARA</strong>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Pilihan transfer bank ini biasanya digunakan untuk pesanan dalam jumlah besar, katering, atau rombongan kantor.
              </p>
            </div>
          )}

          {/* Print Checkbox */}
          <div className="pt-2 flex items-center space-x-2.5">
            <input
              type="checkbox"
              id="auto-print"
              checked={autoPrint}
              onChange={(e) => setAutoPrint(e.target.checked)}
              className="w-4 h-4 text-brand-primary rounded border-slate-300 focus:ring-brand-primary cursor-pointer"
            />
            <label htmlFor="auto-print" className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5 cursor-pointer">
              <Printer className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cetak Struk Otomatis ke Printer Kasir</span>
            </label>
          </div>

        </div>

        {/* Modal Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/80 transition-colors"
          >
            Batal
          </button>

          <button
            onClick={handleConfirm}
            disabled={isKurang}
            className={`px-6 py-2.5 rounded-xl font-extrabold text-xs flex items-center space-x-2 transition-all btn-tactile ${
              isKurang
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-900/20 active:scale-95'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Selesaikan &amp; Cetak Struk</span>
          </button>
        </div>

      </div>
    </div>
  );
}
