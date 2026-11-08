'use client';

import React, { useState } from 'react';
import { X, Printer, CheckCircle2, Clock, UtensilsCrossed, Flame, Coffee, Sparkles } from 'lucide-react';
import { Transaksi, Cabang, KitchenStation } from '@/lib/types';
import { printerService, getItemKitchenStation } from '@/lib/printer';
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
        // Fallback cetak sistem jika Bluetooth belum tersambung
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
          // Beri jeda kecil antar tiket thermal
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
  const isBungkus = penandaRaw.toLowerCase().includes('bungkus') || 
                    penandaRaw.toLowerCase().includes('take away') || 
                    penandaRaw.toLowerCase().includes('takeaway') || 
                    penandaRaw.toLowerCase().includes('bawa');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent-gold/20 border border-accent-gold/40 flex items-center justify-center text-accent-gold">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                  Tiket Dapur 3 Ruangan Masak
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/20 text-white">
                  ESC/POS 58mm
                </span>
              </div>
              <p className="text-[11px] text-emerald-200 font-medium">
                Kirim pesanan terpisah ke Bar Wedang, Dapur Serabi &amp; Dapur Makanan
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Penanda Pesanan & Layanan (Makan Di Sini vs Bungkus) */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isBungkus ? 'bg-amber-50/90 border-amber-200' : 'bg-emerald-50/80 border-emerald-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`px-3 py-1.5 rounded-xl text-white font-mono font-black text-sm shadow-xs flex items-center space-x-1.5 ${
              isBungkus ? 'bg-amber-600' : 'bg-emerald-700'
            }`}>
              <span>{isBungkus ? '🛍️' : '🏷️'}</span>
              <span>{penandaDisplay}</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                  isBungkus ? 'bg-amber-200 text-amber-950 font-mono' : 'bg-emerald-200 text-emerald-950 font-mono'
                }`}>
                  {isBungkus ? '🛍️ BUNGKUS (KEMAS DUS/CUP)' : '🍽️ MAKAN DI SINI (DINE IN)'}
                </span>
                {transaksi.nama_pelanggan && transaksi.nama_pelanggan !== penandaRaw && (
                  <span className="text-xs font-bold text-slate-800">
                    {transaksi.nama_pelanggan}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                No: {transaksi.invoice_no} • {formatWaktu(transaksi.waktu)}
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
              transaksi.status === 'pending_payment'
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}>
              {transaksi.status === 'pending_payment' ? '⏳ Bayar Nanti' : '✓ Sudah Lunas'}
            </span>
          </div>
        </div>

        {/* 3 Stasiun Dapur Grid */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 bg-slate-50/40">
          
          {/* Stasiun 1: Tungku Serabi Bawel */}
          <div className={`p-4 rounded-2xl border transition-all ${
            serabiItems.length > 0 
              ? 'bg-white border-amber-200/90 shadow-soft-sm' 
              : 'bg-slate-100/50 border-slate-200/60 opacity-60'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                    <span>1. Tungku Serabi Bawel</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      {serabiItems.reduce((s, it) => s + it.qty, 0)} Porsi
                    </span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Tungku cetakan tanah liat serabi bakar</span>
                </div>
              </div>

              {serabiItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => handlePrintStation('serabi')}
                  disabled={printingStation !== null}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 btn-tactile ${
                    printedStations['serabi']
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{printedStations['serabi'] ? 'Cetak Ulang Serabi' : 'Cetak Serabi'}</span>
                </button>
              )}
            </div>

            <div className="mt-2.5 space-y-1.5">
              {serabiItems.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">Tidak ada pesanan serabi pada transaksi ini</p>
              ) : (
                serabiItems.map((it, idx) => (
                  <div key={idx} className="flex items-start justify-between text-xs py-0.5">
                    <div>
                      <span className="font-extrabold text-slate-900 mr-2 font-mono text-amber-700">
                        {it.qty}x
                      </span>
                      <span className="font-bold text-slate-800">{it.nama_menu}</span>
                      {it.catatan && (
                        <div className="mt-0.5 ml-5 px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-tight bg-amber-100 text-amber-950 border border-amber-300 inline-block font-mono">
                          👉 CATATAN: {it.catatan}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stasiun 2: Bar Wedang Geprek & Minuman */}
          <div className={`p-4 rounded-2xl border transition-all ${
            wedangItems.length > 0 
              ? 'bg-white border-emerald-200/90 shadow-soft-sm' 
              : 'bg-slate-100/50 border-slate-200/60 opacity-60'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                    <span>2. Bar Wedang Geprek</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {wedangItems.reduce((s, it) => s + it.qty, 0)} Porsi
                    </span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Racikan rempah, STMJ & es herbal</span>
                </div>
              </div>

              {wedangItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => handlePrintStation('wedang')}
                  disabled={printingStation !== null}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 btn-tactile ${
                    printedStations['wedang']
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{printedStations['wedang'] ? 'Cetak Ulang Wedang' : 'Cetak Wedang'}</span>
                </button>
              )}
            </div>

            <div className="mt-2.5 space-y-1.5">
              {wedangItems.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">Tidak ada pesanan wedang pada transaksi ini</p>
              ) : (
                wedangItems.map((it, idx) => (
                  <div key={idx} className="flex items-start justify-between text-xs py-0.5">
                    <div>
                      <span className="font-extrabold text-slate-900 mr-2 font-mono text-emerald-700">
                        {it.qty}x
                      </span>
                      <span className="font-bold text-slate-800">{it.nama_menu}</span>
                      {it.catatan && (
                        <div className="mt-0.5 ml-5 px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-tight bg-emerald-100 text-emerald-950 border border-emerald-300 inline-block font-mono">
                          👉 CATATAN: {it.catatan}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stasiun 3: Dapur Makanan & Camilan */}
          <div className={`p-4 rounded-2xl border transition-all ${
            makananItems.length > 0 
              ? 'bg-white border-blue-200/90 shadow-soft-sm' 
              : 'bg-slate-100/50 border-slate-200/60 opacity-60'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                    <span>3. Dapur Makanan &amp; Camilan</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                      {makananItems.reduce((s, it) => s + it.qty, 0)} Porsi
                    </span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Pisang, singkong keju & gorengan</span>
                </div>
              </div>

              {makananItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => handlePrintStation('makanan')}
                  disabled={printingStation !== null}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 btn-tactile ${
                    printedStations['makanan']
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{printedStations['makanan'] ? 'Cetak Ulang Makanan' : 'Cetak Makanan'}</span>
                </button>
              )}
            </div>

            <div className="mt-2.5 space-y-1.5">
              {makananItems.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">Tidak ada pesanan makanan pada transaksi ini</p>
              ) : (
                makananItems.map((it, idx) => (
                  <div key={idx} className="flex items-start justify-between text-xs py-0.5">
                    <div>
                      <span className="font-extrabold text-slate-900 mr-2 font-mono text-blue-700">
                        {it.qty}x
                      </span>
                      <span className="font-bold text-slate-800">{it.nama_menu}</span>
                      {it.catatan && (
                        <div className="mt-0.5 ml-5 px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-tight bg-blue-100 text-blue-950 border border-blue-300 inline-block font-mono">
                          👉 CATATAN: {it.catatan}
                        </div>
                      )}
                    </div>
                  </div>
                ))
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
