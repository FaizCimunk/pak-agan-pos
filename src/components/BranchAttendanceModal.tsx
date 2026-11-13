'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  CalendarCheck, 
  Clock, 
  Calendar, 
  Save,
  UserPlus,
  Trash2,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Users
} from 'lucide-react';
import { Cabang, Karyawan, Absensi, Shift } from '@/lib/types';
import { db, isBranchMatch } from '@/lib/db';
import { formatRupiah, getTodayDateString, toWibDateString, toWibBusinessDateString } from '@/lib/utils';

interface BranchAttendanceModalProps {
  cabang: Cabang;
  activeShift: Shift | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface WorkerAttendanceState {
  karyawan_id: string;
  karyawan_nama: string;
  role: string;
  tipe_gaji: 'harian' | 'bulanan';
  gaji_harian: number;
  status: 'hadir' | 'setengah_hari' | 'izin' | 'sakit' | 'alpa';
  jam_masuk: string;
  jam_pulang: string;
  catatan: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  alasan_penolakan?: string;
  initialSnapshot?: string;
}

export default function BranchAttendanceModal({
  cabang,
  activeShift,
  onClose,
  onSuccess,
}: BranchAttendanceModalProps) {
  const todayStr = activeShift?.waktu_buka
    ? toWibDateString(activeShift.waktu_buka)
    : toWibBusinessDateString(new Date()) || getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [workersList, setWorkersList] = useState<WorkerAttendanceState[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);

  // Form Tulis Nama Staf Baru / Tambahan Hari Ini (Simpel & Cepat)
  const [isAddingNewName, setIsAddingNewName] = useState<boolean>(false);
  const [newNama, setNewNama] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('Kitchen Serabi');
  const [newUpah] = useState<number>(100000);

  const defaultStoreOpenTime = activeShift?.waktu_buka
    ? new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(activeShift.waktu_buka))
    : '08:00';

  const buildWorkersList = (allStaff: any[], existingRecords: any[]): WorkerAttendanceState[] => {
    const branchStaff = allStaff.filter(k => isBranchMatch(k.cabang_id, cabang.id) && k.role !== 'owner');
    const list: WorkerAttendanceState[] = [];

    // 1. Masukkan staf yang sudah punya catatan absensi di tanggal ini
    existingRecords.forEach(rec => {
      const staffObj = allStaff.find(s => s.id === rec.karyawan_id);
      const jamMasuk = rec.jam_masuk || defaultStoreOpenTime;
      const jamPulang = rec.jam_pulang || '22:00';
      const status = rec.status || 'hadir';
      list.push({
        karyawan_id: rec.karyawan_id,
        karyawan_nama: rec.karyawan_nama || staffObj?.nama || 'Staf Harian',
        role: staffObj?.role || 'helper',
        tipe_gaji: 'harian',
        gaji_harian: rec.upah_harian_terhitung || staffObj?.gaji_harian || 100000,
        status,
        jam_masuk: jamMasuk,
        jam_pulang: jamPulang,
        catatan: rec.catatan && !rec.catatan.includes('Shift Sore-Malam') ? rec.catatan : '',
        approval_status: rec.approval_status || 'approved',
        alasan_penolakan: rec.alasan_penolakan,
        initialSnapshot: `${status}|${jamMasuk}|${jamPulang}`,
      });
    });

    // 2. Tambahkan staf cabang reguler yang belum masuk ke absensi hari ini
    branchStaff.forEach(st => {
      if (!list.some(item => item.karyawan_id === st.id)) {
        list.push({
          karyawan_id: st.id,
          karyawan_nama: st.nama,
          role: st.role,
          tipe_gaji: 'harian',
          gaji_harian: st.gaji_harian || (st.gaji_pokok ? Math.round(st.gaji_pokok / 6) : 100000),
          status: 'hadir',
          jam_masuk: defaultStoreOpenTime,
          jam_pulang: '22:00',
          catatan: '',
        });
      }
    });

    return list;
  };

