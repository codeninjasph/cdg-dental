"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Stethoscope, Lock, ArrowLeft, Activity, Sparkles, Building2, CheckCircle2 } from "lucide-react";

interface AuthShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function AuthShell({ children, title, subtitle }: AuthShellProps) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/40 text-slate-900 flex flex-col lg:flex-row relative overflow-hidden font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Soft Dental Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-[15%] -left-[10%] w-[650px] h-[650px] rounded-full bg-teal-200/30 blur-[130px]" />
        <div className="absolute top-[35%] right-[5%] w-[550px] h-[550px] rounded-full bg-cyan-200/30 blur-[140px]" />
        <div className="absolute -bottom-[10%] left-[25%] w-[500px] h-[500px] rounded-full bg-emerald-100/40 blur-[120px]" />
      </div>

      {/* ── Left Hero Panel (Official CDG Dental Clinic Atmosphere) ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 flex-col justify-between p-10 xl:p-14 relative z-10 border-r border-slate-200/80 bg-white/70 backdrop-blur-xl overflow-hidden shadow-xl shadow-slate-200/50">
        {/* Soft Operatory Visual with Bright Clinic Gradient */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/dental-auth-hero.jpg"
            alt="CDG Dental Clinic Operatory"
            fill
            className="object-cover object-center filter contrast-105 brightness-95 opacity-25"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-teal-50/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-white/90" />
        </div>

        {/* Content Wrapper */}
        <div className="relative z-10">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-teal-700 transition-colors mb-8 group bg-white px-4 py-2 rounded-full border border-slate-200/80 shadow-xs hover:shadow-sm w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform text-teal-600" />
            <span>Return to Public Website</span>
          </Link>

          {/* Clinic Brand Identity */}
          <div className="flex items-center gap-4 mb-6">
            {/* Glowing Teal Tooth Emblem */}
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-teal-500/20 blur-md" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-700 flex items-center justify-center shadow-lg shadow-teal-600/30 border border-teal-300">
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white drop-shadow-sm">
                  <path d="M12 2C9.2 2 7 4 7 7c0 2.2.6 4.5 1.2 6.5.5 1.8 1 4.5 1.5 6.5.3 1.2 1 1.5 1.5 1.5s1.2-.3 1.5-1.5c.5-2 1-4.7 1.5-6.5C14.8 11.5 15 9.2 15 7c0-3-2.2-5-3-5z" />
                  <path
                    d="M9 7.5C8 7 7.5 8 8 9c.5.8 1.5.5 2 0"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="1"
                    fill="none"
                  />
                </svg>
              </div>
            </div>

            <div>
              <div className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                CDG DENTAL
                <span className="text-[10px] uppercase px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200 font-extrabold tracking-wider">
                  CLINIC EHR
                </span>
              </div>
              <p className="text-xs text-teal-700 font-semibold tracking-wide flex items-center gap-1.5 mt-0.5">
                <span>Cagayan de Oro City</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600">Cosmetic, Orthodontics & Implants</span>
              </p>
            </div>
          </div>

          <div className="space-y-3 max-w-lg">
            <h1 className="text-3xl xl:text-4xl font-black tracking-tight text-slate-900 leading-tight">
              Hospital-Grade Oral Surgery &{" "}
              <span className="bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Dental Medicine Suite.
              </span>
            </h1>
            <p className="text-slate-600 text-xs xl:text-sm leading-relaxed max-w-md">
              The official electronic healthcare portal for CDG Dental practitioners, oral surgery clinicians, and front-desk patient coordinators.
            </p>
          </div>
        </div>

        {/* 3D Holographic Tooth Showcase Card (Airy Light Luxury) */}
        <div className="relative z-10 my-6 p-4 rounded-3xl bg-white/90 border border-teal-200/80 shadow-xl shadow-teal-900/5 backdrop-blur-md max-w-md">
          <div className="flex items-center gap-4">
            {/* 3D Tooth Hologram Thumbnail */}
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-teal-500/20 shadow-md shrink-0 bg-slate-950">
              <Image
                src="/images/dental-tooth-holo.jpg"
                alt="3D Molar Hologram Scan"
                fill
                className="object-cover"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800">
                  Interactive FDI Dental Charting
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 truncate">
                32-Tooth Adult & Pediatric Odontogram
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-tight">
                Chairside restorative logs, endodontic canal charting & real-time treatment history.
              </p>
            </div>
          </div>

          {/* Micro Location Badges */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-[10px]">
            <div className="text-center p-2 rounded-xl bg-teal-50/70 border border-teal-100/80">
              <span className="text-teal-800 font-bold block">Centrio Mall</span>
              <span className="text-teal-600 text-[9px]">Main Clinic</span>
            </div>
            <div className="text-center p-2 rounded-xl bg-cyan-50/70 border border-cyan-100/80">
              <span className="text-cyan-800 font-bold block">Uptown CDO</span>
              <span className="text-cyan-600 text-[9px]">Branch 2</span>
            </div>
            <div className="text-center p-2 rounded-xl bg-emerald-50/70 border border-emerald-100/80">
              <span className="text-emerald-800 font-bold block">DOH & HIPAA</span>
              <span className="text-emerald-600 text-[9px]">Certified</span>
            </div>
          </div>
        </div>

        {/* Bottom Trust & Compliance Footer */}
        <div className="relative z-10 pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2 text-[11px]">
            <Lock className="w-3.5 h-3.5 text-teal-600" />
            <span>256-Bit Encrypted Health Records</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-teal-700 font-bold">
            <Activity className="w-3.5 h-3.5" />
            <span>CDG Dental Gateway v2.5</span>
          </div>
        </div>
      </div>

      {/* ── Right Form Container (Clean Dental Card) ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 relative z-10 min-h-screen">
        {/* Mobile Dental Brand Header */}
        <div className="w-full max-w-md lg:hidden mb-6 text-center flex flex-col items-center">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-600 flex items-center justify-center shadow-md shadow-teal-600/30 border border-teal-300">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                <path d="M12 2C9.2 2 7 4 7 7c0 2.2.6 4.5 1.2 6.5.5 1.8 1 4.5 1.5 6.5.3 1.2 1 1.5 1.5 1.5s1.2-.3 1.5-1.5c.5-2 1-4.7 1.5-6.5C14.8 11.5 15 9.2 15 7c0-3-2.2-5-3-5z" />
              </svg>
            </div>
            <div className="text-left">
              <span className="text-lg font-black tracking-tight text-slate-900 block leading-none">
                CDG DENTAL
              </span>
              <span className="text-[10px] text-teal-700 font-bold tracking-wider uppercase">
                Clinic Portal
              </span>
            </div>
          </Link>
          {title && <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>}
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>

        {/* Content Box */}
        <div className="w-full max-w-md">
          {children}

          {/* Micro Footer for Right Panel */}
          <div className="mt-8 text-center space-y-1">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <span>Restricted System • CDG Dental Practice Management</span>
            </p>
            <p className="text-[10px] text-slate-400">
              Cagayan de Oro City • Centrio Mall & Uptown Branches
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
