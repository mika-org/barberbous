"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { BarberbousLogo } from "@/components/AppShell";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Login gagal");
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan koneksi");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-white border border-[#E5E7EB] rounded-2xl p-7 shadow-xs">
        <div className="flex flex-col items-center text-center">
          <BarberbousLogo className="w-14 h-14" />
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A] mt-3.5">
            BARBERBOUS
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Masuk dengan akun kasir atau pengelola
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-[11px] font-medium text-[#64748B] mb-1.5"
            >
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full border border-[#E5E7EB] rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-medium text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[11px] font-medium text-[#64748B] mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full border border-[#E5E7EB] rounded-xl pl-10 pr-10 py-2.5 text-xs font-medium text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] rounded-xl px-3.5 py-2.5 text-xs font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60"
          >
            {loading ? "Memverifikasi..." : "Masuk"}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-[#F1F5F9] text-[11px] text-[#64748B] space-y-1">
          <p className="font-semibold text-[#475569]">Akun default:</p>
          <div className="flex justify-between">
            <span>Kasir: <code className="text-[#0F172A] font-medium">rehan</code></span>
            <span>Password: <code className="text-[#0F172A] font-medium">kasir123</code></span>
          </div>
          <div className="flex justify-between">
            <span>Owner: <code className="text-[#0F172A] font-medium">aditia</code></span>
            <span>Password: <code className="text-[#0F172A] font-medium">admin123</code></span>
          </div>
        </div>
      </div>
    </div>
  );
}
