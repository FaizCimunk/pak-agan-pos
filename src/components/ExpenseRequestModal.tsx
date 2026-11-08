'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ShoppingBag, 
  Send, 
  CheckCircle2, 
  Clock, 
  MessageCircle,
  AlertCircle,
  AlertTriangle,
  XCircle,
  History,
  PlusCircle,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { Cabang, Shift, PengeluaranKasbon } from '@/lib/types';
import { db } from '@/lib/db';
import { 
  formatRupiah, 
  formatNominal, 
  parseNominal, 
  formatWaktu, 
  generateWhatsAppApprovalLink 
} from '@/lib/utils';

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
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [keperluan, setKeperluan] = useState<string>('');
  const [nominal, setNominal] = useState<number>(50000);
  const [loading, setLoading] = useState<boolean>(false);
  const [submittedItem, setSubmittedItem] = useState<PengeluaranKasbon | null>(null);
  const [expensesList, setExpensesList] = useState<PengeluaranKasbon[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);

  const quickBelanjaTemplates = [
    'Beli Es Batu Kristal 5 Kantong',
    'Beli Gas Elpiji 3kg (1 Tabung)',
    'Beli Jahe Emprit Segar Pasar 2 Kg',
    'Beli Gula Aren Asli Kelapa 3 Kg',
    'Beli Kantong Kresek & Cup Takeaway',
    'Beli Daun Pisang Serabi 2 Ikat',
  ];

  const loadExpenses = async () => {
    setLoadingHistory(true);
    try {
      const list = await db.getPengeluaranList(cabang.id);
      const todayStr = new Date().toISOString().slice(0, 10);
      const filtered = list.filter(e => {
        if (e.jenis !== 'belanja') return false;
        const expDate = (e.tanggal || '').slice(0, 10);
        return expDate === todayStr || e.shift_id === shift.id;
      });
      setExpensesList(filtered);
    } catch (err) {
      console.error('Failed to load expenses history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [cabang.id, shift.id]);

  const pendingCount = expensesList.filter(e => e.status === 'pending').length;
  const approvedCount = expensesList.filter(e => e.status === 'approved').length;
  const rejectedCount = expensesList.filter(e => e.status === 'rejected').length;

  const handleSubmit = async () => {
    if (isSubmittingRef.current || loading) return;
    if (!keperluan.trim()) {
      alert('Tuliskan rincian kebutuhan belanja toko');
      return;
    }
    if (nominal <= 0) {
      alert('Masukkan nominal belanja yang valid');
      return;
    }

    isSubmittingRef.current = true;
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
      await loadExpenses();
    } catch (e: any) {
      alert('Gagal mengajukan belanja: ' + e.message);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleResubmit = (item: PengeluaranKasbon) => {
    setNominal(item.nominal);
    setKeperluan(`[Revisi] ${item.keperluan.replace(/^\[Revisi\]\s*/, '')}`);
    setSubmittedItem(null);
    setActiveTab('form');
  };

  const handleOpenWhatsApp = (item: PengeluaranKasbon) => {
    const url = generateWhatsAppApprovalLink({
      cabangNama: cabang.nama,
      staffNama: item.pemohon_nama || shift.karyawan_nama || 'Kasir',
      jenis: 'belanja',
      nominal: item.nominal,
      keperluan: item.keperluan,
    });
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-700 via-emerald-800 to-emerald-900 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 text-white flex items-center justify-center font-bold shadow-xs">
              <ShoppingBag className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-sm sm:text-base font-extrabold leading-tight">Belanja Toko (Kas Laci)</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/20 text-emerald-100">
                  #{cabang.nomor || '01'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/90 font-medium">
                Pencatatan kas kecil & approval owner
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('form');
              setSubmittedItem(null);
            }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'form'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ajukan Belanja</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'history'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-amber-600" />
            <span>Riwayat Hari Ini</span>
            {pendingCount > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-amber-500 text-white animate-pulse">
                ⏳ {pendingCount}
              </span>
            ) : rejectedCount > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-rose-500 text-white">
                ✕ {rejectedCount}
              </span>
            ) : (
              expensesList.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200 text-slate-700">
                  {expensesList.length}
                </span>
              )
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* TAB 1: FORM PENGAJUAN */}
          {activeTab === 'form' && (
            <>
              {/* Notification Banner if there are pending or rejected items */}
              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="w-full p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-300 text-amber-900 text-xs flex items-center justify-between transition-colors text-left shadow-2xs"
                >
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                    <span className="font-bold text-[11px]">Ada {pendingCount} pengajuan belanja MASIH MENUNGGU approval</span>
                  </div>
                  <span className="text-[10px] font-black underline shrink-0 text-amber-950">Lihat Status →</span>
                </button>
              )}

              {rejectedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="w-full p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100/80 border border-rose-300 text-rose-900 text-xs flex items-center justify-between transition-colors text-left shadow-2xs"
                >
                  <div className="flex items-center space-x-2">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="font-bold text-[11px]">Ada {rejectedCount} pengajuan DITOLAK (Uang tidak bisa dicairkan)</span>
                  </div>
                  <span className="text-[10px] font-black underline shrink-0 text-rose-950">Lihat Detail →</span>
                </button>
              )}

              {submittedItem ? (
                /* Success State with Instant WhatsApp Button */
                <div className="flex flex-col items-center text-center space-y-4 py-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-md animate-bounce">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-base font-extrabold text-slate-900">
                      Pengajuan Belanja Berhasil Dikirim!
                    </h4>
                    <p className="text-xs text-slate-500">
                      Status saat ini: <strong className="text-amber-600">MENUNGGU APPROVAL OWNER</strong>.
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
                    onClick={() => handleOpenWhatsApp(submittedItem)}
                    className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/20 btn-tactile transition-all"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>Kirim Permintaan Approval ke WhatsApp Owner</span>
                  </button>

                  <div className="w-full grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      className="py-2.5 px-3 rounded-xl font-extrabold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs transition flex items-center justify-center space-x-1.5"
                    >
                      <History className="w-3.5 h-3.5 text-amber-700" />
                      <span>Lihat Riwayat Status</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmittedItem(null);
                        setKeperluan('');
                        setNominal(50000);
                      }}
                      className="py-2.5 px-3 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition"
                    >
                      + Ajukan Lagi
                    </button>
                  </div>
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
                      Tutup
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
            </>
          )}

          {/* TAB 2: RIWAYAT BELANJA HARI INI */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {/* Top Summary Bar */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[11px]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold font-mono">
                    ✓ {approvedCount} Disetujui
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold font-mono">
                    ⏳ {pendingCount} Menunggu
                  </span>
                  {rejectedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold font-mono">
                      ✕ {rejectedCount} Ditolak
                    </span>
                  )}
                </div>
                <button 
                  type="button" 
                  onClick={loadExpenses}
                  className="text-slate-500 hover:text-slate-800 flex items-center space-x-1 p-1 rounded-md transition"
                  title="Segarkan Riwayat"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingHistory ? 'animate-spin' : ''}`} />
                  <span className="text-[10px] font-bold">Refresh</span>
                </button>
              </div>

              {/* List of expenses */}
              {expensesList.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700">Belum Ada Belanja Toko Hari Ini</h4>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Pengajuan belanja untuk es batu, gas LPG, atau kebutuhan kasir akan muncul di sini beserta status persetujuan dari Owner.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('form')}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-sm transition"
                  >
                    + Buat Pengajuan Belanja
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {expensesList.map(item => (
                    <div 
                      key={item.id} 
                      className={`p-3.5 rounded-2xl border transition-all ${
                        item.status === 'approved'
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : item.status === 'rejected'
                          ? 'bg-rose-50/40 border-rose-300'
                          : 'bg-amber-50/40 border-amber-300 shadow-2xs'
                      }`}
                    >
                      {/* Top Meta */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            🕒 {formatWaktu(item.tanggal)} • Oleh: {item.pemohon_nama || 'Kasir'}
                          </span>
                          <h4 className="font-extrabold text-xs text-slate-900 mt-0.5">
                            {item.keperluan}
                          </h4>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-mono font-black text-slate-900 block tabular-nums">
                            {formatRupiah(item.nominal)}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium">Via Kas Laci</span>
                        </div>
                      </div>

                      {/* Status Card */}
                      {item.status === 'pending' && (
                        <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-amber-900 flex items-center gap-1.5 text-[11px]">
                              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                              ⏳ MENUNGGU APPROVAL OWNER
                            </span>
                            <span className="text-[9px] font-mono font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                              Belum Potong Laci
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-800/90 leading-tight">
                            Pengajuan sedang ditinjau di Dashboard Utama. Uang kas laci belum dipotong sampai Owner menyetujui.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(item)}
                            className="w-full py-1.5 px-3 rounded-lg bg-[#25D366] hover:bg-[#1EBE5D] text-white text-[11px] font-extrabold flex items-center justify-center space-x-1.5 shadow-2xs transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-white" />
                            <span>Kirim Pengingat ke WA Owner</span>
                          </button>
                        </div>
                      )}

                      {item.status === 'approved' && (
                        <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-emerald-900 flex items-center gap-1.5 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ✓ DISETUJUI (APPROVED)
                            </span>
                            <span className="text-[9px] font-mono font-bold bg-emerald-200 text-emerald-950 px-1.5 py-0.5 rounded">
                              Masuk Tutup Buku
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-800/90 leading-tight">
                            Disetujui oleh <b>{item.approved_by || 'Pak Agan (Owner)'}</b> • Resmi memotong saldo kas laci kasir.
                          </p>
                        </div>
                      )}

                      {item.status === 'rejected' && (
                        <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-rose-900 flex items-center gap-1.5 text-[11px]">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              ✕ DITOLAK (REJECTED)
                            </span>
                            <span className="text-[9px] font-mono font-bold bg-rose-200 text-rose-950 px-1.5 py-0.5 rounded">
                              TIDAK BISA CAIR
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-white/90 border border-rose-200 text-[11px] text-rose-950">
                            <span className="font-bold">Alasan Penolakan: </span>
                            <span>{item.alasan_penolakan || 'Di luar anggaran operasional toko'}</span>
                          </div>
                          <p className="text-[10px] text-rose-800 font-semibold leading-tight">
                            ⚠️ Biaya ini <b>TIDAK memotong saldo kas toko</b> dan <b>tidak masuk tutup buku</b>. Jika kasir sempat mengambil uang tunai dari laci, kasir wajib mengembalikan uang tersebut ke laci fisik sekarang agar tidak tekor saat tutup shift.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleResubmit(item)}
                            className="w-full py-1.5 px-3 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-[11px] font-extrabold flex items-center justify-center space-x-1.5 shadow-2xs transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Koreksi / Ajukan Ulang</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
