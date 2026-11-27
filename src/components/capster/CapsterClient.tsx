"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  Search,
  Plus,
  Calendar,
  Pencil,
  X,
  Check,
  Trash2,
  MessageCircle,
  AlertTriangle,
  Scissors,
  Download,
} from "lucide-react";
import { formatRupiah, getInitials } from "@/lib/format";
import {
  CapsterCommissionModal,
  type PackageCommissionRow,
  type HaircutCommissionHistoryItem,
} from "../CapsterCommissionModal";
import {
  buildTwoSheetFinancialWorkbook,
  triggerXlsxDownload,
  type CapsterFinancialExportPayload,
} from "@/lib/exportReconciliationCsv";

export interface CapsterScheduleItem {
  id: string;
  customerName: string;
  customerPhone?: string | null;
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
  commissionPct: number;
  ownerPct: number;
  joinedLabel: string;
  isActive: boolean;
  todayRevenue: number;
  todayPackageRevenue: number;
  todayCommission: number;
  todayOwnerShare: number;
  todayServices: number;
  sharePct: number;
  topPackage: string;
  schedule: CapsterScheduleItem[];
  packageBreakdown?: PackageCommissionRow[];
  haircutHistory?: HaircutCommissionHistoryItem[];
}

type PanelMode = "detail" | "create" | "edit";

