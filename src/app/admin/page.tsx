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
import EditFixedCostModal from '@/components/EditFixedCostModal';
import EditMenuModal from '@/components/EditMenuModal';
import CreateExpenseModal from '@/components/CreateExpenseModal';
import CreateKaryawanModal from '@/components/CreateKaryawanModal';
import DailyBranchReportModal from '@/components/DailyBranchReportModal';
import PayoutSalaryModal from '@/components/PayoutSalaryModal';
import CreateKirimanBahanModal from '@/components/CreateKirimanBahanModal';
import ProfilTokoManager from '@/components/ProfilTokoManager';
import MutasiPenjualanStatement from '@/components/MutasiPenjualanStatement';
import FixedCostPaymentManager from '@/components/FixedCostPaymentManager';
import BahanBakuAuditManager from '@/components/BahanBakuAuditManager';
import BukuTabunganModal from '@/components/BukuTabunganModal';

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
  FixedCostHarianCabang,
  PembayaranFixedCostBulanan
} from '@/lib/types';
import { db, isBranchMatch } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { formatRupiah, formatNominal, parseNominal, formatWaktu, generateWhatsAppPayrollSlipLink, formatKaryawanRole, getTodayDateString } from '@/lib/utils';

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
  Check,
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
  PiggyBank,
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
  Menu,
  CreditCard
} from 'lucide-react';

const OWNER_AUTH_KEY = 'pakagan_owner_authenticated';

