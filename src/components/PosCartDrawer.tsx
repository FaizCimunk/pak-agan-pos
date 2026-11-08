'use client';

import React, { useState } from 'react';
import { Trash2, Plus, Minus, Edit3, ShoppingBag, ArrowRight, Clock } from 'lucide-react';
import { CartItem } from '@/lib/types';
import { formatRupiah } from '@/lib/utils';

interface PosCartDrawerProps {
  items: CartItem[];
  customerName: string;
  onCustomerNameChange: (val: string) => void;
  tableName: string;
  onTableNameChange: (val: string) => void;
  onUpdateQty: (menuId: string, delta: number) => void;
  onUpdateNotes: (menuId: string, notes: string) => void;
  onRemoveItem: (menuId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  onSaveOpenBill: () => void;
  isShiftOpen: boolean;
}

export default function PosCartDrawer({
  items,
  customerName,
  onCustomerNameChange,
  tableName,
  onTableNameChange,
  onUpdateQty,
  onUpdateNotes,
  onRemoveItem,
  onClearCart,
  onCheckout,
  onSaveOpenBill,
  isShiftOpen,
}: PosCartDrawerProps) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState<string>('');

  const totalQty = items.reduce((sum, it) => sum + it.qty, 0);
  const subtotal = items.reduce((sum, it) => sum + (it.menu.harga * it.qty), 0);
  const total = subtotal;

  const handleStartEditNote = (item: CartItem) => {
    setEditingNoteId(item.menu.id);
    setTempNote(item.catatan || '');
  };

  const handleSaveNote = (menuId: string) => {
    onUpdateNotes(menuId, tempNote);
    setEditingNoteId(null);
    setTempNote('');
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/90 shadow-soft-md overflow-hidden">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-800 text-sm">Pesanan Kasir</h2>
            <span className="text-[11px] text-slate-500 font-medium">
              {totalQty} Minuman terpilih
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

      {/* Table & Customer Inputs */}
      <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
              Nomor Meja
            </label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => onTableNameChange(e.target.value)}
              placeholder="Contoh: Meja 03..."
              className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
              Nama Pemesan
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              placeholder="Pelanggan Walk-in..."
              className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
            />
          </div>
        </div>

        {/* Quick Table Buttons */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-0.5 no-scrollbar text-[10px]">
          {['Meja 1', 'Meja 2', 'Meja 3', 'Meja 4', 'Meja 5', 'Meja 6', 'Meja 7', 'Meja 8', 'Bungkus'].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => onTableNameChange(m)}
              className={`px-2 py-0.5 rounded font-mono font-bold shrink-0 transition-colors ${
                tableName === m 
                  ? 'bg-amber-600 text-white' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <ShoppingBag className="w-7 h-7 text-slate-300" />
            </div>
            <p className="font-bold text-slate-600 text-sm">Keranjang Masih Kosong</p>
            <p className="text-xs text-slate-400 max-w-[200px] mt-1">
              Sentuh menu minuman herbal di sebelah kiri untuk menambah ke pesanan
            </p>
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.menu.id}
              className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-all flex flex-col space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-2">
                  <h4 className="font-bold text-xs text-slate-900 leading-snug">
                    {item.menu.nama}
                  </h4>
                  <span className="text-[11px] font-mono font-medium text-slate-500 tabular-nums">
                    @ {formatRupiah(item.menu.harga)}
                  </span>
                </div>

                <span className="font-mono font-bold text-xs text-brand-dark tabular-nums">
                  {formatRupiah(item.menu.harga * item.qty)}
                </span>
              </div>

              {/* Notes Display or Input */}
              {editingNoteId === item.menu.id ? (
                <div className="flex items-center space-x-1.5 pt-1">
                  <input
                    type="text"
                    value={tempNote}
                    onChange={(e) => setTempNote(e.target.value)}
                    placeholder="Contoh: Panas, manis sedikit..."
                    className="flex-1 px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-brand-primary"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveNote(item.menu.id)}
                    className="px-2 py-1 text-xs font-bold bg-brand-primary text-white rounded"
                  >
                    Simpan
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <button
                    onClick={() => handleStartEditNote(item)}
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
                  onClick={() => onRemoveItem(item.menu.id)}
                  className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                  title="Hapus"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                  <button
                    onClick={() => onUpdateQty(item.menu.id, -1)}
                    className="w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition-all font-bold"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono font-extrabold text-xs text-slate-800 w-5 text-center tabular-nums">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => onUpdateQty(item.menu.id, 1)}
                    className="w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition-all font-bold"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Drawer Footer & Checkout Button */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/80 space-y-3">
        <div className="space-y-1.5">
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
              title="Simpan pesanan meja untuk dimasak dan dibayar nanti"
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Bayar Nanti</span>
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
              <span>Bayar Lunas</span>
              {items.length > 0 && <ArrowRight className="w-3.5 h-3.5 shrink-0" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
