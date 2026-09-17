"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building,
  Phone,
  HelpCircle,
  Search,
  Filter,
  Tag,
  BadgePercent,
  Check,
} from "lucide-react";
import { CDO_SERVICES_DATA, DentalServiceCategory } from "@/lib/cdo-clinic-data";
import { PublicBookingModal } from "@/components/public/public-booking-modal";

interface LiveDentalService {
  id: string;
  code?: string | null;
  category: string;
  name: string;
  description?: string | null;
  base_price: number;
  min_price?: number | null;
  max_price?: number | null;
  default_duration_minutes: number;
  is_active: boolean;
  bookable_online: boolean;
}

function formatPriceString(service: LiveDentalService): string {
  const min = service.min_price;
  const max = service.max_price;
  const base = service.base_price;

  if (min != null && max != null && min !== max) {
    return `₱${min.toLocaleString()} – ₱${max.toLocaleString()}`;
  }
  if (min != null && base != null && min < base) {
    return `₱${min.toLocaleString()} – ₱${base.toLocaleString()}`;
  }
  return `₱${base.toLocaleString()}`;
}

export default function ServicesPage() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedServiceForModal, setSelectedServiceForModal] = useState<string | undefined>();
  const [liveServices, setLiveServices] = useState<LiveDentalService[]>([]);
  const [isLoadingLiveServices, setIsLoadingLiveServices] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("all");

  // Fetch live active Master Fee Schedule from DB
  useEffect(() => {
    fetch("/api/admin/services?onlyActive=true")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.services) && data.services.length > 0) {
          setLiveServices(data.services);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch live fee schedule from API:", err);
      })
      .finally(() => {
        setIsLoadingLiveServices(false);
      });
  }, []);

  const handleBookService = (serviceId: string) => {
    setSelectedServiceForModal(serviceId);
    setIsBookingModalOpen(true);
  };

  // Harmonize static clinical disciplines with live database pricing & dynamic procedures
  const synchronizedCategories = useMemo(() => {
    if (!liveServices || liveServices.length === 0) {
      return CDO_SERVICES_DATA;
    }

    // Set of matched database service IDs to know which ones are already displayed
    const matchedDbServiceIds = new Set<string>();

    const updated = CDO_SERVICES_DATA.map((category) => {
      const updatedProcedures = category.procedures.map((proc) => {
        const cleanProcName = proc.name.toLowerCase().trim();

        // Match against live DB services
        const matched = liveServices.find((ls) => {
          const cleanDbName = ls.name.toLowerCase().trim();
          return (
            cleanDbName === cleanProcName ||
            cleanProcName.includes(cleanDbName) ||
            cleanDbName.includes(cleanProcName)
          );
        });

        if (matched) {
          matchedDbServiceIds.add(matched.id);
          return {
            ...proc,
            description: matched.description || proc.description,
            duration: `${matched.default_duration_minutes} mins`,
            priceRange: formatPriceString(matched),
            isLiveSync: true,
          };
        }

        return proc;
      });

      return {
        ...category,
        procedures: updatedProcedures,
      };
    });

    // Check if there are active database procedures added by administrators not in CDO_SERVICES_DATA
    const unlistedDbServices = liveServices.filter(
      (ls) => !matchedDbServiceIds.has(ls.id)
    );

    if (unlistedDbServices.length > 0) {
      // Group unlisted services into an "Additional Clinical Specialties" category
      const dynamicCategory: DentalServiceCategory = {
        id: "additional-clinical-services",
        title: "Additional Clinical Treatments",
        tagline: "Specialized & Advanced Chairside Procedures from Master Fee Catalog",
        iconName: "Sparkles",
        badge: "Hospital Grade Catalog",
        description:
          "Specialized restorative, diagnostic, and surgical treatments configured in the CDG Dental Clinic master fee schedule.",
        procedures: unlistedDbServices.map((s) => ({
          name: s.name,
          description:
            s.description ||
            `Standard ${s.category} treatment performed under strict hospital-grade sterilization protocols.`,
          duration: `${s.default_duration_minutes} mins`,
          priceRange: formatPriceString(s),
          benefits: [
            "Official master fee schedule rate",
            "Eligible for 20% Senior Citizen & PWD statutory discounts",
            s.bookable_online ? "Instant online reservation available" : "Clinical consultation required",
          ],
        })),
      };

      return [...updated, dynamicCategory];
    }

    return updated;
  }, [liveServices]);

  // Filter categories and procedures based on search query and category filter
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return synchronizedCategories
      .filter((cat) => {
        if (activeCategoryFilter !== "all" && cat.id !== activeCategoryFilter) {
          return false;
        }
        return true;
      })
      .map((cat) => {
        if (!q) return cat;

        const matchesCategory =
          cat.title.toLowerCase().includes(q) ||
          cat.tagline.toLowerCase().includes(q) ||
          cat.description.toLowerCase().includes(q);

        const matchingProcedures = cat.procedures.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.benefits.some((b) => b.toLowerCase().includes(q))
        );

        if (matchesCategory) {
          return cat;
        }

        if (matchingProcedures.length > 0) {
          return {
            ...cat,
            procedures: matchingProcedures,
          };
        }

        return null;
      })
      .filter((cat): cat is DentalServiceCategory => cat !== null && cat.procedures.length > 0);
  }, [synchronizedCategories, searchQuery, activeCategoryFilter]);

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950">
      {/* =========================================================================
          1. HEADER BANNER: Transparent Pricing & Live Fee Schedule Badge
      ========================================================================= */}
      <section className="bg-gradient-to-b from-teal-50/70 via-white to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 pt-12 pb-14 border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Master Fee Schedule & Standard Rates</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Comprehensive Dental Services & Pricing
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Transparent pricing, pain-free techniques, and hospital-grade sterilization. Explore our clinical disciplines across our Limketkai Downtown and Pueblo de Oro Uptown suites.
          </p>

          {/* Search & Filter Controls */}
          <div className="max-w-xl mx-auto pt-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search procedures (e.g., Cleaning, Root Canal, Braces, Whitening)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Category Chips */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              <button
                onClick={() => setActiveCategoryFilter("all")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                  activeCategoryFilter === "all"
                    ? "bg-teal-600 text-white shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                All Specialties ({synchronizedCategories.reduce((acc, c) => acc + c.procedures.length, 0)})
              </button>
              {synchronizedCategories.map((srv) => (
                <button
                  key={srv.id}
                  onClick={() => setActiveCategoryFilter(srv.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    activeCategoryFilter === srv.id
                      ? "bg-teal-600 text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {srv.title} ({srv.procedures.length})
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. SERVICES LIST SECTION
      ========================================================================= */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Search className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                No dental procedures found
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No procedures matched &ldquo;{searchQuery}&rdquo;. Try another keyword or browse all clinical specialties.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategoryFilter("all");
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            filteredCategories.map((category, index) => (
              <div
                key={category.id}
                id={category.id}
                className="scroll-mt-28 space-y-6"
              >
                {/* Category Header */}
                <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold uppercase text-teal-600 dark:text-teal-400 tracking-wider">
                        Specialty 0{index + 1} • {category.badge}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                        {category.title}
                      </h2>
                      <p className="text-sm font-semibold text-teal-700 dark:text-teal-400 mt-0.5">
                        {category.tagline}
                      </p>
                    </div>

                    <button
                      onClick={() => handleBookService(category.id)}
                      className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-500/20 transition-all flex items-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Book {category.title}</span>
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-3 leading-relaxed max-w-4xl">
                    {category.description}
                  </p>
                </div>

                {/* Procedures Detailed Grid */}
                <div className="grid md:grid-cols-2 gap-5">
                  {category.procedures.map((proc, pIdx) => (
                    <div
                      key={pIdx}
                      className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-teal-500/40 hover:shadow-lg transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-bold text-base text-slate-900 dark:text-white">
                            {proc.name}
                          </h3>
                          <span className="shrink-0 text-xs font-black text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800">
                            {proc.priceRange}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-2.5">
                          <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>Typical Duration: {proc.duration}</span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                          {proc.description}
                        </p>

                        <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Clinical Advantages & Inclusions
                          </span>
                          {proc.benefits.map((benefit, bIdx) => (
                            <div
                              key={bIdx}
                              className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>{benefit}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 pt-3.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          Limketkai & Pueblo Hubs
                        </span>
                        <button
                          onClick={() => handleBookService(category.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-teal-600 dark:hover:bg-teal-400 hover:text-white transition-colors flex items-center gap-1.5"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Reserve Slot</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* =========================================================================
          3. STATUTORY DISCOUNT & TRANSPARENCY NOTICE
      ========================================================================= */}
      <section className="py-8 bg-teal-50/50 dark:bg-teal-950/20 border-y border-teal-100 dark:border-teal-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <div className="p-2.5 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 shrink-0">
                <BadgePercent className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Philippine Statutory Healthcare Discounts Honored
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  20% Senior Citizen Discount (RA 9994) & 20% PWD Discount (RA 10754) applied at front-desk cashier upon presentation of valid ID.
                </p>
              </div>
            </div>

            <Link
              href="/auth/login"
              className="shrink-0 text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline"
            >
              Clinic Staff Portal &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. FAQ SECTION
      ========================================================================= */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Pricing Transparency & Insurance
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Frequently Asked Questions in Cagayan de Oro
            </h2>
          </div>

          <div className="space-y-4 text-left">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-teal-600" />
                Are initial consultations and diagnostic x-rays required?
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Yes, our doctors perform a thorough 15-point diagnostic check before any restorative, orthodontic, or surgical procedure to ensure no hidden infections exist. Digital x-rays are low-radiation and provide instant chairside imaging.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-teal-600" />
                What payment methods do you accept at CDG Dental?
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Both our Downtown Limketkai and Uptown Pueblo de Oro branches accept Cash, GCash QR, Major Credit/Debit Cards (Visa/Mastercard), and Online Bank Transfer (BPI, BDO, Metrobank). For major treatments (Clear Aligners and Dental Implants), flexible installment plans are available.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-teal-600" />
                What if I have dental anxiety or low pain tolerance?
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                You are in gentle hands. We use computerized local anesthesia that eliminates needle sting, topical numbing gels, and stress-free operatory suites overlooking natural views. Please inform us during your booking so we can allocate extra comfort time for your appointment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Global Booking Modal */}
      <PublicBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialServiceId={selectedServiceForModal}
      />
    </div>
  );
}
