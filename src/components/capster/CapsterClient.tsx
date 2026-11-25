"use client";

import React, { useMemo, useRef, useState } from "react";
import { Search, Plus, Calendar, Pencil, X, Check, Trash2 } from "lucide-react";
import { formatRupiah, getInitials } from "@/lib/format";

export interface CapsterScheduleItem {
  id: string;
  customerName: string;
  scheduledTime: string;
  status: string;
  packageName: string;
}

export interface CapsterModel {
  id: string;
  code: string;
  name: string;
  phone: string;
  photoUrl: string | null;
  bgColor: string;
  status: "TERSEDIA" | "MELAYANI" | "ISTIRAHAT";
  rating: number;
  joinedLabel: string;
  isActive: boolean;
  todayRevenue: number;
  todayServices: number;
  sharePct: number;
  topPackage: string;
  schedule: CapsterScheduleItem[];
}

type PanelMode = "detail" | "create" | "edit";

export function CapsterClient({ initialCapsters }: { initialCapsters: CapsterModel[] }) {
  const [capsters, setCapsters] = useState<CapsterModel[]>(initialCapsters);
  const [filter, setFilter] = useState<"ALL" | "TERSEDIA" | "MELAYANI" | "ISTIRAHAT">("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>(initialCapsters[0]?.id ?? "");
  const [panelMode, setPanelMode] = useState<PanelMode>("detail");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Form states
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [statusInput, setStatusInput] = useState<"TERSEDIA" | "MELAYANI" | "ISTIRAHAT">(
    "TERSEDIA"
  );
  const [bgColorInput, setBgColorInput] = useState("#C4B5E3");
  const [photoInput, setPhotoInput] = useState<string | null>(null);
  const [activeInput, setActiveInput] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredCapsters = useMemo(() => {
    return capsters.filter((c) => {
      if (filter !== "ALL" && c.status !== filter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [capsters, filter, search]);

  const selectedCapster = useMemo(
    () => filteredCapsters.find((c) => c.id === selectedId) ?? filteredCapsters[0] ?? null,
    [filteredCapsters, selectedId]
  );

  const totalServicesToday = useMemo(
    () => capsters.reduce((sum, c) => sum + c.todayServices, 0),
    [capsters]
  );

  const openCreate = () => {
    setPanelMode("create");
    setMobileDrawerOpen(true);
    setNameInput("");
    setPhoneInput("0812-");
    setStatusInput("TERSEDIA");
    setBgColorInput("#C4B5E3");
    setPhotoInput(null);
    setActiveInput(true);
    setFeedback(null);
  };

  const openEdit = (cap: CapsterModel) => {
    setSelectedId(cap.id);
    setPanelMode("edit");
    setMobileDrawerOpen(true);
    setNameInput(cap.name);
    setPhoneInput(cap.phone);
    setStatusInput(cap.status);
    setBgColorInput(cap.bgColor);
    setPhotoInput(cap.photoUrl);
    setActiveInput(cap.isActive);
    setFeedback(null);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPhotoInput(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/capsters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput,
          phone: phoneInput,
          status: statusInput,
          bgColor: bgColorInput,
          photoUrl: photoInput,
          isActive: activeInput,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const newEntry: CapsterModel = {
        ...json.data,
        todayRevenue: 0,
        todayServices: 0,
        sharePct: 0,
        topPackage: "Basic",
        schedule: [],
      };
      setCapsters((prev) => [...prev, newEntry]);
      setSelectedId(newEntry.id);
      setPanelMode("detail");
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Gagal menambah capster");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCapster) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/capsters/${selectedCapster.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput,
          phone: phoneInput,
          status: statusInput,
          bgColor: bgColorInput,
          photoUrl: photoInput,
          isActive: activeInput,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setCapsters((prev) =>
        prev.map((c) => (c.id === json.data.id ? { ...c, ...json.data } : c))
      );
      setPanelMode("detail");
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Gagal memperbarui capster");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCapster) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/capsters/${selectedCapster.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.deactivated) {
        setCapsters((prev) =>
          prev.map((c) => (c.id === selectedCapster.id ? { ...c, isActive: false } : c))
        );
        setPanelMode("detail");
      } else {
        const remaining = capsters.filter((c) => c.id !== selectedCapster.id);
        setCapsters(remaining);
        setSelectedId(remaining[0]?.id ?? "");
        setPanelMode("detail");
      }
    } finally {
      setSaving(false);
    }
  };

  const renderStatusPill = (status: CapsterModel["status"]) => {
    if (status === "TERSEDIA") {
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-[11px] font-semibold">
          Tersedia
        </span>
      );
    }
    if (status === "MELAYANI") {
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] text-[11px] font-semibold">
          Melayani
        </span>
      );
    }
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B] text-[11px] font-semibold">
        Istirahat
      </span>
    );
  };

  return (
    <>
      <main className="flex-1 bg-[#FAFAFA] p-4 sm:p-5 lg:p-6 overflow-y-auto min-w-0">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Capster</h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              {capsters.length} capster · {totalServicesToday} layanan hari ini
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={openCreate}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah capster
            </button>

            <div className="relative flex-1 sm:flex-initial sm:w-52">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama capster"
                className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-8 pr-3 py-2 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A]"
              />
            </div>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {(
            [
              { id: "ALL", label: "Semua" },
              { id: "TERSEDIA", label: "Tersedia" },
              { id: "MELAYANI", label: "Melayani" },
              { id: "ISTIRAHAT", label: "Istirahat" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                filter === item.id
                  ? "bg-[#0F172A] text-white"
                  : "bg-white border border-[#E5E7EB] text-[#475569] hover:bg-[#F8FAFC]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Capster Table */}
        <div className="mt-4 bg-white border border-[#E5E7EB] rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[540px] text-left border-collapse">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] font-medium text-[#64748B]">
                <th className="py-3 px-4">Capster</th>
                <th className="py-3 px-4">No. telepon</th>
                <th className="py-3 px-4 text-right">Layanan</th>
                <th className="py-3 px-4 text-right">Pendapatan</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-xs">
              {filteredCapsters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#94A3B8]">
                    Tidak ada capster dengan filter ini.
                  </td>
                </tr>
              ) : (
                filteredCapsters.map((cap) => {
                  const isSelected = cap.id === selectedCapster?.id;
                  return (
                    <tr
                      key={cap.id}
                      onClick={() => {
                        setSelectedId(cap.id);
                        setPanelMode("detail");
                        setMobileDrawerOpen(true);
                      }}
                      className={`cursor-pointer transition ${
                        isSelected ? "bg-[#F8FAFC]" : "hover:bg-[#FAFAFA]"
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: cap.bgColor }}
                          >
                            {cap.photoUrl ? (
                              <img
                                src={cap.photoUrl}
                                alt={cap.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              getInitials(cap.name)
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-[#0F172A]">{cap.name}</p>
                            <p className="text-[11px] text-[#94A3B8]">{cap.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#475569] tabular-nums">{cap.phone}</td>
                      <td className="py-3.5 px-4 text-right font-semibold text-[#0F172A] tabular-nums">
                        {cap.todayServices}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-[#0F172A] tabular-nums">
                        {formatRupiah(cap.todayRevenue)}
                      </td>
                      <td className="py-3.5 px-4 text-right">{renderStatusPill(cap.status)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Right Detail / Edit Panel */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}
      <aside
        className={`${
          mobileDrawerOpen
            ? "fixed inset-y-0 right-0 z-40 flex w-full max-w-[380px] shadow-2xl"
            : "hidden"
        } lg:static lg:flex lg:w-[330px] xl:w-[375px] shrink-0 bg-white border-l border-[#E5E7EB] p-6 flex-col justify-between overflow-y-auto`}
      >
        {(panelMode === "create" || panelMode === "edit") && (
          <form
            onSubmit={panelMode === "create" ? handleCreate : handleUpdate}
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <h2 className="text-base font-bold text-[#0F172A]">
                  {panelMode === "create" ? "Tambah capster" : "Edit capster"}
                </h2>
                <button
                  type="button"
                  onClick={() => setPanelMode("detail")}
                  className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div
                className="w-full h-28 rounded-2xl overflow-hidden flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: bgColorInput }}
              >
                {photoInput ? (
                  <img
                    src={photoInput}
                    alt={nameInput}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  getInitials(nameInput || "CP")
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
                  Nama capster
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
                  No. telepon
                </label>
                <input
                  required
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1.5">
                  Status saat ini
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["TERSEDIA", "MELAYANI", "ISTIRAHAT"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusInput(st)}
                      className={`py-2 rounded-xl border text-[11px] font-semibold cursor-pointer ${
                        statusInput === st
                          ? "bg-[#0F172A] text-white border-[#0F172A]"
                          : "border-[#E5E7EB] text-[#64748B]"
                      }`}
                    >
                      {st === "TERSEDIA"
                        ? "Tersedia"
                        : st === "MELAYANI"
                          ? "Melayani"
                          : "Istirahat"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1.5">
                  Warna latar kartu
                </label>
                <div className="flex items-center gap-2">
                  {["#C4B5E3", "#E59A1A", "#EE3E7D", "#0F172A", "#15803D"].map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setBgColorInput(hex)}
                      className={`w-7 h-7 rounded-full border-2 cursor-pointer ${
                        bgColorInput === hex ? "border-[#0F172A] scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>

              {feedback && (
                <p className="text-xs text-[#DC2626] bg-[#FEF2F2] px-3 py-2 rounded-lg">
                  {feedback}
                </p>
              )}
            </div>

            <div className="space-y-2 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {saving ? "Menyimpan..." : "Simpan perubahan"}
              </button>
              {panelMode === "edit" && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleDelete}
                  className="w-full py-2.5 rounded-xl border border-[#FEE2E2] hover:bg-[#FEF2F2] text-[#DC2626] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus capster
                </button>
              )}
            </div>
          </form>
        )}

        {panelMode === "detail" && selectedCapster && (
          <div className="flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-[#0F172A]">{selectedCapster.name}</h2>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    {selectedCapster.code} · Capster sejak {selectedCapster.joinedLabel}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {renderStatusPill(selectedCapster.status)}
                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="lg:hidden w-7 h-7 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div
                className="w-full h-32 rounded-2xl overflow-hidden flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: selectedCapster.bgColor }}
              >
                {selectedCapster.photoUrl ? (
                  <img
                    src={selectedCapster.photoUrl}
                    alt={selectedCapster.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  getInitials(selectedCapster.name)
                )}
              </div>

              <div className="bg-[#F4F4F5] rounded-2xl p-4 space-y-1">
                <p className="text-[11px] text-[#64748B]">Pendapatan hari ini</p>
                <p className="text-2xl font-bold text-[#0F172A] tabular-nums">
                  {formatRupiah(selectedCapster.todayRevenue)}{" "}
                  <span className="text-xs font-normal text-[#64748B]">hari ini</span>
                </p>
                <p className="text-[11px] text-[#64748B]">
                  {selectedCapster.todayServices} layanan · {selectedCapster.sharePct}% dari total
                </p>
              </div>

              <div className="space-y-3 text-xs pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">No. telepon</span>
                  <span className="font-semibold text-[#0F172A]">{selectedCapster.phone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Layanan selesai</span>
                  <span className="font-semibold text-[#0F172A]">
                    {selectedCapster.todayServices}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Paket terbanyak</span>
                  <span className="font-semibold text-[#0F172A]">
                    {selectedCapster.topPackage}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Rating</span>
                  <span className="font-semibold text-[#0F172A]">
                    {String(selectedCapster.rating).replace(".", ",")} / 5
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-5">
              <button
                type="button"
                onClick={() => setShowScheduleModal(true)}
                className="w-full py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                Lihat jadwal
              </button>
              <button
                type="button"
                onClick={() => openEdit(selectedCapster)}
                className="w-full py-2.5 rounded-xl border border-[#E5E7EB] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit capster
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Schedule Modal */}
      {showScheduleModal && selectedCapster && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  Jadwal {selectedCapster.name}
                </h3>
                <p className="text-xs text-[#64748B]">Antrian booking hari ini</p>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedCapster.schedule.length === 0 ? (
              <p className="text-xs text-[#94A3B8] py-8 text-center">
                Tidak ada antrian booking untuk {selectedCapster.name} saat ini.
              </p>
            ) : (
              <div className="space-y-2.5">
                {selectedCapster.schedule.map((item) => (
                  <div
                    key={item.id}
                    className="border border-[#E5E7EB] rounded-xl px-4 py-3 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[#0F172A]">{item.customerName}</p>
                      <p className="text-[11px] text-[#64748B]">
                        {item.scheduledTime} · Paket {item.packageName}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        item.status === "HADIR"
                          ? "bg-[#DCFCE7] text-[#15803D]"
                          : "bg-[#FEF3C7] text-[#B45309]"
                      }`}
                    >
                      {item.status === "HADIR" ? "Hadir" : "Menunggu"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowScheduleModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
