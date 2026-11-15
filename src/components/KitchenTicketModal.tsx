'use client';

import React, { useState } from 'react';
import { X, Printer, CheckCircle2, UtensilsCrossed, Flame, Coffee, Check } from 'lucide-react';
import { Transaksi, Cabang, TransaksiItem } from '@/lib/types';
import { printerService, getItemKitchenStation, getOrderServiceMode } from '@/lib/printer';
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

  // Kelompokkan item untuk display visual di 1 struk terpadu
  const serabiItems = transaksi.items.filter(it => getItemKitchenStation(it) === 'serabi');
  const wedangItems = transaksi.items.filter(it => getItemKitchenStation(it) === 'wedang');
  const makananItems = transaksi.items.filter(it => getItemKitchenStation(it) === 'makanan');
  const totalPorsi = transaksi.items.reduce((s, it) => s + it.qty, 0);

  const handlePrintTicket = async () => {
    setIsPrinting(true);
    try {
      // Cetak seluruh menu (Serabi, Wedang & Makanan) dalam 1 struk tunggal
      const bytes = printerService.buildKitchenStationTicket(transaksi, cabang, 'semua');
      if (bytes.length === 0) {
        alert('Tidak ada menu pada pesanan ini.');
        setIsPrinting(false);
        return;
      }

      const success = await printerService.printRaw(bytes);
      if (!success) {
        window.print();
      }
      setIsPrinted(true);
    } catch (e) {
      console.warn('Gagal cetak tiket dapur:', e);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  const penandaRaw = (transaksi as any).penanda || (transaksi as any).meja || transaksi.nama_pelanggan || 'Pesanan';
  const penandaDisplay = penandaRaw.toUpperCase();
  const serviceMode = getOrderServiceMode(penandaRaw, transaksi.items);

  const serviceBadgeMap = {
    bungkus: {
      container: 'bg-amber-50/90 border-amber-200',
      pill: 'bg-amber-600',
      icon: '🛍️',
      badgeClass: 'bg-amber-200 text-amber-950 font-mono',
      badgeText: '🛍️ BUNGKUS (KEMAS DUS/CUP)',
    },
    mixed: {
      container: 'bg-sky-50/90 border-sky-200',
      pill: 'bg-sky-700',
      icon: '🔀',
      badgeClass: 'bg-sky-200 text-sky-950 font-mono',
      badgeText: '🔀 CAMPUR (CEK CATATAN ITEM)',
    },
    makan_sini: {
      container: 'bg-emerald-50/80 border-emerald-200',
      pill: 'bg-emerald-700',
      icon: '🏷️',
      badgeClass: 'bg-emerald-200 text-emerald-950 font-mono',
      badgeText: '🍽️ MAKAN DI SINI (DINE IN)',
    },
  }[serviceMode];

  const renderItemList = (
    items: TransaksiItem[],
    qtyColorClass: string,
    noteBadgeClass: string
  ) => {
    return items.map((it, idx) => (
      <div key={idx} className="flex items-start justify-between text-xs py-1.5 border-b border-dashed border-slate-200 last:border-b-0">
        <div className="space-y-0.5">
          <div className="flex items-center flex-wrap gap-1.5">
            <span className={`font-black font-mono text-sm ${qtyColorClass}`}>
              {it.qty}x
            </span>
            <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{it.nama_menu}</span>
            {it.varian_nama && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-200">
                {it.varian_nama}
              </span>
            )}
            {it.temperature && (
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                  it.temperature === 'dingin'
                    ? 'bg-sky-100 text-sky-900 border border-sky-200'
                    : 'bg-amber-100 text-amber-900 border border-amber-200'
                }`}
              >
                {it.temperature === 'dingin' ? '🧊 ES' : '🔥 PANAS'}
              </span>
            )}
          </div>
          {it.catatan && (
            <div className={`ml-6 px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-tight border inline-block font-mono ${noteBadgeClass}`}>
              👉 CATATAN: {it.catatan}
            </div>
          )}
        </div>
      </div>
    ));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-accent-gold/20 border border-accent-gold/40 flex items-center justify-center text-accent-gold shrink-0">
              <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                  Tiket Pesanan Dapur
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-white/20 text-white shrink-0">
                  1 Struk 58mm
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-emerald-200 font-medium truncate">
                Serabi, Wedang &amp; Makanan • 1 Struk Dapur Terpadu
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

        {/* Info Penanda Pesanan & Layanan (Makan Di Sini vs Campur vs Bungkus) */}
        <div className={`px-3.5 py-2.5 sm:p-4 border-b flex items-center justify-between gap-2 shrink-0 ${serviceBadgeMap.container}`}>
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-white font-mono font-black text-xs sm:text-sm shadow-xs flex items-center space-x-1 shrink-0 ${serviceBadgeMap.pill}`}>
              <span>{serviceBadgeMap.icon}</span>
              <span>{penandaDisplay}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-1.5">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${serviceBadgeMap.badgeClass}`}>
                  {serviceBadgeMap.badgeText}
                </span>
                {transaksi.nama_pelanggan && transaksi.nama_pelanggan !== penandaRaw && (
                  <span className="text-xs font-bold text-slate-800 truncate">
                    {transaksi.nama_pelanggan}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                {transaksi.invoice_no} • {formatWaktu(transaksi.waktu)}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className={`inline-block px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase ${
              transaksi.status === 'pending_payment'
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}>
              {transaksi.status === 'pending_payment' ? '⏳ Bayar Nanti' : '✓ Lunas'}
            </span>
          </div>
        </div>

        {/* Pratinjau 1 Lembar Struk Dapur Tunggal */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 bg-slate-100/60">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm p-4 sm:p-5 space-y-4">
            
            {/* Header Pratinjau Struk */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <span className="font-mono font-black text-xs tracking-wider text-slate-900 block">
                [ TIKET PESANAN DAPUR ]
              </span>
              <span className="text-[11px] font-bold text-slate-700 block">
                SERABI BAWEL &amp; WEDANG GEPREK
              </span>
              <span className="text-[10px] text-slate-500 block">
                {cabang.nama}
              </span>
            </div>

            {/* Bagian 1: Tungku Serabi (Jika Ada) */}
            {serabiItems.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center space-x-1.5 pb-1 border-b border-amber-200 text-amber-900">
                  <Flame className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-extrabold text-[11px] uppercase tracking-wide">
                    Tungku Serabi ({serabiItems.reduce((s, it) => s + it.qty, 0)} Porsi)
                  </span>
                </div>
                <div className="pl-1">
                  {renderItemList(
                    serabiItems,
                    'text-amber-700',
                    'bg-amber-100 text-amber-950 border-amber-300'
                  )}
                </div>
              </div>
            )}

            {/* Bagian 2: Bar Wedang Geprek & Minuman (Jika Ada) */}
            {wedangItems.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center space-x-1.5 pb-1 border-b border-emerald-200 text-emerald-900">
                  <Coffee className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-extrabold text-[11px] uppercase tracking-wide">
                    Bar Wedang &amp; Minuman ({wedangItems.reduce((s, it) => s + it.qty, 0)} Porsi)
                  </span>
                </div>
                <div className="pl-1">
                  {renderItemList(
                    wedangItems,
                    'text-emerald-700',
                    'bg-emerald-100 text-emerald-950 border-emerald-300'
                  )}
                </div>
              </div>
            )}

            {/* Bagian 3: Dapur Makanan & Cemilan (Jika Ada) */}
            {makananItems.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center space-x-1.5 pb-1 border-b border-blue-200 text-blue-900">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-extrabold text-[11px] uppercase tracking-wide">
                    Dapur Makanan &amp; Cemilan ({makananItems.reduce((s, it) => s + it.qty, 0)} Porsi)
                  </span>
                </div>
                <div className="pl-1">
                  {renderItemList(
                    makananItems,
                    'text-blue-700',
                    'bg-blue-100 text-blue-950 border-blue-300'
                  )}
                </div>
              </div>
            )}

            {/* Total Porsi Keseluruhan */}
            <div className="pt-3 border-t-2 border-slate-900/80 flex items-center justify-between text-xs font-mono font-black text-slate-900">
              <span>TOTAL SELURUH PESANAN:</span>
              <span className="text-sm bg-slate-900 text-white px-2.5 py-0.5 rounded-lg">
                {totalPorsi} PORSI
              </span>
            </div>

            <div className="text-center text-[10px] text-slate-400 font-bold tracking-wider pt-1">
              *** MOHON SEGERA DIMASAK ***
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Format khusus printer thermal 58mm tidak memuat harga</span>
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
                  <span>Cetak Ulang Tiket Dapur (1 Struk)</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 text-accent-gold" />
                  <span>{isPrinting ? 'Mencetak...' : 'Cetak Tiket Dapur (1 Struk)'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Selesai &amp; Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
