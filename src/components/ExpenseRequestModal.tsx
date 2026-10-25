'use client';

import React, { useState } from 'react';
import { 
  X, 
  ShoppingBag, 
  Send, 
  CheckCircle2, 
  Clock, 
  MessageCircle,
  AlertCircle
} from 'lucide-react';
import { Cabang, Shift, PengeluaranKasbon } from '@/lib/types';
import { db } from '@/lib/db';
import { formatRupiah, formatNominal, parseNominal, generateWhatsAppApprovalLink } from '@/lib/utils';

interface ExpenseRequestModalProps {
  cabang: Cabang;
  shift: Shift;
  onClose: () => void;
  onSuccess: (item: PengeluaranKasbon) => void;
}

export default function ExpenseRequestModal({
  cabang,
  shift,
  onClose,
  onSuccess,
}: ExpenseRequestModalProps) {
  const [keperluan, setKeperluan] = useState<string>('');
  const [nominal, setNominal] = useState<number>(50000);
  const [loading, setLoading] = useState<boolean>(false);
  const [submittedItem, setSubmittedItem] = useState<PengeluaranKasbon | null>(null);

  const quickBelanjaTemplates = [
    'Beli Es Batu Kristal 5 Kantong',
    'Beli Gas Elpiji 3kg (1 Tabung)',
    'Beli Jahe Emprit Segar Pasar 2 Kg',
    'Beli Gula Aren Asli Kelapa 3 Kg',
    'Beli Kantong Kresek & Cup Takeaway',
    'Beli Daun Pisang Serabi 2 Ikat',
  ];

  const handleSubmit = async () => {
    if (!keperluan.trim()) {
      alert('Tuliskan rincian kebutuhan belanja toko');
      return;
    }
    if (nominal <= 0) {
      alert('Masukkan nominal belanja yang valid');
      return;
    }

    setLoading(true);
    try {
      const created = await db.createPengeluaran({
        cabang_id: cabang.id,
        cabang_nama: cabang.nama,
        shift_id: shift.id,
        karyawan_id: shift.karyawan_id,
        pemohon_nama: shift.karyawan_nama || 'Kasir',
        jenis: 'belanja',
        keperluan: keperluan.trim(),
        nominal: nominal,
        metode_pencairan: 'laci',
      });

      setSubmittedItem(created);
      onSuccess(created);
    } catch (e: any) {
      alert('Gagal mengajukan belanja: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWhatsApp = () => {
    if (!submittedItem) return;
    const url = generateWhatsAppApprovalLink({
      cabangNama: cabang.nama,
      staffNama: shift.karyawan_nama || 'Kasir',
      jenis: 'belanja',
      nominal: submittedItem.nominal,
      keperluan: submittedItem.keperluan,
    });
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/70">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-brand-primary text-white flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">Kasir Outlet</span>
              <h3 className="text-base font-extrabold text-slate-900">Belanja Toko (Kas Kecil Kasir)</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          {submittedItem ? (
            /* Success State with Instant WhatsApp Button */
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-md animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-slate-900">
                  Pengajuan Belanja Berhasil Dikirim!
                </h4>
                <p className="text-xs text-slate-500">
                  Status saat ini: <strong className="text-amber-600">MENUNGGU APPROVAL PUSAT</strong>.
                </p>
              </div>

              <div className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Jenis Pengeluaran:</span>
                  <span className="font-bold text-emerald-800">BELANJA KEBUTUHAN TOKO</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Sumber Dana:</span>
                  <span className="font-bold text-slate-800">Uang Kas Laci Kasir (Cash Drawer)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Nominal:</span>
                  <span className="font-mono font-bold text-slate-900">{formatRupiah(submittedItem.nominal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Keperluan:</span>
                  <span className="font-semibold text-slate-800">{submittedItem.keperluan}</span>
                </div>
              </div>

              {/* Instant WhatsApp Link to Pak Agan */}
              <button
                onClick={handleOpenWhatsApp}
                className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/20 btn-tactile transition-all"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Kirim Permintaan Approval ke WhatsApp Owner</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition"
              >
                Tutup Jendela
              </button>
            </div>
          ) : (
            /* Submission Form */
            <>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Gunakan form ini untuk mencatat uang kasir yang diambil untuk belanja kebutuhan outlet (gas elpiji, es batu, kresek/cup, atau bahan baku mendesak).
                </p>
              </div>

              {/* Nominal Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Nominal Uang Kasir yang Diambil (Rp):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-sm">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={nominal === 0 ? '' : formatNominal(nominal)}
                    onChange={(e) => setNominal(parseNominal(e.target.value))}
                    placeholder="Contoh: 75.000"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 font-mono font-bold text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                  />
                </div>
              </div>

              {/* Keperluan */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Rincian Barang yang Dibelanjakan:
                </label>
                <textarea
                  rows={2}
                  value={keperluan}
                  onChange={(e) => setKeperluan(e.target.value)}
                  placeholder="Contoh: Beli es batu kristal 5 kantong + Gas Elpiji 3kg..."
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                />
              </div>

              {/* Quick Template Pills */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
                  Template Kebutuhan Cepat:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickBelanjaTemplates.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setKeperluan(tpl)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors text-left"
                    >
                      {tpl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-dark text-white font-extrabold text-xs shadow-md shadow-brand-dark/20 btn-tactile flex items-center space-x-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{loading ? 'Mengajukan...' : 'Ajukan Belanja Toko'}</span>
                </button>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
}
