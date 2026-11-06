'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PosHeader from '@/components/PosHeader';
import PosTouchGrid from '@/components/PosTouchGrid';
import PosCartDrawer from '@/components/PosCartDrawer';
import PaymentModal from '@/components/PaymentModal';
import ShiftOpenModal from '@/components/ShiftOpenModal';
import ShiftCloseModal from '@/components/ShiftCloseModal';
import ReceiptModal from '@/components/ReceiptModal';
import ExpenseRequestModal from '@/components/ExpenseRequestModal';
import DeviceSetupModal from '@/components/DeviceSetupModal';
import BranchAttendanceModal from '@/components/BranchAttendanceModal';
import DailyBranchReportModal from '@/components/DailyBranchReportModal';
import DailyMaterialStockModal from '@/components/DailyMaterialStockModal';

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
import { db } from '@/lib/db';
import { printerService } from '@/lib/printer';
import { queueOfflineTransaction } from '@/lib/offline-sync';
import { generateInvoiceNumber, formatRupiah } from '@/lib/utils';
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
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);

  // Modals
  const [isShiftOpenOpen, setIsShiftOpenOpen] = useState<boolean>(false);
  const [isShiftCloseOpen, setIsShiftCloseOpen] = useState<boolean>(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState<boolean>(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState<boolean>(false);
  const [isDeviceSetupOpen, setIsDeviceSetupOpen] = useState<boolean>(false);
  const [isDailyReportOpen, setIsDailyReportOpen] = useState<boolean>(false);
  const [isMaterialStockOpen, setIsMaterialStockOpen] = useState<boolean>(false);
  const [transaksiList, setTransaksiList] = useState<Transaksi[]>([]);
  const [expenseList, setExpenseList] = useState<PengeluaranKasbon[]>([]);
  const [lastTransaksi, setLastTransaksi] = useState<Transaksi | null>(null);

  const router = useRouter();
  const currentCabangRef = useRef<Cabang | null>(null);
  currentCabangRef.current = currentCabang;

  // Initial Load & Device Binding
  const loadData = useCallback(async () => {
    try {
      const cabangs = await db.getCabangList();
      setCabangList(cabangs);

      // Check persistent locked branch
      let lockedCabangId = typeof window !== 'undefined' ? localStorage.getItem(DEVICE_LOCK_KEY) : null;
      let targetCabang = cabangs.find(c => c.id === lockedCabangId);

      if (!targetCabang) {
        // Default to Cabang 1 on first launch, or prompt setup
        targetCabang = cabangs[0] || null;
        if (targetCabang && typeof window !== 'undefined') {
          localStorage.setItem(DEVICE_LOCK_KEY, targetCabang.id);
        }
      }

      // Check / auto-ensure kasir session if device is bound
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
        alert(`AKSES DITOLAK:\nAkses tablet kasir "${targetCabang.nama}" sedang DIGEMBOK oleh Admin Pusat (Pak Agan)! Hubungi Owner untuk membuka gembok.`);
        window.location.replace('/');
        return;
      }

      setCurrentCabang(targetCabang);

      const menus = await db.getMenuList();
      setMenuList(menus);

      const kategories = await db.getKategoriList();
      setKategoriList(kategories);

      if (targetCabang) {
        const shift = await db.getActiveShift(targetCabang.id);
        setActiveShift(shift);
        const kars = await db.getKaryawanByCabang(targetCabang.id);
        setKaryawanList(kars);
      }

      const trxs = await db.getTransaksiList();
      setTransaksiList(trxs);
      const exps = await db.getPengeluaranList();
      setExpenseList(exps);
    } catch (err) {
      console.error('Error loading POS data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();

    // SINKRONISASI REALTIME KASIR: Nama toko, alamat, promo struk baru & deteksi gembok
    const handleStorageUpdate = async () => {
      try {
        const cabangs = await db.getCabangList();
        setCabangList(cabangs);

        const lockedId = typeof window !== 'undefined' ? localStorage.getItem(DEVICE_LOCK_KEY) : null;
        const target = cabangs.find(c => c.id === (currentCabangRef.current?.id || lockedId)) || cabangs[0] || null;

        if (target) {
          // Cek gembok keamanan realtime saat POS sedang berjalan
          if (target.is_kasir_locked) {
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('pakagan_kasir_session');
              sessionStorage.removeItem('pakagan_user');
            }
            alert(`PERHATIAN KEAMANAN:\nAkses tablet kasir "${target.nama}" telah DIGEMBOK / DINONAKTIFKAN oleh Admin Pusat! Aplikasi kasir otomatis keluar.`);
            window.location.replace('/');
            return;
          }

          // Sinkronisasi realtime profil cabang terkini ke state POS
          setCurrentCabang(target);
          const shift = await db.getActiveShift(target.id);
          setActiveShift(shift);
          const kars = await db.getKaryawanByCabang(target.id);
          setKaryawanList(kars);
        }

        const menus = await db.getMenuList();
        setMenuList(menus);
        const trxs = await db.getTransaksiList();
        setTransaksiList(trxs);
        const exps = await db.getPengeluaranList();
        setExpenseList(exps);
      } catch (err) {
        console.warn('Storage sync error:', err);
      }
    };

    window.addEventListener('pak_agan_db_updated', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.removeEventListener('pak_agan_db_updated', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [loadData]);

  // Lock Device to a specific Cabang
  const handleLockDevice = async (cabangId: string) => {
    const target = cabangList.find(c => c.id === cabangId) || null;
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
  const handleAddToCart = (item: MenuItem) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(ci => ci.menu.id === item.id);
      if (existingIndex !== -1) {
        const next = [...prev];
        next[existingIndex] = { ...next[existingIndex], qty: next[existingIndex].qty + 1 };
        return next;
      }
      return [...prev, { menu: item, qty: 1, catatan: '' }];
    });
  };

  const handleUpdateQty = (menuId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(it => {
          if (it.menu.id === menuId) {
            const nextQty = it.qty + delta;
            return nextQty > 0 ? { ...it, qty: nextQty } : null;
          }
          return it;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleUpdateNotes = (menuId: string, notes: string) => {
    setCart(prev => prev.map(it => it.menu.id === menuId ? { ...it, catatan: notes } : it));
  };

  const handleRemoveItem = (menuId: string) => {
    setCart(prev => prev.filter(it => it.menu.id !== menuId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Checkout & Payment
  const handleCheckoutClick = () => {
    if (!activeShift) {
      setIsShiftOpenOpen(true);
      return;
    }
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = async (
    method: PaymentMethod,
    bayar: number,
    kembali: number,
    autoPrint: boolean
  ) => {
    if (!currentCabang) return;

    const subtotal = cart.reduce((acc, it) => acc + it.menu.harga * it.qty, 0);
    const total = subtotal;

    const newTrx: Transaksi = {
      id: 'trx-' + Date.now(),
      invoice_no: generateInvoiceNumber(currentCabang.kode),
      cabang_id: currentCabang.id,
      cabang_nama: currentCabang.nama,
      shift_id: activeShift?.id,
      karyawan_id: activeShift?.karyawan_id,
      karyawan_nama: activeShift?.karyawan_nama,
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
      items: cart.map(it => ({
        menu_id: it.menu.id,
        nama_menu: it.menu.nama,
        harga: it.menu.harga,
        qty: it.qty,
        subtotal: it.menu.harga * it.qty,
        catatan: it.catatan,
      })),
    };

    if (!navigator.onLine) {
      await queueOfflineTransaction(newTrx);
    } else {
      await db.createTransaksi(newTrx);
    }

    if (activeShift) {
      const refreshed = await db.calculateShiftBalance(activeShift);
      setActiveShift(refreshed);
    }

    if (autoPrint) {
      const bytes = printerService.buildReceiptCommands(newTrx, currentCabang);
      await printerService.printRaw(bytes);
    }

    setLastTransaksi(newTrx);
    setIsPaymentOpen(false);
    setIsReceiptOpen(true);
    setCart([]);
    setCustomerName('Pelanggan Walk-in');
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
      return item.cabang_ids.includes(currentCabang.id);
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
    <div className="flex flex-col h-screen overflow-hidden bg-fintech-bg select-none">
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
      />

      {/* Main Dual-Pane POS Interface */}
      <main className="flex-1 flex overflow-hidden p-3 sm:p-4 gap-3 sm:gap-4 max-w-7xl mx-auto w-full">
        
        {/* Left Side: POS Touch Grid */}
        <section className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <PosTouchGrid
            menuList={branchMenuList}
            kategoriList={kategoriList}
            onAddToCart={handleAddToCart}
            cart={cart}
          />
        </section>

        {/* Right Side: Order Cart Drawer (Desktop / Tablet Screen) */}
        <aside className="hidden lg:flex w-80 lg:w-96 flex-col shrink-0 h-full">
          <PosCartDrawer
            items={cart}
            customerName={customerName}
            onCustomerNameChange={setCustomerName}
            onUpdateQty={handleUpdateQty}
            onUpdateNotes={handleUpdateNotes}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onCheckout={handleCheckoutClick}
            isShiftOpen={!!activeShift}
          />
        </aside>

      </main>

      {/* Floating Checkout Bar for Mobile / Smartphone (< lg screens) */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-3 left-3 right-3 z-30 animate-fadeIn">
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
                  Total Pesanan
                </span>
                <span className="text-base font-mono font-extrabold tabular-nums tracking-tight">
                  {formatRupiah(cart.reduce((sum, it) => sum + (it.menu.harga * it.qty), 0))}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 font-extrabold text-xs bg-white/15 px-3 py-1.5 rounded-xl border border-white/20 shadow-xs">
              <span>Buka Keranjang</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Mobile Cart Bottom Sheet Modal */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn p-0 sm:p-4">
          <div className="w-full max-w-md h-[88vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-brand-primary" />
                <span>Keranjang Pesanan Pelanggan</span>
              </span>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-2">
              <PosCartDrawer
                items={cart}
                customerName={customerName}
                onCustomerNameChange={setCustomerName}
                onUpdateQty={handleUpdateQty}
                onUpdateNotes={handleUpdateNotes}
                onRemoveItem={handleRemoveItem}
                onClearCart={handleClearCart}
                onCheckout={() => {
                  setIsMobileCartOpen(false);
                  handleCheckoutClick();
                }}
                isShiftOpen={!!activeShift}
              />
            </div>
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
          onSuccess={(closed) => {
            setActiveShift(null);
            setIsShiftCloseOpen(false);
          }}
        />
      )}

      {isPaymentOpen && (
        <PaymentModal
          total={cart.reduce((sum, it) => sum + (it.menu.harga * it.qty), 0)}
          cabang={currentCabang}
          onClose={() => setIsPaymentOpen(false)}
          onSuccess={handlePaymentSuccess}
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
          onSuccess={async () => {
            if (activeShift) {
              const refreshed = await db.calculateShiftBalance(activeShift);
              setActiveShift(refreshed);
            }
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
          defaultCabangId={currentCabang.id}
          defaultDate="2026-10-25"
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
