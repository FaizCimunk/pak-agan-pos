'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Printer, ArrowRight, MessageCircle, ChevronDown, ChevronUp, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Transaksi, Cabang } from '@/lib/types';
import { printerService } from '@/lib/printer';
import { formatRupiah, formatWaktu } from '@/lib/utils';

interface ReceiptModalProps {
  transaksi: Transaksi;
  cabang: Cabang;
  onClose: () => void;
}

export default function ReceiptModal({
  transaksi,
  cabang,
  onClose,
}: ReceiptModalProps) {
  const [printed, setPrinted] = useState(false);
  const [isBluetoothReady, setIsBluetoothReady] = useState(false);
  const [showReceiptDetail, setShowReceiptDetail] = useState(false);
  const [showWaInput, setShowWaInput] = useState(false);
  const [waPhone, setWaPhone] = useState('');
  const hasAutoPrintedRef = useRef(false);

  // Auto-Print: Tepat 1x cetak saat transaksi selesai (mencegah cetak berulang/bergulir terus)
  useEffect(() => {
    if (hasAutoPrintedRef.current) return;
    hasAutoPrintedRef.current = true;

    const directThermalPrint = async () => {
      try {
        const bytes = printerService.buildReceiptCommands(transaksi, cabang);
        const success = await printerService.printRaw(bytes);
        if (success) {
          setPrinted(true);
          setIsBluetoothReady(true);
        } else {
          setIsBluetoothReady(false);
        }
      } catch (err) {
        console.warn('Direct thermal print check:', err);
        setIsBluetoothReady(false);
      }
    };

    directThermalPrint();
  }, []);

  // Keyboard shortcut: Tekan Enter untuk lanjut ke pesanan berikutnya
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !showWaInput) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showWaInput]);

  const handlePrintManual = async () => {
    try {
      const bytes = printerService.buildReceiptCommands(transaksi, cabang);
      const success = await printerService.printRaw(bytes);
      if (success) {
        setPrinted(true);
        setIsBluetoothReady(true);
      } else {
        // Trigger 58mm browser print
        window.print();
        setPrinted(true);
      }
    } catch (err) {
      console.warn('Print failed:', err);
      window.print();
    }
  };

  const handleSendWhatsApp = () => {
    if (!waPhone.trim()) return;
    const cleanPhone = waPhone.replace(/[^0-9]/g, '').replace(/^0/, '62');
    const itemsList = transaksi.items.map(it => `• ${it.nama_menu} (${it.qty}x) = ${formatRupiah(it.subtotal)}`).join('\n');
    
    const msg = [
      `*STRUK PEMBAYARAN RESMI - SERABI BAWEL & WEDANG GEPREK*`,
      `-----------------------------------------`,
      `🏢 *Outlet:* ${cabang.nama}`,
      `🧾 *No. Struk:* ${transaksi.invoice_no}`,
      `📅 *Waktu:* ${formatWaktu(transaksi.waktu)}`,
      `👤 *Pelanggan:* ${transaksi.nama_pelanggan}`,
      `👤 *Kasir:* ${transaksi.karyawan_nama || 'Kasir Bertugas'}`,
      `-----------------------------------------`,
      `*RINCIAN PESANAN:*`,
      itemsList,
      `-----------------------------------------`,
      `*TOTAL TAGIHAN:* *${formatRupiah(transaksi.total)}*`,
      `*BAYAR (${transaksi.metode_bayar.toUpperCase()}):* ${formatRupiah(transaksi.bayar)}`,
      `*KEMBALIAN:* *${formatRupiah(transaksi.kembali)}*`,
      `-----------------------------------------`,
      `_Terima kasih telah berkunjung ke Serabi Bawel & Wedang Geprek!_`,
      `_Khasiat Alami, Tubuh Sehat_`,
      `-----------------------------------------`,
      `*Digitalisasi Operasional Multi-Cabang, POS & Keuangan Terintegrasi.*`,
      `*Dipercaya oleh 1.000+ Pengusaha Berkembang.*`,
      `*Solusi Bisnis Cerdas bersama ivokgrup.com*`
    ].join('\n');

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <>
      {/* 1. ON-SCREEN MODAL: Kasgo Checkout Screen */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn print:hidden">
        <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh]">
          
          {/* Top Minimal Bar */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center space-x-2">
              <div className="flex items-center -space-x-1 text-sm">
                <span>🥞</span>
                <span>🍵</span>
              </div>
              <span className="text-xs font-black tracking-wider uppercase text-slate-700">
                {cabang.nama.split('-')[1]?.trim() || cabang.nama}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors"
              title="Tutup & Transaksi Baru"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
            
            {/* Animated Success Icon & Status */}
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl font-black mx-auto shadow-sm animate-scaleIn border-2 border-emerald-300">
                ✓
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
                  Transaksi Berhasil Diproses!
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 font-mono mt-0.5">
                  No. Struk: <strong className="text-emerald-800 font-bold">{transaksi.invoice_no}</strong>
                </p>
              </div>
            </div>

            {/* UANG KEMBALIAN PELANGGAN (Besar & Jelas Ala Kasgo) */}
            <div className="p-4 rounded-2xl bg-emerald-700 text-white shadow-lg shadow-emerald-900/15 text-center space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-200 block">
                Uang Kembalian Pelanggan
              </span>
              <span className="text-3xl sm:text-4xl font-mono font-black text-white tabular-nums tracking-tight block">
                {formatRupiah(transaksi.kembali)}
              </span>
              <span className="text-[10px] text-emerald-100 font-medium block">
                {transaksi.kembali === 0 ? '✓ Pembayaran Uang Pas' : 'Serahkan uang kembalian ke pembeli'}
              </span>
            </div>

            {/* Financial Summary Breakdown */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600 font-medium">
                <span>Total Tagihan Pesanan:</span>
                <span className="font-mono font-bold text-slate-900">{formatRupiah(transaksi.total)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 font-medium">
                <span>Metode Pembayaran:</span>
                <span className="font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-[10px]">
                  {transaksi.metode_bayar}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 font-medium">
                <span>Uang Diterima:</span>
                <span className="font-mono font-bold text-slate-900">{formatRupiah(transaksi.bayar)}</span>
              </div>
            </div>

            {/* Thermal Printer 58mm Status & Action */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-slate-700">
                <Printer className={`w-4 h-4 ${isBluetoothReady ? 'text-emerald-600' : 'text-slate-400'} shrink-0`} />
                <span className="font-bold text-[11px]">
                  {isBluetoothReady 
                    ? '✓ Tercetak ke printer thermal 58mm' 
                    : printed 
                    ? 'Struk thermal 58mm siap' 
                    : 'Format Struk: Kertas Thermal 58mm'}
                </span>
              </div>
              <button
                type="button"
                onClick={handlePrintManual}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] transition-colors btn-tactile flex items-center space-x-1 shrink-0"
              >
                <Printer className="w-3 h-3 text-amber-400" />
                <span>Cetak 58mm</span>
              </button>
            </div>

            {/* Optional WhatsApp Receipt */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              {!showWaInput ? (
                <button
                  type="button"
                  onClick={() => setShowWaInput(true)}
                  className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>Kirim Nota ke WhatsApp Pelanggan</span>
                </button>
              ) : (
                <div className="p-3 bg-slate-50 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 block">Nomor WhatsApp Pelanggan:</span>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      placeholder="0812xxxxxxx"
                      value={waPhone}
                      onChange={(e) => setWaPhone(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSendWhatsApp}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-extrabold text-xs hover:bg-emerald-700 transition-colors"
                    >
                      Kirim
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Struk Kasir di Layar */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowReceiptDetail(!showReceiptDetail)}
                className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-between transition-colors"
              >
                <span>Lihat Format Struk Thermal 58mm ({transaksi.items.length} Item)</span>
                {showReceiptDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showReceiptDetail && (
                <div className="p-3 bg-slate-100/70 max-h-56 overflow-y-auto">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-[10px] space-y-1 text-slate-900 shadow-xs">
                    <div className="text-center font-bold text-xs uppercase tracking-tight">
                      {cabang.struk_header || 'SERABI BAWEL & WEDANG GEPREK'}
                    </div>
                    <div className="text-center text-[9px] text-slate-500">Serabi Tungku &amp; Rempah Alami</div>
                    <div className="text-center text-[9px] font-bold text-slate-700">{cabang.nama}</div>
                    <div className="text-center text-[9px] text-slate-500">{cabang.alamat}</div>
                    <div className="text-center text-[9px] text-slate-500">Telp/WA: {cabang.telepon}</div>
                    <div className="border-t border-dashed border-slate-300 my-1" />
                    <div className="flex justify-between">
                      <span>No: {transaksi.invoice_no}</span>
                      <span>{formatWaktu(transaksi.waktu)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kasir: {transaksi.karyawan_nama || 'Kasir'}</span>
                      <span className="uppercase">{transaksi.metode_bayar}</span>
                    </div>
                    <div className="border-t border-dashed border-slate-300 my-1" />
                    {transaksi.items.map((it, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="font-bold">{it.nama_menu}</div>
                        <div className="flex justify-between pl-2 text-slate-600">
                          <span>{it.qty}x @{formatRupiah(it.harga).replace('Rp\u00a0', '')}</span>
                          <span className="font-mono text-slate-900">{formatRupiah(it.subtotal).replace('Rp\u00a0', '')}</span>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-dashed border-slate-300 my-1" />
                    <div className="flex justify-between font-bold">
                      <span>TOTAL TAGIHAN:</span>
                      <span className="font-mono">{formatRupiah(transaksi.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bayar:</span>
                      <span className="font-mono">{formatRupiah(transaksi.bayar)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Kembali:</span>
                      <span className="font-mono">{formatRupiah(transaksi.kembali)}</span>
                    </div>

                    {/* Promo Toko Cabang */}
                    {cabang.struk_promo && (
                      <>
                        <div className="border-t border-dashed border-slate-300 my-1" />
                        <div className="text-center font-bold text-[9px] text-amber-900 bg-amber-50 p-1 rounded border border-amber-200">
                          📢 *** PROMO CABANG ***<br />
                          {cabang.struk_promo}
                        </div>
                      </>
                    )}

                    <div className="border-t border-dashed border-slate-300 my-1" />
                    <div className="text-center text-[9px] text-slate-500 pt-1 whitespace-pre-line leading-relaxed">
                      {(cabang.struk_footer || 'Khasiat Alami, Tubuh Sehat\nTerima Kasih Atas Kunjungan Anda').replace(/---?\s*www\.pakagan\.id\s*---?/gi, '').replace(/www\.pakagan\.id/gi, '').trim()}
                    </div>

                    {/* Footer Promosi Paten Permanen ivokgrup (Seluruh Cabang) */}
                    <div className="mt-2 pt-1.5 border-t border-dashed border-slate-300 text-center space-y-0.5">
                      <div className="text-[8.5px] font-black uppercase tracking-wider text-slate-800 leading-snug">
                        Digitalisasi Operasional Multi-Cabang, POS &amp; Keuangan Terintegrasi.
                      </div>
                      <div className="text-[8px] text-slate-600 font-medium">
                        Dipercaya oleh 1.000+ Pengusaha Berkembang.
                      </div>
                      <div className="text-[8px] text-emerald-800 font-bold">
                        Solusi Bisnis Cerdas bersama ivokgrup.com
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Modal Bottom Action: Big Wide Primary Button */}
          <div className="p-4 border-t border-slate-100 bg-white">
            <button
              onClick={onClose}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-900/20 active:scale-95 transition-all btn-tactile"
            >
              <span>🛒 Transaksi Baru / Siap Pesanan Berikutnya</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-1.5">
              Tekan <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono font-bold">Enter</kbd> untuk langsung lanjut transaksi berikutnya
            </p>
          </div>

        </div>
      </div>

      {/* 2. DEDICATED PRINTABLE 58MM THERMAL RECEIPT CONTAINER (Single-Element in DOM) */}
      <div 
        id="printable-receipt"
        className="hidden print:block"
      >
        <div className="text-center font-bold text-xs tracking-tight uppercase">
          {cabang.struk_header || 'SERABI BAWEL & WEDANG GEPREK'}
        </div>
        <div className="text-center text-[10px]">Serabi Tungku &amp; Rempah Alami</div>
        <div className="text-center text-[10px] font-bold">{cabang.nama}</div>
        <div className="text-center text-[9px]">{cabang.alamat}</div>
        <div className="text-center text-[9px]">Telp/WA: {cabang.telepon}</div>
        <div className="border-t border-dashed border-black my-1" />
        <div className="flex justify-between text-[10px]">
          <span>No: {transaksi.invoice_no}</span>
          <span>{formatWaktu(transaksi.waktu)}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>Kasir: {transaksi.karyawan_nama || 'Kasir'}</span>
          <span>Pelanggan: {transaksi.nama_pelanggan}</span>
        </div>
        <div className="border-t border-dashed border-black my-1" />
        {transaksi.items.map((it, idx) => (
          <div key={idx} className="my-0.5">
            <div className="font-bold text-[10px]">{it.nama_menu}</div>
            <div className="flex justify-between pl-2 text-[10px]">
              <span>{it.qty}x @{formatRupiah(it.harga).replace('Rp\u00a0', '')}</span>
              <span className="font-mono">{formatRupiah(it.subtotal).replace('Rp\u00a0', '')}</span>
            </div>
          </div>
        ))}
        <div className="border-t border-dashed border-black my-1" />
        <div className="flex justify-between font-bold text-[11px]">
          <span>TOTAL:</span>
          <span>{formatRupiah(transaksi.total)}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>Bayar ({transaksi.metode_bayar.toUpperCase()}):</span>
          <span>{formatRupiah(transaksi.bayar)}</span>
        </div>
        <div className="flex justify-between font-bold text-[10px]">
          <span>Kembali:</span>
          <span>{formatRupiah(transaksi.kembali)}</span>
        </div>

        {/* Promo Toko Cabang Struk Nyata */}
        {cabang.struk_promo && (
          <>
            <div className="border-t border-dashed border-black my-1" />
            <div className="text-center font-bold text-[9px] py-0.5">
              *** PROMO SPESIAL TOKO ***<br />
              {cabang.struk_promo}
            </div>
          </>
        )}

        <div className="border-t border-dashed border-black my-1" />
        <div className="text-center text-[9px] pt-1 whitespace-pre-line leading-relaxed">
          {(cabang.struk_footer || 'Khasiat Alami, Tubuh Sehat\nTerima Kasih Atas Kunjungan Anda!').replace(/---?\s*www\.pakagan\.id\s*---?/gi, '').replace(/www\.pakagan\.id/gi, '').trim()}
        </div>

        {/* Footer Promosi Paten Permanen ivokgrup Print */}
        <div className="mt-2 pt-1 border-t border-dashed border-black text-center space-y-0.5">
          <div className="text-[8px] font-black uppercase tracking-wider leading-snug">
            Digitalisasi Operasional Multi-Cabang, POS &amp; Keuangan Terintegrasi.
          </div>
          <div className="text-[7.5px] font-medium">
            Dipercaya oleh 1.000+ Pengusaha Berkembang.
          </div>
          <div className="text-[7.5px] font-bold">
            Solusi Bisnis Cerdas bersama ivokgrup.com
          </div>
        </div>
      </div>
    </>
  );
}
