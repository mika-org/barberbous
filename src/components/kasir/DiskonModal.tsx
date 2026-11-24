"use client";

import React, { useState } from "react";
import { X, Percent } from "lucide-react";
import { formatRupiah } from "@/lib/format";

export interface DiscountState {
  type: "PERCENT" | "NOMINAL" | null;
  value: number;
  amount: number;
  label: string | null;
  voucherCode: string | null;
}

interface DiskonModalProps {
  orderCode: string;
  subtotal: number;
  initialDiscount: DiscountState;
  onApply: (discount: DiscountState) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function DiskonModal({
  orderCode,
  subtotal,
  initialDiscount,
  onApply,
  onRemove,
  onClose,
}: DiskonModalProps) {
  const [tab, setTab] = useState<"PERCENT" | "NOMINAL" | "VOUCHER">(
    initialDiscount.voucherCode
      ? "VOUCHER"
      : initialDiscount.type === "NOMINAL"
      ? "NOMINAL"
      : "PERCENT"
  );
  const [percentVal, setPercentVal] = useState<string>(
    initialDiscount.type === "PERCENT" ? String(initialDiscount.value) : "10"
  );
  const [nominalVal, setNominalVal] = useState<string>(
    initialDiscount.type === "NOMINAL" ? String(initialDiscount.value) : "5000"
  );
  const [voucherCode, setVoucherCode] = useState<string>(initialDiscount.voucherCode ?? "");
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherApplied, setVoucherApplied] = useState<{
    code: string;
    label: string;
    type: "PERCENT" | "NOMINAL";
    value: number;
    amount: number;
  } | null>(
    initialDiscount.voucherCode && initialDiscount.type
      ? {
          code: initialDiscount.voucherCode,
          label: initialDiscount.label ?? initialDiscount.voucherCode,
          type: initialDiscount.type,
          value: initialDiscount.value,
          amount: initialDiscount.amount,
        }
      : null
  );
  const [checkingVoucher, setCheckingVoucher] = useState(false);

  const computePreview = (): DiscountState => {
    if (voucherApplied) {
      return {
        type: voucherApplied.type,
        value: voucherApplied.value,
        amount: voucherApplied.amount,
        label: voucherApplied.label,
        voucherCode: voucherApplied.code,
      };
    }
    if (tab === "PERCENT") {
      const pct = Math.min(100, Math.max(0, Number(percentVal) || 0));
      const amt = Math.round((subtotal * pct) / 100);
      return {
        type: pct > 0 ? "PERCENT" : null,
        value: pct,
        amount: amt,
        label: pct > 0 ? `Diskon (${pct}%)` : null,
        voucherCode: null,
      };
    }
    if (tab === "NOMINAL") {
      const nom = Math.min(subtotal, Math.max(0, Number(nominalVal) || 0));
      return {
        type: nom > 0 ? "NOMINAL" : null,
        value: nom,
        amount: nom,
        label: nom > 0 ? "Diskon nominal" : null,
        voucherCode: null,
      };
    }
    return { type: null, value: 0, amount: 0, label: null, voucherCode: null };
  };

  const preview = computePreview();
  const finalTotal = Math.max(0, subtotal - preview.amount);

