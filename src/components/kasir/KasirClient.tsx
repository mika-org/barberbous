"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  Scissors,
  CupSoda,
  Trash2,
  User,
  Percent,
  Pencil,
  Check,
  Plus,
  Minus,
  ShoppingBag,
  ChevronDown,
  X,
} from "lucide-react";
import { formatDateHeader, formatRupiah, getInitials } from "@/lib/format";
import { DiskonModal, type DiscountState } from "./DiskonModal";
import { PembayaranModal } from "./PembayaranModal";
import { PelangganModal, type PosMember } from "./PelangganModal";
import { BookingAddModal } from "./BookingAddModal";
import { type ReceiptStoreInfo, type ReceiptTransaction } from "../ReceiptModal";

export interface PosPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  badgeColor: string;
}

export interface PosDrink {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  imageUrl: string | null;
  badgeColor: string;
}

export interface PosCapster {
  id: string;
  name: string;
  photoUrl: string | null;
  bgColor: string;
  status: "TERSEDIA" | "MELAYANI" | "ISTIRAHAT";
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
  debitEnabled: boolean;
  qrisMerchantName: string;
}

interface PackageCartEntry {
  pkg: PosPackage;
  quantity: number;
}

interface DrinkCartEntry {
  drink: PosDrink;
  quantity: number;
}

interface KasirClientProps {
  initialPackages: PosPackage[];
  initialDrinks: PosDrink[];
  initialCapsters: PosCapster[];
  initialMembers: PosMember[];
  initialBookings: PosBooking[];
  initialNextOrderCode: string;
  initialSetting: PosStoreSetting;
  cashierName?: string;
}

