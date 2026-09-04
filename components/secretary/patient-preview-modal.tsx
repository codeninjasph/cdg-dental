"use client";

import React, { useState, useEffect } from "react";
import { Patient, ToothRecord, Treatment, TreatmentBill } from "@/types/dental";
import { createClient } from "@/lib/supabase/client";
import { ToothChart } from "@/components/dental/tooth-chart";
import { MedicalAlertBanner } from "@/components/patients/medical-alert-banner";
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertTriangle,
  Stethoscope,
  Receipt,
  FileText,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";

interface PatientPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string | null;
  onOpenCreateBill?: (patientId: string) => void;
  onOpenApptModal?: (patientId: string) => void;
}

export function PatientPreviewModal({
  isOpen,
  onClose,
  patientId,
  onOpenCreateBill,
  onOpenApptModal,
}: PatientPreviewModalProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [toothRecords, setToothRecords] = useState<ToothRecord[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"info" | "treatments" | "chart" | "bills">("info");
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      if (!patientId) return;
      setIsLoading(true);
      try {
        // Patient profile
        const { data: p } = await supabase.from("patients").select("*").eq("id", patientId).single();
        if (p) setPatient(p);

        // Tooth chart
        const { data: tData } = await supabase
          .from("patient_tooth_chart")
          .select("*")
          .eq("patient_id", patientId)
          .order("tooth_number");
        if (tData) setToothRecords(tData);

        // Treatments (Read-only for secretary)
        const { data: trData } = await supabase
          .from("treatments")
          .select("*, dentist:profiles(full_name)")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false });
        if (trData) setTreatments(trData);

        // Bills
        const { data: bData } = await supabase
          .from("treatment_bills")
          .select(`
            *,
            payments:payment_logs(*)
          `)
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false });
        if (bData) setBills(bData);
      } catch (err) {
        console.error("Failed to load patient preview:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (isOpen && patientId) {
      loadData();
      setActiveTab("info");
    }
  }, [isOpen, patientId]);

  if (!isOpen || !patientId) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-sm">
              {patient?.first_name?.[0]}
              {patient?.last_name?.[0]}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                {patient ? `${patient.last_name}, ${patient.first_name}` : "Patient File"}
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-normal">
                  Secretary View
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Front-desk chart preview • RLS-enforced clinical boundaries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Medical Alert Banner if any */}
        {patient && (
          <div className="px-6 pt-4">
            <MedicalAlertBanner alerts={patient.medical_alerts} />
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("info")}
            className={`pb-2.5 px-1 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "info"
                ? "border-teal-500 text-teal-600 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Intake Profile</span>
          </button>
          <button
            onClick={() => setActiveTab("treatments")}
            className={`pb-2.5 px-1 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "treatments"
                ? "border-teal-500 text-teal-600 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Procedures ({treatments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("bills")}
            className={`pb-2.5 px-1 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "bills"
                ? "border-teal-500 text-teal-600 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Billing History ({bills.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("chart")}
            className={`pb-2.5 px-1 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "chart"
                ? "border-teal-500 text-teal-600 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Odontogram (Read-Only)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">Loading patient records...</div>
          ) : (
            <>
              {/* TAB 1: Intake Profile */}
              {activeTab === "info" && patient && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        Contact Details
                      </span>
                      <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{patient.phone || "No phone recorded"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{patient.email || "No email recorded"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{patient.address || "No address"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        Demographics & Emergency Contact
                      </span>
                      <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                        <div>
                          <span className="text-slate-500">DOB:</span>{" "}
                          <strong>{patient.dob || "Not specified"}</strong> ({patient.gender || "Gender unlisted"})
                        </div>
                        <div>
                          <span className="text-slate-500">Emergency Contact:</span>{" "}
                          <strong>{patient.emergency_contact_name || "None listed"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Emergency Phone:</span>{" "}
                          <strong>{patient.emergency_contact_phone || "N/A"}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Buttons for Secretary */}
                  <div className="flex flex-wrap gap-2.5 pt-2">
                    {onOpenApptModal && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenApptModal(patient.id);
                        }}
                        className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                      >
                        Book New Appointment
                      </button>
                    )}
                    {onOpenCreateBill && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenCreateBill(patient.id);
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                      >
                        Issue New Invoice
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Treatments History (Read-Only) */}
              {activeTab === "treatments" && (
                <div className="space-y-3">
                  {/* RLS Notice Banner */}
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center gap-2.5 text-amber-800 dark:text-amber-200 text-xs">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Database RLS Policy:</strong> Only licensed dentists and administrators have permission to log clinical procedures. Secretaries can view treatment charges for accurate cashier billing.
                    </span>
                  </div>

                  {treatments.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">No procedures logged yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {treatments.map((tr) => (
                        <div
                          key={tr.id}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 flex items-center justify-between"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {tr.procedure_name}
                              </span>
                              {tr.tooth_number && (
                                <span className="px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-mono text-[10px] font-bold">
                                  Tooth #{tr.tooth_number}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {new Date(tr.created_at).toLocaleDateString()} • Dr.{" "}
                              {tr.dentist?.full_name || "Doctor"}
                            </p>
                            {tr.clinical_notes && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                                "{tr.clinical_notes}"
                              </p>
                            )}
                          </div>
                          <div className="text-right font-mono font-bold text-teal-700 dark:text-teal-300 text-sm">
                            ₱{Number(tr.cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Billing History */}
              {activeTab === "bills" && (
                <div className="space-y-3">
                  {bills.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">No invoices on file.</div>
                  ) : (
                    <div className="space-y-2">
                      {bills.map((b) => {
                        const paidTotal = (b.payments || []).reduce(
                          (sum: number, p: any) => sum + Number(p.amount_logged || 0),
                          0
                        );
                        const due = Math.max(0, Number(b.net_amount) - paidTotal);
                        return (
                          <div
                            key={b.id}
                            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 flex items-center justify-between"
                          >
                            <div>
                              <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                                {b.invoice_number}
                              </span>
                              <span
                                className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  due <= 0
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                }`}
                              >
                                {b.status}
                              </span>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {new Date(b.created_at).toLocaleDateString()} • Net: ₱
                                {Number(b.net_amount).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] text-slate-400 block">Balance Due:</span>
                              <span
                                className={`font-mono font-bold text-sm ${
                                  due <= 0 ? "text-emerald-600" : "text-rose-600"
                                }`}
                              >
                                ₱{due.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Odontogram (Read-Only) */}
              {activeTab === "chart" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center gap-2.5 text-blue-800 dark:text-blue-200 text-xs">
                    <Lock className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      <strong>Read-Only Odontogram View:</strong> In accordance with clinic permissions, tooth chart modifications are reserved for attending dentists.
                    </span>
                  </div>

                  <div className="overflow-x-auto p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <ToothChart
                      patientId={patientId}
                      records={toothRecords}
                      onUpdateRecord={async () => {}}
                      readOnly={true}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  </ModalPortal>
  );
}
