"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Sparkles,
  Calendar,
  Phone,
  Clock,
  Menu,
  X,
  Building2,
} from "lucide-react";
import { PublicBookingModal } from "./public-booking-modal";

export function PublicNavbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Dental Services", href: "/services" },
    { name: "Meet the Dentists", href: "/dentists" },
    { name: "CDO Branches", href: "/#branches" },
  ];

  return (
    <>
      {/* Top Banner: Emergency hotline & CDO locations */}
      <div className="bg-slate-900 text-slate-300 text-[11px] py-2 px-3 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-4 flex-wrap">
            <span className="inline-flex items-center gap-1 text-teal-400 font-semibold">
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>Premier Dental Clinic in CDO</span>
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-slate-400">
              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Limketkai & Pueblo de Oro</span>
            </span>
          </div>

          <div className="flex items-center justify-center gap-3 text-slate-300">
            <span className="hidden xs:inline-flex items-center gap-1 text-[10px] sm:text-[11px]">
              <Clock className="w-3 h-3 text-teal-400 shrink-0" />
              <span>Mon–Sat: 9AM – 6PM</span>
            </span>
            <span className="hidden xs:inline text-slate-700">|</span>
            <a
              href="tel:+63888501234"
              aria-label="Call clinic hotline (088) 850-1234"
              className="inline-flex items-center gap-1 font-bold text-white hover:text-teal-300 transition-colors py-0.5"
            >
              <Phone className="w-3 h-3 text-teal-400 shrink-0" />
              <span>(088) 850-1234</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Sticky Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg sm:text-xl tracking-tight bg-gradient-to-r from-slate-900 via-teal-900 to-teal-700 dark:from-white dark:via-teal-200 dark:to-teal-400 bg-clip-text text-transparent">
                  CDG DENTAL
                </span>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-1.5 py-0.5 rounded">
                  CDO
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 tracking-wide">
                Cagayan de Oro City
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Action CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Primary Book Appointment Button */}
            <button
              onClick={() => setIsBookingModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold text-sm shadow-md shadow-teal-500/25 hover:shadow-lg hover:shadow-teal-500/35 transition-all flex items-center gap-2 active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Appointment</span>
            </button>
          </div>

          {/* Mobile Menu Actions */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setIsBookingModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book</span>
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isMobileMenuOpen}
              className="p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 space-y-2 animate-in slide-in-from-top-2 duration-200 shadow-xl">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsBookingModalOpen(true);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-sm font-bold text-center flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98"
              >
                <Calendar className="w-4 h-4" />
                <span>Book Online Appointment</span>
              </button>

              <a
                href="tel:+63888501234"
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold text-center flex items-center justify-center gap-2 transition-colors hover:bg-slate-200"
              >
                <Phone className="w-3.5 h-3.5 text-teal-600" />
                <span>Call CDO Clinic: (088) 850-1234</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Global Booking Modal */}
      <PublicBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </>
  );
}
