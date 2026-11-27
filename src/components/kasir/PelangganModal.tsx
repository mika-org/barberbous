"use client";

import React, { useState } from "react";
import { X, User, Users, QrCode, Phone, Search, Check, UserPlus } from "lucide-react";
import { getInitials } from "@/lib/format";

export interface PosMember {
  id: string;
  memberCode: string;
  name: string;
  phone: string;
  points: number;
  isActive: boolean;
}

interface PelangganModalProps {
  orderCode: string;
  initialIsMember: boolean;
  initialMember: PosMember | null;
  members: PosMember[];
  onMemberCreated?: (member: PosMember) => void;
  onConfirm: (result: { isMember: boolean; member: PosMember | null }) => void;
  onClose: () => void;
}

export function PelangganModal({
  orderCode,
  initialIsMember,
  initialMember,
  members,
  onMemberCreated,
  onConfirm,
  onClose,
}: PelangganModalProps) {
  const [customerType, setCustomerType] = useState<"UMUM" | "MEMBER">(
    initialIsMember || initialMember ? "MEMBER" : "UMUM"
  );
  const [lookupMode, setLookupMode] = useState<"QR" | "PHONE">("PHONE");
  const [query, setQuery] = useState(initialMember?.phone ?? "");
  const [foundMember, setFoundMember] = useState<PosMember | null>(
    initialMember ?? members[0] ?? null
  );
  const [searching, setSearching] = useState(false);
  const [notFoundMsg, setNotFoundMsg] = useState<string | null>(null);

  // Quick register member inline state
  const [showQuickSignup, setShowQuickSignup] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [creatingMember, setCreatingMember] = useState(false);

  const handleSearch = async () => {
    setNotFoundMsg(null);
    setShowQuickSignup(false);
    const trimmed = query.trim();
    if (!trimmed) {
      setFoundMember(members[0] ?? null);
      return;
    }

    const digits = trimmed.replace(/\D/g, "");
    const localHit = members.find(
      (m) =>
        m.memberCode.toLowerCase() === trimmed.toLowerCase() ||
        m.name.toLowerCase().includes(trimmed.toLowerCase()) ||
        (digits.length >= 4 && m.phone.replace(/\D/g, "").includes(digits))
    );
    if (localHit) {
      setFoundMember(localHit);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/members?search=${encodeURIComponent(trimmed)}`);
      const json = await res.json();
      const first: PosMember | undefined = json.data?.[0];
      if (first) {
        setFoundMember(first);
      } else {
        setFoundMember(null);
        setNotFoundMsg("Member belum terdaftar.");
        setNewMemberPhone(digits.length >= 6 ? trimmed : "");
      }
    } catch {
      setNotFoundMsg("Gagal mencari data member");
    } finally {
      setSearching(false);
    }
  };

  const handleQuickCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberPhone.trim()) return;
    setCreatingMember(true);
    setNotFoundMsg(null);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMemberName.trim(),
          phone: newMemberPhone.trim(),
          isActive: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const created: PosMember = json.data;
      onMemberCreated?.(created);
      setFoundMember(created);
      setShowQuickSignup(false);
      setQuery(created.phone);
    } catch (err: unknown) {
      setNotFoundMsg(err instanceof Error ? err.message : "Gagal mendaftarkan member");
    } finally {
      setCreatingMember(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[440px] max-h-[92vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">Pilih status pelanggan</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Untuk transaksi {orderCode}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#64748B] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2 Selectable Type Cards */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setCustomerType("UMUM")}
            className={`relative rounded-xl border-2 p-3.5 text-left transition cursor-pointer ${
              customerType === "UMUM"
                ? "border-[#0F172A] bg-white"
                : "border-[#E5E7EB] bg-white hover:border-[#CBD5E1]"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-[#0F172A]">
                <User className="w-4 h-4" />
              </div>
              {customerType === "UMUM" && (
                <span className="w-5 h-5 rounded-full bg-[#0F172A] text-white flex items-center justify-center">
                  <Check className="w-3 h-3" strokeWidth={2.5} />
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-[#0F172A]">Pelanggan umum</p>
            <p className="text-[11px] text-[#64748B] mt-0.5 leading-snug">
              Tanpa poin dan diskon member
            </p>
          </button>

          <button
            type="button"
            onClick={() => setCustomerType("MEMBER")}
            className={`relative rounded-xl border-2 p-3.5 text-left transition cursor-pointer ${
              customerType === "MEMBER"
                ? "border-[#0F172A] bg-white"
                : "border-[#E5E7EB] bg-white hover:border-[#CBD5E1]"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center text-white">
                <Users className="w-4 h-4" />
              </div>
              {customerType === "MEMBER" && (
                <span className="w-5 h-5 rounded-full bg-[#0F172A] text-white flex items-center justify-center">
                  <Check className="w-3 h-3" strokeWidth={2.5} />
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-[#0F172A]">Member</p>
            <p className="text-[11px] text-[#64748B] mt-0.5 leading-snug">
              Kumpulkan poin dan diskon member
            </p>
          </button>
        </div>

        {customerType === "MEMBER" && (
          <div className="space-y-3">
            {/* Segmented tabs: Scan QR | Input no. HP */}
            <div className="bg-[#F4F4F5] p-1 rounded-xl grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setLookupMode("QR")}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  lookupMode === "QR"
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-[#64748B]"
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                Scan QR
              </button>
              <button
                type="button"
                onClick={() => setLookupMode("PHONE")}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  lookupMode === "PHONE"
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-[#64748B]"
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                Input no. HP
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-[#64748B]">
                  {lookupMode === "QR" ? "Kode QR / ID Member" : "No. HP member"}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickSignup((p) => !p);
                    if (!newMemberPhone && query.replace(/\D/g, "").length >= 6) {
                      setNewMemberPhone(query.trim());
                    }
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803D] hover:underline cursor-pointer"
                >
                  <UserPlus className="w-3 h-3" />
                  {showQuickSignup ? "Tutup form daftar" : "+ Daftar member baru"}
                </button>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  {lookupMode === "QR" ? (
                    <QrCode className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  ) : (
                    <Phone className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  )}
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    placeholder={lookupMode === "QR" ? "Contoh: MBR-0012" : "0812-3456-7801"}
                    className="w-full border border-[#0F172A] rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-[#0F172A] focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  disabled={searching}
                  onClick={handleSearch}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  {searching ? "Cari..." : "Cari"}
                </button>
              </div>
            </div>

            {notFoundMsg && (
              <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 text-[11px]">
                <span className="text-[#DC2626]">{notFoundMsg}</span>
                {!showQuickSignup && (
                  <button
                    type="button"
                    onClick={() => setShowQuickSignup(true)}
                    className="font-bold text-[#0F172A] underline shrink-0 cursor-pointer"
                  >
                    Daftarkan sekarang
                  </button>
                )}
              </div>
            )}

            {/* Inline Quick Member Registration */}
            {showQuickSignup && (
              <form
                onSubmit={handleQuickCreateMember}
                className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3.5 space-y-2.5"
              >
                <p className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-[#15803D]" />
                  Daftar Cepat Member Baru
                </p>
                <input
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Nama lengkap pelanggan"
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
                <div className="flex gap-2">
                  <input
                    required
                    value={newMemberPhone}
                    onChange={(e) => setNewMemberPhone(e.target.value)}
                    placeholder="No. HP / WhatsApp (08xx...)"
                    className="flex-1 bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                  <button
                    type="submit"
                    disabled={creatingMember}
                    className="bg-[#15803D] hover:bg-[#166534] text-white rounded-lg px-3.5 py-2 text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    {creatingMember ? "Menyimpan..." : "Simpan & Pilih"}
                  </button>
                </div>
              </form>
            )}

            {foundMember && !showQuickSignup && (
              <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#DCFCE7] text-[#15803D] font-bold text-xs flex items-center justify-center shrink-0">
                    {getInitials(foundMember.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-[#0F172A] truncate">
                        {foundMember.name}
                      </p>
                      <span className="px-1.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-[10px] font-semibold">
                        Aktif
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] truncate">
                      {foundMember.memberCode} · {foundMember.phone}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-[#0F172A] tabular-nums">
                    {foundMember.points.toLocaleString("id-ID")}
                  </p>
                  <p className="text-[10px] text-[#64748B]">poin</p>
                </div>
              </div>
            )}

            {members.length > 1 && !showQuickSignup && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {members.slice(0, 4).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setQuery(lookupMode === "QR" ? m.memberCode : m.phone);
                      setFoundMember(m);
                      setNotFoundMsg(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border shrink-0 transition cursor-pointer ${
                      foundMember?.id === m.id
                        ? "border-[#0F172A] bg-[#0F172A] text-white"
                        : "border-[#E5E7EB] text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 rounded-xl border border-[#E5E7EB] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={customerType === "MEMBER" && !foundMember}
            onClick={() =>
              onConfirm(
                customerType === "MEMBER" && foundMember
                  ? { isMember: true, member: foundMember }
                  : { isMember: false, member: null }
              )
            }
            className="py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            {customerType === "MEMBER" ? "Pilih member ini" : "Gunakan umum"}
          </button>
        </div>
      </div>
    </div>
  );
}
