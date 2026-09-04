"use client";

import React from "react";
import { X, Printer, CheckCircle2, ShieldCheck, Download } from "lucide-react";
import { useClinic } from "@/context/clinic-context";

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
    total_amount: number;
    discount_amount: number;
    net_amount: number;
    status: string;
    created_at: string;
    notes?: string | null;
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden max-h-[90vh] flex flex-col">
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

        {/* Printable Receipt Paper Container */}
        <div className="p-6 sm:p-8 overflow-y-auto print:p-0 space-y-6 text-slate-800 dark:text-slate-200 text-xs">
          {/* Clinic Letterhead */}
          <div className="text-center border-b border-dashed border-slate-300 dark:border-slate-700 pb-5 space-y-1">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center text-white font-black text-sm">
                CDG
              </div>
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
                CDG DENTAL CLINIC
              </h2>
            </div>
            <p className="font-semibold text-slate-600 dark:text-slate-400">
              {activeBranch?.name || "Main Clinic"}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {activeBranch?.address || "Suite 402 Medical Arts Tower, Ortigas Center, Pasig City"}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tel: {activeBranch?.phone || "+63 917 123 4567"} • Email: {activeBranch?.email || "billing@cdgdental.com"}
            </p>
            <div className="pt-2">
              <span className="inline-block px-3 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                OFFICIAL PATIENT RECEIPT
              </span>
            </div>
          </div>

          {/* Receipt Meta & Patient Information */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-dashed border-slate-300 dark:border-slate-700">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Billed To (Patient):
              </span>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {bill.patient ? `${bill.patient.last_name}, ${bill.patient.first_name}` : "Patient"}
              </p>
              {bill.patient?.phone && (
                <p className="text-[11px] text-slate-500">Contact: {bill.patient.phone}</p>
              )}
              {bill.patient?.address && (
                <p className="text-[11px] text-slate-500 truncate max-w-xs">{bill.patient.address}</p>
              )}
            </div>

            <div className="text-right space-y-0.5">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Invoice Number:
                </span>
                <p className="font-mono font-bold text-teal-600 dark:text-teal-400 text-xs">
                  {bill.invoice_number}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Date Issued:
                </span>
                <p className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                  {new Date(bill.created_at).toLocaleDateString()} at{" "}
                  {new Date(bill.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {bill.appointment?.dentist && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    Attending Doctor:
                  </span>
                  <p className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                    {bill.appointment.dentist.full_name}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Itemized Breakdown Table */}
          <div className="space-y-2">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-bold">
              <span>Description / Treatment Procedure</span>
              <span>Amount (PHP)</span>
            </div>

            <div className="flex justify-between items-center py-1 font-medium">
              <span>
                Dental Treatment & Operatory Services
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
              <div className="flex justify-between items-center py-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <span>Clinic Courtesy / Voucher Discount</span>
                <span className="font-mono">
                  - ₱{Number(bill.discount_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center py-2 border-t border-slate-200 dark:border-slate-800 text-sm font-black">
              <span>Total Net Payable</span>
              <span className="font-mono text-teal-700 dark:text-teal-400">
                ₱{Number(bill.net_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Payments Logged Table */}
          <div className="space-y-2 pt-2 border-t border-dashed border-slate-300 dark:border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Payments Received
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
                <span>Total Amount Paid:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  ₱{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold">
                <span>Balance Remaining:</span>
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

          {/* Stamp / Status Seal */}
          <div className="pt-4 flex items-center justify-between border-t border-dashed border-slate-300 dark:border-slate-700">
            <div>
              {isFullyPaid ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border-2 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-extrabold uppercase tracking-widest text-xs rotate-[-3deg]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>PAID IN FULL</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border-2 border-amber-500 text-amber-700 dark:text-amber-400 font-extrabold uppercase tracking-widest text-xs">
                  <span>PARTIAL PAYMENT</span>
                </div>
              )}
            </div>

            {/* Cashier Verification */}
            <div className="text-right space-y-1">
              <div className="w-36 border-b border-slate-400 ml-auto pb-6" />
              <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                {currentStaff?.full_name || "Maria Santos"}
              </p>
              <p className="text-[9px] uppercase tracking-wider text-slate-400">
                Clinic Front-Desk Cashier
              </p>
            </div>
          </div>

          {/* Footer Note */}
          <p className="text-[10px] text-center text-slate-400 italic pt-2">
            Thank you for choosing CDG Dental Clinic. Keep this receipt for your personal records or health insurance claims.
          </p>
        </div>
      </div>
    </div>
  );
}
