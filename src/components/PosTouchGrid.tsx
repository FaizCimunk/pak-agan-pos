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
  onAddToCart: (item: MenuItem, temp?: 'panas' | 'dingin', customHarga?: number, varianNama?: string, customHpp?: number) => void;
  cart?: CartItem[];
  isLandscape?: boolean;
}

export default function PosTouchGrid({
  menuList,
  onAddToCart,
  cart = [],
  isLandscape = false,
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

  const handleItemClick = (item: MenuItem, temp?: 'panas' | 'dingin', customHarga?: number, varianNama?: string, customHpp?: number) => {
    setTappedItemId(item.id);
    onAddToCart(item, temp, customHarga, varianNama, customHpp);
    setTimeout(() => {
      setTappedItemId(null);
    }, 200);
  };

  return (
    <div className={`flex flex-col h-full ${isLandscape ? 'space-y-1.5' : 'space-y-2'}`}>
      
      {/* 1. Baris Pencarian Menu Penuh & Jelas */}
      <div className={`bg-white ${isLandscape ? 'p-1.5 sm:p-2 rounded-xl' : 'p-2 sm:p-2.5 rounded-2xl'} border border-slate-200/90 shadow-soft-sm flex items-center gap-2 shrink-0`}>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari Serabi Bawel, Wedang Rempah, STMJ, Makanan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-8 ${isLandscape ? 'py-1 text-xs' : 'py-1.5 text-xs sm:text-sm'} bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-800 placeholder-slate-400 transition-all`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200/80 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
              title="Hapus pencarian"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        <div className="hidden sm:flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold shrink-0 border border-emerald-200/60">
          <UtensilsCrossed className="w-3.5 h-3.5 mr-1 text-emerald-600" />
          <span>{filteredMenu.length} Menu</span>
        </div>
      </div>

      {/* 2. Baris Kategori Menu Sederhana: 3 Kategori Utama (Serabi, Minuman, Makanan) */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 select-none shrink-0">
        
        {/* Semua */}
        <button
          type="button"
          onClick={() => setSelectedKatId('all')}
          className={`flex items-center space-x-1.5 ${isLandscape ? 'px-2 py-1 text-[11px]' : 'px-2.5 sm:px-3 py-1.5 text-xs'} rounded-xl font-extrabold whitespace-nowrap shrink-0 transition-all btn-tactile ${
            selectedKatId === 'all'
              ? 'bg-emerald-700 text-white shadow-md shadow-emerald-900/20 ring-2 ring-emerald-600/30'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>Semua</span>
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
          className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 transition-all btn-tactile ${
            selectedKatId === 'serabi'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-900/20 ring-2 ring-amber-500/30'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>🥞</span>
          <span>Serabi</span>
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
          className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 transition-all btn-tactile ${
            selectedKatId === 'minuman'
              ? 'bg-emerald-700 text-white shadow-md shadow-emerald-900/20 ring-2 ring-emerald-600/30'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>🍵</span>
          <span>Minuman</span>
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
          className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 transition-all btn-tactile ${
            selectedKatId === 'makanan'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20 ring-2 ring-blue-500/30'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>🍲</span>
          <span>Makanan</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            selectedKatId === 'makanan' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            {categoryCounts.makanan}
          </span>
        </button>

      </div>

      {/* 3. Grid Menu Kasir Touch Screen (Compact & Tidak Perlu Banyak Scroll) */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredMenu.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-center bg-white rounded-3xl border border-slate-200 p-6">
            <span className="text-3xl mb-2">🥞</span>
            <p className="text-xs font-bold text-slate-700">
              {menuList.length === 0 ? 'Belum ada menu untuk cabang ini' : 'Tidak ada menu yang sesuai'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
              {menuList.length === 0
                ? 'Silakan isi & aktifkan menu cabang ini dari Dashboard Pusat → Menu Kasir Cabang.'
                : searchQuery
                  ? `Kata kunci "${searchQuery}" tidak cocok.`
                  : 'Coba pilih kategori lain.'}
            </p>
            {menuList.length > 0 && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedKatId('all');
                }}
                className="mt-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Reset Menu
              </button>
            )}
          </div>
        ) : (
          <div className={`grid ${isLandscape ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'} gap-2 pb-3`}>
            {filteredMenu.map(item => {
              const inCartQty = getItemQtyInCart(item.id);
              const isTapped = tappedItemId === item.id;
              const station = getItemKitchenStation(item);
              const isDrink = station === 'wedang';
              const hasDiffIce = isDrink && item.suhu_mode === 'beda_harga_es' && !!item.harga_es && item.harga_es > 0;
              const isKhususPanas = isDrink && item.suhu_mode === 'khusus_panas';
              const isKhususEs = isDrink && item.suhu_mode === 'khusus_es';
              const hasFoodVariations = !isDrink && !!item.has_variasi_harga && !!item.varian_harga_1 && !!item.varian_harga_2;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    // Tap on card body: if food variation, add varian 1; if simple drink, add directly
                    if (hasFoodVariations) {
                      handleItemClick(item, undefined, item.varian_harga_1, item.varian_nama_1 || 'Reguler', item.varian_hpp_1 !== undefined ? item.varian_hpp_1 : item.hpp);
                    } else if (!hasDiffIce && !isKhususEs) {
                      handleItemClick(item, isKhususPanas ? 'panas' : undefined, item.harga, undefined, item.hpp);
                    } else if (isKhususEs) {
                      handleItemClick(item, 'dingin', item.harga_es || item.harga, undefined, item.hpp_es !== undefined ? item.hpp_es : item.hpp);
                    }
                  }}
                  className={`group relative bg-white rounded-2xl border p-2 sm:p-2.5 flex flex-col justify-between shadow-soft-sm hover:shadow-soft-md transition-all select-none ${
                    inCartQty > 0
                      ? 'border-emerald-600 ring-2 ring-emerald-600/30 bg-emerald-50/20'
                      : 'border-slate-200/90 hover:border-emerald-500'
                  } ${isTapped ? 'scale-[0.98] bg-emerald-100/40' : ''}`}
                >
                  {/* Top Row: Category Pill + Code & Status Badges */}
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center space-x-1 min-w-0">
                      <span className={`px-1.5 py-0.2 rounded-md border font-extrabold text-[8px] sm:text-[9px] shrink-0 ${
                        station === 'serabi' 
                          ? 'bg-amber-50 text-amber-900 border-amber-200' 
                          : station === 'wedang' 
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                          : 'bg-blue-50 text-blue-900 border-blue-200'
                      }`}>
                        {station === 'serabi' ? '🥞 Serabi' : station === 'wedang' ? '🍵 Minuman' : '🍲 Makanan'}
                      </span>
                      <span className="font-mono text-[8px] text-slate-400 font-bold truncate">
                        #{item.kode}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      {item.is_favorite && (
                        <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[8px] font-black">
                          ★
                        </span>
                      )}

                      {inCartQty > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[9px] font-black shadow-2xs flex items-center space-x-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                          <span>{inCartQty}x</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info Menu: Nama Menu Tebal & Jelas */}
                  <div className="flex flex-col flex-1 my-0.5">
                    <h3 className="font-black text-slate-900 text-xs sm:text-[13px] leading-tight group-hover:text-emerald-800 transition-colors line-clamp-2">
                      {item.nama}
                    </h3>
                  </div>

                  {/* Footer Row: Sesuai Karakter Suhu & Variasi Porsi */}
                  <div className="pt-1.5 mt-1 border-t border-slate-100">
                    {/* KASUS 1: MAKANAN / SERABI DENGAN 2 VARIASI PORSI (Owner Bebas Tentukan Nama & Harga) */}
                    {hasFoodVariations ? (
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemClick(item, undefined, item.varian_harga_1, item.varian_nama_1 || 'Reguler', item.varian_hpp_1 !== undefined ? item.varian_hpp_1 : item.hpp);
                          }}
                          className="py-1 px-1 rounded-xl bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-950 border border-amber-300 transition-all text-center cursor-pointer shadow-2xs active:scale-95"
                          title={`Tambah ${item.varian_nama_1 || 'Reguler'}`}
                        >
                          <span className="block text-[8px] font-extrabold text-amber-800 group-hover:text-white uppercase leading-none truncate">
                            🏷️ {item.varian_nama_1 || 'Reguler'}
                          </span>
                          <span className="font-mono font-black text-[10px] sm:text-[11px] leading-tight block mt-0.5">
                            {formatRupiah(item.varian_harga_1!)}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemClick(item, undefined, item.varian_harga_2, item.varian_nama_2 || 'Jumbo', item.varian_hpp_2 !== undefined ? item.varian_hpp_2 : item.hpp);
                          }}
                          className="py-1 px-1 rounded-xl bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-950 border border-purple-300 transition-all text-center cursor-pointer shadow-2xs active:scale-95"
                          title={`Tambah ${item.varian_nama_2 || 'Jumbo'}`}
                        >
                          <span className="block text-[8px] font-extrabold text-purple-800 group-hover:text-white uppercase leading-none truncate">
                            ✨ {item.varian_nama_2 || 'Jumbo'}
                          </span>
                          <span className="font-mono font-black text-[10px] sm:text-[11px] leading-tight block mt-0.5">
                            {formatRupiah(item.varian_harga_2!)}
                          </span>
                        </button>
                      </div>
                    ) : hasDiffIce ? (
                      /* KASUS 2: MINUMAN DENGAN BEDA HARGA ES (2 Tombol Cepat) */
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemClick(item, 'panas', item.harga, undefined, item.hpp);
                          }}
                          className="py-1 px-1 rounded-xl bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-950 border border-amber-300 transition-all text-center cursor-pointer shadow-2xs active:scale-95"
                          title="Tambah varian Panas"
                        >
                          <span className="block text-[8px] font-extrabold text-amber-700 group-hover:text-white uppercase leading-none">
                            🔥 Panas
                          </span>
                          <span className="font-mono font-black text-[10px] sm:text-[11px] leading-tight block mt-0.5">
                            {formatRupiah(item.harga)}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemClick(item, 'dingin', item.harga_es, undefined, item.hpp_es !== undefined ? item.hpp_es : item.hpp);
                          }}
                          className="py-1 px-1 rounded-xl bg-sky-50 hover:bg-sky-600 hover:text-white text-sky-950 border border-sky-300 transition-all text-center cursor-pointer shadow-2xs active:scale-95"
                          title="Tambah varian Es Dingin"
                        >
                          <span className="block text-[8px] font-extrabold text-sky-700 group-hover:text-white uppercase leading-none">
                            🧊 Es Dingin
                          </span>
                          <span className="font-mono font-black text-[10px] sm:text-[11px] leading-tight block mt-0.5">
                            {formatRupiah(item.harga_es || item.harga)}
                          </span>
                        </button>
                      </div>
                    ) : isDrink && !isKhususPanas && !isKhususEs ? (
                      /* KASUS 2: MINUMAN BISA PANAS/ES (Harga Sama, Kasir Bisa Langsung Pilih) */
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="font-mono font-black text-xs text-emerald-950 tabular-nums whitespace-nowrap">
                          {formatRupiah(item.harga)}
                        </div>
                        <div className="grid grid-cols-2 gap-1 sm:flex sm:items-center sm:space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemClick(item, 'panas', item.harga, undefined, item.hpp);
                            }}
                            className="px-1.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-900 border border-amber-200 text-[10px] font-black transition-all active:scale-95 cursor-pointer whitespace-nowrap text-center"
                            title="Pilih Panas"
                          >
                            🔥 Panas
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemClick(item, 'dingin', item.harga, undefined, item.hpp_es !== undefined ? item.hpp_es : item.hpp);
                            }}
                            className="px-1.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-600 hover:text-white text-sky-900 border border-sky-200 text-[10px] font-black transition-all active:scale-95 cursor-pointer whitespace-nowrap text-center"
                            title="Pilih Es"
                          >
                            🧊 Es
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* KASUS 3: MAKANAN / SERABI / MINUMAN KHUSUS (Single Button Sederhana Tanpa Pusing) */
                      <div className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-col min-w-0">
                          <span className="font-mono font-black text-xs sm:text-sm text-emerald-950 tabular-nums whitespace-nowrap">
                            {formatRupiah(isKhususEs && item.harga_es ? item.harga_es : item.harga)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isKhususEs) {
                              handleItemClick(item, 'dingin', item.harga_es || item.harga, undefined, item.hpp_es !== undefined ? item.hpp_es : item.hpp);
                            } else if (isKhususPanas) {
                              handleItemClick(item, 'panas', item.harga, undefined, item.hpp);
                            } else {
                              handleItemClick(item, undefined, item.harga, undefined, item.hpp);
                            }
                          }}
                          className={`h-7 px-2 rounded-xl font-extrabold text-[10px] sm:text-[11px] flex items-center justify-center space-x-1 transition-all shadow-2xs shrink-0 cursor-pointer active:scale-95 whitespace-nowrap ${
                            inCartQty > 0
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-200/80'
                          }`}
                        >
                          <Plus className="w-2.5 h-2.5 stroke-[3]" />
                          <span>
                            {isKhususPanas ? '🔥 Panas' : isKhususEs ? '🧊 Es' : (inCartQty > 0 ? `+${inCartQty}` : 'Tambah')}
                          </span>
                        </button>
                      </div>
                    )}
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
