'use client';

import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  Building2, 
  Phone, 
  Save,
  CreditCard
} from 'lucide-react';
import { Cabang } from '@/lib/types';
import { db } from '@/lib/db';
import { formatNominal, parseNominal } from '@/lib/utils';

interface CreateKaryawanModalProps {
  cabangList: Cabang[];
  defaultCabangId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateKaryawanModal({
  cabangList,
  defaultCabangId,
  onClose,
  onSuccess,
}: CreateKaryawanModalProps) {
  const [nama, setNama] = useState<string>('');
  const [cabangId, setCabangId] = useState<string>(
    defaultCabangId && defaultCabangId !== 'all' ? defaultCabangId : cabangList[0]?.id || 'cbg-1'
  );
  const [role, setRole] = useState<'kasir' | 'kitchen'>('kasir');
  const [telepon, setTelepon] = useState<string>('');
  const [bankNama, setBankNama] = useState<string>('');
  const [noRekening, setNoRekening] = useState<string>('');
  const [atasNamaRek, setAtasNamaRek] = useState<string>('');
  const [gajiHarianDisplay, setGajiHarianDisplay] = useState<string>('100.000');
  const [plafonKasbonDisplay, setPlafonKasbonDisplay] = useState<string>('500.000');
  const [saving, setSaving] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      alert('Nama karyawan wajib diisi');
      return;
    }

    const uHarian = parseNominal(gajiHarianDisplay) || 100000;
    const plafon = parseNominal(plafonKasbonDisplay) || 500000;
    const cleanPhone =
      telepon.trim() ||
      (bankNama.toLowerCase().includes('dana') && noRekening.trim() ? noRekening.trim() : '0812-0000-0000');

    setSaving(true);
    try {
      await db.createKaryawan({
        nama: nama.trim(),
        role: role,
        cabang_id: cabangId,
        telepon: cleanPhone,
        pin: '1234',
        password_plain: '1234',
        tipe_gaji: 'harian',
        gaji_harian: uHarian,
        gaji_pokok: uHarian * 6,
        plafon_kasbon: plafon,
        tabungan_rutin_mingguan: 0,
        bank_nama: bankNama.trim() || 'DANA',
        no_rekening: noRekening.trim(),
        atas_nama_rekening: atasNamaRek.trim() || nama.trim(),
      });

      alert(`Karyawan "${nama}" berhasil ditambahkan dan langsung masuk daftar Rekap Gaji & Pekerja!`);
      onSuccess();
    } catch (err: any) {
      alert('Gagal mendaftarkan karyawan: ' + err.message);
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
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Tambah Karyawan Baru
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Isi nama, cabang tugas, nomor DANA/rekening transfer gaji &amp; upah harian
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
          
          {/* Nama & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Nama Lengkap Pekerja:
              </label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Siti Rahmawati"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Posisi / Tugas Outlet:
              </label>
              <select
                value={role}
                onChange={(e: any) => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-primary"
              >
                <option value="kasir">Kasir Cabang (PJ Outlet &amp; POS)</option>
                <option value="kitchen">Pekerja Outlet (Serabi &amp; Wedang)</option>
              </select>
            </div>
          </div>

          {/* Penempatan Cabang & No. WA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Ploting Cabang Tugas:
              </label>
              <div className="relative">
                <select
                  value={cabangId}
                  onChange={(e) => setCabangId(e.target.value)}
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

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Nomor WhatsApp (Kirim Slip Gaji):
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={telepon}
                  onChange={(e) => setTelepon(e.target.value)}
                  placeholder="0813-xxxx-xxxx"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-brand-primary"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Rekening Bank / Tujuan Transfer */}
          <div className="p-3.5 bg-sky-50/70 rounded-2xl border border-sky-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-sky-950 flex items-center space-x-1.5">
                <CreditCard className="w-3.5 h-3.5 text-sky-700" />
                <span>Rekening Bank / Tujuan Kirim Gaji:</span>
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold">
                Siap Transfer Mingguan
              </span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Nama Bank / Aplikasi / Metode Kirim (Isi Sendiri):
              </label>
              <input
                type="text"
                value={bankNama}
                onChange={(e) => setBankNama(e.target.value)}
                placeholder="Ketik sendiri: DANA, BCA, BRI, BSI, OVO, SeaBank, Tunai..."
                className="w-full px-3 py-1.5 bg-white border border-sky-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-sky-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  {bankNama.trim()
                    ? bankNama.trim().toLowerCase() === 'tunai'
                      ? 'Keterangan Pembayaran:'
                      : `Nomor ${bankNama.trim()}:`
                    : 'Nomor Rekening / Tujuan:'}
                </label>
                <input
                  type="text"
                  value={noRekening}
                  onChange={(e) => setNoRekening(e.target.value)}
                  placeholder="No. rekening / No. HP / keterangan"
                  className="w-full px-3 py-1.5 bg-white border border-sky-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-600"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Atas Nama (Opsional):
                </label>
                <input
                  type="text"
                  value={atasNamaRek}
                  onChange={(e) => setAtasNamaRek(e.target.value)}
                  placeholder={nama.trim() || 'Sesuai nama karyawan'}
                  className="w-full px-3 py-1.5 bg-white border border-sky-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-sky-600"
                />
              </div>
            </div>
          </div>

          {/* Gaji Harian & Plafon Kasbon */}
          <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-emerald-950">
                Skema Gaji Murni Mingguan &amp; Kasbon:
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                100% Mingguan (÷ 6 Hari)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Upah Harian per Kehadiran:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-slate-400">Rp</span>
                  <input
                    type="text"
                    value={gajiHarianDisplay}
                    onChange={(e) => setGajiHarianDisplay(formatNominal(e.target.value))}
                    required
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <div className="text-[10px] text-slate-600 mt-1.5 bg-white p-2 rounded-xl border border-emerald-200/60">
                  <div className="flex justify-between font-extrabold text-emerald-800">
                    <span>Total Gaji 1 Minggu (6 Hari):</span>
                    <span className="font-mono">Rp {formatNominal(((parseNominal(gajiHarianDisplay) || 100000) * 6).toString())}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Plafon Maksimal Kasbon:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-slate-400">Rp</span>
                  <input
                    type="text"
                    value={plafonKasbonDisplay}
                    onChange={(e) => setPlafonKasbonDisplay(formatNominal(e.target.value))}
                    required
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <span className="text-[9px] text-slate-500 mt-1 block">
                  Batas pinjaman kasbon staf
                </span>
              </div>
            </div>
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
              <span>{saving ? 'Mendaftarkan...' : 'Simpan Karyawan'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
