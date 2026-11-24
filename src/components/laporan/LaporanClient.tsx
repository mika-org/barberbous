"use client";

import React, { useEffect, useState } from "react";
import { Calendar, Download } from "lucide-react";
import { formatDateHeader, formatRupiah } from "@/lib/format";

interface ReportPackageItem {
  id: string;
  name: string;
  sold: number;
  revenue: number;
  contributionPct: number;
}

interface ReportCapsterItem {
  id: string;
  name: string;
  sold: number;
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
  };
  hourly: Array<{ hour: string; amount: number; amountThousands: number }>;
  peakHour: { hour: string; amount: number; amountThousands: number };
  packageStats: ReportPackageItem[];
  capsterStats: ReportCapsterItem[];
  paymentSplit: {
    tunaiCount: number;
    qrisCount: number;
    tunaiPct: number;
    qrisPct: number;
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
    topCapster: ReportCapsterItem | null;
    byCapster: ReportCapsterItem[];
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
    topPackage: ReportPackageItem | null;
    byPackage: ReportPackageItem[];
  } | null;
}

export function LaporanClient({
  packages,
  capsters,
}: {
  packages: Array<{ id: string; name: string }>;
  capsters: Array<{ id: string; name: string }>;
}) {
  const [range, setRange] = useState<"today" | "7d" | "30d" | "custom">("today");
  const [customFrom, setCustomFrom] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [customTo, setCustomTo] = useState(new Date().toISOString().slice(0, 10));
  const [view, setView] = useState<"overall" | "package" | "capster">("overall");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("ALL");
  const [selectedCapsterId, setSelectedCapsterId] = useState<string>("ALL");
  const [reportState, setReportState] = useState<{
    key: string;
    data: ReportData | null;
  }>({ key: "", data: null });

  const queryParams = new URLSearchParams({
    range,
    packageId: selectedPackageId,
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
      const list =
        selectedPackageId !== "ALL" && report.packageDetail
          ? report.packageDetail.byCapster
          : report.packageStats;
      list.forEach((item) =>
        rows.push([
          selectedPackageId !== "ALL" ? "Capster" : "Paket",
          item.name,
          String(item.sold),
          String(item.revenue),
          `${item.contributionPct}%`,
        ])
      );
    } else if (view === "capster") {
      const list =
        selectedCapsterId !== "ALL" && report.capsterDetail
          ? report.capsterDetail.byPackage
          : report.capsterStats;
      list.forEach((item) =>
        rows.push([
          selectedCapsterId !== "ALL" ? "Paket" : "Capster",
          item.name,
          String(item.sold),
          String(item.revenue),
          `${item.contributionPct}%`,
        ])
      );
    } else {
      report.packageStats.forEach((p) =>
        rows.push(["Paket", p.name, String(p.sold), String(p.revenue), `${p.contributionPct}%`])
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
      ? selectedPackageId === "ALL"
        ? "Per paket"
        : `Per paket · ${report?.packageDetail?.package.name ?? ""}`
      : selectedCapsterId === "ALL"
      ? "Per capster"
      : `Per capster · ${report?.capsterDetail?.capster.name ?? ""}`;

  const maxHourly = Math.max(
    1,
    ...(report?.hourly.map((h) => h.amount) ?? [1])
  );

  const maxPkgSold = Math.max(
    1,
    ...(report?.packageStats.map((p) => p.sold) ?? [1])
  );
  const maxCapSold = Math.max(
    1,
    ...(report?.capsterStats.map((c) => c.sold) ?? [1])
  );

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

          {range === "custom" && (
            <div className="flex items-center gap-1.5 ml-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-xs"
              />
              <span className="text-xs text-[#64748B]">–</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-xs"
              />
            </div>
          )}
        </div>

        <div className="bg-[#F4F4F5] p-1 rounded-xl grid sm:inline-grid grid-cols-3 gap-1 w-full sm:w-auto">
          {(
            [
              { id: "overall", label: "Overall" },
              { id: "package", label: "Per paket" },
              { id: "capster", label: "Per capster" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                view === tab.id
                  ? "bg-white text-[#0F172A] font-semibold shadow-2xs"
                  : "text-[#64748B] font-medium hover:text-[#0F172A]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-filter Pills for Per paket / Per capster */}
      {view === "package" && (
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-xs text-[#64748B] mr-1">Pilih paket:</span>
          <button
            type="button"
            onClick={() => setSelectedPackageId("ALL")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
              selectedPackageId === "ALL"
                ? "bg-[#0F172A] text-white"
                : "bg-white border border-[#E5E7EB] text-[#475569] hover:bg-[#F8FAFC]"
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
                  : "bg-white border border-[#E5E7EB] text-[#475569] hover:bg-[#F8FAFC]"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {view === "capster" && (
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-xs text-[#64748B] mr-1">Pilih capster:</span>
          <button
            type="button"
            onClick={() => setSelectedCapsterId("ALL")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
              selectedCapsterId === "ALL"
                ? "bg-[#0F172A] text-white"
                : "bg-white border border-[#E5E7EB] text-[#475569] hover:bg-[#F8FAFC]"
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
                  : "bg-white border border-[#E5E7EB] text-[#475569] hover:bg-[#F8FAFC]"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {loading || !report ? (
        <div className="mt-10 text-center text-xs text-[#64748B]">Memuat data laporan...</div>
      ) : view === "overall" ? (
        <div className="space-y-4 mt-5">
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
              <p className="text-xs text-[#64748B]">Penjualan</p>
              <p className="text-2xl font-bold text-[#0F172A] mt-1.5">
                {formatRupiah(report.summary.totalRevenue)}
              </p>
              <p className="text-[11px] font-medium text-[#15803D] mt-1.5">
                {report.summary.revenueDeltaPct >= 0 ? "+" : ""}
                {report.summary.revenueDeltaPct}% dari periode sebelumnya
              </p>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
              <p className="text-xs text-[#64748B]">Transaksi</p>
              <p className="text-2xl font-bold text-[#0F172A] mt-1.5">
                {report.summary.totalCount}
              </p>
              <p className="text-[11px] font-medium text-[#15803D] mt-1.5">
                {report.summary.countDelta >= 0 ? "+" : ""}
                {report.summary.countDelta} dari periode sebelumnya
              </p>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
              <p className="text-xs text-[#64748B]">Walk-in</p>
              <p className="text-2xl font-bold text-[#0F172A] mt-1.5">
                {report.summary.walkInCount}
              </p>
              <p className="text-[11px] text-[#64748B] mt-1.5">Transaksi</p>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
              <p className="text-xs text-[#64748B]">Booking</p>
              <p className="text-2xl font-bold text-[#0F172A] mt-1.5">
                {report.summary.bookingCount}
              </p>
              <p className="text-[11px] text-[#64748B] mt-1.5">Transaksi</p>
            </div>
          </div>

          {/* Middle Chart + Top Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-4">
            {/* Hourly Sales Chart */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#0F172A]">
                  Penjualan per jam (ribu Rp)
                </h2>
                <span className="text-[11px] text-[#64748B]">
                  Puncak: {report.peakHour.hour} · {formatRupiah(report.peakHour.amount)}
                </span>
              </div>

              <div className="mt-6 overflow-x-auto">
                <div className="min-w-[440px] h-56 flex items-end justify-between gap-2.5 px-1">
                  {report.hourly.map((bar) => {
                    const isPeak = bar.hour === report.peakHour.hour && bar.amount > 0;
                    const pct = Math.max(8, Math.round((bar.amount / maxHourly) * 100));
                    return (
                      <div
                        key={bar.hour}
                        className="flex-1 flex flex-col items-center justify-end h-full"
                      >
                        <span className="text-[10px] font-medium text-[#64748B] mb-1.5">
                          {bar.amountThousands}
                        </span>
                        <div
                          className={`w-full max-w-[34px] rounded-t-lg transition-all ${
                            isPeak ? "bg-[#0F172A]" : "bg-[#D6D3D1]"
                          }`}
                          style={{ height: `${bar.amount > 0 ? pct : 6}%` }}
                        />
                        <span className="text-[10px] text-[#64748B] mt-2">{bar.hour}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Top Packages & Top Capsters */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-6">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A] mb-3.5">
                  Produk terlaris
                </h2>
                <div className="space-y-3">
                  {report.packageStats.map((pkg) => (
                    <div key={pkg.id}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-medium text-[#0F172A]">{pkg.name}</span>
                        <span className="text-[#64748B]">{pkg.sold} terjual</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#0F172A]"
                          style={{
                            width: `${Math.round((pkg.sold / maxPkgSold) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-bold text-[#0F172A] mb-3.5">
                  Capster terlaris
                </h2>
                <div className="space-y-3">
                  {report.capsterStats.map((cap) => (
                    <div key={cap.id}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-medium text-[#0F172A]">{cap.name}</span>
                        <span className="text-[#64748B]">{cap.sold} terjual</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#0F172A]"
                          style={{
                            width: `${Math.round((cap.sold / maxCapSold) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Payment Methods Card */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
            <h2 className="text-sm font-bold text-[#0F172A] mb-3">Metode pembayaran</h2>
            <div className="h-2.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden flex">
              <div
                className="h-full bg-[#0F172A] transition-all"
                style={{ width: `${report.paymentSplit.tunaiPct}%` }}
              />
              <div
                className="h-full bg-[#15803D] transition-all"
                style={{ width: `${report.paymentSplit.qrisPct}%` }}
              />
            </div>
            <div className="flex items-center gap-5 mt-3 text-xs text-[#475569]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0F172A]" />
                Tunai · {report.paymentSplit.tunaiPct}%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#15803D]" />
                QRIS · {report.paymentSplit.qrisPct}%
              </span>
            </div>
          </div>
        </div>
      ) : view === "package" ? (
        selectedPackageId === "ALL" || !report.packageDetail ? (
          <div className="mt-5 bg-white border border-[#E5E7EB] rounded-2xl p-5">
            <h2 className="text-sm font-bold text-[#0F172A]">Penjualan per paket</h2>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              {rangeText} · {report.packageStats.length} paket aktif
            </p>

            <div className="overflow-x-auto mt-4">
              <table className="w-full min-w-[520px] text-left border-collapse">
                <thead>
                <tr className="border-b border-[#E5E7EB] text-[11px] font-medium text-[#64748B]">
                  <th className="py-2.5">Paket</th>
                  <th className="py-2.5 text-right">Terjual</th>
                  <th className="py-2.5 text-right">Pendapatan</th>
                  <th className="py-2.5 pl-6">Kontribusi</th>
                  <th className="py-2.5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs">
                {report.packageStats.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedPackageId(item.id)}
                    className="hover:bg-[#FAFAFA] cursor-pointer"
                  >
                    <td className="py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-[#EDE0CE] text-[#9A6B3B] font-bold flex items-center justify-center">
                          {item.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="font-semibold text-[#0F172A]">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right text-[#0F172A]">{item.sold}</td>
                    <td className="py-3.5 text-right text-[#0F172A]">
                      {formatRupiah(item.revenue)}
                    </td>
                    <td className="py-3.5 pl-6 w-48">
                      <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#0F172A]"
                          style={{ width: `${item.contributionPct}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 text-right text-[#64748B] font-medium w-12">
                      {item.contributionPct}%
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#FAFAFA] font-bold text-[#0F172A]">
                  <td className="py-3.5">Total</td>
                  <td className="py-3.5 text-right">{report.summary.totalCount}</td>
                  <td className="py-3.5 text-right">
                    {formatRupiah(report.summary.totalRevenue)}
                  </td>
                  <td className="py-3.5 pl-6">
                    <div className="h-2 rounded-full bg-[#0F172A]" />
                  </td>
                  <td className="py-3.5 text-right">100%</td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                <p className="text-xs text-[#64748B]">
                  Pendapatan {report.packageDetail.package.name}
                </p>
                <p className="text-2xl font-bold text-[#0F172A] mt-1.5">
                  {formatRupiah(report.packageDetail.revenue)}
                </p>
                <p className="text-[11px] text-[#64748B] mt-1.5">
                  {report.packageDetail.revenuePct}% dari total pendapatan
                </p>
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                <p className="text-xs text-[#64748B]">Layanan terjual</p>
                <p className="text-2xl font-bold text-[#0F172A] mt-1.5">
                  {report.packageDetail.sold}
                </p>
                <p className="text-[11px] text-[#64748B] mt-1.5">
                  dari {report.packageDetail.totalSoldAll} layanan
                </p>
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                <p className="text-xs text-[#64748B]">Walk-in vs Booking</p>
                <p className="text-2xl font-bold text-[#0F172A] mt-1.5">
                  {report.packageDetail.walkInPct}% / {report.packageDetail.bookingPct}%
                </p>
                <p className="text-[11px] text-[#64748B] mt-1.5">
                  {report.packageDetail.walkInCount} walk-in ·{" "}
                  {report.packageDetail.bookingCount} booking
                </p>
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                <p className="text-xs text-[#64748B]">Capster terbanyak</p>
                <p className="text-2xl font-bold text-[#0F172A] mt-1.5">
                  {report.packageDetail.topCapster?.name ?? "-"}
                </p>
                <p className="text-[11px] text-[#64748B] mt-1.5">
                  {report.packageDetail.topCapster?.sold ?? 0} layanan
                </p>
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
              <h2 className="text-sm font-bold text-[#0F172A]">
                Dikerjakan oleh capster
              </h2>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Paket {report.packageDetail.package.name} · {rangeText}
              </p>

              <div className="overflow-x-auto mt-4">
                <table className="w-full min-w-[520px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] text-[11px] font-medium text-[#64748B]">
                      <th className="py-2.5">Capster</th>
                      <th className="py-2.5 text-right">Terjual</th>
                      <th className="py-2.5 text-right">Pendapatan</th>
                      <th className="py-2.5 pl-6">Kontribusi</th>
                      <th className="py-2.5 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-xs">
                    {report.packageDetail.byCapster.map((c) => (
                      <tr key={c.id}>
                        <td className="py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-[#EDE0CE] text-[#9A6B3B] font-bold flex items-center justify-center">
                              {c.name.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="font-semibold text-[#0F172A]">{c.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 text-right text-[#0F172A]">{c.sold}</td>
                        <td className="py-3.5 text-right text-[#0F172A]">
                          {formatRupiah(c.revenue)}
                        </td>
                        <td className="py-3.5 pl-6 w-32 sm:w-48">
                          <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#0F172A]"
                              style={{ width: `${c.contributionPct}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3.5 text-right text-[#64748B] font-medium w-12">
                          {c.contributionPct}%
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#FAFAFA] font-bold text-[#0F172A]">
                      <td className="py-3.5">Total</td>
                      <td className="py-3.5 text-right">{report.packageDetail.sold}</td>
                      <td className="py-3.5 text-right">
                        {formatRupiah(report.packageDetail.revenue)}
                      </td>
                      <td className="py-3.5 pl-6">
                        <div className="h-2 rounded-full bg-[#0F172A]" />
                      </td>
                      <td className="py-3.5 text-right">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      ) : selectedCapsterId === "ALL" || !report.capsterDetail ? (
        <div className="mt-5 bg-white border border-[#E5E7EB] rounded-2xl p-5">
          <h2 className="text-sm font-bold text-[#0F172A]">Penjualan per capster</h2>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            {rangeText} · {report.capsterStats.length} capster
          </p>

          <div className="overflow-x-auto mt-4">
            <table className="w-full min-w-[520px] text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-[11px] font-medium text-[#64748B]">
                  <th className="py-2.5">Capster</th>
                  <th className="py-2.5 text-right">Layanan selesai</th>
                  <th className="py-2.5 text-right">Pendapatan</th>
                  <th className="py-2.5 pl-6">Kontribusi</th>
                  <th className="py-2.5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs">
                {report.capsterStats.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedCapsterId(item.id)}
                    className="hover:bg-[#FAFAFA] cursor-pointer"
                  >
                    <td className="py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-[#EDE0CE] text-[#9A6B3B] font-bold flex items-center justify-center">
                          {item.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="font-semibold text-[#0F172A]">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right text-[#0F172A]">{item.sold}</td>
                    <td className="py-3.5 text-right text-[#0F172A]">
                      {formatRupiah(item.revenue)}
                    </td>
                    <td className="py-3.5 pl-6 w-32 sm:w-48">
                      <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#0F172A]"
                          style={{ width: `${item.contributionPct}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 text-right text-[#64748B] font-medium w-12">
                      {item.contributionPct}%
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#FAFAFA] font-bold text-[#0F172A]">
                  <td className="py-3.5">Total</td>
                  <td className="py-3.5 text-right">{report.summary.totalCount}</td>
                  <td className="py-3.5 text-right">
                    {formatRupiah(report.summary.totalRevenue)}
                  </td>
                  <td className="py-3.5 pl-6">
                    <div className="h-2 rounded-full bg-[#0F172A]" />
                  </td>
                  <td className="py-3.5 text-right">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4 mt-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
              <p className="text-xs text-[#64748B]">
                Pendapatan {report.capsterDetail.capster.name}
              </p>
              <p className="text-2xl font-bold text-[#0F172A] mt-1.5">
                {formatRupiah(report.capsterDetail.revenue)}
              </p>
              <p className="text-[11px] text-[#64748B] mt-1.5">
                {report.capsterDetail.revenuePct}% dari total pendapatan
              </p>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
              <p className="text-xs text-[#64748B]">Layanan selesai</p>
              <p className="text-2xl font-bold text-[#0F172A] mt-1.5">
                {report.capsterDetail.sold}
              </p>
              <p className="text-[11px] text-[#64748B] mt-1.5">
                dari {report.capsterDetail.totalSoldAll} layanan
              </p>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
              <p className="text-xs text-[#64748B]">Walk-in vs Booking</p>
              <p className="text-2xl font-bold text-[#0F172A] mt-1.5">
                {report.capsterDetail.walkInPct}% / {report.capsterDetail.bookingPct}%
              </p>
              <p className="text-[11px] text-[#64748B] mt-1.5">
                {report.capsterDetail.walkInCount} walk-in ·{" "}
                {report.capsterDetail.bookingCount} booking
              </p>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
              <p className="text-xs text-[#64748B]">Paket terbanyak</p>
              <p className="text-2xl font-bold text-[#0F172A] mt-1.5">
                {report.capsterDetail.topPackage?.name ?? "-"}
              </p>
              <p className="text-[11px] text-[#64748B] mt-1.5">
                {report.capsterDetail.topPackage?.sold ?? 0} layanan
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
            <h2 className="text-sm font-bold text-[#0F172A]">Paket yang dikerjakan</h2>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Capster {report.capsterDetail.capster.name} · {rangeText}
            </p>

            <div className="overflow-x-auto mt-4">
              <table className="w-full min-w-[520px] text-left border-collapse">
                <thead>
                <tr className="border-b border-[#E5E7EB] text-[11px] font-medium text-[#64748B]">
                  <th className="py-2.5">Paket</th>
                  <th className="py-2.5 text-right">Terjual</th>
                  <th className="py-2.5 text-right">Pendapatan</th>
                  <th className="py-2.5 pl-6">Kontribusi</th>
                  <th className="py-2.5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs">
                {report.capsterDetail.byPackage.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-[#EDE0CE] text-[#9A6B3B] font-bold flex items-center justify-center">
                          {p.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="font-semibold text-[#0F172A]">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right text-[#0F172A]">{p.sold}</td>
                    <td className="py-3.5 text-right text-[#0F172A]">
                      {formatRupiah(p.revenue)}
                    </td>
                    <td className="py-3.5 pl-6 w-48">
                      <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#0F172A]"
                          style={{ width: `${p.contributionPct}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 text-right text-[#64748B] font-medium w-12">
                      {p.contributionPct}%
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#FAFAFA] font-bold text-[#0F172A]">
                  <td className="py-3.5">Total</td>
                  <td className="py-3.5 text-right">{report.capsterDetail.sold}</td>
                  <td className="py-3.5 text-right">
                    {formatRupiah(report.capsterDetail.revenue)}
                  </td>
                  <td className="py-3.5 pl-6">
                    <div className="h-2 rounded-full bg-[#0F172A]" />
                  </td>
                  <td className="py-3.5 text-right">100%</td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
