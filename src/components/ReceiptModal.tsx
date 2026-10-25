'use client';

import React, { useState, useEffect } from 'react';
import { Printer, ArrowRight, MessageCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
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
  const [showReceiptDetail, setShowReceiptDetail] = useState(false);
  const [showWaInput, setShowWaInput] = useState(false);
  const [waPhone, setWaPhone] = useState('');

  // Auto-Print Direct on Modal Mount (No PDF / No Dialog needed!)
  useEffect(() => {
    const directThermalPrint = async () => {
      try {
        const bytes = printerService.buildReceiptCommands(transaksi, cabang);
        const success = await printerService.printRaw(bytes);
        if (success) {
          setPrinted(true);
        } else {
          // If Bluetooth is not paired, trigger direct thermal print
          window.print();
          setPrinted(true);
        }
      } catch (err) {
        console.warn('Auto print failed:', err);
      }
    };

    directThermalPrint();

    // Keyboard shortcut: Pressing 'Enter' automatically finishes and goes to Next Order
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !showWaInput) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [transaksi, cabang, onClose, showWaInput]);

  const handlePrintAgain = async () => {
    try {
      const bytes = printerService.buildReceiptCommands(transaksi, cabang);
      const success = await printerService.printRaw(bytes);
      if (success) {
        setPrinted(true);
      } else {
        window.print();
        setPrinted(true);
      }
    } catch (err) {
      console.warn('Re-print failed:', err);
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
      `_Khasiat Alami, Tubuh Sehat • www.pakagan.id_`
    ].join('\n');

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Top Minimal Bar */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2">
            <span className="text-sm">🥞</span>
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

        {/* Content Body: Kasgo-Style Tablet Success View */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* 1. Animated Success Icon & Status */}
          <div className="text-center space-y-1.5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl font-black mx-auto shadow-sm animate-scaleIn border-2 border-emerald-300">
              ✓
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950 tracking-tight">
                Transaksi Berhasil Diproses!
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                No. Struk: <strong className="text-emerald-800 font-bold">{transaksi.invoice_no}</strong> • {formatWaktu(transaksi.waktu)}
              </p>
            </div>
          </div>

          {/* 2. KEMBALIAN BOX (BESAR & SANGAT JELAS ALA KASGO) */}
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

          {/* 3. Financial Summary Breakdown */}
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

          {/* 4. Thermal Printer Direct Status */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-emerald-900 font-bold">
              <Printer className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{printed ? 'Struk dicetak ke printer thermal' : 'Mengirim struk ke printer thermal...'}</span>
            </div>
            <button
              onClick={handlePrintAgain}
              className="px-2.5 py-1 rounded-xl bg-white border border-emerald-300 font-black text-[11px] text-emerald-800 hover:bg-emerald-100 transition-colors btn-tactile"
              title="Cetak ulang jika kertas habis/macet"
            >
              Cetak Ulang
            </button>
          </div>

          {/* 5. Optional WhatsApp Receipt */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            {!showWaInput ? (
              <button
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
                    onClick={handleSendWhatsApp}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-extrabold text-xs hover:bg-emerald-700 transition-colors"
                  >
                    Kirim WA
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 6. Expandable Struk Preview (Inside Modal & Printable for 58mm Thermal) */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowReceiptDetail(!showReceiptDetail)}
              className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-between transition-colors"
            >
              <span>Rincian Menu Struk ({transaksi.items.length} Item)</span>
              {showReceiptDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showReceiptDetail && (
              <div className="p-4 bg-slate-100/60 max-h-52 overflow-y-auto">
                <div 
                  id="printable-receipt"
                  className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-[10px] space-y-1.5 text-slate-800"
                >
                  <div className="text-center font-bold">SERABI BAWEL &amp; WEDANG GEPREK</div>
                  <div className="text-center text-[9px] text-slate-500">{cabang.nama}</div>
                  <div className="border-t border-dashed border-slate-300 my-1" />
                  {transaksi.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{it.nama_menu} x{it.qty}</span>
                      <span>{formatRupiah(it.subtotal)}</span>
                    </div>
                  ))}
                  <div className="border-t border-dashed border-slate-300 my-1" />
                  <div className="flex justify-between font-bold">
                    <span>TOTAL:</span>
                    <span>{formatRupiah(transaksi.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bayar:</span>
                    <span>{formatRupiah(transaksi.bayar)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Kembali:</span>
                    <span>{formatRupiah(transaksi.kembali)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Hidden Thermal Receipt Container for direct print if detail is collapsed */}
          {!showReceiptDetail && (
            <div className="hidden print:block">
              <div 
                id="printable-receipt"
                className="bg-white p-2 font-mono text-[10px] space-y-1 text-black"
              >
                <div className="text-center font-bold">SERABI BAWEL &amp; WEDANG GEPREK</div>
                <div className="text-center text-[9px]">{cabang.nama}</div>
                <div className="border-t border-dashed border-black my-1" />
                <div className="flex justify-between">
                  <span>No: {transaksi.invoice_no}</span>
                  <span>{formatWaktu(transaksi.waktu).split(' ')[1]}</span>
                </div>
                <div className="border-t border-dashed border-black my-1" />
                {transaksi.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.nama_menu} x{it.qty}</span>
                    <span>{formatRupiah(it.subtotal)}</span>
                  </div>
                ))}
                <div className="border-t border-dashed border-black my-1" />
                <div className="flex justify-between font-bold">
                  <span>TOTAL:</span>
                  <span>{formatRupiah(transaksi.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bayar:</span>
                  <span>{formatRupiah(transaksi.bayar)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Kembali:</span>
                  <span>{formatRupiah(transaksi.kembali)}</span>
                </div>
                <div className="border-t border-dashed border-black my-1" />
                <div className="text-center text-[8px]">Terima Kasih Atas Kunjungan Anda!</div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Action: Big Wide Primary Button (NO PDF BUTTON!) */}
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
  );
}
