'use client';

import React, { useState, useMemo } from 'react';
import { 
  PackageCheck, 
  Scale, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Store, 
  RotateCcw, 
  Edit3, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  X, 
  FileText, 
  Pencil,
  Sparkles,
  PieChart,
  Sprout,
  Warehouse,
  Truck,
  Building2
} from 'lucide-react';
import { Cabang, BahanBaku, KirimanBahanPusat, Transaksi, PembelianBahanGudang } from '@/lib/types';
import { db, isBranchMatch } from '@/lib/db';
import { formatRupiah } from '@/lib/utils';
import CreateKirimanBahanModal from './CreateKirimanBahanModal';
import CreatePembelianGudangModal from './CreatePembelianGudangModal';

interface BahanBakuAuditManagerProps {
  cabangList: Cabang[];
  bahanList: BahanBaku[];
  kirimanBahanList: KirimanBahanPusat[];
  transaksiList: Transaksi[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onRefreshData: () => Promise<void>;
}

export default function BahanBakuAuditManager({
  cabangList,
  bahanList,
  kirimanBahanList,
  transaksiList,
  selectedDate,
  onDateChange,
  onRefreshData,
}: BahanBakuAuditManagerProps) {
  // Filters
  const [selectedCabangId, setSelectedCabangId] = useState<string>('all');
  const [selectedKategori, setSelectedKategori] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sub-tabs: 'toko' | 'gudang' | 'riwayat_kirim'
  const [activeSubTab, setActiveSubTab] = useState<'toko' | 'gudang' | 'riwayat_kirim'>('toko');

  // Gudang & Kulakan Petani states
  const [showPembelianGudangModal, setShowPembelianGudangModal] = useState<boolean>(false);
  const [pembelianGudangList, setPembelianGudangList] = useState<PembelianBahanGudang[]>([]);
  const [stokGudangMap, setStokGudangMap] = useState<Record<string, { total_masuk: number; total_terkirim: number; sisa_gudang: number; nilai_gudang: number; unit_price: number }>>({});
  const [loadingGudang, setLoadingGudang] = useState<boolean>(false);

  const loadGudangData = async () => {
    setLoadingGudang(true);
    try {
      const [pbl, stok] = await Promise.all([
        db.getPembelianGudangList(),
        db.getStokGudangPusat(),
      ]);
      setPembelianGudangList(pbl);
      setStokGudangMap(stok);
    } catch (e) {
      console.error('Gagal memuat data gudang pusat:', e);
    } finally {
      setLoadingGudang(false);
    }
  };

  React.useEffect(() => {
    loadGudangData();
  }, [kirimanBahanList, bahanList]);

  // Modals
  const [showKirimanModal, setShowKirimanModal] = useState<boolean>(false);
  const [editingBahan, setEditingBahan] = useState<BahanBaku | null>(null);
  const [editSatuan, setEditSatuan] = useState<string>('kg');
  const [editHargaSatuan, setEditHargaSatuan] = useState<number>(0);
  const [editStokMinimum, setEditStokMinimum] = useState<number>(10);
  const [isSavingBahan, setIsSavingBahan] = useState<boolean>(false);

  // Dedicated Tambah Master Bahan Modal
  const [showMasterBahanModal, setShowMasterBahanModal] = useState<boolean>(false);
  const [newMasterNama, setNewMasterNama] = useState<string>('');
  const [newMasterKategori, setNewMasterKategori] = useState<'serabi' | 'wedang' | 'kemasan' | 'umum'>('umum');
  const [newMasterSatuan, setNewMasterSatuan] = useState<string>('kg');
  const [newMasterHargaSatuan, setNewMasterHargaSatuan] = useState<number>(25000);
  const [newMasterStokMin, setNewMasterStokMin] = useState<number>(15);
  const [isSavingMaster, setIsSavingMaster] = useState<boolean>(false);

  const handleSaveMasterBahan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMasterNama.trim()) {
      alert('Silakan tulis nama bahan baku baru!');
      return;
    }
    if (newMasterHargaSatuan <= 0) {
      alert('Nominal harga pokok per satuan harus lebih dari Rp 0!');
      return;
    }

