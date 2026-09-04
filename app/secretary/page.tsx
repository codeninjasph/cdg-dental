"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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

import {
  Calendar,
  Users,
  CreditCard,
  Plus,
  Clock,
  CheckCircle2,
  Activity,
  Phone,
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
  Building2,
  RefreshCw,
  ShieldAlert,
  ArrowRight,
  Merge,
} from "lucide-react";

export default function SecretaryPortalPage() {
  const {
    currentRole,
    currentStaff,
    activeBranch,
    showToast,
    refreshTrigger,
    triggerRefresh,
    staffList,
  } = useClinic();

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    "queue" | "patients" | "billing" | "documents"
  >("queue");

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

  // Modals state
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [apptInitialPatientId, setApptInitialPatientId] = useState<
    string | undefined
  >();
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
  } | null>(null);

  const supabase = createClient();
  const dentists = staffList.filter(
    (s) => s.role === "dentist" || s.role === "admin"
  );

  const loadSecretaryData = async () => {
    setIsLoading(true);
    try {
      const { data: apptData } = await supabase
        .from("appointments")
        .select(
          `id, start_time, end_time, status, notes, dentist_id, branch_id,
          patient:patients(id, first_name, last_name, phone, email, medical_alerts),
          dentist:profiles(id, full_name)`
        )
        .order("start_time", { ascending: true });
      if (apptData) setAppointments(apptData);

      const { data: balData } = await supabase
        .from("outstanding_balances")
        .select("*")
        .order("created_at", { ascending: false });
      if (balData) setBalances(balData);

      const { data: billData } = await supabase
        .from("treatment_bills")
        .select(
          `*, patient:patients(id, first_name, last_name, phone, address),
          appointment:appointments(start_time, dentist:profiles(full_name)),
          payments:payment_logs(id, amount_logged, payment_method, reference_number, logged_at, staff:profiles(full_name))`
        )
        .order("created_at", { ascending: false });
      if (billData) setBills(billData);

      const { data: patData } = await supabase
        .from("patients")
        .select("*")
        .order("last_name", { ascending: true });
      if (patData) setPatients(patData);

      const { data: payData } = await supabase
        .from("payment_logs")
        .select(
          `*, bill:treatment_bills(invoice_number, patient:patients(first_name, last_name)), staff:profiles(full_name)`
        )
        .order("logged_at", { ascending: false })
        .limit(20);
      if (payData) setPayments(payData);

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
    });
  };

  const handleOpenPaymentFromBalance = (b: OutstandingBalance) => {
    setPaymentBill({
      id: b.bill_id,
      invoice_number: b.invoice_number,
      patient_name: `${b.first_name} ${b.last_name}`,
      net_amount: Number(b.net_amount),
      total_paid: Number(b.total_paid),
      balance_due: Number(b.balance_due),
    });
  };

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
          onClick={() => setActiveTab("queue")}
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
          onClick={() => setActiveTab("patients")}
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
          onClick={() => setActiveTab("billing")}
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
          onClick={() => setActiveTab("documents")}
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
                  onChange={(e) => setQueueDate(e.target.value)}
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
                  onChange={(e) => setDentistFilter(e.target.value)}
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
              queueAppointments.map((appt) => {
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
                          onClick={() =>
                            handleUpdateStatus(appt.id, "confirmed")
                          }
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 transition-colors cursor-pointer"
                        >
                          Confirm Call
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
          </div>
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
                onChange={(e) => setPatientSearch(e.target.value)}
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
              {filteredPatients.map((p) => (
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
                Live feed from{" "}
                <code className="font-mono text-teal-600">
                  outstanding_balances
                </code>{" "}
                view. Trigger-synced bill statuses.
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
                  Real-time PostgreSQL{" "}
                  <code className="font-mono text-teal-600">
                    outstanding_balances
                  </code>{" "}
                  view
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
                All Invoices & Trigger-Synced Statuses
              </h3>
              <p className="text-xs text-slate-500">
                Statuses automatically updated by{" "}
                <code className="font-mono text-teal-600">
                  trg_payment_sync_bill
                </code>
              </p>
            </div>

            {bills.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                No invoices yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {bills.map((bill) => {
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
              documents.map((doc) => (
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
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      <AppointmentModal
        isOpen={isApptModalOpen}
        onClose={() => setIsApptModalOpen(false)}
        onSuccess={() => {
          showToast("Appointment successfully booked!", "success");
          triggerRefresh();
        }}
        initialPatientId={apptInitialPatientId}
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
    </div>
  );
}
