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
    if (reason === "admin_restricted") {
      return "Administrative user management and practice configuration are restricted exclusively to Clinic Administrators.";
    }
    return "Your current role does not have the required permissions to access this clinical or administrative route.";
  };

  const homeHref = currentRole === "secretary" ? "/secretary" : "/portal";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50/20 to-teal-50/20 text-slate-900 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Dynamic ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[30%] w-[500px] h-[500px] rounded-full bg-rose-200/40 blur-[150px]" />
        <div className="absolute bottom-[20%] right-[30%] w-[500px] h-[500px] rounded-full bg-teal-200/30 blur-[150px]" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        <div className="p-8 sm:p-10 rounded-3xl bg-white/95 border border-slate-200/90 shadow-2xl shadow-slate-300/50 backdrop-blur-xl text-center">
          {/* Glowing Shield Icon */}
          <div className="relative mx-auto w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-2xl bg-rose-500/15 blur-lg animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
              <ShieldAlert className="w-8 h-8" />
            </div>
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-100 text-rose-800 border border-rose-200 mb-3">
            Access Restricted (403)
          </span>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
            Permission Denied
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed max-w-md mx-auto">
            {getReasonMessage()}
          </p>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 mb-8 text-left">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-500">Attempted Route:</span>
              <code className="text-rose-700 font-mono font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">{attempted}</code>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Your Active Role:</span>
              <span className="font-extrabold text-teal-800 capitalize bg-teal-50 px-2 py-0.5 rounded border border-teal-200">{currentRole}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href={homeHref}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </Link>

            <button
              onClick={handleSignOut}
              className="w-full sm:w-auto py-3 px-4 rounded-xl font-bold text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
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
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-xs">Loading...</div>}>
      <UnauthorizedContent />
    </Suspense>
  );
}
