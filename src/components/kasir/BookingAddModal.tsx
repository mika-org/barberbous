"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

interface OptionItem {
  id: string;
  name: string;
}

export function BookingAddModal({
  packages,
  capsters,
  onCreated,
  onClose,
}: {
  packages: OptionItem[];
  capsters: OptionItem[];
  onCreated: () => void;
  onClose: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [scheduledTime, setScheduledTime] = useState("12:00");
  const [packageId, setPackageId] = useState(packages[0]?.id ?? "");
  const [capsterId, setCapsterId] = useState(capsters[0]?.id ?? "");
  const [isMember, setIsMember] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone: customerPhone || null,
          scheduledTime,
          packageId,
          capsterId,
          isMember,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Gagal menambah booking");
      } else {
        onCreated();
        onClose();
      }
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[400px] shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#0F172A]">Tambah Booking</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-[#64748B] mb-1">Nama pelanggan</label>
            <input
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Contoh: Andi Wijaya"
              className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-medium text-[#64748B] mb-1">Jam booking</label>
              <input
                required
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#64748B] mb-1">No. HP (opsional)</label>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="0812..."
                className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-medium text-[#64748B] mb-1">Paket</label>
              <select
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#0F172A] bg-white focus:outline-none focus:border-[#0F172A]"
              >
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-[#64748B] mb-1">Capster</label>
              <select
                value={capsterId}
                onChange={(e) => setCapsterId(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#0F172A] bg-white focus:outline-none focus:border-[#0F172A]"
              >
                {capsters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isMember}
              onChange={(e) => setIsMember(e.target.checked)}
              className="rounded border-[#CBD5E1]"
            />
            <span className="text-[#0F172A] font-medium">Pelanggan Member (diskon 10%)</span>
          </label>

          {error && <p className="text-[#DC2626]">{error}</p>}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] font-semibold text-[#0F172A] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-[#0F172A] text-white font-semibold cursor-pointer disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