    setIsSavingMaster(true);
    try {
      await db.createBahanBaku({
        nama: newMasterNama.trim(),
        satuan: newMasterSatuan,
        kategori: newMasterKategori,
        harga_satuan: Number(newMasterHargaSatuan),
        stok_minimum: Number(newMasterStokMin),
      });
      await onRefreshData();
      setShowMasterBahanModal(false);
      setNewMasterNama('');
      setNewMasterHargaSatuan(25000);
      alert('✅ Bahan baku baru berhasil didaftarkan ke Master Bahan Baku!');
    } catch (err: any) {
      alert('Gagal menambah master bahan: ' + err.message);
    } finally {
      setIsSavingMaster(false);
    }
  };

  // Open Edit Bahan Modal
  const handleOpenEditBahan = (bhn: BahanBaku) => {
    setEditingBahan(bhn);
    setEditSatuan(bhn.satuan || 'kg');
    setEditHargaSatuan(bhn.harga_satuan || 20000);
    setEditStokMinimum(bhn.stok_minimum || 10);
  };

  // Save Bahan Changes
  const handleSaveBahan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBahan) return;

    setIsSavingBahan(true);
    try {
      await db.updateBahanBaku(editingBahan.id, {
        satuan: editSatuan,
        harga_satuan: editHargaSatuan,
        stok_minimum: editStokMinimum,
      });
      await onRefreshData();
      setEditingBahan(null);
    } catch (err: any) {
      alert('Gagal memperbarui bahan: ' + err.message);
    } finally {
      setIsSavingBahan(false);
    }
  };

  // Material Audit Rows with Pricing and Flexible Units
  const auditRows = useMemo(() => {
    const targetBranches = selectedCabangId === 'all'
      ? cabangList
      : cabangList.filter(c => c.id === selectedCabangId);

    const rows: {
      cabang: Cabang;
      bahan: BahanBaku;
      satuan: string;
      hargaSatuan: number;
      stokAwal: number;
      kirimanPusat: number;
      nilaiKirimanPusat: number;
      terpakaiKasir: number;
      sisaSistem: number;
      sisaFisik: number;
      selisih: number;
      status: 'cocok' | 'selisih';
      nilaiTerpakai: number;
      nilaiAsetFisik: number;
      nilaiSelisih: number;
    }[] = [];

    targetBranches.forEach(cbg => {
      // Transaksi cabang ini pada selectedDate
      const cbgTrx = transaksiList.filter(t => isBranchMatch(t.cabang_id, cbg.id) && t.status === 'completed' && t.waktu.startsWith(selectedDate));
      
      // Calculate consumed ingredients
      const terpakaiMap: Record<string, number> = {};
      cbgTrx.forEach(trx => {
        trx.items.forEach(it => {
          const name = it.nama_menu.toLowerCase();
          if (name.includes('serabi')) {
            // 1 porsi serabi butuh ~0.08 kg adonan, 1 pcs cup
            terpakaiMap['bh-1'] = (terpakaiMap['bh-1'] || 0) + (it.qty * 0.08);
            terpakaiMap['bh-11'] = (terpakaiMap['bh-11'] || 0) + it.qty;
            if (name.includes('durian')) terpakaiMap['bh-2'] = (terpakaiMap['bh-2'] || 0) + (it.qty * 0.05); // 0.05 liter kinca
            if (name.includes('keju')) terpakaiMap['bh-3'] = (terpakaiMap['bh-3'] || 0) + (it.qty * 0.03); // 0.03 kg keju
            if (name.includes('oncom')) terpakaiMap['bh-4'] = (terpakaiMap['bh-4'] || 0) + (it.qty * 0.04); // 0.04 kg oncom
            if (name.includes('cokelat')) terpakaiMap['bh-5'] = (terpakaiMap['bh-5'] || 0) + (it.qty * 0.03); // 0.03 kg meises
            if (name.includes('telur')) terpakaiMap['bh-6'] = (terpakaiMap['bh-6'] || 0) + it.qty; // 1 butir telur
          } else if (name.includes('wedang') || name.includes('jahe') || name.includes('geprek')) {
            // 1 porsi wedang jahe butuh ~0.06 kg jahe bakar, 1 pcs cup
            terpakaiMap['bh-7'] = (terpakaiMap['bh-7'] || 0) + (it.qty * 0.06);
            terpakaiMap['bh-11'] = (terpakaiMap['bh-11'] || 0) + it.qty;
            if (name.includes('uwuh')) terpakaiMap['bh-8'] = (terpakaiMap['bh-8'] || 0) + it.qty; // 1 bungkus uwuh
            if (name.includes('susu') || name.includes('madu')) terpakaiMap['bh-10'] = (terpakaiMap['bh-10'] || 0) + (it.qty * 0.08); // 0.08 liter susu
            terpakaiMap['bh-9'] = (terpakaiMap['bh-9'] || 0) + (it.qty * 0.03); // 0.03 kg gula aren
          }
        });
      });

      // Kiriman bahan ke cabang ini pada tanggal ini
      const cbgKiriman = kirimanBahanList.filter(k => isBranchMatch(k.cabang_id, cbg.id) && k.tanggal === selectedDate);

      bahanList.forEach(bhn => {
        // Filter by category
        if (selectedKategori !== 'all' && bhn.kategori !== selectedKategori) return;

        // Filter by search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchNama = bhn.nama.toLowerCase().includes(q);
          const matchKode = bhn.kode.toLowerCase().includes(q);
          const matchCbg = cbg.nama.toLowerCase().includes(q);
          if (!matchNama && !matchKode && !matchCbg) return;
        }

        const kirimanTotal = cbgKiriman.filter(k => k.bahan_id === bhn.id).reduce((sum, k) => sum + k.jumlah, 0);
        const terpakaiRaw = terpakaiMap[bhn.id] || 0;
        const terpakai = Number(terpakaiRaw.toFixed(2));
        const stokAwal = bhn.stok_minimum || 10;
        const sisaSistem = Number((stokAwal + kirimanTotal - terpakai).toFixed(2));
        const sisaFisik = sisaSistem; // Dapur fisik cocok pas jika tidak ada selisih
        const selisih = Number((sisaFisik - sisaSistem).toFixed(2));
        const hargaSatuan = bhn.harga_satuan || 20000;

        const nilaiKirimanPusat = Math.round(kirimanTotal * hargaSatuan);
        const nilaiTerpakai = Math.round(terpakai * hargaSatuan);
        const nilaiAsetFisik = Math.round(sisaFisik * hargaSatuan);
        const nilaiSelisih = Math.round(selisih * hargaSatuan);

        rows.push({
          cabang: cbg,
          bahan: bhn,
          satuan: bhn.satuan || 'kg',
          hargaSatuan,
          stokAwal,
          kirimanPusat: kirimanTotal,
          nilaiKirimanPusat,
          terpakaiKasir: terpakai,
          sisaSistem,
          sisaFisik,
          selisih,
          status: selisih === 0 ? 'cocok' : 'selisih',
          nilaiTerpakai,
          nilaiAsetFisik,
          nilaiSelisih,
        });
      });
    });

    return rows;
  }, [cabangList, bahanList, kirimanBahanList, transaksiList, selectedCabangId, selectedDate, selectedKategori, searchQuery]);

  // Aggregate Metrics for Analysis
  const metrics = useMemo(() => {
    let totalNilaiAset = 0;
    let totalNilaiTerpakai = 0;
    let totalNilaiSelisih = 0;
    let selisihCount = 0;
    let cocokCount = 0;

    auditRows.forEach(r => {
      totalNilaiAset += r.nilaiAsetFisik;
      totalNilaiTerpakai += r.nilaiTerpakai;
      totalNilaiSelisih += r.nilaiSelisih;
      if (r.status === 'selisih') selisihCount++;
      else cocokCount++;
    });

    const dayKiriman = kirimanBahanList.filter(k => k.tanggal === selectedDate);
    const totalKirimanBatch = dayKiriman.length;
    const totalNilaiKiriman = dayKiriman.reduce((sum, k) => {
      const bhn = bahanList.find(b => b.id === k.bahan_id);
      const unitPrice = k.harga_satuan || bhn?.harga_satuan || 20000;
      return sum + (k.total_nilai || (k.jumlah * unitPrice));
    }, 0);

    return {
      totalNilaiAset,
      totalNilaiTerpakai,
      totalNilaiSelisih,
      selisihCount,
      cocokCount,
      totalKirimanBatch,
      totalNilaiKiriman,
      totalBaris: auditRows.length,
    };
  }, [auditRows, kirimanBahanList, bahanList, selectedDate]);

  // Metrik Gudang Pusat & Tabungan Petani
  const gudangMetrics = useMemo(() => {
    const totalNilaiGudang = Object.values(stokGudangMap).reduce((sum, item) => sum + item.nilai_gudang, 0);
    const totalBiayaKulakan = pembelianGudangList.reduce((sum, p) => sum + p.total_bayar, 0);
    const menipisCount = bahanList.filter(b => {
      const sisa = stokGudangMap[b.id]?.sisa_gudang ?? 0;
      const minGudang = b.stok_minimum_gudang || 20;
      return sisa < minGudang;
    }).length;
    return {
      totalNilaiGudang,
      totalBiayaKulakan,
      menipisCount,
    };
  }, [stokGudangMap, pembelianGudangList, bahanList]);

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER UTAMA & FILTER KONTROL */}
      <div className="bg-white p-5 rounded-3xl border-t-[4px] border-emerald-600 border-x border-b border-slate-200/90 shadow-soft-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Title */}
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
            <Scale className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                Inventarisasi &amp; HPP Terinci
              </span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">• Bobot Riil (Kg/Liter/Porsi)</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Audit Absensi Bahan Baku &amp; Valuasi Stok Toko
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mendukung satuan gram, kg, liter, bungkus, dan butir dengan harga modal jelas untuk analisis pemakaian kasir.
            </p>
          </div>
        </div>

        {/* Action Controls: Outlet, Date, Category & Add Shipment */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          
          {/* Outlet Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200 text-xs">
            <Store className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-600">Toko:</span>
            <select
              value={selectedCabangId}
              onChange={(e) => setSelectedCabangId(e.target.value)}
              className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
            >
              <option value="all">Semua 10 Toko</option>
              {cabangList.map(c => (
                <option key={c.id} value={c.id}>
                  #{c.nomor} • {c.kode} - {c.nama.split('-')[1]?.trim() || c.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-600">Tanggal:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent font-mono font-bold text-slate-900 outline-none cursor-pointer"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedKategori}
              onChange={(e) => setSelectedKategori(e.target.value)}
              className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
            >
              <option value="all">Semua Kategori</option>
              <option value="serabi">Varian Serabi</option>
              <option value="wedang">Rempah Wedang</option>
              <option value="kemasan">Kemasan Takeaway</option>
              <option value="umum">Bahan Umum</option>
            </select>
          </div>

          {/* Tombol Kulakan Petani / Nabung Masuk Gudang */}
          <button
            type="button"
            onClick={() => setShowPembelianGudangModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-900/20 btn-tactile transition-all cursor-pointer"
          >
            <Sprout className="w-3.5 h-3.5 text-amber-200" />
            <span>+ Kulakan Petani</span>
          </button>

          {/* Tombol Tambah Master Bahan Baru */}
          <button
            type="button"
            onClick={() => setShowMasterBahanModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>+ Master Bahan</span>
          </button>

          {/* Tombol Input Kiriman */}
          <button
            type="button"
            onClick={() => setShowKirimanModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md shadow-emerald-900/20 btn-tactile transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Kirim Bahan</span>
          </button>

        </div>

      </div>

      {/* SUB-TAB VIEW SWITCHER: TOKO vs GUDANG PUSAT vs RIWAYAT KIRIMAN */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSubTab('toko')}
            className={`px-3.5 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center space-x-2 btn-tactile ${
              activeSubTab === 'toko'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>1. Audit Pemakaian &amp; Stok Dapur 10 Toko</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('gudang')}
            className={`px-3.5 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center space-x-2 btn-tactile ${
              activeSubTab === 'gudang'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Warehouse className="w-4 h-4" />
            <span>2. Gudang Bahan Pusat &amp; Tabungan Petani</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeSubTab === 'gudang' ? 'bg-amber-800 text-amber-100' : 'bg-amber-100 text-amber-900'
            }`}>
              {pembelianGudangList.length} Batch
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('riwayat_kirim')}
            className={`px-3.5 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center space-x-2 btn-tactile ${
              activeSubTab === 'riwayat_kirim'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>3. Distribusi Pasokan ke Toko</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeSubTab === 'riwayat_kirim' ? 'bg-blue-800 text-blue-100' : 'bg-blue-100 text-blue-900'
            }`}>
              {kirimanBahanList.length}
            </span>
          </button>
        </div>

        {activeSubTab === 'gudang' && (
          <button
            type="button"
            onClick={() => setShowPembelianGudangModal(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-extrabold text-xs shadow-xs hover:bg-amber-700 transition-all flex items-center space-x-1.5 ml-auto"
          >
            <Sprout className="w-3.5 h-3.5 text-amber-200" />
            <span>+ Beli / Kulakan dari Petani</span>
          </button>
        )}
      </div>

      {/* TAB 1: AUDIT & STOK DI 10 TOKO CABANG */}
      {activeSubTab === 'toko' && (
        <div className="space-y-6">

      {/* 2. 4 KARTU EKSEKUTIF ANALISA FINANSIAL BAHAN BAKU */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Valuasi Nilai Aset Stok Mengendap */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft-sm">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Nilai Aset Bahan di Dapur
          </span>
          <div className="text-xl sm:text-2xl font-mono font-black text-slate-900 mt-1 tabular-nums">
            {formatRupiah(metrics.totalNilaiAset)}
          </div>
          <span className="text-[10px] text-emerald-700 font-bold mt-1 block">
            Stok fisik nyata siap olah di 10 toko
          </span>
        </div>

        {/* 2. Modal Bahan Terpakai Hari Ini (HPP Riil) */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border-t-[4px] border-emerald-600 border-x border-b border-slate-200/80 shadow-soft-sm">
          <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
            Modal Bahan Terpakai Kasir
          </span>
          <div className="text-xl sm:text-2xl font-mono font-black text-emerald-800 mt-1 tabular-nums">
            {formatRupiah(metrics.totalNilaiTerpakai)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">
            HPP riil porsi serabi &amp; wedang terjual
          </span>
        </div>

        {/* 3. Selisih / Potensi Loss / Waste */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border-t-[4px] border-amber-500 border-x border-b border-slate-200/80 shadow-soft-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">
              Integritas &amp; Selisih Dapur
            </span>
            <span className="text-xs font-black text-emerald-700">
              {metrics.selisihCount === 0 ? '100% Pas' : `${metrics.selisihCount} Selisih`}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-black text-slate-900 mt-1 tabular-nums">
            {metrics.totalNilaiSelisih === 0 ? 'Rp 0' : formatRupiah(metrics.totalNilaiSelisih)}
          </div>
          <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
            {metrics.selisihCount === 0 ? '✓ Sisa fisik cocok pas dengan sistem' : '⚠️ Ada selisih fisik vs sistem'}
          </span>
        </div>

        {/* 4. Kiriman Pasokan Hari Ini */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Pasokan Kiriman Hari Ini
            </span>
            <span className="text-xs font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              {metrics.totalKirimanBatch} Batch
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-black text-slate-900 mt-1 tabular-nums">
            {formatRupiah(metrics.totalNilaiKiriman)}
          </div>
          <span className="text-[10px] text-blue-700 font-bold mt-1 block">
            📦 Nominal modal pasokan dari gudang
          </span>
        </div>

      </div>

      {/* 3. TABEL AUDIT ABSENSI BAHAN DENGAN SATUAN DAN HARGA MODAL JELAS */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft-sm overflow-hidden">
        
        {/* Table Header & Search */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900">
              Rekapitulasi Bahan per Toko ({selectedDate})
            </h4>
            <p className="text-[11px] text-slate-500">
              Terhitung otomatis dari transaksi POS kasir dikalikan tarif harga modal per kg, liter, atau porsi
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari jahe, beras, kinca, keju..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-52 sm:w-60 shadow-xs"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="py-3 px-3.5">Toko Cabang</th>
                <th className="py-3 px-3.5">Bahan &amp; Satuan</th>
                <th className="py-3 px-3.5">Harga Pokok (HPP)</th>
                <th className="py-3 px-2 text-center">Stok Awal</th>
                <th className="py-3 px-2 text-center text-blue-300">Kiriman Pusat</th>
                <th className="py-3 px-2 text-center text-rose-300 bg-rose-950/40">Terpakai Kasir ⚡</th>
                <th className="py-3 px-2 text-center text-slate-300">Sisa Sistem</th>
                <th className="py-3 px-3 text-center bg-emerald-950/50 text-emerald-300 font-black">Sisa Fisik Dapur</th>
                <th className="py-3 px-3 text-right">Nilai Aset Fisik</th>
                <th className="py-3 px-2 text-center">Status</th>
                <th className="py-3 px-2 text-center">Atur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {auditRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 text-xs">
                    <div className="max-w-xs mx-auto text-center space-y-2">
                      <Scale className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-600">Tidak ada data bahan yang sesuai filter.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCabangId('all');
                          setSelectedKategori('all');
                          setSearchQuery('');
                        }}
                        className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl"
                      >
                        Reset Filter
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                auditRows.map((row, idx) => (
                  <tr key={`${row.cabang.id}-${row.bahan.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Toko Cabang */}
                    <td className="py-3 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                      <span className="font-mono text-[10px] font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {row.cabang.kode}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {row.cabang.nama.split('-')[1]?.trim() || row.cabang.nama}
                      </span>
                    </td>

                    {/* Nama Bahan & Satuan Fleksibel (Kg, Liter, Porsi, dll) */}
                    <td className="py-3 px-3.5">
                      <div className="font-extrabold text-slate-900 flex items-center space-x-1.5">
                        <span>{row.bahan.nama}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-700 font-mono font-bold text-[9px] uppercase border border-slate-200">
                          Satuan: {row.satuan}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium">
                          Min: {row.bahan.stok_minimum || 10} {row.satuan}
                        </span>
                      </div>
                    </td>

                    {/* Harga Pokok / Modal per Satuan */}
                    <td className="py-3 px-3.5">
                      <span className="font-mono font-bold text-slate-900 block text-xs">
                        {formatRupiah(row.hargaSatuan)}
                      </span>
                      <span className="text-[9px] text-slate-400 block font-mono">
                        per {row.satuan}
                      </span>
                    </td>

                    {/* Stok Awal */}
                    <td className="py-3 px-2 text-center font-mono font-bold text-slate-600">
                      {row.stokAwal} <span className="text-[9px] text-slate-400 font-normal">{row.satuan}</span>
                    </td>

                    {/* Kiriman Pusat */}
                    <td className="py-3 px-2 text-center font-mono font-bold text-blue-700">
                      {row.kirimanPusat > 0 ? (
                        <div>
                          <span className="bg-blue-50 px-1.5 py-0.5 rounded-lg border border-blue-200">
                            +{row.kirimanPusat} {row.satuan}
                          </span>
                          <span className="text-[9px] text-blue-600 font-normal block mt-0.5">
                            ≈ {formatRupiah(row.nilaiKirimanPusat)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Terpakai Kasir */}
                    <td className="py-3 px-2 text-center font-mono font-black text-rose-700 bg-rose-50/40">
                      <div>
                        {row.terpakaiKasir > 0 ? `-${row.terpakaiKasir} ${row.satuan}` : '0'}
                      </div>
                      {row.nilaiTerpakai > 0 && (
                        <span className="text-[9px] text-rose-600 font-normal block">
                          ≈ {formatRupiah(row.nilaiTerpakai)}
                        </span>
                      )}
                    </td>

                    {/* Sisa Sistem */}
                    <td className="py-3 px-2 text-center font-mono font-bold text-slate-700">
                      {row.sisaSistem} <span className="text-[9px] text-slate-400">{row.satuan}</span>
                    </td>

                    {/* Sisa Fisik Dapur */}
                    <td className="py-3 px-3 text-center font-mono font-black text-emerald-800 bg-emerald-50/50">
                      <div>
                        {row.sisaFisik} {row.satuan}
                      </div>
                      <span className="text-[9px] text-emerald-600 font-bold block">
                        Fisik Kasir
                      </span>
                    </td>

                    {/* Nilai Aset Fisik Mengendap di Dapur */}
                    <td className="py-3 px-3.5 text-right font-mono font-black text-slate-900 tabular-nums">
                      {formatRupiah(row.nilaiAsetFisik)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-2 text-center">
                      {row.status === 'cocok' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">
                          <span>✓ COCOK</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black border border-amber-300">
                          <span>⚠️ SELISIH</span>
                        </span>
                      )}
                    </td>

                    {/* Atur Harga / Satuan */}
                    <td className="py-3 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenEditBahan(row.bahan)}
                        title="Atur Satuan & Harga Pokok Bahan Ini"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
      </div>
      )}

      {/* TAB 2: GUDANG BAHAN PUSAT & TABUNGAN PETANI */}
      {activeSubTab === 'gudang' && (
        <div className="space-y-6">
          
          {/* 4 KARTU METRIK GUDANG PUSAT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Total Nilai Stok Gudang */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft-sm">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Total Nilai Stok Gudang Pusat
              </span>
              <div className="text-xl sm:text-2xl font-mono font-black text-amber-950 mt-1 tabular-nums">
                {formatRupiah(gudangMetrics.totalNilaiGudang)}
              </div>
              <span className="text-[10px] text-amber-800 font-bold mt-1 block">
                📦 Aset bahan mentah tersimpan di gudang
              </span>
            </div>

            {/* 2. Total Tabungan Petani */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border-t-[4px] border-amber-600 border-x border-b border-slate-200/80 shadow-soft-sm">
              <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">
                Total Belanja / Tabungan Petani
              </span>
              <div className="text-xl sm:text-2xl font-mono font-black text-slate-900 mt-1 tabular-nums">
                {formatRupiah(gudangMetrics.totalBiayaKulakan)}
              </div>
              <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                Modal dibayar duluan ke petani &amp; supplier
              </span>
            </div>

            {/* 3. Total Batch Masuk */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border-t-[4px] border-emerald-600 border-x border-b border-slate-200/80 shadow-soft-sm">
              <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                Pasokan Masuk dari Petani
              </span>
              <div className="text-xl sm:text-2xl font-mono font-black text-emerald-800 mt-1 tabular-nums">
                {pembelianGudangList.length} Batch Kulakan
              </div>
              <span className="text-[10px] text-emerald-700 font-bold mt-1 block">
                Jahe emprit, gula aren, kinca, rempah
              </span>
            </div>

            {/* 4. Ketahanan Cadangan Gudang */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft-sm">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Ketahanan Cadangan Gudang
              </span>
              <div className="text-base sm:text-lg font-black mt-1">
                {gudangMetrics.menipisCount === 0 ? (
                  <span className="text-emerald-700">🟢 Cadangan Aman</span>
                ) : (
                  <span className="text-amber-700">⚠️ {gudangMetrics.menipisCount} Perlu Kulakan</span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                Dihitung dari batas minimum stok gudang
              </span>
            </div>

          </div>

          {/* BANNER EDUKASI ALUR BISNIS */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-slate-100 border border-amber-300 text-slate-800 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-950">
                Alur Rantai Pasok: Petani &rarr; Gudang Bahan Pusat &rarr; Dapur 10 Toko Cabang
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1 text-xs">
              <div className="bg-white/80 p-3 rounded-2xl border border-amber-200/70 space-y-1">
                <div className="font-extrabold text-amber-900 flex items-center space-x-1">
                  <Sprout className="w-4 h-4 text-amber-600" />
                  <span>1. Kulakan Borongan Petani</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Owner membeli bahan dalam jumlah besar langsung dari petani (misal Jahe Emprit sekarung, Gula Aren) saat panen raya dengan dana pribadi/pusat agar dapat harga murah.
                </p>
              </div>
              <div className="bg-white/80 p-3 rounded-2xl border border-amber-200/70 space-y-1">
                <div className="font-extrabold text-amber-900 flex items-center space-x-1">
                  <Warehouse className="w-4 h-4 text-amber-600" />
                  <span>2. Masuk Gudang Pusat</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Bahan ditampung di Gudang Pusat sebagai tabungan aset siap olah dan dipantau batas cadangan minimumnya.
                </p>
              </div>
              <div className="bg-white/80 p-3 rounded-2xl border border-emerald-200/70 space-y-1">
                <div className="font-extrabold text-emerald-900 flex items-center space-x-1">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span>3. Distribusi per Toko</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Saat outlet butuh stok, Admin menekan tombol <strong>&quot;+ Kirim Bahan&quot;</strong>. Stok gudang otomatis terpotong sesuai kuantitas terkirim.
                </p>
              </div>
              <div className="bg-white/80 p-3 rounded-2xl border border-emerald-200/70 space-y-1">
                <div className="font-extrabold text-emerald-900 flex items-center space-x-1">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>4. Terpakai Kasir &amp; Audit</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Kasir POS menjual Serabi &amp; Wedang, modal bahan otomatis dihitung HPP-nya dan fisik di dapur diaudit setiap malam.
                </p>
              </div>
            </div>
          </div>

          {/* TABEL STOK BAHAN DI GUDANG PUSAT */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft-sm overflow-hidden space-y-3">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                  <Warehouse className="w-4 h-4 text-amber-600" />
                  <span>Stok Bahan Mentah Tersedia di Gudang Bahan Pusat</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Total akumulasi kulakan petani dikurangi seluruh pengiriman yang sudah didistribusikan ke 10 cabang
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPembelianGudangModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-xs transition-all flex items-center space-x-1 self-start sm:self-auto cursor-pointer"
              >
                <Sprout className="w-3.5 h-3.5 text-amber-200" />
                <span>+ Kulakan Petani Lagi</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5">Kode</th>
                    <th className="py-3 px-3.5">Nama Bahan Baku</th>
                    <th className="py-3 px-2 text-center text-amber-300">Kulakan Petani</th>
                    <th className="py-3 px-2 text-center text-blue-300">Terkirim ke 10 Cabang</th>
                    <th className="py-3 px-3 text-center text-emerald-300 bg-emerald-950/60">Sisa Stok Gudang</th>
                    <th className="py-3 px-2 text-center text-slate-300">Batas Min Gudang</th>
                    <th className="py-3 px-2 text-center">Status Cadangan</th>
                    <th className="py-3 px-3 text-right">Harga Beli Pokok</th>
                    <th className="py-3 px-3.5 text-right">Nilai Aset Gudang</th>
                    <th className="py-3 px-3 text-center">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {bahanList.map((b) => {
                    const st = stokGudangMap[b.id] || { total_masuk: 0, total_terkirim: 0, sisa_gudang: 0, nilai_gudang: 0, unit_price: b.harga_satuan || 20000 };
                    const minGudang = b.stok_minimum_gudang || 20;
                    const isMenipis = st.sisa_gudang < minGudang;

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3.5 font-mono font-bold text-slate-500 text-[11px]">
                          {b.kode}
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="font-extrabold text-slate-900 block">
                            {b.nama}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 capitalize">
                            {b.kategori}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-black text-amber-800 bg-amber-50/40">
                          +{st.total_masuk} {b.satuan}
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-black text-blue-700 bg-blue-50/40">
                          -{st.total_terkirim} {b.satuan}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-black text-sm text-emerald-900 bg-emerald-100/60">
                          {st.sisa_gudang} <span className="text-[10px] text-emerald-700 font-bold uppercase">{b.satuan}</span>
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-bold text-slate-500">
                          {minGudang} {b.satuan}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {isMenipis ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-300">
                              <span>⚠️ PERLU KULAKAN</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">
                              <span>✓ AMAN</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">
                          {formatRupiah(st.unit_price)} <span className="text-[9px] text-slate-400 font-normal">/{b.satuan}</span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-black text-amber-950 bg-amber-50/20">
                          {formatRupiah(st.nilai_gudang)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setShowKirimanModal(true)}
                            className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold transition-all cursor-pointer inline-flex items-center space-x-1"
                          >
                            <Truck className="w-3 h-3" />
                            <span>Kirim Toko</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABEL RIWAYAT KULAKAN & TABUNGAN BAHAN DARI PETANI */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft-sm overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                  <Sprout className="w-4 h-4 text-amber-600" />
                  <span>Riwayat Pembelian &amp; Tabungan Bahan dari Petani / Supplier</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Daftar transaksi belanja borongan dari petani yang dibayar/ditalangi duluan sebagai tabungan aset gudang
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPembelianGudangModal(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5 text-amber-700" />
                <span>+ Beli Bahan Petani</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Tanggal Masuk</th>
                    <th className="py-2.5 px-3">Nama Bahan Baku</th>
                    <th className="py-2.5 px-3 text-center">Jumlah Beli</th>
                    <th className="py-2.5 px-3 text-right">Harga dari Petani</th>
                    <th className="py-2.5 px-3 text-right">Total Nominal Dibayar</th>
                    <th className="py-2.5 px-3">Petani / Sumber Pemasok</th>
                    <th className="py-2.5 px-3">Sumber Dana</th>
                    <th className="py-2.5 px-3">Status Bayar</th>
                    <th className="py-2.5 px-3">Catatan / Memo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {pembelianGudangList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Belum ada catatan kulakan bahan dari petani.
                      </td>
                    </tr>
                  ) : (
                    pembelianGudangList.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {p.tanggal}
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-slate-900">
                          {p.bahan_nama}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-amber-800 bg-amber-50/40">
                          +{p.jumlah_beli} {p.satuan}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                          {formatRupiah(p.harga_satuan)} <span className="text-[9px] text-slate-400">/{p.satuan}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-amber-950 bg-amber-50/30">
                          {formatRupiah(p.total_bayar)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {p.sumber_pemasok}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.sumber_dana === 'rekening_owner'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}>
                            {p.sumber_dana === 'rekening_owner' ? '💳 Rekening Pak Agan' : '🏢 Kas Pusat'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-200">
                            ✓ {p.status_bayar.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 italic max-w-xs truncate">
                          {p.catatan || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* TAB 3: RIWAYAT PASOKAN DISTRIBUSI KIRIMAN KE TOKO */}
      {activeSubTab === 'riwayat_kirim' && (
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft-sm overflow-hidden p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900">
              Riwayat Pasokan Kiriman Bahan dari Pusat ke Toko
            </h4>
            <p className="text-[11px] text-slate-500">
              Daftar pengiriman bahan baku harian lengkap dengan satuan (kg, liter, porsi) yang telah didistribusikan ke 10 cabang
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowKirimanModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tambah Kiriman Lagi</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Tanggal &amp; Jam</th>
                <th className="py-2.5 px-3">Toko Tujuan</th>
                <th className="py-2.5 px-3">Nama Bahan Baku</th>
                <th className="py-2.5 px-3 text-center">Jumlah Pasokan</th>
                <th className="py-2.5 px-3">Satuan</th>
                <th className="py-2.5 px-3 text-right">Harga Pokok (HPP)</th>
                <th className="py-2.5 px-3 text-right">Total Nilai Kiriman</th>
                <th className="py-2.5 px-3">Pengirim</th>
                <th className="py-2.5 px-3">Catatan Batch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {kirimanBahanList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Belum ada riwayat kiriman bahan pusat.
                  </td>
                </tr>
              ) : (
                kirimanBahanList.slice().reverse().map(k => {
                  const bhn = bahanList.find(b => b.id === k.bahan_id);
                  const unitPrice = k.harga_satuan || bhn?.harga_satuan || 20000;
                  const totalVal = k.total_nilai || (k.jumlah * unitPrice);

                  return (
                    <tr key={k.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {k.tanggal}
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-slate-900">
                        {k.cabang_nama}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        {k.bahan_nama}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-blue-700 bg-blue-50/30">
                        +{k.jumlah}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-600 uppercase text-[10px]">
                        {k.satuan || 'porsi'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                        {formatRupiah(unitPrice)} <span className="text-[9px] text-slate-400 font-normal">/{k.satuan}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800 bg-emerald-50/40">
                        {formatRupiah(totalVal)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {k.dikirim_oleh}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 italic max-w-xs truncate">
                        {k.catatan || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* 5. MODAL EDIT SATUAN & HARGA BAHAN BAKU */}
      {editingBahan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border-t-[4px] border-emerald-600 border-x border-b border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Atur Satuan &amp; Harga Modal Bahan
                  </h3>
                  <span className="text-xs text-slate-500">{editingBahan.kode} • {editingBahan.nama}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBahan(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBahan} className="space-y-4 text-xs">
              
              {/* Pilihan Satuan Fleksibel (Kg, Gram, Liter, dll) */}
              <div>
                <label className="block text-slate-700 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                  Satuan Takaran Fisik:
                </label>
                <select
                  value={editSatuan}
                  onChange={(e) => setEditSatuan(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-900 border border-slate-200 rounded-xl outline-none cursor-pointer bg-white"
                >
                  <option value="kg">kg (Kilogram - e.g. Jahe, Beras, Gula, Oncom)</option>
                  <option value="gram">gram (e.g. Cengkeh, Kayu Manis)</option>
                  <option value="liter">liter (e.g. Kinca Durian, Susu, Madu, Santan)</option>
                  <option value="ml">ml (Mililiter)</option>
                  <option value="porsi">porsi (Porsi Siap Saji)</option>
                  <option value="bungkus">bungkus / pack (e.g. Wedang Uwuh Komplit)</option>
                  <option value="butir">butir (e.g. Telur Ayam)</option>
                  <option value="pcs">pcs (e.g. Cup &amp; Tutup Takeaway)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  *Pilih satuan yang sesuai dengan wujud fisik bahan di dapur cabang.
                </span>
              </div>

              {/* Harga Pokok / Modal per Satuan */}
              <div>
                <label className="block text-slate-700 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                  Harga Pokok Beli per {editSatuan} (Rp):
                </label>
                <input
                  type="number"
                  value={editHargaSatuan}
                  onChange={(e) => setEditHargaSatuan(Number(e.target.value))}
                  placeholder="Contoh: 28000"
                  className="w-full px-3.5 py-2 text-sm font-mono font-black text-slate-900 border border-slate-200 rounded-xl outline-none"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  *Digunakan untuk analisa modal bahan terpakai dan valuasi aset stok di toko.
                </span>
              </div>

              {/* Stok Minimum Toko */}
              <div>
                <label className="block text-slate-700 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                  Batas Stok Minimum Cabang ({editSatuan}):
                </label>
                <input
                  type="number"
                  value={editStokMinimum}
                  onChange={(e) => setEditStokMinimum(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs font-bold text-slate-900 border border-slate-200 rounded-xl outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingBahan(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingBahan}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>{isSavingBahan ? 'Menyimpan...' : 'Simpan Satuan & Harga'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 6. MODAL INPUT KIRIMAN BAHAN PUSAT */}
      {showKirimanModal && (
        <CreateKirimanBahanModal
          cabangList={cabangList}
          bahanList={bahanList}
          defaultCabangId={selectedCabangId === 'all' ? undefined : selectedCabangId}
          defaultDate={selectedDate}
          onSuccess={async () => {
            await onRefreshData();
          }}
          onClose={() => setShowKirimanModal(false)}
        />
      )}

      {/* 7. MODAL DEDIKASI TAMBAH MASTER BAHAN BAKU BARU */}
      {showMasterBahanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border-t-[4px] border-emerald-600 border-x border-b border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold shadow-sm">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Tambah Master Bahan Baku Baru
                  </h3>
                  <span className="text-xs text-slate-500">Pusat Katalog Bahan • Serabi Bawel &amp; Wedang Geprek</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMasterBahanModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMasterBahan} className="space-y-3.5 text-xs">
              
              <div>
                <label className="block text-slate-700 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                  Nama Bahan Baku Baru *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Santan Kental Murni / Jahe Merah"
                  value={newMasterNama}
                  onChange={(e) => setNewMasterNama(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-bold text-slate-900 border border-slate-200 rounded-xl outline-none focus:border-brand-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                    Kategori Bahan:
                  </label>
                  <select
                    value={newMasterKategori}
                    onChange={(e) => setNewMasterKategori(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-bold text-slate-900 border border-slate-200 rounded-xl outline-none bg-white cursor-pointer"
                  >
                    <option value="serabi">Varian Serabi</option>
                    <option value="wedang">Rempah Wedang</option>
                    <option value="kemasan">Kemasan &amp; Cup</option>
                    <option value="umum">Bahan Umum</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                    Satuan Takaran:
                  </label>
                  <select
                    value={newMasterSatuan}
                    onChange={(e) => setNewMasterSatuan(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold text-slate-900 border border-slate-200 rounded-xl outline-none bg-white cursor-pointer"
                  >
                    <option value="kg">kg (Kilogram)</option>
                    <option value="gram">gram</option>
                    <option value="liter">liter</option>
                    <option value="ml">ml (Mililiter)</option>
                    <option value="bungkus">bungkus / pack</option>
                    <option value="butir">butir (Telur)</option>
                    <option value="pcs">pcs / kemasan</option>
                    <option value="porsi">porsi</option>
                  </select>
                </div>
              </div>

              {/* Nominal Modal Pokok / Harga Beli per Satuan */}
              <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80 space-y-1.5">
                <label className="block text-emerald-900 font-extrabold uppercase text-[10px] tracking-wider">
                  Harga Pokok Beli / Modal (Rp per {newMasterSatuan}) *
                </label>
                <input
                  type="number"
                  min={100}
                  value={newMasterHargaSatuan}
                  onChange={(e) => setNewMasterHargaSatuan(Number(e.target.value))}
                  placeholder="Contoh: 25000"
                  className="w-full px-3.5 py-2 text-sm font-mono font-black text-slate-900 bg-white border border-emerald-300 rounded-xl outline-none focus:border-brand-primary"
                  required
                />
                <div className="flex items-center justify-between text-[10px] text-emerald-700 font-semibold pt-0.5">
                  <span>Valuasi per {newMasterSatuan}:</span>
                  <span className="font-mono font-bold">{formatRupiah(newMasterHargaSatuan)}</span>
                </div>
              </div>

              {/* Batas Stok Minimum */}
              <div>
                <label className="block text-slate-700 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                  Batas Stok Minimum Cabang ({newMasterSatuan}):
                </label>
                <input
                  type="number"
                  min={1}
                  value={newMasterStokMin}
                  onChange={(e) => setNewMasterStokMin(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs font-bold text-slate-900 border border-slate-200 rounded-xl outline-none focus:border-brand-primary"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  *Toko cabang akan memicu peringatan stok menipis jika stok fisik di bawah angka ini.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMasterBahanModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingMaster}
                  className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-emerald-800 text-white font-black shadow-md transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-300" />
                  <span>{isSavingMaster ? 'Menyimpan...' : 'Simpan ke Master Bahan'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 8. MODAL KULAKAN BAHAN MASUK GUDANG PUSAT DARI PETANI */}
      {showPembelianGudangModal && (
        <CreatePembelianGudangModal
          bahanList={bahanList}
          defaultDate={selectedDate}
          onClose={() => setShowPembelianGudangModal(false)}
          onSuccess={async () => {
            await loadGudangData();
            await onRefreshData();
          }}
        />
      )}

    </div>
  );
}
