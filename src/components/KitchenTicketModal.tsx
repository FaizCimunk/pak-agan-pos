'use client';

import React, { useState } from 'react';
import { X, Printer, CheckCircle2, UtensilsCrossed, Check } from 'lucide-react';
import { Transaksi, Cabang } from '@/lib/types';
import { printerService } from '@/lib/printer';
import { formatWaktu } from '@/lib/utils';

interface KitchenTicketModalProps {
  transaksi: Transaksi;
  cabang: Cabang;
  onClose: () => void;
}

export default function KitchenTicketModal({
  transaksi,
  cabang,
  onClose,
}: KitchenTicketModalProps) {
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isPrinted, setIsPrinted] = useState<boolean>(false);

  const totalPorsi = transaksi.items.reduce((s, it) => s + it.qty, 0);
  const penandaStr = (transaksi as any).penanda || (transaksi as any).meja;
  const isBungkus = (penandaStr || transaksi.nama_pelanggan || '').toLowerCase().includes('bungkus') ||
                    (penandaStr || transaksi.nama_pelanggan || '').toLowerCase().includes('take away') ||
                    (penandaStr || transaksi.nama_pelanggan || '').toLowerCase().includes('bawa');

  const handlePrintTicket = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    try {
      // Cetak tiket dapur (format identik struk pembeli, tanpa bagian bawah finansial)
      const bytes = printerService.buildKitchenStationTicket(transaksi, cabang, 'semua');
      if (bytes.length === 0) {
        alert('Tidak ada menu pada pesanan ini.');
        return;
      }

      const isBtConnected = printerService.isPrinterConnected();
      if (isBtConnected) {
        const success = await printerService.printRaw(bytes);
        if (success) {
          setIsPrinted(true);
        } else {
          alert('Printer sedang memproses atau belum siap. Silakan coba sesaat lagi.');
        }
      } else {
        // Fallback dialog cetak browser hanya jika Bluetooth belum terhubung
        window.print();
        setIsPrinted(true);
      }
    } catch (e) {
      console.warn('Gagal cetak tiket dapur:', e);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-fadeIn print:hidden">
        <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-accent-gold/20 border border-accent-gold/40 flex items-center justify-center text-accent-gold shrink-0">
              <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                  Tiket Dapur
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-white/20 text-white shrink-0">
                  Format Struk 58mm
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-emerald-200 font-medium truncate">
                Serabi Bawel &amp; Wedang Geprek
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0 ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Tampilan Pratinjau Persis Seperti Struk Pembeli (Tanpa Bagian Bawah Harga) */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-100/70">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 font-mono text-[11px] space-y-1.5 text-slate-900 shadow-sm max-w-sm mx-auto">
            
            {/* Header Struk */}
            <div className="text-center font-bold text-xs uppercase tracking-tight text-emerald-800">
              [ TIKET DAPUR ]
            </div>
            <div className="text-center font-black text-xs text-slate-900">
              SERABI BAWEL &amp; WEDANG GEPREK
            </div>
            <div className="text-center text-[9px] text-slate-500">
              Serabi Tungku &amp; Rempah Alami
            </div>
            <div className="text-center text-[9px] font-bold text-slate-700">
              {cabang.nama}
            </div>

            <div className="border-t border-dashed border-slate-300 my-2" />

            {/* Metadata Pesanan */}
            <div className="flex justify-between text-[10px]">
              <span>No: {transaksi.invoice_no}</span>
              <span>{formatWaktu(transaksi.waktu)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>Kasir: {(transaksi.karyawan_nama || 'Kasir').split('(')[0].trim()}</span>
            </div>
            <div className="flex justify-between font-bold text-[10.5px]">
              <span>Layanan:</span>
              <span className={isBungkus ? 'text-amber-800' : 'text-emerald-800'}>
                {isBungkus ? 'BUNGKUS (TAKE AWAY)' : 'MAKAN DI SINI'}
              </span>
            </div>
            {penandaStr && (
              <div className="flex justify-between text-[10.5px]">
                <span>Penanda:</span>
                <span className="font-bold text-slate-900">{penandaStr}</span>
              </div>
            )}
            {transaksi.nama_pelanggan && transaksi.nama_pelanggan !== penandaStr && (
              <div className="flex justify-between text-[10px]">
                <span>Pelanggan:</span>
                <span className="font-medium text-slate-800">{transaksi.nama_pelanggan}</span>
              </div>
            )}

            <div className="border-t border-dashed border-slate-300 my-2" />

            {/* Daftar Menu (Sama seperti struk pembeli, tanpa harga) */}
            <div className="space-y-2 py-0.5">
              {transaksi.items.map((it, idx) => {
                const tempTag = it.temperature === 'dingin' ? ' (ES)' : it.temperature === 'panas' ? ' (PANAS)' : '';
                const varTag = it.varian_nama ? ` (${it.varian_nama})` : '';
                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-bold text-slate-900">
                      {it.nama_menu}{varTag}{tempTag}
                    </div>
                    {it.catatan && (
                      <div className="text-[10px] font-black text-amber-950 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300 inline-block">
                        * CATATAN: {it.catatan.toUpperCase()}
                      </div>
                    )}
                    <div className="pl-2 font-bold text-slate-700">
                      {it.qty}x
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-dashed border-slate-300 my-2" />

            {/* Bagian Bawah Khusus Dapur: Hanya Total Porsi */}
            <div className="flex justify-between font-black text-xs pt-1 text-slate-900">
              <span>TOTAL:</span>
              <span className="font-mono">{totalPorsi} PORSI</span>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row gap-2.5 items-center justify-between shrink-0">
          <div className="text-[10.5px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Format struk khusus dapur tanpa rincian harga</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrintTicket}
              disabled={isPrinting}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center space-x-2 btn-tactile cursor-pointer ${
                isPrinted
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/25'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/25'
              }`}
            >
              {isPrinted ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Cetak Ulang Tiket</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 text-accent-gold" />
                  <span>{isPrinting ? 'Mencetak...' : 'Cetak Tiket Dapur'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>

    {/* Dedicated Printable 58mm Thermal Kitchen Ticket (Single Ticket) */}
    <div 
      id="printable-kitchen-ticket"
      className="hidden print:block"
    >
      <div className="text-center font-bold text-xs tracking-tight uppercase">
        [ TIKET DAPUR ]
      </div>
      <div className="text-center font-bold text-xs">
        SERABI BAWEL &amp; WEDANG GEPREK
      </div>
      <div className="text-center text-[10px]">Serabi Tungku &amp; Rempah Alami</div>
      <div className="text-center text-[10px] font-bold">{cabang.nama}</div>
      <div className="border-t border-dashed border-black my-1" />
      <div className="flex justify-between text-[10px]">
        <span>No: {transaksi.invoice_no}</span>
        <span>{formatWaktu(transaksi.waktu)}</span>
      </div>
      <div className="flex justify-between text-[10px]">
        <span>Kasir: {(transaksi.karyawan_nama || 'Kasir').split('(')[0].trim()}</span>
      </div>
      <div className="flex justify-between font-bold text-[10px]">
        <span>Layanan:</span>
        <span>{isBungkus ? 'BUNGKUS (TAKE AWAY)' : 'MAKAN DI SINI'}</span>
      </div>
      {penandaStr && (
        <div className="flex justify-between text-[10px]">
          <span>Penanda:</span>
          <span className="font-bold">{penandaStr}</span>
        </div>
      )}
      {transaksi.nama_pelanggan && transaksi.nama_pelanggan !== penandaStr && (
        <div className="flex justify-between text-[10px]">
          <span>Pelanggan:</span>
          <span>{transaksi.nama_pelanggan}</span>
        </div>
      )}
      <div className="border-t border-dashed border-black my-1" />
      {transaksi.items.map((it, idx) => {
        const tempTag = it.temperature === 'dingin' ? ' (ES)' : it.temperature === 'panas' ? ' (PANAS)' : '';
        const varTag = it.varian_nama ? ` (${it.varian_nama})` : '';
        return (
          <div key={idx} className="my-0.5">
            <div className="font-bold text-[10px]">{it.nama_menu}{varTag}{tempTag}</div>
            {it.catatan && (
              <div className="text-[9px] font-bold">
                * CATATAN: {it.catatan.toUpperCase()}
              </div>
            )}
            <div className="pl-2 font-bold text-[10px]">
              {it.qty}x
            </div>
          </div>
        );
      })}
      <div className="border-t border-dashed border-black my-1" />
      <div className="flex justify-between font-bold text-[11px]">
        <span>TOTAL:</span>
        <span>{totalPorsi} PORSI</span>
      </div>
    </div>
  </>
  );
}