  // Load workers for this branch & records on selected date (instan dari cache, lalu segarkan dari cloud)
  const loadBranchData = async () => {
    const cachedStaff = db.getAllKaryawanCached();
    const cachedRecords = db.getAbsensiListCached(undefined, cabang.id, selectedDate);
    if (cachedStaff.length > 0 || cachedRecords.length > 0) {
      setWorkersList(buildWorkersList(cachedStaff, cachedRecords));
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const [allStaff, existingRecords] = await Promise.all([
        db.getAllKaryawan(),
        db.getAbsensiList(undefined, cabang.id, selectedDate),
      ]);
      setWorkersList(buildWorkersList(allStaff, existingRecords));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranchData();
  }, [cabang.id, selectedDate]);

  // Tambah Nama Staf Baru / Tambahan Hari Ini (Tulis Nama Simpel)
  const handleAddNewWorker = async () => {
    if (!newNama.trim()) {
      alert('Silakan tulis nama staf terlebih dahulu!');
      return;
    }

    let resolvedId = 'staf-' + Date.now();
    // Buat juga master profil karyawan baru agar tercatat permanen di sistem & payroll mingguan
    try {
      const created = await db.createKaryawan({
        cabang_id: cabang.id,
        nama: newNama.trim(),
        role: (newRole.toLowerCase().includes('kasir') ? 'kasir' : newRole.toLowerCase().includes('dapur') || newRole.toLowerCase().includes('serabi') ? 'kitchen' : 'helper') as any,
        telepon: '0812-0000-0000',
        tipe_gaji: 'harian',
        gaji_harian: Number(newUpah) || 100000,
        gaji_pokok: (Number(newUpah) || 100000) * 6,
        tunjangan: 0,
        plafon_kasbon: 300000,
      });
      if (created?.id) resolvedId = created.id;
    } catch (e) {
      console.warn('Simpan master staf:', e);
    }

    const newWorkerEntry: WorkerAttendanceState = {
      karyawan_id: resolvedId,
      karyawan_nama: newNama.trim(),
      role: newRole,
      tipe_gaji: 'harian',
      gaji_harian: Number(newUpah) || 100000,
      status: 'hadir',
      jam_masuk: defaultStoreOpenTime,
      jam_pulang: '22:00',
      catatan: 'Buka - Tutup Toko',
    };

    setWorkersList(prev => [...prev, newWorkerEntry]);
    setNewNama('');
    setIsAddingNewName(false);
  };

  const updateWorkerStatus = (karyawanId: string, status: 'hadir' | 'setengah_hari' | 'izin' | 'sakit' | 'alpa') => {
    setWorkersList(prev => prev.map(w => {
      if (w.karyawan_id !== karyawanId) return w;
      return {
        ...w,
        status,
        jam_masuk: status === 'hadir' || status === 'setengah_hari' ? (w.jam_masuk || defaultStoreOpenTime) : '',
        jam_pulang: status === 'hadir' ? (w.jam_pulang || '22:00') : status === 'setengah_hari' ? '15:00' : '',
      };
    }));
  };

  const handleRemoveWorker = (karyawanId: string, nama: string) => {
    if (confirm(`Hapus ${nama} dari daftar absensi hari ini?`)) {
      setWorkersList(prev => prev.filter(w => w.karyawan_id !== karyawanId));
    }
  };

