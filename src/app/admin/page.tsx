'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/AdminSidebar';
import ApprovalActionModal from '@/components/ApprovalActionModal';
import PayrollSlipModal from '@/components/PayrollSlipModal';
import PinResetModal from '@/components/PinResetModal';
import EditSalaryModal from '@/components/EditSalaryModal';
import PayrollRecapReportModal from '@/components/PayrollRecapReportModal';
import ApprovalRecapReportModal from '@/components/ApprovalRecapReportModal';
import EditCabangModal from '@/components/EditCabangModal';
import EditMenuModal from '@/components/EditMenuModal';
import CreateExpenseModal from '@/components/CreateExpenseModal';
import CreateKaryawanModal from '@/components/CreateKaryawanModal';
import DailyBranchReportModal from '@/components/DailyBranchReportModal';
import PayoutSalaryModal from '@/components/PayoutSalaryModal';
import CreateKirimanBahanModal from '@/components/CreateKirimanBahanModal';
import UnifiedBranchTable from '@/components/UnifiedBranchTable';
import SeniorBossDashboard from '@/components/SeniorBossDashboard';

import { 
  Cabang, 
  MenuItem, 
  Karyawan, 
  Transaksi, 
  PengeluaranKasbon, 
  Payroll,
  Absensi,
  BahanBaku,
  KirimanBahanPusat,
  AbsensiBahanHarian,
  FixedCostHarianCabang
} from '@/lib/types';
import { db } from '@/lib/db';
import { formatRupiah, formatNominal, parseNominal, formatWaktu, generateWhatsAppPayrollSlipLink } from '@/lib/utils';

import { 
  TrendingUp, 
  Receipt, 
  Clock, 
  Plus, 
  Lock, 
  Unlock,
  KeyRound, 
  Store, 
  Calendar,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  DollarSign,
  CalendarCheck,
  UserCheck,
  CheckCircle2,
  Printer,
  Eye,
  EyeOff,
  Search,
  FileDown,
  FileText,
  Pencil,
  RotateCcw,
  Trash2,
  Building2,
  ArrowRightLeft,
  MapPin,
  X,
  ShoppingBag,
  Wallet,
  ExternalLink,
  MessageCircle,
  XCircle,
  Filter,
  Sparkles,
  PackageCheck,
  Menu
} from 'lucide-react';

const OWNER_AUTH_KEY = 'pakagan_owner_authenticated';

