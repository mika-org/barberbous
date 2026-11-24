"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  Box,
  Scissors,
  Trash2,
  User,
  Percent,
  Pencil,
  Check,
  Plus,
} from "lucide-react";
import { formatDateHeader, formatRupiah, getInitials } from "@/lib/format";
import { DiskonModal, type DiscountState } from "./DiskonModal";
import { PembayaranModal } from "./PembayaranModal";
import { BookingAddModal } from "./BookingAddModal";
import { ReceiptModal, type ReceiptStoreInfo, type ReceiptTransaction } from "../ReceiptModal";

export interface PosPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  badgeColor: string;
}

export interface PosCapster {
  id: string;
  name: string;
  photoUrl: string | null;
  bgColor: string;
}

export interface PosBooking {
  id: string;
  customerName: string;
  isMember: boolean;
  scheduledTime: string;
  status: "HADIR" | "MENUNGGU" | "SELESAI" | "BATAL";
  packageId: string;
  capsterId: string;
  package: PosPackage;
  capster: PosCapster;
}

export interface PosStoreSetting extends ReceiptStoreInfo {
  taxEnabled: boolean;
  taxRate: number;
  serviceFeeEnabled: boolean;
  serviceFeeAmount: number;
  priceIncludesTax: boolean;
  tunaiEnabled: boolean;
  qrisEnabled: boolean;
  qrisMerchantName: string;
}

interface KasirClientProps {
  initialPackages: PosPackage[];
  initialCapsters: PosCapster[];
  initialBookings: PosBooking[];
  initialNextOrderCode: string;
  initialSetting: PosStoreSetting;
  cashierName?: string;
}

