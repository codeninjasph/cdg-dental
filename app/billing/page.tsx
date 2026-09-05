"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/clinic-context";
import { OutstandingBalance, TreatmentBill, PaymentLog } from "@/types/dental";
import { PaymentModal } from "@/components/billing/payment-modal";
import { Pagination } from "@/components/ui/pagination";
import {
  CreditCard,
  QrCode,
  Banknote,
  DollarSign,
  TrendingUp,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Clock,
  Landmark,
  ChevronRight,
  Filter,
  BarChart3,
  Search,
  Calendar,
  Building2,
  Stethoscope,
  User,
  Phone,
  ArrowUpRight,
  X,
  Sparkles,
  Repeat,
  FileText,
  ShieldCheck,
} from "lucide-react";

export default function BillingPage() {
  const {
    showToast,
    refreshTrigger,
    triggerRefresh,
    activeBranch,
    branches,
    currentStaff,
    isAdmin,
    currentRole,
  } = useClinic();

  const [bills, setBills] = useState<any[]>([]);
  const [balances, setBalances] = useState<OutstandingBalance[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "this_week" | "this_month">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Doctor role features
  const isDoctor = currentRole === "dentist" || currentStaff?.role === "dentist";
  const [onlyMyTreatments, setOnlyMyTreatments] = useState(false);
  const [mobileTab, setMobileTab] = useState<"invoices" | "balances" | "payments">("invoices");

  // Branch Scoping Logic
  const userBranchId = currentStaff?.branch_id || activeBranch?.id || null;
  const canSelectAllBranches = isAdmin || !currentStaff?.branch_id;
  const [selectedBranchId, setSelectedBranchId] = useState<string>("auto");

  const effectiveBranchId = React.useMemo(() => {
    if (!canSelectAllBranches && userBranchId) {
      return userBranchId;
    }
    if (selectedBranchId === "all") return "all";
    if (selectedBranchId === "auto") {
      return activeBranch?.id || userBranchId || "all";
    }
    return selectedBranchId;
  }, [canSelectAllBranches, userBranchId, selectedBranchId, activeBranch]);

  // POS Payment Modal State
  const [activePaymentBill, setActivePaymentBill] = useState<any | null>(null);

  const supabase = createClient();

  const loadBillingData = async () => {
    setIsLoading(true);
    try {
      // 1. Treatment bills with patient, branch, dentist, and payments
      let billsQuery = supabase
        .from("treatment_bills")
        .select(`
          *,
          branch:branches(id, name),
          patient:patients(id, first_name, last_name, phone),
          dentist:profiles!treatment_bills_dentist_id_fkey(id, full_name),
          treatments:treatments(*),
          payments:payment_logs(*)
        `)
        .order("created_at", { ascending: false });

      if (effectiveBranchId !== "all") {
        billsQuery = billsQuery.eq("branch_id", effectiveBranchId);
      }

      const { data: billData } = await billsQuery;
      if (billData) setBills(billData);

      // 2. Outstanding balances view
      let balQuery = supabase
        .from("outstanding_balances")
        .select("*")
        .order("balance_due", { ascending: false });

      if (effectiveBranchId !== "all") {
        balQuery = balQuery.eq("branch_id", effectiveBranchId);
      }

      const { data: balData } = await balQuery;
      if (balData) setBalances(balData);

      // 3. Payment logs with staff profile and branch
      let logsQuery = supabase
        .from("payment_logs")
        .select(`
          *,
          branch:branches(id, name),
          bill:treatment_bills(id, invoice_number, branch_id, dentist_id, patient:patients(first_name, last_name)),
          staff:profiles(full_name)
        `)
        .order("logged_at", { ascending: false });

      if (effectiveBranchId !== "all") {
        logsQuery = logsQuery.eq("branch_id", effectiveBranchId);
      }

      const { data: logsData } = await logsQuery;
      if (logsData) setPaymentLogs(logsData);
    } catch (err) {
      console.error("Error loading billing data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, [refreshTrigger, effectiveBranchId]);

  // Doctor scope matching
  const doctorStaffId = currentStaff?.id;
  const doctorFullName = currentStaff?.full_name?.toLowerCase().trim();

  // In-memory safety guard with doctor filter
  const branchFilteredBills = React.useMemo(() => {
    let result = effectiveBranchId === "all" ? bills : bills.filter((b) => b.branch_id === effectiveBranchId);
    if (isDoctor && onlyMyTreatments) {
      result = result.filter((b) => {
        if (b.dentist_id && doctorStaffId && b.dentist_id === doctorStaffId) return true;
        if (doctorFullName && b.dentist?.full_name && b.dentist.full_name.toLowerCase().includes(doctorFullName)) return true;
        return false;
      });
    }
    return result;
  }, [bills, effectiveBranchId, isDoctor, onlyMyTreatments, doctorStaffId, doctorFullName]);

  const branchFilteredBalances = React.useMemo(() => {
    let result = effectiveBranchId === "all" ? balances : balances.filter((b) => b.branch_id === effectiveBranchId);
    if (isDoctor && onlyMyTreatments) {
      const myBillIds = new Set(branchFilteredBills.map((b) => b.id));
      result = result.filter((bal) => myBillIds.has(bal.bill_id));
    }
    return result;
  }, [balances, effectiveBranchId, isDoctor, onlyMyTreatments, branchFilteredBills]);

  const branchFilteredPayments = React.useMemo(() => {
    let result =
      effectiveBranchId === "all"
        ? paymentLogs
        : paymentLogs.filter(
            (p) => p.branch_id === effectiveBranchId || p.bill?.branch_id === effectiveBranchId
          );
    if (isDoctor && onlyMyTreatments) {
      const myBillIds = new Set(branchFilteredBills.map((b) => b.id));
      result = result.filter((p) => myBillIds.has(p.bill_id));
    }
    return result;
  }, [paymentLogs, effectiveBranchId, isDoctor, onlyMyTreatments, branchFilteredBills]);

  // Date Filtering Logic
  const dateBoundaries = React.useMemo(() => {
    const now = new Date();
    if (dateFilter === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      return { start, end: now };
    }
    if (dateFilter === "this_week") {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    if (dateFilter === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { start, end: now };
    }
    return { start: null, end: null };
  }, [dateFilter]);

  const dateFilteredBills = React.useMemo(() => {
    const { start, end } = dateBoundaries;
    return branchFilteredBills.filter((b) => {
      if (!start) return true;
      const bDate = new Date(b.created_at);
      return bDate >= start && (!end || bDate <= end);
    });
  }, [branchFilteredBills, dateBoundaries]);

  const dateFilteredPayments = React.useMemo(() => {
    const { start, end } = dateBoundaries;
    return branchFilteredPayments.filter((p) => {
      if (!start) return true;
      const pDate = new Date(p.logged_at);
      return pDate >= start && (!end || pDate <= end);
    });
  }, [branchFilteredPayments, dateBoundaries]);

  // Aggregate Metrics (based on filtered date)
  const totalBilled = dateFilteredBills.reduce((sum, b) => sum + Number(b.net_amount), 0);
  const totalCollected = dateFilteredPayments.reduce((sum, p) => sum + Number(p.amount_logged), 0);
  const totalOutstanding = branchFilteredBalances.reduce((sum, b) => sum + Number(b.balance_due), 0);

  // Method breakdowns
  const gcashTotal = dateFilteredPayments
    .filter((p) => p.payment_method === "gcash")
    .reduce((sum, p) => sum + Number(p.amount_logged), 0);
  const cashTotal = dateFilteredPayments
    .filter((p) => p.payment_method === "cash")
    .reduce((sum, p) => sum + Number(p.amount_logged), 0);
  const cardTotal = dateFilteredPayments
    .filter((p) => p.payment_method === "card")
    .reduce((sum, p) => sum + Number(p.amount_logged), 0);

  const [billsPage, setBillsPage] = useState(1);
  const [billsPageSize, setBillsPageSize] = useState(10);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const paymentsPageSize = 5;

  const filteredBills = dateFilteredBills.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const invMatch = b.invoice_number?.toLowerCase().includes(q);
      const nameMatch = `${b.patient?.first_name || ""} ${b.patient?.last_name || ""}`.toLowerCase().includes(q);
      const dentistMatch = b.dentist?.full_name?.toLowerCase().includes(q);
      if (!invMatch && !nameMatch && !dentistMatch) return false;
    }
    return true;
  });

  const paginatedBills = filteredBills.slice(
    (billsPage - 1) * billsPageSize,
    billsPage * billsPageSize
  );

  const paginatedPayments = dateFilteredPayments.slice(
    (paymentsPage - 1) * paymentsPageSize,
    paymentsPage * paymentsPageSize
  );

  const billStatusColors: Record<string, string> = {
    unpaid: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border-rose-200 dark:border-rose-900/60",
    partially_paid: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200 border-amber-200 dark:border-amber-900/60",
    fully_paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900/60",
    cancelled: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700",
  };

  // Helper to open POS Modal
  const handleOpenPOS = (billData: any) => {
    const totalPaidOnBill = billData.payments
      ? billData.payments.reduce((sum: number, p: any) => sum + Number(p.amount_logged), 0)
      : billData.total_paid || 0;
    const balanceDue = Math.max(0, Number(billData.net_amount) - totalPaidOnBill);

    setActivePaymentBill({
      id: billData.id || billData.bill_id,
      branch_id: billData.branch_id,
      invoice_number: billData.invoice_number,
      patient_name: billData.patient
        ? `${billData.patient.first_name} ${billData.patient.last_name}`
        : `${billData.first_name || ""} ${billData.last_name || ""}`.trim() || "Patient",
      net_amount: Number(billData.net_amount),
      total_paid: totalPaidOnBill,
      balance_due: billData.balance_due !== undefined ? Number(billData.balance_due) : balanceDue,
      is_installment: billData.is_installment,
      plan_type: billData.plan_type,
      downpayment_amount: billData.downpayment_amount ? Number(billData.downpayment_amount) : undefined,
      installment_amount: billData.installment_amount ? Number(billData.installment_amount) : undefined,
      total_installments: billData.total_installments ? Number(billData.total_installments) : undefined,
      frequency: billData.frequency,
      preferred_schedule: billData.preferred_schedule,
      payments: billData.payments,
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 max-w-full overflow-hidden">
      {/* ── TOP HERO HEADER & DOCTOR BADGE ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 border border-slate-800 text-white p-4 sm:p-6 shadow-lg">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  <CreditCard className="w-3.5 h-3.5 text-teal-400" />
                  <span>Clinical Financial Ledger</span>
                </span>

                {isDoctor && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <Stethoscope className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Doctor Portal</span>
                  </span>
                )}

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/80">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  <span>{activeBranch?.name || "Downtown Hub"}</span>
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1.5 flex items-center gap-2">
                <span>Billing & POS Terminal</span>
              </h1>
              <p className="text-xs text-slate-300/80 mt-0.5 max-w-xl">
                Chairside point-of-sale settlement, installment tracking, and automated revenue collection.
              </p>
            </div>

            {/* Header Action: Reports CTA */}
            <Link
              href="/reports"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition-all cursor-pointer shrink-0 active:scale-98 min-h-[42px]"
            >
              <BarChart3 className="w-4 h-4 text-slate-950" />
              <span>Financial Reports</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-950" />
            </Link>
          </div>

          {/* Doctor Treatment Toggle (Special for Doctors) */}
          {isDoctor && (
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300 font-medium">Viewing scope:</span>
                <div className="inline-flex p-1 rounded-xl bg-slate-950/60 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setOnlyMyTreatments(false);
                      setBillsPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[36px] flex items-center gap-1.5 ${
                      !onlyMyTreatments
                        ? "bg-teal-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>All Clinic Bills</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOnlyMyTreatments(true);
                      setBillsPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[36px] flex items-center gap-1.5 ${
                      onlyMyTreatments
                        ? "bg-teal-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>My Treatments</span>
                  </button>
                </div>
              </div>

              {onlyMyTreatments && (
                <span className="text-[11px] text-teal-300 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Showing treatments for Dr. {currentStaff?.full_name?.replace(/^dr\.?\s*/i, "")}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── DATE & BRANCH QUICK CONTROLS ── */}
      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Date Filter Pills (Scrollable on small phones) */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5 -mx-1 px-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 pl-1 pr-1.5 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Scope:</span>
            </span>
            {[
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "this_week", label: "This Week" },
              { id: "this_month", label: "This Month" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setDateFilter(tab.id as any);
                  setBillsPage(1);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer min-h-[38px] ${
                  dateFilter === tab.id
                    ? "bg-teal-600 text-white font-bold shadow-2xs"
                    : "bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Branch Selector */}
          {canSelectAllBranches && (
            <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                <span className="hidden sm:inline">Branch:</span>
              </span>
              <select
                value={effectiveBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  setBillsPage(1);
                }}
                className="w-full sm:w-auto px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/30 min-h-[38px]"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Count summary bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <span>
            Showing <strong>{dateFilteredBills.length}</strong> invoices ({dateFilteredPayments.length} payments)
          </span>
          {isDoctor && onlyMyTreatments && (
            <span className="font-semibold text-teal-600 dark:text-teal-400">
              Filtered: My Treatments
            </span>
          )}
        </div>
      </div>

      {/* ── KPI METRICS SUMMARY GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total Net Billed */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Net Billed
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
            ₱{totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Across {dateFilteredBills.length} issued invoices</p>
        </div>

        {/* Total Collected */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-white to-emerald-50/50 dark:from-slate-900 dark:to-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Revenue Collected
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
            ₱{totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 flex-wrap">
            <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold">
              GCash: ₱{gcashTotal.toLocaleString()}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold">
              Cash: ₱{cashTotal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Total Outstanding */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-white to-rose-50/50 dark:from-slate-900 dark:to-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Outstanding Balance
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-300">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold font-mono text-rose-600 dark:text-rose-400">
            ₱{totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {branchFilteredBalances.length} accounts with pending balance
          </p>
        </div>
      </div>

      {/* ── MOBILE SEGMENT SWITCHER (VISIBLE ON SCREENS < LG) ── */}
      <div className="lg:hidden">
        <div className="flex items-center p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold shadow-2xs">
          <button
            type="button"
            onClick={() => setMobileTab("invoices")}
            className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[42px] ${
              mobileTab === "invoices"
                ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 font-bold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Invoices</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono font-bold">
              {filteredBills.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab("balances")}
            className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[42px] ${
              mobileTab === "balances"
                ? "bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 font-bold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Receivables</span>
            {branchFilteredBalances.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-mono font-bold">
                {branchFilteredBalances.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileTab("payments")}
            className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[42px] ${
              mobileTab === "payments"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Logs</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono font-bold">
              {dateFilteredPayments.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── DESKTOP OUTSTANDING BALANCES AGING LIST (HIDDEN ON MOBILE, USES TAB INSTEAD) ── */}
      {branchFilteredBalances.length > 0 && (
        <div className="hidden lg:block p-6 rounded-3xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <h2 className="text-base font-bold text-rose-900 dark:text-rose-200">
                Active Outstanding Balances (Instant POS Settlement)
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-rose-700 dark:text-rose-300">
              {branchFilteredBalances.length} Pending
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {branchFilteredBalances.map((b) => (
              <div
                key={b.bill_id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-xs flex items-center justify-between gap-3"
              >
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 block">
                    {b.invoice_number}
                  </span>
                  <Link
                    href={`/patients/${b.patient_id}`}
                    className="font-bold text-sm text-slate-900 dark:text-slate-100 hover:text-teal-600"
                  >
                    {b.first_name} {b.last_name}
                  </Link>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Net: ₱{Number(b.net_amount).toLocaleString()} • Paid: ₱{Number(b.total_paid).toLocaleString()}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-base font-extrabold text-rose-600 font-mono">
                    ₱{Number(b.balance_due).toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleOpenPOS(b)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer min-h-[36px]"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Pay POS</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MOBILE TAB 2: RECEIVABLES / OUTSTANDING BALANCES ── */}
      <div className={`lg:hidden space-y-4 ${mobileTab === "balances" ? "block" : "hidden"}`}>
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>Outstanding Balances ({branchFilteredBalances.length})</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">Chairside Settlement</span>
        </div>

        {branchFilteredBalances.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-slate-500 text-xs space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">All Balances Clear!</p>
            <p className="text-slate-400">No patients with unpaid or delinquent bills in this scope.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {branchFilteredBalances.map((b) => (
              <div
                key={b.bill_id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200/90 dark:border-rose-900/60 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-slate-500">
                        {b.invoice_number}
                      </span>
                      {b.is_installment && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          {b.plan_type ? b.plan_type.toUpperCase() : "INSTALLMENT"}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/patients/${b.patient_id}`}
                      className="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600 mt-1 block flex items-center gap-1.5"
                    >
                      <span>{b.first_name} {b.last_name}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-rose-600 block">Balance Due</span>
                    <span className="text-lg font-extrabold font-mono text-rose-600 dark:text-rose-400">
                      ₱{Number(b.balance_due).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((Number(b.total_paid) / Math.max(1, Number(b.net_amount))) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Paid: ₱{Number(b.total_paid).toLocaleString()}</span>
                    <span>Total Net: ₱{Number(b.net_amount).toLocaleString()}</span>
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex items-center justify-between pt-1 gap-2">
                  {b.phone ? (
                    <a
                      href={`tel:${b.phone}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold min-h-[44px]"
                    >
                      <Phone className="w-3.5 h-3.5 text-teal-600" />
                      <span>{b.phone}</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400">No phone on file</span>
                  )}

                  <button
                    onClick={() => handleOpenPOS(b)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-98 text-white font-bold text-xs shadow-sm transition-all cursor-pointer min-h-[44px]"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Pay POS Terminal</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MOBILE TAB 3: PAYMENT TRANSACTIONS LOG ── */}
      <div className={`lg:hidden space-y-4 ${mobileTab === "payments" ? "block" : "hidden"}`}>
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span>Payment Log Stream ({dateFilteredPayments.length})</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">Real-time collections</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs p-3.5 space-y-3">
          {branchFilteredPayments.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No payments logged for this filter scope.
            </div>
          ) : (
            paginatedPayments.map((p) => {
              const methodConfig =
                p.payment_method === "gcash"
                  ? { bg: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300", icon: QrCode }
                  : p.payment_method === "cash"
                  ? { bg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300", icon: Banknote }
                  : p.payment_method === "card"
                  ? { bg: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300", icon: CreditCard }
                  : { bg: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300", icon: Landmark };

              const MethodIcon = methodConfig.icon;

              return (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded ${methodConfig.bg}`}>
                      <MethodIcon className="w-3 h-3" />
                      <span>{p.payment_method}</span>
                    </span>
                    <span className="font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                      +₱{Number(p.amount_logged).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {p.bill?.patient?.first_name} {p.bill?.patient?.last_name}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {p.bill?.invoice_number}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(p.logged_at).toLocaleDateString([], { month: "short", day: "numeric" })} •{" "}
                      {new Date(p.logged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>

                    {p.staff?.full_name && (
                      <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                        By: {p.staff.full_name}
                      </span>
                    )}
                  </div>

                  {p.reference_number && (
                    <div className="text-[10px] font-mono text-slate-500 bg-slate-200/60 dark:bg-slate-700/50 px-2 py-1 rounded">
                      Ref: {p.reference_number}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Payments Compact Pagination */}
          <Pagination
            currentPage={paymentsPage}
            totalPages={Math.max(1, Math.ceil(dateFilteredPayments.length / paymentsPageSize))}
            totalItems={dateFilteredPayments.length}
            pageSize={paymentsPageSize}
            onPageChange={setPaymentsPage}
            itemName="payments"
            compact={true}
          />
        </div>
      </div>

      {/* ── TWO-COLUMN DESKTOP GRID (ON MOBILE, ONLY SHOWN IF TAB IS "INVOICES") ── */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 ${mobileTab === "invoices" ? "block" : "hidden lg:grid"}`}>
        {/* Invoices Column (2 cols on Desktop) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-teal-600" />
              <span>Treatment Invoices</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-medium">
                {filteredBills.length}
              </span>
            </h2>

            {/* Search & Filter Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setBillsPage(1);
                  }}
                  placeholder="Search invoice, patient, doctor..."
                  className="w-full pl-8 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-medium text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 min-h-[40px]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setBillsPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setBillsPage(1);
                }}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-medium text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/30 min-h-[40px]"
              >
                <option value="all">All Statuses ({dateFilteredBills.length})</option>
                <option value="unpaid">Unpaid</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="fully_paid">Fully Paid</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            {/* ── ENHANCED MOBILE INVOICES CARD LIST VIEW (Phones & Small Tablets) ── */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBills.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                  <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">No invoices found</p>
                  <p className="text-[11px] text-slate-400">Try changing your search query or status filter.</p>
                </div>
              ) : (
                paginatedBills.map((b) => {
                  const totalPaidOnBill = b.payments
                    ? b.payments.reduce((sum: number, p: any) => sum + Number(p.amount_logged), 0)
                    : 0;
                  const bal = Math.max(0, Number(b.net_amount) - totalPaidOnBill);
                  const netAmount = Number(b.net_amount);
                  const percentPaid = netAmount > 0 ? Math.min(100, Math.round((totalPaidOnBill / netAmount) * 100)) : 0;

                  return (
                    <div
                      key={b.id}
                      className="p-4 space-y-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Top row: Invoice # and Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-xs text-slate-500 dark:text-slate-400">
                            {b.invoice_number}
                          </span>
                          <Link
                            href={`/patients/${b.patient?.id}`}
                            className="font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600 text-base block flex items-center gap-1"
                          >
                            <span>{b.patient?.last_name}, {b.patient?.first_name}</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                          </Link>
                        </div>

                        <span
                          className={`text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full border shrink-0 ${
                            billStatusColors[b.status] || "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {b.status.replace("_", " ")}
                        </span>
                      </div>

                      {/* Doctor & Package Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                        {b.dentist?.full_name && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold border border-teal-200/60 dark:border-teal-900/60">
                            <Stethoscope className="w-3 h-3 text-teal-600" />
                            <span>Dr. {b.dentist.full_name.replace(/^dr\.?\s*/i, "")}</span>
                          </span>
                        )}

                        {b.is_installment && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200/80">
                            <Repeat className="w-3 h-3" />
                            <span>{b.plan_type ? b.plan_type.toUpperCase() : "INSTALLMENT"}</span>
                          </span>
                        )}

                        {b.branch?.name && (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                            {b.branch.name.replace("CDG Dental Clinic — ", "").replace("CDG Dental Clinic - ", "")}
                          </span>
                        )}

                        <span className="text-slate-400 ml-auto text-[10px]">
                          {new Date(b.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </div>

                      {/* Financial Breakdown Card */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/80 space-y-2">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <span className="text-[10px] uppercase text-slate-400 block font-semibold">Net Bill</span>
                            <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                              ₱{Number(b.net_amount).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-slate-400 block font-semibold">Paid</span>
                            <span className="font-mono font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                              ₱{totalPaidOnBill.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-slate-400 block font-semibold">Balance</span>
                            <span
                              className={`font-mono font-extrabold text-xs sm:text-sm ${
                                bal > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"
                              }`}
                            >
                              ₱{bal.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar for Partial Payments */}
                        {b.status === "partially_paid" && (
                          <div className="pt-1 space-y-1">
                            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                                style={{ width: `${percentPaid}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                              <span>Settled {percentPaid}%</span>
                              <span>₱{bal.toLocaleString()} remaining</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Mobile 1-Tap Action Button */}
                      <div className="pt-1">
                        {bal > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenPOS(b)}
                            className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-98 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
                          >
                            <QrCode className="w-4 h-4" />
                            <span>Collect Payment via POS</span>
                            <span className="font-mono font-semibold ml-1">(₱{bal.toLocaleString()})</span>
                          </button>
                        ) : (
                          <div className="w-full py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 min-h-[40px]">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>Fully Settled in Full</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── DESKTOP & TABLET TABULAR VIEW ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Attending Doctor</th>
                    <th className="py-3 px-4">Net Bill</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No invoices match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedBills.map((b) => {
                      const totalPaidOnBill = b.payments
                        ? b.payments.reduce((sum: number, p: any) => sum + Number(p.amount_logged), 0)
                        : 0;
                      const bal = Math.max(0, Number(b.net_amount) - totalPaidOnBill);

                      return (
                        <tr
                          key={b.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                            <div className="flex flex-col items-start gap-1">
                              <span>{b.invoice_number}</span>
                              <div className="flex items-center gap-1 flex-wrap">
                                {b.branch?.name && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded font-sans font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    {b.branch.name.replace("CDG Dental Clinic — ", "").replace("CDG Dental Clinic - ", "")}
                                  </span>
                                )}
                                {b.is_installment && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded font-sans font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                                    {b.plan_type ? b.plan_type.toUpperCase() : "INSTALLMENT"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <Link
                              href={`/patients/${b.patient?.id}`}
                              className="font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600"
                            >
                              {b.patient?.last_name}, {b.patient?.first_name}
                            </Link>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                            {b.dentist?.full_name ? (
                              <span className="inline-flex items-center gap-1 font-medium">
                                <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                                <span>Dr. {b.dentist.full_name.replace(/^dr\.?\s*/i, "")}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                            ₱{Number(b.net_amount).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${
                                billStatusColors[b.status] || "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {b.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {bal > 0 ? (
                              <button
                                onClick={() => handleOpenPOS(b)}
                                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shadow-xs cursor-pointer min-h-[34px] active:scale-95 inline-flex items-center gap-1"
                              >
                                <QrCode className="w-3 h-3" />
                                <span>Pay POS</span>
                              </button>
                            ) : (
                              <span className="text-emerald-600 text-[11px] font-semibold flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Invoices Pagination */}
            <Pagination
              currentPage={billsPage}
              totalPages={Math.max(1, Math.ceil(filteredBills.length / billsPageSize))}
              totalItems={filteredBills.length}
              pageSize={billsPageSize}
              pageSizeOptions={[10, 25, 50]}
              onPageChange={setBillsPage}
              onPageSizeChange={setBillsPageSize}
              itemName="invoices"
            />
          </div>
        </div>

        {/* Real-time Payment Logs Stream (1 col on Desktop, hidden on mobile in this column) */}
        <div className="hidden lg:block space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span>Payment Transactions Log</span>
          </h2>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs p-5 space-y-3">
            {branchFilteredPayments.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No payment logs recorded yet for this branch.
              </div>
            ) : (
              paginatedPayments.map((p) => {
                const methodBadge =
                  p.payment_method === "gcash"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    : p.payment_method === "cash"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300";

                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded ${methodBadge}`}>
                        {p.payment_method}
                      </span>
                      <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        +₱{Number(p.amount_logged).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                      {p.bill?.patient?.first_name} {p.bill?.patient?.last_name}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono">{p.bill?.invoice_number}</span>
                        {p.branch?.name && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-sans font-medium bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300">
                            {p.branch.name.replace("CDG Dental Clinic — ", "").replace("CDG Dental Clinic - ", "")}
                          </span>
                        )}
                      </div>
                      <span>
                        {new Date(p.logged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {p.reference_number && (
                      <div className="text-[10px] font-mono text-slate-500">
                        Ref: {p.reference_number}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Payments Compact Pagination */}
            <Pagination
              currentPage={paymentsPage}
              totalPages={Math.max(1, Math.ceil(dateFilteredPayments.length / paymentsPageSize))}
              totalItems={dateFilteredPayments.length}
              pageSize={paymentsPageSize}
              onPageChange={setPaymentsPage}
              itemName="payments"
              compact={true}
            />
          </div>
        </div>
      </div>

      {/* POS Modal */}
      <PaymentModal
        isOpen={activePaymentBill !== null}
        onClose={() => setActivePaymentBill(null)}
        onSuccess={triggerRefresh}
        bill={activePaymentBill}
      />
    </div>
  );
}
