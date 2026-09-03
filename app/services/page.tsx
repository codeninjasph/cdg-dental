"use client";

import { useState } from "react";
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
} from "lucide-react";
import { CDO_SERVICES_DATA } from "@/lib/cdo-clinic-data";
import { PublicBookingModal } from "@/components/public/public-booking-modal";

export default function ServicesPage() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedServiceForModal, setSelectedServiceForModal] = useState<string | undefined>();

  const handleBookService = (serviceId: string) => {
    setSelectedServiceForModal(serviceId);
    setIsBookingModalOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950">
      {/* Header Banner */}
      <section className="bg-gradient-to-b from-teal-50/70 via-white to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 pt-12 pb-16 border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 px-3.5 py-1 rounded-full inline-block">
            5 Core Clinical Specialties in CDO
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Comprehensive Dental Services & Pricing
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Transparent pricing, pain-free techniques, and hospital-grade sterilization. Explore our comprehensive clinical disciplines across our Limketkai Downtown and Pueblo de Oro Uptown suites.
          </p>

          {/* Quick Anchor Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
            {CDO_SERVICES_DATA.map((srv) => (
              <a
                key={srv.id}
                href={`#${srv.id}`}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-teal-500 hover:text-teal-600 transition-colors shadow-2xs"
              >
                {srv.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Services List Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
          {CDO_SERVICES_DATA.map((category, index) => (
            <div
              key={category.id}
              id={category.id}
              className="scroll-mt-28 space-y-8"
            >
              {/* Category Header */}
              <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-teal-600 dark:text-teal-400 tracking-wider">
                      Specialty 0{index + 1}
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
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-500/20 transition-all flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Book {category.title}</span>
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-4 leading-relaxed max-w-4xl">
                  {category.description}
                </p>
              </div>

              {/* Procedures Detailed Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                {category.procedures.map((proc, pIdx) => (
                  <div
                    key={pIdx}
                    className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-teal-500/40 hover:shadow-lg transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                          {proc.name}
                        </h3>
                        <span className="shrink-0 text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800">
                          {proc.priceRange}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-3">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        <span>Typical Duration: {proc.duration}</span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                        {proc.description}
                      </p>

                      <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Clinical Advantages
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

                    <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        Available at Limketkai & Pueblo Hubs
                      </span>
                      <button
                        onClick={() => handleBookService(category.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-teal-600 dark:hover:bg-teal-400 hover:text-white transition-colors"
                      >
                        Book Procedure
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ & Transparency Section */}
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
