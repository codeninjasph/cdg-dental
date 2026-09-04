"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/clinic-context";
import {
  X,
  Search,
  ArrowRight,
  Merge,
  ShieldAlert,
  CheckCircle2,
  Users,
  Calendar,
  CreditCard,
  FileText,
  Stethoscope,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  dob?: string;
  gender?: string;
  medical_alerts?: string;
  created_at: string;
}

interface PatientStats {
  appointments: number;
  treatments: number;
  bills: number;
  documents: number;
}

interface MergePatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Optionally pre-select the duplicate patient */
  preselectedDupId?: string;
}

export function MergePatientModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedDupId,
}: MergePatientModalProps) {
  const { showToast } = useClinic();
  const supabase = createClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);

  const [dupPatient, setDupPatient] = useState<Patient | null>(null);
  const [keepPatient, setKeepPatient] = useState<Patient | null>(null);

  const [dupSearch, setDupSearch] = useState("");
  const [keepSearch, setKeepSearch] = useState("");

  const [dupStats, setDupStats] = useState<PatientStats | null>(null);
  const [keepStats, setKeepStats] = useState<PatientStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const [isMerging, setIsMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState<any | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const CONFIRM_PHRASE = "MERGE";

  // ── Load patients ──────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setDupPatient(null);
    setKeepPatient(null);
    setDupSearch("");
    setKeepSearch("");
    setDupStats(null);
    setKeepStats(null);
    setMergeResult(null);
    setConfirmText("");

    async function load() {
      setIsLoadingPatients(true);
      const { data } = await supabase
        .from("patients")
        .select("*")
        .order("last_name");
      if (data) setPatients(data);
      setIsLoadingPatients(false);
    }
    load();
  }, [isOpen]);

  // Pre-select dup if provided
  useEffect(() => {
    if (preselectedDupId && patients.length > 0) {
      const found = patients.find((p) => p.id === preselectedDupId);
      if (found) setDupPatient(found);
    }
  }, [preselectedDupId, patients]);

  // ── Load stats for both patients when entering Step 3 ──────────
  useEffect(() => {
    if (step !== 3 || !dupPatient || !keepPatient) return;
    async function loadStats() {
      setIsLoadingStats(true);
      const fetchStats = async (id: string): Promise<PatientStats> => {
        const [appts, treats, bills, docs] = await Promise.all([
          supabase
            .from("appointments")
            .select("id", { count: "exact", head: true })
            .eq("patient_id", id),
          supabase
            .from("treatments")
            .select("id", { count: "exact", head: true })
            .eq("patient_id", id),
          supabase
            .from("treatment_bills")
            .select("id", { count: "exact", head: true })
            .eq("patient_id", id),
          supabase
            .from("patient_documents")
            .select("id", { count: "exact", head: true })
            .eq("patient_id", id),
        ]);
        return {
          appointments: appts.count ?? 0,
          treatments: treats.count ?? 0,
          bills: bills.count ?? 0,
          documents: docs.count ?? 0,
        };
      };
      const [ds, ks] = await Promise.all([
        fetchStats(dupPatient!.id),
        fetchStats(keepPatient!.id),
      ]);
      setDupStats(ds);
      setKeepStats(ks);
      setIsLoadingStats(false);
    }
    loadStats();
  }, [step]);

  // ── Filtered lists ─────────────────────────────────────────────
  const filteredForDup = useMemo(() => {
    const q = dupSearch.toLowerCase();
    return patients.filter((p) => {
      if (keepPatient && p.id === keepPatient.id) return false;
      const full = `${p.first_name} ${p.last_name}`.toLowerCase();
      const ph = (p.phone || "").toLowerCase();
      return !q || full.includes(q) || ph.includes(q);
    });
  }, [patients, dupSearch, keepPatient]);

  const filteredForKeep = useMemo(() => {
    const q = keepSearch.toLowerCase();
    return patients.filter((p) => {
      if (dupPatient && p.id === dupPatient.id) return false;
      const full = `${p.first_name} ${p.last_name}`.toLowerCase();
      const ph = (p.phone || "").toLowerCase();
      return !q || full.includes(q) || ph.includes(q);
    });
  }, [patients, keepSearch, dupPatient]);

  // ── Execute merge ──────────────────────────────────────────────
  const handleMerge = async () => {
    if (!dupPatient || !keepPatient) return;
    setIsMerging(true);
    try {
      const { data, error } = await supabase.rpc("merge_patient", {
        keep_id: keepPatient.id,
        dup_id: dupPatient.id,
      });
      if (error) throw error;
      setMergeResult(data);
      showToast(
        `Patient records merged successfully into ${keepPatient.first_name} ${keepPatient.last_name}`,
        "success"
      );
      onSuccess();
    } catch (err: any) {
      showToast(err?.message || "Merge failed. Please try again.", "error");
    } finally {
      setIsMerging(false);
    }
  };

  if (!isOpen) return null;

  const fullName = (p: Patient) => `${p.first_name} ${p.last_name}`;

  // ── PatientCard ────────────────────────────────────────────────
  const PatientRow = ({
    patient,
    isSelected,
    onClick,
  }: {
    patient: Patient;
    isSelected: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all cursor-pointer rounded-xl ${
        isSelected
          ? "bg-teal-50 dark:bg-teal-950/50 ring-1 ring-teal-400/50"
          : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
          isSelected
            ? "bg-teal-500 text-white"
            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
        }`}
      >
        {patient.first_name[0]}
        {patient.last_name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
          {fullName(patient)}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
          {patient.phone || "No phone"} · DOB: {patient.dob || "—"} ·{" "}
          {patient.gender || "—"}
        </p>
        {patient.medical_alerts && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-400">
            <ShieldAlert className="w-3 h-3" />
            {patient.medical_alerts}
          </span>
        )}
      </div>
      {isSelected && (
        <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
      )}
    </button>
  );

  const StatBadge = ({
    icon: Icon,
    label,
    count,
    color,
  }: {
    icon: React.ElementType;
    label: string;
    count: number;
    color: string;
  }) => (
    <div className={`flex flex-col items-center p-2.5 rounded-xl ${color}`}>
      <Icon className="w-4 h-4 mb-1 opacity-70" />
      <span className="text-lg font-extrabold font-mono leading-none">
        {count}
      </span>
      <span className="text-[10px] mt-0.5 font-semibold opacity-70">
        {label}
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
        {/* ── Header ── */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
              <Merge className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Merge Duplicate Patient
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Step {mergeResult ? "✓" : step} of 3
                {step === 1 && " — Select the duplicate (wrong) record"}
                {step === 2 && " — Select the correct (keep) record"}
                {step === 3 && " — Review & confirm merge"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Step Indicators ── */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold transition-all ${
                    mergeResult
                      ? "bg-emerald-500 text-white"
                      : step === s
                      ? "bg-teal-500 text-white"
                      : step > s
                      ? "bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}
                >
                  {mergeResult ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    s
                  )}
                </div>
                {s < 3 && (
                  <div
                    className={`flex-1 h-0.5 rounded-full transition-all ${
                      step > s
                        ? "bg-teal-400"
                        : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          {/* ── SUCCESS STATE ── */}
          {mergeResult && (
            <div className="p-8 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Merge Successful
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  All records from{" "}
                  <strong className="text-rose-600">
                    {fullName(dupPatient!)}
                  </strong>{" "}
                  have been consolidated into{" "}
                  <strong className="text-emerald-600">
                    {fullName(keepPatient!)}
                  </strong>
                  .
                </p>
              </div>

              <div className="grid grid-cols-4 gap-3 w-full max-w-sm">
                <StatBadge
                  icon={Calendar}
                  label="Appts"
                  count={mergeResult.appointments}
                  color="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                />
                <StatBadge
                  icon={Stethoscope}
                  label="Treats"
                  count={mergeResult.treatments}
                  color="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                />
                <StatBadge
                  icon={CreditCard}
                  label="Bills"
                  count={mergeResult.bills}
                  color="bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300"
                />
                <StatBadge
                  icon={FileText}
                  label="Docs"
                  count={mergeResult.documents}
                  color="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                />
              </div>

              <button
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          )}

          {/* ── STEP 1: Pick Duplicate ── */}
          {!mergeResult && step === 1 && (
            <div className="p-5 space-y-3">
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Select the <strong>duplicate / wrongly-named</strong> patient.
                  This record will be{" "}
                  <strong>permanently deleted</strong> after merging.
                </p>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={dupSearch}
                  onChange={(e) => setDupSearch(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                />
              </div>

              <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                {isLoadingPatients ? (
                  <p className="p-4 text-center text-sm text-slate-500">
                    Loading...
                  </p>
                ) : filteredForDup.length === 0 ? (
                  <p className="p-4 text-center text-sm text-slate-500">
                    No patients found.
                  </p>
                ) : (
                  filteredForDup.map((p) => (
                    <PatientRow
                      key={p.id}
                      patient={p}
                      isSelected={dupPatient?.id === p.id}
                      onClick={() => setDupPatient(p)}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── STEP 2: Pick Canonical ── */}
          {!mergeResult && step === 2 && (
            <div className="p-5 space-y-3">
              <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <p className="text-xs text-teal-800 dark:text-teal-300">
                  Select the <strong>correct / canonical</strong> patient. All
                  records from the duplicate will be moved here.
                </p>
              </div>

              {/* Selected duplicate reminder */}
              {dupPatient && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                  <div className="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {dupPatient.first_name[0]}
                    {dupPatient.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">
                      Duplicate to remove:
                    </span>
                    <p className="text-xs font-bold text-rose-800 dark:text-rose-300 truncate">
                      {fullName(dupPatient)}
                    </p>
                  </div>
                </div>
              )}

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={keepSearch}
                  onChange={(e) => setKeepSearch(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                />
              </div>

              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                {isLoadingPatients ? (
                  <p className="p-4 text-center text-sm text-slate-500">
                    Loading...
                  </p>
                ) : filteredForKeep.length === 0 ? (
                  <p className="p-4 text-center text-sm text-slate-500">
                    No other patients found.
                  </p>
                ) : (
                  filteredForKeep.map((p) => (
                    <PatientRow
                      key={p.id}
                      patient={p}
                      isSelected={keepPatient?.id === p.id}
                      onClick={() => setKeepPatient(p)}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: Confirm ── */}
          {!mergeResult && step === 3 && (
            <div className="p-5 space-y-4">
              {/* Side-by-side patient cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* Duplicate card */}
                <div className="p-4 rounded-2xl border-2 border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20 space-y-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-600 dark:text-rose-400">
                      Will Be Deleted
                    </span>
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                      {fullName(dupPatient!)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {dupPatient!.phone || "No phone"} ·{" "}
                      {dupPatient!.gender || "—"} · DOB:{" "}
                      {dupPatient!.dob || "—"}
                    </p>
                    {dupPatient?.medical_alerts && (
                      <p className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold mt-1 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        {dupPatient.medical_alerts}
                      </p>
                    )}
                  </div>
                  {isLoadingStats ? (
                    <p className="text-[11px] text-slate-400">
                      Loading stats...
                    </p>
                  ) : dupStats ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: "Appts", val: dupStats.appointments },
                        { label: "Treats", val: dupStats.treatments },
                        { label: "Bills", val: dupStats.bills },
                        { label: "Docs", val: dupStats.documents },
                      ].map(({ label, val }) => (
                        <div
                          key={label}
                          className="text-center py-1 rounded-lg bg-rose-100 dark:bg-rose-950/60"
                        >
                          <p className="text-sm font-extrabold font-mono text-rose-700 dark:text-rose-300">
                            {val}
                          </p>
                          <p className="text-[9px] text-rose-600 dark:text-rose-400 font-semibold">
                            {label}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Arrow */}
                <div className="col-span-2 flex items-center justify-center -my-1">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
                    <span className="text-rose-500">Duplicate</span>
                    <ArrowRight className="w-4 h-4" />
                    <span className="text-emerald-600">Merged into Canonical</span>
                  </div>
                </div>

                {/* Canonical card */}
                <div className="col-span-2 p-4 rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                      Canonical — Will Be Kept & All Records Moved Here
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                        {fullName(keepPatient!)}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {keepPatient!.phone || "No phone"} ·{" "}
                        {keepPatient!.gender || "—"} · DOB:{" "}
                        {keepPatient!.dob || "—"}
                      </p>
                    </div>
                    {isLoadingStats ? (
                      <p className="text-[11px] text-slate-400">
                        Loading...
                      </p>
                    ) : keepStats ? (
                      <div className="grid grid-cols-4 gap-1.5 shrink-0">
                        {[
                          { label: "Appts", val: keepStats.appointments },
                          { label: "Treats", val: keepStats.treatments },
                          { label: "Bills", val: keepStats.bills },
                          { label: "Docs", val: keepStats.documents },
                        ].map(({ label, val }) => (
                          <div
                            key={label}
                            className="text-center py-1 px-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60"
                          >
                            <p className="text-sm font-extrabold font-mono text-emerald-700 dark:text-emerald-300">
                              {val}
                            </p>
                            <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              {label}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Danger zone */}
              <div className="p-4 rounded-2xl bg-slate-950 dark:bg-black border border-rose-500/30 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-rose-400">
                      This action is permanent and cannot be undone.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      The patient record{" "}
                      <strong className="text-rose-400">
                        "{fullName(dupPatient!)}"
                      </strong>{" "}
                      will be permanently deleted. All their appointments,
                      treatments, bills, and documents will be reassigned to{" "}
                      <strong className="text-emerald-400">
                        "{fullName(keepPatient!)}"
                      </strong>
                      .
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Type{" "}
                    <code className="text-rose-400 font-mono">
                      {CONFIRM_PHRASE}
                    </code>{" "}
                    to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) =>
                      setConfirmText(e.target.value.toUpperCase())
                    }
                    placeholder="Type MERGE here"
                    className="mt-1.5 w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm font-bold font-mono text-rose-400 placeholder-slate-600 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!mergeResult && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <button
              onClick={() => {
                if (step === 1) onClose();
                else setStep((s) => (s - 1) as 1 | 2 | 3);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              {step === 1 ? "Cancel" : "Back"}
            </button>

            {step === 1 && (
              <button
                disabled={!dupPatient}
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
              >
                Next: Select Correct Patient
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 2 && (
              <button
                disabled={!keepPatient}
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
              >
                Review & Confirm
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <button
                disabled={
                  confirmText !== CONFIRM_PHRASE || isMerging || isLoadingStats
                }
                onClick={handleMerge}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm shadow-rose-500/20"
              >
                <Merge className="w-4 h-4" />
                {isMerging ? "Merging..." : "Confirm Permanent Merge"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
