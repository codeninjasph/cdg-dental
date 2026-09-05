"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/clinic-context";
import { Appointment, OutstandingBalance, Treatment, Patient } from "@/types/dental";
import { AppointmentModal } from "@/components/appointments/appointment-modal";
import { PatientRegistrationModal } from "@/components/patients/patient-registration-modal";
import { AddTreatmentModal } from "@/components/patients/add-treatment-modal";
import { PaymentModal } from "@/components/billing/payment-modal";
import { Pagination } from "@/components/ui/pagination";
import {
  Calendar,
  Users,
  CreditCard,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  ArrowRight,
  ChevronRight,
  DollarSign,
  Phone,
  QrCode,
  ShieldAlert,
  Search,
  Filter,
  Stethoscope,
  Sparkles,
  FileText,
  UserCheck,
  RefreshCw,
} from "lucide-react";

// Helper: format YYYY-MM-DD from local date
function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DashboardPage() {
  const {
    currentRole,
    currentStaff,
    staffList,
    activeBranch,
    dentistDuty,
    showToast,
    refreshTrigger,
    triggerRefresh,
    isAdmin,
  } = useClinic();

  // Scoping & Filter States
  const [selectedDentistId, setSelectedDentistId] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"today" | "tomorrow" | "week" | "all" | "custom">("today");
  const [customDate, setCustomDate] = useState<string>(getLocalDateString());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data States
  const [appointments, setAppointments] = useState<any[]>([]);
  const [balances, setBalances] = useState<OutstandingBalance[]>([]);
  const [recentTreatments, setRecentTreatments] = useState<any[]>([]);
  const [patientCount, setPatientCount] = useState<number>(0);
  const [monthRevenue, setMonthRevenue] = useState<number>(0);
  const [monthTreatmentsCount, setMonthTreatmentsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination States
  const [apptsPage, setApptsPage] = useState(1);
  const apptsPageSize = 8;
  const [balancesPage, setBalancesPage] = useState(1);
  const balancesPageSize = 5;

  // Modals state
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [treatmentModal, setTreatmentModal] = useState<{
    isOpen: boolean;
    patientId: string;
    patientName: string;
    initialTooth?: number | null;
    appointmentId?: string | null;
  }>({
    isOpen: false,
    patientId: "",
    patientName: "",
  });
  const [paymentBill, setPaymentBill] = useState<{
    id: string;
    invoice_number: string;
    patient_name: string;
    net_amount: number;
    total_paid: number;
    balance_due: number;
  } | null>(null);

  const supabase = createClient();

  // List of dentists
  const dentists = useMemo(() => {
    return staffList.filter((s) => s.role === "dentist" || s.role === "admin");
  }, [staffList]);

  // Sync selected dentist with logged-in staff
  useEffect(() => {
    if (currentRole === "dentist" && currentStaff?.id) {
      setSelectedDentistId(currentStaff.id);
    } else if (isAdmin && selectedDentistId === "all") {
      // Admin defaults to all
      setSelectedDentistId("all");
    }
  }, [currentRole, currentStaff?.id, isAdmin]);

  // Load Dashboard Data
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const todayStr = getLocalDateString();
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      // 1. Appointments Query
      let apptQuery = supabase
        .from("appointments")
        .select(`
          id, start_time, end_time, status, notes, dentist_id, branch_id,
          patient:patients(id, first_name, last_name, phone, medical_alerts, dob, gender),
          dentist:profiles(id, full_name),
          branch:branches(id, name)
        `);

      if (activeBranch?.id) {
        apptQuery = apptQuery.eq("branch_id", activeBranch.id);
      }

      if (selectedDentistId && selectedDentistId !== "all") {
        apptQuery = apptQuery.eq("dentist_id", selectedDentistId);
      }

      const { data: apptData, error: apptErr } = await apptQuery.order("start_time", { ascending: true });
      if (apptData) {
        setAppointments(apptData);
      }

      // 2. Outstanding Balances Query (scoped to branch)
      let balQuery = supabase
        .from("outstanding_balances")
        .select("*")
        .order("created_at", { ascending: false });

      if (activeBranch?.id) {
        balQuery = balQuery.eq("branch_id", activeBranch.id);
      }

      const { data: balData } = await balQuery;
      if (balData) {
        setBalances(balData);
      }

      // 3. Recent treatments (scoped to doctor if selected)
      let treatQuery = supabase
        .from("treatments")
        .select(`
          id, procedure_name, tooth_number, cost, created_at, dentist_id,
          patient:patients(id, first_name, last_name),
          dentist:profiles(id, full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(6);

      if (selectedDentistId && selectedDentistId !== "all") {
        treatQuery = treatQuery.eq("dentist_id", selectedDentistId);
      }

      const { data: treatData } = await treatQuery;
      if (treatData) {
        setRecentTreatments(treatData);
      }

      // 4. Doctor Monthly Clinical Production
      let monthTreatQuery = supabase
        .from("treatments")
        .select("id, cost, created_at, dentist_id")
        .gte("created_at", startOfMonth);

      if (selectedDentistId && selectedDentistId !== "all") {
        monthTreatQuery = monthTreatQuery.eq("dentist_id", selectedDentistId);
      }

      const { data: monthTreats } = await monthTreatQuery;
      if (monthTreats) {
        const totalCost = monthTreats.reduce((sum, t) => sum + Number(t.cost || 0), 0);
        setMonthRevenue(totalCost);
        setMonthTreatmentsCount(monthTreats.length);
      }

      // 5. Total Distinct Treated Patients for this doctor
      if (selectedDentistId && selectedDentistId !== "all") {
        const { data: doctorPatients } = await supabase
          .from("appointments")
          .select("patient_id")
          .eq("dentist_id", selectedDentistId);

        if (doctorPatients) {
          const uniqueIds = new Set(doctorPatients.map((p) => p.patient_id));
          setPatientCount(uniqueIds.size);
        }
      } else {
        const { count } = await supabase.from("patients").select("*", { count: "exact", head: true });
        if (count !== null) setPatientCount(count);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [refreshTrigger, activeBranch?.id, selectedDentistId]);

  // Handle 1-click status update on appointment
  const handleUpdateStatus = async (apptId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", apptId);

      if (error) throw error;
      showToast(`Appointment status updated to: ${newStatus.toUpperCase()}`, "success");
      triggerRefresh();
    } catch (err: any) {
      showToast(err?.message || "Failed to update appointment", "error");
    }
  };

  // Date Filtering Logic
  const todayStr = getLocalDateString();
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrowObj);

  const weekEndObj = new Date();
  weekEndObj.setDate(weekEndObj.getDate() + 7);
  const weekEndStr = getLocalDateString(weekEndObj);

  // Filtered Appointments based on Date, Status, and Search Query
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      const apptDate = appt.start_time ? appt.start_time.split("T")[0] : "";

      // 1. Date Filter
      if (dateFilter === "today" && apptDate !== todayStr) return false;
      if (dateFilter === "tomorrow" && apptDate !== tomorrowStr) return false;
      if (dateFilter === "week" && (apptDate < todayStr || apptDate > weekEndStr)) return false;
      if (dateFilter === "custom" && apptDate !== customDate) return false;

      // 2. Status Filter
      if (statusFilter !== "all" && appt.status !== statusFilter) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pName = `${appt.patient?.first_name || ""} ${appt.patient?.last_name || ""}`.toLowerCase();
        const phone = (appt.patient?.phone || "").toLowerCase();
        const notes = (appt.notes || "").toLowerCase();
        const alert = (appt.patient?.medical_alerts || "").toLowerCase();
        if (!pName.includes(q) && !phone.includes(q) && !notes.includes(q) && !alert.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, dateFilter, customDate, statusFilter, searchQuery, todayStr, tomorrowStr, weekEndStr]);

  // Reset pagination when filter changes
  useEffect(() => {
    setApptsPage(1);
  }, [dateFilter, statusFilter, searchQuery, selectedDentistId]);

  // Paginated Appointments
  const paginatedAppts = filteredAppointments.slice(
    (apptsPage - 1) * apptsPageSize,
    apptsPage * apptsPageSize
  );

  // Paginated Balances
  const paginatedBalances = balances.slice(
    (balancesPage - 1) * balancesPageSize,
    balancesPage * balancesPageSize
  );

  // Active Operatory: Patient currently in treatment
  const inTreatmentAppt = useMemo(() => {
    return appointments.find((a) => a.status === "in_treatment");
  }, [appointments]);

  // Next Patient in Lobby: status === 'arrived'
  const nextWaitingAppt = useMemo(() => {
    return appointments.find((a) => a.status === "arrived");
  }, [appointments]);

  // Dynamic KPI Calculations
  const todayAppointments = useMemo(() => {
    return appointments.filter((a) => a.start_time && a.start_time.split("T")[0] === todayStr);
  }, [appointments, todayStr]);

  const completedTodayCount = useMemo(() => {
    return todayAppointments.filter((a) => a.status === "completed").length;
  }, [todayAppointments]);

  const inTreatmentCount = useMemo(() => {
    return appointments.filter((a) => a.status === "in_treatment").length;
  }, [appointments]);

  const totalBalanceDue = useMemo(() => {
    return balances.reduce((sum, b) => sum + Number(b.balance_due || 0), 0);
  }, [balances]);

  // Selected Dentist Profile info
  const selectedDentistName = useMemo(() => {
    if (selectedDentistId === "all") return "All Dentists";
    const found = staffList.find((s) => s.id === selectedDentistId);
    return found?.full_name || currentStaff?.full_name || "Doctor";
  }, [selectedDentistId, staffList, currentStaff]);

  return (
    <div className="space-y-5 sm:space-y-8 animate-in fade-in duration-300">
      {/* ── 1. CLINICAL HEADER & DOCTOR OPERATORY SCOPING (MOBILE ENHANCED) ── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white via-slate-50/90 to-teal-50/40 dark:from-slate-900 dark:via-slate-900/95 dark:to-teal-950/25 border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:p-6 lg:p-7">
        {/* Subtle background ambient glow */}
        <div className="absolute -right-10 -top-10 w-44 h-44 bg-teal-500/10 dark:bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse shrink-0" />
                {activeBranch?.name?.replace(/^CDG Dental Clinic\s*[—–-]\s*/i, "").trim() || "Main Clinic Hub"}
              </span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 shadow-2xs">
                <Stethoscope className="w-3 h-3 shrink-0" />
                {currentRole === "dentist" ? "Doctor Operatory" : "Clinical Workstation"}
              </span>

              {dentistDuty && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-2xs ${
                    dentistDuty.isOnDuty
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      dentistDuty.isOnDuty ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    }`}
                  />
                  {dentistDuty.isOnDuty
                    ? `On Duty (${dentistDuty.workingHours || `${dentistDuty.startTime} - ${dentistDuty.endTime}`})`
                    : dentistDuty.reason}
                </span>
              )}

              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                • {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>

            <div className="pt-0.5">
              <h1 className="text-xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {(() => {
                  const hour = new Date().getHours();
                  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
                  return `${greeting}, ${selectedDentistName.split(",")[0]}`;
                })()}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time chairside operatory, patient schedule, and clinical performance overview.
              </p>
            </div>
          </div>

          {/* Dynamic Controls: Doctor Selector (Admins) + Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 shrink-0 pt-1 sm:pt-0">
            {isAdmin && (
              <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-500 shrink-0">Dentist:</span>
                <select
                  value={selectedDentistId}
                  onChange={(e) => setSelectedDentistId(e.target.value)}
                  aria-label="Filter schedule by dentist"
                  className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 border-none outline-none focus:ring-0 cursor-pointer w-full"
                >
                  <option value="all">All Doctors (Clinic-wide)</option>
                  {dentists.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* High-Impact 2-Column Touch Grid on Mobile, Flex on Desktop */}
            <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-2.5">
              <button
                onClick={() => setIsPatientModalOpen(true)}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs shadow-2xs hover:shadow-xs transition-all cursor-pointer min-h-[44px]"
              >
                <Users className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="truncate">New Patient</span>
              </button>

              <button
                onClick={() => setIsApptModalOpen(true)}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs shadow-sm hover:shadow-md shadow-teal-600/20 transition-all cursor-pointer min-h-[44px]"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="truncate">Book Visit</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. DYNAMIC KPI METRIC CARDS (2x2 Grid on Mobile, 4-Col Desktop) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Today's Scheduled Visits */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Visits Today
            </span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {todayAppointments.length}
            </span>
            <span className="text-[10px] sm:text-xs text-teal-600 dark:text-teal-400 font-semibold">
              Appts
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 truncate">
            {completedTodayCount} done • {todayAppointments.length - completedTodayCount} left
          </p>
        </div>

        {/* Card 2: Patients in Chair */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              In Chair
            </span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-3xl font-black text-purple-700 dark:text-purple-400 font-mono">
              {inTreatmentCount}
            </span>
            <span className="text-[10px] sm:text-xs text-purple-600 dark:text-purple-400 font-semibold">
              Active
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 truncate">
            {inTreatmentCount > 0 ? "Patient chairside now" : "Chair available"}
          </p>
        </div>

        {/* Card 3: Clinical Patients */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {selectedDentistId === "all" ? "Total Base" : "My Patients"}
            </span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {patientCount}
            </span>
            <span className="text-[10px] sm:text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
              Charts
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 truncate">
            With odontograms
          </p>
        </div>

        {/* Card 4: Clinical Production This Month */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Production
            </span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              ₱{monthRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 truncate">
            {monthTreatmentsCount} procedures this mo.
          </p>
        </div>
      </div>

      {/* ── 3. LIVE CHAIRSIDE OPERATORY HERO CARD (MOBILE REDESIGN) ── */}
      <div className="rounded-2xl sm:rounded-3xl border transition-all overflow-hidden shadow-sm bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800">
        {inTreatmentAppt ? (
          <div className="p-4 sm:p-6 bg-gradient-to-br from-purple-500/15 via-indigo-500/5 to-transparent border-l-4 border-l-purple-500">
            <div className="space-y-4">
              {/* Status Header */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-purple-600 text-white shadow-xs tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  CHAIRSIDE OPERATORY • ACTIVE SESSION
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                  Started {new Date(inTreatmentAppt.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              {/* Patient Identity & Details */}
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center font-black text-lg sm:text-xl shadow-md ring-2 ring-purple-500/30 shrink-0">
                  {inTreatmentAppt.patient?.first_name?.[0] || "P"}
                  {inTreatmentAppt.patient?.last_name?.[0] || ""}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/patients/${inTreatmentAppt.patient?.id}`}
                      className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-1.5 group transition-colors truncate"
                    >
                      <span className="truncate">
                        {inTreatmentAppt.patient?.first_name} {inTreatmentAppt.patient?.last_name}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
                    </Link>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    {inTreatmentAppt.patient?.phone && (
                      <a
                        href={`tel:${inTreatmentAppt.patient.phone}`}
                        className="inline-flex items-center gap-1 font-mono text-teal-600 dark:text-teal-400 hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{inTreatmentAppt.patient.phone}</span>
                      </a>
                    )}
                    {inTreatmentAppt.patient?.gender && (
                      <span>• {inTreatmentAppt.patient.gender}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Medical Alert Warning Pill (High Contrast Rose) */}
              {inTreatmentAppt.patient?.medical_alerts ? (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-bold">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block uppercase tracking-wider text-[10px] text-rose-600 dark:text-rose-400">Critical Medical Alert</span>
                    <span>{inTreatmentAppt.patient.medical_alerts}</span>
                  </div>
                </div>
              ) : null}

              {/* Notes */}
              {inTreatmentAppt.notes && (
                <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-white/80 dark:bg-slate-850/80 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  "{inTreatmentAppt.notes}"
                </p>
              )}

              {/* Instant Chairside Actions for Mobile & Desktop */}
              <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
                <Link
                  href={`/patients/${inTreatmentAppt.patient?.id}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-xs font-extrabold shadow-xs transition-all active:scale-98 min-h-[44px]"
                >
                  <Stethoscope className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Open Odontogram & Chart</span>
                </Link>

                <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-2.5">
                  <button
                    onClick={() =>
                      setTreatmentModal({
                        isOpen: true,
                        patientId: inTreatmentAppt.patient?.id,
                        patientName: `${inTreatmentAppt.patient?.first_name} ${inTreatmentAppt.patient?.last_name}`,
                        appointmentId: inTreatmentAppt.id,
                      })
                    }
                    className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold shadow-sm hover:shadow-md shadow-purple-600/20 transition-all cursor-pointer active:scale-98 min-h-[44px]"
                  >
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>Record Treatment</span>
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(inTreatmentAppt.id, "completed")}
                    className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-sm hover:shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-98 min-h-[44px]"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Complete Visit</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 bg-slate-50/80 dark:bg-slate-850/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 shadow-2xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                      Operatory Chair Available
                    </h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {nextWaitingAppt
                      ? `Patient in lobby: ${nextWaitingAppt.patient?.first_name} ${nextWaitingAppt.patient?.last_name}`
                      : "Operatory sanitized and ready for next patient check-in."}
                  </p>
                </div>
              </div>

              {nextWaitingAppt && (
                <button
                  onClick={() => handleUpdateStatus(nextWaitingAppt.id, "in_treatment")}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-98 text-white text-xs font-extrabold shadow-md shadow-purple-600/25 transition-all cursor-pointer min-h-[44px]"
                >
                  <Activity className="w-4 h-4 animate-pulse shrink-0" />
                  <span>Call to Chair: {nextWaitingAppt.patient?.first_name}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 4. TWO-COLUMN WORKSPACE: SCHEDULE QUEUE + CLINICAL ACTIVITY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* LEFT 2 COLUMNS: DYNAMIC APPOINTMENTS & PATIENT QUEUE */}
        <div className="lg:col-span-2 space-y-4">
          {/* Section Header with Date & Status Filter Controls */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Patient Schedule & Operatory Queue</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredAppointments.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Live queue progression: Scheduled → Arrived (Waiting) → In Treatment → Completed
                </p>
              </div>

              <Link
                href="/appointments"
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1 self-start sm:self-center"
              >
                Full Calendar <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Filter Toolbar: Date Tabs + Custom Date + Search */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              {/* Date Filter Tabs */}
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setDateFilter("today")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    dateFilter === "today"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setDateFilter("tomorrow")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    dateFilter === "tomorrow"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Tomorrow
                </button>
                <button
                  onClick={() => setDateFilter("week")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    dateFilter === "week"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Next 7 Days
                </button>
                <button
                  onClick={() => setDateFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    dateFilter === "all"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  All Dates
                </button>
              </div>

              {/* Search & Custom Date */}
              <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search queue..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    setDateFilter("custom");
                  }}
                  aria-label="Filter schedule by specific date"
                  className="px-2.5 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { key: "all", label: "All Visits" },
                { key: "arrived", label: "Waiting / Arrived" },
                { key: "in_treatment", label: "In Operatory" },
                { key: "scheduled", label: "Scheduled" },
                { key: "completed", label: "Completed" },
              ].map((pill) => (
                <button
                  key={pill.key}
                  onClick={() => setStatusFilter(pill.key)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                    statusFilter === pill.key
                      ? "bg-teal-600 text-white font-bold"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Queue List Table/Cards */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Loading clinical schedule...</span>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  No appointments found for the selected date and filters.
                </p>
                <button
                  onClick={() => setIsApptModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Book an appointment
                </button>
              </div>
            ) : (
              paginatedAppts.map((appt) => {
                const startTimeStr = new Date(appt.start_time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const endTimeStr = new Date(appt.end_time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const apptDateStr = new Date(appt.start_time).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });

                const statusStyles: Record<string, string> = {
                  scheduled: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
                  confirmed: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300",
                  arrived: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 font-bold",
                  in_treatment: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 animate-pulse font-bold",
                  completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
                  cancelled: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400",
                };

                return (
                  <div
                    key={appt.id}
                    className="p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors"
                  >
                    {/* Mobile Glanceable Top Bar (Phone only) */}
                    <div className="flex sm:hidden items-center justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200">
                        <Clock className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                        <span>{startTimeStr}</span>
                        <span className="text-slate-400 font-normal">({apptDateStr})</span>
                      </div>

                      <span
                        className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border ${
                          statusStyles[appt.status] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {appt.status.replace("_", " ")}
                      </span>
                    </div>

                    {/* Time & Patient Details */}
                    <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                      {/* Desktop Left Time Box */}
                      <div className="hidden sm:flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-center min-w-[76px] shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {apptDateStr}
                        </span>
                        <span className="text-xs font-black font-mono text-slate-800 dark:text-slate-200">
                          {startTimeStr}
                        </span>
                        <span className="text-[10px] text-slate-400">to {endTimeStr}</span>
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/patients/${appt.patient?.id}`}
                            className="font-black text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 text-base flex items-center gap-1.5 group truncate"
                          >
                            <span className="truncate">
                              {appt.patient?.first_name} {appt.patient?.last_name}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
                          </Link>

                          <span
                            className={`hidden sm:inline-block text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border ${
                              statusStyles[appt.status] || "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {appt.status.replace("_", " ")}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2.5 sm:gap-3 flex-wrap">
                          <span>
                            Attending: <strong className="text-slate-700 dark:text-slate-300">{appt.dentist?.full_name?.split(",")[0] || "Doctor"}</strong>
                          </span>
                          {appt.patient?.phone && (
                            <a
                              href={`tel:${appt.patient.phone}`}
                              className="inline-flex items-center gap-1 font-mono text-[11px] text-teal-600 dark:text-teal-400 hover:underline"
                            >
                              <Phone className="w-3 h-3 shrink-0" />
                              <span>{appt.patient.phone}</span>
                            </a>
                          )}
                        </div>

                        {appt.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded-lg max-w-lg border border-slate-200/60 dark:border-slate-750">
                            "{appt.notes}"
                          </p>
                        )}

                        {/* Medical Alerts badge */}
                        {appt.patient?.medical_alerts && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-[11px] font-bold">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>Medical Alert: {appt.patient.medical_alerts}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Status Progression & Direct Action Buttons (Mobile-Optimized Touch Grid) */}
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0">
                      {/* Scheduled / Confirmed -> Mark Arrived */}
                      {(appt.status === "scheduled" || appt.status === "confirmed") && (
                        <button
                          onClick={() => handleUpdateStatus(appt.id, "arrived")}
                          className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300/70 dark:border-amber-800/80 transition-colors cursor-pointer min-h-[42px] flex items-center justify-center"
                        >
                          Mark Arrived
                        </button>
                      )}

                      {/* Arrived -> Call to Operatory */}
                      {appt.status === "arrived" && (
                        <button
                          onClick={() => handleUpdateStatus(appt.id, "in_treatment")}
                          className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-98 text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[42px] shadow-sm shadow-purple-600/20"
                        >
                          <Activity className="w-4 h-4 animate-pulse" />
                          <span>Call to Chair</span>
                        </button>
                      )}

                      {/* In Treatment -> Record Treatment or Complete */}
                      {appt.status === "in_treatment" && (
                        <div className="grid grid-cols-2 sm:flex items-center gap-2 flex-1 sm:flex-initial">
                          <button
                            onClick={() =>
                              setTreatmentModal({
                                isOpen: true,
                                patientId: appt.patient?.id,
                                patientName: `${appt.patient?.first_name} ${appt.patient?.last_name}`,
                                appointmentId: appt.id,
                              })
                            }
                            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer flex items-center justify-center gap-1 min-h-[42px]"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Treatment</span>
                          </button>

                          <button
                            onClick={() => handleUpdateStatus(appt.id, "completed")}
                            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer min-h-[42px] flex items-center justify-center"
                          >
                            Complete
                          </button>
                        </div>
                      )}

                      {/* Odontogram Link Icon */}
                      <Link
                        href={`/patients/${appt.patient?.id}`}
                        className="p-2.5 rounded-xl text-slate-400 hover:text-teal-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors min-h-[42px] min-w-[42px] flex items-center justify-center shrink-0"
                        title="Open Patient Dental Chart & Odontogram"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}

            {/* Pagination for Appointments Queue */}
            <Pagination
              currentPage={apptsPage}
              totalPages={Math.max(1, Math.ceil(filteredAppointments.length / apptsPageSize))}
              totalItems={filteredAppointments.length}
              pageSize={apptsPageSize}
              onPageChange={setApptsPage}
              itemName="visits"
              compact={true}
            />
          </div>
        </div>

        {/* RIGHT 1 COLUMN: CLINICAL ACTIVITY & OUTSTANDING RECEIVABLES */}
        <div className="space-y-6">
          {/* Recent Completed Clinical Treatments */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-teal-600" />
                  <span>Clinical Activity Feed</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedDentistId === "all" ? "Latest procedures clinic-wide" : `Procedures by ${selectedDentistName.split(",")[0]}`}
                </p>
              </div>
            </div>

            {recentTreatments.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                No clinical treatments recorded yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentTreatments.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-1 hover:border-teal-200 dark:hover:border-teal-900/60 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {t.procedure_name}
                      </span>
                      <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                        ₱{Number(t.cost).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <Link
                        href={`/patients/${t.patient?.id}`}
                        className="hover:text-teal-600 font-medium"
                      >
                        {t.patient?.first_name} {t.patient?.last_name}
                        {t.tooth_number ? ` • Tooth #${t.tooth_number}` : ""}
                      </Link>
                      <span>
                        {new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outstanding Balances Widget */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-rose-600" />
                  <span>Outstanding Balances</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Total Due: <strong className="text-rose-600 font-mono">₱{totalBalanceDue.toLocaleString()}</strong>
                </p>
              </div>
              <Link
                href="/billing"
                className="text-xs font-semibold text-teal-600 hover:underline"
              >
                All Bills →
              </Link>
            </div>

            {balances.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                All patient bills are fully settled!
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedBalances.map((b) => (
                  <div
                    key={b.bill_id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 block">
                        {b.invoice_number}
                      </span>
                      <Link
                        href={`/patients/${b.patient_id}`}
                        className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600"
                      >
                        {b.first_name} {b.last_name}
                      </Link>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Paid: ₱{Number(b.total_paid).toLocaleString()} of ₱{Number(b.net_amount).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                        ₱{Number(b.balance_due).toLocaleString()}
                      </span>
                      <button
                        onClick={() =>
                          setPaymentBill({
                            id: b.bill_id,
                            invoice_number: b.invoice_number,
                            patient_name: `${b.first_name} ${b.last_name}`,
                            net_amount: Number(b.net_amount),
                            total_paid: Number(b.total_paid),
                            balance_due: Number(b.balance_due),
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                      >
                        <QrCode className="w-3 h-3" />
                        <span>Pay POS</span>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Pagination for Balances Widget */}
                <Pagination
                  currentPage={balancesPage}
                  totalPages={Math.max(1, Math.ceil(balances.length / balancesPageSize))}
                  totalItems={balances.length}
                  pageSize={balancesPageSize}
                  onPageChange={setBalancesPage}
                  itemName="accounts"
                  compact={true}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 5. INTEGRATED MODALS ── */}
      <AppointmentModal
        isOpen={isApptModalOpen}
        onClose={() => setIsApptModalOpen(false)}
        onSuccess={triggerRefresh}
      />

      <PatientRegistrationModal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        onSuccess={triggerRefresh}
      />

      {/* Direct Treatment Modal from Chairside Station or Queue */}
      {treatmentModal.patientId && (
        <AddTreatmentModal
          isOpen={treatmentModal.isOpen}
          onClose={() => setTreatmentModal({ isOpen: false, patientId: "", patientName: "" })}
          onSuccess={() => {
            setTreatmentModal({ isOpen: false, patientId: "", patientName: "" });
            triggerRefresh();
            showToast("Treatment recorded and queued for front-desk checkout!", "success");
          }}
          patientId={treatmentModal.patientId}
          initialToothNumber={treatmentModal.initialTooth}
          appointmentId={treatmentModal.appointmentId}
        />
      )}

      <PaymentModal
        isOpen={paymentBill !== null}
        onClose={() => setPaymentBill(null)}
        onSuccess={triggerRefresh}
        bill={paymentBill}
      />
    </div>
  );
}
