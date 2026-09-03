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
  ShieldCheck,
  Building2,
  Lock,
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
      <div className="bg-slate-900 text-slate-300 text-[11px] py-1.5 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-teal-400 font-semibold">
              <Sparkles className="w-3 h-3" />
              Cagayan de Oro&apos;s Premier Dental Clinic
            </span>
            <span className="hidden md:inline text-slate-500">•</span>
            <span className="hidden md:flex items-center gap-1 text-slate-400">
              <Building2 className="w-3 h-3 text-slate-400" />
              Limketkai Downtown & Pueblo de Oro Uptown
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-teal-400" />
              Mon–Sat: 9AM – 6PM
            </span>
            <span className="text-slate-600">|</span>
            <a
              href="tel:+63888501234"
              className="flex items-center gap-1 font-bold text-white hover:text-teal-300 transition-colors"
            >
              <Phone className="w-3 h-3 text-teal-400" />
              (088) 850-1234
            </a>
          </div>
        </div>
      </div>

      {/* Main Sticky Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl tracking-tight bg-gradient-to-r from-slate-900 via-teal-900 to-teal-700 dark:from-white dark:via-teal-200 dark:to-teal-400 bg-clip-text text-transparent">
                  CDG DENTAL
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-1.5 py-0.5 rounded">
                  CDO
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 tracking-wide">
                Cagayan de Oro City
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
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
            {/* Staff Practice Portal Link */}
            <Link
              href="/portal"
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:border-slate-300 transition-colors flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Staff Portal
            </Link>

            {/* Primary Book Appointment Button */}
            <button
              onClick={() => setIsBookingModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold text-sm shadow-md shadow-teal-500/25 hover:shadow-lg hover:shadow-teal-500/35 transition-all flex items-center gap-2 active:scale-95"
            >
              <Calendar className="w-4 h-4" />
              Book Appointment
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setIsBookingModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-bold"
            >
              Book
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950"
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsBookingModalOpen(true);
                }}
                className="w-full py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold text-center flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Book Online Appointment
              </button>
              <Link
                href="/portal"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-center text-slate-600 dark:text-slate-400"
              >
                Staff Clinical Portal
              </Link>
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
