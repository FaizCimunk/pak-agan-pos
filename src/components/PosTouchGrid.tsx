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

interface PosTouchGridProps {
  menuList: MenuItem[];
  kategoriList: KategoriMenu[];
  onAddToCart: (item: MenuItem) => void;
  cart?: CartItem[];
}

export default function PosTouchGrid({
  menuList,
  kategoriList,
  onAddToCart,
  cart = [],
}: PosTouchGridProps) {
  const [selectedKatId, setSelectedKatId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tappedItemId, setTappedItemId] = useState<string | null>(null);

  // Icon mapping
  const getCategoryIcon = (iconName: string, id: string) => {
    if (id === 'kat-sb') return <span className="text-sm">🥞</span>;
    if (id === 'kat-wg') return <span className="text-sm">🔥</span>;
    if (id === 'kat-3') return <span className="text-sm">✨</span>;
    if (id === 'kat-5') return <span className="text-sm">⚡</span>;
    if (id === 'kat-6') return <span className="text-sm">🍪</span>;

    switch (iconName) {
      case 'Flame': return <Flame className="w-3.5 h-3.5" />;
      case 'Sparkles': return <Sparkles className="w-3.5 h-3.5" />;
      case 'ShieldCheck': return <ShieldCheck className="w-3.5 h-3.5" />;
      case 'Zap': return <Zap className="w-3.5 h-3.5" />;
      case 'Cookie': return <Cookie className="w-3.5 h-3.5" />;
      default: return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  const filteredMenu = useMemo(() => {
    return menuList.filter(item => {
      if (!item.is_active) return false;
      const matchesKat = selectedKatId === 'all' || item.kategori_id === selectedKatId;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesKat;

      const matchesQuery = (item.nama || '').toLowerCase().includes(q) ||
                           (item.kode || '').toLowerCase().includes(q) ||
                           (item.deskripsi || '').toLowerCase().includes(q);
      return matchesKat && matchesQuery;
    });
  }, [menuList, selectedKatId, searchQuery]);

  // Count items per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: menuList.filter(m => m.is_active).length,
    };
    menuList.forEach(m => {
      if (m.is_active && m.kategori_id) {
        counts[m.kategori_id] = (counts[m.kategori_id] || 0) + 1;
      }
    });
    return counts;
  }, [menuList]);

  // Check how many of this item is already in cart
  const getItemQtyInCart = (menuId: string) => {
    const found = cart.find(ci => ci.menu.id === menuId);
    return found ? found.qty : 0;
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

      {/* 2. Baris Kategori Menu Horizontal Scrollable (Pills) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
        <button
          type="button"
          onClick={() => setSelectedKatId('all')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all btn-tactile ${
            selectedKatId === 'all'
              ? 'bg-emerald-700 text-white shadow-md shadow-emerald-900/20 ring-2 ring-emerald-600/30'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>Semua Menu</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            selectedKatId === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            {categoryCounts.all || 0}
          </span>
        </button>

        {kategoriList.map(kat => {
          const isSelected = selectedKatId === kat.id;
          const count = categoryCounts[kat.id] || 0;

          return (
            <button
              key={kat.id}
              type="button"
              onClick={() => setSelectedKatId(kat.id)}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all btn-tactile ${
                isSelected
                  ? 'bg-emerald-700 text-white shadow-md shadow-emerald-900/20 ring-2 ring-emerald-600/30'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {getCategoryIcon(kat.icon, kat.id)}
              <span>{kat.nama}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
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
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold text-[10px]">
                        {item.kategori_id === 'kat-sb' ? '🥞 Serabi' : item.kategori_id === 'kat-wg' ? '🔥 Wedang' : item.kategori_id === 'kat-3' ? '✨ Jamu' : item.kategori_id === 'kat-5' ? '⚡ STMJ' : '🍪 Camilan'}
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

                  {/* Footer Row: Harga Besar & Tombol Tambah */}
                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Harga</span>
                      <span className="font-mono font-black text-sm sm:text-base text-emerald-950 tabular-nums">
                        {formatRupiah(item.harga)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick(item);
                      }}
                      className={`h-8 px-3 rounded-xl font-extrabold text-xs flex items-center space-x-1 transition-all shadow-sm ${
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
