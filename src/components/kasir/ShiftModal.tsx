"use client";

import React, { useEffect, useState } from "react";
import { X, Wallet, Plus, Trash2, Lock, Unlock, ArrowDownRight } from "lucide-react";
import { formatDateShort, formatRupiah, formatTimeHHMM } from "@/lib/format";

interface CashExpenseItem {
  id: string;
  amount: number;
  description: string;
  category: string;
  createdBy: string;
  createdAt: string;
}

export interface CashShiftModel {
  id: string;
  status: "OPEN" | "CLOSED";
  openingCash: number;
  closingCashActual: number | null;
  closingCashExpected: number | null;
  openedBy: string;
  closedBy: string | null;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  expenses: CashExpenseItem[];
}

interface ShiftSummary {
  cashSalesTotal: number;
  nonCashSalesTotal: number;
  cashTxCount: number;
  expensesTotal: number;
  expectedCash: number;
}

export function ShiftModal({
  onShiftStatusChange,
  onClose,
}: {
  onShiftStatusChange: (isOpen: boolean) => void;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [activeShift, setActiveShift] = useState<CashShiftModel | null>(null);
  const [summary, setSummary] = useState<ShiftSummary>({
    cashSalesTotal: 0,
    nonCashSalesTotal: 0,
    cashTxCount: 0,
    expensesTotal: 0,
    expectedCash: 0,
  });
  const [recentShifts, setRecentShifts] = useState<CashShiftModel[]>([]);

  // Open shift form
  const [openingCashInput, setOpeningCashInput] = useState("200000");
  const [openNotesInput, setOpenNotesInput] = useState("");

  // Expense form
  const [expAmountInput, setExpAmountInput] = useState("");
  const [expDescInput, setExpDescInput] = useState("");

  // Close shift form
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closingCashInput, setClosingCashInput] = useState("");
  const [closeNotesInput, setCloseNotesInput] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshShiftData = async () => {
    try {
      const res = await fetch("/api/shifts");
      const json = await res.json();
      if (res.ok && json.data) {
        setActiveShift(json.data.activeShift);
        setSummary(json.data.summary);
        setRecentShifts(json.data.recentShifts ?? []);
        setClosingCashInput(String(json.data.summary.expectedCash ?? 0));
        onShiftStatusChange(Boolean(json.data.activeShift));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch("/api/shifts")
      .then((r) => r.json())
      .then((json) => {
        if (!active || !json.data) return;
        setActiveShift(json.data.activeShift);
        setSummary(json.data.summary);
        setRecentShifts(json.data.recentShifts ?? []);
        setClosingCashInput(String(json.data.summary.expectedCash ?? 0));
        onShiftStatusChange(Boolean(json.data.activeShift));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onShiftStatusChange]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openingCash: Number(openingCashInput.replace(/\D/g, "")) || 0,
          notes: openNotesInput.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await refreshShiftData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal membuka shift");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    const amount = Number(expAmountInput.replace(/\D/g, "")) || 0;
    if (amount <= 0 || !expDescInput.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/shifts/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: activeShift.id,
          amount,
          description: expDescInput.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setExpAmountInput("");
      setExpDescInput("");
      await refreshShiftData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mencatat pengeluaran");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    await fetch(`/api/shifts/expenses/${id}`, { method: "DELETE" });
    await refreshShiftData();
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/shifts/${activeShift.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closingCashActual: Number(closingCashInput.replace(/\D/g, "")) || 0,
          notes: closeNotesInput.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setShowCloseConfirm(false);
      await refreshShiftData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menutup shift");
    } finally {
      setSubmitting(false);
    }
  };

  const actualNumeric = Number(closingCashInput.replace(/\D/g, "")) || 0;
  const cashDiff = actualNumeric - summary.expectedCash;

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F4F4F5] flex items-center justify-center text-[#0F172A]">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Shift &amp; Laci Kasir</h2>
              <p className="text-xs text-[#64748B]">
                Kelola modal awal, kas keluar operasional, dan rekap tutup laci
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <p className="text-xs text-[#DC2626] bg-[#FEF2F2] px-3.5 py-2 rounded-xl">{error}</p>
        )}

        {loading ? (
          <p className="py-10 text-center text-xs text-[#64748B]">Memuat status laci kasir...</p>
        ) : !activeShift ? (
          <div className="space-y-4">
            <form
              onSubmit={handleOpenShift}
              className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-4 space-y-3.5"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A]">
                <Unlock className="w-3.5 h-3.5 text-[#15803D]" />
                Buka Shift Baru
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                  Modal awal uang tunai di laci (Rp)
                </label>
                <input
                  required
                  inputMode="numeric"
                  value={
                    Number(openingCashInput.replace(/\D/g, ""))
                      ? Number(openingCashInput.replace(/\D/g, "")).toLocaleString("id-ID")
                      : "0"
                  }
                  onChange={(e) => setOpeningCashInput(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[100000, 200000, 300000, 500000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setOpeningCashInput(String(val))}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#E5E7EB] hover:border-[#0F172A] text-[11px] font-semibold text-[#0F172A] cursor-pointer"
                    >
                      {formatRupiah(val)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                  Catatan shift (opsional)
                </label>
                <input
                  value={openNotesInput}
                  onChange={(e) => setOpenNotesInput(e.target.value)}
                  placeholder="Contoh: Shift pagi"
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold cursor-pointer"
              >
                {submitting ? "Membuka..." : "Buka Shift Sekarang"}
              </button>
            </form>

            {recentShifts.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Riwayat Tutup Shift Terakhir
                </p>
                <div className="divide-y divide-[#F1F5F9] border border-[#E5E7EB] rounded-xl overflow-hidden text-xs">
                  {recentShifts.slice(0, 4).map((sh) => {
                    const diff = (sh.closingCashActual ?? 0) - (sh.closingCashExpected ?? 0);
                    return (
                      <div key={sh.id} className="px-3.5 py-2.5 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-[#0F172A]">
                            {sh.closedAt ? formatDateShort(sh.closedAt) : "-"} ·{" "}
                            {sh.closedAt ? formatTimeHHMM(sh.closedAt) : ""} ({sh.closedBy})
                          </p>
                          <p className="text-[11px] text-[#64748B]">
                            Aktual {formatRupiah(sh.closingCashActual ?? 0)} / Sistem{" "}
                            {formatRupiah(sh.closingCashExpected ?? 0)}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            diff === 0
                              ? "bg-[#DCFCE7] text-[#15803D]"
                              : diff > 0
                                ? "bg-[#DBEAFE] text-[#1D4ED8]"
                                : "bg-[#FEE2E2] text-[#DC2626]"
                          }`}
                        >
                          {diff === 0
                            ? "Pas"
                            : `${diff > 0 ? "+" : "-"}${formatRupiah(Math.abs(diff))}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active Shift Header & 4 KPI tiles */}
            <div className="flex items-center justify-between bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-3.5 py-2.5 text-xs">
              <span className="font-semibold text-[#15803D]">
                ● Shift Aktif — dibuka pukul {formatTimeHHMM(activeShift.openedAt)} oleh{" "}
                {activeShift.openedBy}
              </span>
              <span className="text-[11px] text-[#15803D]">{summary.cashTxCount} trx tunai</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="border border-[#E5E7EB] rounded-xl p-3">
                <p className="text-[11px] text-[#64748B]">Modal Awal</p>
                <p className="text-sm font-bold text-[#0F172A] mt-0.5 tabular-nums">
                  {formatRupiah(activeShift.openingCash)}
                </p>
              </div>
              <div className="border border-[#E5E7EB] rounded-xl p-3">
                <p className="text-[11px] text-[#64748B]">Penjualan Tunai</p>
                <p className="text-sm font-bold text-[#15803D] mt-0.5 tabular-nums">
                  +{formatRupiah(summary.cashSalesTotal)}
                </p>
              </div>
              <div className="border border-[#E5E7EB] rounded-xl p-3">
                <p className="text-[11px] text-[#64748B]">Kas Keluar</p>
                <p className="text-sm font-bold text-[#DC2626] mt-0.5 tabular-nums">
                  -{formatRupiah(summary.expensesTotal)}
                </p>
              </div>
              <div className="bg-[#0F172A] text-white rounded-xl p-3">
                <p className="text-[11px] text-[#94A3B8]">Uang Seharusnya di Laci</p>
                <p className="text-sm font-bold mt-0.5 tabular-nums">
                  {formatRupiah(summary.expectedCash)}
                </p>
              </div>
            </div>

            {/* Petty Cash Out Section */}
            <div className="border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                <ArrowDownRight className="w-3.5 h-3.5 text-[#DC2626]" />
                Catat Kas Keluar (Operasional)
              </p>

              <form onSubmit={handleAddExpense} className="flex flex-col sm:flex-row gap-2">
                <input
                  required
                  inputMode="numeric"
                  value={expAmountInput}
                  onChange={(e) => setExpAmountInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="Nominal (Rp)"
                  className="sm:w-32 border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
                <input
                  required
                  value={expDescInput}
                  onChange={(e) => setExpDescInput(e.target.value)}
                  placeholder="Contoh: Beli galon & tisu"
                  className="flex-1 border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#0F172A] text-white rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Catat
                </button>
              </form>

              {activeShift.expenses.length > 0 && (
                <div className="divide-y divide-[#F1F5F9] max-h-32 overflow-y-auto text-xs pt-1">
                  {activeShift.expenses.map((exp) => (
                    <div key={exp.id} className="py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-[#0F172A] truncate">{exp.description}</p>
                        <p className="text-[10px] text-[#94A3B8]">
                          {formatTimeHHMM(exp.createdAt)} · {exp.createdBy}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-[#DC2626] tabular-nums">
                          -{formatRupiah(exp.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="text-[#94A3B8] hover:text-[#DC2626] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Close Shift Section */}
            {!showCloseConfirm ? (
              <button
                type="button"
                onClick={() => {
                  setClosingCashInput(String(summary.expectedCash));
                  setShowCloseConfirm(true);
                }}
                className="w-full py-2.5 rounded-xl border border-[#FEE2E2] hover:bg-[#FEF2F2] text-[#DC2626] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                Tutup Shift &amp; Hitung Uang Laci
              </button>
            ) : (
              <form
                onSubmit={handleCloseShift}
                className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-4 space-y-3"
              >
                <p className="text-xs font-bold text-[#0F172A]">Konfirmasi Tutup Shift</p>
                <div>
                  <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                    Uang tunai fisik dihitung di laci (Rp)
                  </label>
                  <input
                    required
                    inputMode="numeric"
                    value={actualNumeric ? actualNumeric.toLocaleString("id-ID") : "0"}
                    onChange={(e) => setClosingCashInput(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-white border border-[#0F172A] rounded-xl px-3.5 py-2 text-sm font-bold text-[#0F172A] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#64748B]">Selisih terhadap sistem:</span>
                  <span
                    className={
                      cashDiff === 0
                        ? "text-[#15803D]"
                        : cashDiff > 0
                          ? "text-[#1D4ED8]"
                          : "text-[#DC2626]"
                    }
                  >
                    {cashDiff === 0
                      ? "Pas (Rp0)"
                      : `${cashDiff > 0 ? "Lebih +" : "Kurang -"}${formatRupiah(Math.abs(cashDiff))}`}
                  </span>
                </div>

                <input
                  value={closeNotesInput}
                  onChange={(e) => setCloseNotesInput(e.target.value)}
                  placeholder="Catatan tutup shift (opsional)"
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#0F172A]"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCloseConfirm(false)}
                    className="py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-semibold text-[#0F172A] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold cursor-pointer"
                  >
                    {submitting ? "Menutup..." : "Simpan & Tutup Shift"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
