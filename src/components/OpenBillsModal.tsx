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
  Edit3,
  Plus
} from 'lucide-react';
import { Transaksi, Cabang } from '@/lib/types';
import { formatRupiah, formatWaktu } from '@/lib/utils';
import { getItemKitchenStation, getOrderServiceMode } from '@/lib/printer';

interface OpenBillsModalProps {
  openBills: Transaksi[];
  cabang: Cabang;
  onClose: () => void;
  onPayBill: (bill: Transaksi) => void;
  onEditBill: (bill: Transaksi, openCartSheet?: boolean) => void;
  onPrintKitchenTicket: (bill: Transaksi) => void;
  onCancelBill: (billId: string) => Promise<void>;
}

export default function OpenBillsModal({
  openBills,
  cabang,
  onClose,
  onPayBill,
  onEditBill,
  onPrintKitchenTicket,
  onCancelBill,
}: OpenBillsModalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleCancelClick = async (bill: Transaksi) => {
    const penandaText = bill.penanda || bill.meja || bill.nama_pelanggan || 'Pesanan';
    if (confirm(`Apakah Anda yakin ingin membatalkan pesanan "${penandaText}" senilai ${formatRupiah(bill.total)}?`)) {
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
                  {openBills.length} Pesanan
                </span>
              </div>
              <p className="text-[11px] text-amber-100 font-medium">
                Pesanan yang sedang dimasak/santap dan dibayar saat selesai
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
                  Tidak ada pesanan yang berstatus bayar nanti. Transaksi baru yang disimpan sebagai &quot;Bayar Nanti&quot; akan muncul di sini.
                </p>
              </div>
            </div>
          ) : (
            openBills.map(bill => {
              const isExpanded = expandedId === bill.id;
              const penandaText = bill.penanda || bill.meja || bill.nama_pelanggan || 'Pesanan';
              const totalItems = bill.items.reduce((s, it) => s + it.qty, 0);
              const serviceMode = getOrderServiceMode(penandaText, bill.items);

              return (
                <div
                  key={bill.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-soft-sm overflow-hidden transition-all hover:border-amber-300"
                >
                  {/* Card Main Row */}
                  <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* Left: Penanda & Customer (clickable to expand/collapse items) */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(bill.id)}
                      className="flex items-center space-x-3 text-left flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 flex flex-col items-center justify-center shrink-0 px-1">
                        <span className="text-[8px] font-extrabold uppercase tracking-wider leading-none">Penanda</span>
                        <span className="text-[11px] font-black font-mono mt-0.5 leading-tight text-center truncate max-w-full">
                          {bill.penanda || bill.meja || '#'}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center flex-wrap gap-1.5">
                          <h4 className="font-extrabold text-sm text-slate-900 truncate">
                            🏷️ {penandaText}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold shrink-0 ${
                            serviceMode === 'bungkus'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : serviceMode === 'mixed'
                                ? 'bg-sky-100 text-sky-900 border border-sky-300'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}>
                            {serviceMode === 'bungkus' ? '🛍️ BUNGKUS' : serviceMode === 'mixed' ? '🔀 CAMPUR' : '🍽️ DI TEMPAT'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700 shrink-0">
                            {totalItems} Menu
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center space-x-2">
                          <span className="truncate">{bill.nama_pelanggan}</span>
                          <span>•</span>
                          <span className="shrink-0">{formatWaktu(bill.waktu)}</span>
                        </div>
                      </div>
                    </button>

                    {/* Right: Total & Primary Actions */}
                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-left sm:text-right mr-1 min-w-[90px]">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Total Tagihan
                        </div>
                        <div className="text-base sm:text-lg font-mono font-black text-amber-800 tabular-nums">
                          {formatRupiah(bill.total)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {/* Tombol Tambah Menu (selalu tampil label di HP & desktop) */}
                        <button
                          type="button"
                          onClick={() => onEditBill(bill, false)}
                          className="px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs transition-colors flex items-center space-x-1 shrink-0 btn-tactile"
                          title="Tambah pesanan menu ke tagihan ini"
                        >
                          <Plus className="w-3.5 h-3.5 text-amber-700" />
                          <span>Tambah</span>
                        </button>

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
                          <span>Bayar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleExpand(bill.id)}
                          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors shrink-0"
                          title={isExpanded ? 'Tutup rincian' : 'Lihat rincian & edit isi'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Expandable Detail Section */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs space-y-2.5 animate-fadeIn">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                          Rincian Pesanan Ini:
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => onEditBill(bill, false)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] flex items-center space-x-1 shadow-2xs"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Tambah Menu Lain</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditBill(bill, true)}
                            className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 font-extrabold text-[11px] flex items-center space-x-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit Jumlah / Catatan</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-1 divide-y divide-slate-200/50">
                        {bill.items.map((it, idx) => {
                          const station = getItemKitchenStation(it);
                          const stationColor = station === 'serabi' ? 'bg-amber-100 text-amber-800' : station === 'wedang' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800';
                          const stationLabel = station === 'serabi' ? 'Serabi' : station === 'wedang' ? 'Wedang' : 'Makanan';

                          return (
                            <div key={idx} className="pt-1 flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${stationColor}`}>
                                  {stationLabel}
                                </span>
                                <span className="font-extrabold text-slate-800 font-mono">
                                  {it.qty}x
                                </span>
                                <span className="font-medium text-slate-800">
                                  {it.nama_menu}
                                </span>
                                {it.temperature && (
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                                    it.temperature === 'dingin' ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {it.temperature === 'dingin' ? '🧊 ES' : '🔥 PANAS'}
                                  </span>
                                )}
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
