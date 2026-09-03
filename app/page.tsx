"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  Star,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Building2,
  Clock,
  Phone,
  Smile,
  ChevronRight,
  Zap,
  Activity,
  Heart,
  Stethoscope,
} from "lucide-react";
import {
  CDO_BRANCHES_DATA,
  CDO_DENTISTS_DATA,
  CDO_SERVICES_DATA,
  CDO_PATIENT_REVIEWS,
} from "@/lib/cdo-clinic-data";
import { PublicBookingModal } from "@/components/public/public-booking-modal";

export default function HomePage() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedServiceForModal, setSelectedServiceForModal] = useState<string | undefined>();
  const [selectedDentistForModal, setSelectedDentistForModal] = useState<string | undefined>();
  const [quickBranchId, setQuickBranchId] = useState(CDO_BRANCHES_DATA[0].id);
  const [quickServiceId, setQuickServiceId] = useState(CDO_SERVICES_DATA[0].id);

  const handleOpenBooking = (serviceId?: string, dentistId?: string) => {
    setSelectedServiceForModal(serviceId);
    setSelectedDentistForModal(dentistId);
    setIsBookingModalOpen(true);
  };

  const handleQuickBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedServiceForModal(quickServiceId);
    setIsBookingModalOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* =========================================================================
          1. HERO SECTION: Catchy, Luxury, and Professional
      ========================================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/60 via-white to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pt-10 pb-20 lg:pt-16 lg:pb-28">
        {/* Subtle Background Glows */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-400/10 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-cyan-400/10 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Hero Left Column: Narrative & Action */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Regional Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100/80 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-bold tracking-wide shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Premier Dental Medicine in Cagayan de Oro City</span>
              </div>

              {/* Catchy Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.12]">
                Artistry in Every Smile.{" "}
                <span className="bg-gradient-to-r from-teal-600 to-cyan-500 bg-clip-text text-transparent">
                  World-Class Dental Care
                </span>{" "}
                in CDO.
              </h1>

              {/* Subheadline */}
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl font-normal">
                Experience compassionate, hospital-grade dental care right here in Northern Mindanao. From routine pain-free cleanings to transformative porcelain veneers and dental implants, we make your visit comfortable, transparent, and precise.
              </p>

              {/* Primary Call to Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => handleOpenBooking()}
                  className="px-7 py-4 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold text-base shadow-xl shadow-teal-500/25 hover:shadow-2xl hover:shadow-teal-500/35 transition-all flex items-center gap-3 active:scale-98 group"
                >
                  <Calendar className="w-5 h-5 text-teal-200 group-hover:scale-110 transition-transform" />
                  <span>Book Online Appointment</span>
                  <ArrowRight className="w-4 h-4 text-white/80 group-hover:translate-x-1 transition-transform" />
                </button>

                <Link
                  href="/services"
                  className="px-6 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 font-bold text-base hover:text-teal-600 dark:hover:text-teal-400 transition-all flex items-center gap-2"
                >
                  <span>Explore Our 5 Specialties</span>
                </Link>
              </div>

              {/* Trust Badges Grid */}
              <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    PRC Specialists
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Pain-Free Tech
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 shrink-0 fill-amber-400" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    4.9★ in CDO
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Hospital Sterile
                  </span>
                </div>
              </div>
            </div>

            {/* Hero Right Column: Studio Operatory Imagery with Floating Cards */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 group">
                <img
                  src="/images/hero-clinic.jpg"
                  alt="CDG Dental Clinic Cagayan de Oro Luxury Operatory"
                  className="w-full h-[420px] sm:h-[480px] object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                {/* Bottom Overlay Label */}
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/20 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 block">
                        Cagayan de Oro Dental Suites
                      </span>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        Downtown Limketkai & Uptown Pueblo
                      </h4>
                    </div>
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating Live Badge */}
              <div className="absolute -top-4 -left-4 hidden sm:flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-xl">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-black text-sm">
                  100%
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Zero Booking Conflicts
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Postgres Double-Booking Engine
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. QUICK BOOKING BAR (Instant CDO Scheduling)
      ========================================================================= */}
      <section className="relative z-20 -mt-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
          <form onSubmit={handleQuickBookSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                Choose CDO Branch
              </label>
              <select
                value={quickBranchId}
                onChange={(e) => setQuickBranchId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {CDO_BRANCHES_DATA.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.shortName}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                Choose Treatment Specialty
              </label>
              <select
                value={quickServiceId}
                onChange={(e) => setQuickServiceId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {CDO_SERVICES_DATA.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} — {s.badge}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3 pt-2 sm:pt-4">
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Find Available Slot
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* =========================================================================
          3. 5 CORE DENTAL SPECIALTIES PREVIEW
      ========================================================================= */}
      <section className="py-20 bg-slate-50/70 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 px-3 py-1 rounded-full">
              Comprehensive Clinical Disciplines
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-3 tracking-tight">
              Specialized Dental Medicine for Every Need
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              From preventative family hygiene to full cosmetic smile design and surgical periodontics, our Cagayan de Oro clinic provides comprehensive care under one roof.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CDO_SERVICES_DATA.map((service) => (
              <div
                key={service.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:border-teal-500/60 transition-all hover:shadow-xl group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      {service.badge}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {service.procedures.length} Procedures
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-xs text-teal-700 dark:text-teal-400 font-medium mt-1">
                    {service.tagline}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-3 leading-relaxed">
                    {service.description}
                  </p>

                  {/* Highlights list */}
                  <div className="mt-4 space-y-1.5">
                    {service.procedures.slice(0, 3).map((proc, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                        <span className="truncate">{proc.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Link
                    href={`/services#${service.id}`}
                    className="text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1 group-hover:translate-x-1 transition-all"
                  >
                    <span>View Pricing & Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => handleOpenBooking(service.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-teal-600 dark:hover:bg-teal-400 hover:text-white transition-colors"
                  >
                    Book
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold hover:bg-teal-100 transition-colors"
            >
              <span>Explore Full Clinical Catalog with Pricing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. ADVANCED TECHNOLOGY & STERILITY SHOWCASE
      ========================================================================= */}
      <section className="py-20 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 px-3 py-1 rounded-full">
                Precision & Patient Safety
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Modern Digital Dentistry Built Around Your Comfort
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                We have eliminated the cold, intimidating dental visits of the past. Our Cagayan de Oro clinic invests in digital diagnostic scanners, computerized pain-free anesthesia, and class-B vacuum autoclaves to protect your health.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-600 flex items-center justify-center shrink-0 font-bold">
                    3D
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                      3D Digital Intraoral Scanning
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Say goodbye to gagging on gooey dental impression putty. Our digital wand captures 6,000 photos per second to create a precision 3D color model of your teeth in under 90 seconds.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="w-9 h-9 rounded-lg bg-cyan-100 dark:bg-cyan-950 text-cyan-600 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                      Gentle Computerized Local Anesthesia
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Controlled micro-flow anesthetic delivery numbs solely the target tooth without the painful pressure sting or heavy face numbness.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                      Hospital-Grade Class-B Vacuum Autoclaves
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      100% biological sterilization monitoring on every instrument pouch, guaranteeing hospital surgical-theatre standards for your family.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Doctor team preview */}
            <div className="lg:col-span-6 bg-gradient-to-tr from-teal-500/10 via-cyan-500/10 to-transparent p-6 sm:p-8 rounded-3xl border border-teal-200/50 dark:border-teal-900/50 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider block">
                    Our Attending Specialists
                  </span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    Meet the CDO Dental Team
                  </h3>
                </div>
                <Link
                  href="/dentists"
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1"
                >
                  <span>View All Profiles</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {CDO_DENTISTS_DATA.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-center hover:border-teal-500/50 transition-all flex flex-col items-center"
                  >
                    <img
                      src={doctor.photoUrl}
                      alt={doctor.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-teal-500/30 shadow-md mb-2.5"
                    />
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                      {doctor.name.split(",")[0]}
                    </h4>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium line-clamp-1 mt-0.5">
                      {doctor.specialty.split("&")[0]}
                    </span>
                    <button
                      onClick={() => handleOpenBooking(undefined, doctor.id)}
                      className="mt-3 px-3 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-[10px] font-bold hover:bg-teal-100 transition-colors w-full"
                    >
                      Book Visit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. KAGAY-ANON PATIENT REVIEWS & TRANSFORMATIONS
      ========================================================================= */}
      <section className="py-20 bg-slate-50/80 dark:bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 px-3 py-1 rounded-full">
              Kagay-anon Stories
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-3 tracking-tight">
              Trusted by Over 1,200 Smiles in CDO
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Read verified feedback from patients across Downtown Lapasan, Uptown Pueblo de Oro, Nazareth, and Northern Mindanao.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {CDO_PATIENT_REVIEWS.map((review, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1 mb-3 text-amber-400">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed">
                    &ldquo;{review.quote}&rdquo;
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {review.name}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-teal-500" />
                      {review.location}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-teal-600 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded">
                    {review.service.split("&")[0]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. BOTTOM CALL TO ACTION
      ========================================================================= */}
      <section className="py-16 bg-gradient-to-r from-teal-600 via-teal-700 to-cyan-600 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3.5 py-1 rounded-full text-white inline-block">
            Start Your Smile Journey Today
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Ready for a Healthier, Confident Smile in Cagayan de Oro?
          </h2>
          <p className="text-sm text-teal-100 max-w-xl mx-auto leading-relaxed">
            Reserve your appointment in less than 2 minutes. Transparent pricing, zero double-booking, and compassionate dental care.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => handleOpenBooking()}
              className="px-8 py-4 rounded-2xl bg-white text-teal-800 hover:bg-slate-100 font-bold text-sm shadow-xl transition-all flex items-center gap-2 active:scale-95"
            >
              <Calendar className="w-4 h-4 text-teal-600" />
              <span>Book Online Appointment</span>
            </button>
            <a
              href="tel:+63888501234"
              className="px-6 py-4 rounded-2xl bg-teal-900/60 hover:bg-teal-900/80 border border-white/20 text-white font-bold text-sm transition-all flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              <span>Call CDO: (088) 850-1234</span>
            </a>
          </div>
        </div>
      </section>

      {/* Global Public Booking Wizard */}
      <PublicBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialServiceId={selectedServiceForModal}
        initialDentistId={selectedDentistForModal}
      />
    </div>
  );
}
