"use client";

import React, { useEffect, useState } from "react";
import { Calendar, Download } from "lucide-react";
import { formatDateHeader, formatRupiah } from "@/lib/format";

interface ReportStatItem {
  id: string;
  name: string;
  sold: number;
  stock?: number;
  revenue: number;
  contributionPct: number;
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
  };
  hourly: Array<{ hour: string; amount: number; amountThousands: number }>;
  peakHour: { hour: string; amount: number; amountThousands: number };
  packageStats: ReportStatItem[];
  drinkStats: ReportStatItem[];
  capsterStats: ReportStatItem[];
  paymentSplit: {
    tunaiCount: number;
    qrisCount: number;
    debitCount: number;
    tunaiPct: number;
    qrisPct: number;
    debitPct: number;
  };
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
    revenuePct: number;
    sold: number;
    totalSoldAll: number;
    walkInCount: number;
    bookingCount: number;
    walkInPct: number;
    bookingPct: number;
    topPackage: ReportStatItem | null;
    byPackage: ReportStatItem[];
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
  const [view, setView] = useState<"overall" | "package" | "drink" | "capster">("overall");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("ALL");
  const [selectedDrinkId, setSelectedDrinkId] = useState<string>("ALL");
  const [selectedCapsterId, setSelectedCapsterId] = useState<string>("ALL");
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

  const handleExportCsv = () => {
    if (!report) return;
    const rows: string[][] = [["Kategori", "Nama", "Terjual", "Pendapatan", "Kontribusi"]];
    if (view === "package") {
      report.packageStats.forEach((p) =>
        rows.push(["Paket", p.name, String(p.sold), String(p.revenue), `${p.contributionPct}%`])
      );
    } else if (view === "drink") {
      report.drinkStats.forEach((d) =>
        rows.push(["Minuman", d.name, String(d.sold), String(d.revenue), `${d.contributionPct}%`])
      );
    } else if (view === "capster") {
      report.capsterStats.forEach((c) =>
        rows.push(["Capster", c.name, String(c.sold), String(c.revenue), `${c.contributionPct}%`])
      );
    } else {
      report.packageStats.forEach((p) =>
        rows.push(["Paket", p.name, String(p.sold), String(p.revenue), `${p.contributionPct}%`])
      );
      report.drinkStats.forEach((d) =>
        rows.push(["Minuman", d.name, String(d.sold), String(d.revenue), `${d.contributionPct}%`])
      );
      report.capsterStats.forEach((c) =>
        rows.push(["Capster", c.name, String(c.sold), String(c.revenue), `${c.contributionPct}%`])
      );
    }

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-barberbous-${view}-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rangeText =
    range === "today"
      ? "Hari ini"
      : range === "7d"
        ? "7 hari"
        : range === "30d"
          ? "30 hari"
          : "Kustom";

  const subtitleSuffix =
    view === "overall"
      ? "Semua kasir"
      : view === "package"
        ? "Per paket"
        : view === "drink"
          ? "Per minuman"
          : "Per capster";

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
            className="bg-white border border-[#E5E7EB] hover:bg-[#F8FAFC] rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs font-semibold text-[#0F172A] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor
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

        {/* 4 Segmented Tabs: Overall | Per paket | Per minuman | Per capster */}
        <div className="bg-[#F4F4F5] p-1 rounded-xl flex items-center gap-1 overflow-x-auto">
          {(
            [
              { id: "overall", label: "Overall" },
              { id: "package", label: "Per paket" },
              { id: "drink", label: "Per minuman" },
              { id: "capster", label: "Per capster" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer ${
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
              {/* 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                  <p className="text-[11px] font-medium text-[#64748B]">Total penjualan</p>
                  <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                    {formatRupiah(report.summary.totalRevenue)}
                  </p>
                  <p
                    className={`text-[11px] font-medium mt-1 ${
                      report.summary.revenueDeltaPct >= 0 ? "text-[#15803D]" : "text-[#64748B]"
                    }`}
                  >
                    {report.summary.revenueDeltaPct >= 0 ? "+" : ""}
                    {report.summary.revenueDeltaPct}% dari kemarin
                  </p>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                  <p className="text-[11px] font-medium text-[#64748B]">Transaksi</p>
                  <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                    {report.summary.totalCount}
                  </p>
                  <p
                    className={`text-[11px] font-medium mt-1 ${
                      report.summary.countDelta >= 0 ? "text-[#15803D]" : "text-[#64748B]"
                    }`}
                  >
                    {report.summary.countDelta >= 0 ? "+" : ""}
                    {report.summary.countDelta} dari kemarin
                  </p>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                  <p className="text-[11px] font-medium text-[#64748B]">Penjualan paket</p>
                  <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                    {formatRupiah(report.summary.packageRevenue)}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    {report.summary.packageSoldTotal} layanan
                  </p>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                  <p className="text-[11px] font-medium text-[#64748B]">Penjualan minuman</p>
                  <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                    {formatRupiah(report.summary.drinkRevenue)}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    {report.summary.drinkSoldTotal} botol terjual
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

              {/* Metode Pembayaran Split */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-bold text-[#0F172A]">Metode pembayaran</h3>
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
                      className="bg-[#64748B] h-full"
                      style={{ width: `${report.paymentSplit.debitPct}%` }}
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#475569]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0F172A]" />
                    Tunai · {report.paymentSplit.tunaiPct}%
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#15803D]" />
                    QRIS · {report.paymentSplit.qrisPct}%
                  </span>
                  {report.paymentSplit.debitCount > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#64748B]" />
                      Debit · {report.paymentSplit.debitPct}%
                    </span>
                  )}
                </div>
              </div>
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
                <div className="space-y-4">
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
                </div>
              )}
            </div>
          )}

          {/* ==================== PER MINUMAN VIEW ==================== */}
          {view === "drink" && (
            <div className="space-y-4 mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[#64748B] mr-1">Pilih minuman:</span>
                <button
                  type="button"
                  onClick={() => setSelectedDrinkId("ALL")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                    selectedDrinkId === "ALL"
                      ? "bg-[#0F172A] text-white"
                      : "bg-white border border-[#E5E7EB] text-[#475569]"
                  }`}
                >
                  Semua minuman
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
                    <h2 className="text-sm font-bold text-[#0F172A]">Penjualan per minuman</h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {rangeText} · {drinks.length} minuman di kulkas
                    </p>
                  </div>
                  <table className="w-full min-w-[520px] text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] font-medium text-[#64748B]">
                        <th className="py-3 px-5">Minuman</th>
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
                        <td className="py-3.5 px-5">Total</td>
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
                      {report.drinkDetail.revenuePct}% dari total minuman
                    </p>
                  </div>
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                    <p className="text-[11px] text-[#64748B]">Botol terjual</p>
                    <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                      {report.drinkDetail.sold} botol
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Walk-in {report.drinkDetail.walkInCount} · Booking{" "}
                      {report.drinkDetail.bookingCount}
                    </p>
                  </div>
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                    <p className="text-[11px] text-[#64748B]">Sisa stok kulkas</p>
                    <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                      {report.drinkDetail.drink.stock} botol
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Harga satuan {formatRupiah(report.drinkDetail.drink.price)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== PER CAPSTER VIEW ==================== */}
          {view === "capster" && (
            <div className="space-y-4 mt-4">
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

              {selectedCapsterId === "ALL" || !report.capsterDetail ? (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-x-auto">
                  <div className="p-5 border-b border-[#F1F5F9]">
                    <h2 className="text-sm font-bold text-[#0F172A]">Penjualan per capster</h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {rangeText} · {capsters.length} capster
                    </p>
                  </div>
                  <table className="w-full min-w-[500px] text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] font-medium text-[#64748B]">
                        <th className="py-3 px-5">Capster</th>
                        <th className="py-3 px-5 text-right">Layanan</th>
                        <th className="py-3 px-5 text-right">Pendapatan</th>
                        <th className="py-3 px-5">Kontribusi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {report.capsterStats.map((item) => (
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
                          {report.capsterStats.reduce((s, c) => s + c.sold, 0)}
                        </td>
                        <td className="py-3.5 px-5 text-right tabular-nums">
                          {formatRupiah(
                            report.capsterStats.reduce((s, c) => s + c.revenue, 0)
                          )}
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
                      Pendapatan {report.capsterDetail.capster.name}
                    </p>
                    <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                      {formatRupiah(report.capsterDetail.revenue)}
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      {report.capsterDetail.revenuePct}% dari total toko
                    </p>
                  </div>
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                    <p className="text-[11px] text-[#64748B]">Layanan selesai</p>
                    <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
                      {report.capsterDetail.sold}
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Walk-in {report.capsterDetail.walkInCount} · Booking{" "}
                      {report.capsterDetail.bookingCount}
                    </p>
                  </div>
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                    <p className="text-[11px] text-[#64748B]">Paket terbanyak</p>
                    <p className="text-xl font-bold text-[#0F172A] mt-1">
                      {report.capsterDetail.topPackage?.name ?? "-"}
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      {report.capsterDetail.topPackage?.sold ?? 0} layanan
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