export function KasirClient({
  initialPackages,
  initialDrinks,
  initialCapsters,
  initialMembers,
  initialBookings,
  initialNextOrderCode,
  initialSetting,
  cashierName = "Rehan",
}: KasirClientProps) {
  const [packages] = useState<PosPackage[]>(initialPackages);
  const [drinks, setDrinks] = useState<PosDrink[]>(initialDrinks);
  const [capsters] = useState<PosCapster[]>(initialCapsters);
  const [members] = useState<PosMember[]>(initialMembers);
  const [bookings, setBookings] = useState<PosBooking[]>(initialBookings);
  const [orderCode, setOrderCode] = useState<string>(initialNextOrderCode);
  const [setting] = useState<PosStoreSetting>(initialSetting);

  // Clean new-transaction cart state
  const [search, setSearch] = useState("");
  const [orderTab, setOrderTab] = useState<"WALK_IN" | "BOOKING">("WALK_IN");
  const [packageCart, setPackageCart] = useState<PackageCartEntry[]>([]);
  const [drinkCart, setDrinkCart] = useState<DrinkCartEntry[]>([]);
  const [selectedCapsterId, setSelectedCapsterId] = useState<string>(""); // "" = Pilih Capster / AUTO = Siapa saja
  const [capsterAuto, setCapsterAuto] = useState<boolean>(false);
  const [showCapsterDropdown, setShowCapsterDropdown] = useState(false);

  const [selectedMember, setSelectedMember] = useState<PosMember | null>(null);
  const [isMember, setIsMember] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>("");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const [discount, setDiscount] = useState<DiscountState>({
    type: null,
    value: 0,
    amount: 0,
    label: null,
    voucherCode: null,
  });
  const [notes, setNotes] = useState<string>("");

  // Modals & mobile panel
  const [showPelangganModal, setShowPelangganModal] = useState(false);
  const [showDiskonModal, setShowDiskonModal] = useState(false);
  const [showCatatanModal, setShowCatatanModal] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [showPembayaranModal, setShowPembayaranModal] = useState(false);
  const [showBookingAddModal, setShowBookingAddModal] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const filteredPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [packages, search]);

  const filteredDrinks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drinks;
    return drinks.filter(
      (d) => d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)
    );
  }, [drinks, search]);

  const selectedCapster = useMemo(
    () => capsters.find((c) => c.id === selectedCapsterId) ?? null,
    [capsters, selectedCapsterId]
  );

  const getPackageQty = (id: string) =>
    packageCart.find((entry) => entry.pkg.id === id)?.quantity ?? 0;

  const getDrinkQty = (id: string) =>
    drinkCart.find((entry) => entry.drink.id === id)?.quantity ?? 0;

  const toggleOrAddPackage = (pkg: PosPackage) => {
    setPackageCart((prev) => {
      const existing = prev.find((e) => e.pkg.id === pkg.id);
      if (existing) {
        return prev.filter((e) => e.pkg.id !== pkg.id);
      }
      return [...prev, { pkg, quantity: 1 }];
    });
  };

  const updatePackageQty = (pkgId: string, delta: number) => {
    setPackageCart((prev) =>
      prev
        .map((e) => (e.pkg.id === pkgId ? { ...e, quantity: e.quantity + delta } : e))
        .filter((e) => e.quantity > 0)
    );
  };

  const updateDrinkQty = (drink: PosDrink, delta: number) => {
    if (delta > 0 && drink.stock <= getDrinkQty(drink.id)) {
      showToast(`Stok ${drink.name} tersisa ${drink.stock} botol`);
      return;
    }
    setDrinkCart((prev) => {
      const existing = prev.find((e) => e.drink.id === drink.id);
      if (!existing) {
        if (delta <= 0) return prev;
        return [...prev, { drink, quantity: delta }];
      }
      const nextQty = existing.quantity + delta;
      if (nextQty <= 0) {
        return prev.filter((e) => e.drink.id !== drink.id);
      }
      return prev.map((e) => (e.drink.id === drink.id ? { ...e, quantity: nextQty } : e));
    });
  };

  const handleSelectBooking = (booking: PosBooking) => {
    setSelectedBookingId(booking.id);
    setPackageCart([{ pkg: booking.package, quantity: 1 }]);
    setSelectedCapsterId(booking.capsterId);
    setCapsterAuto(false);
    setCustomerName(booking.customerName);
    setIsMember(booking.isMember);
    const matchingMember = booking.isMember
      ? members.find((m) => m.name.toLowerCase() === booking.customerName.toLowerCase()) ?? null
      : null;
    setSelectedMember(matchingMember);
    setOrderTab("BOOKING");
  };

  const resetCart = () => {
    setPackageCart([]);
    setDrinkCart([]);
    setSelectedCapsterId("");
    setCapsterAuto(false);
    setShowCapsterDropdown(false);
    setSelectedMember(null);
    setSelectedBookingId(null);
    setCustomerName("");
    setIsMember(false);
    setNotes("");
    setDiscount({ type: null, value: 0, amount: 0, label: null, voucherCode: null });
    setOrderTab("WALK_IN");
  };

  const totalQty = useMemo(
    () =>
      packageCart.reduce((s, e) => s + e.quantity, 0) +
      drinkCart.reduce((s, e) => s + e.quantity, 0),
    [packageCart, drinkCart]
  );

  const subtotal = useMemo(
    () =>
      packageCart.reduce((s, e) => s + e.pkg.price * e.quantity, 0) +
      drinkCart.reduce((s, e) => s + e.drink.price * e.quantity, 0),
    [packageCart, drinkCart]
  );

  const discountAmount = useMemo(() => {
    if (!discount.type || discount.value <= 0) return 0;
    if (discount.type === "PERCENT") {
      return Math.round((subtotal * Math.min(100, discount.value)) / 100);
    }
    return Math.min(subtotal, discount.value);
  }, [discount, subtotal]);

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxAmount =
    setting.taxEnabled && !setting.priceIncludesTax
      ? Math.round((afterDiscount * setting.taxRate) / 100)
      : 0;
  const serviceFeeAmount =
    setting.serviceFeeEnabled && totalQty > 0 ? setting.serviceFeeAmount : 0;
  const total = afterDiscount + taxAmount + serviceFeeAmount;

  const needsCapsterWarning = packageCart.length > 0 && !selectedCapsterId && !capsterAuto;

  const handleOpenCheckout = () => {
    if (totalQty === 0) {
      showToast("Pilih paket atau minuman terlebih dahulu");
      return;
    }
    setShowPembayaranModal(true);
  };

  const handleConfirmPayment = async (payload: {
    paymentMethod: "TUNAI" | "QRIS" | "DEBIT";
    cashReceived?: number;
    status: "SELESAI" | "MENUNGGU_PEMBAYARAN";
  }): Promise<ReceiptTransaction> => {
    const autoCapsterId =
      packageCart.length > 0
        ? selectedCapsterId || (capsterAuto ? capsters[0]?.id ?? null : null)
        : null;

    const apiItems = [
      ...packageCart.map((e) => ({
        itemType: "PACKAGE" as const,
        packageId: e.pkg.id,
        quantity: e.quantity,
      })),
      ...drinkCart.map((e) => ({
        itemType: "DRINK" as const,
        drinkId: e.drink.id,
        quantity: e.quantity,
      })),
    ];

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderType: orderTab,
        customerName:
          selectedMember?.name || customerName.trim() || (isMember ? "Member" : "Umum"),
        isMember: Boolean(selectedMember) || isMember,
        memberId: selectedMember?.id ?? null,
        items: apiItems,
        capsterId: autoCapsterId,
        bookingId: selectedBookingId,
        discountType: discount.type,
        discountValue: discount.value,
        discountLabel: discount.label,
        voucherCode: discount.voucherCode,
        paymentMethod: payload.paymentMethod,
        cashReceived: payload.cashReceived,
        notes: notes.trim() || null,
        status: payload.status,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error ?? "Gagal menyimpan transaksi");
    }

    // Decrement drink stocks in UI immediately
    if (drinkCart.length > 0) {
      setDrinks((prev) =>
        prev.map((d) => {
          const ordered = drinkCart.find((c) => c.drink.id === d.id);
          return ordered ? { ...d, stock: Math.max(0, d.stock - ordered.quantity) } : d;
        })
      );
    }

    return json.data as ReceiptTransaction;
  };

  const handleStartNewTransaction = async () => {
    setShowPembayaranModal(false);
    setMobileCartOpen(false);
    resetCart();

    const [txRes, bkRes] = await Promise.all([fetch("/api/transactions"), fetch("/api/bookings")]);
    if (txRes.ok) {
      const txJson = await txRes.json();
      if (txJson.meta?.nextOrderCode) setOrderCode(txJson.meta.nextOrderCode);
    }
    if (bkRes.ok) {
      const bkJson = await bkRes.json();
      setBookings(bkJson.data ?? []);
    }
  };

  const refreshBookings = async () => {
    const res = await fetch("/api/bookings");
    if (res.ok) {
      const json = await res.json();
      setBookings(json.data ?? []);
    }
  };

  const todayFormatted = formatDateHeader(new Date());

  const capsterButtonLabel = selectedCapster
    ? selectedCapster.name
    : capsterAuto
      ? "Siapa saja"
      : "Pilih Capster";

  const statusButtonLabel = selectedMember
    ? selectedMember.name
    : isMember
      ? "Member"
      : customerName.trim()
        ? customerName
        : "Pilih Status";

  return (
    <>
      {/* Main Catalog Area */}
      <main className="flex-1 bg-[#FAFAFA] p-4 sm:p-5 lg:p-6 overflow-y-auto min-w-0 pb-24 lg:pb-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">BARBERBOUS</h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              {todayFormatted} · Kasir: {cashierName}
            </p>
          </div>

          <div className="relative w-full sm:w-64 md:w-72">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari paket atau minuman"
              className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-9 pr-4 py-2 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A]"
            />
          </div>
        </div>

        {/* Section 1: Paket Barber */}
        <div className="mt-5">
          <div className="inline-flex items-center gap-1.5 bg-[#EFECE6] text-[#0F172A] px-3 py-1 rounded-full text-[11px] font-semibold">
            <Scissors className="w-3.5 h-3.5" />
            <span>Paket Barber</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-3">
            {filteredPackages.map((pkg) => {
              const qty = getPackageQty(pkg.id);
              const isSelected = qty > 0;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => toggleOrAddPackage(pkg)}
                  className={`text-left bg-white rounded-2xl p-3.5 transition-all cursor-pointer border ${
                    isSelected
                      ? "border-[#0F172A] ring-1 ring-[#0F172A] shadow-xs"
                      : "border-[#E5E7EB] hover:border-[#CBD5E1]"
                  }`}
                >
                  <div
                    className="w-full h-24 rounded-xl flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: pkg.badgeColor || "#EDE0CE" }}
                  >
                    {pkg.imageUrl ? (
                      <img
                        src={pkg.imageUrl}
                        alt={pkg.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-base font-extrabold tracking-widest uppercase text-[#3F3A32]">
                        {pkg.name}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#64748B] line-clamp-2 leading-snug">
                        {pkg.description}
                      </p>
                      <p className="text-sm font-bold text-[#0F172A] mt-1.5 tabular-nums">
                        {formatRupiah(pkg.price)}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[#0F172A] text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Produk Showcase (Minuman) */}
        <div className="mt-6">
          <div className="inline-flex items-center gap-1.5 bg-[#EFECE6] text-[#0F172A] px-3 py-1 rounded-full text-[11px] font-semibold">
            <CupSoda className="w-3.5 h-3.5" />
            <span>Produk Showcase</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-3">
            {filteredDrinks.map((drink) => {
              const qty = getDrinkQty(drink.id);
              const isSelected = qty > 0;
              const isOut = drink.stock <= 0;
              const isLow = drink.stock > 0 && drink.stock <= drink.minStock;

              return (
                <div
                  key={drink.id}
                  onClick={() => {
                    if (!isOut && qty === 0) updateDrinkQty(drink, 1);
                  }}
                  className={`bg-white rounded-2xl p-3.5 transition-all border ${
                    isOut
                      ? "border-[#E5E7EB] opacity-60 cursor-not-allowed"
                      : isSelected
                        ? "border-[#0F172A] ring-1 ring-[#0F172A] shadow-xs cursor-pointer"
                        : "border-[#E5E7EB] hover:border-[#CBD5E1] cursor-pointer"
                  }`}
                >
                  <div
                    className="relative w-full h-24 rounded-xl flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: drink.badgeColor || "#EDE0CE" }}
                  >
                    {drink.imageUrl ? (
                      <img
                        src={drink.imageUrl}
                        alt={drink.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-[#574F43]">
                        <CupSoda className="w-6 h-6 opacity-80" />
                        <span className="text-[11px] font-bold tracking-wider uppercase">
                          {drink.name}
                        </span>
                      </div>
                    )}

                    {isOut ? (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#DC2626] text-white text-[10px] font-semibold">
                        Habis
                      </span>
                    ) : isLow ? (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] text-[10px] font-semibold">
                        Sisa {drink.stock}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#0F172A] truncate">
                        {drink.name}
                      </p>
                      <p className="text-xs font-bold text-[#0F172A] mt-0.5 tabular-nums">
                        {formatRupiah(drink.price)}
                      </p>
                    </div>

                    {qty > 0 ? (
                      <div
                        className="flex items-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => updateDrinkQty(drink, -1)}
                          aria-label={`Kurangi ${drink.name}`}
                          className="w-6 h-6 rounded-full border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] flex items-center justify-center text-[#0F172A] cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-[#0F172A] tabular-nums">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateDrinkQty(drink, 1)}
                          aria-label={`Tambah ${drink.name}`}
                          className="w-6 h-6 rounded-full bg-[#0F172A] hover:bg-[#1E293B] text-white flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      !isOut && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateDrinkQty(drink, 1);
                          }}
                          aria-label={`Tambah ${drink.name}`}
                          className="w-7 h-7 rounded-full bg-[#F4F4F5] hover:bg-[#0F172A] text-[#0F172A] hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Mobile / Tablet Sticky Bottom Cart Bar (< lg) */}
      <div className="lg:hidden fixed bottom-[60px] md:bottom-0 left-0 md:left-[74px] right-0 z-20 bg-white border-t border-[#E5E7EB] px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
        <button
          type="button"
          onClick={() => setMobileCartOpen(true)}
          className="flex items-center gap-2.5 text-left min-w-0 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-[#F4F4F5] flex items-center justify-center text-[#0F172A] shrink-0">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-[#64748B] truncate">
              {totalQty === 0
                ? "Keranjang kosong"
                : `${totalQty} item${selectedCapster ? ` · ${selectedCapster.name}` : ""}`}
            </p>
            <p className="text-sm font-bold text-[#0F172A] tabular-nums">
              {formatRupiah(total)}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs font-semibold text-[#0F172A] cursor-pointer"
          >
            Detail
          </button>
          <button
            type="button"
            disabled={totalQty === 0}
            onClick={handleOpenCheckout}
            className="px-4 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#166534] disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
          >
            Bayar
          </button>
        </div>
      </div>

      {/* Tablet / Mobile Drawer Backdrop */}
      {mobileCartOpen && (
        <div
          onClick={() => setMobileCartOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}

      {/* Right Panel: Detail Transaksi */}
      <aside
        className={`${
          mobileCartOpen
            ? "fixed inset-y-0 right-0 z-40 flex w-full max-w-[380px] shadow-2xl"
            : "hidden"
        } lg:static lg:flex lg:w-[330px] xl:w-[375px] shrink-0 bg-white border-l border-[#E5E7EB] flex-col h-full`}
      >
        {/* Top Header + Walk-in / Booking Tabs */}
        <div className="px-5 pt-5 pb-3 border-b border-[#F1F5F9]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Detail Transaksi</h2>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Pesanan {orderCode}
                {selectedBookingId ? " · Dari Booking" : ""}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetCart}
                title="Kosongkan keranjang"
                className="w-8 h-8 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] hover:text-[#DC2626] transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                className="lg:hidden w-8 h-8 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-3.5 bg-[#F4F4F5] p-1 rounded-xl grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setOrderTab("WALK_IN")}
              className={`py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                orderTab === "WALK_IN"
                  ? "bg-white text-[#0F172A] shadow-xs"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              Walk-in
            </button>
            <button
              type="button"
              onClick={() => setOrderTab("BOOKING")}
              className={`py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                orderTab === "BOOKING"
                  ? "bg-white text-[#0F172A] shadow-xs"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              Booking ({bookings.length})
            </button>
          </div>
        </div>

        {/* Middle Scrollable Section */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {orderTab === "BOOKING" && !selectedBookingId && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                  Antrian Booking
                </p>
                <button
                  type="button"
                  onClick={() => setShowBookingAddModal(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F172A] hover:underline cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Booking baru
                </button>
              </div>

              {bookings.length === 0 ? (
                <p className="text-xs text-[#94A3B8] py-4 text-center">
                  Belum ada antrian booking aktif.
                </p>
              ) : (
                bookings.map((bk) => (
                  <button
                    key={bk.id}
                    type="button"
                    onClick={() => handleSelectBooking(bk)}
                    className="w-full text-left border border-[#E5E7EB] hover:border-[#0F172A] rounded-xl p-3 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[#0F172A]">{bk.customerName}</p>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          bk.status === "HADIR"
                            ? "bg-[#DCFCE7] text-[#15803D]"
                            : "bg-[#FEF3C7] text-[#B45309]"
                        }`}
                      >
                        {bk.status === "HADIR" ? "Hadir" : "Menunggu"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      {bk.scheduledTime} · Paket {bk.package.name} · {bk.capster.name}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Package Rows + Inline Capster & Status Controls */}
          {packageCart.length > 0 && (
            <div className="space-y-3">
              {packageCart.map((entry, idx) => (
                <div
                  key={entry.pkg.id}
                  className="pb-3 border-b border-[#F1F5F9] space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-[#0F172A]">
                          Paket {entry.pkg.name}
                        </p>
                        {entry.quantity > 1 && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#0F172A]">
                            ×{entry.quantity}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#64748B] leading-snug mt-0.5">
                        {entry.pkg.description}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-[#0F172A] tabular-nums">
                        {formatRupiah(entry.pkg.price * entry.quantity)}
                      </p>
                      <button
                        type="button"
                        onClick={() => updatePackageQty(entry.pkg.id, -entry.quantity)}
                        className="text-[10px] text-[#94A3B8] hover:text-[#DC2626] mt-0.5 cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>

                  {/* Show Capster + Customer Status pickers right under the primary service row */}
                  {idx === 0 && (
                    <div className="relative grid grid-cols-2 gap-2">
                      {/* Capster Selector Button */}
                      <button
                        type="button"
                        onClick={() => setShowCapsterDropdown((o) => !o)}
                        className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition cursor-pointer ${
                          selectedCapster || capsterAuto
                            ? "border-[#CBD5E1] bg-white text-[#0F172A]"
                            : "border-[#E5E7EB] bg-[#F8FAFC] text-[#475569] hover:border-[#0F172A]"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 min-w-0">
                          {selectedCapster?.photoUrl ? (
                            <img
                              src={selectedCapster.photoUrl}
                              alt={selectedCapster.name}
                              className="w-4 h-4 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <Scissors className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                          )}
                          <span className="truncate">{capsterButtonLabel}</span>
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                      </button>

                      {/* Customer Status Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowCapsterDropdown(false);
                          setShowPelangganModal(true);
                        }}
                        className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition cursor-pointer ${
                          selectedMember || isMember
                            ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]"
                            : "border-[#E5E7EB] bg-[#F8FAFC] text-[#475569] hover:border-[#0F172A]"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 min-w-0">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{statusButtonLabel}</span>
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      </button>

                      {/* Floating Capster Dropdown */}
                      {showCapsterDropdown && (
                        <div className="absolute left-0 top-10 w-[260px] bg-white border border-[#E5E7EB] rounded-2xl shadow-xl p-2 z-30 space-y-1">
                          <p className="px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">
                            Pilih capster
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCapsterId("");
                              setCapsterAuto(true);
                              setShowCapsterDropdown(false);
                            }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
                              capsterAuto && !selectedCapsterId
                                ? "bg-[#F4F4F5]"
                                : "hover:bg-[#F8FAFC]"
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] shrink-0">
                              <Scissors className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#0F172A]">Siapa saja</p>
                              <p className="text-[10px] text-[#64748B]">Ditentukan otomatis</p>
                            </div>
                          </button>

                          {capsters.map((c) => {
                            const isPicked = selectedCapsterId === c.id;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCapsterId(c.id);
                                  setCapsterAuto(false);
                                  setShowCapsterDropdown(false);
                                }}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
                                  isPicked ? "bg-[#F4F4F5]" : "hover:bg-[#F8FAFC]"
                                }`}
                              >
                                <div
                                  className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                                  style={{ backgroundColor: c.bgColor }}
                                >
                                  {c.photoUrl ? (
                                    <img
                                      src={c.photoUrl}
                                      alt={c.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    getInitials(c.name)
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-[#0F172A]">{c.name}</p>
                                  <p className="text-[10px] text-[#64748B] flex items-center gap-1">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full inline-block ${
                                        c.status === "TERSEDIA"
                                          ? "bg-[#15803D]"
                                          : c.status === "MELAYANI"
                                            ? "bg-[#D97706]"
                                            : "bg-[#94A3B8]"
                                      }`}
                                    />
                                    {c.status === "TERSEDIA"
                                      ? "Tersedia"
                                      : c.status === "MELAYANI"
                                        ? "Melayani"
                                        : "Istirahat"}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Drink Rows */}
          {drinkCart.length > 0 && (
            <div className="space-y-3">
              {drinkCart.map((entry) => (
                <div
                  key={entry.drink.id}
                  className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#F1F5F9]"
                >
                  <p className="text-xs font-semibold text-[#0F172A] min-w-0 flex-1 truncate">
                    {entry.drink.name}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateDrinkQty(entry.drink, -1)}
                      className="w-6 h-6 rounded-lg border border-[#CBD5E1] hover:bg-[#F8FAFC] flex items-center justify-center text-[#0F172A] cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-[#0F172A] tabular-nums">
                      {entry.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateDrinkQty(entry.drink, 1)}
                      className="w-6 h-6 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs font-bold text-[#0F172A] tabular-nums w-20 text-right shrink-0">
                    {formatRupiah(entry.drink.price * entry.quantity)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Drink-only status selector shortcut */}
          {packageCart.length === 0 && drinkCart.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowPelangganModal(true)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-xs font-medium text-[#475569] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />
                  {statusButtonLabel}
                </span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Empty State */}
          {totalQty === 0 && orderTab === "WALK_IN" && (
            <div className="py-12 text-center space-y-1.5">
              <p className="text-xs font-medium text-[#64748B]">Belum ada item dipilih</p>
              <p className="text-[11px] text-[#94A3B8]">
                Pilih paket barber atau minuman showcase di sebelah kiri.
              </p>
            </div>
          )}

          {notes && (
            <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl px-3 py-2 flex items-start justify-between gap-2 text-[11px]">
              <div>
                <span className="font-semibold text-[#0F172A]">Catatan: </span>
                <span className="text-[#475569]">{notes}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNotesDraft(notes);
                  setShowCatatanModal(true);
                }}
                className="text-[#64748B] hover:text-[#0F172A] shrink-0 cursor-pointer"
              >
                Ubah
              </button>
            </div>
          )}

          {needsCapsterWarning && (
            <p className="text-[11px] text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-3 py-2">
              Capster belum dipilih — bila lanjut, akan otomatis ditentukan (“Siapa saja”).
            </p>
          )}
        </div>

        {/* Bottom Actions + Summary */}
        <div className="px-5 py-4 border-t border-[#E5E7EB] bg-white space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setShowDiskonModal(true)}
              className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                discountAmount > 0
                  ? "border-[#15803D] bg-[#F0FDF4] text-[#15803D]"
                  : "border-[#E5E7EB] hover:bg-[#F8FAFC] text-[#0F172A]"
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              {discountAmount > 0 ? "Diskon aktif" : "Diskon"}
            </button>
            <button
              type="button"
              onClick={() => {
                setNotesDraft(notes);
                setShowCatatanModal(true);
              }}
              className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                notes
                  ? "border-[#0F172A] bg-[#F8FAFC] text-[#0F172A]"
                  : "border-[#E5E7EB] hover:bg-[#F8FAFC] text-[#0F172A]"
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              Catatan
            </button>
          </div>

          <div className="space-y-1.5 pt-1 text-xs">
            <div className="flex items-center justify-between text-[#64748B]">
              <span>Subtotal</span>
              <span className="font-medium text-[#0F172A] tabular-nums">
                {formatRupiah(subtotal)}
              </span>
            </div>

            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-[#15803D]">
                <span>{discount.label ?? "Diskon"}</span>
                <span className="font-medium tabular-nums">-{formatRupiah(discountAmount)}</span>
              </div>
            )}

            {taxAmount > 0 && (
              <div className="flex items-center justify-between text-[#64748B]">
                <span>Pajak ({setting.taxRate}%)</span>
                <span className="tabular-nums">{formatRupiah(taxAmount)}</span>
              </div>
            )}

            {serviceFeeAmount > 0 && (
              <div className="flex items-center justify-between text-[#64748B]">
                <span>Biaya layanan</span>
                <span className="tabular-nums">{formatRupiah(serviceFeeAmount)}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
              <span className="text-xs font-medium text-[#64748B]">Total</span>
              <span className="text-xl font-bold text-[#0F172A] tabular-nums">
                {formatRupiah(total)}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={totalQty === 0}
            onClick={handleOpenCheckout}
            className="w-full py-3 rounded-xl bg-[#15803D] hover:bg-[#166534] disabled:opacity-40 text-white text-xs font-semibold transition cursor-pointer"
          >
            Lanjut Transaksi
          </button>
        </div>
      </aside>

      {/* Modals */}
      {showPelangganModal && (
        <PelangganModal
          orderCode={orderCode}
          initialIsMember={isMember}
          initialMember={selectedMember}
          members={members}
          onConfirm={(res) => {
            setIsMember(res.isMember);
            setSelectedMember(res.member);
            setCustomerName(res.member?.name ?? "");
            setShowPelangganModal(false);
          }}
          onClose={() => setShowPelangganModal(false)}
        />
      )}

      {showDiskonModal && (
        <DiskonModal
          orderCode={orderCode}
          subtotal={subtotal}
          initialDiscount={discount}
          onApply={(next) => {
            setDiscount(next);
            setShowDiskonModal(false);
          }}
          onRemove={() => {
            setDiscount({ type: null, value: 0, amount: 0, label: null, voucherCode: null });
            setShowDiskonModal(false);
          }}
          onClose={() => setShowDiskonModal(false)}
        />
      )}

      {showCatatanModal && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Catatan transaksi</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Tambahkan permintaan khusus pelanggan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCatatanModal(false)}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              rows={3}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Contoh: Samping tipis fade, bagian atas rapikan"
              className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setShowCatatanModal(false)}
                className="py-2.5 rounded-xl border border-[#E5E7EB] text-xs font-semibold text-[#0F172A] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setNotes(notesDraft.trim());
                  setShowCatatanModal(false);
                }}
                className="py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold cursor-pointer"
              >
                Simpan catatan
              </button>
            </div>
          </div>
        </div>
      )}

      {showPembayaranModal && (
        <PembayaranModal
          orderCode={orderCode}
          customerName={
            selectedMember?.name || customerName.trim() || (isMember ? "Member" : "Umum")
          }
          customerPhone={selectedMember?.phone}
          capsterName={
            selectedCapster?.name ??
            (packageCart.length > 0 ? capsters[0]?.name ?? "Siapa saja" : "-")
          }
          totalQty={totalQty}
          total={total}
          tunaiEnabled={setting.tunaiEnabled}
          qrisEnabled={setting.qrisEnabled}
          debitEnabled={setting.debitEnabled}
          qrisMerchantName={setting.qrisMerchantName}
          storeInfo={setting}
          onConfirmPayment={handleConfirmPayment}
          onStartNewTransaction={handleStartNewTransaction}
          onClose={() => setShowPembayaranModal(false)}
        />
      )}

      {showBookingAddModal && (
        <BookingAddModal
          packages={packages}
          capsters={capsters}
          onCreated={refreshBookings}
          onClose={() => setShowBookingAddModal(false)}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0F172A] text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
