"use client";

import React, { useState, useEffect } from "react";
import { PaymentMethod, TreatmentBill } from "@/types/dental";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/clinic-context";
import {
  X,
  DollarSign,
  QrCode,
  CreditCard,
  Landmark,
  CheckCircle2,
  Banknote,
  Repeat,
  Layers,
  Sparkles,
} from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bill: {
    id: string;
    invoice_number: string;
    patient_name: string;
    net_amount: number;
    total_paid: number;
    balance_due: number;
    branch_id?: string | null;
    is_installment?: boolean;
    plan_type?: string | null;
    downpayment_amount?: number;
    installment_amount?: number;
    total_installments?: number;
    frequency?: string;
    preferred_schedule?: any;
    payments?: any[];
  } | null;
}

export function PaymentModal({ isOpen, onClose, onSuccess, bill }: PaymentModalProps) {
  const { currentStaff, showToast, activeBranch } = useClinic();
  const [method, setMethod] = useState<PaymentMethod>("gcash");
  const [amount, setAmount] = useState<string>("0");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [tenderedCash, setTenderedCash] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update amount when bill opens
  useEffect(() => {
    if (bill) {
      if (bill.is_installment) {
        const downpayment = Number(bill.downpayment_amount || 0);
        const installment = Number(bill.installment_amount || 0);

        if (bill.total_paid < downpayment && downpayment > 0) {
          const downRemaining = Math.min(bill.balance_due, downpayment - bill.total_paid);
          setAmount(String(downRemaining));
          setTenderedCash(String(downRemaining));
        } else if (installment > 0) {
          const nextAmt = Math.min(bill.balance_due, installment);
          setAmount(String(nextAmt));
          setTenderedCash(String(nextAmt));
        } else {
          setAmount(String(bill.balance_due));
          setTenderedCash(String(bill.balance_due));
        }
      } else {
        setAmount(String(bill.balance_due));
        setTenderedCash(String(bill.balance_due));
      }
      setReferenceNumber("");
      setNotes("");
    }
  }, [bill]);

  if (!isOpen || !bill) return null;

  const numAmount = Number(amount) || 0;
  const numTendered = Number(tenderedCash) || 0;
  const cashChange = Math.max(0, numTendered - numAmount);

  // Installment calculations
  const isInstallment = !!bill.is_installment;
  const installmentAmt = Number(bill.installment_amount || 0);
  const totalInstallments = Number(bill.total_installments || 1);
  const percentSettled = Math.min(
    100,
    Math.round((Number(bill.total_paid) / Math.max(1, Number(bill.net_amount))) * 100)
  );

  // Estimate which milestone is being settled
  const completedInstallments = installmentAmt > 0 ? Math.floor(Number(bill.total_paid) / installmentAmt) : 0;
  const currentMilestone = Math.min(totalInstallments, completedInstallments + 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) {
      showToast("Payment amount must be greater than ₱0.00", "error");
      return;
    }
    if (numAmount > bill.balance_due) {
      showToast(`Payment amount cannot exceed remaining balance of ₱${bill.balance_due.toLocaleString()}`, "error");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    try {
      let paymentNotes = notes.trim();
      if (isInstallment) {
        const tag = `[Installment #${currentMilestone} of ${totalInstallments} - ${
          bill.plan_type ? bill.plan_type.toUpperCase() : "ADJUSTMENT"
        }]`;
        paymentNotes = paymentNotes ? `${tag} ${paymentNotes}` : tag;
      }

      const { error } = await supabase.from("payment_logs").insert({
        bill_id: bill.id,
        branch_id: bill.branch_id || activeBranch?.id || currentStaff?.branch_id || null,
        amount_logged: numAmount,
        payment_method: method,
        reference_number: referenceNumber.trim() || null,
        notes: paymentNotes || null,
        logged_by: currentStaff?.id || "00000000-0000-0000-0000-000000000020",
      });

      if (error) throw error;

      showToast(
        isInstallment
          ? `Installment #${currentMilestone} payment of ₱${numAmount.toLocaleString()} recorded via ${method.toUpperCase()}!`
          : `Payment of ₱${numAmount.toLocaleString()} recorded via ${method.toUpperCase()}!`,
        "success"
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err?.message || "Failed to log payment.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[94vh] sm:max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                  {bill.invoice_number}
                </span>
                {isInstallment && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                    <Repeat className="w-3 h-3" />
                    <span>Installment Package</span>
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                POS Payment Terminal
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Patient: <strong className="text-slate-700 dark:text-slate-300">{bill.patient_name}</strong>
              </p>
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
            {/* If Installment Package: Interactive Milestone Card */}
            {isInstallment && (
              <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/60 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    <span>{bill.plan_type ? `${bill.plan_type.toUpperCase()} Package` : "Installment Plan"}</span>
                  </span>
                  <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                    Milestone #{currentMilestone} of {totalInstallments}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 rounded-full bg-purple-200 dark:bg-purple-900/60 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-500"
                      style={{ width: `${percentSettled}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-purple-700 dark:text-purple-300">
                    <span>₱{Number(bill.total_paid).toLocaleString()} settled ({percentSettled}%)</span>
                    <span>₱{Number(bill.balance_due).toLocaleString()} remaining</span>
                  </div>
                </div>

                {/* Quick Selection Pills */}
                <div className="pt-1 flex flex-wrap gap-1.5">
                  {installmentAmt > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const amt = String(Math.min(bill.balance_due, installmentAmt));
                        setAmount(amt);
                        setTenderedCash(amt);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-800 text-purple-800 dark:text-purple-200 font-bold text-[10px] hover:bg-purple-100 transition-all cursor-pointer shadow-2xs"
                    >
                      Pay Adjustment (₱{installmentAmt.toLocaleString()})
                    </button>
                  )}
                  {Number(bill.downpayment_amount || 0) > 0 &&
                    Number(bill.total_paid) < Number(bill.downpayment_amount || 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          const downRemaining = Math.min(
                            bill.balance_due,
                            Number(bill.downpayment_amount) - Number(bill.total_paid)
                          );
                          const amt = String(downRemaining);
                          setAmount(amt);
                          setTenderedCash(amt);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-800 text-purple-800 dark:text-purple-200 font-bold text-[10px] hover:bg-purple-100 transition-all cursor-pointer shadow-2xs"
                      >
                        Pay Downpayment
                      </button>
                    )}
                  <button
                    type="button"
                    onClick={() => {
                      setAmount(String(bill.balance_due));
                      setTenderedCash(String(bill.balance_due));
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-800 text-purple-800 dark:text-purple-200 font-bold text-[10px] hover:bg-purple-100 transition-all cursor-pointer shadow-2xs"
                  >
                    Pay Full Remaining Balance
                  </button>
                </div>
              </div>
            )}

            {/* Bill Summary Banner */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  {isInstallment ? "Contract Total" : "Net Bill"}
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                  ₱{bill.net_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Paid So Far
                </span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  ₱{bill.total_paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">
                  Balance Due
                </span>
                <span className="text-base font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                  ₱{bill.balance_due.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Payment Method *
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "gcash", label: "GCash", icon: QrCode, color: "text-blue-500" },
                  { id: "cash", label: "Cash", icon: Banknote, color: "text-emerald-500" },
                  { id: "card", label: "Card", icon: CreditCard, color: "text-purple-500" },
                  { id: "bank_transfer", label: "Bank", icon: Landmark, color: "text-amber-500" },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id as PaymentMethod)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-teal-50 dark:bg-teal-950/60 border-teal-600 text-teal-800 dark:text-teal-200 ring-2 ring-teal-500/30"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-1 ${m.color}`} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount to Log */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {isInstallment ? "Installment Payment Amount (₱) *" : "Payment Amount (PHP ₱) *"}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAmount(String(bill.balance_due));
                    setTenderedCash(String(bill.balance_due));
                  }}
                  className="text-xs text-teal-600 hover:underline font-semibold cursor-pointer"
                >
                  Pay Full Balance
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-base">
                  ₱
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={bill.balance_due}
                  required
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (method === "cash" && (!tenderedCash || Number(tenderedCash) < Number(e.target.value))) {
                      setTenderedCash(e.target.value);
                    }
                  }}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 font-mono text-lg font-bold focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                />
              </div>
            </div>

            {/* Cash Tendered & Change calculator */}
            {method === "cash" && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Cash Tendered by Patient
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={tenderedCash}
                    onChange={(e) => setTenderedCash(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono font-bold"
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-sm">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Change Due:</span>
                  <span className="text-base font-extrabold text-teal-600 font-mono">
                    ₱{cashChange.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {/* Reference Number */}
            {(method === "gcash" || method === "bank_transfer" || method === "card") && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Transaction / Trace Reference No.
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. GCash Ref: 10098234891"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-xs font-mono"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Receipt Remark / Payment Note (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isInstallment ? "e.g. Month 2 wire & bracket adjustment paid" : "e.g. Paid in full via cashier"}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-xs"
              />
            </div>

            {/* Action Buttons */}
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
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? "Recording..."
                    : isInstallment
                    ? `Log Installment #${currentMilestone} Payment (₱${numAmount.toLocaleString()})`
                    : `Record Payment of ₱${numAmount.toLocaleString()}`}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
