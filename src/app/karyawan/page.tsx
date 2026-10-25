'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  DollarSign, 
  HandCoins, 
  Receipt, 
  FileText, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  LogOut, 
  Send, 
  MessageCircle, 
  AlertCircle,
  Building2,
  Calendar,
  CreditCard,
  Plus,
  CalendarCheck,
  UserCheck,
  Home,
  Headphones,
  ChevronRight,
  ArrowUpRight,
  Wallet,
  Sparkles
} from 'lucide-react';
import { Karyawan, Cabang, PengeluaranKasbon, Payroll, Absensi } from '@/lib/types';
import { db } from '@/lib/db';
import { formatRupiah, formatNominal, parseNominal, formatWaktu, generateWhatsAppApprovalLink } from '@/lib/utils';
import PayrollSlipModal from '@/components/PayrollSlipModal';
import AiBadgeFooter from '@/components/AiBadgeFooter';

export default function KaryawanPortalPage() {
  const [currentUser, setCurrentUser] = useState<Karyawan | null>(null);
  const [userCabang, setUserCabang] = useState<Cabang | null>(null);
  const [expenses, setExpenses] = useState<PengeluaranKasbon[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [absensiList, setAbsensiList] = useState<Absensi[]>([]);

  // Mobile Bottom Navigation Tab
  const [activeTab, setActiveTab] = useState<'beranda' | 'presensi' | 'kasbon' | 'slip'>('beranda');

  // Kasbon submission state
  const [isSubmittingKasbon, setIsSubmittingKasbon] = useState<boolean>(false);
  const [nominalBon, setNominalBon] = useState<number>(200000);
  const [keperluanBon, setKeperluanBon] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [selectedSlip, setSelectedSlip] = useState<Payroll | null>(null);

  // Load user session
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

      const allExpenses = await db.getPengeluaranList(freshUser.cabang_id);
      const myKasbon = allExpenses.filter(e => e.karyawan_id === freshUser.id && e.jenis === 'kasbon');
      setExpenses(myKasbon);

      const allPayrolls = await db.getPayrollList();
      const myPayrolls = allPayrolls.filter(p => p.karyawan_id === freshUser.id);
      setPayrolls(myPayrolls);

      const myAbsensi = await db.getAbsensiList(freshUser.id);
      setAbsensiList(myAbsensi);
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

  // Calculations
  const activeUnsettledKasbon = expenses
    .filter(e => e.status === 'approved' && !e.is_settled)
    .reduce((sum, e) => sum + e.nominal, 0);

  const pendingKasbon = expenses
    .filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + e.nominal, 0);

  const plafon = currentUser?.plafon_kasbon || 1000000;
  const sisaPlafon = Math.max(0, plafon - activeUnsettledKasbon);

  // Absensi & Gaji Harian
  const todayStr = '2026-10-25';
  const todayAbsensi = absensiList.find(a => a.tanggal === todayStr);

  const actualHadir = absensiList.filter(a => a.status === 'hadir').length;
  const hadirDaysCount = actualHadir > 0 ? actualHadir : (absensiList.length > 0 ? 0 : 6);
  const isGajiHarian = currentUser?.tipe_gaji === 'harian';
  const upahHarianRate = currentUser?.gaji_harian || 100000;

  const gajiPokok = isGajiHarian ? (hadirDaysCount * upahHarianRate) : (currentUser?.gaji_pokok || 2600000);
  const totalGajiKotor = gajiPokok;
  
  // Check if salary has been paid out for this employee
  const latestPaidPayroll = payrolls && payrolls.length > 0 
    ? payrolls.find(p => p.karyawan_id === currentUser?.id && (p.status === 'paid' || p.status === 'locked')) 
    : null;

  // Jika gaji periode ini sudah dicairkan penuh oleh admin pusat, sisa saldo berjalan menjadi Rp 0!
  const isGajiSudahDicairkan = !!latestPaidPayroll;
  const estimasiGajiBersih = isGajiSudahDicairkan ? 0 : Math.max(0, totalGajiKotor - activeUnsettledKasbon);

  // Submit Kasbon
  const handleSubmitKasbon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userCabang) return;

    if (nominalBon <= 0) {
      alert('Nominal kasbon harus lebih dari Rp 0');
      return;
    }
    if (nominalBon > sisaPlafon) {
      alert(`Nominal melebihi sisa plafon kasbon Anda (${formatRupiah(sisaPlafon)})`);
      return;
    }
    if (!keperluanBon.trim()) {
      alert('Tuliskan keperluan kasbon');
      return;
    }

    setSubmitting(true);
    try {
      const created = await db.createPengeluaran({
        cabang_id: userCabang.id,
        cabang_nama: userCabang.nama,
        karyawan_id: currentUser.id,
        pemohon_nama: currentUser.nama,
        jenis: 'kasbon',
        keperluan: keperluanBon.trim(),
        nominal: nominalBon,
      });

      const waUrl = generateWhatsAppApprovalLink({
        cabangNama: userCabang.nama,
        staffNama: currentUser.nama,
        jenis: 'kasbon',
        nominal: created.nominal,
        keperluan: created.keperluan,
      });

      setIsSubmittingKasbon(false);
      setKeperluanBon('');
      await refreshUserData();

      if (confirm('Pengajuan kasbon tersimpan! Apakah Anda ingin langsung mengirim pesan persetujuan ke WhatsApp Pak Agan?')) {
        window.open(waUrl, '_blank');
      }
    } catch (err: any) {
      alert('Gagal mengajukan kasbon: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-4xl animate-bounce">🌿</div>
          <p className="text-xs font-bold text-emerald-300">Memuat Portal Karyawan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F1F5F9] max-w-md mx-auto relative shadow-2xl select-none font-sans">
      
      {/* 1. TOP HEADER (ALA ABDI MEMBANGUN) */}
      <header className="bg-gradient-to-r from-emerald-800 via-emerald-900 to-emerald-950 text-white p-4 sticky top-0 z-40 shadow-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-xl shadow-inner">
              🥞
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h1 className="text-sm sm:text-base font-extrabold leading-tight tracking-tight">
                  Serabi Bawel
                </h1>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-accent-gold text-white shadow-xs">
                  Portal Staf
                </span>
              </div>
              <p className="text-[11px] opacity-90 text-emerald-100 font-medium">
                Wedang Geprek • {userCabang?.nama.split('-')[1]?.trim() || userCabang?.nama || 'Outlet Resmi'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* WhatsApp Bantuan Button */}
            <a
              href="https://wa.me/6281234567890?text=Halo%20Pak%20Agan%2C%20saya%20staf%20cabang%20ingin%20konsultasi"
              target="_blank"
              rel="noreferrer"
              title="Hubungi Pak Agan (WhatsApp)"
              className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <Headphones className="w-5 h-5 text-emerald-200" />
            </a>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="bg-white/15 hover:bg-white/25 text-white px-2.5 py-1 rounded-full text-xs font-bold transition-colors flex items-center space-x-1"
              title="Keluar Akun"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. SCROLLABLE MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-4 pb-28 space-y-4">
        
        {/* User Mini Profile Card (Ala Abdi Membangun) */}
        <div className="bg-white p-3.5 rounded-2xl shadow-soft-sm border border-slate-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-brand-subtle text-brand-dark rounded-2xl flex items-center justify-center font-extrabold text-lg border border-brand-light">
              {currentUser.nama.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-extrabold text-slate-900 text-sm">{currentUser.nama}</h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 capitalize">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {currentUser.telepon} • Skema: <strong className="text-slate-700 capitalize">{currentUser.tipe_gaji || 'Harian'}</strong>
              </p>
            </div>
          </div>

          {currentUser.role === 'kasir' && (
            <Link
              href="/pos"
              className="bg-brand-primary hover:bg-brand-dark text-white px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-sm btn-tactile transition-all shrink-0 flex items-center space-x-1"
            >
              <span>POS</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Actionable Notice Banner (Ala Abdi Membangun) */}
        {todayAbsensi ? (
          <div className="bg-gradient-to-r from-emerald-600/10 via-emerald-600/5 to-white border border-emerald-300 p-3.5 rounded-2xl shadow-xs">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <span className="text-2xl shrink-0 mt-0.5">🟢</span>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-brand-primary text-white px-2 py-0.5 rounded-full">
                    PRESENSI HARI INI • VALID
                  </span>
                  <h4 className="font-bold text-slate-900 text-xs mt-1">
                    Shift {todayAbsensi.status.toUpperCase()} ({todayAbsensi.jam_masuk} - {todayAbsensi.jam_pulang || 'Sedang Bertugas'})
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Presensi diverifikasi oleh {todayAbsensi.recorded_by || 'Kepala Cabang'}. Upah harian hari ini otomatis terhitung.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white border border-amber-300 p-3.5 rounded-2xl shadow-xs">
            <div className="flex items-start gap-2.5">
              <span className="text-2xl shrink-0 mt-0.5">⏳</span>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-full">
                  MENUNGGU PRESENSI
                </span>
                <h4 className="font-bold text-slate-900 text-xs mt-1">
                  Presensi Hari Ini Belum Diinput Kepala Toko
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Presensi dicatat langsung oleh Admin / Kepala Cabang saat shift laci kasir dibuka.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Banner Gaji Masuk / Ditransfer Resmi oleh Pusat */}
        {latestPaidPayroll && (
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-900 to-emerald-950 text-white p-4 rounded-3xl shadow-lg border-2 border-emerald-400/40 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-emerald-950 text-[10px] font-black uppercase tracking-wider">
                🎉 GAJI TELAH DITRANSFER OLEH PUSAT
              </span>
              <span className="text-[10px] text-emerald-200 font-mono font-bold">
                {latestPaidPayroll.slip_no}
              </span>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <span className="text-[11px] text-emerald-200 block">Total Bersih Ditransfer:</span>
                <div className="text-2xl font-mono font-black text-white">
                  {formatRupiah(latestPaidPayroll.gaji_bersih)}
                </div>
                <div className="text-[10px] text-emerald-300">
                  Periode Bulan {latestPaidPayroll.periode_bulan}/{latestPaidPayroll.periode_tahun} • {latestPaidPayroll.total_kehadiran_hari} Hari Hadir • Kasbon: {formatRupiah(latestPaidPayroll.potongan_kasbon)} (Lunas)
                </div>
              </div>

              <button
                onClick={() => setSelectedSlip(latestPaidPayroll)}
                className="px-3.5 py-2 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 font-black text-xs shadow-md transition flex items-center gap-1.5 shrink-0"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-700" />
                <span>Buka Slip &amp; PDF</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. HERO FINTECH BALANCE CARD (BANK-GRADE HERBAL STYLE) */}
        <div className="bg-gradient-to-br from-brand-dark via-emerald-800 to-emerald-950 p-5 rounded-3xl shadow-lg text-white relative overflow-hidden border border-emerald-700/50">
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs text-emerald-200 font-bold uppercase tracking-wider">
                <Wallet className="w-4 h-4 text-accent-gold" />
                <span>Estimasi Take Home Pay</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-white text-[10px] font-extrabold border border-white/20">
                {hadirDaysCount} Hari Hadir
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="text-3xl font-mono font-extrabold tabular-nums tracking-tight text-white drop-shadow-sm">
                {formatRupiah(estimasiGajiBersih)}
              </div>
              <p className="text-[11px] text-emerald-200/90 leading-tight">
                {isGajiSudahDicairkan ? (
                  <span className="font-bold text-amber-300">✓ Seluruh gaji periode ini telah lunas dicairkan &amp; ditransfer ke rekening Anda (Sisa Saldo: Rp 0).</span>
                ) : isGajiHarian ? (
                  <>Akumulasi: {hadirDaysCount} hari × {formatRupiah(upahHarianRate)} dikurangi kasbon.</>
                ) : (
                  <>Gaji Pokok Tetap dikurangi Kasbon Approved.</>
                )}
              </p>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1">
                <span className="text-emerald-300 text-[11px]">Kasbon Berjalan:</span>
                <span className="font-mono font-extrabold text-accent-gold text-xs">
                  {formatRupiah(activeUnsettledKasbon)}
                </span>
              </div>

              <button
                onClick={() => setActiveTab('presensi')}
                className="bg-accent-gold hover:bg-amber-600 text-white font-extrabold text-[11px] px-3.5 py-1.5 rounded-xl shadow-sm transition btn-tactile"
              >
                Cek Rincian →
              </button>
            </div>
          </div>

          {/* Background Ambient Herbal Glow */}
          <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* 4. QUICK ACTION 4-BENTO GRID (ALA ABDI MEMBANGUN & M-BANKING) */}
        <div>
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-2 px-1">
            Menu Akses Cepat Karyawan
          </h3>
          <div className="grid grid-cols-4 gap-2">
            
            <button
              onClick={() => setActiveTab('presensi')}
              className={`p-3 rounded-2xl shadow-xs border flex flex-col items-center justify-center gap-1.5 text-center transition btn-tactile ${
                activeTab === 'presensi' 
                  ? 'bg-emerald-50 border-emerald-300 text-brand-dark' 
                  : 'bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold leading-tight">Presensi<br/>Harian</span>
            </button>

            <button
              onClick={() => setActiveTab('kasbon')}
              className={`p-3 rounded-2xl shadow-xs border flex flex-col items-center justify-center gap-1.5 text-center transition btn-tactile ${
                activeTab === 'kasbon' 
                  ? 'bg-amber-50 border-amber-300 text-amber-900' 
                  : 'bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="w-10 h-10 bg-amber-50 text-accent-gold rounded-xl flex items-center justify-center">
                <HandCoins className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold leading-tight">Ajukan<br/>Kasbon</span>
            </button>

            <button
              onClick={() => setActiveTab('slip')}
              className={`p-3 rounded-2xl shadow-xs border flex flex-col items-center justify-center gap-1.5 text-center transition btn-tactile ${
                activeTab === 'slip' 
                  ? 'bg-blue-50 border-blue-300 text-blue-900' 
                  : 'bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold leading-tight">Slip Gaji<br/>Bank</span>
            </button>

            {currentUser.role === 'kasir' ? (
              <Link
                href="/pos"
                className="bg-white p-3 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col items-center justify-center gap-1.5 text-center hover:bg-slate-50 transition btn-tactile"
              >
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 leading-tight">Buka<br/>Kasir</span>
              </Link>
            ) : (
              <a
                href="https://wa.me/6281234567890"
                target="_blank"
                rel="noreferrer"
                className="bg-white p-3 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col items-center justify-center gap-1.5 text-center hover:bg-slate-50 transition btn-tactile"
              >
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 leading-tight">Bantuan<br/>Owner</span>
              </a>
            )}

          </div>
        </div>

        {/* 5. TAB VIEW: BERANDA (OVERVIEW) */}
        {activeTab === 'beranda' && (
          <div className="space-y-4 animate-fadeIn">
            
            {/* Ringkasan Gaji & Tunjangan (Bank Statement Style) */}
            <div className="bg-white p-4 rounded-2xl shadow-soft-sm border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Rincian Upah Terkumpul Bulan Ini</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-extrabold border border-emerald-200">
                  {isGajiHarian ? 'Upah Harian Lepas' : 'Gaji Bulanan Tetap'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>{isGajiHarian ? `Gaji Harian (${hadirDaysCount} Hari @ ${formatRupiah(upahHarianRate).replace('Rp\u00a0', '')}):` : 'Gaji Pokok Resmi:'}</span>
                  <span className="font-mono font-bold text-slate-800">{formatRupiah(gajiPokok)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 font-extrabold text-slate-900">
                  <span>Total Penghasilan Kotor:</span>
                  <span className="font-mono text-emerald-700">{formatRupiah(totalGajiKotor)}</span>
                </div>
                <div className="flex justify-between items-center text-rose-600 font-semibold pt-1">
                  <span>Potongan Kasbon Periode Ini:</span>
                  <span className="font-mono">-{formatRupiah(activeUnsettledKasbon)}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-900 text-[11px]">Estimasi Diterima (Take Home):</span>
                <span className="font-mono font-extrabold text-emerald-900 text-sm">{formatRupiah(estimasiGajiBersih)}</span>
              </div>
            </div>

            {/* Status Plafon Kasbon Card */}
            <div className="bg-white p-4 rounded-2xl shadow-soft-sm border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-900 flex items-center space-x-1.5">
                  <HandCoins className="w-4 h-4 text-accent-gold" />
                  <span>Batas Plafon Kasbon</span>
                </span>
                <span className="font-mono font-extrabold text-accent-gold">{formatRupiah(activeUnsettledKasbon)} terpakai</span>
              </div>

              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-accent-gold h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.round((activeUnsettledKasbon / plafon) * 100))}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                <span>Sisa Plafon: <strong className="text-emerald-700">{formatRupiah(sisaPlafon)}</strong></span>
                <span>Maksimal: {formatRupiah(plafon)}</span>
              </div>
            </div>

            {/* Riwayat Absensi Terakhir Preview */}
            <div className="bg-white p-4 rounded-2xl shadow-soft-sm border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-extrabold text-slate-900">Riwayat Kehadiran Terbaru</span>
                <button onClick={() => setActiveTab('presensi')} className="text-[11px] font-bold text-brand-primary hover:underline">
                  Lihat Semua →
                </button>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {absensiList.slice(0, 4).map(a => (
                  <div key={a.id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">{a.tanggal}</div>
                      <div className="text-[10px] text-slate-400">
                        {a.jam_masuk} - {a.jam_pulang || 'Shift Selesai'} • Dicatat: {a.recorded_by || 'Kepala Cabang'}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 capitalize">
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* 6. TAB VIEW: PRESENSI LENGKAP */}
        {activeTab === 'presensi' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Kalkulasi Uang Kehadiran Harian Otomatis */}
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-2xl border border-emerald-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <span className="text-base">⚡</span>
                  <span>Akumulasi Upah Harian Kehadiran</span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
                  Real-Time
                </span>
              </div>

              <div className="p-3 bg-white/90 rounded-xl border border-emerald-100 text-[11px] flex justify-between items-center">
                <div>
                  <span className="text-slate-500 block text-[10px]">Gaji Harian ({hadirDaysCount} Hari Hadir):</span>
                  <span className="text-[10px] text-slate-400 font-medium">@{formatRupiah(upahHarianRate)} / hari</span>
                </div>
                <span className="font-mono font-extrabold text-slate-900 text-sm">
                  {formatRupiah(hadirDaysCount * upahHarianRate)}
                </span>
              </div>

              <div className="pt-1.5 flex justify-between items-center border-t border-emerald-200/60 font-extrabold text-emerald-950">
                <span className="text-[11px]">Total Pendapatan Terkumpul:</span>
                <span className="font-mono text-sm text-emerald-800">
                  {formatRupiah(totalGajiKotor)}
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-soft-sm border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Buku Presensi Staf</h3>
                  <p className="text-[11px] text-slate-500">Divalidasi langsung oleh Admin Cabang / Kepala Toko</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-brand-subtle text-brand-dark font-extrabold text-xs">
                  {hadirDaysCount} Hari Hadir
                </span>
              </div>

              <div className="divide-y divide-slate-100 text-xs max-h-[60vh] overflow-y-auto">
                {absensiList.map(a => (
                  <div key={a.id} className="py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800">{a.tanggal}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                          a.status === 'hadir' 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {a.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Jam: {a.jam_masuk} - {a.jam_pulang || 'Shift Selesai'} • Dicatat: {a.recorded_by || 'Admin Cabang'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-800 block">
                        +{formatRupiah(a.upah_harian_terhitung || 100000)}
                      </span>
                      <span className="text-[10px] text-slate-400 italic">
                        {a.catatan || 'Shift normal'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 7. TAB VIEW: KASBON HUB */}
        {activeTab === 'kasbon' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Form Ajukan Kasbon */}
            <div className="bg-white p-4 rounded-2xl shadow-soft-sm border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Pengajuan Kasbon Staf</h3>
                  <p className="text-[11px] text-slate-500">Ajukan kasbon darurat langsung ke WhatsApp Pak Agan</p>
                </div>
                <HandCoins className="w-5 h-5 text-accent-gold" />
              </div>

              <form onSubmit={handleSubmitKasbon} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nominal Kasbon yang Diajukan (Rp)
                  </label>
                  <input
                    type="text"
                    value={nominalBon === 0 ? '' : formatNominal(nominalBon)}
                    onChange={(e) => setNominalBon(parseNominal(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:border-brand-primary"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Sisa plafon Anda: <strong className="text-emerald-700">{formatRupiah(sisaPlafon)}</strong>
                  </span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Keperluan Kasbon
                  </label>
                  <input
                    type="text"
                    value={keperluanBon}
                    onChange={(e) => setKeperluanBon(e.target.value)}
                    placeholder="Contoh: Keperluan darurat keluarga..."
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-brand-primary"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || sisaPlafon <= 0}
                  className="w-full py-2.5 bg-accent-gold hover:bg-amber-600 text-white rounded-xl font-extrabold text-xs shadow-md shadow-accent-gold/25 btn-tactile flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Mengirim...' : 'Kirim Pengajuan ke Pak Agan (WhatsApp)'}</span>
                </button>
              </form>
            </div>

            {/* Riwayat Kasbon Periode Ini */}
            <div className="bg-white p-4 rounded-2xl shadow-soft-sm border border-slate-200/80 space-y-2.5">
              <h4 className="text-xs font-extrabold text-slate-900">Riwayat Pengajuan Kasbon</h4>
              {expenses.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                  Belum ada pengajuan kasbon periode ini. Plafon utuh 100%.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {expenses.map(exp => (
                    <div key={exp.id} className="py-2.5 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900">{exp.keperluan}</div>
                        <div className="text-[10px] text-slate-400">
                          {formatWaktu(exp.tanggal)} • {exp.metode_pencairan === 'laci' ? 'Via Kas Laci' : 'Via Transfer'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-800">{formatRupiah(exp.nominal)}</div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                          exp.is_settled 
                            ? 'bg-slate-100 text-slate-600'
                            : exp.status === 'approved' 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {exp.is_settled ? 'Lunas Payroll' : exp.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 8. TAB VIEW: SLIP GAJI BANK */}
        {activeTab === 'slip' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-white p-4 rounded-2xl shadow-soft-sm border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Arsip Slip Gaji Mutasi Bank</h3>
                  <p className="text-[11px] text-slate-500">Slip digital resmi yang diterbitkan saat tutup buku bulanan</p>
                </div>
                <FileText className="w-5 h-5 text-brand-primary" />
              </div>

              {payrolls.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl space-y-1">
                  <div className="text-2xl mb-1">🏛️</div>
                  <p className="font-bold text-slate-600">Belum Ada Slip Gaji yang Dikunci</p>
                  <p className="text-[11px]">Slip resmi otomatis terbit begitu Pak Agan menekan tombol &quot;Kunci Gaji&quot; di akhir periode.</p>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  {payrolls.map(pay => (
                    <div key={pay.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">Periode Bulan {pay.periode_bulan}/{pay.periode_tahun}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{pay.slip_no}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Take Home:</span>
                          <span className="font-mono font-bold text-emerald-800">{formatRupiah(pay.gaji_bersih)}</span>
                        </div>
                        <button
                          onClick={() => setSelectedSlip(pay)}
                          className="px-2.5 py-1 bg-brand-primary text-white rounded-lg font-bold text-[11px] btn-tactile shadow-xs"
                        >
                          Buka
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* AiBadgeFooter (Ala Abdi Membangun) */}
      <div className="pb-28 pt-4 px-4">
        <AiBadgeFooter />
      </div>

      {/* 9. STICKY BOTTOM NAVIGATION BAR (ALA ABDI MEMBANGUN & BRImo / M-BANKING) */}
      <nav className="bg-white/95 backdrop-blur-md border-t border-slate-200 fixed bottom-0 w-full max-w-md flex justify-around p-2 pb-5 z-40 shadow-2xl">
        
        <button
          onClick={() => setActiveTab('beranda')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
            activeTab === 'beranda' ? 'text-brand-dark font-extrabold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Home className={`w-5 h-5 mb-1 ${activeTab === 'beranda' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px]">Beranda</span>
        </button>

        <button
          onClick={() => setActiveTab('presensi')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all relative ${
            activeTab === 'presensi' ? 'text-brand-dark font-extrabold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <CalendarCheck className={`w-5 h-5 mb-1 ${activeTab === 'presensi' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px]">Presensi</span>
          <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-emerald-500" />
        </button>

        <button
          onClick={() => setActiveTab('kasbon')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
            activeTab === 'kasbon' ? 'text-accent-gold font-extrabold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <HandCoins className={`w-5 h-5 mb-1 ${activeTab === 'kasbon' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px]">Kasbon</span>
        </button>

        <button
          onClick={() => setActiveTab('slip')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
            activeTab === 'slip' ? 'text-blue-700 font-extrabold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <FileText className={`w-5 h-5 mb-1 ${activeTab === 'slip' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px]">Slip Bank</span>
        </button>

      </nav>

      {/* Slip Modal */}
      {selectedSlip && (
        <PayrollSlipModal
          payroll={selectedSlip}
          absensiList={absensiList}
          expenseList={expenses}
          onClose={() => setSelectedSlip(null)}
        />
      )}

    </div>
  );
}