  const handleSaveAttendance = async () => {
    if (isSubmittingRef.current || saving) return;
    isSubmittingRef.current = true;
    setSaving(true);
    try {
      const entries = workersList.map(w => {
        const jMasuk = w.jam_masuk || defaultStoreOpenTime;
        const jPulang = w.jam_pulang || '22:00';
        const currentSnapshot = `${w.status}|${jMasuk}|${jPulang}`;
        const preserveApproved = w.approval_status === 'approved' && w.initialSnapshot === currentSnapshot;
        return {
          karyawan_id: w.karyawan_id,
          karyawan_nama: w.karyawan_nama,
          cabang_id: cabang.id,
          cabang_nama: cabang.nama,
          tanggal: selectedDate,
          jam_masuk: jMasuk,
          jam_pulang: jPulang,
          status: w.status,
          upah_harian: Number(w.gaji_harian) || 100000,
          catatan: w.catatan,
          recorded_by: activeShift?.karyawan_nama || cabang.pj_nama?.trim() || 'Kasir Outlet',
          approval_status: preserveApproved ? ('approved' as const) : ('pending' as const),
        };
      });

      await db.saveBranchAttendance(entries);
      alert(`Pengajuan presensi ${entries.length} staf ${cabang.nama} (${selectedDate}) berhasil dikirim!\n\nMasuk ke Dashboard Pusat → Pusat Persetujuan (Tab ACC Presensi). Upah akan otomatis menambah gaji staf setelah di-ACC Pak Agan.`);
      onSuccess();
    } catch (err: any) {
      alert('Gagal menyimpan presensi: ' + err.message);
    } finally {
      setSaving(false);
      isSubmittingRef.current = false;
    }
  };