export default function AdminDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [ownerPinInput, setOwnerPinInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'ringkasan' | 'approval' | 'gaji' | 'absensi' | 'bahan' | 'payroll' | 'menu' | 'karyawan'>('ringkasan');
  const [cabangList, setCabangList] = useState<Cabang[]>([]);
  const [selectedCabangId, setSelectedCabangId] = useState<string>('all');
  const [selectedAbsensiDate, setSelectedAbsensiDate] = useState<string>('2026-10-25');
  const [absensiDateFilterMode, setAbsensiDateFilterMode] = useState<'selected' | 'all'>('selected');
  const [menuList, setMenuList] = useState<MenuItem[]>([]);
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>([]);
  const [transaksiList, setTransaksiList] = useState<Transaksi[]>([]);
  const [expenseList, setExpenseList] = useState<PengeluaranKasbon[]>([]);
  const [payrollList, setPayrollList] = useState<Payroll[]>([]);
  const [absensiList, setAbsensiList] = useState<Absensi[]>([]);

  // State Manajemen Bahan & Pasokan 10 Toko
  const [bahanList, setBahanList] = useState<BahanBaku[]>([]);
  const [kirimanBahanList, setKirimanBahanList] = useState<KirimanBahanPusat[]>([]);
  const [selectedBahanCabangId, setSelectedBahanCabangId] = useState<string>('all');
  const [selectedBahanDate, setSelectedBahanDate] = useState<string>('2026-10-25');
  const [showKirimanModal, setShowKirimanModal] = useState<boolean>(false);

  // State Rekap Uang Masuk Bersih Rekening Boss
  const [selectedBossSummaryDate, setSelectedBossSummaryDate] = useState<string>('2026-10-25');

  // Modals
  const [selectedCabangForEdit, setSelectedCabangForEdit] = useState<Cabang | null>(null);
  const [isAddingNewCabang, setIsAddingNewCabang] = useState<boolean>(false);
  const [selectedExpenseForApproval, setSelectedExpenseForApproval] = useState<PengeluaranKasbon | null>(null);
  const [selectedKaryawanForPinReset, setSelectedKaryawanForPinReset] = useState<Karyawan | null>(null);
  const [selectedKaryawanForSalaryEdit, setSelectedKaryawanForSalaryEdit] = useState<Karyawan | null>(null);
  const [selectedKaryawanForPlot, setSelectedKaryawanForPlot] = useState<Karyawan | null>(null);
  const [targetBranchIdForPlot, setTargetBranchIdForPlot] = useState<string>('');
  const [selectedPayrollSlip, setSelectedPayrollSlip] = useState<Payroll | null>(null);
  const [selectedPayrollForPayout, setSelectedPayrollForPayout] = useState<Payroll | null>(null);
  const [showPayrollReportModal, setShowPayrollReportModal] = useState<boolean>(false);
  const [showDailyReportModal, setShowDailyReportModal] = useState<boolean>(false);
  const [selectedMenuForEdit, setSelectedMenuForEdit] = useState<MenuItem | null>(null);
  const [isAddingNewMenu, setIsAddingNewMenu] = useState<boolean>(false);

  // Approval Center Filters & State
  const [approvalDateFilter, setApprovalDateFilter] = useState<string>('2026-10-25');
  const [approvalDateMode, setApprovalDateMode] = useState<'selected' | 'all'>('all');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [approvalJenisFilter, setApprovalJenisFilter] = useState<'all' | 'belanja' | 'kasbon'>('all');
  const [approvalCabangFilter, setApprovalCabangFilter] = useState<string>('all');
  const [approvalSearch, setApprovalSearch] = useState<string>('');
  const [showApprovalReportModal, setShowApprovalReportModal] = useState<boolean>(false);

  // Belanja & Kas Kecil 10 Cabang Filters & State
  const [belanjaCabangFilter, setBelanjaCabangFilter] = useState<string>('all');
  const [belanjaJenisFilter, setBelanjaJenisFilter] = useState<'all' | 'belanja' | 'kasbon'>('all');
  const [belanjaStatusFilter, setBelanjaStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [belanjaSearch, setBelanjaSearch] = useState<string>('');
  const [showCreateExpenseModal, setShowCreateExpenseModal] = useState<boolean>(false);

  // User Search & Credentials Visibility ala Abdi Membangun
  const [userSearch, setUserSearch] = useState<string>('');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [showCreateKaryawanModal, setShowCreateKaryawanModal] = useState<boolean>(false);

  const togglePasswordVisibility = (id: string) => {
    setRevealedPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDeleteKaryawan = async (karyawanId: string, nama: string) => {
    const confirmDelete = confirm(`Apakah Anda yakin ingin menghapus akun karyawan "${nama}"?`);
    if (!confirmDelete) return;
    await db.deleteKaryawan(karyawanId);
    await refreshAllData();
    alert(`Karyawan "${nama}" berhasil dihapus.`);
  };

  const handleResetDatabase = async () => {
    const confirmReset = confirm(
      'PERINGATAN: Apakah Anda yakin ingin MENGOSONGKAN SELURUH DATA untuk MULAI DARI 0?\n\n' +
      '• Seluruh transaksi kasir menjadi Rp 0\n' +
      '• Seluruh kasir / karyawan demo dihapus (hanya tersisa akun Owner Pak Agan)\n' +
      '• Seluruh belanja toko, kasbon, absensi & payroll menjadi 0\n' +
      '• Master 10 cabang resmi & menu katalog tetap aman\n\n' +
      'Klik OK untuk mengosongkan semua data ke nol.'
    );
    if (!confirmReset) return;

    await db.resetDatabaseToZero();
    await refreshAllData();
    alert('Database berhasil direset ke 0! Silakan daftarkan karyawan & kasir cabang baru Anda.');
  };

  const handleLoadDemoWeek = async () => {
    const confirmLoad = confirm(
      'MUAT DATA UJI COBA 1 MINGGU (19 - 25 OKTOBER 2026):\n\n' +
      '• Memuat staf aktif 4 cabang (Siti, Budi, Dewi, Agus, Rian)\n' +
      '• Presensi kehadiran harian 1 minggu (6-7 hari hadir per staf)\n' +
      '• Kasbon yang sudah disetujui & otomatis memotong gaji (Siti & Budi)\n' +
      '• Kasbon & Belanja Toko "PENDING" untuk dicoba disetujui di Approval Center (Dewi)\n' +
      '• Puluhan transaksi penjualan POS multi-cabang (omzet nyata)\n\n' +
      'Klik OK untuk memuat data simulasi 1 minggu.'
    );
    if (!confirmLoad) return;

    await db.loadOneWeekSimulationData();
    await refreshAllData();
    alert('Data simulasi 1 minggu berhasil dimuat! Anda dapat langsung memeriksa modul Approval, Kasbon, dan Payroll.');
  };

  const handleUnlockUser = async (karyawanId: string) => {
    await db.toggleKaryawanLock(karyawanId, false);
    await refreshAllData();
    alert('Gembok akun berhasil dibuka! Staf dapat langsung login kembali.');
  };

  // Payroll Period & Branch Filters (Ala Abdi Membangun Cetak Rekap Per-Cabang)
  const [payrollMode, setPayrollMode] = useState<'harian' | 'rentang' | 'bulanan'>('rentang');
  const [payrollBranchFilter, setPayrollBranchFilter] = useState<string>('all');
  const [payrollSingleDate, setPayrollSingleDate] = useState<string>('2026-10-25');
  const [payrollStartDate, setPayrollStartDate] = useState<string>('2026-10-19');
  const [payrollEndDate, setPayrollEndDate] = useState<string>('2026-10-25');
  const [payrollMonth, setPayrollMonth] = useState<number>(10);
  const [payrollYear, setPayrollYear] = useState<number>(2026);

  // Check auth session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAuth = sessionStorage.getItem(OWNER_AUTH_KEY) === 'true';
      if (!isAuth) {
        window.location.href = '/';
      } else {
        setIsAuthenticated(true);
      }
    }
  }, []);

  const handleLogoutOwner = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(OWNER_AUTH_KEY);
      window.location.href = '/';
    }
  };

  // Load All Master Data
  const refreshAllData = async () => {
    const cabangs = await db.getCabangList();
    setCabangList(cabangs);

    const menus = await db.getMenuList();
    setMenuList(menus);

    const kars = await db.getAllKaryawan();
    setKaryawanList(kars);

    const trxs = await db.getTransaksiList();
    setTransaksiList(trxs);

    const expenses = await db.getPengeluaranList();
    setExpenseList(expenses);

    const payrolls = await db.getPayrollList();
    setPayrollList(payrolls);

    const abs = await db.getAbsensiList();
    setAbsensiList(abs);

    const bhs = await db.getBahanBakuList();
    setBahanList(bhs);

    const krms = await db.getKirimanBahanList();
    setKirimanBahanList(krms);
  };

  useEffect(() => {
    refreshAllData();

    const handleUpdate = () => refreshAllData();
    window.addEventListener('pak_agan_db_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('pak_agan_db_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Filtered Transaksi
  const filteredTransaksi = useMemo(() => {
    if (selectedCabangId === 'all') return transaksiList;
    return transaksiList.filter(t => t.cabang_id === selectedCabangId);
  }, [transaksiList, selectedCabangId]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    if (selectedCabangId === 'all') return expenseList;
    return expenseList.filter(e => e.cabang_id === selectedCabangId);
  }, [expenseList, selectedCabangId]);

  // Aggregate Metrics
  const totalOmzetGlobal = useMemo(() => {
    return filteredTransaksi.reduce((sum, t) => sum + (t.status === 'completed' ? t.total : 0), 0);
  }, [filteredTransaksi]);

  const totalTransaksiCount = useMemo(() => {
    return filteredTransaksi.filter(t => t.status === 'completed').length;
  }, [filteredTransaksi]);

  const pendingExpenses = useMemo(() => {
    return expenseList.filter(e => e.status === 'pending');
  }, [expenseList]);

  const totalUnsettledKasbon = useMemo(() => {
    return expenseList
      .filter(e => e.jenis === 'kasbon' && e.status === 'approved' && !e.is_settled)
      .reduce((sum, e) => sum + e.nominal, 0);
  }, [expenseList]);

  const filteredKaryawan = useMemo(() => {
    if (!userSearch.trim()) return karyawanList;
    const q = userSearch.toLowerCase();
    return karyawanList.filter(k => 
      k.nama.toLowerCase().includes(q) ||
      (k.username || '').toLowerCase().includes(q) ||
      (k.telepon || '').includes(q)
    );
  }, [karyawanList, userSearch]);

  // Filtered Absensi List berdasarkan Cabang & Tanggal Terpilih / Semua Tanggal
  const filteredAbsensiList = useMemo(() => {
    return absensiList
      .filter(a => {
        const matchBranch = selectedCabangId === 'all' || a.cabang_id === selectedCabangId;
        const matchDate = absensiDateFilterMode === 'all' || a.tanggal === selectedAbsensiDate;
        return matchBranch && matchDate;
      })
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [absensiList, selectedCabangId, absensiDateFilterMode, selectedAbsensiDate]);

  // Filtered Approval Expenses dengan Jejak Audit Tanggal & Filter Status
  const filteredApprovalExpenses = useMemo(() => {
    return expenseList.filter(exp => {
      if (approvalCabangFilter !== 'all' && exp.cabang_id !== approvalCabangFilter) return false;
      if (approvalJenisFilter !== 'all' && exp.jenis !== approvalJenisFilter) return false;
      if (approvalStatusFilter !== 'all' && exp.status !== approvalStatusFilter) return false;
      if (approvalDateMode === 'selected') {
        const itemDate = (exp.approved_at || exp.tanggal || '').slice(0, 10);
        if (itemDate !== approvalDateFilter) return false;
      }
      if (approvalSearch.trim()) {
        const q = approvalSearch.toLowerCase();
        const branchName = cabangList.find(c => c.id === exp.cabang_id)?.nama.toLowerCase() || '';
        return (
          exp.keperluan.toLowerCase().includes(q) ||
          exp.pemohon_nama.toLowerCase().includes(q) ||
          branchName.includes(q) ||
          exp.id.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [expenseList, approvalCabangFilter, approvalJenisFilter, approvalStatusFilter, approvalDateMode, approvalDateFilter, approvalSearch, cabangList]);

  // Belanja & Kas Kecil Filtered List
  const filteredBelanjaList = useMemo(() => {
    return expenseList.filter(exp => {
      if (belanjaCabangFilter !== 'all' && exp.cabang_id !== belanjaCabangFilter) return false;
      if (belanjaJenisFilter !== 'all' && exp.jenis !== belanjaJenisFilter) return false;
      if (belanjaStatusFilter !== 'all' && exp.status !== belanjaStatusFilter) return false;
      if (belanjaSearch.trim()) {
        const q = belanjaSearch.toLowerCase();
        const branchName = cabangList.find(c => c.id === exp.cabang_id)?.nama.toLowerCase() || '';
        return (
          exp.keperluan.toLowerCase().includes(q) ||
          exp.pemohon_nama.toLowerCase().includes(q) ||
          branchName.includes(q) ||
          exp.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [expenseList, belanjaCabangFilter, belanjaJenisFilter, belanjaStatusFilter, belanjaSearch, cabangList]);

  // Handle Delete Menu Item (Khusus Admin Pusat)
  const handleDeleteMenu = async (item: MenuItem) => {
    const confirmed = confirm(
      `HAPUS MENU RESMI PUSAT:\n\nApakah Anda yakin ingin menghapus menu "${item.nama}" (${item.kode}) dari master resep pusat?\n\nSetelah dihapus, tablet kasir di seluruh cabang tidak dapat lagi menjual menu ini.`
    );
    if (!confirmed) return;

    try {
      await db.deleteMenu(item.id);
      await refreshAllData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus menu');
    }
  };

  // Label Periode Tanggal untuk PDF & Header
  const payrollDateLabel = useMemo(() => {
    if (payrollMode === 'harian') {
      const d = new Date(payrollSingleDate);
      return isNaN(d.getTime()) 
        ? payrollSingleDate 
        : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } else if (payrollMode === 'rentang') {
      const d1 = new Date(payrollStartDate);
      const d2 = new Date(payrollEndDate);
      const s1 = isNaN(d1.getTime()) ? payrollStartDate : d1.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const s2 = isNaN(d2.getTime()) ? payrollEndDate : d2.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${s1} s.d. ${s2}`;
    } else {
      const bulanNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      return `Bulan ${bulanNames[payrollMonth - 1] || payrollMonth} ${payrollYear}`;
    }
  }, [payrollMode, payrollSingleDate, payrollStartDate, payrollEndDate, payrollMonth, payrollYear]);

  // Handle Payroll Calculation & Locking
  const calculatedPayrollDrafts = useMemo(() => {
    return karyawanList
      .filter(k => k.role !== 'owner')
      .filter(k => payrollBranchFilter === 'all' || k.cabang_id === payrollBranchFilter)
      .map(kar => {
        const branch = cabangList.find(c => c.id === kar.cabang_id);
        const unsettled = expenseList.filter(e => {
          if (e.karyawan_id !== kar.id || e.jenis !== 'kasbon' || e.status !== 'approved' || e.is_settled) return false;
          const eDate = (e.tanggal || '').slice(0, 10);
          if (payrollMode === 'harian') {
            return !payrollSingleDate || eDate <= payrollSingleDate;
          } else if (payrollMode === 'rentang') {
            return !payrollEndDate || eDate <= payrollEndDate;
          } else {
            const targetMonthStr = `${payrollYear}-${String(payrollMonth).padStart(2, '0')}`;
            return !payrollMonth || !payrollYear || eDate.slice(0, 7) <= targetMonthStr;
          }
        });
        const totalKasbon = unsettled.reduce((sum, e) => sum + e.nominal, 0);

        // Kehadiran Staf per Tanggal Terpilih (Ala Abdi Membangun)
        let staffPresence = 0;
        if (payrollMode === 'harian') {
          const match = absensiList.filter(a => a.karyawan_id === kar.id && a.tanggal === payrollSingleDate && a.status === 'hadir');
          staffPresence = match.length;
        } else if (payrollMode === 'rentang') {
          const match = absensiList.filter(a => a.karyawan_id === kar.id && a.tanggal >= payrollStartDate && a.tanggal <= payrollEndDate && a.status === 'hadir');
          staffPresence = match.length;
        } else {
          const targetPrefix = `${payrollYear}-${String(payrollMonth).padStart(2, '0')}`;
          const match = absensiList.filter(a => a.karyawan_id === kar.id && a.tanggal.startsWith(targetPrefix) && a.status === 'hadir');
          staffPresence = match.length;
        }

        const isHarian = kar.tipe_gaji === 'harian';
        const upahRate = kar.gaji_harian || 100000;

        const gajiPokok = isHarian ? (staffPresence * upahRate) : kar.gaji_pokok;
        const tunjangan = 0; // Langsung gaji harian bersih tanpa pecahan uang makan
        const gajiBersih = gajiPokok - totalKasbon;

        const draft: Payroll = {
          id: `pay-${kar.id}-${payrollMode}-${payrollSingleDate || payrollMonth}`,
          karyawan_id: kar.id,
          karyawan_nama: kar.nama,
          karyawan_role: kar.role,
          karyawan_telepon: kar.telepon,
          cabang_id: kar.cabang_id,
          cabang_nama: branch?.nama || 'Cabang',
          slip_no: `SLIP/${payrollYear}${String(payrollMonth).padStart(2, '0')}/${kar.nama.split(' ')[0]?.toUpperCase() || 'STF'}`,
          periode_bulan: payrollMonth,
          periode_tahun: payrollYear,
          tipe_gaji: kar.tipe_gaji || 'harian',
          total_kehadiran_hari: staffPresence,
          upah_harian: upahRate,
          gaji_pokok: gajiPokok,
          tunjangan: 0,
          potongan_kasbon: totalKasbon,
          gaji_bersih: Math.max(0, gajiBersih),
          status: 'draft',
          tanggal_kunci: new Date().toISOString(),
          kasbon_details: unsettled,
        };

        return draft;
      });
  }, [karyawanList, cabangList, expenseList, absensiList, payrollMode, payrollSingleDate, payrollStartDate, payrollEndDate, payrollMonth, payrollYear, payrollBranchFilter]);

  const handleLockPayroll = async () => {
    const confirmLock = confirm(
      `Apakah Anda yakin ingin MENGUNCI GAJI (${payrollDateLabel})?\n\n` +
      `Seluruh kasbon yang disetujui periode ini akan otomatis ditandai LUNAS (is_settled: true), ` +
      `dan saldo kasbon karyawan untuk periode berikutnya kembali Rp 0.`
    );
    if (!confirmLock) return;

    await db.lockPayroll(calculatedPayrollDrafts);
    alert(`Gaji periode (${payrollDateLabel}) berhasil dikunci dan slip mutasi digital resmi diterbitkan!`);
    await refreshAllData();
  };

  // --------------------------------------------------------------------------
  // KALKULASI FIXED COST & UANG MASUK BERSIH REKENING BOSS (10 CABANG HARIAN)
  // --------------------------------------------------------------------------
  const bossDailyProfits = useMemo(() => {
    const targetDate = selectedBossSummaryDate;
    const menuHppMap: Record<string, number> = {};
    menuList.forEach(m => { menuHppMap[m.id] = m.hpp || 4000; });

    const branchBreakdowns = cabangList.map(cabang => {
      // 1. Sewa, Wifi/Listrik, Iuran Harian (Bulanan / 30)
      const sewaHarian = Math.round((cabang.sewa_bulanan || 3000000) / 30);
      const wifiListrikHarian = Math.round((cabang.listrik_air_bulanan || 600000) / 30);
      const iuranHarian = Math.round((cabang.iuran_kebersihan_bulanan || 150000) / 30);

      // 2. Upah Karyawan Hadir Hari Ini (Absensi Tulis Nama)
      const branchAbsensi = absensiList.filter(a => a.cabang_id === cabang.id && a.tanggal === targetDate);
      const totalGajiKaryawan = branchAbsensi.reduce((sum, a) => sum + (a.upah_harian_terhitung || 0), 0);

      // 3. Omzet & Total HPP Bahan Baku Terpakai
      const branchTrx = transaksiList.filter(t => t.cabang_id === cabang.id && t.status === 'completed' && t.waktu.startsWith(targetDate));
      let omzetKotor = 0;
      let totalHppBahan = 0;

      branchTrx.forEach(trx => {
        omzetKotor += trx.total;
        trx.items.forEach(it => {
          totalHppBahan += (menuHppMap[it.menu_id] || 4000) * it.qty;
        });
      });

      // Total Potongan Harian = Sewa + Wifi/Listrik + Iuran + Gaji Karyawan + HPP Bahan
      const totalPotongan = sewaHarian + wifiListrikHarian + iuranHarian + totalGajiKaryawan + totalHppBahan;
      const uangBersihBoss = omzetKotor - totalPotongan;

      return {
        cabang,
        sewaHarian,
        wifiListrikHarian,
        iuranHarian,
        totalGajiKaryawan,
        totalHppBahan,
        totalPotongan,
        omzetKotor,
        uangBersihBoss,
        stafHadirCount: branchAbsensi.filter(a => a.status === 'hadir' || a.status === 'setengah_hari').length,
      };
    });

    const totalOmzet10Toko = branchBreakdowns.reduce((sum, b) => sum + b.omzetKotor, 0);
    const totalSewa10Toko = branchBreakdowns.reduce((sum, b) => sum + b.sewaHarian, 0);
    const totalWifiListrik10Toko = branchBreakdowns.reduce((sum, b) => sum + b.wifiListrikHarian, 0);
    const totalIuran10Toko = branchBreakdowns.reduce((sum, b) => sum + b.iuranHarian, 0);
    const totalGaji10Toko = branchBreakdowns.reduce((sum, b) => sum + b.totalGajiKaryawan, 0);
    const totalHpp10Toko = branchBreakdowns.reduce((sum, b) => sum + b.totalHppBahan, 0);
    const totalPotongan10Toko = totalSewa10Toko + totalWifiListrik10Toko + totalIuran10Toko + totalGaji10Toko + totalHpp10Toko;
    const totalBersihBoss10Toko = totalOmzet10Toko - totalPotongan10Toko;

    return {
      date: targetDate,
      branchBreakdowns,
      totalOmzet10Toko,
      totalSewa10Toko,
      totalWifiListrik10Toko,
      totalIuran10Toko,
      totalGaji10Toko,
      totalHpp10Toko,
      totalPotongan10Toko,
      totalBersihBoss10Toko,
    };
  }, [cabangList, menuList, absensiList, transaksiList, selectedBossSummaryDate]);

  // --------------------------------------------------------------------------
  // REKAPITULASI BAHAN 10 CABANG DARI DATA KASIR DI TEMPAT & KIRIMAN PUSAT
  // --------------------------------------------------------------------------
  const materialAuditRows = useMemo(() => {
    const targetBranches = selectedBahanCabangId === 'all' 
      ? cabangList 
      : cabangList.filter(c => c.id === selectedBahanCabangId);

    const rows: {
      cabang: Cabang;
      bahan: BahanBaku;
      stokAwal: number;
      kirimanPusat: number;
      terpakaiKasir: number;
      sisaSistem: number;
      sisaFisik: number;
      selisih: number;
      status: 'cocok' | 'selisih';
    }[] = [];

    targetBranches.forEach(cbg => {
      // Transaksi cabang ini pada selectedBahanDate
      const cbgTrx = transaksiList.filter(t => t.cabang_id === cbg.id && t.status === 'completed' && t.waktu.startsWith(selectedBahanDate));
      const terpakaiMap: Record<string, number> = {};
      cbgTrx.forEach(trx => {
        trx.items.forEach(it => {
          if (it.nama_menu.toLowerCase().includes('serabi')) {
            terpakaiMap['bh-1'] = (terpakaiMap['bh-1'] || 0) + it.qty;
            terpakaiMap['bh-11'] = (terpakaiMap['bh-11'] || 0) + it.qty;
            if (it.nama_menu.toLowerCase().includes('durian')) terpakaiMap['bh-2'] = (terpakaiMap['bh-2'] || 0) + it.qty;
            if (it.nama_menu.toLowerCase().includes('keju')) terpakaiMap['bh-3'] = (terpakaiMap['bh-3'] || 0) + it.qty;
            if (it.nama_menu.toLowerCase().includes('oncom')) terpakaiMap['bh-4'] = (terpakaiMap['bh-4'] || 0) + it.qty;
            if (it.nama_menu.toLowerCase().includes('cokelat')) terpakaiMap['bh-5'] = (terpakaiMap['bh-5'] || 0) + it.qty;
          } else if (it.nama_menu.toLowerCase().includes('wedang') || it.nama_menu.toLowerCase().includes('jahe')) {
            terpakaiMap['bh-7'] = (terpakaiMap['bh-7'] || 0) + it.qty;
            terpakaiMap['bh-11'] = (terpakaiMap['bh-11'] || 0) + it.qty;
            if (it.nama_menu.toLowerCase().includes('uwuh')) terpakaiMap['bh-8'] = (terpakaiMap['bh-8'] || 0) + it.qty;
            if (it.nama_menu.toLowerCase().includes('susu') || it.nama_menu.toLowerCase().includes('madu')) terpakaiMap['bh-10'] = (terpakaiMap['bh-10'] || 0) + it.qty;
          }
        });
      });

      // Kiriman bahan ke cabang ini pada tanggal ini
      const cbgKiriman = kirimanBahanList.filter(k => k.cabang_id === cbg.id && k.tanggal === selectedBahanDate);

      bahanList.forEach(bhn => {
        const kirimanTotal = cbgKiriman.filter(k => k.bahan_id === bhn.id).reduce((sum, k) => sum + k.jumlah, 0);
        const terpakai = terpakaiMap[bhn.id] || 0;
        const stokAwal = bhn.stok_minimum || 20;
        const sisaSistem = stokAwal + kirimanTotal - terpakai;
        const sisaFisik = sisaSistem;
        const selisih = sisaFisik - sisaSistem;

        rows.push({
          cabang: cbg,
          bahan: bhn,
          stokAwal,
          kirimanPusat: kirimanTotal,
          terpakaiKasir: terpakai,
          sisaSistem,
          sisaFisik,
          selisih,
          status: selisih === 0 ? 'cocok' : 'selisih',
        });
      });
    });

    return rows;
  }, [selectedBahanCabangId, selectedBahanDate, cabangList, bahanList, kirimanBahanList, transaksiList]);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-bounce">🌿</div>
          <p className="text-xs font-bold text-slate-400">Memeriksa otorisasi Owner Pak Agan...</p>
        </div>
      </div>
    );
  }

  // AUTHENTICATED: DEDICATED LEFT SIDEBAR FINTECH BACKOFFICE
  return (
    <div className="min-h-screen bg-fintech-bg flex flex-col md:flex-row text-slate-800">
      
      {/* 1. DEDICATED FINTECH LEFT SIDEBAR */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingCount={pendingExpenses.length}
        onLogout={handleLogoutOwner}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6 overflow-y-auto">
        
        {/* Mobile Top Navigation Header */}
        <div className="md:hidden bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-soft-sm flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-950 flex items-center justify-center text-white shadow-sm shrink-0">
              <span className="text-sm font-bold">🥞</span>
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-slate-900 text-xs block leading-tight truncate">
                SERABI BAWEL PUSAT
              </span>
              <span className="text-[10px] text-emerald-700 font-bold capitalize truncate block">
                {activeTab === 'ringkasan' ? 'Ringkasan & Mutasi' :
                 activeTab === 'absensi' ? 'Monitor Presensi Cabang' :
                 activeTab === 'menu' ? 'Master Menu & Resep' :
                 activeTab === 'karyawan' ? 'Data Pekerja' :
                 activeTab === 'approval' ? 'Pusat Persetujuan' :
                 activeTab === 'gaji' ? 'Belanja & Kas Kecil' : 'Rekap Gaji & Saldo'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md shadow-emerald-900/20 btn-tactile shrink-0"
          >
            <Menu className="w-3.5 h-3.5" />
            <span>Menu Admin</span>
            {pendingExpenses.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
            )}
          </button>
        </div>

        {/* Top Header Bar inside Dashboard */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-soft-sm">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-primary animate-pulse" />
              <span className="text-[11px] uppercase font-extrabold tracking-widest text-slate-400">
                Pusat Kendali Eksekutif Multi-Cabang
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              Dashboard Keuangan &amp; Manajemen Herbal Pak Agan
            </h1>
          </div>

          {/* Controls: Branch Filter & Reset Mulai dari 0 */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto w-full md:w-auto">
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-slate-200 w-full sm:w-auto">
              <Store className="w-4 h-4 text-brand-primary shrink-0" />
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Filter Outlet:</span>
              <select
                value={selectedCabangId}
                onChange={(e) => setSelectedCabangId(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-slate-800 outline-none cursor-pointer flex-1 sm:flex-initial"
              >
                <option value="all">Semua Cabang ({cabangList.length || 10} Cabang Resmi)</option>
                {cabangList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.kode} - {c.nama.split('-')[1]?.trim() || c.nama}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowDailyReportModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm text-xs font-bold transition-all btn-tactile w-full sm:w-auto justify-center"
              title="Buka Laporan Rekonsiliasi Harian Kas & Bank (Cetak PDF & Kirim WA)"
            >
              <FileText className="w-3.5 h-3.5 text-accent-gold" />
              <span>Laporan Harian PDF &amp; Bank</span>
            </button>

            <button
              type="button"
              onClick={handleLoadDemoWeek}
              className="flex items-center space-x-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-700/20 text-xs font-bold transition-all btn-tactile w-full sm:w-auto justify-center"
              title="Muat data simulasi lengkap 1 minggu penuh (19 - 25 Okt 2026) untuk mencoba kasbon, approval, & payroll"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Muat Data Uji Coba 1 Minggu</span>
            </button>

            <button
              type="button"
              onClick={handleResetDatabase}
              className="flex items-center space-x-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all btn-tactile w-full sm:w-auto justify-center"
              title="Kosongkan database transaksi, kasbon, dan staf kasir untuk mulai murni dari 0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Reset Mulai dari 0</span>
            </button>
          </div>
        </div>

        {/* 4 FINTECH METRIC STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Omzet */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-soft-sm hover:shadow-soft-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Omzet Penjualan</span>
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                <TrendingUp className="w-3 h-3" />
                <span>+14.8%</span>
              </span>
            </div>
            <div className="text-2xl font-mono font-extrabold text-brand-dark tabular-nums tracking-tight mt-2">
              {formatRupiah(totalOmzetGlobal)}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
              <span>Target: Rp 350.000.000</span>
              <span className="font-bold text-slate-600">{cabangList.length || 10} Cabang Resmi</span>
            </div>
          </div>

          {/* Card 2: Total Transaksi */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-soft-sm hover:shadow-soft-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Volume Transaksi</span>
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                <TrendingUp className="w-3 h-3" />
                <span>+8.2%</span>
              </span>
            </div>
            <div className="text-2xl font-mono font-extrabold text-slate-900 tabular-nums tracking-tight mt-2">
              {totalTransaksiCount} Pesanan
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
              <span>Rata-rata: {formatRupiah(totalTransaksiCount > 0 ? totalOmzetGlobal / totalTransaksiCount : 0)}</span>
              <span className="font-bold text-brand-primary">Lancar</span>
            </div>
          </div>

          {/* Card 3: Pending Approval */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-soft-sm hover:shadow-soft-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approval Menunggu</span>
              {pendingExpenses.length > 0 ? (
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-50 text-accent-gold text-[10px] font-extrabold border border-amber-200 animate-pulse">
                  <Clock className="w-3 h-3" />
                  <span>Perlu Aksi</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                  Nihil
                </span>
              )}
            </div>
            <div className="text-2xl font-mono font-extrabold text-accent-gold tabular-nums tracking-tight mt-2">
              {pendingExpenses.length} Pengajuan
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
              <span>Belanja Toko & Kasbon</span>
              <button 
                onClick={() => setActiveTab('approval')}
                className="font-bold text-accent-gold hover:underline text-xs"
              >
                Tinjau Sekarang →
              </button>
            </div>
          </div>

          {/* Card 4: Kasbon Belum Lunas */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-soft-sm hover:shadow-soft-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kasbon Berjalan</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-extrabold border border-blue-200">
                Unsettled
              </span>
            </div>
            <div className="text-2xl font-mono font-extrabold text-blue-800 tabular-nums tracking-tight mt-2">
              {formatRupiah(totalUnsettledKasbon)}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
              <span>Potongan Payroll</span>
              <button 
                onClick={() => setActiveTab('payroll')}
                className="font-bold text-blue-700 hover:underline text-xs"
              >
                Lihat Payroll →
              </button>
            </div>
          </div>

        </div>

        {/* TAB 1: RINGKASAN & MUTASI */}
        {activeTab === 'ringkasan' && (
          <div className="space-y-6">
            
            {/* DASHBOARD BOSS SENIOR-FRIENDLY & MODERN (PAK AGAN) */}
            <SeniorBossDashboard
              cabangList={cabangList}
              selectedCabangId={selectedCabangId}
              onSelectCabangId={(id) => setSelectedCabangId(id)}
              onEditCabang={(cbg) => setSelectedCabangForEdit(cbg)}
              selectedDate={selectedBossSummaryDate}
              onDateChange={(dt) => setSelectedBossSummaryDate(dt)}
              transaksiList={transaksiList}
              karyawanList={karyawanList}
              absensiList={absensiList}
              menuList={menuList}
              bahanList={bahanList}
              kirimanBahanList={kirimanBahanList}
              onOpenKirimanModal={(cbgId) => {
                if (cbgId) setSelectedBahanCabangId(cbgId);
                setShowKirimanModal(true);
              }}
              onRefreshData={refreshAllData}
              onOpenReportModal={() => setShowDailyReportModal(true)}
            />

            {/* PUSAT KENDALI 10 CABANG TERPADU (ALL-IN-ONE MASTER HUB) */}
            <UnifiedBranchTable
              cabangList={cabangList}
              karyawanList={karyawanList}
              transaksiList={transaksiList}
              bossDailyProfits={bossDailyProfits}
              materialAuditRows={materialAuditRows}
              selectedDate={selectedBossSummaryDate}
              onDateChange={setSelectedBossSummaryDate}
              onEditCabang={(cbg) => setSelectedCabangForEdit(cbg)}
              onAddNewCabang={() => setIsAddingNewCabang(true)}
              onResetDefaultCabang={async () => {
                if (confirm('Kembalikan data 10 cabang ke default resmi bawaan?')) {
                  await db.resetCabangDefault();
                  await refreshAllData();
                }
              }}
              onSelectCabang={(id) => setSelectedCabangId(id)}
              selectedCabangId={selectedCabangId}
              onOpenKirimanBahanModal={(cbgId) => {
                if (cbgId) setSelectedBahanCabangId(cbgId);
                setShowKirimanModal(true);
              }}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />

            {/* Mutasi Transaksi Feed */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center space-x-2">
                  <Receipt className="w-4 h-4 text-brand-primary" />
                  <h3 className="text-sm font-extrabold text-slate-900">Buku Mutasi Penjualan (Bank-Grade Statement)</h3>
                </div>
                <span className="text-xs text-slate-500 font-mono font-semibold">
                  {filteredTransaksi.length} Data Transaksi
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 text-[10px]">
                    <tr>
                      <th className="py-3 px-4">No. Invoice & Waktu</th>
                      <th className="py-3 px-4">Cabang Outlet</th>
                      <th className="py-3 px-4">Kasir & Pelanggan</th>
                      <th className="py-3 px-4">Item Pesanan</th>
                      <th className="py-3 px-4">Metode Bayar</th>
                      <th className="py-3 px-4 text-right">Nominal Tagihan</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransaksi.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                              <Receipt className="w-6 h-6" />
                            </div>
                            <span className="font-extrabold text-slate-700 text-sm">Belum Ada Transaksi Penjualan (Mulai dari 0)</span>
                            <span className="text-slate-400 max-w-sm text-center">
                              Seluruh transaksi saat ini Rp 0. Silakan buka shift kasir di menu POS tablet untuk melayani pesanan pertama.
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredTransaksi.map(trx => (
                      <tr key={trx.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-900 block">{trx.invoice_no}</span>
                          <span className="text-[10px] text-slate-400">{formatWaktu(trx.waktu)}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {trx.cabang_nama?.split('-')[1]?.trim() || trx.cabang_nama || 'Cabang'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{trx.nama_pelanggan}</span>
                          <span className="text-[10px] text-slate-500">Kasir: {trx.karyawan_nama || 'Staf'}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate">
                          {trx.items?.map(it => `${it.qty}x ${it.nama_menu}`).join(', ') || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] border ${
                            trx.metode_bayar === 'tunai'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : trx.metode_bayar === 'qris'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {trx.metode_bayar}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-brand-dark tabular-nums text-sm">
                          {formatRupiah(trx.total)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold">
                            SUCCESS
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: APPROVAL CENTER */}
        {activeTab === 'approval' && (
          <div className="space-y-4">
            {/* Header & Print Action Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Approval Center: Belanja Operasional &amp; Kasbon Staf
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Persetujuan pencairan dana dari tablet kasir dengan metode Kas Laci atau Transfer Bank. Audit jejak tanggal lengkap dan siap cetak PDF.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2.5">
                <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{pendingExpenses.length} Menunggu Persetujuan</span>
                </span>

                <button
                  type="button"
                  onClick={() => setShowApprovalReportModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md shadow-emerald-700/25 transition btn-tactile flex items-center space-x-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Rekapitulasi (PDF)</span>
                </button>
              </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                
                {/* Tanggal Filter & Mode Pill */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl font-bold border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setApprovalDateMode('selected')}
                      className={`px-3 py-1 rounded-lg transition-all flex items-center space-x-1.5 ${
                        approvalDateMode === 'selected'
                          ? 'bg-white text-emerald-800 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>📅</span>
                      <span>Tanggal Terpilih</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setApprovalDateMode('all')}
                      className={`px-3 py-1 rounded-lg transition-all flex items-center space-x-1.5 ${
                        approvalDateMode === 'all'
                          ? 'bg-white text-emerald-800 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>📋</span>
                      <span>Semua Tanggal</span>
                    </button>
                  </div>

                  <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border transition ${
                    approvalDateMode === 'selected'
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-600">Pilih:</span>
                    <input
                      type="date"
                      value={approvalDateFilter}
                      onChange={(e) => {
                        setApprovalDateFilter(e.target.value);
                        setApprovalDateMode('selected');
                      }}
                      className="bg-transparent font-mono font-bold text-slate-800 outline-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Dropdown Filters: Status, Cabang, Jenis */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Filter */}
                  <select
                    value={approvalStatusFilter}
                    onChange={(e) => setApprovalStatusFilter(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 font-bold text-slate-800 px-3 py-1.5 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="all">⚡ Semua Status</option>
                    <option value="pending">⏳ Menunggu (Pending)</option>
                    <option value="approved">✅ Disetujui (Approved)</option>
                    <option value="rejected">❌ Ditolak (Rejected)</option>
                  </select>

                  {/* Cabang Filter */}
                  <select
                    value={approvalCabangFilter}
                    onChange={(e) => setApprovalCabangFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 font-bold text-slate-800 px-3 py-1.5 rounded-xl outline-none cursor-pointer max-w-[160px] truncate"
                  >
                    <option value="all">🏢 Semua Cabang</option>
                    {cabangList.map(c => (
                      <option key={c.id} value={c.id}>{c.nama}</option>
                    ))}
                  </select>

                  {/* Jenis Filter */}
                  <select
                    value={approvalJenisFilter}
                    onChange={(e) => setApprovalJenisFilter(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 font-bold text-slate-800 px-3 py-1.5 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="all">🏷️ Semua Jenis</option>
                    <option value="belanja">🛒 Belanja Toko</option>
                    <option value="kasbon">💸 Kasbon Staf</option>
                  </select>

                  {/* Search Input */}
                  <input
                    type="text"
                    value={approvalSearch}
                    onChange={(e) => setApprovalSearch(e.target.value)}
                    placeholder="Cari keperluan / nama..."
                    className="bg-slate-50 border border-slate-200 font-medium text-slate-800 px-3 py-1.5 rounded-xl outline-none w-44 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

              </div>
            </div>

            {/* Approval Table with Audit Trail */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm overflow-hidden space-y-4 p-5">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-extrabold text-slate-900">
                    {approvalDateMode === 'selected'
                      ? `Log Pengajuan & Approval Tanggal ${approvalDateFilter}`
                      : 'Log Pengajuan & Approval Seluruh Riwayat'}
                  </span>
                  {approvalDateMode === 'selected' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                      Filter Tanggal Aktif
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-mono font-bold text-slate-500">
                    {filteredApprovalExpenses.length} Transaksi Terfilter
                  </span>
                  {approvalDateMode === 'selected' && (
                    <button
                      type="button"
                      onClick={() => setApprovalDateMode('all')}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                    >
                      Lihat Semua Tanggal
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Waktu &amp; Cabang</th>
                      <th className="py-3 px-4">Pemohon</th>
                      <th className="py-3 px-4 text-center">Jenis</th>
                      <th className="py-3 px-4">Keperluan &amp; Rincian</th>
                      <th className="py-3 px-4 text-right">Nominal</th>
                      <th className="py-3 px-4">Status &amp; Metode</th>
                      <th className="py-3 px-4">Jejak Approval (Audit Trail)</th>
                      <th className="py-3 px-4 text-center">Tindakan Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredApprovalExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-bold text-slate-700 text-xs">
                            Tidak ada data pengajuan belanja atau kasbon yang cocok dengan filter.
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                            Ganti tanggal atau ubah pilihan status untuk melihat transaksi lainnya.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setApprovalDateMode('all');
                              setApprovalStatusFilter('all');
                              setApprovalJenisFilter('all');
                              setApprovalCabangFilter('all');
                              setApprovalSearch('');
                            }}
                            className="mt-3 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center gap-1.5 transition btn-tactile border border-slate-300"
                          >
                            <span>Reset Seluruh Filter</span>
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredApprovalExpenses.map(exp => (
                        <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{exp.cabang_nama}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formatWaktu(exp.tanggal)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-800 block">{exp.pemohon_nama}</span>
                            {exp.pemohon_telepon && (
                              <span className="text-[10px] text-slate-400 font-mono">{exp.pemohon_telepon}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border inline-block ${
                              exp.jenis === 'belanja'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {exp.jenis}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium max-w-xs leading-snug">
                            <div>{exp.keperluan}</div>
                            {exp.alasan_penolakan && (
                              <div className="text-[10px] text-rose-600 mt-0.5 font-bold italic">
                                Alasan tolak: {exp.alasan_penolakan}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-brand-dark tabular-nums text-sm">
                            {formatRupiah(exp.nominal)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border inline-block ${
                                exp.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : exp.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {exp.status === 'approved' ? '✓ APPROVED' : exp.status === 'rejected' ? '✗ REJECTED' : '⏳ PENDING'}
                              </span>
                              {exp.metode_pencairan && (
                                <span className="text-[9px] text-slate-400 block font-medium">
                                  Via: {exp.metode_pencairan === 'laci' ? 'Kas Laci Outlet' : 'Transfer Bank'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[11px]">
                            {exp.status === 'approved' ? (
                              <div className="space-y-0.5">
                                <span className="font-bold text-emerald-800 block">
                                  {exp.approved_by || 'Pak Agan (Owner)'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  📅 {exp.approved_at ? formatWaktu(exp.approved_at) : formatWaktu(exp.tanggal)}
                                </span>
                              </div>
                            ) : exp.status === 'rejected' ? (
                              <div className="space-y-0.5">
                                <span className="font-bold text-rose-700 block">
                                  {exp.approved_by || 'Pak Agan (Owner)'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  📅 {exp.approved_at ? formatWaktu(exp.approved_at) : formatWaktu(exp.tanggal)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-amber-700 font-bold text-[10px] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block">
                                Menunggu Validasi
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {exp.status === 'pending' ? (
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  onClick={() => setSelectedExpenseForApproval(exp)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs btn-tactile shadow-sm shadow-emerald-700/20 transition-all"
                                >
                                  Setujui
                                </button>
                                <button
                                  onClick={async () => {
                                    const alasan = prompt('Alasan penolakan pengeluaran ini:', 'Di luar anggaran operasional');
                                    if (alasan) {
                                      await db.rejectPengeluaran(exp.id, alasan);
                                      await refreshAllData();
                                    }
                                  }}
                                  className="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors"
                                >
                                  Tolak
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px] font-mono">
                                ✓ Tuntas
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2.5: BUKU BELANJA KEBUTUHAN & KAS KECIL 10 CABANG (ALA ABDI MEMBANGUN) */}
        {activeTab === 'gaji' && (
          <div className="space-y-5">
            {/* Top Bar Title & Explanation */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Buku Belanja Kebutuhan &amp; Kas Kecil 10 Cabang
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pencatatan uang kas kasir laci toko yang diambil untuk belanja bahan/kebutuhan cabang (gas, es batu, kemasan) &amp; kasbon staf. Wajib di-approve sebelum dicairkan.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateExpenseModal(true)}
                  className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-dark text-white font-extrabold text-xs shadow-md shadow-brand-dark/20 btn-tactile flex items-center space-x-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Catat Belanja Kas Kecil</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-soft-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Belanja Toko (Disetujui)
                </span>
                <div className="text-xl font-mono font-extrabold text-emerald-800 mt-1 tabular-nums">
                  {formatRupiah(
                    expenseList
                      .filter(e => e.jenis === 'belanja' && e.status === 'approved' && (belanjaCabangFilter === 'all' || e.cabang_id === belanjaCabangFilter))
                      .reduce((sum, e) => sum + e.nominal, 0)
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Bahan baku, gas LPG, es batu &amp; kemasan
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-soft-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Kasbon Staf (Disetujui)
                </span>
                <div className="text-xl font-mono font-extrabold text-amber-700 mt-1 tabular-nums">
                  {formatRupiah(
                    expenseList
                      .filter(e => e.jenis === 'kasbon' && e.status === 'approved' && (belanjaCabangFilter === 'all' || e.cabang_id === belanjaCabangFilter))
                      .reduce((sum, e) => sum + e.nominal, 0)
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Akan dipotong saat payroll tutup buku
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-soft-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Menunggu Persetujuan Pusat
                </span>
                <div className="text-xl font-mono font-extrabold text-rose-600 mt-1 tabular-nums">
                  {
                    expenseList
                      .filter(e => e.status === 'pending' && (belanjaCabangFilter === 'all' || e.cabang_id === belanjaCabangFilter))
                      .length
                  } Pengajuan
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Butuh tindakan di Approval Center
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-soft-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Potong Kas Laci Kasir Cabang
                </span>
                <div className="text-xl font-mono font-extrabold text-brand-dark mt-1 tabular-nums">
                  {formatRupiah(
                    expenseList
                      .filter(e => e.status === 'approved' && e.metode_pencairan === 'laci' && (belanjaCabangFilter === 'all' || e.cabang_id === belanjaCabangFilter))
                      .reduce((sum, e) => sum + e.nominal, 0)
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Mengurangi saldo kas fisik kasir
                </span>
              </div>
            </div>

            {/* Filter Bar & Belanja Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm overflow-hidden space-y-4 p-5">
              
              {/* Filter Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b pb-4 border-slate-100 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Cabang Filter */}
                  <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 font-bold">
                    <Building2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    <select
                      value={belanjaCabangFilter}
                      onChange={(e) => setBelanjaCabangFilter(e.target.value)}
                      className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer max-w-[170px] truncate"
                    >
                      <option value="all">🏢 Semua Cabang ({cabangList.length || 10} Cabang Resmi)</option>
                      {cabangList.map(c => (
                        <option key={c.id} value={c.id}>{c.nama}</option>
                      ))}
                    </select>
                  </div>

                  {/* Jenis Filter */}
                  <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 font-bold">
                    <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <select
                      value={belanjaJenisFilter}
                      onChange={(e) => setBelanjaJenisFilter(e.target.value as any)}
                      className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="all">Semua Jenis</option>
                      <option value="belanja">Belanja Toko (Bahan/Gas/Es)</option>
                      <option value="kasbon">Kasbon Staf Cabang</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 font-bold">
                    <select
                      value={belanjaStatusFilter}
                      onChange={(e) => setBelanjaStatusFilter(e.target.value as any)}
                      className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="all">Semua Status</option>
                      <option value="approved">✓ Disetujui (Approved)</option>
                      <option value="pending">⏳ Menunggu Persetujuan</option>
                      <option value="rejected">✕ Ditolak</option>
                    </select>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari rincian belanja, nama pemohon..."
                    value={belanjaSearch}
                    onChange={(e) => setBelanjaSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-primary w-64 font-medium"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                </div>
              </div>

              {/* Table Data */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 text-[10px]">
                    <tr>
                      <th className="py-3 px-3">Tanggal &amp; Waktu</th>
                      <th className="py-3 px-3">Cabang &amp; Pemohon</th>
                      <th className="py-3 px-3">Kategori</th>
                      <th className="py-3 px-3">Rincian Belanja / Kebutuhan</th>
                      <th className="py-3 px-3 text-right">Nominal</th>
                      <th className="py-3 px-3">Sumber Dana</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Aksi &amp; Notifikasi WA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBelanjaList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                          Tidak ada data belanja atau kas kecil yang sesuai dengan filter.
                        </td>
                      </tr>
                    ) : (
                      filteredBelanjaList.map(exp => {
                        const branch = cabangList.find(c => c.id === exp.cabang_id);
                        const isLaci = exp.metode_pencairan === 'laci';

                        return (
                          <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="font-mono text-slate-800 font-bold block">
                                {new Date(exp.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(exp.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                              </span>
                            </td>

                            <td className="py-3 px-3">
                              <span className="font-extrabold text-slate-900 block">{exp.pemohon_nama}</span>
                              <span className="text-[10px] text-slate-500">
                                {branch?.nama || exp.cabang_nama || 'Cabang'}
                              </span>
                            </td>

                            <td className="py-3 px-3 whitespace-nowrap">
                              {exp.jenis === 'belanja' ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                  <span>🛍️ Belanja Toko</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                  <span>💰 Kasbon Staf</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 max-w-xs">
                              <span className="font-bold text-slate-800 block text-xs">
                                {exp.keperluan}
                              </span>
                              {exp.alasan_penolakan && (
                                <span className="text-[10px] text-rose-600 block mt-0.5">
                                  Alasan Ditolak: {exp.alasan_penolakan}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900 tabular-nums">
                              {formatRupiah(exp.nominal)}
                            </td>

                            <td className="py-3 px-3 whitespace-nowrap">
                              {isLaci ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                                  <span>💵 Kas Laci Toko</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-900 text-[10px] font-bold">
                                  <span>🏦 Transfer Bank</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {exp.status === 'approved' ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold">
                                  <span>✓ Disetujui</span>
                                </span>
                              ) : exp.status === 'pending' ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold animate-pulse">
                                  <span>⏳ Menunggu Approval</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                  <span>✕ Ditolak</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center space-x-1.5">
                                {exp.status === 'pending' ? (
                                  <button
                                    onClick={() => setSelectedExpenseForApproval(exp)}
                                    className="px-3 py-1.5 text-xs font-extrabold text-white bg-brand-primary hover:bg-brand-dark rounded-xl transition-all shadow-sm btn-tactile"
                                  >
                                    Review &amp; Setujui
                                  </button>
                                ) : exp.status === 'approved' ? (
                                  <button
                                    onClick={() => {
                                      const phone = exp.pemohon_telepon || '0813-1111-2222';
                                      const cleanPhone = phone.replace(/[^0-9]/g, '');
                                      const intlPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
                                      const msg = [
                                        `*BUKTI PERSETUJUAN PENGELUARAN KAS KECIL - SERABI BAWEL & WEDANG GEPREK*`,
                                        `-----------------------------------------`,
                                        `Halo Sdr/i *${exp.pemohon_nama}*, pengeluaran kas kecil cabang Anda telah *DISETUJUI* oleh Admin Pusat / Pak Agan:`,
                                        ``,
                                        `🏢 *Cabang:* ${branch?.nama || exp.cabang_nama || 'Outlet'}`,
                                        `🔖 *Kategori:* ${exp.jenis === 'belanja' ? 'BELANJA OPERASIONAL TOKO' : 'KASBON STAF'}`,
                                        `📝 *Rincian:* ${exp.keperluan}`,
                                        `💰 *Nominal Disetujui:* ${formatRupiah(exp.nominal)}`,
                                        `💳 *Sumber Dana:* ${exp.metode_pencairan === 'laci' ? 'Potong Kas Laci Kasir (Cash Drawer)' : 'Transfer Bank Rekening'}`,
                                        `📅 *Status:* SUDAH DISETUJUI & SIAP DICATAT SAAT TUTUP SHIFT`,
                                        ``,
                                        `_Pesan otomatis resmi dari Backoffice Serabi Bawel & Wedang Geprek._`
                                      ].join('\n');
                                      window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                    }}
                                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs font-bold transition-all shadow-sm btn-tactile"
                                    title="Kirim Konfirmasi Bukti Persetujuan Langsung ke WhatsApp PJ/Kasir"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5 fill-white" />
                                    <span>Kirim WA</span>
                                  </button>
                                ) : (
                                  <span className="text-slate-400 text-xs">-</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-start space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Sinkronisasi Otomatis dengan Laci Kasir &amp; Payroll:</span>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  Semua pengeluaran belanja berlabel <strong>Kas Laci Toko</strong> yang telah disetujui otomatis memotong perhitungan uang fisik laci kasir saat kasir melakukan <strong>Tutup Shift Laci (/pos)</strong>. Sedangkan pengeluaran berlabel <strong>Kasbon Staf</strong> otomatis tercatat pada slip gaji karyawan dan dilunasi saat Admin Pusat menekan <strong>Kunci Gaji Periode Ini (/admin tab Rekap Gaji &amp; Saldo)</strong>.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* TAB: MONITOR ABSENSI 10 CABANG (ALA ABDI MEMBANGUN) */}
        {activeTab === 'absensi' && (
          <div className="space-y-5">
            {/* Top Bar Filter & Title */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <CalendarCheck className="w-4 h-4 text-brand-primary" />
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Pusat Rekap Presensi & Kehadiran 10 Cabang
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Presensi dicatat dan divalidasi langsung oleh Admin Cabang / Kepala Outlet (ala Abdi Membangun)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                {/* Mode Selector Pill: Tanggal Terpilih vs Semua Tanggal */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setAbsensiDateFilterMode('selected')}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center space-x-1.5 ${
                      absensiDateFilterMode === 'selected'
                        ? 'bg-white text-emerald-800 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>📅</span>
                    <span>Tanggal Ini</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbsensiDateFilterMode('all')}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center space-x-1.5 ${
                      absensiDateFilterMode === 'all'
                        ? 'bg-white text-emerald-800 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>📋</span>
                    <span>Semua Tanggal</span>
                  </button>
                </div>

                {/* Date Picker Input */}
                <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border transition ${
                  absensiDateFilterMode === 'selected'
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-slate-600">Tanggal:</span>
                  <input
                    type="date"
                    value={selectedAbsensiDate}
                    onChange={(e) => {
                      setSelectedAbsensiDate(e.target.value);
                      setAbsensiDateFilterMode('selected');
                    }}
                    className="bg-transparent font-mono font-bold text-slate-800 outline-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Attendance Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-soft-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Hadir Tanggal Terpilih ({selectedAbsensiDate})
                </span>
                <div className="text-2xl font-mono font-extrabold text-emerald-800 mt-1 tabular-nums">
                  {absensiList.filter(a => a.tanggal === selectedAbsensiDate && a.status === 'hadir' && (selectedCabangId === 'all' || a.cabang_id === selectedCabangId)).length} Staf
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Presensi diverifikasi oleh Kepala Cabang
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-soft-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Staf Terdaftar Outlet
                </span>
                <div className="text-2xl font-mono font-extrabold text-slate-800 mt-1 tabular-nums">
                  {karyawanList.filter(k => k.role !== 'owner' && (selectedCabangId === 'all' || k.cabang_id === selectedCabangId)).length} Staf
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Terbagi di {selectedCabangId === 'all' ? '10 Cabang Resmi' : 'Cabang Terpilih'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-soft-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Kehadiran Bulan Berjalan
                </span>
                <div className="text-2xl font-mono font-extrabold text-brand-dark mt-1 tabular-nums">
                  {absensiList.filter(a => a.status === 'hadir' && (selectedCabangId === 'all' || a.cabang_id === selectedCabangId)).length} Hari Kerja
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Akumulasi upah harian otomatis dihitung
                </span>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/60">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-extrabold text-slate-900">
                    {absensiDateFilterMode === 'selected'
                      ? `Log Presensi Karyawan Tanggal ${selectedAbsensiDate}`
                      : 'Log Presensi Karyawan Seluruh Riwayat Tanggal'}
                  </span>
                  {absensiDateFilterMode === 'selected' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                      Sesuai Tanggal
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2.5">
                  <span className="text-[11px] font-mono font-bold text-slate-500">
                    {filteredAbsensiList.length} Baris Presensi
                  </span>
                  {absensiDateFilterMode === 'selected' && (
                    <button
                      type="button"
                      onClick={() => setAbsensiDateFilterMode('all')}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                    >
                      Tampilkan Semua
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Nama Staf & Jabatan</th>
                      <th className="py-3 px-4">Outlet Cabang</th>
                      <th className="py-3 px-4">Tanggal & Jam</th>
                      <th className="py-3 px-4">Status Kehadiran</th>
                      <th className="py-3 px-4 text-right">Upah Harian</th>
                      <th className="py-3 px-4">Divalidasi Oleh</th>
                      <th className="py-3 px-4">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAbsensiList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-bold text-slate-700 text-xs">
                            Belum ada catatan presensi pada tanggal {selectedAbsensiDate}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                            Silakan ganti tanggal di atas atau klik tombol di bawah untuk melihat seluruh log kehadiran staf.
                          </p>
                          <button
                            type="button"
                            onClick={() => setAbsensiDateFilterMode('all')}
                            className="mt-3 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center gap-1.5 transition btn-tactile border border-slate-300"
                          >
                            <span>📋</span>
                            <span>Tampilkan Semua Riwayat Tanggal</span>
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredAbsensiList.map(abs => {
                        const branch = cabangList.find(c => c.id === abs.cabang_id);
                        return (
                          <tr key={abs.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {abs.karyawan_nama}
                            </td>
                            <td className="py-3 px-4 text-slate-600 font-medium">
                              {branch?.nama.split('-')[1]?.trim() || branch?.nama || abs.cabang_nama}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                              {abs.tanggal} • {abs.jam_masuk} - {abs.jam_pulang || 'Shift Selesai'}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                                abs.status === 'hadir'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : abs.status === 'setengah_hari'
                                  ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                  : abs.status === 'sakit'
                                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                  : abs.status === 'izin'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}>
                                {abs.status === 'setengah_hari' ? '1/2 Hari' : abs.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 tabular-nums">
                              {formatRupiah(abs.upah_harian_terhitung || 100000)}
                            </td>
                            <td className="py-3 px-4 text-slate-600 font-medium text-[11px] flex items-center space-x-1">
                              <UserCheck className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                              <span>{abs.recorded_by || 'Admin Cabang'}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 italic text-[11px]">
                              {abs.catatan || '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start space-x-2">
              <ShieldCheck className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Sistem Presensi Anti-Kecurangan ala Abdi Membangun:</span>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Staf karyawan tidak bisa memanipulasi presensi sendiri. Setiap presensi diverifikasi langsung oleh Admin Cabang / Penanggung Jawab Outlet pada tablet kasir, dan secara realtime mengalir ke Modul Payroll Tutup Buku Pusat.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB: REKAPITULASI BAHAN 10 TOKO & DISTRIBUSI PUSAT */}
        {activeTab === 'bahan' && (
          <div className="space-y-5">
            {/* Top Bar Filter & Actions */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <PackageCheck className="w-5 h-5 text-emerald-700" />
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Rekapitulasi Absensi Bahan 10 Toko &amp; Pasokan Pusat
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pemakaian bahan ditarik otomatis dari transaksi kasir di tempat. Admin Pusat dapat menambahkan kiriman pasokan satu per satu.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                {/* Branch Selector */}
                <div className="flex items-center space-x-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  <Store className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-bold text-slate-700">Toko:</span>
                  <select
                    value={selectedBahanCabangId}
                    onChange={(e) => setSelectedBahanCabangId(e.target.value)}
                    className="bg-transparent font-bold text-slate-900 outline-none text-xs"
                  >
                    <option value="all">Semua 10 Toko</option>
                    {cabangList.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.kode} - {c.nama.split('-')[1]?.trim() || c.nama}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Picker */}
                <div className="flex items-center space-x-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-bold text-slate-700">Tanggal:</span>
                  <input
                    type="date"
                    value={selectedBahanDate}
                    onChange={(e) => setSelectedBahanDate(e.target.value)}
                    className="bg-transparent font-mono font-bold text-slate-900 outline-none text-xs"
                  />
                </div>

                {/* Tombol Input Kiriman Bahan Pusat */}
                <button
                  type="button"
                  onClick={() => setShowKirimanModal(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-sm transition-all btn-tactile"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Input Kiriman Bahan ke Toko</span>
                </button>
              </div>
            </div>

            {/* 4 Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-soft-sm">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">Total Baris Bahan</span>
                <div className="text-2xl font-mono font-black text-slate-900 mt-1">{materialAuditRows.length} Bahan</div>
                <span className="text-[10px] text-slate-500">Terpantau di 10 Toko</span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-soft-sm">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">Stok Cocok Pas</span>
                <div className="text-2xl font-mono font-black text-emerald-700 mt-1">
                  {materialAuditRows.filter(r => r.status === 'cocok').length} Bahan
                </div>
                <span className="text-[10px] text-emerald-600 font-bold">✅ Sisa Fisik == Sisa Sistem</span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-soft-sm">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">Selisih Dapur</span>
                <div className="text-2xl font-mono font-black text-amber-600 mt-1">
                  {materialAuditRows.filter(r => r.status === 'selisih').length} Bahan
                </div>
                <span className="text-[10px] text-amber-600 font-bold">⚠️ Perlu Rekonsiliasi</span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-soft-sm">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">Kiriman Pasokan Hari Ini</span>
                <div className="text-2xl font-mono font-black text-blue-700 mt-1">
                  {kirimanBahanList.filter(k => k.tanggal === selectedBahanDate).length} Batch
                </div>
                <span className="text-[10px] text-blue-600 font-bold">📦 Distribusi Pusat</span>
              </div>
            </div>

            {/* Tabel Rekapitulasi Bahan 10 Toko */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    Rekap Absensi Bahan per Toko ({selectedBahanDate})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Terhitung otomatis dari data POS kasir di masing-masing cabang
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Toko Cabang</th>
                      <th className="py-2.5 px-3">Nama Bahan Baku</th>
                      <th className="py-2.5 px-2 text-center">Stok Awal</th>
                      <th className="py-2.5 px-2 text-center text-blue-700">Kiriman Pusat</th>
                      <th className="py-2.5 px-2 text-center text-rose-700 bg-rose-50/60 font-black">Terpakai Kasir ⚡</th>
                      <th className="py-2.5 px-2 text-center text-slate-700">Sisa Sistem</th>
                      <th className="py-2.5 px-3 text-center bg-emerald-50 text-emerald-950 font-black">Sisa Fisik Dapur</th>
                      <th className="py-2.5 px-2 text-center">Selisih</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {materialAuditRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          Tidak ada data bahan pada filter cabang dan tanggal terpilih.
                        </td>
                      </tr>
                    ) : (
                      materialAuditRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                            <span className="font-extrabold text-slate-900">{row.cabang.kode}</span>
                            <span className="text-[10px] text-slate-500 block">{row.cabang.nama.split('-')[1]?.trim() || row.cabang.nama}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-800">{row.bahan.nama}</div>
                            <div className="text-[10px] text-slate-400">Satuan: {row.bahan.satuan}</div>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-600">{row.stokAwal}</td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-blue-700">
                            {row.kirimanPusat > 0 ? `+${row.kirimanPusat}` : '-'}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-black text-rose-700 bg-rose-50/30">
                            {row.terpakaiKasir > 0 ? `-${row.terpakaiKasir}` : '0'}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700">{row.sisaSistem}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-800 bg-emerald-50/40">
                            {row.sisaFisik} {row.bahan.satuan}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold">
                            {row.selisih === 0 ? <span className="text-slate-400">0</span> : row.selisih > 0 ? <span className="text-blue-600 font-black">+{row.selisih}</span> : <span className="text-rose-600 font-black">{row.selisih}</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {row.status === 'cocok' ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">
                                <span>✓ COCOK</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black border border-amber-300">
                                <span>⚠️ SELISIH</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Riwayat Kiriman Bahan dari Pusat */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm overflow-hidden p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    Riwayat Pasokan Kiriman Bahan dari Pusat ke Toko
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Daftar pengiriman bahan baku harian yang telah dikirimkan ke 10 cabang
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKirimanModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition-all"
                >
                  + Tambah Kiriman Lagi
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Tanggal Kirim</th>
                      <th className="py-2 px-3">Cabang Tujuan</th>
                      <th className="py-2 px-3">Bahan Baku</th>
                      <th className="py-2 px-3 text-right">Jumlah (Qty)</th>
                      <th className="py-2 px-3">Dikirim Oleh</th>
                      <th className="py-2 px-3">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kirimanBahanList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          Belum ada riwayat kiriman bahan.
                        </td>
                      </tr>
                    ) : (
                      kirimanBahanList.map(krm => (
                        <tr key={krm.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">{krm.tanggal}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{krm.cabang_nama || krm.cabang_id}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-800">{krm.bahan_nama}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                            +{krm.jumlah} <span className="font-normal text-[10px] text-slate-500">{krm.satuan}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">{krm.dikirim_oleh}</td>
                          <td className="py-2.5 px-3 text-slate-500 italic text-[11px]">{krm.catatan || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: MASTER KATALOG MENU RESMI */}
        {activeTab === 'menu' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Master Katalog Serabi Bawel &amp; Wedang Geprek
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center space-x-1">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Locked Pusat</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Resep dan harga resmi dikontrol 100% oleh Admin Pusat. Tablet kasir cabang berstatus Read-Only (kasir tidak bisa ubah/hapus).
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={async () => {
                    if (confirm('Kembalikan menu ke daftar resep bawaan demo Serabi Bawel & Wedang Geprek?')) {
                      await db.resetMenuDefault();
                      await refreshAllData();
                    }
                  }}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors"
                  title="Kembalikan ke resep bawaan demo"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>

                <button
                  onClick={() => setIsAddingNewMenu(true)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-sm btn-tactile flex items-center space-x-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Menu Baru</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Kode &amp; Nama Menu</th>
                    <th className="py-3 px-4">Kategori Menu</th>
                    <th className="py-3 px-4 text-right">Harga Jual</th>
                    <th className="py-3 px-4 text-right">HPP Bahan (Resep)</th>
                    <th className="py-3 px-4 text-right">Laba Kotor</th>
                    <th className="py-3 px-4 text-center">Margin %</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi (Admin Pusat)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {menuList.map(item => {
                    const itemHpp = item.hpp !== undefined ? item.hpp : Math.round(item.harga * 0.32);
                    const labaKotor = Math.max(0, item.harga - itemHpp);
                    const margin = item.harga > 0 ? Math.round((labaKotor / item.harga) * 100) : 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono text-[10px] text-slate-400 font-bold">{item.kode}</span>
                              {item.is_favorite && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800">
                                  FAVORIT
                                </span>
                              )}
                            </div>
                            <span className="font-extrabold text-slate-900 text-xs block mt-0.5">{item.nama}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-600">
                          {item.kategori_nama || 'Serabi & Wedang'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900 tabular-nums text-sm">
                          {formatRupiah(item.harga)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-700 tabular-nums">
                          {formatRupiah(itemHpp)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 tabular-nums">
                          {formatRupiah(labaKotor)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-extrabold text-[10px] border border-emerald-300">
                            {margin}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                            item.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {item.is_active ? 'AKTIF' : 'NON-AKTIF'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => setSelectedMenuForEdit(item)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100 rounded-lg font-bold text-[11px] transition-colors shadow-2xs"
                              title="Ubah nama, harga, atau HPP resep"
                            >
                              <Pencil className="w-3 h-3 text-amber-600" />
                              <span>Ubah</span>
                            </button>

                            <button
                              onClick={() => handleDeleteMenu(item)}
                              className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Hapus menu resmi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Security note */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-brand-primary shrink-0" />
                <span className="font-semibold text-[11px]">
                  <strong>Hak Akses Terkunci:</strong> Tablet kasir cabang berstatus Read-Only. Staf kasir tidak bisa mengubah harga, merubah nama, atau menghapus menu resmi.
                </span>
              </div>
              <span className="font-mono text-[10px] font-bold text-slate-500">Total: {menuList.length} Menu Terdaftar</span>
            </div>
          </div>
        )}

        {/* TAB 4: MASTER CABANG & KARYAWAN */}
        {activeTab === 'karyawan' && (
          <div className="space-y-6">
            
            {/* PUSAT KENDALI 10 CABANG TERPADU (ALL-IN-ONE MASTER HUB) */}
            <UnifiedBranchTable
              cabangList={cabangList}
              karyawanList={karyawanList}
              transaksiList={transaksiList}
              bossDailyProfits={bossDailyProfits}
              materialAuditRows={materialAuditRows}
              selectedDate={selectedBossSummaryDate}
              onDateChange={setSelectedBossSummaryDate}
              onEditCabang={(cbg) => setSelectedCabangForEdit(cbg)}
              onAddNewCabang={() => setIsAddingNewCabang(true)}
              onResetDefaultCabang={async () => {
                if (confirm('Kembalikan data 10 cabang ke default resmi bawaan?')) {
                  await db.resetCabangDefault();
                  await refreshAllData();
                }
              }}
              onSelectCabang={(id) => setSelectedCabangId(id)}
              selectedCabangId={selectedCabangId}
              onOpenKirimanBahanModal={(cbgId) => {
                if (cbgId) setSelectedBahanCabangId(cbgId);
                setShowKirimanModal(true);
              }}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />

            {/* Karyawan & Credentials Table (Ala Abdi Membangun AllUsersPinTable & Salary Config) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3 border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    <h3 className="text-sm font-extrabold text-slate-900">Master Data Karyawan, Skema Gaji &amp; PIN Guard</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {karyawanList.length} Akun Terdaftar
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kelola profil pekerja, penempatan cabang, tarif upah harian / tunjangan makan, plafon kasbon, dan PIN/sandi akun.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cari nama, ID, no HP, role..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-primary w-52 font-medium"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCreateKaryawanModal(true)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-brand-primary hover:bg-brand-dark text-white font-extrabold text-xs shadow-sm btn-tactile transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tambah Karyawan</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 text-[10px]">
                    <tr>
                      <th className="py-3 px-3">Nama Karyawan</th>
                      <th className="py-3 px-3">Penempatan Cabang</th>
                      <th className="py-3 px-3">Skema Gaji</th>
                      <th className="py-3 px-3 text-right">Tarif Gaji Harian</th>
                      <th className="py-3 px-3 text-right">Plafon Kasbon</th>
                      <th className="py-3 px-3 text-right">Simulasi 22 Hari Hadir</th>
                      <th className="py-3 px-3 text-center">PIN &amp; Sandi Guard</th>
                      <th className="py-3 px-3 text-center">Aksi Kelola</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredKaryawan.map(kar => {
                      const branch = cabangList.find(c => c.id === kar.cabang_id);
                      const isRevealed = revealedPasswords[kar.id];
                      const isHarian = kar.tipe_gaji === 'harian';
                      const uHarian = kar.gaji_harian || 120000;
                      const estimasi22Hari = isHarian ? (22 * uHarian) : kar.gaji_pokok;

                      return (
                        <tr key={kar.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-extrabold text-slate-900 block">{kar.nama}</span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              <span className="capitalize">{kar.role}</span> • <span className="font-mono text-emerald-700">{kar.telepon}</span>
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-800 block">
                              {branch?.nama.split('-')[1]?.trim() || branch?.nama || 'Pusat'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {branch?.kode || 'CBG-01'}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            {isHarian ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold">
                                <span>Gaji Harian</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                                <span>Gaji Bulanan</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 tabular-nums">
                            {isHarian ? (
                              <div>
                                <span>{formatRupiah(uHarian)}</span>
                                <span className="text-[9px] text-slate-400 block font-normal">/ hari hadir</span>
                              </div>
                            ) : (
                              <div>
                                <span>{formatRupiah(kar.gaji_pokok)}</span>
                                <span className="text-[9px] text-slate-400 block font-normal">/ bulan</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-bold text-accent-gold tabular-nums">
                            {formatRupiah(kar.plafon_kasbon)}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-extrabold text-brand-dark tabular-nums">
                            {formatRupiah(estimasi22Hari)}
                          </td>

                          {/* Sandi / PIN & Status Gembok */}
                          <td className="py-3 px-3 text-center">
                            <div className="space-y-1">
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 text-[11px]">
                                <span>
                                  {isRevealed 
                                    ? (kar.password_plain || '1234') 
                                    : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(kar.id)}
                                  className="text-slate-400 hover:text-slate-700 ml-1"
                                  title={isRevealed ? "Sembunyikan" : "Lihat Sandi Asli"}
                                >
                                  {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                              </div>
                              <div>
                                {kar.is_locked ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                                    <span>🔒</span> TERGEMBOK
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span>✓</span> AKTIF
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Aksi Kelola Lengkap */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              {kar.is_locked && (
                                <button
                                  type="button"
                                  onClick={() => handleUnlockUser(kar.id)}
                                  className="px-2 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-300 transition-colors inline-flex items-center space-x-0.5"
                                  title="Buka Gembok Akun"
                                >
                                  <Unlock className="w-3 h-3" />
                                  <span>Buka</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedKaryawanForPlot(kar);
                                  setTargetBranchIdForPlot(kar.cabang_id);
                                }}
                                className="px-2 py-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg border border-emerald-300 transition-colors inline-flex items-center space-x-0.5"
                                title="Ploting Penempatan Cabang Karyawan"
                              >
                                <ArrowRightLeft className="w-3 h-3 text-emerald-600" />
                                <span>Ploting</span>
                              </button>
                              <button
                                onClick={() => setSelectedKaryawanForSalaryEdit(kar)}
                                className="px-2 py-1 text-[11px] font-bold text-brand-primary hover:bg-brand-subtle rounded-lg border border-brand-primary/30 transition-colors inline-flex items-center space-x-0.5"
                                title="Ubah Skema & Tarif Upah Staf"
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>Ubah Gaji</span>
                              </button>
                              <button
                                onClick={() => setSelectedKaryawanForPinReset(kar)}
                                className="px-2 py-1 text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg border border-amber-300 bg-white transition-colors inline-flex items-center space-x-0.5 shadow-2xs"
                                title="Ganti Username, Sandi Kuat & PIN"
                              >
                                <KeyRound className="w-3 h-3 text-amber-600" />
                                <span>PIN</span>
                              </button>
                              {kar.role !== 'owner' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteKaryawan(kar.id, kar.nama)}
                                  className="px-2 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-300 bg-white transition-colors inline-flex items-center space-x-0.5 shadow-2xs"
                                  title="Hapus Karyawan"
                                >
                                  <Trash2 className="w-3 h-3 text-rose-600" />
                                  <span>Hapus</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 5: MODUL PAYROLL OTOMATIS */}
        {activeTab === 'payroll' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm p-5 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4 border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Modul Payroll Otomatis &amp; Tutup Buku
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Formula: Gaji Bersih = Gaji Pokok + Tunjangan - Total Kasbon (Approved &amp; Unsettled).
                </p>
              </div>

              {/* Filter Tanggal & Tombol Cetak PDF */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Branch Filter (Per-Cabang Ala Abdi Membangun) */}
                <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
                  <Building2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                  <select
                    value={payrollBranchFilter}
                    onChange={(e) => setPayrollBranchFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer max-w-[180px] truncate"
                    title="Pilih filter cabang penggajian"
                  >
                    <option value="all">🏢 Semua Cabang ({cabangList.length || 10} Cabang Resmi)</option>
                    {cabangList.map(c => (
                      <option key={c.id} value={c.id}>{c.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Mode Selector */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPayrollMode('harian')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      payrollMode === 'harian' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Per Tanggal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayrollMode('rentang')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      payrollMode === 'rentang' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Rentang Tanggal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayrollMode('bulanan')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      payrollMode === 'bulanan' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Bulanan
                  </button>
                </div>

                {/* Date Input based on Mode */}
                {payrollMode === 'harian' && (
                  <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
                    <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                    <input
                      type="date"
                      value={payrollSingleDate}
                      onChange={(e) => setPayrollSingleDate(e.target.value)}
                      className="bg-transparent font-mono text-xs font-bold text-slate-800 outline-none cursor-pointer"
                    />
                  </div>
                )}

                {payrollMode === 'rentang' && (
                  <div className="flex items-center space-x-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
                    <Calendar className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    <input
                      type="date"
                      value={payrollStartDate}
                      onChange={(e) => setPayrollStartDate(e.target.value)}
                      className="bg-transparent font-mono text-xs font-bold text-slate-800 outline-none cursor-pointer w-28"
                    />
                    <span className="text-slate-400">s/d</span>
                    <input
                      type="date"
                      value={payrollEndDate}
                      onChange={(e) => setPayrollEndDate(e.target.value)}
                      className="bg-transparent font-mono text-xs font-bold text-slate-800 outline-none cursor-pointer w-28"
                    />
                  </div>
                )}

                {payrollMode === 'bulanan' && (
                  <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
                    <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                    <select
                      value={payrollMonth}
                      onChange={(e) => setPayrollMonth(Number(e.target.value))}
                      className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                        <option key={m} value={m}>Bulan {m}</option>
                      ))}
                    </select>
                    <span className="text-slate-400">/</span>
                    <select
                      value={payrollYear}
                      onChange={(e) => setPayrollYear(Number(e.target.value))}
                      className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      <option value={2026}>2026</option>
                      <option value={2025}>2025</option>
                    </select>
                  </div>
                )}

                {/* Tombol Cetak Rekap PDF */}
                <button
                  type="button"
                  onClick={() => setShowPayrollReportModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md shadow-emerald-700/20 btn-tactile flex items-center space-x-1.5 transition-all"
                  title="Cetak Laporan Rekap Gaji ke PDF Sesuai Tanggal Terpilih"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Rekap PDF</span>
                </button>

                {/* Tombol Kunci Gaji */}
                <button
                  onClick={handleLockPayroll}
                  className="px-4 py-2 rounded-xl bg-accent-gold hover:bg-amber-600 text-white font-extrabold text-xs shadow-md shadow-accent-gold/25 btn-tactile flex items-center space-x-1.5 transition-all"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Kunci Gaji Periode Ini</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Nama Staf & Outlet</th>
                    <th className="py-3 px-4">Kehadiran</th>
                    <th className="py-3 px-4 text-right">Gaji Harian</th>
                    <th className="py-3 px-4 text-right">Total Gaji Hadir</th>
                    <th className="py-3 px-4 text-right text-rose-600">Hutang / Kasbon (Auto-Potong)</th>
                    <th className="py-3 px-4 text-right font-extrabold text-brand-dark">Gaji Bersih (Take Home)</th>
                    <th className="py-3 px-4 text-center">Slip Digital &amp; Kirim WA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculatedPayrollDrafts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <span className="text-2xl">💰</span>
                          <span className="font-extrabold text-slate-700">Belum Ada Karyawan untuk Dihitung Gajinya (Mulai dari 0)</span>
                          <span className="text-slate-400 text-[11px]">Daftarkan staf di menu Master Karyawan untuk menghitung gaji harian.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    calculatedPayrollDrafts.map(draft => (
                    <tr key={draft.karyawan_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-slate-900 block">{draft.karyawan_nama}</span>
                        <span className="text-[10px] text-slate-500">{draft.cabang_nama} ({draft.karyawan_role})</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold">
                          <span>{draft.total_kehadiran_hari || 22} Hari Hadir</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 tabular-nums">
                        {formatRupiah(draft.upah_harian || 120000)} <span className="text-[10px] text-slate-400">/ hari</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatRupiah(draft.gaji_pokok)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 tabular-nums">
                        <div>-{formatRupiah(draft.potongan_kasbon)}</div>
                        {draft.potongan_kasbon > 0 ? (
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-black border border-emerald-200">
                            ✓ Otomatis Lunas
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 font-medium">Nihil / Lunas</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-brand-dark tabular-nums text-sm">
                        {formatRupiah(draft.gaji_bersih)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {draft.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-[11px] font-black">
                              ✓ Lunas
                            </span>
                          ) : (
                            <button
                              onClick={() => setSelectedPayrollForPayout(draft)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full text-xs font-bold transition shadow-xs btn-tactile"
                              title="Cairkan Dana & Transfer ke Rekening Staf"
                            >
                              <span>💸</span>
                              <span>Cairkan</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedPayrollSlip(draft)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-full text-xs font-bold transition shadow-xs btn-tactile"
                            title="Buka Rincian Absensi, Kasbon & Slip Gaji (Ala Abdi Membangun)"
                          >
                            <span>🔍</span>
                            <span>Buka Rincian &amp; Slip</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              const waUrl = generateWhatsAppPayrollSlipLink({
                                telepon: draft.karyawan_telepon,
                                nama: draft.karyawan_nama || 'Staf',
                                role: draft.karyawan_role || 'Kasir Cabang',
                                cabangNama: draft.cabang_nama || 'Cabang',
                                slipNo: draft.slip_no,
                                periodeLabel: payrollDateLabel,
                                gajiPokok: draft.gaji_pokok,
                                tunjangan: 0,
                                potonganKasbon: draft.potongan_kasbon,
                                gajiBersih: draft.gaji_bersih,
                                totalHari: draft.total_kehadiran_hari,
                                tipeGaji: draft.tipe_gaji,
                                upahHarian: draft.upah_harian,
                              });
                              window.open(waUrl, '_blank');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs transition-colors inline-flex items-center space-x-1 shadow-xs btn-tactile"
                            title="Kirim Slip Gaji Resmi Langsung ke WhatsApp Staf"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-white" />
                            <span>Kirim WA</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-2">
              <ShieldCheck className="w-5 h-5 text-accent-gold shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Jaminan Integritas Pembukuan Bank-Grade:</span>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Menekan tombol <strong>&quot;Kunci Gaji&quot;</strong> akan membekukan perhitungan gaji periode ini, mengubah semua baris kasbon karyawan menjadi <code>is_settled: true</code>, dan saldo kasbon staf untuk bulan berikutnya otomatis kembali ke Rp 0.
                </p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MODALS */}
      {(selectedCabangForEdit || isAddingNewCabang) && (
        <EditCabangModal
          cabang={selectedCabangForEdit}
          isNew={isAddingNewCabang}
          onClose={() => {
            setSelectedCabangForEdit(null);
            setIsAddingNewCabang(false);
          }}
          onSuccess={async (updated) => {
            setSelectedCabangForEdit(null);
            setIsAddingNewCabang(false);
            await refreshAllData();
          }}
        />
      )}

      {selectedExpenseForApproval && (
        <ApprovalActionModal
          item={selectedExpenseForApproval}
          onClose={() => setSelectedExpenseForApproval(null)}
          onSuccess={async () => {
            setSelectedExpenseForApproval(null);
            await refreshAllData();
          }}
        />
      )}

      {selectedKaryawanForPinReset && (
        <PinResetModal
          karyawan={selectedKaryawanForPinReset}
          onClose={() => setSelectedKaryawanForPinReset(null)}
          onSuccess={async () => {
            setSelectedKaryawanForPinReset(null);
            await refreshAllData();
          }}
        />
      )}

      {selectedKaryawanForSalaryEdit && (
        <EditSalaryModal
          karyawan={selectedKaryawanForSalaryEdit}
          onClose={() => setSelectedKaryawanForSalaryEdit(null)}
          onSuccess={async () => {
            setSelectedKaryawanForSalaryEdit(null);
            await refreshAllData();
          }}
        />
      )}

      {/* Modal Ploting Cabang Karyawan (Ala Abdi Membangun) */}
      {selectedKaryawanForPlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-emerald-50/80 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-primary text-white flex items-center justify-center font-bold">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">Ploting Penempatan Cabang</h4>
                  <p className="text-[11px] text-slate-500">Pindahkan lokasi cabang tugas karyawan</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedKaryawanForPlot(null)}
                className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-brand-subtle text-brand-dark flex items-center justify-center font-extrabold text-sm">
                  {selectedKaryawanForPlot.nama.charAt(0)}
                </div>
                <div>
                  <h5 className="font-extrabold text-slate-900 text-sm">{selectedKaryawanForPlot.nama}</h5>
                  <p className="text-[11px] text-slate-500 capitalize">
                    {selectedKaryawanForPlot.role} • Cabang Saat Ini: <strong>{cabangList.find(c => c.id === selectedKaryawanForPlot.cabang_id)?.nama || 'Pusat'}</strong>
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Pilih Cabang Penempatan Baru:
                </label>
                <select
                  value={targetBranchIdForPlot}
                  onChange={(e) => setTargetBranchIdForPlot(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-primary"
                >
                  {cabangList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nama} ({c.kode}) - {c.alamat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <p className="font-bold">Informasi Ploting:</p>
                <p>Setelah dipindahkan, presensi harian, upah kehadiran, dan shift kasir staf ini akan otomatis terhubung ke cabang tujuan.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSelectedKaryawanForPlot(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!targetBranchIdForPlot) return;
                  await db.assignKaryawanCabang(selectedKaryawanForPlot.id, targetBranchIdForPlot);
                  await refreshAllData();
                  const targetBranchName = cabangList.find(c => c.id === targetBranchIdForPlot)?.nama;
                  alert(`Berhasil memploting ${selectedKaryawanForPlot.nama} ke ${targetBranchName}!`);
                  setSelectedKaryawanForPlot(null);
                }}
                className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-dark text-white font-extrabold text-xs shadow-md shadow-brand-dark/20 btn-tactile transition-all"
              >
                Simpan Penempatan
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPayrollSlip && (
        <PayrollSlipModal
          payroll={selectedPayrollSlip}
          absensiList={absensiList}
          expenseList={expenseList}
          onClose={() => setSelectedPayrollSlip(null)}
          onSuccess={async () => {
            const freshPayrolls = await db.getPayrollList();
            setPayrollList(freshPayrolls);
            const freshExpenses = await db.getPengeluaranList();
            setExpenseList(freshExpenses);
          }}
        />
      )}

      {selectedPayrollForPayout && (
        <PayoutSalaryModal
          payroll={selectedPayrollForPayout}
          onClose={() => setSelectedPayrollForPayout(null)}
          onSuccess={async () => {
            setSelectedPayrollForPayout(null);
            const freshPayrolls = await db.getPayrollList();
            setPayrollList(freshPayrolls);
            const freshExpenses = await db.getPengeluaranList();
            setExpenseList(freshExpenses);
          }}
        />
      )}

      {showPayrollReportModal && (
        <PayrollRecapReportModal
          payrolls={calculatedPayrollDrafts}
          month={payrollMonth}
          year={payrollYear}
          periodeLabel={payrollDateLabel}
          cabangLabel={payrollBranchFilter === 'all' ? 'Seluruh 10 Cabang' : (cabangList.find(c => c.id === payrollBranchFilter)?.nama || 'Cabang')}
          onClose={() => setShowPayrollReportModal(false)}
        />
      )}

      {showApprovalReportModal && (
        <ApprovalRecapReportModal
          expenses={filteredApprovalExpenses}
          periodeLabel={approvalDateMode === 'selected' ? `Tanggal ${approvalDateFilter}` : 'Seluruh Riwayat Tanggal'}
          cabangLabel={approvalCabangFilter === 'all' ? 'Seluruh 10 Cabang' : (cabangList.find(c => c.id === approvalCabangFilter)?.nama || 'Cabang')}
          statusLabel={
            approvalStatusFilter === 'all' ? 'Semua Status' :
            approvalStatusFilter === 'approved' ? 'Disetujui (Approved)' :
            approvalStatusFilter === 'pending' ? 'Menunggu (Pending)' : 'Ditolak (Rejected)'
          }
          onClose={() => setShowApprovalReportModal(false)}
        />
      )}

      {(selectedMenuForEdit || isAddingNewMenu) && (
        <EditMenuModal
          menu={selectedMenuForEdit}
          isNew={isAddingNewMenu}
          onClose={() => {
            setSelectedMenuForEdit(null);
            setIsAddingNewMenu(false);
          }}
          onSuccess={async () => {
            setSelectedMenuForEdit(null);
            setIsAddingNewMenu(false);
            await refreshAllData();
          }}
        />
      )}

      {showCreateExpenseModal && (
        <CreateExpenseModal
          cabangList={cabangList}
          karyawanList={karyawanList}
          defaultCabangId={belanjaCabangFilter !== 'all' ? belanjaCabangFilter : (selectedCabangId !== 'all' ? selectedCabangId : undefined)}
          onClose={() => setShowCreateExpenseModal(false)}
          onSuccess={async () => {
            setShowCreateExpenseModal(false);
            await refreshAllData();
          }}
        />
      )}

      {showCreateKaryawanModal && (
        <CreateKaryawanModal
          cabangList={cabangList}
          defaultCabangId={selectedCabangId !== 'all' ? selectedCabangId : undefined}
          onClose={() => setShowCreateKaryawanModal(false)}
          onSuccess={async () => {
            setShowCreateKaryawanModal(false);
            await refreshAllData();
          }}
        />
      )}

      {showDailyReportModal && (
        <DailyBranchReportModal
          cabangList={cabangList}
          karyawanList={karyawanList}
          transaksiList={transaksiList}
          expenseList={expenseList}
          defaultCabangId={selectedCabangId !== 'all' ? selectedCabangId : undefined}
          defaultDate="2026-10-25"
          onClose={() => setShowDailyReportModal(false)}
        />
      )}

      {showKirimanModal && (
        <CreateKirimanBahanModal
          cabangList={cabangList}
          bahanList={bahanList}
          defaultCabangId={selectedBahanCabangId !== 'all' ? selectedBahanCabangId : undefined}
          defaultDate={selectedBahanDate}
          onClose={() => setShowKirimanModal(false)}
          onSuccess={async () => {
            setShowKirimanModal(false);
            await refreshAllData();
          }}
        />
      )}

    </div>
  );
}
