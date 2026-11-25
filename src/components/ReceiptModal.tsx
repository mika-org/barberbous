"use client";

import React from "react";
import { X, Printer, Download, CheckCircle2, Clock } from "lucide-react";
import { formatDateShort, formatRupiah, formatTimeHHMM } from "@/lib/format";

export interface ReceiptLineItem {
  id?: string;
  itemType?: "PACKAGE" | "DRINK";
  packageName: string;
  packageDescription: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

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
  paymentMethod: "TUNAI" | "QRIS" | "DEBIT";
  cashReceived?: number | null;
  changeAmount?: number | null;
  cashierName: string;
  status: string;
  items?: ReceiptLineItem[];
}

export interface ReceiptStoreInfo {
  storeName: string;
  address: string;
  phone: string;
  paperSize: string;
  receiptFooter: string;
}

export function downloadReceiptText(tx: ReceiptTransaction, store: ReceiptStoreInfo) {
  const itemLines =
    tx.items && tx.items.length > 0
      ? tx.items.flatMap((it) => [
          `Paket ${it.packageName} (${it.quantity}x @ ${formatRupiah(it.unitPrice)})`,
          `  ${it.packageDescription}`,
          `  Subtotal  : ${formatRupiah(it.lineTotal)}`,
        ])
      : [
          `Paket ${tx.packageName}`,
          `  ${tx.packageDescription}`,
          `  Subtotal  : ${formatRupiah(tx.subtotal)}`,
        ];

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
    ...itemLines,
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
  lines.push(`Status      : ${tx.status === "SELESAI" ? "LUNAS" : tx.status}`);
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
  primaryActionLabel = "Selesai",
}: {
  transaction: ReceiptTransaction;
  store: ReceiptStoreInfo;
  onClose: () => void;
  primaryActionLabel?: string;
}) {
  const isPending = transaction.status === "MENUNGGU_PEMBAYARAN";
  const displayItems: ReceiptLineItem[] =
    transaction.items && transaction.items.length > 0
      ? transaction.items
      : [
          {
            packageName: transaction.packageName,
            packageDescription: transaction.packageDescription,
            unitPrice: transaction.subtotal,
            quantity: 1,
            lineTotal: transaction.subtotal,
          },
        ];

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2.5">
            {isPending ? (
              <Clock className="w-5 h-5 text-[#D97706] shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0" />
            )}
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                {isPending ? "Menunggu Pembayaran" : "Transaksi Berhasil"}
              </h3>
              <p className="text-xs text-[#64748B]">
                {transaction.orderCode} · Kertas {store.paperSize}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          id="printable-receipt"
          className="p-6 font-mono text-xs text-[#0F172A] space-y-3 bg-[#FAFAFA] overflow-y-auto"
        >
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

          <div className="border-t border-dashed border-[#CBD5E1] pt-2.5 space-y-2">
            {displayItems.map((it, idx) => (
              <div key={it.id ?? `${it.packageName}-${idx}`}>
                <div className="flex justify-between font-semibold">
                  <span>
                    {it.quantity}× {it.itemType === "DRINK" ? it.packageName : `Paket ${it.packageName}`}
                  </span>
                  <span>{formatRupiah(it.lineTotal)}</span>
                </div>
                <p className="text-[10px] text-[#64748B]">{it.packageDescription}</p>
              </div>
            ))}
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

        <div className="p-4 border-t border-[#E5E7EB] bg-white space-y-2">
          <div className="grid grid-cols-2 gap-2.5">
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
              className="flex items-center justify-center gap-2 border border-[#E5E7EB] hover:bg-[#F8FAFC] rounded-xl py-2.5 text-xs font-semibold text-[#0F172A] cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak struk
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold cursor-pointer"
          >
            {primaryActionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
