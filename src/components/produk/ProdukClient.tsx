"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Plus,
  Box,
  CupSoda,
  UtensilsCrossed,
  X,
  Trash2,
  PackagePlus,
  Lock,
} from "lucide-react";
import { formatDateShort, formatRupiah, formatTimeHHMM, getInitials } from "@/lib/format";

export interface ProductPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  badgeColor: string;
  isActive: boolean;
}

export interface ProductDrink {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  imageUrl: string | null;
  badgeColor: string;
  isActive: boolean;
}

interface StockLogItem {
  id: string;
  delta: number;
  previousStock: number;
  newStock: number;
  note: string;
  createdBy: string;
  createdAt: string;
}

type DrawerMode =
  | { kind: "edit-package"; item: ProductPackage }
  | { kind: "new-package" }
  | { kind: "edit-drink"; item: ProductDrink }
  | { kind: "new-drink" }
  | null;

export function ProdukClient({
  initialPackages,
  initialDrinks,
  userRole = "Kasir",
}: {
  initialPackages: ProductPackage[];
  initialDrinks: ProductDrink[];
  userRole?: string;
}) {
  const isManager = userRole === "Owner" || userRole === "Admin";

  const [packages, setPackages] = useState<ProductPackage[]>(initialPackages);
  const [drinks, setDrinks] = useState<ProductDrink[]>(initialDrinks);
  const [kafeFilter, setKafeFilter] = useState<"ALL" | "Minuman" | "Makanan">("ALL");
  const [search, setSearch] = useState("");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [drawer, setDrawer] = useState<DrawerMode>(
    initialDrinks[0]
      ? { kind: "edit-drink", item: initialDrinks[0] }
      : initialPackages[0]
        ? { kind: "edit-package", item: initialPackages[0] }
        : null
  );

  // Form states
  const [nameInput, setNameInput] = useState(initialDrinks[0]?.name ?? "");
  const [descInput, setDescInput] = useState(initialDrinks[0]?.category ?? "Minuman");
  const [priceInput, setPriceInput] = useState(
    initialDrinks[0] ? String(initialDrinks[0].price) : "5000"
  );
  const [stockInput, setStockInput] = useState(
    initialDrinks[0] ? String(initialDrinks[0].stock) : "50"
  );
  const [minStockInput, setMinStockInput] = useState(
    initialDrinks[0] ? String(initialDrinks[0].minStock) : "6"
  );
  const [imageInput, setImageInput] = useState<string | null>(
    initialDrinks[0]?.imageUrl ?? null
  );
  const [activeInput, setActiveInput] = useState<boolean>(
    initialDrinks[0]?.isActive ?? true
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Quick Restock & Stock Logs states
  const [restockDelta, setRestockDelta] = useState("12");
  const [restockNote, setRestockNote] = useState("Restock stok kafe");
  const [restocking, setRestocking] = useState(false);
  const [stockLogState, setStockLogState] = useState<{
    drinkId: string | null;
    items: StockLogItem[];
  }>({ drinkId: null, items: [] });

  const selectedDrinkId = drawer?.kind === "edit-drink" ? drawer.item.id : null;
  const stockLogs = stockLogState.drinkId === selectedDrinkId ? stockLogState.items : [];

  useEffect(() => {
    if (!selectedDrinkId) return;
    let active = true;
    fetch(`/api/drinks/${selectedDrinkId}/restock`)
      .then((r) => r.json())
      .then((json) => {
        if (active && Array.isArray(json.data)) {
          setStockLogState({ drinkId: selectedDrinkId, items: json.data });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedDrinkId]);

  const openEditPackage = (pkg: ProductPackage) => {
    setDrawer({ kind: "edit-package", item: pkg });
    setMobileDrawerOpen(true);
    setNameInput(pkg.name);
    setDescInput(pkg.description);
    setPriceInput(String(pkg.price));
    setImageInput(pkg.imageUrl);
    setActiveInput(pkg.isActive);
    setFeedback(null);
    setErrorMsg(null);
  };

  const openNewPackage = () => {
    setShowAddMenu(false);
    setDrawer({ kind: "new-package" });
    setMobileDrawerOpen(true);
    setNameInput("");
    setDescInput("Haircut, Hair tonic, Styling");
    setPriceInput("35000");
    setImageInput(null);
    setActiveInput(true);
    setFeedback(null);
    setErrorMsg(null);
  };

  const openEditDrink = (drink: ProductDrink) => {
    setDrawer({ kind: "edit-drink", item: drink });
    setMobileDrawerOpen(true);
    setNameInput(drink.name);
    setDescInput(drink.category);
    setPriceInput(String(drink.price));
    setStockInput(String(drink.stock));
    setMinStockInput(String(drink.minStock));
    setImageInput(drink.imageUrl);
    setActiveInput(drink.isActive);
    setFeedback(null);
    setErrorMsg(null);
  };

  const openNewDrink = (defaultCategory: "Minuman" | "Makanan" = "Minuman") => {
    setShowAddMenu(false);
    setDrawer({ kind: "new-drink" });
    setMobileDrawerOpen(true);
    setNameInput("");
    setDescInput(defaultCategory);
    setPriceInput(defaultCategory === "Makanan" ? "10000" : "5000");
    setStockInput("50");
    setMinStockInput("6");
    setImageInput(null);
    setActiveInput(true);
    setFeedback(null);
    setErrorMsg(null);
  };

  const handleQuickRestock = async (drinkId: string, delta: number, note?: string) => {
    if (delta <= 0) return;
    setRestocking(true);
    setFeedback(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/drinks/${drinkId}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta, note: note || "Restock stok kafe" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setDrinks((prev) => prev.map((d) => (d.id === drinkId ? json.data : d)));
      if (drawer?.kind === "edit-drink" && drawer.item.id === drinkId) {
        setDrawer({ kind: "edit-drink", item: json.data });
        setStockInput(String(json.data.stock));
        if (json.log) {
          setStockLogState((prev) => ({
            drinkId,
            items: [json.log, ...(prev.drinkId === drinkId ? prev.items : [])],
          }));
        }
      }
      setFeedback(`Stok bertambah +${delta} (total ${json.data.stock} stok)`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menambah stok");
    } finally {
      setRestocking(false);
    }
  };

  const handleTogglePackage = async (pkg: ProductPackage) => {
    if (!isManager) {
      setErrorMsg("Hanya Owner/Admin yang dapat menonaktifkan paket");
      return;
    }
    const res = await fetch(`/api/packages/${pkg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !pkg.isActive }),
    });
    if (res.ok) {
      const json = await res.json();
      setPackages((prev) => prev.map((p) => (p.id === pkg.id ? json.data : p)));
      if (drawer?.kind === "edit-package" && drawer.item.id === pkg.id) {
        setActiveInput(json.data.isActive);
      }
    }
  };

  const handleToggleDrink = async (drink: ProductDrink) => {
    if (!isManager) {
      setErrorMsg("Hanya Owner/Admin yang dapat menonaktifkan menu kafe");
      return;
    }
    const res = await fetch(`/api/drinks/${drink.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !drink.isActive }),
    });
    if (res.ok) {
      const json = await res.json();
      setDrinks((prev) => prev.map((d) => (d.id === drink.id ? json.data : d)));
      if (drawer?.kind === "edit-drink" && drawer.item.id === drink.id) {
        setActiveInput(json.data.isActive);
      }
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setImageInput(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawer) return;
    setSaving(true);
    setFeedback(null);
    setErrorMsg(null);
    try {
      if (drawer.kind === "edit-package") {
        const res = await fetch(`/api/packages/${drawer.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nameInput,
            description: descInput,
            price: Number(priceInput),
            imageUrl: imageInput,
            isActive: activeInput,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setPackages((prev) => prev.map((p) => (p.id === json.data.id ? json.data : p)));
        setDrawer({ kind: "edit-package", item: json.data });
        setFeedback("Paket berhasil diperbarui");
      } else if (drawer.kind === "new-package") {
        const res = await fetch("/api/packages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nameInput,
            description: descInput,
            price: Number(priceInput),
            imageUrl: imageInput,
            isActive: activeInput,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setPackages((prev) => [...prev, json.data]);
        setDrawer({ kind: "edit-package", item: json.data });
        setFeedback("Paket baru ditambahkan");
      } else if (drawer.kind === "edit-drink") {
        const res = await fetch(`/api/drinks/${drawer.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nameInput,
            category: descInput,
            price: Number(priceInput),
            stock: Number(stockInput),
            minStock: Number(minStockInput),
            imageUrl: imageInput,
            isActive: activeInput,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setDrinks((prev) => prev.map((d) => (d.id === json.data.id ? json.data : d)));
        setDrawer({ kind: "edit-drink", item: json.data });
        setFeedback("Produk kafe berhasil diperbarui");
      } else if (drawer.kind === "new-drink") {
        const res = await fetch("/api/drinks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nameInput,
            category: descInput,
            price: Number(priceInput),
            stock: Number(stockInput),
            minStock: Number(minStockInput),
            imageUrl: imageInput,
            isActive: activeInput,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setDrinks((prev) => [...prev, json.data]);
        setDrawer({ kind: "edit-drink", item: json.data });
        setFeedback("Produk kafe baru ditambahkan");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!drawer) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      if (drawer.kind === "edit-package") {
        const res = await fetch(`/api/packages/${drawer.item.id}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (json.deactivated) {
          setPackages((prev) => prev.map((p) => (p.id === json.data.id ? json.data : p)));
          setActiveInput(false);
          setFeedback(json.message);
        } else {
          const remaining = packages.filter((p) => p.id !== drawer.item.id);
          setPackages(remaining);
          setDrawer(remaining[0] ? { kind: "edit-package", item: remaining[0] } : null);
        }
      } else if (drawer.kind === "edit-drink") {
        const res = await fetch(`/api/drinks/${drawer.item.id}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (json.deactivated) {
          setDrinks((prev) => prev.map((d) => (d.id === json.data.id ? json.data : d)));
          setActiveInput(false);
          setFeedback(json.message);
        } else {
          const remaining = drinks.filter((d) => d.id !== drawer.item.id);
          setDrinks(remaining);
          setDrawer(remaining[0] ? { kind: "edit-drink", item: remaining[0] } : null);
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menghapus item");
    } finally {
      setSaving(false);
    }
  };

  const filteredPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? packages.filter(
          (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
        )
      : packages;
  }, [packages, search]);

  const filteredDrinks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drinks.filter((d) => {
      if (kafeFilter !== "ALL" && d.category !== kafeFilter) return false;
      if (!q) return true;
      return d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q);
    });
  }, [drinks, search, kafeFilter]);

  const minumanCount = useMemo(
    () => drinks.filter((d) => d.category === "Minuman").length,
    [drinks]
  );
  const makananCount = useMemo(
    () => drinks.filter((d) => d.category === "Makanan").length,
    [drinks]
  );

  const isDrinkDrawer = drawer?.kind === "edit-drink" || drawer?.kind === "new-drink";

  return (
    <>
      <main className="flex-1 bg-[#FAFAFA] p-4 sm:p-5 lg:p-6 overflow-y-auto min-w-0">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Produk Barber &amp; Kafe</h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              {packages.length} paket barber · {minumanCount} minuman · {makananCount} makanan
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari paket, minuman, makanan"
                className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-8 pr-3 py-2 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            {isManager && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAddMenu((prev) => !prev)}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah baru
                </button>
                {showAddMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E5E7EB] rounded-xl shadow-lg py-1 z-20 text-xs">
                    <button
                      type="button"
                      onClick={openNewPackage}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#F8FAFC] text-[#0F172A] font-medium cursor-pointer"
                    >
                      + Tambah paket barber
                    </button>
                    <button
                      type="button"
                      onClick={() => openNewDrink("Minuman")}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#F8FAFC] text-[#0F172A] font-medium cursor-pointer"
                    >
                      + Tambah minuman kafe
                    </button>
                    <button
                      type="button"
                      onClick={() => openNewDrink("Makanan")}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#F8FAFC] text-[#0F172A] font-medium cursor-pointer"
                    >
                      + Tambah makanan kafe
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 1: Paket Barber */}
        <div className="mt-5">
          <div className="inline-flex items-center gap-1.5 bg-white border border-[#E5E7EB] rounded-full px-3 py-1 text-[11px] font-medium text-[#0F172A]">
            <Box className="w-3 h-3" />
            Unit Barber — Paket Cukur
          </div>

          <div className="mt-2.5 bg-white border border-[#E5E7EB] rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[420px] text-left border-collapse">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] font-medium text-[#64748B]">
                  <th className="py-3 px-4">Paket</th>
                  <th className="py-3 px-4 text-right">Harga</th>
                  <th className="py-3 px-4 text-right">Aktif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs">
                {filteredPackages.map((pkg) => {
                  const isSelected =
                    drawer?.kind === "edit-package" && drawer.item.id === pkg.id;
                  return (
                    <tr
                      key={pkg.id}
                      onClick={() => openEditPackage(pkg)}
                      className={`cursor-pointer transition ${
                        isSelected ? "bg-[#F8FAFC]" : "hover:bg-[#FAFAFA]"
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-[#3F3A32] shrink-0 overflow-hidden"
                            style={{ backgroundColor: pkg.badgeColor || "#EDE0CE" }}
                          >
                            {pkg.imageUrl ? (
                              <img
                                src={pkg.imageUrl}
                                alt={pkg.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              pkg.name.slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-[#0F172A]">{pkg.name}</p>
                            <p className="text-[11px] text-[#64748B] truncate max-w-[260px]">
                              {pkg.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-[#0F172A] tabular-nums">
                        {formatRupiah(pkg.price)}
                      </td>
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          disabled={!isManager}
                          aria-label={`Aktifkan paket ${pkg.name}`}
                          onClick={() => handleTogglePackage(pkg)}
                          className={`inline-flex items-center w-9 h-5 rounded-full p-0.5 transition ${
                            !isManager ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                          } ${pkg.isActive ? "bg-[#15803D]" : "bg-[#CBD5E1]"}`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition ${
                              pkg.isActive ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Unit Kafe — Minuman & Makanan */}
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 bg-white border border-[#E5E7EB] rounded-full px-3 py-1 text-[11px] font-medium text-[#0F172A]">
              <CupSoda className="w-3 h-3" />
              Unit Kafe — Minuman &amp; Makanan ({drinks.length})
            </div>

            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: "ALL", label: `Semua (${drinks.length})` },
                  { id: "Minuman", label: `Minuman (${minumanCount})` },
                  { id: "Makanan", label: `Makanan (${makananCount})` },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setKafeFilter(item.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                    kafeFilter === item.id
                      ? "bg-[#0F172A] text-white"
                      : "bg-white border border-[#E5E7EB] text-[#475569] hover:bg-[#F8FAFC]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2.5 bg-white border border-[#E5E7EB] rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[620px] text-left border-collapse">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] font-medium text-[#64748B]">
                  <th className="py-3 px-4">Produk Kafe</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-right">Harga</th>
                  <th className="py-3 px-4 text-right">Stok</th>
                  <th className="py-3 px-4 text-right">Isi Cepat</th>
                  <th className="py-3 px-4 text-right">Aktif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs">
                {filteredDrinks.map((drink) => {
                  const isSelected =
                    drawer?.kind === "edit-drink" && drawer.item.id === drink.id;
                  const isOut = drink.stock <= 0;
                  const isLow = drink.stock > 0 && drink.stock <= drink.minStock;
                  const isFood = drink.category === "Makanan";
                  return (
                    <tr
                      key={drink.id}
                      onClick={() => openEditDrink(drink)}
                      className={`cursor-pointer transition ${
                        isSelected ? "bg-[#F8FAFC]" : "hover:bg-[#FAFAFA]"
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-[#3F3A32] shrink-0 overflow-hidden"
                            style={{
                              backgroundColor:
                                drink.badgeColor || (isFood ? "#F5E6CC" : "#EDE0CE"),
                            }}
                          >
                            {drink.imageUrl ? (
                              <img
                                src={drink.imageUrl}
                                alt={drink.name}
                                className="w-full h-full object-cover"
                              />
                            ) : isFood ? (
                              <UtensilsCrossed className="w-4 h-4 text-[#574F43]" />
                            ) : (
                              drink.name.slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <span className="font-semibold text-[#0F172A]">{drink.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            isFood
                              ? "bg-[#FEF3C7] text-[#B45309]"
                              : "bg-[#F1F5F9] text-[#475569]"
                          }`}
                        >
                          {drink.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-[#0F172A] tabular-nums">
                        {formatRupiah(drink.price)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOut
                                ? "bg-[#DC2626]"
                                : isLow
                                  ? "bg-[#F59E0B]"
                                  : "bg-[#15803D]"
                            }`}
                          />
                          <span
                            className={
                              isOut
                                ? "text-[#DC2626]"
                                : isLow
                                  ? "text-[#B45309]"
                                  : "text-[#0F172A]"
                            }
                          >
                            {isOut
                              ? "0 · habis"
                              : isLow
                                ? `${drink.stock} stok · menipis`
                                : `${drink.stock} stok`}
                          </span>
                        </span>
                      </td>
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          disabled={restocking}
                          onClick={() =>
                            handleQuickRestock(drink.id, 12, `Quick restock +12 (${drink.name})`)
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#15803D] text-[11px] font-semibold transition cursor-pointer"
                        >
                          <PackagePlus className="w-3 h-3" />
                          +12 stok
                        </button>
                      </td>
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          disabled={!isManager}
                          aria-label={`Aktifkan produk ${drink.name}`}
                          onClick={() => handleToggleDrink(drink)}
                          className={`inline-flex items-center w-9 h-5 rounded-full p-0.5 transition ${
                            !isManager ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                          } ${drink.isActive ? "bg-[#15803D]" : "bg-[#CBD5E1]"}`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition ${
                              drink.isActive ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Right Edit / Add / Quick Restock Drawer */}
      {drawer && mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}
      {drawer && (
        <aside
          className={`${
            mobileDrawerOpen
              ? "fixed inset-y-0 right-0 z-40 flex w-full max-w-[380px] shadow-2xl"
              : "hidden"
          } lg:static lg:flex lg:w-[340px] xl:w-[385px] shrink-0 bg-white border-l border-[#E5E7EB] p-6 flex-col gap-5 overflow-y-auto`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0F172A]">
              {drawer.kind === "edit-package"
                ? "Detail & edit paket barber"
                : drawer.kind === "new-package"
                  ? "Tambah paket barber"
                  : drawer.kind === "edit-drink"
                    ? "Edit & stok produk kafe"
                    : "Tambah produk kafe"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setMobileDrawerOpen(false);
                setDrawer(null);
              }}
              className="w-8 h-8 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {feedback && (
            <p className="text-[11px] font-medium text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-2 rounded-lg">
              {feedback}
            </p>
          )}

          {errorMsg && (
            <p className="text-[11px] font-medium text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 rounded-lg">
              {errorMsg}
            </p>
          )}

          {/* Quick Restock Card */}
          {drawer.kind === "edit-drink" && (
            <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                  <PackagePlus className="w-3.5 h-3.5 text-[#15803D]" />
                  Isi Stok Cepat ({drawer.item.stock} stok)
                </p>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[6, 12, 24].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    disabled={restocking}
                    onClick={() =>
                      handleQuickRestock(drawer.item.id, qty, `Isi stok +${qty}`)
                    }
                    className="py-1.5 rounded-lg bg-white border border-[#E5E7EB] hover:border-[#15803D] hover:text-[#15803D] text-xs font-semibold text-[#0F172A] cursor-pointer"
                  >
                    +{qty} stok
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={restockDelta}
                  onChange={(e) => setRestockDelta(e.target.value)}
                  className="w-20 bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#0F172A]"
                />
                <input
                  value={restockNote}
                  onChange={(e) => setRestockNote(e.target.value)}
                  placeholder="Catatan stok"
                  className="flex-1 bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A]"
                />
                <button
                  type="button"
                  disabled={restocking}
                  onClick={() =>
                    handleQuickRestock(drawer.item.id, Number(restockDelta) || 0, restockNote)
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold shrink-0 cursor-pointer"
                >
                  + Isi
                </button>
              </div>

              {stockLogs.length > 0 && (
                <div className="border-t border-[#E5E7EB] pt-2.5 space-y-1.5 max-h-28 overflow-y-auto">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Riwayat Stok Masuk Terakhir
                  </p>
                  {stockLogs.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between text-[11px] text-[#475569]"
                    >
                      <span className="truncate">
                        +{log.delta} ({log.previousStock}→{log.newStock}) · {log.createdBy}
                      </span>
                      <span className="text-[10px] text-[#94A3B8] shrink-0">
                        {formatDateShort(log.createdAt)} {formatTimeHHMM(log.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isManager && (
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-3 py-2 text-[11px] text-[#B45309] flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Perubahan harga &amp; hapus produk khusus Owner/Admin.</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3.5">
            <div className="w-full h-24 rounded-2xl bg-[#EDE0CE] flex items-center justify-center overflow-hidden">
              {imageInput ? (
                <img src={imageInput} alt={nameInput} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-extrabold tracking-widest uppercase text-[#574F43]">
                  {isDrinkDrawer ? getInitials(nameInput || "KF") : nameInput || "PAKET"}
                </span>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            {isManager && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full py-2 border border-[#E5E7EB] hover:bg-[#F8FAFC] rounded-xl text-xs font-semibold text-[#0F172A] cursor-pointer"
              >
                Ganti foto
              </button>
            )}

            <div>
              <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                {isDrinkDrawer ? "Nama produk kafe" : "Nama paket"}
              </label>
              <input
                required
                disabled={!isManager}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full border border-[#E5E7EB] disabled:bg-[#F8FAFC] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                {isDrinkDrawer ? "Kategori Kafe" : "Isi paket"}
              </label>
              {isDrinkDrawer ? (
                <select
                  disabled={!isManager}
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  className="w-full border border-[#E5E7EB] disabled:bg-[#F8FAFC] bg-white rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                >
                  <option value="Minuman">Minuman</option>
                  <option value="Makanan">Makanan</option>
                </select>
              ) : (
                <input
                  required
                  disabled={!isManager}
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  className="w-full border border-[#E5E7EB] disabled:bg-[#F8FAFC] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#64748B] mb-1">Harga</label>
              <input
                required
                disabled={!isManager}
                type="number"
                min={0}
                step={500}
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="w-full border border-[#E5E7EB] disabled:bg-[#F8FAFC] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            {isDrinkDrawer && (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                    Stok saat ini
                  </label>
                  <input
                    required
                    disabled={!isManager}
                    type="number"
                    min={0}
                    value={stockInput}
                    onChange={(e) => setStockInput(e.target.value)}
                    className="w-full border border-[#E5E7EB] disabled:bg-[#F8FAFC] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                    Batas stok minimum (peringatan)
                  </label>
                  <input
                    required
                    disabled={!isManager}
                    type="number"
                    min={0}
                    value={minStockInput}
                    onChange={(e) => setMinStockInput(e.target.value)}
                    className="w-full border border-[#E5E7EB] disabled:bg-[#F8FAFC] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
              </>
            )}

            {isManager && (
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold cursor-pointer"
                >
                  {saving ? "Menyimpan..." : "Simpan perubahan"}
                </button>

                {(drawer.kind === "edit-package" || drawer.kind === "edit-drink") && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleDelete}
                    className="w-full py-2.5 rounded-xl border border-[#FEE2E2] hover:bg-[#FEF2F2] text-[#DC2626] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {drawer.kind === "edit-drink" ? "Hapus produk kafe" : "Hapus paket"}
                  </button>
                )}
              </div>
            )}
          </form>
        </aside>
      )}
    </>
  );
}
