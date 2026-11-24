"use client";

import React, { useState } from "react";
import { Printer, Download, Plus, Trash2 } from "lucide-react";

export interface StoreSettingModel {
  id: string;
  storeName: string;
  address: string;
  phone: string;
  printerName: string;
  printerConnection: string;
  printerConnected: boolean;
  paperSize: string;
  autoPrintReceipt: boolean;
  receiptFooter: string;
  taxEnabled: boolean;
  taxRate: number;
  serviceFeeEnabled: boolean;
  serviceFeeAmount: number;
  priceIncludesTax: boolean;
  tunaiEnabled: boolean;
  qrisEnabled: boolean;
  qrisMerchantName: string;
}

export interface StaffUserModel {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: string;
  isActive: boolean;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label ?? "Toggle"}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center w-9 h-5 rounded-full p-0.5 transition cursor-pointer shrink-0 ${
        checked ? "bg-[#15803D]" : "bg-[#CBD5E1]"
      }`}
    >
      <span
        className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function SetelanClient({
  initialSetting,
  initialStaff,
}: {
  initialSetting: StoreSettingModel;
  initialStaff: StaffUserModel[];
}) {
  const [section, setSection] = useState<
    "umum" | "pembayaran" | "pengguna" | "cadangan"
  >("umum");
  const [setting, setSetting] = useState<StoreSettingModel>(initialSetting);
  const [staff, setStaff] = useState<StaffUserModel[]>(initialStaff);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Add staff form
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffUsername, setNewStaffUsername] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<"Kasir" | "Admin" | "Owner">("Kasir");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveSetting = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: setting.storeName,
          address: setting.address,
          phone: setting.phone,
          printerName: setting.printerName,
          printerConnection: setting.printerConnection,
          printerConnected: setting.printerConnected,
          paperSize: setting.paperSize === "58 mm" ? "58 mm" : "80 mm",
          autoPrintReceipt: setting.autoPrintReceipt,
          receiptFooter: setting.receiptFooter,
          taxEnabled: setting.taxEnabled,
          taxRate: Number(setting.taxRate) || 0,
          serviceFeeEnabled: setting.serviceFeeEnabled,
          serviceFeeAmount: Number(setting.serviceFeeAmount) || 0,
          priceIncludesTax: setting.priceIncludesTax,
          tunaiEnabled: setting.tunaiEnabled,
          qrisEnabled: setting.qrisEnabled,
          qrisMerchantName: setting.qrisMerchantName,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSetting(json.data);
      showToast("Pengaturan berhasil disimpan");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newStaffName,
        username: newStaffUsername,
        password: newStaffPassword,
        role: newStaffRole,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error ?? "Gagal menambah pengguna");
      return;
    }
    setStaff((prev) => [...prev, json.data]);
    setNewStaffName("");
    setNewStaffUsername("");
    setNewStaffPassword("");
    showToast("Pengguna ditambahkan");
  };

  const handleToggleStaff = async (user: StaffUserModel) => {
    const res = await fetch(`/api/staff/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    if (res.ok) {
      const json = await res.json();
      setStaff((prev) => prev.map((u) => (u.id === user.id ? json.data : u)));
    }
  };

  const handleDeleteStaff = async (id: string) => {
    const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
    if (res.ok) {
      setStaff((prev) => prev.filter((u) => u.id !== id));
      showToast("Pengguna dihapus");
    }
  };

  return (
    <>
      {/* Inner Setelan Menu */}
      <aside className="w-[220px] shrink-0 bg-white border-r border-[#E5E7EB] p-5">
        <h2 className="text-lg font-bold text-[#0F172A] mb-4">Setelan</h2>
        <nav className="space-y-1">
          {(
            [
              { id: "umum", label: "Umum" },
              { id: "pembayaran", label: "Metode pembayaran" },
              { id: "pengguna", label: "Pengguna & role" },
              { id: "cadangan", label: "Cadangan data" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                section === item.id
                  ? "bg-[#F4F4F5] font-semibold text-[#0F172A]"
                  : "text-[#64748B] font-medium hover:bg-[#FAFAFA] hover:text-[#0F172A]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Settings Content */}
      <main className="flex-1 bg-[#FAFAFA] p-8 overflow-y-auto min-w-0">
        {section === "umum" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-[#0F172A]">Umum</h1>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Informasi toko, printer, dan pajak
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveSetting}
                className="bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Simpan perubahan"}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6 items-start">
              {/* Left Column: Info toko + Pajak & biaya */}
              <div className="space-y-5">
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3.5">
                  <h2 className="text-sm font-bold text-[#0F172A]">Info toko</h2>

                  <div>
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                      Nama toko
                    </label>
                    <input
                      value={setting.storeName}
                      onChange={(e) =>
                        setSetting((s) => ({ ...s, storeName: e.target.value }))
                      }
                      className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                      Alamat
                    </label>
                    <input
                      value={setting.address}
                      onChange={(e) =>
                        setSetting((s) => ({ ...s, address: e.target.value }))
                      }
                      className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                      Telepon
                    </label>
                    <input
                      value={setting.phone}
                      onChange={(e) =>
                        setSetting((s) => ({ ...s, phone: e.target.value }))
                      }
                      className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                    />
                  </div>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3.5">
                  <h2 className="text-sm font-bold text-[#0F172A]">Pajak &amp; biaya</h2>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#0F172A]">Pajak PB1</span>
                    <Toggle
                      checked={setting.taxEnabled}
                      onChange={(val) => setSetting((s) => ({ ...s, taxEnabled: val }))}
                      label="Pajak PB1"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                      Tarif pajak (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={setting.taxRate}
                      onChange={(e) =>
                        setSetting((s) => ({
                          ...s,
                          taxRate: Number(e.target.value) || 0,
                        }))
                      }
                      className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#0F172A]">
                      Biaya layanan
                    </span>
                    <Toggle
                      checked={setting.serviceFeeEnabled}
                      onChange={(val) =>
                        setSetting((s) => ({ ...s, serviceFeeEnabled: val }))
                      }
                      label="Biaya layanan"
                    />
                  </div>

                  {setting.serviceFeeEnabled && (
                    <div>
                      <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                        Nominal biaya layanan (Rp)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={setting.serviceFeeAmount}
                        onChange={(e) =>
                          setSetting((s) => ({
                            ...s,
                            serviceFeeAmount: Number(e.target.value) || 0,
                          }))
                        }
                        className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#0F172A]">
                      Harga sudah termasuk pajak
                    </span>
                    <Toggle
                      checked={setting.priceIncludesTax}
                      onChange={(val) =>
                        setSetting((s) => ({ ...s, priceIncludesTax: val }))
                      }
                      label="Harga sudah termasuk pajak"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Printer & struk */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
                <h2 className="text-sm font-bold text-[#0F172A]">Printer &amp; struk</h2>

                <div className="border border-[#E5E7EB] rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F4F4F5] flex items-center justify-center text-[#475569]">
                      <Printer className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#0F172A]">
                        {setting.printerName}
                      </p>
                      <p className="text-[11px] text-[#64748B]">
                        {setting.printerConnection}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSetting((s) => ({
                        ...s,
                        printerConnected: !s.printerConnected,
                      }))
                    }
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer ${
                      setting.printerConnected
                        ? "bg-[#DCFCE7] text-[#15803D]"
                        : "bg-[#FEE2E2] text-[#DC2626]"
                    }`}
                  >
                    {setting.printerConnected ? "Terhubung" : "Terputus"}
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#64748B] mb-1.5">
                    Ukuran kertas
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["58 mm", "80 mm"].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSetting((s) => ({ ...s, paperSize: size }))}
                        className={`py-2 rounded-xl text-xs font-medium border transition cursor-pointer ${
                          setting.paperSize === size
                            ? "border-[#0F172A] bg-[#F8FAFC] text-[#0F172A] font-semibold"
                            : "border-[#E5E7EB] text-[#64748B] hover:bg-[#FAFAFA]"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-medium text-[#0F172A]">
                    Cetak struk otomatis
                  </span>
                  <Toggle
                    checked={setting.autoPrintReceipt}
                    onChange={(val) =>
                      setSetting((s) => ({ ...s, autoPrintReceipt: val }))
                    }
                    label="Cetak struk otomatis"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                    Footer struk
                  </label>
                  <input
                    value={setting.receiptFooter}
                    onChange={(e) =>
                      setSetting((s) => ({ ...s, receiptFooter: e.target.value }))
                    }
                    className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {section === "pembayaran" && (
          <div className="max-w-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-[#0F172A]">Metode pembayaran</h1>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Atur metode pembayaran yang tersedia di kasir
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveSetting}
                className="bg-[#0F172A] text-white rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer"
              >
                {saving ? "Menyimpan..." : "Simpan perubahan"}
              </button>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#0F172A]">Pembayaran Tunai</p>
                  <p className="text-[11px] text-[#64748B]">
                    Terima pembayaran uang tunai dengan hitung kembalian otomatis
                  </p>
                </div>
                <Toggle
                  checked={setting.tunaiEnabled}
                  onChange={(val) => setSetting((s) => ({ ...s, tunaiEnabled: val }))}
                />
              </div>

              <div className="border-t border-[#F1F5F9] pt-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#0F172A]">Pembayaran QRIS</p>
                  <p className="text-[11px] text-[#64748B]">
                    GoPay, OVO, DANA, ShopeePay, dan m-Banking
                  </p>
                </div>
                <Toggle
                  checked={setting.qrisEnabled}
                  onChange={(val) => setSetting((s) => ({ ...s, qrisEnabled: val }))}
                />
              </div>

              <div className="border-t border-[#F1F5F9] pt-4">
                <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                  Nama merchant QRIS
                </label>
                <input
                  value={setting.qrisMerchantName}
                  onChange={(e) =>
                    setSetting((s) => ({ ...s, qrisMerchantName: e.target.value }))
                  }
                  className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>
            </div>
          </div>
        )}

        {section === "pengguna" && (
          <div className="max-w-2xl space-y-5">
            <div>
              <h1 className="text-xl font-bold text-[#0F172A]">Pengguna &amp; role</h1>
              <p className="text-xs text-[#64748B] mt-0.5">
                Kelola akun kasir dan pengelola outlet
              </p>
            </div>

            <form
              onSubmit={handleAddStaff}
              className="bg-white border border-[#E5E7EB] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_110px_auto] gap-2.5 items-end"
            >
              <div>
                <label className="block text-[11px] text-[#64748B] mb-1">Nama</label>
                <input
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="Nama staf"
                  className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#64748B] mb-1">Username</label>
                <input
                  required
                  value={newStaffUsername}
                  onChange={(e) => setNewStaffUsername(e.target.value.toLowerCase())}
                  placeholder="username"
                  className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#64748B] mb-1">Password</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  placeholder="Min. 6 karakter"
                  className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#64748B] mb-1">Role</label>
                <select
                  value={newStaffRole}
                  onChange={(e) =>
                    setNewStaffRole(e.target.value as "Kasir" | "Admin" | "Owner")
                  }
                  className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs bg-white"
                >
                  <option value="Kasir">Kasir</option>
                  <option value="Admin">Admin</option>
                  <option value="Owner">Owner</option>
                </select>
              </div>
              <button
                type="submit"
                className="bg-[#0F172A] text-white rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah
              </button>
            </form>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] text-[#64748B]">
                    <th className="py-3 px-4">Nama</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-right">Aktif</th>
                    <th className="py-3 px-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {staff.map((u) => (
                    <tr key={u.id}>
                      <td className="py-3 px-4 font-semibold text-[#0F172A]">{u.name}</td>
                      <td className="py-3 px-4 text-[#64748B]">@{u.username}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#F4F4F5] text-[#0F172A] text-[11px] font-medium">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Toggle
                          checked={u.isActive}
                          onChange={() => handleToggleStaff(u)}
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(u.id)}
                          className="text-[#DC2626] hover:bg-[#FEF2F2] p-1.5 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === "cadangan" && (
          <div className="max-w-xl space-y-5">
            <div>
              <h1 className="text-xl font-bold text-[#0F172A]">Cadangan data</h1>
              <p className="text-xs text-[#64748B] mt-0.5">
                Ekspor seluruh data transaksi, paket, capster, booking, dan setelan dari PostgreSQL
              </p>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#0F172A]">
                  Unduh Cadangan JSON
                </p>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Berisi snapshot lengkap database BARBERBOUS POS
                </p>
              </div>
              <a
                href="/api/backup"
                className="bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Ekspor JSON
              </a>
            </div>
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#0F172A] text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
