'use client';

import React, { useState } from 'react';
import { Trash2, Plus, Minus, Edit3, ShoppingBag, ArrowRight, Clock, Tag, X } from 'lucide-react';
import { CartItem } from '@/lib/types';
import { formatRupiah } from '@/lib/utils';
import { getItemKitchenStation } from '@/lib/printer';

interface PosCartDrawerProps {
  items: CartItem[];
  customerName?: string;
  onCustomerNameChange?: (val: string) => void;
  tableName?: string;
  onTableNameChange?: (val: string) => void;
  penanda: string;
  onPenandaChange: (val: string) => void;
  onUpdateQty: (itemIndex: number, delta: number) => void;
  onUpdateNotes: (itemIndex: number, notes: string) => void;
  onToggleTemperature?: (itemIndex: number) => void;
  onRemoveItem: (itemIndex: number) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  onSaveOpenBill: () => void;
  isShiftOpen: boolean;
  isEditingOpenBill?: boolean;
  editingBillInvoice?: string;
  onCancelEditOpenBill?: () => void;
  onCloseMobile?: () => void;
}

export const getCartItemUnitPrice = (it: CartItem): number => {
  if (it.custom_harga && it.custom_harga > 0) return it.custom_harga;
  if (it.temperature === 'dingin' && it.menu.harga_es && it.menu.harga_es > 0) return it.menu.harga_es;
  return it.menu.harga;
};

