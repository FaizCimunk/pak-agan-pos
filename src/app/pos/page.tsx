'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PosHeader from '@/components/PosHeader';
import PosTouchGrid from '@/components/PosTouchGrid';
import PosCartDrawer, { getCartItemUnitPrice } from '@/components/PosCartDrawer';
import PaymentModal from '@/components/PaymentModal';
import ShiftOpenModal from '@/components/ShiftOpenModal';
import ShiftCloseModal from '@/components/ShiftCloseModal';
import ReceiptModal from '@/components/ReceiptModal';
import ExpenseRequestModal from '@/components/ExpenseRequestModal';
import DeviceSetupModal from '@/components/DeviceSetupModal';
import BranchAttendanceModal from '@/components/BranchAttendanceModal';
import DailyBranchReportModal from '@/components/DailyBranchReportModal';
import DailyMaterialStockModal from '@/components/DailyMaterialStockModal';
import KitchenTicketModal from '@/components/KitchenTicketModal';
import OpenBillsModal from '@/components/OpenBillsModal';

import { 
  Cabang, 
  MenuItem, 
  KategoriMenu, 
  Karyawan, 
  Shift, 
  CartItem, 
  Transaksi, 
  PengeluaranKasbon,
  PaymentMethod 
} from '@/lib/types';
import { db, generateUUID, isBranchMatch } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { printerService, getItemKitchenStation } from '@/lib/printer';
import { generateInvoiceNumber, formatRupiah, getTodayDateString, toWibDateString, toWibBusinessDateString } from '@/lib/utils';
import { Lock, ShoppingBag, ArrowRight, X } from 'lucide-react';

const DEVICE_LOCK_KEY = 'pakagan_device_cabang_id';

