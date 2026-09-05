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
} from "lucide-react";

export default function BillingPage() {
  const { showToast, refreshTrigger, triggerRefresh } = useClinic();
  const [bills, setBills] = useState<any[]>([]);
  const [balances, setBalances] = useState<OutstandingBalance[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "this_week" | "this_month">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // POS Payment Modal State
  const [activePaymentBill, setActivePaymentBill] = useState<any | null>(null);

  const supabase = createClient();

  const loadBillingData = async () => {
    setIsLoading(true);
    try {
      // 1. Treatment bills with patient and payments
      const { data: billData } = await supabase
        .from("treatment_bills")
        .select(`
          *,
          patient:patients(id, first_name, last_name, phone),
          payments:payment_logs(*)
        `)
        .order("created_at", { ascending: false });

      if (billData) setBills(billData);

      // 2. Outstanding balances view
      const { data: balData } = await supabase
        .from("outstanding_balances")
        .select("*")
        .order("balance_due", { ascending: false });

      if (balData) setBalances(balData);

      // 3. Payment logs with staff profile
      const { data: logsData } = await supabase
        .from("payment_logs")
        .select(`
          *,
          bill:treatment_bills(invoice_number, patient:patients(first_name, last_name)),
          staff:profiles(full_name)
        `)
        .order("logged_at", { ascending: false });

      if (logsData) setPaymentLogs(logsData);
    } catch (err) {
      console.error("Error loading billing data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, [refreshTrigger]);

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
    return bills.filter((b) => {
      if (!start) return true;
      const bDate = new Date(b.created_at);
      return bDate >= start && (!end || bDate <= end);
    });
  }, [bills, dateBoundaries]);

  const dateFilteredPayments = React.useMemo(() => {
    const { start, end } = dateBoundaries;
    return paymentLogs.filter((p) => {
      if (!start) return true;
      const pDate = new Date(p.logged_at);
      return pDate >= start && (!end || pDate <= end);
    });
  }, [paymentLogs, dateBoundaries]);

  // Aggregate Metrics (based on filtered date)
  const totalBilled = dateFilteredBills.reduce((sum, b) => sum + Number(b.net_amount), 0);
  const totalCollected = dateFilteredPayments.reduce((sum, p) => sum + Number(p.amount_logged), 0);
  const totalOutstanding = balances.reduce((sum, b) => sum + Number(b.balance_due), 0);

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
      if (!invMatch && !nameMatch) return false;
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
    unpaid: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border-rose-200",
    partially_paid: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border-amber-200",
    fully_paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-200",
    cancelled: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-300",
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header with Reports Navigation CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-teal-600" />
            Financial Ledger & POS Terminal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated invoice generation, payment logs (GCash, Cash, Card), and real-time balance calculations.
          </p>
        </div>

        <Link
          href="/reports"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all cursor-pointer shrink-0"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Financial Reports & Analytics</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Date Quick Filter Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 px-2">
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            Date Scope:
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
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                dateFilter === tab.id
                  ? "bg-teal-600 text-white font-bold shadow-2xs"
                  : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-slate-400 px-2 font-medium">
          Showing {dateFilteredBills.length} invoices ({dateFilteredPayments.length} payments)
        </span>
      </div>

      {/* FINANCIAL OVERVIEW KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Billed */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Net Billed
          </span>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
            ₱{totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Across {bills.length} issued invoices</p>
        </div>

        {/* Total Collected */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Total Revenue Collected
          </span>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600">
            ₱{totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
            <span>GCash: ₱{gcashTotal.toLocaleString()}</span>
            <span>•</span>
            <span>Cash: ₱{cashTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* Total Outstanding */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">
            Outstanding Receivables
          </span>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold font-mono text-rose-600">
            ₱{totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{balances.length} accounts with pending balance</p>
        </div>
      </div>

      {/* OUTSTANDING BALANCES AGING LIST */}
      {balances.length > 0 && (
        <div className="p-6 rounded-3xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <h2 className="text-base font-bold text-rose-900 dark:text-rose-200">
                Active Outstanding Balances (Instant POS Settlement)
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-rose-700 dark:text-rose-300">
              {balances.length} Pending
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {balances.map((b) => (
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
                    onClick={() => {
                      const fullBill = bills.find((item) => item.id === b.bill_id);
                      setActivePaymentBill({
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
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all"
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

      {/* TWO SECTIONS: ALL INVOICES & RECENT PAYMENT LOGS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Invoices Table (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-teal-600" />
              Treatment Invoices
            </h2>

            {/* Search & Filter */}
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setBillsPage(1);
                  }}
                  placeholder="Search invoice #, patient..."
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-medium text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 w-44 sm:w-56"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setBillsPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-medium text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="all">All Statuses ({dateFilteredBills.length})</option>
                <option value="unpaid">Unpaid</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="fully_paid">Fully Paid</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Discount</th>
                    <th className="py-3 px-4">Net Bill</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
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
                              {b.is_installment && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-sans font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                                  {b.plan_type ? b.plan_type.toUpperCase() : "INSTALLMENT"}
                                </span>
                              )}
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
                          <td className="py-3.5 px-4 font-mono">₱{Number(b.total_amount).toLocaleString()}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">
                            ₱{Number(b.discount_amount).toLocaleString()}
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
                                onClick={() =>
                                  setActivePaymentBill({
                                    id: b.id,
                                    invoice_number: b.invoice_number,
                                    patient_name: `${b.patient?.first_name} ${b.patient?.last_name}`,
                                    net_amount: Number(b.net_amount),
                                    total_paid: totalPaidOnBill,
                                    balance_due: bal,
                                    is_installment: b.is_installment,
                                    plan_type: b.plan_type,
                                    downpayment_amount: b.downpayment_amount ? Number(b.downpayment_amount) : undefined,
                                    installment_amount: b.installment_amount ? Number(b.installment_amount) : undefined,
                                    total_installments: b.total_installments ? Number(b.total_installments) : undefined,
                                    frequency: b.frequency,
                                    preferred_schedule: b.preferred_schedule,
                                    payments: b.payments,
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shadow-xs"
                              >
                                Pay POS
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

        {/* Real-time Payment Logs Stream (1 col) */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Payment Transactions Log
          </h2>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs p-5 space-y-3">
            {paymentLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">No payment logs recorded yet.</div>
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
                      <span className="font-mono">{p.bill?.invoice_number}</span>
                      <span>{new Date(p.logged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
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
              totalPages={Math.max(1, Math.ceil(paymentLogs.length / paymentsPageSize))}
              totalItems={paymentLogs.length}
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
