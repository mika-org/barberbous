"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  X,
  Banknote,
  QrCode,
  CreditCard,
  ChevronRight,
  Check,
  Printer,
  MessageCircle,
  Clock,
} from "lucide-react";
import { formatDateShort, formatRupiah, formatTimeHHMM } from "@/lib/format";
import {
  downloadReceiptText,
  ReceiptModal,
  type ReceiptStoreInfo,
  type ReceiptTransaction,
} from "../ReceiptModal";

type Step = "SELECT_METHOD" | "TUNAI" | "QRIS" | "DEBIT" | "SUCCESS";

interface PembayaranModalProps {
  orderCode: string;
  customerName: string;
  customerPhone?: string | null;
  capsterName: string;
  totalQty: number;
  total: number;
  tunaiEnabled: boolean;
  qrisEnabled: boolean;
  debitEnabled: boolean;
  qrisMerchantName: string;
  storeInfo: ReceiptStoreInfo;
  onConfirmPayment: (payload: {
    paymentMethod: "TUNAI" | "QRIS" | "DEBIT";
    cashReceived?: number;
    status: "SELESAI" | "MENUNGGU_PEMBAYARAN";
  }) => Promise<ReceiptTransaction>;
  onStartNewTransaction: () => void;
  onClose: () => void;
}

