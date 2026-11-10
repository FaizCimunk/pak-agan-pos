'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  Coins, 
  CreditCard, 
  Check, 
  MessageCircle, 
  ExternalLink,
  Building2,
  UserCheck
} from 'lucide-react';
import { PengeluaranKasbon, MetodePencairan, Cabang } from '@/lib/types';
import { db, isBranchMatch } from '@/lib/db';
import { formatRupiah, formatWaktu } from '@/lib/utils';

interface ApprovalActionModalProps {
  item: PengeluaranKasbon;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApprovalActionModal({
  item,
  onClose,
  onSuccess,
}: ApprovalActionModalProps) {
  const [metode, setMetode] = useState<MetodePencairan>('laci');
  const [loading, setLoading] = useState<boolean>(false);
  const [branchInfo, setBranchInfo] = useState<Cabang | null>(null);
  const [targetPhone, setTargetPhone] = useState<string>(item.pemohon_telepon || '');
  const [recipientName, setRecipientName] = useState<string>(item.pemohon_nama || 'Penanggung Jawab');
  const [approvedSuccessData, setApprovedSuccessData] = useState<{
    waUrl: string;
    phone: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    async function loadBranch() {
      const [branches, workers] = await Promise.all([
        db.getCabangList(),
        db.getAllKaryawan(),
      ]);
      const b = branches.find(c => isBranchMatch(c.id, item.cabang_id));
      const kar = workers.find(
        w => w.id === item.karyawan_id || w.nama.toLowerCase().trim() === (item.pemohon_nama || '').toLowerCase().trim()
      );
      if (b) {
        setBranchInfo(b);
      }
      if (item.jenis === 'kasbon') {
        setTargetPhone(kar?.telepon || b?.pj_telepon || item.pemohon_telepon || '');
        setRecipientName(kar?.nama || item.pemohon_nama || b?.pj_nama || 'Penanggung Jawab');
      } else if (b?.pj_telepon) {
        setTargetPhone(b.pj_telepon);
        setRecipientName(b.pj_nama || `PJ ${b.nama}`);
      } else if (kar?.telepon || item.pemohon_telepon) {
        setTargetPhone(kar?.telepon || item.pemohon_telepon || '');
        setRecipientName(kar?.nama || item.pemohon_nama);
      }
    }
    loadBranch();
  }, [item]);

