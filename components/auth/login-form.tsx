"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizeRole, setRoleCookie } from "@/lib/supabase/get-user-role";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Stethoscope,
  UserCheck,
  Shield,
  Info,
} from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect");
  const reason = searchParams.get("reason");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInErr) throw signInErr;

      const user = data.user;
      if (!user) throw new Error("No user returned after sign in.");

      // Query profile to determine user role
      let userRole: "dentist" | "secretary" | "admin" = "dentist";

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .or(`auth_id.eq.${user.id},id.eq.${user.id}`)
        .maybeSingle();

      if (profile?.role) {
        userRole = normalizeRole(profile.role);
      }

      // Set cookie for middleware access
      setRoleCookie(userRole);

      // Determine destination
      if (redirectTarget) {
        // Validate if user has permission for the redirect target
        const isSecretaryTarget = redirectTarget.startsWith("/secretary");
        const isClinicalTarget =
          redirectTarget.startsWith("/patients") ||
          redirectTarget.startsWith("/appointments") ||
          redirectTarget.startsWith("/billing");

        if (isSecretaryTarget && userRole === "dentist") {
          router.push("/portal");
          return;
        }
        if (isClinicalTarget && userRole === "secretary") {
          router.push("/secretary");
          return;
        }

        router.push(redirectTarget);
        return;
      }

      // Default role destinations
      if (userRole === "secretary") {
        router.push("/secretary");
      } else {
        router.push("/portal");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid email or password. Please verify your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Card Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            Staff Security Gateway
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Sign in to Portal
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Access clinical charts, secretary appointments, and clinic operations.
        </p>
      </div>

      {/* Reason banners if redirected */}
      {reason === "invite_only" && (
        <div className="mb-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-amber-300 text-xs leading-relaxed">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            Staff registration is by administrator invitation only. If you received an invite link, please use the exact link sent to your email.
          </span>
        </div>
      )}

      {/* Form Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/[0.08] shadow-2xl shadow-black/60 backdrop-blur-2xl">
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Error message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Email field */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-slate-300 tracking-wide"
            >
              Clinic Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@cdgdental.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-100 placeholder:text-slate-600 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400/50 transition-all"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-300 tracking-wide"
              >
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-teal-400/90 hover:text-teal-300 hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-100 placeholder:text-slate-600 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400/50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-teal-400 via-teal-300 to-cyan-400 hover:opacity-95 shadow-lg shadow-teal-500/25 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Role Access Indicator Chips */}
        <div className="mt-6 pt-5 border-t border-white/[0.06]">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2.5">
            Role Gateways
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
              <Stethoscope className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-slate-300">Dentist</div>
              <div className="text-[9px] text-slate-500">Charts & Rx</div>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
              <UserCheck className="w-3.5 h-3.5 text-cyan-400 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-slate-300">Secretary</div>
              <div className="text-[9px] text-slate-500">Queue & Intake</div>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
              <Shield className="w-3.5 h-3.5 text-violet-400 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-slate-300">Admin</div>
              <div className="text-[9px] text-slate-500">Full Control</div>
            </div>
          </div>
        </div>
      </div>

      {/* Staff invite notice */}
      <div className="mt-6 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-center">
        <p className="text-xs text-slate-400">
          Need a new staff account?{" "}
          <span className="text-slate-300 font-medium">
            Contact your clinic administrator to send an official invitation.
          </span>
        </p>
      </div>
    </div>
  );
}