export function PembayaranModal({
  orderCode,
  customerName,
  customerPhone,
  capsterName,
  totalQty,
  total,
  tunaiEnabled,
  qrisEnabled,
  debitEnabled,
  qrisMerchantName,
  storeInfo,
  onConfirmPayment,
  onStartNewTransaction,
  onClose,
}: PembayaranModalProps) {
  const [step, setStep] = useState<Step>("SELECT_METHOD");
  const [cashInput, setCashInput] = useState<string>(String(Math.max(total, 50000)));
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [secondsLeft, setSecondsLeft] = useState<number>(299);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedTx, setCompletedTx] = useState<ReceiptTransaction | null>(null);
  const [showPrintReceipt, setShowPrintReceipt] = useState(false);
  const [waFeedback, setWaFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (step !== "QRIS") return;
    const payload = `00020101021226590016ID.BARBERBOUS.POS0118${orderCode}0210${total}5802ID5915${qrisMerchantName}6304`;
    QRCode.toDataURL(payload, {
      width: 220,
      margin: 1,
      color: { dark: "#0F172A", light: "#FFFFFF" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [step, orderCode, total, qrisMerchantName]);

  useEffect(() => {
    if (step !== "QRIS") return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");

  const cashNumeric = Number(cashInput.replace(/\D/g, "")) || 0;
  const isCashEnough = cashNumeric >= total;
  const changeAmount = cashNumeric - total;

  const submitMethod = async (
    paymentMethod: "TUNAI" | "QRIS" | "DEBIT",
    status: "SELESAI" | "MENUNGGU_PEMBAYARAN"
  ) => {
    setError(null);
    if (paymentMethod === "TUNAI" && !isCashEnough) {
      setError("Nominal tunai masih kurang dari total tagihan");
      return;
    }
    setSubmitting(true);
    try {
      const saved = await onConfirmPayment({
        paymentMethod,
        cashReceived: paymentMethod === "TUNAI" ? cashNumeric : undefined,
        status,
      });
      setCompletedTx(saved);
      setStep("SUCCESS");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal memproses pembayaran");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!completedTx) return;
    const lines = [
      `*${storeInfo.storeName}* — Struk Digital`,
      `Pesanan: ${completedTx.orderCode}`,
      `Pelanggan: ${completedTx.customerName}`,
      ...(completedTx.capsterName && completedTx.capsterName !== "-"
        ? [`Capster: ${completedTx.capsterName}`]
        : []),
      ...(completedTx.items && completedTx.items.length > 0
        ? completedTx.items.map(
            (it) =>
              `- ${it.itemType === "DRINK" ? it.packageName : `Paket ${it.packageName}`} ×${it.quantity}: ${formatRupiah(it.lineTotal)}`
          )
        : [`- ${completedTx.packageName}: ${formatRupiah(completedTx.subtotal)}`]),
      `*Total: ${formatRupiah(completedTx.total)}* (${completedTx.paymentMethod})`,
      storeInfo.receiptFooter,
    ].join("\n");

    const cleanPhone = customerPhone?.replace(/\D/g, "") ?? "";
    const waPhone = cleanPhone.startsWith("0")
      ? `62${cleanPhone.slice(1)}`
      : cleanPhone;

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(lines).catch(() => {});
    }
    if (waPhone) {
      window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(lines)}`, "_blank");
      setWaFeedback("Membuka WhatsApp pelanggan...");
    } else {
      setWaFeedback("Teks struk disalin ke clipboard (siap kirim WA)");
    }
    setTimeout(() => setWaFeedback(null), 3000);
  };

  if (showPrintReceipt && completedTx) {
    return (
      <ReceiptModal
        transaction={completedTx}
        store={storeInfo}
        onClose={() => {
          setShowPrintReceipt(false);
          onStartNewTransaction();
        }}
        primaryActionLabel="Transaksi baru"
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[440px] max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Step 1: Pilih Metode */}
        {step === "SELECT_METHOD" && (
          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A]">Pembayaran</h2>
                <p className="text-xs text-[#64748B] mt-0.5">Pilih metode pembayaran</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#64748B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#F8FAFC] border border-[#F1F5F9] rounded-xl px-4 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-[#64748B]">Total tagihan</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Pesanan {orderCode} · {totalQty} item · {customerName}
                </p>
              </div>
              <p className="text-xl font-bold text-[#0F172A] tabular-nums">
                {formatRupiah(total)}
              </p>
            </div>

            <div className="space-y-2.5">
              {tunaiEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    setCashInput(String(total));
                    setStep("TUNAI");
                  }}
                  className="w-full flex items-center justify-between gap-3 border border-[#E5E7EB] hover:border-[#0F172A] hover:bg-[#FAFAFA] rounded-xl px-4 py-3.5 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#F4F4F5] flex items-center justify-center text-[#0F172A] shrink-0">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">Tunai</p>
                      <p className="text-xs text-[#64748B]">Terima uang tunai di kasir</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
                </button>
              )}

              {qrisEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    setSecondsLeft(299);
                    setStep("QRIS");
                  }}
                  className="w-full flex items-center justify-between gap-3 border border-[#E5E7EB] hover:border-[#0F172A] hover:bg-[#FAFAFA] rounded-xl px-4 py-3.5 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#F4F4F5] flex items-center justify-center text-[#0F172A] shrink-0">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">QRIS</p>
                      <p className="text-xs text-[#64748B]">Scan dari e-wallet atau m-banking</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
                </button>
              )}

              {debitEnabled && (
                <button
                  type="button"
                  onClick={() => setStep("DEBIT")}
                  className="w-full flex items-center justify-between gap-3 border border-[#E5E7EB] hover:border-[#0F172A] hover:bg-[#FAFAFA] rounded-xl px-4 py-3.5 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#F4F4F5] flex items-center justify-center text-[#0F172A] shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">Debit / Kartu</p>
                      <p className="text-xs text-[#64748B]">Gesek di mesin EDC</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-[#E5E7EB] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] cursor-pointer"
            >
              Batal
            </button>
          </div>
        )}

        {/* Step 2a: Tunai */}
        {step === "TUNAI" && (
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A]">Pembayaran Tunai</h2>
                <p className="text-xs text-[#64748B] mt-0.5">Masukkan uang yang diterima</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#64748B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#F8FAFC] border border-[#F1F5F9] rounded-xl px-4 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-[#64748B]">Total tagihan</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Pesanan {orderCode} · {totalQty} item · {customerName}
                </p>
              </div>
              <p className="text-xl font-bold text-[#0F172A] tabular-nums">
                {formatRupiah(total)}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#64748B] mb-1.5">
                Uang diterima
              </label>
              <div className="flex items-center border-2 border-[#0F172A] rounded-xl px-3.5 py-2.5 bg-white">
                <span className="text-sm font-semibold text-[#64748B] mr-2">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cashNumeric ? cashNumeric.toLocaleString("id-ID") : ""}
                  onChange={(e) => setCashInput(e.target.value.replace(/\D/g, ""))}
                  className="w-full text-lg font-bold text-[#0F172A] focus:outline-none tabular-nums"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Uang pas", val: total },
                { label: "Rp50.000", val: 50000 },
                { label: "Rp100.000", val: 100000 },
              ].map((preset) => {
                const isActive = cashNumeric === preset.val;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setCashInput(String(preset.val))}
                    className={`py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? "bg-[#0F172A] text-white border-[#0F172A]"
                        : "bg-white text-[#0F172A] border-[#E5E7EB] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div
              className={`rounded-xl px-4 py-3 flex items-center justify-between text-xs font-semibold ${
                isCashEnough
                  ? "bg-[#F0FDF4] text-[#15803D]"
                  : "bg-[#FEF2F2] text-[#DC2626]"
              }`}
            >
              <span>{isCashEnough ? "Kembalian" : "Kurang"}</span>
              <span className="text-sm font-bold tabular-nums">
                {formatRupiah(Math.abs(changeAmount))}
              </span>
            </div>

            {error && (
              <p className="text-xs text-[#DC2626] bg-[#FEF2F2] px-3 py-2 rounded-lg">{error}</p>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setStep("SELECT_METHOD")}
                className="py-2.5 rounded-xl border border-[#E5E7EB] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={submitting || !isCashEnough}
                onClick={() => submitMethod("TUNAI", "SELESAI")}
                className="py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {submitting ? "Menyimpan..." : "Konfirmasi pembayaran"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2b: QRIS */}
        {step === "QRIS" && (
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A]">Pembayaran QRIS</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Minta pelanggan scan kode di bawah
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#64748B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#F8FAFC] border border-[#F1F5F9] rounded-xl px-4 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-[#64748B]">Total tagihan</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Pesanan {orderCode} · {totalQty} item · {customerName}
                </p>
              </div>
              <p className="text-xl font-bold text-[#0F172A] tabular-nums">
                {formatRupiah(total)}
              </p>
            </div>

            <div className="flex flex-col items-center py-2">
              <div className="p-3 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Kode QRIS" className="w-44 h-44 object-contain" />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-xs text-[#94A3B8]">
                    Memuat QR...
                  </div>
                )}
              </div>
              <p className="text-xs text-[#64748B] mt-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B] inline-block" />
                Menunggu pembayaran · berlaku {mins}:{secs}
              </p>
            </div>

            {error && (
              <p className="text-xs text-[#DC2626] bg-[#FEF2F2] px-3 py-2 rounded-lg">{error}</p>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setStep("SELECT_METHOD")}
                className="py-2.5 rounded-xl border border-[#E5E7EB] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] cursor-pointer"
              >
                Ganti metode
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => submitMethod("QRIS", "SELESAI")}
                className="py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {submitting ? "Memproses..." : "Pembayaran diterima"}
              </button>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={() => submitMethod("QRIS", "MENUNGGU_PEMBAYARAN")}
              className="w-full py-2 text-[11px] font-medium text-[#64748B] hover:text-[#0F172A] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3 h-3" />
              Simpan sebagai Menunggu Pembayaran
            </button>
          </div>
        )}

        {/* Step 2c: Debit / Kartu */}
        {step === "DEBIT" && (
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A]">Pembayaran Debit / Kartu</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Gesek atau tap kartu pada mesin EDC
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#64748B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#F8FAFC] border border-[#F1F5F9] rounded-xl px-4 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-[#64748B]">Total tagihan</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Pesanan {orderCode} · {totalQty} item · {customerName}
                </p>
              </div>
              <p className="text-xl font-bold text-[#0F172A] tabular-nums">
                {formatRupiah(total)}
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-5 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#E5E7EB] mx-auto flex items-center justify-center text-[#0F172A]">
                <CreditCard className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-[#0F172A]">
                Mesin EDC siap menerima pembayaran
              </p>
              <p className="text-[11px] text-[#64748B]">
                Pastikan nominal pada layar EDC sudah sesuai ({formatRupiah(total)})
              </p>
            </div>

            {error && (
              <p className="text-xs text-[#DC2626] bg-[#FEF2F2] px-3 py-2 rounded-lg">{error}</p>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setStep("SELECT_METHOD")}
                className="py-2.5 rounded-xl border border-[#E5E7EB] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] cursor-pointer"
              >
                Ganti metode
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => submitMethod("DEBIT", "SELESAI")}
                className="py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {submitting ? "Menyimpan..." : "Pembayaran diterima"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Pembayaran berhasil */}
        {step === "SUCCESS" && completedTx && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col items-center text-center pt-1">
              <div className="w-12 h-12 rounded-full bg-[#DCFCE7] flex items-center justify-center text-[#15803D] mb-3">
                <Check className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <h2 className="text-lg font-bold text-[#0F172A]">
                {completedTx.status === "MENUNGGU_PEMBAYARAN"
                  ? "Transaksi tersimpan"
                  : "Pembayaran berhasil"}
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                {completedTx.paymentMethod === "TUNAI"
                  ? "Tunai"
                  : completedTx.paymentMethod === "DEBIT"
                    ? "Debit / Kartu"
                    : "QRIS"}{" "}
                · {formatDateShort(completedTx.createdAt)} · {formatTimeHHMM(completedTx.createdAt)}
              </p>
            </div>

            <div className="bg-[#FAFAFA] border border-[#F1F5F9] rounded-xl p-4 space-y-2 text-xs">
              {(completedTx.items && completedTx.items.length > 0
                ? completedTx.items
                : [
                    {
                      packageName: completedTx.packageName,
                      itemType: "PACKAGE" as const,
                      quantity: 1,
                      lineTotal: completedTx.subtotal,
                    },
                  ]
              ).map((it, idx) => (
                <div key={idx} className="flex items-center justify-between text-[#0F172A]">
                  <span>
                    {it.itemType === "DRINK"
                      ? `${it.packageName} ×${it.quantity}`
                      : `Paket ${it.packageName}${capsterName && capsterName !== "-" ? ` · ${capsterName}` : ""}${it.quantity > 1 ? ` ×${it.quantity}` : ""}`}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatRupiah(it.lineTotal)}
                  </span>
                </div>
              ))}

              {completedTx.discountAmount > 0 && (
                <div className="flex items-center justify-between text-[#15803D]">
                  <span>{completedTx.discountLabel ?? "Diskon"}</span>
                  <span className="tabular-nums">-{formatRupiah(completedTx.discountAmount)}</span>
                </div>
              )}

              <div className="border-t border-[#E5E7EB] pt-2 mt-2 space-y-1">
                <div className="flex items-center justify-between font-bold text-[#0F172A]">
                  <span>Total</span>
                  <span className="tabular-nums">{formatRupiah(completedTx.total)}</span>
                </div>
                {completedTx.paymentMethod === "TUNAI" && completedTx.cashReceived != null && (
                  <>
                    <div className="flex items-center justify-between text-[#64748B]">
                      <span>Tunai</span>
                      <span className="tabular-nums">{formatRupiah(completedTx.cashReceived)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[#64748B]">
                      <span>Kembalian</span>
                      <span className="tabular-nums">
                        {formatRupiah(completedTx.changeAmount ?? 0)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {waFeedback && (
              <p className="text-[11px] text-center text-[#15803D] font-medium bg-[#F0FDF4] py-1.5 rounded-lg">
                {waFeedback}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  downloadReceiptText(completedTx, storeInfo);
                  setShowPrintReceipt(true);
                }}
                className="flex items-center justify-center gap-1.5 border border-[#E5E7EB] hover:bg-[#F8FAFC] rounded-xl py-2.5 text-xs font-semibold text-[#0F172A] cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak struk
              </button>
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="flex items-center justify-center gap-1.5 border border-[#E5E7EB] hover:bg-[#F8FAFC] rounded-xl py-2.5 text-xs font-semibold text-[#0F172A] cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Kirim WhatsApp
              </button>
            </div>

            <button
              type="button"
              onClick={onStartNewTransaction}
              className="w-full py-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold cursor-pointer"
            >
              Transaksi baru
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
