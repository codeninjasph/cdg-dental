"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/clinic-context";
import {
  Appointment,
  OutstandingBalance,
  Patient,
} from "@/types/dental";

// Modals
import { AppointmentModal } from "@/components/appointments/appointment-modal";
import { PatientRegistrationModal } from "@/components/patients/patient-registration-modal";
import { PaymentModal } from "@/components/billing/payment-modal";
import { CreateBillModal } from "@/components/secretary/create-bill-modal";
import { OfficialReceiptModal } from "@/components/secretary/official-receipt-modal";
import { PatientPreviewModal } from "@/components/secretary/patient-preview-modal";
import { DocumentIntakeModal } from "@/components/secretary/document-intake-modal";
import { MergePatientModal } from "@/components/patients/merge-patient-modal";
import { ConfirmRescheduleModal } from "@/components/secretary/confirm-reschedule-modal";
import { Pagination } from "@/components/ui/pagination";

import {
  Calendar,
  Users,
  CreditCard,
  Plus,
  Clock,
  CheckCircle2,
  Activity,
  Phone,
  PhoneCall,
  DollarSign,
  FileText,
  UserCheck,
  ShieldCheck,
  Printer,
  Search,
  Upload,
  UserPlus,
  ChevronRight,
  QrCode,
  Filter,
  Eye,
  AlertTriangle,
  AlertCircle,
  Building2,
  RefreshCw,
  ShieldAlert,
  ArrowRight,
  Merge,
  Repeat,
  Layers,
  Sparkles,
  Check,
  Copy,
  CalendarCheck,
  CalendarPlus,
} from "lucide-react";

