"use client";

import React, { useState, useEffect } from "react";
import { Patient, Appointment, InstallmentPlanType, InstallmentPreferredSchedule } from "@/types/dental";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/clinic-context";
import {
  X,
  Receipt,
  Calculator,
  Calendar,
  User,
  Tag,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  Repeat,
  CalendarClock,
  Check,
  ShieldCheck,
} from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";

interface CreateBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedPatientId?: string;
  preselectedAppointmentId?: string;
}

const PACKAGE_PRESETS: Record<
  InstallmentPlanType,
  {
    name: string;
    description: string;
    defaultTotal: number;
    defaultDownpayment: number;
    defaultInstallment: number;
    defaultInstallments: number;
    frequency: "per_visit" | "monthly" | "milestone";
  }
> = {
  orthodontics: {
    name: "Orthodontics (Braces / Aligners)",
    description: "Standard orthodontic package with bonding deposit + monthly/per-visit adjustments.",
    defaultTotal: 45000,
    defaultDownpayment: 5000,
    defaultInstallment: 1500,
    defaultInstallments: 24,
    frequency: "per_visit",
  },
  implants: {
    name: "Dental Implants & Surgery",
    description: "Surgical fixture placement deposit followed by abutment & final crown milestone.",
    defaultTotal: 75000,
    defaultDownpayment: 35000,
    defaultInstallment: 40000,
    defaultInstallments: 2,
    frequency: "milestone",
  },
  prosthodontics: {
    name: "Prosthodontics (Dentures / Bridges)",
    description: "Impression & framework downpayment + delivery fitting milestone.",
    defaultTotal: 25000,
    defaultDownpayment: 10000,
    defaultInstallment: 15000,
    defaultInstallments: 2,
    frequency: "milestone",
  },
  general: {
    name: "Custom Installment Plan",
    description: "Flexible multi-payment treatment plan agreed upon with patient.",
    defaultTotal: 30000,
    defaultDownpayment: 5000,
    defaultInstallment: 2500,
    defaultInstallments: 10,
    frequency: "per_visit",
  },
};

const TIME_OPTIONS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30"
];

