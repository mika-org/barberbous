"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Calendar,
  Trash2,
  Download,
  TrendingDown,
  Check,
  X,
} from "lucide-react";
import { formatDateShort, formatRupiah, formatTimeHHMM } from "@/lib/format";
import { buildWorkbookXlsxBytes, triggerXlsxDownload } from "@/lib/exportReconciliationCsv";

export interface StoreExpenseModel {
  id: string;
  amount: number;
  description: string;
  category: string;
  paymentMethod: "TUNAI" | "QRIS" | "DEBIT";
  notes: string | null;
  shiftExpenseId: string | null;
  createdBy: string;
  expenseDate: string;
  createdAt: string;
}

type ExpenseRange = "today" | "yesterday" | "7d" | "30d" | "month" | "custom" | "all";

const CATEGORIES = [
  "Operasional",
  "Bahan Barber",
  "Stok Minuman",
  "Utilitas & Sewa",
  "Lainnya",
] as const;

function getLocalTodayYmd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function PengeluaranClient({
  initialExpenses,
}: {
  initialExpenses: StoreExpenseModel[];
}) {
  const todayYmd = getLocalTodayYmd();

  const [expenses, setExpenses] = useState<StoreExpenseModel[]>(initialExpenses);
  const [range, setRange] = useState<ExpenseRange>("today");
  const [customFrom, setCustomFrom] = useState<string>(todayYmd);
  const [customTo, setCustomTo] = useState<string>(todayYmd);
  const [loadingList, setLoadingList] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [mobileFormOpen, setMobileFormOpen] = useState(false);

  // Create form state
  const [amountInput, setAmountInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [expenseDateInput, setExpenseDateInput] = useState<string>(todayYmd);
  const [categoryInput, setCategoryInput] = useState<(typeof CATEGORIES)[number]>("Operasional");
  const [methodInput, setMethodInput] = useState<"TUNAI" | "QRIS" | "DEBIT">("TUNAI");
  const [notesInput, setNotesInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchExpenses = async (
    nextRange: ExpenseRange,
    fromDate = customFrom,
    toDate = customTo
  ) => {
    setRange(nextRange);
    setLoadingList(true);
    try {
      const params = new URLSearchParams({ range: nextRange });
      if (nextRange === "custom") {
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);
      }
      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setExpenses(json.data ?? []);
      }
    } finally {
      setLoadingList(false);
    }
  };

  const handleSingleDatePick = (ymd: string) => {
    setCustomFrom(ymd);
    setCustomTo(ymd);
    fetchExpenses("custom", ymd, ymd);
  };

  const filtered = useMemo(() => {
    return expenses.filter((exp) => {
      if (categoryFilter !== "ALL" && exp.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          exp.description.toLowerCase().includes(q) ||
          exp.category.toLowerCase().includes(q) ||
          exp.createdBy.toLowerCase().includes(q) ||
          (exp.notes ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [expenses, categoryFilter, search]);

  const stats = useMemo(() => {
    const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);
    const cashTotal = filtered
      .filter((e) => e.paymentMethod === "TUNAI")
      .reduce((s, e) => s + e.amount, 0);
    const qrisTotal = filtered
      .filter((e) => e.paymentMethod === "QRIS")
      .reduce((s, e) => s + e.amount, 0);
    const debitTotal = filtered
      .filter((e) => e.paymentMethod === "DEBIT")
      .reduce((s, e) => s + e.amount, 0);
    const nonCashTotal = qrisTotal + debitTotal;

    const byCat: Record<string, number> = {};
    for (const e of filtered) {
      byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
    }
    const topCategory = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

    return {
      totalAmount,
      cashTotal,
      qrisTotal,
      debitTotal,
      nonCashTotal,
      topCategory,
    };
  }, [filtered]);

  const activeRangeLabel = useMemo(() => {
    if (range === "today") return "Hari ini";
    if (range === "yesterday") return "Kemarin";
    if (range === "7d") return "7 hari terakhir";
    if (range === "30d") return "30 hari terakhir";
    if (range === "month") return "Bulan ini";
    if (range === "all") return "Semua waktu";
    return customFrom === customTo
      ? `Tanggal ${customFrom}`
      : `${customFrom} s/d ${customTo}`;
  }, [range, customFrom, customTo]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amountInput.replace(/\D/g, "")) || 0;
    if (numericAmount < 100) {
      setErrorMsg("Nominal pengeluaran minimal Rp100");
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numericAmount,
          description: descInput.trim(),
          category: categoryInput,
          paymentMethod: methodInput,
          notes: notesInput.trim() || null,
          expenseDate: expenseDateInput || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setAmountInput("");
      setDescInput("");
      setNotesInput("");
      setMobileFormOpen(false);
      setFeedback("Pengeluaran berhasil dicatat");
      setTimeout(() => setFeedback(null), 2600);
      await fetchExpenses(range, customFrom, customTo);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal mencatat pengeluaran");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        setExpenses((prev) => prev.filter((item) => item.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportCsv = () => {
    const byCategory = CATEGORIES.map((cat) => {
      const catRows = filtered.filter((e) => e.category === cat);
      return {
        category: cat,
        count: catRows.length,
        amount: catRows.reduce((s, r) => s + r.amount, 0),
      };
    });

    const bytes = buildWorkbookXlsxBytes([
      {
        name: "1. Ringkasan Biaya",
        colWidths: [30, 32, 14, 24],
        rows: [
          [{ v: "RINGKASAN PENGELUARAN OPERASIONAL — BARBERBOUS", s: 1 }],
          [{ v: `Periode: ${activeRangeLabel}`, s: 0 }],
          [],
          [
            { v: "Komponen / Metode Dana", s: 3 },
            { v: "Keterangan", s: 3 },
            { v: "Jumlah Catatan", s: 3 },
            { v: "Total Pengeluaran (Rp)", s: 3 },
          ],
          [
            "Pengeluaran Tunai",
            "Memotong kas laci tunai",
            filtered.filter((e) => e.paymentMethod === "TUNAI").length,
            stats.cashTotal,
          ],
          [
            "Pengeluaran QRIS",
            "Pembayaran keluar via QRIS",
            filtered.filter((e) => e.paymentMethod === "QRIS").length,
            stats.qrisTotal,
          ],
          [
            "Pengeluaran Debit",
            "Pembayaran keluar via Debit/Rekening",
            filtered.filter((e) => e.paymentMethod === "DEBIT").length,
            stats.debitTotal,
          ],
          [
            { v: "TOTAL PENGELUARAN", s: 6 },
            { v: activeRangeLabel, s: 6 },
            { v: filtered.length, s: 7 },
            { v: stats.totalAmount, s: 7 },
          ],
          [],
          [
            { v: "Kategori Biaya", s: 3 },
            { v: "Keterangan", s: 3 },
            { v: "Jumlah Catatan", s: 3 },
            { v: "Total Kategori (Rp)", s: 3 },
          ],
          ...byCategory.map((c) => [c.category, "Biaya operasional", c.count, c.amount]),
        ],
      },
      {
        name: "2. Detail Pengeluaran",
        colWidths: [16, 10, 22, 38, 14, 18, 22],
        rows: [
          [{ v: "DETAIL SELURUH CATATAN PENGELUARAN", s: 1 }],
          [{ v: `Periode: ${activeRangeLabel}`, s: 0 }],
          [],
          [
            { v: "Tanggal", s: 3 },
            { v: "Jam", s: 3 },
            { v: "Kategori", s: 3 },
            { v: "Keterangan", s: 3 },
            { v: "Metode", s: 3 },
            { v: "Dicatat Oleh", s: 3 },
            { v: "Nominal (Rp)", s: 3 },
          ],
          ...(filtered.length > 0
            ? filtered.map((e) => [
                formatDateShort(e.expenseDate),
                formatTimeHHMM(e.expenseDate),
                e.category,
                e.description + (e.notes ? ` (${e.notes})` : ""),
                e.paymentMethod,
                e.createdBy,
                e.amount,
              ])
            : [["-", "-", "-", "Belum ada pengeluaran pada periode ini", "-", "-", 0]]),
          [
            { v: "TOTAL DETAIL", s: 6 },
            { v: "", s: 6 },
            { v: "", s: 6 },
            { v: `${filtered.length} catatan pengeluaran`, s: 6 },
            { v: "", s: 6 },
            { v: "", s: 6 },
            { v: stats.totalAmount, s: 7 },
          ],
        ],
      },
    ]);

    const suffix = range === "custom" ? `${customFrom}_${customTo}` : range;
    triggerXlsxDownload(bytes, `pengeluaran-2sheet-barberbous-${suffix}.xlsx`);
  };

  const numericDraft = Number(amountInput.replace(/\D/g, "")) || 0;

  return (
    <>
      <main className="flex-1 bg-[#FAFAFA] p-4 sm:p-5 lg:p-6 overflow-y-auto min-w-0">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Pengeluaran</h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              {activeRangeLabel} · {filtered.length} catatan pengeluaran · Total{" "}
              <span className="font-semibold text-[#DC2626]">{formatRupiah(stats.totalAmount)}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setMobileFormOpen(true)}
              className="lg:hidden bg-[#0F172A] text-white rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Catat
            </button>

            <div className="relative flex-1 sm:flex-initial sm:w-52">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari keterangan..."
                className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-8 pr-3 py-2 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className="bg-white border border-[#E5E7EB] hover:bg-[#F8FAFC] rounded-xl px-3.5 py-2 text-xs font-semibold text-[#0F172A] flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Ekspor (.xlsx)
            </button>
          </div>
        </div>

        {/* Date Filter Bar (Preset Pills + Date Picker) */}
        <div className="mt-4 bg-white border border-[#E5E7EB] rounded-2xl p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F172A] mr-1">
                <Calendar className="w-3.5 h-3.5 text-[#475569]" />
                Filter Tanggal:
              </span>
              {(
                [
                  { id: "today", label: "Hari ini" },
                  { id: "yesterday", label: "Kemarin" },
                  { id: "7d", label: "7 hari" },
                  { id: "30d", label: "30 hari" },
                  { id: "month", label: "Bulan ini" },
                  { id: "all", label: "Semua" },
                  { id: "custom", label: "Pilih tanggal" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => fetchExpenses(item.id, customFrom, customTo)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                    range === item.id
                      ? "bg-[#0F172A] text-white"
                      : "bg-[#F8FAFC] border border-[#E5E7EB] text-[#475569] hover:bg-[#F1F5F9]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Quick single-date jump */}
            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="quick-expense-date" className="text-[11px] text-[#64748B]">
                Loncat ke tanggal:
              </label>
              <input
                id="quick-expense-date"
                type="date"
                value={range === "custom" && customFrom === customTo ? customFrom : todayYmd}
                onChange={(e) => {
                  if (e.target.value) handleSingleDatePick(e.target.value);
                }}
                className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl px-2.5 py-1.5 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
              />
            </div>
          </div>

          {range === "custom" && (
            <div className="pt-2.5 border-t border-[#F1F5F9] flex flex-wrap items-center gap-2.5 text-xs">
              <span className="text-[#64748B]">Rentang tanggal:</span>
              <input
                type="date"
                aria-label="Dari tanggal"
                value={customFrom}
                onChange={(e) => {
                  const nextFrom = e.target.value;
                  setCustomFrom(nextFrom);
                  fetchExpenses("custom", nextFrom, customTo);
                }}
                className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
              />
              <span className="text-[#64748B]">s/d</span>
              <input
                type="date"
                aria-label="Sampai tanggal"
                value={customTo}
                onChange={(e) => {
                  const nextTo = e.target.value;
                  setCustomTo(nextTo);
                  fetchExpenses("custom", customFrom, nextTo);
                }}
                className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
              />
              <button
                type="button"
                onClick={() => fetchExpenses("today")}
                className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] underline ml-1 cursor-pointer"
              >
                Reset ke hari ini
              </button>
            </div>
          )}
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 mt-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
            <p className="text-[11px] font-medium text-[#64748B]">Total pengeluaran</p>
            <p className="text-xl font-bold text-[#DC2626] mt-1 tabular-nums">
              {formatRupiah(stats.totalAmount)}
            </p>
            <p className="text-[11px] text-[#64748B] mt-1">{filtered.length} transaksi keluar</p>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
            <p className="text-[11px] font-medium text-[#64748B]">Pengeluaran Tunai</p>
            <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
              {formatRupiah(stats.cashTotal)}
            </p>
            <p className="text-[11px] text-[#64748B] mt-1">Memotong kas tunai laci</p>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
            <p className="text-[11px] font-medium text-[#64748B]">Non-Tunai (QRIS / Debit)</p>
            <p className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
              {formatRupiah(stats.nonCashTotal)}
            </p>
            <p className="text-[11px] text-[#64748B] mt-1">
              QRIS {formatRupiah(stats.qrisTotal)} · Debit {formatRupiah(stats.debitTotal)}
            </p>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
            <p className="text-[11px] font-medium text-[#64748B]">Kategori terbesar</p>
            <p className="text-lg font-bold text-[#0F172A] mt-1 truncate">{stats.topCategory}</p>
            <p className="text-[11px] text-[#64748B] mt-1">Otomatis masuk Laporan Laba</p>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button
            type="button"
            onClick={() => setCategoryFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
              categoryFilter === "ALL"
                ? "bg-[#0F172A] text-white"
                : "bg-white border border-[#E5E7EB] text-[#475569] hover:bg-[#F8FAFC]"
            }`}
          >
            Semua kategori
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                categoryFilter === cat
                  ? "bg-[#0F172A] text-white"
                  : "bg-white border border-[#E5E7EB] text-[#475569] hover:bg-[#F8FAFC]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Expenses Table */}
        <div className="mt-4 bg-white border border-[#E5E7EB] rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[580px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] font-medium text-[#64748B]">
                <th className="py-3 px-4">Tanggal &amp; Jam</th>
                <th className="py-3 px-4">Keterangan</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4">Oleh</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loadingList ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#64748B]">
                    Memuat pengeluaran sesuai filter tanggal...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#94A3B8]">
                    Belum ada catatan pengeluaran pada tanggal/periode ini.
                  </td>
                </tr>
              ) : (
                filtered.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#FAFAFA]">
                    <td className="py-3.5 px-4 text-[#64748B] whitespace-nowrap">
                      {formatDateShort(exp.expenseDate)} · {formatTimeHHMM(exp.expenseDate)}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#0F172A]">{exp.description}</p>
                      {exp.notes && (
                        <p className="text-[11px] text-[#94A3B8] truncate max-w-[220px]">
                          {exp.notes}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F4F4F5] text-[#0F172A] text-[11px] font-medium">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#475569]">
                      {exp.paymentMethod === "TUNAI"
                        ? "Tunai"
                        : exp.paymentMethod === "DEBIT"
                          ? "Debit"
                          : "QRIS"}
                    </td>
                    <td className="py-3.5 px-4 text-[#64748B]">{exp.createdBy}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#DC2626] tabular-nums">
                      -{formatRupiah(exp.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        disabled={deletingId === exp.id}
                        onClick={() => handleDelete(exp.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        {deletingId === exp.id ? "..." : "Hapus"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Right Form Panel */}
      {mobileFormOpen && (
        <div
          onClick={() => setMobileFormOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}
      <aside
        className={`${
          mobileFormOpen
            ? "fixed inset-y-0 right-0 z-40 flex w-full max-w-[380px] shadow-2xl"
            : "hidden"
        } lg:static lg:flex lg:w-[335px] xl:w-[375px] shrink-0 bg-white border-l border-[#E5E7EB] p-6 flex-col justify-between overflow-y-auto`}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">Catat pengeluaran</h2>
                <p className="text-[11px] text-[#64748B]">Biaya operasional &amp; belanja toko</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileFormOpen(false)}
              className="lg:hidden w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {feedback && (
            <p className="text-xs font-medium text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-2 rounded-xl">
              {feedback}
            </p>
          )}
          {errorMsg && (
            <p className="text-xs font-medium text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 rounded-xl">
              {errorMsg}
            </p>
          )}

          <div>
            <label className="block text-[11px] font-medium text-[#64748B] mb-1">
              Nominal pengeluaran (Rp)
            </label>
            <div className="flex items-center border-[1.5px] border-[#0F172A] rounded-xl px-3.5 py-2 bg-white">
              <span className="text-xs font-semibold text-[#64748B] mr-2">Rp</span>
              <input
                required
                inputMode="numeric"
                value={numericDraft ? numericDraft.toLocaleString("id-ID") : ""}
                onChange={(e) => setAmountInput(e.target.value.replace(/\D/g, ""))}
                placeholder="0"
                className="w-full text-base font-bold text-[#0F172A] focus:outline-none tabular-nums"
              />
            </div>
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              {[10000, 25000, 50000, 100000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmountInput(String(preset))}
                  className="py-1.5 rounded-lg border border-[#E5E7EB] hover:border-[#0F172A] text-[10px] font-semibold text-[#0F172A] cursor-pointer"
                >
                  {formatRupiah(preset)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#64748B] mb-1">
              Tanggal pengeluaran
            </label>
            <input
              required
              type="date"
              value={expenseDateInput}
              onChange={(e) => setExpenseDateInput(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#64748B] mb-1">
              Nama / Keterangan pengeluaran
            </label>
            <input
              required
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              placeholder="Contoh: Beli pomade, hair tonic, tisu"
              className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#64748B] mb-1">
              Kategori biaya
            </label>
            <select
              value={categoryInput}
              onChange={(e) =>
                setCategoryInput(e.target.value as (typeof CATEGORIES)[number])
              }
              className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] bg-white focus:outline-none focus:border-[#0F172A]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#64748B] mb-1.5">
              Sumber dana / Metode
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: "TUNAI", label: "Tunai" },
                  { id: "QRIS", label: "QRIS" },
                  { id: "DEBIT", label: "Debit" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethodInput(m.id)}
                  className={`py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                    methodInput === m.id
                      ? "bg-[#0F172A] text-white border-[#0F172A]"
                      : "bg-white border-[#E5E7EB] text-[#64748B]"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#64748B] mb-1">
              Catatan tambahan (opsional)
            </label>
            <textarea
              rows={2}
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Contoh: Nota toko grosir #12"
              className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            {saving ? "Menyimpan..." : "Simpan pengeluaran"}
          </button>
        </form>
      </aside>
    </>
  );
}
