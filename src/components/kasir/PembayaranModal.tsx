"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { X, Banknote, QrCode, RefreshCw, Check, Clock } from "lucide-react";
import { formatRupiah } from "@/lib/format";

interface PembayaranModalProps {
  orderCode: string;
  customerName: string;
  capsterName: string;
  totalQty: number;
  subtotal: number;
  discountAmount: number;
  discountLabel: string | null;
  taxAmount: number;
  serviceFeeAmount: number;
  total: number;
  tunaiEnabled: boolean;
  qrisEnabled: boolean;
  qrisMerchantName: string;
  onConfirmPayment: (payload: {
    paymentMethod: "TUNAI" | "QRIS";
    cashReceived?: number;
    status: "SELESAI" | "MENUNGGU_PEMBAYARAN";
  }) => Promise<void>;
  onClose: () => void;
}

export function PembayaranModal({
  orderCode,
  customerName,
  capsterName,
  totalQty,
  subtotal,
  discountAmount,
  discountLabel,
  taxAmount,
  serviceFeeAmount,
  total,
  tunaiEnabled,
  qrisEnabled,
  qrisMerchantName,
  onConfirmPayment,
  onClose,
}: PembayaranModalProps) {
  const [method, setMethod] = useState<"TUNAI" | "QRIS">(tunaiEnabled ? "TUNAI" : "QRIS");
  const [cashInput, setCashInput] = useState<string>(String(total));
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrNonce, setQrNonce] = useState<number>(1);
  const [secondsLeft, setSecondsLeft] = useState<number>(300);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (method !== "QRIS") return;
    const payload = `00020101021226590016ID.BARBERBOUS.POS0118${orderCode}0210${total}5802ID5915${qrisMerchantName}6304${qrNonce}`;
    QRCode.toDataURL(payload, {
      width: 220,
      margin: 1,
      color: { dark: "#0F172A", light: "#FFFFFF" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [method, orderCode, total, qrisMerchantName, qrNonce]);

  useEffect(() => {
    if (method !== "QRIS") return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [method]);

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");

  const cashNumeric = Number(cashInput) || 0;
  const isCashEnough = cashNumeric >= total;
  const changeAmount = cashNumeric - total;

  const handleSubmit = async (status: "SELESAI" | "MENUNGGU_PEMBAYARAN") => {
    setError(null);
    if (method === "TUNAI" && !isCashEnough) {
      setError("Nominal tunai masih kurang dari total tagihan");
      return;
    }
    setSubmitting(true);
    try {
      await onConfirmPayment({
        paymentMethod: method,
        cashReceived: method === "TUNAI" ? cashNumeric : undefined,
        status,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal memproses pembayaran");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[740px] max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">Pembayaran</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Pesanan {orderCode} · {customerName} · Capster {capsterName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 mt-5">
          {/* Left summary card */}
          <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-4 flex flex-col justify-between">
            <div>
              <p className="text-xs text-[#64748B]">Total tagihan</p>
              <p className="text-2xl font-bold text-[#0F172A] mt-1">{formatRupiah(total)}</p>

              <div className="mt-5 pt-4 border-t border-[#E5E7EB] space-y-2.5 text-xs">
                <div className="flex justify-between text-[#64748B]">
                  <span>Subtotal ({totalQty} layanan)</span>
                  <span className="text-[#0F172A] font-medium">{formatRupiah(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#64748B]">
                    <span>{discountLabel ?? "Diskon"}</span>
                    <span className="text-[#15803D] font-medium">
                      -{formatRupiah(discountAmount)}
                    </span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between text-[#64748B]">
                    <span>Pajak PB1</span>
                    <span className="text-[#0F172A] font-medium">{formatRupiah(taxAmount)}</span>
                  </div>
                )}
                {serviceFeeAmount > 0 && (
                  <div className="flex justify-between text-[#64748B]">
                    <span>Biaya layanan</span>
                    <span className="text-[#0F172A] font-medium">
                      {formatRupiah(serviceFeeAmount)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E5E7EB] space-y-2 text-xs">
              <div className="flex justify-between text-[#64748B]">
                <span>Metode</span>
                <span className="text-[#0F172A] font-medium">
                  {method === "QRIS" ? "QRIS" : "Tunai"}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#64748B]">
                <span>Status</span>
                <span className="text-[#D97706] font-semibold">Menunggu pembayaran</span>
              </div>
            </div>
          </div>

          {/* Right payment method panel */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={!tunaiEnabled}
                  onClick={() => setMethod("TUNAI")}
                  className={`py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition cursor-pointer disabled:opacity-40 ${
                    method === "TUNAI"
                      ? "bg-[#0F172A] text-white"
                      : "bg-white border border-[#E5E7EB] text-[#0F172A] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  Tunai
                </button>
                <button
                  type="button"
                  disabled={!qrisEnabled}
                  onClick={() => setMethod("QRIS")}
                  className={`py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition cursor-pointer disabled:opacity-40 ${
                    method === "QRIS"
                      ? "bg-[#0F172A] text-white"
                      : "bg-white border border-[#E5E7EB] text-[#0F172A] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  QRIS
                </button>
              </div>

              {method === "QRIS" ? (
                <div className="flex flex-col items-center text-center mt-5">
                  <div className="p-3 bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="QRIS Code"
                        className="w-[175px] h-[175px] block"
                      />
                    ) : (
                      <div className="w-[175px] h-[175px] bg-[#F1F5F9] animate-pulse rounded-lg" />
                    )}
                  </div>
                  <p className="text-xs text-[#64748B] mt-3">
                    Scan dengan e-wallet atau mobile banking
                  </p>
                  <p className="text-lg font-bold text-[#0F172A] mt-0.5">{formatRupiah(total)}</p>

                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                    {["GoPay", "OVO", "DANA", "ShopeePay", "m-Banking"].map((w) => (
                      <span
                        key={w}
                        className="px-2.5 py-1 rounded-md bg-[#F8FAFC] border border-[#E5E7EB] text-[10px] font-medium text-[#475569]"
                      >
                        {w}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3.5 flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FEF3C7] text-[#B45309] text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                      Menunggu · {mins}:{secs}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setQrNonce((n) => n + 1);
                        setSecondsLeft(300);
                      }}
                      className="px-3 py-1.5 rounded-full border border-[#E5E7EB] hover:bg-[#F8FAFC] text-xs font-medium text-[#0F172A] flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Buat ulang QR
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#64748B] mb-1.5">
                      Nominal uang diterima (Rp)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={cashInput}
                      onChange={(e) => setCashInput(e.target.value)}
                      className="w-full border-[1.5px] border-[#0F172A] rounded-xl px-4 py-3 text-xl font-bold text-[#0F172A] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: "Uang pas", val: total },
                      { label: "Rp50.000", val: 50000 },
                      { label: "Rp100.000", val: 100000 },
                      { label: "Rp200.000", val: 200000 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setCashInput(String(preset.val))}
                        className={`py-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                          cashNumeric === preset.val
                            ? "border-[#0F172A] bg-[#F8FAFC] text-[#0F172A] font-semibold"
                            : "border-[#E5E7EB] text-[#475569] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-4 flex items-center justify-between">
                    <span className="text-xs font-medium text-[#64748B]">
                      {isCashEnough ? "Kembalian" : "Nominal kurang"}
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        isCashEnough ? "text-[#15803D]" : "text-[#DC2626]"
                      }`}
                    >
                      {formatRupiah(Math.abs(changeAmount))}
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs text-[#DC2626] mt-3 text-center font-medium">{error}</p>
              )}
            </div>

            {method === "QRIS" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-6">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmit("MENUNGGU_PEMBAYARAN")}
                  className="py-2.5 px-4 rounded-xl border border-[#E5E7EB] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Clock className="w-3.5 h-3.5 text-[#D97706]" />
                  Simpan Menunggu Bayar
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmit("SELESAI")}
                  className="py-2.5 px-4 rounded-xl bg-[#15803D] hover:bg-[#166534] text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Check className="w-3.5 h-3.5" />
                  {submitting ? "Memproses..." : "Konfirmasi Lunas"}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 rounded-xl border border-[#E5E7EB] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={submitting || !isCashEnough}
                  onClick={() => handleSubmit("SELESAI")}
                  className="py-2.5 px-4 rounded-xl bg-[#15803D] hover:bg-[#166534] text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  {submitting ? "Menyimpan..." : "Selesaikan Pembayaran"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
