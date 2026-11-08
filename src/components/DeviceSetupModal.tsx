'use client';

import React, { useState } from 'react';
import { X, Lock, Store, KeyRound, ShieldCheck, Check } from 'lucide-react';
import { Cabang } from '@/lib/types';
import { db } from '@/lib/db';

interface DeviceSetupModalProps {
  cabangList: Cabang[];
  currentCabangId: string;
  onClose?: () => void;
  onLockDevice: (cabangId: string) => void;
  isInitialSetup?: boolean;
}

export default function DeviceSetupModal({
  cabangList,
  currentCabangId,
  onClose,
  onLockDevice,
  isInitialSetup = false,
}: DeviceSetupModalProps) {
  const [selectedCabangId, setSelectedCabangId] = useState<string>(
    currentCabangId || cabangList[0]?.id || ''
  );
  const [supervisorPin, setSupervisorPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleConfirm = async () => {
    setErrorMsg('');
    if (!isInitialSetup) {
      if (!supervisorPin) {
        setErrorMsg('Harap masukkan PIN Otorisasi Supervisor / Owner.');
        return;
      }
      const auth = await db.authenticateUser('owner', supervisorPin);
      if (!auth.success && supervisorPin !== '1234') {
        setErrorMsg('PIN / Sandi Otorisasi Supervisor salah!');
        return;
      }
    }

    const targetBranch = cabangList.find(c => c.id === selectedCabangId);
    if (targetBranch?.is_kasir_locked) {
      setErrorMsg(`Cabang "${targetBranch.nama}" saat ini sedang DIGEMBOK oleh Admin Pusat! Buka gembok terlebih dahulu.`);
      return;
    }

    onLockDevice(selectedCabangId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-brand-subtle">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-primary text-white flex items-center justify-center font-bold shadow-sm">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {isInitialSetup ? 'Aktivasi Perangkat Tablet Cabang' : 'Ubah Kunci Cabang Tablet'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Kunci perangkat kasir ini pada cabang outlet resmi
              </p>
            </div>
          </div>
          {onClose && !isInitialSetup && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center space-x-1">
              <Store className="w-3.5 h-3.5 text-brand-primary" />
              <span>Pilih Cabang Outlet yang Ditugaskan:</span>
            </label>
            <select
              value={selectedCabangId}
              onChange={(e) => setSelectedCabangId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            >
              {cabangList.map(c => (
                <option key={c.id} value={c.id}>
                  #{c.nomor} • {c.kode} - {c.nama.split('-')[1]?.trim() || c.nama} ({c.kota})
                </option>
              ))}
            </select>
          </div>

          {!isInitialSetup && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center space-x-1">
                <KeyRound className="w-3.5 h-3.5 text-accent-gold" />
                <span>Otorisasi PIN Supervisor / Owner (Pak Agan):</span>
              </label>
              <input
                type="password"
                maxLength={6}
                value={supervisorPin}
                onChange={(e) => setSupervisorPin(e.target.value)}
                placeholder="••••"
                className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center font-mono text-xl tracking-[0.4em] font-extrabold text-slate-900 focus:outline-none focus:border-brand-primary"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                *Staf kasir tidak dapat memindahkan cabang tanpa PIN Pak Agan (PIN demo: <strong>1234</strong>)
              </p>
            </div>
          )}

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] leading-relaxed flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Setelah dikunci, tablet kasir hanya akan memproses shift, kas laci, dan pesanan untuk cabang terpilih secara persisten.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-3">
          {onClose && !isInitialSetup && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
          )}
          <button
            onClick={handleConfirm}
            className="px-6 py-2.5 rounded-xl font-extrabold text-xs bg-brand-primary hover:bg-brand-dark text-white shadow-md shadow-brand-dark/20 btn-tactile transition-all"
          >
            Kunci Perangkat Tablet Ini
          </button>
        </div>

      </div>
    </div>
  );
}
