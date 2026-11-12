'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Eye,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Wallet,
  Receipt,
  DollarSign,
} from 'lucide-react';
import { Cabang, PengeluaranKasbon, Shift, Transaksi } from '@/lib/types';
import { db, isBranchMatch } from '@/lib/db';
import { formatRupiah, formatTanggalId, formatWaktu, getShiftOperationalDate, toWibDateString } from '@/lib/utils';
import ReceiptModal from './ReceiptModal';

export interface ShiftAuditSummary {
  shiftTrx: Transaksi[];
  shiftExpenses: PengeluaranKasbon[];
  pendingExpenses: PengeluaranKasbon[];
  approvedLaciExpenses: PengeluaranKasbon[];
  tunai: number;
  qris: number;
  transfer: number;
  shopee: number;
  gofood: number;
  grabfood: number;
  nonTunaiTotal: number;
  ojolTotal: number;
  omzetTotal: number;
  belanjaLaciApproved: number;
  kasbonLaciApproved: number;
  saldoSistem: number;
  saldoFisik: number;
  selisih: number;
  unpaidNoteMatches: string[];
  unpaidCount: number;
  unpaidTotal: number;
}

function belongsToShift(
  recordShiftId: string | null | undefined,
  recordTime: string | undefined,
  recordBranchId: string | undefined,
  shift: Shift,
  isBranchEqual: (a?: string, b?: string) => boolean
): boolean {
  if (!isBranchEqual(recordBranchId, shift.cabang_id)) return false;
  if (recordShiftId) {
    return recordShiftId === shift.id;
  }
  const t = recordTime ? new Date(recordTime).getTime() : NaN;
  const openT = shift.waktu_buka ? new Date(shift.waktu_buka).getTime() : NaN;
  const closeT = shift.waktu_tutup ? new Date(shift.waktu_tutup).getTime() : null;
  if (isNaN(t) || isNaN(openT)) return false;
  if (t < openT - 5 * 60 * 1000) return false;
  if (closeT && t > closeT + 60 * 1000) return false;
  return true;
}

