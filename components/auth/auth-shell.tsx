"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Sparkles, Stethoscope, Lock, ArrowLeft } from "lucide-react";

interface AuthShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function AuthShell({ children, title, subtitle }: AuthShellProps) {
  return (
    <div className="min-h-screen w-full bg-[#070d12] text-slate-100 flex flex-col lg:flex-row relative overflow-hidden font-sans selection:bg-teal-500/30 selection:text-teal-200">
      {/* Dynamic ambient lighting background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] rounded-full bg-teal-600/10 blur-[140px]" />
        <div className="absolute bottom-[10%] left-[20%] w-[500px] h-[500px] rounded-full bg-cyan-600/10 blur-[150px]" />
        <div className="absolute top-[40%] -right-[15%] w-[650px] h-[650px] rounded-full bg-emerald-600/10 blur-[160px]" />
      </div>

      {/* ── Left Hero Panel (Desktop & Tablet) ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 flex-col justify-between p-12 xl:p-16 relative z-10 border-r border-white/[0.06] bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-teal-950/40 backdrop-blur-2xl">
        {/* Header / Brand */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-teal-300 transition-colors mb-10 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Public Website</span>
          </Link>

          <div className="flex items-center gap-3.5 mb-8">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-teal-500/40 blur-lg animate-pulse" />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 via-teal-400 to-cyan-400 flex items-center justify-center shadow-xl shadow-teal-500/30 border border-teal-300/30">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white drop-shadow">
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
              <div className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                CDG DENTAL
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 font-bold tracking-widest">
                  PORTAL
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium tracking-wide">
                Cagayan de Oro City • Premier Dental Healthcare
              </p>
            </div>
          </div>

          <div className="space-y-4 max-w-md">
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Modern clinical management for{" "}
              <span className="bg-gradient-to-r from-teal-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                exceptional care.
              </span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Secure, authenticated access for clinicians, administrative staff, and clinic directors. Unified chairside odontograms, intelligent queueing, and multi-branch POS.
            </p>
          </div>
        </div>

        {/* Feature Cards Showcase */}
        <div className="space-y-3.5 my-8">
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md hover:bg-white/[0.05] transition-all">
            <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center shrink-0">
              <Stethoscope className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Interactive FDI Tooth Charting</h4>
              <p className="text-[11px] text-slate-400">Adult & pediatric 32-tooth odontograms with instant history</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md hover:bg-white/[0.05] transition-all">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Role-Based Medical Access</h4>
              <p className="text-[11px] text-slate-400">Strict separation of clinical charting and front-desk billing</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md hover:bg-white/[0.05] transition-all">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Multi-Branch Synchronization</h4>
              <p className="text-[11px] text-slate-400">Centrio Mall & Uptown branches connected in real time</p>
            </div>
          </div>
        </div>

        {/* Left Footer Trust Badge */}
        <div className="pt-6 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-teal-400" />
            <span>End-to-End SSL & RLS Protected</span>
          </div>
          <span>CDG Dental v2.5</span>
        </div>
      </div>

      {/* ── Right Form Container ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 relative z-10 min-h-screen">
        {/* Mobile Brand Header */}
        <div className="w-full max-w-md lg:hidden mb-8 text-center flex flex-col items-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/30 border border-teal-300/30">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M12 2C9.2 2 7 4 7 7c0 2.2.6 4.5 1.2 6.5.5 1.8 1 4.5 1.5 6.5.3 1.2 1 1.5 1.5 1.5s1.2-.3 1.5-1.5c.5-2 1-4.7 1.5-6.5C14.8 11.5 15 9.2 15 7c0-3-2.2-5-3-5z" />
              </svg>
            </div>
            <span className="text-lg font-black tracking-tight text-white">CDG DENTAL</span>
          </Link>
          {title && <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>}
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>

        {/* Content Box */}
        <div className="w-full max-w-md">
          {children}

          {/* Micro Footer for Right Panel */}
          <div className="mt-8 text-center">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <span>Restricted System • CDG Dental Practice Management</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
