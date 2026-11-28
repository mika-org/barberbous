"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Scissors,
  Droplets,
  Star,
  Check,
  Calendar,
  Clock,
  User,
  Phone,
  MessageCircle,
  MapPin,
  ChevronDown,
  Sun,
  Moon,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { formatRupiah } from "@/lib/format";

export interface LandingPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  badgeColor?: string;
}

export interface LandingCapster {
  id: string;
  name: string;
  photoUrl: string | null;
  bgColor?: string;
  rating?: number;
}

interface LandingClientProps {
  initialPackages?: LandingPackage[];
  initialCapsters?: LandingCapster[];
  storeName?: string;
  storePhone?: string;
  storeAddress?: string;
}

const DEFAULT_PACKAGES: LandingPackage[] = [
  {
    id: "pkg-1",
    name: "Paket Basic",
    description: "Haircut, Hair tonic, Styling",
    price: 30000,
  },
  {
    id: "pkg-2",
    name: "Paket Regular",
    description: "Haircut, Hair wash, Hair tonic, Styling",
    price: 35000,
  },
  {
    id: "pkg-3",
    name: "Paket Premium",
    description: "Haircut, Hair wash, Hot tonic, Styling",
    price: 40000,
  },
];

const DEFAULT_CAPSTERS: LandingCapster[] = [
  { id: "cap-1", name: "Agus", photoUrl: null, bgColor: "#C4B5E3" },
  { id: "cap-2", name: "Adi", photoUrl: null, bgColor: "#E59A1A" },
  { id: "cap-3", name: "Reki", photoUrl: null, bgColor: "#EE3E7D" },
];

const TIME_SLOTS = [
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
];

const FAQ_ITEMS = [
  {
    question: "Apakah harus booking terlebih dahulu atau bisa langsung datang (walk-in)?",
    answer:
      "Anda sangat dipersilakan datang langsung (walk-in). Namun untuk menghindari antrean panjang pada jam sibuk, kami sarankan Anda melakukan booking jadwal online terlebih dahulu.",
  },
  {
    question: "Berapa lama rata-rata durasi pengerjaan setiap paket?",
    answer:
      "Durasi pengerjaan berkisar antara 30 hingga 50 menit tergantung paket yang dipilih dan kebutuhan styling Anda.",
  },
  {
    question: "Metode pembayaran apa saja yang diterima?",
    answer:
      "Kami menerima Tunai, QRIS (mendukung semua aplikasi perbankan dan e-wallet seperti GoPay, OVO, Dana), serta Kartu Debit.",
  },
  {
    question: "Apakah ada garansi potongan rambut?",
    answer:
      "Tentu! Kepuasan Anda adalah prioritas kami. Jika hasil potongan kurang sesuai dengan keinginan, kami berikan garansi gratis touch-up dalam waktu 3 hari setelah kunjungan.",
  },
  {
    question: "Bagaimana jika saya berhalangan hadir atau terlambat dari jam booking?",
    answer:
      "Kami memberikan toleransi keterlambatan maksimal 15 menit. Jika perlu reschedule jadwal, silakan hubungi kami via WhatsApp sebelum jam booking Anda.",
  },
];

