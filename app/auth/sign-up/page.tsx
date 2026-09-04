"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/sign-up-form";
import { ShieldAlert, ArrowLeft, MailCheck, Lock } from "lucide-react";

function SignUpContent() {
  const searchParams = useSearchParams();
  const hasToken =
    searchParams.has("token") ||
    searchParams.has("code") ||
    searchParams.has("access_token") ||
    searchParams.get("type") === "invite";

  if (!hasToken) {
    return (
      <div className="w-full p-8 rounded-3xl bg-white/95 border border-slate-200/90 shadow-2xl shadow-slate-300/40 backdrop-blur-xl text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
          <Lock className="w-7 h-7" />
        </div>

        <div>
          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-800 border border-amber-200 mb-2">
            Restricted Registration
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Invitation Required
          </h2>
          <p className="text-xs text-slate-600 mt-2.5 max-w-sm mx-auto leading-relaxed">
            Staff practitioner accounts for CDG Dental Clinic cannot be registered publicly. Accounts are provisioned exclusively through invitations sent by the clinic administrator via Supabase.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left text-xs text-slate-600 space-y-2">
          <div className="flex items-start gap-2 text-slate-800 font-semibold">
            <MailCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <span>Check your work email for your official invitation link.</span>
          </div>
          <p className="text-[11px] text-slate-500 pl-6">
            Clicking the activation link in your email will allow you to complete your credentials and role profile setup.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/auth/login"
            className="w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-600/25 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Staff Login</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Complete Staff Registration
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Set up your practitioner password to activate your clinic profile.
        </p>
      </div>
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xl">
        <SignUpForm />
      </div>
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
