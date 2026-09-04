"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldAlert, ArrowLeft, LogOut, ArrowRight, Home } from "lucide-react";
import { useClinic } from "@/context/clinic-context";
import { createClient } from "@/lib/supabase/client";
import { clearRoleCookie } from "@/lib/supabase/get-user-role";

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const attempted = searchParams.get("attempted") || "the requested section";
  const reason = searchParams.get("reason");
  const { currentRole } = useClinic();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearRoleCookie();
    window.location.href = "/auth/login";
  };

  const getReasonMessage = () => {
    if (reason === "dentist_blocked" || attempted.includes("/secretary")) {
      return "The Secretary portal and queue workstation are strictly restricted to Secretary and Clinic Admin accounts.";
    }
    if (reason === "billing_restricted" || attempted.includes("/billing")) {
      return "Billing & POS cash collections are reserved exclusively for Dentists and Clinic Administrators.";
    }
    if (reason === "clinical_restricted") {
      return "Patient medical charts and clinical treatment records are protected and viewable only by Dentists and Administrators.";
    }
    return "Your current role does not have the required permissions to access this clinical or administrative route.";
  };

  const homeHref = currentRole === "secretary" ? "/secretary" : "/portal";

  return (
    <div className="min-h-screen bg-[#070d12] text-slate-100 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Dynamic ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[30%] w-[500px] h-[500px] rounded-full bg-rose-600/10 blur-[150px]" />
        <div className="absolute bottom-[20%] right-[30%] w-[500px] h-[500px] rounded-full bg-teal-600/5 blur-[150px]" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/90 border border-white/[0.08] shadow-2xl shadow-black/80 backdrop-blur-2xl text-center">
          {/* Glowing Shield Icon */}
          <div className="relative mx-auto w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-2xl bg-rose-500/25 blur-xl animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-rose-500/15 text-rose-300 border border-rose-500/30 mb-3">
            Access Restricted (403)
          </span>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            Permission Denied
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed max-w-md mx-auto">
            {getReasonMessage()}
          </p>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-8 text-left">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-500">Attempted Route:</span>
              <code className="text-rose-300 font-mono font-medium">{attempted}</code>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Your Active Role:</span>
              <span className="font-bold text-teal-300 capitalize">{currentRole}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href={homeHref}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-teal-400 via-teal-300 to-cyan-400 hover:opacity-95 shadow-lg shadow-teal-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </Link>

            <button
              onClick={handleSignOut}
              className="w-full sm:w-auto py-3 px-4 rounded-xl font-semibold text-xs text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
            <p className="text-[11px] text-slate-500">
              Need role elevation? Contact the CDG Dental Clinic System Administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070d12] flex items-center justify-center text-slate-500 text-xs">Loading...</div>}>
      <UnauthorizedContent />
    </Suspense>
  );
}