export function KasirClient({
  initialPackages,
  initialCapsters,
  initialBookings,
  initialNextOrderCode,
  initialSetting,
  cashierName = "Rehan",
}: KasirClientProps) {
  const [packages] = useState<PosPackage[]>(initialPackages);
  const [capsters] = useState<PosCapster[]>(initialCapsters);
  const [bookings, setBookings] = useState<PosBooking[]>(initialBookings);
  const [orderCode, setOrderCode] = useState<string>(initialNextOrderCode);
  const [setting] = useState<PosStoreSetting>(initialSetting);

  const [search, setSearch] = useState("");
  const [orderTab, setOrderTab] = useState<"WALK_IN" | "BOOKING">("WALK_IN");
  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    initialPackages[0]?.id ?? ""
  );
  const [selectedCapsterId, setSelectedCapsterId] = useState<string>(
    initialCapsters[0]?.id ?? ""
  );
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    initialBookings[0]?.id ?? null
  );
  const [isMember, setIsMember] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>("");
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showDiskonModal, setShowDiskonModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<ReceiptTransaction | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Discount override (defaults to Member 10% when isMember is true)
  const [customDiscount, setCustomDiscount] = useState<DiscountState | null>(null);

  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === selectedPackageId) ?? packages[0],
    [packages, selectedPackageId]
  );
  const selectedCapster = useMemo(
    () => capsters.find((c) => c.id === selectedCapsterId) ?? capsters[0],
    [capsters, selectedCapsterId]
  );
  const selectedBooking = useMemo(
    () => bookings.find((b) => b.id === selectedBookingId) ?? null,
    [bookings, selectedBookingId]
  );

  const filteredPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [packages, search]);

  const filteredCapsters = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return capsters;
    return capsters.filter((c) => c.name.toLowerCase().includes(q));
  }, [capsters, search]);

  const subtotal = selectedPackage?.price ?? 0;

  const activeDiscount: DiscountState = useMemo(() => {
    if (customDiscount) {
      if (customDiscount.type === "PERCENT") {
        return {
          ...customDiscount,
          amount: Math.round((subtotal * customDiscount.value) / 100),
        };
      }
      if (customDiscount.type === "NOMINAL") {
        return {
          ...customDiscount,
          amount: Math.min(subtotal, customDiscount.value),
        };
      }
      return customDiscount;
    }
    if (isMember && subtotal > 0) {
      return {
        type: "PERCENT",
        value: 10,
        amount: Math.round(subtotal * 0.1),
        label: "Diskon member (10%)",
        voucherCode: null,
      };
    }
    return { type: null, value: 0, amount: 0, label: null, voucherCode: null };
  }, [customDiscount, isMember, subtotal]);

  const afterDiscount = Math.max(0, subtotal - activeDiscount.amount);
  const taxAmount =
    setting.taxEnabled && !setting.priceIncludesTax
      ? Math.round((afterDiscount * setting.taxRate) / 100)
      : 0;
  const serviceFeeAmount = setting.serviceFeeEnabled ? setting.serviceFeeAmount : 0;
  const total = afterDiscount + taxAmount + serviceFeeAmount;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const refreshBookingsAndOrderCode = async () => {
    const [bRes, tRes] = await Promise.all([
      fetch("/api/bookings"),
      fetch("/api/transactions?range=today"),
    ]);
    if (bRes.ok) {
      const bJson = await bRes.json();
      setBookings(bJson.data ?? []);
    }
    if (tRes.ok) {
      const tJson = await tRes.json();
      if (tJson.meta?.nextOrderCode) setOrderCode(tJson.meta.nextOrderCode);
    }
  };

  const handleSelectBooking = (booking: PosBooking) => {
    setSelectedBookingId(booking.id);
    setSelectedPackageId(booking.packageId);
    setSelectedCapsterId(booking.capsterId);
    setIsMember(booking.isMember);
    setCustomDiscount(null);
  };

  const handleToggleBookingStatus = async (
    e: React.MouseEvent,
    booking: PosBooking
  ) => {
    e.stopPropagation();
    const nextStatus = booking.status === "HADIR" ? "MENUNGGU" : "HADIR";
    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, status: nextStatus } : b))
      );
    }
  };

  const handleResetOrder = () => {
    setCustomDiscount(null);
    setNotes("");
    if (packages[0]) setSelectedPackageId(packages[0].id);
    if (capsters[0]) setSelectedCapsterId(capsters[0].id);
    setIsMember(false);
    showToast("Pesanan direset");
  };

  const handleConfirmPayment = async ({
    paymentMethod,
    cashReceived,
  }: {
    paymentMethod: "TUNAI" | "QRIS";
    cashReceived?: number;
  }) => {
    if (!selectedPackage || !selectedCapster) {
      throw new Error("Pilih paket dan capster terlebih dahulu");
    }

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderType: orderTab,
        customerName:
          orderTab === "BOOKING" && selectedBooking
            ? selectedBooking.customerName
            : isMember
            ? "Member"
            : "Umum",
        isMember,
        packageId: selectedPackage.id,
        capsterId: selectedCapster.id,
        bookingId: orderTab === "BOOKING" ? selectedBooking?.id ?? null : null,
        discountType: activeDiscount.type,
        discountValue: activeDiscount.value,
        discountLabel: activeDiscount.label,
        voucherCode: activeDiscount.voucherCode,
        paymentMethod,
        cashReceived,
        notes: notes || null,
        status: "SELESAI",
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error ?? "Gagal menyelesaikan transaksi");
    }

    setShowPaymentModal(false);
    setCompletedReceipt(json.data);
    setCustomDiscount(null);
    setNotes("");
    await refreshBookingsAndOrderCode();
    showToast(`Transaksi ${json.data.orderCode} berhasil disimpan`);
  };

  const todayDisplay = formatDateHeader(new Date());

  return (
    <>
      {/* Main Left Catalog */}
      <main className="flex-1 bg-[#FAFAFA] p-6 overflow-y-auto min-w-0">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">
              {orderTab === "BOOKING" ? "Kasir" : setting.storeName}
            </h1>
            <p suppressHydrationWarning className="text-xs text-[#64748B] mt-0.5">
              {todayDisplay} · Kasir: {cashierName}
            </p>
          </div>

          <div className="relative w-72">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari paket atau capster"
              className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A]"
            />
          </div>
        </div>

        {/* Section 1: Pilih Paket */}
        <section className="mt-6">
          <div className="inline-flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-full px-3.5 py-1.5 text-xs font-medium text-[#0F172A] shadow-2xs">
            <Box className="w-3.5 h-3.5 text-[#475569]" />
            <span>Pilih Paket</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3.5">
            {filteredPackages.map((pkg) => {
              const isSelected = pkg.id === selectedPackage?.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPackageId(pkg.id)}
                  className={`bg-white rounded-2xl p-3.5 text-left transition relative cursor-pointer ${
                    isSelected
                      ? "border-[1.5px] border-[#0F172A] shadow-xs"
                      : "border border-[#E5E7EB] hover:border-[#CBD5E1]"
                  }`}
                >
                  <div
                    className="h-24 rounded-xl flex items-center justify-center mb-3 overflow-hidden"
                    style={{ backgroundColor: pkg.badgeColor || "#EDE0CE" }}
                  >
                    {pkg.imageUrl ? (
                      <img
                        src={pkg.imageUrl}
                        alt={pkg.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-base font-medium tracking-wide text-[#5C4433] uppercase">
                        {pkg.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-2 min-h-[36px]">
                    <p className="text-xs font-semibold text-[#0F172A] leading-snug">
                      {pkg.description}
                    </p>
                    {isSelected && (
                      <span className="w-5 h-5 shrink-0 rounded-full bg-[#0F172A] text-white flex items-center justify-center">
                        <Check className="w-3 h-3" strokeWidth={2.5} />
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#64748B] font-medium mt-2">
                    {formatRupiah(pkg.price)}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 2: Pilih Capster */}
        <section className="mt-7">
          <div className="inline-flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-full px-3.5 py-1.5 text-xs font-medium text-[#0F172A] shadow-2xs">
            <Scissors className="w-3.5 h-3.5 text-[#475569]" />
            <span>Pilih Capster</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3.5">
            {filteredCapsters.map((cap) => {
              const isSelected = cap.id === selectedCapster?.id;
              return (
                <button
                  key={cap.id}
                  type="button"
                  onClick={() => setSelectedCapsterId(cap.id)}
                  className={`bg-white rounded-2xl p-3 text-left transition relative cursor-pointer ${
                    isSelected
                      ? "border-[1.5px] border-[#0F172A] shadow-xs"
                      : "border border-[#E5E7EB] hover:border-[#CBD5E1]"
                  }`}
                >
                  <div
                    className="aspect-[4/3] w-full rounded-xl overflow-hidden mb-2.5 flex items-center justify-center"
                    style={{ backgroundColor: cap.bgColor || "#C4B5E3" }}
                  >
                    {cap.photoUrl ? (
                      <img
                        src={cap.photoUrl}
                        alt={cap.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-white">
                        {getInitials(cap.name)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-xs font-semibold text-[#0F172A]">{cap.name}</span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[#0F172A] text-white flex items-center justify-center">
                        <Check className="w-3 h-3" strokeWidth={2.5} />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      {/* Right Order Cart Sidebar */}
      <aside className="w-[380px] shrink-0 bg-white border-l border-[#E5E7EB] flex flex-col justify-between p-5 overflow-y-auto">
        <div>
          {/* Order Title */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                Transaksi {orderCode}
              </h2>
              <p suppressHydrationWarning className="text-[11px] text-[#64748B] mt-0.5">
                {orderTab === "BOOKING"
                  ? "Dari booking · 1 layanan"
                  : `Dibuat ${new Date().toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })} · 1 layanan`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetOrder}
              title="Reset pesanan"
              className="w-8 h-8 rounded-lg border border-[#E5E7EB] hover:bg-[#F8FAFC] flex items-center justify-center text-[#64748B] cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Walk-in vs Booking Tabs */}
          <div className="bg-[#F4F4F5] p-1 rounded-xl grid grid-cols-2 gap-1 mt-4">
            <button
              type="button"
              onClick={() => setOrderTab("WALK_IN")}
              className={`py-1.5 text-xs rounded-lg transition cursor-pointer ${
                orderTab === "WALK_IN"
                  ? "bg-white text-[#0F172A] font-semibold shadow-2xs"
                  : "text-[#64748B] font-medium hover:text-[#0F172A]"
              }`}
            >
              Walk-in
            </button>
            <button
              type="button"
              onClick={() => {
                setOrderTab("BOOKING");
                if (selectedBooking) handleSelectBooking(selectedBooking);
              }}
              className={`py-1.5 text-xs rounded-lg transition cursor-pointer ${
                orderTab === "BOOKING"
                  ? "bg-white text-[#0F172A] font-semibold shadow-2xs"
                  : "text-[#64748B] font-medium hover:text-[#0F172A]"
              }`}
            >
              Booking
            </button>
          </div>

          {orderTab === "WALK_IN" ? (
            <>
              {/* Info Chips */}
              <div className="grid grid-cols-2 gap-2.5 mt-3.5">
                <div className="border border-[#E5E7EB] rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-medium text-[#0F172A]">
                  <Scissors className="w-3.5 h-3.5 text-[#64748B]" />
                  <span className="truncate">{selectedCapster?.name ?? "-"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMember((m) => !m);
                    setCustomDiscount(null);
                  }}
                  title="Klik untuk ubah status Member / Umum"
                  className={`border rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-medium transition cursor-pointer ${
                    isMember
                      ? "border-[#0F172A] bg-[#F8FAFC] text-[#0F172A]"
                      : "border-[#E5E7EB] text-[#64748B] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{isMember ? "Member" : "Umum"}</span>
                </button>
              </div>

              {/* Active Service Item */}
              {selectedPackage && (
                <div className="mt-5 pt-4 border-t border-[#F1F5F9]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[#0F172A]">
                        Paket {selectedPackage.name}
                      </p>
                      <p className="text-[11px] text-[#64748B] mt-0.5 leading-relaxed">
                        {selectedPackage.description}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#0F172A] shrink-0">
                      {formatRupiah(selectedPackage.price)}
                    </span>
                  </div>
                  {notes && (
                    <div className="mt-2.5 text-[11px] bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-[#475569]">
                      Catatan: {notes}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-[#0F172A]">
                  Booking hari ini
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#64748B]">
                    {bookings.length} antrean
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(true)}
                    title="Tambah booking baru"
                    className="w-6 h-6 rounded-md border border-[#E5E7EB] hover:bg-[#F8FAFC] flex items-center justify-center text-[#0F172A] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-0.5">
                {bookings.length === 0 ? (
                  <p className="text-xs text-[#94A3B8] text-center py-6 border border-dashed border-[#E5E7EB] rounded-xl">
                    Belum ada antrean booking hari ini
                  </p>
                ) : (
                  bookings.map((b) => {
                    const active = b.id === selectedBookingId;
                    return (
                      <div
                        key={b.id}
                        onClick={() => handleSelectBooking(b)}
                        className={`w-full rounded-xl p-2.5 flex items-center justify-between gap-2 border transition cursor-pointer ${
                          active
                            ? "border-[1.5px] border-[#0F172A] bg-white shadow-2xs"
                            : "border-[#E5E7EB] bg-white hover:bg-[#FAFAFA]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-8 h-8 shrink-0 rounded-full bg-[#F1F5F9] text-[11px] font-semibold text-[#475569] flex items-center justify-center">
                            {getInitials(b.customerName)}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#0F172A] truncate">
                              {b.customerName}
                            </p>
                            <p className="text-[11px] text-[#64748B] truncate">
                              {b.scheduledTime} · {b.package.name} · {b.capster.name}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleToggleBookingStatus(e, b)}
                          className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold cursor-pointer ${
                            b.status === "HADIR"
                              ? "bg-[#DCFCE7] text-[#15803D]"
                              : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
                          }`}
                        >
                          {b.status === "HADIR" ? "Hadir" : "Menunggu"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Summary & CTA */}
        <div className="pt-4">
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <button
              type="button"
              onClick={() => setShowDiskonModal(true)}
              className="border border-[#E5E7EB] hover:bg-[#F8FAFC] rounded-xl py-2.5 flex flex-col items-center justify-center gap-1 text-xs font-medium text-[#0F172A] cursor-pointer"
            >
              <Percent className="w-3.5 h-3.5 text-[#475569]" />
              <span>Diskon</span>
            </button>
            <button
              type="button"
              onClick={() => setShowNoteModal(true)}
              className="border border-[#E5E7EB] hover:bg-[#F8FAFC] rounded-xl py-2.5 flex flex-col items-center justify-center gap-1 text-xs font-medium text-[#0F172A] cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-[#475569]" />
              <span>Catatan</span>
            </button>
          </div>

          <div className="border-t border-[#E5E7EB] pt-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between text-[#64748B]">
              <span>Subtotal</span>
              <span className="text-[#0F172A] font-medium">{formatRupiah(subtotal)}</span>
            </div>
            {activeDiscount.amount > 0 && (
              <div className="flex justify-between text-[#64748B]">
                <span>{activeDiscount.label ?? "Diskon"}</span>
                <span className="text-[#15803D] font-medium">
                  -{formatRupiah(activeDiscount.amount)}
                </span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between text-[#64748B]">
                <span>Pajak PB1 ({setting.taxRate}%)</span>
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
            <div className="flex justify-between items-baseline pt-2">
              <span className="text-sm font-semibold text-[#0F172A]">Total</span>
              <span className="text-xl font-bold text-[#0F172A]">
                {formatRupiah(total)}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={!selectedPackage || !selectedCapster}
            onClick={() => setShowPaymentModal(true)}
            className="mt-3.5 w-full bg-[#15803D] hover:bg-[#166534] text-white rounded-xl px-4 py-3 flex items-center justify-between font-semibold text-sm transition cursor-pointer disabled:opacity-50"
          >
            <span>Lanjut Transaksi</span>
            <span>{formatRupiah(total)}</span>
          </button>
        </div>
      </aside>

      {/* Modals */}
      {showDiskonModal && (
        <DiskonModal
          orderCode={orderCode}
          subtotal={subtotal}
          initialDiscount={activeDiscount}
          onApply={(d) => setCustomDiscount(d)}
          onRemove={() => {
            setIsMember(false);
            setCustomDiscount({
              type: null,
              value: 0,
              amount: 0,
              label: null,
              voucherCode: null,
            });
          }}
          onClose={() => setShowDiskonModal(false)}
        />
      )}

      {showPaymentModal && (
        <PembayaranModal
          orderCode={orderCode}
          subtotal={subtotal}
          discountAmount={activeDiscount.amount}
          discountLabel={activeDiscount.label}
          taxAmount={taxAmount}
          serviceFeeAmount={serviceFeeAmount}
          total={total}
          tunaiEnabled={setting.tunaiEnabled}
          qrisEnabled={setting.qrisEnabled}
          qrisMerchantName={setting.qrisMerchantName}
          onConfirmPayment={handleConfirmPayment}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {showBookingModal && (
        <BookingAddModal
          packages={packages}
          capsters={capsters}
          onCreated={refreshBookingsAndOrderCode}
          onClose={() => setShowBookingModal(false)}
        />
      )}

      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[380px] shadow-2xl p-5">
            <h3 className="text-sm font-bold text-[#0F172A]">Catatan Pesanan</h3>
            <p className="text-xs text-[#64748B] mt-0.5">Pesanan {orderCode}</p>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Potong rapi samping, tidak terlalu tipis..."
              className="mt-3 w-full border border-[#E5E7EB] rounded-xl p-3 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowNoteModal(false)}
                className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold cursor-pointer"
              >
                Simpan catatan
              </button>
            </div>
          </div>
        </div>
      )}

      {completedReceipt && (
        <ReceiptModal
          transaction={completedReceipt}
          store={setting}
          onClose={() => setCompletedReceipt(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#0F172A] text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
