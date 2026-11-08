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
  Sliders,
  DollarSign,
  TrendingUp,
  Building2
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
  const [hpp, setHpp] = useState<number>(4800);
  const [deskripsi, setDeskripsi] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [hasTemperatureOption, setHasTemperatureOption] = useState<boolean>(true);
  const [defaultTemperature, setDefaultTemperature] = useState<'panas' | 'dingin'>('panas');
  const [isAllBranches, setIsAllBranches] = useState<boolean>(true);
  const [selectedCabangIds, setSelectedCabangIds] = useState<string[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Ref penanda inisialisasi agar form TIDAK PERNAH ter-reset saat user sedang mengetik nama/harga
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
      setHpp(menu.hpp !== undefined ? menu.hpp : Math.round((menu.harga || 15000) * 0.32));
      setDeskripsi(menu.deskripsi || '');
      setIsFavorite(!!menu.is_favorite);
      setIsActive(menu.is_active ?? true);
      setHasTemperatureOption(menu.has_temperature_option ?? (menu.kategori_id === 'kat-wg' || !menu.kategori_id?.includes('sb')));
      setDefaultTemperature(menu.default_temperature || 'panas');

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
      setHpp(4800);
      setDeskripsi('');
      setIsFavorite(false);
      setIsActive(true);
      setHasTemperatureOption(true);
      setDefaultTemperature('panas');
      setIsAllBranches(true);
      setSelectedCabangIds(cabangList.length > 0 ? cabangList.map(c => c.id) : []);
    }
  }, [menu?.id, isNew]);

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

    if (!isAllBranches && selectedCabangIds.length === 0) {
      setErrorMsg('Pilih minimal 1 cabang atau pilih "Semua 10 Cabang"!');
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
        gambar: menu?.gambar || '',
        is_favorite: isFavorite,
        is_active: isActive,
        has_temperature_option: hasTemperatureOption,
        default_temperature: defaultTemperature,
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

  const labaKotor = Math.max(0, harga - hpp);
  const grossMargin = harga > 0 ? Math.round((labaKotor / harga) * 100) : 0;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[95vh] my-auto"
      >
        
        {/* Header - Sticky */}
        <div className="sticky top-0 z-20 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-emerald-800 border border-slate-200 shadow-2xs transition-colors shrink-0 cursor-pointer"
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
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                Resep, harga dan ketersediaan menu per cabang dikontrol penuh oleh Admin Pusat
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 transition-colors shadow-2xs cursor-pointer shrink-0"
            title="Tutup & Batal"
          >
            <X className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-black">Tutup</span>
          </button>
        </div>

        {/* Form Body - Responsive 2 Columns (Side-by-Side on Desktop) */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 text-xs space-y-4">
          
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-bold">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            
            {/* ============================================================= */}
            {/* KOLOM KIRI: IDENTITAS MENU, HARGA & HPP RESEP                 */}
            {/* ============================================================= */}
            <div className="md:col-span-6 space-y-4">
              
              {/* Card 1: Nama Menu & Kategori */}
              <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-3">
                <div>
                  <label className="font-extrabold text-slate-900 block mb-1 text-xs">
                    Nama Minuman Herbal / Serabi / Camilan:
                  </label>
                  <input
                    type="text"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: Wedang Geprek Jahe Madu"
                    className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-300 font-extrabold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                      Kode Menu:
                    </label>
                    <input
                      type="text"
                      value={kode}
                      onChange={(e) => setKode(e.target.value.toUpperCase())}
                      placeholder="WG-01"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-mono font-black text-xs text-slate-900 uppercase focus:outline-none focus:border-emerald-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                      Kategori Dapur:
                    </label>
                    <select
                      value={kategoriId}
                      onChange={(e) => setKategoriId(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white rounded-xl border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-emerald-600 cursor-pointer"
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

              {/* Card 2: Harga Resmi Pusat & HPP Resep */}
              <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-800 block mb-1 text-[11px] flex items-center justify-between">
                      <span>Harga Jual Resmi:</span>
                      <span className="text-[10px] text-emerald-700 font-mono font-bold">Pusat</span>
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
                        className="w-full pl-8 pr-2.5 py-2 bg-white rounded-xl border border-slate-300 font-mono font-black text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 block mb-1 text-[11px] flex items-center justify-between">
                      <span>HPP Pokok Bahan:</span>
                      <span className="text-[10px] text-amber-700 font-mono font-bold">Resep</span>
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
                        className="w-full pl-8 pr-2.5 py-2 bg-white rounded-xl border border-slate-300 font-mono font-black text-xs text-amber-800 focus:outline-none focus:border-emerald-600 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Margin Calculation Card */}
                <div className="p-3 bg-emerald-50/90 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-600 text-[11px] block">Laba Kotor per Porsi:</span>
                    <strong className="font-mono text-sm text-emerald-950 font-black">{formatRupiah(labaKotor)}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-600 text-[11px] block">Margin Keuntungan:</span>
                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono font-black text-xs shadow-2xs">
                      {grossMargin}% Margin
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Varian Suhu Kasir (Panas & Es) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-50/70 to-emerald-50/70 border border-teal-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-slate-900 flex items-center space-x-1.5 text-xs">
                    <span>Varian Suhu Kasir (🔥 Panas &amp; 🧊 Es)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setHasTemperatureOption(!hasTemperatureOption)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black border transition-all cursor-pointer ${
                      hasTemperatureOption
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                        : 'bg-slate-200 text-slate-600 border-slate-300'
                    }`}
                  >
                    {hasTemperatureOption ? 'AKTIF (Dual Button)' : 'NON-AKTIF (Suhu Tunggal)'}
                  </button>
                </div>

                {hasTemperatureOption ? (
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-slate-600 font-medium">Suhu bawaan awal (default):</span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setDefaultTemperature('panas')}
                        className={`px-3 py-1.5 rounded-xl font-extrabold border transition-all cursor-pointer ${
                          defaultTemperature === 'panas'
                            ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50'
                        }`}
                      >
                        🔥 Panas / Hangat
                      </button>
                      <button
                        type="button"
                        onClick={() => setDefaultTemperature('dingin')}
                        className={`px-3 py-1.5 rounded-xl font-extrabold border transition-all cursor-pointer ${
                          defaultTemperature === 'dingin'
                            ? 'bg-sky-500 text-white border-sky-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-sky-50'
                        }`}
                      >
                        🧊 Dingin / Es
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500">
                    Menu ini akan langsung masuk keranjang kasir tanpa pilihan suhu (seperti makanan/serabi).
                  </p>
                )}
              </div>

            </div>

            {/* ============================================================= */}
            {/* KOLOM KANAN: 🚀 LEMPAR MENU KE KASIR CABANG (MULTI-OUTLET)    */}
            {/* ============================================================= */}
            <div className="md:col-span-6 space-y-4 flex flex-col justify-between">
              
              {/* Card Distribusi Cabang Kasir */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 border-2 border-emerald-500/80 shadow-soft-sm space-y-3.5 flex-1">
                
                {/* Header Distribusi */}
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black">
                      <Send className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-xs sm:text-sm">
                        Lempar Menu ke Kasir Cabang
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Tentukan di tablet kasir mana saja menu ini berhak dijual
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Multi-Outlet
                  </span>
                </div>

                {/* 2 Tombol Mode Distribusi */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAllBranches(true);
                      if (cabangList && cabangList.length > 0) {
                        setSelectedCabangIds(cabangList.map(c => c.id));
                      }
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      isAllBranches
                        ? 'bg-emerald-700 border-emerald-800 text-white shadow-md shadow-emerald-900/15'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        isAllBranches ? 'border-white bg-white' : 'border-slate-400'
                      }`}>
                        {isAllBranches && <div className="w-1.5 h-1.5 rounded-full bg-emerald-700" />}
                      </div>
                      <span className="font-black text-xs">Semua 10 Kasir</span>
                    </div>
                    <span className={`text-[10px] mt-1 pl-5 ${isAllBranches ? 'text-emerald-100' : 'text-slate-400'}`}>
                      Tersedia di seluruh outlet
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAllBranches(false)}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      !isAllBranches
                        ? 'bg-emerald-700 border-emerald-800 text-white shadow-md shadow-emerald-900/15'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                          !isAllBranches ? 'border-white bg-white' : 'border-slate-400'
                        }`}>
                          {!isAllBranches && <div className="w-1.5 h-1.5 rounded-full bg-emerald-700" />}
                        </div>
                        <span className="font-black text-xs">Pilih Cabang</span>
                      </div>
                      {!isAllBranches && (
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[9px]">
                          {selectedCabangIds.length} Toko
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] mt-1 pl-5 ${!isAllBranches ? 'text-emerald-100' : 'text-slate-400'}`}>
                      Pilih cabang spesifik
                    </span>
                  </button>
                </div>

                {/* Sub-Panel: Checkbox Grid 10 Cabang */}
                {!isAllBranches ? (
                  <div className="pt-2 border-t border-emerald-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-slate-800">
                        Centang kasir cabang yang menjual menu ini:
                      </span>
                      <div className="flex items-center space-x-2 text-[10px]">
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

                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
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
                            className={`p-2 rounded-xl border text-left flex items-start space-x-2 transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-white border-emerald-600 shadow-2xs text-emerald-950 font-extrabold ring-1 ring-emerald-500/30'
                                : 'bg-slate-50/70 border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            <div className={`mt-0.5 w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                              isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-1">
                                <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-700 font-black">
                                  #{cabang.nomor} {cabang.kode}
                                </span>
                              </div>
                              <p className="text-[11px] font-bold text-slate-900 truncate mt-0.5">
                                {cabang.nama.split('-')[1]?.trim() || cabang.nama}
                              </p>
                              <p className="text-[9px] text-slate-400 truncate">{cabang.kota}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-100/60 rounded-xl border border-emerald-300/80 text-[11px] text-emerald-950 font-bold flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Menu ini langsung aktif dan dapat ditransaksikan di seluruh 10 tablet kasir cabang secara otomatis.</span>
                  </div>
                )}
              </div>

              {/* Card Status & Rincian Singkat */}
              <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Status Jual Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-extrabold'
                        : 'bg-white border-slate-200 text-slate-500 font-bold'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <Sparkles className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="text-xs">Status Jual</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white border font-black">
                      {isActive ? 'AKTIF' : 'NON-AKTIF'}
                    </span>
                  </button>

                  {/* Favorit Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsFavorite(!isFavorite)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-colors cursor-pointer ${
                      isFavorite
                        ? 'bg-amber-50 border-amber-300 text-amber-900 font-extrabold'
                        : 'bg-white border-slate-200 text-slate-600 font-bold'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <Heart className={`w-4 h-4 ${isFavorite ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                      <span className="text-xs">Favorit</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white border font-black">
                      {isFavorite ? 'YA' : 'TIDAK'}
                    </span>
                  </button>
                </div>

                {/* Deskripsi Singkat */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                    Khasiat &amp; Komposisi Rempah (Opsional):
                  </label>
                  <textarea
                    rows={2}
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    placeholder="Contoh: Jahe emprit geprek, kayu secang, serai, cengkeh & gula batu..."
                    className="w-full px-3 py-1.5 bg-white rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

            </div>

          </div>

        </form>

        {/* Footer Actions - Sticky */}
        <div className="sticky bottom-0 z-20 p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200/90 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-black text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors shadow-2xs cursor-pointer flex items-center space-x-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Batal &amp; Kembali</span>
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-800/20 disabled:opacity-50 flex items-center space-x-2 cursor-pointer btn-tactile"
          >
            {loading ? (
              <span>Menyimpan ke Sistem...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Simpan &amp; Terbitkan ke Kasir</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
