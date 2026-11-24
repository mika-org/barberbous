"use client";

import React from "react";
import { X, Printer, Download } from "lucide-react";
import { formatDateShort, formatRupiah, formatTimeHHMM } from "@/lib/format";

export interface ReceiptTransaction {
  orderCode: string;
  createdAt: string;
  orderType: "WALK_IN" | "BOOKING";
  customerName: string;
  packageName: string;
  packageDescription: string;
  capsterName: string;
  subtotal: number;
  discountAmount: number;
  discountLabel?: string | null;
  taxAmount?: number;
  serviceFeeAmount?: number;
  total: number;
  paymentMethod: "TUNAI" | "QRIS";
  cashReceived?: number | null;
  changeAmount?: number | null;
  cashierName: string;
  status: string;
}

export interface ReceiptStoreInfo {
  storeName: string;
  address: string;
  phone: string;
  paperSize: string;
  receiptFooter: string;
}

export function downloadReceiptText(tx: ReceiptTransaction, store: ReceiptStoreInfo) {
  const lines = [
    store.storeName,
    store.address,
    `Telp: ${store.phone}`,
    "--------------------------------",
    `No. Pesanan : ${tx.orderCode}`,
    `Tanggal     : ${formatDateShort(tx.createdAt)} ${formatTimeHHMM(tx.createdAt)}`,
    `Kasir       : ${tx.cashierName}`,
    `Pelanggan   : ${tx.customerName}`,
    `Capster     : ${tx.capsterName}`,
    "--------------------------------",
    `Paket ${tx.packageName}`,
    `  ${tx.packageDescription}`,
    `  Subtotal  : ${formatRupiah(tx.subtotal)}`,
  ];

  if (tx.discountAmount > 0) {
    lines.push(`${tx.discountLabel ?? "Diskon"} : -${formatRupiah(tx.discountAmount)}`);
  }
  if ((tx.taxAmount ?? 0) > 0) {
    lines.push(`Pajak PB1   : ${formatRupiah(tx.taxAmount ?? 0)}`);
  }
  if ((tx.serviceFeeAmount ?? 0) > 0) {
    lines.push(`Biaya lay.  : ${formatRupiah(tx.serviceFeeAmount ?? 0)}`);
  }

  lines.push("--------------------------------");
  lines.push(`TOTAL       : ${formatRupiah(tx.total)}`);
  lines.push(`Metode      : ${tx.paymentMethod}`);
  if (tx.paymentMethod === "TUNAI" && tx.cashReceived != null) {
    lines.push(`Tunai       : ${formatRupiah(tx.cashReceived)}`);
    lines.push(`Kembalian   : ${formatRupiah(tx.changeAmount ?? 0)}`);
  }
  lines.push("--------------------------------");
  lines.push(store.receiptFooter);

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `struk-${tx.orderCode.replace("#", "")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReceiptModal({
  transaction,
  store,
  onClose,
}: {
  transaction: ReceiptTransaction;
  store: ReceiptStoreInfo;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">Struk Transaksi</h3>
            <p className="text-xs text-[#64748B]">
              {transaction.orderCode} · Kertas {store.paperSize}
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

        <div id="printable-receipt" className="p-6 font-mono text-xs text-[#0F172A] space-y-3 bg-[#FAFAFA]">
          <div className="text-center space-y-0.5">
            <p className="text-sm font-bold tracking-wider">{store.storeName}</p>
            <p className="text-[11px] text-[#64748B]">{store.address}</p>
            <p className="text-[11px] text-[#64748B]">Telp: {store.phone}</p>
          </div>

          <div className="border-t border-dashed border-[#CBD5E1] pt-2.5 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Pesanan</span>
              <span className="font-semibold">{transaction.orderCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Waktu</span>
              <span>
                {formatDateShort(transaction.createdAt)} · {formatTimeHHMM(transaction.createdAt)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Capster</span>
              <span>{transaction.capsterName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Pelanggan</span>
              <span>{transaction.customerName}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-[#CBD5E1] pt-2.5 space-y-1">
            <div className="flex justify-between font-semibold">
              <span>Paket {transaction.packageName}</span>
              <span>{formatRupiah(transaction.subtotal)}</span>
            </div>
            <p className="text-[10px] text-[#64748B]">{transaction.packageDescription}</p>
          </div>

          <div className="border-t border-dashed border-[#CBD5E1] pt-2.5 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Subtotal</span>
              <span>{formatRupiah(transaction.subtotal)}</span>
            </div>
            {transaction.discountAmount > 0 && (
              <div className="flex justify-between text-[#15803D]">
                <span>{transaction.discountLabel ?? "Diskon"}</span>
                <span>-{formatRupiah(transaction.discountAmount)}</span>
              </div>
            )}
            {(transaction.taxAmount ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-[#64748B]">Pajak PB1</span>
                <span>{formatRupiah(transaction.taxAmount ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-[#E5E7EB]">
              <span>Total</span>
              <span>{formatRupiah(transaction.total)}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-[#64748B]">Metode</span>
              <span>{transaction.paymentMethod}</span>
            </div>
            {transaction.paymentMethod === "TUNAI" && transaction.cashReceived != null && (
              <>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Tunai</span>
                  <span>{formatRupiah(transaction.cashReceived)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Kembalian</span>
                  <span>{formatRupiah(transaction.changeAmount ?? 0)}</span>
                </div>
              </>
            )}
          </div>

          <p className="text-center text-[11px] text-[#64748B] border-t border-dashed border-[#CBD5E1] pt-3">
            {store.receiptFooter}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 p-4 border-t border-[#E5E7EB] bg-white">
          <button
            type="button"
            onClick={() => downloadReceiptText(transaction, store)}
            className="flex items-center justify-center gap-2 border border-[#E5E7EB] hover:bg-[#F8FAFC] rounded-xl py-2.5 text-xs font-semibold text-[#0F172A] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 bg-[#0F172A] hover:bg-[#1E293B] rounded-xl py-2.5 text-xs font-semibold text-white cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak struk
          </button>
        </div>
      </div>
    </div>
  );
}