export function getShiftAuditSummary(
  shift: Shift,
  transaksiList: Transaksi[],
  expenseList: PengeluaranKasbon[],
  isBranchEqual: (a?: string, b?: string) => boolean = isBranchMatch
): ShiftAuditSummary {
  const shiftTrx = transaksiList
    .filter(
      (t) =>
        t.status === 'completed' &&
        belongsToShift(t.shift_id, t.waktu, t.cabang_id, shift, isBranchEqual)
    )
    .sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime());

  let tunai = 0;
  let qris = 0;
  let transfer = 0;
  let shopee = 0;
  let gofood = 0;
  let grabfood = 0;

  for (const trx of shiftTrx) {
    const pay = (trx.metode_bayar || '').toLowerCase().trim();
    const amt = Number(trx.total || 0);
    if (pay === 'tunai' || pay === 'cash') tunai += amt;
    else if (pay === 'qris') qris += amt;
    else if (pay.includes('transfer') || pay === 'tf' || pay === 'bank') transfer += amt;
    else if (pay.includes('shopee')) shopee += amt;
    else if (pay.includes('gofood') || pay.includes('gopay')) gofood += amt;
    else if (pay.includes('grab') || pay.includes('ovo')) grabfood += amt;
    else transfer += amt;
  }

  // Fallback jika daftar transaksi historis belum lengkap di halaman ini
  if (shiftTrx.length === 0 && (shift.total_transaksi_shift || 0) > 0) {
    tunai = Number(shift.total_tunai_masuk || 0);
    qris = Number(shift.total_qris_masuk || 0);
    transfer = Number(shift.total_transfer_masuk || 0);
    shopee = Number(shift.total_shopeefood_masuk || 0);
    gofood = Number(shift.total_gofood_masuk || 0);
    grabfood = Number(shift.total_grabfood_masuk || 0);
  }

  const shiftExpenses = expenseList
    .filter((e) => belongsToShift(e.shift_id, e.tanggal, e.cabang_id, shift, isBranchEqual))
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  const pendingExpenses = shiftExpenses.filter((e) => e.status === 'pending');
  const approvedLaciExpenses = shiftExpenses.filter(
    (e) => e.status === 'approved' && e.metode_pencairan !== 'transfer'
  );

  const belanjaLaciApproved =
    shiftExpenses.length > 0
      ? approvedLaciExpenses
          .filter((e) => e.jenis === 'belanja')
          .reduce((sum, e) => sum + Number(e.nominal || 0), 0)
      : Number(shift.total_belanja_approved || 0);

  const kasbonLaciApproved =
    shiftExpenses.length > 0
      ? approvedLaciExpenses
          .filter((e) => e.jenis === 'kasbon')
          .reduce((sum, e) => sum + Number(e.nominal || 0), 0)
      : Number(shift.total_kasbon_approved || 0);

  const saldoSistem = Number(shift.modal_awal || 0) + tunai - belanjaLaciApproved - kasbonLaciApproved;
  const saldoFisik = Number(shift.saldo_akhir_fisik || 0);
  const selisih = shift.status === 'closed' ? saldoFisik - saldoSistem : 0;

  const catatanText = shift.catatan || '';
  const unpaidNoteMatches = catatanText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.includes('KERUGIAN BELUM BAYAR') || l.includes('TAGIHAN BELUM BAYAR'));

  let unpaidCount = Number(shift.unpaid_bills_count || 0);
  let unpaidTotal = Number(shift.unpaid_bills_total || 0);
  if (unpaidCount === 0 && unpaidNoteMatches.length > 0) {
    const m = unpaidNoteMatches[0].match(/:\s*(\d+)\s*pesanan\s*\(([^)]+)\)/i);
    if (m) {
      unpaidCount = parseInt(m[1], 10) || unpaidNoteMatches.length;
      unpaidTotal = parseInt(m[2].replace(/[^0-9]/g, ''), 10) || 0;
    } else {
      unpaidCount = unpaidNoteMatches.length;
    }
  }

  const nonTunaiTotal = qris + transfer;
  const ojolTotal = shopee + gofood + grabfood;
  const omzetTotal = tunai + nonTunaiTotal + ojolTotal;

  return {
    shiftTrx,
    shiftExpenses,
    pendingExpenses,
    approvedLaciExpenses,
    tunai,
    qris,
    transfer,
    shopee,
    gofood,
    grabfood,
    nonTunaiTotal,
    ojolTotal,
    omzetTotal,
    belanjaLaciApproved,
    kasbonLaciApproved,
    saldoSistem,
    saldoFisik,
    selisih,
    unpaidNoteMatches,
    unpaidCount,
    unpaidTotal,
  };
}

interface ShiftMutasiModalProps {
  shift: Shift;
  cabang?: Cabang;
  transaksiList: Transaksi[];
  expenseList: PengeluaranKasbon[];
  onClose: () => void;
}

const METHOD_BADGE: Record<string, string> = {
  tunai: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  qris: 'bg-amber-50 text-amber-700 border-amber-200',
  transfer: 'bg-blue-50 text-blue-700 border-blue-200',
  shopeefood: 'bg-orange-50 text-orange-700 border-orange-200',
  gofood: 'bg-rose-50 text-rose-700 border-rose-200',
  grabfood: 'bg-green-50 text-green-700 border-green-200',
};