  // Kalkulasi total upah yang hadir hari ini
  const totalHadirCount = workersList.filter(w => w.status === 'hadir' || w.status === 'setengah_hari').length;
  const totalUpahHariIni = workersList.reduce((sum, w) => {
    const mult = w.status === 'hadir' ? 1 : w.status === 'setengah_hari' ? 0.5 : 0;
    return sum + (Number(w.gaji_harian) * mult);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full h-full sm:h-auto max-h-[98vh] shadow-2xl border border-slate-100 overflow-hidden flex flex-col min-h-0">
        
        {/* Header */}
        <div className="px-4 py-2 sm:px-5 sm:py-3 border-b border-slate-100 flex items-center justify-between bg-emerald-50/70 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand-primary text-white flex items-center justify-center font-bold shadow-sm shadow-brand-dark/20 shrink-0">
              <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                  Presensi &amp; Absensi Toko
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {cabang.kode}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                Outlet: <strong>{cabang.nama}</strong> • Catat kehadiran staf hari ini
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Date Selector & Tombol Tulis Nama Staf */}
        <div className="px-4 py-1.5 sm:px-5 sm:py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span className="font-bold text-slate-700 hidden sm:inline">Tanggal:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs text-slate-800 outline-none focus:border-brand-primary"
            />
          </div>

          {/* Tombol Simpel Tulis Nama Staf */}
          <button
            type="button"
            onClick={() => setIsAddingNewName(!isAddingNewName)}
            className="inline-flex items-center space-x-1 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-[11px] sm:text-xs shadow-sm transition-all btn-tactile shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{isAddingNewName ? 'Tutup Input' : '+ Tulis Nama'}</span>
          </button>
        </div>

        {/* Form Cepat: Tulis Nama Staf Baru / Bantuan */}
        {isAddingNewName && (
          <div className="px-4 py-2.5 sm:px-5 sm:py-3 bg-emerald-50/60 border-b border-emerald-200/60 animate-fadeIn shrink-0">
            <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-soft-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
                  Tulis Nama Karyawan / Staf Hadir Hari Ini:
                </span>
                <span className="text-[10px] text-slate-400">
                  Langsung tersimpan tanpa ploting rumit
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                    Nama Lengkap Karyawan *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Mas Joko / Mbak Rini"
                    value={newNama}
                    onChange={(e) => setNewNama(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs text-slate-800 outline-none focus:border-brand-primary focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                    Tugas / Posisi
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs text-slate-800 outline-none focus:border-brand-primary"
                  >
                    <option value="Kitchen Serabi">Dapur / Tukang Bakar Serabi</option>
                    <option value="Wedang Barista">Barista Wedang Geprek</option>
                    <option value="Kasir Toko">Kasir Toko</option>
                    <option value="Helper & Cuci">Helper &amp; Cuci Piring</option>
                    <option value="Staf Serabutan">Staf Serabutan / Bantuan</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={handleAddNewWorker}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all btn-tactile"
                >
                  + Tambahkan ke Daftar Absensi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Daftar Karyawan Hadir Hari Ini */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1 min-h-0">
          {loading ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              Memuat data absensi staf...
            </div>
          ) : workersList.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs bg-slate-50 rounded-2xl p-4 space-y-2 border border-dashed border-slate-200">
              <Users className="w-7 h-7 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">
                Belum ada staf yang dicatat untuk tanggal ini.
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Klik tombol <strong>&quot;+ Tulis Nama&quot;</strong> di atas untuk langsung menulis nama karyawan atau tenaga bantuan yang hadir hari ini.
              </p>
              <button
                type="button"
                onClick={() => setIsAddingNewName(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm inline-flex items-center space-x-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Tulis Nama Staf Sekarang</span>
              </button>
            </div>
          ) : (
            workersList.map((worker) => {
              return (
                <div 
                  key={worker.karyawan_id}
                  className="p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-500/40 transition-all shadow-soft-sm"
                >
                  {/* Row Staf & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-xs shrink-0">
                        {worker.karyawan_nama.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 min-w-0">
                        <span className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                          {worker.karyawan_nama}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 capitalize">
                          {worker.role}
                        </span>
                        {worker.approval_status === 'approved' && (
                          <span className="text-[8.5px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✓ ACC
                          </span>
                        )}
                        {worker.approval_status === 'pending' && (
                          <span className="text-[8.5px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                            ⏳ Menunggu ACC
                          </span>
                        )}
                        {worker.approval_status === 'rejected' && (
                          <span className="text-[8.5px] font-extrabold px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            ✕ Ditolak
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Presensi (Buka - Tutup Toko) */}
                    <div className="flex items-center flex-wrap gap-1">
                      {(['hadir', 'setengah_hari', 'izin', 'sakit', 'alpa'] as const).map(st => {
                        const isSelected = worker.status === st;
                        let activeStyle = '';
                        let label = '';
                        if (st === 'hadir') {
                          activeStyle = 'bg-emerald-600 text-white shadow-xs';
                          label = 'Hadir';
                        } else if (st === 'setengah_hari') {
                          activeStyle = 'bg-sky-600 text-white shadow-xs';
                          label = '½ Hari';
                        } else if (st === 'izin') {
                          activeStyle = 'bg-amber-500 text-white shadow-xs';
                          label = 'Izin';
                        } else if (st === 'sakit') {
                          activeStyle = 'bg-indigo-600 text-white shadow-xs';
                          label = 'Sakit';
                        } else {
                          activeStyle = 'bg-rose-600 text-white shadow-xs';
                          label = 'Alpa';
                        }

                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => updateWorkerStatus(worker.karyawan_id, st)}
                            className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all btn-tactile whitespace-nowrap ${
                              isSelected 
                                ? activeStyle 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}

                      {/* Tombol Hapus */}
                      <button
                        type="button"
                        onClick={() => handleRemoveWorker(worker.karyawan_id, worker.karyawan_nama)}
                        className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-auto sm:ml-1 shrink-0"
                        title="Hapus dari daftar hari ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary & Save */}
        <div className="px-4 py-2 sm:px-5 sm:py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-2 text-[11px] sm:text-xs">
            <div className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold">
              Hadir: <span className="font-extrabold text-emerald-700">{totalHadirCount}</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 font-bold">
              Total: <span className="font-mono font-extrabold text-slate-800">{workersList.length}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSaveAttendance}
              disabled={saving}
              className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-xl bg-brand-primary hover:bg-emerald-800 text-white font-black text-xs shadow-md shadow-emerald-900/20 transition-all btn-tactile flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Mengirim...' : 'Ajukan Presensi'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
