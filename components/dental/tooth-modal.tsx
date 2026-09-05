"use client";

import React, { useState } from "react";
import { ToothRecord, ToothStatus } from "@/types/dental";
import { TOOTH_METADATA, TOOTH_STATUS_CONFIG } from "@/lib/tooth-data";
import { X, Check, Activity, FileText } from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";

interface ToothModalProps {
  isOpen: boolean;
  onClose: () => void;
  toothNumber: number | null;
  patientId: string;
  currentRecord?: ToothRecord;
  onSave: (updatedRecord: ToothRecord) => Promise<void>;
}

const SURFACES = [
  { code: "M", name: "Mesial (Front facing)" },
  { code: "O", name: "Occlusal / Incisal (Biting edge)" },
  { code: "D", name: "Distal (Rear facing)" },
  { code: "B", name: "Buccal / Facial (Cheek/Lip side)" },
  { code: "L", name: "Lingual / Palatal (Tongue/Palate side)" },
];

export function ToothModal({
  isOpen,
  onClose,
  toothNumber,
  patientId,
  currentRecord,
  onSave,
}: ToothModalProps) {
  if (!isOpen || toothNumber === null) return null;

  const toothMeta = TOOTH_METADATA[toothNumber];
  const [status, setStatus] = useState<ToothStatus>(currentRecord?.status || "healthy");
  const [notes, setNotes] = useState<string>(currentRecord?.notes || "");
  const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>(
    currentRecord?.surface ? currentRecord.surface.split("") : []
  );
  const [isSaving, setIsSaving] = useState(false);

  const toggleSurface = (code: string) => {
    setSelectedSurfaces((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        patient_id: patientId,
        tooth_number: toothNumber,
        status,
        surface: selectedSurfaces.join(""),
        notes: notes.trim() || null,
        last_updated: new Date().toISOString(),
      });
      onClose();
    } catch (err) {
      console.error("Failed to save tooth record:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-teal-600 text-white font-bold text-sm shadow-sm">
                #{toothNumber}
              </span>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                {toothMeta?.name || `Tooth #${toothNumber}`}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              FDI: #{toothMeta?.fdiNumber} • {toothMeta?.arch.toUpperCase()} ARCH • {toothMeta?.side.toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* Status Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Clinical Condition Status
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(TOOTH_STATUS_CONFIG) as ToothStatus[]).map((stKey) => {
                const conf = TOOTH_STATUS_CONFIG[stKey];
                const isSelected = status === stKey;
                return (
                  <button
                    key={stKey}
                    type="button"
                    onClick={() => setStatus(stKey)}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left text-xs transition-all ${
                      isSelected
                        ? `${conf.bg} ${conf.border} ring-2 ring-teal-500/40 font-medium`
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <span className={`font-semibold ${conf.text}`}>{conf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Restorative Surfaces Selection */}
          {["decayed", "filled", "crowned"].includes(status) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Surfaces Involved (MODBL)
                </label>
                <span className="text-[11px] text-teal-600 dark:text-teal-400 font-mono">
                  {selectedSurfaces.length ? selectedSurfaces.join("") : "None selected"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SURFACES.map((s) => {
                  const active = selectedSurfaces.includes(s.code);
                  return (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => toggleSurface(s.code)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                        active
                          ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className="font-bold">{s.code}</span>
                      <span className="opacity-90 text-[10px]">({s.name.split(" ")[0]})</span>
                      {active && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clinical Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Dentist Notes & Clinical Findings
            </label>
            <div className="relative">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Deep cavity on occlusal surface, sensitive to cold air; advised RCT or composite restoration..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 resize-none"
              />
              <FileText className="w-4 h-4 text-slate-400 absolute right-3 bottom-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors min-h-[44px] flex items-center justify-center"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 min-h-[44px]"
          >
            {isSaving ? (
              <>
                <Activity className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Tooth Chart"
            )}
          </button>
        </div>
      </div>
    </div>
  </ModalPortal>
  );
}
