"use client";

import React from "react";
import { X, Download, Scissors, CheckCircle2 } from "lucide-react";
import { formatDateShort, formatRupiah, formatTimeHHMM } from "@/lib/format";
import {
  buildTwoSheetFinancialWorkbook,
  buildSingleCapsterTwoSheetWorkbook,
  triggerXlsxDownload,
  type CapsterFinancialExportPayload,
} from "@/lib/exportReconciliationCsv";

export interface PackageCommissionRow {
  packageId: string;
  packageName: string;
  unitPrice: number;
  sold: number;
  grossAmount: number;
  ownerShareAmount: number;
  commissionAmount: number;
}

export interface HaircutCommissionHistoryItem {
  id: string;
  orderCode: string;
  createdAt: string;
  customerName: string;
  packageName: string;
  quantity: number;
  revenueShare: number;
  commissionPct: number;
  ownerPct: number;
  capsterCommission: number;
  ownerShare: number;
  capsterName?: string | null;
}

interface CapsterCommissionModalProps {
  title: string;
  subtitle: string;
  ownerPct?: number;
  commissionPct?: number;
  showCapsterColumn?: boolean;
  kasbonTotal?: number;
  packageBreakdown: PackageCommissionRow[];
  haircutHistory: HaircutCommissionHistoryItem[];
  fullExportPayload?: CapsterFinancialExportPayload;
  onClose: () => void;
}

