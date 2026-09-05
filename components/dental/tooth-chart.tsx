"use client";

import React, { useState } from "react";
import { ToothRecord } from "@/types/dental";
import { TOOTH_METADATA, TOOTH_STATUS_CONFIG } from "@/lib/tooth-data";
import { ToothModal } from "./tooth-modal";
import { Info, Sparkles, Filter } from "lucide-react";

interface ToothChartProps {
  patientId: string;
  records: ToothRecord[];
  onUpdateRecord: (record: ToothRecord) => Promise<void>;
  readOnly?: boolean;
}

// Tooth SVG drawing component
function ToothGraphic({
  type,
  arch,
  status,
  surface,
}: {
  type: string;
  arch: "upper" | "lower";
  status: string;
  surface?: string | null;
}) {
  const isMolar = type === "molar";
  const isPremolar = type === "premolar";
  const isUpper = arch === "upper";

  // Dynamic SVG fills depending on status
  let crownFill = "url(#healthyGradient)";
  let strokeColor = "#64748b"; // default slate

  if (status === "decayed") {
    crownFill = "url(#decayedGradient)";
    strokeColor = "#f43f5e";
  } else if (status === "filled") {
    crownFill = "url(#filledGradient)";
    strokeColor = "#f59e0b";
  } else if (status === "crowned") {
    crownFill = "url(#crownedGradient)";
    strokeColor = "#6366f1";
  } else if (status === "root_canal") {
    crownFill = "url(#rctGradient)";
    strokeColor = "#a855f7";
  } else if (status === "implant") {
    crownFill = "url(#implantGradient)";
    strokeColor = "#06b6d4";
  } else if (status === "extracted" || status === "missing") {
    crownFill = "url(#missingGradient)";
    strokeColor = "#94a3b8";
  } else if (status === "bridge") {
    crownFill = "url(#bridgeGradient)";
    strokeColor = "#3b82f6";
  }

  return (
    <svg viewBox="0 0 44 64" className="w-10 h-14 transition-transform group-hover:scale-105 drop-shadow-sm">
      <defs>
        <linearGradient id="healthyGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="decayedGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe4e6" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>
        <linearGradient id="filledGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="crownedGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0e7ff" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="rctGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3e8ff" />
          <stop offset="100%" stopColor="#9333ea" />
        </linearGradient>
        <linearGradient id="implantGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cffafe" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="missingGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="bridgeGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>

      {/* Roots */}
      {isUpper ? (
        // Upper tooth: roots point upwards
        <g stroke={strokeColor} strokeWidth="1.5" strokeLinejoin="round" fill="#e2e8f0" opacity={status === "missing" ? "0.3" : "0.9"}>
          {isMolar ? (
            <>
              {/* 3 roots for maxillary molar */}
              <path d="M 12 28 C 10 14, 8 6, 12 4 C 14 6, 16 16, 18 28 Z" />
              <path d="M 22 28 C 22 12, 22 4, 25 3 C 27 5, 27 15, 26 28 Z" />
              <path d="M 28 28 C 30 16, 34 8, 36 6 C 38 8, 34 18, 32 28 Z" />
            </>
          ) : isPremolar ? (
            <>
              {/* 2 roots for premolar */}
              <path d="M 16 28 C 13 14, 14 6, 18 4 C 20 6, 21 16, 21 28 Z" />
              <path d="M 24 28 C 24 16, 26 6, 29 4 C 31 6, 30 16, 28 28 Z" />
            </>
          ) : (
            /* 1 root for anterior teeth */
            <path d="M 17 28 C 18 14, 20 5, 22 3 C 24 5, 26 14, 27 28 Z" />
          )}
        </g>
      ) : (
        // Lower tooth: roots point downwards
        <g stroke={strokeColor} strokeWidth="1.5" strokeLinejoin="round" fill="#e2e8f0" opacity={status === "missing" ? "0.3" : "0.9"}>
          {isMolar ? (
            <>
              {/* 2 large roots for mandibular molar */}
              <path d="M 14 36 C 11 48, 10 58, 14 61 C 17 59, 19 48, 20 36 Z" />
              <path d="M 24 36 C 25 48, 28 59, 31 61 C 34 58, 32 48, 29 36 Z" />
            </>
          ) : (
            <path d="M 17 36 C 18 48, 20 59, 22 61 C 24 59, 26 48, 27 36 Z" />
          )}
        </g>
      )}

      {/* Crown */}
      <g stroke={strokeColor} strokeWidth="1.8" strokeLinejoin="round" fill={crownFill}>
        {isUpper ? (
          <path
            d={
              isMolar
                ? "M 8 28 C 8 24, 16 22, 22 22 C 28 22, 36 24, 36 28 C 37 36, 35 48, 29 50 C 25 51, 23 48, 22 48 C 21 48, 19 51, 15 50 C 9 48, 7 36, 8 28 Z"
                : "M 12 28 C 12 24, 18 22, 22 22 C 26 22, 32 24, 32 28 C 33 36, 31 46, 26 48 C 24 49, 20 49, 18 48 C 13 46, 11 36, 12 28 Z"
            }
          />
        ) : (
          <path
            d={
              isMolar
                ? "M 8 36 C 8 40, 16 42, 22 42 C 28 42, 36 40, 36 36 C 37 28, 35 16, 29 14 C 25 13, 23 16, 22 16 C 21 16, 19 13, 15 14 C 9 16, 7 28, 8 36 Z"
                : "M 12 36 C 12 40, 18 42, 22 42 C 26 42, 32 40, 32 36 C 33 28, 31 18, 26 16 C 24 15, 20 15, 18 16 C 13 18, 11 28, 12 36 Z"
            }
          />
        )}
      </g>

      {/* Missing / Extracted X mark */}
      {(status === "extracted" || status === "missing") && (
        <g stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round">
          <line x1="10" y1="18" x2="34" y2="46" />
          <line x1="34" y1="18" x2="10" y2="46" />
        </g>
      )}

      {/* Implant screw visualization */}
      {status === "implant" && (
        <g stroke="#0891b2" strokeWidth="1.5">
          <line x1="16" y1="12" x2="28" y2="12" />
          <line x1="17" y1="16" x2="27" y2="16" />
          <line x1="18" y1="20" x2="26" y2="20" />
        </g>
      )}

      {/* Surface badge */}
      {surface && (
        <text
          x="22"
          y={isUpper ? "38" : "28"}
          textAnchor="middle"
          fill="#1e293b"
          fontSize="7"
          fontWeight="bold"
          className="font-mono"
        >
          {surface}
        </text>
      )}
    </svg>
  );
}

