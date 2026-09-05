"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  Globe,
  Sparkles,
  LogOut,
  Clock,
  FileText,
} from "lucide-react";
import { UserRole } from "@/types/dental";
import { createClient } from "@/lib/supabase/client";
import { clearRoleCookie } from "@/lib/supabase/get-user-role";

export function ClinicNavbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "queue";

  const {
    branches,
    activeBranch,
    setActiveBranch,
    currentRole,
    setCurrentRole,
    currentStaff,
    staffList,
    setCurrentStaff,
    isAdmin,
  } = useClinic();

  const [branchOpen, setBranchOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const branchRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (branchRef.current && !branchRef.current.contains(e.target as Node))
        setBranchOpen(false);
      if (roleRef.current && !roleRef.current.contains(e.target as Node))
        setRoleOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Dedicated Secretary Workstation Links (Option A: Direct module access)
  const secretaryNavLinks = [
    { href: "/secretary?tab=queue", tab: "queue", label: "Queue & Check-In", icon: Clock },
    { href: "/secretary?tab=patients", tab: "patients", label: "Patient Records", icon: Users },
    { href: "/secretary?tab=billing", tab: "billing", label: "Billing & POS", icon: CreditCard },
    { href: "/secretary?tab=documents", tab: "documents", label: "Documents", icon: FileText },
  ];

  // Clinical Doctor Links
  const dentistNavLinks = [
    { href: "/portal", label: "Doctor Dashboard", icon: LayoutDashboard },
    { href: "/appointments", label: "Appointments", icon: Calendar },
    { href: "/patients", label: "Patients", icon: Users },
    { href: "/billing", label: "Billing & POS", icon: CreditCard },
  ];

  // System Administrator Master Links
  const adminNavLinks = [
    { href: "/portal", label: "Doctor Portal", icon: LayoutDashboard },
    { href: "/secretary", label: "Secretary Desk", icon: UserCheck },
    { href: "/appointments", label: "Appointments", icon: Calendar },
    { href: "/patients", label: "Patients", icon: Users },
    { href: "/billing", label: "Billing & POS", icon: CreditCard },
    { href: "/admin/users", label: "Staff & Access", icon: Shield },
  ];

  const navLinks =
    currentRole === "secretary"
      ? secretaryNavLinks
      : currentRole === "dentist"
      ? dentistNavLinks
      : adminNavLinks;

  const isLinkActive = (link: { href: string; tab?: string }) => {
    if (currentRole === "secretary" && link.tab) {
      return pathname === "/secretary" && currentTab === link.tab;
    }
    return (
      pathname === link.href ||
      (link.href !== "/portal" && link.href !== "/secretary" && pathname?.startsWith(link.href))
    );
  };

  const roleConfig: Record<
    UserRole,
    { label: string; icon: React.ElementType; color: string; bg: string; glow: string }
  > = {
    dentist: {
      label: "Dentist",
      icon: Stethoscope,
      color: "text-emerald-400",
      bg: "bg-emerald-500/15 border-emerald-400/25",
      glow: "shadow-emerald-500/20",
    },
    secretary: {
      label: "Secretary",
      icon: UserCheck,
      color: "text-cyan-400",
      bg: "bg-cyan-500/15 border-cyan-400/25",
      glow: "shadow-cyan-500/20",
    },
    admin: {
      label: "Admin",
      icon: Shield,
      color: "text-violet-400",
      bg: "bg-violet-500/15 border-violet-400/25",
      glow: "shadow-violet-500/20",
    },
  };

  const role = roleConfig[currentRole as UserRole] ?? roleConfig.dentist;
  const RoleIcon = role.icon;

  const staffForRole = staffList.filter(
    (s) => s.role === currentRole || s.role === "admin"
  );

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Main bar */}
      <div className="bg-slate-950/95 backdrop-blur-xl border-b border-white/[0.06] shadow-2xl shadow-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[60px] gap-4">

            {/* ── Logo ── */}
            <Link
              href={currentRole === "secretary" ? "/secretary" : "/portal"}
              className="flex items-center gap-3 group shrink-0"
            >
              {/* Glowing tooth icon */}
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-teal-500/30 blur-md group-hover:blur-lg transition-all duration-300" />
                <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/30 group-hover:scale-105 group-hover:shadow-teal-400/50 transition-all duration-300">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white drop-shadow">
                    <path d="M12 2C9.2 2 7 4 7 7c0 2.2.6 4.5 1.2 6.5.5 1.8 1 4.5 1.5 6.5.3 1.2 1 1.5 1.5 1.5s1.2-.3 1.5-1.5c.5-2 1-4.7 1.5-6.5C14.8 11.5 15 9.2 15 7c0-3-2.2-5-3-5z" />
                    <path
                      d="M9 7.5C8 7 7.5 8 8 9c.5.8 1.5.5 2 0"
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth="0.8"
                      fill="none"
                    />
                  </svg>
                </div>
              </div>
              <div>
                <div className="text-sm font-extrabold tracking-tight text-white leading-none flex items-center gap-1.5">
                  CDG DENTAL
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-teal-400/20 text-teal-300 font-bold border border-teal-400/25 tracking-wider">
                    CLINIC
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
                  Practice Management System
                </div>
              </div>
            </Link>

            {/* ── Nav Pills ── */}
            <nav className="hidden md:flex items-center gap-0.5 bg-white/[0.04] border border-white/[0.07] rounded-2xl p-1 backdrop-blur-sm">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = isLinkActive(link);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                      isActive
                        ? "bg-teal-500/20 text-teal-300 shadow-inner shadow-teal-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute inset-0 rounded-xl ring-1 ring-teal-400/30" />
                    )}
                    <Icon
                      className={`w-3.5 h-3.5 transition-colors ${
                        isActive ? "text-teal-400" : "text-slate-500 group-hover:text-slate-300"
                      }`}
                    />
                    <span>{link.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-teal-400 rounded-full opacity-80" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* ── Controls ── */}
            <div className="flex items-center gap-2 shrink-0">

              {/* Branch Dropdown */}
              {branches.length > 0 && (
                <div className="hidden lg:block relative" ref={branchRef}>
                  <button
                    onClick={() => {
                      setBranchOpen((o) => !o);
                      setRoleOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition-all duration-200 cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="max-w-[130px] truncate">
                      {activeBranch?.name?.split("—")[1]?.trim() ??
                        activeBranch?.name ??
                        "Select Branch"}
                    </span>
                    <ChevronDown
                      className={`w-3 h-3 text-slate-500 transition-transform duration-200 ${
                        branchOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {branchOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-slate-900 border border-white/[0.08] shadow-2xl shadow-black/60 backdrop-blur-xl overflow-hidden z-50">
                      <div className="px-3 py-2 border-b border-white/[0.06]">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                          Select Branch
                        </p>
                      </div>
                      {branches.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => {
                            setActiveBranch(b);
                            setBranchOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors text-left cursor-pointer ${
                            activeBranch?.id === b.id
                              ? "bg-teal-500/15 text-teal-300"
                              : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              activeBranch?.id === b.id
                                ? "bg-teal-400"
                                : "bg-slate-600"
                            }`}
                          />
                          {b.name}
                        </button>
                      ))}
                      {isAdmin && (
                        <div className="p-2 border-t border-white/[0.06] bg-slate-950/40 space-y-1">
                          <Link
                            href="/admin/branches"
                            onClick={() => setBranchOpen(false)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 transition-colors cursor-pointer"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            <span>Manage Clinic Branches</span>
                          </Link>
                          <Link
                            href="/admin/hours"
                            onClick={() => setBranchOpen(false)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Dental Hours & Schedules</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Separator */}
              <div className="hidden lg:block h-6 w-px bg-white/10" />

              {/* Role / Staff View & Admin Switcher */}
              <div className="relative" ref={roleRef}>
                {isAdmin ? (
                  // Admin Dynamic Role Switcher Dropdown (Never locked out)
                  <button
                    onClick={() => {
                      setRoleOpen((o) => !o);
                      setBranchOpen(false);
                    }}
                    className={`flex items-center gap-2 pl-2.5 pr-3 py-2 rounded-xl border ${role.bg} ${role.glow} shadow-md text-xs font-semibold transition-all duration-200 cursor-pointer hover:brightness-125`}
                    title="Administrator Switcher: Toggle Active Role View"
                  >
                    <RoleIcon className={`w-3.5 h-3.5 shrink-0 ${role.color}`} />
                    <div className="flex flex-col items-start leading-none">
                      <span className="text-[9px] uppercase tracking-widest text-violet-400 font-bold flex items-center gap-1">
                        Admin Mode {currentRole !== "admin" && `• ${currentRole.toUpperCase()}`}
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                      </span>
                      <span className={`text-xs font-bold ${role.color} mt-0.5`}>
                        {role.label} ({currentStaff?.full_name?.split(",")[0] || currentStaff?.full_name || "Staff"})
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-3 h-3 text-slate-500 transition-transform duration-200 ml-1 ${
                        roleOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                ) : (
                  // Non-Admin: Fixed Role Badge
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${role.bg} ${role.glow} shadow-md text-xs font-semibold select-none`}
                  >
                    <RoleIcon className={`w-3.5 h-3.5 shrink-0 ${role.color}`} />
                    <div className="flex flex-col items-start leading-none">
                      <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
                        Staff Role
                      </span>
                      <span className={`text-xs font-bold ${role.color} mt-0.5`}>
                        {role.label} ({currentStaff?.full_name?.split(",")[0] || currentStaff?.full_name || "Staff"})
                      </span>
                    </div>
                  </div>
                )}

                {/* Admin switcher dropdown */}
                {roleOpen && isAdmin && (
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-slate-900 border border-white/[0.08] shadow-2xl shadow-black/60 backdrop-blur-xl overflow-hidden z-50">
                    <div className="px-3.5 py-2.5 border-b border-white/[0.06] flex items-center justify-between bg-violet-950/20">
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-violet-300 flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Role Viewport Switcher
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Toggle viewing perspectives as Admin
                        </p>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-mono font-bold">
                        ADMIN
                      </span>
                    </div>
                    {(["dentist", "secretary", "admin"] as UserRole[]).map(
                      (r) => {
                        const cfg = roleConfig[r];
                        const Ic = cfg.icon;
                        return (
                          <button
                            key={r}
                            onClick={() => {
                              setCurrentRole(r);
                              setRoleOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3.5 py-3 text-xs transition-colors cursor-pointer ${
                              currentRole === r
                                ? `bg-white/[0.06] ${cfg.color}`
                                : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center border ${cfg.bg}`}
                            >
                              <Ic className={`w-3.5 h-3.5 ${cfg.color}`} />
                            </div>
                            <div className="text-left">
                              <p className="font-bold capitalize">{r}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {r === "dentist"
                                  ? "Clinical charting & treatments"
                                  : r === "secretary"
                                  ? "Front-desk, queue & POS"
                                  : "Full system access & security"}
                              </p>
                            </div>
                            {currentRole === r && (
                              <span className={`ml-auto text-[10px] font-bold ${cfg.color}`}>
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      }
                    )}
                    <div className="border-t border-white/[0.06] p-2 space-y-1 bg-slate-950/40">
                      <Link
                        href="/admin/users"
                        onClick={() => setRoleOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-violet-300 hover:text-white bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 font-bold transition-all cursor-pointer"
                      >
                        <Shield className="w-3.5 h-3.5 text-violet-400" />
                        <span>Staff Directory & Access Control</span>
                      </Link>
                      <Link
                        href="/admin/branches"
                        onClick={() => setRoleOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-teal-300 hover:text-white bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 font-bold transition-all cursor-pointer"
                      >
                        <Building2 className="w-3.5 h-3.5 text-teal-400" />
                        <span>Clinic Branches & Facilities</span>
                      </Link>
                      <Link
                        href="/admin/hours"
                        onClick={() => setRoleOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 font-bold transition-all cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Dental Hours & Schedules</span>
                      </Link>
                      <Link
                        href="/admin/dentists"
                        onClick={() => setRoleOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 font-bold transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Dentist Directory & Content</span>
                      </Link>
                      <Link
                        href="/"
                        onClick={() => setRoleOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>View Public Website</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Dedicated Sign Out Button */}
              <button
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  clearRoleCookie();
                  window.location.href = "/auth/login";
                }}
                title="Sign Out"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 text-slate-400 hover:text-rose-300 border border-white/[0.08] hover:border-rose-500/30 text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile Nav Pills ── */}
        <div className="flex md:hidden items-center gap-1 px-4 pb-2.5 overflow-x-auto scrollbar-hide">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = isLinkActive(link);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold shrink-0 transition-all ${
                  isActive
                    ? "bg-teal-500/20 text-teal-300 ring-1 ring-teal-400/30"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Slim neon underline accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
    </header>
  );
}
