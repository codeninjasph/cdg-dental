"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/clinic-context";
import {
  Patient,
  ToothRecord,
  Treatment,
  TreatmentBill,
  PaymentLog,
  PatientDocument,
} from "@/types/dental";
import { ToothChart } from "@/components/dental/tooth-chart";
import { MedicalAlertBanner } from "@/components/patients/medical-alert-banner";
import { AddTreatmentModal } from "@/components/patients/add-treatment-modal";
import { PaymentModal } from "@/components/billing/payment-modal";
import { AppointmentModal } from "@/components/appointments/appointment-modal";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  FileText,
  Plus,
  Phone,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  QrCode,
  ShieldAlert,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";

import { Suspense } from "react";

function PatientDetailPageContent() {
  const params = useParams();
  const patientId = params.id as string;
  const router = useRouter();
  const { currentRole, showToast, refreshTrigger, triggerRefresh } = useClinic();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [toothRecords, setToothRecords] = useState<ToothRecord[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [activeTab, setActiveTab] = useState<"chart" | "treatments" | "billing" | "documents">("chart");
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [paymentBill, setPaymentBill] = useState<any | null>(null);

  const supabase = createClient();

  const loadPatientData = async () => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      // 1. Patient profile
      const { data: pat } = await supabase.from("patients").select("*").eq("id", patientId).single();
      if (pat) setPatient(pat);

      // 2. Tooth chart
      const { data: teeth } = await supabase
        .from("patient_tooth_chart")
        .select("*")
        .eq("patient_id", patientId)
        .order("tooth_number");
      if (teeth) setToothRecords(teeth);

      // 3. Treatments
      const { data: treats } = await supabase
        .from("treatments")
        .select("*, dentist:profiles(id, full_name)")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (treats) setTreatments(treats);

      // 4. Bills with payment logs
      const { data: billData } = await supabase
        .from("treatment_bills")
        .select(`
          *,
          payments:payment_logs(*)
        `)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (billData) setBills(billData);

      // 5. Patient documents / X-rays
      const { data: docs } = await supabase
        .from("patient_documents")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (docs) setDocuments(docs);
    } catch (err) {
      console.error("Error loading patient 360:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatientData();
  }, [patientId, refreshTrigger]);

  // Tooth update handler
  const handleUpdateToothRecord = async (record: ToothRecord) => {
    try {
      const { error } = await supabase.from("patient_tooth_chart").upsert(
        {
          patient_id: patientId,
          tooth_number: record.tooth_number,
          status: record.status,
          surface: record.surface || null,
          notes: record.notes || null,
          last_updated: new Date().toISOString(),
        },
        { onConflict: "patient_id, tooth_number" }
      );

      if (error) throw error;

      // Optimistic state update
      setToothRecords((prev) => {
        const idx = prev.findIndex((r) => r.tooth_number === record.tooth_number);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...record };
          return updated;
        }
        return [...prev, record];
      });

      showToast(`Tooth #${record.tooth_number} updated to ${record.status.toUpperCase()}!`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to update tooth record.", "error");
    }
  };

  if (isLoading && !patient) {
    return (
      <div className="p-12 text-center text-slate-500">
        Loading patient electronic record...
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-slate-500">Patient not found or removed.</p>
        <Link href="/patients" className="text-teal-600 font-semibold hover:underline">
          Back to Patient Directory
        </Link>
      </div>
    );
  }

  // Calculate financial totals for this patient
  const totalBilled = bills.reduce((sum, b) => sum + Number(b.net_amount), 0);
  const totalPaid = bills.reduce(
    (sum, b) =>
      sum +
      (b.payments
        ? b.payments.reduce((pSum: number, p: any) => pSum + Number(p.amount_logged), 0)
        : 0),
    0
  );
  const balanceDue = Math.max(0, totalBilled - totalPaid);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/patients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Patients Directory</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsApptModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs"
          >
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            <span>Book Visit</span>
          </button>
          <button
            onClick={() => setIsTreatmentModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Treatment</span>
          </button>
        </div>
      </div>

      {/* PATIENT 360 PROFILE HEADER */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white flex items-center justify-center font-extrabold text-xl shadow-md">
              {patient.first_name[0]}
              {patient.last_name[0]}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {patient.first_name} {patient.last_name}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  ID: #{patient.id.slice(0, 8)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                {patient.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {patient.phone}
                  </span>
                )}
                {patient.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {patient.email}
                  </span>
                )}
                {patient.address && (
                  <span className="flex items-center gap-1 truncate max-w-xs">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {patient.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Patient Financial Snapshot */}
          <div className="flex items-center gap-3 self-start lg:self-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="px-3 border-r border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Billed</span>
              <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">
                ₱{totalBilled.toLocaleString()}
              </span>
            </div>
            <div className="px-3 border-r border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block">Total Paid</span>
              <span className="text-sm font-mono font-bold text-emerald-600">
                ₱{totalPaid.toLocaleString()}
              </span>
            </div>
            <div className="px-3">
              <span className="text-[10px] uppercase font-bold text-rose-600 block">Balance Due</span>
              <span className="text-sm font-mono font-extrabold text-rose-600">
                ₱{balanceDue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* HIGH-PRIORITY MEDICAL ALERTS BANNER */}
        <MedicalAlertBanner alerts={patient.medical_alerts} />
      </div>

      {/* NAVIGATION TABS */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab("chart")}
            className={`py-3 px-1 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "chart"
                ? "border-teal-600 text-teal-600 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>32-Tooth Odontogram</span>
          </button>
          <button
            onClick={() => setActiveTab("treatments")}
            className={`py-3 px-1 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "treatments"
                ? "border-teal-600 text-teal-600 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Clinical Treatments ({treatments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`py-3 px-1 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "billing"
                ? "border-teal-600 text-teal-600 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Invoices & Billing ({bills.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`py-3 px-1 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "documents"
                ? "border-teal-600 text-teal-600 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>X-Rays & Files</span>
          </button>
        </nav>
      </div>

      {/* TAB CONTENT 1: ODONTOGRAM CHART */}
      {activeTab === "chart" && (
        <div className="space-y-4">
          <ToothChart
            patientId={patientId}
            records={toothRecords}
            onUpdateRecord={handleUpdateToothRecord}
          />
        </div>
      )}

      {/* TAB CONTENT 2: TREATMENTS */}
      {activeTab === "treatments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Treatment Procedure History
            </h3>
            <button
              onClick={() => setIsTreatmentModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Procedure</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            {treatments.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No treatment procedures recorded for this patient yet. Click "Record Procedure" above.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {treatments.map((t) => (
                  <div key={t.id} className="p-4 sm:p-5 flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {t.procedure_name}
                        </span>
                        {t.tooth_number ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                            Tooth #{t.tooth_number}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            General / Full Mouth
                          </span>
                        )}
                      </div>

                      {t.clinical_notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                          {t.clinical_notes}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>Attending: {t.dentist?.full_name || "Doctor"}</span>
                        <span>•</span>
                        <span>{new Date(t.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-bold font-mono text-teal-600 dark:text-teal-400">
                        ₱{Number(t.cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: BILLING & INVOICES */}
      {activeTab === "billing" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Financial Invoices & Payment Ledger
            </h3>
          </div>

          <div className="space-y-3">
            {bills.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                No invoices issued for this patient yet.
              </div>
            ) : (
              bills.map((b) => {
                const totalPaidOnBill = b.payments
                  ? b.payments.reduce((sum: number, p: any) => sum + Number(p.amount_logged), 0)
                  : 0;
                const bal = Math.max(0, Number(b.net_amount) - totalPaidOnBill);

                const statusStyles: Record<string, string> = {
                  unpaid: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border-rose-200",
                  partially_paid: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border-amber-200",
                  fully_paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-200",
                };

                return (
                  <div
                    key={b.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
                            {b.invoice_number}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${
                              statusStyles[b.status] || "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {b.status.replace("_", " ")}
                          </span>
                        </div>
                        {b.notes && <p className="text-xs text-slate-500 mt-0.5">{b.notes}</p>}
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-slate-400 block">Net Due</span>
                          <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                            ₱{Number(b.net_amount).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Total Paid</span>
                          <span className="font-bold font-mono text-emerald-600">
                            ₱{totalPaidOnBill.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Remaining</span>
                          <span className="font-bold font-mono text-rose-600">
                            ₱{bal.toLocaleString()}
                          </span>
                        </div>

                        {bal > 0 && (
                          <button
                            onClick={() =>
                              setPaymentBill({
                                id: b.id,
                                invoice_number: b.invoice_number,
                                patient_name: `${patient.first_name} ${patient.last_name}`,
                                net_amount: Number(b.net_amount),
                                total_paid: totalPaidOnBill,
                                balance_due: bal,
                              })
                            }
                            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Pay POS</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Payment Logs for this bill */}
                    {b.payments && b.payments.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                          Payment Transactions Logged:
                        </span>
                        <div className="space-y-1.5">
                          {b.payments.map((p: any) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="font-semibold uppercase text-slate-700 dark:text-slate-300">
                                  {p.payment_method}
                                </span>
                                {p.reference_number && (
                                  <span className="text-slate-400 font-mono text-[11px]">
                                    (Ref: {p.reference_number})
                                  </span>
                                )}
                              </div>
                              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                                ₱{Number(p.amount_logged).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: DOCUMENTS & X-RAYS */}
      {activeTab === "documents" && (
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center mx-auto">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            Digital Radiographs & Patient Files Vault
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Supabase Storage integrated bucket for periapical x-rays, panoramic radiographs, and signed clinical consent forms.
          </p>
        </div>
      )}

      {/* Modals */}
      <AddTreatmentModal
        isOpen={isTreatmentModalOpen}
        onClose={() => setIsTreatmentModalOpen(false)}
        onSuccess={triggerRefresh}
        patientId={patientId}
      />

      <AppointmentModal
        isOpen={isApptModalOpen}
        onClose={() => setIsApptModalOpen(false)}
        onSuccess={triggerRefresh}
        initialPatientId={patientId}
      />

      <PaymentModal
        isOpen={paymentBill !== null}
        onClose={() => setPaymentBill(null)}
        onSuccess={triggerRefresh}
        bill={paymentBill}
      />
    </div>
  );
}

export default function PatientDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 text-xs">Loading patient record...</div>}>
      <PatientDetailPageContent />
    </Suspense>
  );
}