function format12Hour(time24: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export function CreateBillModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedPatientId,
  preselectedAppointmentId,
}: CreateBillModalProps) {
  const { showToast, activeBranch, currentStaff, staffList } = useClinic();
  const dentists = staffList.filter((s) => s.role === "dentist" || s.role === "admin");

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState(preselectedPatientId || "");
  const [dentistId, setDentistId] = useState<string>("");
  const [appointmentId, setAppointmentId] = useState(preselectedAppointmentId || "");
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  
  // Pending Unbilled Treatments from Operatory
  const [pendingTreatments, setPendingTreatments] = useState<any[]>([]);
  const [selectedTreatmentIds, setSelectedTreatmentIds] = useState<string[]>([]);

  // Standard vs Installment Mode
  const [isInstallment, setIsInstallment] = useState(false);
  const [planType, setPlanType] = useState<InstallmentPlanType>("orthodontics");
  
  // Financial Amounts
  const [totalAmount, setTotalAmount] = useState<string>("0");
  const [discountAmount, setDiscountAmount] = useState<string>("0");
  const [discountType, setDiscountType] = useState<"none" | "senior" | "pwd" | "courtesy" | "promo" | "custom">("none");
  const [discountIdNumber, setDiscountIdNumber] = useState<string>("");
  const [discountIdCardholder, setDiscountIdCardholder] = useState<string>("");
  const [downpaymentAmount, setDownpaymentAmount] = useState<string>("5000");
  const [installmentAmount, setInstallmentAmount] = useState<string>("1500");
  const [totalInstallments, setTotalInstallments] = useState<number>(24);
  const [frequency, setFrequency] = useState<"per_visit" | "monthly" | "milestone">("per_visit");

  // Standing Preferred Schedule
  const [hasStandingSchedule, setHasStandingSchedule] = useState(false);
  const [standingDay, setStandingDay] = useState<"Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday">("Saturday");
  const [standingTiming, setStandingTiming] = useState<"1st_week" | "2nd_week" | "3rd_week" | "4th_week" | "every_4_weeks">("1st_week");
  const [standingTime, setStandingTime] = useState("10:00");

  const [dueDate, setDueDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  // Load patients and synchronize preselected states
  useEffect(() => {
    async function loadPatients() {
      const { data } = await supabase.from("patients").select("*").order("last_name");
      if (data) {
        setPatients(data);
        if (preselectedPatientId) {
          setPatientId(preselectedPatientId);
        } else if (!patientId && data.length > 0) {
          setPatientId(data[0].id);
        }
      }
    }
    if (isOpen) {
      if (preselectedPatientId) {
        setPatientId(preselectedPatientId);
      }
      if (preselectedAppointmentId) {
        setAppointmentId(preselectedAppointmentId);
      } else {
        setAppointmentId("");
      }
      setIsInstallment(false);
      loadPatients();
      const today = new Date().toISOString().split("T")[0];
      setDueDate(today);
      setErrorMessage(null);
    }
  }, [isOpen, preselectedPatientId, preselectedAppointmentId]);

  // Load patient appointments
  useEffect(() => {
    async function loadPatientAppts() {
      if (!patientId) {
        setPatientAppointments([]);
        return;
      }
      const { data } = await supabase
        .from("appointments")
        .select(`
          id, start_time, end_time, status, notes,
          dentist:profiles(id, full_name)
        `)
        .eq("patient_id", patientId)
        .order("start_time", { ascending: false });

      if (data) {
        setPatientAppointments(data as any[]);
        if (preselectedAppointmentId) {
          setAppointmentId(preselectedAppointmentId);
          const matchedAppt = data.find((a: any) => a.id === preselectedAppointmentId);
          if (matchedAppt && (matchedAppt as any).dentist?.id) {
            setDentistId((matchedAppt as any).dentist.id);
          }
        }
      }
    }
    if (patientId) {
      loadPatientAppts();
    }
  }, [patientId, preselectedAppointmentId]);

  // Load pending unbilled treatments for this patient
  useEffect(() => {
    async function loadPendingTreatments() {
      if (!patientId) {
        setPendingTreatments([]);
        setSelectedTreatmentIds([]);
        return;
      }
      const { data } = await supabase
        .from("treatments")
        .select("*, dentist:profiles(id, full_name)")
        .eq("patient_id", patientId)
        .eq("billing_status", "pending")
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        setPendingTreatments(data);
        const ids = data.map((t: any) => t.id);
        setSelectedTreatmentIds(ids);

        if (!isInstallment) {
          const sum = data.reduce((acc: number, t: any) => acc + Number(t.cost || 0), 0);
          setTotalAmount(String(sum));
          const summary = data
            .map((t: any) => `${t.procedure_name}${t.tooth_number ? ` (Tooth #${t.tooth_number})` : ""}`)
            .join(", ");
          setNotes(summary);
        }
        if (data[0]?.dentist_id) {
          setDentistId(data[0].dentist_id);
        }
      } else {
        setPendingTreatments([]);
        setSelectedTreatmentIds([]);
      }
    }
    if (isOpen && patientId) {
      loadPendingTreatments();
    }
  }, [isOpen, patientId, isInstallment]);

  // Apply preset values when selecting plan type
  const handleApplyPreset = (type: InstallmentPlanType) => {
    setPlanType(type);
    const preset = PACKAGE_PRESETS[type];
    setTotalAmount(String(preset.defaultTotal));
    setDiscountAmount("0");
    setDownpaymentAmount(String(preset.defaultDownpayment));
    setInstallmentAmount(String(preset.defaultInstallment));
    setTotalInstallments(preset.defaultInstallments);
    setFrequency(preset.frequency);
    setNotes(`${preset.name} treatment package`);
  };

  const handleToggleTreatment = (tId: string) => {
    setSelectedTreatmentIds((prev) => {
      const next = prev.includes(tId) ? prev.filter((id) => id !== tId) : [...prev, tId];
      if (!isInstallment) {
        const sum = pendingTreatments
          .filter((t) => next.includes(t.id))
          .reduce((acc, t) => acc + Number(t.cost || 0), 0);
        setTotalAmount(String(sum));
        const summary = pendingTreatments
          .filter((t) => next.includes(t.id))
          .map((t: any) => `${t.procedure_name}${t.tooth_number ? ` (Tooth #${t.tooth_number})` : ""}`)
          .join(", ");
        setNotes(summary);
      }
      return next;
    });
  };

  const handleApplyQuickDiscount = (
    rate: number,
    label: string,
    type: "senior" | "pwd" | "courtesy" | "promo" | "custom"
  ) => {
    const total = Math.max(0, Number(totalAmount) || 0);
    const disc = Math.round(total * rate);
    setDiscountAmount(String(disc));
    setDiscountType(type);

    if ((type === "senior" || type === "pwd") && !discountIdCardholder) {
      const p = patients.find((pat) => pat.id === patientId);
      if (p) {
        setDiscountIdCardholder(`${p.first_name} ${p.last_name}`.trim());
      }
    }

    showToast(`Applied ${label} (${(rate * 100).toFixed(0)}% off: ₱${disc.toLocaleString()})`, "info");
  };

  if (!isOpen) return null;

  const numTotal = Math.max(0, Number(totalAmount) || 0);
  const numDiscount = Math.max(0, Number(discountAmount) || 0);
  const calculatedNet = Math.max(0, numTotal - numDiscount);
  const numDownpayment = Math.max(0, Number(downpaymentAmount) || 0);
  const numInstallment = Math.max(0, Number(installmentAmount) || 0);
  const remainingAfterDownpayment = Math.max(0, calculatedNet - numDownpayment);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      setErrorMessage("Please select a patient.");
      return;
    }
    if (numTotal <= 0) {
      setErrorMessage("Total treatment amount must be greater than ₱0.00.");
      return;
    }
    if (numDiscount > numTotal) {
      setErrorMessage("Discount amount cannot exceed total amount.");
      return;
    }
    if (isInstallment && numDownpayment > calculatedNet) {
      setErrorMessage("Initial down payment cannot exceed net package amount.");
      return;
    }

    // Strict Philippine Statutory Discount Validation (RA 9994 / RA 10754)
    if (numDiscount > 0 && (discountType === "senior" || discountType === "pwd")) {
      if (!discountIdNumber.trim()) {
        setErrorMessage(
          `Tax Compliance Error: ${discountType === "senior" ? "Senior Citizen OSCA ID" : "PWD ID"} number is strictly required for official receipts under Philippine Tax Regulations (RA 9994 / RA 10754).`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Build statutory discount metadata
      const statutoryDiscountMeta =
        numDiscount > 0 && (discountType === "senior" || discountType === "pwd")
          ? {
              type: discountType,
              id_number: discountIdNumber.trim(),
              cardholder_name: discountIdCardholder.trim() || undefined,
              statutory_act: discountType === "senior" ? "RA 9994" : "RA 10754",
              rate_percentage: 20,
              discount_amount: numDiscount,
            }
          : null;

      let preferredScheduleObj: any = null;
      if (isInstallment && hasStandingSchedule) {
        preferredScheduleObj = {
          standing_day: standingDay,
          timing: standingTiming,
          preferred_time: standingTime,
          notes: `${standingTiming.replace("_", " ")} ${standingDay} at ${format12Hour(standingTime)}`,
        };
      }

      if (statutoryDiscountMeta) {
        if (!preferredScheduleObj) preferredScheduleObj = {};
        preferredScheduleObj.statutory_discount = statutoryDiscountMeta;
      }

      // Prepend structured compliance tag into notes for audit & official receipt lookup
      let finalNotes = notes.trim();
      if (statutoryDiscountMeta) {
        const complianceTag = `[STATUTORY DISCOUNT: ${
          discountType === "senior" ? "SENIOR CITIZEN (RA 9994)" : "PWD (RA 10754)"
        } | ID: ${discountIdNumber.trim()}${
          discountIdCardholder ? ` | CARDHOLDER: ${discountIdCardholder.trim()}` : ""
        }]`;
        finalNotes = finalNotes ? `${complianceTag}\n${finalNotes}` : complianceTag;
      }

      const effectiveDentistId = dentistId || dentists[0]?.id || null;

      const insertPayload: any = {
        patient_id: patientId,
        branch_id: activeBranch?.id || currentStaff?.branch_id || null,
        dentist_id: effectiveDentistId,
        total_amount: numTotal,
        discount_amount: numDiscount,
        status: "unpaid",
        due_date: dueDate || null,
        notes: finalNotes || null,
        is_installment: isInstallment,
        plan_type: isInstallment ? planType : null,
        downpayment_amount: isInstallment ? numDownpayment : 0,
        installment_amount: isInstallment ? numInstallment : 0,
        total_installments: isInstallment ? totalInstallments : 1,
        frequency: isInstallment ? frequency : "per_visit",
        preferred_schedule: preferredScheduleObj,
      };

      if (appointmentId && appointmentId !== "none") {
        insertPayload.appointment_id = appointmentId;
      }

      const { data, error } = await supabase
        .from("treatment_bills")
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;

      // Update included treatments to billed status and link to this invoice
      const treatmentsToUpdate =
        selectedTreatmentIds.length > 0
          ? selectedTreatmentIds
          : pendingTreatments.map((t: any) => t.id);

      if (treatmentsToUpdate.length > 0 && data?.id) {
        const { error: tErr } = await supabase
          .from("treatments")
          .update({ bill_id: data.id, billing_status: "billed" })
          .in("id", treatmentsToUpdate);
        if (tErr) {
          console.error("Warning updating treatment billing status:", tErr);
        }
      }

      // Log to immutable audit trail
      const pat = patients.find((p) => p.id === patientId);
      const patientName = pat ? `${pat.first_name} ${pat.last_name}` : "Patient";
      fetch("/api/admin/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorId: currentStaff?.id || null,
          actorName: currentStaff?.full_name || "Secretary",
          actorRole: currentStaff?.role || "secretary",
          actionCategory: "billing",
          actionType: numDiscount > 0 ? "DISCOUNT_APPLIED" : "BILL_CREATED",
          entityType: "treatment_bill",
          entityId: data.id,
          description: `Generated invoice #${data.invoice_number || data.id} for ${patientName} (Gross: ₱${numTotal.toLocaleString()}, Net: ₱${calculatedNet.toLocaleString()})${
            statutoryDiscountMeta
              ? ` with 20% Statutory Discount (${statutoryDiscountMeta.statutory_act}, ID: ${statutoryDiscountMeta.id_number})`
              : numDiscount > 0
              ? ` with ₱${numDiscount.toLocaleString()} discount`
              : ""
          }.`,
          metadata: {
            bill_id: data.id,
            invoice_number: data.invoice_number,
            patient_id: patientId,
            patient_name: patientName,
            total_amount: numTotal,
            discount_amount: numDiscount,
            net_amount: calculatedNet,
            is_installment: isInstallment,
            statutory_discount: statutoryDiscountMeta,
          },
          branchName: activeBranch?.name || "Main Clinic Hub",
        }),
      }).catch(() => {});

      showToast(
        isInstallment
          ? `${PACKAGE_PRESETS[planType].name} package created for ₱${calculatedNet.toLocaleString()}!`
          : `Invoice ${data.invoice_number || "created"} generated for ₱${calculatedNet.toLocaleString()}!`,
        "success"
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to create invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[94vh] sm:max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  {isInstallment ? "Create Treatment Installment Package" : "Generate Patient Invoice"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                  {isInstallment
                    ? "Configure orthodontic, implant, or prosthodontic payment plan"
                    : "Front-desk cashier billing & official invoice issuance"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2 text-rose-800 dark:text-rose-200 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Bill Type Selector: Standard vs Installment Package */}
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100 block text-xs">
                  Invoice Billing Mode
                </span>
                <span className="text-[11px] text-slate-500">
                  {isInstallment
                    ? "Installment Package: Downpayment + recurring adjustment visits"
                    : "One-Time Bill: Standard single visit or immediate procedure settlement"}
                </span>
              </div>
              <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsInstallment(false)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    !isInstallment
                      ? "bg-teal-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Standard Invoice
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsInstallment(true);
                    if (Number(totalAmount) <= 0) {
                      handleApplyPreset("orthodontics");
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                    isInstallment
                      ? "bg-teal-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Installment Package</span>
                </button>
              </div>
            </div>

            {/* If Installment Mode: Package Presets */}
            {isInstallment && (
              <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/60 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    Clinical Installment Preset
                  </span>
                  <span className="text-[10px] text-teal-700 dark:text-teal-300 font-mono">
                    Select to auto-fill terms
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(PACKAGE_PRESETS) as InstallmentPlanType[]).map((type) => {
                    const preset = PACKAGE_PRESETS[type];
                    const isSelected = planType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleApplyPreset(type)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-white dark:bg-slate-900 border-teal-600 text-teal-900 dark:text-teal-100 shadow-sm ring-1 ring-teal-500"
                            : "bg-white/60 dark:bg-slate-900/40 border-teal-200/60 dark:border-teal-800/40 text-slate-700 dark:text-slate-300 hover:bg-white"
                        }`}
                      >
                        <div className="font-bold text-[11px] truncate">{preset.name.split(" ")[0]}</div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          ₱{(preset.defaultTotal / 1000).toFixed(0)}k total
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Patient Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Patient Account *
              </label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="">Select Patient...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.last_name}, {p.first_name} {p.phone ? `(${p.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Attending Dentist Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-600" />
                Attending Dentist (Production Attribution) *
              </label>
              <select
                value={dentistId}
                onChange={(e) => setDentistId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="">Select Doctor...</option>
                {dentists.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} ({d.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Associated Appointment (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Link to Initial Consultation / Bonding Appointment (Optional)
              </label>
              <select
                value={appointmentId}
                onChange={(e) => setAppointmentId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="none">Standalone Package (No Appointment Linked)</option>
                {patientAppointments.map((appt: any) => (
                  <option key={appt.id} value={appt.id}>
                    {new Date(appt.start_time).toLocaleDateString()} at{" "}
                    {new Date(appt.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} —{" "}
                    {appt.dentist?.full_name || "Doctor"} ({appt.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Pending Completed Treatments from Chairside Operatory */}
            {pendingTreatments.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    Unbilled Completed Treatments ({pendingTreatments.length})
                  </span>
                  <span className="text-[10px] text-teal-700 dark:text-teal-300 font-medium">
                    Select procedures to bundle into this invoice
                  </span>
                </div>

                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {pendingTreatments.map((t) => {
                    const isChecked = selectedTreatmentIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? "bg-white dark:bg-slate-900 border-teal-500 shadow-2xs"
                            : "bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleTreatment(t.id)}
                            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {t.procedure_name}
                            </span>
                            {t.tooth_number && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                                Tooth #{t.tooth_number}
                              </span>
                            )}
                            {t.dentist?.full_name && (
                              <span className="block text-[10px] text-slate-500">
                                Performed by Dr. {t.dentist.full_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-mono font-bold text-teal-700 dark:text-teal-300">
                          ₱{Number(t.cost || 0).toLocaleString()}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Total Fee & Discount */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isInstallment ? "Total Package Contract (₱) *" : "Total Treatment Fee (₱) *"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" />
                    Discount / Voucher (₱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 1-Click Quick Statutory & Clinic Discount Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] font-semibold text-slate-400 mr-1">Quick Discounts:</span>
                <button
                  type="button"
                  onClick={() => handleApplyQuickDiscount(0.20, "Senior Citizen (RA 9994)", "senior")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-colors ${
                    discountType === "senior" && Number(discountAmount) > 0
                      ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                      : "border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 hover:bg-purple-100"
                  }`}
                >
                  🇵🇭 Senior Citizen (20%)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyQuickDiscount(0.20, "PWD (RA 10754)", "pwd")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-colors ${
                    discountType === "pwd" && Number(discountAmount) > 0
                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                      : "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100"
                  }`}
                >
                  ♿ PWD (20%)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyQuickDiscount(0.10, "Courtesy / Family", "courtesy")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-colors ${
                    discountType === "courtesy" && Number(discountAmount) > 0
                      ? "bg-teal-600 text-white border-teal-600 shadow-2xs"
                      : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  👥 Courtesy (10%)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyQuickDiscount(0.05, "Promo Special", "promo")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-colors ${
                    discountType === "promo" && Number(discountAmount) > 0
                      ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                      : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
                  }`}
                >
                  🏷️ Promo (5%)
                </button>
                {Number(discountAmount) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountAmount("0");
                      setDiscountType("none");
                      setDiscountIdNumber("");
                      setDiscountIdCardholder("");
                    }}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer transition-colors"
                  >
                    Clear Discount
                  </button>
                )}
              </div>

              {/* Philippine Statutory Tax Compliance Card (Required for Senior/PWD) */}
              {Number(discountAmount) > 0 && (discountType === "senior" || discountType === "pwd") && (
                <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      Statutory Tax Exemption Compliance ({discountType === "senior" ? "RA 9994 OSCA" : "RA 10754 PWD"})
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-200/80 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300">
                      Mandatory for Audit
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-1">
                        {discountType === "senior" ? "OSCA Senior Citizen ID #" : "Official PWD ID #"}{" "}
                        <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={discountIdNumber}
                        onChange={(e) => setDiscountIdNumber(e.target.value)}
                        placeholder={
                          discountType === "senior"
                            ? "e.g. OSCA-2024-99120"
                            : "e.g. PWD-04-123456"
                        }
                        required
                        className="w-full px-3 py-1.5 rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-purple-900 dark:text-purple-200">
                        Cardholder Full Name
                      </label>
                      <input
                        type="text"
                        value={discountIdCardholder}
                        onChange={(e) => setDiscountIdCardholder(e.target.value)}
                        placeholder="Registered Name on ID Card"
                        className="w-full px-3 py-1.5 rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-purple-800 dark:text-purple-300/80 leading-relaxed">
                    Under BIR Revenue Regulations & RA 9994/10754, recording the official government ID number is strictly required to claim the 20% statutory deduction and VAT exemption on official dental receipts.
                  </p>
                </div>
              )}
            </div>

            {/* Installment Breakdown Controls */}
            {isInstallment && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs">
                  <Layers className="w-4 h-4 text-teal-600" />
                  <span>Installment Payment Schedule & Terms</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Downpayment Deposit (₱)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={downpaymentAmount}
                      onChange={(e) => setDownpaymentAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Per Adjustment Visit (₱)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={installmentAmount}
                      onChange={(e) => setInstallmentAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Total Expected Visits
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={totalInstallments}
                      onChange={(e) => setTotalInstallments(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Live Installment Calculation Summary */}
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Initial Deposit:</span>
                    <strong className="text-slate-900 dark:text-slate-100 font-mono">
                      ₱{numDownpayment.toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Remaining Balance:</span>
                    <strong className="text-rose-600 dark:text-rose-400 font-mono">
                      ₱{remainingAfterDownpayment.toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Adjustment Schedule:</span>
                    <strong className="text-teal-700 dark:text-teal-300 font-mono">
                      {totalInstallments} visits × ₱{numInstallment.toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Hybrid Feature: Standing Preferred Slot for Recalls */}
            {isInstallment && (
              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasStandingSchedule}
                      onChange={(e) => setHasStandingSchedule(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                    />
                    <span className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
                      <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                      Patient Has Standing Preferred Schedule
                    </span>
                  </label>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300">
                    Auto-suggests during monthly recall
                  </span>
                </div>

                {hasStandingSchedule && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 animate-in fade-in">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Preferred Week
                      </label>
                      <select
                        value={standingTiming}
                        onChange={(e: any) => setStandingTiming(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      >
                        <option value="1st_week">1st Week of Month</option>
                        <option value="2nd_week">2nd Week of Month</option>
                        <option value="3rd_week">3rd Week of Month</option>
                        <option value="4th_week">4th Week of Month</option>
                        <option value="every_4_weeks">Every 4 Weeks</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Preferred Day
                      </label>
                      <select
                        value={standingDay}
                        onChange={(e: any) => setStandingDay(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      >
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Preferred Time
                      </label>
                      <select
                        value={standingTime}
                        onChange={(e) => setStandingTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {format12Hour(t)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Net Amount Auto-Calculation Card */}
            <div className="p-3.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-xs font-medium text-teal-900 dark:text-teal-200">
                  {isInstallment ? "Net Contract Package Total" : "Net Payable Amount"}
                </span>
              </div>
              <span className="text-base font-extrabold text-teal-700 dark:text-teal-300 font-mono">
                ₱{calculatedNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Due Date & Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isInstallment ? "First Deposit Due Date" : "Payment Due Date"}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Invoice Notes & Clinical Breakdown
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 24-Month Orthodontic Treatment Plan with bracket bonding and monthly adjustments"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? "Creating..." : isInstallment ? "Create Installment Package" : "Generate Invoice"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
