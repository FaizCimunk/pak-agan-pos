'use client';

import React, { useState } from 'react';
import { 
  X, 
  UtensilsCrossed, 
  Clock, 
  DollarSign, 
  Printer, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Flame,
  Coffee
} from 'lucide-react';
import { Transaksi, Cabang } from '@/lib/types';
import { formatRupiah, formatWaktu } from '@/lib/utils';
import { getItemKitchenStation } from '@/lib/printer';

interface OpenBillsModalProps {
  openBills: Transaksi[];
  cabang: Cabang;
  onClose: () => void;
  onPayBill: (bill: Transaksi) => void;
  onPrintKitchenTicket: (bill: Transaksi) => void;
  onCancelBill: (billId: string) => Promise<void>;
}

export default function OpenBillsModal({
  openBills,
  cabang,
  onClose,
  onPayBill,
  onPrintKitchenTicket,
  onCancelBill,
}: OpenBillsModalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleCancelClick = async (bill: Transaksi) => {
    const mesaName = bill.meja || bill.nama_pelanggan || 'Pesanan Meja';
    if (confirm(`Apakah Anda yakin ingin membatalkan pesanan "${mesaName}" senilai ${formatRupiah(bill.total)}?`)) {
      setDeletingId(bill.id);
      try {
        await onCancelBill(bill.id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const totalNominalOpen = openBills.reduce((acc, b) => acc + (b.total || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-xs">
              <Clock className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                  Tagihan Belum Dibayar (Bayar Nanti)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/25 text-white">
                  {openBills.length} Meja
                </span>
              </div>
              <p className="text-[11px] text-amber-100 font-medium">
                Pesanan dine-in yang sedang makan di tempat dan akan dibayar saat selesai
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

        {/* Summary Bar */}
        <div className="p-3.5 bg-amber-50/80 border-b border-amber-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-amber-900 font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              Total Tagihan Menunggu: <strong className="font-mono text-slate-900 font-black">{formatRupiah(totalNominalOpen)}</strong>
            </span>
          </div>

          <div className="text-[11px] text-amber-800 font-medium hidden sm:block">
            *Belum masuk omzet dashboard hingga kasir melunasi
          </div>
        </div>

        {/* Bills List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 bg-slate-50/50">
          {openBills.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl shadow-soft-sm">
                ✓
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-base">
                  Semua Tagihan Sudah Lunas!
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Tidak ada meja atau pesanan yang berstatus bayar nanti. Transaksi baru yang disimpan sebagai &quot;Bayar Nanti&quot; akan muncul di sini.
                </p>
              </div>
            </div>
          ) : (
            openBills.map(bill => {
              const isExpanded = expandedId === bill.id;
              const mesaText = bill.meja || (bill.nama_pelanggan.toLowerCase().includes('meja') ? bill.nama_pelanggan : `Meja: ${bill.nama_pelanggan}`);
              const totalItems = bill.items.reduce((s, it) => s + it.qty, 0);

              return (
                <div
                  key={bill.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-soft-sm overflow-hidden transition-all hover:border-amber-300"
                >
                  {/* Card Main Row */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* Left: Table & Customer */}
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider leading-none">Meja</span>
                        <span className="text-sm font-black font-mono mt-0.5 leading-none">
                          {bill.meja ? bill.meja.replace(/[^0-9]/g, '') || '#' : '#'}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-extrabold text-sm text-slate-900">
                            {mesaText}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800">
                            {totalItems} Menu
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center space-x-2">
                          <span>{bill.nama_pelanggan}</span>
                          <span>•</span>
                          <span>{formatWaktu(bill.waktu)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Total & Primary Actions */}
                    <div className="flex items-center justify-between sm:justify-end space-x-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Total Tagihan
                        </div>
                        <div className="text-base sm:text-lg font-mono font-black text-amber-800 tabular-nums">
                          {formatRupiah(bill.total)}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => onPrintKitchenTicket(bill)}
                          className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center space-x-1 shrink-0"
                          title="Cetak Ulang Tiket Dapur"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-700" />
                          <span className="hidden md:inline">Tiket Dapur</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onPayBill(bill)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-700/20 transition-all flex items-center space-x-1.5 btn-tactile shrink-0"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Bayar Sekarang</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleExpand(bill.id)}
                          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Expandable Detail Section */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs space-y-2 animate-fadeIn">
                      <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                        Rincian Pesanan Meja Ini:
                      </div>
                      
                      <div className="space-y-1 divide-y divide-slate-200/50">
                        {bill.items.map((it, idx) => {
                          const station = getItemKitchenStation(it);
                          const stationColor = station === 'serabi' ? 'bg-amber-100 text-amber-800' : station === 'wedang' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800';
                          const stationLabel = station === 'serabi' ? 'Serabi' : station === 'wedang' ? 'Wedang' : 'Makanan';

                          return (
                            <div key={idx} className="pt-1 flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${stationColor}`}>
                                  {stationLabel}
                                </span>
                                <span className="font-extrabold text-slate-800 font-mono">
                                  {it.qty}x
                                </span>
                                <span className="font-medium text-slate-800">
                                  {it.nama_menu}
                                </span>
                                {it.catatan && (
                                  <span className="text-[11px] text-amber-600 italic">
                                    ({it.catatan})
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-slate-700 font-bold tabular-nums">
                                {formatRupiah(it.subtotal)}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleCancelClick(bill)}
                          disabled={deletingId === bill.id}
                          className="text-rose-600 hover:text-rose-700 font-bold text-[11px] flex items-center space-x-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{deletingId === bill.id ? 'Membatalkan...' : 'Batalkan Pesanan Ini'}</span>
                        </button>

                        <div className="text-[11px] text-slate-400 font-mono">
                          ID: {bill.invoice_no}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Saat pelanggan bayar, data otomatis terkirim realtime ke Dashboard Pusat</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
