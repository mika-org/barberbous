"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Clock,
  Package,
  Users,
  Scissors,
  TrendingDown,
  BarChart2,
  SlidersHorizontal,
  User,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Kasir", icon: LayoutGrid },
  { href: "/riwayat", label: "Riwayat", icon: Clock },
  { href: "/produk", label: "Produk", icon: Package },
  { href: "/member", label: "Member", icon: Users },
  { href: "/capster", label: "Capster", icon: Scissors },
  { href: "/pengeluaran", label: "Biaya", icon: TrendingDown },
  { href: "/laporan", label: "Laporan", icon: BarChart2 },
  { href: "/setelan", label: "Setelan", icon: SlidersHorizontal },
] as const;

export function BarberbousLogo({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-label="BARBERBOUS Logo"
      fill="none"
    >
      <circle cx="32" cy="32" r="31" fill="#0F172A" />
      <circle
        cx="32"
        cy="32"
        r="27.5"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeDasharray="2 2"
        opacity="0.7"
      />
      <circle cx="32" cy="32" r="21" stroke="#FFFFFF" strokeWidth="1" opacity="0.5" />
      <text
        x="32"
        y="25"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="6.8"
        fontWeight="700"
        letterSpacing="0.8"
      >
        BARBER
      </text>
      <path
        d="M23 30.5L41 37.5M41 30.5L23 37.5"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="22" cy="30.5" r="2.1" stroke="#FFFFFF" strokeWidth="1.4" />
      <circle cx="22" cy="37.5" r="2.1" stroke="#FFFFFF" strokeWidth="1.4" />
      <text
        x="32"
        y="46.5"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="6.4"
        fontWeight="700"
        letterSpacing="1"
      >
        BOUS
      </text>
    </svg>
  );
}

export interface ShellUser {
  name: string;
  username: string;
  role: string;
}

export function AppShell({
  children,
  user: initialUser,
}: {
  children: React.ReactNode;
  user?: ShellUser | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [showProfile, setShowProfile] = useState(false);
  const [user, setUser] = useState<ShellUser | null>(initialUser ?? null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (initialUser !== undefined) return;
    let active = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (active && json?.data) setUser(json.data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [initialUser]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-white text-[#0F172A]">
      {/* Persistent Left Navigation Rail (Tablet & Desktop) */}
      <aside className="hidden md:flex w-[74px] shrink-0 bg-white border-r border-[#E5E7EB] flex-col items-center justify-between py-4 select-none z-20">
        <div className="flex flex-col items-center gap-5 w-full">
          <Link href="/" className="hover:opacity-90 transition">
            <BarberbousLogo className="w-11 h-11" />
          </Link>

          <nav className="flex flex-col items-center gap-1 w-full px-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={`w-full py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                    isActive
                      ? "bg-[#0F172A] text-white shadow-xs"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <Icon className="w-[17px] h-[17px]" strokeWidth={1.85} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfile((p) => !p)}
            title="Profil Kasir"
            className="w-9 h-9 rounded-full bg-[#E5E7EB] hover:bg-[#D1D5DB] flex items-center justify-center text-[#0F172A] text-xs font-bold transition cursor-pointer"
          >
            {user ? user.name.slice(0, 1).toUpperCase() : <User className="w-4 h-4 text-[#64748B]" />}
          </button>

          {showProfile && (
            <div className="absolute left-12 bottom-0 w-52 bg-white border border-[#E5E7EB] rounded-xl shadow-lg p-3.5 z-50 text-xs">
              <p className="font-semibold text-[#0F172A]">{user?.name ?? "Rehan"}</p>
              <p className="text-[#64748B]">
                @{user?.username ?? "rehan"} · {user?.role ?? "Kasir"}
              </p>
              <div className="mt-2 pt-2 border-t border-[#F1F5F9] flex items-center justify-between">
                <span className="text-[11px] text-[#15803D] font-medium">● Aktif</span>
                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#DC2626] hover:text-[#B91C1C] cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {loggingOut ? "Keluar..." : "Keluar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0 min-h-0 h-full overflow-hidden pb-[60px] md:pb-0">
        {children}
      </div>

      {/* Mobile Bottom Navigation (< md) */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 h-[60px] bg-white border-t border-[#E5E7EB] px-1 items-center justify-around overflow-x-auto z-30 select-none">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`px-2 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[9.5px] font-medium shrink-0 transition-colors ${
                isActive ? "bg-[#0F172A] text-white" : "text-[#64748B]"
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={1.9} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleLogout}
          title="Keluar"
          className="px-2 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[9.5px] font-medium text-[#DC2626] shrink-0 cursor-pointer"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.9} />
          <span>Keluar</span>
        </button>
      </nav>
    </div>
  );
}