export default function PosPage() {
  const [cabangList, setCabangList] = useState<Cabang[]>([]);
  const [currentCabang, setCurrentCabang] = useState<Cabang | null>(null);
  const [menuList, setMenuList] = useState<MenuItem[]>([]);
  const [kategoriList, setKategoriList] = useState<KategoriMenu[]>([]);
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);

  // Cart & Order State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState<string>('Pelanggan Walk-in');
  const [penanda, setPenanda] = useState<string>('No. 01');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);

  // Open Bills (Bayar Nanti) State
  const [openBills, setOpenBills] = useState<Transaksi[]>([]);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<Transaksi | null>(null);
  const [editingBill, setEditingBill] = useState<Transaksi | null>(null);

  // Modals
  const [isShiftOpenOpen, setIsShiftOpenOpen] = useState<boolean>(false);
  const [isShiftCloseOpen, setIsShiftCloseOpen] = useState<boolean>(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [isKitchenModalOpen, setIsKitchenModalOpen] = useState<boolean>(false);
  const [isOpenBillsModalOpen, setIsOpenBillsModalOpen] = useState<boolean>(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState<boolean>(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState<boolean>(false);
  const [isDeviceSetupOpen, setIsDeviceSetupOpen] = useState<boolean>(false);
  const [isDailyReportOpen, setIsDailyReportOpen] = useState<boolean>(false);
  const [isMaterialStockOpen, setIsMaterialStockOpen] = useState<boolean>(false);
  const [transaksiList, setTransaksiList] = useState<Transaksi[]>([]);
  const [expenseList, setExpenseList] = useState<PengeluaranKasbon[]>([]);
  const [lastTransaksi, setLastTransaksi] = useState<Transaksi | null>(null);
  const [kitchenTicketTrx, setKitchenTicketTrx] = useState<Transaksi | null>(null);
  const [orientationMode, setOrientationMode] = useState<'portrait' | 'landscape'>('portrait');
  const [orientationFeedback, setOrientationFeedback] = useState<string | null>(null);

  const router = useRouter();
  const currentCabangRef = useRef<Cabang | null>(null);
  currentCabangRef.current = currentCabang;
  const hasPromptedInitialShiftRef = useRef<boolean>(false);
  const orientationModeRef = useRef<'portrait' | 'landscape'>('portrait');
  orientationModeRef.current = orientationMode;
  const orientationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSyncingPosRef = useRef<boolean>(false);
  const queuedPosSyncRef = useRef<boolean>(false);
  const posSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showOrientationNotice = useCallback((msg: string) => {
    setOrientationFeedback(msg);
    if (orientationTimerRef.current) {
      clearTimeout(orientationTimerRef.current);
    }
    orientationTimerRef.current = setTimeout(() => {
      setOrientationFeedback(null);
    }, 3200);
  }, []);

  const applyOrientationLock = useCallback(async (target: 'portrait' | 'landscape', fromUserAction = false) => {
    if (typeof window === 'undefined') return;

    // Kirim perintah orientasi jika berjalan di dalam APK WebView wrapper
    try {
      const rnWebView = (window as unknown as { ReactNativeWebView?: { postMessage?: (msg: string) => void } }).ReactNativeWebView;
      rnWebView?.postMessage?.(JSON.stringify({ type: 'SET_ORIENTATION', orientation: target }));
    } catch {
      // Abaikan jika bukan ReactNativeWebView
    }

    // Best-effort fullscreen saat user menekan Putar ke Miring di browser Android agar Screen Orientation API diizinkan
    if (fromUserAction && target === 'landscape' && !document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen?.();
      } catch {
        // Browser biasa kadang menolak fullscreen; tetap lanjutkan attempt lock()
      }
    }

    try {
      const orient = window.screen?.orientation as (ScreenOrientation & { lock?: (orientation: string) => Promise<void> }) | undefined;
      if (orient && typeof orient.lock === 'function') {
        await orient.lock(target === 'landscape' ? 'landscape-primary' : 'portrait-primary');
        if (fromUserAction) {
          showOrientationNotice(
            target === 'landscape'
              ? 'Layar dikunci ke mode Miring (Landscape).'
              : 'Layar dikunci ke mode Tegak (Potret).'
          );
        }
        return;
      }
    } catch {
      if (fromUserAction) {
        showOrientationNotice(
          target === 'landscape'
            ? 'Mode tampilan diatur ke Miring (Jika browser menahan rotasi, miringkan tablet / aktifkan layar penuh).'
            : 'Mode tampilan diatur ke Potret (Jika browser menahan rotasi, tegakkan tablet / nonaktifkan rotasi otomatis OS).'
        );
      }
      return;
    }

    if (fromUserAction) {
      showOrientationNotice(
        target === 'landscape'
          ? 'Tampilan disesuaikan ke mode Miring (Landscape).'
          : 'Tampilan disesuaikan ke mode Tegak (Potret).'
      );
    }
  }, [showOrientationNotice]);

  useEffect(() => {
    // Kunci awal ke Potret saat kasir dibuka; retry saat interaksi pertama jika browser butuh gesture
    void applyOrientationLock('portrait', false);
    const retryInitialPortrait = () => {
      if (orientationModeRef.current === 'portrait') {
        void applyOrientationLock('portrait', false);
      }
    };
    window.addEventListener('pointerdown', retryInitialPortrait, { once: true });
    return () => {
      window.removeEventListener('pointerdown', retryInitialPortrait);
      if (orientationTimerRef.current) clearTimeout(orientationTimerRef.current);
    };
  }, [applyOrientationLock]);

  const handleToggleOrientation = useCallback(() => {
    const nextMode: 'portrait' | 'landscape' = orientationModeRef.current === 'portrait' ? 'landscape' : 'portrait';
    setOrientationMode(nextMode);
    void applyOrientationLock(nextMode, true);
  }, [applyOrientationLock]);

  const syncPosState = useCallback(async (promptShiftIfMissing = false) => {
    if (isSyncingPosRef.current) {
      queuedPosSyncRef.current = true;
      return;
    }
    isSyncingPosRef.current = true;
    try {
      const preferredCabangId =
        currentCabangRef.current?.id ||
        (typeof window !== 'undefined' ? localStorage.getItem(DEVICE_LOCK_KEY) : null) ||
        undefined;

      const [cabangs, menus, kategories, allKars, trxs, exps] = await Promise.all([
        db.getCabangList(),
        db.getMenuList(),
        db.getKategoriList(),
        db.getAllKaryawan(),
        db.getTransaksiList(preferredCabangId),
        db.getPengeluaranList(preferredCabangId),
      ]);

      setCabangList(cabangs);
      setMenuList(menus);
      setKategoriList(kategories);
      setTransaksiList(trxs);
      setExpenseList(exps);

      const lockedCabangId = typeof window !== 'undefined' ? localStorage.getItem(DEVICE_LOCK_KEY) : null;
      let targetCabang =
        cabangs.find(c => isBranchMatch(c.id, currentCabangRef.current?.id || lockedCabangId)) ||
        cabangs[0] ||
        null;

      if (!targetCabang && cabangs.length > 0) {
        targetCabang = cabangs[0];
      }
      if (targetCabang && typeof window !== 'undefined' && !lockedCabangId) {
        localStorage.setItem(DEVICE_LOCK_KEY, targetCabang.id);
      }

      if (typeof window !== 'undefined') {
        const isSession = sessionStorage.getItem('pakagan_kasir_session');
        const isOwner = sessionStorage.getItem('pakagan_owner_authenticated');
        const isUser = sessionStorage.getItem('pakagan_user');
        if (!isSession && !isOwner && !isUser && targetCabang) {
          sessionStorage.setItem('pakagan_kasir_session', targetCabang.kasir_username || targetCabang.nama || 'Kasir Cabang');
        }
      }

      // CEK GEMBOK KEAMANAN CABANG
      if (targetCabang && targetCabang.is_kasir_locked) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('pakagan_kasir_session');
          sessionStorage.removeItem('pakagan_user');
        }
        alert(`AKSES DITOLAK:\nAkses tablet kasir "${targetCabang.nama}" sedang DIGEMBOK / DINONAKTIFKAN oleh Admin Pusat (Pak Agan)! Hubungi Owner untuk membuka gembok.`);
        window.location.replace('/');
        return;
      }

      setCurrentCabang(targetCabang);

      if (targetCabang) {
        const kars = allKars.filter(k => isBranchMatch(k.cabang_id, targetCabang!.id) && k.is_active);
        setKaryawanList(kars);

        const [shift, bills] = await Promise.all([
          db.getActiveShift(targetCabang.id, { transactions: trxs, expenses: exps }),
          db.getOpenBills(targetCabang.id),
        ]);
        setActiveShift(shift);
        setOpenBills(bills);

        if (promptShiftIfMissing && !shift && !hasPromptedInitialShiftRef.current) {
          hasPromptedInitialShiftRef.current = true;
          setIsShiftOpenOpen(true);
        }
      }
    } catch (err) {
      console.error('Error syncing POS data:', err);
    } finally {
      isSyncingPosRef.current = false;
      if (queuedPosSyncRef.current) {
        queuedPosSyncRef.current = false;
        syncPosState(false);
      }
    }
  }, []);

  // Initial Load & Device Binding
  const loadData = useCallback(async () => {
    await syncPosState(true);
  }, [syncPosState]);

  useEffect(() => {
    loadData();

    // SINKRONISASI REALTIME KASIR: Nama toko, promo, Approval ACC Admin & Saldo Laci Shift
    const scheduleSync = () => {
      if (posSyncTimerRef.current) clearTimeout(posSyncTimerRef.current);
      posSyncTimerRef.current = setTimeout(() => {
        syncPosState(false);
      }, 150);
    };

    const handleStorageUpdate = () => scheduleSync();
    window.addEventListener('pak_agan_db_updated', handleStorageUpdate);
    window.addEventListener('pak_agan_open_bills_updated', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    // Supabase Realtime untuk push instan ketika Admin ACC/Tolak pengajuan belanja/kasbon atau update cabang
    let posChannel: any = null;
    if (isSupabaseConfigured && supabase) {
      posChannel = supabase
        .channel('pos_live_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pengeluaran_kasbon' }, scheduleSync)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shift' }, scheduleSync)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transaksi' }, scheduleSync)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cabang' }, scheduleSync)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'absensi' }, scheduleSync)
        .subscribe();
    }

    // Auto-flush seluruh antrean offline (buka/tutup shift, transaksi, belanja/kasbon, absensi) saat online
    const handleOnline = async () => {
      try {
        const res = await db.syncAllOfflineQueues();
        if (res.syncedCount > 0) {
          console.log(`[POS] Tablet kembali online! Tersinkronisasi ${res.syncedCount} antrean offline ke Cloud Supabase.`);
        }
      } catch (err) {
        console.warn('Gagal sinkronisasi antrean offline:', err);
      }
    };

    window.addEventListener('online', handleOnline);
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      handleOnline();
    }

    // Interval cadangan setiap 15 detik agar approval/saldo laci tetap ter-update meski realtime websocket putus di 4G
    const syncInterval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        handleOnline();
        if (typeof document === 'undefined' || !document.querySelector('.fixed.inset-0.z-50')) {
          syncPosState(false);
        }
      }
    }, 15000);

    return () => {
      clearInterval(syncInterval);
      if (posSyncTimerRef.current) clearTimeout(posSyncTimerRef.current);
      window.removeEventListener('pak_agan_db_updated', handleStorageUpdate);
      window.removeEventListener('pak_agan_open_bills_updated', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('online', handleOnline);
      if (posChannel && supabase) {
        supabase.removeChannel(posChannel);
      }
    };
  }, [loadData, syncPosState]);

  // Lock Device to a specific Cabang
  const handleLockDevice = async (cabangId: string) => {
    const target = cabangList.find(c => isBranchMatch(c.id, cabangId)) || null;
    if (target?.is_kasir_locked) {
      alert(`Cabang "${target.nama}" saat ini sedang DIGEMBOK oleh Admin Pusat dan tidak dapat diaktifkan.`);
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEVICE_LOCK_KEY, cabangId);
    }
    setCurrentCabang(target);
    if (target) {
      const shift = await db.getActiveShift(target.id);
      setActiveShift(shift);
      const kars = await db.getKaryawanByCabang(target.id);
      setKaryawanList(kars);
    }
    setCart([]);
    setIsDeviceSetupOpen(false);
  };

  // Cart Management
  const handleAddToCart = (item: MenuItem, temp?: 'panas' | 'dingin', customHarga?: number, varianNama?: string) => {
    const isDrink = getItemKitchenStation(item) === 'wedang';
    const finalTemp = isDrink ? (temp || (item.suhu_mode === 'khusus_es' ? 'dingin' : 'panas')) : undefined;
    const finalUnitPrice = customHarga || (finalTemp === 'dingin' && item.harga_es ? item.harga_es : item.harga);

    setCart(prev => {
      const existingIndex = prev.findIndex(ci => 
        ci.menu.id === item.id && 
        ci.temperature === finalTemp && 
        ci.varian_nama === varianNama &&
        getCartItemUnitPrice(ci) === finalUnitPrice &&
        !ci.catatan
      );

      if (existingIndex !== -1) {
        const next = [...prev];
        next[existingIndex] = { ...next[existingIndex], qty: next[existingIndex].qty + 1 };
        return next;
      }

      return [...prev, { 
        menu: item, 
        qty: 1, 
        catatan: '',
        temperature: finalTemp,
        custom_harga: finalUnitPrice,
        varian_nama: varianNama,
      }];
    });
  };

  const handleUpdateQty = (itemIndex: number, delta: number) => {
    setCart(prev => {
      if (itemIndex < 0 || itemIndex >= prev.length) return prev;
      const target = prev[itemIndex];
      const nextQty = target.qty + delta;
      if (nextQty <= 0) {
        return prev.filter((_, i) => i !== itemIndex);
      }
      const next = [...prev];
      next[itemIndex] = { ...target, qty: nextQty };
      return next;
    });
  };

  const handleUpdateNotes = (itemIndex: number, notes: string) => {
    setCart(prev => {
      if (itemIndex < 0 || itemIndex >= prev.length) return prev;
      const next = [...prev];
      next[itemIndex] = { ...next[itemIndex], catatan: notes };
      return next;
    });
  };

  const handleToggleTemperature = (itemIndex: number) => {
    setCart(prev => {
      if (itemIndex < 0 || itemIndex >= prev.length) return prev;
      const target = prev[itemIndex];
      const isDrink = getItemKitchenStation(target.menu) === 'wedang';
      if (!isDrink) return prev;

      const nextTemp: 'panas' | 'dingin' = target.temperature === 'dingin' ? 'panas' : 'dingin';
      const nextPrice = nextTemp === 'dingin' && target.menu.harga_es ? target.menu.harga_es : target.menu.harga;

      const next = [...prev];
      next[itemIndex] = { 
        ...target, 
        temperature: nextTemp,
        custom_harga: nextPrice,
      };
      return next;
    });
  };

  const handleRemoveItem = (itemIndex: number) => {
    setCart(prev => prev.filter((_, i) => i !== itemIndex));
  };

  const handleClearCart = () => {
    setCart([]);
    setEditingBill(null);
  };

  // Checkout & Payment
  const handleCheckoutClick = () => {
    if (!activeShift) {
      setIsShiftOpenOpen(true);
      return;
    }
    if (editingBill) {
      const subtotal = cart.reduce((acc, it) => acc + getCartItemUnitPrice(it) * it.qty, 0);
      const updatedEditingBill: Transaksi = {
        ...editingBill,
        penanda: penanda.trim() || editingBill.penanda || 'No. 01',
        meja: penanda.trim() || editingBill.meja || 'No. 01',
        subtotal,
        total: subtotal,
        items: cart.map(it => {
          const unitPrice = getCartItemUnitPrice(it);
          return {
            menu_id: it.menu.id,
            nama_menu: it.menu.nama,
            harga: unitPrice,
            qty: it.qty,
            subtotal: unitPrice * it.qty,
            catatan: it.catatan,
            temperature: it.temperature,
            varian_nama: it.varian_nama,
          };
        }),
      };
      setSelectedBillForPayment(updatedEditingBill);
      setIsPaymentOpen(true);
      return;
    }
    setSelectedBillForPayment(null);
    setIsPaymentOpen(true);
  };

  // Simpan Pesanan Penanda (Bayar Nanti) & Buka Tiket Dapur 3 Ruangan
  const handleSaveOpenBill = async () => {
    if (!currentCabang) return;
    if (cart.length === 0) {
      alert('Pilih menu terlebih dahulu ke dalam keranjang.');
      return;
    }
    if (!activeShift) {
      alert('Silakan buka shift kasir terlebih dahulu untuk mencatat pesanan.');
      setIsShiftOpenOpen(true);
      return;
    }

    const subtotal = cart.reduce((acc, it) => acc + getCartItemUnitPrice(it) * it.qty, 0);
    const total = subtotal;
    const finalPenanda = penanda.trim() || 'No. 01';
    const finalCustomer = customerName.trim() || finalPenanda;

    const openTrx: Transaksi = {
      id: editingBill?.id || generateUUID(),
      invoice_no: editingBill?.invoice_no || generateInvoiceNumber(currentCabang.kode),
      cabang_id: currentCabang.id,
      cabang_nama: currentCabang.nama,
      shift_id: activeShift?.id,
      karyawan_id: activeShift?.karyawan_id,
      karyawan_nama: activeShift?.karyawan_nama,
      penanda: finalPenanda,
      meja: finalPenanda,
      nama_pelanggan: finalCustomer,
      waktu: editingBill?.waktu || new Date().toISOString(),
      subtotal,
      diskon: 0,
      total,
      metode_bayar: 'tunai',
      bayar: 0,
      kembali: 0,
      status: 'pending_payment',
      is_offline_synced: false,
      items: cart.map(it => {
        const unitPrice = getCartItemUnitPrice(it);
        return {
          menu_id: it.menu.id,
          nama_menu: it.menu.nama,
          harga: unitPrice,
          qty: it.qty,
          subtotal: unitPrice * it.qty,
          catatan: it.catatan,
          temperature: it.temperature,
          varian_nama: it.varian_nama,
        };
      }),
    };

    await db.saveOpenBill(openTrx);
    const updatedBills = await db.getOpenBills(currentCabang.id);
    setOpenBills(updatedBills);

    // Reset keranjang untuk transaksi berikutnya
    setEditingBill(null);
    setCart([]);
    setCustomerName('Pelanggan Walk-in');
    setPenanda('No. 01');

    // Buka otomatis tiket dapur untuk 3 ruangan masak (Wedang, Serabi, Makanan)
    setKitchenTicketTrx(openTrx);
    setIsKitchenModalOpen(true);
  };

  const handleEditOpenBill = (bill: Transaksi, openCartSheet: boolean = false) => {
    setEditingBill(bill);
    setPenanda(bill.penanda || bill.meja || 'No. 01');
    setCustomerName(bill.nama_pelanggan || 'Pelanggan Walk-in');

    const reconstructedCart: CartItem[] = bill.items.map(it => {
      const matched = menuList.find(m => m.id === it.menu_id);
      const menuItem: MenuItem = matched || {
        id: it.menu_id,
        nama: it.nama_menu,
        kode: '',
        kategori_id: 'kat-wg',
        kategori_nama: 'Minuman / Menu',
        harga: it.harga,
        hpp: 0,
        deskripsi: '',
        gambar: '',
        is_favorite: false,
        is_active: true,
      };
      return {
        menu: menuItem,
        qty: it.qty,
        catatan: it.catatan || '',
        temperature: it.temperature,
        custom_harga: it.harga,
        varian_nama: it.varian_nama,
      };
    });

    setCart(reconstructedCart);
    setIsOpenBillsModalOpen(false);
    setIsMobileCartOpen(openCartSheet);
  };

  const handleStartPayOpenBill = (bill: Transaksi) => {
    setSelectedBillForPayment(bill);
    setIsOpenBillsModalOpen(false);
    setIsPaymentOpen(true);
  };

  const handlePrintOpenBillKitchenTicket = (bill: Transaksi) => {
    setKitchenTicketTrx(bill);
    setIsKitchenModalOpen(true);
  };

  const handleCancelOpenBill = async (billId: string) => {
    await db.cancelOpenBill(billId);
    if (currentCabang) {
      const updated = await db.getOpenBills(currentCabang.id);
      setOpenBills(updated);
    }
  };

  const handlePaymentSuccess = async (
    method: PaymentMethod,
    bayar: number,
    kembali: number,
    autoPrint: boolean
  ) => {
    if (!currentCabang) return;

    let savedTrx: Transaksi;

    if (selectedBillForPayment) {
      // Pelunasan Pesanan Meja / Penanda (Bayar Nanti)
      if (editingBill && editingBill.id === selectedBillForPayment.id) {
        await db.saveOpenBill(selectedBillForPayment);
      }
      savedTrx = await db.payOpenBill(selectedBillForPayment.id, {
        metode_bayar: method,
        bayar,
        kembali,
        shift_id: activeShift?.id,
        karyawan_id: activeShift?.karyawan_id,
        karyawan_nama: activeShift?.karyawan_nama,
      });
      setSelectedBillForPayment(null);
      setEditingBill(null);
      setCart([]);
      const updatedBills = await db.getOpenBills(currentCabang.id);
      setOpenBills(updatedBills);
    } else {
      // Pembayaran Langsung dari Keranjang Kasir
      const subtotal = cart.reduce((acc, it) => acc + getCartItemUnitPrice(it) * it.qty, 0);
      const total = subtotal;
      const finalPenanda = penanda.trim() || 'No. 01';

      const newTrx: Transaksi = {
        id: generateUUID(),
        invoice_no: generateInvoiceNumber(currentCabang.kode),
        cabang_id: currentCabang.id,
        cabang_nama: currentCabang.nama,
        shift_id: activeShift?.id,
        karyawan_id: activeShift?.karyawan_id,
        karyawan_nama: activeShift?.karyawan_nama,
        penanda: finalPenanda,
        meja: finalPenanda,
        nama_pelanggan: customerName.trim() || 'Pelanggan Walk-in',
        waktu: new Date().toISOString(),
        subtotal,
        diskon: 0,
        total,
        metode_bayar: method,
        bayar,
        kembali,
        status: 'completed',
        is_offline_synced: navigator.onLine,
        items: cart.map(it => {
          const unitPrice = getCartItemUnitPrice(it);
          return {
            menu_id: it.menu.id,
            nama_menu: it.menu.nama,
            harga: unitPrice,
            qty: it.qty,
            subtotal: unitPrice * it.qty,
            catatan: it.catatan,
            temperature: it.temperature,
            varian_nama: it.varian_nama,
          };
        }),
      };

      savedTrx = await db.createTransaksi(newTrx);
      setCart([]);
      setCustomerName('Pelanggan Walk-in');
      setPenanda('No. 01');
      setEditingBill(null);
    }

    if (activeShift) {
      const refreshed = await db.calculateShiftBalance(activeShift);
      setActiveShift(refreshed);
    }

    if (autoPrint) {
      const bytes = printerService.buildReceiptCommands(savedTrx, currentCabang);
      await printerService.printRaw(bytes);
    }

    setLastTransaksi(savedTrx);
    setIsPaymentOpen(false);
    setIsReceiptOpen(true);
  };

  // Filter menu yang aktif dan dijual di cabang kasir saat ini (Wajib di atas early return agar urutan hooks konsisten)
  const branchMenuList = useMemo(() => {
    if (!currentCabang) return menuList.filter(m => m.is_active !== false);
    return menuList.filter(item => {
      if (item.is_active === false) return false;
      // Jika cabang_ids tidak diset atau kosong, menu dijual di seluruh cabang
      if (!item.cabang_ids || item.cabang_ids.length === 0 || item.cabang_ids.includes('all')) {
        return true;
      }
      return item.cabang_ids.some(id => isBranchMatch(id, currentCabang.id));
    });
  }, [menuList, currentCabang]);

  if (!currentCabang) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <div className="text-3xl animate-spin">🌿</div>
          <div className="text-xs font-bold text-slate-500">Memuat Sesi Tablet Kasir...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-fintech-bg select-none">
      {/* Dedicated Tablet POS Header (Clean, No Admin links) */}
      <PosHeader
        currentCabang={currentCabang}
        activeShift={activeShift}
        onOpenShiftClick={() => setIsShiftOpenOpen(true)}
        onCloseShiftClick={() => setIsShiftCloseOpen(true)}
        onExpenseClick={() => {
          if (!activeShift) {
            alert('Silakan buka shift kasir terlebih dahulu untuk mencatat belanja toko / kasbon.');
            setIsShiftOpenOpen(true);
            return;
          }
          setIsExpenseOpen(true);
        }}
        onAttendanceClick={() => setIsAttendanceOpen(true)}
        onMaterialStockClick={() => setIsMaterialStockOpen(true)}
        onDailyReportClick={() => setIsDailyReportOpen(true)}
        onDeviceSettingsClick={() => setIsDeviceSetupOpen(true)}
        onOpenBillsClick={() => setIsOpenBillsModalOpen(true)}
        openBillsCount={openBills.length}
        orientationMode={orientationMode}
        onToggleOrientation={handleToggleOrientation}
        orientationFeedback={orientationFeedback}
      />

      {/* Main Dual-Pane POS Interface */}
      <main className="pos-main-pane flex-1 flex overflow-hidden p-2.5 sm:p-3.5 md:p-4 gap-2.5 sm:gap-3.5 md:gap-4 max-w-[1440px] mx-auto w-full">
        
        {/* Left Side: POS Touch Grid */}
        <section className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {editingBill && (
            <div className="mb-2.5 px-3 py-2 rounded-2xl bg-amber-500 text-white shadow-md flex items-center justify-between gap-2 text-xs shrink-0 animate-fadeIn">
              <div className="min-w-0">
                <div className="font-black truncate flex items-center space-x-1.5">
                  <span>✏️</span>
                  <span className="truncate">Tambah Pesanan: {penanda || 'Belum Bayar'}</span>
                </div>
                <div className="text-[10px] text-amber-100 truncate">
                  Ketuk menu di bawah untuk menambah, lalu buka keranjang untuk Simpan / Bayar.
                </div>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMobileCartOpen(true)}
                  className="md:hidden px-2.5 py-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-[11px] shadow-xs"
                >
                  Lihat ({cart.reduce((sum, it) => sum + it.qty, 0)})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBill(null);
                    setCart([]);
                  }}
                  className="px-2 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-[10px]"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          <PosTouchGrid
            menuList={branchMenuList}
            kategoriList={kategoriList}
            onAddToCart={handleAddToCart}
            cart={cart}
          />
        </section>

        {/* Right Side: Order Cart Drawer (Landscape / Tablet / Desktop Screen) */}
        <aside className="hidden md:flex w-72 md:w-80 lg:w-96 flex-col shrink-0 h-full">
          <PosCartDrawer
            items={cart}
            customerName={customerName}
            onCustomerNameChange={setCustomerName}
            penanda={penanda}
            onPenandaChange={setPenanda}
            onUpdateQty={handleUpdateQty}
            onUpdateNotes={handleUpdateNotes}
            onToggleTemperature={handleToggleTemperature}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onCheckout={handleCheckoutClick}
            onSaveOpenBill={handleSaveOpenBill}
            isShiftOpen={!!activeShift}
            isEditingOpenBill={!!editingBill}
            editingBillInvoice={editingBill?.invoice_no}
            onCancelEditOpenBill={() => {
              setEditingBill(null);
              setCart([]);
            }}
          />
        </aside>

      </main>

      {/* Floating Checkout Bar for Portrait Smartphone (< md screens) */}
      {cart.length > 0 && (
        <div className="md:hidden fixed bottom-3 left-3 right-3 z-30 animate-fadeIn">
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full p-3 bg-gradient-to-r from-brand-dark via-emerald-800 to-emerald-950 text-white rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center justify-between btn-tactile"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-accent-gold text-white flex items-center justify-center font-extrabold text-sm shadow-sm">
                {cart.reduce((sum, it) => sum + it.qty, 0)}
              </div>
              <div className="text-left">
                <span className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider block leading-none">
                  {editingBill ? `Edit ${penanda || 'Tagihan'}` : 'Total Pesanan'}
                </span>
                <span className="text-base font-mono font-extrabold tabular-nums tracking-tight">
                  {formatRupiah(cart.reduce((sum, it) => sum + (getCartItemUnitPrice(it) * it.qty), 0))}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 font-extrabold text-xs bg-white/15 px-3 py-1.5 rounded-xl border border-white/20 shadow-xs">
              <span>{editingBill ? 'Simpan / Bayar' : 'Buka Keranjang'}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Mobile Cart Bottom Sheet Modal */}
      {isMobileCartOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn p-0 sm:p-3">
          <div className="w-full max-w-md h-[95vh] sm:h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col p-1 sm:p-2">
            <PosCartDrawer
              items={cart}
              customerName={customerName}
              onCustomerNameChange={setCustomerName}
              penanda={penanda}
              onPenandaChange={setPenanda}
              onUpdateQty={handleUpdateQty}
              onUpdateNotes={handleUpdateNotes}
              onToggleTemperature={handleToggleTemperature}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              onCheckout={() => {
                setIsMobileCartOpen(false);
                handleCheckoutClick();
              }}
              onSaveOpenBill={() => {
                setIsMobileCartOpen(false);
                handleSaveOpenBill();
              }}
              isShiftOpen={!!activeShift}
              isEditingOpenBill={!!editingBill}
              editingBillInvoice={editingBill?.invoice_no}
              onCancelEditOpenBill={() => {
                setEditingBill(null);
                setCart([]);
                setIsMobileCartOpen(false);
              }}
              onCloseMobile={() => setIsMobileCartOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Shift Guard Banner if shift is closed */}
      {!activeShift && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-30 p-4 bg-brand-dark/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-brand-primary flex items-center justify-between animate-bounce">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-accent-gold text-white flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm">Shift Belum Dibuka</div>
              <div className="text-[11px] text-emerald-200">Buka laci kasir untuk mulai transaksi</div>
            </div>
          </div>
          <button
            onClick={() => setIsShiftOpenOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-accent-gold hover:bg-amber-600 text-white font-extrabold text-xs shadow-md shadow-accent-gold/30 btn-tactile transition-all"
          >
            Buka Sekarang
          </button>
        </div>
      )}

      {/* MODALS */}
      {isShiftOpenOpen && (
        <ShiftOpenModal
          cabang={currentCabang}
          karyawanList={karyawanList}
          onClose={() => setIsShiftOpenOpen(false)}
          onSuccess={(shift) => {
            setActiveShift(shift);
            setIsShiftOpenOpen(false);
          }}
        />
      )}

      {isShiftCloseOpen && activeShift && (
        <ShiftCloseModal
          shift={activeShift}
          cabang={currentCabang}
          onClose={() => setIsShiftCloseOpen(false)}
          onShiftBalanceUpdated={(refreshed) => setActiveShift(refreshed)}
          onSuccess={async () => {
            setActiveShift(null);
            setIsShiftCloseOpen(false);
            await loadData();
          }}
        />
      )}

      {isPaymentOpen && (
        <PaymentModal
          total={selectedBillForPayment ? selectedBillForPayment.total : cart.reduce((sum, it) => sum + (getCartItemUnitPrice(it) * it.qty), 0)}
          cabang={currentCabang}
          onClose={() => {
            setIsPaymentOpen(false);
            setSelectedBillForPayment(null);
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {isKitchenModalOpen && kitchenTicketTrx && currentCabang && (
        <KitchenTicketModal
          transaksi={kitchenTicketTrx}
          cabang={currentCabang}
          onClose={() => {
            setIsKitchenModalOpen(false);
            setKitchenTicketTrx(null);
          }}
        />
      )}

      {isOpenBillsModalOpen && currentCabang && (
        <OpenBillsModal
          openBills={openBills}
          cabang={currentCabang}
          onClose={() => setIsOpenBillsModalOpen(false)}
          onPayBill={handleStartPayOpenBill}
          onPrintKitchenTicket={handlePrintOpenBillKitchenTicket}
          onCancelBill={handleCancelOpenBill}
          onEditBill={handleEditOpenBill}
        />
      )}

      {isReceiptOpen && lastTransaksi && (
        <ReceiptModal
          transaksi={lastTransaksi}
          cabang={currentCabang}
          onClose={() => setIsReceiptOpen(false)}
        />
      )}

      {isExpenseOpen && activeShift && (
        <ExpenseRequestModal
          cabang={currentCabang}
          shift={activeShift}
          onClose={() => setIsExpenseOpen(false)}
          onRefreshBalance={(refreshed) => setActiveShift(refreshed)}
          onSuccess={async () => {
            await syncPosState(false);
          }}
        />
      )}

      {isAttendanceOpen && (
        <BranchAttendanceModal
          cabang={currentCabang}
          activeShift={activeShift}
          onClose={() => setIsAttendanceOpen(false)}
          onSuccess={() => setIsAttendanceOpen(false)}
        />
      )}

      {isDeviceSetupOpen && (
        <DeviceSetupModal
          cabangList={cabangList}
          currentCabangId={currentCabang.id}
          onClose={() => setIsDeviceSetupOpen(false)}
          onLockDevice={handleLockDevice}
        />
      )}

      {isDailyReportOpen && currentCabang && (
        <DailyBranchReportModal
          cabangList={cabangList}
          karyawanList={karyawanList}
          transaksiList={transaksiList}
          expenseList={expenseList}
          shifts={activeShift ? [activeShift] : []}
          defaultCabangId={currentCabang.id}
          defaultDate={activeShift?.waktu_buka ? toWibDateString(activeShift.waktu_buka) : (toWibBusinessDateString(new Date()) || getTodayDateString())}
          onClose={() => setIsDailyReportOpen(false)}
        />
      )}

      {isMaterialStockOpen && currentCabang && (
        <DailyMaterialStockModal
          cabang={currentCabang}
          activeShift={activeShift}
          onClose={() => setIsMaterialStockOpen(false)}
        />
      )}

    </div>
  );
}
