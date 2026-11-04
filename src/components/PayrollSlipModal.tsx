'use client';

import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  User, 
  MessageCircle, 
  FileText, 
  Clock, 
  Calendar, 
  Receipt,
  HandCoins,
  ArrowRight,
  PlusCircle,
  Banknote,
  Check
} from 'lucide-react';
import { Payroll, Absensi, PengeluaranKasbon } from '@/lib/types';
import { formatRupiah, formatWaktu, generateWhatsAppPayrollSlipLink } from '@/lib/utils';
import PayoutSalaryModal from './PayoutSalaryModal';
import GiveLoanModal from './GiveLoanModal';

interface PayrollSlipModalProps {
  payroll: Payroll;
  absensiList?: Absensi[];
  expenseList?: PengeluaranKasbon[];
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PayrollSlipModal({
  payroll: initialPayroll,
  absensiList = [],
  expenseList = [],
  onClose,
  onSuccess,
}: PayrollSlipModalProps) {
  // Tab view: 'rincian' (default) or 'slip' (Bank-Grade Slip)
  const [activeView, setActiveView] = useState<'rincian' | 'slip'>('rincian');
  const [currentPayroll, setCurrentPayroll] = useState<Payroll>(initialPayroll);
  const [showPayoutModal, setShowPayoutModal] = useState<boolean>(false);
  const [showLoanModal, setShowLoanModal] = useState<boolean>(false);

  const bulanNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const periodeStr = `Bulan ${bulanNames[currentPayroll.periode_bulan - 1] || 'Oktober'} ${currentPayroll.periode_tahun}`;

  // Filter Worker Attendances
  const workerAttendances = absensiList.filter(a => a.karyawan_id === currentPayroll.karyawan_id);

  // Filter Worker Kasbon Transactions
  const workerKasbons = expenseList.filter(e => 
    e.karyawan_id === currentPayroll.karyawan_id && e.jenis === 'kasbon'
  );

  const handlePrint = () => {
    window.print();
  };

  React.useEffect(() => {
    document.body.classList.add('printing-modal-open');
    return () => {
      document.body.classList.remove('printing-modal-open');
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn printable-modal-backdrop print:static print:p-0 print:bg-white print:overflow-visible print:block print:inset-auto print:h-auto print:max-h-none">
      
      {/* Print styles for perfect PDF export (Formal High-Contrast Black Ink) */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
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
            #printable-wrapper {
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
            #printable-wrapper * {
              visibility: visible !important;
              color: #000000 !important;
              -webkit-text-fill-color: #000000 !important;
              text-shadow: none !important;
              box-shadow: none !important;
            }
            #printable-content {
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
            #printable-content .bg-emerald-50,
            #printable-content .bg-slate-50,
            #printable-content .bg-amber-50,
            #printable-content .bg-rose-50,
            #printable-content .bg-emerald-100 {
              background-color: #ffffff !important;
              border-color: #000000 !important;
            }
            #printable-content span.rounded-full,
            #printable-content span.rounded {
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
            svg {
              stroke: #000000 !important;
              color: #000000 !important;
            }
          }
        `
      }} />

      <div 
        id="printable-wrapper"
        className={`bg-white rounded-3xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh] transition-all print:max-h-none print:h-auto print:overflow-visible print:border-none print:shadow-none print:rounded-none ${
          activeView === 'rincian' ? 'max-w-5xl' : 'max-w-2xl'
        }`}
      >
        
        {/* Top Header Bar (Hidden on print) */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <div className="flex items-center -space-x-1 text-xl">
              <span>🥞</span>
              <span>🍵</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-800">
                  Sistem Penggajian &amp; Operasional Pak Agan
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  • {currentPayroll.slip_no}
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {activeView === 'rincian' ? 'Riwayat Absensi & Kasbon Pekerja' : 'Slip Gaji Digital Resmi'}
              </h3>
            </div>
          </div>

          {/* View Mode Toggle & Close */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveView('rincian')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center space-x-1 ${
                  activeView === 'rincian'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🔍 Rincian &amp; Kasbon</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('slip')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center space-x-1 ${
                  activeView === 'slip'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📄 Slip Gaji Bank</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 text-xs print:overflow-visible print:h-auto print:p-0 print:max-h-none" id="printable-content">
          
          {/* ================================================================= */}
          {/* VIEW 1: RINCIAN ABSENSI & KASBON                                  */}
          {/* ================================================================= */}
          {activeView === 'rincian' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Profil Singkat & Status Skema Penggajian */}
              <div className="bg-white rounded-2xl shadow-soft-sm border border-slate-200/80 p-5 flex flex-col lg:flex-row gap-5 lg:items-center justify-between">
                
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl font-black shrink-0 border border-emerald-300">
                    {currentPayroll.karyawan_nama?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black text-slate-950">{currentPayroll.karyawan_nama}</h2>
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 rounded-full text-[10px] font-black border border-emerald-300 tracking-wider">
                        🏗️ SKEMA HARIAN MURNI
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">
                      <strong className="text-slate-800 capitalize">{currentPayroll.karyawan_role || 'Kasir Cabang (PJ)'}</strong> • {currentPayroll.karyawan_telepon || '0812-xxxx-xxxx'} • {currentPayroll.cabang_nama}
                    </p>

                    {/* Rincian Komponen Skema Harian */}
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className="bg-emerald-50/50 rounded-xl border border-emerald-200/80 p-2.5">
                        <div className="text-[10px] text-emerald-700 font-bold uppercase mb-0.5">Total Hari Masuk</div>
                        <div className="font-extrabold text-slate-900 text-sm">{currentPayroll.total_kehadiran_hari || 6} Hari Hadir</div>
                        <div className="text-[10px] text-slate-500">Periode Aktif</div>
                      </div>
                      <div className="bg-emerald-50/50 rounded-xl border border-emerald-200/80 p-2.5">
                        <div className="text-[10px] text-emerald-700 font-bold uppercase mb-0.5">Tarif Normal Harian</div>
                        <div className="font-extrabold text-slate-900 text-sm">
                          {formatRupiah(currentPayroll.upah_harian || 100000)} <span className="text-[10px] text-slate-500 font-normal">/ hari</span>
                        </div>
                        <div className="text-[10px] text-slate-500">Standar Kehadiran 8 Jam</div>
                      </div>
                      <div className="bg-emerald-50/50 rounded-xl border border-emerald-200/80 p-2.5 col-span-2 sm:col-span-1">
                        <div className="text-[10px] text-emerald-700 font-bold uppercase mb-0.5">Status Penggajian</div>
                        <div className="font-extrabold text-emerald-800 text-sm">
                          {currentPayroll.status === 'paid' ? '✓ DITRANSFER / LUNAS' : 'DRAFT PERIODE INI'}
                        </div>
                        <div className="text-[10px] text-slate-500">{currentPayroll.slip_no}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 Summary Cards (Exact Screenshot 2) */}
                <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
                  
                  {/* Card 1: Total Upah Kotor */}
                  <div className="bg-slate-50 rounded-2xl p-4 min-w-[130px] border border-slate-200/80 flex-1 sm:flex-initial">
                    <p className="text-xs font-bold text-slate-500 mb-1">Total Upah Kotor</p>
                    <p className="text-lg font-black text-slate-900 font-mono">
                      {formatRupiah(currentPayroll.gaji_pokok)}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {currentPayroll.total_kehadiran_hari || 6} Hari @ {formatRupiah(currentPayroll.upah_harian || 100000)}
                    </span>
                  </div>

                  {/* Card 2: Total Kasbon Diambil (Screenshot 2 Red Box) */}
                  <div className="bg-red-50/80 rounded-2xl p-4 min-w-[130px] border border-red-200/80 flex-1 sm:flex-initial">
                    <p className="text-xs font-bold text-red-600 mb-1">Total Kasbon Diambil</p>
                    <p className="text-lg font-black text-red-600 font-mono">
                      {currentPayroll.potongan_kasbon > 0 ? `-${formatRupiah(currentPayroll.potongan_kasbon)}` : 'Rp 0'}
                    </p>
                    <p className="text-[10px] text-red-400 mt-0.5">
                      {currentPayroll.potongan_kasbon > 0 ? 'Otomatis Potong Gaji' : 'Nihil / Lunas'}
                    </p>
                  </div>

                  {/* Card 3: Sisa Gaji Bersih (Amplop) (Screenshot 2 Green Box) */}
                  <div className="bg-emerald-50 rounded-2xl p-4 min-w-[140px] border-2 border-emerald-300 flex-1 sm:flex-initial">
                    <p className="text-xs font-bold text-emerald-800 mb-1">
                      Sisa Gaji Bersih (Amplop)
                    </p>
                    <p className="text-xl font-black text-emerald-900 font-mono">
                      {formatRupiah(currentPayroll.gaji_bersih)}
                    </p>
                    <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                      {currentPayroll.status === 'paid' ? 'Telah Ditransfer' : 'Take Home Pay Staf'}
                    </span>
                  </div>

                </div>

              </div>

              {/* Action Buttons Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 print:hidden">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Aksi Pembayaran:</span>

                  {/* Tombol Cairkan Dana (Hijau) */}
                  {currentPayroll.status === 'paid' || currentPayroll.gaji_bersih <= 0 ? (
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-300 flex items-center space-x-1.5 shadow-xs">
                      <Check className="w-3.5 h-3.5" />
                      <span>✓ Lunas / Ditransfer (Saldo Rp 0)</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowPayoutModal(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-sm flex items-center space-x-1.5 transition-all btn-tactile"
                      title="Cairkan Dana & Transfer ke Rekening Staf"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Cairkan Dana</span>
                    </button>
                  )}

                  {/* Tombol Beri Hutangan (Rose) */}
                  <button
                    type="button"
                    onClick={() => setShowLoanModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-extrabold text-xs shadow-xs flex items-center space-x-1.5 transition-all btn-tactile"
                    title="Beri Kasbon / Pinjaman Tambahan"
                  >
                    <HandCoins className="w-3.5 h-3.5" />
                    <span>Beri Hutangan</span>
                  </button>

                  <div className="h-5 w-px bg-slate-300 mx-1 hidden sm:block" />

                  <button
                    type="button"
                    onClick={() => setActiveView('slip')}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs shadow-xs flex items-center space-x-1 transition-all btn-tactile"
                  >
                    <span>📄</span>
                    <span>Cetak Slip Gaji Resmi</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs shadow-xs flex items-center space-x-1 transition-colors"
                  >
                    <span>🖨️</span>
                    <span>Cetak Riwayat (PDF)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const waUrl = generateWhatsAppPayrollSlipLink({
                      telepon: currentPayroll.karyawan_telepon,
                      nama: currentPayroll.karyawan_nama || 'Staf',
                      role: currentPayroll.karyawan_role || 'Kasir Cabang',
                      cabangNama: currentPayroll.cabang_nama || 'Cabang',
                      slipNo: currentPayroll.slip_no,
                      periodeLabel: periodeStr,
                      gajiPokok: currentPayroll.gaji_pokok,
                      tunjangan: 0,
                      potonganKasbon: currentPayroll.potongan_kasbon,
                      gajiBersih: currentPayroll.gaji_bersih,
                      totalHari: currentPayroll.total_kehadiran_hari,
                      tipeGaji: currentPayroll.tipe_gaji,
                      upahHarian: currentPayroll.upah_harian,
                    });
                    window.open(waUrl, '_blank');
                  }}
                  className="px-3 py-1.5 rounded-xl font-bold text-xs bg-[#25D366] hover:bg-[#1EBE5D] text-white flex items-center space-x-1.5 shadow-sm transition-all btn-tactile"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-white" />
                  <span>Kirim Rincian ke WA Staf</span>
                </button>
              </div>

              {/* Dua Panel Berdampingan (Exact Screenshot 3) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                
                {/* PANEL KIRI: Riwayat Absensi (Disetujui) */}
                <div className="bg-white rounded-2xl shadow-soft-sm border border-slate-200/80 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-xs flex items-center space-x-1.5">
                      <span>Riwayat Absensi (Disetujui)</span>
                    </h3>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {workerAttendances.length} Hari Tercatat
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-white text-slate-500 text-[10px] font-bold border-b border-slate-100 uppercase">
                          <th className="p-3">Tanggal</th>
                          <th className="p-3">Lokasi / Proyek</th>
                          <th className="p-3 text-right">Jam Kerja</th>
                          <th className="p-3 text-right">Upah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {workerAttendances.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-400 text-xs">
                              Belum ada absensi tercatat pada periode ini.
                            </td>
                          </tr>
                        ) : (
                          workerAttendances.map(att => (
                            <tr key={att.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-3 font-mono font-bold text-slate-800 text-[11px] whitespace-nowrap">
                                {new Date(att.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </td>
                              <td className="p-3">
                                <span className="font-bold text-slate-900 block text-[11px]">
                                  {att.cabang_nama?.split('-')[1]?.trim() || att.cabang_nama || currentPayroll.cabang_nama}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  PJ Shift: {att.recorded_by || 'Owner'}
                                </span>
                              </td>
                              <td className="p-3 text-right font-extrabold text-slate-900 text-[11px] whitespace-nowrap">
                                {att.status === 'hadir' ? '8 Jam' : att.status.toUpperCase()}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-blue-600 text-[11px] whitespace-nowrap">
                                {formatRupiah(att.upah_harian_terhitung || currentPayroll.upah_harian || 100000)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PANEL KANAN: Riwayat Penarikan Dana (Kasbon) */}
                <div className="bg-white rounded-2xl shadow-soft-sm border border-slate-200/80 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-xs flex items-center space-x-1.5">
                      <span>Riwayat Penarikan Dana</span>
                    </h3>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                      {workerKasbons.length} Transaksi Kasbon
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-white text-slate-500 text-[10px] font-bold border-b border-slate-100 uppercase">
                          <th className="p-3">Tanggal</th>
                          <th className="p-3">Jenis</th>
                          <th className="p-3">Keterangan</th>
                          <th className="p-3 text-right">Nominal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {workerKasbons.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-400 text-xs">
                              Belum ada penarikan dana.
                            </td>
                          </tr>
                        ) : (
                          workerKasbons.map(exp => (
                            <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-3 font-mono text-slate-700 text-[11px] whitespace-nowrap">
                                {new Date(exp.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-orange-100 text-orange-800 border border-orange-200">
                                  Ambil Kasbon
                                </span>
                              </td>
                              <td className="p-3 text-slate-700 text-[11px]">
                                <div>{exp.keperluan}</div>
                                {exp.metode_pencairan && (
                                  <span className="text-[9px] text-slate-400 block mt-0.5">
                                    Via: {exp.metode_pencairan === 'laci' ? 'Kas Laci Outlet' : 'Transfer Bank'}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-rose-600 text-[11px] whitespace-nowrap">
                                (Potong Saldo) -{formatRupiah(exp.nominal)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW 2: SLIP GAJI RESMI (BANK-GRADE MULTI-CABANG PAK AGAN)        */}
          {/* ================================================================= */}
          {activeView === 'slip' && (
            <div className="space-y-4 animate-fadeIn">
              
              <div 
                id="printable-slip"
                className="p-6 bg-white rounded-2xl border border-slate-300 shadow-soft-sm font-sans space-y-4 text-xs select-text"
              >
                {/* Slip Header */}
                <div className="flex items-start justify-between border-b pb-4 border-slate-200">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-base font-black text-slate-900 tracking-tight">
                        SERABI BAWEL &amp; WEDANG GEPREK
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium">
                      Sistem Manajemen Penggajian &amp; Operasional Multi-Cabang
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Kantor Pusat: Jl. Malioboro No. 45, Yogyakarta • Telp: 0812-3456-7890
                    </div>
                  </div>

                  <div className="text-right space-y-0.5">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-extrabold inline-block">
                      {currentPayroll.status === 'paid' ? '✓ DITRANSFER / LUNAS' : 'DRAFT BULANAN'}
                    </span>
                    <div className="font-mono text-[10px] text-slate-600 font-bold">
                      {currentPayroll.slip_no}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {formatWaktu(currentPayroll.tanggal_kunci)}
                    </div>
                  </div>
                </div>

                {/* Employee Meta */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
                  <div>
                    <span className="text-slate-400 block font-medium">Nama Staf Karyawan:</span>
                    <span className="font-black text-slate-900 text-xs">{currentPayroll.karyawan_nama}</span>
                    <span className="text-slate-500 block text-[10px] mt-0.5 capitalize">
                      Jabatan: <strong>{currentPayroll.karyawan_role || 'Kasir Cabang'}</strong>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block font-medium">Penempatan Outlet:</span>
                    <span className="font-black text-slate-900">{currentPayroll.cabang_nama}</span>
                    <span className="text-slate-500 block text-[10px] mt-0.5">
                      Periode Gaji: <strong>{periodeStr}</strong>
                    </span>
                  </div>
                </div>

                {/* Income & Deduction Table */}
                <div className="space-y-3 pt-2">
                  <div className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1 flex justify-between">
                    <span>Rincian Komponen Gaji</span>
                    <span>Jumlah (Rp)</span>
                  </div>

                  {/* Penghasilan */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-slate-700">
                      <span>
                        1. Gaji Harian per Kehadiran{' '}
                        <span className="text-[10px] text-slate-500 font-semibold">
                          ({currentPayroll.total_kehadiran_hari || 6} Hari @ {formatRupiah(currentPayroll.upah_harian || 100000)})
                        </span>
                      </span>
                      <span className="font-mono font-bold tabular-nums text-slate-900">{formatRupiah(currentPayroll.gaji_pokok)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800 font-extrabold border-t border-slate-200 pt-1">
                      <span>Subtotal Penghasilan Kotor</span>
                      <span className="font-mono tabular-nums">{formatRupiah(currentPayroll.gaji_pokok)}</span>
                    </div>
                  </div>

                  {/* Potongan Kasbon */}
                  <div className="space-y-1.5 pt-2 border-t border-dashed border-slate-300">
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>2. Potongan Hutang / Kasbon Staf (Auto-Lunas)</span>
                      <span className="font-mono tabular-nums">-{formatRupiah(currentPayroll.potongan_kasbon)}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 italic">
                      *Seluruh kasbon pada periode ini dinyatakan lunas (is_settled: true).
                    </div>
                  </div>

                  {/* Gaji Bersih */}
                  <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-500/40 flex items-center justify-between text-emerald-950">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-black tracking-wider text-emerald-800">
                        GAJI BERSIH (TAKE HOME PAY)
                      </span>
                      <div className="text-[10px] text-emerald-700">
                        {currentPayroll.status === 'paid' ? 'Telah lunas ditransfer ke rekening staf' : 'Tersedia untuk dicairkan / ditransfer'}
                      </div>
                    </div>
                    <span className="text-xl font-mono font-black text-emerald-900 tabular-nums tracking-tight">
                      {formatRupiah(currentPayroll.gaji_bersih)}
                    </span>
                  </div>
                </div>

                {/* Validation QR Stamp & Signature */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      <ShieldCheck className="w-6 h-6 text-emerald-700" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-extrabold text-slate-800 block">DOKUMEN RESMI TERVALIDASI</span>
                      <span className="text-[9px] text-slate-400 block font-mono">SERABI-BAWEL-PAYROLL-VERIFIED</span>
                    </div>
                  </div>

                  <div className="text-right text-[10px] space-y-1">
                    <span className="text-slate-400 block">Diterbitkan &amp; Disetujui Oleh:</span>
                    <span className="font-extrabold text-slate-800 block text-xs">Pak Agan (Owner Pusat)</span>
                    <span className="text-[9px] text-slate-500 block">Serabi Bawel &amp; Wedang Geprek</span>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Footer Actions (Hidden on print) */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const waUrl = generateWhatsAppPayrollSlipLink({
                  telepon: currentPayroll.karyawan_telepon,
                  nama: currentPayroll.karyawan_nama || 'Staf',
                  role: currentPayroll.karyawan_role || 'Kasir Cabang',
                  cabangNama: currentPayroll.cabang_nama || 'Cabang',
                  slipNo: currentPayroll.slip_no,
                  periodeLabel: periodeStr,
                  gajiPokok: currentPayroll.gaji_pokok,
                  tunjangan: 0,
                  potonganKasbon: currentPayroll.potongan_kasbon,
                  gajiBersih: currentPayroll.gaji_bersih,
                  totalHari: currentPayroll.total_kehadiran_hari,
                  tipeGaji: currentPayroll.tipe_gaji,
                  upahHarian: currentPayroll.upah_harian,
                });
                window.open(waUrl, '_blank');
              }}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-[#25D366] hover:bg-[#1EBE5D] text-white flex items-center space-x-1.5 shadow-sm shadow-emerald-600/20 btn-tactile transition-all"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Kirim via WhatsApp</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl font-black text-xs bg-emerald-700 hover:bg-emerald-800 text-white flex items-center space-x-1.5 shadow-md shadow-emerald-700/25 btn-tactile transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Unduh PDF</span>
            </button>
          </div>
        </div>

      </div>

      {/* Modal Dialog Cairkan Dana */}
      {showPayoutModal && (
        <PayoutSalaryModal
          payroll={currentPayroll}
          onClose={() => setShowPayoutModal(false)}
          onSuccess={() => {
            setShowPayoutModal(false);
            setCurrentPayroll(prev => ({
              ...prev,
              status: 'paid',
              gaji_bersih: 0
            }));
            onSuccess?.();
          }}
        />
      )}

      {/* Modal Dialog Beri Hutangan */}
      {showLoanModal && (
        <GiveLoanModal
          payroll={currentPayroll}
          onClose={() => setShowLoanModal(false)}
          onSuccess={() => {
            setShowLoanModal(false);
            onSuccess?.();
          }}
        />
      )}
    </div>
  );
}
