"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Download,
  Banknote,
  QrCode,
  CreditCard,
  ArrowRight,
  Scissors,
} from "lucide-react";
import { formatDateHeader, formatDateShort, formatRupiah } from "@/lib/format";
import {
  CapsterCommissionModal,
  type PackageCommissionRow,
  type HaircutCommissionHistoryItem,
} from "../CapsterCommissionModal";
import {
  buildTwoSheetFinancialWorkbook,
  triggerXlsxDownload,
  type CapsterFinancialExportPayload,
  type ReconciliationDetailLine,
} from "@/lib/exportReconciliationCsv";

interface ReportStatItem {
  id: string;
  name: string;
  category?: string;
  price?: number;
  sold: number;
  stock?: number;
  revenue: number;
  packageRevenue?: number;
  commissionPct?: number;
  ownerPct?: number;
  commissionAmount?: number;
  ownerShareAmount?: number;
  kasbonAmount?: number;
  netCommissionAmount?: number;
  contributionPct: number;
  packageBreakdown?: PackageCommissionRow[];
  haircutHistory?: HaircutCommissionHistoryItem[];
}

interface RecentExpenseItem {
  id: string;
  amount: number;
  description: string;
  category: string;
  paymentMethod: "TUNAI" | "QRIS" | "DEBIT";
  expenseDate: string;
}

interface ReportData {
  summary: {
    totalRevenue: number;
    totalCount: number;
    walkInCount: number;
    bookingCount: number;
    revenueDeltaPct: number;
    countDelta: number;
    packageRevenue: number;
    packageSoldTotal: number;
    drinkRevenue: number;
    drinkSoldTotal: number;
    totalOwnerPackageShare: number;
    totalCapsterShare: number;
    totalKasbonShare?: number;
    netCapsterShare?: number;
    totalOwnerGross: number;
    totalExpenses: number;
    cashExpensesTotal: number;
    qrisExpensesTotal?: number;
    debitExpensesTotal?: number;
    nonCashExpensesTotal: number;
    cashBeforeCapsterPayout?: number;
    netOwnerIncome: number;
  };
  hourly: Array<{ hour: string; amount: number; amountThousands: number }>;
  peakHour: { hour: string; amount: number; amountThousands: number };
  packageStats: ReportStatItem[];
  drinkStats: ReportStatItem[];
  capsterStats: ReportStatItem[];
  allCapstersBreakdown?: {
    packageBreakdown: PackageCommissionRow[];
    haircutHistory: HaircutCommissionHistoryItem[];
    totalKasbon?: number;
  };
  transactionLines?: ReconciliationDetailLine[];
  paymentSplit: {
    tunaiCount: number;
    qrisCount: number;
    debitCount: number;
    tunaiRevenue: number;
    qrisRevenue: number;
    debitRevenue: number;
    tunaiBarberRevenue?: number;
    tunaiKafeRevenue?: number;
    qrisBarberRevenue?: number;
    qrisKafeRevenue?: number;
    debitBarberRevenue?: number;
    debitKafeRevenue?: number;
    netCashRevenue: number;
    netQrisRevenue?: number;
    netDebitRevenue?: number;
    tunaiPct: number;
    qrisPct: number;
    debitPct: number;
  };
  expenses?: RecentExpenseItem[];
  recentExpenses?: RecentExpenseItem[];
  packageDetail: {
    package: { id: string; name: string };
    revenue: number;
    revenuePct: number;
    sold: number;
    totalSoldAll: number;
    walkInCount: number;
    bookingCount: number;
    walkInPct: number;
    bookingPct: number;
    topCapster: ReportStatItem | null;
    byCapster: ReportStatItem[];
  } | null;
  drinkDetail: {
    drink: { id: string; name: string; stock: number; price: number };
    revenue: number;
    revenuePct: number;
    sold: number;
    totalSoldAll: number;
    walkInCount: number;
    bookingCount: number;
  } | null;
  capsterDetail: {
    capster: { id: string; name: string };
    revenue: number;
    packageRevenue?: number;
    commissionPct?: number;
    ownerPct?: number;
    commissionAmount?: number;
    ownerShareAmount?: number;
    kasbonAmount?: number;
    netCommissionAmount?: number;
    revenuePct: number;
    sold: number;
    totalSoldAll: number;
    walkInCount: number;
    bookingCount: number;
    walkInPct: number;
    bookingPct: number;
    topPackage: ReportStatItem | null;
    byPackage: ReportStatItem[];
    packageBreakdown?: PackageCommissionRow[];
    haircutHistory?: HaircutCommissionHistoryItem[];
  } | null;
}

