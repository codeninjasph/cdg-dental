"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/clinic-context";
import { Appointment, OutstandingBalance, Treatment, Patient } from "@/types/dental";
import { AppointmentModal } from "@/components/appointments/appointment-modal";
import { PatientRegistrationModal } from "@/components/patients/patient-registration-modal";
import { PaymentModal } from "@/components/billing/payment-modal";
import { InviteStaffModal } from "@/components/admin/invite-staff-modal";
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
  TrendingUp,
  ChevronRight,
  DollarSign,
  Phone,
  QrCode,
  ShieldAlert,
  UserCheck,
  Shield,
  UserPlus,
  Building2,
} from "lucide-react";

export default function DashboardPage() {
  const { currentRole, currentStaff, activeBranch, showToast, refreshTrigger, triggerRefresh, isAdmin } = useClinic();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [balances, setBalances] = useState<OutstandingBalance[]>([]);
  const [recentTreatments, setRecentTreatments] = useState<any[]>([]);
  const [patientCount, setPatientCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Widget Pagination States
  const [apptsPage, setApptsPage] = useState(1);
  const apptsPageSize = 5;
  const paginatedAppts = appointments.slice(
    (apptsPage - 1) * apptsPageSize,
    apptsPage * apptsPageSize
  );

  const [balancesPage, setBalancesPage] = useState(1);
  const balancesPageSize = 5;
  const paginatedBalances = balances.slice(
    (balancesPage - 1) * balancesPageSize,
    balancesPage * balancesPageSize
  );

  // Modals state
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isInviteStaffOpen, setIsInviteStaffOpen] = useState(false);
  const [paymentBill, setPaymentBill] = useState<{
    id: string;
    invoice_number: string;
    patient_name: string;
    net_amount: number;
    total_paid: number;
    balance_due: number;
  } | null>(null);

  const supabase = createClient();

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Appointments with patient and dentist details
      const { data: apptData, error: apptErr } = await supabase
        .from("appointments")
        .select(`
          id, start_time, end_time, status, notes,
          patient:patients(id, first_name, last_name, phone, medical_alerts),
          dentist:profiles(id, full_name)
        `)
        .order("start_time", { ascending: true });

      if (apptData) setAppointments(apptData);

      // 2. Outstanding Balances View
      const { data: balData } = await supabase
        .from("outstanding_balances")
        .select("*")
        .order("created_at", { ascending: false });

      if (balData) setBalances(balData);

      // 3. Recent treatments
      const { data: treatData } = await supabase
        .from("treatments")
        .select(`
          id, procedure_name, tooth_number, cost, created_at,
          patient:patients(id, first_name, last_name),
          dentist:profiles(id, full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (treatData) setRecentTreatments(treatData);

      // 4. Patients count
      const { count } = await supabase.from("patients").select("*", { count: "exact", head: true });
      if (count !== null) setPatientCount(count);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [refreshTrigger, activeBranch]);

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

  // Calculations
  const totalBalanceDue = balances.reduce((sum, b) => sum + Number(b.balance_due), 0);
  const inTreatmentCount = appointments.filter((a) => a.status === "in_treatment").length;
  const completedTodayCount = appointments.filter((a) => a.status === "completed").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome & Quick Action Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 text-white shadow-xl shadow-teal-950/20 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 top-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-400/30">
              {activeBranch?.name || "Main Clinic"}
            </span>
            <span className="text-xs text-slate-400">
              Logged in as <strong className="text-teal-200">{currentStaff?.full_name || "Staff"}</strong> ({currentRole.toUpperCase()})
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Clinic Operations & Practice Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Real-time appointment queue, 32-tooth odontogram records, and integrated GCash/Cash ledger.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          {isAdmin && (
            <>
              <Link
                href="/admin/users"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md shadow-violet-600/30 hover:shadow-lg transition-all cursor-pointer"
              >
                <Shield className="w-4 h-4" />
                <span>Staff & Access</span>
              </Link>
              <Link
                href="/admin/branches"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600/80 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/30 hover:shadow-lg transition-all cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                <span>Branches</span>
              </Link>
              <button
                onClick={() => setIsInviteStaffOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 border border-violet-400/40 font-bold text-xs backdrop-blur-sm transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Invite Staff</span>
              </button>
            </>
          )}
          {isAdmin && (
            <Link
              href="/secretary"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/25 hover:shadow-lg transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Secretary Desk</span>
            </Link>
          )}
          <button
            onClick={() => setIsApptModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 backdrop-blur-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Book Visit</span>
          </button>
          <button
            onClick={() => setIsPatientModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 backdrop-blur-sm transition-all cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Register Patient</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Appointments */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Scheduled Visits
            </span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {appointments.length}
            </span>
            <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">
              Appointments
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {completedTodayCount} completed today
          </p>
        </div>

        {/* Card 2: Patients in Chair */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              In Treatment Chair
            </span>
            <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-cyan-700 dark:text-cyan-400 font-mono">
              {inTreatmentCount}
            </span>
            <span className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
              Active Now
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Dental operatories active
          </p>
        </div>

        {/* Card 3: Total Registered Patients */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Patient Database
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {patientCount}
            </span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              Active Charts
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            32-tooth odontograms mapped
          </p>
        </div>

        {/* Card 4: Outstanding Receivables */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pending Balances
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
      </div>

      {/* TWO COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT 2 COLS: APPOINTMENTS & PATIENT QUEUE */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Today's Patient Schedule & Queue
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {appointments.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                1-click check-in for receptionists and doctors
              </p>
            </div>
            <Link
              href="/appointments"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1"
            >
              Full Calendar <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
            {appointments.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                No appointments booked for this schedule yet. Click "Book Appointment" above.
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

                const statusStyles: Record<string, string> = {
                  scheduled: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
                  confirmed: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300",
                  arrived: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
                  in_treatment: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 animate-pulse",
                  completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
                  cancelled: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400",
                };

                return (
                  <div
                    key={appt.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors"
                  >
                    {/* Time & Patient */}
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-center min-w-[70px]">
                        <Clock className="w-4 h-4 text-slate-500 mb-1" />
                        <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                          {startTimeStr}
                        </span>
                        <span className="text-[10px] text-slate-400">to {endTimeStr}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/patients/${appt.patient?.id}`}
                            className="font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 text-base flex items-center gap-1.5"
                          >
                            {appt.patient?.first_name} {appt.patient?.last_name}
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          </Link>
                          <span
                            className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${
                              statusStyles[appt.status] || "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {appt.status.replace("_", " ")}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                          <span>Dentist: <strong className="text-slate-700 dark:text-slate-300">{appt.dentist?.full_name}</strong></span>
                          {appt.patient?.phone && (
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400" /> {appt.patient.phone}
                            </span>
                          )}
                        </p>

                        {appt.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/40 px-2 py-1 rounded-md">
                            "{appt.notes}"
                          </p>
                        )}

                        {/* Medical Alerts badge if any */}
                        {appt.patient?.medical_alerts && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 text-[10px] font-bold">
                            <ShieldAlert className="w-3 h-3 text-rose-600" />
                            <span>Alert: {appt.patient.medical_alerts}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Status Progression Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {appt.status === "scheduled" && (
                        <button
                          onClick={() => handleUpdateStatus(appt.id, "arrived")}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors"
                        >
                          Mark Arrived
                        </button>
                      )}
                      {appt.status === "arrived" && (
                        <button
                          onClick={() => handleUpdateStatus(appt.id, "in_treatment")}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-100 hover:bg-purple-200 text-purple-900 transition-colors"
                        >
                          Take to Operatory
                        </button>
                      )}
                      {appt.status === "in_treatment" && (
                        <button
                          onClick={() => handleUpdateStatus(appt.id, "completed")}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 transition-colors"
                        >
                          Mark Completed
                        </button>
                      )}
                      <Link
                        href={`/patients/${appt.patient?.id}`}
                        className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Open Patient Dental Chart"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}

            {/* Compact Pagination for Appointments Queue */}
            <Pagination
              currentPage={apptsPage}
              totalPages={Math.max(1, Math.ceil(appointments.length / apptsPageSize))}
              totalItems={appointments.length}
              pageSize={apptsPageSize}
              onPageChange={setApptsPage}
              itemName="visits"
              compact={true}
            />
          </div>
        </div>

        {/* RIGHT 1 COL: FINANCIAL OUTSTANDING & RECENT CLINICAL ACTIVITY */}
        <div className="space-y-6">
          {/* Outstanding Balances Widget */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Outstanding Balances
                </h3>
                <p className="text-xs text-slate-500">Live clinic receivables</p>
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
                        className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs"
                      >
                        <QrCode className="w-3 h-3" />
                        <span>Pay POS</span>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Compact Pagination for Balances Widget */}
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

          {/* Recent Completed Treatments */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Recent Clinical Treatments
                </h3>
                <p className="text-xs text-slate-500">Procedures performed</p>
              </div>
            </div>

            {recentTreatments.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                No treatments recorded yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentTreatments.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {t.procedure_name}
                      </span>
                      <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                        ₱{Number(t.cost).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        Patient: {t.patient?.first_name} {t.patient?.last_name}
                        {t.tooth_number ? ` (Tooth #${t.tooth_number})` : ""}
                      </span>
                      <span>By: {t.dentist?.full_name?.split(",")[0] || "Doctor"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
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

      <PaymentModal
        isOpen={paymentBill !== null}
        onClose={() => setPaymentBill(null)}
        onSuccess={triggerRefresh}
        bill={paymentBill}
      />

      <InviteStaffModal
        isOpen={isInviteStaffOpen}
        onClose={() => setIsInviteStaffOpen(false)}
        onSuccess={triggerRefresh}
      />
    </div>
  );
}
