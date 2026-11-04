'use client';

import React, { useState, useMemo } from 'react';
import { X, Sprout, Building2, Layers, Calendar, CheckCircle2, DollarSign, Wallet, FileText, Sparkles, AlertCircle } from 'lucide-react';
import { BahanBaku } from '@/lib/types';
import { db } from '@/lib/db';
import { formatRupiah } from '@/lib/utils';

interface CreatePembelianGudangModalProps {
  bahanList: BahanBaku[];
  defaultDate?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePembelianGudangModal({
  bahanList,
  defaultDate,
  onClose,
  onSuccess,
}: CreatePembelianGudangModalProps) {
  const [selectedBahanId, setSelectedBahanId] = useState<string>(() => {
    // Default to Jahe Emprit (bh-7) if available, otherwise first item
    const jahe = bahanList.find(b => b.id === 'bh-7' || b.nama.toLowerCase().includes('jahe'));
    return jahe ? jahe.id : bahanList[0]?.id || 'bh-1';
  });

  const [isCustomBahan, setIsCustomBahan] = useState<boolean>(false);
  const [customBahanNama, setCustomBahanNama] = useState<string>('');
  const [customBahanSatuan, setCustomBahanSatuan] = useState<string>('kg');
  const [customBahanKategori, setCustomBahanKategori] = useState<'serabi' | 'wedang' | 'kemasan' | 'umum'>('wedang');

  // Fields pembelian dari petani
  const [sumberPemasok, setSumberPemasok] = useState<string>('Kelompok Tani Jahe Kulon Progo (Pak Slamet)');
  const [jumlahBeli, setJumlahBeli] = useState<number>(100);
  const [hargaSatuan, setHargaSatuan] = useState<number>(25000);
  const [sumberDana, setSumberDana] = useState<'rekening_owner' | 'kas_pusat' | 'bon_petani'>('rekening_owner');
  const [statusBayar, setStatusBayar] = useState<'lunas' | 'titip_dp' | 'tempo'>('lunas');
  const [tanggal, setTanggal] = useState<string>(defaultDate || new Date().toISOString().split('T')[0]);
  const [catatan, setCatatan] = useState<string>('Nabung borongan bahan dari petani langsung (harga grosir panen)');
  const [saving, setSaving] = useState<boolean>(false);

  // Sync harga beli default saat pilih bahan yang ada
  const currentSelectedBahan = useMemo(() => {
    return bahanList.find(b => b.id === selectedBahanId) || bahanList[0];
  }, [bahanList, selectedBahanId]);

  const activeSatuan = isCustomBahan ? customBahanSatuan : (currentSelectedBahan?.satuan || 'kg');

  // Update default harga satuan jika bahan berubah
  React.useEffect(() => {
    if (currentSelectedBahan && currentSelectedBahan.harga_satuan) {
      setHargaSatuan(currentSelectedBahan.harga_satuan);
      if (currentSelectedBahan.nama.toLowerCase().includes('jahe')) {
        setSumberPemasok('Kelompok Tani Jahe Kulon Progo (Pak Slamet)');
      } else if (currentSelectedBahan.nama.toLowerCase().includes('aren')) {
        setSumberPemasok('Petani Nira Aren Cilacap');
      } else if (currentSelectedBahan.nama.toLowerCase().includes('durian')) {
        setSumberPemasok('Pengepul Durian Banjarnegara');
      }
    }
  }, [currentSelectedBahan]);

  // Kalkulasi total bayar
  const totalBayar = useMemo(() => {
    const qty = Number(jumlahBeli) || 0;
    const price = Number(hargaSatuan) || 0;
    return Math.round(qty * price);
  }, [jumlahBeli, hargaSatuan]);

  const quickPemasokList = [
    'Kelompok Tani Jahe Kulon Progo (Pak Slamet)',
    'Petani Nira Aren Cilacap',
    'Pengrajin Rempah Imogiri Bantul',
    'Central Kitchen Dapur Pusat',
    'Pengepul Durian Banjarnegara',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jumlahBeli <= 0) {
      alert('Jumlah bahan harus lebih dari 0!');
      return;
    }
    if (hargaSatuan <= 0) {
      alert('Harga beli per satuan harus lebih dari Rp 0!');
      return;
    }
    if (!sumberPemasok.trim()) {
      alert('Silakan isi nama petani atau sumber pemasok!');
      return;
    }

    setSaving(true);
    try {
      let bahanIdToSave = selectedBahanId;
      let bahanNamaToSave = currentSelectedBahan?.nama || 'Bahan Baku';
      let satuanToSave = activeSatuan;

      if (isCustomBahan) {
        if (!customBahanNama.trim()) {
          alert('Silakan tulis nama bahan baru!');
          setSaving(false);
          return;
        }
        const newBhn = await db.createBahanBaku({
          nama: customBahanNama.trim(),
          satuan: customBahanSatuan,
          kategori: customBahanKategori,
          harga_satuan: hargaSatuan,
          stok_minimum: 15,
          stok_minimum_gudang: 30,
        });
        bahanIdToSave = newBhn.id;
        bahanNamaToSave = newBhn.nama;
        satuanToSave = newBhn.satuan;
      }

      await db.createPembelianGudang({
        tanggal,
        bahan_id: bahanIdToSave,
        bahan_nama: bahanNamaToSave,
        satuan: satuanToSave,
        jumlah_beli: Number(jumlahBeli),
        harga_satuan: Number(hargaSatuan),
        total_bayar: totalBayar,
        sumber_pemasok: sumberPemasok.trim(),
        sumber_dana: sumberDana,
        status_bayar: statusBayar,
        catatan: catatan.trim(),
        pembeli_nama: 'Pak Agan (Owner)',
      });

      alert(
        `Sukses mencatat tabungan bahan masuk gudang!\n\n` +
        `• Bahan: ${bahanNamaToSave} (+${jumlahBeli} ${satuanToSave})\n` +
        `• Petani/Pemasok: ${sumberPemasok}\n` +
        `• Total Biaya: ${formatRupiah(totalBayar)}\n` +
        `• Sumber Dana: ${sumberDana === 'rekening_owner' ? 'Rekening Pribadi Pak Agan' : 'Kas Pusat'}\n\n` +
        `Stok di Gudang Bahan Pusat otomatis bertambah dan siap didistribusikan ke 10 cabang!`
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Gagal mencatat pembelian: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border-t-[5px] border-amber-600 border-x border-b border-slate-200 shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/80 via-emerald-50/40 to-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-900/20 shrink-0">
              <Sprout className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 bg-amber-100/80 border border-amber-300 px-2 py-0.5 rounded-full">
                  Kulakan Petani • Masuk Gudang
                </span>
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">• Tabungan Aset Bahan</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5">
                Beli / Nabung Bahan dari Petani ke Gudang Pusat
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* Card Highlight Penjelasan Alur */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-amber-900 space-y-1">
            <div className="flex items-center space-x-1.5 font-extrabold text-amber-950">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Konsep Tabungan Bahan Mentah (Stok Gudang Pusat):</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Owner membayar/menalangi dulu pembelian bahan borongan dari petani (contoh Jahe Emprit sekarung, Gula Aren, Rempah). Bahan ditampung di <strong>Gudang Pusat</strong> terlebih dahulu, lalu saat toko cabang butuh pasokan baru dipotong via menu <strong>&quot;+ Kirim Bahan&quot;</strong> per toko.
            </p>
          </div>

          {/* Toggle Pilih Bahan Terdaftar vs Bahan Baru */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-slate-700">Pilih Bahan Baku yang Dibeli:</label>
              <button
                type="button"
                onClick={() => setIsCustomBahan(!isCustomBahan)}
                className="text-[10px] font-bold text-amber-700 hover:text-amber-900 underline"
              >
                {isCustomBahan ? '← Pilih dari Bahan Terdaftar' : '+ Ketik Nama Bahan Baru'}
              </button>
            </div>

            {!isCustomBahan ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={selectedBahanId}
                  onChange={(e) => setSelectedBahanId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {bahanList.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.nama} ({b.satuan.toUpperCase()}) - HPP Rp {b.harga_satuan?.toLocaleString('id-ID')}
                    </option>
                  ))}
                </select>
                <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between font-mono font-bold text-slate-700">
                  <span>Satuan Ukur:</span>
                  <span className="text-amber-800 uppercase bg-white px-2 py-0.5 rounded border border-slate-200">
                    {activeSatuan}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Nama Bahan Baru:</label>
                  <input
                    type="text"
                    value={customBahanNama}
                    onChange={(e) => setCustomBahanNama(e.target.value)}
                    placeholder="Contoh: Jahe Merah Panen Lereng Merapi"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Satuan:</label>
                  <select
                    value={customBahanSatuan}
                    onChange={(e) => setCustomBahanSatuan(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none"
                  >
                    <option value="kg">kg (Kilogram)</option>
                    <option value="liter">liter</option>
                    <option value="bungkus">bungkus</option>
                    <option value="butir">butir</option>
                    <option value="pcs">pcs</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Sumber Petani / Pemasok */}
          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-700">Petani / Sumber Pemasok:</label>
            <input
              type="text"
              value={sumberPemasok}
              onChange={(e) => setSumberPemasok(e.target.value)}
              placeholder="Contoh: Petani Jahe Kulon Progo (Pak Slamet)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
            />
            {/* Quick Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-slate-400 font-bold">Pilih Cepat:</span>
              {quickPemasokList.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSumberPemasok(p)}
                  className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-medium border border-slate-200 transition-colors"
                >
                  {p.split('(')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Volume Beli & Harga Satuan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-extrabold text-slate-700">
                Jumlah Beli ({activeSatuan.toUpperCase()}):
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={jumlahBeli}
                  onChange={(e) => setJumlahBeli(Number(e.target.value))}
                  min={1}
                  step={0.5}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-amber-900 text-sm outline-none focus:ring-1 focus:ring-amber-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                  {activeSatuan}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-extrabold text-slate-700">
                Harga Beli dari Petani (Rp/{activeSatuan}):
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={hargaSatuan}
                  onChange={(e) => setHargaSatuan(Number(e.target.value))}
                  min={100}
                  step={500}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-slate-900 text-sm outline-none focus:ring-1 focus:ring-amber-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-[10px]">
                  per {activeSatuan}
                </span>
              </div>
            </div>
          </div>

          {/* Kartu Kalkulasi Total Biaya Kulakan */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-emerald-500/10 to-slate-100 border border-amber-300 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider block">
                Total Modal / Nilai Tabungan Bahan
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {jumlahBeli} {activeSatuan} × {formatRupiah(hargaSatuan)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg sm:text-xl font-mono font-black text-amber-950 block">
                {formatRupiah(totalBayar)}
              </span>
              <span className="text-[10px] font-bold text-emerald-700">
                ✓ Otomatis menambah aset gudang
              </span>
            </div>
          </div>

          {/* Sumber Dana & Status Pembayaran */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-extrabold text-slate-700">Sumber Dana Pembayaran:</label>
              <select
                value={sumberDana}
                onChange={(e: any) => setSumberDana(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
              >
                <option value="rekening_owner">💳 Rekening Pribadi Pak Agan (Nabung Pribadi)</option>
                <option value="kas_pusat">🏢 Kas Operasional Pusat</option>
                <option value="bon_petani">📝 Tempo / Bon Petani</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-extrabold text-slate-700">Status Pembayaran ke Petani:</label>
              <select
                value={statusBayar}
                onChange={(e: any) => setStatusBayar(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
              >
                <option value="lunas">✅ Lunas Terbayar</option>
                <option value="titip_dp">⏳ Titip DP Dulu</option>
                <option value="tempo">📋 Tempo Pasca Panen</option>
              </select>
            </div>
          </div>

          {/* Tanggal & Catatan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-extrabold text-slate-700">Tanggal Masuk:</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 outline-none"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="font-extrabold text-slate-700">Catatan / Memo Petani:</label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: Jahe emprit segar panen lereng Kulon Progo"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black shadow-md shadow-amber-900/20 btn-tactile transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <Sprout className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : '+ Masukkan ke Gudang Pusat'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
