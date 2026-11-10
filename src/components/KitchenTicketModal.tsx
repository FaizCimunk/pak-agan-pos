'use client';

import React, { useState } from 'react';
import { X, Printer, CheckCircle2, UtensilsCrossed, Flame, Coffee } from 'lucide-react';
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
  const [printingStation, setPrintingStation] = useState<string | null>(null);
  const [printedStations, setPrintedStations] = useState<Record<string, boolean>>({});

  // Kelompokkan item berdasarkan 3 Ruangan Masak
  const serabiItems = transaksi.items.filter(it => getItemKitchenStation(it) === 'serabi');
  const wedangItems = transaksi.items.filter(it => getItemKitchenStation(it) === 'wedang');
  const makananItems = transaksi.items.filter(it => getItemKitchenStation(it) === 'makanan');

  const handlePrintStation = async (station: 'serabi' | 'wedang' | 'makanan') => {
    setPrintingStation(station);
    try {
      const bytes = printerService.buildKitchenStationTicket(transaksi, cabang, station);
      if (bytes.length === 0) {
        alert(`Tidak ada menu untuk ruangan ${station} pada pesanan ini.`);
        setPrintingStation(null);
        return;
      }

      const success = await printerService.printRaw(bytes);
      if (!success) {
        window.print();
      }
      setPrintedStations(prev => ({ ...prev, [station]: true }));
    } catch (e) {
      console.warn('Gagal cetak tiket dapur:', e);
      window.print();
    } finally {
      setPrintingStation(null);
    }
  };

  const handlePrintAllStations = async () => {
    setPrintingStation('all');
    try {
      const stationsToPrint: ('serabi' | 'wedang' | 'makanan')[] = [];
      if (serabiItems.length > 0) stationsToPrint.push('serabi');
      if (wedangItems.length > 0) stationsToPrint.push('wedang');
      if (makananItems.length > 0) stationsToPrint.push('makanan');

      for (const st of stationsToPrint) {
        const bytes = printerService.buildKitchenStationTicket(transaksi, cabang, st);
        if (bytes.length > 0) {
          await printerService.printRaw(bytes);
          setPrintedStations(prev => ({ ...prev, [st]: true }));
          await new Promise(r => setTimeout(r, 400));
        }
      }
    } catch (e) {
      console.warn('Gagal cetak semua tiket dapur:', e);
      window.print();
    } finally {
      setPrintingStation(null);
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

  const renderStationItems = (
    stationItems: TransaksiItem[],
    emptyText: string,
    qtyColorClass: string,
    noteBadgeClass: string
  ) => {
    if (stationItems.length === 0) {
      return <p className="text-[11px] text-slate-400 italic">{emptyText}</p>;
    }
    return stationItems.map((it, idx) => (
      <div key={idx} className="flex items-start justify-between text-xs py-1 border-b border-slate-100/70 last:border-b-0">
        <div className="space-y-0.5">
          <div className="flex items-center flex-wrap gap-1.5">
            <span className={`font-extrabold font-mono ${qtyColorClass}`}>
              {it.qty}x
            </span>
            <span className="font-bold text-slate-900">{it.nama_menu}</span>
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
            <div className={`ml-5 px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-tight border inline-block font-mono ${noteBadgeClass}`}>
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
                  Tiket Dapur 3 Ruangan
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-white/20 text-white shrink-0">
                  ESC/POS 58mm
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-emerald-200 font-medium truncate">
                Bar Wedang, Dapur Serabi &amp; Dapur Makanan
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0 ml-2"
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

        {/* 3 Stasiun Dapur Grid */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-3 flex-1 bg-slate-50/40">
          
          {/* Stasiun 1: Tungku Serabi Bawel */}
          <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
            serabiItems.length > 0 
              ? 'bg-white border-amber-200/90 shadow-soft-sm' 
              : 'bg-slate-100/50 border-slate-200/60 opacity-60'
          }`}>
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Flame className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-xs text-slate-800 flex items-center flex-wrap gap-1.5">
                    <span>1. Tungku Serabi</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      {serabiItems.reduce((s, it) => s + it.qty, 0)} Porsi
                    </span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Tungku cetakan tanah liat</span>
                </div>
              </div>

              {serabiItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => handlePrintStation('serabi')}
                  disabled={printingStation !== null}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 btn-tactile shrink-0 ${
                    printedStations['serabi']
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{printedStations['serabi'] ? 'Cetak Ulang' : 'Cetak Serabi'}</span>
                </button>
              )}
            </div>

            <div className="mt-2 space-y-1">
              {renderStationItems(
                serabiItems,
                'Tidak ada pesanan serabi pada transaksi ini',
                'text-amber-700',
                'bg-amber-100 text-amber-950 border-amber-300'
              )}
            </div>
          </div>

          {/* Stasiun 2: Bar Wedang Geprek & Minuman */}
          <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
            wedangItems.length > 0 
              ? 'bg-white border-emerald-200/90 shadow-soft-sm' 
              : 'bg-slate-100/50 border-slate-200/60 opacity-60'
          }`}>
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Coffee className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-xs text-slate-800 flex items-center flex-wrap gap-1.5">
                    <span>2. Bar Wedang Geprek</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {wedangItems.reduce((s, it) => s + it.qty, 0)} Porsi
                    </span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Racikan rempah, STMJ &amp; es herbal</span>
                </div>
              </div>

              {wedangItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => handlePrintStation('wedang')}
                  disabled={printingStation !== null}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 btn-tactile shrink-0 ${
                    printedStations['wedang']
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{printedStations['wedang'] ? 'Cetak Ulang' : 'Cetak Wedang'}</span>
                </button>
              )}
            </div>

            <div className="mt-2 space-y-1">
              {renderStationItems(
                wedangItems,
                'Tidak ada pesanan wedang pada transaksi ini',
                'text-emerald-700',
                'bg-emerald-100 text-emerald-950 border-emerald-300'
              )}
            </div>
          </div>

          {/* Stasiun 3: Dapur Makanan & Camilan */}
          <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
            makananItems.length > 0 
              ? 'bg-white border-blue-200/90 shadow-soft-sm' 
              : 'bg-slate-100/50 border-slate-200/60 opacity-60'
          }`}>
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-xs text-slate-800 flex items-center flex-wrap gap-1.5">
                    <span>3. Dapur Makanan &amp; Camilan</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                      {makananItems.reduce((s, it) => s + it.qty, 0)} Porsi
                    </span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Pisang, singkong keju &amp; gorengan</span>
                </div>
              </div>

              {makananItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => handlePrintStation('makanan')}
                  disabled={printingStation !== null}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 btn-tactile shrink-0 ${
                    printedStations['makanan']
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{printedStations['makanan'] ? 'Cetak Ulang' : 'Cetak Makanan'}</span>
                </button>
              )}
            </div>

            <div className="mt-2 space-y-1">
              {renderStationItems(
                makananItems,
                'Tidak ada pesanan makanan pada transaksi ini',
                'text-blue-700',
                'bg-blue-100 text-blue-950 border-blue-300'
              )}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Format khusus printer thermal 58mm tidak memuat harga</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrintAllStations}
              disabled={printingStation !== null}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md shadow-slate-900/20 transition-all flex items-center justify-center space-x-2 btn-tactile"
            >
              <Printer className="w-4 h-4 text-accent-gold" />
              <span>Cetak Semua Ruangan Sekaligus</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              Selesai &amp; Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