export function LandingClient({
  initialPackages = DEFAULT_PACKAGES,
  initialCapsters = DEFAULT_CAPSTERS,
  storeName = "BARBERBOUS",
  storePhone = "+62 812-0000-0000",
  storeAddress = "Jl. Turangga No. 12, Bandung",
}: LandingClientProps) {
  // Theme state: default is LIGHT MODE
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Initialize theme from localStorage if available, otherwise default to light
  useEffect(() => {
    const saved = localStorage.getItem("barberbous_theme");
    if (saved === "dark") {
      setDarkMode(true);
    } else {
      setDarkMode(false);
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("barberbous_theme", next ? "dark" : "light");
      return next;
    });
  };

  const packages = initialPackages.length > 0 ? initialPackages : DEFAULT_PACKAGES;
  const capsters = initialCapsters.length > 0 ? initialCapsters : DEFAULT_CAPSTERS;

  // Booking interactive state
  const [selectedPkgId, setSelectedPkgId] = useState<string>(packages[1]?.id ?? packages[0]?.id ?? "");
  const [selectedCapId, setSelectedCapId] = useState<string>(capsters[1]?.id ?? capsters[0]?.id ?? "");

  // Generate 7 upcoming dates
  const datesList = React.useMemo(() => {
    const daysName = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const list = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      list.push({
        dayName: daysName[d.getDay()],
        dayNum: d.getDate(),
        ymd,
        fullDateStr: d.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      });
    }
    return list;
  }, []);

  const [selectedDateYmd, setSelectedDateYmd] = useState<string>(datesList[1]?.ymd ?? datesList[0]?.ymd ?? "");
  const [selectedTime, setSelectedTime] = useState<string>("14:00");

  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [bookingNotes, setBookingNotes] = useState<string>("");

  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // FAQ Accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const selectedPkg = packages.find((p) => p.id === selectedPkgId) ?? packages[0];
  const selectedCap =
    selectedCapId === "RANDOM"
      ? { id: "RANDOM", name: "Random (Capster Tersedia)", photoUrl: null }
      : capsters.find((c) => c.id === selectedCapId) ?? capsters[0];
  const selectedDateObj = datesList.find((d) => d.ymd === selectedDateYmd) ?? datesList[0];

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    setBookingSuccess(null);

    if (!customerName.trim()) {
      setBookingError("Silakan masukkan nama lengkap Anda");
      return;
    }
    if (!customerPhone.trim()) {
      setBookingError("Silakan masukkan nomor WhatsApp Anda");
      return;
    }

    setBookingLoading(true);
    try {
      const actualCapsterId =
        selectedCapId === "RANDOM"
          ? capsters[Math.floor(Math.random() * capsters.length)]?.id ?? capsters[0]?.id
          : selectedCapId;

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          packageId: selectedPkgId,
          capsterId: actualCapsterId,
          scheduledTime: selectedTime,
          notes: bookingNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal memproses booking");
      }

      setBookingSuccess(
        `Terima kasih Kak ${customerName}! Booking ${selectedPkg.name} berhasil tersimpan.`
      );

      // Auto format WhatsApp confirmation URL
      const cleanWa = storePhone.replace(/\D/g, "");
      const waNumber = cleanWa.startsWith("0") ? `62${cleanWa.slice(1)}` : cleanWa;
      const msg = `Halo ${storeName}, saya ingin konfirmasi booking:\n\nNama: ${customerName}\nPaket: ${selectedPkg.name} (${formatRupiah(selectedPkg.price)})\nCapster: ${selectedCap.name}\nJadwal: ${selectedDateObj.fullDateStr} jam ${selectedTime}\nCatatan: ${bookingNotes.trim() || "-"}\n\nTerima kasih!`;

      setTimeout(() => {
        if (waNumber) {
          window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, "_blank");
        }
      }, 1000);
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : "Terjadi kesalahan saat booking");
    } finally {
      setBookingLoading(false);
    }
  };

  // Color theme classes mapping
  const theme = {
    bg: darkMode ? "bg-[#10141D]" : "bg-[#FAF8F5]",
    textMain: darkMode ? "text-[#F8FAFC]" : "text-[#1E232B]",
    textMuted: darkMode ? "text-[#94A3B8]" : "text-[#64748B]",
    headerBg: darkMode ? "bg-[#10141D]/90 border-[#1E2533]" : "bg-[#FAF8F5]/90 border-[#EAE6DF]",
    cardBg: darkMode ? "bg-[#161C28] border-[#222B3D]" : "bg-white border-[#EAE6DF]",
    cardAltBg: darkMode ? "bg-[#1C2333] border-[#29344A]" : "bg-[#F5F2EB] border-[#E8E3D8]",
    inputBg: darkMode ? "bg-[#10141D] border-[#2A3448] text-white" : "bg-white border-[#E2E8F0] text-[#0F172A]",
    divider: darkMode ? "border-[#222B3D]" : "border-[#EAE6DF]",
    heroBg: darkMode
      ? "bg-gradient-to-b from-[#161C28] to-[#10141D]"
      : "bg-gradient-to-b from-[#F5F0E6] to-[#FAF8F5]",
    accentGold: "bg-[#C69A59] hover:bg-[#B58948] text-white",
    goldBorder: "border-[#C69A59]",
    goldText: "text-[#C69A59]",
    bannerDark: "bg-[#0B0E14] text-white",
  };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.textMain} font-sans transition-colors duration-300 selection:bg-[#C69A59] selection:text-white`}>
      {/* 1. Header / Navbar */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b ${theme.headerBg} transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/landing" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-[#C69A59] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition">
              <Scissors className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-widest block font-serif leading-none">
                {storeName}
              </span>
              <span className="text-[9px] tracking-[0.25em] text-[#94A3B8] font-medium uppercase block mt-1">
                HAIR STUDIO & WELLNESS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium tracking-wide">
            <a href="#beranda" className="hover:text-[#C69A59] transition">
              Beranda
            </a>
            <a href="#tentang" className="hover:text-[#C69A59] transition">
              Tentang
            </a>
            <a href="#layanan" className="hover:text-[#C69A59] transition">
              Layanan
            </a>
            <a href="#testimoni" className="hover:text-[#C69A59] transition">
              Testimoni
            </a>
            <a href="#faq" className="hover:text-[#C69A59] transition">
              FAQ
            </a>
            <a href="#kontak" className="hover:text-[#C69A59] transition">
              Kontak
            </a>
          </nav>

          {/* Controls: Theme Switcher & Booking Button */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button (Light / Dark) */}
            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label="Toggle Dark Mode"
              className={`p-2.5 rounded-full border transition cursor-pointer flex items-center gap-1.5 ${
                darkMode
                  ? "bg-[#1E2533] border-[#2A3448] text-yellow-400 hover:bg-[#252E3F]"
                  : "bg-white border-[#E2E8F0] text-gray-700 hover:bg-[#F8FAFC]"
              }`}
              title={darkMode ? "Ganti ke Light Mode" : "Ganti ke Dark Mode"}
            >
              {darkMode ? (
                <>
                  <Sun className="w-4 h-4" />
                  <span className="text-[11px] font-semibold hidden sm:inline pr-1">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-700" />
                  <span className="text-[11px] font-semibold hidden sm:inline pr-1">Dark</span>
                </>
              )}
            </button>

            {/* Portal Kasir link */}
            <Link
              href="/"
              className={`hidden sm:inline-flex text-xs font-semibold px-3 py-2 rounded-xl border transition ${
                darkMode
                  ? "border-[#2A3448] text-[#94A3B8] hover:text-white hover:bg-[#1E2533]"
                  : "border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-white"
              }`}
            >
              Portal Kasir
            </Link>

            {/* Primary Action Button */}
            <a
              href="#booking"
              className="px-5 py-2.5 rounded-xl bg-[#C69A59] hover:bg-[#B38644] text-white text-xs font-bold tracking-wider uppercase shadow-md hover:shadow-lg transition cursor-pointer"
            >
              Booking
            </a>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section id="beranda" className={`pt-12 sm:pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Text */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#C69A59]/15 text-[#C69A59] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Premium Men's Grooming Experience</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold font-serif leading-[1.15] tracking-tight">
              Gaya Rambut Presisi &amp; Perawatan Terbaik Pria
            </h1>

            <p className={`text-sm sm:text-base ${theme.textMuted} leading-relaxed max-w-xl`}>
              Rasakan standar baru barbershop modern dengan sentuhan klasik. Nikmati potongan rambut
              presisi, perawatan rambut higienis, serta suasana studio relaksasi dari capster ahli
              kami.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="#booking"
                className="px-7 py-3.5 rounded-xl bg-[#C69A59] hover:bg-[#B38644] text-white text-xs sm:text-sm font-bold tracking-wider uppercase shadow-md transition cursor-pointer flex items-center gap-2"
              >
                <span>Booking Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <a
                href="#layanan"
                className={`px-6 py-3.5 rounded-xl border text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  darkMode
                    ? "border-[#2A3448] text-white hover:bg-[#1A2230]"
                    : "border-[#D8D2C6] text-[#1E232B] hover:bg-[#F5F2EB]"
                }`}
              >
                Lihat Paket Layanan
              </a>
            </div>
          </div>

          {/* Right Hero Image Card */}
          <div className="lg:col-span-5">
            <div className={`relative rounded-3xl overflow-hidden p-8 border ${theme.cardBg} shadow-2xl flex flex-col items-center justify-center min-h-[380px] text-center`}>
              <div className="absolute inset-0 bg-gradient-to-tr from-[#C69A59]/10 via-transparent to-[#C69A59]/5 pointer-events-none" />
              <div className="w-28 h-28 rounded-full bg-[#C69A59]/20 flex items-center justify-center text-[#C69A59] mb-6">
                <Scissors className="w-14 h-14 -rotate-45" />
              </div>
              <h3 className="font-serif text-xl font-bold">{storeName} STUDIO</h3>
              <p className={`text-xs mt-2 ${theme.textMuted} max-w-xs`}>
                Kombinasi teknik pangkas klasik &amp; gaya modern kontemporer untuk tampilan terbaik
                Anda.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-[#C69A59]">
                <Star className="w-4 h-4 fill-current" />
                <span>4.9 / 5.0 dari 15.000+ Pelanggan Puas</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Three Highlights Bar */}
        <div className={`mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 border rounded-2xl p-4 sm:p-6 ${theme.cardBg}`}>
          <div className="flex items-center gap-4 p-3">
            <div className="w-12 h-12 rounded-xl bg-[#C69A59]/15 text-[#C69A59] flex items-center justify-center shrink-0">
              <Scissors className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold">Potongan Rambut Presisi</h4>
              <p className={`text-xs ${theme.textMuted} mt-0.5`}>
                Konsultasi bentuk wajah &amp; gaya rambut ideal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 border-t md:border-t-0 md:border-l border-inherit">
            <div className="w-12 h-12 rounded-xl bg-[#C69A59]/15 text-[#C69A59] flex items-center justify-center shrink-0">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold">Perawatan &amp; Relaksasi</h4>
              <p className={`text-xs ${theme.textMuted} mt-0.5`}>
                Hair wash, hot towel shave &amp; hair tonic
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 border-t md:border-t-0 md:border-l border-inherit">
            <div className="w-12 h-12 rounded-xl bg-[#C69A59]/15 text-[#C69A59] flex items-center justify-center shrink-0">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold">Capster Berpengalaman</h4>
              <p className={`text-xs ${theme.textMuted} mt-0.5`}>
                Tenaga ahli profesional, ramah &amp; bersertifikat
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. About Section */}
      <section id="tentang" className={`py-16 sm:py-24 border-t ${theme.divider}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Visual Box */}
            <div className="lg:col-span-5 order-2 lg:order-1">
              <div className={`rounded-3xl border ${theme.cardBg} p-8 flex flex-col items-center justify-center min-h-[340px] text-center relative overflow-hidden`}>
                <div className="w-20 h-20 rounded-2xl bg-[#C69A59]/20 text-[#C69A59] flex items-center justify-center mb-4">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                <h3 className="font-serif text-lg font-bold">Higienis &amp; Steril</h3>
                <p className={`text-xs ${theme.textMuted} mt-2 max-w-xs`}>
                  Peralatan cukur disterilkan secara menyeluruh setiap sebelum dan sesudah digunakan.
                </p>
              </div>
            </div>

            {/* Story */}
            <div className="lg:col-span-7 order-1 lg:order-2 space-y-5">
              <span className="text-xs font-bold tracking-widest text-[#C69A59] uppercase block">
                TENTANG BARBERBOUS
              </span>
              <h2 className="text-2xl sm:text-4xl font-serif font-bold leading-tight">
                Sentuhan Terbaik untuk Pria Berkelas
              </h2>
              <p className={`text-sm ${theme.textMuted} leading-relaxed`}>
                Didirikan dengan visi memberikan kenyamanan potong rambut tanpa terburu-buru. Kami
                mengutamakan detail setiap helai rambut, pijatan rileks, dan produk perawatan premium
                yang ramah bagi kulit kepala Anda.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#C69A59] shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm font-medium">
                    Capster ahli dengan sertifikasi standar haircutting profesional
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#C69A59] shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm font-medium">
                    Ruangan ber-AC dingin, wangi, bersih dengan kursi cukur ergonomis
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#C69A59] shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm font-medium">
                    Fasilitas lounge &amp; kafe minuman segar selagi menunggu giliran
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Services Section */}
      <section id="layanan" className={`py-16 sm:py-24 border-t ${theme.divider}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold tracking-widest text-[#C69A59] uppercase block">
              PAKET LAYANAN
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold">
              Pilih Paket yang Pas untuk Gayamu
            </h2>
            <p className={`text-xs sm:text-sm ${theme.textMuted}`}>
              Layanan komprehensif mulai dari potongan rapi hingga perawatan lengkap dengan hot towel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mt-12">
            {packages.map((pkg, idx) => {
              const isPopular = idx === 1;
              const features = pkg.description.split(",").map((s) => s.trim());

              return (
                <div
                  key={pkg.id}
                  className={`rounded-3xl border p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative ${
                    isPopular
                      ? `${theme.cardBg} ring-2 ring-[#C69A59] shadow-xl md:-translate-y-2`
                      : `${theme.cardBg} hover:border-[#C69A59]/50 shadow-sm`
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#C69A59] text-white text-[11px] font-bold uppercase tracking-wider shadow-xs">
                      Paling Favorit
                    </div>
                  )}

                  <div>
                    {/* Header Card */}
                    <div className="flex items-center justify-between pb-4 border-b border-inherit">
                      <div>
                        <h3 className="text-lg font-bold font-serif">{pkg.name}</h3>
                        <p className={`text-xs ${theme.textMuted} mt-0.5`}>Layanan lengkap</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-[#C69A59]/15 text-[#C69A59] flex items-center justify-center">
                        <Scissors className="w-5 h-5 -rotate-45" />
                      </div>
                    </div>

                    {/* Features list */}
                    <ul className="space-y-3 py-6 text-xs">
                      {features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-[#C69A59] shrink-0" />
                          <span className={theme.textMain}>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Price & CTA */}
                  <div className="pt-4 border-t border-inherit flex items-center justify-between gap-2">
                    <div>
                      <span className={`text-[10px] ${theme.textMuted} block`}>Tarif</span>
                      <span className="text-xl font-bold font-serif tabular-nums text-[#C69A59]">
                        {formatRupiah(pkg.price)}
                      </span>
                    </div>

                    <a
                      href="#booking"
                      onClick={() => setSelectedPkgId(pkg.id)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isPopular
                          ? "bg-[#C69A59] hover:bg-[#B38644] text-white shadow-xs"
                          : darkMode
                            ? "bg-[#1E2533] hover:bg-[#252E3F] text-white border border-[#2A3448]"
                            : "bg-[#F5F2EB] hover:bg-[#EAE4D7] text-[#1E232B] border border-[#E0D9CB]"
                      }`}
                    >
                      <span>Booking</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Value Props Grid */}
      <section className={`py-16 border-t ${theme.divider}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-xl sm:text-3xl font-serif font-bold">
              Dibuat Untukmu, Dirapikan Sempurna
            </h2>
            <p className={`text-xs ${theme.textMuted} mt-2`}>
              Detail pelayanan yang membedakan kami dari barbershop konvensional.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-5 rounded-2xl border ${theme.cardBg} text-center space-y-2`}>
              <div className="w-10 h-10 mx-auto rounded-xl bg-[#C69A59]/15 text-[#C69A59] flex items-center justify-center">
                <Scissors className="w-5 h-5" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold">Potongan Custom</h4>
              <p className={`text-[11px] ${theme.textMuted}`}>Disesuaikan bentuk kepala &amp; gaya</p>
            </div>

            <div className={`p-5 rounded-2xl border ${theme.cardBg} text-center space-y-2`}>
              <div className="w-10 h-10 mx-auto rounded-xl bg-[#C69A59]/15 text-[#C69A59] flex items-center justify-center">
                <Droplets className="w-5 h-5" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold">Cukur Jenggot</h4>
              <p className={`text-[11px] ${theme.textMuted}`}>Shaving halus dengan handuk hangat</p>
            </div>

            <div className={`p-5 rounded-2xl border ${theme.cardBg} text-center space-y-2`}>
              <div className="w-10 h-10 mx-auto rounded-xl bg-[#C69A59]/15 text-[#C69A59] flex items-center justify-center">
                <Star className="w-5 h-5" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold">Barber Ahli</h4>
              <p className={`text-[11px] ${theme.textMuted}`}>Capster terpercaya &amp; teliti</p>
            </div>

            <div className={`p-5 rounded-2xl border ${theme.cardBg} text-center space-y-2`}>
              <div className="w-10 h-10 mx-auto rounded-xl bg-[#C69A59]/15 text-[#C69A59] flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold">Styling Premium</h4>
              <p className={`text-[11px] ${theme.textMuted}`}>Finishing pomade &amp; hair tonic terbaik</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Testimonials */}
      <section id="testimoni" className={`py-16 sm:py-24 border-t ${theme.divider}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold tracking-widest text-[#C69A59] uppercase block">
              TESTIMONI
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold">Ulasan Tajam, Feedback Jujur</h2>
            <p className={`text-xs ${theme.textMuted}`}>
              Kepuasan pelanggan setia adalah bukti nyata dedikasi kami.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className={`rounded-3xl border p-6 ${theme.cardBg} space-y-4`}>
              <div className="flex items-center gap-1 text-[#C69A59]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-xs sm:text-sm leading-relaxed italic">
                &ldquo;Potongannya rapi dan sesuai request. Booking online-nya gampang banget, nggak
                perlu antre lama di tempat. Recommended!&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-inherit">
                <div className="w-9 h-9 rounded-full bg-[#C69A59] text-white font-bold text-xs flex items-center justify-center">
                  I
                </div>
                <div>
                  <h5 className="text-xs font-bold">Iki Bunga</h5>
                  <p className={`text-[10px] ${theme.textMuted}`}>Member Reguler</p>
                </div>
              </div>
            </div>

            <div className={`rounded-3xl border p-6 ${theme.cardBg} space-y-4`}>
              <div className="flex items-center gap-1 text-[#C69A59]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-xs sm:text-sm leading-relaxed italic">
                &ldquo;Hot towel shave-nya bikin rileks banget setelah seharian kerja. Studionya
                bersih, wangi, dan barbernya komunikatif.&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-inherit">
                <div className="w-9 h-9 rounded-full bg-[#E59A1A] text-white font-bold text-xs flex items-center justify-center">
                  I
                </div>
                <div>
                  <h5 className="text-xs font-bold">Irfan Cafe</h5>
                  <p className={`text-[10px] ${theme.textMuted}`}>Pelanggan Setia</p>
                </div>
              </div>
            </div>

            <div className={`rounded-3xl border p-6 ${theme.cardBg} space-y-4`}>
              <div className="flex items-center gap-1 text-[#C69A59]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-xs sm:text-sm leading-relaxed italic">
                &ldquo;Sudah langganan sejak awal buka. Hasilnya selalu konsisten setiap kali datang.
                Capster Adi dan Agus sangat profesional.&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-inherit">
                <div className="w-9 h-9 rounded-full bg-[#EE3E7D] text-white font-bold text-xs flex items-center justify-center">
                  A
                </div>
                <div>
                  <h5 className="text-xs font-bold">Adit Komandan</h5>
                  <p className={`text-[10px] ${theme.textMuted}`}>Pelanggan VIP</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Stats Counter Bar */}
      <section className="py-10 bg-[#0F172A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl sm:text-4xl font-extrabold font-serif text-[#C69A59] tabular-nums">
                15K+
              </p>
              <p className="text-xs text-[#94A3B8] mt-1 font-medium">Potongan Selesai</p>
            </div>
            <div>
              <p className="text-2xl sm:text-4xl font-extrabold font-serif text-[#C69A59] tabular-nums">
                12+
              </p>
              <p className="text-xs text-[#94A3B8] mt-1 font-medium">Barber &amp; Stylist Ahli</p>
            </div>
            <div>
              <p className="text-2xl sm:text-4xl font-extrabold font-serif text-[#C69A59] tabular-nums">
                99%
              </p>
              <p className="text-xs text-[#94A3B8] mt-1 font-medium">Tingkat Kepuasan</p>
            </div>
            <div>
              <p className="text-2xl sm:text-4xl font-extrabold font-serif text-[#C69A59] tabular-nums">
                10+
              </p>
              <p className="text-xs text-[#94A3B8] mt-1 font-medium">Tahun Pengalaman</p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Interactive Booking Section (Matching Image 2 & 3 in public/ui) */}
      <section id="booking" className={`py-16 sm:py-24 border-t ${theme.divider}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-2 mb-10">
            <span className="text-xs font-bold tracking-widest text-[#C69A59] uppercase block">
              BOOKING ONLINE
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold">Booking Jadwalmu</h2>
            <p className={`text-xs sm:text-sm ${theme.textMuted}`}>
              Pilih paket, capster, dan jam favoritmu dengan mudah tanpa antre.
            </p>
          </div>

          <form onSubmit={handleBookingSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Form Steps Left Column */}
              <div className="lg:col-span-8 space-y-6">
                {bookingSuccess && (
                  <div className="p-4 rounded-2xl bg-green-500/15 border border-green-500/30 text-green-700 dark:text-green-300 text-xs sm:text-sm font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>{bookingSuccess}</span>
                  </div>
                )}

                {bookingError && (
                  <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-700 dark:text-red-300 text-xs sm:text-sm font-semibold">
                    {bookingError}
                  </div>
                )}

                {/* Step 1: Pilih Paket */}
                <div className={`rounded-3xl border p-5 sm:p-6 ${theme.cardBg} space-y-4`}>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#C69A59] text-white font-bold text-xs flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">Pilih Paket</h3>
                      <p className={`text-[11px] ${theme.textMuted}`}>Pilih satu paket layanan</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {packages.map((pkg) => {
                      const isSelected = selectedPkgId === pkg.id;
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setSelectedPkgId(pkg.id)}
                          className={`rounded-2xl border p-4 text-left transition cursor-pointer flex flex-col justify-between min-h-[110px] relative ${
                            isSelected
                              ? `border-[#C69A59] ring-2 ring-[#C69A59]/20 ${
                                  darkMode ? "bg-[#1E2533]" : "bg-[#FDFBF7]"
                                }`
                              : `${theme.cardAltBg} hover:border-[#C69A59]/40`
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-bold font-serif">{pkg.name}</span>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected ? "border-[#C69A59] bg-[#C69A59]" : "border-gray-400"
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                          <p className={`text-[10px] ${theme.textMuted} line-clamp-2 my-2`}>
                            {pkg.description}
                          </p>
                          <span className="text-xs font-bold text-[#C69A59] tabular-nums">
                            {formatRupiah(pkg.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Pilih Capster */}
                <div className={`rounded-3xl border p-5 sm:p-6 ${theme.cardBg} space-y-4`}>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#C69A59] text-white font-bold text-xs flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">Pilih Capster</h3>
                      <p className={`text-[11px] ${theme.textMuted}`}>
                        Pilih capster atau serahkan ke kami
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {capsters.map((cap) => {
                      const isSelected = selectedCapId === cap.id;
                      return (
                        <button
                          key={cap.id}
                          type="button"
                          onClick={() => setSelectedCapId(cap.id)}
                          className={`rounded-2xl border p-3.5 flex flex-col items-center justify-center gap-2 transition cursor-pointer ${
                            isSelected
                              ? `border-[#C69A59] ring-2 ring-[#C69A59]/20 ${
                                  darkMode ? "bg-[#1E2533]" : "bg-[#FDFBF7]"
                                }`
                              : `${theme.cardAltBg} hover:border-[#C69A59]/40`
                          }`}
                        >
                          <div className="w-12 h-12 rounded-full border border-inherit flex items-center justify-center font-bold text-sm bg-black/5 dark:bg-white/5">
                            {cap.name.slice(0, 1)}
                          </div>
                          <span className="text-xs font-bold">{cap.name}</span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-green-500 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Tersedia
                          </span>
                        </button>
                      );
                    })}

                    {/* Random Capster Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedCapId("RANDOM")}
                      className={`rounded-2xl border p-3.5 flex flex-col items-center justify-center gap-2 transition cursor-pointer ${
                        selectedCapId === "RANDOM"
                          ? `border-[#C69A59] ring-2 ring-[#C69A59]/20 ${
                              darkMode ? "bg-[#1E2533]" : "bg-[#FDFBF7]"
                            }`
                          : `${theme.cardAltBg} hover:border-[#C69A59]/40`
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full border border-inherit flex items-center justify-center text-[#C69A59] bg-black/5 dark:bg-white/5">
                        <Scissors className="w-5 h-5 -rotate-45" />
                      </div>
                      <span className="text-xs font-bold">Random</span>
                      <span className={`text-[10px] ${theme.textMuted}`}>Capster mana saja</span>
                    </button>
                  </div>
                </div>

                {/* Step 3: Pilih Tanggal dan Jam */}
                <div className={`rounded-3xl border p-5 sm:p-6 ${theme.cardBg} space-y-4`}>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#C69A59] text-white font-bold text-xs flex items-center justify-center shrink-0">
                      3
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">Pilih Tanggal dan Jam</h3>
                      <p className={`text-[11px] ${theme.textMuted}`}>Pilih slot waktu yang tersedia</p>
                    </div>
                  </div>

                  {/* Day Picker */}
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {datesList.map((item) => {
                      const isSelected = selectedDateYmd === item.ymd;
                      return (
                        <button
                          key={item.ymd}
                          type="button"
                          onClick={() => setSelectedDateYmd(item.ymd)}
                          className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                            isSelected
                              ? "bg-[#C69A59] border-[#C69A59] text-white shadow-xs"
                              : `${theme.cardAltBg} hover:border-[#C69A59]/40`
                          }`}
                        >
                          <span className="text-[10px] uppercase font-semibold block">
                            {item.dayName}
                          </span>
                          <span className="text-base font-extrabold block mt-0.5 tabular-nums">
                            {item.dayNum}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Time Slots */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
                    {TIME_SLOTS.map((t) => {
                      const isSelected = selectedTime === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTime(t)}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer text-center tabular-nums ${
                            isSelected
                              ? "bg-[#C69A59] border-[#C69A59] text-white shadow-xs"
                              : `${theme.cardAltBg} hover:border-[#C69A59]/40`
                          }`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 4: Data Diri */}
                <div className={`rounded-3xl border p-5 sm:p-6 ${theme.cardBg} space-y-4`}>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#C69A59] text-white font-bold text-xs flex items-center justify-center shrink-0">
                      4
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">Data Diri</h3>
                      <p className={`text-[11px] ${theme.textMuted}`}>Untuk konfirmasi booking Anda</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5">Nama Lengkap</label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Contoh: Rehan Pratama"
                        className={`w-full rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#C69A59] ${theme.inputBg}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5">Nomor WhatsApp</label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Contoh: 08123456789"
                        className={`w-full rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#C69A59] ${theme.inputBg}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5">
                      Catatan Tambahan (Opsional)
                    </label>
                    <textarea
                      rows={2}
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      placeholder="Contoh: Model french crop, kulit kepala sensitif..."
                      className={`w-full rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#C69A59] ${theme.inputBg}`}
                    />
                  </div>
                </div>
              </div>

              {/* Sticky Summary Card Right Column */}
              <div className="lg:col-span-4 lg:sticky lg:top-28">
                <div className={`rounded-3xl border p-6 ${theme.cardBg} shadow-xl space-y-5`}>
                  <h3 className="text-base font-bold font-serif pb-3 border-b border-inherit">
                    Ringkasan Booking
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className={theme.textMuted}>Paket</span>
                      <span className="font-bold">{selectedPkg.name}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={theme.textMuted}>Capster</span>
                      <span className="font-bold">{selectedCap.name}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={theme.textMuted}>Tanggal</span>
                      <span className="font-bold">{selectedDateObj.fullDateStr}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={theme.textMuted}>Jam</span>
                      <span className="font-bold tabular-nums">{selectedTime} WIB</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-inherit flex items-center justify-between">
                    <div>
                      <span className={`text-[10px] ${theme.textMuted} block`}>Total Biaya</span>
                      <span className="text-xl font-bold font-serif text-[#C69A59] tabular-nums">
                        {formatRupiah(selectedPkg.price)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#C69A59] hover:bg-[#B38644] text-white text-xs font-bold tracking-wider uppercase shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {bookingLoading ? "Memproses Booking..." : "Konfirmasi Booking"}
                  </button>

                  <p className={`text-[10px] ${theme.textMuted} text-center leading-relaxed`}>
                    Konfirmasi dikirim langsung via WhatsApp. Pembayaran dilakukan di tempat saat
                    kedatangan.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* 10. FAQ Section */}
      <section id="faq" className={`py-16 sm:py-24 border-t ${theme.divider}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left FAQ Accordion */}
            <div className="lg:col-span-8 space-y-4">
              <span className="text-xs font-bold tracking-widest text-[#C69A59] uppercase block">
                FAQ
              </span>
              <h2 className="text-2xl sm:text-4xl font-serif font-bold">
                Pertanyaan yang Sering Ditanyakan
              </h2>

              <div className="space-y-3 pt-6">
                {FAQ_ITEMS.map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl border transition overflow-hidden ${theme.cardBg}`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full p-4 sm:p-5 text-left text-xs sm:text-sm font-bold flex items-center justify-between gap-4 cursor-pointer"
                      >
                        <span>{item.question}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-[#C69A59] shrink-0 transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className={`px-4 sm:px-5 pb-5 text-xs ${theme.textMuted} leading-relaxed`}>
                          {item.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right WA Assistance Card */}
            <div className="lg:col-span-4">
              <div className={`rounded-3xl border p-6 sm:p-7 ${theme.cardBg} text-center space-y-4`}>
                <div className="w-14 h-14 mx-auto rounded-full bg-green-500/15 text-green-500 flex items-center justify-center">
                  <MessageCircle className="w-7 h-7" />
                </div>
                <h3 className="font-serif text-lg font-bold">Ada Pertanyaan Lain?</h3>
                <p className={`text-xs ${theme.textMuted}`}>
                  Konsultasikan model rambut impianmu atau tanyakan ketersediaan capster langsung ke tim
                  kami.
                </p>
                <a
                  href={`https://wa.me/${storePhone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#C69A59] hover:bg-[#B38644] text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Hubungi via WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. Final CTA Banner */}
      <section className="py-16 sm:py-20 bg-[#0F172A] text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#C69A59]/15 via-transparent to-[#C69A59]/15 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 space-y-5">
          <span className="text-xs font-bold tracking-widest text-[#C69A59] uppercase block">
            JADWALKAN SEKARANG
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold leading-tight">
            Tampil Maksimal &amp; Lebih Percaya Diri
          </h2>
          <p className="text-xs sm:text-sm text-[#94A3B8] max-w-xl mx-auto leading-relaxed">
            Rasakan pengalaman cukur rambut premium dengan pelayanan terbaik di kota Bandung.
          </p>
          <div className="pt-2">
            <a
              href="#booking"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#C69A59] hover:bg-[#B38644] text-white text-xs sm:text-sm font-bold uppercase tracking-wider shadow-lg transition cursor-pointer"
            >
              <span>Booking Jadwal Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* 12. Footer */}
      <footer id="kontak" className={`pt-16 pb-12 border-t ${theme.divider} ${darkMode ? "bg-[#0B0E14]" : "bg-[#F3EFE6]"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-inherit">
            {/* Col 1 & 2: Brand */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#C69A59] flex items-center justify-center text-white">
                  <Scissors className="w-4 h-4 -rotate-45" />
                </div>
                <span className="font-extrabold text-base tracking-widest font-serif block">
                  {storeName}
                </span>
              </div>
              <p className={`text-xs ${theme.textMuted} leading-relaxed max-w-sm`}>
                Studio pangkas rambut pria modern dan relaksasi wellness terbaik. Kenyamanan,
                kebersihan, dan presisi gaya rambut Anda adalah standar utama kami.
              </p>
            </div>

            {/* Col 3: Navigasi */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#C69A59]">Navigasi</h4>
              <ul className={`space-y-2 text-xs ${theme.textMuted}`}>
                <li>
                  <a href="#beranda" className="hover:text-[#C69A59] transition">
                    Beranda
                  </a>
                </li>
                <li>
                  <a href="#tentang" className="hover:text-[#C69A59] transition">
                    Tentang Kami
                  </a>
                </li>
                <li>
                  <a href="#layanan" className="hover:text-[#C69A59] transition">
                    Paket Layanan
                  </a>
                </li>
                <li>
                  <a href="#testimoni" className="hover:text-[#C69A59] transition">
                    Testimoni
                  </a>
                </li>
                <li>
                  <a href="#booking" className="hover:text-[#C69A59] transition">
                    Booking Online
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Info Cepat */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#C69A59]">Info Cepat</h4>
              <ul className={`space-y-2 text-xs ${theme.textMuted}`}>
                <li>Buka Setiap Hari</li>
                <li>Pukul 10.00 – 21.00 WIB</li>
                <li>Menerima Tunai, QRIS &amp; Debit</li>
                <li className="pt-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#C69A59]/40 bg-[#C69A59]/10 text-[#C69A59] hover:bg-[#C69A59] hover:text-white transition font-semibold text-xs"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Login Admin / Kasir</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 5: Kontak */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#C69A59]">Kontak Kami</h4>
              <ul className={`space-y-2.5 text-xs ${theme.textMuted}`}>
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#C69A59] shrink-0 mt-0.5" />
                  <span>{storeAddress}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#C69A59] shrink-0" />
                  <span>{storePhone}</span>
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-[#C69A59] shrink-0" />
                  <span>Instagram: @barberbous</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#94A3B8]">
            <p>© {new Date().getFullYear()} {storeName} Hair Studio &amp; Wellness. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={toggleDarkMode}
                className="hover:text-[#C69A59] transition flex items-center gap-1.5 cursor-pointer text-xs font-medium"
              >
                {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span>Mode: {darkMode ? "Dark" : "Light"}</span>
              </button>
              <span className="text-[#94A3B8]/40">|</span>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0F172A] text-white hover:bg-[#C69A59] text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-[#C69A59]" />
                <span>Login Admin</span>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
