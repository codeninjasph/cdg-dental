"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/clinic-context";
import { OutstandingBalance, TreatmentBill, PaymentLog } from "@/types/dental";
import { PaymentModal } from "@/components/billing/payment-modal";
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
} from "lucide-react";

export default function BillingPage() {
  const { showToast, refreshTrigger, triggerRefresh } = useClinic();
  const [bills, setBills] = useState<any[]>([]);
  const [balances, setBalances] = useState<OutstandingBalance[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
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
        .order("logged_at", { ascending: false })
        .limit(20);

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

  // Aggregate Metrics
  const totalBilled = bills.reduce((sum, b) => sum + Number(b.net_amount), 0);
  const totalCollected = paymentLogs.reduce((sum, p) => sum + Number(p.amount_logged), 0);
  const totalOutstanding = balances.reduce((sum, b) => sum + Number(b.balance_due), 0);

  // Method breakdowns
  const gcashTotal = paymentLogs
    .filter((p) => p.payment_method === "gcash")
    .reduce((sum, p) => sum + Number(p.amount_logged), 0);
  const cashTotal = paymentLogs
    .filter((p) => p.payment_method === "cash")
    .reduce((sum, p) => sum + Number(p.amount_logged), 0);
  const cardTotal = paymentLogs
    .filter((p) => p.payment_method === "card")
    .reduce((sum, p) => sum + Number(p.amount_logged), 0);

  const filteredBills = bills.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    return true;
  });

  const billStatusColors: Record<string, string> = {
    unpaid: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border-rose-200",
    partially_paid: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border-amber-200",
    fully_paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-200",
    cancelled: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-300",
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <CreditCard className="w-6 h-6 text-teal-600" />
          Financial Ledger & POS Terminal
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Automated invoice generation, payment logs (GCash, Cash, Card), and real-time balance calculations.
        </p>
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
                    onClick={() =>
                      setActivePaymentBill({
                        id: b.bill_id,
                        invoice_number: b.invoice_number,
                        patient_name: `${b.first_name} ${b.last_name}`,
                        net_amount: Number(b.net_amount),
                        total_paid: Number(b.total_paid),
                        balance_due: Number(b.balance_due),
                      })
                    }
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

            {/* Filter */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-semibold">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Statuses ({bills.length})</option>
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
                    filteredBills.map((b) => {
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
                            {b.invoice_number}
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
              paymentLogs.map((p) => {
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
