'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { X, PackageCheck, Send, Building2, Layers, Calendar, CheckCircle2, DollarSign, Calculator, Sparkles, AlertCircle } from 'lucide-react';
import { Cabang, BahanBaku } from '@/lib/types';
import { db } from '@/lib/db';
import { formatRupiah } from '@/lib/utils';

interface CreateKirimanBahanModalProps {
  cabangList: Cabang[];
  bahanList: BahanBaku[];
  defaultCabangId?: string;
  defaultDate?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateKirimanBahanModal({
  cabangList,
  bahanList,
  defaultCabangId,
  defaultDate,
  onClose,
  onSuccess,
}: CreateKirimanBahanModalProps) {
  const [targetCabangId, setTargetCabangId] = useState<string>(defaultCabangId || cabangList[0]?.id || 'cbg-1');
  const [selectedBahanId, setSelectedBahanId] = useState<string>(bahanList[0]?.id || 'bh-1');
  const [isCustomBahan, setIsCustomBahan] = useState<boolean>(false);
  
  // Custom Bahan fields
  const [customBahanNama, setCustomBahanNama] = useState<string>('');
  const [customBahanSatuan, setCustomBahanSatuan] = useState<string>('kg');
  const [customBahanKategori, setCustomBahanKategori] = useState<'serabi' | 'wedang' | 'kemasan' | 'umum'>('umum');
  const [customHargaSatuan, setCustomHargaSatuan] = useState<number>(25000);
  const [customStokMinimum, setCustomStokMinimum] = useState<number>(15);

  // Existing Bahan fields
  const [existingHargaSatuan, setExistingHargaSatuan] = useState<number>(() => {
    const first = bahanList[0];
    return first?.harga_satuan || 20000;
  });

  // Shipment fields
  const [jumlah, setJumlah] = useState<number>(50);
  const [tanggal, setTanggal] = useState<string>(defaultDate || new Date().toISOString().split('T')[0]);
  const [catatan, setCatatan] = useState<string>('Pengiriman pasokan batch harian');
  const [saving, setSaving] = useState<boolean>(false);
  const [stokGudangMap, setStokGudangMap] = useState<Record<string, { sisa_gudang: number; unit_price: number }>>({});

  // Muat stok riil gudang pusat
  useEffect(() => {
    db.getStokGudangPusat().then(res => setStokGudangMap(res)).catch(console.error);
  }, []);

  // Sync existingHargaSatuan when selectedBahanId changes
  useEffect(() => {
    const bhn = bahanList.find(b => b.id === selectedBahanId);
    if (bhn && bhn.harga_satuan) {
      setExistingHargaSatuan(bhn.harga_satuan);
    }
  }, [selectedBahanId, bahanList]);

  // Selected existing bahan object
  const currentSelectedBahan = useMemo(() => {
    return bahanList.find(b => b.id === selectedBahanId) || bahanList[0];
  }, [bahanList, selectedBahanId]);

  // Active Satuan & Active Harga Pokok
  const activeSatuan = isCustomBahan ? customBahanSatuan : (currentSelectedBahan?.satuan || 'kg');
  const activeHargaSatuan = isCustomBahan ? customHargaSatuan : existingHargaSatuan;

  const sisaStokGudang = useMemo(() => {
    if (isCustomBahan) return 999;
    return stokGudangMap[selectedBahanId]?.sisa_gudang ?? 0;
  }, [stokGudangMap, selectedBahanId, isCustomBahan]);

  // Real-time calculation of total shipment value
  const totalNilaiPasokan = useMemo(() => {
    const qty = Number(jumlah) || 0;
    const price = Number(activeHargaSatuan) || 0;
    return Math.round(qty * price);
  }, [jumlah, activeHargaSatuan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jumlah <= 0) {
      alert('Jumlah kiriman harus lebih dari 0!');
      return;
    }

    if (activeHargaSatuan <= 0) {
      alert('Nominal harga pokok per satuan harus lebih dari Rp 0 agar valuasi stok tercatat akurat!');
      return;
    }

    setSaving(true);
    try {
      const targetCabang = cabangList.find(c => c.id === targetCabangId);
      let bahanIdToSave = selectedBahanId;
      let bahanNamaToSave = '';
      let satuanToSave = 'kg';

      if (isCustomBahan) {
        if (!customBahanNama.trim()) {
          alert('Silakan tulis nama bahan baru!');
          setSaving(false);
          return;
        }
        // Buat master bahan baru dengan harga pokok & batas minimum
        const newBhn = await db.createBahanBaku({
          nama: customBahanNama.trim(),
          satuan: customBahanSatuan,
          kategori: customBahanKategori,
          harga_satuan: Number(customHargaSatuan),
          stok_minimum: Number(customStokMinimum),
        });
        bahanIdToSave = newBhn.id;
        bahanNamaToSave = newBhn.nama;
        satuanToSave = newBhn.satuan;
      } else {
        const bhn = bahanList.find(b => b.id === selectedBahanId);
        bahanNamaToSave = bhn ? bhn.nama : 'Bahan Baku';
        satuanToSave = bhn ? bhn.satuan : 'kg';

        // Jika user mengedit harga satuan bahan existing saat kirim, update harga pokok master juga
        if (bhn && bhn.harga_satuan !== existingHargaSatuan) {
          await db.updateBahanBaku(bhn.id, { harga_satuan: existingHargaSatuan });
        }
      }

      // Catat pengiriman bahan ke cabang dengan data nominal lengkap
      await db.createKirimanBahan({
        cabang_id: targetCabangId,
        cabang_nama: targetCabang?.nama || targetCabangId,
        bahan_id: bahanIdToSave,
        bahan_nama: bahanNamaToSave,
        jumlah: Number(jumlah),
        satuan: satuanToSave,
        harga_satuan: Number(activeHargaSatuan),
        total_nilai: totalNilaiPasokan,
        tanggal: tanggal,
        dikirim_oleh: 'Admin Pusat (Pak Agan)',
        catatan: catatan.trim() || undefined,
      });

      alert(`✅ Berhasil Kirim Pasokan!\n\nBahan: ${bahanNamaToSave}\nJumlah: ${jumlah} ${satuanToSave}\nHarga Satuan: ${formatRupiah(activeHargaSatuan)} / ${satuanToSave}\nTotal Nilai: ${formatRupiah(totalNilaiPasokan)}\nTujuan: ${targetCabang?.nama || targetCabangId}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Gagal mengirim bahan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold shadow-sm shadow-emerald-950/20">
              <PackageCheck className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Input Kiriman Pasokan Bahan ke Toko
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Pusat Distribusi Bahan • Serabi Bawel &amp; Wedang Geprek
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          
          {/* Cabang Tujuan */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
              Toko / Cabang Tujuan *
            </label>
            <select
              value={targetCabangId}
              onChange={(e) => setTargetCabangId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-brand-primary cursor-pointer"
            >
              {cabangList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.kode} - {c.nama} ({c.kota})
                </option>
              ))}
            </select>
          </div>

          {/* Pemilihan Bahan Baku */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-extrabold text-slate-700">
                Bahan Baku yang Dikirim *
              </label>
              <button
                type="button"
                onClick={() => setIsCustomBahan(!isCustomBahan)}
                className="text-[10px] font-extrabold text-emerald-700 hover:underline cursor-pointer"
              >
                {isCustomBahan ? '← Pilih dari Daftar Master Bahan' : '+ Tulis Nama Bahan Baru'}
              </button>
            </div>

            {isCustomBahan ? (
              <div className="space-y-3 bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-200">
                <div className="flex items-center space-x-2 text-emerald-800 font-extrabold text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Daftarkan Master Bahan Baku Baru</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Nama Bahan Baru *</label>
                  <input
                    type="text"
                    placeholder="Contoh: Santan Kental Kelapa Murni / Jahe Merah"
                    value={customBahanNama}
                    onChange={(e) => setCustomBahanNama(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-brand-primary"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Kategori</label>
                    <select
                      value={customBahanKategori}
                      onChange={(e) => setCustomBahanKategori(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-brand-primary"
                    >
                      <option value="serabi">Varian Serabi</option>
                      <option value="wedang">Rempah Wedang</option>
                      <option value="kemasan">Kemasan &amp; Cup</option>
                      <option value="umum">Bahan Umum</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Satuan Takaran Fisik</label>
                    <select
                      value={customBahanSatuan}
                      onChange={(e) => setCustomBahanSatuan(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-brand-primary cursor-pointer"
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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                      Harga Beli / Modal (Rp / {customBahanSatuan}) *
                    </label>
                    <input
                      type="number"
                      min={100}
                      value={customHargaSatuan}
                      onChange={(e) => setCustomHargaSatuan(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-black text-slate-900 outline-none focus:border-brand-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      Batas Stok Min ({customBahanSatuan})
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={customStokMinimum}
                      onChange={(e) => setCustomStokMinimum(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-brand-primary"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={selectedBahanId}
                  onChange={(e) => setSelectedBahanId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-brand-primary cursor-pointer"
                >
                  {bahanList.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.kode} - {b.nama} (Satuan: {b.satuan} • {formatRupiah(b.harga_satuan || 20000)}/{b.satuan})
                    </option>
                  ))}
                </select>

                {/* Input Nominal Harga Satuan (Bisa Disesuaikan jika harga beli supplier berubah) */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-0.5">
                      Harga Modal Pokok (Rp / {currentSelectedBahan?.satuan || 'kg'}):
                    </label>
                    <input
                      type="number"
                      min={100}
                      value={existingHargaSatuan}
                      onChange={(e) => setExistingHargaSatuan(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-black text-slate-900 outline-none focus:border-brand-primary text-xs"
                      required
                    />
                  </div>
                  <div className="text-right text-[10px] text-slate-500 max-w-[170px] leading-tight">
                    *Bisa diubah jika harga beli batch pasokan dari supplier saat ini naik/turun.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Jumlah & Tanggal Kirim */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between text-[11px] font-extrabold mb-1">
                <label className="text-slate-700">
                  Jumlah Kiriman (Qty dalam {activeSatuan}) *
                </label>
                {!isCustomBahan && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    sisaStokGudang < jumlah 
                      ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    🏢 Stok Gudang: {sisaStokGudang} {activeSatuan}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  step="any"
                  value={jumlah}
                  onChange={(e) => setJumlah(Number(e.target.value))}
                  className="w-full pl-3 pr-12 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-black text-slate-900 text-sm outline-none focus:border-brand-primary"
                  required
                />
                <span className="absolute right-3 top-2.5 font-bold text-slate-400 text-xs uppercase">
                  {activeSatuan}
                </span>
              </div>
              {!isCustomBahan && sisaStokGudang < jumlah && (
                <p className="text-[10px] text-rose-600 font-bold mt-1">
                  ⚠️ Jumlah kiriman ({jumlah} {activeSatuan}) melebihi sisa tabungan bahan di Gudang Pusat ({sisaStokGudang} {activeSatuan}).
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                Tanggal Pengiriman *
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 outline-none focus:border-brand-primary cursor-pointer"
                required
              />
            </div>
          </div>

          {/* KOTAK TOTAL NOMINAL NILAI PASOKAN REALTIME */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950 text-white shadow-md border border-emerald-700/40 relative overflow-hidden">
            <div className="flex items-center justify-between relative z-10">
              <div>
                <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-widest block">
                  Total Nominal Nilai Kiriman Bahan:
                </span>
                <span className="text-2xl font-mono font-black text-amber-300 tracking-tight block mt-0.5">
                  {formatRupiah(totalNilaiPasokan)}
                </span>
                <span className="text-[11px] text-emerald-200/90 font-medium block mt-1">
                  Kalkulasi: {jumlah} {activeSatuan} × {formatRupiah(activeHargaSatuan)} per {activeSatuan}
                </span>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-500/50 text-[10px] font-black text-emerald-100">
                  <DollarSign className="w-3 h-3 text-amber-300" />
                  <span>Aset Cabang</span>
                </span>
              </div>
            </div>
          </div>

          {/* Catatan Pengiriman */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
              Catatan Pengiriman (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Pengiriman pagi jam 06:30 via kurir pusat"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 outline-none focus:border-brand-primary placeholder:text-slate-400"
            />
          </div>

          {/* Info pill */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] leading-relaxed flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>
              Nominal kiriman bahan ini otomatis tercatat di <strong>Rekap Pasokan Pusat</strong> dan menambah <strong>Valuasi Nilai Aset Dapur Toko</strong> secara realtime.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-emerald-800 text-white font-black text-xs shadow-md shadow-emerald-950/20 transition-all btn-tactile flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-amber-300" />
              <span>{saving ? 'Mengirim...' : 'Kirim Pasokan & Catat Nominal'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
