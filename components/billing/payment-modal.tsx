"use client";

import React, { useState } from "react";
import { PaymentMethod, TreatmentBill } from "@/types/dental";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/clinic-context";
import { X, DollarSign, QrCode, CreditCard, Landmark, CheckCircle2, Banknote } from "lucide-react";

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
  } | null;
}

export function PaymentModal({ isOpen, onClose, onSuccess, bill }: PaymentModalProps) {
  const { currentStaff, showToast } = useClinic();
  const [method, setMethod] = useState<PaymentMethod>("gcash");
  const [amount, setAmount] = useState<string>(bill ? String(bill.balance_due) : "0");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [tenderedCash, setTenderedCash] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update amount when bill changes
  React.useEffect(() => {
    if (bill) {
      setAmount(String(bill.balance_due));
      setTenderedCash(String(bill.balance_due));
    }
  }, [bill]);

  if (!isOpen || !bill) return null;

  const numAmount = Number(amount) || 0;
  const numTendered = Number(tenderedCash) || 0;
  const cashChange = Math.max(0, numTendered - numAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) {
      showToast("Payment amount must be greater than 0", "error");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase.from("payment_logs").insert({
        bill_id: bill.id,
        amount_logged: numAmount,
        payment_method: method,
        reference_number: referenceNumber.trim() || null,
        notes: notes.trim() || null,
        logged_by: currentStaff?.id || "00000000-0000-0000-0000-000000000020",
      });

      if (error) throw error;

      showToast(`Payment of ₱${numAmount.toLocaleString()} recorded via ${method.toUpperCase()}!`, "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err?.message || "Failed to log payment.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div>
            <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
              {bill.invoice_number}
            </span>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
              POS Payment Terminal
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Patient: <strong className="text-slate-700 dark:text-slate-300">{bill.patient_name}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Bill Summary Banner */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                Net Bill
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
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${
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
                Payment Amount (PHP ₱) *
              </label>
              <button
                type="button"
                onClick={() => setAmount(String(bill.balance_due))}
                className="text-xs text-teal-600 hover:underline font-semibold"
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
                onChange={(e) => setAmount(e.target.value)}
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

          {/* Reference # for GCash / Card / Bank */}
          {method !== "cash" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {method === "gcash"
                  ? "GCash Reference Number *"
                  : method === "card"
                  ? "Card Authorization / Terminal Trace #"
                  : "Bank Reference #"}
              </label>
              <input
                type="text"
                required={method === "gcash"}
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder={
                  method === "gcash"
                    ? "e.g. GC-982347102"
                    : method === "card"
                    ? "e.g. AUTH-449182"
                    : "e.g. BPI-REF-772910"
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 text-sm font-mono focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? "Processing Payment..." : `Record ₱${numAmount.toLocaleString()} Payment`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
