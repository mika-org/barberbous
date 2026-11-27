"use client";

import React, { useMemo, useState } from "react";
import {
  Calendar,
  Search,
  Printer,
  CloudDownload,
  RotateCcw,
  Check,
  X,
  Lock,
} from "lucide-react";
import { formatDateShort, formatRupiah, formatTimeHHMM } from "@/lib/format";
import {
  downloadReceiptText,
  ReceiptModal,
  type ReceiptStoreInfo,
  type ReceiptTransaction,
} from "../ReceiptModal";

export interface RiwayatTransaction extends ReceiptTransaction {
  id: string;
  orderNumber: number;
  isMember: boolean;
  notes: string | null;
}

export function RiwayatClient({
  initialTransactions,
  storeInfo,
  userRole = "Kasir",
}: {
  initialTransactions: RiwayatTransaction[];
  storeInfo: ReceiptStoreInfo;
  userRole?: string;
}) {
  const isManager = userRole === "Owner" || userRole === "Admin";
  const [transactions, setTransactions] = useState<RiwayatTransaction[]>(initialTransactions);
  const [filter, setFilter] = useState<"ALL" | "TUNAI" | "QRIS" | "DEBIT" | "MENUNGGU" | "REFUND">("ALL");
  const [range, setRange] = useState<"today" | "7d" | "30d" | "all">("today");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>(initialTransactions[0]?.id ?? "");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [updatingRefund, setUpdatingRefund] = useState(false);
  const [refundTargetTx, setRefundTargetTx] = useState<RiwayatTransaction | null>(null);
  const [managerPasswordInput, setManagerPasswordInput] = useState("");
  const [refundError, setRefundError] = useState<string | null>(null);

  const fetchTransactions = async (nextRange: "today" | "7d" | "30d" | "all") => {
    setRange(nextRange);
    const res = await fetch(`/api/transactions?range=${nextRange}`);
    if (res.ok) {
      const json = await res.json();
      setTransactions(json.data ?? []);
      if (json.data?.[0]?.id) setSelectedId(json.data[0].id);
    }
  };

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (filter === "TUNAI" && (tx.paymentMethod !== "TUNAI" || tx.status !== "SELESAI")) {
        return false;
      }
      if (filter === "QRIS" && (tx.paymentMethod !== "QRIS" || tx.status !== "SELESAI")) {
        return false;
      }
      if (filter === "DEBIT" && (tx.paymentMethod !== "DEBIT" || tx.status !== "SELESAI")) {
        return false;
      }
      if (filter === "MENUNGGU" && tx.status !== "MENUNGGU_PEMBAYARAN") {
        return false;
      }
      if (filter === "REFUND" && tx.status !== "REFUND") {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          tx.orderCode.toLowerCase().includes(q) ||
          tx.packageName.toLowerCase().includes(q) ||
          tx.capsterName.toLowerCase().includes(q) ||
          tx.customerName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, filter, search]);

  const selectedTx = useMemo(
    () => filtered.find((t) => t.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId]
  );

  const totalRevenue = useMemo(
    () =>
      transactions
        .filter((t) => t.status === "SELESAI")
        .reduce((acc, t) => acc + t.total, 0),
    [transactions]
  );

  const handleSettlePending = async (tx: RiwayatTransaction) => {
    if (tx.status !== "MENUNGGU_PEMBAYARAN") return;
    setUpdatingRefund(true);
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SELESAI" }),
      });
      if (res.ok) {
        const json = await res.json();
        setTransactions((prev) =>
          prev.map((item) => (item.id === tx.id ? { ...item, ...json.data } : item))
        );
      }
    } finally {
      setUpdatingRefund(false);
    }
  };

  const executeRefund = async (tx: RiwayatTransaction, ownerPassword?: string) => {
    if (tx.status === "REFUND") return;
    setUpdatingRefund(true);
    setRefundError(null);
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REFUND", ownerPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        setRefundError(json.error ?? "Gagal melakukan refund");
        return;
      }
      setTransactions((prev) =>
        prev.map((item) => (item.id === tx.id ? { ...item, ...json.data } : item))
      );
      setRefundTargetTx(null);
      setManagerPasswordInput("");
    } finally {
      setUpdatingRefund(false);
    }
  };

  const handleRefund = (tx: RiwayatTransaction) => {
    if (tx.status === "REFUND") return;
    if (isManager) {
      executeRefund(tx);
    } else {
      setRefundError(null);
      setManagerPasswordInput("");
      setRefundTargetTx(tx);
    }
  };

  const rangeLabel =
    range === "today"
      ? "Hari ini"
      : range === "7d"
      ? "7 hari"
      : range === "30d"
      ? "30 hari"
      : "Semua waktu";

  return (
    <>
      <main className="flex-1 bg-[#FAFAFA] p-4 sm:p-5 lg:p-6 overflow-y-auto min-w-0">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Riwayat transaksi</h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              {transactions.length} transaksi · {formatRupiah(totalRevenue)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={range}
                onChange={(e) =>
                  fetchTransactions(e.target.value as "today" | "7d" | "30d" | "all")
                }
                aria-label="Rentang waktu"
                className="appearance-none bg-white border border-[#E5E7EB] rounded-xl pl-8 pr-6 py-2 text-xs font-medium text-[#0F172A] cursor-pointer focus:outline-none focus:border-[#0F172A]"
              >
                <option value="today">Hari ini</option>
                <option value="7d">7 hari</option>
                <option value="30d">30 hari</option>
                <option value="all">Semua</option>
              </select>
            </div>

            <div className="relative flex-1 sm:flex-initial sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari no. pesanan"
                className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-8 pr-3 py-2 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A]"
              />
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {(
            [
              { id: "ALL", label: "Semua" },
              { id: "TUNAI", label: "Tunai" },
              { id: "QRIS", label: "QRIS" },
              { id: "DEBIT", label: "Debit" },
              { id: "MENUNGGU", label: "Menunggu" },
              { id: "REFUND", label: "Refund" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                filter === item.id
                  ? "bg-[#0F172A] text-white"
                  : "bg-white border border-[#E5E7EB] text-[#475569] hover:bg-[#F8FAFC]"
              }`}
            >
              {item.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-[#64748B]">{rangeLabel}</span>
        </div>

        {/* Transactions Table */}
        <div className="mt-4 bg-white border border-[#E5E7EB] rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[520px] text-left border-collapse">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] font-medium text-[#64748B]">
                <th className="py-3 px-4">No.</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Tipe</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#94A3B8]">
                    Tidak ada transaksi yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const isSelected = tx.id === selectedTx?.id;
                  const typeLabel =
                    tx.orderType === "WALK_IN"
                      ? `${tx.packageName} · Walk-in`
                      : tx.packageName;
                  return (
                    <tr
                      key={tx.id}
                      onClick={() => {
                        setSelectedId(tx.id);
                        setMobileDetailOpen(true);
                      }}
                      className={`cursor-pointer transition ${
                        isSelected ? "bg-[#F8FAFC]" : "hover:bg-[#FAFAFA]"
                      }`}
                    >
                      <td className="py-3.5 px-4 font-semibold text-[#0F172A]">
                        {tx.orderCode}
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B]">
                        {formatTimeHHMM(tx.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-[#0F172A]">{typeLabel}</td>
                      <td className="py-3.5 px-4 text-[#64748B]">
                        {tx.paymentMethod === "TUNAI"
                          ? "Tunai"
                          : tx.paymentMethod === "DEBIT"
                            ? "Debit"
                            : "QRIS"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-[#0F172A]">
                        {formatRupiah(tx.total)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            tx.status === "SELESAI"
                              ? "bg-[#DCFCE7] text-[#15803D]"
                              : tx.status === "REFUND"
                              ? "bg-[#FEE2E2] text-[#DC2626]"
                              : "bg-[#FEF3C7] text-[#B45309]"
                          }`}
                        >
                          {tx.status === "SELESAI"
                            ? "Selesai"
                            : tx.status === "REFUND"
                            ? "Refund"
                            : "Menunggu"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Right Detail Panel (Desktop lg+; slide-over drawer on < lg) */}
      {mobileDetailOpen && (
        <div
          onClick={() => setMobileDetailOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}
      <aside
        className={`${
          mobileDetailOpen
            ? "fixed inset-y-0 right-0 z-40 flex w-full max-w-[380px] shadow-2xl"
            : "hidden"
        } lg:static lg:flex lg:w-[330px] xl:w-[380px] shrink-0 bg-white border-l border-[#E5E7EB] p-6 flex-col justify-between overflow-y-auto`}
      >
        {selectedTx ? (
          <>
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-[#0F172A]">
                    Detail {selectedTx.orderCode}
                  </h2>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    {formatDateShort(selectedTx.createdAt)} ·{" "}
                    {formatTimeHHMM(selectedTx.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                      selectedTx.status === "SELESAI"
                        ? "bg-[#DCFCE7] text-[#15803D]"
                        : selectedTx.status === "REFUND"
                        ? "bg-[#FEE2E2] text-[#DC2626]"
                        : "bg-[#FEF3C7] text-[#B45309]"
                    }`}
                  >
                    {selectedTx.status === "SELESAI"
                      ? "Selesai"
                      : selectedTx.status === "REFUND"
                      ? "Refund"
                      : "Menunggu"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileDetailOpen(false)}
                    aria-label="Tutup detail"
                    className="lg:hidden w-7 h-7 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-2.5 text-xs pb-5 border-b border-[#F1F5F9]">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Capster</span>
                  <span className="font-semibold text-[#0F172A]">
                    {selectedTx.capsterName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Pelanggan</span>
                  <span className="font-semibold text-[#0F172A]">
                    {selectedTx.customerName}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#F1F5F9] space-y-1.5">
                  <span className="text-[#64748B] block">Layanan</span>
                  {(selectedTx.items && selectedTx.items.length > 0
                    ? selectedTx.items
                    : [
                        {
                          packageName: selectedTx.packageName,
                          packageDescription: selectedTx.packageDescription,
                          unitPrice: selectedTx.subtotal,
                          quantity: 1,
                          lineTotal: selectedTx.subtotal,
                        },
                      ]
                  ).map((it, idx) => (
                    <div
                      key={it.id ?? `${it.packageName}-${idx}`}
                      className="flex justify-between font-medium text-[#0F172A]"
                    >
                      <span>
                        {it.quantity}× {it.packageName}
                      </span>
                      <span>{formatRupiah(it.lineTotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Subtotal</span>
                  <span className="font-medium text-[#0F172A]">
                    {formatRupiah(selectedTx.subtotal)}
                  </span>
                </div>
                {selectedTx.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">
                      {selectedTx.discountLabel ?? "Diskon"}
                    </span>
                    <span className="font-medium text-[#0F172A]">
                      -{formatRupiah(selectedTx.discountAmount)}
                    </span>
                  </div>
                )}
                {(selectedTx.taxAmount ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Pajak PB1</span>
                    <span className="font-medium text-[#0F172A]">
                      {formatRupiah(selectedTx.taxAmount ?? 0)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-sm font-semibold text-[#0F172A]">Total</span>
                  <span className="text-xl font-bold text-[#0F172A]">
                    {formatRupiah(selectedTx.total)}
                  </span>
                </div>

                {selectedTx.paymentMethod === "TUNAI" && selectedTx.cashReceived != null ? (
                  <div className="pt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Tunai</span>
                      <span className="font-medium text-[#0F172A]">
                        {formatRupiah(selectedTx.cashReceived)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Kembalian</span>
                      <span className="font-medium text-[#0F172A]">
                        {formatRupiah(selectedTx.changeAmount ?? 0)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between pt-2">
                    <span className="text-[#64748B]">Metode pembayaran</span>
                    <span className="font-medium text-[#0F172A]">
                      {selectedTx.paymentMethod === "DEBIT" ? "Debit / Kartu" : "QRIS"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2.5 pt-6">
              {selectedTx.status === "MENUNGGU_PEMBAYARAN" && (
                <button
                  type="button"
                  disabled={updatingRefund}
                  onClick={() => handleSettlePending(selectedTx)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  Tandai Lunas
                </button>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(true)}
                  className="py-2.5 px-3 rounded-xl border border-[#E5E7EB] hover:bg-[#F8FAFC] flex items-center justify-center gap-2 text-xs font-semibold text-[#0F172A] cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak ulang
                </button>
                <button
                  type="button"
                  onClick={() => downloadReceiptText(selectedTx, storeInfo)}
                  className="py-2.5 px-3 rounded-xl border border-[#E5E7EB] hover:bg-[#F8FAFC] flex items-center justify-center gap-2 text-xs font-semibold text-[#0F172A] cursor-pointer"
                >
                  <CloudDownload className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>

              <button
                type="button"
                disabled={selectedTx.status === "REFUND" || updatingRefund}
                onClick={() => handleRefund(selectedTx)}
                className="w-full py-2.5 px-4 rounded-xl border border-[#FECACA] hover:bg-[#FEF2F2] flex items-center justify-center gap-2 text-xs font-semibold text-[#DC2626] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {selectedTx.status === "REFUND"
                  ? "Transaksi sudah di-refund"
                  : updatingRefund
                    ? "Memproses refund..."
                    : isManager
                      ? "Refund / void transaksi"
                      : "Refund transaksi (Perlu PIN/Password Owner)"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-[#94A3B8]">
            Pilih transaksi untuk melihat detail
          </div>
        )}
      </aside>

      {refundTargetTx && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeRefund(refundTargetTx, managerPasswordInput);
            }}
            className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Otorisasi Owner / Admin</h3>
                  <p className="text-[11px] text-[#64748B]">
                    Refund {refundTargetTx.orderCode} ({formatRupiah(refundTargetTx.total)})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRefundTargetTx(null)}
                className="w-7 h-7 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                Masukkan password akun Owner atau Admin
              </label>
              <input
                required
                type="password"
                value={managerPasswordInput}
                onChange={(e) => setManagerPasswordInput(e.target.value)}
                placeholder="Password Owner/Admin"
                className="w-full border border-[#0F172A] rounded-xl px-3.5 py-2 text-xs text-[#0F172A] focus:outline-none"
              />
            </div>

            {refundError && (
              <p className="text-xs text-[#DC2626] bg-[#FEF2F2] px-3 py-2 rounded-lg">
                {refundError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRefundTargetTx(null)}
                className="py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold text-[#0F172A] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={updatingRefund}
                className="py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold cursor-pointer"
              >
                {updatingRefund ? "Memverifikasi..." : "Konfirmasi Refund"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showReceiptModal && selectedTx && (
        <ReceiptModal
          transaction={selectedTx}
          store={storeInfo}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </>
  );
}
