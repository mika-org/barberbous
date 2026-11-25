"use client";

import React, { useMemo, useRef, useState } from "react";
import { Search, Plus, Box, CupSoda, X, Trash2 } from "lucide-react";
import { formatRupiah, getInitials } from "@/lib/format";

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

type DrawerMode =
  | { kind: "edit-package"; item: ProductPackage }
  | { kind: "new-package" }
  | { kind: "edit-drink"; item: ProductDrink }
  | { kind: "new-drink" }
  | null;

export function ProdukClient({
  initialPackages,
  initialDrinks,
}: {
  initialPackages: ProductPackage[];
  initialDrinks: ProductDrink[];
}) {
  const [packages, setPackages] = useState<ProductPackage[]>(initialPackages);
  const [drinks, setDrinks] = useState<ProductDrink[]>(initialDrinks);
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
  const [descInput, setDescInput] = useState(initialDrinks[0]?.category ?? "Minuman kemasan");
  const [priceInput, setPriceInput] = useState(
    initialDrinks[0] ? String(initialDrinks[0].price) : "5000"
  );
  const [stockInput, setStockInput] = useState(
    initialDrinks[0] ? String(initialDrinks[0].stock) : "24"
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
  const fileRef = useRef<HTMLInputElement>(null);

  const openEditPackage = (pkg: ProductPackage) => {
    setDrawer({ kind: "edit-package", item: pkg });
    setMobileDrawerOpen(true);
    setNameInput(pkg.name);
    setDescInput(pkg.description);
    setPriceInput(String(pkg.price));
    setImageInput(pkg.imageUrl);
    setActiveInput(pkg.isActive);
    setFeedback(null);
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
  };

  const openNewDrink = () => {
    setShowAddMenu(false);
    setDrawer({ kind: "new-drink" });
    setMobileDrawerOpen(true);
    setNameInput("");
    setDescInput("Minuman kemasan");
    setPriceInput("5000");
    setStockInput("20");
    setMinStockInput("6");
    setImageInput(null);
    setActiveInput(true);
    setFeedback(null);
  };

  const handleTogglePackage = async (pkg: ProductPackage) => {
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
        setFeedback("Minuman berhasil diperbarui");
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
        setFeedback("Minuman baru ditambahkan");
      }
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Gagal menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!drawer) return;
    setSaving(true);
    try {
      if (drawer.kind === "edit-package") {
        const res = await fetch(`/api/packages/${drawer.item.id}`, { method: "DELETE" });
        const json = await res.json();
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
    return q
      ? drinks.filter(
          (d) => d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)
        )
      : drinks;
  }, [drinks, search]);

  const isDrinkDrawer = drawer?.kind === "edit-drink" || drawer?.kind === "new-drink";

  return (
    <>
      <main className="flex-1 bg-[#FAFAFA] p-4 sm:p-5 lg:p-6 overflow-y-auto min-w-0">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Produk</h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              {packages.length} paket · {drinks.length} minuman
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari paket atau minuman"
                className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-8 pr-3 py-2 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A]"
              />
            </div>

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
                <div className="absolute right-0 mt-2 w-44 bg-white border border-[#E5E7EB] rounded-xl shadow-lg py-1 z-20 text-xs">
                  <button
                    type="button"
                    onClick={openNewPackage}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#F8FAFC] text-[#0F172A] font-medium cursor-pointer"
                  >
                    + Tambah paket
                  </button>
                  <button
                    type="button"
                    onClick={openNewDrink}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#F8FAFC] text-[#0F172A] font-medium cursor-pointer"
                  >
                    + Tambah minuman
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 1: Paket */}
        <div className="mt-5">
          <div className="inline-flex items-center gap-1.5 bg-white border border-[#E5E7EB] rounded-full px-3 py-1 text-[11px] font-medium text-[#0F172A]">
            <Box className="w-3 h-3" />
            Paket
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
                          aria-label={`Aktifkan paket ${pkg.name}`}
                          onClick={() => handleTogglePackage(pkg)}
                          className={`inline-flex items-center w-9 h-5 rounded-full p-0.5 transition cursor-pointer ${
                            pkg.isActive ? "bg-[#15803D]" : "bg-[#CBD5E1]"
                          }`}
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

        {/* Section 2: Minuman Kemasan */}
        <div className="mt-6">
          <div className="inline-flex items-center gap-1.5 bg-white border border-[#E5E7EB] rounded-full px-3 py-1 text-[11px] font-medium text-[#0F172A]">
            <CupSoda className="w-3 h-3" />
            Minuman Kemasan
          </div>

          <div className="mt-2.5 bg-white border border-[#E5E7EB] rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[520px] text-left border-collapse">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] font-medium text-[#64748B]">
                  <th className="py-3 px-4">Minuman</th>
                  <th className="py-3 px-4 text-right">Harga</th>
                  <th className="py-3 px-4 text-right">Stok (kulkas)</th>
                  <th className="py-3 px-4 text-right">Aktif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs">
                {filteredDrinks.map((drink) => {
                  const isSelected =
                    drawer?.kind === "edit-drink" && drawer.item.id === drink.id;
                  const isOut = drink.stock <= 0;
                  const isLow = drink.stock > 0 && drink.stock <= drink.minStock;
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
                            style={{ backgroundColor: drink.badgeColor || "#EDE0CE" }}
                          >
                            {drink.imageUrl ? (
                              <img
                                src={drink.imageUrl}
                                alt={drink.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              drink.name.slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <span className="font-semibold text-[#0F172A]">{drink.name}</span>
                        </div>
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
                                ? `${drink.stock} botol · menipis`
                                : `${drink.stock} botol`}
                          </span>
                        </span>
                      </td>
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          aria-label={`Aktifkan minuman ${drink.name}`}
                          onClick={() => handleToggleDrink(drink)}
                          className={`inline-flex items-center w-9 h-5 rounded-full p-0.5 transition cursor-pointer ${
                            drink.isActive ? "bg-[#15803D]" : "bg-[#CBD5E1]"
                          }`}
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

      {/* Right Edit / Add Drawer */}
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
          } lg:static lg:flex lg:w-[330px] xl:w-[375px] shrink-0 bg-white border-l border-[#E5E7EB] p-6 flex-col justify-between overflow-y-auto`}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0F172A]">
                {drawer.kind === "edit-package"
                  ? "Edit paket"
                  : drawer.kind === "new-package"
                    ? "Tambah paket"
                    : drawer.kind === "edit-drink"
                      ? "Edit minuman"
                      : "Tambah minuman"}
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

            {/* Preview Box */}
            <div className="w-full h-24 rounded-2xl bg-[#EDE0CE] flex items-center justify-center overflow-hidden">
              {imageInput ? (
                <img src={imageInput} alt={nameInput} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-extrabold tracking-widest uppercase text-[#574F43]">
                  {isDrinkDrawer
                    ? getInitials(nameInput || "MN")
                    : nameInput || "PAKET"}
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
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-2 border border-[#E5E7EB] hover:bg-[#F8FAFC] rounded-xl text-xs font-semibold text-[#0F172A] cursor-pointer"
            >
              Ganti foto
            </button>

            <div>
              <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                {isDrinkDrawer ? "Nama minuman" : "Nama paket"}
              </label>
              <input
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                {isDrinkDrawer ? "Kategori" : "Isi paket"}
              </label>
              <input
                required
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#64748B] mb-1">Harga</label>
              <input
                required
                type="number"
                min={0}
                step={500}
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            {isDrinkDrawer && (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                    Stok kulkas saat ini (botol)
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={stockInput}
                    onChange={(e) => setStockInput(e.target.value)}
                    className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                    Batas stok minimum (peringatan)
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={minStockInput}
                    onChange={(e) => setMinStockInput(e.target.value)}
                    className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-medium text-[#0F172A]">Tampilkan di kasir</span>
              <button
                type="button"
                onClick={() => setActiveInput((p) => !p)}
                className={`inline-flex items-center w-9 h-5 rounded-full p-0.5 transition cursor-pointer ${
                  activeInput ? "bg-[#15803D]" : "bg-[#CBD5E1]"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition ${
                    activeInput ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {feedback && (
              <p className="text-[11px] font-medium text-[#15803D] bg-[#F0FDF4] px-3 py-2 rounded-lg">
                {feedback}
              </p>
            )}

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
                  {drawer.kind === "edit-drink" ? "Hapus minuman" : "Hapus paket"}
                </button>
              )}
            </div>
          </form>
        </aside>
      )}
    </>
  );
}
