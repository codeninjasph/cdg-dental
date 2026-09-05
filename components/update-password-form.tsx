"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { normalizeRole, setRoleCookie } from "@/lib/supabase/get-user-role";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setIsLoading(false);
      return;
    }

    if (password !== repeatPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    try {
      if (token && emailParam) {
        // 1. Token-based reset via backend endpoint
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailParam.trim().toLowerCase(),
            token: token.trim(),
            password,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update password.");
        }

        setIsSuccess(true);

        // 2. Automatically sign in
        const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: emailParam.trim().toLowerCase(),
          password,
        });

        if (!signInErr && authData.user) {
          const role = normalizeRole(data.role || "dentist");
          setRoleCookie(role);

          setTimeout(() => {
            if (role === "secretary") {
              router.push("/secretary");
            } else if (role === "admin") {
              router.push("/admin/users");
            } else {
              router.push("/portal");
            }
          }, 1200);
          return;
        }

        // If auto-signin fails, route to login
        setTimeout(() => {
          router.push(`/auth/login?reset=true&email=${encodeURIComponent(emailParam)}`);
        }, 1500);
      } else {
        // Fallback for active Supabase session
        const { error: updateErr } = await supabase.auth.updateUser({ password });
        if (updateErr) throw updateErr;

        setIsSuccess(true);
        setTimeout(() => {
          router.push("/portal");
        }, 1200);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-4 animate-in fade-in">
        <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto border border-teal-200 dark:border-teal-800">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            Password Updated!
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your credentials have been securely updated. Signing you in to your clinic workstation...
          </p>
        </div>
        <div className="flex justify-center pt-2">
          <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full space-y-6", className)} {...props}>
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center mx-auto shadow-2xs">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Set New Password
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          {emailParam ? (
            <>
              Resetting password for account:{" "}
              <strong className="text-slate-700 dark:text-slate-200 font-mono">{emailParam}</strong>
            </>
          ) : (
            "Enter your new secure password below to regain access."
          )}
        </p>
      </div>

      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Confirm New Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="Repeat new password"
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Save New Password & Sign In</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="text-center">
        <Link
          href="/auth/login"
          className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          Return to Sign In
        </Link>
      </div>
    </div>
  );
}
