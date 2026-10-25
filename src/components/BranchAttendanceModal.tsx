'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  CalendarCheck, 
  Clock, 
  Calendar, 
  AlertCircle,
  Save,
  Building2,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  UserCheck,
  Info
} from 'lucide-react';
import { Cabang, Karyawan, Absensi, Shift } from '@/lib/types';
import { db } from '@/lib/db';
import { formatRupiah } from '@/lib/utils';

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
  is_plotted?: boolean;
}

export default function BranchAttendanceModal({
  cabang,
  activeShift,
  onClose,
  onSuccess,
}: BranchAttendanceModalProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [workers, setWorkers] = useState<Karyawan[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, WorkerAttendanceState>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Load workers for this branch (and any staff plotted by Admin Pusat)
  const loadBranchData = async () => {
    setLoading(true);
    try {
      const [allStaff, existingRecords] = await Promise.all([
        db.getAllKaryawan(),
        db.getAbsensiList(undefined, cabang.id, selectedDate),
      ]);

      // Branch staff assigned by Admin Pusat
      const branchStaff = allStaff.filter(k => k.cabang_id === cabang.id && k.role !== 'owner');

      // Staff from other branches that have been officially plotted / assigned attendance here by Admin Pusat
      const plottedStaffFromRecords = allStaff.filter(k => 
        k.cabang_id !== cabang.id && 
        k.role !== 'owner' && 
        existingRecords.some(r => r.karyawan_id === k.id)
      );

      const combinedWorkers = [...branchStaff, ...plottedStaffFromRecords];
      setWorkers(combinedWorkers);

      const map: Record<string, WorkerAttendanceState> = {};
      combinedWorkers.forEach(w => {
        const exist = existingRecords.find(r => r.karyawan_id === w.id);
        const isPlotted = w.cabang_id !== cabang.id;

        map[w.id] = {
          karyawan_id: w.id,
          karyawan_nama: w.nama,
          role: w.role,
          tipe_gaji: w.tipe_gaji || 'harian',
          gaji_harian: w.gaji_harian || (w.tipe_gaji === 'harian' ? 100000 : Math.round(w.gaji_pokok / 26)),
          status: exist?.status || 'hadir',
          jam_masuk: exist?.jam_masuk || '08:00',
          jam_pulang: exist?.jam_pulang || (exist?.status === 'hadir' ? '16:00' : ''),
          catatan: exist?.catatan || (isPlotted ? 'Ploting Bantuan (Admin Pusat)' : 'Shift reguler'),
          is_plotted: isPlotted,
        };
      });

      setAttendanceMap(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranchData();
  }, [cabang.id, selectedDate]);

  const updateWorkerStatus = (workerId: string, status: 'hadir' | 'setengah_hari' | 'izin' | 'sakit' | 'alpa') => {
    setAttendanceMap(prev => {
      const current = prev[workerId];
      if (!current) return prev;
      return {
        ...prev,
        [workerId]: {
          ...current,
          status,
          jam_masuk: status === 'hadir' || status === 'setengah_hari' ? (current.jam_masuk || '08:00') : '',
          jam_pulang: status === 'hadir' ? (current.jam_pulang || '16:00') : status === 'setengah_hari' ? '12:00' : '',
        },
      };
    });
  };

  const updateWorkerField = (workerId: string, field: 'jam_masuk' | 'jam_pulang' | 'catatan', val: string) => {
    setAttendanceMap(prev => {
      const current = prev[workerId];
      if (!current) return prev;
      return {
        ...prev,
        [workerId]: {
          ...current,
          [field]: val,
        },
      };
    });
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const entries = Object.values(attendanceMap).map(w => ({
        karyawan_id: w.karyawan_id,
        karyawan_nama: w.karyawan_nama,
        cabang_id: cabang.id,
        cabang_nama: cabang.nama,
        tanggal: selectedDate,
        jam_masuk: w.jam_masuk || '08:00',
        jam_pulang: w.jam_pulang || null,
        status: w.status,
        upah_harian: w.gaji_harian,
        catatan: w.catatan,
        recorded_by: activeShift?.karyawan_nama || 'Kasir Outlet',
      }));

      await db.saveBranchAttendance(entries);
      alert(`Presensi kehadiran ${entries.length} staf ${cabang.nama} untuk tanggal ${selectedDate} berhasil disimpan!`);
      onSuccess();
    } catch (err: any) {
      alert('Gagal menyimpan presensi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // WhatsApp link to Admin Pusat
  const adminWaText = `Halo Admin Pusat Pak Agan,\n\nAda karyawan baru / staf bantuan yang disuruh bertugas di ${cabang.nama} (${cabang.kode}) untuk tanggal ${selectedDate}, namun namanya belum tercatat di Buku Absensi Cabang.\n\nMohon bantuannya untuk melakukan ploting / pendaftaran staf ke cabang ini melalui Dashboard Pusat.\n\nTerima kasih.\n(Pelapor: ${activeShift?.karyawan_nama || 'Kasir Outlet'})`;
  const adminWaUrl = `https://wa.me/6281234567890?text=${encodeURIComponent(adminWaText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center font-bold shadow-sm shadow-brand-dark/20">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  Presensi Kehadiran Staf Cabang
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {cabang.kode}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Outlet: <strong>{cabang.nama}</strong> • Dicatat oleh: <strong>{activeShift?.karyawan_nama || 'Kasir Outlet'}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Date Selector Toolbar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-brand-primary" />
            <span className="font-bold text-slate-700">Tanggal Absensi:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800 outline-none focus:border-brand-primary"
            />
          </div>

          {/* WhatsApp Direct Button to Admin Pusat */}
          <a
            href={adminWaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black text-xs shadow-xs transition-colors btn-tactile w-fit"
            title="Kirim pesan WhatsApp ke Admin Pusat jika ada staf baru yang belum terdaftar di absensi"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-white" />
            <span>Hubungi Admin Pusat</span>
          </a>
        </div>

        {/* Official Notice: Ploting Admin Pusat Notice Card */}
        <div className="px-6 pt-3 pb-1">
          <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-start space-x-3 text-xs">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-amber-600/20">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                <span className="font-black text-amber-950">
                  Catatan Penugasan &amp; Ploting Karyawan:
                </span>
                <span className="inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300 w-fit">
                  Wewenang Admin Pusat
                </span>
              </div>
              <p className="text-amber-900/90 text-[11px] leading-relaxed">
                Ploting penempatan karyawan antar-cabang dikelola langsung oleh <strong>Admin Pusat</strong>. Jika ada karyawan baru atau staf bantuan yang disuruh bertugas ke outlet ini namun <strong>belum masuk di buku absensi</strong>, mohon segera hubungi Admin Pusat agar didaftarkan ke sistem.
              </p>
            </div>
          </div>
        </div>

        {/* Workers Attendance List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Memuat data staf cabang...
            </div>
          ) : workers.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs bg-slate-50 rounded-2xl p-6 space-y-3 border border-dashed border-slate-200">
              <p className="font-bold text-slate-700">
                Belum ada staf yang terdaftar atau di-ploting di {cabang.nama}.
              </p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Silakan hubungi Admin Pusat untuk melakukan ploting penempatan staf ke outlet ini.
              </p>
              <a
                href={adminWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold text-xs rounded-xl transition-all shadow-sm"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Minta Ploting ke Admin Pusat</span>
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {workers.map(worker => {
                const state = attendanceMap[worker.id];
                if (!state) return null;
                const isPlotted = state.is_plotted || worker.cabang_id !== cabang.id;

                return (
                  <div 
                    key={worker.id}
                    className={`p-4 rounded-2xl border transition-all shadow-soft-sm space-y-3 ${
                      isPlotted 
                        ? 'border-emerald-300 bg-emerald-50/30' 
                        : 'border-slate-200 bg-white hover:border-brand-primary/40'
                    }`}
                  >
                    {/* Worker Info Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs ${
                          isPlotted ? 'bg-emerald-600 text-white' : 'bg-brand-subtle text-brand-dark'
                        }`}>
                          {worker.nama.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                              {worker.nama}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                              {worker.role}
                            </span>
                            {isPlotted && (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <span>📌 Di-ploting Pusat</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>Skema: <strong className="text-slate-700 capitalize">{worker.tipe_gaji || 'Harian'}</strong></span>
                            <span>•</span>
                            <span>Upah: <strong className="font-mono text-emerald-700">{formatRupiah(state.gaji_harian)}/hari</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center space-x-1">
                        {(['hadir', 'setengah_hari', 'izin', 'sakit', 'alpa'] as const).map(st => {
                          const isSelected = state.status === st;
                          let activeStyle = '';
                          let label = '';
                          if (st === 'hadir') {
                            activeStyle = 'bg-emerald-600 text-white shadow-sm';
                            label = 'Hadir';
                          } else if (st === 'setengah_hari') {
                            activeStyle = 'bg-sky-600 text-white shadow-sm';
                            label = '1/2 Hari';
                          } else if (st === 'izin') {
                            activeStyle = 'bg-amber-500 text-white shadow-sm';
                            label = 'Izin';
                          } else if (st === 'sakit') {
                            activeStyle = 'bg-indigo-600 text-white shadow-sm';
                            label = 'Sakit';
                          } else {
                            activeStyle = 'bg-rose-600 text-white shadow-sm';
                            label = 'Alpa';
                          }

                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => updateWorkerStatus(worker.id, st)}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all btn-tactile ${
                                isSelected 
                                  ? activeStyle 
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hours & Notes Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                          Jam Masuk
                        </label>
                        <input
                          type="time"
                          value={state.jam_masuk}
                          onChange={(e) => updateWorkerField(worker.id, 'jam_masuk', e.target.value)}
                          disabled={state.status === 'alpa' || state.status === 'sakit' || state.status === 'izin'}
                          className="w-full px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs text-slate-800 disabled:opacity-40"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                          Jam Pulang
                        </label>
                        <input
                          type="time"
                          value={state.jam_pulang}
                          onChange={(e) => updateWorkerField(worker.id, 'jam_pulang', e.target.value)}
                          disabled={state.status === 'alpa' || state.status === 'sakit' || state.status === 'izin'}
                          className="w-full px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs text-slate-800 disabled:opacity-40"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                          Catatan Shift
                        </label>
                        <input
                          type="text"
                          value={state.catatan}
                          onChange={(e) => updateWorkerField(worker.id, 'catatan', e.target.value)}
                          placeholder="Keterangan..."
                          className="w-full px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800"
                        />
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Total Staf di Outlet: <strong>{workers.length} Staf</strong>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSaveAttendance}
              disabled={saving || loading || workers.length === 0}
              className="px-5 py-2 rounded-xl font-extrabold text-xs bg-brand-primary hover:bg-brand-dark text-white shadow-md shadow-brand-dark/20 btn-tactile flex items-center space-x-1.5 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Presensi Kehadiran'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
