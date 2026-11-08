'use client';

import React, { useState } from 'react';
import { 
  X, 
  ShoppingBag, 
  Coins, 
  Building2, 
  Save, 
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { Cabang, Karyawan, PengeluaranJenis, MetodePencairan } from '@/lib/types';
import { db, isBranchMatch } from '@/lib/db';
import { formatNominal, parseNominal, formatRupiah } from '@/lib/utils';

interface CreateExpenseModalProps {
  cabangList: Cabang[];
  karyawanList: Karyawan[];
  defaultCabangId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateExpenseModal({
  cabangList,
  karyawanList,
  defaultCabangId,
  onClose,
  onSuccess,
}: CreateExpenseModalProps) {
  const [selectedCabangId, setSelectedCabangId] = useState<string>(
    defaultCabangId && defaultCabangId !== 'all' ? defaultCabangId : cabangList[0]?.id || 'cbg-1'
  );
  const [jenis, setJenis] = useState<PengeluaranJenis>('belanja');
  const [pemohonNama, setPemohonNama] = useState<string>('');
  const [pemohonTelepon, setPemohonTelepon] = useState<string>('');
  const [karyawanId, setKaryawanId] = useState<string>('');
  const [keperluan, setKeperluan] = useState<string>('');
  const [nominalDisplay, setNominalDisplay] = useState<string>('50.000');
  const [metode, setMetode] = useState<MetodePencairan>('laci');
  const [autoApprove, setAutoApprove] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Filter staf berdasarkan cabang yang dipilih
  const branchWorkers = karyawanList.filter(k => k.role !== 'owner' && isBranchMatch(k.cabang_id, selectedCabangId));
  const targetCabang = cabangList.find(c => isBranchMatch(c.id, selectedCabangId));

  // Quick Chips Belanja Toko Cepat (Tanpa Ribet)
  const quickChips = [
    { label: 'Beli Gas Elpiji 3kg (2 Tabung)', harga: 44000 },
    { label: 'Beli Es Batu Kristal (5 Kantong)', harga: 50000 },
    { label: 'Beli Daun Pisang Serabi (3 Ikat)', harga: 30000 },
    { label: 'Beli Cup & Kantong Kresek Takeaway', harga: 65000 },
    { label: 'Beli Bahan Baku Pasar (Jahe/Gula)', harga: 85000 },
    { label: 'Beli Tisue & Sedotan Toko', harga: 25000 },
  ];

  const handleWorkerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const kid = e.target.value;
    setKaryawanId(kid);
    const found = branchWorkers.find(k => k.id === kid);
    if (found) {
      setPemohonNama(found.nama);
      setPemohonTelepon(found.telepon || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nominal = parseNominal(nominalDisplay);
    if (!nominal || nominal <= 0) {
      alert('Masukkan nominal pengeluaran yang valid');
      return;
    }

    if (!keperluan.trim()) {
      alert('Tuliskan rincian keperluan belanja atau kasbon');
      return;
    }

    setSaving(true);
    try {
      const newExp = await db.createPengeluaran({
        cabang_id: selectedCabangId,
        cabang_nama: targetCabang?.nama || 'Cabang',
        karyawan_id: karyawanId || undefined,
        pemohon_nama: pemohonNama || 'Admin / Kasir Cabang',
        pemohon_telepon: pemohonTelepon || '0813-1111-2222',
        jenis: jenis,
        keperluan: keperluan.trim(),
        nominal: nominal,
        metode_pencairan: metode,
        tanggal: new Date().toISOString(),
      });

      if (autoApprove) {
        await db.approvePengeluaran(newExp.id, {
          metode: metode,
          approvedBy: 'Pak Agan (Owner Pusat)',
        });

        // Langsung kirim konfirmasi resmi ke WhatsApp PJ / Pemohon
        const phoneTarget = pemohonTelepon || '0813-1111-2222';
        const cleanPhone = phoneTarget.replace(/[^0-9]/g, '');
        const intlPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

        const waMsg = [
          `*BUKTI PERSETUJUAN RESMI - SERABI BAWEL & WEDANG GEPREK*`,
          `-----------------------------------------`,
          `Halo Sdr/i *${pemohonNama || 'Kasir Cabang'}*, pengeluaran kas toko cabang Anda telah *DISETUJUI* oleh Admin Pusat / Pak Agan:`,
          ``,
          `🏢 *Cabang:* ${targetCabang?.nama || 'Outlet'}`,
          `🔖 *Kategori:* ${jenis === 'belanja' ? 'BELANJA OPERASIONAL TOKO' : 'KASBON STAF'}`,
          `📝 *Rincian:* ${keperluan.trim()}`,
          `💰 *Nominal Disetujui:* Rp ${nominalDisplay}`,
          `💳 *Sumber Dana:* ${metode === 'laci' ? 'Potong Uang Kas Laci Kasir (Cash Drawer)' : 'Transfer Bank Rekening'}`,
          `📅 *Waktu Approval:* ${new Date().toLocaleString('id-ID')}`,
          ``,
          `_Pesan otomatis resmi dari Backoffice Pusat Serabi Bawel & Wedang Geprek._`
        ].join('\n');

        window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(waMsg)}`, '_blank');
      }

      alert(
        `Pengeluaran ${jenis === 'belanja' ? 'Belanja Kas Kecil' : 'Kasbon'} sebesar Rp ${nominalDisplay} berhasil dicatat${
          autoApprove ? ' dan disetujui serta dikirimkan ke WhatsApp PJ!' : ' (Menunggu Persetujuan)!'
        }`
      );
      onSuccess();
    } catch (err: any) {
      alert('Gagal menyimpan pengeluaran: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn overflow-y-auto"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] my-auto"
      >
        
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-50/80 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-primary text-white flex items-center justify-center font-bold shadow-sm shadow-brand-dark/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Catat Belanja Kasir &amp; Kasbon Cabang
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Pencatatan pengeluaran uang kas kasir laci toko &amp; pinjaman kasbon staf
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          
          {/* Cabang Selector */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Cabang Outlet:
            </label>
            <div className="relative">
              <select
                value={selectedCabangId}
                onChange={(e) => {
                  setSelectedCabangId(e.target.value);
                  setKaryawanId('');
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-primary"
              >
                {cabangList.map(c => (
                  <option key={c.id} value={c.id}>
                    #{c.nomor} • {c.kode} - {c.nama.split('-')[1]?.trim() || c.nama}
                  </option>
                ))}
              </select>
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Jenis Pengeluaran Toggle */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Jenis Pengeluaran:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setJenis('belanja')}
                className={`py-2 px-3 rounded-xl border font-extrabold flex items-center justify-center space-x-1.5 transition-all ${
                  jenis === 'belanja'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Belanja Toko (Gas/Es/Bahan)</span>
              </button>
              <button
                type="button"
                onClick={() => setJenis('kasbon')}
                className={`py-2 px-3 rounded-xl border font-extrabold flex items-center justify-center space-x-1.5 transition-all ${
                  jenis === 'kasbon'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Kasbon Karyawan</span>
              </button>
            </div>
          </div>

          {/* Quick Chips saat Jenis Belanja */}
          {jenis === 'belanja' && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 block">
                Pilih Cepat Kebutuhan Toko:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setKeperluan(chip.label);
                      setNominalDisplay(formatNominal(chip.harga.toString()));
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 text-slate-700 text-[10px] font-bold transition-all"
                  >
                    {chip.label} ({formatRupiah(chip.harga)})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pemohon Staf */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Pilih Staf Cabang / PJ:
              </label>
              <select
                value={karyawanId}
                onChange={handleWorkerChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-brand-primary"
              >
                <option value="">-- Ketik Manual / Pilih Staf --</option>
                {branchWorkers.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.nama} ({w.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Nama Pemohon / Kasir:
              </label>
              <input
                type="text"
                value={pemohonNama}
                onChange={(e) => setPemohonNama(e.target.value)}
                placeholder="Contoh: Siti Rahmawati (Kasir)"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          {/* Keperluan Belanja */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Rincian Keperluan:
            </label>
            <input
              type="text"
              value={keperluan}
              onChange={(e) => setKeperluan(e.target.value)}
              placeholder="Contoh: Beli Gas Elpiji 3kg + Es Batu Kristal"
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-brand-primary"
            />
          </div>

          {/* Nominal Pengeluaran (Format Titik Otomatis) */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Nominal Uang yang Dikeluarkan (Rp):
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 font-bold text-slate-400">Rp</span>
              <input
                type="text"
                value={nominalDisplay}
                onChange={(e) => setNominalDisplay(formatNominal(e.target.value))}
                required
                className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-extrabold text-sm text-slate-900 focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          {/* Sumber Dana / Metode Pencairan */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Sumber Dana Pencairan:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center space-x-2 transition-all ${
                metode === 'laci' ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-bold' : 'border-slate-200 text-slate-600'
              }`}>
                <input
                  type="radio"
                  name="metode"
                  checked={metode === 'laci'}
                  onChange={() => setMetode('laci')}
                  className="text-brand-primary focus:ring-brand-primary"
                />
                <div>
                  <span className="block text-xs font-bold">Uang Kas Laci Kasir</span>
                  <span className="text-[10px] text-slate-400 font-normal">Mengurangi kas fisik laci shift</span>
                </div>
              </label>

              <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center space-x-2 transition-all ${
                metode === 'transfer' ? 'border-sky-500 bg-sky-50/50 text-sky-950 font-bold' : 'border-slate-200 text-slate-600'
              }`}>
                <input
                  type="radio"
                  name="metode"
                  checked={metode === 'transfer'}
                  onChange={() => setMetode('transfer')}
                  className="text-sky-600 focus:ring-sky-500"
                />
                <div>
                  <span className="block text-xs font-bold">Transfer Bank Rekening</span>
                  <span className="text-[10px] text-slate-400 font-normal">Ditransfer langsung dari rekening</span>
                </div>
              </label>
            </div>
          </div>

          {/* Auto Approve Checkbox */}
          <div className="flex items-center space-x-2 bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
            <input
              type="checkbox"
              id="autoApprove"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              className="rounded text-brand-primary focus:ring-brand-primary cursor-pointer w-4 h-4"
            />
            <label htmlFor="autoApprove" className="cursor-pointer text-[11px] font-bold text-emerald-950">
              Langsung Setujui &amp; Kirim Notifikasi WhatsApp ke PJ/Pemohon
            </label>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-dark text-white font-extrabold text-xs shadow-md shadow-brand-dark/20 btn-tactile flex items-center space-x-1.5 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Pengeluaran'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
