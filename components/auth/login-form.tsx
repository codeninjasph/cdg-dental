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
  Building2,
  Sparkles,
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
        .or(`id.eq.${user.id}`)
        .maybeSingle();

      if (profile?.role) {
        userRole = normalizeRole(profile.role);
      }

      if (
        user.email === "admin@gmail.com" ||
        user.id === "00000000-0000-0000-0000-000000000030" ||
        (user.user_metadata?.role as string) === "admin"
      ) {
        userRole = "admin";
      }

      // Set cookie for middleware access
      setRoleCookie(userRole);

      // Determine destination
      if (redirectTarget) {
        const isSecretaryTarget = redirectTarget.startsWith("/secretary");
        const isClinicalTarget =
          redirectTarget.startsWith("/patients") ||
          redirectTarget.startsWith("/appointments") ||
          redirectTarget.startsWith("/billing");

        if (isSecretaryTarget && userRole === "dentist") {
          router.push("/portal");
          return;
        }
        if ((isClinicalTarget || redirectTarget.startsWith("/portal")) && userRole === "secretary") {
          router.push("/secretary");
          return;
        }

        router.push(redirectTarget);
        return;
      }

      // Default role destinations
      if (userRole === "secretary") {
        router.push("/secretary");
      } else if (userRole === "admin") {
        router.push("/admin/users");
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
      {/* Dental Clinic Header Badge */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />
            CDG Dental Practitioner Gateway
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
            <Building2 className="w-3 h-3 text-teal-600" />
            CDO Operatory
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Practitioner Sign In
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Access electronic dental records (EDR), chairside odontograms, and front-desk schedule.
        </p>
      </div>

      {/* Reason banners if redirected */}
      {reason === "invite_only" && (
        <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-800 text-xs leading-relaxed">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Staff registration is by administrator invitation only. If you received an invite link, please use the exact link sent to your email.
          </span>
        </div>
      )}

      {/* Crisp White Glassmorphic Form Card */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-white/95 border border-slate-200/90 shadow-2xl shadow-slate-300/40 backdrop-blur-xl overflow-hidden">
        {/* Subtle decorative tooth watermark */}
        <div className="absolute -top-6 -right-6 w-36 h-36 opacity-[0.03] pointer-events-none text-teal-800">
          <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
            <path d="M12 2C9.2 2 7 4 7 7c0 2.2.6 4.5 1.2 6.5.5 1.8 1 4.5 1.5 6.5.3 1.2 1 1.5 1.5 1.5s1.2-.3 1.5-1.5c.5-2 1-4.7 1.5-6.5C14.8 11.5 15 9.2 15 7c0-3-2.2-5-3-5z" />
          </svg>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
          {/* Error message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Email field */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-bold text-slate-700 tracking-wide"
            >
              Clinic Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@cdgdental.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-700 tracking-wide"
              >
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
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
              className="w-full py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-600/25 hover:shadow-xl hover:shadow-teal-600/35 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Authenticating Practitioner...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Clinical Suite</span>
                  <ArrowRight className="w-4 h-4 text-white/90" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Clinical Role Gateways Matrix & 1-Click Quick Fill */}
        <div className="mt-6 pt-5 border-t border-slate-100 relative z-10">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Authorized Scopes (Click to Auto-Fill)
            </p>
            <span className="text-[9px] text-teal-700 font-bold">1-Click Demo</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail("dentist@cdgdental.com");
                setPassword("dentist123");
              }}
              className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-center hover:bg-emerald-100/70 active:scale-[0.98] transition-all cursor-pointer group"
              title="Auto-fill Dentist Credentials"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto mb-1 text-emerald-700 group-hover:scale-105 transition-transform">
                <Stethoscope className="w-3.5 h-3.5" />
              </div>
              <div className="text-[10px] font-bold text-slate-800">Dentist</div>
              <div className="text-[9px] text-emerald-700 font-medium">Quick Fill</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail("secretary@cdgdental.com");
                setPassword("secretary123");
              }}
              className="p-2.5 rounded-xl bg-cyan-50/70 border border-cyan-100 text-center hover:bg-cyan-100/70 active:scale-[0.98] transition-all cursor-pointer group"
              title="Auto-fill Secretary Credentials"
            >
              <div className="w-7 h-7 rounded-lg bg-cyan-100 border border-cyan-200 flex items-center justify-center mx-auto mb-1 text-cyan-700 group-hover:scale-105 transition-transform">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <div className="text-[10px] font-bold text-slate-800">Secretary</div>
              <div className="text-[9px] text-cyan-700 font-medium">Quick Fill</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail("admin@gmail.com");
                setPassword("admin123");
              }}
              className="p-2.5 rounded-xl bg-violet-50/70 border border-violet-100 text-center hover:bg-violet-100/70 active:scale-[0.98] transition-all cursor-pointer group"
              title="Auto-fill Master Admin Credentials"
            >
              <div className="w-7 h-7 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center mx-auto mb-1 text-violet-700 group-hover:scale-105 transition-transform">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <div className="text-[10px] font-bold text-slate-800">Admin</div>
              <div className="text-[9px] text-violet-700 font-bold">Quick Fill</div>
            </button>
          </div>
        </div>
      </div>

      {/* Staff Invitation Notice */}
      <div className="mt-5 p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-2xs text-center flex items-center justify-center gap-2 text-xs text-slate-600">
        <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
        <span>
          New practitioner accounts are provisioned exclusively via administrator invitation.
        </span>
      </div>
    </div>
  );
}
