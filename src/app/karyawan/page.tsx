'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  DollarSign, 
  Receipt, 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  LogOut, 
  Calendar, 
  CalendarCheck, 
  UserCheck, 
  Building2, 
  ChevronRight, 
  Wallet,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Karyawan, Cabang, Payroll, Absensi, PengeluaranKasbon } from '@/lib/types';
import { db } from '@/lib/db';
import { formatRupiah, formatWaktu } from '@/lib/utils';
import PayrollSlipModal from '@/components/PayrollSlipModal';
import AiBadgeFooter from '@/components/AiBadgeFooter';

export default function KaryawanPortalPage() {
  const [currentUser, setCurrentUser] = useState<Karyawan | null>(null);
  const [userCabang, setUserCabang] = useState<Cabang | null>(null);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [absensiList, setAbsensiList] = useState<Absensi[]>([]);
  const [expenses, setExpenses] = useState<PengeluaranKasbon[]>([]);
  const [selectedSlip, setSelectedSlip] = useState<Payroll | null>(null);

  // Tab simpel karyawan: Cuma Slip Gaji & Presensi
  const [activeTab, setActiveTab] = useState<'slip' | 'presensi'>('slip');

  const refreshUserData = async () => {
    if (typeof window === 'undefined') return;
    const storedUser = sessionStorage.getItem('pakagan_user');
    if (!storedUser) {
      window.location.href = '/';
      return;
    }

    try {
      const parsed: Karyawan = JSON.parse(storedUser);
      const freshUser = await db.getKaryawanById(parsed.id) || parsed;
      setCurrentUser(freshUser);

      const cbg = await db.getCabangById(freshUser.cabang_id);
      if (cbg) setUserCabang(cbg);

      const allPayrolls = await db.getPayrollList();
      const myPayrolls = allPayrolls.filter(p => p.karyawan_id === freshUser.id);
      setPayrolls(myPayrolls);

      const myAbsensi = await db.getAbsensiList(freshUser.id);
      setAbsensiList(myAbsensi);

      const allExpenses = await db.getPengeluaranList(freshUser.cabang_id);
      const myExpenses = allExpenses.filter(e => e.karyawan_id === freshUser.id && e.jenis === 'kasbon');
      setExpenses(myExpenses);
    } catch (e) {
      window.location.href = '/';
    }
  };

  useEffect(() => {
    refreshUserData();

    const handleUpdate = () => refreshUserData();
    window.addEventListener('pak_agan_db_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('pak_agan_db_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('pakagan_user');
      sessionStorage.removeItem('pakagan_kasir_session');
      window.location.href = '/';
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="text-3xl animate-bounce">🌿</div>
          <p className="text-xs font-bold text-slate-400">Memuat Portal Gaji Karyawan...</p>
        </div>
      </div>
    );
  }

  // Perhitungan Upah & Kehadiran Bulan Ini
  const hadirCount = absensiList.filter(a => a.status === 'hadir' || a.status === 'setengah_hari').length;
  const upahHarian = currentUser.gaji_harian || 100000;
  const upahKotor = hadirCount * upahHarian;
  
  // Utang / Kasbon yang diatur langsung oleh Boss dari Pusat
  const utangNominal = currentUser.utang_nominal !== undefined 
    ? currentUser.utang_nominal 
    : expenses.filter(e => e.status === 'approved' && !e.is_settled).reduce((s, e) => s + e.nominal, 0);

  const gajiBersihSiapTerima = Math.max(0, upahKotor - utangNominal);

  return (
    <div className="min-h-screen bg-fintech-bg flex flex-col text-slate-800">
      
      {/* 1. TOP HEADER BAR */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-20 shadow-soft-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white flex items-center justify-center text-xl shadow-md shadow-emerald-950/20">
              🥞
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-sm text-slate-900 tracking-tight">SERABI BAWEL</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                  Staf
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]">
                {userCabang?.nama || 'Outlet Resmi'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition-colors"
              title="Keluar Akun"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 space-y-4 pb-20">
        
        {/* PROFIL KARYAWAN & SALAM */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-soft-sm flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-lg">
              {currentUser.nama.charAt(0)}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Portal Gaji Karyawan
              </span>
              <h2 className="text-base font-black text-slate-900 leading-tight">
                {currentUser.nama}
              </h2>
              <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-500 font-medium">
                <span className="capitalize">{currentUser.role}</span>
                <span>•</span>
                <span>{currentUser.telepon}</span>
              </div>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            ✓ Aktif
          </span>
        </div>

        {/* HERO CARD: ESTIMASI GAJI BERSIH SIAP TERIMA */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 border-2 border-emerald-500/30 p-5 text-white shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-800/60 pb-3">
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-300 block">
                Estimasi Gaji Bersih Periode Berjalan
              </span>
              <div className="text-2xl sm:text-3xl font-mono font-black text-amber-300 mt-1">
                {formatRupiah(gajiBersihSiapTerima)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center text-xl">
              💰
            </div>
          </div>

          {/* Rincian Upah vs Potongan Utang */}
          <div className="grid grid-cols-3 gap-2 bg-black/30 p-3 rounded-2xl border border-emerald-900/60 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Kehadiran:</span>
              <span className="font-mono font-bold text-white text-xs">{hadirCount} Hari Hadir</span>
              <span className="text-[9px] text-emerald-300 block">@{formatRupiah(upahHarian)}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block">Upah Kotor:</span>
              <span className="font-mono font-bold text-white text-xs">{formatRupiah(upahKotor)}</span>
            </div>

            <div>
              <span className="text-[10px] text-rose-300 block">Potong Utang:</span>
              <span className="font-mono font-bold text-rose-400 text-xs">
                -{formatRupiah(utangNominal)}
              </span>
              <span className="text-[9px] text-slate-400 block">*Diatur Pusat</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-300 flex items-center space-x-1.5 pt-0.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Presensi dicatat harian di kasir toko &amp; otomatis dikalkulasi ke gaji</span>
          </div>
        </div>

        {/* 2 PILIHAN TAB SIMPEL: SLIP GAJI & PRESENSI */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('slip')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'slip'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span>Slip Gaji Resmi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presensi')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'presensi'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Riwayat Kehadiran ({absensiList.length})</span>
          </button>
        </div>

        {/* TAB 1: SLIP GAJI RESMI */}
        {activeTab === 'slip' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
              <span>Daftar Slip Gaji Diterbitkan:</span>
              <span>{payrolls.length} Periode</span>
            </div>

            {payrolls.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 space-y-2">
                <div className="text-3xl">🧾</div>
                <h3 className="text-xs font-bold text-slate-700">Belum Ada Slip Gaji yang Dikunci</h3>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Slip gaji resmi diterbitkan dan dikunci oleh Admin Pusat (Pak Agan) pada akhir periode penggajian.
                </p>
              </div>
            ) : (
              payrolls.map(slip => (
                <div
                  key={slip.id}
                  onClick={() => setSelectedSlip(slip)}
                  className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm hover:border-emerald-300 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 block">
                        No. Slip: #{slip.id.slice(-6).toUpperCase()}
                      </span>
                      <h4 className="font-extrabold text-xs text-slate-900">
                        Periode: {slip.periode_bulan ? `${slip.periode_bulan}/${slip.periode_tahun}` : (slip.periode_tahun || 'Oktober 2026')}
                      </h4>
                      <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                        Status: Gaji Ditransfer &amp; Lunas
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Gaji Bersih:</span>
                    <span className="font-mono font-black text-sm text-emerald-800 block">
                      {formatRupiah(slip.gaji_bersih)}
                    </span>
                    <span className="text-[10px] text-brand-primary font-bold inline-flex items-center space-x-0.5 mt-0.5">
                      <span>Buka Slip</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: RIWAYAT KEHADIRAN (ABSENSI KASIR) */}
        {activeTab === 'presensi' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
              <span>Log Kehadiran Dicatat Kasir:</span>
              <span>{absensiList.length} Hari</span>
            </div>

            {absensiList.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 space-y-2">
                <div className="text-3xl">📅</div>
                <h3 className="text-xs font-bold text-slate-700">Belum Ada Catatan Kehadiran</h3>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Presensi dicatat setiap hari saat buka/tutup toko oleh kasir di cabang.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Jam Masuk</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Upah Terhitung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {absensiList.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {a.tanggal}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {a.jam_masuk || '08:00'} - {a.jam_pulang || 'Selesai'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            a.status === 'hadir' ? 'bg-emerald-100 text-emerald-800' :
                            a.status === 'setengah_hari' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {a.status === 'hadir' ? '✓ Hadir Penuh' : a.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                          {formatRupiah(a.upah_harian_terhitung || upahHarian)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Slip Modal */}
      {selectedSlip && (
        <PayrollSlipModal
          payroll={selectedSlip}
          onClose={() => setSelectedSlip(null)}
        />
      )}

      {/* Footer */}
      <AiBadgeFooter />

    </div>
  );
}