  const handleCheckVoucher = async () => {
    setVoucherError(null);
    if (!voucherCode.trim()) {
      setVoucherError("Masukkan kode voucher");
      return;
    }
    setCheckingVoucher(true);
    try {
      const res = await fetch("/api/vouchers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: voucherCode.trim(), subtotal }),
      });
      const json = await res.json();
      if (!res.ok) {
        setVoucherError(json.error ?? "Kode voucher tidak valid");
        setVoucherApplied(null);
      } else {
        setVoucherApplied({
          code: json.data.code,
          label: json.data.label,
          type: json.data.discountType,
          value: json.data.discountValue,
          amount: json.data.discountAmount,
        });
      }
    } catch {
      setVoucherError("Gagal memverifikasi voucher");
    } finally {
      setCheckingVoucher(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[440px] max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">Diskon &amp; voucher</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Pesanan {orderCode}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented tabs */}
        <div className="bg-[#F4F4F5] p-1 rounded-lg grid grid-cols-3 gap-1 mt-4">
          {(
            [
              { id: "PERCENT", label: "Persen" },
              { id: "NOMINAL", label: "Nominal" },
              { id: "VOUCHER", label: "Voucher" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                if (item.id !== "VOUCHER") setVoucherApplied(null);
              }}
              className={`py-1.5 text-xs rounded-md transition cursor-pointer ${
                tab === item.id
                  ? "bg-white text-[#0F172A] font-semibold shadow-2xs"
                  : "text-[#64748B] font-medium hover:text-[#0F172A]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-4">
          {tab === "PERCENT" && (
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1.5">
                Besar diskon (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={percentVal}
                onChange={(e) => {
                  setVoucherApplied(null);
                  setPercentVal(e.target.value);
                }}
                className="w-full border-[1.5px] border-[#0F172A] rounded-xl px-4 py-2.5 text-lg font-semibold text-[#0F172A] focus:outline-none"
              />
              <div className="grid grid-cols-4 gap-2 mt-2.5">
                {[5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setVoucherApplied(null);
                      setPercentVal(String(pct));
                    }}
                    className={`py-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                      Number(percentVal) === pct && !voucherApplied
                        ? "border-[#0F172A] bg-[#F8FAFC] text-[#0F172A] font-semibold"
                        : "border-[#E5E7EB] text-[#475569] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "NOMINAL" && (
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1.5">
                Besar diskon (Rp)
              </label>
              <input
                type="number"
                min={0}
                max={subtotal}
                step={1000}
                value={nominalVal}
                onChange={(e) => {
                  setVoucherApplied(null);
                  setNominalVal(e.target.value);
                }}
                className="w-full border-[1.5px] border-[#0F172A] rounded-xl px-4 py-2.5 text-lg font-semibold text-[#0F172A] focus:outline-none"
              />
              <div className="grid grid-cols-4 gap-2 mt-2.5">
                {[5000, 10000, 15000, 20000].map((nom) => (
                  <button
                    key={nom}
                    type="button"
                    onClick={() => {
                      setVoucherApplied(null);
                      setNominalVal(String(nom));
                    }}
                    className={`py-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                      Number(nominalVal) === nom && !voucherApplied
                        ? "border-[#0F172A] bg-[#F8FAFC] text-[#0F172A] font-semibold"
                        : "border-[#E5E7EB] text-[#475569] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {formatRupiah(nom)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Voucher code section */}
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1.5">
              Kode voucher
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                placeholder="Masukkan kode (mis. MEMBER10)"
                className="flex-1 border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A]"
              />
              <button
                type="button"
                disabled={checkingVoucher}
                onClick={handleCheckVoucher}
                className="px-4 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] cursor-pointer disabled:opacity-50"
              >
                {checkingVoucher ? "..." : "Terapkan"}
              </button>
            </div>
            {voucherError && (
              <p className="text-[11px] text-[#DC2626] mt-1">{voucherError}</p>
            )}
          </div>

          {preview.amount > 0 && (
            <div className="bg-[#ECFDF5] border border-[#BBF7D0] rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs font-medium text-[#15803D]">
              <div className="flex items-center gap-2">
                <Percent className="w-3.5 h-3.5" />
                <span>{preview.label}</span>
              </div>
              <span className="font-semibold">-{formatRupiah(preview.amount)}</span>
            </div>
          )}

          <div className="border-t border-[#E5E7EB] pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-[#64748B]">
              <span>Subtotal</span>
              <span className="text-[#0F172A] font-medium">{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#64748B]">
              <span>Diskon</span>
              <span className="text-[#15803D] font-medium">
                {preview.amount > 0 ? `-${formatRupiah(preview.amount)}` : "Rp0"}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1.5 text-sm font-bold text-[#0F172A]">
              <span>Total setelah diskon</span>
              <span className="text-base">{formatRupiah(finalTotal)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                onRemove();
                onClose();
              }}
              className="py-2.5 rounded-xl border border-[#FECACA] bg-white hover:bg-[#FEF2F2] text-xs font-semibold text-[#DC2626] cursor-pointer"
            >
              Hapus diskon
            </button>
            <button
              type="button"
              onClick={() => {
                onApply(preview);
                onClose();
              }}
              className="py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-xs font-semibold text-white cursor-pointer"
            >
              Terapkan diskon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