export function CapsterClient({
  initialCapsters,
  packages = [],
  allCapstersBreakdown,
  todayFinancialExportPayload,
  storeName = "BARBERBOUS",
  userRole = "Kasir",
}: {
  initialCapsters: CapsterModel[];
  packages?: Array<{ id: string; name: string; price?: number }>;
  allCapstersBreakdown?: {
    packageBreakdown: PackageCommissionRow[];
    haircutHistory: HaircutCommissionHistoryItem[];
  };
  todayFinancialExportPayload?: CapsterFinancialExportPayload;
  storeName?: string;
  userRole?: string;
}) {
  const isManager = userRole === "Owner" || userRole === "Admin";

  const [capsters, setCapsters] = useState<CapsterModel[]>(initialCapsters);
  const [filter, setFilter] = useState<"ALL" | "TERSEDIA" | "MELAYANI" | "ISTIRAHAT">("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>(initialCapsters[0]?.id ?? "");
  const [panelMode, setPanelMode] = useState<PanelMode>("detail");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null);
  const [showAddScheduleForm, setShowAddScheduleForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newScheduleTime, setNewScheduleTime] = useState("13:00");
  const [newPackageId, setNewPackageId] = useState<string>(packages[0]?.id ?? "");
  const [addingSchedule, setAddingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [waToast, setWaToast] = useState<string | null>(null);
  const [commissionModal, setCommissionModal] = useState<{
    title: string;
    subtitle: string;
    ownerPct: number;
    commissionPct: number;
    showCapsterColumn: boolean;
    packageBreakdown: PackageCommissionRow[];
    haircutHistory: HaircutCommissionHistoryItem[];
    fullExportPayload?: CapsterFinancialExportPayload;
  } | null>(null);

  // Form states
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [commissionInput, setCommissionInput] = useState("40");
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
    setCommissionInput("40");
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
    setCommissionInput(String(cap.commissionPct));
    setStatusInput(cap.status);
    setBgColorInput(cap.bgColor);
    setPhotoInput(cap.photoUrl);
    setActiveInput(cap.isActive);
    setFeedback(null);
  };

  const handleQuickStatusSwitch = async (
    cap: CapsterModel,
    nextStatus: "TERSEDIA" | "MELAYANI" | "ISTIRAHAT"
  ) => {
    if (cap.status === nextStatus) return;
    const res = await fetch(`/api/capsters/${cap.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      setCapsters((prev) =>
        prev.map((c) => (c.id === cap.id ? { ...c, status: nextStatus } : c))
      );
    }
  };

  const handleSendScheduleWhatsApp = (capName: string, item: CapsterScheduleItem) => {
    const msg = `Halo Kak ${item.customerName}, mengingatkan jadwal cukur di *${storeName}* hari ini pukul *${item.scheduledTime}* (Paket ${item.packageName} bersama Capster ${capName}). Sampai jumpa!`;
    const digits = (item.customerPhone ?? "").replace(/\D/g, "");
    const waPhone = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(msg).catch(() => {});
    }
    if (waPhone) {
      window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, "_blank");
    } else {
      setWaToast("Pesan pengingat WA disalin ke clipboard (pelanggan belum isi no. HP)");
      setTimeout(() => setWaToast(null), 2800);
    }
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
    const pct = Math.min(100, Math.max(0, Number(commissionInput) || 40));
    try {
      const res = await fetch("/api/capsters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput,
          phone: phoneInput,
          commissionPct: pct,
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
        ownerPct: 100 - (json.data.commissionPct ?? 40),
        todayRevenue: 0,
        todayPackageRevenue: 0,
        todayCommission: 0,
        todayOwnerShare: 0,
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
    const pct = Math.min(100, Math.max(0, Number(commissionInput) || 40));
    try {
      const res = await fetch(`/api/capsters/${selectedCapster.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput,
          phone: phoneInput,
          commissionPct: pct,
          status: statusInput,
          bgColor: bgColorInput,
          photoUrl: photoInput,
          isActive: activeInput,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setCapsters((prev) =>
        prev.map((c) => {
          if (c.id !== json.data.id) return c;
          const nextCapPct = json.data.commissionPct ?? 40;
          const nextComm = Math.round((c.todayPackageRevenue * nextCapPct) / 100);
          return {
            ...c,
            ...json.data,
            ownerPct: 100 - nextCapPct,
            todayCommission: nextComm,
            todayOwnerShare: Math.max(0, c.todayPackageRevenue - nextComm),
          };
        })
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
      if (!res.ok) {
        setFeedback(json.error ?? "Gagal menghapus capster");
        return;
      }
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

  const draftCapsterPct = Math.min(100, Math.max(0, Number(commissionInput) || 0));
  const draftOwnerPct = 100 - draftCapsterPct;

  return (
    <>
      <main className="flex-1 bg-[#FAFAFA] p-4 sm:p-5 lg:p-6 overflow-y-auto min-w-0">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Capster</h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              {capsters.length} capster · {totalServicesToday} layanan hari ini · Skema bagi hasil{" "}
              <span className="font-semibold text-[#0F172A]">Owner 60% : Capster 40%</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {todayFinancialExportPayload && (
              <button
                type="button"
                onClick={() => {
                  const bytes = buildTwoSheetFinancialWorkbook(todayFinancialExportPayload);
                  triggerXlsxDownload(bytes, "rekap-2sheet-barber-kafe-saldo-hari-ini.xlsx");
                }}
                className="bg-white border border-[#E5E7EB] hover:border-[#0F172A] text-[#0F172A] rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-[#15803D]" />
                Ekspor 2 Sheet (.xlsx)
              </button>
            )}
            {allCapstersBreakdown && (
              <button
                type="button"
                onClick={() =>
                  setCommissionModal({
                    title: "Semua Capster",
                    subtitle: "Hari ini · Rekap seluruh capster (Owner 60% : Capster 40%)",
                    ownerPct: 60,
                    commissionPct: 40,
                    showCapsterColumn: true,
                    packageBreakdown: allCapstersBreakdown.packageBreakdown,
                    haircutHistory: allCapstersBreakdown.haircutHistory,
                    fullExportPayload: todayFinancialExportPayload,
                  })
                }
                className="bg-white border border-[#E5E7EB] hover:border-[#0F172A] text-[#0F172A] rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Scissors className="w-3.5 h-3.5 text-[#15803D]" />
                List Paket &amp; Komisi
              </button>
            )}
            {isManager && (
              <button
                type="button"
                onClick={openCreate}
                className="bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah capster
              </button>
            )}

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
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] font-medium text-[#64748B]">
                <th className="py-3 px-4">Capster</th>
                <th className="py-3 px-4 text-right">Layanan</th>
                <th className="py-3 px-4 text-right">Omzet Paket</th>
                <th className="py-3 px-4 text-right">Owner (60%)</th>
                <th className="py-3 px-4 text-right">Capster (40%)</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-xs">
              {filteredCapsters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#94A3B8]">
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
                            <p className="text-[11px] text-[#94A3B8]">
                              {cap.code} · Owner {cap.ownerPct}% / Capster {cap.commissionPct}%
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-[#0F172A] tabular-nums">
                        {cap.todayServices}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-[#0F172A] tabular-nums">
                        {formatRupiah(cap.todayPackageRevenue)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-[#0F172A] tabular-nums">
                        {formatRupiah(cap.todayOwnerShare)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-[#15803D] tabular-nums">
                        {formatRupiah(cap.todayCommission)}
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
        } lg:static lg:flex lg:w-[340px] xl:w-[385px] shrink-0 bg-white border-l border-[#E5E7EB] p-6 flex-col justify-between overflow-y-auto`}
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

              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-[#0F172A]">
                    Persentase Bagi Hasil Paket
                  </label>
                  <button
                    type="button"
                    onClick={() => setCommissionInput("40")}
                    className="text-[10px] font-semibold text-[#15803D] hover:underline cursor-pointer"
                  >
                    Standar 60% : 40%
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white border border-[#E5E7EB] rounded-lg px-3 py-2">
                    <p className="text-[10px] text-[#64748B]">Owner (%)</p>
                    <p className="font-bold text-[#0F172A] mt-0.5">{draftOwnerPct}%</p>
                  </div>
                  <div className="bg-white border border-[#0F172A] rounded-lg px-3 py-1.5">
                    <label className="block text-[10px] text-[#64748B]">Capster (%)</label>
                    <input
                      required
                      type="number"
                      min={0}
                      max={100}
                      value={commissionInput}
                      onChange={(e) => setCommissionInput(e.target.value)}
                      className="w-full font-bold text-[#15803D] focus:outline-none"
                    />
                  </div>
                </div>
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
                className="w-full h-28 rounded-2xl overflow-hidden flex items-center justify-center text-white text-2xl font-bold"
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

              {/* 1-Click Live Status Switcher */}
              <div className="bg-[#F4F4F5] p-1 rounded-xl grid grid-cols-3 gap-1">
                {(["TERSEDIA", "MELAYANI", "ISTIRAHAT"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleQuickStatusSwitch(selectedCapster, st)}
                    className={`py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      selectedCapster.status === st
                        ? "bg-white text-[#0F172A] shadow-xs"
                        : "text-[#64748B] hover:text-[#0F172A]"
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

              {/* Explicit 60% Owner : 40% Capster Split Card */}
              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-[#64748B]">
                    Omzet Paket Hari Ini
                  </p>
                  <p className="text-sm font-bold text-[#0F172A] tabular-nums">
                    {formatRupiah(selectedCapster.todayPackageRevenue)}
                  </p>
                </div>

                {/* Split Bar */}
                <div className="w-full h-2 rounded-full bg-[#E5E7EB] overflow-hidden flex">
                  <div
                    className="bg-[#0F172A] h-full"
                    style={{ width: `${selectedCapster.ownerPct}%` }}
                  />
                  <div
                    className="bg-[#15803D] h-full"
                    style={{ width: `${selectedCapster.commissionPct}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-2.5">
                    <p className="text-[10px] font-semibold text-[#64748B]">
                      Owner ({selectedCapster.ownerPct}%)
                    </p>
                    <p className="text-sm font-bold text-[#0F172A] mt-0.5 tabular-nums">
                      {formatRupiah(selectedCapster.todayOwnerShare)}
                    </p>
                  </div>
                  <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-2.5">
                    <p className="text-[10px] font-semibold text-[#15803D]">
                      Capster ({selectedCapster.commissionPct}%)
                    </p>
                    <p className="text-sm font-bold text-[#15803D] mt-0.5 tabular-nums">
                      {formatRupiah(selectedCapster.todayCommission)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCommissionModal({
                      title: `Capster ${selectedCapster.name}`,
                      subtitle: `Hari ini · Skema Owner ${selectedCapster.ownerPct}% : Capster ${selectedCapster.commissionPct}%`,
                      ownerPct: selectedCapster.ownerPct,
                      commissionPct: selectedCapster.commissionPct,
                      showCapsterColumn: false,
                      packageBreakdown: selectedCapster.packageBreakdown ?? [],
                      haircutHistory: selectedCapster.haircutHistory ?? [],
                    })
                  }
                  className="w-full py-2 rounded-xl bg-white border border-[#E5E7EB] hover:border-[#0F172A] text-xs font-semibold text-[#0F172A] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Scissors className="w-3.5 h-3.5 text-[#15803D]" />
                  Lihat List Paket &amp; Komisi ({selectedCapster.todayServices} cukur)
                </button>
              </div>

              <div className="space-y-2 text-xs pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">No. telepon</span>
                  <span className="font-semibold text-[#0F172A]">{selectedCapster.phone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Layanan selesai</span>
                  <span className="font-semibold text-[#0F172A]">
                    {selectedCapster.todayServices} layanan ({selectedCapster.sharePct}%)
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

            <div className="space-y-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowAddScheduleForm(false);
                  setScheduleError(null);
                  setShowScheduleModal(true);
                }}
                className="w-full py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                Lihat jadwal ({selectedCapster.schedule.length})
              </button>
              {isManager && (
                <button
                  type="button"
                  onClick={() => openEdit(selectedCapster)}
                  className="w-full py-2.5 rounded-xl border border-[#E5E7EB] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit capster &amp; bagi hasil
                </button>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Schedule Modal */}
      {showScheduleModal && selectedCapster && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  Jadwal {selectedCapster.name}
                </h3>
                <p className="text-xs text-[#64748B]">
                  {selectedCapster.schedule.length} antrian booking hari ini
                </p>
              </div>
              <div className="flex items-center gap-2">
                {packages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleError(null);
                      setShowAddScheduleForm((p) => !p);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#E5E7EB] hover:border-[#0F172A] px-2.5 py-1.5 text-[11px] font-semibold text-[#0F172A] cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Tambah jadwal
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {scheduleError && (
              <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3 flex items-start gap-2 text-xs text-[#DC2626]">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{scheduleError}</span>
              </div>
            )}

            {waToast && (
              <p className="bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] rounded-xl px-3 py-2 text-xs font-medium">
                {waToast}
              </p>
            )}

            {showAddScheduleForm && packages.length > 0 && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newCustomerName.trim()) return;
                  setAddingSchedule(true);
                  setScheduleError(null);
                  try {
                    const res = await fetch("/api/bookings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        customerName: newCustomerName.trim(),
                        customerPhone: newCustomerPhone.trim() || null,
                        scheduledTime: newScheduleTime,
                        packageId: newPackageId || packages[0].id,
                        capsterId: selectedCapster.id,
                      }),
                    });
                    const json = await res.json();
                    if (!res.ok) {
                      setScheduleError(json.error ?? "Gagal menambah jadwal");
                      return;
                    }
                    if (json.data) {
                      const createdItem: CapsterScheduleItem = {
                        id: json.data.id,
                        customerName: json.data.customerName,
                        customerPhone: json.data.customerPhone,
                        scheduledTime: json.data.scheduledTime,
                        status: json.data.status,
                        packageName:
                          json.data.package?.name ??
                          packages.find((p) => p.id === newPackageId)?.name ??
                          "Basic",
                      };
                      setCapsters((prev) =>
                        prev.map((c) =>
                          c.id === selectedCapster.id
                            ? {
                                ...c,
                                schedule: [...c.schedule, createdItem].sort((a, b) =>
                                  a.scheduledTime.localeCompare(b.scheduledTime)
                                ),
                              }
                            : c
                        )
                      );
                      setNewCustomerName("");
                      setNewCustomerPhone("");
                      setShowAddScheduleForm(false);
                    }
                  } finally {
                    setAddingSchedule(false);
                  }
                }}
                className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-3.5 space-y-2.5 text-xs"
              >
                <p className="font-semibold text-[#0F172A]">
                  Jadwal baru untuk {selectedCapster.name}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    required
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Nama pelanggan"
                    className="bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                  <input
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="No. WA (opsional)"
                    className="bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    required
                    type="time"
                    value={newScheduleTime}
                    onChange={(e) => setNewScheduleTime(e.target.value)}
                    className="bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                  <select
                    value={newPackageId}
                    onChange={(e) => setNewPackageId(e.target.value)}
                    className="flex-1 bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  >
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>
                        Paket {p.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={addingSchedule}
                    className="bg-[#0F172A] text-white rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer"
                  >
                    {addingSchedule ? "..." : "Simpan"}
                  </button>
                </div>
              </form>
            )}

            {selectedCapster.schedule.length === 0 ? (
              <p className="text-xs text-[#94A3B8] py-8 text-center">
                Tidak ada antrian booking untuk {selectedCapster.name} saat ini.
              </p>
            ) : (
              <div className="space-y-2.5">
                {selectedCapster.schedule.map((item) => {
                  const isDeleting = deletingScheduleId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="border border-[#E5E7EB] rounded-xl px-3.5 py-3 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[#0F172A] truncate">
                          {item.customerName}
                        </p>
                        <p className="text-[11px] text-[#64748B]">
                          {item.scheduledTime} · Paket {item.packageName}
                          {item.customerPhone ? ` · ${item.customerPhone}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          title="Ubah status kehadiran"
                          onClick={async () => {
                            const nextStatus = item.status === "HADIR" ? "MENUNGGU" : "HADIR";
                            const res = await fetch(`/api/bookings/${item.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: nextStatus }),
                            });
                            if (res.ok) {
                              setCapsters((prev) =>
                                prev.map((c) =>
                                  c.id === selectedCapster.id
                                    ? {
                                        ...c,
                                        schedule: c.schedule.map((s) =>
                                          s.id === item.id ? { ...s, status: nextStatus } : s
                                        ),
                                      }
                                    : c
                                )
                              );
                            }
                          }}
                          className={`px-2 py-1 rounded-full text-[10px] font-semibold cursor-pointer transition ${
                            item.status === "HADIR"
                              ? "bg-[#DCFCE7] text-[#15803D]"
                              : "bg-[#FEF3C7] text-[#B45309]"
                          }`}
                        >
                          {item.status === "HADIR" ? "Hadir" : "Menunggu"}
                        </button>
                        <button
                          type="button"
                          title="Kirim pengingat WhatsApp"
                          onClick={() => handleSendScheduleWhatsApp(selectedCapster.name, item)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#15803D] text-[10px] font-semibold transition cursor-pointer"
                        >
                          <MessageCircle className="w-3 h-3" />
                          WA
                        </button>
                        <button
                          type="button"
                          disabled={isDeleting}
                          title={`Hapus jadwal ${item.customerName}`}
                          aria-label={`Hapus jadwal ${item.customerName}`}
                          onClick={async () => {
                            setDeletingScheduleId(item.id);
                            try {
                              const res = await fetch(`/api/bookings/${item.id}`, {
                                method: "DELETE",
                              });
                              if (res.ok) {
                                setCapsters((prev) =>
                                  prev.map((c) =>
                                    c.id === selectedCapster.id
                                      ? {
                                          ...c,
                                          schedule: c.schedule.filter((s) => s.id !== item.id),
                                        }
                                      : c
                                  )
                                );
                              }
                            } finally {
                              setDeletingScheduleId(null);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] text-[10px] font-semibold disabled:opacity-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          {isDeleting ? "..." : "Hapus"}
                        </button>
                      </div>
                    </div>
                  );
                })}
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

      {commissionModal && (
        <CapsterCommissionModal
          title={commissionModal.title}
          subtitle={commissionModal.subtitle}
          ownerPct={commissionModal.ownerPct}
          commissionPct={commissionModal.commissionPct}
          showCapsterColumn={commissionModal.showCapsterColumn}
          packageBreakdown={commissionModal.packageBreakdown}
          haircutHistory={commissionModal.haircutHistory}
          fullExportPayload={commissionModal.fullExportPayload}
          onClose={() => setCommissionModal(null)}
        />
      )}
    </>
  );
}
