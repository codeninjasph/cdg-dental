"use client";

import React from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";

interface MedicalAlertBannerProps {
  alerts?: string | null;
}

export function MedicalAlertBanner({ alerts }: MedicalAlertBannerProps) {
  if (!alerts || !alerts.trim()) {
    return (
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <ShieldAlert className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>No known drug allergies or medical contraindications recorded.</span>
      </div>
    );
  }

  // Parse comma-separated or text alert items
  const alertItems = alerts.split(/[,;\n]+/).map((a) => a.trim()).filter(Boolean);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 shadow-sm animate-in fade-in">
      <div className="flex items-start sm:items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-rose-600 text-white shrink-0 animate-pulse">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-200 block sm:inline mr-2">
            CRITICAL MEDICAL ALERTS:
          </span>
          <div className="inline-flex flex-wrap gap-1.5 mt-1 sm:mt-0">
            {alertItems.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 font-bold text-xs"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
      <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 shrink-0">
        Check precautions before anesthesia
      </span>
    </div>
  );
}
