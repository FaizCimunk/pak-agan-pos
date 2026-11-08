'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Flame, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Cookie, 
  Plus, 
  Heart, 
  Check, 
  X,
  UtensilsCrossed
} from 'lucide-react';
import { MenuItem, KategoriMenu, CartItem } from '@/lib/types';
import { formatRupiah } from '@/lib/utils';
import { getItemKitchenStation } from '@/lib/printer';

interface PosTouchGridProps {
  menuList: MenuItem[];
  kategoriList?: KategoriMenu[];
  onAddToCart: (item: MenuItem, temp?: 'panas' | 'dingin') => void;
  cart?: CartItem[];
}

export default function PosTouchGrid({
  menuList,
  onAddToCart,
  cart = [],
}: PosTouchGridProps) {
  const [selectedKatId, setSelectedKatId] = useState<'all' | 'serabi' | 'minuman' | 'makanan'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tappedItemId, setTappedItemId] = useState<string | null>(null);

  const filteredMenu = useMemo(() => {
    return menuList.filter(item => {
      if (!item.is_active) return false;
      const station = getItemKitchenStation(item);
      const matchesKat = 
        selectedKatId === 'all' ||
        (selectedKatId === 'serabi' && station === 'serabi') ||
        (selectedKatId === 'minuman' && station === 'wedang') ||
        (selectedKatId === 'makanan' && station === 'makanan');

      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesKat;

      const matchesQuery = (item.nama || '').toLowerCase().includes(q) ||
                           (item.kode || '').toLowerCase().includes(q) ||
                           (item.deskripsi || '').toLowerCase().includes(q);
      return matchesKat && matchesQuery;
    });
  }, [menuList, selectedKatId, searchQuery]);

  // Count items per 3 core categories
  const categoryCounts = useMemo(() => {
    let serabi = 0;
    let minuman = 0;
    let makanan = 0;
    menuList.forEach(m => {
      if (m.is_active) {
        const st = getItemKitchenStation(m);
        if (st === 'serabi') serabi++;
        else if (st === 'wedang') minuman++;
        else if (st === 'makanan') makanan++;
      }
    });
    return {
      all: menuList.filter(m => m.is_active).length,
      serabi,
      minuman,
      makanan,
    };
  }, [menuList]);

  // Check how many of this item is already in cart
  const getItemQtyInCart = (menuId: string) => {
    const found = cart.filter(ci => ci.menu.id === menuId);
    return found.reduce((sum, ci) => sum + ci.qty, 0);
  };

  const handleItemClick = (item: MenuItem) => {
    setTappedItemId(item.id);
    onAddToCart(item);
    setTimeout(() => {
      setTappedItemId(null);
    }, 250);
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      
      {/* 1. Baris Pencarian Menu Penuh & Jelas */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-soft-sm flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari Serabi Bawel, Wedang Rempah, STMJ, Jamu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-800 placeholder-slate-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200/80 rounded-full w-5 h-5 flex items-center justify-center transition-colors"
              title="Hapus pencarian"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="hidden sm:flex items-center px-3 py-2 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold shrink-0 border border-emerald-200/60">
          <UtensilsCrossed className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
          <span>{filteredMenu.length} Menu</span>
        </div>
      </div>

      {/* 2. Baris Kategori Menu Sederhana: 3 Kategori Utama (Serabi, Minuman, Makanan) */}
      <div className="grid grid-cols-4 gap-1.5 sm:flex sm:items-center sm:gap-2 select-none">
        
        {/* Semua */}
        <button
          type="button"
          onClick={() => setSelectedKatId('all')}
          className={`flex items-center justify-center sm:justify-start space-x-1.5 px-3 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all btn-tactile ${
            selectedKatId === 'all'
              ? 'bg-emerald-700 text-white shadow-md shadow-emerald-900/20 ring-2 ring-emerald-600/30'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="hidden sm:inline">Semua</span>
          <span className="sm:hidden">Semua</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            selectedKatId === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            {categoryCounts.all}
          </span>
        </button>

        {/* 1. Serabi */}
        <button
          type="button"
          onClick={() => setSelectedKatId('serabi')}
          className={`flex items-center justify-center sm:justify-start space-x-1.5 px-3 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all btn-tactile ${
            selectedKatId === 'serabi'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-900/20 ring-2 ring-amber-500/30'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>🥞</span>
          <span className="truncate">Serabi</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            selectedKatId === 'serabi' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            {categoryCounts.serabi}
          </span>
        </button>

        {/* 2. Minuman */}
        <button
          type="button"
          onClick={() => setSelectedKatId('minuman')}
          className={`flex items-center justify-center sm:justify-start space-x-1.5 px-3 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all btn-tactile ${
            selectedKatId === 'minuman'
              ? 'bg-emerald-700 text-white shadow-md shadow-emerald-900/20 ring-2 ring-emerald-600/30'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>🍵</span>
          <span className="truncate">Minuman</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            selectedKatId === 'minuman' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            {categoryCounts.minuman}
          </span>
        </button>

        {/* 3. Makanan & Camilan */}
        <button
          type="button"
          onClick={() => setSelectedKatId('makanan')}
          className={`flex items-center justify-center sm:justify-start space-x-1.5 px-3 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all btn-tactile ${
            selectedKatId === 'makanan'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20 ring-2 ring-blue-500/30'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>🍲</span>
          <span className="truncate">Makanan</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            selectedKatId === 'makanan' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            {categoryCounts.makanan}
          </span>
        </button>

      </div>

      {/* 3. Grid Menu Kasir Touch Screen */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredMenu.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center bg-white rounded-3xl border border-slate-200 p-8">
            <span className="text-4xl mb-3">🥞</span>
            <p className="text-sm font-bold text-slate-700">Tidak ada menu yang sesuai</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Kata kunci &ldquo;{searchQuery}&rdquo; tidak cocok dengan menu manapun. Silakan reset pencarian.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedKatId('all');
              }}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Tampilkan Semua Menu
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 pb-24">
            {filteredMenu.map(item => {
              const inCartQty = getItemQtyInCart(item.id);
              const isTapped = tappedItemId === item.id;
              const station = getItemKitchenStation(item);
              const isDrink = station === 'wedang';

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`group relative bg-white rounded-2xl border p-3.5 flex flex-col justify-between shadow-soft-sm hover:shadow-soft-md transition-all cursor-pointer btn-tactile select-none ${
                    inCartQty > 0
                      ? 'border-emerald-600 ring-2 ring-emerald-600/30 bg-emerald-50/20'
                      : 'border-slate-200/90 hover:border-emerald-500'
                  } ${isTapped ? 'scale-[0.97] bg-emerald-100/40' : ''}`}
                >
                  {/* Top Row: Category Pill + Code & Status Badges (Tanpa Foto) */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className="flex items-center space-x-1.5">
                      <span className={`px-2 py-0.5 rounded-lg border font-bold text-[10px] ${
                        station === 'serabi' 
                          ? 'bg-amber-50 text-amber-800 border-amber-200' 
                          : station === 'wedang' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        {station === 'serabi' ? '🥞 Serabi' : station === 'wedang' ? '🍵 Minuman' : '🍲 Makanan'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 font-bold">
                        #{item.kode}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      {item.is_favorite && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] font-extrabold flex items-center space-x-0.5">
                          <Heart className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          <span>FAV</span>
                        </span>
                      )}

                      {inCartQty > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black shadow-sm flex items-center space-x-1 animate-scaleIn">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>{inCartQty}x</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info Menu: Nama & Deskripsi Lengkap */}
                  <div className="flex flex-col flex-1 my-1">
                    <h3 className="font-black text-slate-900 text-sm sm:text-base leading-snug group-hover:text-emerald-800 transition-colors">
                      {item.nama}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1.5 leading-relaxed font-medium">
                      {item.deskripsi || 'Resep rempah pilihan khas Pak Agan.'}
                    </p>
                  </div>

                  {/* Footer Row: Harga Besar & Tombol Pilihan Panas / Es untuk Minuman */}
                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 gap-1.5">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Harga</span>
                      <span className="font-mono font-black text-sm sm:text-base text-emerald-950 tabular-nums truncate">
                        {formatRupiah(item.harga)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick(item);
                      }}
                      className={`h-8 px-3 rounded-xl font-extrabold text-xs flex items-center space-x-1 transition-all shadow-sm shrink-0 ${
                        inCartQty > 0
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-200/80'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span className="text-[11px]">{inCartQty > 0 ? `+${inCartQty}` : 'Tambah'}</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
