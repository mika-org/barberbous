"use client";

import React, { useState } from "react";
import { X, User, Users, QrCode, Phone, Search, Check } from "lucide-react";
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
  onConfirm: (result: { isMember: boolean; member: PosMember | null }) => void;
  onClose: () => void;
}

export function PelangganModal({
  orderCode,
  initialIsMember,
  initialMember,
  members,
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

  const handleSearch = async () => {
    setNotFoundMsg(null);
    const trimmed = query.trim();
    if (!trimmed) {
      setFoundMember(members[0] ?? null);
      return;
    }

    // Try local match first for instant feedback
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
        setNotFoundMsg("Member tidak ditemukan. Periksa nomor HP atau ID member.");
      }
    } catch {
      setNotFoundMsg("Gagal mencari data member");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[440px] p-6 space-y-4 shadow-2xl">
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
              <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                {lookupMode === "QR" ? "Kode QR / ID Member" : "No. HP member"}
              </label>
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

            {foundMember && (
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

            {notFoundMsg && (
              <p className="text-[11px] text-[#DC2626] bg-[#FEF2F2] px-3 py-2 rounded-lg">
                {notFoundMsg}
              </p>
            )}

            {/* Quick member suggestions if searching */}
            {members.length > 1 && (
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
