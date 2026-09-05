"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/clinic-context";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  CreditCard,
  Building2,
  Stethoscope,
  Download,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Filter,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  PieChart,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export type DateFilterPreset =
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "all_time"
  | "custom";

export default function ReportsPage() {
  const { showToast, refreshTrigger, triggerRefresh, branches, activeBranch, currentStaff, isAdmin } = useClinic();
  const supabase = createClient();

  // Raw Database Data
  const [bills, setBills] = useState<any[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<any[]>([]);
  const [outstandingBalances, setOutstandingBalances] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>("this_month");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Branch Scope Logic
  const userBranchId = currentStaff?.branch_id || activeBranch?.id || null;
  const canSelectAllBranches = isAdmin || !currentStaff?.branch_id;
  const [branchFilter, setBranchFilter] = useState<string>("auto");

  const effectiveBranchFilter = useMemo(() => {
    if (!canSelectAllBranches && userBranchId) {
      return userBranchId;
    }
    if (branchFilter === "all") return "all";
    if (branchFilter === "auto") {
      return activeBranch?.id || userBranchId || "all";
    }
    return branchFilter;
  }, [canSelectAllBranches, userBranchId, branchFilter, activeBranch]);

  // Secondary Filters
  const [activeTab, setActiveTab] = useState<"overview" | "doctors" | "branches" | "receivables">("overview");
  const [chartInterval, setChartInterval] = useState<"daily" | "monthly">("daily");
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  // 1. Fetch All Relevant Financial Data
  const loadReportsData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch bills joined with appointment, patient, branch, dentist
      const { data: billData, error: billErr } = await supabase
        .from("treatment_bills")
        .select(`
          *,
          branch:branches(id, name),
          patient:patients(id, first_name, last_name, phone),
          dentist:profiles!treatment_bills_dentist_id_fkey(id, full_name, role),
          appointment:appointments(
            id,
            start_time,
            branch_id,
            dentist_id,
            branch:branches(id, name),
            dentist:profiles(id, full_name, role)
          ),
          payments:payment_logs(*)
        `)
        .order("created_at", { ascending: false });

      if (billErr) throw billErr;
      if (billData) setBills(billData);

      // 2. Fetch payment logs joined with bill, patient, staff, branch
      const { data: logsData, error: logsErr } = await supabase
        .from("payment_logs")
        .select(`
          *,
          branch:branches(id, name),
          bill:treatment_bills(
            id,
            invoice_number,
            net_amount,
            branch_id,
            appointment_id,
            patient:patients(id, first_name, last_name),
            appointment:appointments(
              branch_id,
              dentist_id,
              branch:branches(id, name),
              dentist:profiles(id, full_name)
            )
          ),
          staff:profiles(id, full_name)
        `)
        .order("logged_at", { ascending: false });

      if (logsErr) throw logsErr;
      if (logsData) setPaymentLogs(logsData);

      // 3. Fetch outstanding balances
      const { data: balData } = await supabase
        .from("outstanding_balances")
        .select("*")
        .order("balance_due", { ascending: false });

      if (balData) setOutstandingBalances(balData);
    } catch (err: any) {
      console.error("Failed to load reports data:", err);
      showToast(err.message || "Failed to load financial records.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReportsData();
  }, [refreshTrigger]);

  // 2. Date Range Boundaries Calculation
  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (dateFilter === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (dateFilter === "this_week") {
      // Last 7 days
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
    } else if (dateFilter === "this_month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else if (dateFilter === "last_month") {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (dateFilter === "this_quarter") {
      const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), qStartMonth, 1, 0, 0, 0, 0);
    } else if (dateFilter === "this_year") {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    } else if (dateFilter === "custom") {
      if (customStartDate) {
        start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
      }
      if (customEndDate) {
        end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
      }
    }

    return { start, end };
  }, [dateFilter, customStartDate, customEndDate]);

  // 3. Filtered Invoices & Payments based on Date and Branch
  const filteredData = useMemo(() => {
    const { start, end } = dateRangeBounds;

    // Filter Bills
    const fBills = bills.filter((b) => {
      const bDate = new Date(b.created_at);
      if (start && bDate < start) return false;
      if (end && bDate > end) return false;

      // Branch filter
      if (effectiveBranchFilter !== "all") {
        const bBranchId = b.branch_id || b.appointment?.branch_id;
        if (bBranchId !== effectiveBranchFilter) return false;
      }
      return true;
    });

    // Filter Payment Logs
    const fPayments = paymentLogs.filter((p) => {
      const pDate = new Date(p.logged_at);
      if (start && pDate < start) return false;
      if (end && pDate > end) return false;

      // Branch filter
      if (effectiveBranchFilter !== "all") {
        const pBranchId = p.branch_id || p.bill?.branch_id || p.bill?.appointment?.branch_id;
        if (pBranchId !== effectiveBranchFilter) return false;
      }
      return true;
    });

    return { filteredBills: fBills, filteredPayments: fPayments };
  }, [bills, paymentLogs, dateRangeBounds, effectiveBranchFilter]);

  const { filteredBills, filteredPayments } = filteredData;

  // Filter Outstanding Balances by Branch
  const filteredBalances = useMemo(() => {
    if (effectiveBranchFilter === "all") return outstandingBalances;
    return outstandingBalances.filter(
      (b) => b.branch_id === effectiveBranchFilter
    );
  }, [outstandingBalances, effectiveBranchFilter]);

  // 4. Financial Metric Calculations
  const metrics = useMemo(() => {
    const grossBilled = filteredBills.reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
    const totalDiscounts = filteredBills.reduce((acc, b) => acc + Number(b.discount_amount || 0), 0);
    const netBilled = filteredBills.reduce((acc, b) => acc + Number(b.net_amount || 0), 0);
    const totalCollected = filteredPayments.reduce((acc, p) => acc + Number(p.amount_logged || 0), 0);

    const collectionRate = netBilled > 0 ? Math.min(100, Math.round((totalCollected / netBilled) * 100)) : 0;
    const averagePayment = filteredPayments.length > 0 ? Math.round(totalCollected / filteredPayments.length) : 0;

    // Payment Method Breakdown
    const methodTotals: Record<string, { total: number; count: number }> = {
      gcash: { total: 0, count: 0 },
      cash: { total: 0, count: 0 },
      card: { total: 0, count: 0 },
      bank_transfer: { total: 0, count: 0 },
    };

    filteredPayments.forEach((p) => {
      const m = p.payment_method?.toLowerCase() || "cash";
      if (!methodTotals[m]) {
        methodTotals[m] = { total: 0, count: 0 };
      }
      methodTotals[m].total += Number(p.amount_logged || 0);
      methodTotals[m].count += 1;
    });

    // Total outstanding receivables
    const outstandingTotal = filteredBalances.reduce((acc, b) => acc + Number(b.balance_due || 0), 0);

    // Installment Performance
    const installmentBills = filteredBills.filter((b) => b.is_installment);
    const installmentBilled = installmentBills.reduce((acc, b) => acc + Number(b.net_amount || 0), 0);
    const installmentCollected = filteredPayments
      .filter((p) => p.bill?.is_installment || p.notes?.toLowerCase().includes("installment") || p.notes?.toLowerCase().includes("downpayment"))
      .reduce((acc, p) => acc + Number(p.amount_logged || 0), 0);

    return {
      grossBilled,
      totalDiscounts,
      netBilled,
      totalCollected,
      collectionRate,
      averagePayment,
      methodTotals,
      outstandingTotal,
      installmentBillsCount: installmentBills.length,
      installmentBilled,
      installmentCollected,
    };
  }, [filteredBills, filteredPayments, filteredBalances]);

  // 5. Timeline Chart Data Series (Daily or Monthly)
  const chartData = useMemo(() => {
    const grouped: Record<string, { label: string; amount: number; count: number; date: Date }> = {};

    filteredPayments.forEach((p) => {
      const d = new Date(p.logged_at);
      let key = "";
      let label = "";

      if (chartInterval === "daily") {
        key = d.toISOString().split("T")[0]; // YYYY-MM-DD
        label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; // YYYY-MM
        label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      }

      if (!grouped[key]) {
        grouped[key] = { label, amount: 0, count: 0, date: d };
      }
      grouped[key].amount += Number(p.amount_logged || 0);
      grouped[key].count += 1;
    });

    // Sort chronologically
    const sortedKeys = Object.keys(grouped).sort();
    const points = sortedKeys.map((k) => grouped[k]);
    const maxAmount = Math.max(...points.map((p) => p.amount), 1000);

    return { points, maxAmount };
  }, [filteredPayments, chartInterval]);

  // 6. Specialist Doctor Production Breakdown
  const doctorProduction = useMemo(() => {
    const docs: Record<string, { id: string; name: string; billed: number; collected: number; count: number }> = {};

    filteredBills.forEach((b) => {
      const doc = b.dentist || b.appointment?.dentist;
      const docId = doc?.id || "unassigned";
      const docName = doc?.full_name || "Unassigned Doctor";

      if (!docs[docId]) {
        docs[docId] = { id: docId, name: docName, billed: 0, collected: 0, count: 0 };
      }
      docs[docId].billed += Number(b.net_amount || 0);
      docs[docId].count += 1;

      // Add payments attributed to this bill
      if (Array.isArray(b.payments)) {
        docs[docId].collected += b.payments.reduce((s: number, p: any) => s + Number(p.amount_logged || 0), 0);
      }
    });

    return Object.values(docs).sort((a, b) => b.billed - a.billed);
  }, [filteredBills]);

  // 7. Branch Comparison Breakdown
  const branchComparison = useMemo(() => {
    const brData: Record<string, { id: string; name: string; billed: number; collected: number; count: number }> = {};

    // Initialize all active clinic branches
    branches.forEach((b) => {
      const cleanName = b.name.replace(/^CDG Dental Clinic\s*[—–-]\s*/i, "").trim();
      brData[b.id] = { id: b.id, name: cleanName, billed: 0, collected: 0, count: 0 };
    });

    filteredBills.forEach((b) => {
      const brId = b.appointment?.branch_id || "general";
      const brName = b.appointment?.branch?.name?.replace(/^CDG Dental Clinic\s*[—–-]\s*/i, "").trim() || "Downtown CDO";

      if (!brData[brId]) {
        brData[brId] = { id: brId, name: brName, billed: 0, collected: 0, count: 0 };
      }
      brData[brId].billed += Number(b.net_amount || 0);
      brData[brId].count += 1;

      if (Array.isArray(b.payments)) {
        brData[brId].collected += b.payments.reduce((s: number, p: any) => s + Number(p.amount_logged || 0), 0);
      }
    });

    return Object.values(brData).sort((a, b) => b.collected - a.collected);
  }, [branches, filteredBills]);

  // 8. Receivables Aging Buckets
  const receivablesAging = useMemo(() => {
    const buckets = {
      under30: { label: "< 30 Days (Current)", amount: 0, count: 0 },
      under60: { label: "30 – 60 Days", amount: 0, count: 0 },
      under90: { label: "61 – 90 Days", amount: 0, count: 0 },
      over90: { label: "90+ Days (Overdue)", amount: 0, count: 0 },
    };

    const now = new Date().getTime();

    filteredBalances.forEach((b) => {
      const billDate = b.created_at ? new Date(b.created_at).getTime() : now;
      const ageDays = Math.floor((now - billDate) / (1000 * 60 * 60 * 24));
      const bal = Number(b.balance_due || 0);

      if (ageDays <= 30) {
        buckets.under30.amount += bal;
        buckets.under30.count += 1;
      } else if (ageDays <= 60) {
        buckets.under60.amount += bal;
        buckets.under60.count += 1;
      } else if (ageDays <= 90) {
        buckets.under90.amount += bal;
        buckets.under90.count += 1;
      } else {
        buckets.over90.amount += bal;
        buckets.over90.count += 1;
      }
    });

    return buckets;
  }, [filteredBalances]);

  // 9. Export CSV Utility
  const handleExportCSV = () => {
    if (filteredBills.length === 0 && filteredPayments.length === 0) {
      showToast("No records to export in the selected period.", "info");
      return;
    }

    const headers = [
      "Invoice Number",
      "Patient Name",
      "Date",
      "Branch",
      "Attending Doctor",
      "Gross Total (PHP)",
      "Discount (PHP)",
      "Net Amount (PHP)",
      "Status",
      "Installment Plan",
      "Amount Paid (PHP)",
    ];

    const rows = filteredBills.map((b) => {
      const patientName = `"${b.patient?.last_name || ""}, ${b.patient?.first_name || ""}"`;
      const dateStr = b.created_at ? new Date(b.created_at).toISOString().split("T")[0] : "";
      const branchName = `"${b.appointment?.branch?.name?.replace(/^CDG Dental Clinic\s*[—–-]\s*/i, "").trim() || "CDO Hub"}"`;
      const doctorName = `"${b.appointment?.dentist?.full_name || "Doctor"}"`;
      const paid = b.payments ? b.payments.reduce((s: number, p: any) => s + Number(p.amount_logged || 0), 0) : 0;
      const plan = b.is_installment ? b.plan_type || "Yes" : "Standard";

      return [
        b.invoice_number,
        patientName,
        dateStr,
        branchName,
        doctorName,
        Number(b.total_amount || 0).toFixed(2),
        Number(b.discount_amount || 0).toFixed(2),
        Number(b.net_amount || 0).toFixed(2),
        b.status,
        plan,
        paid.toFixed(2),
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cdg_dental_financial_report_${dateFilter}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Financial report successfully exported to CSV.", "success");
  };

  // 10. Print Report Utility
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* ── Top Executive Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <BarChart3 className="w-3.5 h-3.5" />
              Practice Financial Intelligence
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Executive Analytics & Revenue Auditing
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Financial Analytics & Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time collection trends, payment channel breakdowns, specialist doctor production, and aging receivables.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Link
            href="/billing"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
            <span>Open POS Terminal</span>
          </Link>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* ── Multi-Tier Date Range Filter Bar ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-hide">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0 mr-1">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              Period:
            </span>
            {(
              [
                { id: "today", label: "Today" },
                { id: "this_week", label: "This Week" },
                { id: "this_month", label: "This Month" },
                { id: "last_month", label: "Last Month" },
                { id: "this_quarter", label: "This Quarter" },
                { id: "this_year", label: "This Year" },
                { id: "all_time", label: "All Time" },
                { id: "custom", label: "Custom Range" },
              ] as { id: DateFilterPreset; label: string }[]
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setDateFilter(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  dateFilter === p.id
                    ? "bg-teal-600 text-white shadow-sm shadow-teal-600/20 font-bold"
                    : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Branch Filter Dropdown */}
          {/* Branch Filter Dropdown / Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
              Branch:
            </span>
            {canSelectAllBranches ? (
              <select
                value={effectiveBranchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                <option value="all">All CDO Hubs (Consolidated)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name.includes("—") ? b.name.split("—")[1].trim() : b.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900/60">
                {activeBranch?.name || "Assigned Branch"}
              </span>
            )}
          </div>
        </div>

        {/* Custom Date Range Inputs (Shown when 'custom' is selected) */}
        {dateFilter === "custom" && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <button
                onClick={() => {
                  setCustomStartDate("");
                  setCustomEndDate("");
                }}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
              >
                Clear Range
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Core Financial Summary KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Revenue Collected */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Total Collections
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
            ₱{metrics.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{filteredPayments.length} logged payments</span>
            <span>Avg: ₱{metrics.averagePayment.toLocaleString()}</span>
          </div>
        </div>

        {/* Card 2: Net Invoiced */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Net Invoiced
            </span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
            ₱{metrics.netBilled.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Gross: ₱{metrics.grossBilled.toLocaleString()}</span>
            <span className="text-amber-500 font-semibold">-₱{metrics.totalDiscounts.toLocaleString()} disc.</span>
          </div>
        </div>

        {/* Card 3: Collection Efficiency Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Collection Rate
            </span>
            <span
              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                metrics.collectionRate >= 80
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : metrics.collectionRate >= 60
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
              }`}
            >
              {metrics.collectionRate >= 80 ? "Healthy" : metrics.collectionRate >= 60 ? "Normal" : "Needs Recall"}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-cyan-600 dark:text-cyan-400">
            {metrics.collectionRate}%
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden mt-2">
            <div
              className="bg-cyan-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${metrics.collectionRate}%` }}
            />
          </div>
        </div>

        {/* Card 4: Outstanding Receivables */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Pending Receivables
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-rose-600 dark:text-rose-400">
            ₱{metrics.outstandingTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{filteredBalances.length} active patient accounts</span>
            <span className="text-rose-500 font-semibold">Overdue & Installments</span>
          </div>
        </div>
      </div>

      {/* ── Interactive Revenue Trend Timeline Chart ── */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-600" />
              Collections Revenue Trend Timeline
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cash flow velocity across the selected date range.
            </p>
          </div>

          {/* Interval Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1 self-start sm:self-auto">
            <button
              onClick={() => setChartInterval("daily")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chartInterval === "daily"
                  ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setChartInterval("monthly")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chartInterval === "monthly"
                  ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* SVG Responsive Bar/Column Chart */}
        {chartData.points.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 dark:text-slate-500">
            No transactions recorded in the selected period.
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <div className="h-56 w-full flex items-end gap-2 pt-6 pb-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
              {chartData.points.map((pt, idx) => {
                const heightPercent = Math.max(12, Math.round((pt.amount / chartData.maxAmount) * 100));
                const isHovered = hoveredPoint?.label === pt.label;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="flex-1 min-w-[28px] max-w-[56px] h-full flex flex-col justify-end items-center group relative cursor-pointer"
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-12 z-20 px-2.5 py-1.5 rounded-lg bg-slate-950 text-white text-[10px] font-mono shadow-xl whitespace-nowrap pointer-events-none">
                        <span className="font-bold text-teal-400">₱{pt.amount.toLocaleString()}</span>
                        <span className="text-slate-400 block text-[9px]">{pt.count} payments</span>
                      </div>
                    )}

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        isHovered
                          ? "bg-teal-400 shadow-lg shadow-teal-500/30"
                          : "bg-gradient-to-t from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400"
                      }`}
                    />

                    {/* Date Label */}
                    <span className="text-[10px] font-medium text-slate-400 group-hover:text-teal-600 mt-2 truncate max-w-full">
                      {pt.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Peak: ₱{chartData.maxAmount.toLocaleString()}</span>
              <span>Total Points: {chartData.points.length} {chartInterval} segments</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Payment Channels & Distribution Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payment Channels Matrix (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-teal-600" />
              Payment Channel Mix & Liquidity
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown of cashier collections across GCash, Cash, Debit/Credit Card, and Bank Transfer.
            </p>
          </div>

          {/* Visual Distribution Proportion Bar */}
          <div className="space-y-2">
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
              {metrics.totalCollected > 0 ? (
                <>
                  <div
                    title={`GCash: ₱${metrics.methodTotals.gcash.total.toLocaleString()}`}
                    style={{
                      width: `${(metrics.methodTotals.gcash.total / metrics.totalCollected) * 100}%`,
                    }}
                    className="bg-blue-500 h-full transition-all"
                  />
                  <div
                    title={`Cash: ₱${metrics.methodTotals.cash.total.toLocaleString()}`}
                    style={{
                      width: `${(metrics.methodTotals.cash.total / metrics.totalCollected) * 100}%`,
                    }}
                    className="bg-emerald-500 h-full transition-all"
                  />
                  <div
                    title={`Card: ₱${metrics.methodTotals.card.total.toLocaleString()}`}
                    style={{
                      width: `${(metrics.methodTotals.card.total / metrics.totalCollected) * 100}%`,
                    }}
                    className="bg-purple-500 h-full transition-all"
                  />
                  <div
                    title={`Bank: ₱${metrics.methodTotals.bank_transfer.total.toLocaleString()}`}
                    style={{
                      width: `${(metrics.methodTotals.bank_transfer.total / metrics.totalCollected) * 100}%`,
                    }}
                    className="bg-amber-500 h-full transition-all"
                  />
                </>
              ) : (
                <div className="w-full h-full bg-slate-200 dark:bg-slate-800" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> GCash
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Cash
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Card / POS
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Bank Transfer
              </span>
            </div>
          </div>

          {/* 4 Cards with exact numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {/* GCash */}
            <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                GCash QR
              </span>
              <div className="mt-1 text-base sm:text-lg font-bold font-mono text-blue-900 dark:text-blue-200">
                ₱{metrics.methodTotals.gcash.total.toLocaleString()}
              </div>
              <span className="text-[10px] text-blue-600/80 dark:text-blue-400 block mt-0.5">
                {metrics.methodTotals.gcash.count} payments (
                {metrics.totalCollected > 0
                  ? Math.round((metrics.methodTotals.gcash.total / metrics.totalCollected) * 100)
                  : 0}
                %)
              </span>
            </div>

            {/* Cash */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Cash Drawer
              </span>
              <div className="mt-1 text-base sm:text-lg font-bold font-mono text-emerald-900 dark:text-emerald-200">
                ₱{metrics.methodTotals.cash.total.toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400 block mt-0.5">
                {metrics.methodTotals.cash.count} payments (
                {metrics.totalCollected > 0
                  ? Math.round((metrics.methodTotals.cash.total / metrics.totalCollected) * 100)
                  : 0}
                %)
              </span>
            </div>

            {/* Card */}
            <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                Credit / Debit
              </span>
              <div className="mt-1 text-base sm:text-lg font-bold font-mono text-purple-900 dark:text-purple-200">
                ₱{metrics.methodTotals.card.total.toLocaleString()}
              </div>
              <span className="text-[10px] text-purple-600/80 dark:text-purple-400 block mt-0.5">
                {metrics.methodTotals.card.count} payments (
                {metrics.totalCollected > 0
                  ? Math.round((metrics.methodTotals.card.total / metrics.totalCollected) * 100)
                  : 0}
                %)
              </span>
            </div>

            {/* Bank Transfer */}
            <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Bank / Wire
              </span>
              <div className="mt-1 text-base sm:text-lg font-bold font-mono text-amber-900 dark:text-amber-200">
                ₱{metrics.methodTotals.bank_transfer.total.toLocaleString()}
              </div>
              <span className="text-[10px] text-amber-600/80 dark:text-amber-400 block mt-0.5">
                {metrics.methodTotals.bank_transfer.count} payments (
                {metrics.totalCollected > 0
                  ? Math.round((metrics.methodTotals.bank_transfer.total / metrics.totalCollected) * 100)
                  : 0}
                %)
              </span>
            </div>
          </div>
        </div>

        {/* Installment Plan Package Analytics (1 col) */}
        <div className="p-6 rounded-3xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-base text-purple-950 dark:text-purple-200">
                Installment Package Health
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active orthodontic, implant, and prosthodontic recurring plans.
            </p>

            <div className="mt-4 space-y-3">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-purple-200/60 dark:border-purple-900/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Active Installment Invoices
                </span>
                <span className="text-xl font-bold font-mono text-purple-700 dark:text-purple-300">
                  {metrics.installmentBillsCount} Packages
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-purple-200/60 dark:border-purple-900/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Contracted Installment Value
                </span>
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                  ₱{metrics.installmentBilled.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-purple-200/60 dark:border-purple-900/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Collections Realized to Date
                </span>
                <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  ₱{metrics.installmentCollected.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/secretary?tab=billing"
            className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
          >
            <span>Manage Installment Recalls</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Sub-Tabbed Analytical Deep Dives ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Branch Performance
          </button>
          <button
            onClick={() => setActiveTab("doctors")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "doctors"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Doctor Production
          </button>
          <button
            onClick={() => setActiveTab("receivables")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "receivables"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Receivables Aging Matrix
          </button>
        </div>

        {/* Tab 1: Branch Performance Comparison */}
        {activeTab === "overview" && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 animate-in fade-in duration-200">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                Branch Comparison & Production Volume
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Revenue generated and collected across each active clinic facility in Cagayan de Oro.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {branchComparison.map((br) => (
                <div
                  key={br.id}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {br.name}
                    </h4>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      {br.count} Invoices
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Net Invoiced:</span>
                      <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                        ₱{br.billed.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-600 font-semibold">Total Collected:</span>
                      <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        ₱{br.collected.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Proportion bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-500 h-full rounded-full"
                      style={{
                        width: `${metrics.totalCollected > 0 ? (br.collected / metrics.totalCollected) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Doctor Production Breakdown */}
        {activeTab === "doctors" && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 animate-in fade-in duration-200">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                Specialist Dentist Production
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Treatment volume and revenues generated by attending doctors.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-3.5 px-4 sm:px-6">Attending Dentist</th>
                      <th className="py-3.5 px-4">Procedures Invoiced</th>
                      <th className="py-3.5 px-4">Net Billed (PHP)</th>
                      <th className="py-3.5 px-4">Collections (PHP)</th>
                      <th className="py-3.5 px-4 text-right">Collection Efficiency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {doctorProduction.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                          No treatments recorded for the selected period.
                        </td>
                      </tr>
                    ) : (
                      doctorProduction.map((doc) => {
                        const rate = doc.billed > 0 ? Math.min(100, Math.round((doc.collected / doc.billed) * 100)) : 0;

                        return (
                          <tr
                            key={doc.id}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3.5 px-4 sm:px-6 font-bold text-slate-900 dark:text-slate-100">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-xs shrink-0 border border-teal-500/20">
                                  {doc.name.charAt(0)}
                                </div>
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                  {doc.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {doc.count} treatments
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                              ₱{doc.billed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                              ₱{doc.collected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2.5">
                                <div className="w-20 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-rose-500"
                                    }`}
                                    style={{ width: `${rate}%` }}
                                  />
                                </div>
                                <span
                                  className={`text-[11px] font-mono tabular-nums font-bold px-2 py-0.5 rounded-full border ${
                                    rate >= 80
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                                      : rate >= 50
                                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                                      : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                                  }`}
                                >
                                  {rate}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Receivables Aging Matrix */}
        {activeTab === "receivables" && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-600" />
                Receivables Aging Summary & Delinquent Ledger
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribution of pending balances by overdue age bracket and individual account statements.
              </p>
            </div>

            {/* 4 Bracket KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(receivablesAging).map(([k, bucket]) => (
                <div
                  key={k}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2"
                >
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block uppercase tracking-wider">
                    {bucket.label}
                  </span>
                  <div className="text-2xl font-black font-mono tabular-nums text-rose-600 dark:text-rose-400">
                    ₱{bucket.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    {bucket.count} unsettled {bucket.count === 1 ? "invoice" : "invoices"}
                  </span>
                </div>
              ))}
            </div>

            {/* Delinquent Accounts Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Detailed Outstanding Balances Ledger</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold font-mono">
                    {filteredBalances.length} Pending
                  </span>
                </h4>
                <Link
                  href="/billing"
                  className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                >
                  <span>Open Cashier POS</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="py-3.5 px-4 sm:px-6">Patient Name</th>
                        <th className="py-3.5 px-4">Invoice #</th>
                        <th className="py-3.5 px-4">Date Invoiced</th>
                        <th className="py-3.5 px-4">Aging Bracket</th>
                        <th className="py-3.5 px-4">Total Billed</th>
                        <th className="py-3.5 px-4">Paid to Date</th>
                        <th className="py-3.5 px-4">Balance Due</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {filteredBalances.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                            No delinquent balances found. All patient accounts are settled! 🎉
                          </td>
                        </tr>
                      ) : (
                        filteredBalances.map((b) => {
                          const now = new Date().getTime();
                          const billDate = b.created_at ? new Date(b.created_at).getTime() : now;
                          const ageDays = Math.max(0, Math.floor((now - billDate) / (1000 * 60 * 60 * 24)));

                          const badgeStyle =
                            ageDays <= 30
                              ? "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                              : ageDays <= 60
                              ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                              : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";

                          return (
                            <tr
                              key={b.bill_id}
                              className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="py-3.5 px-4 sm:px-6">
                                <Link
                                  href={`/patients/${b.patient_id}`}
                                  className="font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                                >
                                  {b.patient_name}
                                </Link>
                                {b.phone && (
                                  <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                                    {b.phone}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                                {b.invoice_number}
                              </td>
                              <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                                {b.created_at ? new Date(b.created_at).toLocaleDateString() : "—"}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeStyle}`}>
                                  {ageDays <= 30 ? "< 30 Days" : ageDays <= 60 ? "30–60 Days" : ageDays <= 90 ? "61–90 Days" : "90+ Days Overdue"}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono tabular-nums text-slate-600 dark:text-slate-400">
                                ₱{Number(b.net_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3.5 px-4 font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                                ₱{Number(b.total_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400">
                                ₱{Number(b.balance_due || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <Link
                                  href="/billing"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                                >
                                  <span>Collect</span>
                                  <ArrowRight className="w-3 h-3" />
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
