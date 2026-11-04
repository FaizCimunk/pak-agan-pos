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
  ArrowRight,
  CreditCard,
  Clock,
  MessageCircle,
  AlertCircle,
  Plus,
  Send,
  X,
  PiggyBank,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
import { Karyawan, Cabang, Payroll, Absensi, PengeluaranKasbon, TabunganKaryawanItem } from '@/lib/types';
import { db } from '@/lib/db';
import { formatRupiah, formatWaktu, formatKaryawanRole } from '@/lib/utils';
import PayrollSlipModal from '@/components/PayrollSlipModal';
import AiBadgeFooter from '@/components/AiBadgeFooter';

export default function KaryawanPortalPage() {
  const [currentUser, setCurrentUser] = useState<Karyawan | null>(null);
  const [userCabang, setUserCabang] = useState<Cabang | null>(null);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [absensiList, setAbsensiList] = useState<Absensi[]>([]);
  const [expenses, setExpenses] = useState<PengeluaranKasbon[]>([]);
  const [tabunganLogs, setTabunganLogs] = useState<TabunganKaryawanItem[]>([]);
  const [selectedSlip, setSelectedSlip] = useState<Payroll | null>(null);

  // Tab karyawan: Slip Gaji, Presensi, Kasbon, Celengan Tabungan
  const [activeTab, setActiveTab] = useState<'slip' | 'presensi' | 'kasbon' | 'tabungan'>('slip');
  const [showKasbonModal, setShowKasbonModal] = useState<boolean>(false);
  const [kasbonNominal, setKasbonNominal] = useState<number>(100000);
  const [kasbonKeperluan, setKasbonKeperluan] = useState<string>('');
  const [kasbonMetode, setKasbonMetode] = useState<'laci' | 'transfer'>('laci');
  const [isSubmittingKasbon, setIsSubmittingKasbon] = useState<boolean>(false);

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

      const allExpenses = await db.getPengeluaranList();
      const myExpenses = allExpenses.filter(e => e.karyawan_id === freshUser.id && e.jenis === 'kasbon');
      setExpenses(myExpenses);

      const myTabungan = await db.getTabunganKaryawanList(freshUser.id);
      setTabunganLogs(myTabungan);
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

  // Perhitungan Upah Harian & Kehadiran Siklus Berjalan
  const hadirCount = absensiList.filter(a => a.status === 'hadir' || a.status === 'setengah_hari').length;
  const upahHarian = currentUser.gaji_harian || 100000;
  const upahKotor = hadirCount * upahHarian;

  // Skema Tabungan Rutin Mingguan & Total Celengan
  const tabunganMingguan = currentUser.tabungan_rutin_mingguan !== undefined ? currentUser.tabungan_rutin_mingguan : 200000;
  const totalTabungan = currentUser.total_tabungan || 0;

  // Proyeksi Gaji Mingguan & Sebulan Penuh Tanpa Bon
  const estimasiMingguan6Hari = upahHarian * 6;
  const akumulasiSebulan26Hari = upahHarian * 26;
  
  // Utang / Kasbon yang disetujui pusat dan belum lunas
  const utangNominal = currentUser.utang_nominal !== undefined 
    ? currentUser.utang_nominal 
    : expenses.filter(e => e.status === 'approved' && !e.is_settled).reduce((s, e) => s + e.nominal, 0);

  // Estimasi Transfer Bersih Mingguan (Kotor - Cicilan Kasbon - Potongan Tabungan)
  const potonganTabunganPeriode = hadirCount > 0 ? Math.min(tabunganMingguan, Math.max(0, upahKotor - utangNominal)) : 0;
  const gajiBersihSiapTerima = Math.max(0, upahKotor - utangNominal - potonganTabunganPeriode);

  return (
    <div className="min-h-screen bg-fintech-bg flex flex-col text-slate-800">
      
      {/* 1. TOP HEADER BAR */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-20 shadow-soft-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white flex items-center justify-center shadow-md shadow-emerald-950/20 shrink-0 border border-emerald-500/30">
              <div className="flex items-center justify-center -space-x-1 drop-shadow-md">
                <span className="text-base transform -rotate-6">🥞</span>
                <span className="text-base transform rotate-6">🍵</span>
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-sm text-slate-900 tracking-tight">SERABI BAWEL</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                  Karyawan
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
        
        {/* PROFIL KARYAWAN & PENEMPATAN TOKO */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-soft-sm flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-lg border border-emerald-200">
              {currentUser.nama.charAt(0)}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Portal Gaji &amp; Tabungan Karyawan
              </span>
              <h2 className="text-base font-black text-slate-900 leading-tight">
                {currentUser.nama}
              </h2>
              <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-500 font-medium">
                <span className="capitalize font-bold text-slate-700">{formatKaryawanRole(currentUser.role)}</span>
                <span>•</span>
                <span className="text-emerald-700 font-bold">{userCabang?.nama || 'Cabang Belum Diplot'}</span>
                <span>•</span>
                <span>{currentUser.telepon}</span>
              </div>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            ✓ Aktif
          </span>
        </div>

        {/* HERO CARD: ESTIMASI TRANSFER GAJI MINGGUAN & CELENGAN TABUNGAN */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 border-2 border-emerald-500/30 p-5 text-white shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-800/60 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-300 block">
                  Estimasi Transfer Bersih Mingguan
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-800/80 text-[9px] font-bold text-emerald-200 border border-emerald-600/40">
                  Siklus Per Minggu
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-black text-amber-300 mt-1">
                {formatRupiah(gajiBersihSiapTerima)}
              </div>
              <p className="text-[10px] text-slate-300 mt-0.5">
                *Netto yang ditransfer setelah auto-nabung {formatRupiah(potonganTabunganPeriode)} &amp; potong kasbon.
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center text-2xl shadow-inner">
              💰
            </div>
          </div>

          {/* GRID METRIK GAJI: HARIAN, MINGGUAN, BULANAN, & TABUNGAN */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-black/40 p-3 rounded-2xl border border-emerald-900/60 text-xs">
            <div className="p-1">
              <span className="text-[9px] text-slate-400 block uppercase font-bold">Tarif Harian:</span>
              <span className="font-mono font-bold text-white text-xs">{formatRupiah(upahHarian)}</span>
              <span className="text-[9px] text-slate-400 block">/hari kerja</span>
            </div>

            <div className="p-1">
              <span className="text-[9px] text-emerald-300 block uppercase font-bold">1 Minggu (6 Hari):</span>
              <span className="font-mono font-bold text-emerald-300 text-xs">{formatRupiah(estimasiMingguan6Hari)}</span>
              <span className="text-[9px] text-slate-400 block">standar mingguan</span>
            </div>

            <div className="p-1">
              <span className="text-[9px] text-amber-300 block uppercase font-bold">Sebulan Tanpa Bon:</span>
              <span className="font-mono font-bold text-amber-300 text-xs">{formatRupiah(akumulasiSebulan26Hari)}</span>
              <span className="text-[9px] text-slate-400 block">26 hari kerja</span>
            </div>

            <div className="p-1 bg-emerald-950/60 rounded-xl px-2 border border-emerald-700/50">
              <span className="text-[9px] text-emerald-400 block uppercase font-extrabold flex items-center space-x-1">
                <span>🐷 Celengan:</span>
              </span>
              <span className="font-mono font-black text-emerald-200 text-xs">{formatRupiah(totalTabungan)}</span>
              <span className="text-[8px] text-emerald-400 block">+{formatRupiah(tabunganMingguan)}/minggu</span>
            </div>
          </div>

          {/* Rincian Upah vs Potongan Kasbon & Celengan */}
          <div className="grid grid-cols-3 gap-2 bg-emerald-900/20 p-2.5 rounded-2xl border border-emerald-800/40 text-xs">
            <div>
              <span className="text-[10px] text-slate-300 block">Kehadiran Berjalan:</span>
              <span className="font-mono font-bold text-white text-xs">{hadirCount} Hari ({formatRupiah(upahKotor)})</span>
            </div>

            <div>
              <span className="text-[10px] text-rose-300 block">Potong Kasbon:</span>
              <span className="font-mono font-bold text-rose-400 text-xs">
                -{formatRupiah(utangNominal)}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-emerald-300 block">Auto Tabungan:</span>
              <span className="font-mono font-bold text-emerald-400 text-xs">
                -{formatRupiah(potonganTabunganPeriode)}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-300 flex items-center space-x-1.5 pt-0.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Presensi dicatat otomatis di kasir toko &amp; transfer gaji dicairkan mingguan</span>
          </div>
        </div>

        {/* 4 PILIHAN TAB: SLIP GAJI, PRESENSI, KASBON, & BUKU TABUNGAN */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('slip')}
            className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'slip'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Slip Gaji</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presensi')}
            className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'presensi'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">Presensi ({absensiList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kasbon')}
            className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'kasbon'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">Kasbon ({expenses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tabungan')}
            className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'tabungan'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <PiggyBank className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="truncate">Celengan ({formatRupiah(totalTabungan)})</span>
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
                  Slip gaji resmi diterbitkan dan dikunci oleh Admin Pusat (Pak Agan) pada akhir periode penggajian mingguan.
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
                        Periode: {slip.periode_bulan ? `${slip.periode_bulan}/${slip.periode_tahun}` : (slip.periode_tahun || 'Mingguan')}
                      </h4>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-[10px] text-emerald-700 font-semibold">
                          Status: Ditransfer
                        </span>
                        {slip.potongan_tabungan ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold">
                            🐷 +{formatRupiah(slip.potongan_tabungan)} Ditabung
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Gaji Bersih Ditransfer:</span>
                    <span className="font-mono font-black text-sm text-emerald-800 block">
                      {formatRupiah(slip.gaji_bersih)}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold inline-flex items-center space-x-0.5 mt-0.5">
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

        {/* TAB 3: KASBON & PLAFON PINJAMAN STAF */}
        {activeTab === 'kasbon' && (
          <div className="space-y-4">
            
            {/* HERO KARTU PLAFON */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-soft-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Batas Plafon Pinjaman Kasbon
                  </span>
                  <div className="text-xl sm:text-2xl font-mono font-black text-amber-900 mt-0.5">
                    {formatRupiah(currentUser.plafon_kasbon || 500000)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKasbonModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-900/20 btn-tactile transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Ajukan Kasbon Baru</span>
                </button>
              </div>

              {/* Rincian Status Kasbon */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold block">Kasbon Berjalan (Belum Lunas):</span>
                  <span className="font-mono font-extrabold text-rose-600 text-sm">
                    {formatRupiah(utangNominal)}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 font-bold block">Sisa Kuota Kasbon:</span>
                  <span className="font-mono font-extrabold text-emerald-800 text-sm">
                    {formatRupiah(Math.max(0, (currentUser.plafon_kasbon || 500000) - utangNominal))}
                  </span>
                </div>
              </div>

              {/* Banner SOP Keamanan Kasbon */}
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-950 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Aturan Kasbon Resmi:</strong> Seluruh permohonan kasbon diajukan di menu ini dan <strong>wajib ditinjau &amp; disetujui Owner (Pak Agan) di Approval Center</strong> terlebih dahulu. Kasir di toko tidak diperkenankan mencairkan uang sebelum ada persetujuan resmi.
                </p>
              </div>
            </div>

            {/* Riwayat Pengajuan Kasbon */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
                <span>Riwayat Pengajuan Kasbon Anda:</span>
                <span>{expenses.length} Pengajuan</span>
              </div>

              {expenses.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 space-y-2">
                  <div className="text-3xl">💳</div>
                  <h3 className="text-xs font-bold text-slate-700">Belum Ada Pengajuan Kasbon</h3>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Jika membutuhkan kasbon darurat, klik tombol &quot;+ Ajukan Kasbon Baru&quot; di atas untuk mengirimkan permohonan ke Owner.
                  </p>
                </div>
              ) : (
                expenses.map(exp => (
                  <div
                    key={exp.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-extrabold text-slate-900 text-sm">
                            {formatRupiah(exp.nominal)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            exp.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            exp.status === 'rejected' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                            'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            {exp.status === 'approved' ? '✓ DISETUJUI OWNER' :
                             exp.status === 'rejected' ? '✕ DITOLAK' : '⏳ MENUNGGU APPROVAL'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium mt-1">
                          {exp.keperluan}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {exp.tanggal ? exp.tanggal.slice(0, 10) : '2026-10-25'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase mt-0.5 block">
                          {exp.metode_pencairan === 'transfer' ? 'Via Transfer' : 'Via Laci Kasir'}
                        </span>
                      </div>
                    </div>

                    {exp.status === 'pending' && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-amber-700 font-medium">
                          Sedang ditinjau oleh Pak Agan
                        </span>
                        <a
                          href={`https://wa.me/6281234567890?text=${encodeURIComponent(
                            `Halo Pak Agan, saya ${currentUser.nama} dari ${userCabang?.nama || 'Cabang'} ingin konfirmasi pengajuan kasbon sebesar ${formatRupiah(exp.nominal)} untuk keperluan: "${exp.keperluan}". Mohon persetujuannya di sistem Approval Center. Terima kasih.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold hover:bg-emerald-100 transition inline-flex items-center space-x-1"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>Hubungi Owner</span>
                        </a>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* TAB 4: BUKU CELENGAN TABUNGAN KARYAWAN */}
        {activeTab === 'tabungan' && (
          <div className="space-y-4">
            
            {/* HERO KARTU TABUNGAN */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-lg space-y-4 border border-emerald-600/40">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🐷</span>
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-200">
                      Celengan Tabungan Karyawan
                    </span>
                  </div>
                  <div className="text-3xl font-mono font-black text-amber-300 mt-1">
                    {formatRupiah(totalTabungan)}
                  </div>
                  <p className="text-xs text-emerald-100 font-medium mt-1">
                    Saldo tabungan resmi Anda yang dititipkan dan tersimpan aman di kas keuangan pusat.
                  </p>
                </div>

                <a
                  href={`https://wa.me/6281234567890?text=${encodeURIComponent(
                    `*PERMOHONAN PENARIKAN TABUNGAN KARYAWAN*\n\n` +
                    `Halo Pak Agan, saya *${currentUser.nama}* (${formatKaryawanRole(currentUser.role)} ${userCabang?.nama || 'Outlet'}).\n` +
                    `Saat ini total saldo tabungan saya tercatat: *${formatRupiah(totalTabungan)}*.\n` +
                    `Saya ingin berkonsultasi / mengajukan penarikan saldo celengan tabungan saya untuk keperluan mendesak.\n` +
                    `Mohon informasinya. Terima kasih Pak Agan!`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer shrink-0"
                >
                  <MessageCircle className="w-4 h-4 text-slate-950" />
                  <span>Tarik Celengan</span>
                </a>
              </div>

              {/* Rincian Aturan Auto-Nabung Mingguan */}
              <div className="grid grid-cols-2 gap-2 bg-black/30 p-3 rounded-2xl border border-emerald-500/30 text-xs">
                <div>
                  <span className="text-[10px] text-emerald-300 block font-bold">Auto-Nabung Tiap Gajian:</span>
                  <span className="font-mono font-black text-white text-sm">
                    +{formatRupiah(tabunganMingguan)} / minggu
                  </span>
                  <span className="text-[9px] text-slate-300 block">Dipotong otomatis saat transfer</span>
                </div>

                <div>
                  <span className="text-[10px] text-emerald-300 block font-bold">Total Transaksi Mutasi:</span>
                  <span className="font-mono font-black text-white text-sm">
                    {tabunganLogs.length} Kali Catatan
                  </span>
                  <span className="text-[9px] text-slate-300 block">Tercatat di pembukuan pusat</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/10 text-[11px] text-emerald-100 flex items-start space-x-2 border border-white/15">
                <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Keamanan Tabungan Terjamin:</strong> Setiap potongan tabungan mingguan otomatis masuk ke buku besar ini. Anda dapat mencairkan atau mengambil tabungan ini kapan saja dengan konfirmasi langsung ke Pak Agan.
                </p>
              </div>
            </div>

            {/* MUTASI TABUNGAN KARYAWAN */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
                <span>Buku Riwayat Mutasi Celengan Anda:</span>
                <span>{tabunganLogs.length} Riwayat</span>
              </div>

              {tabunganLogs.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 space-y-2">
                  <div className="text-3xl">🐷</div>
                  <h3 className="text-xs font-bold text-slate-700">Belum Ada Mutasi Tabungan</h3>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Setoran tabungan akan otomatis tercatat setiap kali transfer gaji mingguan dikunci oleh Admin Pusat.
                  </p>
                </div>
              ) : (
                tabunganLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                        log.tipe === 'setor'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {log.tipe === 'setor' ? (
                          <ArrowDownRight className="w-5 h-5" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase ${
                            log.tipe === 'setor'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {log.tipe === 'setor' ? '+ SETOR OTOMATIS' : '- PENARIKAN TABUNGAN'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {log.tanggal}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 mt-0.5">
                          {log.keterangan}
                        </p>
                        <span className="text-[10px] text-slate-400 block">
                          Dicatat: {log.dicatat_oleh}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`font-mono font-black text-sm block ${
                        log.tipe === 'setor' ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        {log.tipe === 'setor' ? '+' : '-'}{formatRupiah(log.nominal)}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 block">
                        Saldo: {formatRupiah(log.saldo_setelah)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

      </main>

      {/* MODAL AJUKAN KASBON DARI PORTAL KARYAWAN */}
      {showKasbonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Ajukan Kasbon Karyawan</h4>
                  <p className="text-[11px] text-slate-500">Kirim permohonan ke Approval Center Owner</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowKasbonModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (kasbonNominal <= 0) {
                  alert('Nominal kasbon harus lebih dari Rp 0!');
                  return;
                }
                const maxAvailable = Math.max(0, (currentUser.plafon_kasbon || 500000) - utangNominal);
                if (kasbonNominal > maxAvailable) {
                  alert(`Nominal kasbon (${formatRupiah(kasbonNominal)}) melebihi sisa kuota plafon Anda (${formatRupiah(maxAvailable)})!`);
                  return;
                }
                if (!kasbonKeperluan.trim()) {
                  alert('Tuliskan rincian alasan / keperluan kasbon!');
                  return;
                }

                setIsSubmittingKasbon(true);
                try {
                  await db.createPengeluaran({
                    cabang_id: currentUser.cabang_id,
                    cabang_nama: userCabang?.nama || 'Cabang',
                    karyawan_id: currentUser.id,
                    pemohon_nama: currentUser.nama,
                    pemohon_telepon: currentUser.telepon || '0812-3456-7890',
                    jenis: 'kasbon',
                    keperluan: kasbonKeperluan.trim(),
                    nominal: kasbonNominal,
                    metode_pencairan: kasbonMetode,
                  });

                  alert(
                    `Permohonan kasbon sebesar ${formatRupiah(kasbonNominal)} berhasil diajukan!\n\n` +
                    `Status: MENUNGGU PERSETUJUAN OWNER.\n` +
                    `Uang belum boleh diambil dari kasir sebelum disetujui Pak Agan di Approval Center.`
                  );

                  // Buka WhatsApp konfirmasi ke Owner
                  const waUrl = `https://wa.me/6281234567890?text=${encodeURIComponent(
                    `*PENGAJUAN KASBON KARYAWAN - SERABI BAWEL & WEDANG GEPREK*\n\n` +
                    `Halo Pak Agan, saya ingin mengajukan kasbon:\n` +
                    `• Nama: *${currentUser.nama}* (${formatKaryawanRole(currentUser.role)})\n` +
                    `• Cabang: *${userCabang?.nama || 'Outlet'}*\n` +
                    `• Nominal: *${formatRupiah(kasbonNominal)}*\n` +
                    `• Keperluan: ${kasbonKeperluan.trim()}\n` +
                    `• Metode: ${kasbonMetode === 'transfer' ? 'Transfer Bank' : 'Ambil di Laci Kasir'}\n\n` +
                    `Mohon persetujuannya di sistem Approval Center. Terima kasih.`
                  )}`;
                  window.open(waUrl, '_blank');

                  setShowKasbonModal(false);
                  setKasbonKeperluan('');
                  await refreshUserData();
                } catch (err: any) {
                  alert('Gagal mengajukan kasbon: ' + err.message);
                } finally {
                  setIsSubmittingKasbon(false);
                }
              }}
              className="p-5 space-y-4 overflow-y-auto text-xs"
            >
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                <span>Sisa Kuota Plafon Anda: </span>
                <strong className="font-mono text-amber-950 font-bold">
                  {formatRupiah(Math.max(0, (currentUser.plafon_kasbon || 500000) - utangNominal))}
                </strong>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nominal Kasbon yang Diajukan (Rp):</label>
                <input
                  type="number"
                  min={10000}
                  step={10000}
                  value={kasbonNominal}
                  onChange={(e) => setKasbonNominal(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {[50000, 100000, 150000, 200000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setKasbonNominal(amt)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600 cursor-pointer"
                    >
                      +{formatRupiah(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Alasan / Keperluan Mendesak:</label>
                <textarea
                  rows={2}
                  value={kasbonKeperluan}
                  onChange={(e) => setKasbonKeperluan(e.target.value)}
                  placeholder="Contoh: Beli obat keluarga / keperluan mendesak..."
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilihan Metode Pencairan:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setKasbonMetode('laci')}
                    className={`p-2.5 rounded-xl border text-left font-bold transition cursor-pointer ${
                      kasbonMetode === 'laci'
                        ? 'border-amber-600 bg-amber-50 text-amber-900'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="block text-xs font-black">💵 Laci Kasir</span>
                    <span className="text-[10px] font-normal text-slate-500">Ambil tunai di kasir toko</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setKasbonMetode('transfer')}
                    className={`p-2.5 rounded-xl border text-left font-bold transition cursor-pointer ${
                      kasbonMetode === 'transfer'
                        ? 'border-amber-600 bg-amber-50 text-amber-900'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="block text-xs font-black">💳 Transfer Bank</span>
                    <span className="text-[10px] font-normal text-slate-500">Ditransfer dari rekening pusat</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowKasbonModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingKasbon}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingKasbon ? 'Mengirim...' : 'Kirim Pengajuan Kasbon'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
