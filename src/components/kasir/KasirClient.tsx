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
  Minus,
  ShoppingBag,
  X,
  RotateCcw,
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

interface CartItem {
  pkg: PosPackage;
  quantity: number;
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

  // Clean new-transaction state
  const [search, setSearch] = useState("");
  const [orderTab, setOrderTab] = useState<"WALK_IN" | "BOOKING">("WALK_IN");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCapsterId, setSelectedCapsterId] = useState<string>("");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>("");
  const [isMember, setIsMember] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");

  // Modals & drawers
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showDiskonModal, setShowDiskonModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<ReceiptTransaction | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [customDiscount, setCustomDiscount] = useState<DiscountState | null>(null);

  const selectedCapster = useMemo(
    () => capsters.find((c) => c.id === selectedCapsterId) ?? null,
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

  const totalQty = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.pkg.price * item.quantity, 0),
    [cartItems]
  );

  const activeDiscount: DiscountState = useMemo(() => {
    if (subtotal === 0) {
      return { type: null, value: 0, amount: 0, label: null, voucherCode: null };
    }
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
    if (isMember) {
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
    subtotal > 0 && setting.taxEnabled && !setting.priceIncludesTax
      ? Math.round((afterDiscount * setting.taxRate) / 100)
      : 0;
  const serviceFeeAmount =
    subtotal > 0 && setting.serviceFeeEnabled ? setting.serviceFeeAmount : 0;
  const total = afterDiscount + taxAmount + serviceFeeAmount;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const resetTransaction = (silent = false) => {
    setCartItems([]);
    setSelectedCapsterId("");
    setSelectedBookingId(null);
    setCustomerName("");
    setIsMember(false);
    setCustomDiscount(null);
    setNotes("");
    if (!silent) showToast("Siap untuk transaksi baru");
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

  const handleAddPackage = (pkg: PosPackage) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.pkg.id === pkg.id);
      if (existing) {
        return prev.map((item) =>
          item.pkg.id === pkg.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { pkg, quantity: 1 }];
    });
  };

  const handleUpdateQty = (packageId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.pkg.id === packageId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (packageId: string) => {
    setCartItems((prev) => prev.filter((item) => item.pkg.id !== packageId));
  };

  const handleSelectBooking = (booking: PosBooking) => {
    setSelectedBookingId(booking.id);
    setCartItems([{ pkg: booking.package, quantity: 1 }]);
    setSelectedCapsterId(booking.capsterId);
    setCustomerName(booking.customerName);
    setIsMember(booking.isMember);
    setCustomDiscount(null);
  };

  const handleSwitchOrderTab = (nextTab: "WALK_IN" | "BOOKING") => {
    setOrderTab(nextTab);
    if (nextTab === "WALK_IN" && selectedBookingId) {
      setSelectedBookingId(null);
      setCustomerName("");
      setIsMember(false);
    }
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

  const handleConfirmPayment = async ({
    paymentMethod,
    cashReceived,
    status,
  }: {
    paymentMethod: "TUNAI" | "QRIS";
    cashReceived?: number;
    status: "SELESAI" | "MENUNGGU_PEMBAYARAN";
  }) => {
    if (cartItems.length === 0 || !selectedCapster) {
      throw new Error("Pilih paket dan capster terlebih dahulu");
    }

    const resolvedCustomer =
      orderTab === "BOOKING" && selectedBooking
        ? selectedBooking.customerName
        : customerName.trim() || (isMember ? "Member" : "Umum");

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderType: orderTab,
        customerName: resolvedCustomer,
        isMember,
        items: cartItems.map((item) => ({
          packageId: item.pkg.id,
          quantity: item.quantity,
        })),
        capsterId: selectedCapster.id,
        bookingId: orderTab === "BOOKING" ? selectedBooking?.id ?? null : null,
        discountType: activeDiscount.type,
        discountValue: activeDiscount.value,
        discountLabel: activeDiscount.label,
        voucherCode: activeDiscount.voucherCode,
        paymentMethod,
        cashReceived,
        notes: notes.trim() || null,
        status,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error ?? "Gagal menyimpan transaksi");
    }

    setShowPaymentModal(false);
    setCompletedReceipt(json.data);
    resetTransaction(true);
    setOrderTab("WALK_IN");
    await refreshBookingsAndOrderCode();
    showToast(
      status === "MENUNGGU_PEMBAYARAN"
        ? `Transaksi ${json.data.orderCode} disimpan (menunggu bayar)`
        : `Transaksi ${json.data.orderCode} berhasil lunas`
    );
  };

  const canCheckout = cartItems.length > 0 && Boolean(selectedCapster);
  const checkoutHint =
    cartItems.length === 0
      ? "Pilih paket layanan dulu"
      : !selectedCapster
      ? "Pilih capster dulu"
      : "Lanjut Pembayaran";

  const todayDisplay = formatDateHeader(new Date());
  const displayCustomer =
    orderTab === "BOOKING" && selectedBooking
      ? selectedBooking.customerName
      : customerName.trim() || (isMember ? "Member" : "Umum");

  return (
    <>
      {/* Main Left Catalog */}
      <main className="flex-1 bg-[#FAFAFA] p-4 sm:p-5 lg:p-6 overflow-y-auto min-w-0 pb-24 lg:pb-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">
              {setting.storeName}
            </h1>
            <p suppressHydrationWarning className="text-xs text-[#64748B] mt-0.5">
              {todayDisplay} · Kasir: {cashierName}
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial sm:w-64 lg:w-72">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari paket atau capster"
                className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-9 pr-8 py-2 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Hapus pencarian"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {(cartItems.length > 0 || selectedCapsterId) && (
              <button
                type="button"
                onClick={() => resetTransaction(false)}
                className="shrink-0 bg-white border border-[#E5E7EB] hover:bg-[#F8FAFC] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Transaksi baru</span>
              </button>
            )}
          </div>
        </div>

        {/* Section 1: Pilih Paket */}
        <section className="mt-6">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-full px-3.5 py-1.5 text-xs font-medium text-[#0F172A] shadow-2xs">
              <Box className="w-3.5 h-3.5 text-[#475569]" />
              <span>1. Pilih Paket</span>
            </div>
            <span className="text-[11px] text-[#64748B]">
              Klik paket untuk menambah ke pesanan
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-3.5">
            {filteredPackages.map((pkg) => {
              const inCart = cartItems.find((item) => item.pkg.id === pkg.id);
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => handleAddPackage(pkg)}
                  className={`bg-white rounded-2xl p-3.5 text-left transition relative cursor-pointer ${
                    inCart
                      ? "border-[1.5px] border-[#0F172A] shadow-xs"
                      : "border border-[#E5E7EB] hover:border-[#CBD5E1]"
                  }`}
                >
                  {inCart && (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-[#0F172A] text-white text-[10px] font-bold shadow-xs">
                      {inCart.quantity}×
                    </span>
                  )}

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
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-[#64748B] font-medium">
                      {formatRupiah(pkg.price)}
                    </p>
                    <span className="text-[11px] font-semibold text-[#0F172A] flex items-center gap-0.5">
                      <Plus className="w-3 h-3" />
                      Tambah
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 2: Pilih Capster */}
        <section className="mt-7">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-full px-3.5 py-1.5 text-xs font-medium text-[#0F172A] shadow-2xs">
              <Scissors className="w-3.5 h-3.5 text-[#475569]" />
              <span>2. Pilih Capster</span>
            </div>
            <span className="text-[11px] text-[#64748B]">
              {selectedCapster ? `Dipilih: ${selectedCapster.name}` : "Wajib dipilih"}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-3.5">
            {filteredCapsters.map((cap) => {
              const isSelected = cap.id === selectedCapster?.id;
              return (
                <button
                  key={cap.id}
                  type="button"
                  onClick={() =>
                    setSelectedCapsterId((prev) => (prev === cap.id ? "" : cap.id))
                  }
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

      {/* Right Order Cart Sidebar (Desktop & Tablet Landscape lg+; slide-over drawer on < lg) */}
      {mobileCartOpen && (
        <div
          onClick={() => setMobileCartOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}
      <aside
        className={`${
          mobileCartOpen
            ? "fixed inset-y-0 right-0 z-40 flex w-full max-w-[390px] shadow-2xl"
            : "hidden"
        } lg:static lg:flex lg:w-[350px] xl:w-[390px] shrink-0 bg-white border-l border-[#E5E7EB] flex-col justify-between p-5 overflow-y-auto`}
      >
        <div>
          {/* Order Title */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                Transaksi {orderCode}
              </h2>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                {cartItems.length === 0
                  ? "Siap untuk transaksi baru"
                  : `${orderTab === "BOOKING" ? "Dari booking" : "Walk-in"} · ${totalQty} layanan`}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => resetTransaction(false)}
                title="Mulai transaksi baru / kosongkan"
                className="w-8 h-8 rounded-lg border border-[#E5E7EB] hover:bg-[#F8FAFC] flex items-center justify-center text-[#64748B] cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                aria-label="Tutup panel pesanan"
                className="lg:hidden w-8 h-8 rounded-lg border border-[#E5E7EB] hover:bg-[#F8FAFC] flex items-center justify-center text-[#64748B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Walk-in vs Booking Tabs */}
          <div className="bg-[#F4F4F5] p-1 rounded-xl grid grid-cols-2 gap-1 mt-4">
            <button
              type="button"
              onClick={() => handleSwitchOrderTab("WALK_IN")}
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
              onClick={() => handleSwitchOrderTab("BOOKING")}
              className={`py-1.5 text-xs rounded-lg transition cursor-pointer ${
                orderTab === "BOOKING"
                  ? "bg-white text-[#0F172A] font-semibold shadow-2xs"
                  : "text-[#64748B] font-medium hover:text-[#0F172A]"
              }`}
            >
              Booking ({bookings.length})
            </button>
          </div>

          {orderTab === "WALK_IN" ? (
            <div className="mt-3.5 space-y-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama pelanggan (Umum)"
                  className="flex-1 border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A]"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsMember((m) => !m);
                    setCustomDiscount(null);
                  }}
                  title="Aktifkan diskon member 10%"
                  className={`shrink-0 border rounded-xl px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition cursor-pointer ${
                    isMember
                      ? "border-[#15803D] bg-[#ECFDF5] text-[#15803D]"
                      : "border-[#E5E7EB] text-[#64748B] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{isMember ? "Member" : "Umum"}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#0F172A]">
                  Antrean booking
                </span>
                <button
                  type="button"
                  onClick={() => setShowBookingModal(true)}
                  className="px-2.5 py-1 rounded-lg border border-[#E5E7EB] hover:bg-[#F8FAFC] flex items-center gap-1 text-[11px] font-semibold text-[#0F172A] cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Tambah
                </button>
              </div>

              <div className="space-y-2 max-h-[210px] overflow-y-auto pr-0.5">
                {bookings.length === 0 ? (
                  <p className="text-xs text-[#94A3B8] text-center py-5 border border-dashed border-[#E5E7EB] rounded-xl">
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
                            ? "border-[1.5px] border-[#0F172A] bg-[#F8FAFC]"
                            : "border-[#E5E7EB] bg-white hover:bg-[#FAFAFA]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-7 h-7 shrink-0 rounded-full bg-[#F1F5F9] text-[10px] font-semibold text-[#475569] flex items-center justify-center">
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

          {/* Assigned Capster Chip */}
          <div className="mt-3">
            <div
              className={`rounded-xl px-3 py-2 flex items-center justify-between text-xs border ${
                selectedCapster
                  ? "border-[#E5E7EB] bg-[#FAFAFA] text-[#0F172A]"
                  : "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]"
              }`}
            >
              <span className="flex items-center gap-2 font-medium">
                <Scissors className="w-3.5 h-3.5" />
                {selectedCapster
                  ? `Capster: ${selectedCapster.name}`
                  : "Capster belum dipilih"}
              </span>
              {selectedCapster && (
                <button
                  type="button"
                  onClick={() => setSelectedCapsterId("")}
                  className="text-[11px] text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                >
                  Ganti
                </button>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div className="mt-4 pt-3.5 border-t border-[#F1F5F9]">
            {cartItems.length === 0 ? (
              <div className="py-7 px-4 text-center border border-dashed border-[#E5E7EB] rounded-2xl bg-[#FAFAFA]">
                <p className="text-xs font-semibold text-[#475569]">
                  Belum ada layanan dipilih
                </p>
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  Klik paket di sebelah kiri untuk menambahkan ke pesanan.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-0.5">
                {cartItems.map((item) => (
                  <div
                    key={item.pkg.id}
                    className="flex items-start justify-between gap-2.5 pb-3 border-b border-[#F1F5F9] last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#0F172A]">
                        Paket {item.pkg.name}
                      </p>
                      <p className="text-[11px] text-[#64748B] mt-0.5 truncate">
                        {formatRupiah(item.pkg.price)} / layanan
                      </p>
                      <div className="inline-flex items-center gap-1.5 mt-2 bg-[#F4F4F5] rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.pkg.id, -1)}
                          aria-label={`Kurangi ${item.pkg.name}`}
                          className="w-6 h-6 rounded-md bg-white hover:bg-[#FAFAFA] flex items-center justify-center text-[#0F172A] shadow-2xs cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-semibold text-[#0F172A]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.pkg.id, 1)}
                          aria-label={`Tambah ${item.pkg.name}`}
                          className="w-6 h-6 rounded-md bg-white hover:bg-[#FAFAFA] flex items-center justify-center text-[#0F172A] shadow-2xs cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-xs font-semibold text-[#0F172A]">
                        {formatRupiah(item.pkg.price * item.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.pkg.id)}
                        aria-label={`Hapus ${item.pkg.name}`}
                        className="text-[11px] text-[#94A3B8] hover:text-[#DC2626] cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {notes && (
              <div className="mt-2.5 text-[11px] bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-[#475569]">
                Catatan: {notes}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Summary & CTA */}
        <div className="pt-4">
          <div className="grid grid-cols-2 gap-2.5 mb-3.5">
            <button
              type="button"
              disabled={cartItems.length === 0}
              onClick={() => setShowDiskonModal(true)}
              className={`border rounded-xl py-2.5 flex flex-col items-center justify-center gap-1 text-xs font-medium cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                activeDiscount.amount > 0
                  ? "border-[#15803D] bg-[#ECFDF5] text-[#15803D]"
                  : "border-[#E5E7EB] hover:bg-[#F8FAFC] text-[#0F172A]"
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>{activeDiscount.amount > 0 ? "Diskon aktif" : "Diskon"}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowNoteModal(true)}
              className={`border rounded-xl py-2.5 flex flex-col items-center justify-center gap-1 text-xs font-medium cursor-pointer ${
                notes
                  ? "border-[#0F172A] bg-[#F8FAFC] text-[#0F172A]"
                  : "border-[#E5E7EB] hover:bg-[#F8FAFC] text-[#0F172A]"
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{notes ? "Ada catatan" : "Catatan"}</span>
            </button>
          </div>

          <div className="border-t border-[#E5E7EB] pt-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between text-[#64748B]">
              <span>Subtotal ({totalQty} layanan)</span>
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
            disabled={!canCheckout}
            onClick={() => {
              setMobileCartOpen(false);
              setShowPaymentModal(true);
            }}
            className="mt-3.5 w-full bg-[#15803D] hover:bg-[#166534] text-white rounded-xl px-4 py-3 flex items-center justify-between font-semibold text-sm transition cursor-pointer disabled:bg-[#CBD5E1] disabled:cursor-not-allowed"
          >
            <span>{checkoutHint}</span>
            <span>{formatRupiah(total)}</span>
          </button>
        </div>
      </aside>

      {/* Sticky Bottom Checkout Bar for Tablet Portrait & Mobile (< lg) */}
      <div className="lg:hidden fixed bottom-[60px] md:bottom-0 left-0 md:left-[74px] right-0 z-20 bg-white border-t border-[#E5E7EB] px-4 py-2.5 flex items-center justify-between gap-3 shadow-md">
        <button
          type="button"
          onClick={() => setMobileCartOpen(true)}
          className="flex items-center gap-3 text-left min-w-0 cursor-pointer"
        >
          <span className="w-9 h-9 rounded-xl bg-[#F4F4F5] flex items-center justify-center text-[#0F172A] shrink-0">
            <ShoppingBag className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#0F172A] truncate">
              {cartItems.length === 0
                ? `${orderCode} · Belum ada paket`
                : `${orderCode} · ${totalQty} layanan · ${selectedCapster?.name ?? "Pilih capster"}`}
            </p>
            <p className="text-[11px] text-[#64748B] truncate">
              {displayCustomer} ·{" "}
              <span className="font-semibold text-[#0F172A]">{formatRupiah(total)}</span>
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] cursor-pointer"
          >
            Pesanan
          </button>
          <button
            type="button"
            disabled={!canCheckout}
            onClick={() => setShowPaymentModal(true)}
            className="px-4 py-2 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold cursor-pointer disabled:bg-[#CBD5E1] disabled:cursor-not-allowed"
          >
            Bayar
          </button>
        </div>
      </div>

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

      {showPaymentModal && selectedCapster && (
        <PembayaranModal
          orderCode={orderCode}
          customerName={displayCustomer}
          capsterName={selectedCapster.name}
          totalQty={totalQty}
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
          primaryActionLabel="Transaksi Baru"
          onClose={() => setCompletedReceipt(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-20 lg:bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#0F172A] text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
