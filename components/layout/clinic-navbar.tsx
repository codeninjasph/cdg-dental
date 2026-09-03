"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClinic } from "@/context/clinic-context";
import {
  Calendar,
  Users,
  CreditCard,
  LayoutDashboard,
  Building2,
  UserCheck,
  Shield,
  Stethoscope,
  ChevronDown,
} from "lucide-react";
import { UserRole } from "@/types/dental";

export function ClinicNavbar() {
  const pathname = usePathname();
  const {
    branches,
    activeBranch,
    setActiveBranch,
    currentRole,
    setCurrentRole,
    currentStaff,
    staffList,
    setCurrentStaff,
  } = useClinic();

  const navLinks = [
    { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
    { href: "/appointments", label: "Appointments", icon: Calendar },
    { href: "/patients", label: "Patients CRM", icon: Users },
    { href: "/billing", label: "Billing & POS", icon: CreditCard },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Clinic Brand */}
          <div className="flex items-center gap-6">
            <Link href="/portal" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
                {/* Stylized Tooth SVG */}
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M12 2C8.5 2 7 4.5 7 7c0 2 .5 4 1 6 .5 2 1 5 1.5 7 .5 1.5 2 2 2.5 0 .5-2 1-5 1.5-7 .5-2 1-4 1-6 0-2.5-1.5-5-5-5z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  CDG DENTAL
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-semibold border border-teal-200 dark:border-teal-800">
                    CLINIC
                  </span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Practice Management System
                </span>
              </div>
            </Link>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Controls: Branch Selector & Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Branch Selector */}
            {branches.length > 0 && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <select
                  aria-label="Select Clinic Branch"
                  value={activeBranch?.id || ""}
                  onChange={(e) => {
                    const found = branches.find((b) => b.id === e.target.value);
                    if (found) setActiveBranch(found);
                  }}
                  className="bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-none cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} className="dark:bg-slate-900">
                      {b.name.split("—")[1]?.trim() || b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Active Role Selector (Simulated RBAC switcher for live demo) */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-xs">
              {currentRole === "dentist" ? (
                <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
              ) : currentRole === "secretary" ? (
                <UserCheck className="w-3.5 h-3.5 text-cyan-600" />
              ) : (
                <Shield className="w-3.5 h-3.5 text-purple-600" />
              )}
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-bold text-teal-800 dark:text-teal-300">
                  Role View:
                </span>
                <select
                  aria-label="Active Staff Role View"
                  value={currentRole}
                  onChange={(e) => setCurrentRole(e.target.value as UserRole)}
                  className="bg-transparent font-bold text-slate-900 dark:text-slate-100 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="dentist" className="dark:bg-slate-900">
                    Dentist (Dr. Kenneth Galve)
                  </option>
                  <option value="secretary" className="dark:bg-slate-900">
                    Secretary (Maria Santos)
                  </option>
                  <option value="admin" className="dark:bg-slate-900">
                    Administrator
                  </option>
                </select>
              </div>

              {/* Public Website Button */}
              <Link
                href="/"
                className="hidden lg:flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 px-2.5 py-1.5 rounded-lg hover:bg-teal-100 transition-colors"
              >
                <span>← Public Site</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800 overflow-x-auto gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 ${
                  isActive
                    ? "bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-semibold"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