  // Generate ready-to-send WhatsApp message to penanggung jawab / pemohon
  const generateWhatsAppUrl = (nominal: number, usedMetode: string, customPhone: string, customName: string) => {
    const cleanPhone = (customPhone || '0812-1000-0101').replace(/[^0-9]/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

    const message = [
      `*BUKTI PERSETUJUAN DANA RESMI - SERABI BAWEL & WEDANG GEPREK*`,
      `-----------------------------------------`,
      `Halo Sdr/i *${customName}*, pengajuan dana kas toko telah *DISETUJUI & DICAIRKAN* oleh Pak Agan (Owner Pusat).`,
      ``,
      `📌 *No. ID Pengajuan:* #${item.id.toUpperCase()}`,
      `🏢 *Outlet Cabang:* ${item.cabang_nama || 'Outlet Resmi'}`,
      `👤 *Pemohon Riil:* ${item.pemohon_nama}`,
      `🔖 *Jenis Pengajuan:* ${item.jenis === 'kasbon' ? 'KASBON STAF' : 'BELANJA OPERASIONAL OUTLET'}`,
      `📝 *Keperluan:* ${item.keperluan}`,
      `💰 *Nominal Disetujui:* ${formatRupiah(nominal)}`,
      `💳 *Metode Pencairan:* ${usedMetode === 'laci' ? 'Potong Uang Kas Laci Kasir (Cash Drawer)' : 'Transfer Bank Rekening'}`,
      `📅 *Waktu Approval:* ${new Date().toLocaleString('id-ID')}`,
      ``,
      `_Pesan konfirmasi resmi dari Backoffice Pusat Serabi Bawel & Wedang Geprek._`
    ].join('\n');

    return {
      waUrl: `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`,
      phone: customPhone,
      name: customName
    };
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await db.approvePengeluaran(item.id, {
        metode: metode,
        approvedBy: 'Pak Agan (Owner Pusat)',
      });

      const { waUrl, phone, name } = generateWhatsAppUrl(item.nominal, metode, targetPhone, recipientName);
      
      // Langsung buka WhatsApp ke nomor HP PJ / Penerima
      try {
        window.open(waUrl, '_blank');
      } catch (err) {
        console.warn('Popup blocked, button available on screen', err);
      }

      setApprovedSuccessData({
        waUrl,
        phone,
        name
      });
    } catch (e: any) {
      alert('Gagal menyetujui: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/70">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">Approval Pusat</span>
              <h3 className="text-base font-extrabold text-slate-900">Setujui Pengeluaran Kasir</h3>
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
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Post-Approval WhatsApp Screen */}
          {approvedSuccessData ? (
            <div className="space-y-4 py-2 text-center animate-fadeIn">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner">
                ✓
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-slate-900">Pengajuan Berhasil Disetujui!</h4>
                <p className="text-xs text-slate-500">
                  Data telah diperbarui di database pusat dan saldo laci cabang telah disinkronkan.
                </p>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-left space-y-2 text-xs">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>Kirim Notifikasi Langsung ke WhatsApp Penanggung Jawab:</span>
                </div>
                <div className="text-[11px] text-emerald-800">
                  Pesan WhatsApp resmi telah disiapkan untuk Penanggung Jawab: <strong>{approvedSuccessData.name}</strong> (No. WA: <strong>{approvedSuccessData.phone}</strong>).
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <a
                  href={approvedSuccessData.waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl font-bold bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-xs transition-all"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>Kirim ke WhatsApp PJ Sekarang</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={() => {
                    onSuccess();
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Selesai &amp; Tutup
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Pemohon Riil:</span>
                  <span className="font-bold text-slate-800">{item.pemohon_nama}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Outlet Cabang:</span>
                  <span className="font-semibold text-slate-800">{item.cabang_nama || 'Cabang'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Jenis Pengajuan:</span>
                  <span className="font-bold uppercase text-brand-dark">{item.jenis}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Keperluan:</span>
                  <span className="text-slate-700 font-medium">{item.keperluan}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-slate-800">Nominal:</span>
                  <span className="font-mono font-extrabold text-base text-brand-dark tabular-nums">
                    {formatRupiah(item.nominal)}
                  </span>
                </div>
              </div>

              {/* Box Penerima Notifikasi WhatsApp (Dibedakan dari pekerja login) */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-emerald-950 flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Tujuan WhatsApp Laporan &amp; Approval:</span>
                  </label>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-emerald-800 border border-emerald-300">
                    Resmi Outlet
                  </span>
                </div>

                {/* Quick Select Buttons */}
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  {branchInfo?.pj_telepon && (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetPhone(branchInfo.pj_telepon || '');
                        setRecipientName(branchInfo.pj_nama || `PJ ${branchInfo.nama}`);
                      }}
                      className={`p-2 rounded-xl border text-left transition ${
                        targetPhone === branchInfo.pj_telepon
                          ? 'bg-emerald-700 text-white border-emerald-800 font-bold shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block font-black truncate">🏢 No. WA PJ Cabang</span>
                      <span className="font-mono text-[9px] opacity-90 truncate block">{branchInfo.pj_telepon}</span>
                    </button>
                  )}

                  {item.pemohon_telepon && (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetPhone(item.pemohon_telepon || '');
                        setRecipientName(item.pemohon_nama);
                      }}
                      className={`p-2 rounded-xl border text-left transition ${
                        targetPhone === item.pemohon_telepon
                          ? 'bg-emerald-700 text-white border-emerald-800 font-bold shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block font-black truncate">👤 No. WA Pemohon</span>
                      <span className="font-mono text-[9px] opacity-90 truncate block">{item.pemohon_telepon}</span>
                    </button>
                  )}
                </div>

                <div className="pt-1 space-y-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Nama Penerima WA"
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold text-xs bg-white text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                    <input
                      type="text"
                      value={targetPhone}
                      onChange={(e) => setTargetPhone(e.target.value)}
                      placeholder="0812xxxx"
                      className="w-36 px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-xs bg-white text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <span className="text-[9px] text-emerald-800/80 block">
                    *Bukti persetujuan dana belanja akan otomatis dikirim ke nomor WhatsApp di atas.
                  </span>
                </div>
              </div>

              {/* Metode Pencairan Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Pilih Sumber &amp; Metode Pencairan Dana:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMetode('laci')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all btn-tactile ${
                      metode === 'laci'
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Coins className="w-4 h-4 text-emerald-600" />
                      {metode === 'laci' && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                    </div>
                    <div className="font-extrabold text-xs text-slate-900">Uang Kas Laci</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Potong kas shift kasir di outlet</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetode('transfer')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all btn-tactile ${
                      metode === 'transfer'
                        ? 'border-blue-500 bg-blue-50/70 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      {metode === 'transfer' && <Check className="w-3.5 h-3.5 text-blue-700" />}
                    </div>
                    <div className="font-extrabold text-xs text-slate-900">Transfer Bank</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Transfer langsung dari Pak Agan</div>
                  </button>
                </div>
              </div>

              {/* Notice Auto WhatsApp */}
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-2">
                <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-bold">
                  Begitu Anda klik &quot;Konfirmasi &amp; Setujui&quot;, konfirmasi resmi langsung otomatis terbuka ke WhatsApp penanggung jawab ({targetPhone}).
                </span>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl font-extrabold text-xs bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-700/20 btn-tactile transition-all"
                >
                  {loading ? 'Menyetujui...' : 'Konfirmasi & Setujui'}
                </button>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
}
