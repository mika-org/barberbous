"use client";

import React, { useMemo, useRef, useState } from "react";
import { Search, Plus, Box, Scissors, X, Trash2 } from "lucide-react";
import { formatRupiah } from "@/lib/format";

export interface ProductPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  badgeColor: string;
  isActive: boolean;
}

export interface ProductCapster {
  id: string;
  name: string;
  photoUrl: string | null;
  bgColor: string;
  isActive: boolean;
}

type DrawerMode =
  | { kind: "edit-package"; item: ProductPackage }
  | { kind: "new-package" }
  | { kind: "edit-capster"; item: ProductCapster }
  | { kind: "new-capster" }
  | null;

export function ProdukClient({
  initialPackages,
  initialCapsters,
}: {
  initialPackages: ProductPackage[];
  initialCapsters: ProductCapster[];
}) {
  const [packages, setPackages] = useState<ProductPackage[]>(initialPackages);
  const [capsters, setCapsters] = useState<ProductCapster[]>(initialCapsters);
  const [search, setSearch] = useState("");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [drawer, setDrawer] = useState<DrawerMode>(
    initialPackages[0] ? { kind: "edit-package", item: initialPackages[0] } : null
  );

  // Form states
  const [nameInput, setNameInput] = useState(initialPackages[0]?.name ?? "");
  const [descInput, setDescInput] = useState(initialPackages[0]?.description ?? "");
  const [priceInput, setPriceInput] = useState(
    initialPackages[0] ? String(initialPackages[0].price) : "30000"
  );
  const [imageInput, setImageInput] = useState<string | null>(
    initialPackages[0]?.imageUrl ?? null
  );
  const [bgColorInput, setBgColorInput] = useState("#C4B5E3");
  const [activeInput, setActiveInput] = useState<boolean>(
    initialPackages[0]?.isActive ?? true
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

  const openEditCapster = (cap: ProductCapster) => {
    setDrawer({ kind: "edit-capster", item: cap });
    setMobileDrawerOpen(true);
    setNameInput(cap.name);
    setImageInput(cap.photoUrl);
    setBgColorInput(cap.bgColor);
    setActiveInput(cap.isActive);
    setFeedback(null);
  };

  const openNewCapster = () => {
    setShowAddMenu(false);
    setDrawer({ kind: "new-capster" });
    setMobileDrawerOpen(true);
    setNameInput("");
    setImageInput(null);
    setBgColorInput("#C4B5E3");
    setActiveInput(true);
    setFeedback(null);
  };

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

  const handleTogglePackageActive = async (e: React.MouseEvent, pkg: ProductPackage) => {
    e.stopPropagation();
    const next = !pkg.isActive;
    const res = await fetch(`/api/packages/${pkg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    if (res.ok) {
      const json = await res.json();
      setPackages((prev) => prev.map((p) => (p.id === pkg.id ? json.data : p)));
      if (drawer?.kind === "edit-package" && drawer.item.id === pkg.id) {
        setActiveInput(next);
      }
    }
  };

  const handleToggleCapsterActive = async (e: React.MouseEvent, cap: ProductCapster) => {
    e.stopPropagation();
    const next = !cap.isActive;
    const res = await fetch(`/api/capsters/${cap.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    if (res.ok) {
      const json = await res.json();
      setCapsters((prev) => prev.map((c) => (c.id === cap.id ? json.data : c)));
      if (drawer?.kind === "edit-capster" && drawer.item.id === cap.id) {
        setActiveInput(next);
      }
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageInput(reader.result);
      }
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
            price: Number(priceInput.replace(/\D/g, "")) || 0,
            imageUrl: imageInput,
            isActive: activeInput,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setPackages((prev) =>
          prev.map((p) => (p.id === drawer.item.id ? json.data : p))
        );
        setDrawer({ kind: "edit-package", item: json.data });
        setFeedback("Perubahan paket disimpan");
      } else if (drawer.kind === "new-package") {
        const res = await fetch("/api/packages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nameInput,
            description: descInput,
            price: Number(priceInput.replace(/\D/g, "")) || 0,
            imageUrl: imageInput,
            isActive: activeInput,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setPackages((prev) => [...prev, json.data]);
        openEditPackage(json.data);
        setFeedback("Paket baru ditambahkan");
      } else if (drawer.kind === "edit-capster") {
        const res = await fetch(`/api/capsters/${drawer.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nameInput,
            photoUrl: imageInput,
            bgColor: bgColorInput,
            isActive: activeInput,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setCapsters((prev) =>
          prev.map((c) => (c.id === drawer.item.id ? json.data : c))
        );
        setDrawer({ kind: "edit-capster", item: json.data });
        setFeedback("Perubahan capster disimpan");
      } else if (drawer.kind === "new-capster") {
        const res = await fetch("/api/capsters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nameInput,
            photoUrl: imageInput,
            bgColor: bgColorInput,
            isActive: activeInput,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setCapsters((prev) => [...prev, json.data]);
        openEditCapster(json.data);
        setFeedback("Capster baru ditambahkan");
      }
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!drawer) return;
    if (drawer.kind === "edit-package") {
      const res = await fetch(`/api/packages/${drawer.item.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        if (json.deactivated) {
          setPackages((prev) =>
            prev.map((p) => (p.id === drawer.item.id ? json.data : p))
          );
          setActiveInput(false);
          setFeedback(json.message);
        } else {
          setPackages((prev) => prev.filter((p) => p.id !== drawer.item.id));
          setDrawer(null);
        }
      }
    } else if (drawer.kind === "edit-capster") {
      const res = await fetch(`/api/capsters/${drawer.item.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        if (json.deactivated) {
          setCapsters((prev) =>
            prev.map((c) => (c.id === drawer.item.id ? json.data : c))
          );
          setActiveInput(false);
          setFeedback(json.message);
        } else {
          setCapsters((prev) => prev.filter((c) => c.id !== drawer.item.id));
          setDrawer(null);
        }
      }
    }
  };

  const isPackageDrawer =
    drawer?.kind === "edit-package" || drawer?.kind === "new-package";

  return (
    <>
      <main className="flex-1 bg-[#FAFAFA] p-4 sm:p-5 lg:p-6 overflow-y-auto min-w-0">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Produk</h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              {packages.length} paket · {capsters.length} capster
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 relative w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari paket atau capster"
                className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-8 pr-3 py-2 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAddMenu((s) => !s)}
                className="bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah baru
              </button>
              {showAddMenu && (
                <div className="absolute right-0 mt-2 w-44 bg-white border border-[#E5E7EB] rounded-xl shadow-lg py-1.5 z-30 text-xs">
                  <button
                    type="button"
                    onClick={openNewPackage}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#F8FAFC] font-medium text-[#0F172A] cursor-pointer"
                  >
                    + Tambah paket
                  </button>
                  <button
                    type="button"
                    onClick={openNewCapster}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#F8FAFC] font-medium text-[#0F172A] cursor-pointer"
                  >
                    + Tambah capster
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Paket Section */}
        <section className="mt-6">
          <div className="inline-flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-full px-3.5 py-1.5 text-xs font-medium text-[#0F172A] shadow-2xs">
            <Box className="w-3.5 h-3.5 text-[#475569]" />
            <span>Paket</span>
          </div>

          <div className="mt-3 bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] font-medium text-[#64748B]">
                  <th className="py-2.5 px-4">Paket</th>
                  <th className="py-2.5 px-4 text-right">Harga</th>
                  <th className="py-2.5 px-4 text-right">Aktif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs">
                {filteredPackages.map((pkg) => {
                  const selected =
                    drawer?.kind === "edit-package" && drawer.item.id === pkg.id;
                  return (
                    <tr
                      key={pkg.id}
                      onClick={() => openEditPackage(pkg)}
                      className={`cursor-pointer transition ${
                        selected ? "bg-[#F8FAFC]" : "hover:bg-[#FAFAFA]"
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-[#EDE0CE] text-[#9A6B3B] font-bold text-xs flex items-center justify-center shrink-0">
                            {pkg.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="font-semibold text-[#0F172A]">{pkg.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-[#0F172A]">
                        {formatRupiah(pkg.price)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => handleTogglePackageActive(e, pkg)}
                          aria-label={`Toggle ${pkg.name}`}
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
        </section>

        {/* Capster Section */}
        <section className="mt-6">
          <div className="inline-flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-full px-3.5 py-1.5 text-xs font-medium text-[#0F172A] shadow-2xs">
            <Scissors className="w-3.5 h-3.5 text-[#475569]" />
            <span>Capster</span>
          </div>

          <div className="mt-3 bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] font-medium text-[#64748B]">
                  <th className="py-2.5 px-4">Capster</th>
                  <th className="py-2.5 px-4 text-right">Aktif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs">
                {filteredCapsters.map((cap) => {
                  const selected =
                    drawer?.kind === "edit-capster" && drawer.item.id === cap.id;
                  return (
                    <tr
                      key={cap.id}
                      onClick={() => openEditCapster(cap)}
                      className={`cursor-pointer transition ${
                        selected ? "bg-[#F8FAFC]" : "hover:bg-[#FAFAFA]"
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-[#EDE0CE] text-[#9A6B3B] font-bold text-xs flex items-center justify-center shrink-0">
                            {cap.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="font-semibold text-[#0F172A]">{cap.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => handleToggleCapsterActive(e, cap)}
                          aria-label={`Toggle ${cap.name}`}
                          className={`inline-flex items-center w-9 h-5 rounded-full p-0.5 transition cursor-pointer ${
                            cap.isActive ? "bg-[#15803D]" : "bg-[#CBD5E1]"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition ${
                              cap.isActive ? "translate-x-4" : "translate-x-0"
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
        </section>
      </main>

      {/* Right Edit / Add Drawer (Desktop lg+; slide-over on < lg) */}
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
          } lg:static lg:flex lg:w-[330px] xl:w-[380px] shrink-0 bg-white border-l border-[#E5E7EB] p-6 flex-col justify-between overflow-y-auto`}
        >
          <form onSubmit={handleSave} className="flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-[#0F172A]">
                  {drawer.kind === "edit-package"
                    ? "Edit paket"
                    : drawer.kind === "new-package"
                    ? "Tambah paket"
                    : drawer.kind === "edit-capster"
                    ? "Edit capster"
                    : "Tambah capster"}
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
              <div
                className="h-28 rounded-xl flex items-center justify-center overflow-hidden"
                style={{
                  backgroundColor: isPackageDrawer ? "#EDE0CE" : bgColorInput,
                }}
              >
                {imageInput ? (
                  <img
                    src={imageInput}
                    alt={nameInput || "Preview"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-[#9A6B3B]">
                    {(nameInput || "B").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-2.5 w-full py-2 rounded-xl border border-[#E5E7EB] hover:bg-[#F8FAFC] text-xs font-medium text-[#0F172A] cursor-pointer"
              >
                Ganti foto
              </button>

              <div className="mt-5 space-y-3.5 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                    {isPackageDrawer ? "Nama paket" : "Nama capster"}
                  </label>
                  <input
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>

                {isPackageDrawer ? (
                  <>
                    <div>
                      <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                        Isi paket
                      </label>
                      <input
                        required
                        value={descInput}
                        onChange={(e) => setDescInput(e.target.value)}
                        className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                        Harga
                      </label>
                      <input
                        required
                        type="number"
                        min={0}
                        step={1000}
                        value={priceInput}
                        onChange={(e) => setPriceInput(e.target.value)}
                        className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                      Warna latar kartu
                    </label>
                    <div className="flex items-center gap-2">
                      {["#C4B5E3", "#E59A1A", "#EE3E7D", "#93C5FD", "#86EFAC"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setBgColorInput(c)}
                          className={`w-7 h-7 rounded-lg border-2 cursor-pointer ${
                            bgColorInput === c ? "border-[#0F172A]" : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-medium text-[#0F172A]">
                    Tampilkan di kasir
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveInput((a) => !a)}
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
                  <p className="text-[11px] font-medium text-[#15803D]">{feedback}</p>
                )}
              </div>
            </div>

            <div className="space-y-2.5 pt-6">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Simpan perubahan"}
              </button>

              {(drawer.kind === "edit-package" || drawer.kind === "edit-capster") && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full py-2.5 rounded-xl border border-[#FECACA] hover:bg-[#FEF2F2] text-[#DC2626] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {drawer.kind === "edit-package" ? "Hapus paket" : "Hapus capster"}
                </button>
              )}
            </div>
          </form>
        </aside>
      )}
    </>
  );
}
