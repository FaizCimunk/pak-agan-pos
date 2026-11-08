'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ArrowLeft,
  UtensilsCrossed, 
  Sparkles, 
  Heart, 
  CheckCircle2, 
  AlertCircle, 
  Check,
  Lock,
  Store,
  MapPin,
  Send,
  DollarSign,
  TrendingUp,
  Building2,
  Flame,
  Snowflake
} from 'lucide-react';
import { MenuItem, Cabang } from '@/lib/types';
import { db } from '@/lib/db';
import { formatRupiah, formatNominal, parseNominal } from '@/lib/utils';

interface EditMenuModalProps {
  menu: MenuItem | null;
  isNew?: boolean;
  cabangList?: Cabang[];
  onClose: () => void;
  onSuccess: (menu: MenuItem) => void;
}

const KATEGORI_OPTIONS = [
  { id: 'kat-sb', nama: '🥞 Serabi Bawel (Tungku Serabi)' },
  { id: 'kat-wg', nama: '🍵 Minuman (Wedang, Rempah & Es)' },
  { id: 'kat-6', nama: '🍲 Makanan & Camilan (Dapur Masak)' },
];

export default function EditMenuModal({
  menu,
  isNew = false,
  cabangList = [],
  onClose,
  onSuccess,
}: EditMenuModalProps) {
  const [nama, setNama] = useState<string>('');
  const [kode, setKode] = useState<string>('');
  const [kategoriId, setKategoriId] = useState<string>('kat-wg');
  const [harga, setHarga] = useState<number>(15000);
  const [hargaEs, setHargaEs] = useState<number>(0);
  const [hpp, setHpp] = useState<number>(4800);
  const [hppEs, setHppEs] = useState<number>(0);
  const [suhuMode, setSuhuMode] = useState<'bisa_keduanya' | 'beda_harga_es' | 'khusus_panas' | 'khusus_es'>('bisa_keduanya');
  const [deskripsi, setDeskripsi] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isAllBranches, setIsAllBranches] = useState<boolean>(true);
  const [selectedCabangIds, setSelectedCabangIds] = useState<string[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Ref penanda inisialisasi agar form TIDAK PERNAH ter-reset saat user sedang mengetik
  const initializedIdRef = useRef<string | null>(null);

  // Handle Tombol ESC & Android Back Button agar selalu bisa kembali
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    try {
      window.history.pushState({ modalOpen: 'edit-menu' }, '');
    } catch {}

    const handlePopState = () => {
      onClose();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

  // Inisialisasi data HANYA saat target menu berubah (Bebas dari bug wipe polling interval)
  useEffect(() => {
    const targetKey = menu ? menu.id : '__new_menu__';
    if (initializedIdRef.current === targetKey) {
      return;
    }
    initializedIdRef.current = targetKey;

    if (menu) {
      setNama(menu.nama || '');
      setKode(menu.kode || '');
      setKategoriId(menu.kategori_id || 'kat-wg');
      setHarga(menu.harga || 15000);
      setHargaEs(menu.harga_es || (menu.harga ? menu.harga + 2000 : 17000));
      setHpp(menu.hpp !== undefined ? menu.hpp : Math.round((menu.harga || 15000) * 0.32));
      setHppEs(menu.hpp_es || (menu.hpp ? menu.hpp + 800 : 5000));
      setDeskripsi(menu.deskripsi || '');
      setIsFavorite(!!menu.is_favorite);
      setIsActive(menu.is_active ?? true);

      // Suhu mode initialization
      if (menu.suhu_mode) {
        setSuhuMode(menu.suhu_mode);
      } else if (menu.harga_es && menu.harga_es > 0 && menu.harga_es !== menu.harga) {
        setSuhuMode('beda_harga_es');
      } else {
        const lower = (menu.nama || '').toLowerCase();
        if (lower.startsWith('es ') || lower.includes('es-') || lower.includes('dingin')) {
          setSuhuMode('khusus_es');
        } else if (lower.includes('ronde') || lower.includes('serabi') || lower.includes('pisang') || lower.includes('singkong')) {
          setSuhuMode('khusus_panas');
        } else {
          setSuhuMode('bisa_keduanya');
        }
      }

      const cIds = menu.cabang_ids;
      if (!cIds || cIds.length === 0 || cIds.includes('all')) {
        setIsAllBranches(true);
        setSelectedCabangIds(cabangList.length > 0 ? cabangList.map(c => c.id) : []);
      } else {
        setIsAllBranches(false);
        setSelectedCabangIds(cIds);
      }
    } else {
      setNama('');
      setKode(`MN-${Math.floor(10 + Math.random() * 90)}`);
      setKategoriId('kat-wg');
      setHarga(15000);
      setHargaEs(17000);
      setHpp(4800);
      setHppEs(5600);
      setSuhuMode('bisa_keduanya');
      setDeskripsi('');
      setIsFavorite(false);
      setIsActive(true);
      setIsAllBranches(true);
      setSelectedCabangIds(cabangList.length > 0 ? cabangList.map(c => c.id) : []);
    }
  }, [menu?.id, isNew, cabangList]);

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

    const isFood = kategoriId === 'kat-sb' || kategoriId === 'kat-6';
    if (!isFood && suhuMode === 'beda_harga_es' && hargaEs <= 0) {
      setErrorMsg('Varian Beda Harga Es dipilih! Masukkan nominal harga es yang valid.');
      return;
    }

    if (!isAllBranches && selectedCabangIds.length === 0) {
      setErrorMsg('Pilih minimal 1 cabang atau pilih "Semua 10 Kasir"!');
      return;
    }

    setLoading(true);

    try {
      const selectedKat = KATEGORI_OPTIONS.find(k => k.id === kategoriId);
      const finalSuhuMode = isFood ? undefined : suhuMode;
      const finalHargaEs = (!isFood && suhuMode === 'beda_harga_es' && hargaEs > 0) ? hargaEs : undefined;
      const finalHppEs = (!isFood && suhuMode === 'beda_harga_es' && hppEs > 0) ? hppEs : undefined;

      const payload: Partial<MenuItem> = {
        ...(menu?.id ? { id: menu.id } : {}),
        nama: nama.trim(),
        kode: kode.trim().toUpperCase(),
        kategori_id: kategoriId,
        kategori_nama: selectedKat?.nama || 'Minuman Herbal',
        harga: harga,
        harga_es: finalHargaEs,
        hpp: hpp,
        hpp_es: finalHppEs,
        suhu_mode: finalSuhuMode,
        deskripsi: deskripsi.trim(),
        gambar: menu?.gambar || '',
        is_favorite: isFavorite,
        is_active: isActive,
        has_temperature_option: !isFood && (suhuMode === 'bisa_keduanya' || suhuMode === 'beda_harga_es'),
        default_temperature: (!isFood && suhuMode === 'khusus_es') ? 'dingin' : 'panas',
        cabang_ids: isAllBranches ? [] : selectedCabangIds,
      };

      const saved = await db.saveMenu(payload);
      setSuccessMsg(`Menu "${saved.nama}" berhasil disimpan & diterbitkan ke kasir!`);
      setTimeout(() => {
        onSuccess(saved);
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan menu');
    } finally {
      setLoading(false);
    }
  };

  const isFoodOrSerabi = kategoriId === 'kat-sb' || kategoriId === 'kat-6';
  const labaKotorPanas = Math.max(0, harga - hpp);
  const grossMarginPanas = harga > 0 ? Math.round((labaKotorPanas / harga) * 100) : 0;

  const effectiveHppEs = hppEs > 0 ? hppEs : hpp;
  const labaKotorEs = Math.max(0, hargaEs - effectiveHppEs);
  const grossMarginEs = hargaEs > 0 ? Math.round((labaKotorEs / hargaEs) * 100) : 0;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] my-auto"
      >
        
        {/* Header - Sticky */}
        <div className="sticky top-0 z-20 px-4 sm:px-5 py-2.5 sm:py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 shrink-0">
          <div className="flex items-center space-x-2 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-emerald-800 border border-slate-200 shadow-2xs transition-colors shrink-0 cursor-pointer"
              title="Kembali ke Daftar Menu"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
                  {isNew ? 'Tambah Menu Resmi Pusat' : 'Ubah Data Menu & Lempar ke Kasir'}
                </h3>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200 items-center space-x-1 shrink-0">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Admin Pusat Only</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium truncate">
                Resep, harga dan ketersediaan menu per cabang dikontrol penuh oleh Admin Pusat
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 transition-colors shadow-2xs cursor-pointer shrink-0"
            title="Tutup & Batal"
          >
            <X className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-black">Tutup</span>
          </button>
        </div>

        {/* Form Body - Responsive 2 Columns Compact (Side-by-Side on Desktop) */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-4 overflow-y-auto flex-1 text-xs space-y-3">
          
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-bold">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            
            {/* ============================================================= */}
            {/* KOLOM KIRI: IDENTITAS MENU, HARGA & HPP RESEP                 */}
            {/* ============================================================= */}
            <div className="md:col-span-6 space-y-3">
              
              {/* Card 1: Nama Menu, Kode & Kategori */}
              <div className="p-3 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-2.5">
                <div>
                  <label className="font-black text-slate-900 block mb-1 text-[11px]">
                    Nama Minuman / Serabi / Camilan:
                  </label>
                  <input
                    type="text"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: Wedang Geprek Jahe Madu"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-black text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-[10px]">
                      Kode Menu:
                    </label>
                    <input
                      type="text"
                      value={kode}
                      onChange={(e) => setKode(e.target.value.toUpperCase())}
                      placeholder="WG-01"
                      className="w-full px-2.5 py-1.5 bg-white rounded-xl border border-slate-300 font-mono font-black text-xs text-slate-900 uppercase focus:outline-none focus:border-emerald-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-[10px]">
                      Kategori Dapur:
                    </label>
                    <select
                      value={kategoriId}
                      onChange={(e) => setKategoriId(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white rounded-xl border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-emerald-600 cursor-pointer"
                    >
                      {KATEGORI_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>
                          {opt.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Card 2 & 3: Kondisional - Makanan/Serabi (Hanya Harga & HPP Standar) vs Minuman (Opsi Panas/Es & Beda Harga) */}
              {isFoodOrSerabi ? (
                <>
                  {/* Card Harga Standar Tunggal untuk Makanan/Serabi (Tanpa Pengaturan Suhu) */}
                  <div className="p-3 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="font-bold text-slate-800 block mb-1 text-[10px] flex items-center justify-between">
                          <span>Harga Jual Resmi:</span>
                          <span className="text-[9px] text-emerald-700 font-mono font-bold">Pusat</span>
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
                            className="w-full pl-8 pr-2 py-1.5 bg-white rounded-xl border border-slate-300 font-mono font-black text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-800 block mb-1 text-[10px] flex items-center justify-between">
                          <span>HPP Pokok Bahan:</span>
                          <span className="text-[9px] text-amber-700 font-mono font-bold">Resep</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                            Rp
                          </span>
                          <input
                            type="text"
                            value={hpp === 0 ? '' : formatNominal(hpp)}
                            onChange={(e) => setHpp(parseNominal(e.target.value))}
                            placeholder="4.800"
                            className="w-full pl-8 pr-2 py-1.5 bg-white rounded-xl border border-slate-300 font-mono font-black text-xs text-amber-800 focus:outline-none focus:border-emerald-600 shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Live Margin Calculation Card */}
                    <div className="p-2.5 bg-emerald-50/90 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
                      <div>
                        <span className="text-slate-600 text-[10px] block">Laba Kotor per Porsi:</span>
                        <strong className="font-mono text-xs text-emerald-950 font-black">{formatRupiah(labaKotorPanas)}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-600 text-[10px] block">Margin Keuntungan:</span>
                        <span className="inline-block px-2 py-0.2 rounded-full bg-emerald-600 text-white font-mono font-black text-[10px] shadow-2xs">
                          {grossMarginPanas}% Margin
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Card Karakter & Opsi Suhu Minuman */}
                  <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200/90 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 text-[11px] flex items-center space-x-1">
                        <Flame className="w-3.5 h-3.5 text-amber-600" />
                        <span>Karakter &amp; Opsi Suhu Minuman:</span>
                      </span>
                      <span className="text-[9px] text-teal-800 font-bold px-1.5 py-0.2 bg-teal-100 rounded-full">
                        Khusus Minuman
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSuhuMode('bisa_keduanya')}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                          suhuMode === 'bisa_keduanya'
                            ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs font-black'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-bold'
                        }`}
                      >
                        <div className="text-[11px] flex items-center space-x-1">
                          <span>⚡</span>
                          <span>Bisa Panas / Es</span>
                        </div>
                        <p className={`text-[9px] mt-0.5 ${suhuMode === 'bisa_keduanya' ? 'text-emerald-100' : 'text-slate-400'}`}>
                          Harga panas &amp; es sama persis
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSuhuMode('beda_harga_es')}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                          suhuMode === 'beda_harga_es'
                            ? 'bg-amber-600 text-white border-amber-700 shadow-2xs font-black'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-bold'
                        }`}
                      >
                        <div className="text-[11px] flex items-center space-x-1">
                          <span>💰</span>
                          <span>Ada Beda Harga Es</span>
                        </div>
                        <p className={`text-[9px] mt-0.5 ${suhuMode === 'beda_harga_es' ? 'text-amber-100' : 'text-slate-400'}`}>
                          Harga es berbeda (cup+es kristal)
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSuhuMode('khusus_panas')}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                          suhuMode === 'khusus_panas'
                            ? 'bg-rose-600 text-white border-rose-700 shadow-2xs font-black'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-bold'
                        }`}
                      >
                        <div className="text-[11px] flex items-center space-x-1">
                          <span>🔥</span>
                          <span>Khusus Panas Saja</span>
                        </div>
                        <p className={`text-[9px] mt-0.5 ${suhuMode === 'khusus_panas' ? 'text-rose-100' : 'text-slate-400'}`}>
                          Contoh: Ronde, STMJ Panas
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSuhuMode('khusus_es')}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                          suhuMode === 'khusus_es'
                            ? 'bg-sky-600 text-white border-sky-700 shadow-2xs font-black'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-bold'
                        }`}
                      >
                        <div className="text-[11px] flex items-center space-x-1">
                          <span>🧊</span>
                          <span>Khusus Dingin / Es</span>
                        </div>
                        <p className={`text-[9px] mt-0.5 ${suhuMode === 'khusus_es' ? 'text-sky-100' : 'text-slate-400'}`}>
                          Contoh: Es Sinom, Es Jamu Segar
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Card Harga Minuman: Dual Column jika Beda Harga Es vs Single Column jika Sama */}
                  {suhuMode === 'beda_harga_es' ? (
                    <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-300/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-amber-950 text-[11px] flex items-center space-x-1">
                          <span>💰 Atur 2 Harga Berbeda: Panas vs Es</span>
                        </span>
                        <span className="text-[9px] text-amber-800 font-bold px-1.5 py-0.2 bg-amber-100 rounded-full">
                          Kasir langsung sentuh Panas / Es
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Kolom Panas */}
                        <div className="p-2.5 bg-white rounded-xl border border-amber-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-amber-900 text-[10px] flex items-center space-x-1">
                              <Flame className="w-3 h-3 text-amber-600" />
                              <span>Harga Panas:</span>
                            </span>
                            <span className="font-mono text-[9px] text-slate-400">Dasar</span>
                          </div>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">Rp</span>
                            <input
                              type="text"
                              value={harga === 0 ? '' : formatNominal(harga)}
                              onChange={(e) => setHarga(parseNominal(e.target.value))}
                              placeholder="15.000"
                              className="w-full pl-8 pr-2 py-1 bg-amber-50/30 rounded-lg border border-amber-300 font-mono font-black text-xs text-slate-900 focus:outline-none focus:border-amber-600"
                              required
                            />
                          </div>

                          <div>
                            <label className="font-bold text-slate-600 block mb-0.5 text-[9px]">HPP Panas:</label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-slate-400 text-[10px]">Rp</span>
                              <input
                                type="text"
                                value={hpp === 0 ? '' : formatNominal(hpp)}
                                onChange={(e) => setHpp(parseNominal(e.target.value))}
                                placeholder="4.800"
                                className="w-full pl-7 pr-1.5 py-0.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-700 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[9px]">
                            <span className="text-slate-500">Margin:</span>
                            <strong className="font-mono text-emerald-700 font-bold">{grossMarginPanas}% ({formatRupiah(labaKotorPanas)})</strong>
                          </div>
                        </div>

                        {/* Kolom Es */}
                        <div className="p-2.5 bg-white rounded-xl border border-sky-300 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-sky-900 text-[10px] flex items-center space-x-1">
                              <Snowflake className="w-3 h-3 text-sky-600" />
                              <span>Harga Es / Dingin:</span>
                            </span>
                            <span className="font-mono text-[9px] text-sky-600 font-bold">+Cup Es</span>
                          </div>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">Rp</span>
                            <input
                              type="text"
                              value={hargaEs === 0 ? '' : formatNominal(hargaEs)}
                              onChange={(e) => setHargaEs(parseNominal(e.target.value))}
                              placeholder="17.000"
                              className="w-full pl-8 pr-2 py-1 bg-sky-50/30 rounded-lg border border-sky-300 font-mono font-black text-xs text-sky-950 focus:outline-none focus:border-sky-600"
                              required
                            />
                          </div>

                          <div>
                            <label className="font-bold text-slate-600 block mb-0.5 text-[9px]">HPP Es (+Bahan Es):</label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-slate-400 text-[10px]">Rp</span>
                              <input
                                type="text"
                                value={hppEs === 0 ? '' : formatNominal(hppEs)}
                                onChange={(e) => setHppEs(parseNominal(e.target.value))}
                                placeholder="5.600"
                                className="w-full pl-7 pr-1.5 py-0.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-700 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[9px]">
                            <span className="text-slate-500">Margin:</span>
                            <strong className="font-mono text-sky-800 font-bold">{grossMarginEs}% ({formatRupiah(labaKotorEs)})</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="font-bold text-slate-800 block mb-1 text-[10px] flex items-center justify-between">
                            <span>{suhuMode === 'khusus_panas' ? 'Harga Khusus Panas:' : suhuMode === 'khusus_es' ? 'Harga Khusus Es:' : 'Harga Resmi (Panas & Es):'}</span>
                            <span className="text-[9px] text-emerald-700 font-mono font-bold">Pusat</span>
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
                              className="w-full pl-8 pr-2 py-1.5 bg-white rounded-xl border border-slate-300 font-mono font-black text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="font-bold text-slate-800 block mb-1 text-[10px] flex items-center justify-between">
                            <span>HPP Pokok Bahan:</span>
                            <span className="text-[9px] text-amber-700 font-mono font-bold">Resep</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                              Rp
                            </span>
                            <input
                              type="text"
                              value={hpp === 0 ? '' : formatNominal(hpp)}
                              onChange={(e) => setHpp(parseNominal(e.target.value))}
                              placeholder="4.800"
                              className="w-full pl-8 pr-2 py-1.5 bg-white rounded-xl border border-slate-300 font-mono font-black text-xs text-amber-800 focus:outline-none focus:border-emerald-600 shadow-2xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Live Margin Calculation Card */}
                      <div className="p-2.5 bg-emerald-50/90 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
                        <div>
                          <span className="text-slate-600 text-[10px] block">Laba Kotor per Porsi:</span>
                          <strong className="font-mono text-xs text-emerald-950 font-black">{formatRupiah(labaKotorPanas)}</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-600 text-[10px] block">Margin Keuntungan:</span>
                          <span className="inline-block px-2 py-0.2 rounded-full bg-emerald-600 text-white font-mono font-black text-[10px] shadow-2xs">
                            {grossMarginPanas}% Margin
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>

            {/* ============================================================= */}
            {/* KOLOM KANAN: 🚀 LEMPAR MENU KE KASIR CABANG (MULTI-OUTLET)    */}
            {/* ============================================================= */}
            <div className="md:col-span-6 space-y-3 flex flex-col justify-between">
              
              {/* Card Distribusi Cabang Kasir */}
              <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 border-2 border-emerald-500/80 shadow-soft-sm space-y-2.5 flex-1">
                
                {/* Header Distribusi */}
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black">
                      <Send className="w-3 h-3" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-xs">
                        Lempar Menu ke Kasir Cabang
                      </h4>
                      <p className="text-[9px] text-slate-500 font-medium">
                        Tentukan di tablet kasir mana saja menu ini berhak dijual
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Multi-Outlet
                  </span>
                </div>

                {/* 2 Tombol Mode Distribusi */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAllBranches(true);
                      if (cabangList && cabangList.length > 0) {
                        setSelectedCabangIds(cabangList.map(c => c.id));
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      isAllBranches
                        ? 'bg-emerald-700 border-emerald-800 text-white shadow-md shadow-emerald-900/15'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <div className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${
                        isAllBranches ? 'border-white bg-white' : 'border-slate-400'
                      }`}>
                        {isAllBranches && <div className="w-1.5 h-1.5 rounded-full bg-emerald-700" />}
                      </div>
                      <span className="font-black text-[11px]">Semua 10 Kasir</span>
                    </div>
                    <span className={`text-[9px] mt-0.5 pl-4 ${isAllBranches ? 'text-emerald-100' : 'text-slate-400'}`}>
                      Tersedia di seluruh outlet
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAllBranches(false)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      !isAllBranches
                        ? 'bg-emerald-700 border-emerald-800 text-white shadow-md shadow-emerald-900/15'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <div className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${
                          !isAllBranches ? 'border-white bg-white' : 'border-slate-400'
                        }`}>
                          {!isAllBranches && <div className="w-1.5 h-1.5 rounded-full bg-emerald-700" />}
                        </div>
                        <span className="font-black text-[11px]">Pilih Cabang</span>
                      </div>
                      {!isAllBranches && (
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[8px]">
                          {selectedCabangIds.length} Toko
                        </span>
                      )}
                    </div>
                    <span className={`text-[9px] mt-0.5 pl-4 ${!isAllBranches ? 'text-emerald-100' : 'text-slate-400'}`}>
                      Pilih cabang spesifik
                    </span>
                  </button>
                </div>

                {/* Sub-Panel: Checkbox Grid 10 Cabang */}
                {!isAllBranches ? (
                  <div className="pt-1.5 border-t border-emerald-200/70 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-slate-700">
                        Centang kasir cabang:
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCabangIds(cabangList.map(c => c.id))}
                          className="text-emerald-800 hover:underline font-black cursor-pointer"
                        >
                          Pilih Semua
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedCabangIds([])}
                          className="text-rose-600 hover:underline font-black cursor-pointer"
                        >
                          Kosongkan
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {cabangList.map(cabang => {
                        const isChecked = selectedCabangIds.includes(cabang.id);
                        return (
                          <button
                            key={cabang.id}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                setSelectedCabangIds(selectedCabangIds.filter(id => id !== cabang.id));
                              } else {
                                setSelectedCabangIds([...selectedCabangIds, cabang.id]);
                              }
                            }}
                            className={`p-1.5 rounded-xl border text-left flex items-start space-x-1.5 transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-white border-emerald-600 shadow-2xs text-emerald-950 font-black ring-1 ring-emerald-500/30'
                                : 'bg-slate-50/70 border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            <div className={`mt-0.5 w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition-colors ${
                              isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-mono text-[8px] px-1 py-0.2 rounded bg-slate-100 text-slate-700 font-bold block truncate">
                                #{cabang.nomor} {cabang.kode}
                              </span>
                              <p className="text-[10px] font-black text-slate-900 truncate mt-0.5">
                                {cabang.nama.split('-')[1]?.trim() || cabang.nama}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-100/60 rounded-xl border border-emerald-300/80 text-[10px] text-emerald-950 font-bold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Menu ini langsung aktif dan tampil di seluruh 10 tablet kasir cabang secara otomatis.</span>
                  </div>
                )}
              </div>

              {/* Card Status & Rincian Singkat */}
              <div className="p-3 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {/* Status Jual Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`p-2 rounded-xl border flex items-center justify-between text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-black'
                        : 'bg-white border-slate-200 text-slate-500 font-bold'
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                      <Sparkles className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="text-[11px]">Status Jual</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white border font-black">
                      {isActive ? 'AKTIF' : 'NON-AKTIF'}
                    </span>
                  </button>

                  {/* Favorit Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsFavorite(!isFavorite)}
                    className={`p-2 rounded-xl border flex items-center justify-between text-left transition-colors cursor-pointer ${
                      isFavorite
                        ? 'bg-amber-50 border-amber-300 text-amber-900 font-black'
                        : 'bg-white border-slate-200 text-slate-600 font-bold'
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                      <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                      <span className="text-[11px]">Favorit</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white border font-black">
                      {isFavorite ? 'YA' : 'TIDAK'}
                    </span>
                  </button>
                </div>

                {/* Deskripsi Singkat */}
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5 text-[10px]">
                    Khasiat &amp; Komposisi Rempah (Opsional):
                  </label>
                  <input
                    type="text"
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    placeholder="Contoh: Jahe emprit geprek, kayu secang, serai & gula batu..."
                    className="w-full px-2.5 py-1 bg-white rounded-xl border border-slate-300 text-[11px] text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

            </div>

          </div>

        </form>

        {/* Footer Actions - Sticky */}
        <div className="sticky bottom-0 z-20 px-4 py-2.5 sm:py-3 bg-slate-50 border-t border-slate-200/90 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-black text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors shadow-2xs cursor-pointer flex items-center space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Batal &amp; Kembali</span>
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-800/20 disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer btn-tactile"
          >
            {loading ? (
              <span>Menyimpan...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Simpan &amp; Terbitkan ke Kasir</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