export default function ShiftMutasiModal({
  shift,
  cabang,
  transaksiList,
  expenseList,
  onClose,
}: ShiftMutasiModalProps) {
  const [selectedTrx, setSelectedTrx] = useState<Transaksi | null>(null);
  const [liveOpenBills, setLiveOpenBills] = useState<Transaksi[]>([]);

  useEffect(() => {
    let active = true;
    if (shift.status === 'open') {
      db.getOpenBills(shift.cabang_id)
        .then((list) => {
          if (active) setLiveOpenBills(list);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [shift.cabang_id, shift.status]);

  const audit = useMemo(
    () => getShiftAuditSummary(shift, transaksiList, expenseList, isBranchMatch),
    [shift, transaksiList, expenseList]
  );

  const shiftDate = getShiftOperationalDate(shift);
  const closeDate = shift.waktu_tutup ? toWibDateString(shift.waktu_tutup) : '';
  const closedPastMidnight = Boolean(closeDate && shiftDate && closeDate !== shiftDate);
  const isShortCash = shift.status === 'closed' && audit.selisih < 0;

  const fallbackCabang: Cabang = cabang || {
    id: shift.cabang_id,
    nomor: 1,
    kode: shift.cabang_nama || 'CBG',
    nama: shift.cabang_nama || shift.cabang_id,
    alamat: '',
    kota: 'Yogyakarta',
    telepon: '',
    target_omzet_bulanan: 0,
    qris_merchant_name: shift.cabang_nama || 'Serabi Bawel',
    is_active: true,
    kasir_username: '',
    kasir_pin: '',
    created_at: shift.waktu_buka,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent & Header */}
        <div className="h-1.5 bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-700 shrink-0" />
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10px] font-black">
                {cabang?.kode || shift.cabang_nama || shift.cabang_id}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                  shift.status === 'closed'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                }`}
              >
                {shift.status === 'closed' ? '✓ SUDAH TUTUP BUKU' : '● REAL-TIME (KASIR MASIH BUKA)'}
              </span>
              {closedPastMidnight && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-bold">
                  Tutup dinihari {formatTanggalId(closeDate)}
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
              Mutasi Laci &amp; Penjualan — {cabang?.nama || shift.cabang_nama}
            </h3>
            <p className="text-xs text-slate-500">
              Tanggal Buku: <strong className="text-slate-800">{formatTanggalId(shiftDate)}</strong> • PJ Kasir:{' '}
              <strong className="text-slate-800">{shift.karyawan_nama || 'Kasir Outlet'}</strong> • Buka:{' '}
              {formatWaktu(shift.waktu_buka)}
              {shift.waktu_tutup ? ` • Tutup: ${formatWaktu(shift.waktu_tutup)}` : ' • Berjalan'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* 1. Ringkasan Laci & Channel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mutasi Laci Tunai */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-700" />
                  <span>Mutasi Uang Tunai Laci</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-500">Real-Time Audit</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>(+) Modal Awal Laci</span>
                <span className="font-mono font-bold text-slate-900">{formatRupiah(shift.modal_awal || 0)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>(+) Penjualan Tunai Masuk</span>
                <span className="font-mono font-extrabold">+{formatRupiah(audit.tunai)}</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>(-) Belanja Laci ACC</span>
                <span className="font-mono font-bold">-{formatRupiah(audit.belanjaLaciApproved)}</span>
              </div>
              <div className="flex justify-between text-purple-700">
                <span>(-) Kasbon Laci ACC</span>
                <span className="font-mono font-bold">-{formatRupiah(audit.kasbonLaciApproved)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-extrabold text-slate-900">
                <span>Saldo Laci Wajib Ada (Sistem)</span>
                <span className="font-mono text-sm text-emerald-900">{formatRupiah(audit.saldoSistem)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700 font-bold">
                <span>Uang Fisik Dihitung Kasir</span>
                <span className="font-mono text-sm text-slate-950">
                  {shift.status === 'closed' ? formatRupiah(audit.saldoFisik) : 'Belum Tutup Shift'}
                </span>
              </div>
              {shift.status === 'closed' && (
                <div
                  className={`p-2 rounded-xl border flex justify-between items-center font-black ${
                    audit.selisih === 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : audit.selisih > 0
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-rose-100 border-rose-300 text-rose-900'
                  }`}
                >
                  <span>
                    {audit.selisih === 0
                      ? 'Status Kas Laci: PAS'
                      : audit.selisih > 0
                      ? 'Surplus / Lebih Uang'
                      : 'KAS TEKOR / MINUS'}
                  </span>
                  <span className="font-mono">
                    {audit.selisih === 0
                      ? 'Rp 0'
                      : `${audit.selisih > 0 ? '+' : '-'}${formatRupiah(Math.abs(audit.selisih))}`}
                  </span>
                </div>
              )}
            </div>

            {/* Rincian Channel Masuk */}
            <div className="p-4 rounded-2xl bg-emerald-950 text-white space-y-2 text-xs flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-extrabold text-emerald-300 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    <span>Omzet Masuk per Channel ({audit.shiftTrx.length} Struk)</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-200">Tunai Kasir</span>
                  <span className="font-mono font-bold">{formatRupiah(audit.tunai)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-200">QRIS Merchant</span>
                  <span className="font-mono font-bold">{formatRupiah(audit.qris)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-200">Transfer Bank</span>
                  <span className="font-mono font-bold">{formatRupiah(audit.transfer)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-200">ShopeeFood</span>
                  <span className="font-mono font-bold">{formatRupiah(audit.shopee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-rose-200">GoFood</span>
                  <span className="font-mono font-bold">{formatRupiah(audit.gofood)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-200">GrabFood</span>
                  <span className="font-mono font-bold">{formatRupiah(audit.grabfood)}</span>
                </div>
              </div>
              <div className="pt-2.5 mt-2 border-t border-white/15 flex justify-between items-center">
                <span className="font-black text-amber-300 uppercase text-[11px]">Total Omzet Shift Ini</span>
                <span className="font-mono font-black text-lg text-amber-300">{formatRupiah(audit.omzetTotal)}</span>
              </div>
            </div>
          </div>

          {/* 2. Peringatan Kerugian / Belum Bayar / Tekor / Pending ACC */}
          {(isShortCash ||
            audit.unpaidNoteMatches.length > 0 ||
            audit.unpaidCount > 0 ||
            liveOpenBills.length > 0 ||
            audit.pendingExpenses.length > 0 ||
            Boolean(shift.catatan)) && (
            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-3 text-xs">
              <div className="flex items-center gap-2 font-extrabold text-rose-950">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Catatan Kerugian, Kas Tekor, Belum Bayar &amp; Pending ACC</span>
              </div>

              {isShortCash && (
                <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-950 space-y-1">
                  <div className="font-black">
                    Kas Tekor / Selisih Minus: -{formatRupiah(Math.abs(audit.selisih))}
                  </div>
                  <div className="text-[11px]">
                    {shift.catatan
                      ? `Alasan / Catatan Kasir: ${shift.catatan}`
                      : 'Belum ada keterangan / alasan dari kasir — perlu dicek ke PJ shift.'}
                  </div>
                </div>
              )}

              {(audit.unpaidNoteMatches.length > 0 || audit.unpaidCount > 0 || liveOpenBills.length > 0) && (
                <div className="p-3 rounded-xl bg-white border border-rose-200 space-y-1.5">
                  <div className="font-extrabold text-rose-900 flex items-center justify-between">
                    <span>Tagihan Belum Bayar / Kerugian Tutup Buku</span>
                    {(audit.unpaidTotal > 0 || liveOpenBills.length > 0) && (
                      <span className="font-mono font-black text-rose-700">
                        {formatRupiah(
                          audit.unpaidTotal > 0
                            ? audit.unpaidTotal
                            : liveOpenBills.reduce((s, b) => s + Number(b.total || 0), 0)
                        )}
                      </span>
                    )}
                  </div>
                  {audit.unpaidNoteMatches.map((line, i) => (
                    <p key={i} className="text-[11px] text-slate-700 leading-relaxed">
                      {line}
                    </p>
                  ))}
                  {liveOpenBills.map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between text-[11px] text-slate-700 border-t border-slate-100 pt-1">
                      <span>
                        • {bill.penanda || bill.meja || bill.nama_pelanggan} ({bill.items.reduce((s, i) => s + i.qty, 0)} item — Menunggu Bayar)
                      </span>
                      <span className="font-mono font-bold text-rose-700">{formatRupiah(bill.total)}</span>
                    </div>
                  ))}
                </div>
              )}

              {audit.pendingExpenses.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
                  <div className="font-extrabold text-amber-950 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>{audit.pendingExpenses.length} Pengajuan Belanja / Kasbon Menunggu ACC Owner</span>
                    </span>
                    <span className="font-mono font-black text-amber-900">
                      {formatRupiah(audit.pendingExpenses.reduce((s, e) => s + Number(e.nominal || 0), 0))}
                    </span>
                  </div>
                  {audit.pendingExpenses.map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between text-[11px] text-amber-900">
                      <span>
                        • [{exp.jenis.toUpperCase()}] {exp.keperluan} ({exp.pemohon_nama})
                      </span>
                      <span className="font-mono font-bold">{formatRupiah(exp.nominal)}</span>
                    </div>
                  ))}
                </div>
              )}

              {shift.catatan && !isShortCash && audit.unpaidNoteMatches.length === 0 && (
                <p className="p-3 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-700 whitespace-pre-line">
                  <strong>Catatan Kasir:</strong> {shift.catatan}
                </p>
              )}
            </div>
          )}

          {/* 3. Daftar Mutasi Transaksi Shift (Persis seperti Mutasi Penjualan + Gambar Mata Struk) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-700" />
                <span>Mutasi Penjualan Shift Ini ({audit.shiftTrx.length} Transaksi)</span>
              </h4>
              <span className="text-[11px] text-slate-500">Klik ikon mata untuk melihat isi pesanan &amp; struk</span>
            </div>

            {audit.shiftTrx.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
                Belum ada transaksi lunas yang masuk pada shift ini.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Waktu &amp; Invoice</th>
                      <th className="py-2.5 px-3">Pelanggan</th>
                      <th className="py-2.5 px-3">Metode Bayar</th>
                      <th className="py-2.5 px-3 text-right">Nominal Tagihan</th>
                      <th className="py-2.5 px-3 text-center">Status &amp; Struk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {audit.shiftTrx.map((trx) => {
                      const methodKey = (trx.metode_bayar || 'tunai').toLowerCase();
                      const badgeCls = METHOD_BADGE[methodKey] || 'bg-slate-100 text-slate-700 border-slate-200';
                      return (
                        <tr key={trx.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-mono font-bold text-slate-900">{trx.invoice_no}</div>
                            <div className="text-[10px] text-slate-500">{formatWaktu(trx.waktu)}</div>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">
                            {trx.nama_pelanggan || 'Pelanggan Walk-in'}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {trx.items?.reduce((s, i) => s + Number(i.qty || 0), 0) || 0} item
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase ${badgeCls}`}>
                              {trx.metode_bayar}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                            {formatRupiah(trx.total)}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>SUCCESS</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedTrx(trx)}
                                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                                title="Lihat Detail Item & Struk"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-700" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 4. Mutasi Pengeluaran / Belanja & Kasbon Shift Ini */}
          {audit.shiftExpenses.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-700" />
                <span>Mutasi Belanja &amp; Kasbon Shift Ini ({audit.shiftExpenses.length} Pengajuan)</span>
              </h4>
              <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="py-2 px-3">Jenis &amp; Pemohon</th>
                      <th className="py-2 px-3">Keperluan</th>
                      <th className="py-2 px-3">Sumber</th>
                      <th className="py-2 px-3 text-right">Nominal</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {audit.shiftExpenses.map((exp) => (
                      <tr key={exp.id}>
                        <td className="py-2 px-3 font-bold text-slate-800 whitespace-nowrap">
                          {exp.jenis === 'kasbon' ? 'Kasbon' : 'Belanja'} • {exp.pemohon_nama}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{exp.keperluan}</td>
                        <td className="py-2 px-3 text-[11px] font-semibold text-slate-600">
                          {exp.metode_pencairan === 'transfer' ? 'Transfer Pusat' : 'Kas Laci'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatRupiah(exp.nominal)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                              exp.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : exp.status === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {exp.status === 'approved' ? 'DISETUJUI' : exp.status === 'rejected' ? 'DITOLAK' : 'MENUNGGU ACC'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold cursor-pointer transition"
          >
            Tutup Mutasi Shift
          </button>
        </div>
      </div>

      {selectedTrx && (
        <ReceiptModal
          transaksi={selectedTrx}
          cabang={fallbackCabang}
          onClose={() => setSelectedTrx(null)}
        />
      )}
    </div>
  );
}
