"use client";

import React, { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (resetErr) throw resetErr;
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset link.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full p-8 rounded-3xl bg-slate-900/80 border border-white/[0.08] shadow-2xl shadow-black/60 backdrop-blur-2xl text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center mx-auto text-teal-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Check Your Inbox</h3>
          <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
            If an account exists for <span className="text-teal-300 font-semibold">{email}</span>, we have sent instructions to reset your password.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-200 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Sign In</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-300 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Reset Password
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Enter your registered clinic email to receive a recovery link.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/[0.08] shadow-2xl shadow-black/60 backdrop-blur-2xl">
        <form onSubmit={handleForgotPassword} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-slate-300 tracking-wide"
            >
              Registered Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@cdgdental.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-100 placeholder:text-slate-600 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400/50 transition-all"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-teal-400 via-teal-300 to-cyan-400 hover:opacity-95 shadow-lg shadow-teal-500/25 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Sending Recovery Email...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-white/[0.06] text-center">
          <Link
            href="/auth/login"
            className="text-xs text-slate-400 hover:text-teal-300 transition-colors"
          >
            Remember your credentials? <span className="font-semibold text-teal-400">Sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
