"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/sign-up-form";
import { ShieldAlert, ArrowLeft, MailCheck, Lock } from "lucide-react";

function SignUpContent() {
  const searchParams = useSearchParams();
  // Check for common Supabase invite / recovery token parameters
  const hasToken =
    searchParams.has("token") ||
    searchParams.has("code") ||
    searchParams.has("access_token") ||
    searchParams.get("type") === "invite";

  if (!hasToken) {
    return (
      <div className="w-full p-8 rounded-3xl bg-slate-900/90 border border-white/[0.08] shadow-2xl shadow-black/60 backdrop-blur-2xl text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <Lock className="w-7 h-7" />
        </div>

        <div>
          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-2">
            Restricted Registration
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Invitation Required
          </h2>
          <p className="text-xs text-slate-400 mt-2.5 max-w-sm mx-auto leading-relaxed">
            Staff practitioner accounts for CDG Dental Clinic cannot be registered publicly. Accounts are provisioned exclusively through invitations sent by the clinic administrator via Supabase.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-left text-xs text-slate-400 space-y-2">
          <div className="flex items-start gap-2 text-slate-300">
            <MailCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <span>Check your work email for your official invitation link.</span>
          </div>
          <p className="text-[11px] text-slate-500 pl-6">
            Clicking the activation link in your email will allow you to complete your credentials and role profile setup.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/auth/login"
            className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-teal-400 via-teal-300 to-cyan-400 hover:opacity-95 shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Staff Login</span>
          </Link>
        </div>
      </div>
    );
  }

  // If invited token exists, render the registration form inside AuthShell
  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Complete Staff Registration
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Set up your practitioner password to activate your clinic profile.
        </p>
      </div>
      <SignUpForm />
    </div>
  );
}

export default function SignUpPage() {
  return (
    <AuthShell
      title="Staff Registration"
      subtitle="Invitation-only practitioner gateway."
    >
      <Suspense fallback={<div className="text-slate-500 text-xs text-center py-10">Checking invitation...</div>}>
        <SignUpContent />
      </Suspense>
    </AuthShell>
  );
}
