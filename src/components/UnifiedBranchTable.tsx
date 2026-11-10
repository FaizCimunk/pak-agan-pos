'use client';

import React, { useState, useMemo } from 'react';
import { 
  Store, 
  MapPin, 
  Phone, 
  Building2, 
  Wifi, 
  Users, 
  PackageCheck, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Pencil, 
  Plus, 
  RotateCcw, 
  Calendar, 
  Search, 
  Filter, 
  ArrowUpRight, 
  DollarSign, 
  Wallet, 
  ShieldCheck, 
  Laptop, 
  MessageCircle, 
  ExternalLink,
  Table,
  LayoutGrid,
  Check
} from 'lucide-react';
import { Cabang, Karyawan, Transaksi } from '@/lib/types';
import { isBranchMatch } from '@/lib/db';
import { formatRupiah, formatNominal } from '@/lib/utils';

interface UnifiedBranchTableProps {
  cabangList: Cabang[];
  karyawanList: Karyawan[];
  transaksiList: Transaksi[];
  bossDailyProfits: {
    date: string;
    branchBreakdowns: {
      cabang: Cabang;
      sewaHarian: number;
      wifiListrikHarian: number;
      iuranHarian: number;
      totalGajiKaryawan: number;
      totalHppBahan: number;
      totalPotongan: number;
      omzetKotor: number;
      uangBersihBoss: number;
      stafHadirCount: number;
    }[];
    totalOmzet10Toko: number;
    totalSewa10Toko: number;
    totalWifiListrik10Toko: number;
    totalIuran10Toko: number;
    totalGaji10Toko: number;
    totalHpp10Toko: number;
    totalPotongan10Toko: number;
    totalBersihBoss10Toko: number;
  };
  materialAuditRows?: any[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onEditCabang: (cabang: Cabang) => void;
  onAddNewCabang: () => void;
  onResetDefaultCabang: () => void;
  onSelectCabang: (cabangId: string) => void;
  selectedCabangId: string;
  onOpenKirimanBahanModal?: (cabangId?: string) => void;
  onNavigateToTab?: (tabName: any) => void;
}

export default function UnifiedBranchTable({
  cabangList,
  karyawanList,
  transaksiList,
  bossDailyProfits,
  materialAuditRows = [],
  selectedDate,
  onDateChange,
  onEditCabang,
  onAddNewCabang,
  onResetDefaultCabang,
  onSelectCabang,
  selectedCabangId,
  onOpenKirimanBahanModal,
  onNavigateToTab,
}: UnifiedBranchTableProps) {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [kotaFilter, setKotaFilter] = useState<string>('all');

  // Extract distinct cities
  const distinctCities = useMemo(() => {
    const set = new Set<string>();
    cabangList.forEach(c => {
      if (c.kota) set.add(c.kota);
    });
    return Array.from(set);
  }, [cabangList]);

  // Filtered branches
  const filteredBranches = useMemo(() => {
    return cabangList.filter(cbg => {
      if (kotaFilter !== 'all' && cbg.kota !== kotaFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNama = (cbg.nama || '').toLowerCase().includes(q);
        const matchKode = (cbg.kode || '').toLowerCase().includes(q);
        const matchKota = (cbg.kota || '').toLowerCase().includes(q);
        const matchAlamat = (cbg.alamat || '').toLowerCase().includes(q);
        const matchPj = (cbg.pj_nama || '').toLowerCase().includes(q);
        const matchUser = (cbg.kasir_username || '').toLowerCase().includes(q);
        if (!matchNama && !matchKode && !matchKota && !matchAlamat && !matchPj && !matchUser) {
          return false;
        }
      }
      return true;
    });
  }, [cabangList, searchQuery, kotaFilter]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft-sm overflow-hidden space-y-4 p-4 sm:p-6">
      
      {/* 1. HEADER SECTION & VIEW SWITCH */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] uppercase font-black tracking-widest text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Pusat Kendali 10 Cabang Terpadu • All-in-One Master Hub
            </span>
          </div>
          <h2 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight mt-1">
            Master Manajemen Seluruh Cabang (Bahan, Karyawan, Fixed Cost &amp; Uang Boss)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-3xl leading-relaxed">
            Semua cabang disatukan dalam satu kontrol terpusat: Pantau bahan baku, karyawan bertugas, 
            beban tetap ruko &amp; Wi-Fi <strong>(bisa diedit langsung)</strong>, omzet kasir, dan kalkulasi uang bersih yang masuk rekening Boss.
          </p>
        </div>

        {/* View Switch Pill & Branch Count */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                viewMode === 'table'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Tabel Rinci (Lengkap)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                viewMode === 'grid'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kartu Target Omzet</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onAddNewCabang}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm shadow-emerald-700/20 btn-tactile transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Cabang Baru</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER & ACTION TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <input
              type="text"
              placeholder="Cari cabang, kota, alamat, PJ, username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-2xs"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Kota Filter */}
          <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-xs">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={kotaFilter}
              onChange={(e) => setKotaFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">Semua Kota ({cabangList.length} Cabang)</option>
              {distinctCities.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          {/* Tanggal Rekap Harian */}
          <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-xs">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-bold text-slate-500 text-[11px]">Tanggal:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent font-mono font-bold text-xs text-slate-800 outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Quick actions right */}
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-xl">
            Aktif: {cabangList.filter(c => c.is_active).length}/{cabangList.length} Outlet Resmi
          </span>
          <button
            type="button"
            onClick={onResetDefaultCabang}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors shadow-2xs"
            title="Kembalikan nama 10 cabang bawaan resmi"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* 3. VIEW MODE: TABEL RINCI LENGKAP (ALA DATA PEKERJA) */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto border border-slate-200/90 rounded-2xl shadow-soft-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3.5">1. Identitas &amp; POS Tablet</th>
                <th className="py-3 px-3.5">2. Fixed Cost (Sewa, Wi-Fi &amp; Utilitas)</th>
                <th className="py-3 px-3.5">3. Karyawan Bertugas &amp; Upah</th>
                <th className="py-3 px-3.5">4. Bahan Baku &amp; Resep</th>
                <th className="py-3 px-3.5 text-right bg-slate-950/90 text-amber-300">
                  5. Uang Bersih Boss Hari Ini
                </th>
                <th className="py-3 px-3 text-center">Aksi Kelola</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredBranches.map(cbg => {
                // Find financial breakdown for this branch
                const b = bossDailyProfits.branchBreakdowns.find(br => br.cabang.id === cbg.id) || {
                  cabang: cbg,
                  sewaHarian: Math.round((cbg.sewa_bulanan || 3500000) / 30),
                  wifiListrikHarian: Math.round((cbg.listrik_air_bulanan || 650000) / 30),
                  iuranHarian: Math.round((cbg.iuran_kebersihan_bulanan || 150000) / 30),
                  totalGajiKaryawan: 0,
                  totalHppBahan: 0,
                  totalPotongan: 0,
                  omzetKotor: 0,
                  uangBersihBoss: 0,
                  stafHadirCount: 0,
                };

                // Workers assigned to this branch
                const branchWorkers = karyawanList.filter(k => isBranchMatch(k.cabang_id, cbg.id));

                // Material status
                const branchMaterials = materialAuditRows.filter(m => isBranchMatch(m.cabang.id, cbg.id));
                const hasSelisih = branchMaterials.some(m => m.status === 'selisih');

                const sewaBulanan = cbg.sewa_bulanan || 3500000;
                const wifiBulanan = cbg.listrik_air_bulanan || 650000;
                const iuranBulanan = cbg.iuran_kebersihan_bulanan || 150000;
                const totalFixedBulanan = sewaBulanan + wifiBulanan + iuranBulanan;
                const totalFixedHarian = Math.round(totalFixedBulanan / 30);

                const isSelected = selectedCabangId === cbg.id;

                return (
                  <tr 
                    key={cbg.id} 
                    className={`transition-colors hover:bg-slate-50/80 ${
                      isSelected ? 'bg-emerald-50/40 ring-1 ring-emerald-500/30' : ''
                    }`}
                  >
                    
                    {/* KOLOM 1: IDENTITAS CABANG & AKSES KASIR TOKO */}
                    <td className="py-3.5 px-3.5 align-top min-w-[210px]">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono font-black text-xs text-brand-dark bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          #{cbg.nomor} • {cbg.kode}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.2 rounded-full text-[9px] font-extrabold ${
                          cbg.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {cbg.is_active ? '● Aktif' : '○ Tutup'}
                        </span>
                      </div>

                      <div className="font-extrabold text-slate-900 text-xs mt-1 leading-snug">
                        {cbg.nama}
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-start space-x-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{cbg.alamat ? `${cbg.alamat} (${cbg.kota})` : cbg.kota}</span>
                      </div>

                      {/* Akses Kasir Toko Tablet POS */}
                      <div className="mt-2 pt-1.5 border-t border-slate-100 space-y-1">
                        <div className="flex items-center space-x-1 text-[10px] text-blue-900 font-bold">
                          <Laptop className="w-3 h-3 text-blue-600" />
                          <span>Kasir POS:</span>
                          <span className="font-mono bg-blue-50 px-1.5 py-0.2 rounded text-blue-800 border border-blue-200">
                            {cbg.kasir_username || `kasir_cbg${cbg.nomor}`}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Pass: <strong className="text-slate-800">{cbg.kasir_password_plain || '-'}</strong>
                        </div>
                      </div>
                    </td>

                    {/* KOLOM 2: BEBAN TETAP (FIXED COST) - BISA DIEDIT LANGSUNG */}
                    <td className="py-3.5 px-3.5 align-top min-w-[220px]">
                      <div className="space-y-1 bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/70">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-600 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-amber-700" />
                            <span>1. Sewa Ruko:</span>
                          </span>
                          <span className="font-mono font-bold text-slate-900">{formatRupiah(sewaBulanan)}/bln</span>
                        </div>

                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-600 flex items-center gap-1">
                            <Wifi className="w-3 h-3 text-blue-600" />
                            <span>2. Wi-Fi &amp; Listrik:</span>
                          </span>
                          <span className="font-mono font-bold text-slate-900">{formatRupiah(wifiBulanan)}/bln</span>
                        </div>

                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-600">3. Iuran &amp; Retribusi:</span>
                          <span className="font-mono font-bold text-slate-900">{formatRupiah(iuranBulanan)}/bln</span>
                        </div>

                        <div className="pt-1.5 border-t border-amber-200/80 flex justify-between items-center text-xs font-black text-amber-950">
                          <span>Total Tetap / Bulan:</span>
                          <span className="font-mono">{formatRupiah(totalFixedBulanan)}</span>
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-rose-700 font-extrabold pt-0.5">
                          <span>Potongan Otomatis:</span>
                          <span className="font-mono">-{formatRupiah(totalFixedHarian)}/hari</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onEditCabang(cbg)}
                        className="mt-1.5 w-full flex items-center justify-center space-x-1 py-1 px-2 rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 text-[10px] font-extrabold transition-colors shadow-2xs"
                        title="Sesuaikan sewa ruko, Wi-Fi, dan iuran cabang ini"
                      >
                        <Pencil className="w-2.5 h-2.5 text-amber-600" />
                        <span>Edit Sewa &amp; Biaya Tetap</span>
                      </button>
                    </td>

                    {/* KOLOM 3: KARYAWAN BERTUGAS & GAJI HADIR */}
                    <td className="py-3.5 px-3.5 align-top min-w-[200px]">
                      <div className="space-y-1.5">
                        {/* Penanggung Jawab Outlet */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Kepala Toko / PJ:</span>
                          <span className="font-extrabold text-slate-900 text-xs block leading-tight">
                            {cbg.pj_nama || 'Kepala Toko'}
                          </span>
                          {cbg.pj_telepon && (
                            <a
                              href={`https://wa.me/${cbg.pj_telepon.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-emerald-700 font-bold hover:underline inline-flex items-center space-x-1 mt-0.5"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600 fill-emerald-100" />
                              <span>{cbg.pj_telepon}</span>
                            </a>
                          )}
                        </div>

                        {/* Staf Bertugas & Hadir */}
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Staf Terdaftar:</span>
                            <span className="font-mono font-bold text-slate-800">{branchWorkers.length} Staf</span>
                          </div>
                          <div className="flex justify-between items-center text-emerald-800 font-bold">
                            <span>Presensi Hari Ini:</span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 font-mono">
                              {b.stafHadirCount} Hadir
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-rose-700 font-mono font-bold text-[10px] pt-1 border-t border-slate-200">
                            <span>Upah Terpotong:</span>
                            <span>-{formatRupiah(b.totalGajiKaryawan)}</span>
                          </div>
                        </div>

                        {onNavigateToTab && (
                          <button
                            type="button"
                            onClick={() => onNavigateToTab('absensi')}
                            className="text-[10px] text-brand-primary font-bold hover:underline flex items-center space-x-1"
                          >
                            <Users className="w-3 h-3" />
                            <span>Lihat Presensi Staf →</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* KOLOM 4: BAHAN BAKU & RESEP */}
                    <td className="py-3.5 px-3.5 align-top min-w-[190px]">
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-1.5">
                          {hasSelisih ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Ada Selisih Fisik</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Stok Terkontrol</span>
                            </span>
                          )}
                        </div>

                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">HPP Bahan Kasir:</span>
                            <span className="font-mono font-bold text-rose-600">
                              -{formatRupiah(b.totalHppBahan)}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            *Dihitung otomatis dari porsi serabi &amp; wedang terjual
                          </div>
                        </div>

                        {onOpenKirimanBahanModal && (
                          <button
                            type="button"
                            onClick={() => onOpenKirimanBahanModal(cbg.id)}
                            className="w-full flex items-center justify-center space-x-1 py-1 px-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[10px] font-bold transition-colors shadow-2xs"
                            title="Kirim pasokan bahan baku dari pusat ke cabang ini"
                          >
                            <PackageCheck className="w-3 h-3 text-emerald-600" />
                            <span>+ Kirim Pasokan Bahan</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* KOLOM 5: OMZET & UANG BERSIH MASUK REKENING BOSS */}
                    <td className="py-3.5 px-3.5 align-top text-right min-w-[210px] bg-amber-50/20">
                      <div className="space-y-1">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Omzet Kotor Kasir:</span>
                          <span className="font-mono font-extrabold text-sm text-slate-900">
                            {formatRupiah(b.omzetKotor)}
                          </span>
                        </div>

                        <div className="text-[10px] text-rose-600 font-mono space-y-0.5 pt-1 border-t border-slate-200/80">
                          <div className="flex justify-between">
                            <span>Sewa/hr:</span>
                            <span>-{formatRupiah(b.sewaHarian)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Wifi+Listrik/hr:</span>
                            <span>-{formatRupiah(b.wifiListrikHarian + b.iuranHarian)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Gaji Staf Hadir:</span>
                            <span>-{formatRupiah(b.totalGajiKaryawan)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>HPP Bahan:</span>
                            <span>-{formatRupiah(b.totalHppBahan)}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t-2 border-amber-300">
                          <span className="text-[10px] uppercase font-black text-amber-900 block tracking-wider">
                            Bersih Masuk Rekening Boss:
                          </span>
                          <span className="font-mono font-black text-sm sm:text-base text-emerald-800 block">
                            {formatRupiah(b.uangBersihBoss)}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-mono mt-0.5">
                            BCA: 8820-192-881 (Pak Agan)
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* KOLOM 6: AKSI KELOLA */}
                    <td className="py-3.5 px-3 align-top text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditCabang(cbg)}
                          className="w-full flex items-center justify-center space-x-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs transition-colors shadow-sm"
                          title="Ubah profil, sewa, Wi-Fi, dan target omzet"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Ubah Cabang</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectCabang(cbg.id)}
                          className={`w-full flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                            isSelected 
                              ? 'bg-emerald-700 text-white shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title="Filter transaksi dashboard khusus cabang ini"
                        >
                          <span>{isSelected ? '✓ Terpilih' : 'Filter Mutasi'}</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>

            {/* TABEL FOOTER TOTAL KONSOLIDASI 10 TOKO */}
            <tfoot className="bg-slate-950 text-white font-extrabold text-xs border-t-2 border-amber-400">
              <tr>
                <td className="py-4 px-3.5">
                  <div className="text-amber-300 uppercase tracking-wider text-[11px] font-black">
                    TOTAL KONSOLIDASI 10 CABANG RESMI
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Rekapitulasi beban tetap, staf &amp; setoran bersih Boss
                  </div>
                </td>

                <td className="py-4 px-3.5 text-xs text-rose-300 font-mono">
                  <div>Sewa: -{formatRupiah(bossDailyProfits.totalSewa10Toko)}/hr</div>
                  <div>Wifi &amp; Utilitas: -{formatRupiah(bossDailyProfits.totalWifiListrik10Toko + bossDailyProfits.totalIuran10Toko)}/hr</div>
                </td>

                <td className="py-4 px-3.5 text-xs text-rose-300 font-mono">
                  Gaji Staf: -{formatRupiah(bossDailyProfits.totalGaji10Toko)}/hr
                </td>

                <td className="py-4 px-3.5 text-xs text-rose-300 font-mono">
                  HPP Bahan: -{formatRupiah(bossDailyProfits.totalHpp10Toko)}/hr
                </td>

                <td className="py-4 px-3.5 text-right bg-black/40">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Bersih Rekening Boss:</span>
                  <span className="text-lg font-mono font-black text-amber-300 block">
                    {formatRupiah(bossDailyProfits.totalBersihBoss10Toko)}
                  </span>
                  <span className="text-[9px] text-emerald-400 block">
                    Siap ditransfer ke BCA Pak Agan
                  </span>
                </td>

                <td className="py-4 px-3 text-center text-[10px] text-emerald-300">
                  ✓ 10/10 Terkalkulasi
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* 4. VIEW MODE: KARTU TARGET OMZET BULANAN (GRID VIEW) */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
          {filteredBranches.map(cbg => {
            const b = bossDailyProfits.branchBreakdowns.find(br => br.cabang.id === cbg.id) || {
              cabang: cbg,
              sewaHarian: Math.round((cbg.sewa_bulanan || 3500000) / 30),
              wifiListrikHarian: Math.round((cbg.listrik_air_bulanan || 650000) / 30),
              iuranHarian: Math.round((cbg.iuran_kebersihan_bulanan || 150000) / 30),
              totalGajiKaryawan: 0,
              totalHppBahan: 0,
              totalPotongan: 0,
              omzetKotor: 0,
              uangBersihBoss: 0,
              stafHadirCount: 0,
            };

            const cbgTrx = transaksiList.filter(t => isBranchMatch(t.cabang_id, cbg.id) && t.status === 'completed');
            const cbgOmzet = cbgTrx.reduce((sum, t) => sum + t.total, 0);
            const target = cbg.target_omzet_bulanan || 35000000;
            const progress = Math.min(100, Math.round((cbgOmzet / target) * 100));

            const sewa = cbg.sewa_bulanan || 3500000;
            const wifi = cbg.listrik_air_bulanan || 650000;
            const isSelected = isBranchMatch(selectedCabangId, cbg.id);

            return (
              <div 
                key={cbg.id}
                onClick={() => onSelectCabang(cbg.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer btn-tactile flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-soft-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {cbg.kode}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">• {cbg.kota}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditCabang(cbg);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-[10px] font-bold flex items-center space-x-1 transition-colors shadow-2xs"
                      title="Ubah data & fixed cost cabang"
                    >
                      <Pencil className="w-2.5 h-2.5 text-amber-600" />
                      <span>Edit Cabang</span>
                    </button>
                  </div>

                  <h3 className="text-xs font-extrabold text-slate-900 mt-2 truncate">
                    {cbg.nama}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    PJ: {cbg.pj_nama || 'Kepala Toko'} • {cbg.pj_telepon || cbg.telepon}
                  </p>

                  {/* Fixed Cost Info Pill */}
                  <div className="mt-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Sewa Ruko:</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(sewa)}/bln</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Wi-Fi &amp; Listrik:</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(wifi)}/bln</span>
                    </div>
                  </div>

                  {/* Omzet & Bersih Hari Ini */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Omzet Kasir:</span>
                      <span className="font-mono font-extrabold text-xs text-slate-900">
                        {formatRupiah(b.omzetKotor)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-amber-800 font-bold block">Bersih Boss / hr:</span>
                      <span className="font-mono font-black text-xs text-emerald-800">
                        {formatRupiah(b.uangBersihBoss)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Target */}
                  <div className="mt-3 space-y-1">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                      <div 
                        className="bg-emerald-600 h-full rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Target: {formatRupiah(target)}</span>
                      <span className="font-bold text-slate-700">{progress}%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">User: {cbg.kasir_username || 'kasir'} • Pass: {cbg.kasir_password_plain || '-'}</span>
                  <span className="text-brand-primary font-bold">{isSelected ? '✓ Terpilih' : 'Klik Filter'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
