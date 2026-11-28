"use client";

import React, { useState, useRef } from "react";
import { X, Calendar as CalendarIcon, Check, User } from "lucide-react";
import { type PosCapster } from "./KasirClient";
import { formatRupiah } from "@/lib/format";

interface KasbonModalProps {
  capsters: PosCapster[];
  onSuccess: (message: string) => void;
  onClose: () => void;
}

export function KasbonModal({ capsters, onSuccess, onClose }: KasbonModalProps) {
  const [selectedCapsterId, setSelectedCapsterId] = useState<string>(
    capsters[0]?.id ?? ""
  );

  // Default to today's date in YYYY-MM-DD
  const getTodayYmd = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const [dateYmd, setDateYmd] = useState<string>(getTodayYmd());
  const [nominalRaw, setNominalRaw] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateInputRef = useRef<HTMLInputElement>(null);

  // Format YYYY-MM-DD to DD / MM / YYYY for display
  const formatDisplayDate = (ymd: string) => {
    if (!ymd) return "DD / MM / YYYY";
    const [y, m, d] = ymd.split("-");
    if (!y || !m || !d) return "DD / MM / YYYY";
    return `${d} / ${m} / ${y}`;
  };

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    if (!rawVal) {
      setNominalRaw("");
      return;
    }
    const num = parseInt(rawVal, 10);
    setNominalRaw(isNaN(num) ? "" : String(num));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCapsterId) {
      setError("Silakan pilih capster terlebih dahulu");
      return;
    }

    const amount = parseInt(nominalRaw, 10);
    if (!amount || amount <= 0) {
      setError("Silakan isi nominal kasbon");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/kasbon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capsterId: selectedCapsterId,
          amount,
          date: dateYmd ? new Date(dateYmd).toISOString() : new Date().toISOString(),
          notes: notes.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal menyimpan kasbon");
      }

      const selectedCap = capsters.find((c) => c.id === selectedCapsterId);
      onSuccess(
        `Kasbon ${formatRupiah(amount)} untuk ${selectedCap?.name ?? "Capster"} berhasil dicatat!`
      );
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan kasbon");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
              Kasbon
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
              Isi formulir kasbon
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Section: Pilih Capster */}
          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-2.5">
              Pilih Capster
            </label>
            <div className="grid grid-cols-3 gap-3">
              {capsters.map((cap) => {
                const isSelected = selectedCapsterId === cap.id;
                return (
                  <button
                    key={cap.id}
                    type="button"
                    onClick={() => setSelectedCapsterId(cap.id)}
                    className={`rounded-2xl border p-3.5 sm:p-4 flex flex-col items-center justify-center gap-2.5 transition cursor-pointer text-center relative ${
                      isSelected
                        ? "border-[#0F172A] ring-2 ring-[#0F172A]/10 bg-[#F8FAFC] shadow-xs"
                        : "border-[#E2E8F0] hover:border-[#CBD5E1] bg-white hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center overflow-hidden transition ${
                        isSelected
                          ? "bg-[#E2E8F0] text-[#0F172A]"
                          : "bg-[#F1F5F9] text-[#64748B]"
                      }`}
                      style={{
                        backgroundColor: cap.bgColor ? `${cap.bgColor}25` : undefined,
                      }}
                    >
                      {cap.photoUrl ? (
                        <img
                          src={cap.photoUrl}
                          alt={cap.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-7 h-7 sm:w-8 sm:h-8" />
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-[#0F172A] truncate w-full">
                      {cap.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Tanggal */}
          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1.5">
              Tanggal
            </label>
            <div
              onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.focus()}
              className="relative flex items-center border border-[#E2E8F0] rounded-xl px-4 py-3 bg-white hover:border-[#CBD5E1] transition cursor-pointer"
            >
              <span
                className={`text-xs sm:text-sm flex-1 ${
                  dateYmd ? "text-[#0F172A] font-medium" : "text-[#94A3B8]"
                }`}
              >
                {formatDisplayDate(dateYmd)}
              </span>
              <CalendarIcon className="w-4 h-4 text-[#64748B] shrink-0" />
              <input
                ref={dateInputRef}
                type="date"
                value={dateYmd}
                onChange={(e) => setDateYmd(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>
          </div>

          {/* Section: Nominal */}
          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1.5">
              Nominal
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={nominalRaw ? formatRupiah(parseInt(nominalRaw, 10)) : ""}
                onChange={handleNominalChange}
                placeholder="Isi nominal"
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {loading ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Selesai</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
