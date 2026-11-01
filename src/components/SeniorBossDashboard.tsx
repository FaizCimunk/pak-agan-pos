'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { 
  Building2, 
  Users, 
  PackageCheck, 
  Coffee, 
  Receipt, 
  FileText, 
  Calendar, 
  Pencil, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Banknote, 
  Wallet, 
  ChevronRight, 
  ArrowLeft, 
  Search, 
  Check, 
  X,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  MapPin,
  Laptop
} from 'lucide-react';
import { Cabang, Transaksi, Karyawan, Absensi, MenuItem, BahanBaku, KirimanBahanPusat } from '@/lib/types';
import { formatRupiah, formatNominal, parseNominal, formatWaktu } from '@/lib/utils';
import { db } from '@/lib/db';

interface SeniorBossDashboardProps {
  cabangList: Cabang[];
  selectedCabangId: string;
  onSelectCabangId: (id: string) => void;
  onEditCabang: (cabang: Cabang) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  transaksiList: Transaksi[];
  karyawanList: Karyawan[];
  absensiList: Absensi[];
  menuList: MenuItem[];
  bahanList: BahanBaku[];
  kirimanBahanList: KirimanBahanPusat[];
  onOpenKirimanModal: (cabangId?: string) => void;
  onRefreshData: () => Promise<void>;
  onOpenReportModal: () => void;
}

