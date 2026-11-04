'use client';

import React from 'react';
import { X, Printer, ShieldCheck, Building2, CheckCircle2, Clock, XCircle, ShoppingBag, Coins } from 'lucide-react';
import { PengeluaranKasbon } from '@/lib/types';
import { formatRupiah, formatWaktu } from '@/lib/utils';

interface ApprovalRecapReportModalProps {
  expenses: PengeluaranKasbon[];
  periodeLabel?: string;
  cabangLabel?: string;
  statusLabel?: string;
  onClose: () => void;
}

export default function ApprovalRecapReportModal({
  expenses,
  periodeLabel = 'Semua Periode',
  cabangLabel = 'Seluruh 10 Cabang',
  statusLabel = 'Semua Status',
  onClose,
}: ApprovalRecapReportModalProps) {
  const totalApproved = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.nominal, 0);
  const totalBelanjaApproved = expenses.filter(e => e.jenis === 'belanja' && e.status === 'approved').reduce((sum, e) => sum + e.nominal, 0);
  const totalKasbonApproved = expenses.filter(e => e.jenis === 'kasbon' && e.status === 'approved').reduce((sum, e) => sum + e.nominal, 0);
  const totalPending = expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.nominal, 0);

  const countApproved = expenses.filter(e => e.status === 'approved').length;
  const countPending = expenses.filter(e => e.status === 'pending').length;
  const countRejected = expenses.filter(e => e.status === 'rejected').length;

  React.useEffect(() => {
    document.body.classList.add('printing-modal-open');
    return () => {
      document.body.classList.remove('printing-modal-open');
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn printable-modal-backdrop print:static print:p-0 print:bg-white print:overflow-visible print:block print:inset-auto print:h-auto print:max-h-none">
      
      {/* Print styles for A4 Landscape Rekap Approval (Formal High-Contrast Black Ink) */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page {
              size: A4 landscape;
              margin: 8mm;
            }
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              font-size: 8.5pt !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              overflow: visible !important;
              height: auto !important;
            }
            .print\\:hidden, header, nav, button, footer {
              display: none !important;
            }
            .printable-modal-backdrop {
              position: static !important;
              display: block !important;
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
              overflow: visible !important;
              height: auto !important;
              max-height: none !important;
            }
            #printable-approval-wrapper {
              position: static !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              max-width: 100% !important;
              width: 100% !important;
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              padding: 0 !important;
              margin: 0 !important;
              display: block !important;
              visibility: visible !important;
              background: #ffffff !important;
            }
            #printable-approval-wrapper * {
              visibility: visible !important;
              color: #000000 !important;
              -webkit-text-fill-color: #000000 !important;
              text-shadow: none !important;
              box-shadow: none !important;
            }
            #printable-approval-content {
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              display: block !important;
              background: #ffffff !important;
            }

            /* Black ink KPI card boxes */
            #printable-approval-content .p-3.bg-slate-50,
            #printable-approval-content .p-3.bg-emerald-50\\/60,
            #printable-approval-content .p-3.bg-amber-50\\/60 {
              background-color: #ffffff !important;
              border-color: #000000 !important;
            }

            /* Badges & stamps */
            #printable-approval-content span.rounded,
            #printable-approval-content span.rounded-full {
              background-color: #ffffff !important;
              border: 1px solid #000000 !important;
              color: #000000 !important;
              font-weight: 800 !important;
            }

            /* Table with crisp black lines */
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              border: 1.5px solid #000000 !important;
            }
            th, td {
              border: 1px solid #000000 !important;
              padding: 4px 6px !important;
              color: #000000 !important;
            }
            th {
              background-color: #f1f5f9 !important;
              font-weight: 800 !important;
              -webkit-print-color-adjust: exact !important;
              border-bottom: 2px solid #000000 !important;
              text-transform: uppercase !important;
              font-size: 8pt !important;
            }
            tfoot tr td {
              border-top: 2px solid #000000 !important;
              background-color: #f8fafc !important;
              font-weight: 800 !important;
            }
            svg {
              stroke: #000000 !important;
              color: #000000 !important;
            }
          }
        `
      }} />

      <div 
        id="printable-approval-wrapper"
        className="bg-white rounded-3xl max-w-6xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:h-auto print:overflow-visible print:border-none print:shadow-none print:rounded-none"
      >
        {/* Modal Top Bar (Hidden on Print) */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center space-x-2">
            <span className="text-xl">📑</span>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Laporan Keuangan &amp; Audit Pengeluaran</span>
              <h3 className="text-base font-extrabold text-slate-900">
                Rekapitulasi Approval Belanja &amp; Kasbon • {cabangLabel} (Siap Cetak PDF)
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl font-extrabold text-xs bg-emerald-700 hover:bg-emerald-800 text-white flex items-center space-x-1.5 shadow-md shadow-emerald-700/25 transition btn-tactile"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Unduh PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Content */}
        <div className="p-8 overflow-y-auto space-y-5 flex-1 select-text print:overflow-visible print:h-auto print:p-0 print:max-h-none" id="printable-approval-content">
          
          {/* Official Letterhead (KOP RESMI) */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="flex items-center -space-x-1 text-2xl">
                  <span>🥞</span>
                  <span>🍵</span>
                </div>
                <span className="text-xl font-black text-slate-950 tracking-tight">
                  SERABI BAWEL &amp; WEDANG GEPREK
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Pusat Pengawasan Operasional &amp; Pembukuan Kas Multi-Cabang (10 Cabang Resmi)
              </p>
              <p className="text-[10px] text-slate-400">
                Kantor Pusat: Jl. Malioboro No. 45, D.I. Yogyakarta • Kontak Hotline: 0812-3456-7890 • Email: admin@pakagan.id
              </p>
            </div>

            <div className="text-right space-y-1">
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300 text-[11px] font-black tracking-wider uppercase inline-block">
                DOKUMEN AUDIT APPROVAL
              </span>
              <p className="text-xs text-slate-600 font-mono">
                Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                Waktu: {new Date().toLocaleTimeString('id-ID')} WIB
              </p>
            </div>
          </div>

          {/* Document Title & Meta Filter */}
          <div className="text-center space-y-1 py-1">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
              LAPORAN REKAPITULASI RESMI APPROVAL BELANJA OPERASIONAL &amp; KASBON STAF
            </h2>
            <div className="flex items-center justify-center space-x-4 text-xs font-semibold text-slate-600">
              <span>Periode: <strong className="text-slate-900 font-mono">{periodeLabel}</strong></span>
              <span>•</span>
              <span>Cabang: <strong className="text-slate-900">{cabangLabel}</strong></span>
              <span>•</span>
              <span>Status: <strong className="text-slate-900">{statusLabel}</strong></span>
            </div>
          </div>

          {/* 4 Financial KPI Summary Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Disetujui (Approved)</span>
              <span className="text-base font-mono font-black text-emerald-800 block mt-0.5">
                {formatRupiah(totalApproved)}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">{countApproved} Pengajuan Sah</span>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">Belanja Toko (Approved)</span>
              <span className="text-base font-mono font-black text-emerald-900 block mt-0.5">
                {formatRupiah(totalBelanjaApproved)}
              </span>
              <span className="text-[10px] text-emerald-700 mt-0.5 block">Gas, Kemasan, Bahan Baku</span>
            </div>

            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
              <span className="text-[10px] font-bold text-amber-800 uppercase block">Kasbon Staf (Approved)</span>
              <span className="text-base font-mono font-black text-amber-900 block mt-0.5">
                {formatRupiah(totalKasbonApproved)}
              </span>
              <span className="text-[10px] text-amber-700 mt-0.5 block">Otomatis Potong Gaji</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Menunggu Approval / Ditolak</span>
              <span className="text-base font-mono font-black text-slate-800 block mt-0.5">
                {formatRupiah(totalPending)}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">{countPending} Pending • {countRejected} Ditolak</span>
            </div>
          </div>

          {/* Detailed Transaction Table with Audit Trail */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[9px] border-b border-slate-300">
                  <th className="p-2 w-8 text-center">No</th>
                  <th className="p-2">Waktu Pengajuan</th>
                  <th className="p-2">Outlet Cabang</th>
                  <th className="p-2">Pemohon</th>
                  <th className="p-2 text-center">Jenis</th>
                  <th className="p-2">Keperluan &amp; Rincian</th>
                  <th className="p-2 text-right">Nominal</th>
                  <th className="p-2">Metode Pencairan</th>
                  <th className="p-2 text-center">Status</th>
                  <th className="p-2">Jejak Approval / Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px]">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      Tidak ada data pengajuan belanja atau kasbon pada periode ini.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp, index) => (
                    <tr key={exp.id} className="hover:bg-slate-50">
                      <td className="p-2 text-center font-mono text-slate-400 font-bold">{index + 1}</td>
                      <td className="p-2 font-mono text-[10px] text-slate-700 whitespace-nowrap">
                        {formatWaktu(exp.tanggal)}
                      </td>
                      <td className="p-2 font-bold text-slate-900 whitespace-nowrap">
                        {exp.cabang_nama?.split('-')[1]?.trim() || exp.cabang_nama}
                      </td>
                      <td className="p-2 font-bold text-slate-800 whitespace-nowrap">
                        {exp.pemohon_nama}
                      </td>
                      <td className="p-2 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                          exp.jenis === 'belanja'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          {exp.jenis}
                        </span>
                      </td>
                      <td className="p-2 text-slate-800 max-w-xs leading-snug">
                        {exp.keperluan}
                        {exp.alasan_penolakan && (
                          <div className="text-[9px] text-rose-600 mt-0.5 italic">
                            Alasan tolak: {exp.alasan_penolakan}
                          </div>
                        )}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatRupiah(exp.nominal)}
                      </td>
                      <td className="p-2 text-slate-600 text-[10px] whitespace-nowrap">
                        {exp.metode_pencairan === 'laci' ? 'Kas Laci Kasir' : exp.metode_pencairan === 'transfer' ? 'Transfer Bank' : '-'}
                      </td>
                      <td className="p-2 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                          exp.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : exp.status === 'rejected'
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}>
                          {exp.status === 'approved' ? '✓ Disetujui' : exp.status === 'rejected' ? '✗ Ditolak' : '⏳ Pending'}
                        </span>
                      </td>
                      <td className="p-2 text-[10px] text-slate-700 whitespace-nowrap">
                        {exp.status === 'approved' ? (
                          <div>
                            <span className="font-bold text-emerald-800 block">{exp.approved_by || 'Pak Agan (Owner)'}</span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              {exp.approved_at ? formatWaktu(exp.approved_at) : formatWaktu(exp.tanggal)}
                            </span>
                          </div>
                        ) : exp.status === 'rejected' ? (
                          <div>
                            <span className="font-bold text-rose-700 block">{exp.approved_by || 'Owner'}</span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              {exp.approved_at ? formatWaktu(exp.approved_at) : formatWaktu(exp.tanggal)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-amber-700 font-medium">Menunggu Owner</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={6} className="p-2.5 text-right uppercase text-[10px]">
                    TOTAL KESELURUHAN DANA (APPROVED)
                  </td>
                  <td className="p-2.5 text-right font-mono text-emerald-800 text-xs">
                    {formatRupiah(totalApproved)}
                  </td>
                  <td colSpan={3} className="p-2.5 text-slate-500 font-normal text-[10px]">
                    (Belanja: {formatRupiah(totalBelanjaApproved)} • Kasbon: {formatRupiah(totalKasbonApproved)})
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Validation Footnote & Official Signatures */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs">
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-800 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Dokumen Sah Sistem Manajemen Operasional Pak Agan</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Catatan ini merupakan bukti rekonsiliasi pengeluaran resmi kas toko dan kasbon karyawan yang terintegrasi langsung dengan pembukuan kas besar serta slip gaji bulanan.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-12">
                <span className="text-[11px] text-slate-500 block">Diverifikasi Oleh,</span>
                <div>
                  <span className="font-bold text-slate-900 border-b border-slate-900 pb-1 block">Kepala Operasional</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Pengawas 10 Cabang</span>
                </div>
              </div>

              <div className="space-y-12">
                <span className="text-[11px] text-slate-500 block">Disetujui &amp; Disahkan,</span>
                <div>
                  <span className="font-bold text-slate-900 border-b border-slate-900 pb-1 block">Pak Agan</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Owner Pusat / Direktur</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