export function CapsterCommissionModal({
  title,
  subtitle,
  ownerPct = 60,
  commissionPct = 40,
  showCapsterColumn = false,
  kasbonTotal = 0,
  packageBreakdown,
  haircutHistory,
  fullExportPayload,
  onClose,
}: CapsterCommissionModalProps) {
  const totalSold = packageBreakdown.reduce((s, r) => s + r.sold, 0);
  const totalGross = packageBreakdown.reduce((s, r) => s + r.grossAmount, 0);
  const totalOwner = packageBreakdown.reduce((s, r) => s + r.ownerShareAmount, 0);
  const totalCapster = packageBreakdown.reduce((s, r) => s + r.commissionAmount, 0);
  const netCapster = totalCapster - kasbonTotal;

  const handleDownloadWorkbook = () => {
    if (fullExportPayload) {
      const bytes = buildTwoSheetFinancialWorkbook(fullExportPayload);
      triggerXlsxDownload(
        bytes,
        `rekap-2sheet-barber-kafe-saldo-${title.toLowerCase().replace(/\s+/g, "-")}.xlsx`
      );
      return;
    }

    const bytes = buildSingleCapsterTwoSheetWorkbook({
      title,
      subtitle,
      ownerPct,
      commissionPct,
      packageBreakdown,
      haircutHistory,
    });
    triggerXlsxDownload(
      bytes,
      `slip-2sheet-komisi-${title.toLowerCase().replace(/\s+/g, "-")}.xlsx`
    );
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-5"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#E5E7EB] flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0F172A] text-white flex items-center justify-center shrink-0">
                <Scissors className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">
                List Paket Barber &amp; Komisi Bagi Hasil — {title}
              </h3>
            </div>
            <p className="text-xs text-[#64748B] mt-1">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup popup komisi"
            className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#475569] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* 3 Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-3.5">
              <p className="text-[11px] font-medium text-[#64748B]">Pendapatan Unit Barber</p>
              <p className="text-lg font-bold text-[#0F172A] mt-1 tabular-nums">
                {formatRupiah(totalGross)}
              </p>
              <p className="text-[11px] text-[#64748B] mt-0.5">{totalSold} layanan cukur paket</p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-3.5">
              <p className="text-[11px] font-medium text-[#64748B]">
                Hak Owner Barber ({ownerPct}%)
              </p>
              <p className="text-lg font-bold text-[#0F172A] mt-1 tabular-nums">
                {formatRupiah(totalOwner)}
              </p>
              <p className="text-[11px] text-[#64748B] mt-0.5">Porsi pemilik dari unit barber</p>
            </div>

            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-[#15803D]">
                  Komisi Capster ({commissionPct}%)
                </p>
                {kasbonTotal > 0 && (
                  <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                    Kasbon -{formatRupiah(kasbonTotal)}
                  </span>
                )}
              </div>
              <p className="text-lg font-bold text-[#15803D] mt-1 tabular-nums">
                {formatRupiah(netCapster)}
              </p>
              <p className="text-[11px] text-[#15803D]/80 mt-0.5">
                {kasbonTotal > 0
                  ? `Kotor: ${formatRupiah(totalCapster)} · Potong Kasbon: ${formatRupiah(kasbonTotal)}`
                  : "Komisi bersih bagi hasil"}
              </p>
            </div>
          </div>

          {/* Full Barber vs Kafe Financial Alignment Summary when viewing Semua Capster */}
          {fullExportPayload && (
            <div className="bg-[#0F172A] text-white rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <p className="text-[10px] text-[#94A3B8]">Pendapatan Barber</p>
                <p className="text-sm font-bold mt-0.5 tabular-nums">
                  {formatRupiah(fullExportPayload.packageRevenue)}
                </p>
                <p className="text-[10px] text-[#CBD5E1]">
                  {fullExportPayload.packageSoldTotal} cukur paket
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#94A3B8]">Pendapatan Kafe</p>
                <p className="text-sm font-bold text-[#FDE68A] mt-0.5 tabular-nums">
                  {formatRupiah(fullExportPayload.drinkRevenue)}
                </p>
                <p className="text-[10px] text-[#CBD5E1]">100% milik toko</p>
              </div>
              <div>
                <p className="text-[10px] text-[#94A3B8]">Gaji Capster (40%)</p>
                <p className="text-sm font-bold text-[#4ADE80] mt-0.5 tabular-nums">
                  -{formatRupiah(fullExportPayload.totalCapsterShare)}
                </p>
                <p className="text-[10px] text-[#CBD5E1]">Dari unit Barber</p>
              </div>
              <div>
                <p className="text-[10px] text-[#94A3B8]">Pengeluaran</p>
                <p className="text-sm font-bold text-[#FCA5A5] mt-0.5 tabular-nums">
                  -{formatRupiah(fullExportPayload.totalExpenses)}
                </p>
                <p className="text-[10px] text-[#CBD5E1]">
                  {fullExportPayload.expenses.length} catatan biaya
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#94A3B8]">Sisa Saldo Bersih</p>
                <p className="text-sm font-bold text-white mt-0.5 tabular-nums">
                  {formatRupiah(
                    fullExportPayload.totalRevenue -
                      fullExportPayload.totalCapsterShare -
                      fullExportPayload.totalExpenses
                  )}
                </p>
                <p className="text-[10px] text-[#4ADE80]">Align 100% (2 Sheet)</p>
              </div>
            </div>
          )}

          {/* Section 1: List Paket & Komisi Bagi Hasil */}
          <div className="border border-[#E5E7EB] rounded-2xl overflow-x-auto">
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-[#0F172A]">
                  Rekap Unit Barber per Paket (Owner {ownerPct}% : Capster {commissionPct}%)
                </h4>
                <p className="text-[11px] text-[#64748B]">
                  Rincian jumlah cukur dan pembagian komisi pada masing-masing paket layanan barber
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#15803D]">
                <CheckCircle2 className="w-3 h-3" />
                Tersimpan otomatis per cukur
              </span>
            </div>

            <table className="w-full min-w-[540px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white border-b border-[#F1F5F9] text-[11px] font-medium text-[#64748B]">
                  <th className="py-2.5 px-4">Paket Layanan</th>
                  <th className="py-2.5 px-4 text-right">Harga Paket</th>
                  <th className="py-2.5 px-4 text-right">Komisi / Cukur</th>
                  <th className="py-2.5 px-4 text-right">Jumlah Cukur</th>
                  <th className="py-2.5 px-4 text-right">Omzet Barber</th>
                  <th className="py-2.5 px-4 text-right">Owner ({ownerPct}%)</th>
                  <th className="py-2.5 px-4 text-right">Capster ({commissionPct}%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {packageBreakdown.map((pkg) => {
                  const estCommPerCut = Math.round((pkg.unitPrice * commissionPct) / 100);
                  return (
                    <tr key={pkg.packageId} className="hover:bg-[#FAFAFA]">
                      <td className="py-3 px-4 font-semibold text-[#0F172A]">
                        Paket {pkg.packageName}
                      </td>
                      <td className="py-3 px-4 text-right text-[#64748B] tabular-nums">
                        {formatRupiah(pkg.unitPrice)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#15803D] font-medium tabular-nums">
                        {formatRupiah(estCommPerCut)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[#0F172A] tabular-nums">
                        {pkg.sold}×
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[#0F172A] tabular-nums">
                        {formatRupiah(pkg.grossAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[#0F172A] tabular-nums">
                        {formatRupiah(pkg.ownerShareAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#15803D] tabular-nums">
                        {formatRupiah(pkg.commissionAmount)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-[#FAFAFA] font-bold text-[#0F172A]">
                  <td className="py-3 px-4" colSpan={3}>
                    Total Unit Barber
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">{totalSold}×</td>
                  <td className="py-3 px-4 text-right tabular-nums">{formatRupiah(totalGross)}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{formatRupiah(totalOwner)}</td>
                  <td className="py-3 px-4 text-right text-[#15803D] tabular-nums">
                    {formatRupiah(totalCapster)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Riwayat Komisi Tersimpan per Cukur Paket */}
          <div className="border border-[#E5E7EB] rounded-2xl overflow-x-auto">
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#E5E7EB]">
              <h4 className="text-xs font-bold text-[#0F172A]">
                Rincian Komisi Tersimpan per Transaksi Cukur ({haircutHistory.length})
              </h4>
              <p className="text-[11px] text-[#64748B]">
                Setiap transaksi paket selesai langsung menyimpan nominal komisi bagi hasil ke database
              </p>
            </div>

            {haircutHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#94A3B8]">
                Belum ada transaksi cukur paket pada periode ini.
              </div>
            ) : (
              <table className="w-full min-w-[560px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white border-b border-[#F1F5F9] text-[11px] font-medium text-[#64748B]">
                    <th className="py-2.5 px-4">Pesanan &amp; Waktu</th>
                    <th className="py-2.5 px-4">Pelanggan</th>
                    <th className="py-2.5 px-4">Paket</th>
                    {showCapsterColumn && <th className="py-2.5 px-4">Capster</th>}
                    <th className="py-2.5 px-4 text-right">Nilai Paket</th>
                    <th className="py-2.5 px-4 text-right">Owner</th>
                    <th className="py-2.5 px-4 text-right">Komisi Capster</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {haircutHistory.map((row) => (
                    <tr key={row.id} className="hover:bg-[#FAFAFA]">
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-[#0F172A]">{row.orderCode}</span>
                        <span className="block text-[10px] text-[#94A3B8]">
                          {formatDateShort(row.createdAt)} · {formatTimeHHMM(row.createdAt)}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[#0F172A]">{row.customerName}</td>
                      <td className="py-2.5 px-4 font-medium text-[#0F172A]">
                        {row.quantity > 1 ? `${row.quantity}× ` : ""}
                        {row.packageName}
                      </td>
                      {showCapsterColumn && (
                        <td className="py-2.5 px-4 text-[#475569] font-medium">
                          {row.capsterName ?? "-"}
                        </td>
                      )}
                      <td className="py-2.5 px-4 text-right font-medium text-[#0F172A] tabular-nums">
                        {formatRupiah(row.revenueShare)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#475569] tabular-nums">
                        {formatRupiah(row.ownerShare)}
                        <span className="text-[10px] text-[#94A3B8] ml-1">({row.ownerPct}%)</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-[#15803D] tabular-nums">
                        {formatRupiah(row.capsterCommission)}
                        <span className="text-[10px] text-[#15803D]/75 ml-1">
                          ({row.commissionPct}%)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-[#E5E7EB] bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleDownloadWorkbook}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            {fullExportPayload
              ? "Ekspor Excel 2 Sheet: Ringkasan & Detail (.xlsx)"
              : "Unduh Slip Komisi 2 Sheet (.xlsx)"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
