'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  UtensilsCrossed, 
  Sparkles, 
  Heart, 
  CheckCircle2, 
  AlertCircle, 
  Check,
  Lock
} from 'lucide-react';
import { MenuItem } from '@/lib/types';
import { db } from '@/lib/db';
import { formatRupiah, formatNominal, parseNominal } from '@/lib/utils';

interface EditMenuModalProps {
  menu: MenuItem | null;
  isNew?: boolean;
  onClose: () => void;
  onSuccess: (menu: MenuItem) => void;
}

const KATEGORI_OPTIONS = [
  { id: 'kat-sb', nama: 'Serabi Bawel Spesial' },
  { id: 'kat-wg', nama: 'Wedang Geprek Rempah' },
  { id: 'kat-3', nama: 'Es Herbal & Jamu Segar' },
  { id: 'kat-5', nama: 'STMJ & Stamina' },
  { id: 'kat-6', nama: 'Camilan Tradisional' },
];

export default function EditMenuModal({
  menu,
  isNew = false,
  onClose,
  onSuccess,
}: EditMenuModalProps) {
  const [nama, setNama] = useState<string>('');
  const [kode, setKode] = useState<string>('');
  const [kategoriId, setKategoriId] = useState<string>('kat-wg');
  const [harga, setHarga] = useState<number>(15000);
  const [hpp, setHpp] = useState<number>(4800);
  const [deskripsi, setDeskripsi] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    if (menu) {
      setNama(menu.nama || '');
      setKode(menu.kode || '');
      setKategoriId(menu.kategori_id || 'kat-wg');
      setHarga(menu.harga || 15000);
      setHpp(menu.hpp !== undefined ? menu.hpp : Math.round((menu.harga || 15000) * 0.32));
      setDeskripsi(menu.deskripsi || '');
      setIsFavorite(!!menu.is_favorite);
      setIsActive(menu.is_active ?? true);
    } else {
      setNama('');
      setKode(`MN-${Math.floor(10 + Math.random() * 90)}`);
      setKategoriId('kat-wg');
      setHarga(15000);
      setHpp(4800);
      setDeskripsi('');
      setIsFavorite(false);
      setIsActive(true);
    }
  }, [menu]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nama.trim()) {
      setErrorMsg('Nama menu tidak boleh kosong!');
      return;
    }

    if (!kode.trim()) {
      setErrorMsg('Kode menu wajib diisi!');
      return;
    }

    if (harga <= 0) {
      setErrorMsg('Harga jual resmi harus lebih dari Rp 0!');
      return;
    }

    setLoading(true);

    try {
      const selectedKat = KATEGORI_OPTIONS.find(k => k.id === kategoriId);
      const payload: Partial<MenuItem> = {
        ...(menu?.id ? { id: menu.id } : {}),
        nama: nama.trim(),
        kode: kode.trim().toUpperCase(),
        kategori_id: kategoriId,
        kategori_nama: selectedKat?.nama || 'Minuman Herbal',
        harga: harga,
        hpp: hpp,
        deskripsi: deskripsi.trim(),
        gambar: '', // Tanpa gambar sesuai permintaan
        is_favorite: isFavorite,
        is_active: isActive,
      };

      const saved = await db.saveMenu(payload);
      setSuccessMsg(`Menu "${saved.nama}" berhasil disimpan!`);
      setTimeout(() => {
        onSuccess(saved);
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan menu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  {isNew ? 'Tambah Menu Resmi Pusat' : 'Ubah Data Menu & Resep'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center space-x-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Admin Pusat Only</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Kasir tablet 10 cabang berstatus Read-Only dan tidak bisa mengubah menu ini
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-bold">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* Nama Menu */}
          <div>
            <label className="font-bold text-slate-800 block mb-1">
              Nama Minuman Herbal / Serabi
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Wedang Geprek Jahe Madu"
              className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              required
            />
          </div>

          {/* Kode, Kategori & Harga */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Kode Menu
              </label>
              <input
                type="text"
                value={kode}
                onChange={(e) => setKode(e.target.value.toUpperCase())}
                placeholder="WG-01"
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 font-mono font-bold text-xs text-slate-900 uppercase focus:outline-none focus:border-emerald-600"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Kategori Menu
              </label>
              <select
                value={kategoriId}
                onChange={(e) => setKategoriId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-xs text-slate-900 focus:outline-none focus:border-emerald-600 cursor-pointer"
              >
                {KATEGORI_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                <span>Harga Resmi (Rp)</span>
                <span className="text-[10px] text-amber-600 font-mono">Pusat</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                  Rp
                </span>
                <input
                  type="text"
                  value={harga === 0 ? '' : formatNominal(harga)}
                  onChange={(e) => setHarga(parseNominal(e.target.value))}
                  placeholder="15.000"
                  className="w-full pl-8 pr-2.5 py-2 bg-slate-50 rounded-xl border border-slate-200 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section: HPP Bahan Baku & Margin Keuntungan */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center space-x-1.5">
                <span>HPP Bahan Baku per Porsi (Harga Pokok)</span>
              </label>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Resep FnB Pusat
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-500 block mb-1">
                  Biaya bahan (tepung/durian/jahe/packaging box):
                </span>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={hpp === 0 ? '' : formatNominal(hpp)}
                    onChange={(e) => setHpp(parseNominal(e.target.value))}
                    placeholder="Contoh: 4.800"
                    className="w-full pl-8 pr-2.5 py-2 bg-white rounded-xl border border-slate-300 font-mono font-bold text-xs text-amber-700 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Live Margin Calculation Card */}
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Laba Kotor per Porsi:</span>
                  <strong className="font-mono text-emerald-900">{formatRupiah(Math.max(0, harga - hpp))}</strong>
                </div>
                <div className="flex justify-between items-center mt-1 pt-1 border-t border-emerald-200/60 font-bold">
                  <span className="text-slate-700">Gross Margin:</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white font-mono text-[10px]">
                    {harga > 0 ? Math.round((Math.max(0, harga - hpp) / harga) * 100) : 0}% Margin
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-400 leading-tight">
              *HPP ini otomatis mengalir ke Laporan Laba Rugi Cabang (P&amp;L) saat menu ini terjual di kasir.
            </p>
          </div>

          {/* Deskripsi & Khasiat */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Khasiat, Komposisi Rempah & Rincian
            </label>
            <textarea
              rows={3}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Contoh: Jahe emprit geprek, serutan kayu secang, serai, cengkeh, dan gula batu asli..."
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Favorit & Status Toggle */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
            {/* Toggle Favorit */}
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-colors ${
                isFavorite
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                <span className="font-bold text-xs">Menu Favorit</span>
              </div>
              <span className="text-[10px] font-bold">{isFavorite ? 'YA' : 'TIDAK'}</span>
            </button>

            {/* Toggle Aktif */}
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-colors ${
                isActive
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Sparkles className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="font-bold text-xs">Status Jual</span>
              </div>
              <span className="text-[10px] font-bold">{isActive ? 'AKTIF' : 'NON-AKTIF'}</span>
            </button>
          </div>

        </form>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
          >
            {loading ? (
              <span>Menyimpan...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Simpan Menu Resmi</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
