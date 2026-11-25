"use client";

import React, { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  Search,
  Plus,
  CreditCard,
  Pencil,
  Check,
  X,
  Download,
} from "lucide-react";
import { formatDateShort, formatRupiah, getInitials } from "@/lib/format";
import { BarberbousLogo } from "../AppShell";

export interface MemberModel {
  id: string;
  memberCode: string;
  name: string;
  phone: string;
  birthDate: string | null;
  notes: string | null;
  points: number;
  visits: number;
  lastVisitAt: string | null;
  favoritePackage: string | null;
  favoriteCapster: string | null;
  isActive: boolean;
  joinedAt: string;
}

type PanelMode = "detail" | "create" | "edit";

function formatMemberDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function MemberClient({ initialMembers }: { initialMembers: MemberModel[] }) {
  const [members, setMembers] = useState<MemberModel[]>(initialMembers);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "NEW_MONTH" | "TOP_POINTS">("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>(initialMembers[0]?.id ?? "");
  const [panelMode, setPanelMode] = useState<PanelMode>("detail");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Form states for create / edit
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [birthDateInput, setBirthDateInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [activeInput, setActiveInput] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Member Card Modal
  const [cardMember, setCardMember] = useState<MemberModel | null>(null);
  const [cardQrUrl, setCardQrUrl] = useState<string>("");

  useEffect(() => {
    if (!cardMember) return;
    QRCode.toDataURL(`BARBERBOUS:MEMBER:${cardMember.memberCode}:${cardMember.phone}`, {
      width: 180,
      margin: 1,
      color: { dark: "#0F172A", light: "#FFFFFF" },
    })
      .then(setCardQrUrl)
      .catch(() => setCardQrUrl(""));
  }, [cardMember]);

  const filteredMembers = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let list = members.filter((m) => {
      if (filter === "ACTIVE" && !m.isActive) return false;
      if (filter === "NEW_MONTH" && new Date(m.joinedAt) < monthStart) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const digits = q.replace(/\D/g, "");
        return (
          m.name.toLowerCase().includes(q) ||
          m.memberCode.toLowerCase().includes(q) ||
          m.phone.toLowerCase().includes(q) ||
          (digits.length >= 3 && m.phone.replace(/\D/g, "").includes(digits))
        );
      }
      return true;
    });
    if (filter === "TOP_POINTS") {
      list = [...list].sort((a, b) => b.points - a.points);
    }
    return list;
  }, [members, filter, search]);

  const selectedMember = useMemo(
    () => filteredMembers.find((m) => m.id === selectedId) ?? filteredMembers[0] ?? null,
    [filteredMembers, selectedId]
  );

  const totalPoints = useMemo(
    () => members.reduce((sum, m) => sum + m.points, 0),
    [members]
  );

  const nextAutoCode = useMemo(() => {
    const maxNum = members.reduce((max, m) => {
      const n = Number.parseInt(m.memberCode.replace(/\D/g, ""), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 71);
    return `MBR-${String(maxNum + 1).padStart(4, "0")}`;
  }, [members]);

  const openCreate = () => {
    setPanelMode("create");
    setMobileDrawerOpen(true);
    setNameInput("");
    setPhoneInput("");
    setBirthDateInput("");
    setNotesInput("");
    setActiveInput(true);
    setFeedback(null);
  };

  const openEdit = (member: MemberModel) => {
    setSelectedId(member.id);
    setPanelMode("edit");
    setMobileDrawerOpen(true);
    setNameInput(member.name);
    setPhoneInput(member.phone);
    setBirthDateInput(member.birthDate ?? "");
    setNotesInput(member.notes ?? "");
    setActiveInput(member.isActive);
    setFeedback(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput,
          phone: phoneInput,
          birthDate: birthDateInput || null,
          notes: notesInput || null,
          isActive: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMembers((prev) => [json.data, ...prev]);
      setSelectedId(json.data.id);
      setPanelMode("detail");
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Gagal menambah member");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/members/${selectedMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput,
          phone: phoneInput,
          birthDate: birthDateInput || null,
          notes: notesInput || null,
          isActive: activeInput,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMembers((prev) => prev.map((m) => (m.id === json.data.id ? json.data : m)));
      setPanelMode("detail");
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Gagal memperbarui member");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <main className="flex-1 bg-[#FAFAFA] p-4 sm:p-5 lg:p-6 overflow-y-auto min-w-0">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Member</h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              {members.length} member · {totalPoints.toLocaleString("id-ID")} total poin
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={openCreate}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah member baru
            </button>

            <div className="relative flex-1 sm:flex-initial sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau no. telepon"
                className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-8 pr-3 py-2 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A]"
              />
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {(
            [
              { id: "ALL", label: "Semua" },
              { id: "ACTIVE", label: "Aktif" },
              { id: "NEW_MONTH", label: "Baru bulan ini" },
              { id: "TOP_POINTS", label: "Poin tertinggi" },
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

        {/* Member Table */}
        <div className="mt-4 bg-white border border-[#E5E7EB] rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[580px] text-left border-collapse">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] font-medium text-[#64748B]">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">No. telepon</th>
                <th className="py-3 px-4 text-right">Total poin</th>
                <th className="py-3 px-4">Bergabung</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-xs">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#94A3B8]">
                    Tidak ada member yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const isSelected = member.id === selectedMember?.id;
                  return (
                    <tr
                      key={member.id}
                      onClick={() => {
                        setSelectedId(member.id);
                        setPanelMode("detail");
                        setMobileDrawerOpen(true);
                      }}
                      className={`cursor-pointer transition ${
                        isSelected ? "bg-[#F8FAFC]" : "hover:bg-[#FAFAFA]"
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#F1F5F9] text-[#0F172A] font-bold text-[11px] flex items-center justify-center shrink-0">
                            {getInitials(member.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-[#0F172A]">{member.name}</p>
                            <p className="text-[11px] text-[#94A3B8]">{member.memberCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#475569] tabular-nums">
                        {member.phone}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#0F172A] tabular-nums">
                        {member.points.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B]">
                        {formatMemberDate(member.joinedAt)}
                      </td>
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setCardMember(member)}
                          className="inline-flex items-center gap-1.5 border border-[#E5E7EB] hover:border-[#0F172A] bg-white rounded-lg px-2.5 py-1 text-[11px] font-semibold text-[#0F172A] cursor-pointer"
                        >
                          <CreditCard className="w-3 h-3" />
                          Kartu
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Right Sidebar Panel */}
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
        {panelMode === "create" && (
          <form onSubmit={handleCreate} className="flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#0F172A]">Tambah member baru</h2>
                  <p className="text-[11px] text-[#64748B] mt-0.5">Isi data pelanggan</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPanelMode("detail");
                    setMobileDrawerOpen(false);
                  }}
                  className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                  Nama lengkap
                </label>
                <input
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Contoh: Rizky Pratama"
                  className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                  No. telepon (WhatsApp)
                </label>
                <input
                  required
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="08xx xxxx xxxx"
                  className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                  Tanggal lahir (opsional)
                </label>
                <input
                  type="date"
                  value={birthDateInput}
                  onChange={(e) => setBirthDateInput(e.target.value)}
                  className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                  Catatan (opsional)
                </label>
                <textarea
                  rows={3}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Contoh: suka potongan fade tipis"
                  className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div className="bg-[#F8FAFC] rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
                <span className="text-[#64748B]">ID member</span>
                <span className="font-semibold text-[#0F172A]">{nextAutoCode} (otomatis)</span>
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
                className="w-full py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {saving ? "Menyimpan..." : "Simpan member"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPanelMode("detail");
                  setMobileDrawerOpen(false);
                }}
                className="w-full py-2.5 rounded-xl border border-[#E5E7EB] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] cursor-pointer"
              >
                Batal
              </button>
            </div>
          </form>
        )}

        {panelMode === "edit" && selectedMember && (
          <form onSubmit={handleUpdate} className="flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#0F172A]">Edit member</h2>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Bergabung {formatMemberDate(selectedMember.joinedAt)} · {selectedMember.memberCode}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPanelMode("detail")}
                  className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                  Nama lengkap
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
                  No. telepon (WhatsApp)
                </label>
                <input
                  required
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                  Tanggal lahir (opsional)
                </label>
                <input
                  type="date"
                  value={birthDateInput}
                  onChange={(e) => setBirthDateInput(e.target.value)}
                  className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                  Catatan (opsional)
                </label>
                <textarea
                  rows={2}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1.5">
                  Status member
                </label>
                <div className="bg-[#F4F4F5] p-1 rounded-xl grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveInput(true)}
                    className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      activeInput ? "bg-white text-[#15803D] shadow-xs" : "text-[#64748B]"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                    Aktif
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveInput(false)}
                    className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      !activeInput ? "bg-white text-[#DC2626] shadow-xs" : "text-[#64748B]"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
                    Tidak aktif
                  </button>
                </div>
                <p className="text-[10px] text-[#94A3B8] mt-1.5">
                  Member tidak aktif tidak dapat mengumpulkan poin baru
                </p>
              </div>

              <div className="bg-[#F8FAFC] rounded-xl px-3.5 py-2.5 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">ID member</span>
                  <span className="font-semibold text-[#0F172A]">{selectedMember.memberCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Total poin</span>
                  <span className="font-semibold text-[#0F172A]">
                    {selectedMember.points.toLocaleString("id-ID")} poin
                  </span>
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
                className="w-full py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {saving ? "Menyimpan..." : "Simpan perubahan"}
              </button>
              <button
                type="button"
                onClick={() => setPanelMode("detail")}
                className="w-full py-2.5 rounded-xl border border-[#E5E7EB] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] cursor-pointer"
              >
                Batal
              </button>
            </div>
          </form>
        )}

        {panelMode === "detail" && selectedMember && (
          <div className="flex-1 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-[#0F172A]">{selectedMember.name}</h2>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    {selectedMember.memberCode} · Bergabung {formatMemberDate(selectedMember.joinedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      selectedMember.isActive
                        ? "bg-[#DCFCE7] text-[#15803D]"
                        : "bg-[#F1F5F9] text-[#64748B]"
                    }`}
                  >
                    {selectedMember.isActive ? "Aktif" : "Tidak aktif"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="lg:hidden w-7 h-7 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-[#F4F4F5] rounded-2xl p-4 space-y-1">
                <p className="text-[11px] text-[#64748B]">Total poin</p>
                <p className="text-3xl font-bold text-[#0F172A] tabular-nums">
                  {selectedMember.points.toLocaleString("id-ID")}{" "}
                  <span className="text-xs font-medium text-[#64748B]">poin</span>
                </p>
                <p className="text-[11px] text-[#64748B]">
                  Setara {formatRupiah(selectedMember.points * 10)} untuk potongan harga
                </p>
              </div>

              <div className="space-y-3 text-xs pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">No. telepon</span>
                  <span className="font-semibold text-[#0F172A]">{selectedMember.phone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Kunjungan</span>
                  <span className="font-semibold text-[#0F172A]">{selectedMember.visits} kali</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Kunjungan terakhir</span>
                  <span className="font-semibold text-[#0F172A]">
                    {selectedMember.lastVisitAt ? formatDateShort(selectedMember.lastVisitAt) : "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Paket favorit</span>
                  <span className="font-semibold text-[#0F172A]">
                    {selectedMember.favoritePackage ?? "Regular"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Capster favorit</span>
                  <span className="font-semibold text-[#0F172A]">
                    {selectedMember.favoriteCapster ?? "Agus"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-5">
              <button
                type="button"
                onClick={() => setCardMember(selectedMember)}
                className="w-full py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Tampilkan kartu member
              </button>
              <button
                type="button"
                onClick={() => openEdit(selectedMember)}
                className="w-full py-2.5 rounded-xl border border-[#E5E7EB] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit member
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Digital Member Card Modal */}
      {cardMember && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[420px] p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Kartu Member</h3>
                <p className="text-xs text-[#64748B]">
                  Scan QR di kasir untuk identifikasi cepat
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCardMember(null)}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#0F172A] text-white rounded-2xl p-5 space-y-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <BarberbousLogo className="w-8 h-8" />
                  <div>
                    <p className="text-xs font-bold tracking-wider">BARBERBOUS</p>
                    <p className="text-[10px] text-[#94A3B8] tracking-widest">MEMBER CARD</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-semibold">
                  {cardMember.points.toLocaleString("id-ID")} poin
                </span>
              </div>

              <div className="border-t border-white/15 pt-4 flex items-end justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="text-base font-bold truncate">{cardMember.name}</p>
                  <p className="text-xs text-[#CBD5E1]">{cardMember.memberCode}</p>
                  <p className="text-[11px] text-[#94A3B8]">{cardMember.phone}</p>
                </div>
                <div className="bg-white p-1.5 rounded-xl shrink-0">
                  {cardQrUrl ? (
                    <img src={cardQrUrl} alt="QR Member" className="w-20 h-20 object-contain" />
                  ) : (
                    <div className="w-20 h-20" />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setCardMember(null)}
                className="py-2.5 rounded-xl border border-[#E5E7EB] text-xs font-semibold text-[#0F172A] cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!cardQrUrl) return;
                  const a = document.createElement("a");
                  a.href = cardQrUrl;
                  a.download = `kartu-${cardMember.memberCode}.png`;
                  a.click();
                }}
                className="py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh QR Kartu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
