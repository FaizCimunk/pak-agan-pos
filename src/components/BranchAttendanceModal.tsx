'use client';

import React, { useState, useEffect } from 'react';
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
}

export default function BranchAttendanceModal({
  cabang,
  activeShift,
  onClose,
  onSuccess,
}: BranchAttendanceModalProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [workersList, setWorkersList] = useState<WorkerAttendanceState[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Form Tulis Nama Staf Baru / Tambahan Hari Ini (Simpel & Cepat)
  const [isAddingNewName, setIsAddingNewName] = useState<boolean>(false);
  const [newNama, setNewNama] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('Kitchen Serabi');
  const [newUpah, setNewUpah] = useState<number>(100000);
  const [newJamMasuk, setNewJamMasuk] = useState<string>('16:00');
  const [newJamPulang, setNewJamPulang] = useState<string>('23:30');

  // Load workers for this branch & records on selected date
  const loadBranchData = async () => {
    setLoading(true);
    try {
      const [allStaff, existingRecords] = await Promise.all([
        db.getAllKaryawan(),
        db.getAbsensiList(undefined, cabang.id, selectedDate),
      ]);

      const branchStaff = allStaff.filter(k => k.cabang_id === cabang.id && k.role !== 'owner');

      // Ambil seluruh nama dari existing records (termasuk staf yang ditulis manual sebelumnya)
      const list: WorkerAttendanceState[] = [];

      // 1. Masukkan staf yang sudah punya catatan absensi di tanggal ini
      existingRecords.forEach(rec => {
        const staffObj = allStaff.find(s => s.id === rec.karyawan_id);
        list.push({
          karyawan_id: rec.karyawan_id,
          karyawan_nama: rec.karyawan_nama || staffObj?.nama || 'Staf Harian',
          role: staffObj?.role || 'helper',
          tipe_gaji: 'harian',
          gaji_harian: rec.upah_harian_terhitung || staffObj?.gaji_harian || 100000,
          status: rec.status || 'hadir',
          jam_masuk: rec.jam_masuk || '16:00',
          jam_pulang: rec.jam_pulang || '23:30',
          catatan: rec.catatan || '',
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
            gaji_harian: st.gaji_harian || (st.tipe_gaji === 'harian' ? 100000 : Math.round(st.gaji_pokok / 26)),
            status: 'hadir',
            jam_masuk: '16:00',
            jam_pulang: '23:30',
            catatan: 'Shift Sore-Malam',
          });
        }
      });

      setWorkersList(list);
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

    const tempId = 'staf-' + Date.now();
    const newWorkerEntry: WorkerAttendanceState = {
      karyawan_id: tempId,
      karyawan_nama: newNama.trim(),
      role: newRole,
      tipe_gaji: 'harian',
      gaji_harian: Number(newUpah) || 100000,
      status: 'hadir',
      jam_masuk: newJamMasuk || '16:00',
      jam_pulang: newJamPulang || '23:30',
      catatan: 'Shift Sore-Malam (Staf Tambahan)',
    };

    // Buat juga master profil karyawan baru agar tercatat permanen di sistem & payroll
    try {
      await db.createKaryawan({
        cabang_id: cabang.id,
        nama: newNama.trim(),
        role: (newRole.toLowerCase().includes('kasir') ? 'kasir' : newRole.toLowerCase().includes('dapur') || newRole.toLowerCase().includes('serabi') ? 'kitchen' : 'helper') as any,
        telepon: '0812-0000-0000',
        tipe_gaji: 'harian',
        gaji_harian: Number(newUpah) || 100000,
        gaji_pokok: (Number(newUpah) || 100000) * 26,
        tunjangan: 0,
        plafon_kasbon: 300000,
      });
    } catch (e) {
      console.warn('Simpan master staf:', e);
    }

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
        jam_masuk: status === 'hadir' || status === 'setengah_hari' ? (w.jam_masuk || '16:00') : '',
        jam_pulang: status === 'hadir' ? (w.jam_pulang || '23:30') : status === 'setengah_hari' ? '20:00' : '',
      };
    }));
  };

  const updateWorkerField = (karyawanId: string, field: keyof WorkerAttendanceState, val: any) => {
    setWorkersList(prev => prev.map(w => {
      if (w.karyawan_id !== karyawanId) return w;
      return { ...w, [field]: val };
    }));
  };

  const handleRemoveWorker = (karyawanId: string, nama: string) => {
    if (confirm(`Hapus ${nama} dari daftar absensi hari ini?`)) {
      setWorkersList(prev => prev.filter(w => w.karyawan_id !== karyawanId));
    }
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const entries = workersList.map(w => ({
        karyawan_id: w.karyawan_id,
        karyawan_nama: w.karyawan_nama,
        cabang_id: cabang.id,
        cabang_nama: cabang.nama,
        tanggal: selectedDate,
        jam_masuk: w.jam_masuk || '16:00',
        jam_pulang: w.jam_pulang || '23:30',
        status: w.status,
        upah_harian: Number(w.gaji_harian) || 100000,
        catatan: w.catatan,
        recorded_by: activeShift?.karyawan_nama || 'Kasir Outlet',
      }));

      await db.saveBranchAttendance(entries);
      alert(`Presensi ${entries.length} staf ${cabang.nama} untuk tanggal ${selectedDate} berhasil disimpan!\nTotal upah harian otomatis tercatat ke Fixed Cost Toko.`);
      onSuccess();
    } catch (err: any) {
      alert('Gagal menyimpan presensi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Kalkulasi total upah yang hadir hari ini
  const totalHadirCount = workersList.filter(w => w.status === 'hadir' || w.status === 'setengah_hari').length;
  const totalUpahHariIni = workersList.reduce((sum, w) => {
    const mult = w.status === 'hadir' ? 1 : w.status === 'setengah_hari' ? 0.5 : 0;
    return sum + (Number(w.gaji_harian) * mult);
  }, 0);

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
                  Presensi &amp; Absensi Karyawan Toko
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {cabang.kode}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Outlet: <strong>{cabang.nama}</strong> • Tulis nama karyawan yang hadir hari ini
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

        {/* Date Selector & Tombol Tulis Nama Staf */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-brand-primary shrink-0" />
            <span className="font-bold text-slate-700">Tanggal:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800 outline-none focus:border-brand-primary"
            />
          </div>

          {/* Tombol Simpel Tulis Nama Staf */}
          <button
            type="button"
            onClick={() => setIsAddingNewName(!isAddingNewName)}
            className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-sm transition-all btn-tactile w-fit"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isAddingNewName ? 'Tutup Input Nama' : '+ Tulis Nama Staf'}</span>
          </button>
        </div>

        {/* Form Cepat: Tulis Nama Staf Baru / Bantuan */}
        {isAddingNewName && (
          <div className="px-6 py-4 bg-emerald-50/60 border-b border-emerald-200/60 animate-fadeIn">
            <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-soft-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-emerald-700" />
                  Tulis Nama Karyawan / Staf Hadir Hari Ini:
                </span>
                <span className="text-[10px] text-slate-400">
                  Langsung tersimpan tanpa ploting rumit
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nama Lengkap Karyawan *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Mas Joko / Mbak Rini"
                    value={newNama}
                    onChange={(e) => setNewNama(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-brand-primary focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tugas / Posisi
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-brand-primary"
                  >
                    <option value="Kitchen Serabi">Dapur / Tukang Bakar Serabi</option>
                    <option value="Wedang Barista">Barista Wedang Geprek</option>
                    <option value="Kasir Toko">Kasir Toko</option>
                    <option value="Helper & Cuci">Helper &amp; Cuci Piring</option>
                    <option value="Staf Serabutan">Staf Serabutan / Bantuan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Upah Kehadiran Harian (Rp)
                  </label>
                  <input
                    type="number"
                    value={newUpah}
                    onChange={(e) => setNewUpah(Number(e.target.value))}
                    step={5000}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-emerald-700 outline-none focus:border-brand-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Jam Masuk
                    </label>
                    <input
                      type="text"
                      value={newJamMasuk}
                      onChange={(e) => setNewJamMasuk(e.target.value)}
                      placeholder="16:00"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-center text-slate-800 outline-none focus:border-brand-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Jam Pulang
                    </label>
                    <input
                      type="text"
                      value={newJamPulang}
                      onChange={(e) => setNewJamPulang(e.target.value)}
                      placeholder="23:30"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-center text-slate-800 outline-none focus:border-brand-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddNewWorker}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all btn-tactile"
                >
                  + Tambahkan ke Daftar Absensi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Daftar Karyawan Hadir Hari Ini */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Memuat data absensi staf...
            </div>
          ) : workersList.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs bg-slate-50 rounded-2xl p-6 space-y-3 border border-dashed border-slate-200">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">
                Belum ada staf yang dicatat untuk tanggal ini.
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Klik tombol <strong>&quot;+ Tulis Nama Staf&quot;</strong> di atas untuk langsung menulis nama karyawan atau tenaga bantuan yang hadir hari ini.
              </p>
              <button
                type="button"
                onClick={() => setIsAddingNewName(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm inline-flex items-center space-x-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Tulis Nama Staf Sekarang</span>
              </button>
            </div>
          ) : (
            workersList.map((worker) => {
              return (
                <div 
                  key={worker.karyawan_id}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-500/40 transition-all shadow-soft-sm space-y-3"
                >
                  {/* Top Bar Staf */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-xs">
                        {worker.karyawan_nama.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-slate-900 text-sm">
                            {worker.karyawan_nama}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                            {worker.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>Upah: </span>
                          <input
                            type="number"
                            value={worker.gaji_harian}
                            onChange={(e) => updateWorkerField(worker.karyawan_id, 'gaji_harian', Number(e.target.value))}
                            step={5000}
                            className="w-24 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded font-mono font-bold text-emerald-800 text-xs"
                          />
                          <span className="text-slate-400">/hari</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Presensi */}
                    <div className="flex items-center space-x-1">
                      {(['hadir', 'setengah_hari', 'izin', 'sakit', 'alpa'] as const).map(st => {
                        const isSelected = worker.status === st;
                        let activeStyle = '';
                        let label = '';
                        if (st === 'hadir') {
                          activeStyle = 'bg-emerald-600 text-white shadow-xs';
                          label = 'Hadir';
                        } else if (st === 'setengah_hari') {
                          activeStyle = 'bg-sky-600 text-white shadow-xs';
                          label = '1/2 Hari';
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

                      {/* Tombol Hapus */}
                      <button
                        type="button"
                        onClick={() => handleRemoveWorker(worker.karyawan_id, worker.karyawan_nama)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
                        title="Hapus dari daftar hari ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Jam Kerja & Catatan */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] text-slate-400 font-medium">Jam:</span>
                      <input
                        type="text"
                        value={worker.jam_masuk}
                        onChange={(e) => updateWorkerField(worker.karyawan_id, 'jam_masuk', e.target.value)}
                        placeholder="16:00"
                        className="w-16 px-2 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 text-[11px]"
                      />
                      <span className="text-slate-300">-</span>
                      <input
                        type="text"
                        value={worker.jam_pulang}
                        onChange={(e) => updateWorkerField(worker.karyawan_id, 'jam_pulang', e.target.value)}
                        placeholder="23:30"
                        className="w-16 px-2 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 text-[11px]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Catatan tugas (opsional, misal: lembur 1 jam)"
                        value={worker.catatan}
                        onChange={(e) => updateWorkerField(worker.karyawan_id, 'catatan', e.target.value)}
                        className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-[11px] placeholder:text-slate-400 outline-none focus:border-brand-primary"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary & Save */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold">
              Total Hadir: <span className="font-extrabold text-emerald-700">{totalHadirCount} staf</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 font-bold">
              Total Upah Hari Ini: <span className="font-mono font-extrabold text-emerald-800">{formatRupiah(totalUpahHariIni)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSaveAttendance}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-emerald-800 text-white font-black text-xs shadow-md shadow-emerald-900/20 transition-all btn-tactile flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Presensi Hari Ini'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
