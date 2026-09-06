"use client";

import React from "react";
import { X, Printer, CheckCircle2, ShieldCheck, Download, Repeat, CalendarClock } from "lucide-react";
import { useClinic } from "@/context/clinic-context";
import { ModalPortal } from "@/components/ui/modal-portal";

interface OfficialReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: {
    id: string;
    invoice_number: string;
    patient?: {
      first_name: string;
      last_name: string;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
    };
    appointment?: {
      start_time: string;
      dentist?: {
        full_name: string;
      };
    };
    dentist?: {
      full_name: string;
    };
    total_amount: number;
    discount_amount: number;
    net_amount: number;
    status: string;
    created_at: string;
    notes?: string | null;
    is_installment?: boolean;
    plan_type?: string | null;
    downpayment_amount?: number;
    installment_amount?: number;
    total_installments?: number;
    preferred_schedule?: any;
    payments?: Array<{
      id: string;
      amount_logged: number;
      payment_method: string;
      reference_number?: string | null;
      logged_at: string;
      notes?: string | null;
      staff?: {
        full_name: string;
      };
    }>;
  } | null;
}

export function OfficialReceiptModal({ isOpen, onClose, bill }: OfficialReceiptModalProps) {
  const { activeBranch, currentStaff } = useClinic();

  if (!isOpen || !bill) return null;

  const totalPaid = (bill.payments || []).reduce(
    (sum, p) => sum + Number(p.amount_logged || 0),
    0
  );
  const remainingDue = Math.max(0, Number(bill.net_amount) - totalPaid);
  const isFullyPaid = remainingDue <= 0;
  const isInstallment = !!bill.is_installment;

  const installmentAmt = Number(bill.installment_amount || 0);
  const completedCount = installmentAmt > 0 ? Math.floor(totalPaid / installmentAmt) : (bill.payments?.length || 0);

  // Extract statutory discount details (RA 9994 / RA 10754)
  const statutoryInfo =
    bill.preferred_schedule?.statutory_discount ||
    (() => {
      if (!bill.notes) return null;
      const match = bill.notes.match(
        /\[STATUTORY DISCOUNT:\s*([A-Z\s0-9()]+)\s*\|\s*ID:\s*([^|\]]+)(?:\s*\|\s*CARDHOLDER:\s*([^|\]]+))?\]/i
      );
      if (!match) return null;
      return {
        statutory_act: match[1].trim(),
        id_number: match[2].trim(),
        cardholder_name: match[3]?.trim(),
      };
    })();

  const handlePrint = () => {
    window.print();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden max-h-[92vh] flex flex-col">
          {/* Top Control Bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                {bill.invoice_number}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  isFullyPaid
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {bill.status.replace("_", " ")}
              </span>
              {isInstallment && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  Installment Package
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Official Receipt Body */}
          <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs text-slate-800 dark:text-slate-200 print:p-0 print:m-0 print:text-black">
            {/* Clinic Brand Header */}
            <div className="text-center space-y-1 border-b pb-4 border-slate-200 dark:border-slate-800">
              <h1 className="text-lg font-black tracking-tight text-teal-700 dark:text-teal-400 uppercase">
                CDG Dental Clinic
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {activeBranch?.name || "Cagayan de Oro Dental Clinic"} • {activeBranch?.address || "Limketkai Center, CDO"}
              </p>
              <p className="text-[10px] text-slate-400">
                Contact: {activeBranch?.phone || "+63 917 123 4567"} • Email: billing@cdgdental.com
              </p>
              <div className="pt-2">
                <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  {isInstallment ? "Official Installment Statement" : "Official Patient Receipt"}
                </span>
              </div>
            </div>

            {/* Receipt Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 text-[11px]">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Billed To
                </span>
                <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {bill.patient ? `${bill.patient.last_name}, ${bill.patient.first_name}` : "Patient"}
                </p>
                {bill.patient?.phone && (
                  <p className="text-slate-500">Phone: {bill.patient.phone}</p>
                )}
                {bill.patient?.address && (
                  <p className="text-slate-500 truncate">Address: {bill.patient.address}</p>
                )}
              </div>

              <div className="space-y-1 text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Receipt Details
                </span>
                <p className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {bill.invoice_number}
                </p>
                <p className="text-slate-500">
                  Date: {new Date(bill.created_at).toLocaleDateString()}
                </p>
                <p className="text-slate-500">
                  Attending: {bill.dentist?.full_name || bill.appointment?.dentist?.full_name || "Doctor on Duty"}
                </p>
              </div>
            </div>

            {/* If Installment: Plan Milestone Progress Box */}
            {isInstallment && (
              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-2 text-[11px]">
                <div className="flex items-center justify-between font-bold text-purple-900 dark:text-purple-200">
                  <span className="flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-purple-600" />
                    <span>{bill.plan_type ? `${bill.plan_type.toUpperCase()} Package` : "Dental Installment Plan"}</span>
                  </span>
                  <span>Completed: ~{completedCount} of {bill.total_installments || 1} Visits</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-purple-700 dark:text-purple-300">
                  <div>
                    <span>Initial Deposit: ₱{Number(bill.downpayment_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span>Per Adjustment: ₱{Number(bill.installment_amount || 0).toLocaleString()}</span>
                  </div>
                </div>
                {bill.preferred_schedule?.notes && (
                  <div className="pt-1 border-t border-purple-200/60 dark:border-purple-800/60 text-[10px] text-purple-800 dark:text-purple-300 flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" />
                    <span>Standing Schedule: <strong>{bill.preferred_schedule.notes}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* Items / Procedures Table */}
            <div className="border-t border-b border-slate-200 dark:border-slate-800 py-3 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Description / Treatment Procedure</span>
                <span>Amount (PHP)</span>
              </div>

              <div className="flex justify-between items-center py-1 font-medium">
                <span>
                  {isInstallment
                    ? `${bill.plan_type ? bill.plan_type.toUpperCase() : "Dental"} Installment Package Contract`
                    : "Dental Treatment & Operatory Services"}
                  {bill.notes && (
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 italic">
                      {bill.notes}
                    </span>
                  )}
                </span>
                <span className="font-mono text-slate-900 dark:text-slate-100">
                  ₱{Number(bill.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {Number(bill.discount_amount) > 0 && (
                <div className="space-y-1 py-1">
                  <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>
                      {statutoryInfo
                        ? `🇵🇭 Statutory Exemption (${statutoryInfo.statutory_act || "RA 9994 / RA 10754"})`
                        : "Clinic Courtesy / Voucher Discount"}
                    </span>
                    <span className="font-mono">
                      - ₱{Number(bill.discount_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {statutoryInfo && (
                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-[10px] text-purple-900 dark:text-purple-200 flex items-center justify-between">
                      <div>
                        <span className="font-bold">Official ID:</span>{" "}
                        <span className="font-mono font-bold">{statutoryInfo.id_number}</span>
                        {statutoryInfo.cardholder_name && (
                          <span className="ml-1.5">({statutoryInfo.cardholder_name})</span>
                        )}
                      </div>
                      <span className="font-semibold text-purple-700 dark:text-purple-300">
                        20% Statutory Deduction
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center py-2 border-t border-slate-200 dark:border-slate-800 text-sm font-black">
                <span>Total Contract / Net Payable</span>
                <span className="font-mono text-teal-700 dark:text-teal-400">
                  ₱{Number(bill.net_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Payments Logged Table */}
            <div className="space-y-2 pt-2 border-t border-dashed border-slate-300 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Payment History & Receipts Logged
              </span>

              {(!bill.payments || bill.payments.length === 0) ? (
                <p className="text-[11px] text-rose-500 italic">No payments logged yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {bill.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-[11px]"
                    >
                      <div>
                        <span className="font-bold uppercase text-slate-800 dark:text-slate-200">
                          {p.payment_method}
                        </span>
                        {p.reference_number && (
                          <span className="font-mono text-[10px] text-slate-500 ml-1.5">
                            Ref: {p.reference_number}
                          </span>
                        )}
                        {p.notes && (
                          <span className="block text-[10px] text-teal-700 dark:text-teal-400 font-medium">
                            {p.notes}
                          </span>
                        )}
                        <span className="block text-[10px] text-slate-400">
                          {new Date(p.logged_at).toLocaleDateString()} • Recorded by{" "}
                          {p.staff?.full_name || "Secretary"}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        ₱{Number(p.amount_logged).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Total Paid & Remaining Balance */}
              <div className="space-y-1 pt-2">
                <div className="flex justify-between items-center text-[11px] text-slate-600 dark:text-slate-400">
                  <span>Total Amount Paid to Date:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    ₱{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>Remaining Contract Balance:</span>
                  <span
                    className={`font-mono ${
                      isFullyPaid ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    ₱{remainingDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer / Cashier Signature Block */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-end text-[10px] text-slate-400">
              <div>
                <div className="flex items-center gap-1 text-teal-600 dark:text-teal-400 font-bold mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>CDG Dental Verified Receipt</span>
                </div>
                <p>Official Computer-Generated Acknowledgment Receipt.</p>
                <p>This serves as proof of payment for clinical services rendered.</p>
              </div>

              <div className="text-right space-y-1">
                <div className="w-28 border-b border-slate-300 dark:border-slate-700 pb-4 inline-block" />
                <p className="font-bold text-slate-600 dark:text-slate-400">
                  Cashier / Front Desk
                </p>
                <p className="text-[9px] text-slate-400">
                  {currentStaff?.full_name || "Maria Santos (Secretary)"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
