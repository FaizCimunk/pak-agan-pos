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
    <div className="flex flex-col h-full min-h-0 bg-white rounded-2xl border border-slate-200/90 shadow-soft-md overflow-hidden">
      
      {/* Drawer Header (Menyatu dengan Mode Edit agar menghemat ruang vertikal layar) */}
      <div className={`px-2 py-1.5 sm:py-2 border-b flex items-center justify-between shrink-0 transition-colors ${
        isEditingOpenBill 
          ? 'bg-amber-500 text-white border-amber-600 shadow-xs' 
          : 'bg-slate-50/70 border-slate-100 text-slate-800'
      }`}>
        <div className="flex items-center space-x-1.5 min-w-0">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
            isEditingOpenBill ? 'bg-white/20 text-white' : 'bg-emerald-600/10 text-emerald-800'
          }`}>
            {isEditingOpenBill ? (
              <span className="text-[10px]">✏️</span>
            ) : (
              <ShoppingBag className="w-3 h-3" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className={`font-extrabold text-[11px] sm:text-xs truncate ${isEditingOpenBill ? 'text-white' : 'text-slate-800'}`}>
              {isEditingOpenBill ? `Ubah: ${penanda || 'Belum Bayar'}` : 'Pesanan Kasir'}
            </h2>
            <span className={`text-[9px] font-medium truncate block ${isEditingOpenBill ? 'text-amber-100' : 'text-slate-500'}`}>
              {totalQty} item {isEditingOpenBill && editingBillInvoice ? `• ${editingBillInvoice}` : 'terpilih'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {onCloseMobile && isEditingOpenBill && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden text-[10px] font-black bg-emerald-700 hover:bg-emerald-800 text-white px-2 py-0.5 rounded-lg transition-colors shadow-xs"
              title="Kembali ke daftar menu untuk tambah pesanan"
            >
              + Tambah
            </button>
          )}

          {isEditingOpenBill && onCancelEditOpenBill && (
            <button
              type="button"
              onClick={onCancelEditOpenBill}
              className="text-[10px] font-black bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-lg transition-colors"
              title="Batal mengubah dan kembalikan keranjang"
            >
              Batal
            </button>
          )}

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
              className={`text-xs font-bold flex items-center space-x-1 px-2 py-1 rounded-lg transition-colors ${
                isEditingOpenBill
                  ? 'text-white/80 hover:text-white hover:bg-white/10'
                  : 'text-rose-600 hover:text-rose-700 hover:bg-rose-50'
              }`}
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
              className={`p-1.5 rounded-lg transition-colors ${
                isEditingOpenBill
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
              title="Tutup Keranjang"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Prominent Penanda / Tanda Nama Bar (Ramping & Satu Baris Efisien) */}
      <div className="px-1.5 py-0.5 bg-slate-50 border-b border-slate-200/90 flex items-center gap-1 shrink-0">
        <div className="relative flex-1 min-w-[70px] max-w-[100px] sm:max-w-[125px] shrink-0">
          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-amber-600">
            <Tag className="w-2.5 h-2.5" />
          </div>
          <input
            type="text"
            value={penanda}
            onChange={(e) => onPenandaChange(e.target.value)}
            placeholder="Meja/Nama..."
            className="w-full pl-5 pr-4 py-0.5 bg-white rounded-lg border border-slate-300 font-extrabold text-[10px] sm:text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs placeholder:font-normal placeholder:text-slate-400"
          />
          {penanda ? (
            <button
              type="button"
              onClick={() => onPenandaChange('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
              title="Bersihkan nama / nomor meja"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          ) : null}
        </div>

        {/* Quick Table / Service Mode Chips (Horizontal Scroll Satu Baris) */}
        <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none flex-1 py-0.5">
          {['01', '02', '03', '04', '05', '06', '07', '08', 'Bungkus'].map(chip => {
            const isMatch = chip === 'Bungkus' ? penanda.toLowerCase().includes('bungkus') : penanda === `No. ${chip}`;
            return (
              <button
                key={chip}
                type="button"
                onClick={() => onPenandaChange(chip === 'Bungkus' ? 'Bungkus' : `No. ${chip}`)}
                className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold whitespace-nowrap shrink-0 transition-all ${
                  isMatch
                    ? 'bg-emerald-700 text-white shadow-2xs ring-1 ring-emerald-800'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {chip === 'Bungkus' ? '🛍️ Bungkus' : chip}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cart Items List (min-h-0 prevents flex collapse, compact cards guarantee 100% visibility) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-1.5 sm:p-2 space-y-1.5">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-8">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-2">
              <ShoppingBag className="w-6 h-6 text-slate-300" />
            </div>
            <p className="font-bold text-slate-600 text-xs">Keranjang Masih Kosong</p>
            <p className="text-[11px] text-slate-400 max-w-[180px] mt-0.5">
              Sentuh menu di katalog untuk menambah ke pesanan
            </p>
          </div>
        ) : (
          items.map((item, index) => {
            const station = getItemKitchenStation(item.menu);
            const isDrink = station === 'wedang';
            const unitPrice = getCartItemUnitPrice(item);
            const lineSubtotal = unitPrice * item.qty;
            const quickTags = ['Bungkus', 'Makan Sini'];

            return (
              <div
                key={`${item.menu.id}-${index}`}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 transition-all flex flex-col gap-0.5 shadow-2xs"
              >
                {/* Top Row: Name, Temp/Variant, Subtotal & Trash */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                    {isDrink && item.temperature && (
                      <button
                        type="button"
                        onClick={() => onToggleTemperature && onToggleTemperature(index)}
                        className={`inline-flex items-center px-1.5 py-0.2 rounded font-extrabold text-[9px] shrink-0 border cursor-pointer ${
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
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded font-extrabold text-[9px] shrink-0 bg-purple-100 text-purple-900 border border-purple-200">
                        🏷️ {item.varian_nama}
                      </span>
                    )}
                    <h4 className="font-black text-xs text-slate-900 truncate leading-tight">
                      {item.menu.nama}
                    </h4>
                  </div>

                  {/* Subtotal & Delete */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className="font-mono font-black text-xs text-brand-dark tabular-nums">
                      {formatRupiah(lineSubtotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(index)}
                      className="text-slate-400 hover:text-rose-500 p-0.5 transition-colors"
                      title="Hapus menu ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Middle Row: Stepper + Unit Price + Quick Bungkus & Note Button */}
                <div className="flex items-center justify-between gap-1 pt-0.5">
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {/* Stepper */}
                    <div className="flex items-center space-x-1 bg-white px-1 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(index, -1)}
                        className="w-4 h-4 rounded flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-90 transition-all font-black"
                        title="Kurangi 1"
                      >
                        <Minus className="w-2.5 h-2.5 stroke-[3]" />
                      </button>
                      <span className="font-mono font-black text-xs text-slate-900 w-4 text-center tabular-nums">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(index, 1)}
                        className="w-4 h-4 rounded flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-90 transition-all font-black"
                        title="Tambah 1"
                      >
                        <Plus className="w-2.5 h-2.5 stroke-[3]" />
                      </button>
                    </div>

                    <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                      @{formatRupiah(unitPrice)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQuickAppendNote(index, 'Bungkus')}
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                        (item.catatan || '').toLowerCase().includes('bungkus')
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                      title="Tandai Bungkus"
                    >
                      Bungkus
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEditNote(index, item.catatan || '')}
                      className="px-1.5 py-0.2 rounded text-[9px] font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 shrink-0 cursor-pointer flex items-center space-x-0.5"
                      title="Tambah / ubah catatan"
                    >
                      <Edit3 className="w-2 h-2" />
                      <span>{item.catatan ? 'Edit' : '+ Catatan'}</span>
                    </button>
                  </div>
                </div>

                {/* Active note display if exists */}
                {item.catatan && editingNoteIndex !== index && (
                  <div className="flex items-center justify-between bg-amber-50/80 border border-amber-200 rounded px-1.5 py-0.5 text-[10px]">
                    <span className="text-amber-900 font-bold truncate">
                      📝 {item.catatan}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateNotes(index, '')}
                      className="text-rose-500 hover:text-rose-700 font-bold px-1 text-[10px]"
                      title="Hapus catatan"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Note input if editing */}
                {editingNoteIndex === index && (
                  <div className="flex items-center space-x-1 pt-0.5">
                    <input
                      type="text"
                      value={tempNote}
                      onChange={(e) => setTempNote(e.target.value)}
                      placeholder="Catatan pesanan..."
                      className="flex-1 px-2 py-0.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-brand-primary"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveNote(index)}
                      className="px-2 py-0.5 text-xs font-bold bg-brand-primary text-white rounded cursor-pointer"
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingNoteIndex(null)}
                      className="px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-200 rounded cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Drawer Footer & Checkout Button (Compact & Always 100% Visible) */}
      <div className="p-1.5 sm:p-2 border-t border-slate-100 bg-slate-50/90 space-y-1 shrink-0">
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900 px-0.5">
          <div className="flex items-center space-x-1">
            <span className="font-extrabold text-slate-800 text-[11px] sm:text-xs">TOTAL:</span>
            <span className="text-[10px] text-slate-500 font-medium">({totalQty} item)</span>
          </div>
          <span className="text-sm sm:text-base font-mono font-black text-brand-dark tabular-nums tracking-tight">
            {formatRupiah(total)}
          </span>
        </div>

        {/* Dual Actions: Bayar Nanti vs Bayar Langsung */}
        {!isShiftOpen ? (
          <button
            onClick={onCheckout}
            className="w-full py-1.5 px-3 rounded-xl bg-slate-200 text-slate-400 font-extrabold text-xs cursor-not-allowed"
            disabled
          >
            Buka Shift Terlebih Dahulu
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={onSaveOpenBill}
              disabled={items.length === 0}
              className={`py-1.5 sm:py-2 px-2 rounded-xl flex items-center justify-center space-x-1 font-extrabold text-xs transition-all btn-tactile ${
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
              className={`py-1.5 sm:py-2 px-2 rounded-xl flex items-center justify-center space-x-1 font-extrabold text-xs transition-all btn-tactile ${
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
