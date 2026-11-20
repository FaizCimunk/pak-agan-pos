'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  MessageCircle, 
  CalendarCheck,
  CreditCard,
  RefreshCw,
  Coins,
  Send,
  Building2,
  TrendingUp,
  TrendingDown,
  Trash2,
  RotateCcw,
  History,
  SlidersHorizontal,
  Edit3
} from 'lucide-react';
import { Karyawan, TabunganKaryawanItem } from '@/lib/types';
import { db } from '@/lib/db';
import { formatRupiah, formatNominal, parseNominal, formatWaktu } from '@/lib/utils';

interface BukuTabunganModalProps {
  karyawan: Karyawan;
  cabangNama?: string;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export default function BukuTabunganModal({
  karyawan,
  cabangNama,
  onClose,
  onSuccess,
}: BukuTabunganModalProps) {
  const [logs, setLogs] = useState<TabunganKaryawanItem[]>([]);
  const [saldo, setSaldo] = useState<number>(Number(karyawan.total_tabungan || 0));
  const [isTarikOpen, setIsTarikOpen] = useState<boolean>(false);
  const [tarikNominal, setTarikNominal] = useState<number>(0);
  const [tarikKeperluan, setTarikKeperluan] = useState<string>('Pencairan Gaji ke Rekening / Tunai');

  // State Koreksi & Input Manual (Upah Masuk, Kasbon, Atur Saldo Langsung)
  const [isAdjustOpen, setIsAdjustOpen] = useState<boolean>(false);
  const [adjustType, setAdjustType] = useState<'tambah_upah' | 'tambah_kasbon' | 'set_saldo'>('tambah_upah');
  const [adjustNominal, setAdjustNominal] = useState<number>(0);
  const [adjustTargetSaldo, setAdjustTargetSaldo] = useState<number>(0);
  const [adjustKategori, setAdjustKategori] = useState<string>('upah_hadir');
  const [adjustKeterangan, setAdjustKeterangan] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const loadLogs = async () => {
    const list = await db.getTabunganKaryawanList(karyawan.id);
    setLogs(list);
    const kars = await db.getAllKaryawan();
    const fresh = kars.find(k => k.id === karyawan.id);
    if (fresh) {
      setSaldo(Number(fresh.total_tabungan || 0));
    }
  };

  useEffect(() => {
    loadLogs();
  }, [karyawan.id]);

  const totalMasuk = logs
    .filter(l => l.tipe === 'setor')
    .reduce((sum, l) => sum + Number(l.nominal || 0), 0);

  const totalKeluar = logs
    .filter(l => l.tipe === 'tarik')
    .reduce((sum, l) => sum + Number(l.nominal || 0), 0);

  // Penarikan / Transfer Penuh (Saldo Jadi Rp 0)
  const handleTarikSemua = async () => {
    if (saldo <= 0) {
      setErrorMsg('Saldo saat ini Rp 0 atau minus, tidak ada saldo positif yang bisa ditarik.');
      return;
    }
    const confirmAll = confirm(
      `TARIK LUNAS GAJI (SALDO JADI RP 0):\n\n` +
      `Karyawan: ${karyawan.nama}\n` +
      `Nominal Ditarik: ${formatRupiah(saldo)}\n` +
      `Sisa Saldo Setelahnya: Rp 0\n\n` +
      `Lanjutkan pencairan ke staf?`
    );
    if (!confirmAll) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await db.tarikTabunganKaryawan(
        karyawan.id,
        saldo,
        `Pencairan Lunas Saldo Gaji (Saldo jadi Rp 0)`,
        'Pak Agan (Owner Pusat)',
        {
          kategori: 'pencairan_gaji',
          allowOverdraft: false,
          tanggal: new Date().toISOString().slice(0, 10),
        }
      );
      setSuccessMsg(`Pencairan lunas ${formatRupiah(saldo)} berhasil! Saldo ${karyawan.nama} kini Rp 0.`);
      await loadLogs();
      await onSuccess();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memproses penarikan lunas');
    } finally {
      setLoading(false);
    }
  };