export default function AdminDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [ownerPinInput, setOwnerPinInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'ringkasan' | 'mutasi' | 'approval' | 'gaji' | 'absensi' | 'bahan' | 'payroll' | 'menu' | 'karyawan' | 'fixedcost' | 'profiltoko'>('ringkasan');
  const [cabangList, setCabangList] = useState<Cabang[]>([]);
  const [selectedCabangId, setSelectedCabangId] = useState<string>('all');
  const [selectedAbsensiDate, setSelectedAbsensiDate] = useState<string>(getTodayDateString());
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
  const [selectedBahanDate, setSelectedBahanDate] = useState<string>(getTodayDateString());
  const [showKirimanModal, setShowKirimanModal] = useState<boolean>(false);

  // State Rekap Uang Masuk Bersih Rekening Boss
  const [selectedBossSummaryDate, setSelectedBossSummaryDate] = useState<string>(getTodayDateString());
  const [showAdvancedTables, setShowAdvancedTables] = useState<boolean>(false);

  // Modals
  const [selectedCabangForEdit, setSelectedCabangForEdit] = useState<Cabang | null>(null);
  const [selectedCabangForFixedCost, setSelectedCabangForFixedCost] = useState<Cabang | null>(null);
  const [isAddingNewCabang, setIsAddingNewCabang] = useState<boolean>(false);
  const [selectedExpenseForApproval, setSelectedExpenseForApproval] = useState<PengeluaranKasbon | null>(null);
  const [selectedKaryawanForPinReset, setSelectedKaryawanForPinReset] = useState<Karyawan | null>(null);
  const [selectedKaryawanForSalaryEdit, setSelectedKaryawanForSalaryEdit] = useState<Karyawan | null>(null);
  const [selectedKaryawanForTabungan, setSelectedKaryawanForTabungan] = useState<Karyawan | null>(null);
  const [selectedKaryawanForPlot, setSelectedKaryawanForPlot] = useState<Karyawan | null>(null);
  const [targetBranchIdForPlot, setTargetBranchIdForPlot] = useState<string>('');
  const [selectedPayrollSlip, setSelectedPayrollSlip] = useState<Payroll | null>(null);
  const [selectedPayrollForPayout, setSelectedPayrollForPayout] = useState<Payroll | null>(null);
  const [showPayrollReportModal, setShowPayrollReportModal] = useState<boolean>(false);
  const [showDailyReportModal, setShowDailyReportModal] = useState<boolean>(false);
  const [selectedMenuForEdit, setSelectedMenuForEdit] = useState<MenuItem | null>(null);
  const [isAddingNewMenu, setIsAddingNewMenu] = useState<boolean>(false);
  const [selectedMenuCabangFilter, setSelectedMenuCabangFilter] = useState<string>('all');

  // Approval Center Filters & State
  const [approvalDateFilter, setApprovalDateFilter] = useState<string>(getTodayDateString());
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

  // User Search & Credentials Visibility
  const [userSearch, setUserSearch] = useState<string>('');
  const [karyawanBranchFilter, setKaryawanBranchFilter] = useState<string>('all');
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

  const handleLockUser = async (karyawanId: string) => {
    await db.toggleKaryawanLock(karyawanId, true);
    await refreshAllData();
    alert('Akun staf berhasil digembok! Akses login kasir dinonaktifkan.');
  };

  // Payroll Period & Branch Filters (Penggajian Murni Mingguan)
  const [payrollMode, setPayrollMode] = useState<'mingguan' | 'rentang' | 'harian'>('mingguan');
  const [payrollBranchFilter, setPayrollBranchFilter] = useState<string>('all');
  const [payrollSingleDate, setPayrollSingleDate] = useState<string>(getTodayDateString());
  const [payrollStartDate, setPayrollStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return getTodayDateString(d);
  });
  const [payrollEndDate, setPayrollEndDate] = useState<string>(getTodayDateString());
  const [payrollMonth, setPayrollMonth] = useState<number>(new Date().getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState<number>(new Date().getFullYear());

  const shiftPayrollWeek = (direction: 'prev' | 'next' | 'current') => {
    if (direction === 'current') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setPayrollStartDate(getTodayDateString(d));
      setPayrollEndDate(getTodayDateString());
      return;
    }
    const currentStart = new Date(payrollStartDate);
    const offset = direction === 'prev' ? -7 : 7;
    currentStart.setDate(currentStart.getDate() + offset);
    const newEnd = new Date(currentStart);
    newEnd.setDate(newEnd.getDate() + 6);
    setPayrollStartDate(getTodayDateString(currentStart));
    setPayrollEndDate(getTodayDateString(newEnd));
  };

  // Fixed Cost Monthly Payments & Deduction Mode (Kas Riil vs Cadangan Amortisasi /30 Hr)
  const [fixedCostPayments, setFixedCostPayments] = useState<PembayaranFixedCostBulanan[]>([]);
  const [fixedCostDeductionMode, setFixedCostDeductionMode] = useState<'kas_riil' | 'cadangan_amortisasi'>('kas_riil');
  // Upah Staf Deduction Mode (Beban Standar Toko /Hari vs Presensi Riil Hadir)
  const [upahDeductionMode, setUpahDeductionMode] = useState<'standar_harian' | 'presensi_riil'>('standar_harian');

  // Check auth session (auto-authenticate for direct seamless access)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAuth = sessionStorage.getItem(OWNER_AUTH_KEY) === 'true';
      if (!isAuth) {
        sessionStorage.setItem(OWNER_AUTH_KEY, 'true');
      }
      setIsAuthenticated(true);
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

    const fcPayments = await db.getFixedCostPayments();
    setFixedCostPayments(fcPayments);
  };

  useEffect(() => {
    refreshAllData();

    const handleUpdate = () => refreshAllData();
    window.addEventListener('pak_agan_db_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // 1. Supabase Realtime live sync channel (antar perangkat tablet kasir & laptop boss)
    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel('admin_live_feed')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transaksi' }, () => {
          refreshAllData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pengeluaran_kasbon' }, () => {
          refreshAllData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'absensi' }, () => {
          refreshAllData();
        })
        .subscribe();
    }

    // 2. Polling cadangan setiap 10 detik agar data transaksi live selalu segar (kecuali jika ada modal terbuka)
    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.querySelector('.fixed.inset-0.z-50')) {
        return; // Jangan refresh saat pengguna sedang mengisi form modal
      }
      refreshAllData();
    }, 10000);

    return () => {
      window.removeEventListener('pak_agan_db_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      clearInterval(pollInterval);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Filtered Transaksi
  const filteredTransaksi = useMemo(() => {
    if (selectedCabangId === 'all') return transaksiList;
    return transaksiList.filter(t => isBranchMatch(t.cabang_id, selectedCabangId));
  }, [transaksiList, selectedCabangId]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    if (selectedCabangId === 'all') return expenseList;
    return expenseList.filter(e => isBranchMatch(e.cabang_id, selectedCabangId));
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
    return karyawanList.filter(k => {
      const matchBranch = karyawanBranchFilter === 'all' || isBranchMatch(k.cabang_id, karyawanBranchFilter);
      if (!userSearch.trim()) return matchBranch;
      const q = userSearch.toLowerCase();
      const matchSearch = 
        k.nama.toLowerCase().includes(q) ||
        (k.username || '').toLowerCase().includes(q) ||
        (k.telepon || '').includes(q) ||
        (k.role || '').toLowerCase().includes(q);
      return matchBranch && matchSearch;
    });
  }, [karyawanList, karyawanBranchFilter, userSearch]);

  // Filtered Absensi List berdasarkan Cabang & Tanggal Terpilih / Semua Tanggal
  const filteredAbsensiList = useMemo(() => {
    return absensiList
      .filter(a => {
        const matchBranch = selectedCabangId === 'all' || isBranchMatch(a.cabang_id, selectedCabangId);
        const matchDate = absensiDateFilterMode === 'all' || a.tanggal === selectedAbsensiDate;
        return matchBranch && matchDate;
      })
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [absensiList, selectedCabangId, absensiDateFilterMode, selectedAbsensiDate]);

  // Filtered Approval Expenses dengan Jejak Audit Tanggal & Filter Status
  const filteredApprovalExpenses = useMemo(() => {
    return expenseList.filter(exp => {
      if (approvalCabangFilter !== 'all' && !isBranchMatch(exp.cabang_id, approvalCabangFilter)) return false;
      if (approvalJenisFilter !== 'all' && exp.jenis !== approvalJenisFilter) return false;
      if (approvalStatusFilter !== 'all' && exp.status !== approvalStatusFilter) return false;
      if (approvalDateMode === 'selected') {
        const itemDate = (exp.approved_at || exp.tanggal || '').slice(0, 10);
        if (itemDate !== approvalDateFilter) return false;
      }
      if (approvalSearch.trim()) {
        const q = approvalSearch.toLowerCase();
        const branchName = cabangList.find(c => isBranchMatch(c.id, exp.cabang_id))?.nama.toLowerCase() || '';
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
      if (belanjaCabangFilter !== 'all' && !isBranchMatch(exp.cabang_id, belanjaCabangFilter)) return false;
      if (belanjaJenisFilter !== 'all' && exp.jenis !== belanjaJenisFilter) return false;
      if (belanjaStatusFilter !== 'all' && exp.status !== belanjaStatusFilter) return false;
      if (belanjaSearch.trim()) {
        const q = belanjaSearch.toLowerCase();
        const branchName = cabangList.find(c => isBranchMatch(c.id, exp.cabang_id))?.nama.toLowerCase() || '';
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

  // Toggle Penjualan Menu di Cabang Tertentu (1-Click Quick Toggle)
  const handleToggleMenuBranch = async (item: MenuItem, targetCabangId: string) => {
    let currentBranchIds: string[];
    const isAll = !item.cabang_ids || item.cabang_ids.length === 0 || item.cabang_ids.includes('all');

    if (isAll) {
      // Sebelumnya aktif di semua cabang, sekarang matikan untuk targetCabangId
      currentBranchIds = cabangList.map(c => c.id).filter(id => id !== targetCabangId);
    } else if (item.cabang_ids && item.cabang_ids.includes(targetCabangId)) {
      // Sebelumnya aktif di cabang ini, matikan
      currentBranchIds = item.cabang_ids.filter(id => id !== targetCabangId);
    } else {
      // Sebelumnya tidak aktif di cabang ini, aktifkan
      currentBranchIds = [...(item.cabang_ids || []), targetCabangId];
      // Jika setelah ditambah ternyata mencakup seluruh cabang, kembalikan ke [] (semua cabang)
      if (cabangList.length > 0 && currentBranchIds.length >= cabangList.length) {
        currentBranchIds = [];
      }
    }

    try {
      await db.saveMenu({ id: item.id, cabang_ids: currentBranchIds });
      await refreshAllData();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah ketersediaan cabang');
    }
  };

  // Label Periode Tanggal untuk PDF & Header
  const payrollDateLabel = useMemo(() => {
    if (payrollMode === 'harian') {
      const d = new Date(payrollSingleDate);
      return isNaN(d.getTime()) 
        ? payrollSingleDate 
        : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } else if (payrollMode === 'mingguan') {
      const d1 = new Date(payrollStartDate);
      const d2 = new Date(payrollEndDate);
      const s1 = isNaN(d1.getTime()) ? payrollStartDate : d1.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const s2 = isNaN(d2.getTime()) ? payrollEndDate : d2.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      return `Periode Mingguan: ${s1} s.d. ${s2} (1 Minggu)`;
    } else {
      const d1 = new Date(payrollStartDate);
      const d2 = new Date(payrollEndDate);
      const s1 = isNaN(d1.getTime()) ? payrollStartDate : d1.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const s2 = isNaN(d2.getTime()) ? payrollEndDate : d2.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${s1} s.d. ${s2}`;
    }
  }, [payrollMode, payrollSingleDate, payrollStartDate, payrollEndDate]);

  // Handle Payroll Calculation & Locking (Murni Siklus Mingguan)
  const calculatedPayrollDrafts = useMemo(() => {
    return karyawanList
      .filter(k => k.role !== 'owner')
      .filter(k => payrollBranchFilter === 'all' || isBranchMatch(k.cabang_id, payrollBranchFilter))
      .map(kar => {
        const branch = cabangList.find(c => isBranchMatch(c.id, kar.cabang_id));
        const unsettled = expenseList.filter(e => {
          if (e.karyawan_id !== kar.id || e.jenis !== 'kasbon' || e.status !== 'approved' || e.is_settled) return false;
          const eDate = (e.tanggal || '').slice(0, 10);
          if (payrollMode === 'harian') {
            return !payrollSingleDate || eDate <= payrollSingleDate;
          } else {
            // mingguan atau rentang
            return !payrollEndDate || eDate <= payrollEndDate;
          }
        });
        const totalKasbon = unsettled.reduce((sum, e) => sum + e.nominal, 0);

        // Kehadiran Staf per Tanggal Terpilih (Mendukung ID, UUID, nama, dan 1/2 hari)
        const match = absensiList.filter(a => {
          const isMatchId = a.karyawan_id === kar.id || 
                            (a.karyawan_nama && a.karyawan_nama.toLowerCase() === kar.nama.toLowerCase());
          if (!isMatchId) return false;
          if (payrollMode === 'harian') {
            return !payrollSingleDate || a.tanggal === payrollSingleDate;
          } else {
            // mingguan atau rentang
            return (!payrollStartDate || a.tanggal >= payrollStartDate) && (!payrollEndDate || a.tanggal <= payrollEndDate);
          }
        });

        let totalDays = 0;
        for (const a of match) {
          if (a.status === 'hadir') totalDays += 1;
          else if (a.status === 'setengah_hari') totalDays += 0.5;
        }
        const staffPresence = totalDays;

        const upahRate = kar.gaji_harian || 100000;
        // Total Gaji Kotor = Kehadiran Hari * Upah Harian (Standar 6 Hari Kerja)
        const gajiPokok = staffPresence * upahRate;
        const tunjangan = 0; // Langsung upah harian bersih tanpa potongan uang makan
        
        // Tabungan Rutin Mingguan: disisihkan otomatis jika ada sisa upah setelah kasbon
        const tabunganRutin = kar.tabungan_rutin_mingguan || 0;
        const sisaSetelahKasbon = Math.max(0, gajiPokok - totalKasbon);
        const potonganTabungan = Math.min(tabunganRutin, sisaSetelahKasbon);
        const gajiBersih = Math.max(0, sisaSetelahKasbon - potonganTabungan);
        const snapshotTotalTabungan = (kar.total_tabungan || 0) + potonganTabungan;

        const draft: Payroll = {
          id: `pay-${kar.id}-${payrollMode}-${payrollStartDate || payrollSingleDate}`,
          karyawan_id: kar.id,
          karyawan_nama: kar.nama,
          karyawan_role: kar.role,
          karyawan_telepon: kar.telepon,
          cabang_id: kar.cabang_id,
          cabang_nama: branch?.nama || 'Cabang',
          slip_no: `SLIP/MGG-${(payrollStartDate || '').replace(/-/g, '')}/${kar.nama.split(' ')[0]?.toUpperCase() || 'STF'}`,
          periode_tanggal: payrollDateLabel,
          periode_bulan: payrollMonth,
          periode_tahun: payrollYear,
          tipe_gaji: 'harian',
          total_kehadiran_hari: staffPresence,
          upah_harian: upahRate,
          gaji_pokok: gajiPokok,
          tunjangan: 0,
          potongan_kasbon: totalKasbon,
          potongan_tabungan: potonganTabungan,
          total_tabungan_snapshot: snapshotTotalTabungan,
          gaji_bersih: gajiBersih,
          status: 'draft',
          tanggal_kunci: new Date().toISOString(),
          kasbon_details: unsettled,
        };

        return draft;
      });
  }, [karyawanList, cabangList, expenseList, absensiList, payrollMode, payrollSingleDate, payrollStartDate, payrollEndDate, payrollMonth, payrollYear, payrollBranchFilter]);

  const handleLockPayroll = async () => {
    const confirmLock = confirm(
      `Apakah Anda yakin ingin MENGUNCI GAJI MINGGUAN (${payrollDateLabel})?\n\n` +
      `Seluruh kasbon yang disetujui periode mingguan ini akan otomatis ditandai LUNAS (is_settled: true), ` +
      `dan saldo kasbon karyawan untuk minggu berikutnya kembali Rp 0.`
    );
    if (!confirmLock) return;

    await db.lockPayroll(calculatedPayrollDrafts);
    alert(`Gaji mingguan (${payrollDateLabel}) berhasil dikunci dan slip mutasi digital resmi diterbitkan!`);
    await refreshAllData();
  };

  // --------------------------------------------------------------------------
  // KALKULASI FIXED COST & UANG MASUK BERSIH REKENING BOSS (10 CABANG HARIAN)
  // --------------------------------------------------------------------------
  const bossDailyProfits = useMemo(() => {
    const targetDate = selectedBossSummaryDate;
    const menuHppMap: Record<string, number> = {};
    const menuHppEsMap: Record<string, number> = {};
    menuList.forEach(m => { 
      const defaultHpp = m.hpp !== undefined && m.hpp > 0 ? m.hpp : Math.round(m.harga * 0.32) || 4000;
      const defaultHppEs = m.hpp_es !== undefined && m.hpp_es > 0 ? m.hpp_es : defaultHpp;
      menuHppMap[m.id] = defaultHpp;
      menuHppEsMap[m.id] = defaultHppEs;
      if (m.kode) {
        menuHppMap[m.kode] = defaultHpp;
        menuHppEsMap[m.kode] = defaultHppEs;
      }
      if (m.nama) {
        menuHppMap[m.nama.toLowerCase()] = defaultHpp;
        menuHppEsMap[m.nama.toLowerCase()] = defaultHppEs;
      }
    });

    const branchBreakdowns = cabangList.map(cabang => {
      // 1. Sewa, Wifi/Listrik, Iuran Harian (Bulanan / 30) + Beban Tambahan
      const sewaHarian = Math.round((cabang.sewa_bulanan || 3000000) / 30);
      const wifiListrikHarian = Math.round((cabang.listrik_air_bulanan || 600000) / 30);
      const iuranHarian = Math.round((cabang.iuran_kebersihan_bulanan || 150000) / 30);
      const biayaLainHarian = Math.round((cabang.biaya_lain_bulanan || 0) / 30);

      // 2. Upah Karyawan:
      // a. Presensi Riil Hari Ini
      const branchAbsensi = absensiList.filter(a => isBranchMatch(a.cabang_id, cabang.id) && a.tanggal === targetDate);
      const actualPresensiGaji = branchAbsensi.reduce((sum, a) => sum + (a.upah_harian_terhitung || 0), 0);
      const stafHadirCount = branchAbsensi.filter(a => a.status === 'hadir' || a.status === 'setengah_hari').length;

      // b. Beban Standar Harian Toko (Staf terdaftar & aktif di cabang ini, Gaji Mingguan dibagi 6)
      const branchWorkers = karyawanList.filter(k => isBranchMatch(k.cabang_id, cabang.id) && k.role !== 'owner' && !k.is_locked);
      const standardDailyWage = branchWorkers.reduce((sum, k) => {
        if (k.gaji_harian && k.gaji_harian > 0) return sum + k.gaji_harian;
        if (k.gaji_pokok && k.gaji_pokok > 0) return sum + Math.round(k.gaji_pokok / 6);
        return sum + 100000;
      }, 0);

      const totalGajiKaryawan = upahDeductionMode === 'standar_harian' ? standardDailyWage : actualPresensiGaji;

      // 3. Omzet & Total HPP Bahan Baku Terpakai
      const branchTrx = transaksiList.filter(t => isBranchMatch(t.cabang_id, cabang.id) && t.status === 'completed' && t.waktu.startsWith(targetDate));
      let omzetKotor = 0;
      let totalHppBahan = 0;

      branchTrx.forEach(trx => {
        omzetKotor += trx.total;
        trx.items.forEach(it => {
          const isDingin = it.temperature === 'dingin';
          const itemHpp = isDingin 
            ? (menuHppEsMap[it.menu_id] || (it.nama_menu && menuHppEsMap[it.nama_menu.toLowerCase()]) || menuHppMap[it.menu_id] || (it.nama_menu && menuHppMap[it.nama_menu.toLowerCase()]) || 4000)
            : (menuHppMap[it.menu_id] || (it.nama_menu && menuHppMap[it.nama_menu.toLowerCase()]) || 4000);
          totalHppBahan += itemHpp * it.qty;
        });
      });

      // 4. Belanja Operasional Toko Laci Approved Hari Ini (Gas LPG, Es Batu, Kresek, dll)
      const branchBelanja = expenseList.filter(e => 
        isBranchMatch(e.cabang_id, cabang.id) && 
        e.jenis === 'belanja' && 
        e.status === 'approved' &&
        (e.metode_pencairan === 'laci' || !e.metode_pencairan) &&
        ((e.approved_at && e.approved_at.slice(0, 10) === targetDate) || (e.tanggal && e.tanggal.slice(0, 10) === targetDate))
      );
      const totalBelanjaLaci = branchBelanja.reduce((sum, e) => sum + (e.nominal || 0), 0);

      // Total Potongan Harian = Sewa + Wifi/Listrik + Iuran + Beban Tambahan + Gaji Karyawan + HPP Bahan + Belanja Laci Toko
      const totalPotongan = sewaHarian + wifiListrikHarian + iuranHarian + biayaLainHarian + totalGajiKaryawan + totalHppBahan + totalBelanjaLaci;
      const uangBersihBoss = omzetKotor - totalPotongan;

      return {
        cabang,
        sewaHarian,
        wifiListrikHarian,
        iuranHarian,
        biayaLainHarian,
        totalGajiKaryawan,
        standardDailyWage,
        actualPresensiGaji,
        totalHppBahan,
        totalBelanjaLaci,
        totalPotongan,
        omzetKotor,
        uangBersihBoss,
        stafHadirCount,
        branchWorkersCount: branchWorkers.length,
      };
    });

    const totalOmzet10Toko = branchBreakdowns.reduce((sum, b) => sum + b.omzetKotor, 0);
    const totalSewa10Toko = branchBreakdowns.reduce((sum, b) => sum + b.sewaHarian, 0);
    const totalWifiListrik10Toko = branchBreakdowns.reduce((sum, b) => sum + b.wifiListrikHarian, 0);
    const totalIuran10Toko = branchBreakdowns.reduce((sum, b) => sum + b.iuranHarian, 0);
    const totalBiayaLain10Toko = branchBreakdowns.reduce((sum, b) => sum + (b.biayaLainHarian || 0), 0);
    const totalGaji10Toko = branchBreakdowns.reduce((sum, b) => sum + b.totalGajiKaryawan, 0);
    const totalStandarGaji10Toko = branchBreakdowns.reduce((sum, b) => sum + b.standardDailyWage, 0);
    const totalPresensiGaji10Toko = branchBreakdowns.reduce((sum, b) => sum + b.actualPresensiGaji, 0);
    const totalHpp10Toko = branchBreakdowns.reduce((sum, b) => sum + b.totalHppBahan, 0);
    const totalBelanja10Toko = branchBreakdowns.reduce((sum, b) => sum + b.totalBelanjaLaci, 0);
    const totalPotongan10Toko = totalSewa10Toko + totalWifiListrik10Toko + totalIuran10Toko + totalBiayaLain10Toko + totalGaji10Toko + totalHpp10Toko + totalBelanja10Toko;
    const totalBersihBoss10Toko = totalOmzet10Toko - totalPotongan10Toko;

    return {
      date: targetDate,
      branchBreakdowns,
      totalOmzet10Toko,
      totalSewa10Toko,
      totalWifiListrik10Toko,
      totalIuran10Toko,
      totalBiayaLain10Toko,
      totalGaji10Toko,
      totalStandarGaji10Toko,
      totalPresensiGaji10Toko,
      totalHpp10Toko,
      totalBelanja10Toko,
      totalPotongan10Toko,
      totalBersihBoss10Toko,
    };
  }, [cabangList, menuList, absensiList, transaksiList, expenseList, selectedBossSummaryDate, karyawanList, upahDeductionMode]);

  // --------------------------------------------------------------------------
  // EXECUTIVE SUMMARY HARIAN (KONSOLIDASI 10 CABANG ATAU PER CABANG PILIHAN)
  // --------------------------------------------------------------------------
  const activeExecutiveSummary = useMemo(() => {
    const isAll = selectedCabangId === 'all';
    const targetBreakdowns = isAll
      ? bossDailyProfits.branchBreakdowns
      : bossDailyProfits.branchBreakdowns.filter(b => b.cabang.id === selectedCabangId);

    const currentMonthKey = (selectedBossSummaryDate || '2026-10').slice(0, 7);

    let totalSewaWajib = 0;
    let totalWifiWajib = 0;
    let totalIuranWajib = 0;
    let totalLainWajib = 0;

    let effectiveSewa = 0;
    let effectiveWifi = 0;
    let effectiveIuran = 0;
    let effectiveLain = 0;

    let fullySettledBranchCount = 0;

    targetBreakdowns.forEach(b => {
      totalSewaWajib += b.sewaHarian;
      totalWifiWajib += b.wifiListrikHarian;
      totalIuranWajib += b.iuranHarian;
      totalLainWajib += (b.biayaLainHarian || 0);

      const sewaPay = fixedCostPayments.find(p => isBranchMatch(p.cabang_id, b.cabang.id) && p.periode_bulan === currentMonthKey && (p.jenis_biaya === 'sewa' || p.jenis_biaya === 'semua_paket'));
      const wifiPay = fixedCostPayments.find(p => isBranchMatch(p.cabang_id, b.cabang.id) && p.periode_bulan === currentMonthKey && (p.jenis_biaya === 'listrik_wifi' || p.jenis_biaya === 'semua_paket'));
      const iuranPay = fixedCostPayments.find(p => isBranchMatch(p.cabang_id, b.cabang.id) && p.periode_bulan === currentMonthKey && (p.jenis_biaya === 'sampah_kebersihan' || p.jenis_biaya === 'semua_paket'));

      const isSewaPaid = sewaPay?.status === 'lunas';
      const isWifiPaid = wifiPay?.status === 'lunas';
      const isIuranPaid = iuranPay?.status === 'lunas';

      if (isSewaPaid && isWifiPaid && isIuranPaid) {
        fullySettledBranchCount++;
      }

      if (fixedCostDeductionMode === 'kas_riil') {
        effectiveSewa += isSewaPaid ? 0 : b.sewaHarian;
        effectiveWifi += isWifiPaid ? 0 : b.wifiListrikHarian;
        effectiveIuran += isIuranPaid ? 0 : b.iuranHarian;
        effectiveLain += (b.biayaLainHarian || 0);
      } else {
        effectiveSewa += b.sewaHarian;
        effectiveWifi += b.wifiListrikHarian;
        effectiveIuran += b.iuranHarian;
        effectiveLain += (b.biayaLainHarian || 0);
      }
    });

    const isAllTargetFullySettled = targetBreakdowns.length > 0 && fullySettledBranchCount === targetBreakdowns.length;
    const amortizedFixedCost = totalSewaWajib + totalWifiWajib + totalIuranWajib + totalLainWajib;
    const effectiveFixedCost = effectiveSewa + effectiveWifi + effectiveIuran + effectiveLain;

    const omzet = targetBreakdowns.reduce((sum, b) => sum + b.omzetKotor, 0);
    const hpp = targetBreakdowns.reduce((sum, b) => sum + b.totalHppBahan, 0);
    const gaji = targetBreakdowns.reduce((sum, b) => sum + b.totalGajiKaryawan, 0);
    const belanja = targetBreakdowns.reduce((sum, b) => sum + (b.totalBelanjaLaci || 0), 0);
    const totalPotongan = effectiveFixedCost + hpp + gaji + belanja;
    const uangBersih = omzet - totalPotongan;
    const stafHadir = targetBreakdowns.reduce((sum, b) => sum + b.stafHadirCount, 0);
    const totalWorkersCount = targetBreakdowns.reduce((sum, b) => sum + b.branchWorkersCount, 0);

    return {
      isAll,
      branchLabel: isAll ? '10 Toko Gabungan' : (cabangList.find(c => c.id === selectedCabangId)?.nama || 'Toko Terpilih'),
      omzet,
      sewa: effectiveSewa,
      wifi: effectiveWifi,
      iuran: effectiveIuran,
      lain: effectiveLain,
      fixedCost: effectiveFixedCost,
      amortizedFixedCost,
      isAllTargetFullySettled,
      fullySettledBranchCount,
      targetCount: targetBreakdowns.length,
      hpp,
      gaji,
      belanja,
      totalPotongan,
      uangBersih,
      stafHadir,
      totalWorkersCount,
    };
  }, [bossDailyProfits, selectedCabangId, cabangList, fixedCostPayments, fixedCostDeductionMode, selectedBossSummaryDate, upahDeductionMode]);

  // --------------------------------------------------------------------------
  // POSISI UANG KASIR & CHANNEL TRANSAKSI (LACI, QRIS, SHOPEE, GOFOOD, GRAB)
  // --------------------------------------------------------------------------
  const channelBreakdown = useMemo(() => {
    const targetDate = selectedBossSummaryDate;
    const dayTrx = transaksiList.filter(t => 
      t.status === 'completed' && 
      t.waktu.startsWith(targetDate) &&
      (selectedCabangId === 'all' || isBranchMatch(t.cabang_id, selectedCabangId))
    );

    let tunaiTotal = 0;
    let qrisTotal = 0;
    let transferTotal = 0;
    let shopeeTotal = 0;
    let gofoodTotal = 0;
    let grabfoodTotal = 0;

    dayTrx.forEach(t => {
      const mb = t.metode_bayar?.toLowerCase() || 'tunai';
      if (mb === 'tunai') {
        tunaiTotal += t.total;
      } else if (mb === 'qris') {
        qrisTotal += t.total;
      } else if (mb === 'transfer') {
        transferTotal += t.total;
      } else if (mb === 'shopeefood') {
        shopeeTotal += t.total;
      } else if (mb === 'gofood') {
        gofoodTotal += t.total;
      } else if (mb === 'grabfood') {
        grabfoodTotal += t.total;
      } else {
        tunaiTotal += t.total;
      }
    });

    const totalChannel = tunaiTotal + qrisTotal + transferTotal + shopeeTotal + gofoodTotal + grabfoodTotal;

    return {
      targetDate,
      count: dayTrx.length,
      tunaiTotal,
      qrisTotal,
      transferTotal,
      shopeeTotal,
      gofoodTotal,
      grabfoodTotal,
      totalChannel,
    };
  }, [transaksiList, selectedBossSummaryDate, selectedCabangId]);

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
      const cbgTrx = transaksiList.filter(t => isBranchMatch(t.cabang_id, cbg.id) && t.status === 'completed' && t.waktu.startsWith(selectedBahanDate));
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
      const cbgKiriman = kirimanBahanList.filter(k => isBranchMatch(k.cabang_id, cbg.id) && k.tanggal === selectedBahanDate);

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

  // AUTHENTICATED: DEDICATED FINTECH BACKOFFICE (BRANDING SERABI BAWEL & WEDANG GEPREK)
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-800">
      
      {/* 1. DEDICATED FINTECH LEFT SIDEBAR (SERABI BAWEL & WEDANG GEPREK) */}
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
                {activeTab === 'absensi' ? 'Monitor Presensi Cabang' :
                 activeTab === 'menu' ? 'Master Menu & HPP' :
                 activeTab === 'karyawan' ? 'Data Pekerja' :
                 activeTab === 'profiltoko' ? 'Identitas Toko & Struk' :
                 activeTab === 'fixedcost' ? 'Biaya Tetap (Fixed Cost)' :
                 activeTab === 'approval' ? 'Pusat Persetujuan' :
                 activeTab === 'bahan' ? 'Audit Pasokan Bahan' :
                 activeTab === 'payroll' ? 'Rekap Gaji & Payroll' :
                 activeTab === 'gaji' ? 'Belanja & Kas Kecil' : 'Ringkasan & 10 Toko'}
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

        {/* TAB 1: RINGKASAN EKSEKUTIF, LABA BERSIH & POSISI UANG BOSS */}
        {activeTab === 'ringkasan' && (
          <div className="space-y-6">
            
            {/* Desktop Top Header Bar (Hanya Tampil di Menu Ringkasan) */}
            <div className="hidden md:flex flex-row items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border-t-[4px] border-emerald-600 border-x border-b border-slate-200/80 shadow-soft-sm">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 border border-emerald-600/30 flex items-center justify-center text-white text-2xl shadow-md shrink-0">
                  🥞
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] uppercase font-extrabold tracking-widest text-slate-400">
                      Pusat Kendali Eksekutif 10 Cabang • Pak Agan
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                    Serabi Bawel &amp; Wedang Geprek POS
                  </h1>
                </div>
              </div>

              {/* Controls: Branch Filter & Cetak Laporan PDF */}
              <div className="flex items-center gap-2">
                <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <Store className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Filter Outlet:</span>
                  <select
                    value={selectedCabangId}
                    onChange={(e) => setSelectedCabangId(e.target.value)}
                    className="bg-transparent text-xs font-extrabold text-slate-800 outline-none cursor-pointer"
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
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm text-xs font-bold transition-all btn-tactile cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Laporan Harian PDF &amp; Bank</span>
                </button>
              </div>
            </div>

            {/* 4 FINTECH METRIC STAT CARDS (Hanya Tampil di Menu Ringkasan) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-white border-t-[4px] border-emerald-600 border-x border-b border-slate-200/80 shadow-soft-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Omzet Penjualan</span>
                <div className="text-xl sm:text-2xl font-mono font-extrabold text-emerald-800 tabular-nums tracking-tight mt-1.5">
                  {formatRupiah(totalOmzetGlobal)}
                </div>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">{selectedCabangId === 'all' ? '10 Cabang Resmi' : cabangList.find(c => c.id === selectedCabangId)?.kode || 'Cabang Terpilih'}</span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white border-t-[4px] border-emerald-600 border-x border-b border-slate-200/80 shadow-soft-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Volume Transaksi</span>
                <div className="text-xl sm:text-2xl font-mono font-extrabold text-slate-900 tabular-nums tracking-tight mt-1.5">
                  {totalTransaksiCount} Pesanan
                </div>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">Struk kasir POS &amp; Ojol</span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white border-t-[4px] border-amber-500 border-x border-b border-slate-200/80 shadow-soft-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Approval Menunggu</span>
                <div className="text-xl sm:text-2xl font-mono font-extrabold text-amber-600 tabular-nums tracking-tight mt-1.5">
                  {pendingExpenses.length} Pengajuan
                </div>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">Kasbon &amp; Belanja Toko</span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white border-t-[4px] border-blue-600 border-x border-b border-slate-200/80 shadow-soft-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Kasbon Berjalan</span>
                <div className="text-xl sm:text-2xl font-mono font-extrabold text-blue-800 tabular-nums tracking-tight mt-1.5">
                  {formatRupiah(totalUnsettledKasbon)}
                </div>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">Dipotong saat payroll</span>
              </div>
            </div>

            {/* PAPAN 1: REKAPITULASI LABA BERSIH HARIAN BOSS */}
            <div className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-emerald-700/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[11px] uppercase font-black tracking-widest text-emerald-300">
                      Laporan Keuangan Eksekutif Harian
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-amber-300 border border-white/10">
                      {activeExecutiveSummary.branchLabel}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                    Uang Bersih Rekening Boss (Pak Agan)
                  </h2>
                  <p className="text-xs text-emerald-200/80 mt-0.5">
                    Alur Otomatis: Omzet kotor kasir dikurangi beban tetap sewa ruko, modal HPP bahan, dan upah kehadiran staf hari ini.
                  </p>
                </div>

                {/* Filter Outlet, Tanggal & Tombol Cetak PDF Terpadu */}
                <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                  {/* Branch Selector */}
                  <div className="flex items-center space-x-1.5 bg-white/10 px-3 py-1.5 rounded-2xl border border-white/15 backdrop-blur-sm text-xs font-bold text-white shadow-2xs">
                    <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-emerald-200 text-[11px] font-bold">Outlet:</span>
                    <select
                      value={selectedCabangId}
                      onChange={(e) => setSelectedCabangId(e.target.value)}
                      className="bg-emerald-950/90 text-white font-extrabold text-xs rounded-xl px-2 py-1 border border-emerald-700/60 outline-none cursor-pointer"
                    >
                      <option value="all">🏢 Semua Cabang (Konsolidasi 10 Toko)</option>
                      {cabangList.map(c => (
                        <option key={c.id} value={c.id}>
                          #{c.nomor} • {c.kode} - {c.nama.split('-')[1]?.trim() || c.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Selector */}
                  <div className="flex items-center space-x-1.5 bg-white/10 px-3 py-1.5 rounded-2xl border border-white/15 backdrop-blur-sm text-xs font-bold text-white shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-emerald-200 text-[11px] font-bold">Tanggal:</span>
                    <input
                      type="date"
                      value={selectedBossSummaryDate}
                      onChange={(e) => setSelectedBossSummaryDate(e.target.value)}
                      className="bg-emerald-950/90 border border-emerald-700/60 rounded-xl px-2.5 py-1 text-xs font-mono font-bold text-white outline-none cursor-pointer"
                    />
                  </div>

                  {/* Cetak PDF Laporan Rekap Harian */}
                  <button
                    type="button"
                    onClick={() => setShowDailyReportModal(true)}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs shadow-md transition-all btn-tactile cursor-pointer"
                    title="Cetak Laporan Harian PDF Resmi Kop Perusahaan"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-900" />
                    <span>Laporan PDF</span>
                  </button>
                </div>
              </div>

              {/* SAKELAR MODE POTONGAN FIXED COST: KAS RIIL (LUNAS = BEBAS POTONG) VS CADANGAN TABUNGAN (/30 HR) */}
              <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase font-black tracking-wider text-emerald-200">
                    Sistem Biaya Sewa Toko:
                  </span>
                  <div className="inline-flex bg-black/40 p-1 rounded-xl border border-white/15 text-xs">
                    <button
                      type="button"
                      onClick={() => setFixedCostDeductionMode('kas_riil')}
                      className={`px-3 py-1 rounded-lg font-extrabold text-[11px] transition-all cursor-pointer ${
                        fixedCostDeductionMode === 'kas_riil'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      ✓ Kas Riil (Beban Lunas = Rp 0)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFixedCostDeductionMode('cadangan_amortisasi')}
                      className={`px-3 py-1 rounded-lg font-extrabold text-[11px] transition-all cursor-pointer ${
                        fixedCostDeductionMode === 'cadangan_amortisasi'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Cadangan Tabungan (/30 Hari)
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('fixedcost')}
                  className="flex items-center space-x-1.5 text-xs text-amber-300 hover:text-amber-200 font-bold self-start sm:self-auto cursor-pointer underline decoration-dotted"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Kelola Status Pembayaran Sewa Bulanan →</span>
                </button>
              </div>

              {/* SAKELAR SISTEM UPAH STAF: BEBAN STANDAR TOKO (/HARI) VS PRESENSI RIIL HADIR */}
              <div className="mt-2 pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase font-black tracking-wider text-blue-200">
                    Sistem Upah Staf Toko:
                  </span>
                  <div className="inline-flex bg-black/40 p-1 rounded-xl border border-white/15 text-xs">
                    <button
                      type="button"
                      onClick={() => setUpahDeductionMode('standar_harian')}
                      className={`px-3 py-1 rounded-lg font-extrabold text-[11px] transition-all cursor-pointer ${
                        upahDeductionMode === 'standar_harian'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-white/60 hover:text-white'
                      }`}
                      title="Hitung otomatis dari total gaji mingguan staf dibagi 6 hari kerja operasional"
                    >
                      ✓ Beban Standar Toko (/Hari)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpahDeductionMode('presensi_riil')}
                      className={`px-3 py-1 rounded-lg font-extrabold text-[11px] transition-all cursor-pointer ${
                        upahDeductionMode === 'presensi_riil'
                          ? 'bg-cyan-500 text-slate-950 shadow-xs'
                          : 'text-white/60 hover:text-white'
                      }`}
                      title="Hanya hitung staf yang sudah check-in presensi hadir hari ini"
                    >
                      Presensi Riil Hadir
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('payroll')}
                  className="flex items-center space-x-1.5 text-xs text-blue-300 hover:text-blue-200 font-bold self-start sm:self-auto cursor-pointer underline decoration-dotted"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Atur Standar Gaji Staf di Payroll →</span>
                </button>
              </div>

              {/* Rincian 6 Kartu Pipeline Alur Keuangan Realtime */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5 mt-4">
                
                {/* 1. Omzet Kotor */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between relative group hover:border-emerald-500/40 transition">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300 block">
                      1. Total Omzet Kotor
                    </span>
                    <div className="text-base sm:text-lg lg:text-xl font-mono font-extrabold text-emerald-300 mt-1 whitespace-nowrap">
                      +{formatRupiah(activeExecutiveSummary.omzet)}
                    </div>
                  </div>
                  <span className="text-[10px] text-white/60 block mt-2">
                    {channelBreakdown.count} Pesanan Kasir Selesai
                  </span>
                </div>

                {/* 2. Fixed Cost */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between relative group hover:border-rose-500/40 transition">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-rose-300 block">
                        2. Fixed Cost Harian
                      </span>
                      {activeExecutiveSummary.isAllTargetFullySettled && fixedCostDeductionMode === 'kas_riil' && (
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black">
                          ✓ LUNAS
                        </span>
                      )}
                    </div>
                    <div className={`text-base sm:text-lg lg:text-xl font-mono font-extrabold mt-1 whitespace-nowrap ${
                      activeExecutiveSummary.fixedCost === 0 ? 'text-emerald-300' : 'text-rose-300'
                    }`}>
                      {activeExecutiveSummary.fixedCost === 0 ? 'Rp 0' : `-${formatRupiah(activeExecutiveSummary.fixedCost)}`}
                    </div>
                  </div>
                  <span className="text-[10px] text-white/60 block mt-2">
                    {activeExecutiveSummary.fixedCost === 0 
                      ? '✓ Sewa & utilitas lunas dibayar' 
                      : fixedCostDeductionMode === 'kas_riil'
                      ? 'Sisa beban toko belum lunas'
                      : 'Sewa, Wi-Fi, Sampah (/30 hr)'}
                  </span>
                </div>

                {/* 3. HPP Bahan */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between relative group hover:border-amber-500/40 transition">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300 block">
                      3. HPP Modal Porsi
                    </span>
                    <div className="text-base sm:text-lg lg:text-xl font-mono font-extrabold text-amber-300 mt-1 whitespace-nowrap">
                      -{formatRupiah(activeExecutiveSummary.hpp)}
                    </div>
                  </div>
                  <span className="text-[10px] text-white/60 block mt-2">
                    Resep Serabi &amp; Wedang Kasir
                  </span>
                </div>

                {/* 4. Upah Hadir / Standar Toko */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between relative group hover:border-blue-500/40 transition">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-blue-300 block">
                        4. Upah Staf Toko
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {upahDeductionMode === 'standar_harian' ? 'Standar /Hari' : 'Presensi Riil'}
                      </span>
                    </div>
                    <div className="text-base sm:text-lg lg:text-xl font-mono font-extrabold text-blue-300 mt-1 whitespace-nowrap">
                      -{formatRupiah(activeExecutiveSummary.gaji)}
                    </div>
                  </div>
                  <span className="text-[10px] text-white/60 block mt-2">
                    {upahDeductionMode === 'standar_harian'
                      ? `${activeExecutiveSummary.totalWorkersCount} Staf Terdaftar (/6 Hari Kerja)`
                      : `${activeExecutiveSummary.stafHadir} Staf Presensi Masuk`}
                  </span>
                </div>

                {/* 5. Belanja Toko Laci (Kas Kecil Approved) */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between relative group hover:border-purple-500/40 transition">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300 block">
                      5. Belanja Toko Laci
                    </span>
                    <div className="text-base sm:text-lg lg:text-xl font-mono font-extrabold text-purple-300 mt-1 whitespace-nowrap">
                      {activeExecutiveSummary.belanja === 0 ? 'Rp 0' : `-${formatRupiah(activeExecutiveSummary.belanja)}`}
                    </div>
                  </div>
                  <span className="text-[10px] text-white/60 block mt-2">
                    Gas LPG, Es Batu &amp; Operasional
                  </span>
                </div>

                {/* 6. Uang Bersih Boss */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 font-black col-span-2 sm:col-span-1 lg:col-span-1 shadow-lg border border-amber-300 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-900 block">
                      💰 Uang Bersih Boss
                    </span>
                    <div className="text-base sm:text-lg lg:text-xl font-mono font-black text-slate-950 mt-1 whitespace-nowrap">
                      {activeExecutiveSummary.uangBersih >= 0 ? '+' : ''}{formatRupiah(activeExecutiveSummary.uangBersih)}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-900/80 font-bold block mt-2">
                    Masuk Rekening Pak Agan
                  </span>
                </div>

              </div>

              {/* Mathematical Flow Bar: Rantai Rumus Yang Jelas */}
              <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] font-bold">
                  <span className="text-emerald-200 text-[10px] font-sans uppercase font-bold tracking-wider mr-1">
                    Alur Perhitungan:
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                    Omzet (+{formatRupiah(activeExecutiveSummary.omzet)})
                  </span>
                  <span className="text-white/60 font-black">−</span>
                  <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap">
                    Fixed Cost ({formatRupiah(activeExecutiveSummary.fixedCost)})
                  </span>
                  <span className="text-white/60 font-black">−</span>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                    HPP ({formatRupiah(activeExecutiveSummary.hpp)})
                  </span>
                  <span className="text-white/60 font-black">−</span>
                  <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 whitespace-nowrap">
                    Upah ({formatRupiah(activeExecutiveSummary.gaji)})
                  </span>
                  <span className="text-white/60 font-black">−</span>
                  <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 whitespace-nowrap">
                    Belanja Laci ({formatRupiah(activeExecutiveSummary.belanja)})
                  </span>
                  <span className="text-amber-300 font-black">=</span>
                  <span className="px-2.5 py-0.5 rounded-xl bg-amber-400 text-slate-950 font-black shadow-sm whitespace-nowrap">
                    Bersih: {formatRupiah(activeExecutiveSummary.uangBersih)}
                  </span>
                </div>

                <span className="text-[10px] text-emerald-300/80 font-medium">
                  *Terhitung otomatis realtime setiap kasir mencatat transaksi, presensi staf masuk, atau belanja kas kecil disetujui.
                </span>
              </div>

            </div>

            {/* PETA ALUR SISTEM FINANSIAL TERPADU (TRANSPARAN DARI KASIR KE BOSS) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-soft-sm space-y-4">
              <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  🗺️
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Alur Transparan: Dari Pesanan Kasir Hingga Uang Masuk Rekening Boss
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Memastikan setiap rupiah tercatat jelas asal-usulnya dan otomatis terpotong biaya harian tanpa manipulasi.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                {/* Tahap 1 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-emerald-700 font-extrabold text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[10px]">1</span>
                    <span>Pesanan Kasir POS</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Staf kasir input order Serabi Bawel &amp; Wedang di tablet. Uang masuk dari <strong>Tunai, QRIS, GrabFood, GoFood, &amp; ShopeeFood</strong> menjadi <strong>Omzet Kotor</strong>.
                  </p>
                </div>

                {/* Tahap 2 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-rose-700 font-extrabold text-xs">
                    <span className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center text-[10px]">2</span>
                    <span>Otomatis Potong Fixed Cost</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Biaya <strong>Sewa Ruko, Wi-Fi/Listrik &amp; Sampah</strong> per bulan otomatis dibagi 30 hari. Sistem langsung menyisihkan beban tetap toko setiap hari secara adil.
                  </p>
                </div>

                {/* Tahap 3 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-amber-700 font-extrabold text-xs">
                    <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-[10px]">3</span>
                    <span>Otomatis Potong HPP Bahan</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Tiap porsi Serabi (Kinca Durian/Keju) &amp; Wedang terjual langsung memotong <strong>modal bahan baku HPP</strong> sesuai takaran resep di Master Menu.
                  </p>
                </div>

                {/* Tahap 4 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-blue-700 font-extrabold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px]">4</span>
                    <span>Otomatis Potong Upah Hadir</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Staf yang melakukan <strong>presensi masuk</strong> otomatis dicatat upah hadirnya, memotong omzet toko hari itu dan diakumulasi ke payroll mingguan.
                  </p>
                </div>

                {/* Tahap 5 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-purple-700 font-extrabold text-xs">
                    <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-[10px]">5</span>
                    <span>Potong Belanja Kas Laci</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Pengajuan belanja kasir (gas LPG, es batu, kresek) yang <strong>di-approve Boss</strong> otomatis memotong saldo fisik laci kasir dan mengurangi laba harian secara transparan.
                  </p>
                </div>
              </div>
            </div>

            {/* PAPAN 2: POSISI UANG KASIR & OJOL (UANGNYA ADA DI MANA SAJA?) */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border-t-[5px] border-emerald-600 border-x border-b border-slate-200/90 shadow-soft-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Wallet className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Posisi Saldo Realtime: Uang Hari Ini Ada di Mana Saja?
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Rincian fisik di laci kasir vs QRIS vs transfer bank vs saldo tertampung di akun merchant ShopeeFood, GoFood, &amp; GrabFood.
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl self-start sm:self-auto">
                  Total Realisasi: <strong className="text-slate-900">{formatRupiah(channelBreakdown.totalChannel)}</strong>
                </span>
              </div>

              {/* 6 Kartu Saldo Terpisah: Fisik Laci, QRIS, Transfer Bank, ShopeePay, GoBiz, GrabMerchant */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                
                {/* 1. Laci Kasir */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">💵</span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 uppercase">Uang Fisik</span>
                  </div>
                  <span className="text-xs font-black text-slate-800 block mt-2">
                    {selectedCabangId === 'all' 
                      ? 'Kas Laci Kasir (10 Toko)' 
                      : `Kas Laci Kasir (${cabangList.find(c => c.id === selectedCabangId)?.kode || 'Toko'})`}
                  </span>
                  <div className="text-lg font-mono font-black text-emerald-800 mt-1">
                    {formatRupiah(channelBreakdown.tunaiTotal)}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1 leading-tight">
                    Uang kertas &amp; koin di laci kasir toko
                  </span>
                </div>

                {/* 2. QRIS */}
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">📱</span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-200 text-blue-900 uppercase">QRIS</span>
                  </div>
                  <span className="text-xs font-black text-slate-800 block mt-2">QRIS Rekening Pusat</span>
                  <div className="text-lg font-mono font-black text-blue-800 mt-1">
                    {formatRupiah(channelBreakdown.qrisTotal)}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1 leading-tight">
                    Scan QR langsung masuk rekening pusat
                  </span>
                </div>

                {/* 3. Transfer Bank Rekening Pusat */}
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">🏦</span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-200 text-indigo-900 uppercase">Transfer</span>
                  </div>
                  <span className="text-xs font-black text-slate-800 block mt-2">Transfer Rekening Pusat</span>
                  <div className="text-lg font-mono font-black text-indigo-800 mt-1">
                    {formatRupiah(channelBreakdown.transferTotal)}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1 leading-tight">
                    Transfer bank (BCA/Mandiri) masuk rekening pusat
                  </span>
                </div>

                {/* 4. ShopeeFood */}
                <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">🟠</span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-200 text-orange-900 uppercase">ShopeePay</span>
                  </div>
                  <span className="text-xs font-black text-slate-800 block mt-2">ShopeeFood Merchant</span>
                  <div className="text-lg font-mono font-black text-orange-700 mt-1">
                    {formatRupiah(channelBreakdown.shopeeTotal)}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1 leading-tight">
                    Saldo dompet merchant ShopeePay Partner
                  </span>
                </div>

                {/* 5. GoFood */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-300">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">🛵</span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 uppercase">GoBiz</span>
                  </div>
                  <span className="text-xs font-black text-slate-800 block mt-2">GoFood Merchant</span>
                  <div className="text-lg font-mono font-black text-emerald-700 mt-1">
                    {formatRupiah(channelBreakdown.gofoodTotal)}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1 leading-tight">
                    Saldo dompet merchant GoBiz resto
                  </span>
                </div>

                {/* 6. GrabFood */}
                <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">🟢</span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-teal-200 text-teal-900 uppercase">Grab / OVO</span>
                  </div>
                  <span className="text-xs font-black text-slate-800 block mt-2">GrabFood Merchant</span>
                  <div className="text-lg font-mono font-black text-teal-700 mt-1">
                    {formatRupiah(channelBreakdown.grabfoodTotal)}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1 leading-tight">
                    Saldo dompet GrabMerchant resto
                  </span>
                </div>

              </div>
            </div>

            {/* PAPAN 3: TABEL LAPORAN OMZET & LABA BERSIH 10 TOKO (FOKUS LAPORAN BERSIH) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft-sm overflow-hidden space-y-4 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Store className="w-5 h-5 text-emerald-700" />
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                      Laporan Kinerja &amp; Uang Bersih per Outlet (10 Cabang Resmi)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Laporan otomatis setelah dikurangi biaya tetap, modal porsi, dan upah kehadiran staf hari ini.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('fixedcost')}
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center space-x-1.5 transition self-start sm:self-auto cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Ubah Settingan Biaya Tetap Toko →</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="py-3 px-3.5">Outlet Cabang</th>
                      <th className="py-3 px-3.5 text-right">Omzet Kotor</th>
                      <th className="py-3 px-3.5 text-right text-rose-300">Potongan Fixed Cost</th>
                      <th className="py-3 px-3.5 text-right text-amber-300">HPP Bahan Baku</th>
                      <th className="py-3 px-3.5 text-right text-blue-300">
                        Upah Staf {upahDeductionMode === 'standar_harian' ? '(/Hari)' : 'Hadir'}
                      </th>
                      <th className="py-3 px-3.5 text-right text-purple-300">Belanja Toko Laci</th>
                      <th className="py-3 px-3.5 text-right bg-slate-950 text-amber-300">Uang Bersih Toko</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {bossDailyProfits.branchBreakdowns.map(b => {
                      const isSelected = selectedCabangId !== 'all' && b.cabang.id === selectedCabangId;
                      const fixedCostToko = b.sewaHarian + b.wifiListrikHarian + b.iuranHarian + (b.biayaLainHarian || 0);

                      return (
                        <tr 
                          key={b.cabang.id} 
                          className={`transition-colors cursor-pointer ${
                            isSelected 
                              ? 'bg-emerald-50/90 ring-2 ring-emerald-500 font-medium' 
                              : 'hover:bg-slate-50'
                          }`}
                          onClick={() => setSelectedCabangId(selectedCabangId === b.cabang.id ? 'all' : b.cabang.id)}
                          title="Klik untuk filter ringkasan toko ini"
                        >
                          <td className="py-3 px-3.5">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono text-[10px] font-bold text-slate-400 block">#{b.cabang.nomor} • {b.cabang.kode}</span>
                              {isSelected && (
                                <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[9px] font-bold">
                                  Terpilih
                                </span>
                              )}
                            </div>
                            <span className="font-extrabold text-slate-900 text-xs block">{b.cabang.nama}</span>
                            <span className="text-[10px] text-slate-500 block">{b.cabang.kota} • PJ: {b.cabang.pj_nama || '-'}</span>
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-extrabold text-slate-900 text-xs">
                            {formatRupiah(b.omzetKotor)}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-rose-600 text-xs whitespace-nowrap">
                            -{formatRupiah(fixedCostToko)}
                            <span className="text-[9px] text-slate-400 block font-normal">Sewa+Wifi+Sampah</span>
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-amber-700 text-xs whitespace-nowrap">
                            -{formatRupiah(b.totalHppBahan)}
                            <span className="text-[9px] text-slate-400 block font-normal">Porsi Terjual</span>
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-blue-700 text-xs whitespace-nowrap">
                            -{formatRupiah(b.totalGajiKaryawan)}
                            <span className="text-[9px] text-slate-400 block font-normal">
                              {upahDeductionMode === 'standar_harian' 
                                ? `${b.branchWorkersCount} Staf Terplot (/6 Hari)` 
                                : `${b.stafHadirCount} Staf Hadir`}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-purple-700 text-xs whitespace-nowrap">
                            {b.totalBelanjaLaci > 0 ? `-${formatRupiah(b.totalBelanjaLaci)}` : 'Rp 0'}
                            <span className="text-[9px] text-slate-400 block font-normal">Gas/Es/Operasional</span>
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-black text-sm bg-slate-50 text-emerald-800 whitespace-nowrap">
                            {formatRupiah(b.uangBersihBoss)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-100 font-extrabold border-t-2 border-slate-300 text-xs">
                    <tr>
                      <td className="py-3 px-3.5 uppercase text-slate-700">Total 10 Outlet</td>
                      <td className="py-3 px-3.5 text-right font-mono text-slate-900">
                        {formatRupiah(bossDailyProfits.totalOmzet10Toko)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-rose-600 whitespace-nowrap">
                        -{formatRupiah(bossDailyProfits.totalSewa10Toko + bossDailyProfits.totalWifiListrik10Toko + bossDailyProfits.totalIuran10Toko + (bossDailyProfits.totalBiayaLain10Toko || 0))}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-amber-700 whitespace-nowrap">
                        -{formatRupiah(bossDailyProfits.totalHpp10Toko)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-blue-700 whitespace-nowrap">
                        -{formatRupiah(bossDailyProfits.totalGaji10Toko)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-purple-700 whitespace-nowrap">
                        -{formatRupiah(bossDailyProfits.totalBelanja10Toko)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-black text-sm bg-slate-200 text-slate-950 whitespace-nowrap">
                        {formatRupiah(bossDailyProfits.totalBersihBoss10Toko)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Quick-Access Banner: Buku Mutasi Penjualan Kini Memiliki Menu Sendiri */}
            <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-950 p-5 rounded-3xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 border border-emerald-500/30 shadow-lg">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-800/80 border border-emerald-400/40 flex items-center justify-center text-amber-300 shadow-md shrink-0">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300 bg-emerald-900/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                      Menu Tersendiri • Tidak Numpuk
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm sm:text-base text-white mt-1">
                    Buku Mutasi Penjualan &amp; Rekap Struk Outlet
                  </h4>
                  <p className="text-xs text-emerald-200/80 mt-0.5">
                    Data transaksi, filter per Hari/Bulan/Tahun, AOV, dan unduh CSV kini dipisah ke menu tersendiri di bilah navigasi kiri agar dashboard ini tetap ringkas.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('mutasi')}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition-all flex items-center space-x-1.5 shrink-0 btn-tactile cursor-pointer"
              >
                <span>Buka Buku Mutasi Lengkap →</span>
              </button>
            </div>

          </div>
        )}

        {/* TAB DEDIKASI: BUKU MUTASI PENJUALAN OUTLET */}
        {activeTab === 'mutasi' && (
          <div className="space-y-6">
            <MutasiPenjualanStatement
              transaksiList={transaksiList}
              cabangList={cabangList}
              selectedCabangId={selectedCabangId}
            />
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
                    <option value="all">🏢 Semua Cabang ({cabangList.length || 10} Cabang Resmi)</option>
                    {cabangList.map(c => (
                      <option key={c.id} value={c.id}>
                        #{c.nomor} • {c.kode} - {c.nama.split('-')[1]?.trim() || c.nama}
                      </option>
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

        {/* TAB 2.5: BUKU BELANJA KEBUTUHAN & KAS KECIL 10 CABANG */}
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
                      .filter(e => e.jenis === 'belanja' && e.status === 'approved' && (belanjaCabangFilter === 'all' || isBranchMatch(e.cabang_id, belanjaCabangFilter)))
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
                      .filter(e => e.jenis === 'kasbon' && e.status === 'approved' && (belanjaCabangFilter === 'all' || isBranchMatch(e.cabang_id, belanjaCabangFilter)))
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
                      .filter(e => e.status === 'pending' && (belanjaCabangFilter === 'all' || isBranchMatch(e.cabang_id, belanjaCabangFilter)))
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
                      .filter(e => e.status === 'approved' && e.metode_pencairan === 'laci' && (belanjaCabangFilter === 'all' || isBranchMatch(e.cabang_id, belanjaCabangFilter)))
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
                        <option key={c.id} value={c.id}>
                          #{c.nomor} • {c.kode} - {c.nama.split('-')[1]?.trim() || c.nama}
                        </option>
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
                        const branch = cabangList.find(c => isBranchMatch(c.id, exp.cabang_id));
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

        {/* TAB: MONITOR ABSENSI 10 CABANG */}
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
                  Presensi dicatat dan divalidasi langsung oleh Admin Cabang / Kepala Outlet
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
                  {absensiList.filter(a => a.tanggal === selectedAbsensiDate && a.status === 'hadir' && (selectedCabangId === 'all' || isBranchMatch(a.cabang_id, selectedCabangId))).length} Staf
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
                  {karyawanList.filter(k => k.role !== 'owner' && (selectedCabangId === 'all' || isBranchMatch(k.cabang_id, selectedCabangId))).length} Staf
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
                  {absensiList.filter(a => a.status === 'hadir' && (selectedCabangId === 'all' || isBranchMatch(a.cabang_id, selectedCabangId))).length} Hari Kerja
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
                        const branch = cabangList.find(c => isBranchMatch(c.id, abs.cabang_id));
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
                <span className="font-bold block">Sistem Presensi Terverifikasi Anti-Kecurangan:</span>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Staf karyawan tidak bisa memanipulasi presensi sendiri. Setiap presensi diverifikasi langsung oleh Admin Cabang / Penanggung Jawab Outlet pada tablet kasir, dan secara realtime mengalir ke Modul Payroll Tutup Buku Pusat.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB: AUDIT ABSENSI BAHAN 10 TOKO & ANALISA HPP */}
        {activeTab === 'bahan' && (
          <BahanBakuAuditManager
            cabangList={cabangList}
            bahanList={bahanList}
            kirimanBahanList={kirimanBahanList}
            transaksiList={transaksiList}
            selectedDate={selectedBahanDate}
            onDateChange={(d) => setSelectedBahanDate(d)}
            onRefreshData={refreshAllData}
          />
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
                  Resep, harga dan ketersediaan menu per cabang dikontrol 100% oleh Admin Pusat. Tablet kasir cabang berstatus Read-Only.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={async () => {
                    if (confirm('KEMBALIKAN RESEP MENU BAWAAN?\n\nFungsi ini HANYA memulihkan 14 menu standar Serabi Bawel & Wedang Geprek jika ada resep yang salah diedit.\n\n✓ AMAN: Transaksi omzet, data toko cabang, kasir, dan keuangan Anda TIDAK AKAN terhapus.')) {
                      await db.resetMenuDefault();
                      await refreshAllData();
                      alert('Daftar 14 menu asli Serabi Bawel & Wedang Geprek berhasil dipulihkan.');
                    }
                  }}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors"
                  title="Kembalikan daftar menu ke 14 resep asli Serabi & Wedang (Aman: Tidak menghapus transaksi)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Pulihkan 14 Menu Asli</span>
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

            {/* Filter Outlet & Kontrol Ketersediaan Per Cabang */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/70">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center space-x-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                  <Store className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-700">Filter Outlet Cabang:</span>
                  <select
                    value={selectedMenuCabangFilter}
                    onChange={(e) => setSelectedMenuCabangFilter(e.target.value)}
                    className="bg-transparent font-extrabold text-xs text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Semua Cabang (10 Cabang Resmi)</option>
                    {cabangList.map(c => (
                      <option key={c.id} value={c.id}>
                        #{c.nomor} • {c.kode} - {c.nama.split('-')[1]?.trim() || c.nama}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedMenuCabangFilter !== 'all' && (
                  <div className="flex items-center space-x-1.5">
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-[11px]">
                      {cabangList.find(c => c.id === selectedMenuCabangFilter)?.nama.replace(/^(Cabang \d+ - )/, '')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedMenuCabangFilter('all')}
                      className="px-2 py-1 rounded-xl hover:bg-slate-200 text-slate-500 text-xs font-bold transition-colors"
                    >
                      Tampilkan Semua Cabang
                    </button>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500 font-medium">
                {selectedMenuCabangFilter !== 'all' ? (
                  <span>💡 Klik tombol pada kolom <strong>Ketersediaan Cabang</strong> untuk langsung mengaktifkan/mematikan menu di cabang ini.</span>
                ) : (
                  <span>Pilih cabang untuk mengaktifkan/menonaktifkan menu di outlet tertentu dengan 1-klik.</span>
                )}
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
                    <th className="py-3 px-4 text-center">Ketersediaan Cabang</th>
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

                        {/* Ketersediaan Cabang */}
                        <td className="py-3 px-4 text-center">
                          {selectedMenuCabangFilter === 'all' ? (
                            <div>
                              {(!item.cabang_ids || item.cabang_ids.length === 0 || item.cabang_ids.includes('all')) ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-[10px]">
                                  <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                  <span>Semua 10 Cabang</span>
                                </span>
                              ) : (
                                <div className="inline-flex flex-col items-center">
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-extrabold text-[10px]">
                                    <Store className="w-2.5 h-2.5 text-amber-600" />
                                    <span>{item.cabang_ids.length} dari {cabangList.length || 10} Cabang</span>
                                  </span>
                                  <div className="flex flex-wrap gap-1 justify-center mt-1 max-w-[170px]">
                                    {item.cabang_ids.slice(0, 4).map(cId => {
                                      const c = cabangList.find(cb => cb.id === cId);
                                      return (
                                        <span key={cId} className="px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[9px] font-bold">
                                          {c ? c.kode : cId}
                                        </span>
                                      );
                                    })}
                                    {item.cabang_ids.length > 4 && (
                                      <span className="px-1 py-0.2 rounded bg-slate-100 text-slate-400 font-mono text-[9px]">
                                        +{item.cabang_ids.length - 4}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            (() => {
                              const isSold = !item.cabang_ids || item.cabang_ids.length === 0 || item.cabang_ids.includes('all') || item.cabang_ids.includes(selectedMenuCabangFilter);
                              const targetBranch = cabangList.find(c => c.id === selectedMenuCabangFilter);
                              const branchCode = targetBranch?.kode || 'Cabang Ini';

                              return (
                                <div className="inline-flex items-center justify-center">
                                  {isSold ? (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleMenuBranch(item, selectedMenuCabangFilter)}
                                      className="group inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-rose-50 text-emerald-800 hover:text-rose-700 border border-emerald-300 hover:border-rose-300 font-extrabold text-[10px] transition-all shadow-2xs"
                                      title={`Klik untuk menonaktifkan menu ini di ${branchCode}`}
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 group-hover:hidden" />
                                      <XCircle className="w-3.5 h-3.5 text-rose-600 hidden group-hover:inline" />
                                      <span className="group-hover:hidden">Dijual di {branchCode}</span>
                                      <span className="hidden group-hover:inline">Nonaktifkan di {branchCode}</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleMenuBranch(item, selectedMenuCabangFilter)}
                                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 font-bold text-[10px] transition-all"
                                      title={`Klik untuk mengaktifkan penjualan menu ini di ${branchCode}`}
                                    >
                                      <Plus className="w-3 h-3 text-slate-400" />
                                      <span>+ Aktifkan di {branchCode}</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })()
                          )}
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

            {/* Security & Count note */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-[11px]">
                  <strong>Hak Akses Terkunci:</strong> Tablet kasir cabang berstatus Read-Only. Staf kasir hanya bisa melihat dan mentransaksikan menu yang telah diaktifkan untuk cabangnya.
                </span>
              </div>
              <div className="flex items-center space-x-2 shrink-0 text-[10px] font-mono font-bold">
                {selectedMenuCabangFilter !== 'all' ? (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200">
                    {menuList.filter(item => !item.cabang_ids || item.cabang_ids.length === 0 || item.cabang_ids.includes('all') || item.cabang_ids.includes(selectedMenuCabangFilter)).length} dari {menuList.length} Menu Aktif di Cabang Ini
                  </span>
                ) : (
                  <span className="text-slate-500">Total: {menuList.length} Menu Terdaftar</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DATA PEKERJA & PENGGAJIAN PER-TOKO */}
        {activeTab === 'karyawan' && (
          <div className="space-y-6">
            
            {/* Store Selection & Top Header */}
            <div className="bg-white p-5 rounded-3xl border-t-[4px] border-emerald-600 border-x border-b border-slate-200/80 shadow-soft-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* Toko Identifier */}
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-emerald-700/20 shrink-0">
                    👥
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                        SDM &amp; Penggajian Terpadu
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        • Struktur Manajemen Per-Toko
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                      {karyawanBranchFilter === 'all'
                        ? 'Master Data Karyawan Seluruh Cabang (10 Toko)'
                        : `Daftar Pekerja ${cabangList.find(c => c.id === karyawanBranchFilter)?.nama || 'Cabang'}`}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Kelola profil pekerja, penempatan cabang, tarif upah harian / tunjangan makan, plafon kasbon, dan PIN kasir per toko.
                    </p>
                  </div>
                </div>

                {/* Dropdown Filter Toko & Tambah Karyawan */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200 text-xs font-bold shadow-2xs">
                    <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="text-slate-500 text-[11px] font-bold">Pilih Toko:</span>
                    <select
                      value={karyawanBranchFilter}
                      onChange={(e) => setKaryawanBranchFilter(e.target.value)}
                      className="bg-transparent font-extrabold text-slate-900 focus:outline-none cursor-pointer text-xs"
                    >
                      <option value="all">🏢 Semua Cabang ({karyawanList.length} Staf)</option>
                      {cabangList.map(c => {
                        const count = karyawanList.filter(k => isBranchMatch(k.cabang_id, c.id)).length;
                        return (
                          <option key={c.id} value={c.id}>
                            #{c.nomor} • {c.kode} - {c.nama.split('-')[1]?.trim() || c.nama} ({count} staf)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCreateKaryawanModal(true)}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md shadow-emerald-800/20 btn-tactile transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      + Tambah Karyawan {karyawanBranchFilter !== 'all' ? `di ${cabangList.find(c => c.id === karyawanBranchFilter)?.kode || 'Toko Ini'}` : ''}
                    </span>
                  </button>
                </div>

              </div>

              {/* 4 Stat Cards Ringkasan SDM & Pekerja */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5 pt-4 border-t border-slate-100">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Total Pekerja {karyawanBranchFilter === 'all' ? '10 Toko' : 'Toko Ini'}
                  </span>
                  <div className="text-xl font-mono font-black text-slate-900 mt-1 tabular-nums">
                    {filteredKaryawan.length}
                    <span className="text-xs font-normal text-slate-500"> Orang</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
                    Data SDM &amp; Akun Pekerja
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Akun Staf Aktif
                  </span>
                  <div className="text-xl font-mono font-black text-emerald-800 mt-1 tabular-nums">
                    {filteredKaryawan.filter(k => !k.is_locked && k.role !== 'owner').length}
                    <span className="text-xs font-normal text-slate-500"> Staf</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold mt-0.5 block">
                    Bisa login kasir &amp; presensi
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Akun Tergembok / Kunci
                  </span>
                  <div className="text-xl font-mono font-black text-rose-700 mt-1 tabular-nums">
                    {filteredKaryawan.filter(k => k.is_locked).length}
                    <span className="text-xs font-normal text-slate-500"> Akun</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
                    Akses login dinonaktifkan
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Penempatan Cabang
                  </span>
                  <div className="text-xl font-mono font-black text-slate-900 mt-1 tabular-nums">
                    {cabangList.length || 10}
                    <span className="text-xs font-normal text-slate-500"> Cabang</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
                    Struktur cabang resmi tercover
                  </span>
                </div>
              </div>

            </div>

            {/* Karyawan & Credentials Table */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft-sm p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3 border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Tabel Master Karyawan &amp; Kredensial Akun
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {filteredKaryawan.length} Pekerja
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kelola profil pekerja, penempatan cabang toko, ubah username, sandi kuat, PIN kasir, dan buka/tutup gembok akun.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cari nama, ID, no HP, role..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 w-52 font-medium"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCreateKaryawanModal(true)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-sm btn-tactile transition-all"
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
                      <th className="py-3 px-4">Nama Karyawan &amp; Kontak</th>
                      <th className="py-3 px-4">Penempatan Cabang</th>
                      <th className="py-3 px-4 text-center">Kredensial &amp; Sandi / PIN</th>
                      <th className="py-3 px-4 text-center">Aksi Kelola Pekerja</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredKaryawan.map(kar => {
                      const branch = cabangList.find(c => isBranchMatch(c.id, kar.cabang_id));
                      const isRevealed = revealedPasswords[kar.id];

                      return (
                        <tr key={kar.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-extrabold text-slate-900 block text-sm">{kar.nama}</span>
                            <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-500 font-medium">
                              <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                                {formatKaryawanRole(kar.role)}
                              </span>
                              <span>•</span>
                              <span className="font-mono text-emerald-800 font-bold">{kar.telepon}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-800 block text-xs">
                              {branch?.nama.split('-')[1]?.trim() || branch?.nama || 'Pusat'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono font-bold">
                              #{branch?.nomor || '01'} • {branch?.kode || 'CBG-01'}
                            </span>
                          </td>

                          {/* Sandi / PIN & Status Gembok */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex flex-col items-center gap-1">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 text-xs shadow-2xs">
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
                                  {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                              <div>
                                {kar.is_locked ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                                    <span>🔒</span> TERGEMBOK
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span>✓</span> AKTIF
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Aksi Kelola Simpel & Praktis (Ploting, Ubah Sandi/PIN, Gembok, Hapus) */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedKaryawanForPlot(kar);
                                  setTargetBranchIdForPlot(kar.cabang_id);
                                }}
                                className="px-3 py-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100/80 rounded-xl border border-emerald-300 transition-colors inline-flex items-center space-x-1 shadow-2xs btn-tactile"
                                title="Ploting Penempatan Cabang Karyawan"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Ploting</span>
                              </button>

                              <button
                                onClick={() => setSelectedKaryawanForPinReset(kar)}
                                className="px-3 py-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100/80 rounded-xl border border-amber-300 transition-colors inline-flex items-center space-x-1 shadow-2xs btn-tactile"
                                title="Ganti Username, Sandi Kuat & PIN Tablet Kasir"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                                <span>Ubah Sandi &amp; PIN</span>
                              </button>

                              {kar.is_locked ? (
                                <button
                                  type="button"
                                  onClick={() => handleUnlockUser(kar.id)}
                                  className="px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-300 transition-colors inline-flex items-center space-x-1"
                                  title="Buka Gembok Akun"
                                >
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>Buka</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleLockUser(kar.id)}
                                  className="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-slate-200 hover:border-rose-300 transition-colors inline-flex items-center space-x-1"
                                  title="Gembok Akun Karyawan"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Kunci</span>
                                </button>
                              )}

                              {kar.role !== 'owner' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteKaryawan(kar.id, kar.nama)}
                                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Hapus Karyawan"
                                >
                                  <Trash2 className="w-4 h-4 text-rose-600" />
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

        {/* TAB KHUSUS: PROFIL TOKO, SANDI KASIR & FORMAT STRUK PROMO */}
        {activeTab === 'profiltoko' && (
          <ProfilTokoManager
            cabangList={cabangList}
            onRefreshData={refreshAllData}
          />
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
                {/* Branch Filter Per-Cabang */}
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
                      <option key={c.id} value={c.id}>
                        #{c.nomor} • {c.kode} - {c.nama.split('-')[1]?.trim() || c.nama}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mode Selector - Penggajian Murni Mingguan */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setPayrollMode('mingguan');
                      shiftPayrollWeek('current');
                    }}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      payrollMode === 'mingguan' ? 'bg-emerald-700 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ✓ Per Minggu
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayrollMode('rentang')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      payrollMode === 'rentang' ? 'bg-white text-emerald-800 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Rentang Tanggal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayrollMode('harian')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      payrollMode === 'harian' ? 'bg-white text-emerald-800 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Per Hari
                  </button>
                </div>

                {/* Date Input based on Mode */}
                {payrollMode === 'mingguan' && (
                  <div className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => shiftPayrollWeek('prev')}
                      className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10.5px] font-bold cursor-pointer transition shadow-2xs"
                      title="Geser ke Minggu Sebelumnya"
                    >
                      ◀ Minggu Lalu
                    </button>
                    <div className="flex items-center space-x-1.5 text-emerald-950 font-mono text-xs px-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{payrollStartDate} s.d. {payrollEndDate}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => shiftPayrollWeek('current')}
                      className="px-2 py-0.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 text-[10.5px] font-extrabold hover:bg-emerald-200 cursor-pointer transition shadow-2xs"
                      title="Kembali ke Minggu Ini"
                    >
                      Minggu Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => shiftPayrollWeek('next')}
                      className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10.5px] font-bold cursor-pointer transition shadow-2xs"
                      title="Geser ke Minggu Berikutnya"
                    >
                      Minggu Depan ▶
                    </button>
                  </div>
                )}

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
                  className="px-4 py-2 rounded-xl bg-accent-gold hover:bg-amber-600 text-white font-extrabold text-xs shadow-md shadow-accent-gold/25 btn-tactile flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Kunci Gaji Mingguan</span>
                </button>
              </div>
            </div>

            {/* 4 Financial Stat Cards Modul Payroll */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-2xs">
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                  Total Gaji Bersih Periode Ini (Mingguan)
                </span>
                <div className="text-xl font-mono font-black text-emerald-950 mt-1 tabular-nums">
                  {formatRupiah(calculatedPayrollDrafts.reduce((sum, d) => sum + d.gaji_bersih, 0))}
                </div>
                <span className="text-[10px] text-emerald-700 font-bold mt-0.5 block">
                  Siap transfer ke {calculatedPayrollDrafts.length} staf
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  {payrollBranchFilter === 'all' ? 'Beban Upah Mingguan 10 Toko' : 'Beban Upah Mingguan Cabang'}
                </span>
                <div className="text-xl font-mono font-black text-slate-900 mt-1 tabular-nums">
                  {formatRupiah(
                    karyawanList
                      .filter(k => k.role !== 'owner' && (payrollBranchFilter === 'all' || isBranchMatch(k.cabang_id, payrollBranchFilter)))
                      .reduce((sum, k) => sum + ((k.gaji_harian || 100000) * 6), 0)
                  )}
                  <span className="text-xs font-normal text-slate-500"> /minggu</span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
                  Beban Harian: {formatRupiah(
                    karyawanList
                      .filter(k => k.role !== 'owner' && (payrollBranchFilter === 'all' || isBranchMatch(k.cabang_id, payrollBranchFilter)))
                      .reduce((sum, k) => sum + (k.gaji_harian || 100000), 0)
                  )} /hari (Dibagi 6 Hari Kerja)
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 shadow-2xs">
                <span className="text-[10px] font-extrabold text-rose-800 uppercase tracking-wider block">
                  Kasbon Terpotong Otomatis
                </span>
                <div className="text-xl font-mono font-black text-rose-900 mt-1 tabular-nums">
                  -{formatRupiah(calculatedPayrollDrafts.reduce((sum, d) => sum + d.potongan_kasbon, 0))}
                </div>
                <span className="text-[10px] text-rose-700 font-bold mt-0.5 block">
                  Otomatis lunas saat kunci gaji
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-2xs">
                <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">
                  Plafon Kasbon Terdaftar
                </span>
                <div className="text-xl font-mono font-black text-amber-950 mt-1 tabular-nums">
                  {formatRupiah(karyawanList.filter(k => k.role !== 'owner').reduce((sum, k) => sum + (k.plafon_kasbon || 500000), 0))}
                </div>
                <span className="text-[10px] text-amber-900 font-bold mt-0.5 block">
                  Limit pinjaman kasbon staf
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Nama Staf &amp; Outlet</th>
                    <th className="py-3 px-4">Kehadiran Minggu Ini</th>
                    <th className="py-3 px-4 text-right">Upah Harian (÷ 6)</th>
                    <th className="py-3 px-4 text-right">Total Upah Mingguan</th>
                    <th className="py-3 px-4 text-right text-rose-600">Hutang / Kasbon (Auto-Potong)</th>
                    <th className="py-3 px-4 text-right text-amber-700">Tabungan Mingguan</th>
                    <th className="py-3 px-4 text-right font-extrabold text-brand-dark">Gaji Bersih Ditransfer</th>
                    <th className="py-3 px-4 text-center">Slip Digital &amp; Kirim WA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculatedPayrollDrafts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
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
                          <span>{draft.total_kehadiran_hari} Hari Hadir</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 tabular-nums">
                        <div>{formatRupiah(draft.upah_harian || 100000)} <span className="text-[10px] text-slate-400 font-normal">/ hari</span></div>
                        <span className="text-[9.5px] text-emerald-800 font-medium block">
                          {formatRupiah((draft.upah_harian || 100000) * 6)} /mgg
                        </span>
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

                      {/* Celengan Tabungan Karyawan */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-800 tabular-nums">
                        {draft.potongan_tabungan && draft.potongan_tabungan > 0 ? (
                          <div>
                            <span className="text-amber-900">-{formatRupiah(draft.potongan_tabungan)}</span>
                            <span className="text-[9px] text-amber-700 block font-semibold">
                              Saldo: {formatRupiah(draft.total_tabungan_snapshot || 0)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-normal">Rp 0 (Tanpa Nabung)</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-extrabold text-brand-dark tabular-nums text-sm">
                        {formatRupiah(draft.gaji_bersih)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {draft.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-[11px] font-black">
                              ✓ Lunas
                            </span>
                          ) : (
                            <button
                              onClick={() => setSelectedPayrollForPayout(draft)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full text-xs font-bold transition shadow-xs btn-tactile"
                              title="Cairkan Dana & Transfer ke Rekening Staf"
                            >
                              <span>💸</span>
                              <span>Cairkan</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedPayrollSlip(draft)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-full text-xs font-bold transition shadow-xs btn-tactile"
                            title="Buka Rincian Absensi, Kasbon & Slip Gaji Digital"
                          >
                            <span>🔍</span>
                            <span>Slip</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              const waUrl = generateWhatsAppPayrollSlipLink({
                                telepon: draft.karyawan_telepon,
                                nama: draft.karyawan_nama || 'Staf',
                                role: formatKaryawanRole(draft.karyawan_role),
                                cabangNama: draft.cabang_nama || 'Cabang',
                                slipNo: draft.slip_no,
                                periodeLabel: payrollDateLabel,
                                gajiPokok: draft.gaji_pokok,
                                tunjangan: 0,
                                potonganKasbon: draft.potongan_kasbon,
                                potonganTabungan: draft.potongan_tabungan,
                                totalTabungan: draft.total_tabungan_snapshot,
                                gajiBersih: draft.gaji_bersih,
                                totalHari: draft.total_kehadiran_hari,
                                tipeGaji: draft.tipe_gaji,
                                upahHarian: draft.upah_harian,
                              });
                              window.open(waUrl, '_blank');
                            }}
                            className="px-2.5 py-1 rounded-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs transition-colors inline-flex items-center space-x-1 shadow-xs btn-tactile"
                            title="Kirim Slip Gaji Resmi Langsung ke WhatsApp Staf"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-white" />
                            <span>Kirim WA</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const kar = karyawanList.find(k => k.id === draft.karyawan_id);
                              if (kar) setSelectedKaryawanForSalaryEdit(kar);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold transition shadow-2xs btn-tactile"
                            title="Ubah Tarif Upah Harian & Skema Gaji"
                          >
                            <span>$</span>
                            <span>Ubah Gaji</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const kar = karyawanList.find(k => k.id === draft.karyawan_id);
                              if (kar) setSelectedKaryawanForTabungan(kar);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-bold transition shadow-2xs btn-tactile"
                            title="Buka Buku Tabungan & Celengan Karyawan"
                          >
                            <PiggyBank className="w-3.5 h-3.5 text-amber-700" />
                            <span>Tabungan</span>
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

        {/* TAB KHUSUS: KELOLA BIAYA TETAP & PEMBAYARAN BULANAN (FIXED COST) 10 CABANG */}
        {activeTab === 'fixedcost' && (
          <FixedCostPaymentManager
            cabangList={cabangList}
            onEditCabang={(c) => setSelectedCabangForFixedCost(c)}
            selectedCabangId={selectedCabangId}
          />
        )}

      </main>

      {/* MODALS */}
      {selectedCabangForFixedCost && (
        <EditFixedCostModal
          cabang={selectedCabangForFixedCost}
          onClose={() => setSelectedCabangForFixedCost(null)}
          onSuccess={async (updated) => {
            setSelectedCabangForFixedCost(null);
            await refreshAllData();
          }}
        />
      )}

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

      {selectedKaryawanForTabungan && (
        <BukuTabunganModal
          karyawan={selectedKaryawanForTabungan}
          cabangNama={cabangList.find(c => isBranchMatch(c.id, selectedKaryawanForTabungan.cabang_id))?.nama}
          onClose={() => setSelectedKaryawanForTabungan(null)}
          onSuccess={async () => {
            await refreshAllData();
          }}
        />
      )}

      {/* Modal Ploting Cabang Karyawan */}
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
                    {selectedKaryawanForPlot.role} • Cabang Saat Ini: <strong>{cabangList.find(c => isBranchMatch(c.id, selectedKaryawanForPlot.cabang_id))?.nama || 'Pusat'}</strong>
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
          cabangList={cabangList}
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
          defaultCabangId={karyawanBranchFilter !== 'all' ? karyawanBranchFilter : (selectedCabangId !== 'all' ? selectedCabangId : undefined)}
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
          defaultDate={getTodayDateString()}
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