export function ToothChart({
  patientId,
  records,
  onUpdateRecord,
  readOnly = false,
}: ToothChartProps) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [fdiMode, setFdiMode] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [selectedQuadrant, setSelectedQuadrant] = useState<"all" | "q1" | "q2" | "q3" | "q4">("all");

  // Map of tooth records by tooth number
  const recordsMap = new Map<number, ToothRecord>();
  records.forEach((r) => recordsMap.set(r.tooth_number, r));

  const upperTeeth = Array.from({ length: 16 }, (_, i) => i + 1); // 1 to 16
  const lowerTeeth = Array.from({ length: 16 }, (_, i) => 32 - i); // 32 down to 17

  const handleToothClick = (toothNumber: number) => {
    if (readOnly) return;
    setSelectedTooth(toothNumber);
  };

  const selectedRecord = selectedTooth ? recordsMap.get(selectedTooth) : undefined;

  // Calculate quick summary metrics
  let totalDecayed = 0;
  let totalFilled = 0;
  let totalCrowned = 0;
  let totalMissing = 0;

  records.forEach((r) => {
    if (r.status === "decayed") totalDecayed++;
    if (r.status === "filled") totalFilled++;
    if (r.status === "crowned") totalCrowned++;
    if (r.status === "extracted" || r.status === "missing") totalMissing++;
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
      {/* Top Header & Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Interactive 32-Tooth Adult Odontogram
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              Live Chart
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Click any tooth to examine surfaces, update clinical status, or record procedures.
          </p>
        </div>

        {/* System numbering toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
            <button
              onClick={() => setFdiMode(false)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                !fdiMode
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              Universal (#1-32)
            </button>
            <button
              onClick={() => setFdiMode(true)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                fdiMode
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              FDI ISO (#11-48)
            </button>
          </div>
        </div>
      </div>

      {/* Quick Summary Pill Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
          <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">Caries / Decayed</span>
          <span className="text-lg font-bold text-rose-800 dark:text-rose-200 font-mono">{totalDecayed}</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Restored / Filled</span>
          <span className="text-lg font-bold text-amber-800 dark:text-amber-200 font-mono">{totalFilled}</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50">
          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Crowned Teeth</span>
          <span className="text-lg font-bold text-indigo-800 dark:text-indigo-200 font-mono">{totalCrowned}</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Extracted / Missing</span>
          <span className="text-lg font-bold text-slate-800 dark:text-slate-200 font-mono">{totalMissing}</span>
        </div>
      </div>

      {/* Mobile Arch & Quadrant Focus Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Odontogram View:
          </span>
        </div>

        {/* Quadrant Focus Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide text-xs">
          {[
            { id: "all", label: "Full Chart (All 32)" },
            { id: "q1", label: "Q1: Upper Right" },
            { id: "q2", label: "Q2: Upper Left" },
            { id: "q3", label: "Q3: Lower Left" },
            { id: "q4", label: "Q4: Lower Right" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedQuadrant(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedQuadrant === tab.id
                  ? "bg-teal-600 text-white font-bold shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Touch / Scroll Hint on Mobile when Full Chart is viewed */}
      {selectedQuadrant === "all" && (
        <div className="flex lg:hidden items-center justify-center gap-2 text-[11px] text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 py-1.5 px-3 rounded-xl border border-teal-200 dark:border-teal-900 font-medium">
          <span>👈 Swipe horizontally to view all teeth or select a Quadrant above 👉</span>
        </div>
      )}

      {/* FOCUSED QUADRANT VIEW (Responsive Card Grid for Phones & Tablets) */}
      {selectedQuadrant !== "all" && (
        <div className="p-4 sm:p-6 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-teal-200/80 dark:border-teal-900/60 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              {selectedQuadrant === "q1" && "Quadrant 1: Upper Right (Maxillary Right)"}
              {selectedQuadrant === "q2" && "Quadrant 2: Upper Left (Maxillary Left)"}
              {selectedQuadrant === "q3" && "Quadrant 3: Lower Left (Mandibular Left)"}
              {selectedQuadrant === "q4" && "Quadrant 4: Lower Right (Mandibular Right)"}
            </h3>
            <button
              type="button"
              onClick={() => setSelectedQuadrant("all")}
              className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
            >
              Back to Full Arch
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {(() => {
              const qTeeth =
                selectedQuadrant === "q1"
                  ? [1, 2, 3, 4, 5, 6, 7, 8]
                  : selectedQuadrant === "q2"
                  ? [9, 10, 11, 12, 13, 14, 15, 16]
                  : selectedQuadrant === "q3"
                  ? [17, 18, 19, 20, 21, 22, 23, 24]
                  : [25, 26, 27, 28, 29, 30, 31, 32];

              return qTeeth.map((tNum) => {
                const meta = TOOTH_METADATA[tNum];
                const rec = recordsMap.get(tNum);
                const st = rec?.status || "healthy";
                const conf = TOOTH_STATUS_CONFIG[st];

                return (
                  <button
                    key={tNum}
                    type="button"
                    onClick={() => handleToothClick(tNum)}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      {fdiMode ? meta.fdiNumber : `#${tNum}`}
                    </span>
                    <ToothGraphic
                      type={meta.type}
                      arch={meta.arch}
                      status={st}
                      surface={rec?.surface}
                    />
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-2 line-clamp-1">
                      {meta.name.split(" ")[0]}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md mt-1 ${conf.badge}`}>
                      {conf.label}
                    </span>
                  </button>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* THE ODONTOGRAM CHART CONTAINER (Always accessible, full panoramic layout) */}
      <div className={`overflow-x-auto pb-4 touch-manipulation ${selectedQuadrant !== "all" ? "hidden md:block opacity-60 hover:opacity-100 transition-opacity" : ""}`}>
        <div className="min-w-[780px] flex flex-col items-center space-y-6">
          {/* MAXILLARY / UPPER ARCH (Teeth 1 to 16) */}
          <div className="w-full bg-slate-50/70 dark:bg-slate-950/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 relative">
            <div className="flex items-center justify-between mb-3 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>Right (Patient's Maxillary Right)</span>
              <span className="text-teal-700 dark:text-teal-400 font-semibold">Maxillary Arch (Upper)</span>
              <span>Left (Patient's Maxillary Left)</span>
            </div>

            <div className="flex items-center justify-center gap-1 sm:gap-2">
              {/* Upper Right Quadrant (1 to 8) */}
              <div className="flex items-center gap-1 sm:gap-1.5">
                {upperTeeth.slice(0, 8).map((tNum) => {
                  const meta = TOOTH_METADATA[tNum];
                  const rec = recordsMap.get(tNum);
                  const st = rec?.status || "healthy";
                  const conf = TOOTH_STATUS_CONFIG[st];

                  return (
                    <button
                      key={tNum}
                      type="button"
                      onClick={() => handleToothClick(tNum)}
                      className="group flex flex-col items-center p-1.5 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-transparent hover:border-teal-300 dark:hover:border-teal-700 transition-all cursor-pointer relative"
                    >
                      <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 group-hover:text-teal-600 mb-1">
                        {fdiMode ? meta.fdiNumber : `#${tNum}`}
                      </span>
                      <ToothGraphic
                        type={meta.type}
                        arch={meta.arch}
                        status={st}
                        surface={rec?.surface}
                      />
                      <span
                        className={`text-[9px] font-semibold px-1 rounded mt-1 max-w-[42px] truncate ${conf.badge}`}
                      >
                        {conf.label.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Midline Divider */}
              <div className="h-20 w-[2px] bg-teal-400/40 dark:bg-teal-500/40 mx-2 rounded-full relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold text-teal-600">
                  MID
                </span>
              </div>

              {/* Upper Left Quadrant (9 to 16) */}
              <div className="flex items-center gap-1 sm:gap-1.5">
                {upperTeeth.slice(8, 16).map((tNum) => {
                  const meta = TOOTH_METADATA[tNum];
                  const rec = recordsMap.get(tNum);
                  const st = rec?.status || "healthy";
                  const conf = TOOTH_STATUS_CONFIG[st];

                  return (
                    <button
                      key={tNum}
                      type="button"
                      onClick={() => handleToothClick(tNum)}
                      className="group flex flex-col items-center p-1.5 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-transparent hover:border-teal-300 dark:hover:border-teal-700 transition-all cursor-pointer relative"
                    >
                      <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 group-hover:text-teal-600 mb-1">
                        {fdiMode ? meta.fdiNumber : `#${tNum}`}
                      </span>
                      <ToothGraphic
                        type={meta.type}
                        arch={meta.arch}
                        status={st}
                        surface={rec?.surface}
                      />
                      <span
                        className={`text-[9px] font-semibold px-1 rounded mt-1 max-w-[42px] truncate ${conf.badge}`}
                      >
                        {conf.label.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* MANDIBULAR / LOWER ARCH (Teeth 32 down to 17) */}
          <div className="w-full bg-slate-50/70 dark:bg-slate-950/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 relative">
            <div className="flex items-center justify-between mb-3 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>Right (Patient's Mandibular Right)</span>
              <span className="text-teal-700 dark:text-teal-400 font-semibold">Mandibular Arch (Lower)</span>
              <span>Left (Patient's Mandibular Left)</span>
            </div>

            <div className="flex items-center justify-center gap-1 sm:gap-2">
              {/* Lower Right Quadrant (32 down to 25) */}
              <div className="flex items-center gap-1 sm:gap-1.5">
                {lowerTeeth.slice(0, 8).map((tNum) => {
                  const meta = TOOTH_METADATA[tNum];
                  const rec = recordsMap.get(tNum);
                  const st = rec?.status || "healthy";
                  const conf = TOOTH_STATUS_CONFIG[st];

                  return (
                    <button
                      key={tNum}
                      type="button"
                      onClick={() => handleToothClick(tNum)}
                      className="group flex flex-col items-center p-1.5 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-transparent hover:border-teal-300 dark:hover:border-teal-700 transition-all cursor-pointer relative"
                    >
                      <ToothGraphic
                        type={meta.type}
                        arch={meta.arch}
                        status={st}
                        surface={rec?.surface}
                      />
                      <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 group-hover:text-teal-600 mt-1">
                        {fdiMode ? meta.fdiNumber : `#${tNum}`}
                      </span>
                      <span
                        className={`text-[9px] font-semibold px-1 rounded mt-0.5 max-w-[42px] truncate ${conf.badge}`}
                      >
                        {conf.label.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Midline Divider */}
              <div className="h-20 w-[2px] bg-teal-400/40 dark:bg-teal-500/40 mx-2 rounded-full relative">
                <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-bold text-teal-600">
                  MID
                </span>
              </div>

              {/* Lower Left Quadrant (24 down to 17) */}
              <div className="flex items-center gap-1 sm:gap-1.5">
                {lowerTeeth.slice(8, 16).map((tNum) => {
                  const meta = TOOTH_METADATA[tNum];
                  const rec = recordsMap.get(tNum);
                  const st = rec?.status || "healthy";
                  const conf = TOOTH_STATUS_CONFIG[st];

                  return (
                    <button
                      key={tNum}
                      type="button"
                      onClick={() => handleToothClick(tNum)}
                      className="group flex flex-col items-center p-1.5 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-transparent hover:border-teal-300 dark:hover:border-teal-700 transition-all cursor-pointer relative"
                    >
                      <ToothGraphic
                        type={meta.type}
                        arch={meta.arch}
                        status={st}
                        surface={rec?.surface}
                      />
                      <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 group-hover:text-teal-600 mt-1">
                        {fdiMode ? meta.fdiNumber : `#${tNum}`}
                      </span>
                      <span
                        className={`text-[9px] font-semibold px-1 rounded mt-0.5 max-w-[42px] truncate ${conf.badge}`}
                      >
                        {conf.label.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATUS COLOR LEGEND */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">
          Clinical Odontogram Legend:
        </span>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(TOOTH_STATUS_CONFIG).map(([key, conf]) => (
            <div
              key={key}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${conf.bg} ${conf.border} ${conf.text}`}
            >
              <span className="w-2 h-2 rounded-full bg-current opacity-80" />
              <span>{conf.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* TOOTH MODAL */}
      <ToothModal
        isOpen={selectedTooth !== null}
        onClose={() => setSelectedTooth(null)}
        toothNumber={selectedTooth}
        patientId={patientId}
        currentRecord={selectedRecord}
        onSave={onUpdateRecord}
      />
    </div>
  );
}