  const handleTarikTabungan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tarikNominal <= 0) {
      setErrorMsg('Nominal pencairan harus lebih dari Rp 0');
      return;
    }
    if (tarikNominal > saldo && saldo > 0) {
      setErrorMsg(`Saldo tidak mencukupi! Saldo saat ini: ${formatRupiah(saldo)}`);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await db.tarikTabunganKaryawan(
        karyawan.id,
        tarikNominal,
        tarikKeperluan.trim() || 'Pencairan Sebagian Gaji',
        'Pak Agan (Owner Pusat)',
        {
          kategori: 'pencairan_gaji',
          allowOverdraft: true,
          tanggal: new Date().toISOString().slice(0, 10),
        }
      );
      setSuccessMsg(`Berhasil mencairkan dana sebesar ${formatRupiah(tarikNominal)} ke ${karyawan.nama}!`);
      setIsTarikOpen(false);
      setTarikNominal(0);
      await loadLogs();
      await onSuccess();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mencairkan dana');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (adjustType === 'tambah_upah') {
        if (adjustNominal <= 0) throw new Error('Nominal uang masuk harus lebih dari Rp 0');
        const ket = adjustKeterangan.trim() || 'Penambahan Upah / Hak Gaji Masuk';
        await db.setorTabunganKaryawan(
          karyawan.id,
          adjustNominal,
          ket,
          'Pak Agan (Owner)',
          {
            kategori: (adjustKategori as any) || 'upah_hadir',
            tanggal: new Date().toISOString().slice(0, 10),
          }
        );
        setSuccessMsg(`Berhasil menambahkan upah masuk sebesar ${formatRupiah(adjustNominal)}!`);
      } else if (adjustType === 'tambah_kasbon') {
        if (adjustNominal <= 0) throw new Error('Nominal kasbon harus lebih dari Rp 0');
        const ket = adjustKeterangan.trim() || 'Pengambilan Kasbon Staf';
        await db.tarikTabunganKaryawan(
          karyawan.id,
          adjustNominal,
          ket,
          'Pak Agan (Owner)',
          {
            kategori: 'kasbon',
            allowOverdraft: true,
            tanggal: new Date().toISOString().slice(0, 10),
          }
        );
        setSuccessMsg(`Berhasil mencatat kasbon sebesar -${formatRupiah(adjustNominal)}!`);
      } else if (adjustType === 'set_saldo') {
        const diff = adjustTargetSaldo - saldo;
        if (diff === 0) throw new Error('Target saldo sama dengan saldo saat ini.');
        const ket = adjustKeterangan.trim() || `Penyesuaian Koreksi Saldo dari ${formatRupiah(saldo)} ke ${formatRupiah(adjustTargetSaldo)}`;
        if (diff > 0) {
          await db.setorTabunganKaryawan(
            karyawan.id,
            diff,
            ket,
            'Pak Agan (Owner)',
            {
              kategori: 'koreksi',
              tanggal: new Date().toISOString().slice(0, 10),
            }
          );
        } else {
          await db.tarikTabunganKaryawan(
            karyawan.id,
            Math.abs(diff),
            ket,
            'Pak Agan (Owner)',
            {
              kategori: 'denda',
              allowOverdraft: true,
              tanggal: new Date().toISOString().slice(0, 10),
            }
          );
        }
        setSuccessMsg(`Saldo ${karyawan.nama} berhasil disesuaikan menjadi ${formatRupiah(adjustTargetSaldo)}!`);
      }

      setAdjustNominal(0);
      setAdjustKeterangan('');
      setIsAdjustOpen(false);
      await loadLogs();
      await onSuccess();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan penyesuaian');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAbsensi = async () => {
    setSyncing(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await db.syncPastApprovedAbsensiToDompet();
      setSuccessMsg(res.message);
      await loadLogs();
      await onSuccess();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal sinkronisasi');
    } finally {
      setSyncing(false);
    }
  };

  const handleShareWa = () => {
    const isMinus = saldo < 0;
    const msg = [
      `*BUKU REKENING DOMPET GAJI - SERABI BAWEL & WEDANG GEPREK*`,
      `=========================================`,
      `Halo Kak *${karyawan.nama}*,`,
      `Berikut adalah rincian mutasi dompet upah & kasbon Anda saat ini:`,
      ``,
      `📥 *Total Uang Masuk (+ Kredit):* *${formatRupiah(totalMasuk)}*`,
      `   _(Akumulasi upah harian presensi yang disetujui Owner)_`,
      `📤 *Total Uang Keluar (- Debit):* *${formatRupiah(totalKeluar)}*`,
      `   _(Kasbon, denda, dan pencairan gaji yang telah ditarik)_`,
      `-----------------------------------------`,
      isMinus
        ? `⚠️ *SISA SALDO (UTANG MINUS):* *-${formatRupiah(Math.abs(saldo))}*\n_(Minus ini akan otomatis berkurang/lunas begitu absensi kerja berikutnya di-ACC Boss)_`
        : saldo === 0
          ? `💰 *SISA SALDO DOMPET:* *Rp 0*\n_(Seluruh gaji telah ditarik lunas)_`
          : `💰 *SISA SALDO SIAP TARIK:* *+${formatRupiah(saldo)}*\n_(Siap ditransfer atau dicairkan kapan saja)_`,
      `-----------------------------------------`,
      `🏢 *Outlet:* ${cabangNama || 'Outlet Resmi'}`,
      `💳 *Rekening Tujuan:* ${karyawan.bank_nama || 'Bank'} ${karyawan.no_rekening ? `• ${karyawan.no_rekening}` : '(Tunai)'}`,
      `=========================================`,
      `_Sistem Keuangan Karyawan POS • Powered by ivokgrup_`
    ].join('\n');

    const cleanPhone = (karyawan.telepon || '').replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  const handleResetDompet = async () => {
    const confirmReset = confirm(
      `PERINGATAN RESET DOMPET STAF:\n\n` +
      `Apakah Anda yakin ingin MENGHAPUS SEMUA RIWAYAT MUTASI & ME-RESET SALDO "${karyawan.nama}" MENJADI RP 0?\n\n` +
      `Semua riwayat kasbon uji coba dan upah simulasi staf ini akan dibersihkan agar saldo kembali Rp 0.\n\n` +
      `Waktu reset dan saldo akhir sebelum reset (${formatRupiah(saldo)}) akan otomatis dicatat dalam jejak audit.`
    );
    if (!confirmReset) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await db.resetKaryawanDompet(karyawan.id, {
        saldoSebelumnya: saldo,
        resetBy: 'Pak Agan (Owner)'
      });
      await loadLogs();
      await onSuccess();
      setSuccessMsg(`Buku dompet & saldo ${karyawan.nama} berhasil dibersihkan dan di-reset ke Rp 0.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg('Gagal mereset dompet: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMutasiItem = async (item: TabunganKaryawanItem) => {
    const confirmDel = confirm(
      `HAPUS MUTASI INI?\n\n` +
      `Keterangan: ${item.keterangan}\n` +
      `Nominal: ${item.tipe === 'setor' ? '+' : '-'}${formatRupiah(item.nominal)}\n\n` +
      `Mutasi ini akan dihapus permanen dan saldo dompet staf akan otomatis dihitung ulang.`
    );
    if (!confirmDel) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await db.deleteTabunganItem(item.id, karyawan.id);
      await loadLogs();
      await onSuccess();
      setSuccessMsg('Mutasi berhasil dihapus dan saldo staf telah diperbarui.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg('Gagal menghapus mutasi: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const lastResetItem = logs.find(l => l.keterangan.includes('[RESET AUDIT]')) || 
    (karyawan.last_reset_at ? {
      id: 'last-reset-placeholder',
      created_at: karyawan.last_reset_at,
      dicatat_oleh: karyawan.last_reset_by || 'Pak Agan (Owner)',
      keterangan: `(Saldo Sebelum Reset: ${formatRupiah(karyawan.last_reset_saldo_snapshot || 0)})`
    } : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold shadow-sm">
              <Wallet className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Buku Dompet Rekening Staf</h3>
              <p className="text-[11px] text-slate-600 font-medium">
                {karyawan.nama} • {cabangNama || 'Outlet Cabang'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-500 flex items-center justify-center transition-colors cursor-pointer border border-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs overflow-y-auto">
          
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-2 text-xs font-bold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center space-x-2 text-xs font-bold animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Saldo Dompet Staf Card (Otomatis Dinamis: Positif / Minus Utang / Nol) */}
          <div className={`p-5 rounded-2xl shadow-lg border relative overflow-hidden transition-all ${
            saldo > 0
              ? 'bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 text-white border-emerald-500/40 shadow-emerald-900/20'
              : saldo < 0
                ? 'bg-gradient-to-br from-rose-700 via-rose-800 to-rose-950 text-white border-rose-500/40 shadow-rose-900/20'
                : 'bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900 text-white border-slate-700 shadow-slate-900/20'
          }`}>
            <div className="relative z-10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider flex items-center space-x-1.5 opacity-90">
                  <Coins className="w-4 h-4" />
                  <span>
                    {saldo > 0 ? 'Saldo Siap Ditarik / Ditransfer' : saldo < 0 ? 'Status: Utang / Minus Belum Lunas' : 'Saldo Dompet Nol (Lunas)'}
                  </span>
                </span>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                  saldo > 0
                    ? 'bg-emerald-300 text-emerald-950'
                    : saldo < 0
                      ? 'bg-rose-300 text-rose-950 animate-pulse'
                      : 'bg-slate-300 text-slate-900'
                }`}>
                  {saldo > 0 ? 'Siap Cair' : saldo < 0 ? 'Wajib Lunas' : 'Nihil / Lunas'}
                </span>
              </div>

              <div className="text-3xl font-black font-mono tracking-tight tabular-nums">
                {saldo < 0 ? `-${formatRupiah(Math.abs(saldo))}` : formatRupiah(saldo)}
              </div>

              <div className="pt-1.5 text-[10.5px] font-medium border-t border-white/20 leading-relaxed opacity-90">
                {saldo < 0 ? (
                  <span>
                    ⚠️ Staf memiliki pinjaman/kasbon. <strong>Begitu kasir absensi dan di-ACC Boss, upah harian otomatis mengurangi minus ini hingga lunas.</strong>
                  </span>
                ) : saldo > 0 ? (
                  <span>
                    Upah absensi approved otomatis menambah saldo ini. <strong>Jika ditarik semua, sisa saldo langsung menjadi Rp 0.</strong>
                  </span>
                ) : (
                  <span>
                    Seluruh hak gaji telah dicairkan atau belum ada absensi berjalan. Saldo saat ini tepat <strong>Rp 0</strong>.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3 Indikator Keuangan (Masuk, Keluar, Sisa) */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[9px] font-extrabold uppercase text-emerald-800 block flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                <span>Total Masuk (+)</span>
              </span>
              <div className="text-xs font-mono font-black text-emerald-900 mt-0.5">
                {formatRupiah(totalMasuk)}
              </div>
              <span className="text-[8.5px] text-emerald-700 block">Upah Hadir ACC</span>
            </div>

            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
              <span className="text-[9px] font-extrabold uppercase text-rose-800 block flex items-center justify-center gap-1">
                <TrendingDown className="w-3 h-3 text-rose-600" />
                <span>Total Keluar (-)</span>
              </span>
              <div className="text-xs font-mono font-black text-rose-900 mt-0.5">
                -{formatRupiah(totalKeluar)}
              </div>
              <span className="text-[8.5px] text-rose-700 block">Kasbon &amp; Tarik Gaji</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200">
              <span className="text-[9px] font-extrabold uppercase text-slate-600 block">
                Sisa Saldo
              </span>
              <div className={`text-xs font-mono font-black mt-0.5 ${saldo < 0 ? 'text-rose-700' : saldo > 0 ? 'text-emerald-800' : 'text-slate-700'}`}>
                {saldo < 0 ? `-${formatRupiah(Math.abs(saldo))}` : formatRupiah(saldo)}
              </div>
              <span className="text-[8.5px] text-slate-500 block">Masuk - Keluar</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {saldo > 0 ? (
              <button
                type="button"
                onClick={handleTarikSemua}
                disabled={loading}
                className="px-3 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
                title="Tarik seluruh saldo dompet sehingga sisa saldo menjadi Rp 0"
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-200" />
                <span>Tarik Lunas (Rp 0)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsTarikOpen(!isTarikOpen);
                  setIsAdjustOpen(false);
                }}
                className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <ArrowDownLeft className="w-4 h-4 text-amber-400" />
                <span>Cairkan Sebagian</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsAdjustOpen(!isAdjustOpen);
                setIsTarikOpen(false);
                if (!isAdjustOpen) {
                  setAdjustTargetSaldo(saldo);
                }
              }}
              className={`px-3 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm border ${
                isAdjustOpen
                  ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-400/50'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
              }`}
              title="Input upah masuk, catat kasbon, atau atur saldo langsung (koreksi salah pencet)"
            >
              <Edit3 className="w-4 h-4 text-amber-600" />
              <span>Input &amp; Edit Saldo</span>
            </button>

            {saldo > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setTarikNominal(saldo);
                  setIsTarikOpen(!isTarikOpen);
                  setIsAdjustOpen(false);
                }}
                className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Pencairan Kustom</span>
              </button>
            ) : (
              <div className="hidden sm:block" />
            )}

            <button
              type="button"
              onClick={handleShareWa}
              className={`px-3 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm ${saldo <= 0 ? 'col-span-2 sm:col-span-1' : ''}`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Kirim ke WA Staf</span>
            </button>
          </div>

          {/* Tombol Audit & Reset Dompet Staf */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] text-slate-500 font-semibold">
                Perlu cek presensi, edit saldo, atau bersihkan data uji coba?
              </span>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdjustOpen(!isAdjustOpen);
                    setIsTarikOpen(false);
                    if (!isAdjustOpen) {
                      setAdjustTargetSaldo(saldo);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg border text-[10px] font-extrabold flex items-center space-x-1 transition cursor-pointer ${
                    isAdjustOpen
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                  title="Koreksi saldo, masukkan gaji/upah manual, atau catat kasbon jika salah reset"
                >
                  <Edit3 className="w-3 h-3 text-amber-600" />
                  <span>Input / Edit Saldo</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetDompet}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-extrabold flex items-center space-x-1 transition cursor-pointer"
                  title="Hapus riwayat uji coba dan jadikan saldo staf Rp 0"
                >
                  <Trash2 className="w-3 h-3 text-rose-600" />
                  <span>Reset ke Rp 0</span>
                </button>
                <button
                  type="button"
                  onClick={handleSyncAbsensi}
                  disabled={syncing}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-extrabold flex items-center space-x-1 transition cursor-pointer"
                  title="Cek apakah ada presensi masuk baru yang belum tercatat di buku dompet"
                >
                  <RefreshCw className={`w-3 h-3 text-brand-primary ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Memeriksa...' : 'Cek Presensi Baru'}</span>
                </button>
              </div>
            </div>

            {/* Jejak Audit Waktu & Riwayat Akhir Reset */}
            {lastResetItem && (
              <div className="pt-2 border-t border-slate-200/90 flex flex-wrap items-center justify-between gap-1 text-[9.5px]">
                <div className="flex items-center space-x-1.5 text-amber-900 font-bold">
                  <RotateCcw className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>Jejak Reset Terakhir:</span>
                  <span className="font-mono text-slate-800">
                    {lastResetItem.created_at ? new Date(lastResetItem.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}{' '}
                    {lastResetItem.created_at ? new Date(lastResetItem.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''} WIB
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>Oleh: <strong className="text-slate-800">{lastResetItem.dicatat_oleh || 'Pak Agan (Owner)'}</strong></span>
                </div>
                <div className="text-slate-600 font-semibold font-mono">
                  {lastResetItem.keterangan.includes('Saldo Sebelum')
                    ? lastResetItem.keterangan.slice(lastResetItem.keterangan.indexOf('('))
                    : `(Saldo Sebelum Reset: ${formatRupiah(karyawan.last_reset_saldo_snapshot || 0)})`}
                </div>
              </div>
            )}
          </div>

          {/* Form Koreksi & Input Saldo Manual (Dropdown Collapse) */}
          {isAdjustOpen && (
            <form onSubmit={handleSaveAdjustment} className="p-4 rounded-2xl bg-gradient-to-b from-amber-50/70 to-orange-50/40 border border-amber-200/90 space-y-3.5 animate-fadeIn shadow-xs">
              <div className="flex items-center justify-between border-b border-amber-200/70 pb-2.5">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4 text-amber-700" />
                  </div>
                  <div>
                    <span className="font-black text-slate-900 text-xs block">
                      Input &amp; Koreksi Saldo Dompet
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Gunakan jika admin salah pencet reset atau perlu penyesuaian gaji &amp; kasbon manual.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdjustOpen(false)}
                  className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 3 Tab Mode Pilihan */}
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white border border-amber-200/80">
                <button
                  type="button"
                  onClick={() => setAdjustType('tambah_upah')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition flex items-center justify-center space-x-1 cursor-pointer ${
                    adjustType === 'tambah_upah'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>+ Upah Masuk</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('tambah_kasbon')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition flex items-center justify-center space-x-1 cursor-pointer ${
                    adjustType === 'tambah_kasbon'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>- Kasbon Staf</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdjustType('set_saldo');
                    setAdjustTargetSaldo(saldo);
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition flex items-center justify-center space-x-1 cursor-pointer ${
                    adjustType === 'set_saldo'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>✏️ Atur Saldo Pas</span>
                </button>
              </div>

              {/* Mode 1: Tambah Upah Masuk */}
              {adjustType === 'tambah_upah' && (
                <div className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-[10.5px] text-emerald-900 leading-snug">
                    💡 <strong>Tambah Upah:</strong> Menambahkan nominal ke saldo dompet (misal: gaji presensi yang belum terhitung, bonus, atau lembur).
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 text-xs block">Nominal Uang Masuk (Rp):</label>
                      <input
                        type="text"
                        value={adjustNominal === 0 ? '' : formatNominal(adjustNominal)}
                        onChange={(e) => setAdjustNominal(parseNominal(e.target.value))}
                        placeholder="Contoh: 35.000"
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-mono font-black text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 text-xs block">Kategori Upah:</label>
                      <select
                        value={adjustKategori}
                        onChange={(e) => setAdjustKategori(e.target.value)}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-bold text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                      >
                        <option value="upah_hadir">Upah Hadir Presensi</option>
                        <option value="bonus">Bonus / Insentif Omzet</option>
                        <option value="lembur">Uang Lembur Toko</option>
                        <option value="koreksi">Koreksi Tambah Saldo</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-xs block">Keterangan / Alasan:</label>
                    <input
                      type="text"
                      value={adjustKeterangan}
                      onChange={(e) => setAdjustKeterangan(e.target.value)}
                      placeholder="Contoh: Masukkan kembali upah kemarin (salah reset)"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-medium text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              )}

              {/* Mode 2: Tambah Kasbon / Potongan */}
              {adjustType === 'tambah_kasbon' && (
                <div className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/80 text-[10.5px] text-rose-900 leading-snug">
                    ⚠️ <strong>Catat Kasbon / Potongan:</strong> Mengurangi saldo dompet (atau menambah minus utang staf jika saldo kurang).
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 text-xs block">Nominal Kasbon / Potongan (Rp):</label>
                      <input
                        type="text"
                        value={adjustNominal === 0 ? '' : formatNominal(adjustNominal)}
                        onChange={(e) => setAdjustNominal(parseNominal(e.target.value))}
                        placeholder="Contoh: 20.000"
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-mono font-black text-sm text-rose-700 focus:outline-none focus:border-rose-600"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 text-xs block">Kategori Potongan:</label>
                      <select
                        value={adjustKategori}
                        onChange={(e) => setAdjustKategori(e.target.value)}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-bold text-xs text-slate-800 focus:outline-none focus:border-rose-600"
                      >
                        <option value="kasbon">Kasbon Staf</option>
                        <option value="denda">Denda / Penggantian Selisih</option>
                        <option value="potongan_lain">Potongan Lainnya</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-xs block">Keterangan / Keperluan Kasbon:</label>
                    <input
                      type="text"
                      value={adjustKeterangan}
                      onChange={(e) => setAdjustKeterangan(e.target.value)}
                      placeholder="Contoh: Pinjaman kasbon tunai dari laci kasir"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-medium text-xs text-slate-900 focus:outline-none focus:border-rose-600"
                    />
                  </div>
                </div>
              )}

              {/* Mode 3: Atur Saldo Langsung (Koreksi Cepat Jika Salah Reset) */}
              {adjustType === 'set_saldo' && (
                <div className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-amber-100/70 border border-amber-300/80 text-[10.5px] text-amber-950 leading-snug">
                    🎯 <strong>Koreksi Saldo Langsung:</strong> Ketikkan angka saldo akhir yang diinginkan. Sistem otomatis menghitung selisih dari saldo saat ini (<strong>{formatRupiah(saldo)}</strong>) sehingga saldo dompet staf langsung berubah pas sesuai yang Anda ketik.
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-slate-700">Target Saldo Akhir Staf (Rp):</label>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Saldo Saat Ini: {formatRupiah(saldo)}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={adjustTargetSaldo === 0 ? '' : formatNominal(adjustTargetSaldo)}
                      onChange={(e) => setAdjustTargetSaldo(parseNominal(e.target.value))}
                      placeholder="Contoh: 35.000"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-mono font-black text-sm text-slate-900 focus:outline-none focus:border-amber-600"
                      required
                    />
                    {adjustTargetSaldo !== saldo && (
                      <div className="text-[10.5px] font-bold text-slate-600 pt-0.5">
                        {adjustTargetSaldo > saldo ? (
                          <span className="text-emerald-700">
                            + Sistem akan menambahkan kredit sebesar <strong>+{formatRupiah(adjustTargetSaldo - saldo)}</strong>.
                          </span>
                        ) : (
                          <span className="text-rose-700">
                            - Sistem akan mencatat penyesuaian debit sebesar <strong>-{formatRupiah(saldo - adjustTargetSaldo)}</strong>.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-xs block">Alasan Koreksi Saldo:</label>
                    <input
                      type="text"
                      value={adjustKeterangan}
                      onChange={(e) => setAdjustKeterangan(e.target.value)}
                      placeholder="Contoh: Koreksi salah pencet tombol reset, kembalikan ke saldo sebelum reset"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-medium text-xs text-slate-900 focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>
              )}

              {/* Tombol Simpan Penyesuaian */}
              <div className="flex items-center justify-end space-x-2 pt-1 border-t border-amber-200/70">
                <button
                  type="button"
                  onClick={() => setIsAdjustOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-1.5 rounded-xl text-white font-extrabold text-xs shadow-sm cursor-pointer transition ${
                    adjustType === 'tambah_upah'
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : adjustType === 'tambah_kasbon'
                        ? 'bg-rose-700 hover:bg-rose-800'
                        : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {loading
                    ? 'Menyimpan...'
                    : adjustType === 'tambah_upah'
                      ? '+ Masukkan Upah ke Dompet'
                      : adjustType === 'tambah_kasbon'
                        ? '- Potong Kasbon dari Dompet'
                        : '💾 Simpan Target Saldo'}
                </button>
              </div>
            </form>
          )}

          {/* Form Tarik Kustom (Dropdown Collapse) */}
          {isTarikOpen && (
            <form onSubmit={handleTarikTabungan} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-black text-slate-900 text-xs">Pencairan Dana ke Staf:</span>
                <span className="text-[10px] text-slate-500">Saldo Saat Ini: {formatRupiah(saldo)}</span>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Nominal Pencairan (Rp):</label>
                <input
                  type="text"
                  value={tarikNominal === 0 ? '' : formatNominal(tarikNominal)}
                  onChange={(e) => setTarikNominal(parseNominal(e.target.value))}
                  placeholder="Contoh: 100.000"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-mono font-black text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Keperluan / Keterangan Pencairan:</label>
                <input
                  type="text"
                  value={tarikKeperluan}
                  onChange={(e) => setTarikKeperluan(e.target.value)}
                  placeholder="Misal: Pencairan Gaji ke Rekening BCA Staf"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-medium text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsTarikOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 text-xs font-bold hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-sm cursor-pointer"
                >
                  {loading ? 'Memproses...' : 'Konfirmasi Pencairan'}
                </button>
              </div>
            </form>
          )}

          {/* Riwayat Mutasi Dompet (Uang Masuk & Keluar) */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Mutasi Dompet Masuk (+ Kredit) &amp; Keluar (- Debit):</span>
              <span className="text-[10px] text-slate-400 font-bold">{logs.length} Mutasi Tercatat</span>
            </span>

            {logs.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2.5">
                <p className="text-slate-500 text-xs font-medium">
                  Belum ada mutasi aktif berjalan. Presensi yang di-ACC atau kasbon baru akan otomatis tercatat di sini.
                </p>
                {lastResetItem && (
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold shadow-2xs">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      Jejak Reset: Saldo dibersihkan ke Rp 0 pada {lastResetItem.created_at ? `${new Date(lastResetItem.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} (${new Date(lastResetItem.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB)` : ''} • {lastResetItem.keterangan.includes('Saldo Sebelum') ? lastResetItem.keterangan.slice(lastResetItem.keterangan.indexOf('(')) : `(Saldo Sebelum: ${formatRupiah(karyawan.last_reset_saldo_snapshot || 0)})`}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl border border-slate-200/90 overflow-hidden">
                {logs.map((item) => {
                  const isResetAudit = item.keterangan.includes('[RESET AUDIT]');
                  const isKoreksi = item.kategori === 'koreksi' && !isResetAudit;
                  const isSetor = item.tipe === 'setor';
                  const isNegativeSaldo = item.saldo_setelah < 0;
                  return (
                    <div key={item.id} className="p-3.5 flex items-start justify-between gap-3 bg-white hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-start space-x-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isResetAudit
                            ? 'bg-amber-100 text-amber-800'
                            : isKoreksi
                              ? 'bg-blue-100 text-blue-800'
                              : isSetor 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isResetAudit ? (
                            <RotateCcw className="w-4 h-4 text-amber-700" />
                          ) : isKoreksi ? (
                            <SlidersHorizontal className="w-4 h-4 text-blue-700" />
                          ) : isSetor ? (
                            <ArrowUpRight className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4 text-rose-700" />
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <div className={`font-extrabold text-xs flex items-center gap-1.5 ${isResetAudit ? 'text-amber-950' : 'text-slate-900'}`}>
                            <span>{item.keterangan.replace('[RESET AUDIT] ', '')}</span>
                            {isResetAudit && (
                              <span className="px-1.5 py-0.2 rounded-full bg-amber-200/80 text-amber-900 text-[8.5px] font-black uppercase">
                                Jejak Reset
                              </span>
                            )}
                            {isKoreksi && (
                              <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[8.5px] font-black uppercase">
                                Koreksi Saldo
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-1.5">
                            <span>{item.tanggal}</span>
                            {item.created_at && (
                              <span className="text-slate-400 font-mono">
                                ({new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB)
                              </span>
                            )}
                            {item.dicatat_oleh && (
                              <>
                                <span>•</span>
                                <span>Oleh: <strong className="text-slate-700">{item.dicatat_oleh}</strong></span>
                              </>
                            )}
                            <span>•</span>
                            <span>
                              Saldo jadi: <strong className={`font-mono ${isNegativeSaldo ? 'text-rose-600 font-black' : isResetAudit ? 'text-emerald-700 font-black' : 'text-slate-700 font-bold'}`}>
                                {isNegativeSaldo ? `-${formatRupiah(Math.abs(item.saldo_setelah))}` : formatRupiah(item.saldo_setelah)}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <div className="text-right">
                          <span className={`font-mono font-black text-xs block tabular-nums ${
                            isResetAudit ? 'text-amber-700' : isSetor ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {isResetAudit ? 'Rp 0' : `${isSetor ? '+' : '-'}${formatRupiah(item.nominal)}`}
                          </span>
                          <span className={`text-[9.5px] font-bold uppercase ${
                            isResetAudit
                              ? 'text-amber-700'
                              : isKoreksi
                                ? 'text-blue-700'
                                : item.kategori === 'upah_hadir'
                                  ? 'Upah Hadir'
                                  : item.kategori === 'kasbon'
                                    ? 'Kasbon'
                                    : item.kategori === 'pencairan_gaji'
                                      ? 'Pencairan'
                                      : isSetor ? 'Uang Masuk' : 'Uang Keluar'}
                          }`}>
                            {isResetAudit
                              ? 'Reset Saldo'
                              : isKoreksi
                                ? 'Koreksi'
                                : item.kategori === 'upah_hadir'
                                  ? 'Upah Hadir'
                                  : item.kategori === 'kasbon'
                                    ? 'Kasbon'
                                    : item.kategori === 'pencairan_gaji'
                                      ? 'Pencairan'
                                      : isSetor ? 'Uang Masuk' : 'Uang Keluar'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMutasiItem(item)}
                          disabled={loading}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Hapus riwayat mutasi ini & hitung ulang saldo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-slate-400 font-medium">
            Saldo Otomatis Sinkron Real-Time
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-extrabold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Tutup Buku Dompet
          </button>
        </div>

      </div>
    </div>
  );
}
