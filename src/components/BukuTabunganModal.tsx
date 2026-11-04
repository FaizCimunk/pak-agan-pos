'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  PiggyBank, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  MessageCircle, 
  DollarSign,
  PlusCircle,
  Clock,
  Building2
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
  const [saldo, setSaldo] = useState<number>(karyawan.total_tabungan || 0);
  const [isTarikOpen, setIsTarikOpen] = useState<boolean>(false);
  const [tarikNominal, setTarikNominal] = useState<number>(100000);
  const [tarikKeperluan, setTarikKeperluan] = useState<string>('Pencairan sebagian tabungan untuk kebutuhan pribadi');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const loadLogs = async () => {
    const list = await db.getTabunganKaryawanList(karyawan.id);
    setLogs(list);
    const kars = await db.getAllKaryawan();
    const fresh = kars.find(k => k.id === karyawan.id);
    if (fresh) {
      setSaldo(fresh.total_tabungan || 0);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [karyawan.id]);

  const handleTarikTabungan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tarikNominal <= 0) {
      setErrorMsg('Nominal pencairan harus lebih dari Rp 0');
      return;
    }
    if (tarikNominal > saldo) {
      setErrorMsg(`Saldo tabungan tidak cukup! Saldo saat ini: ${formatRupiah(saldo)}`);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await db.tarikTabunganKaryawan(
        karyawan.id,
        tarikNominal,
        tarikKeperluan.trim() || 'Pencairan Tabungan',
        'Pak Agan (Owner Pusat)'
      );
      setSuccessMsg(`Berhasil mencairkan tabungan sebesar ${formatRupiah(tarikNominal)} ke ${karyawan.nama}!`);
      setIsTarikOpen(false);
      setTarikNominal(100000);
      await loadLogs();
      await onSuccess();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mencairkan tabungan');
    } finally {
      setLoading(false);
    }
  };

  const handleShareWa = () => {
    const msg = [
      `*BUKU TABUNGAN KARYAWAN - SERABI BAWEL & WEDANG GEPREK*`,
      `-----------------------------------------`,
      `Halo Kak *${karyawan.nama}*,`,
      `Berikut adalah update saldo celengan tabungan rutin mingguan Anda di Pak Agan POS:`,
      ``,
      `💰 *Total Saldo Tabungan Anda Saat Ini:* *${formatRupiah(saldo)}*`,
      `📅 *Tabungan Rutin Tiap Minggu:* ${formatRupiah(karyawan.tabungan_rutin_mingguan || 0)} /minggu`,
      `🏪 *Penempatan Outlet:* ${cabangNama || 'Outlet Resmi'}`,
      ``,
      `Tabungan Anda disimpan aman dan transparan oleh Boss (Pak Agan). Dapat dicairkan kapan saja untuk kebutuhan keluarga, mendesak, atau hari raya.`,
      `-----------------------------------------`,
      `_Sistem Keuangan Karyawan POS • Powered by ivokgrup_`
    ].join('\n');

    const cleanPhone = (karyawan.telepon || '').replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-emerald-50 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm">
              <PiggyBank className="w-5 h-5 text-amber-950" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Buku Tabungan Karyawan</h3>
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

          {/* Saldo Tabungan Card */}
          <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-slate-950 p-5 rounded-2xl shadow-lg shadow-amber-500/20 border border-amber-300 relative overflow-hidden">
            <div className="relative z-10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-950/80 flex items-center space-x-1">
                  <Wallet className="w-3.5 h-3.5 text-amber-950" />
                  <span>Total Tabungan Staf Terkumpul</span>
                </span>
                <span className="text-[10px] font-extrabold bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-full">
                  Aman Disimpan Boss
                </span>
              </div>
              <div className="text-3xl font-black font-mono tracking-tight text-slate-950">
                {formatRupiah(saldo)}
              </div>
              <div className="pt-1 flex items-center justify-between text-xs text-amber-950/90 font-bold border-t border-amber-400/50">
                <span>Setoran Rutin Mingguan:</span>
                <span className="font-mono font-extrabold">{formatRupiah(karyawan.tabungan_rutin_mingguan || 0)} /minggu</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsTarikOpen(!isTarikOpen)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
            >
              <ArrowDownLeft className="w-4 h-4 text-amber-400" />
              <span>Cairkan / Tarik Tabungan</span>
            </button>
            <button
              type="button"
              onClick={handleShareWa}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Kirim Saldo ke WA Staf</span>
            </button>
          </div>

          {/* Form Tarik Tabungan (Dropdown Collapse) */}
          {isTarikOpen && (
            <form onSubmit={handleTarikTabungan} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-black text-slate-900 text-xs">Pencairan Dana Tabungan ke Staf:</span>
                <span className="text-[10px] text-slate-500">Maksimal: {formatRupiah(saldo)}</span>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Nominal Pencairan (Rp):</label>
                <input
                  type="text"
                  value={tarikNominal === 0 ? '' : formatNominal(tarikNominal)}
                  onChange={(e) => setTarikNominal(parseNominal(e.target.value))}
                  placeholder="Contoh: 200.000"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-mono font-black text-sm text-slate-900 focus:outline-none focus:border-amber-600"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Keperluan / Keterangan Pencairan:</label>
                <input
                  type="text"
                  value={tarikKeperluan}
                  onChange={(e) => setTarikKeperluan(e.target.value)}
                  placeholder="Misal: Tarik untuk bayar kos / mudik"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-medium text-xs text-slate-900 focus:outline-none focus:border-amber-600"
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
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-sm cursor-pointer"
                >
                  {loading ? 'Memproses...' : 'Konfirmasi Pencairan'}
                </button>
              </div>
            </form>
          )}

          {/* Riwayat Mutasi Tabungan */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Riwayat Celengan Masuk &amp; Penarikan:</span>
              <span className="text-[10px] text-slate-400 font-bold">{logs.length} Mutasi Tercatat</span>
            </span>

            {logs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                Belum ada riwayat tabungan untuk karyawan ini.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl border border-slate-200/90 overflow-hidden">
                {logs.map((item) => {
                  const isSetor = item.tipe === 'setor';
                  return (
                    <div key={item.id} className="p-3.5 flex items-start justify-between gap-3 bg-white hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-start space-x-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isSetor ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isSetor ? <ArrowUpRight className="w-4 h-4 text-emerald-700" /> : <ArrowDownLeft className="w-4 h-4 text-rose-700" />}
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-slate-900 text-xs">
                            {item.keterangan}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center space-x-2">
                            <span>{item.tanggal}</span>
                            <span>•</span>
                            <span>Saldo setelahnya: <strong className="font-mono text-slate-700">{formatRupiah(item.saldo_setelah)}</strong></span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-mono font-black text-xs block ${
                          isSetor ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {isSetor ? '+' : '-'}{formatRupiah(item.nominal)}
                        </span>
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase">
                          {isSetor ? 'Auto Simpan' : 'Pencairan'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-extrabold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Tutup Buku Tabungan
          </button>
        </div>

      </div>
    </div>
  );
}
