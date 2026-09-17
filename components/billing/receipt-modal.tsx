"use client";

import React, { useState } from "react";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  Printer,
  X,
  Send,
  CheckCircle2,
  Receipt,
  ShieldCheck,
  Calendar,
  Building2,
  User,
  CreditCard,
  AlertCircle,
  Stethoscope,
} from "lucide-react";
import { useClinic } from "@/context/clinic-context";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any | null;
}

export function ReceiptModal({ isOpen, onClose, bill }: ReceiptModalProps) {
  const { showToast } = useClinic();
  const [isSendingSms, setIsSendingSms] = useState(false);

  if (!isOpen || !bill) return null;

  const patientName = bill.patient
    ? `${bill.patient.first_name} ${bill.patient.last_name}`
    : bill.patient_name || "Valued Patient";
  const patientPhone = bill.patient?.phone || "";
  const branchName = bill.branch?.name || "CDG Dental Clinic (Main)";
  const dentistName = bill.dentist?.full_name || "Attending Dental Specialist";
  const invoiceNumber = bill.invoice_number || `INV-${bill.id?.slice(0, 8).toUpperCase()}`;
  const billDate = bill.created_at
    ? new Date(bill.created_at).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-PH");

  const totalAmount = Number(bill.total_amount || 0);
  const discountAmount = Number(bill.discount_amount || 0);
  const netAmount = Number(bill.net_amount || totalAmount - discountAmount);
  const totalPaid = Number(bill.paid_amount || bill.total_paid || 0);
  const balanceDue = Number(bill.balance_due || Math.max(0, netAmount - totalPaid));
  const isSettled = balanceDue <= 0;

  const handlePrint = () => {
    window.print();
  };

  const handleSendSmsReceipt = async () => {
    if (!patientPhone) {
      showToast("No phone number on file for this patient.", "error");
      return;
    }

    setIsSendingSms(true);
    try {
      const res = await fetch("/api/admin/notifications/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "receipt",
          phone: patientPhone,
          patient_name: patientName,
          amount: totalPaid,
          bill_number: invoiceNumber,
          branch_name: branchName,
          balance_remaining: balanceDue,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch SMS receipt.");
      }

      if (data.status === "simulated") {
        showToast(
          `[Simulation] SMS receipt simulated for ${data.recipient}. (Add SEMAPHORE_API_KEY for live delivery)`,
          "info"
        );
      } else {
        showToast(`SMS receipt dispatched successfully to ${data.recipient}!`, "success");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to send SMS receipt.", "error");
    } finally {
      setIsSendingSms(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm print:p-0 print:bg-white print:static">
        {/* Printable Paper Card */}
        <div
          id="cdg-printable-receipt"
          className="relative w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto print:border-none print:shadow-none print:max-w-none print:w-full print:rounded-none"
        >
          {/* Header - Screen Bar */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-teal-400" />
              <h2 className="text-base font-bold tracking-tight">Official Statement of Account / Receipt</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Receipt Body */}
          <div className="p-6 sm:p-8 space-y-6 text-sm text-slate-700">
            {/* Clinic Branding */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white font-black text-lg">
                    C
                  </div>
                  <div>
                    <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">CDG DENTAL CLINIC</h1>
                    <p className="text-xs text-slate-500 font-medium">Excellence in Comprehensive Dental Care</p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                  <p className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>{branchName}</span>
                  </p>
                  <p className="pl-5">Cagayan de Oro City, Northern Mindanao, Philippines</p>
                  <p className="pl-5 text-slate-400">VAT Reg. TIN: 000-000-000-000 • Non-VAT / Exempt</p>
                </div>
              </div>

              <div className="sm:text-right bg-slate-50 p-3 rounded-xl border border-slate-200/60 print:border-slate-300">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800">
                  {isSettled ? "PAID IN FULL" : "BILLING STATEMENT"}
                </span>
                <p className="text-xs font-semibold text-slate-500 mt-1">Statement / Ref #</p>
                <p className="text-base font-black text-slate-900 tracking-wide">{invoiceNumber}</p>
                <p className="text-xs text-slate-500 mt-1 flex items-center sm:justify-end gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{billDate}</span>
                </p>
              </div>
            </div>

            {/* Patient & Attending Doctor Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 print:bg-transparent print:border print:border-slate-300">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3 text-teal-600" /> Patient Demographics
                </p>
                <p className="text-sm font-bold text-slate-900 mt-1">{patientName}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {patientPhone ? `Mobile: ${patientPhone}` : "Phone: Not provided"}
                </p>
                {bill.patient?.id && (
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                    ID: {bill.patient.id.slice(0, 8)}...
                  </p>
                )}
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Stethoscope className="w-3 h-3 text-teal-600" /> Attending Clinician
                </p>
                <p className="text-sm font-bold text-slate-900 mt-1">{dentistName}</p>
                <p className="text-xs text-slate-500 mt-0.5">Dental Practitioner / PRC Reg.</p>
                {bill.plan_type && (
                  <p className="text-xs text-teal-700 font-semibold mt-0.5 capitalize">
                    Billing Plan: {bill.plan_type}
                  </p>
                )}
              </div>
            </div>

            {/* Itemized Procedures Breakdown */}
            <div>
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Itemized Clinical Procedures
              </p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Description / Procedure</th>
                      <th className="py-2.5 px-3 text-center">Tooth # / Site</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Amount (PHP)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.isArray(bill.treatments) && bill.treatments.length > 0 ? (
                      bill.treatments.map((t: any, idx: number) => (
                        <tr key={t.id || idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {t.procedure_name || t.description || "Clinical Dental Procedure"}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                            {t.tooth_number ? `T-${t.tooth_number}` : "General"}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{t.quantity || 1}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                            ₱{Number(t.cost || t.total_amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-3 px-3 font-semibold text-slate-800" colSpan={3}>
                          Comprehensive Dental Treatment & Clinical Care
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-900">
                          ₱{totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Statutory Discount Callout (Senior Citizen / PWD / Solo Parent) */}
            {discountAmount > 0 && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <p className="font-bold">
                    Statutory Mandated Exemption Applied ({bill.discount_type || "Senior / PWD Discount"})
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    ID Ref: {bill.discount_id_number || "Verified"} • Cardholder:{" "}
                    {bill.discount_id_cardholder || patientName}
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Deduction: -₱{discountAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}

            {/* Payment Receipts History Table */}
            {Array.isArray(bill.payments) && bill.payments.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-teal-600" /> Payment & Tender Transaction History
                </p>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Method</th>
                        <th className="py-2 px-3">Reference / Trans #</th>
                        <th className="py-2 px-3 text-right">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bill.payments.map((p: any, idx: number) => (
                        <tr key={p.id || idx}>
                          <td className="py-2 px-3 text-slate-600">
                            {p.logged_at ? new Date(p.logged_at).toLocaleDateString("en-PH") : billDate}
                          </td>
                          <td className="py-2 px-3 font-semibold uppercase text-[11px] text-slate-700">
                            {p.payment_method || "Cash"}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                            {p.reference_number || "DIRECT-POS"}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">
                            ₱{Number(p.amount_paid || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Financial Summary Calculation Card */}
            <div className="flex justify-end pt-2">
              <div className="w-full sm:w-72 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 py-1">
                  <span>Gross Procedure Subtotal:</span>
                  <span className="font-semibold text-slate-900">
                    ₱{totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-amber-700 py-1 border-t border-slate-100">
                    <span>Statutory Discount:</span>
                    <span className="font-bold">
                      -₱{discountAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-slate-900 font-bold py-1.5 border-t border-slate-200 text-sm">
                  <span>Net Amount Payable:</span>
                  <span>₱{netAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between text-emerald-700 font-semibold py-1 border-t border-slate-100">
                  <span>Total Amount Paid:</span>
                  <span>₱{totalPaid.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>

                <div
                  className={`flex justify-between font-extrabold py-2 px-3 rounded-lg text-sm ${
                    isSettled ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
                  }`}
                >
                  <span>{isSettled ? "Balance (Fully Settled):" : "Outstanding Balance:"}</span>
                  <span>₱{balanceDue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Clinic Policy & BIR Disclaimer Footer */}
            <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-400 space-y-1">
              <p>
                * This document serves as an Official Clinical Statement of Account and Practice Receipt for dental
                services rendered at CDG Dental Clinic.
              </p>
              <p>
                * For inquiries, warranty on prosthodontics, or installment queries, contact CDG Dental Clinic Customer
                Desk. Thank you for your trust in our care!
              </p>
            </div>
          </div>

          {/* Action Buttons - Hidden during printing */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200 print:hidden">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendSmsReceipt}
                disabled={isSendingSms || !patientPhone}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 disabled:opacity-50 transition"
              >
                <Send className="w-3.5 h-3.5" />
                {isSendingSms ? "Sending..." : "Send SMS Receipt"}
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 shadow-md transition"
              >
                <Printer className="w-4 h-4" />
                Print / Save PDF
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
