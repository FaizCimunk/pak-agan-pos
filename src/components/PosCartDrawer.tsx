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
}

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
}: PosCartDrawerProps) {
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [tempNote, setTempNote] = useState<string>('');

  const totalQty = items.reduce((sum, it) => sum + it.qty, 0);
  const subtotal = items.reduce((sum, it) => sum + (it.menu.harga * it.qty), 0);
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

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/90 shadow-soft-md overflow-hidden">
      
      {/* Top Banner jika sedang Edit Pesanan Belum Bayar */}
      {isEditingOpenBill && (
        <div className="bg-amber-500 text-white px-3.5 py-2 flex items-center justify-between text-xs animate-fadeIn shrink-0">
          <div className="flex items-center space-x-1.5 font-bold truncate">
            <span>✏️</span>
            <span className="truncate">Mengubah: <strong>{penanda || 'Belum Bayar'}</strong> {editingBillInvoice ? `(${editingBillInvoice})` : ''}</span>
          </div>
          {onCancelEditOpenBill && (
            <button
              type="button"
              onClick={onCancelEditOpenBill}
              className="text-[10px] font-black bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-lg transition-colors shrink-0"
              title="Batal mengubah dan kembalikan keranjang"
            >
              Batal Edit
            </button>
          )}
        </div>
      )}

      {/* Drawer Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-800 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-800 text-sm">Pesanan Kasir</h2>
            <span className="text-[11px] text-slate-500 font-medium">
              {totalQty} item pesanan terpilih
            </span>
          </div>
        </div>

        {items.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
            title="Kosongkan Keranjang"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Tipe Layanan (Makan Di Sini vs Bungkus) & Penanda Pesanan */}
      {(() => {
        const isBungkus = (penanda || '').toLowerCase().includes('bungkus') || 
                          (penanda || '').toLowerCase().includes('take away') || 
                          (penanda || '').toLowerCase().includes('takeaway') || 
                          (penanda || '').toLowerCase().includes('bawa');
        return (
          <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200/80 space-y-2">
            {/* Toggle 2 Mode Utama: Makan Di Sini vs Bungkus */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  if (isBungkus) {
                    onPenandaChange('No. 01');
                  }
                }}
                className={`py-1.5 px-2 rounded-lg font-extrabold text-[11px] flex items-center justify-center space-x-1.5 transition-all ${
                  !isBungkus
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🍽️</span>
                <span>Makan Di Sini</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!isBungkus) {
                    onPenandaChange('Bungkus #01');
                  }
                }}
                className={`py-1.5 px-2 rounded-lg font-extrabold text-[11px] flex items-center justify-center space-x-1.5 transition-all ${
                  isBungkus
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🛍️</span>
                <span>Bungkus / Take Away</span>
              </button>
            </div>

            {/* Input Penanda & Tombol Cepat */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 flex items-center space-x-1">
                  <Tag className="w-3 h-3 text-amber-600" />
                  <span>{isBungkus ? 'Penanda Bungkus:' : 'Nomor Meja / Nama:'}</span>
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                  isBungkus ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                }`}>
                  {isBungkus ? '🛍️ Bawa Pulang' : '🍽️ Santap Di Toko'}
                </span>
              </div>

              <input
                type="text"
                value={penanda}
                onChange={(e) => onPenandaChange(e.target.value)}
                placeholder={isBungkus ? "Contoh: Bungkus #01 / Kak Rina..." : "Contoh: No. 01 / Meja Depan..."}
                className={`w-full px-3 py-1.5 bg-white rounded-xl border text-xs font-black focus:outline-none focus:ring-2 transition-all font-mono placeholder:font-normal placeholder:text-slate-400 ${
                  isBungkus 
                    ? 'text-amber-950 border-amber-300 focus:ring-amber-500/30 focus:border-amber-500' 
                    : 'text-emerald-950 border-emerald-300 focus:ring-emerald-500/30 focus:border-emerald-600'
                }`}
              />
            </div>

            {/* Quick Tag Pills sesuai mode */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[10px]">
              {(isBungkus 
                ? ['Bungkus #01', 'Bungkus #02', 'Bungkus #03', 'Bungkus #04', 'Bungkus #05', 'Ambil Nanti'] 
                : ['No. 01', 'No. 02', 'No. 03', 'No. 04', 'No. 05', 'No. 06', 'No. 07', 'No. 08']
              ).map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onPenandaChange(tag)}
                  className={`px-2 py-0.5 rounded-lg font-mono font-bold shrink-0 transition-colors ${
                    penanda === tag 
                      ? (isBungkus ? 'bg-amber-600 text-white shadow-2xs' : 'bg-emerald-700 text-white shadow-2xs')
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

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
            const isDrink = getItemKitchenStation(item.menu) === 'wedang';
            const temp = item.temperature || (isDrink ? 'panas' : undefined);

            return (
              <div
                key={`${item.menu.id}-${index}`}
                className="p-3 rounded-2xl bg-slate-50/90 border border-slate-100 hover:border-slate-200 transition-all flex flex-col space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <h4 className="font-extrabold text-xs text-slate-900 leading-snug">
                        {item.menu.nama}
                      </h4>

                      {/* Tombol Toggle Cepat Panas / Es untuk Minuman */}
                      {isDrink && onToggleTemperature && (
                        <button
                          type="button"
                          onClick={() => onToggleTemperature(index)}
                          className={`px-1.5 py-0.2 rounded-md font-black text-[9px] border transition-colors flex items-center space-x-0.5 ${
                            temp === 'dingin'
                              ? 'bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-200'
                              : 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
                          }`}
                          title="Klik untuk mengubah Panas / Es"
                        >
                          <span>{temp === 'dingin' ? '🧊 ES' : '🔥 PANAS'}</span>
                        </button>
                      )}
                    </div>

                    <span className="text-[11px] font-mono font-medium text-slate-500 tabular-nums block mt-0.5">
                      @ {formatRupiah(item.menu.harga)}
                    </span>
                  </div>

                  <span className="font-mono font-black text-xs text-brand-dark tabular-nums">
                    {formatRupiah(item.menu.harga * item.qty)}
                  </span>
                </div>

                {/* Notes Display or Input */}
                {editingNoteIndex === index ? (
                  <div className="flex items-center space-x-1.5 pt-1">
                    <input
                      type="text"
                      value={tempNote}
                      onChange={(e) => setTempNote(e.target.value)}
                      placeholder="Contoh: Manis sedikit, tanpa es..."
                      className="flex-1 px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-brand-primary"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveNote(index)}
                      className="px-2.5 py-1 text-xs font-bold bg-brand-primary text-white rounded-lg"
                    >
                      Simpan
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <button
                      onClick={() => handleStartEditNote(index, item.catatan)}
                      className="flex items-center space-x-1 text-slate-400 hover:text-brand-primary transition-colors italic"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{item.catatan || 'Tambah catatan...'}</span>
                    </button>
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

      {/* Drawer Footer & Checkout Button */}
      <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/90 space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Subtotal ({totalQty} item)</span>
            <span className="font-mono tabular-nums">{formatRupiah(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200/70">
            <span>TOTAL TAGIHAN</span>
            <span className="text-xl font-mono font-extrabold text-brand-dark tabular-nums tracking-tight">
              {formatRupiah(total)}
            </span>
          </div>
        </div>

        {/* Dual Actions: Bayar Nanti vs Bayar Langsung */}
        {!isShiftOpen ? (
          <button
            onClick={onCheckout}
            className="w-full py-3.5 px-4 rounded-xl bg-slate-200 text-slate-400 font-extrabold text-sm cursor-not-allowed"
            disabled
          >
            Buka Shift Terlebih Dahulu
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onSaveOpenBill}
              disabled={items.length === 0}
              className={`py-3 px-2 rounded-xl flex items-center justify-center space-x-1.5 font-extrabold text-xs transition-all btn-tactile ${
                items.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25 active:scale-95'
              }`}
              title="Simpan pesanan untuk dimasak dan dibayar nanti"
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{isEditingOpenBill ? 'Simpan & Tiket Dapur' : 'Bayar Nanti'}</span>
            </button>

            <button
              type="button"
              onClick={onCheckout}
              disabled={items.length === 0}
              className={`py-3 px-2 rounded-xl flex items-center justify-center space-x-1.5 font-extrabold text-xs transition-all btn-tactile ${
                items.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 active:scale-95'
              }`}
              title="Bayar langsung lunas di kasir"
            >
              <span className="truncate">{isEditingOpenBill ? 'Bayar Lunas Sekarang' : 'Bayar Lunas'}</span>
              {items.length > 0 && <ArrowRight className="w-3.5 h-3.5 shrink-0" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
