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
      <div className="w-full p-8 rounded-3xl bg-white/95 border border-slate-200/90 shadow-2xl shadow-slate-300/40 backdrop-blur-xl text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto text-teal-600">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Check Your Inbox</h3>
          <p className="text-xs text-slate-600 mt-2 max-w-xs mx-auto leading-relaxed">
            If an account exists for <span className="text-teal-700 font-bold">{email}</span>, we have sent instructions to reset your password.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-teal-700 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-teal-600" />
          <span>Back to Sign In</span>
        </Link>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Reset Password
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Enter your registered clinic email to receive password recovery instructions.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-white/95 border border-slate-200/90 shadow-2xl shadow-slate-300/40 backdrop-blur-xl">
        <form onSubmit={handleForgotPassword} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-bold text-slate-700 tracking-wide"
            >
              Registered Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@cdgdental.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all shadow-2xs"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-600/25 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Sending Recovery Email...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <Send className="w-4 h-4 text-white/90" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <Link
            href="/auth/login"
            className="text-xs text-slate-600 hover:text-teal-700 transition-colors"
          >
            Remember your credentials? <span className="font-bold text-teal-700">Sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