function formatTime12h(timeStr?: string) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  let hour = parseInt(h, 10);
  if (isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${m || "00"} ${ampm}`;
}

function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function SecretaryPortalContent() {
  const {
    currentRole,
    currentStaff,
    activeBranch,
    branches,
    showToast,
    refreshTrigger,
    triggerRefresh,
    staffList,
  } = useClinic();

  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  // Active Tab synchronized with URL search params
  const [activeTab, setActiveTab] = useState<
    "queue" | "recalls" | "patients" | "billing" | "documents"
  >(() => {
    if (tabParam && ["queue", "recalls", "patients", "billing", "documents"].includes(tabParam)) {
      return tabParam as "queue" | "recalls" | "patients" | "billing" | "documents";
    }
    return "queue";
  });

  useEffect(() => {
    if (tabParam && ["queue", "recalls", "patients", "billing", "documents"].includes(tabParam)) {
      setActiveTab(tabParam as "queue" | "recalls" | "patients" | "billing" | "documents");
    }
  }, [tabParam]);

  const handleTabChange = (tab: "queue" | "recalls" | "patients" | "billing" | "documents") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Merge modal state
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [mergePreselectedDupId, setMergePreselectedDupId] = useState<string | undefined>();

  // State
  const [appointments, setAppointments] = useState<any[]>([]);
  const [balances, setBalances] = useState<OutstandingBalance[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [queueDate, setQueueDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [dentistFilter, setDentistFilter] = useState<string>("all");
  const [patientSearch, setPatientSearch] = useState<string>("");

  // Installment Recalls State
  const [recallFilter, setRecallFilter] = useState<
    "needs_call" | "all" | "scheduled" | "overdue" | "on_track" | "completed"
  >("needs_call");
  const [recallSearch, setRecallSearch] = useState<string>("");
  const [recallsPage, setRecallsPage] = useState<number>(1);
  const recallsPageSize = 8;
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const handleCopyPhone = (phone: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(phone);
      setCopiedPhone(phone);
      setTimeout(() => setCopiedPhone(null), 2000);
    }
  };

  // Modals state
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [apptInitialPatientId, setApptInitialPatientId] = useState<string | undefined>();
  const [apptInitialNotes, setApptInitialNotes] = useState<string | undefined>();
  const [apptInitialTime, setApptInitialTime] = useState<string | undefined>();
  const [apptStandingSchedule, setApptStandingSchedule] = useState<string | undefined>();

  const resetApptModalState = () => {
    setIsApptModalOpen(false);
    setApptInitialPatientId(undefined);
    setApptInitialNotes(undefined);
    setApptInitialTime(undefined);
    setApptStandingSchedule(undefined);
  };

  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isCreateBillOpen, setIsCreateBillOpen] = useState(false);
  const [selectedPatientForBill, setSelectedPatientForBill] = useState<
    string | undefined
  >();
  const [selectedApptForBill, setSelectedApptForBill] = useState<
    string | undefined
  >();
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptBill, setReceiptBill] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPatientId, setPreviewPatientId] = useState<string | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedPatientForDoc, setSelectedPatientForDoc] = useState<
    string | undefined
  >();
  const [paymentBill, setPaymentBill] = useState<{
    id: string;
    invoice_number: string;
    patient_name: string;
    net_amount: number;
    total_paid: number;
    balance_due: number;
    is_installment?: boolean;
    plan_type?: string | null;
    downpayment_amount?: number;
    installment_amount?: number;
    total_installments?: number;
    frequency?: string;
    preferred_schedule?: any;
    payments?: any[];
  } | null>(null);

  // Phone Call Verification & Reschedule Modal State
  const [isConfirmRescheduleOpen, setIsConfirmRescheduleOpen] = useState(false);
  const [selectedApptForConfirm, setSelectedApptForConfirm] = useState<any | null>(null);

  const handleOpenConfirmReschedule = (appt: any) => {
    setSelectedApptForConfirm(appt);
    setIsConfirmRescheduleOpen(true);
  };

  const supabase = createClient();
  const dentists = staffList.filter(
    (s) => s.role === "dentist" || s.role === "admin"
  );

  const loadSecretaryData = async () => {
    setIsLoading(true);
    try {
      // 1. Appointments scoped by activeBranch
      let apptQuery = supabase
        .from("appointments")
        .select(
          `id, start_time, end_time, status, notes, dentist_id, branch_id,
          patient:patients(id, first_name, last_name, phone, email, medical_alerts),
          dentist:profiles(id, full_name)`
        )
        .order("start_time", { ascending: true });

      if (activeBranch?.id) {
        apptQuery = apptQuery.eq("branch_id", activeBranch.id);
      }
      const { data: apptData } = await apptQuery;
      if (apptData) setAppointments(apptData);

      // 2. Outstanding Balances scoped by activeBranch
      let balQuery = supabase
        .from("outstanding_balances")
        .select("*")
        .order("created_at", { ascending: false });

      if (activeBranch?.id) {
        balQuery = balQuery.eq("branch_id", activeBranch.id);
      }
      const { data: balData } = await balQuery;
      if (balData) setBalances(balData);

      // 3. Treatment Bills scoped by activeBranch
      let billQuery = supabase
        .from("treatment_bills")
        .select(
          `*, patient:patients(id, first_name, last_name, phone, email, address),
          appointment:appointments(start_time, dentist:profiles(full_name)),
          payments:payment_logs(id, amount_logged, payment_method, reference_number, logged_at, staff:profiles(full_name))`
        )
        .order("created_at", { ascending: false });

      if (activeBranch?.id) {
        billQuery = billQuery.eq("branch_id", activeBranch.id);
      }
      const { data: billData } = await billQuery;
      if (billData) setBills(billData);

      // 4. Patients
      const { data: patData } = await supabase
        .from("patients")
        .select("*")
        .order("last_name", { ascending: true });
      if (patData) setPatients(patData);

      // 5. Payment Logs scoped by activeBranch
      let payQuery = supabase
        .from("payment_logs")
        .select(
          `*, bill:treatment_bills(invoice_number, patient:patients(first_name, last_name)), staff:profiles(full_name)`
        )
        .order("logged_at", { ascending: false })
        .limit(25);

      if (activeBranch?.id) {
        payQuery = payQuery.eq("branch_id", activeBranch.id);
      }
      const { data: payData } = await payQuery;
      if (payData) setPayments(payData);

      // 6. Patient Documents
      const { data: docData } = await supabase
        .from("patient_documents")
        .select(
          `*, patient:patients(first_name, last_name), uploader:profiles(full_name)`
        )
        .order("created_at", { ascending: false });
      if (docData) setDocuments(docData);
    } catch (err) {
      console.error("Failed to load secretary data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSecretaryData();
  }, [refreshTrigger, activeBranch]);

  const handleUpdateStatus = async (apptId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", apptId);
      if (error) throw error;
      showToast(`Status updated to ${newStatus.toUpperCase()}`, "success");
      triggerRefresh();
    } catch (err: any) {
      showToast(err?.message || "Failed to update status", "error");
    }
  };

  const handleOpenPayment = (targetBill: any) => {
    const paidTotal = (targetBill.payments || []).reduce(
      (sum: number, p: any) => sum + Number(p.amount_logged || 0),
      0
    );
    const balanceDue = Math.max(0, Number(targetBill.net_amount) - paidTotal);
    setPaymentBill({
      id: targetBill.id,
      invoice_number: targetBill.invoice_number,
      patient_name: targetBill.patient
        ? `${targetBill.patient.first_name} ${targetBill.patient.last_name}`
        : "Patient",
      net_amount: Number(targetBill.net_amount),
      total_paid: paidTotal,
      balance_due: balanceDue,
      is_installment: targetBill.is_installment,
      plan_type: targetBill.plan_type,
      downpayment_amount: targetBill.downpayment_amount ? Number(targetBill.downpayment_amount) : undefined,
      installment_amount: targetBill.installment_amount ? Number(targetBill.installment_amount) : undefined,
      total_installments: targetBill.total_installments ? Number(targetBill.total_installments) : undefined,
      frequency: targetBill.frequency,
      preferred_schedule: targetBill.preferred_schedule,
      payments: targetBill.payments,
    });
  };

  const handleOpenPaymentFromBalance = (b: OutstandingBalance) => {
    const fullBill = bills.find((bill) => bill.id === b.bill_id);
    setPaymentBill({
      id: b.bill_id,
      invoice_number: b.invoice_number,
      patient_name: `${b.first_name} ${b.last_name}`,
      net_amount: Number(b.net_amount),
      total_paid: Number(b.total_paid),
      balance_due: Number(b.balance_due),
      is_installment: b.is_installment ?? fullBill?.is_installment,
      plan_type: b.plan_type ?? fullBill?.plan_type,
      downpayment_amount: (b.downpayment_amount ?? fullBill?.downpayment_amount) ? Number(b.downpayment_amount ?? fullBill?.downpayment_amount) : undefined,
      installment_amount: (b.installment_amount ?? fullBill?.installment_amount) ? Number(b.installment_amount ?? fullBill?.installment_amount) : undefined,
      total_installments: (b.total_installments ?? fullBill?.total_installments) ? Number(b.total_installments ?? fullBill?.total_installments) : undefined,
      frequency: b.frequency ?? fullBill?.frequency,
      preferred_schedule: b.preferred_schedule ?? fullBill?.preferred_schedule,
      payments: fullBill?.payments,
    });
  };

  // Active installment bills and rolling recall calculation
  const installmentRecalls = useMemo(() => {
    return bills
      .filter((b) => b.is_installment && b.status !== "cancelled")
      .map((b) => {
        const totalAmount = Number(b.net_amount || 0);
        const totalPaid = (b.payments || []).reduce(
          (sum: number, p: any) => sum + Number(p.amount_logged || 0),
          0
        );
        const balanceDue = Math.max(0, totalAmount - totalPaid);
        const downpayment = Number(b.downpayment_amount || 0);
        const installmentAmount = Number(b.installment_amount || 0);
        const totalInstallments = Number(b.total_installments || 0);

        // Adjustments milestone calculation
        let installmentsPaid = 0;
        if (installmentAmount > 0) {
          const installmentMoneyPaid = Math.max(0, totalPaid - downpayment);
          installmentsPaid = Math.min(
            totalInstallments,
            Math.floor(installmentMoneyPaid / installmentAmount)
          );
        }
        const currentMilestoneIndex = Math.min(
          totalInstallments,
          installmentsPaid + 1
        );

        // Cross-reference appointments for this patient
        const patientAppts = appointments.filter(
          (a) =>
            (b.patient && a.patient?.id === b.patient.id) ||
            a.patient?.id === b.patient_id
        );

        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];

        // Active upcoming appointment (today or future)
        const upcomingAppt = patientAppts
          .filter(
            (a) =>
              ["scheduled", "confirmed", "arrived", "in_treatment"].includes(
                a.status
              ) && a.start_time.split("T")[0] >= todayStr
          )
          .sort(
            (a, b) =>
              new Date(a.start_time).getTime() -
              new Date(b.start_time).getTime()
          )[0];

        // Latest completed appointment
        const completedAppts = patientAppts
          .filter((a) => a.status === "completed")
          .sort(
            (a, b) =>
              new Date(b.start_time).getTime() -
              new Date(a.start_time).getTime()
          );
        const lastCompletedAppt = completedAppts[0];

        // Baseline date for recall window: last completed visit or invoice creation date
        const baselineDate = lastCompletedAppt
          ? new Date(lastCompletedAppt.start_time)
          : new Date(b.created_at);
        const daysSinceLast = Math.max(
          0,
          Math.floor(
            (now.getTime() - baselineDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        );

        // Recall Status:
        // 1. "scheduled": patient already has an upcoming adjustment booked
        // 2. "overdue": no upcoming visit AND > 42 days (6+ weeks)
        // 3. "due": no upcoming visit AND 25 - 42 days (approx 4 weeks, monthly adjustment call due)
        // 4. "upcoming": no upcoming visit AND < 25 days (recently seen, on track)
        let recallStatus: "scheduled" | "overdue" | "due" | "upcoming" =
          "upcoming";
        if (upcomingAppt) {
          recallStatus = "scheduled";
        } else if (daysSinceLast >= 42) {
          recallStatus = "overdue";
        } else if (daysSinceLast >= 25) {
          recallStatus = "due";
        } else {
          recallStatus = "upcoming";
        }

        // Standing preferred slot formatting
        let standingScheduleText: string | null = null;
        if (b.preferred_schedule) {
          const pref = b.preferred_schedule;
          if (pref.timing && pref.standing_day) {
            const timingLabel = pref.timing
              .replace("_", " ")
              .replace("1st week", "1st")
              .replace("2nd week", "2nd")
              .replace("3rd week", "3rd")
              .replace("4th week", "4th");
            standingScheduleText = `Every ${timingLabel} ${pref.standing_day}${
              pref.preferred_time ? ` @ ${formatTime12h(pref.preferred_time)}` : ""
            }`;
          } else if (pref.notes) {
            standingScheduleText = pref.notes;
          }
        }

        return {
          bill: b,
          patient: b.patient,
          totalAmount,
          totalPaid,
          balanceDue,
          downpayment,
          installmentAmount,
          totalInstallments,
          installmentsPaid,
          currentMilestoneIndex,
          upcomingAppt,
          lastCompletedAppt,
          baselineDate,
          daysSinceLast,
          recallStatus,
          standingScheduleText,
        };
      });
  }, [bills, appointments]);

  const activeInstallmentsCount = installmentRecalls.filter(
    (r) => r.balanceDue > 0
  ).length;
  const recallsNeedingCallCount = installmentRecalls.filter(
    (r) =>
      r.balanceDue > 0 &&
      (r.recallStatus === "due" || r.recallStatus === "overdue")
  ).length;
  const scheduledRecallsCount = installmentRecalls.filter(
    (r) => r.balanceDue > 0 && r.recallStatus === "scheduled"
  ).length;
  const onTrackRecallsCount = installmentRecalls.filter(
    (r) => r.balanceDue > 0 && r.recallStatus === "upcoming"
  ).length;
  const completedContractsCount = installmentRecalls.filter(
    (r) => r.balanceDue <= 0
  ).length;

  const handleBookRecallVisit = (recall: any) => {
    setApptInitialPatientId(recall.patient?.id);
    setApptInitialTime(
      recall.bill?.preferred_schedule?.preferred_time || undefined
    );
    setApptInitialNotes(
      `[Installment Adjustment #${recall.currentMilestoneIndex} of ${recall.totalInstallments}] ${
        recall.bill.plan_type ? recall.bill.plan_type.toUpperCase() : "PACKAGE"
      } - Invoice: ${recall.bill.invoice_number}`
    );
    setApptStandingSchedule(recall.standingScheduleText || undefined);
    setIsApptModalOpen(true);
  };

  const filteredRecalls = installmentRecalls.filter((r) => {
    // Status filter
    if (recallFilter === "needs_call") {
      if (r.balanceDue <= 0) return false;
      if (r.recallStatus !== "due" && r.recallStatus !== "overdue") return false;
    } else if (recallFilter === "scheduled") {
      if (r.balanceDue <= 0) return false;
      if (r.recallStatus !== "scheduled") return false;
    } else if (recallFilter === "overdue") {
      if (r.balanceDue <= 0) return false;
      if (r.recallStatus !== "overdue") return false;
    } else if (recallFilter === "on_track") {
      if (r.balanceDue <= 0) return false;
      if (r.recallStatus !== "upcoming") return false;
    } else if (recallFilter === "completed") {
      if (r.balanceDue > 0) return false;
    }

    // Search query
    if (recallSearch.trim()) {
      const q = recallSearch.toLowerCase();
      const patientName = r.patient
        ? `${r.patient.first_name} ${r.patient.last_name}`.toLowerCase()
        : "";
      const phone = (r.patient?.phone || "").toLowerCase();
      const invoiceNum = (r.bill.invoice_number || "").toLowerCase();
      const plan = (r.bill.plan_type || "").toLowerCase();
      return (
        patientName.includes(q) ||
        phone.includes(q) ||
        invoiceNum.includes(q) ||
        plan.includes(q)
      );
    }
    return true;
  });

  const paginatedRecalls = filteredRecalls.slice(
    (recallsPage - 1) * recallsPageSize,
    recallsPage * recallsPageSize
  );

  // Aggregations
  const totalBalanceDue = balances.reduce(
    (sum, b) => sum + Number(b.balance_due),
    0
  );
  const waitingInLobbyCount = appointments.filter(
    (a) => a.status === "arrived"
  ).length;
  const inChairCount = appointments.filter(
    (a) => a.status === "in_treatment"
  ).length;
  const todayCompletedCount = appointments.filter(
    (a) => a.status === "completed"
  ).length;
  const todayCollectedTotal = payments
    .filter((p) => {
      const payDate = p.logged_at.split("T")[0];
      const today = new Date().toISOString().split("T")[0];
      return payDate === today;
    })
    .reduce((sum, p) => sum + Number(p.amount_logged || 0), 0);

  const queueAppointments = appointments.filter((a) => {
    const apptDate = a.start_time.split("T")[0];
    if (queueDate && apptDate !== queueDate) return false;
    if (dentistFilter !== "all" && a.dentist_id !== dentistFilter) return false;
    return true;
  });

  const filteredPatients = patients.filter((p) => {
    if (!patientSearch.trim()) return true;
    const q = patientSearch.toLowerCase();
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    const phone = (p.phone || "").toLowerCase();
    const alert = (p.medical_alerts || "").toLowerCase();
    return fullName.includes(q) || phone.includes(q) || alert.includes(q);
  });

  // Workstation 1 (Queue) Pagination
  const [queuePage, setQueuePage] = useState(1);
  const queuePageSize = 10;
  const paginatedQueue = queueAppointments.slice(
    (queuePage - 1) * queuePageSize,
    queuePage * queuePageSize
  );

  // Workstation 2 (Patients) Pagination
  const [patientsPage, setPatientsPage] = useState(1);
  const [patientsPageSize, setPatientsPageSize] = useState(10);
  const paginatedPatients = filteredPatients.slice(
    (patientsPage - 1) * patientsPageSize,
    patientsPage * patientsPageSize
  );

  // Workstation 3 (Invoices / Bills) Pagination
  const [billsPage, setBillsPage] = useState(1);
  const billsPageSize = 10;
  const paginatedBills = bills.slice(
    (billsPage - 1) * billsPageSize,
    billsPage * billsPageSize
  );

  // Workstation 4 (Documents) Pagination
  const [docsPage, setDocsPage] = useState(1);
  const docsPageSize = 10;
  const paginatedDocs = documents.slice(
    (docsPage - 1) * docsPageSize,
    docsPage * docsPageSize
  );

  const statusStyles: Record<string, string> = {
    scheduled:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
    confirmed:
      "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300",
    arrived:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
    in_treatment:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 animate-pulse",
    completed:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
    cancelled:
      "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400",
    no_show:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300",
  };

  const billStatusColors: Record<string, string> = {
    unpaid:
      "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border-rose-200",
    partially_paid:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border-amber-200",
    fully_paid:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-200",
    cancelled:
      "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-300",
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── PAGE HEADER ── matches /portal & /billing pattern */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 text-white shadow-xl shadow-teal-950/20 relative overflow-hidden">
        {/* Background glows */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 top-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              <span>{activeBranch?.name || "Main Clinic"}</span>
            </span>
            <span className="text-xs text-slate-400">
              Logged in as{" "}
              <strong className="text-teal-200">
                {currentStaff?.full_name || "Maria Santos"}
              </strong>{" "}
              ({currentRole.toUpperCase()})
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Secretary Front-Desk & Cashier Station
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Patient queue management, conflict-free scheduling, CRM intake, and
            real-time GCash/Cash POS settlement.
          </p>
        </div>

        {/* Action buttons — same pill style as /portal */}
        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setApptInitialPatientId(undefined);
              setIsApptModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/25 hover:shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Book Appointment</span>
          </button>
          <button
            onClick={() => setIsPatientModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 backdrop-blur-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register Patient</span>
          </button>
          <button
            onClick={() => {
              setSelectedPatientForBill(undefined);
              setSelectedApptForBill(undefined);
              setIsCreateBillOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 backdrop-blur-sm transition-all cursor-pointer"
          >
            <DollarSign className="w-4 h-4" />
            <span>Issue Invoice</span>
          </button>
          <button
            onClick={triggerRefresh}
            title="Refresh"
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── KPI METRIC CARDS ── exact same pattern as /portal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Lobby Waiting */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Lobby Waiting
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
              {waitingInLobbyCount}
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              Arrived
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Seated in reception
          </p>
        </div>

        {/* In Chair */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              In Chair
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400 font-mono">
              {inChairCount}
            </span>
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
              In Treatment
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Operatory chairs occupied
          </p>
        </div>

        {/* Completed */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Completed
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {todayCompletedCount}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Today
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Visits finished
          </p>
        </div>

        {/* Installment Recalls Due */}
        <div
          onClick={() => handleTabChange("recalls")}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all cursor-pointer hover:border-teal-400"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Installment Recalls
            </span>
            <div className={`p-2 rounded-xl ${
              recallsNeedingCallCount > 0
                ? "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"
                : "bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400"
            }`}>
              <Repeat className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-extrabold font-mono ${
              recallsNeedingCallCount > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-800 dark:text-slate-200"
            }`}>
              {recallsNeedingCallCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Calls Due
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {activeInstallmentsCount} active plans
          </p>
        </div>

        {/* Receivables */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Receivables
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
              ₱{totalBalanceDue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {balances.length} unpaid / partial bills
          </p>
        </div>

        {/* POS Collected Today */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Today's POS
            </span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-teal-700 dark:text-teal-300 font-mono">
              ₱{todayCollectedTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Cash & GCash collected
          </p>
        </div>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 sm:gap-4 overflow-x-auto">
        <button
          onClick={() => handleTabChange("queue")}
          className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "queue"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Patient Queue & Check-In</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {queueAppointments.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange("recalls")}
          className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "recalls"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Repeat className="w-4 h-4" />
          <span>Monthly Installment Recalls</span>
          {recallsNeedingCallCount > 0 ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse">
              {recallsNeedingCallCount} need call
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {activeInstallmentsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange("patients")}
          className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "patients"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Patient Intake & CRM</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {patients.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange("billing")}
          className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "billing"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Cashier POS & Invoicing</span>
          {balances.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
              {balances.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange("documents")}
          className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "documents"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Intake Documents</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {documents.length}
          </span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* WORKSTATION 1 — TODAY'S PATIENT QUEUE & CHECK-IN              */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Date:
                </span>
                <input
                  type="date"
                  value={queueDate}
                  onChange={(e) => {
                    setQueueDate(e.target.value);
                    setQueuePage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Doctor:
                </span>
                <select
                  value={dentistFilter}
                  onChange={(e) => {
                    setDentistFilter(e.target.value);
                    setQueuePage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                >
                  <option value="all">All Dentists</option>
                  {dentists.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={() => {
                setApptInitialPatientId(undefined);
                setIsApptModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Book Walk-In</span>
            </button>
          </div>

          {/* Queue list — same row pattern as /portal appointment list */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                Loading queue...
              </div>
            ) : queueAppointments.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                No appointments for this date. Click "Book Walk-In" to schedule.
              </div>
            ) : (
              paginatedQueue.map((appt) => {
                const startTimeStr = new Date(
                  appt.start_time
                ).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const endTimeStr = new Date(
                  appt.end_time
                ).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={appt.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors"
                  >
                    {/* Time + Patient */}
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-center min-w-[70px]">
                        <Clock className="w-4 h-4 text-slate-500 mb-1" />
                        <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                          {startTimeStr}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          to {endTimeStr}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => {
                              setPreviewPatientId(appt.patient?.id);
                              setIsPreviewOpen(true);
                            }}
                            className="font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 text-base flex items-center gap-1.5 cursor-pointer"
                          >
                            {appt.patient?.first_name}{" "}
                            {appt.patient?.last_name}
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                          <span
                            className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${
                              statusStyles[appt.status] ||
                              "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {appt.status.replace("_", " ")}
                          </span>
                          {appt.patient?.medical_alerts && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 text-[10px] font-bold">
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              Alert
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                          <span>
                            Dr.{" "}
                            <strong className="text-slate-700 dark:text-slate-300">
                              {appt.dentist?.full_name}
                            </strong>
                          </span>
                          {appt.patient?.phone && (
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {appt.patient.phone}
                            </span>
                          )}
                        </p>

                        {appt.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/40 px-2 py-1 rounded-md">
                            "{appt.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 1-click status actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center flex-wrap">
                      {appt.status === "scheduled" && (
                        <button
                          onClick={() => handleOpenConfirmReschedule(appt)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call & Confirm</span>
                        </button>
                      )}
                      {(appt.status === "scheduled" ||
                        appt.status === "confirmed") && (
                        <button
                          onClick={() => handleOpenConfirmReschedule(appt)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                          title="Reschedule appointment date/time"
                        >
                          Reschedule
                        </button>
                      )}
                      {(appt.status === "scheduled" ||
                        appt.status === "confirmed") && (
                        <button
                          onClick={() =>
                            handleUpdateStatus(appt.id, "arrived")
                          }
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950 dark:text-amber-300 transition-colors cursor-pointer"
                        >
                          Mark Arrived
                        </button>
                      )}
                      {appt.status === "arrived" && (
                        <button
                          onClick={() =>
                            handleUpdateStatus(appt.id, "in_treatment")
                          }
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-100 hover:bg-purple-200 text-purple-900 dark:bg-purple-950 dark:text-purple-300 transition-colors cursor-pointer"
                        >
                          Take to Operatory
                        </button>
                      )}
                      {appt.status === "in_treatment" && (
                        <button
                          onClick={() =>
                            handleUpdateStatus(appt.id, "completed")
                          }
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 transition-colors cursor-pointer"
                        >
                          Mark Completed
                        </button>
                      )}
                      {appt.status === "completed" && (
                        <button
                          onClick={() => {
                            setSelectedPatientForBill(appt.patient?.id);
                            setSelectedApptForBill(appt.id);
                            setIsCreateBillOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors cursor-pointer"
                        >
                          Checkout / Bill
                        </button>
                      )}
                      {appt.status !== "completed" &&
                        appt.status !== "cancelled" && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(appt.id, "cancelled")
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Cancel"
                          >
                            ✕
                          </button>
                        )}
                      {/* Open patient file */}
                      <button
                        onClick={() => {
                          setPreviewPatientId(appt.patient?.id);
                          setIsPreviewOpen(true);
                        }}
                        className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="View Patient File"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {/* Queue Pagination */}
            <Pagination
              currentPage={queuePage}
              totalPages={Math.max(1, Math.ceil(queueAppointments.length / queuePageSize))}
              totalItems={queueAppointments.length}
              pageSize={queuePageSize}
              onPageChange={setQueuePage}
              itemName="visits"
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* WORKSTATION — MONTHLY INSTALLMENT RECALLS & ROLLING VISITS     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "recalls" && (
        <div className="space-y-6">
          {/* Workstation Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                <Repeat className="w-5 h-5 text-teal-600" />
                Monthly Installment Recalls & Rolling Appointments
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Active orthodontic adjustments, implants & prosthodontics packages. Track monthly recall calls, scheduled visits, and standing preferred slots.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setSelectedPatientForBill(undefined);
                  setSelectedApptForBill(undefined);
                  setIsCreateBillOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Issue Installment Contract</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Active Packages
              </span>
              <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
                {activeInstallmentsCount}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40">
              <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider block">
                Calls Due / Overdue
              </span>
              <span className="text-xl font-extrabold font-mono text-amber-600">
                {recallsNeedingCallCount}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40">
              <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block">
                Booked Visits
              </span>
              <span className="text-xl font-extrabold font-mono text-emerald-600">
                {scheduledRecallsCount}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                On Track (&lt;25 days)
              </span>
              <span className="text-xl font-extrabold font-mono text-slate-700 dark:text-slate-300">
                {onTrackRecallsCount}
              </span>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setRecallFilter("needs_call");
                  setRecallsPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  recallFilter === "needs_call"
                    ? "bg-amber-500 text-slate-950 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Needs Call</span>
                {recallsNeedingCallCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950 text-white font-mono">
                    {recallsNeedingCallCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setRecallFilter("all");
                  setRecallsPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  recallFilter === "all"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <span>All Active Plans</span>
                <span className="text-[10px] opacity-75">({activeInstallmentsCount})</span>
              </button>

              <button
                onClick={() => {
                  setRecallFilter("scheduled");
                  setRecallsPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  recallFilter === "scheduled"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Booked</span>
                <span className="text-[10px] opacity-75">({scheduledRecallsCount})</span>
              </button>

              <button
                onClick={() => {
                  setRecallFilter("on_track");
                  setRecallsPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  recallFilter === "on_track"
                    ? "bg-slate-700 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>On Track</span>
                <span className="text-[10px] opacity-75">({onTrackRecallsCount})</span>
              </button>

              <button
                onClick={() => {
                  setRecallFilter("completed");
                  setRecallsPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  recallFilter === "completed"
                    ? "bg-slate-700 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Fully Settled</span>
                <span className="text-[10px] opacity-75">({completedContractsCount})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={recallSearch}
                onChange={(e) => {
                  setRecallSearch(e.target.value);
                  setRecallsPage(1);
                }}
                placeholder="Search patient, phone, invoice..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              />
            </div>
          </div>

          {/* Cards List */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              Loading installment recall directory...
            </div>
          ) : filteredRecalls.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-500 space-y-2">
              <Repeat className="w-8 h-8 mx-auto text-slate-400 opacity-50" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No installment plans found in this view.
              </p>
              <p className="text-xs text-slate-400">
                {recallFilter === "needs_call"
                  ? "Great job! All installment patients are either already scheduled or currently on track."
                  : "Issue a new installment package to start tracking monthly recalls and standing schedules."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedRecalls.map((recall) => {
                const percentPaid = Math.min(
                  100,
                  Math.round((recall.totalPaid / Math.max(1, recall.totalAmount)) * 100)
                );
                const isOverdue = recall.recallStatus === "overdue";
                const isDue = recall.recallStatus === "due";
                const isBooked = recall.recallStatus === "scheduled";

                const planBadgeStyle =
                  recall.bill.plan_type === "orthodontics"
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200"
                    : recall.bill.plan_type === "implants"
                    ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200"
                    : recall.bill.plan_type === "prosthodontics"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200"
                    : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200";

                const planName =
                  recall.bill.plan_type === "orthodontics"
                    ? "Orthodontics / Braces"
                    : recall.bill.plan_type === "implants"
                    ? "Dental Implants"
                    : recall.bill.plan_type === "prosthodontics"
                    ? "Prosthodontics / Dentures"
                    : "Installment Package";

                return (
                  <div
                    key={recall.bill.id}
                    className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all ${
                      isOverdue
                        ? "border-rose-300 dark:border-rose-900/60 shadow-sm shadow-rose-500/5"
                        : isDue
                        ? "border-amber-300 dark:border-amber-900/60 shadow-sm shadow-amber-500/5"
                        : "border-slate-200/80 dark:border-slate-800 shadow-xs"
                    }`}
                  >
                    {/* Top Header Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                      {/* Patient Details */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold flex items-center justify-center text-sm shrink-0">
                          {recall.patient?.first_name?.[0]}
                          {recall.patient?.last_name?.[0]}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => {
                                setPreviewPatientId(recall.patient?.id);
                                setIsPreviewOpen(true);
                              }}
                              className="font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600 text-base cursor-pointer flex items-center gap-1.5"
                            >
                              <span>
                                {recall.patient?.last_name}, {recall.patient?.first_name}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            </button>

                            {/* Plan Pill */}
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${planBadgeStyle} flex items-center gap-1`}
                            >
                              <Repeat className="w-3 h-3" />
                              <span>{planName}</span>
                            </span>

                            <span className="text-[11px] font-mono text-slate-400">
                              {recall.bill.invoice_number}
                            </span>
                          </div>

                          {/* Contact and standing slot */}
                          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                            {recall.patient?.phone ? (
                              <div className="flex items-center gap-1 font-mono">
                                <a
                                  href={`tel:${recall.patient.phone}`}
                                  className="text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 font-semibold"
                                  title="Click to call patient"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  <span>{recall.patient.phone}</span>
                                </a>
                                <button
                                  onClick={() => handleCopyPhone(recall.patient.phone)}
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                  title="Copy phone number"
                                >
                                  {copiedPhone === recall.patient.phone ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No phone registered</span>
                            )}

                            {recall.standingScheduleText && (
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-teal-600" />
                                <span>Standing Slot: <strong>{recall.standingScheduleText}</strong></span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Recall Status Badge */}
                      <div className="shrink-0 flex items-center gap-2">
                        {isOverdue && (
                          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-center gap-1.5 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Overdue Call ({recall.daysSinceLast}d since visit)</span>
                          </span>
                        )}
                        {isDue && (
                          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900 flex items-center gap-1.5">
                            <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
                            <span>Recall Due ({recall.daysSinceLast}d since visit)</span>
                          </span>
                        )}
                        {isBooked && (
                          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 flex items-center gap-1.5">
                            <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Next Visit Booked</span>
                          </span>
                        )}
                        {!isOverdue && !isDue && !isBooked && recall.balanceDue > 0 && (
                          <span className="px-3 py-1 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>On Track ({recall.daysSinceLast}d ago)</span>
                          </span>
                        )}
                        {recall.balanceDue <= 0 && (
                          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Contract Fully Settled</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Section: Financial Progress + Appointment Timing */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-4">
                      {/* Financial Progress Box */}
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-teal-600" />
                            <span>
                              Milestone: <strong>Adjustment #{recall.currentMilestoneIndex} of {recall.totalInstallments}</strong>
                            </span>
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {percentPaid}% Contract Paid
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              percentPaid >= 100
                                ? "bg-emerald-500"
                                : "bg-gradient-to-r from-teal-500 to-cyan-500"
                            }`}
                            style={{ width: `${percentPaid}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                          <span>
                            Paid: <strong className="font-mono text-emerald-600 dark:text-emerald-400">₱{recall.totalPaid.toLocaleString()}</strong> of ₱{recall.totalAmount.toLocaleString()}
                          </span>
                          <span>
                            Balance: <strong className="font-mono text-rose-600 dark:text-rose-400">₱{recall.balanceDue.toLocaleString()}</strong>
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 border-t border-slate-200/60 dark:border-slate-700/60 pt-2 flex items-center justify-between">
                          <span>
                            Per Visit Fee: <strong className="font-mono text-slate-800 dark:text-slate-200">₱{recall.installmentAmount.toLocaleString()}</strong>
                          </span>
                          {recall.downpayment > 0 && (
                            <span>
                              Downpayment: ₱{recall.downpayment.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Appointment & Recall Status Box */}
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between space-y-2">
                        {isBooked && recall.upcomingAppt ? (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                              Upcoming Visit Scheduled
                            </span>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-emerald-600" />
                              <span>
                                {new Date(recall.upcomingAppt.start_time).toLocaleDateString(undefined, {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })} @ {formatTime12h(recall.upcomingAppt.start_time.split("T")[1]?.substring(0, 5))}
                              </span>
                            </p>
                            <p className="text-xs text-slate-500">
                              With Dr. {recall.upcomingAppt.dentist?.full_name || "Assigned Dentist"}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                              isOverdue ? "text-rose-600" : isDue ? "text-amber-600" : "text-slate-500"
                            }`}>
                              {isOverdue ? "Adjustment Overdue" : isDue ? "Adjustment Due for Booking" : "Adjustment Visit Cycle"}
                            </span>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {recall.lastCompletedAppt
                                ? `Last adjustment on ${new Date(recall.lastCompletedAppt.start_time).toLocaleDateString()} (${recall.daysSinceLast} days ago)`
                                : `Contract started on ${new Date(recall.baselineDate).toLocaleDateString()} (${recall.daysSinceLast} days ago)`}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {recall.standingScheduleText
                                ? `Patient standing preference: ${recall.standingScheduleText}`
                                : "Standard 4-week adjustment cycle recommended."}
                            </p>
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 flex items-center justify-between">
                          <span>
                            Frequency: <strong>{recall.bill.frequency === "per_visit" ? "Per Visit Adjustment" : "Monthly Installment"}</strong>
                          </span>
                          {recall.bill.appointment?.dentist?.full_name && (
                            <span>
                              Attending: Dr. {recall.bill.appointment.dentist.full_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="text-[11px] text-slate-500">
                        {isBooked ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Appointment confirmed. Collect payment via POS upon arrival.
                          </span>
                        ) : (
                          <span className={`${isOverdue ? "text-rose-600 font-semibold" : isDue ? "text-amber-600 font-semibold" : "text-slate-500"}`}>
                            {isOverdue || isDue ? "Action required: Call patient to book their monthly adjustment visit." : "Patient is within standard monthly window."}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Statement Button */}
                        <button
                          onClick={() => {
                            setReceiptBill(recall.bill);
                            setIsReceiptOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Statement</span>
                        </button>

                        {/* POS Payment Button */}
                        {recall.balanceDue > 0 && (
                          <button
                            onClick={() => handleOpenPayment(recall.bill)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5 text-teal-600" />
                            <span>Pay POS (₱{recall.installmentAmount.toLocaleString()})</span>
                          </button>
                        )}

                        {/* Call & Book Next Visit Button */}
                        {!isBooked ? (
                          <button
                            onClick={() => handleBookRecallVisit(recall)}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                            <span>Call & Book Next Visit</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBookRecallVisit(recall)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Book Another Visit</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Recalls Pagination */}
              <Pagination
                currentPage={recallsPage}
                totalPages={Math.max(1, Math.ceil(filteredRecalls.length / recallsPageSize))}
                totalItems={filteredRecalls.length}
                pageSize={recallsPageSize}
                onPageChange={setRecallsPage}
                itemName="installment plans"
              />
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* WORKSTATION 2 — PATIENT INTAKE & CRM                          */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "patients" && (
        <div className="space-y-6">
          {/* Header row — identical to /patients page */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                <Users className="w-5 h-5 text-teal-600" />
                Patient Records & Intake Directory
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Registered patients with emergency contacts, medical alerts, and
                billing history.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setMergePreselectedDupId(undefined);
                  setIsMergeOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-100 hover:bg-violet-200 dark:bg-violet-950 dark:hover:bg-violet-900 text-violet-700 dark:text-violet-300 font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer"
              >
                <Merge className="w-4 h-4" />
                <span>Merge Duplicate</span>
              </button>
              <button
                onClick={() => setIsPatientModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register New Patient</span>
              </button>
            </div>
          </div>

          {/* Search bar — same look as /patients */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  setPatientsPage(1);
                }}
                placeholder="Search by name, phone, medical alert..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
              {filteredPatients.length} patients found
            </span>
          </div>

          {/* Patients grid — cards with same border/shadow style */}
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
              Loading patients...
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-sm">
              No patients match your search.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
              {paginatedPatients.map((p) => (
                <div
                  key={p.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          setPreviewPatientId(p.id);
                          setIsPreviewOpen(true);
                        }}
                        className="font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 text-base cursor-pointer"
                      >
                        {p.last_name}, {p.first_name}
                      </button>
                      {p.medical_alerts && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 text-[10px] font-bold">
                          <ShieldAlert className="w-3 h-3 text-rose-600" />
                          <span>{p.medical_alerts}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3">
                      {p.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {p.phone}
                        </span>
                      )}
                      <span>
                        {p.gender || "—"} · DOB: {p.dob || "—"}
                      </span>
                      {p.emergency_contact_name && (
                        <span>
                          Emergency: {p.emergency_contact_name} (
                          {p.emergency_contact_phone || "no #"})
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setPreviewPatientId(p.id);
                        setIsPreviewOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      View File
                    </button>
                    <button
                      onClick={() => {
                        resetApptModalState();
                        setApptInitialPatientId(p.id);
                        setIsApptModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 dark:bg-teal-950 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 transition-colors cursor-pointer"
                    >
                      Book Visit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPatientForBill(p.id);
                        setSelectedApptForBill(undefined);
                        setIsCreateBillOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors cursor-pointer"
                    >
                      Issue Bill
                    </button>
                    <button
                      onClick={() => {
                        setPreviewPatientId(p.id);
                        setIsPreviewOpen(true);
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Patients Pagination */}
              <Pagination
                currentPage={patientsPage}
                totalPages={Math.max(1, Math.ceil(filteredPatients.length / patientsPageSize))}
                totalItems={filteredPatients.length}
                pageSize={patientsPageSize}
                pageSizeOptions={[10, 25, 50]}
                onPageChange={setPatientsPage}
                onPageSizeChange={setPatientsPageSize}
                itemName="patients"
              />
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* WORKSTATION 3 — CASHIER POS & BILLING TERMINAL                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "billing" && (
        <div className="space-y-8">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                <CreditCard className="w-5 h-5 text-teal-600" />
                Financial Ledger & POS Terminal
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Manage clinic patient accounts, view receivables, and process POS payments.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedPatientForBill(undefined);
                setSelectedApptForBill(undefined);
                setIsCreateBillOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Issue New Invoice</span>
            </button>
          </div>

          {/* Outstanding Balances — same card style as /portal outstanding widget */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Outstanding Receivables
                </h3>
                <p className="text-xs text-slate-500">
                  Patients with pending and unsettled balances
                </p>
              </div>
              <Link
                href="/billing"
                className="text-xs font-semibold text-teal-600 hover:underline flex items-center gap-1"
              >
                All Bills <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {balances.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                All patient bills are fully settled! 🎉
              </div>
            ) : (
              <div className="space-y-3">
                {balances.map((b) => (
                  <div
                    key={b.bill_id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 block">
                        {b.invoice_number}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {b.first_name} {b.last_name}
                      </span>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Paid: ₱{Number(b.total_paid).toLocaleString()} of ₱
                        {Number(b.net_amount).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                        ₱{Number(b.balance_due).toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleOpenPaymentFromBalance(b)}
                        className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                      >
                        <QrCode className="w-3 h-3" />
                        <span>Pay POS</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All invoices table — same as /billing page */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs p-5 space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Invoice History & Payment Statuses
              </h3>
              <p className="text-xs text-slate-500">
                All issued clinic invoices and real-time payment records
              </p>
            </div>

            {bills.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                No invoices yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {paginatedBills.map((bill) => {
                  const paidTotal = (bill.payments || []).reduce(
                    (sum: number, p: any) =>
                      sum + Number(p.amount_logged || 0),
                    0
                  );
                  const due = Math.max(
                    0,
                    Number(bill.net_amount) - paidTotal
                  );
                  return (
                    <div
                      key={bill.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                            {bill.invoice_number}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${
                              billStatusColors[bill.status] ||
                              "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {bill.status.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {bill.patient
                            ? `${bill.patient.last_name}, ${bill.patient.first_name}`
                            : "Patient"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Net: ₱
                          {Number(bill.net_amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}{" "}
                          · Paid: ₱
                          {paidTotal.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })} ·{" "}
                          {new Date(bill.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setReceiptBill(bill);
                            setIsReceiptOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                        {due > 0 && (
                          <button
                            onClick={() => handleOpenPayment(bill)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>
                              Collect ₱
                              {due.toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                              })}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Invoices Pagination */}
                <Pagination
                  currentPage={billsPage}
                  totalPages={Math.max(1, Math.ceil(bills.length / billsPageSize))}
                  totalItems={bills.length}
                  pageSize={billsPageSize}
                  onPageChange={setBillsPage}
                  itemName="invoices"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* WORKSTATION 4 — INTAKE DOCUMENTS VAULT                        */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "documents" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-teal-600" />
                Patient Intake Documents & Consent Forms
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Front-desk receptionist record keeping for signed waivers, IDs,
                and lab reports.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedPatientForDoc(undefined);
                setIsDocModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer shrink-0"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
            {documents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                No documents stored yet. Click "Upload Document" to add patient
                consent forms.
              </div>
            ) : (
              paginatedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {doc.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {doc.category.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                      <span>
                        Patient:{" "}
                        <strong className="text-slate-700 dark:text-slate-300">
                          {doc.patient
                            ? `${doc.patient.last_name}, ${doc.patient.first_name}`
                            : "—"}
                        </strong>
                      </span>
                      <span>·</span>
                      <span>
                        Uploaded by {doc.uploader?.full_name || "Secretary"} ·{" "}
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </p>
                    {doc.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/40 px-2 py-1 rounded-md">
                        "{doc.notes}"
                      </p>
                    )}
                  </div>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 dark:bg-teal-950 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 shrink-0 transition-colors cursor-pointer"
                  >
                    View File
                  </a>
                </div>
              ))
            )}

            {/* Documents Pagination */}
            <Pagination
              currentPage={docsPage}
              totalPages={Math.max(1, Math.ceil(documents.length / docsPageSize))}
              totalItems={documents.length}
              pageSize={docsPageSize}
              onPageChange={setDocsPage}
              itemName="documents"
            />
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      <AppointmentModal
        isOpen={isApptModalOpen}
        onClose={resetApptModalState}
        onSuccess={() => {
          showToast("Appointment successfully booked!", "success");
          resetApptModalState();
          triggerRefresh();
        }}
        initialPatientId={apptInitialPatientId}
        initialNotes={apptInitialNotes}
        initialTime={apptInitialTime}
        standingScheduleNote={apptStandingSchedule}
      />
      <PatientRegistrationModal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        onSuccess={() => {
          showToast("New patient successfully registered!", "success");
          triggerRefresh();
        }}
      />
      <CreateBillModal
        isOpen={isCreateBillOpen}
        onClose={() => setIsCreateBillOpen(false)}
        onSuccess={triggerRefresh}
        preselectedPatientId={selectedPatientForBill}
        preselectedAppointmentId={selectedApptForBill}
      />
      <PaymentModal
        isOpen={Boolean(paymentBill)}
        onClose={() => setPaymentBill(null)}
        onSuccess={triggerRefresh}
        bill={paymentBill}
      />
      <OfficialReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setReceiptBill(null);
        }}
        bill={receiptBill}
      />
      <PatientPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewPatientId(null);
        }}
        patientId={previewPatientId}
        onOpenCreateBill={(patId) => {
          setSelectedPatientForBill(patId);
          setIsCreateBillOpen(true);
        }}
        onOpenApptModal={(patId) => {
          resetApptModalState();
          setApptInitialPatientId(patId);
          setIsApptModalOpen(true);
        }}
      />
      <DocumentIntakeModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        onSuccess={triggerRefresh}
        preselectedPatientId={selectedPatientForDoc}
      />
      <MergePatientModal
        isOpen={isMergeOpen}
        onClose={() => setIsMergeOpen(false)}
        onSuccess={() => {
          triggerRefresh();
          setIsMergeOpen(false);
        }}
        preselectedDupId={mergePreselectedDupId}
      />
      <ConfirmRescheduleModal
        isOpen={isConfirmRescheduleOpen}
        onClose={() => {
          setIsConfirmRescheduleOpen(false);
          setSelectedApptForConfirm(null);
        }}
        onSuccess={triggerRefresh}
        appointment={selectedApptForConfirm}
        dentists={dentists}
        branches={branches}
      />
    </div>
  );
}

export default function SecretaryPortalPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading Front-Desk Hub...</div>}>
      <SecretaryPortalContent />
    </Suspense>
  );
}
