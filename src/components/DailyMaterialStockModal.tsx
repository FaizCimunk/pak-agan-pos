'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  PackageCheck, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  Info
} from 'lucide-react';
import { Cabang, AbsensiBahanHarian, Shift } from '@/lib/types';
import { db } from '@/lib/db';

interface DailyMaterialStockModalProps {
  cabang: Cabang;
  activeShift: Shift | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DailyMaterialStockModal({
  cabang,
  activeShift,
  onClose,
  onSuccess,
}: DailyMaterialStockModalProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [records, setRecords] = useState<AbsensiBahanHarian[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);
  const [filterKategori, setFilterKategori] = useState<'all' | 'serabi' | 'wedang' | 'kemasan'>('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await db.getAbsensiBahanHarian(cabang.id, selectedDate);
      setRecords(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [cabang.id, selectedDate]);

  const handleUpdateFisik = (bahanId: string, valStr: string) => {
    const val = Number(valStr);
    setRecords(prev => prev.map(item => {
      if (item.bahan_id !== bahanId) return item;
      const sisaFisik = isNaN(val) ? 0 : val;
      const selisih = sisaFisik - item.sisa_sistem;
      return {
        ...item,
        sisa_fisik: sisaFisik,
        selisih: selisih,
        status: selisih === 0 ? 'cocok' : 'selisih',
      };
    }));
  };

  const handleUpdateStokAwal = (bahanId: string, valStr: string) => {
    const val = Number(valStr);
    setRecords(prev => prev.map(item => {
      if (item.bahan_id !== bahanId) return item;
      const stokAwal = isNaN(val) ? 0 : val;
      const sisaSistem = stokAwal + item.kiriman_pusat - item.terpakai_kasir;
      const selisih = item.sisa_fisik - sisaSistem;
      return {
        ...item,
        stok_awal: stokAwal,
        sisa_sistem: sisaSistem,
        selisih: selisih,
        status: selisih === 0 ? 'cocok' : 'selisih',
      };
    }));
  };

  const handleSave = async () => {
    if (isSubmittingRef.current || saving) return;
    isSubmittingRef.current = true;
    setSaving(true);
    try {
      const stampedRecords = records.map(r => ({
        ...r,
        kasir_nama: activeShift?.karyawan_nama || 'Kasir Outlet',
      }));
      await db.saveAbsensiBahanHarian(stampedRecords);
      alert(`Absensi stok bahan ${cabang.nama} untuk tanggal ${selectedDate} berhasil disimpan!\nData otomatis tersinkron ke Rekapitulasi Bahan Dashboard Pusat.`);
      onSuccess?.();
      onClose();
    } catch (e: any) {
      alert('Gagal menyimpan absensi bahan: ' + e.message);
    } finally {
      setSaving(false);
      isSubmittingRef.current = false;
    }
  };

  // Summary Metrics
  const totalBahan = records.length;
  const cocokCount = records.filter(r => r.status === 'cocok').length;
  const selisihCount = records.filter(r => r.status === 'selisih').length;
  const totalTerpakaiPorsi = records.reduce((sum, r) => sum + r.terpakai_kasir, 0);

  const filteredRecords = records.filter(r => {
    if (filterKategori === 'all') return true;
    if (filterKategori === 'serabi') return r.bahan_nama.toLowerCase().includes('serabi') || r.bahan_nama.toLowerCase().includes('kinca') || r.bahan_nama.toLowerCase().includes('oncom') || r.bahan_nama.toLowerCase().includes('keju') || r.bahan_nama.toLowerCase().includes('meises');
    if (filterKategori === 'wedang') return r.bahan_nama.toLowerCase().includes('wedang') || r.bahan_nama.toLowerCase().includes('jahe') || r.bahan_nama.toLowerCase().includes('uwuh') || r.bahan_nama.toLowerCase().includes('susu');
    if (filterKategori === 'kemasan') return r.bahan_nama.toLowerCase().includes('cup') || r.bahan_nama.toLowerCase().includes('kemasan');
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold shadow-sm shadow-emerald-950/20">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  Absensi &amp; Rekonsiliasi Bahan Harian
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {cabang.kode}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Outlet: <strong>{cabang.nama}</strong> • Pemakaian bahan ditarik otomatis dari data penjualan kasir di tempat
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tanggal Rekonsiliasi */}
        <div className="px-6 py-2.5 bg-emerald-50/50 border-b border-emerald-100/60 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-emerald-900 font-bold">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>Tanggal Rekonsiliasi:</span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-slate-800 outline-none focus:border-brand-primary text-xs shadow-sm"
            />
          </div>
        </div>

        {/* Filter Badges & Summary Stats */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFilterKategori('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${filterKategori === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
            >
              Semua Bahan ({totalBahan})
            </button>
            <button
              type="button"
              onClick={() => setFilterKategori('serabi')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${filterKategori === 'serabi' ? 'bg-emerald-700 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
            >
              🥞 Bahan Serabi
            </button>
            <button
              type="button"
              onClick={() => setFilterKategori('wedang')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${filterKategori === 'wedang' ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
            >
              🫖 Rempah Wedang
            </button>
            <button
              type="button"
              onClick={() => setFilterKategori('kemasan')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${filterKategori === 'kemasan' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
            >
              📦 Cup / Kemasan
            </button>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px] border border-emerald-300">
              ✅ Cocok: {cocokCount}
            </span>
            {selisihCount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-extrabold text-[11px] border border-rose-300">
                ⚠️ Selisih: {selisihCount}
              </span>
            )}
          </div>
        </div>

        {/* Tabel Absensi Bahan Harian */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Memuat data stok &amp; kalkulasi kasir...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3">Nama Bahan Baku</th>
                    <th className="py-2.5 px-2 text-center">Stok Awal</th>
                    <th className="py-2.5 px-2 text-center text-blue-700">Kiriman Pusat</th>
                    <th className="py-2.5 px-2 text-center text-rose-700 bg-rose-50/60 font-black">
                      Terpakai Kasir ⚡
                    </th>
                    <th className="py-2.5 px-2 text-center text-slate-600 font-bold">Sisa Sistem</th>
                    <th className="py-2.5 px-3 text-center bg-emerald-50 text-emerald-950 font-black">
                      Sisa Fisik Dapur (Input) *
                    </th>
                    <th className="py-2.5 px-2 text-center">Selisih</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((item) => {
                    const isCocok = item.selisih === 0;
                    return (
                      <tr key={item.bahan_id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Nama Bahan */}
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-900">{item.bahan_nama}</div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            Satuan: <span className="font-bold uppercase text-slate-600">{item.satuan}</span>
                          </div>
                        </td>

                        {/* Stok Awal (Editable jika perlu penyesuaian) */}
                        <td className="py-3 px-2 text-center">
                          <input
                            type="number"
                            value={item.stok_awal}
                            onChange={(e) => handleUpdateStokAwal(item.bahan_id, e.target.value)}
                            className="w-16 px-1.5 py-1 text-center bg-slate-50 border border-slate-200 rounded font-mono font-bold text-slate-700 text-xs"
                          />
                        </td>

                        {/* Kiriman Pusat */}
                        <td className="py-3 px-2 text-center">
                          <span className={`font-mono font-extrabold ${item.kiriman_pusat > 0 ? 'text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full' : 'text-slate-400'}`}>
                            {item.kiriman_pusat > 0 ? `+${item.kiriman_pusat}` : '-'}
                          </span>
                        </td>

                        {/* Terpakai Kasir (Otomatis dari Penjualan Hari Ini) */}
                        <td className="py-3 px-2 text-center bg-rose-50/30">
                          <span className="font-mono font-black text-rose-700 px-2 py-0.5 rounded-full bg-rose-100/70">
                            {item.terpakai_kasir > 0 ? `-${item.terpakai_kasir}` : '0'}
                          </span>
                        </td>

                        {/* Sisa Sistem */}
                        <td className="py-3 px-2 text-center font-mono font-extrabold text-slate-700">
                          {item.sisa_sistem}
                        </td>

                        {/* Input Sisa Fisik di Dapur (Oleh Kasir Toko) */}
                        <td className="py-3 px-3 text-center bg-emerald-50/40">
                          <div className="inline-flex items-center space-x-1">
                            <input
                              type="number"
                              value={item.sisa_fisik}
                              onChange={(e) => handleUpdateFisik(item.bahan_id, e.target.value)}
                              className="w-20 px-2 py-1 text-center bg-white border-2 border-emerald-500 rounded-xl font-mono font-black text-emerald-900 text-sm shadow-xs focus:ring-2 focus:ring-emerald-400 outline-none"
                            />
                            <span className="text-[10px] text-slate-500 font-bold">{item.satuan}</span>
                          </div>
                        </td>

                        {/* Selisih */}
                        <td className="py-3 px-2 text-center">
                          <span className={`font-mono font-bold text-xs ${isCocok ? 'text-slate-400' : item.selisih > 0 ? 'text-blue-600 font-black' : 'text-rose-600 font-black'}`}>
                            {isCocok ? '0' : item.selisih > 0 ? `+${item.selisih}` : item.selisih}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3 text-center">
                          {isCocok ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>COCOK</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black border border-amber-300">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>SELISIH</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            Absensi dicatat oleh: <strong className="text-slate-900">{activeShift?.karyawan_nama || 'Kasir Outlet'}</strong> • Tanggal: <strong className="font-mono">{selectedDate}</strong>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-emerald-800 text-white font-black text-xs shadow-md shadow-emerald-950/20 transition-all btn-tactile flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Absensi Bahan Hari Ini'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