export default function PosCartDrawer({
  items,
  penanda,
  onPenandaChange,
  onUpdateQty,
  onUpdateNotes,
  onToggleTemperature,
  onRemoveItem,
  onClearCart,
  onCheckout,
  onSaveOpenBill,
  isShiftOpen,
  isEditingOpenBill = false,
  editingBillInvoice,
  onCancelEditOpenBill,
  onCloseMobile,
}: PosCartDrawerProps) {
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [tempNote, setTempNote] = useState<string>('');

  const totalQty = items.reduce((sum, it) => sum + it.qty, 0);
  const subtotal = items.reduce((sum, it) => sum + (getCartItemUnitPrice(it) * it.qty), 0);
  const total = subtotal;

  const handleStartEditNote = (index: number, currentNote?: string) => {
    setEditingNoteIndex(index);
    setTempNote(currentNote || '');
  };

  const handleSaveNote = (index: number) => {
    onUpdateNotes(index, tempNote);
    setEditingNoteIndex(null);
    setTempNote('');
  };

  const handleQuickAppendNote = (index: number, tag: string) => {
    const current = items[index]?.catatan?.trim() || '';
    if (!current) {
      onUpdateNotes(index, tag);
      return;
    }

    // Mutual exclusive pairs: Bungkus vs Makan Sini
    if (tag === 'Bungkus' && current.toLowerCase().includes('makan sini')) {
      const replaced = current.replace(/makan sini/gi, 'Bungkus').replace(/,\s*,/g, ', ').trim();
      onUpdateNotes(index, replaced);
      return;
    }
    if (tag === 'Makan Sini' && current.toLowerCase().includes('bungkus')) {
      const replaced = current.replace(/bungkus/gi, 'Makan Sini').replace(/,\s*,/g, ', ').trim();
      onUpdateNotes(index, replaced);
      return;
    }

    if (!current.toLowerCase().includes(tag.toLowerCase())) {
      onUpdateNotes(index, `${current}, ${tag}`);
    } else {
      // Toggle off if clicked again
      const parts = current.split(',').map(p => p.trim()).filter(p => p.toLowerCase() !== tag.toLowerCase());
      onUpdateNotes(index, parts.join(', '));
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/90 shadow-soft-md overflow-hidden">
      
      {/* Top Banner jika sedang Edit Pesanan Belum Bayar */}
      {isEditingOpenBill && (
        <div className="bg-amber-500 text-white px-3.5 py-2 flex items-center justify-between gap-2 text-xs animate-fadeIn shrink-0">
          <div className="flex items-center space-x-1.5 font-bold truncate min-w-0">
            <span>✏️</span>
            <span className="truncate">Mengubah: <strong>{penanda || 'Belum Bayar'}</strong> {editingBillInvoice ? `(${editingBillInvoice})` : ''}</span>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden text-[10px] font-black bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 rounded-lg transition-colors shadow-xs"
                title="Kembali ke daftar menu untuk tambah pesanan"
              >
                + Tambah Menu
              </button>
            )}
            {onCancelEditOpenBill && (
              <button
                type="button"
                onClick={onCancelEditOpenBill}
                className="text-[10px] font-black bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-lg transition-colors"
                title="Batal mengubah dan kembalikan keranjang"
              >
                Batal Edit
              </button>
            )}
          </div>
        </div>
      )}

      {/* Drawer Header */}
      <div className="p-3 sm:p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-600/10 text-emerald-800 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-slate-800 text-xs sm:text-sm truncate">Pesanan Kasir</h2>
            <span className="text-[10px] text-slate-500 font-medium truncate block">
              {totalQty} item pesanan terpilih
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {onCloseMobile && !isEditingOpenBill && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden text-[11px] text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 font-extrabold flex items-center space-x-1 px-2.5 py-1 rounded-lg transition-colors"
              title="Kembali pilih menu lain"
            >
              <Plus className="w-3 h-3" />
              <span>Tambah Menu</span>
            </button>
          )}

          {items.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
              title="Kosongkan Keranjang"
            >
              <Trash2 className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
              title="Tutup Keranjang"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sleek Compact Penanda / Tanda Nama Bar (Hemat Tempat, Kasir Leluasa Scroll) */}
      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200/80 flex items-center gap-1.5 shrink-0">
        <div className="flex items-center space-x-1 shrink-0 text-slate-600">
          <Tag className="w-3 h-3 text-amber-600" />
          <span className="text-[10px] font-black uppercase tracking-tight">Tanda / Nama:</span>
        </div>

        <input
          type="text"
          value={penanda}
          onChange={(e) => onPenandaChange(e.target.value)}
          placeholder="Tanda / nama pemesan (No. 01 / Pak Budi / dll)..."
          className="flex-1 min-w-0 px-2 py-0.5 bg-white rounded-lg border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs placeholder:font-normal placeholder:text-slate-400"
        />

        {/* Quick Numbers */}
        <div className="flex items-center space-x-1 shrink-0 overflow-x-auto no-scrollbar max-w-[130px] sm:max-w-none">
          {['01', '02', '03', '04', '05', '06', '07', '08'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => onPenandaChange(`No. ${num}`)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 transition-colors ${
                penanda === `No. ${num}`
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <ShoppingBag className="w-7 h-7 text-slate-300" />
            </div>
            <p className="font-bold text-slate-600 text-sm">Keranjang Masih Kosong</p>
            <p className="text-xs text-slate-400 max-w-[200px] mt-1">
              Sentuh menu di sebelah kiri untuk menambah ke pesanan
            </p>
          </div>
        ) : (
          items.map((item, index) => {
            const station = getItemKitchenStation(item.menu);
            const isDrink = station === 'wedang';
            const unitPrice = getCartItemUnitPrice(item);
            const lineSubtotal = unitPrice * item.qty;

            // Cukup 2 pilihan cepat (Bungkus & Makan Sini) serta tulis catatan sendiri
            const quickTags = ['Bungkus', 'Makan Sini'];

            return (
              <div
                key={`${item.menu.id}-${index}`}
                className="p-3 rounded-2xl bg-slate-50/90 border border-slate-100 hover:border-slate-200 transition-all flex flex-col space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      {isDrink && item.temperature && (
                        <button
                          type="button"
                          onClick={() => onToggleTemperature && onToggleTemperature(index)}
                          className={`inline-flex items-center px-1.5 py-0.2 rounded-md font-extrabold text-[9px] shrink-0 border cursor-pointer ${
                            item.temperature === 'dingin'
                              ? 'bg-sky-100 text-sky-900 border-sky-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}
                          title="Klik untuk ubah suhu Panas / Es"
                        >
                          {item.temperature === 'dingin' ? '🧊 Es' : '🔥 Panas'}
                        </button>
                      )}
                      {item.varian_nama && (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-md font-extrabold text-[9px] shrink-0 bg-purple-100 text-purple-900 border border-purple-200">
                          🏷️ {item.varian_nama}
                        </span>
                      )}
                      <h4 className="font-extrabold text-xs text-slate-900 leading-snug">
                        {item.menu.nama}
                      </h4>
                    </div>

                    <span className="text-[11px] font-mono font-medium text-slate-500 tabular-nums block mt-0.5">
                      @ {formatRupiah(unitPrice)}
                    </span>
                  </div>

                  <span className="font-mono font-black text-xs text-brand-dark tabular-nums">
                    {formatRupiah(lineSubtotal)}
                  </span>
                </div>

                {/* Notes Display or Input with Quick Note Pills Sesuai Kategori */}
                {editingNoteIndex === index ? (
                  <div className="flex items-center space-x-1.5 pt-1">
                    <input
                      type="text"
                      value={tempNote}
                      onChange={(e) => setTempNote(e.target.value)}
                      placeholder="Contoh: Bungkus, sedikit gula..."
                      className="flex-1 px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-brand-primary"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveNote(index)}
                      className="px-2.5 py-1 text-xs font-bold bg-brand-primary text-white rounded-lg cursor-pointer"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingNoteIndex(null)}
                      className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-0.5">
                    {item.catatan ? (
                      <div className="flex items-center justify-between bg-amber-50/90 border border-amber-300/80 rounded-lg px-2 py-1">
                        <span className="text-[11px] font-black text-amber-950 flex items-center space-x-1">
                          <span>📝</span>
                          <span className="font-mono uppercase tracking-tight">{item.catatan}</span>
                        </span>
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditNote(index, item.catatan)}
                            className="p-1 text-amber-700 hover:text-amber-900 cursor-pointer"
                            title="Ubah catatan"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateNotes(index, '')}
                            className="p-1 text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer"
                            title="Hapus catatan"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {/* Catatan Cepat: Cukup Bungkus, Makan Sini & Tulis Catatan Sendiri */}
                    <div className="flex items-center space-x-1.5 text-[10px] pt-0.5">
                      {quickTags.map(tag => {
                        const isSelected = (item.catatan || '').toLowerCase().includes(tag.toLowerCase());
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleQuickAppendNote(index, tag)}
                            className={`px-2 py-0.5 rounded-lg font-bold shrink-0 transition-colors cursor-pointer flex items-center space-x-1 ${
                              isSelected
                                ? (tag === 'Bungkus' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-emerald-700 text-white shadow-2xs')
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>{tag === 'Bungkus' ? '🛍️' : '🍽️'}</span>
                            <span>{tag}</span>
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => handleStartEditNote(index, item.catatan || '')}
                        className="px-2 py-0.5 rounded-lg font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 shrink-0 cursor-pointer flex items-center space-x-1"
                        title="Tambah atau lengkapi catatan pesanan"
                      >
                        <Plus className="w-2.5 h-2.5 text-emerald-700" />
                        <span>Tambah Catatan</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Stepper & Delete */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                  <button
                    onClick={() => onRemoveItem(index)}
                    className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-2xs">
                    <button
                      onClick={() => onUpdateQty(index, -1)}
                      className="w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition-all font-bold"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono font-black text-xs text-slate-800 w-5 text-center tabular-nums">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => onUpdateQty(index, 1)}
                      className="w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition-all font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Drawer Footer & Checkout Button (Compact & Always 100% Visible) */}
      <div className="p-2.5 sm:p-3 border-t border-slate-100 bg-slate-50/90 space-y-2 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Subtotal ({totalQty} item)</span>
            <span className="font-mono tabular-nums">{formatRupiah(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900 pt-1 border-t border-slate-200/70">
            <span>TOTAL TAGIHAN</span>
            <span className="text-lg sm:text-xl font-mono font-extrabold text-brand-dark tabular-nums tracking-tight">
              {formatRupiah(total)}
            </span>
          </div>
        </div>

        {/* Dual Actions: Bayar Nanti vs Bayar Langsung */}
        {!isShiftOpen ? (
          <button
            onClick={onCheckout}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-200 text-slate-400 font-extrabold text-xs cursor-not-allowed"
            disabled
          >
            Buka Shift Terlebih Dahulu
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={onSaveOpenBill}
              disabled={items.length === 0}
              className={`py-2.5 px-2 rounded-xl flex items-center justify-center space-x-1 font-extrabold text-xs transition-all btn-tactile ${
                items.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25 active:scale-95'
              }`}
              title="Simpan pesanan untuk dimasak dan dibayar nanti"
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{isEditingOpenBill ? 'Simpan & Tiket' : 'Bayar Nanti'}</span>
            </button>

            <button
              type="button"
              onClick={onCheckout}
              disabled={items.length === 0}
              className={`py-2.5 px-2 rounded-xl flex items-center justify-center space-x-1 font-extrabold text-xs transition-all btn-tactile ${
                items.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 active:scale-95'
              }`}
              title="Bayar langsung lunas di kasir"
            >
              <span className="truncate">{isEditingOpenBill ? 'Bayar Lunas' : 'Bayar Lunas'}</span>
              {items.length > 0 && <ArrowRight className="w-3.5 h-3.5 shrink-0" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