export function LaporanClient({
  packages,
  drinks,
  capsters,
}: {
  packages: Array<{ id: string; name: string }>;
  drinks: Array<{ id: string; name: string }>;
  capsters: Array<{ id: string; name: string }>;
}) {
  const [range, setRange] = useState<"today" | "7d" | "30d" | "custom">("today");
  const [customFrom, setCustomFrom] = useState(new Date().toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(new Date().toISOString().slice(0, 10));
  const [view, setView] = useState<"overall" | "payment" | "package" | "drink" | "capster">(
    "overall"
  );
  const [selectedPackageId, setSelectedPackageId] = useState<string>("ALL");
  const [selectedDrinkId, setSelectedDrinkId] = useState<string>("ALL");
  const [selectedCapsterId, setSelectedCapsterId] = useState<string>("ALL");
  const [commissionModal, setCommissionModal] = useState<{
    title: string;
    subtitle: string;
    ownerPct: number;
    commissionPct: number;
    showCapsterColumn: boolean;
    kasbonTotal?: number;
    packageBreakdown: PackageCommissionRow[];
    haircutHistory: HaircutCommissionHistoryItem[];
    fullExportPayload?: CapsterFinancialExportPayload;
  } | null>(null);
  const [reportState, setReportState] = useState<{
    key: string;
    data: ReportData | null;
  }>({ key: "", data: null });

  const queryParams = new URLSearchParams({
    range,
    packageId: selectedPackageId,
    drinkId: selectedDrinkId,
    capsterId: selectedCapsterId,
  });
  if (range === "custom") {
    queryParams.set("from", customFrom);
    queryParams.set("to", customTo);
  }
  const queryKey = queryParams.toString();
  const report = reportState.data;
  const loading = reportState.key !== queryKey && report === null;

  useEffect(() => {
    let active = true;
    fetch(`/api/reports?${queryKey}`)
      .then((r) => r.json())
      .then((json) => {
        if (active) {
          setReportState({ key: queryKey, data: json.data ?? null });
        }
      })
      .catch(() => {
        if (active) {
          setReportState((prev) => ({ key: queryKey, data: prev.data }));
        }
      });

    return () => {
      active = false;
    };
  }, [queryKey]);

  const rangeText =
    range === "today"
      ? "Hari ini"
      : range === "7d"
        ? "7 hari"
        : range === "30d"
          ? "30 hari"
          : `Kustom (${customFrom} s/d ${customTo})`;

  const buildFullExportPayload = (): CapsterFinancialExportPayload | null => {
    if (!report) return null;
    return {
      periodLabel: rangeText,
      totalCount: report.summary.totalCount,
      totalRevenue: report.summary.totalRevenue,
      packageRevenue: report.summary.packageRevenue,
      packageSoldTotal: report.summary.packageSoldTotal,
      drinkRevenue: report.summary.drinkRevenue,
      drinkSoldTotal: report.summary.drinkSoldTotal,
      totalOwnerPackageShare: report.summary.totalOwnerPackageShare,
      totalCapsterShare: report.summary.totalCapsterShare,
      totalKasbonShare: report.summary.totalKasbonShare ?? 0,
      netCapsterShare: report.summary.netCapsterShare ?? (report.summary.totalCapsterShare - (report.summary.totalKasbonShare ?? 0)),
      totalExpenses: report.summary.totalExpenses,
      cashExpensesTotal: report.summary.cashExpensesTotal,
      qrisExpensesTotal: report.summary.qrisExpensesTotal ?? 0,
      debitExpensesTotal:
        report.summary.debitExpensesTotal ??
        report.summary.nonCashExpensesTotal - (report.summary.qrisExpensesTotal ?? 0),
      tunaiRevenue: report.paymentSplit.tunaiRevenue,
      qrisRevenue: report.paymentSplit.qrisRevenue,
      debitRevenue: report.paymentSplit.debitRevenue,
      tunaiBarberRevenue: report.paymentSplit.tunaiBarberRevenue ?? 0,
      tunaiKafeRevenue: report.paymentSplit.tunaiKafeRevenue ?? 0,
      qrisBarberRevenue: report.paymentSplit.qrisBarberRevenue ?? 0,
      qrisKafeRevenue: report.paymentSplit.qrisKafeRevenue ?? 0,
      debitBarberRevenue: report.paymentSplit.debitBarberRevenue ?? 0,
      debitKafeRevenue: report.paymentSplit.debitKafeRevenue ?? 0,
      tunaiCount: report.paymentSplit.tunaiCount,
      qrisCount: report.paymentSplit.qrisCount,
      debitCount: report.paymentSplit.debitCount,
      capsters: report.capsterStats.map((c) => ({
        id: c.id,
        name: c.name,
        sold: c.sold,
        packageRevenue: c.packageRevenue ?? c.revenue,
        ownerPct: c.ownerPct ?? 60,
        commissionPct: c.commissionPct ?? 40,
        ownerShareAmount: c.ownerShareAmount ?? 0,
        commissionAmount: c.commissionAmount ?? 0,
        kasbonAmount: c.kasbonAmount ?? 0,
        netCommissionAmount: c.netCommissionAmount ?? ((c.commissionAmount ?? 0) - (c.kasbonAmount ?? 0)),
        packageBreakdown: c.packageBreakdown,
      })),
      packageStats: report.packageStats.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        sold: p.sold,
        revenue: p.revenue,
      })),
      drinkStats: report.drinkStats.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        price: d.price,
        sold: d.sold,
        revenue: d.revenue,
      })),
      expenses: report.expenses ?? report.recentExpenses ?? [],
      transactionLines: report.transactionLines ?? [],
      haircutHistory: report.allCapstersBreakdown?.haircutHistory ?? [],
    };
  };

  const handleExportCsv = () => {
    const payload = buildFullExportPayload();
    if (!payload) return;
    const suffix = range === "custom" ? `${customFrom}_${customTo}` : range;
    const bytes = buildTwoSheetFinancialWorkbook(payload);
    triggerXlsxDownload(bytes, `laporan-2sheet-barber-kafe-saldo-${suffix}.xlsx`);
  };

  const subtitleSuffix =
    view === "overall"
      ? "Unit Barber & Unit Kafe terpisah"
      : view === "payment"
        ? "Pendapatan Barber & Kafe per metode pembayaran"
        : view === "package"
          ? "Unit Barber (Paket cukur)"
          : view === "drink"
            ? "Unit Kafe (Minuman)"
            : "Per capster (Owner 60% : Capster 40%)";

  const maxHourly = Math.max(1, ...(report?.hourly.map((h) => h.amount) ?? [1]));
  const maxPkgSold = Math.max(1, ...(report?.packageStats.map((p) => p.sold) ?? [1]));
  const topDrinks = [...(report?.drinkStats ?? [])].sort((a, b) => b.sold - a.sold).slice(0, 3);
  const maxDrinkSold = Math.max(1, ...(topDrinks.map((d) => d.sold) ?? [1]));

  return (
    <main className="flex-1 bg-[#FAFAFA] p-4 sm:p-5 lg:p-6 overflow-y-auto min-w-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">Laporan penjualan</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            {formatDateHeader(new Date())} · {subtitleSuffix}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs font-medium text-[#0F172A]">
            <Calendar className="w-3.5 h-3.5 text-[#475569]" />
            <span>{rangeText}</span>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className="bg-[#15803D] hover:bg-[#166534] text-white rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor 2 Sheet (.xlsx)
          </button>
        </div>
      </div>

      {/* Range Pills + View Segmented Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "today", label: "Hari ini" },
              { id: "7d", label: "7 hari" },
              { id: "30d", label: "30 hari" },
              { id: "custom", label: "Kustom" },
            ] as const
          ).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                range === r.id
                  ? "bg-[#0F172A] text-white"
                  : "bg-white border border-[#E5E7EB] text-[#475569] hover:bg-[#F8FAFC]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* 5 Segmented Tabs */}
        <div className="bg-[#F4F4F5] p-1 rounded-xl flex items-center gap-1 overflow-x-auto">
          {(
            [
              { id: "overall", label: "Overall" },
              { id: "payment", label: "Metode bayar" },
              { id: "package", label: "Unit Barber" },
              { id: "drink", label: "Unit Kafe" },
              { id: "capster", label: "Per capster" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer ${
                view === tab.id
                  ? "bg-white text-[#0F172A] shadow-xs"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {range === "custom" && (
        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5"
          />
          <span className="text-[#64748B]">s/d</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5"
          />
        </div>
      )}

      {loading || !report ? (
        <div className="py-16 text-center text-xs text-[#64748B]">Memuat data laporan...</div>
      ) : (
        <>
          {/* ==================== OVERALL VIEW ==================== */}
          {view === "overall" && (
            <div className="space-y-4 mt-5">
              {/* Row 1: 4 Revenue KPI Cards (Barber vs Kafe Explicitly Separated) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                  <p className="text-[11px] font-medium text-[#64748B]">
                    Total Pendapatan (Barber + Kafe)
                  </p>
                  <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                    {formatRupiah(report.summary.totalRevenue)}
                  </p>
                  <p
                    className={`text-[11px] font-medium mt-1 ${
                      report.summary.revenueDeltaPct > 0 ? "text-[#15803D]" : "text-[#64748B]"
                    }`}
                  >
                    {report.summary.revenueDeltaPct > 0 ? "+" : ""}
                    {report.summary.revenueDeltaPct}% dari periode sebelumnya
                  </p>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-[#0F172A]">
                      Pendapatan Unit Barber
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569] font-semibold">
                      60% : 40%
                    </span>
                  </div>
                  <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                    {formatRupiah(report.summary.packageRevenue)}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    {report.summary.packageSoldTotal} cukur paket · {report.summary.totalCount} trx
                  </p>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-[#0F172A]">
                      Pendapatan Unit Kafe
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] font-semibold">
                      100% Toko
                    </span>
                  </div>
                  <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                    {formatRupiah(report.summary.drinkRevenue)}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    {report.summary.drinkSoldTotal} item minuman / kafe terjual
                  </p>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                  <p className="text-[11px] font-medium text-[#64748B]">
                    Hak Kotor Owner (Barber + Kafe)
                  </p>
                  <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                    {formatRupiah(report.summary.totalOwnerGross)}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Barber 60% ({formatRupiah(report.summary.totalOwnerPackageShare)}) + Kafe (
                    {formatRupiah(report.summary.drinkRevenue)})
                  </p>
                </div>
              </div>

              {/* Row 2: Bagi Hasil 60% Owner : 40% Capster + Pengeluaran + Bersih Owner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                  <p className="text-[11px] font-medium text-[#64748B]">
                    Hak Owner Unit Barber (60%)
                  </p>
                  <p className="text-lg font-bold text-[#0F172A] mt-1 tabular-nums">
                    {formatRupiah(report.summary.totalOwnerPackageShare)}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1">Porsi toko dari paket cukur</p>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                  <p className="text-[11px] font-medium text-[#64748B]">
                    Komisi / Gaji Capster Barber (40%)
                  </p>
                  <p className="text-lg font-bold text-[#15803D] mt-1 tabular-nums">
                    {formatRupiah(report.summary.totalCapsterShare)}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1">Bagi hasil seluruh capster</p>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium text-[#64748B]">Total Pengeluaran</p>
                    <Link
                      href="/pengeluaran"
                      className="text-[10px] font-semibold text-[#0F172A] hover:underline"
                    >
                      Kelola →
                    </Link>
                  </div>
                  <p className="text-lg font-bold text-[#DC2626] mt-1 tabular-nums">
                    -{formatRupiah(report.summary.totalExpenses)}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Tunai {formatRupiah(report.summary.cashExpensesTotal)} · Non-Tunai{" "}
                    {formatRupiah(report.summary.nonCashExpensesTotal)}
                  </p>
                </div>

                <div className="bg-[#0F172A] text-white rounded-2xl p-4">
                  <p className="text-[11px] font-medium text-[#94A3B8]">
                    Sisa Saldo Bersih Owner
                  </p>
                  <p className="text-lg font-bold mt-1 tabular-nums">
                    {formatRupiah(report.summary.netOwnerIncome)}
                  </p>
                  <p className="text-[10px] text-[#CBD5E1] mt-1">
                    (60% Barber + 100% Kafe) − Pengeluaran
                  </p>
                </div>
              </div>

              {/* Hourly Chart + Top Packages & Drinks */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 bg-white border border-[#E5E7EB] rounded-2xl p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-[#0F172A]">
                      Penjualan per jam (ribu Rp)
                    </h2>
                    <span className="text-[11px] text-[#64748B]">
                      Puncak {report.peakHour.hour} · {formatRupiah(report.peakHour.amount)}
                    </span>
                  </div>

                  <div className="mt-8 h-48 flex items-end justify-between gap-2 pt-4">
                    {report.hourly.map((h) => {
                      const heightPct = Math.max(8, Math.round((h.amount / maxHourly) * 100));
                      const isPeak = h.hour === report.peakHour.hour && h.amount > 0;
                      return (
                        <div
                          key={h.hour}
                          className="flex-1 flex flex-col items-center justify-end h-full gap-1.5"
                        >
                          <span className="text-[10px] font-medium text-[#64748B] tabular-nums">
                            {h.amountThousands > 0 ? h.amountThousands : ""}
                          </span>
                          <div
                            className={`w-full max-w-[26px] rounded-t-lg transition-all ${
                              isPeak ? "bg-[#0F172A]" : "bg-[#D4D4D8]"
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                          <span className="text-[10px] text-[#94A3B8]">{h.hour}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-5">
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[#0F172A]">Paket terlaris</h3>
                    {report.packageStats.map((pkg) => (
                      <div key={pkg.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[#0F172A]">{pkg.name}</span>
                          <span className="text-[11px] text-[#64748B] tabular-nums">
                            {pkg.sold} terjual
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                          <div
                            className="h-full bg-[#0F172A] rounded-full"
                            style={{
                              width: `${Math.max(4, Math.round((pkg.sold / maxPkgSold) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[#F1F5F9] pt-4 space-y-3">
                    <h3 className="text-xs font-bold text-[#0F172A]">Minuman terlaris</h3>
                    {topDrinks.map((d) => (
                      <div key={d.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[#0F172A]">{d.name}</span>
                          <span className="text-[11px] text-[#64748B] tabular-nums">
                            {d.sold} terjual
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                          <div
                            className="h-full bg-[#0F172A] rounded-full"
                            style={{
                              width: `${Math.max(4, Math.round((d.sold / maxDrinkSold) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Metode Pembayaran Summary Card with Rupiah Amounts */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#0F172A]">
                    Pendapatan per metode pembayaran
                  </h3>
                  <button
                    type="button"
                    onClick={() => setView("payment")}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F172A] hover:underline cursor-pointer"
                  >
                    Detail laporan metode bayar
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#F1F5F9] overflow-hidden flex">
                  <div
                    className="bg-[#0F172A] h-full"
                    style={{ width: `${report.paymentSplit.tunaiPct}%` }}
                  />
                  <div
                    className="bg-[#15803D] h-full"
                    style={{ width: `${report.paymentSplit.qrisPct}%` }}
                  />
                  {report.paymentSplit.debitPct > 0 && (
                    <div
                      className="bg-[#475569] h-full"
                      style={{ width: `${report.paymentSplit.debitPct}%` }}
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-5 text-xs text-[#475569]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0F172A]" />
                    Tunai:{" "}
                    <strong className="text-[#0F172A]">
                      {formatRupiah(report.paymentSplit.tunaiRevenue)}
                    </strong>{" "}
                    ({report.paymentSplit.tunaiCount} trx · {report.paymentSplit.tunaiPct}%)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" />
                    QRIS:{" "}
                    <strong className="text-[#0F172A]">
                      {formatRupiah(report.paymentSplit.qrisRevenue)}
                    </strong>{" "}
                    ({report.paymentSplit.qrisCount} trx · {report.paymentSplit.qrisPct}%)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#475569]" />
                    Debit / Kartu:{" "}
                    <strong className="text-[#0F172A]">
                      {formatRupiah(report.paymentSplit.debitRevenue)}
                    </strong>{" "}
                    ({report.paymentSplit.debitCount} trx · {report.paymentSplit.debitPct}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ==================== METODE BAYAR & KAS VIEW ==================== */}
          {view === "payment" && (
            <div className="space-y-4 mt-5">
              {/* 4 Payment Method KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                  <div className="flex items-center justify-between text-[#64748B]">
                    <span className="text-[11px] font-medium">Pendapatan Tunai</span>
                    <Banknote className="w-4 h-4 text-[#0F172A]" />
                  </div>
                  <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                    {formatRupiah(report.paymentSplit.tunaiRevenue)}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    {report.paymentSplit.tunaiCount} transaksi · {report.paymentSplit.tunaiPct}%
                  </p>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                  <div className="flex items-center justify-between text-[#64748B]">
                    <span className="text-[11px] font-medium">Pendapatan QRIS</span>
                    <QrCode className="w-4 h-4 text-[#15803D]" />
                  </div>
                  <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                    {formatRupiah(report.paymentSplit.qrisRevenue)}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    {report.paymentSplit.qrisCount} transaksi · {report.paymentSplit.qrisPct}%
                  </p>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                  <div className="flex items-center justify-between text-[#64748B]">
                    <span className="text-[11px] font-medium">Pendapatan Debit / Kartu</span>
                    <CreditCard className="w-4 h-4 text-[#475569]" />
                  </div>
                  <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                    {formatRupiah(report.paymentSplit.debitRevenue)}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    {report.paymentSplit.debitCount} transaksi · {report.paymentSplit.debitPct}%
                  </p>
                </div>

                <div className="bg-[#0F172A] text-white rounded-2xl p-4">
                  <p className="text-[11px] font-medium text-[#94A3B8]">
                    Uang Tunai Bersih (Setelah Biaya)
                  </p>
                  <p className="text-xl font-bold mt-1 tabular-nums">
                    {formatRupiah(report.paymentSplit.netCashRevenue)}
                  </p>
                  <p className="text-[10px] text-[#CBD5E1] mt-1">
                    Tunai masuk − Rp{report.summary.cashExpensesTotal.toLocaleString("id-ID")} keluar
                  </p>
                </div>
              </div>

              {/* Payment Method Breakdown Table */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-x-auto">
                <div className="p-5 border-b border-[#F1F5F9]">
                  <h2 className="text-sm font-bold text-[#0F172A]">
                    Rincian Pendapatan &amp; Arus Kas per Metode Pembayaran
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {rangeText} · Membandingkan pemasukan transaksi lunas dengan pengeluaran toko
                  </p>
                </div>
                <table className="w-full min-w-[740px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] font-medium text-[#64748B]">
                      <th className="py-3 px-5">Metode Pembayaran</th>
                      <th className="py-3 px-5 text-right">Transaksi</th>
                      <th className="py-3 px-5 text-right">Masuk Barber</th>
                      <th className="py-3 px-5 text-right">Masuk Kafe</th>
                      <th className="py-3 px-5 text-right">Total Masuk</th>
                      <th className="py-3 px-5 text-right">Pengeluaran</th>
                      <th className="py-3 px-5 text-right">Saldo Bersih</th>
                      <th className="py-3 px-5">Porsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {[
                      {
                        label: "Tunai (Kas Laci)",
                        count: report.paymentSplit.tunaiCount,
                        barber: report.paymentSplit.tunaiBarberRevenue ?? 0,
                        kafe: report.paymentSplit.tunaiKafeRevenue ?? 0,
                        gross: report.paymentSplit.tunaiRevenue,
                        expense: report.summary.cashExpensesTotal,
                        net: report.paymentSplit.netCashRevenue,
                        pct: report.paymentSplit.tunaiPct,
                        color: "bg-[#0F172A]",
                      },
                      {
                        label: "QRIS (Statis Toko)",
                        count: report.paymentSplit.qrisCount,
                        barber: report.paymentSplit.qrisBarberRevenue ?? 0,
                        kafe: report.paymentSplit.qrisKafeRevenue ?? 0,
                        gross: report.paymentSplit.qrisRevenue,
                        expense: report.summary.qrisExpensesTotal ?? 0,
                        net:
                          report.paymentSplit.netQrisRevenue ??
                          report.paymentSplit.qrisRevenue - (report.summary.qrisExpensesTotal ?? 0),
                        pct: report.paymentSplit.qrisPct,
                        color: "bg-[#15803D]",
                      },
                      {
                        label: "Debit / Kartu (EDC)",
                        count: report.paymentSplit.debitCount,
                        barber: report.paymentSplit.debitBarberRevenue ?? 0,
                        kafe: report.paymentSplit.debitKafeRevenue ?? 0,
                        gross: report.paymentSplit.debitRevenue,
                        expense:
                          report.summary.debitExpensesTotal ??
                          report.summary.nonCashExpensesTotal -
                            (report.summary.qrisExpensesTotal ?? 0),
                        net:
                          report.paymentSplit.netDebitRevenue ??
                          report.paymentSplit.debitRevenue -
                            (report.summary.debitExpensesTotal ??
                              report.summary.nonCashExpensesTotal -
                                (report.summary.qrisExpensesTotal ?? 0)),
                        pct: report.paymentSplit.debitPct,
                        color: "bg-[#475569]",
                      },
                    ].map((row) => (
                      <tr key={row.label}>
                        <td className="py-3.5 px-5 font-semibold text-[#0F172A]">{row.label}</td>
                        <td className="py-3.5 px-5 text-right tabular-nums text-[#0F172A]">
                          {row.count}
                        </td>
                        <td className="py-3.5 px-5 text-right tabular-nums text-[#0F172A]">
                          {formatRupiah(row.barber)}
                        </td>
                        <td className="py-3.5 px-5 text-right tabular-nums text-[#B45309]">
                          {formatRupiah(row.kafe)}
                        </td>
                        <td className="py-3.5 px-5 text-right font-semibold tabular-nums text-[#0F172A]">
                          {formatRupiah(row.gross)}
                        </td>
                        <td className="py-3.5 px-5 text-right tabular-nums text-[#DC2626]">
                          {row.expense > 0 ? `-${formatRupiah(row.expense)}` : "Rp0"}
                        </td>
                        <td className="py-3.5 px-5 text-right font-bold tabular-nums text-[#15803D]">
                          {formatRupiah(row.net)}
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-24 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                              <div
                                className={`h-full ${row.color} rounded-full`}
                                style={{ width: `${row.pct}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-[#64748B] tabular-nums">
                              {row.pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#FAFAFA] font-bold text-[#0F172A]">
                      <td className="py-3.5 px-5">Total Sebelum Gaji Capster</td>
                      <td className="py-3.5 px-5 text-right tabular-nums">
                        {report.summary.totalCount}
                      </td>
                      <td className="py-3.5 px-5 text-right tabular-nums">
                        {formatRupiah(report.summary.packageRevenue)}
                      </td>
                      <td className="py-3.5 px-5 text-right tabular-nums text-[#B45309]">
                        {formatRupiah(report.summary.drinkRevenue)}
                      </td>
                      <td className="py-3.5 px-5 text-right tabular-nums">
                        {formatRupiah(report.summary.totalRevenue)}
                      </td>
                      <td className="py-3.5 px-5 text-right tabular-nums text-[#DC2626]">
                        -{formatRupiah(report.summary.totalExpenses)}
                      </td>
                      <td className="py-3.5 px-5 text-right tabular-nums text-[#15803D]">
                        {formatRupiah(report.summary.totalRevenue - report.summary.totalExpenses)}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="text-[11px]">100%</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Recent Expenses Snippet */}
              {report.recentExpenses && report.recentExpenses.length > 0 && (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#0F172A]">
                      Catatan Pengeluaran pada Periode Ini
                    </h3>
                    <Link
                      href="/pengeluaran"
                      className="text-xs font-semibold text-[#0F172A] hover:underline"
                    >
                      Buka menu Pengeluaran →
                    </Link>
                  </div>
                  <div className="divide-y divide-[#F1F5F9] text-xs">
                    {report.recentExpenses.map((exp) => (
                      <div key={exp.id} className="py-2 flex items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-[#0F172A]">{exp.description}</span>
                          <span className="text-[11px] text-[#64748B] ml-2">
                            ({exp.category} · {exp.paymentMethod} · {formatDateShort(exp.expenseDate)})
                          </span>
                        </div>
                        <span className="font-bold text-[#DC2626] tabular-nums">
                          -{formatRupiah(exp.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== PER PAKET VIEW ==================== */}
          {view === "package" && (
            <div className="space-y-4 mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[#64748B] mr-1">Pilih paket:</span>
                <button
                  type="button"
                  onClick={() => setSelectedPackageId("ALL")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                    selectedPackageId === "ALL"
                      ? "bg-[#0F172A] text-white"
                      : "bg-white border border-[#E5E7EB] text-[#475569]"
                  }`}
                >
                  Semua paket
                </button>
                {packages.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPackageId(p.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                      selectedPackageId === p.id
                        ? "bg-[#0F172A] text-white"
                        : "bg-white border border-[#E5E7EB] text-[#475569]"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              {selectedPackageId === "ALL" || !report.packageDetail ? (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-x-auto">
                  <div className="p-5 border-b border-[#F1F5F9]">
                    <h2 className="text-sm font-bold text-[#0F172A]">Penjualan per paket</h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {rangeText} · {packages.length} paket aktif
                    </p>
                  </div>
                  <table className="w-full min-w-[500px] text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] font-medium text-[#64748B]">
                        <th className="py-3 px-5">Paket</th>
                        <th className="py-3 px-5 text-right">Terjual</th>
                        <th className="py-3 px-5 text-right">Pendapatan</th>
                        <th className="py-3 px-5">Kontribusi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {report.packageStats.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-[#EDE0CE] text-[#3F3A32] font-bold text-[11px] flex items-center justify-center">
                                {item.name.slice(0, 1)}
                              </div>
                              <span className="font-semibold text-[#0F172A]">{item.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-right tabular-nums text-[#0F172A]">
                            {item.sold}
                          </td>
                          <td className="py-3.5 px-5 text-right font-semibold tabular-nums text-[#0F172A]">
                            {formatRupiah(item.revenue)}
                          </td>
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-28 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                                <div
                                  className="h-full bg-[#0F172A] rounded-full"
                                  style={{ width: `${item.contributionPct}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-[#64748B] tabular-nums">
                                {item.contributionPct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-[#FAFAFA] font-bold text-[#0F172A]">
                        <td className="py-3.5 px-5">Total</td>
                        <td className="py-3.5 px-5 text-right tabular-nums">
                          {report.summary.packageSoldTotal}
                        </td>
                        <td className="py-3.5 px-5 text-right tabular-nums">
                          {formatRupiah(report.summary.packageRevenue)}
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-28 h-1.5 rounded-full bg-[#0F172A]" />
                            <span className="text-[11px]">100%</span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                    <p className="text-[11px] text-[#64748B]">
                      Pendapatan {report.packageDetail.package.name}
                    </p>
                    <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                      {formatRupiah(report.packageDetail.revenue)}
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      {report.packageDetail.revenuePct}% dari total paket
                    </p>
                  </div>
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                    <p className="text-[11px] text-[#64748B]">Layanan terjual</p>
                    <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                      {report.packageDetail.sold}
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Walk-in {report.packageDetail.walkInCount} · Booking{" "}
                      {report.packageDetail.bookingCount}
                    </p>
                  </div>
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                    <p className="text-[11px] text-[#64748B]">Capster teratas</p>
                    <p className="text-xl font-bold text-[#0F172A] mt-1">
                      {report.packageDetail.topCapster?.name ?? "-"}
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      {report.packageDetail.topCapster?.sold ?? 0} layanan
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== UNIT KAFE (MINUMAN & MAKANAN) VIEW ==================== */}
          {view === "drink" && (
            <div className="space-y-4 mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[#64748B] mr-1">Pilih menu kafe:</span>
                <button
                  type="button"
                  onClick={() => setSelectedDrinkId("ALL")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                    selectedDrinkId === "ALL"
                      ? "bg-[#0F172A] text-white"
                      : "bg-white border border-[#E5E7EB] text-[#475569]"
                  }`}
                >
                  Semua menu kafe
                </button>
                {drinks.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDrinkId(d.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                      selectedDrinkId === d.id
                        ? "bg-[#0F172A] text-white"
                        : "bg-white border border-[#E5E7EB] text-[#475569]"
                    }`}
                  >
                    {d.name}
                  </button>
                ))}
              </div>

              {selectedDrinkId === "ALL" || !report.drinkDetail ? (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-x-auto">
                  <div className="p-5 border-b border-[#F1F5F9]">
                    <h2 className="text-sm font-bold text-[#0F172A]">
                      Pendapatan Unit Kafe (Minuman &amp; Makanan)
                    </h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {rangeText} · {drinks.length} produk kafe aktif (100% pendapatan toko)
                    </p>
                  </div>
                  <table className="w-full min-w-[540px] text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] font-medium text-[#64748B]">
                        <th className="py-3 px-5">Menu Kafe</th>
                        <th className="py-3 px-5">Kategori</th>
                        <th className="py-3 px-5 text-right">Terjual</th>
                        <th className="py-3 px-5 text-right">Pendapatan</th>
                        <th className="py-3 px-5">Kontribusi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {report.drinkStats.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-[#EDE0CE] text-[#3F3A32] font-bold text-[11px] flex items-center justify-center">
                                {item.name.slice(0, 1)}
                              </div>
                              <span className="font-semibold text-[#0F172A]">{item.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-[#64748B]">
                            {item.category ?? "Minuman"}
                          </td>
                          <td className="py-3.5 px-5 text-right tabular-nums text-[#0F172A]">
                            {item.sold}
                          </td>
                          <td className="py-3.5 px-5 text-right font-semibold tabular-nums text-[#0F172A]">
                            {formatRupiah(item.revenue)}
                          </td>
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-32 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                                <div
                                  className="h-full bg-[#0F172A] rounded-full"
                                  style={{ width: `${item.contributionPct}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-[#64748B] tabular-nums">
                                {item.contributionPct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-[#FAFAFA] font-bold text-[#0F172A]">
                        <td className="py-3.5 px-5" colSpan={2}>
                          Total Unit Kafe
                        </td>
                        <td className="py-3.5 px-5 text-right tabular-nums">
                          {report.summary.drinkSoldTotal}
                        </td>
                        <td className="py-3.5 px-5 text-right tabular-nums">
                          {formatRupiah(report.summary.drinkRevenue)}
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-32 h-1.5 rounded-full bg-[#0F172A]" />
                            <span className="text-[11px]">100%</span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                    <p className="text-[11px] text-[#64748B]">
                      Pendapatan {report.drinkDetail.drink.name}
                    </p>
                    <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                      {formatRupiah(report.drinkDetail.revenue)}
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      {report.drinkDetail.revenuePct}% dari total unit kafe
                    </p>
                  </div>
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                    <p className="text-[11px] text-[#64748B]">Jumlah terjual</p>
                    <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                      {report.drinkDetail.sold} item
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Walk-in {report.drinkDetail.walkInCount} · Booking{" "}
                      {report.drinkDetail.bookingCount}
                    </p>
                  </div>
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                    <p className="text-[11px] text-[#64748B]">Sisa stok kafe</p>
                    <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                      {report.drinkDetail.drink.stock} stok
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Harga satuan {formatRupiah(report.drinkDetail.drink.price)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== PER CAPSTER (60% OWNER : 40% CAPSTER) VIEW ==================== */}
          {view === "capster" && (
            <div className="space-y-4 mt-4">
              {/* Aligned 5-Pillar Financial Summary Strip (Barber vs Kafe Separated) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5">
                  <p className="text-[11px] font-medium text-[#64748B]">1. Pendapatan Unit Barber</p>
                  <p className="text-lg font-bold text-[#0F172A] mt-1 tabular-nums">
                    {formatRupiah(report.summary.packageRevenue)}
                  </p>
                  <p className="text-[10px] text-[#64748B] mt-0.5">
                    {report.summary.packageSoldTotal} cukur paket (60% : 40%)
                  </p>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5">
                  <p className="text-[11px] font-medium text-[#64748B]">2. Pendapatan Unit Kafe</p>
                  <p className="text-lg font-bold text-[#B45309] mt-1 tabular-nums">
                    {formatRupiah(report.summary.drinkRevenue)}
                  </p>
                  <p className="text-[10px] text-[#64748B] mt-0.5">
                    {report.summary.drinkSoldTotal} minuman · 100% milik toko
                  </p>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5">
                  <p className="text-[11px] font-medium text-[#64748B]">
                    3. Komisi / Gaji Capster (40%)
                  </p>
                  <p className="text-lg font-bold text-[#15803D] mt-1 tabular-nums">
                    {formatRupiah(report.summary.totalCapsterShare)}
                  </p>
                  <p className="text-[10px] text-[#64748B] mt-0.5">
                    Owner Barber 60%: {formatRupiah(report.summary.totalOwnerPackageShare)}
                  </p>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5">
                  <p className="text-[11px] font-medium text-[#64748B]">4. Total Pengeluaran</p>
                  <p className="text-lg font-bold text-[#DC2626] mt-1 tabular-nums">
                    -{formatRupiah(report.summary.totalExpenses)}
                  </p>
                  <p className="text-[10px] text-[#64748B] mt-0.5">
                    Saldo Kas Sblm Gaji:{" "}
                    {formatRupiah(
                      report.summary.cashBeforeCapsterPayout ??
                        report.summary.totalRevenue - report.summary.totalExpenses
                    )}
                  </p>
                </div>

                <div className="bg-[#0F172A] text-white rounded-2xl p-3.5">
                  <p className="text-[11px] font-medium text-[#94A3B8]">
                    5. Sisa Saldo Bersih Owner
                  </p>
                  <p className="text-lg font-bold mt-1 tabular-nums">
                    {formatRupiah(report.summary.netOwnerIncome)}
                  </p>
                  <p className="text-[10px] text-[#4ADE80] mt-0.5">
                    (60% Barber + 100% Kafe) − Biaya
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[#64748B] mr-1">Pilih capster:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCapsterId("ALL")}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                      selectedCapsterId === "ALL"
                        ? "bg-[#0F172A] text-white"
                        : "bg-white border border-[#E5E7EB] text-[#475569]"
                    }`}
                  >
                    Semua capster
                  </button>
                  {capsters.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCapsterId(c.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                        selectedCapsterId === c.id
                          ? "bg-[#0F172A] text-white"
                          : "bg-white border border-[#E5E7EB] text-[#475569]"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#E5E7EB] hover:border-[#0F172A] text-xs font-semibold text-[#0F172A] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#15803D]" />
                  Ekspor 2 Sheet: Ringkasan &amp; Detail (.xlsx)
                </button>
              </div>

              {selectedCapsterId === "ALL" || !report.capsterDetail ? (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-x-auto">
                  <div className="p-5 border-b border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-[#0F172A]">
                        Bagi Hasil per Capster (Owner 60% : Capster 40%)
                      </h2>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {rangeText} · Klik baris capster atau tombol rincian untuk melihat list paket &amp; komisi tersimpan per cukur
                      </p>
                    </div>
                    {report.allCapstersBreakdown && (
                      <button
                        type="button"
                            onClick={() =>
                              setCommissionModal({
                                title: "Semua Capster",
                                subtitle: `${rangeText} · Rekap seluruh capster (Owner 60% : Capster 40%)`,
                                ownerPct: 60,
                                commissionPct: 40,
                                showCapsterColumn: true,
                                kasbonTotal:
                                  report.allCapstersBreakdown?.totalKasbon ??
                                  report.summary.totalKasbonShare ??
                                  0,
                                packageBreakdown: report.allCapstersBreakdown!.packageBreakdown,
                                haircutHistory: report.allCapstersBreakdown!.haircutHistory,
                                fullExportPayload: buildFullExportPayload() ?? undefined,
                              })
                            }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold cursor-pointer shrink-0"
                      >
                        <Scissors className="w-3.5 h-3.5" />
                        List Paket &amp; Komisi (Semua Capster)
                      </button>
                    )}
                  </div>
                  <table className="w-full min-w-[740px] text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] font-medium text-[#64748B]">
                        <th className="py-3 px-5">Capster</th>
                        <th className="py-3 px-5 text-right">Layanan</th>
                        <th className="py-3 px-5 text-right">Omzet Paket</th>
                        <th className="py-3 px-5 text-right">Bagian Owner (60%)</th>
                        <th className="py-3 px-5 text-right">Bagian Capster (40%)</th>
                        <th className="py-3 px-5 text-right">Kasbon</th>
                        <th className="py-3 px-5 text-right">Bersih Capster</th>
                        <th className="py-3 px-5">Porsi</th>
                        <th className="py-3 px-5 text-right">Rincian Paket</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {report.capsterStats.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() =>
                            setCommissionModal({
                              title: `Capster ${item.name}`,
                              subtitle: `${rangeText} · Skema Owner ${item.ownerPct ?? 60}% : Capster ${item.commissionPct ?? 40}%`,
                              ownerPct: item.ownerPct ?? 60,
                              commissionPct: item.commissionPct ?? 40,
                              showCapsterColumn: false,
                              kasbonTotal: item.kasbonAmount ?? 0,
                              packageBreakdown: item.packageBreakdown ?? [],
                              haircutHistory: item.haircutHistory ?? [],
                            })
                          }
                          className="hover:bg-[#FAFAFA] cursor-pointer transition"
                        >
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-[#EDE0CE] text-[#3F3A32] font-bold text-[11px] flex items-center justify-center">
                                {item.name.slice(0, 1)}
                              </div>
                              <div>
                                <span className="font-semibold text-[#0F172A]">{item.name}</span>
                                <span className="text-[10px] text-[#94A3B8] ml-1.5">
                                  ({item.ownerPct ?? 60}% : {item.commissionPct ?? 40}%)
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-right tabular-nums text-[#0F172A]">
                            {item.sold}
                          </td>
                          <td className="py-3.5 px-5 text-right font-semibold tabular-nums text-[#0F172A]">
                            {formatRupiah(item.packageRevenue ?? item.revenue)}
                          </td>
                          <td className="py-3.5 px-5 text-right font-semibold tabular-nums text-[#0F172A]">
                            {formatRupiah(item.ownerShareAmount ?? 0)}
                          </td>
                          <td className="py-3.5 px-5 text-right font-semibold tabular-nums text-[#15803D]">
                            {formatRupiah(item.commissionAmount ?? 0)}
                          </td>
                          <td className="py-3.5 px-5 text-right font-medium tabular-nums text-[#DC2626]">
                            {item.kasbonAmount && item.kasbonAmount > 0
                              ? `-${formatRupiah(item.kasbonAmount)}`
                              : "Rp 0"}
                          </td>
                          <td className="py-3.5 px-5 text-right font-bold tabular-nums text-[#15803D]">
                            {formatRupiah(
                              item.netCommissionAmount ??
                                ((item.commissionAmount ?? 0) - (item.kasbonAmount ?? 0))
                            )}
                          </td>
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-20 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                                <div
                                  className="h-full bg-[#0F172A] rounded-full"
                                  style={{ width: `${item.contributionPct}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-[#64748B] tabular-nums">
                                {item.contributionPct}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCommissionModal({
                                  title: `Capster ${item.name}`,
                                  subtitle: `${rangeText} · Skema Owner ${item.ownerPct ?? 60}% : Capster ${item.commissionPct ?? 40}%`,
                                  ownerPct: item.ownerPct ?? 60,
                                  commissionPct: item.commissionPct ?? 40,
                                  showCapsterColumn: false,
                                  kasbonTotal: item.kasbonAmount ?? 0,
                                  packageBreakdown: item.packageBreakdown ?? [],
                                  haircutHistory: item.haircutHistory ?? [],
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-white hover:border-[#0F172A] text-[11px] font-semibold text-[#0F172A] cursor-pointer"
                            >
                              Lihat Paket
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-[#FAFAFA] font-bold text-[#0F172A]">
                        <td className="py-3.5 px-5">Total</td>
                        <td className="py-3.5 px-5 text-right tabular-nums">
                          {report.capsterStats.reduce((s, c) => s + c.sold, 0)}
                        </td>
                        <td className="py-3.5 px-5 text-right tabular-nums">
                          {formatRupiah(
                            report.capsterStats.reduce(
                              (s, c) => s + (c.packageRevenue ?? c.revenue),
                              0
                            )
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right tabular-nums text-[#0F172A]">
                          {formatRupiah(
                            report.capsterStats.reduce(
                              (s, c) => s + (c.ownerShareAmount ?? 0),
                              0
                            )
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right tabular-nums text-[#15803D]">
                          {formatRupiah(
                            report.capsterStats.reduce(
                              (s, c) => s + (c.commissionAmount ?? 0),
                              0
                            )
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right tabular-nums text-[#DC2626]">
                          -{formatRupiah(
                            report.capsterStats.reduce(
                              (s, c) => s + (c.kasbonAmount ?? 0),
                              0
                            )
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right tabular-nums text-[#15803D]">
                          {formatRupiah(
                            report.capsterStats.reduce(
                              (s, c) =>
                                s +
                                (c.netCommissionAmount ??
                                  ((c.commissionAmount ?? 0) - (c.kasbonAmount ?? 0))),
                              0
                            )
                          )}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="text-[11px]">100%</span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          {report.allCapstersBreakdown && (
                            <button
                              type="button"
                              onClick={() =>
                                setCommissionModal({
                                  title: "Semua Capster",
                                  subtitle: `${rangeText} · Rekap seluruh capster (Owner 60% : Capster 40%)`,
                                  ownerPct: 60,
                                  commissionPct: 40,
                                  showCapsterColumn: true,
                                  kasbonTotal:
                                    report.allCapstersBreakdown?.totalKasbon ??
                                    report.summary.totalKasbonShare ??
                                    0,
                                  packageBreakdown: report.allCapstersBreakdown!.packageBreakdown,
                                  haircutHistory: report.allCapstersBreakdown!.haircutHistory,
                                  fullExportPayload: buildFullExportPayload() ?? undefined,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0F172A] text-white text-[11px] font-semibold cursor-pointer"
                            >
                              Semua Paket
                            </button>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                      <p className="text-[11px] text-[#64748B]">
                        Omzet Paket {report.capsterDetail.capster.name}
                      </p>
                      <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                        {formatRupiah(
                          report.capsterDetail.packageRevenue ?? report.capsterDetail.revenue
                        )}
                      </p>
                      <p className="text-[11px] text-[#64748B] mt-1">
                        {report.capsterDetail.sold} layanan paket
                      </p>
                    </div>
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                      <p className="text-[11px] text-[#64748B]">
                        Bagian Owner ({report.capsterDetail.ownerPct ?? 60}%)
                      </p>
                      <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                        {formatRupiah(report.capsterDetail.ownerShareAmount ?? 0)}
                      </p>
                      <p className="text-[11px] text-[#64748B] mt-1">Porsi pemilik barbershop</p>
                    </div>
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                      <p className="text-[11px] text-[#64748B]">
                        Bagian Capster ({report.capsterDetail.commissionPct ?? 40}%)
                      </p>
                      <p className="text-xl font-bold text-[#15803D] mt-1 tabular-nums">
                        {formatRupiah(report.capsterDetail.commissionAmount ?? 0)}
                      </p>
                      <p className="text-[11px] text-[#64748B] mt-1">
                        {(report.capsterDetail.kasbonAmount ?? 0) > 0
                          ? `Kasbon: -${formatRupiah(report.capsterDetail.kasbonAmount ?? 0)} · Bersih: ${formatRupiah(report.capsterDetail.netCommissionAmount ?? ((report.capsterDetail.commissionAmount ?? 0) - (report.capsterDetail.kasbonAmount ?? 0)))}`
                          : "Komisi bersih capster"}
                      </p>
                    </div>
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                      <p className="text-[11px] text-[#64748B]">Paket terbanyak</p>
                      <p className="text-xl font-bold text-[#0F172A] mt-1">
                        {report.capsterDetail.topPackage?.name ?? "-"}
                      </p>
                      <p className="text-[11px] text-[#64748B] mt-1">
                        Walk-in {report.capsterDetail.walkInCount} · Booking{" "}
                        {report.capsterDetail.bookingCount}
                      </p>
                    </div>
                  </div>

                  {/* Per-package breakdown card + Popup trigger for selected capster */}
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-x-auto">
                    <div className="p-5 border-b border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-[#0F172A]">
                          Rincian Paket &amp; Komisi — {report.capsterDetail.capster.name}
                        </h3>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          {rangeText} · Komisi tersimpan langsung per transaksi cukur paket
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCommissionModal({
                            title: `Capster ${report.capsterDetail!.capster.name}`,
                            subtitle: `${rangeText} · Skema Owner ${report.capsterDetail!.ownerPct ?? 60}% : Capster ${report.capsterDetail!.commissionPct ?? 40}%`,
                            ownerPct: report.capsterDetail!.ownerPct ?? 60,
                            commissionPct: report.capsterDetail!.commissionPct ?? 40,
                            showCapsterColumn: false,
                            kasbonTotal: report.capsterDetail!.kasbonAmount ?? 0,
                            packageBreakdown: report.capsterDetail!.packageBreakdown ?? [],
                            haircutHistory: report.capsterDetail!.haircutHistory ?? [],
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold cursor-pointer"
                      >
                        <Scissors className="w-3.5 h-3.5" />
                        Popup List Paket &amp; Riwayat Per Cukur
                      </button>
                    </div>
                    <table className="w-full min-w-[540px] text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] font-medium text-[#64748B]">
                          <th className="py-3 px-5">Paket</th>
                          <th className="py-3 px-5 text-right">Jumlah Cukur</th>
                          <th className="py-3 px-5 text-right">Omzet Paket</th>
                          <th className="py-3 px-5 text-right">
                            Owner ({report.capsterDetail.ownerPct ?? 60}%)
                          </th>
                          <th className="py-3 px-5 text-right">
                            Capster ({report.capsterDetail.commissionPct ?? 40}%)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {report.capsterDetail.byPackage.map((pkg) => (
                          <tr key={pkg.id}>
                            <td className="py-3.5 px-5 font-semibold text-[#0F172A]">
                              Paket {pkg.name}
                            </td>
                            <td className="py-3.5 px-5 text-right tabular-nums text-[#0F172A]">
                              {pkg.sold}×
                            </td>
                            <td className="py-3.5 px-5 text-right font-semibold tabular-nums text-[#0F172A]">
                              {formatRupiah(pkg.revenue)}
                            </td>
                            <td className="py-3.5 px-5 text-right font-semibold tabular-nums text-[#0F172A]">
                              {formatRupiah(pkg.ownerShareAmount ?? 0)}
                            </td>
                            <td className="py-3.5 px-5 text-right font-bold tabular-nums text-[#15803D]">
                              {formatRupiah(pkg.commissionAmount ?? 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {commissionModal && (
        <CapsterCommissionModal
          title={commissionModal.title}
          subtitle={commissionModal.subtitle}
          ownerPct={commissionModal.ownerPct}
          commissionPct={commissionModal.commissionPct}
          showCapsterColumn={commissionModal.showCapsterColumn}
          kasbonTotal={commissionModal.kasbonTotal}
          packageBreakdown={commissionModal.packageBreakdown}
          haircutHistory={commissionModal.haircutHistory}
          fullExportPayload={commissionModal.fullExportPayload}
          onClose={() => setCommissionModal(null)}
        />
      )}
    </main>
  );
}