export default function SeniorBossDashboard({
  cabangList,
  selectedCabangId,
  onSelectCabangId,
  onEditCabang,
  selectedDate,
  onDateChange,
  transaksiList,
  karyawanList,
  absensiList,
  menuList,
  bahanList,
  kirimanBahanList,
  onOpenKirimanModal,
  onRefreshData,
  onOpenReportModal,
}: SeniorBossDashboardProps) {
  // Modal State for the 6 Big Action Buttons
  const [activeModal, setActiveModal] = useState<null | 'toko' | 'gaji' | 'bahan' | 'menu' | 'riwayat' | 'laporan'>(null);

  // Search in sub-modals
  const [modalSearch, setModalSearch] = useState<string>('');
  const [gajiModalTab, setGajiModalTab] = useState<'absensi' | 'utang'>('absensi');

  // Editing state for direct Utang Karyawan in modal
  const [editingUtangKaryawanId, setEditingUtangKaryawanId] = useState<string | null>(null);
  const [utangInputValue, setUtangInputValue] = useState<number>(0);
  const [savingUtang, setSavingUtang] = useState<boolean>(false);

  // Editing state for direct Menu HPP in modal
  const [editingMenuHppId, setEditingMenuHppId] = useState<string | null>(null);
  const [hppInputValue, setHppInputValue] = useState<number>(0);
  const [savingHpp, setSavingHpp] = useState<boolean>(false);

  // Channel filter for Riwayat Kasir
  const [channelFilter, setChannelFilter] = useState<'all' | 'tunai' | 'shopeefood' | 'gofood' | 'grabfood'>('all');

  // Currently active branch
  const activeCabang = cabangList.find(c => c.id === selectedCabangId) || null;
  const isAllCabang = selectedCabangId === 'all';

  // Target branches for financial calculations
  const targetBranches = useMemo(() => {
    if (isAllCabang) return cabangList;
    return cabangList.filter(c => c.id === selectedCabangId);
  }, [cabangList, selectedCabangId, isAllCabang]);

  // Target transactions on selectedDate
  const targetTrx = useMemo(() => {
    return transaksiList.filter(t => {
      const matchBranch = isAllCabang || t.cabang_id === selectedCabangId;
      const matchDate = t.waktu && t.waktu.startsWith(selectedDate);
      return matchBranch && matchDate && t.status === 'completed';
    });
  }, [transaksiList, isAllCabang, selectedCabangId, selectedDate]);

  // Omzet Kotor & Breakdown Uangnya Ada di Mana
  const omzetKotor = useMemo(() => {
    return targetTrx.reduce((sum, t) => sum + t.total, 0);
  }, [targetTrx]);

  const tunaiLaci = useMemo(() => {
    return targetTrx
      .filter(t => t.metode_bayar === 'tunai' || !t.metode_bayar)
      .reduce((sum, t) => sum + t.total, 0);
  }, [targetTrx]);

  const shopeePay = useMemo(() => {
    return targetTrx
      .filter(t => (t.metode_bayar as any) === 'shopeefood' || (t.metode_bayar as any) === 'shopeepay')
      .reduce((sum, t) => sum + t.total, 0);
  }, [targetTrx]);

  const goPay = useMemo(() => {
    return targetTrx
      .filter(t => (t.metode_bayar as any) === 'gofood' || (t.metode_bayar as any) === 'gopay')
      .reduce((sum, t) => sum + t.total, 0);
  }, [targetTrx]);

  const grabFood = useMemo(() => {
    return targetTrx
      .filter(t => (t.metode_bayar as any) === 'grabfood' || (t.metode_bayar as any) === 'ovo')
      .reduce((sum, t) => sum + t.total, 0);
  }, [targetTrx]);

  // FIXED COST TOKO HARI INI:
  // 1. Sewa Ruko (bulanan / 30)
  // 2. Wi-Fi & Listrik (bulanan / 30)
  // 3. Gaji Karyawan Toko Hadir Hari Ini
  const sewaHarian = useMemo(() => {
    return targetBranches.reduce((sum, c) => sum + Math.round((c.sewa_bulanan || 3500000) / 30), 0);
  }, [targetBranches]);

  const wifiHarian = useMemo(() => {
    return targetBranches.reduce((sum, c) => {
      const wifi = c.listrik_air_bulanan || 650000;
      const iuran = c.iuran_kebersihan_bulanan || 150000;
      return sum + Math.round((wifi + iuran) / 30);
    }, 0);
  }, [targetBranches]);

  const targetAbsensiToday = useMemo(() => {
    return absensiList.filter(a => {
      const matchBranch = isAllCabang || a.cabang_id === selectedCabangId;
      const matchDate = a.tanggal === selectedDate;
      const isPresent = a.status === 'hadir' || a.status === 'setengah_hari';
      return matchBranch && matchDate && isPresent;
    });
  }, [absensiList, isAllCabang, selectedCabangId, selectedDate]);

  const gajiStafHadir = useMemo(() => {
    return targetAbsensiToday.reduce((sum, a) => sum + (a.upah_harian_terhitung || 100000), 0);
  }, [targetAbsensiToday]);

  const totalFixedCostHarian = sewaHarian + wifiHarian + gajiStafHadir;

  // VARIABLE COST HARI INI:
  // HPP Bahan Baku Serabi & Wedang yang Laku di Kasir
  const menuHppMap = useMemo(() => {
    const map: Record<string, number> = {};
    menuList.forEach(m => {
      map[m.id] = m.hpp || (m.kategori_id === 'kat-wg' ? 4000 : 5000);
    });
    return map;
  }, [menuList]);

  const totalHppBahan = useMemo(() => {
    let sumHpp = 0;
    targetTrx.forEach(trx => {
      trx.items.forEach(it => {
        const itemHpp = menuHppMap[it.menu_id] || 4000;
        sumHpp += itemHpp * it.qty;
      });
    });
    return sumHpp;
  }, [targetTrx, menuHppMap]);

  const totalVariableCostHarian = totalHppBahan;

  // UANG BERSIH MASUK REKENING BOSS HARI INI
  const uangBersihBoss = omzetKotor - (totalFixedCostHarian + totalVariableCostHarian);

  // Quick Date Helpers
  const handleSetYesterday = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().slice(0, 10));
  };

  const handleSetToday = () => {
    onDateChange('2026-10-25');
  };

  // Direct Utang Save by Boss
  const handleSaveUtang = async (karyawanId: string) => {
    setSavingUtang(true);
    try {
      await db.updateKaryawanUtang(karyawanId, utangInputValue);
      await onRefreshData();
      setEditingUtangKaryawanId(null);
    } catch (e) {
      alert('Gagal menyimpan potongan utang.');
    } finally {
      setSavingUtang(false);
    }
  };

  // Direct HPP Save by Boss
  const handleSaveHpp = async (menuId: string) => {
    setSavingHpp(true);
    try {
      await db.updateMenuHpp(menuId, hppInputValue);
      await onRefreshData();
      setEditingMenuHppId(null);
    } catch (e) {
      alert('Gagal menyimpan modal HPP.');
    } finally {
      setSavingHpp(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto w-full">
      
      {/* ========================================================================= */}
      {/* 1. DATE PICKER TOOLBAR (DATA PER HARI, JANGAN HILANG & TERSIMPAN RAPI)    */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-soft-sm">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
          <span className="text-xs font-bold text-slate-600">Pilih Tanggal Laporan:</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleSetYesterday}
            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            title="Lihat data kemarin"
          >
            ◀ Kemarin
          </button>

          <button
            type="button"
            onClick={handleSetToday}
            className="px-2.5 py-1 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-extrabold transition-colors"
            title="Lihat data hari ini (25 Okt 2026)"
          >
            Hari Ini
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. KARTU IDENTITAS TOKO ATAS (PERSIS CONTOH KASIR LAUNDRY DENGAN PENSIL)  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-slate-200/90 shadow-soft-sm relative overflow-hidden">
        
        {/* Tombol Pensil Kuning di Kanan Atas */}
        <button
          type="button"
          onClick={() => {
            if (activeCabang) {
              onEditCabang(activeCabang);
            } else if (cabangList[0]) {
              onEditCabang(cabangList[0]);
            }
          }}
          className="absolute top-4 right-4 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 flex items-center justify-center shadow-md transition-all active:scale-95"
          title="Ubah data sewa ruko & Wi-Fi toko ini"
        >
          <Pencil className="w-4 h-4 sm:w-5 sm:h-5 text-slate-900 fill-slate-900" />
        </button>

        {/* Info Cabang Aktif */}
        <div className="flex items-start space-x-3.5 pr-12">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white flex items-center justify-center text-2xl shadow-md shrink-0">
            🥞
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-700 block">
              {isAllCabang ? 'KONSOLIDASI SELURUH GERAI' : `OUTLET #${activeCabang?.nomor || '1'} • ${activeCabang?.kode || 'CBG'}`}
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug truncate">
              {isAllCabang ? 'Seluruh 10 Cabang Resmi (Pak Agan)' : (activeCabang?.nama || 'Cabang Resmi')}
            </h2>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {isAllCabang ? 'Rekapitulasi total 10 toko Serabi Bawel & Wedang Geprek' : (activeCabang?.alamat ? `${activeCabang.alamat} (${activeCabang.kota})` : activeCabang?.kota)}
            </p>
          </div>
        </div>

        {/* Dropdown Ganti Cabang Langsung di Bawah Nama Toko */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-500 shrink-0">Ganti Cabang:</span>
          <select
            value={selectedCabangId}
            onChange={(e) => onSelectCabangId(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-extrabold text-slate-900 outline-none cursor-pointer truncate shadow-2xs"
          >
            <option value="all">🏢 Konsolidasi Semua 10 Cabang</option>
            {cabangList.map(c => (
              <option key={c.id} value={c.id}>
                {c.kode} - {c.nama.split('-')[1]?.trim() || c.nama} ({c.kota})
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. KARTU EMAS FINTECH: UANG BERSIH MASUK REKENING BOSS HARI INI           */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 border-2 border-amber-400/50 p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-emerald-800/60 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">💰</span>
            <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-amber-300">
              Uang Bersih Masuk ke Rekening Boss Hari Ini
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-300 border border-emerald-700">
            {selectedDate}
          </span>
        </div>

        <div className="pt-3 space-y-1">
          <div className="text-3xl sm:text-4xl font-mono font-black text-amber-400 tracking-tight">
            {formatRupiah(uangBersihBoss)}
          </div>
          <div className="text-xs text-emerald-300 flex items-center space-x-1.5 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Siap ditransfer ke rekening BCA: <strong>8820-192-881 a/n Pak Agan</strong></span>
          </div>
          <p className="text-[11px] text-slate-400 pt-1">
            *Dihitung otomatis: Omzet Kasir ({formatRupiah(omzetKotor)}) dikurangi Fixed Cost ({formatRupiah(totalFixedCostHarian)}) &amp; Variable Cost ({formatRupiah(totalVariableCostHarian)}).
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. DUA KOTAK BIAYA HARIAN: FIXED COST (KIRI) vs VARIABLE COST (KANAN)     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        
        {/* KOTAK 1: FIXED COST TOKO HARI INI */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-soft-sm space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-black uppercase text-amber-900 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>Fixed Cost Toko / Hari</span>
            </span>
            <span className="font-mono font-extrabold text-sm text-rose-600">
              -{formatRupiah(totalFixedCostHarian)}
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>• Sewa Ruko:</span>
              <span className="font-mono font-bold text-slate-900">-{formatRupiah(sewaHarian)}/hr</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>• Wi-Fi &amp; Listrik:</span>
              <span className="font-mono font-bold text-slate-900">-{formatRupiah(wifiHarian)}/hr</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setGajiModalTab('absensi');
                setActiveModal('gaji');
              }}
              className="w-full flex justify-between items-center text-slate-900 font-bold bg-amber-50/80 hover:bg-amber-100 p-2 rounded-xl border border-amber-200/60 transition-colors text-left group cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-700" />
                <span>• Gaji Karyawan Toko:</span>
                <span className="text-[10px] text-emerald-800 font-bold underline group-hover:text-emerald-950">(Lihat Absensi)</span>
              </span>
              <span className="font-mono text-rose-700">-{formatRupiah(gajiStafHadir)}/hr</span>
            </button>
            <span className="text-[10px] text-slate-500 block pt-0.5">
              *{targetAbsensiToday.length} staf hadir tercatat dari absensi kasir ({selectedDate})
            </span>
          </div>
        </div>

        {/* KOTAK 2: VARIABLE COST HARI INI */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-soft-sm space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-black uppercase text-blue-900 flex items-center gap-1.5">
              <Coffee className="w-4 h-4 text-blue-600" />
              <span>Variable Cost Toko / Hari</span>
            </span>
            <span className="font-mono font-extrabold text-sm text-rose-600">
              -{formatRupiah(totalVariableCostHarian)}
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>• Modal HPP Bahan Baku:</span>
              <span className="font-mono font-bold text-slate-900">-{formatRupiah(totalHppBahan)}</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Modal bahan adonan serabi &amp; rempah wedang otomatis terpotong mengikuti porsi yang terjual di kasir hari ini.
            </p>
            <div className="pt-2 text-[10px] text-emerald-700 font-bold flex items-center space-x-1">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>Modal HPP bisa diedit di tombol bawah</span>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 5. POSISI UANGNYA ADA DI MANA HARI INI? (4 PIL WARNA)                     */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-soft-sm space-y-2.5">
        <span className="text-xs font-black uppercase tracking-wider text-slate-700 block">
          Posisi Uang Omzet Hari Ini (Total {formatRupiah(omzetKotor)}):
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          
          {/* Tunai Laci */}
          <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-0.5">
            <div className="flex items-center space-x-1 text-[11px] font-bold">
              <Banknote className="w-3.5 h-3.5 text-emerald-700" />
              <span>Tunai di Laci</span>
            </div>
            <div className="font-mono font-black text-sm text-emerald-800">
              {formatRupiah(tunaiLaci)}
            </div>
            <span className="text-[9px] text-emerald-700 block">Uang fisik di kasir</span>
          </div>

          {/* ShopeePay */}
          <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-0.5">
            <div className="flex items-center space-x-1 text-[11px] font-bold">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[8px] font-black">S</span>
              <span>ShopeePay</span>
            </div>
            <div className="font-mono font-black text-sm text-amber-900">
              {formatRupiah(shopeePay)}
            </div>
            <span className="text-[9px] text-amber-700 block">Saldo ShopeeFood</span>
          </div>

          {/* GoPay */}
          <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-0.5">
            <div className="flex items-center space-x-1 text-[11px] font-bold">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[8px] font-black">G</span>
              <span>GoPay / GoFood</span>
            </div>
            <div className="font-mono font-black text-sm text-rose-900">
              {formatRupiah(goPay)}
            </div>
            <span className="text-[9px] text-rose-700 block">Saldo GoBiz</span>
          </div>

          {/* GrabFood */}
          <div className="p-2.5 rounded-2xl bg-green-50 border border-green-200 text-green-950 space-y-0.5">
            <div className="flex items-center space-x-1 text-[11px] font-bold">
              <span className="w-3.5 h-3.5 rounded-full bg-green-600 text-white flex items-center justify-center text-[8px] font-black">G</span>
              <span>GrabFood</span>
            </div>
            <div className="font-mono font-black text-sm text-green-900">
              {formatRupiah(grabFood)}
            </div>
            <span className="text-[9px] text-green-700 block">Saldo GrabMerchant</span>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. MENU UTAMA KOTAK BESAR (GRID LAUNCHER ALA KASIR MINI LAUNDRY)          */}
      {/* ========================================================================= */}
      <div className="space-y-2 pt-1">
        <span className="text-xs font-black uppercase tracking-wider text-slate-500 block px-1">
          Menu Utama (Klik Langsung Muncul):
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          
          {/* TOMBOL 1: 10 TOKO & SEWA */}
          <button
            type="button"
            onClick={() => setActiveModal('toko')}
            className="p-4 bg-white hover:bg-slate-50 active:scale-95 rounded-3xl border-2 border-slate-200/90 shadow-soft-sm text-center flex flex-col items-center justify-center transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-2xl mb-2 group-hover:scale-105 transition-transform shadow-xs">
              🏢
            </div>
            <span className="font-black text-slate-900 text-sm block">10 Toko &amp; Sewa</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Atur ruko &amp; Wi-Fi</span>
          </button>

          {/* TOMBOL 2: ABSENSI & GAJI STAF */}
          <button
            type="button"
            onClick={() => {
              setGajiModalTab('absensi');
              setActiveModal('gaji');
            }}
            className="p-4 bg-white hover:bg-slate-50 active:scale-95 rounded-3xl border-2 border-slate-200/90 shadow-soft-sm text-center flex flex-col items-center justify-center transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-2xl mb-2 group-hover:scale-105 transition-transform shadow-xs">
              👥
            </div>
            <span className="font-black text-slate-900 text-sm block">Absensi &amp; Gaji Staf</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Cek staf hadir &amp; utang</span>
          </button>

          {/* TOMBOL 3: STOK & KIRIM BAHAN */}
          <button
            type="button"
            onClick={() => setActiveModal('bahan')}
            className="p-4 bg-white hover:bg-slate-50 active:scale-95 rounded-3xl border-2 border-slate-200/90 shadow-soft-sm text-center flex flex-col items-center justify-center transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center text-2xl mb-2 group-hover:scale-105 transition-transform shadow-xs">
              📦
            </div>
            <span className="font-black text-slate-900 text-sm block">Stok &amp; Kirim Bahan</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Cek kasir &amp; kirim pusat</span>
          </button>

          {/* TOMBOL 4: MENU & MODAL HPP */}
          <button
            type="button"
            onClick={() => setActiveModal('menu')}
            className="p-4 bg-white hover:bg-slate-50 active:scale-95 rounded-3xl border-2 border-slate-200/90 shadow-soft-sm text-center flex flex-col items-center justify-center transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-100/70 text-amber-900 flex items-center justify-center text-2xl mb-2 group-hover:scale-105 transition-transform shadow-xs">
              🥞
            </div>
            <span className="font-black text-slate-900 text-sm block">Menu &amp; Modal HPP</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Ketik modal per porsi</span>
          </button>

          {/* TOMBOL 5: RIWAYAT KASIR & OJOL */}
          <button
            type="button"
            onClick={() => setActiveModal('riwayat')}
            className="p-4 bg-white hover:bg-slate-50 active:scale-95 rounded-3xl border-2 border-slate-200/90 shadow-soft-sm text-center flex flex-col items-center justify-center transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center text-2xl mb-2 group-hover:scale-105 transition-transform shadow-xs">
              🛵
            </div>
            <span className="font-black text-slate-900 text-sm block">Riwayat Kasir</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Tunai, Shopee, Gojek, Grab</span>
          </button>

          {/* TOMBOL 6: LAPORAN RESMI & PDF */}
          <button
            type="button"
            onClick={onOpenReportModal}
            className="p-4 bg-white hover:bg-slate-50 active:scale-95 rounded-3xl border-2 border-slate-200/90 shadow-soft-sm text-center flex flex-col items-center justify-center transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center text-2xl mb-2 group-hover:scale-105 transition-transform shadow-xs">
              📊
            </div>
            <span className="font-black text-slate-900 text-sm block">Laporan PDF</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Cetak rekap bulanan A4</span>
          </button>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. MODALS SIMPEL & BESAR UNTUK TIAP TOMBOL                                */}
      {/* ========================================================================= */}

      {/* MODAL 1: KELOLA 10 TOKO & SEWA */}
      {activeModal === 'toko' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🏢</span>
                <h3 className="font-black text-sm text-slate-900">Kelola 10 Toko &amp; Biaya Sewa/Wifi</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              {cabangList.map(c => (
                <div key={c.id} className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-[10px] text-slate-400">#{c.nomor} • {c.kode}</span>
                      <h4 className="font-extrabold text-xs text-slate-900">{c.nama}</h4>
                      <p className="text-[11px] text-slate-500">{c.kota} • PJ: {c.pj_nama || 'Kepala Toko'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEditCabang(c)}
                      className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-xs flex items-center space-x-1 shadow-sm"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Ubah Biaya</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Sewa Ruko:</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(c.sewa_bulanan || 3500000)}/bln</span>
                      <span className="text-[9px] text-slate-400 block font-mono">≈ {formatRupiah(Math.round((c.sewa_bulanan || 3500000) / 30))}/hr</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Wi-Fi &amp; Listrik:</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(c.listrik_air_bulanan || 650000)}/bln</span>
                      <span className="text-[9px] text-slate-400 block font-mono">≈ {formatRupiah(Math.round((c.listrik_air_bulanan || 650000) / 30))}/hr</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ABSENSI & GAJI STAF (CEK STAF HADIR & KETIK UTANG) */}
      {activeModal === 'gaji' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            {/* Header Modal */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <span className="text-xl">👥</span>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Monitor Absensi &amp; Gaji Karyawan</h3>
                  <p className="text-[11px] text-slate-500">Cek siapa yang hadir kerja &amp; kelola utang pemotong gaji</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-tab Pill: [ 📅 Staf Hadir Hari Ini ] vs [ 💰 Rekap Upah & Utang ] */}
            <div className="p-3 bg-slate-100/90 border-b border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGajiModalTab('absensi')}
                className={`flex-1 py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  gajiModalTab === 'absensi'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>📅</span>
                <span>Staf Hadir ({selectedDate})</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  gajiModalTab === 'absensi' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {targetAbsensiToday.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setGajiModalTab('utang')}
                className={`flex-1 py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  gajiModalTab === 'utang'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>💰</span>
                <span>Rekap Upah &amp; Ketik Utang</span>
              </button>
            </div>

            {/* TAB 1: ABSENSI MASUK HARI INI */}
            {gajiModalTab === 'absensi' && (
              <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-xs text-emerald-950 block">
                      Total {targetAbsensiToday.length} Karyawan Masuk Kerja
                    </span>
                    <span className="text-[11px] text-emerald-800">
                      Otomatis memotong Fixed Cost: -{formatRupiah(gajiStafHadir)}/hari
                    </span>
                  </div>
                  <span className="font-mono font-bold text-xs bg-emerald-200/70 text-emerald-900 px-2.5 py-1 rounded-xl">
                    {selectedDate}
                  </span>
                </div>

                {targetAbsensiToday.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
                      📅
                    </div>
                    <p className="font-bold text-slate-700 text-sm">Belum ada staf yang clock-in pada tanggal ini</p>
                    <p className="text-slate-400 text-xs max-w-sm mx-auto">
                      Presensi staf tercatat otomatis saat kasir membuka shift di menu POS tablet.
                    </p>
                  </div>
                ) : (
                  targetAbsensiToday.map(abs => {
                    const kar = karyawanList.find(k => k.id === abs.karyawan_id);
                    const cbg = cabangList.find(c => c.id === abs.cabang_id);
                    return (
                      <div key={abs.id} className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between hover:bg-white transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-slate-900">{abs.karyawan_nama || kar?.nama}</h4>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                              🟢 {abs.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {cbg?.nama || abs.cabang_nama || 'Cabang'} • Jam Masuk: <span className="font-mono font-bold text-slate-800">{abs.jam_masuk || '08:00'}</span> {abs.jam_pulang ? ` s/d ${abs.jam_pulang}` : ''}
                          </p>
                          {abs.catatan && (
                            <span className="text-[10px] text-slate-400 block italic mt-0.5">Catatan: {abs.catatan}</span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Upah Harian:</span>
                          <span className="font-mono font-black text-xs text-emerald-800">
                            {formatRupiah(abs.upah_harian_terhitung || kar?.gaji_harian || 100000)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: REKAP HARI KERJA & KETIK UTANG */}
            {gajiModalTab === 'utang' && (
              <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
                {karyawanList.filter(k => k.role !== 'owner').map(kar => {
                  const branch = cabangList.find(c => c.id === kar.cabang_id);
                  const absensiCount = absensiList.filter(a => a.karyawan_id === kar.id && (a.status === 'hadir' || a.status === 'setengah_hari')).length;
                  const upahTotal = absensiCount * (kar.gaji_harian || 100000);
                  const currentUtang = kar.utang_nominal || 0;
                  const gajiBersih = Math.max(0, upahTotal - currentUtang);
                  const isEditingThis = editingUtangKaryawanId === kar.id;

                  return (
                    <div key={kar.id} className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900">{kar.nama}</h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {branch?.nama || 'Outlet'} • {kar.role} • {kar.telepon}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {absensiCount} Hari Hadir
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-xl border border-slate-200 text-[11px]">
                        <div>
                          <span className="text-slate-400 block">Upah Kotor:</span>
                          <span className="font-mono font-bold text-slate-900">{formatRupiah(upahTotal)}</span>
                        </div>

                        {/* Kolom Potong Utang / Bon */}
                        <div>
                          <span className="text-rose-500 font-bold block">Potong Utang:</span>
                          {isEditingThis ? (
                            <div className="flex items-center space-x-1 mt-0.5">
                              <input
                                type="text"
                                value={utangInputValue === 0 ? '' : formatNominal(utangInputValue)}
                                onChange={(e) => setUtangInputValue(parseNominal(e.target.value))}
                                placeholder="0"
                                className="w-20 px-1.5 py-0.5 border border-rose-300 rounded font-mono font-bold text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveUtang(kar.id)}
                                disabled={savingUtang}
                                className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold"
                              >
                                {savingUtang ? '...' : 'Simpan'}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1 mt-0.5">
                              <span className="font-mono font-bold text-rose-700">-{formatRupiah(currentUtang)}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingUtangKaryawanId(kar.id);
                                  setUtangInputValue(currentUtang);
                                }}
                                className="text-amber-700 hover:text-amber-900 font-bold text-[10px] underline ml-1 cursor-pointer"
                              >
                                Ketik Utang
                              </button>
                            </div>
                          )}
                        </div>

                        <div>
                          <span className="text-emerald-700 font-bold block">Gaji Bersih:</span>
                          <span className="font-mono font-black text-emerald-800 text-xs">{formatRupiah(gajiBersih)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: STOK BAHAN KASIR + TOMBOL KIRIM PUSAT */}
      {activeModal === 'bahan' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                  <span>📦</span>
                  <span>Stok Bahan Toko &amp; Kirim Pusat</span>
                </h3>
                <p className="text-[11px] text-slate-500">Cek rekap fisik dari kasir + Boss bisa tambah kiriman bahan kapan saja</p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tombol Besar Tambah Pasokan Kiriman Bahan dari Pusat */}
            <div className="p-4 bg-emerald-50/80 border-b border-emerald-200 flex items-center justify-between">
              <div>
                <span className="font-extrabold text-xs text-emerald-950 block">Pusat Mau Kirim Bahan ke Cabang?</span>
                <span className="text-[10px] text-emerald-800">Catat pasokan adonan serabi, jahe, kinca durian dll</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  onOpenKirimanModal(selectedCabangId !== 'all' ? selectedCabangId : undefined);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-sm flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Kirim Bahan ke Cabang</span>
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Daftar Bahan Pokok &amp; Rekap Kasir:</span>
              {bahanList.map(bhn => {
                return (
                  <div key={bhn.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-slate-400">{bhn.kode}</span>
                      <h4 className="font-bold text-slate-900 text-xs">{bhn.nama}</h4>
                      <span className="text-[10px] text-slate-500 capitalize">Kategori: {bhn.kategori} • Satuan: {bhn.satuan}</span>
                    </div>

                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                        ✓ Stok Terpantau
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: MENU & MODAL HPP (BISA KETIK LANGSUNG HPP PER PORSI) */}
      {activeModal === 'menu' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🥞</span>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Atur Modal HPP Menu Serabi &amp; Wedang</h3>
                  <p className="text-[11px] text-slate-500">Ketik modal per porsi, omzet kasir langsung otomatis terpotong HPP ini</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 flex-1 text-xs">
              {menuList.map(item => {
                const isEditingThis = editingMenuHppId === item.id;
                const currentHpp = item.hpp || (item.kategori_id === 'kat-wg' ? 4000 : 5000);

                return (
                  <div key={item.id} className="p-3 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-slate-400">{item.kode} • {item.kategori_nama || 'Menu'}</span>
                      <h4 className="font-extrabold text-xs text-slate-900">{item.nama}</h4>
                      <span className="text-[11px] font-mono text-slate-600">Harga Jual: {formatRupiah(item.harga)}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Modal HPP:</span>
                      {isEditingThis ? (
                        <div className="flex items-center space-x-1 mt-0.5">
                          <input
                            type="text"
                            value={hppInputValue === 0 ? '' : formatNominal(hppInputValue)}
                            onChange={(e) => setHppInputValue(parseNominal(e.target.value))}
                            placeholder="0"
                            className="w-20 px-1.5 py-0.5 border border-emerald-400 rounded font-mono font-bold text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveHpp(item.id)}
                            disabled={savingHpp}
                            className="px-2 py-0.5 bg-emerald-700 text-white rounded text-[10px] font-bold"
                          >
                            {savingHpp ? '...' : 'Simpan'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 mt-0.5">
                          <span className="font-mono font-black text-rose-600 text-xs">{formatRupiah(currentHpp)}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMenuHppId(item.id);
                              setHppInputValue(currentHpp);
                            }}
                            className="text-amber-700 hover:text-amber-900 font-bold text-[10px] underline ml-1"
                          >
                            Ubah HPP
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: RIWAYAT KASIR & OJOL (BISA GANTI TANGGAL & FILTER CHANNEL) */}
      {activeModal === 'riwayat' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                  <span>🛵</span>
                  <span>Riwayat Transaksi Kasir &amp; Ojol</span>
                </h3>
                <p className="text-[11px] text-slate-500">Filter transaksi Tunai, ShopeeFood, GoFood, GrabFood per tanggal</p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tanggal & Channel Bar */}
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-1">
                <span className="text-[11px] text-slate-500 font-bold">Channel:</span>
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value as any)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold"
                >
                  <option value="all">Semua Channel</option>
                  <option value="tunai">💵 Tunai (Laci)</option>
                  <option value="shopeefood">🟠 ShopeeFood</option>
                  <option value="gofood">🛵 GoFood</option>
                  <option value="grabfood">🟢 GrabFood</option>
                </select>
              </div>

              <span className="font-mono text-[11px] text-slate-500 font-bold">
                Tanggal: {selectedDate}
              </span>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 flex-1 text-xs">
              {targetTrx.filter(t => {
                if (channelFilter === 'all') return true;
                if (channelFilter === 'tunai') return t.metode_bayar === 'tunai' || !t.metode_bayar;
                return t.metode_bayar === channelFilter;
              }).length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  Belum ada transaksi di channel/tanggal ini.
                </div>
              ) : (
                targetTrx.filter(t => {
                  if (channelFilter === 'all') return true;
                  if (channelFilter === 'tunai') return t.metode_bayar === 'tunai' || !t.metode_bayar;
                  return t.metode_bayar === channelFilter;
                }).map(trx => {
                  const itemsStr = trx.items.map(it => `${it.qty}x ${it.nama_menu}`).join(', ');
                  return (
                    <div key={trx.id} className="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-[10px] text-slate-400">#{trx.invoice_no}</span>
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-slate-200 text-slate-800">
                            {trx.metode_bayar || 'Tunai'}
                          </span>
                        </div>
                        <p className="font-extrabold text-xs text-slate-900 truncate mt-0.5">{itemsStr}</p>
                        <span className="text-[10px] text-slate-400 font-mono block">{formatWaktu(trx.waktu)}</span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-xs text-slate-900 block">{formatRupiah(trx.total)}</span>
                        <span className="text-[10px] text-emerald-700 font-bold">✓ Sukses</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
