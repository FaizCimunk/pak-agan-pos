'use client';

import React, { useState, useRef } from 'react';
import { X, Lock, KeyRound, DollarSign, UserCheck, AlertCircle } from 'lucide-react';
import { Karyawan, Cabang } from '@/lib/types';
import { db } from '@/lib/db';
import { formatRupiah, formatNominal, parseNominal, formatWaktu } from '@/lib/utils';

interface ShiftOpenModalProps {
  cabang: Cabang;
  karyawanList: Karyawan[];
  onClose: () => void;
  onSuccess: (shift: any) => void;
}

export default function ShiftOpenModal({
  cabang,
  karyawanList,
  onClose,
  onSuccess,
}: ShiftOpenModalProps) {
  const defaultCashierId = karyawanList[0]?.id || `kasir-${cabang.id}`;
  const [selectedKaryawanId, setSelectedKaryawanId] = useState<string>(defaultCashierId);
  const [pin, setPin] = useState<string>('');
  const [modalAwal, setModalAwal] = useState<number>(200000);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [existingShift, setExistingShift] = useState<any>(null);

  React.useEffect(() => {
    const checkActive = async () => {
      const active = await db.getActiveShift(cabang.id);
      if (active && active.status === 'open') {
        setExistingShift(active);
      }
    };
    checkActive();
  }, [cabang.id]);

  const quickModalOptions = [100000, 150000, 200000, 300000, 500000];
  const isSubmittingRef = useRef<boolean>(false);

  const handleOpenShift = async () => {
    if (isSubmittingRef.current || loading) return;
    setErrorMsg('');
    if (!pin) {
      setErrorMsg('Masukkan PIN staf / PIN kasir');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    try {
      let finalKaryawanId = selectedKaryawanId;
      let finalKaryawanNama = '';

      if (selectedKaryawanId.startsWith('kasir-') || !selectedKaryawanId) {
        const branchPin = (cabang.kasir_pin || '').trim();
        const branchPass = (cabang.kasir_password_plain || '').trim();
        const cleanPin = pin.trim();

        if (cleanPin === branchPin || cleanPin === branchPass || cleanPin === '1234' || !branchPin) {
          finalKaryawanId = `kasir-${cabang.id}`;
          finalKaryawanNama = cabang.pj_nama || `Kasir ${cabang.nama}`;
        } else {
          setErrorMsg('PIN / Sandi Kasir Toko salah! Gunakan PIN resmi cabang atau 1234.');
          setLoading(false);
          isSubmittingRef.current = false;
          return;
        }
      } else {
        const verify = await db.verifyKaryawanPin(selectedKaryawanId, pin);
        if (!verify.valid && pin.trim() !== '1234' && pin.trim() !== (cabang.kasir_pin || '').trim()) {
          setErrorMsg('PIN salah! Silakan gunakan PIN terdaftar staf atau PIN demo 1234.');
          setLoading(false);
          isSubmittingRef.current = false;
          return;
        }
        finalKaryawanNama = verify.karyawan?.nama || karyawanList.find(k => k.id === selectedKaryawanId)?.nama || cabang.pj_nama || 'Kasir Outlet';
      }

      const shift = await db.openShift({
        cabang_id: cabang.id,
        karyawan_id: finalKaryawanId,
        karyawan_nama: finalKaryawanNama,
        modal_awal: modalAwal,
      });

      onSuccess(shift);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuka shift');
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  if (existingShift) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl font-black mx-auto border-2 border-emerald-300">
            ✓
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Shift Hari Ini Sudah Aktif!</h3>
            <p className="text-xs text-slate-500 mt-1">
              Laci kasir cabang <strong className="text-slate-800">{cabang.nama}</strong> sudah aktif dibuka oleh <strong>{existingShift.karyawan_nama}</strong> sejak pukul {formatWaktu(existingShift.waktu_buka)}.
            </p>
          </div>
          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 font-bold space-y-1">
            <div className="text-[10px] text-emerald-700 uppercase">Modal Awal Kas Laci Hari Ini:</div>
            <div className="text-2xl font-mono font-black text-emerald-950">
              {formatRupiah(existingShift.modal_awal)}
            </div>
            <div className="text-[10px] text-slate-500 font-normal mt-1">
              Modal kas sudah tercatat 1x hari ini dan tidak perlu diisi ulang agar pembukuan tidak berantakan.
            </div>
          </div>
          <button
            onClick={() => {
              onSuccess(existingShift);
              onClose();
            }}
            className="w-full py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs transition-colors shadow-md shadow-emerald-900/20"
          >
            Lanjut Melayani Transaksi Kasir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-brand-subtle/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-sm">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Buka Shift Laci Kasir</h3>
              <span className="text-[11px] text-slate-500 font-medium">
                {cabang.nama}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Staf Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center space-x-1">
              <UserCheck className="w-3.5 h-3.5 text-brand-primary" />
              <span>Pilih Staf Penanggung Jawab (PJ)</span>
            </label>
            <select
              value={selectedKaryawanId}
              onChange={(e) => setSelectedKaryawanId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary cursor-pointer"
            >
              <option value={`kasir-${cabang.id}`}>
                🏢 Kasir Outlet - {cabang.pj_nama || cabang.kasir_username || cabang.nama} (PJ RESMI)
              </option>
              {karyawanList.filter(k => k.id !== `kasir-${cabang.id}`).map(kar => (
                <option key={kar.id} value={kar.id}>
                  👤 {kar.nama} ({kar.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* PIN Input */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center space-x-1">
              <KeyRound className="w-3.5 h-3.5 text-brand-primary" />
              <span>PIN Pribadi Staf (4-6 Digit)</span>
            </label>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center font-mono text-xl tracking-[0.5em] font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              *PIN bawaan demo adalah <strong>1234</strong>
            </p>
          </div>

          {/* Modal Awal Laci */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center space-x-1">
              <DollarSign className="w-3.5 h-3.5 text-accent-gold" />
              <span>Modal Kas Awal Laci (Uang Receh Kembalian)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-sm">
                Rp
              </span>
              <input
                type="text"
                value={modalAwal === 0 ? '' : formatNominal(modalAwal)}
                onChange={(e) => setModalAwal(parseNominal(e.target.value))}
                placeholder="0"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono font-bold text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              />
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickModalOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setModalAwal(opt)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors ${
                    modalAwal === opt
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {formatRupiah(opt).replace('Rp\u00a0', '')}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/80 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleOpenShift}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-extrabold text-xs bg-brand-primary hover:bg-brand-dark text-white shadow-md shadow-brand-dark/20 transition-all btn-tactile"
          >
            {loading ? 'Memverifikasi...' : 'Buka Shift & Kunci PJ'}
          </button>
        </div>

      </div>
    </div>
  );
}
