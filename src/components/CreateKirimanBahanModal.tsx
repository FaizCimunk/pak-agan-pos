'use client';

import React, { useState } from 'react';
import { X, PackageCheck, Send, Building2, Layers, Calendar, CheckCircle2 } from 'lucide-react';
import { Cabang, BahanBaku } from '@/lib/types';
import { db } from '@/lib/db';

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
  const [customBahanNama, setCustomBahanNama] = useState<string>('');
  const [customBahanSatuan, setCustomBahanSatuan] = useState<string>('porsi');
  const [jumlah, setJumlah] = useState<number>(50);
  const [tanggal, setTanggal] = useState<string>(defaultDate || new Date().toISOString().split('T')[0]);
  const [catatan, setCatatan] = useState<string>('Pengiriman pasokan batch harian');
  const [saving, setSaving] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jumlah <= 0) {
      alert('Jumlah kiriman harus lebih dari 0!');
      return;
    }

    setSaving(true);
    try {
      const targetCabang = cabangList.find(c => c.id === targetCabangId);
      let bahanIdToSave = selectedBahanId;
      let bahanNamaToSave = '';
      let satuanToSave = 'porsi';

      if (isCustomBahan) {
        if (!customBahanNama.trim()) {
          alert('Silakan tulis nama bahan baru!');
          setSaving(false);
          return;
        }
        // Buat master bahan baru
        const newBhn = await db.createBahanBaku({
          nama: customBahanNama.trim(),
          satuan: customBahanSatuan,
          kategori: 'umum',
          stok_minimum: 20,
        });
        bahanIdToSave = newBhn.id;
        bahanNamaToSave = newBhn.nama;
        satuanToSave = newBhn.satuan;
      } else {
        const bhn = bahanList.find(b => b.id === selectedBahanId);
        bahanNamaToSave = bhn ? bhn.nama : 'Bahan Baku';
        satuanToSave = bhn ? bhn.satuan : 'porsi';
      }

      await db.createKirimanBahan({
        cabang_id: targetCabangId,
        cabang_nama: targetCabang?.nama || targetCabangId,
        bahan_id: bahanIdToSave,
        bahan_nama: bahanNamaToSave,
        jumlah: Number(jumlah),
        satuan: satuanToSave,
        tanggal: tanggal,
        dikirim_oleh: 'Admin Pusat (Pak Agan)',
        catatan: catatan.trim() || undefined,
      });

      alert(`Pasokan ${jumlah} ${satuanToSave} "${bahanNamaToSave}" berhasil dikirimkan ke ${targetCabang?.nama || targetCabangId}!\nStok kiriman cabang otomatis bertambah.`);
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
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Input Kiriman Bahan ke Toko
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Pusat Distribusi Bahan • Serabi Bawel &amp; Wedang Geprek
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          
          {/* Cabang Tujuan */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Toko / Cabang Tujuan *
            </label>
            <select
              value={targetCabangId}
              onChange={(e) => setTargetCabangId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-brand-primary"
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
              <label className="text-[11px] font-bold text-slate-700">
                Bahan Baku yang Dikirim *
              </label>
              <button
                type="button"
                onClick={() => setIsCustomBahan(!isCustomBahan)}
                className="text-[10px] font-extrabold text-emerald-700 hover:underline"
              >
                {isCustomBahan ? '← Pilih dari Daftar Master' : '+ Tulis Nama Bahan Baru'}
              </button>
            </div>

            {isCustomBahan ? (
              <div className="space-y-2 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Nama Bahan Baru</label>
                  <input
                    type="text"
                    placeholder="Contoh: Santan Kental Murni / Jahe Merah"
                    value={customBahanNama}
                    onChange={(e) => setCustomBahanNama(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Satuan</label>
                  <select
                    value={customBahanSatuan}
                    onChange={(e) => setCustomBahanSatuan(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-brand-primary"
                  >
                    <option value="porsi">Porsi</option>
                    <option value="kg">Kg</option>
                    <option value="liter">Liter</option>
                    <option value="bungkus">Bungkus</option>
                    <option value="butir">Butir</option>
                    <option value="pcs">Pcs / Lembar</option>
                  </select>
                </div>
              </div>
            ) : (
              <select
                value={selectedBahanId}
                onChange={(e) => setSelectedBahanId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-brand-primary"
              >
                {bahanList.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.kode} - {b.nama} (Satuan: {b.satuan})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Jumlah & Tanggal Kirim */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Jumlah Kiriman (Qty) *
              </label>
              <input
                type="number"
                min={1}
                value={jumlah}
                onChange={(e) => setJumlah(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-black text-slate-900 text-sm outline-none focus:border-brand-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Tanggal Pengiriman *
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          {/* Catatan Pengiriman */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
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
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
            💡 Begitu kiriman ini disimpan, kasir di toko terkait akan langsung melihat tambahan pasokan ini di menu <strong>Absensi Bahan Harian</strong>.
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-emerald-800 text-white font-black text-xs shadow-md shadow-emerald-950/20 transition-all btn-tactile flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{saving ? 'Mengirim...' : 'Kirim Pasokan Bahan'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
