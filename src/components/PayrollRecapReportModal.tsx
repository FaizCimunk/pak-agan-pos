'use client';

import React from 'react';
import { X, Printer, ShieldCheck, Building2 } from 'lucide-react';
import { Payroll } from '@/lib/types';
import { formatRupiah, formatWaktu } from '@/lib/utils';

interface PayrollRecapReportModalProps {
  payrolls: Payroll[];
  month?: number;
  year?: number;
  periodeLabel?: string;
  cabangLabel?: string;
  onClose: () => void;
}

export default function PayrollRecapReportModal({
  payrolls,
  month = 10,
  year = 2026,
  periodeLabel,
  cabangLabel = 'Seluruh 10 Cabang',
  onClose,
}: PayrollRecapReportModalProps) {
  const bulanNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const periodeStr = periodeLabel || `${bulanNames[month - 1] || 'Oktober'} ${year}`;

  const grandTotalHadir = payrolls.reduce((sum, p) => sum + (p.total_kehadiran_hari || 0), 0);
  const grandTotalGajiPokok = payrolls.reduce((sum, p) => sum + p.gaji_pokok, 0);
  const grandTotalTunjangan = payrolls.reduce((sum, p) => sum + p.tunjangan, 0);
  const grandTotalKasbon = payrolls.reduce((sum, p) => sum + p.potongan_kasbon, 0);
  const grandTotalGajiBersih = payrolls.reduce((sum, p) => sum + p.gaji_bersih, 0);

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
      
      {/* Print styles for A4 Landscape Rekap Gaji (Formal High-Contrast Black Ink) */}
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
            #printable-report-wrapper {
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
            #printable-report-wrapper * {
              visibility: visible !important;
              color: #000000 !important;
              -webkit-text-fill-color: #000000 !important;
              text-shadow: none !important;
              box-shadow: none !important;
            }
            #printable-report {
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
            #printable-report .bg-slate-50,
            #printable-report .bg-emerald-50\\/60,
            #printable-report .bg-emerald-50,
            #printable-report .bg-amber-50\\/60 {
              background-color: #ffffff !important;
              border-color: #000000 !important;
            }
            #printable-report span.rounded-full,
            #printable-report span.rounded {
              background-color: #ffffff !important;
              border: 1px solid #000000 !important;
              color: #000000 !important;
              font-weight: 800 !important;
            }
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
        id="printable-report-wrapper"
        className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:h-auto print:overflow-visible print:border-none print:shadow-none print:rounded-none"
      >
        {/* Modal Top Bar (Hidden on Print) */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center space-x-2">
            <span className="text-xl">📄</span>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Laporan Eksekutif Penggajian</span>
              <h3 className="text-base font-extrabold text-slate-900">
                Rekapitulasi Gaji &amp; Saldo • {cabangLabel} (Siap Cetak PDF)
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

        {/* Printable Report Document */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-5 text-slate-900 print:p-0 print:overflow-visible">
          <div id="printable-report" className="space-y-4">
            
            {/* Kop Resmi Surat Rekap */}
            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-4">
              <div>
                <span className="text-xs font-black tracking-widest text-emerald-800 uppercase block">
                  LAPORAN KEUANGAN &amp; PENGGAJIAN PEKERJA
                </span>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                  SERABI BAWEL &amp; WEDANG GEPREK
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  Rekapitulasi Upah Kehadiran, Tunjangan, Potongan Kasbon &amp; Sisa Saldo Gaji Bersih
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-800 mt-1.5">
                  <p>
                    Outlet / Unit: <u className="text-emerald-800">{cabangLabel}</u>
                  </p>
                  <span>•</span>
                  <p>
                    Periode Penggajian: <u>{periodeStr}</u>
                  </p>
                </div>
              </div>

              <div className="text-right text-xs space-y-0.5">
                <p className="text-slate-500 font-medium">Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="text-slate-500">Otoritas: <strong>Pak Agan (Owner Pusat)</strong></p>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">
                  STATUS: TERKUNCI &amp; SUDAH DITRANSFER
                </span>
              </div>
            </div>

            {/* Quick Stat Highlights */}
            <div className="grid grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[10px] block font-bold">TOTAL TENAGA KERJA:</span>
                <span className="text-lg font-black text-slate-900">{payrolls.length} Staf</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[10px] block font-bold">TOTAL KEHADIRAN:</span>
                <span className="text-lg font-mono font-black text-slate-900">{grandTotalHadir} Hari Kerja</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[10px] block font-bold">TOTAL KASBON DILUNASI:</span>
                <span className="text-lg font-mono font-black text-rose-600">-{formatRupiah(grandTotalKasbon)}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300">
                <span className="text-emerald-800 text-[10px] block font-bold">TOTAL NET DIKELUARKAN:</span>
                <span className="text-lg font-mono font-black text-emerald-950">{formatRupiah(grandTotalGajiBersih)}</span>
              </div>
            </div>

            {/* Table Rekap */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-300">
                <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center">No</th>
                    <th className="py-2.5 px-3">Nama Karyawan</th>
                    <th className="py-2.5 px-3">Penempatan Cabang</th>
                    <th className="py-2.5 px-3 text-center">Kehadiran</th>
                    <th className="py-2.5 px-3 text-right">Tarif Gaji Harian</th>
                    <th className="py-2.5 px-3 text-right">Total Gaji Hadir</th>
                    <th className="py-2.5 px-3 text-right text-rose-700">Kasbon (Lunas)</th>
                    <th className="py-2.5 px-3 text-right font-black">Gaji Bersih (Net)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {payrolls.map((p, idx) => (
                    <tr key={p.karyawan_id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-center font-bold">{idx + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {p.karyawan_nama}
                        <span className="text-[10px] text-slate-500 font-normal block capitalize">{p.karyawan_role}</span>
                      </td>
                      <td className="py-2 px-3 text-slate-700">{p.cabang_nama}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-emerald-800">
                        {p.total_kehadiran_hari || 22} hr
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium tabular-nums text-slate-600">
                        {formatRupiah(p.upah_harian || 120000)} / hari
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                        {formatRupiah(p.gaji_pokok)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-600 tabular-nums">
                        -{formatRupiah(p.potongan_kasbon)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black text-emerald-900 tabular-nums">
                        {formatRupiah(p.gaji_bersih)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-900 text-xs">
                  <tr>
                    <td colSpan={3} className="py-3 px-3 text-right uppercase">
                      GRAND TOTAL {cabangLabel.toUpperCase()}:
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-900">{grandTotalHadir} hr</td>
                    <td className="py-3 px-3 text-right text-slate-400 font-normal text-[11px]">-</td>
                    <td className="py-3 px-3 text-right font-mono">{formatRupiah(grandTotalGajiPokok)}</td>
                    <td className="py-3 px-3 text-right font-mono text-rose-700">-{formatRupiah(grandTotalKasbon)}</td>
                    <td className="py-3 px-3 text-right font-mono text-base text-emerald-900">{formatRupiah(grandTotalGajiBersih)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Signature Area */}
            <div className="pt-6 flex justify-between items-end text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-700 block">Catatan Sistem:</span>
                <p className="text-[11px] text-slate-500 max-w-md">
                  Dokumen ini dibuat otomatis oleh sistem Backoffice Serabi Bawel &amp; Wedang Geprek. Seluruh kasbon terpotong telah dinyatakan lunas dan ditutup buku pada periode ini.
                </p>
              </div>

              <div className="text-center space-y-12">
                <p className="text-slate-600">Yogyakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />Disetujui &amp; Dibayarkan,</p>
                <div className="border-t border-slate-900 pt-1 font-black text-slate-900 text-sm">
                  Pak Agan
                  <span className="text-[10px] text-slate-500 font-medium block">Owner / Pimpinan Usaha</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
