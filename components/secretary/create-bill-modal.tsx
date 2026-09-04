"use client";

import React, { useState, useEffect } from "react";
import { Patient, Appointment } from "@/types/dental";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/clinic-context";
import { X, Receipt, Calculator, Calendar, User, Tag, AlertCircle } from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";

interface CreateBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedPatientId?: string;
  preselectedAppointmentId?: string;
}

export function CreateBillModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedPatientId,
  preselectedAppointmentId,
}: CreateBillModalProps) {
  const { showToast, activeBranch } = useClinic();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState(preselectedPatientId || "");
  const [appointmentId, setAppointmentId] = useState(preselectedAppointmentId || "");
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [totalAmount, setTotalAmount] = useState<string>("0");
  const [discountAmount, setDiscountAmount] = useState<string>("0");
  const [dueDate, setDueDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadPatients() {
      const { data } = await supabase.from("patients").select("*").order("last_name");
      if (data) {
        setPatients(data);
        if (!patientId && data.length > 0) {
          setPatientId(preselectedPatientId || data[0].id);
        }
      }
    }
    if (isOpen) {
      loadPatients();
      const today = new Date().toISOString().split("T")[0];
      setDueDate(today);
      setErrorMessage(null);
    }
  }, [isOpen, preselectedPatientId]);

  useEffect(() => {
    async function loadPatientAppts() {
      if (!patientId) {
        setPatientAppointments([]);
        return;
      }
      const { data } = await supabase
        .from("appointments")
        .select(`
          id, start_time, end_time, status, notes,
          dentist:profiles(full_name)
        `)
        .eq("patient_id", patientId)
        .order("start_time", { ascending: false });

      if (data) {
        setPatientAppointments(data as any[]);
        if (preselectedAppointmentId) {
          setAppointmentId(preselectedAppointmentId);
        }
      }
    }
    if (patientId) {
      loadPatientAppts();
    }
  }, [patientId, preselectedAppointmentId]);

  if (!isOpen) return null;

  const numTotal = Math.max(0, Number(totalAmount) || 0);
  const numDiscount = Math.max(0, Number(discountAmount) || 0);
  const calculatedNet = Math.max(0, numTotal - numDiscount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      setErrorMessage("Please select a patient.");
      return;
    }
    if (numTotal <= 0) {
      setErrorMessage("Total treatment amount must be greater than ₱0.00.");
      return;
    }
    if (numDiscount > numTotal) {
      setErrorMessage("Discount amount cannot exceed total amount.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Notice: net_amount is generated column in Postgres, so we do NOT insert it
      const insertPayload: any = {
        patient_id: patientId,
        total_amount: numTotal,
        discount_amount: numDiscount,
        status: "unpaid",
        due_date: dueDate || null,
        notes: notes.trim() || null,
      };

      if (appointmentId && appointmentId !== "none") {
        insertPayload.appointment_id = appointmentId;
      }

      const { data, error } = await supabase
        .from("treatment_bills")
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;

      showToast(
        `Invoice ${data.invoice_number || "created"} generated for ₱${calculatedNet.toLocaleString()}!`,
        "success"
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to create invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Generate Patient Invoice
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Front-desk cashier billing in accordance with database ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Patient Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Patient Account *
            </label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="">Select Patient...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.last_name}, {p.first_name} {p.phone ? `(${p.phone})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Associated Appointment (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Link to Clinic Appointment (Optional)
            </label>
            <select
              value={appointmentId}
              onChange={(e) => setAppointmentId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="none">No Specific Appointment / Walk-In Standalone</option>
              {patientAppointments.map((appt: any) => (
                <option key={appt.id} value={appt.id}>
                  {new Date(appt.start_time).toLocaleDateString()} at{" "}
                  {new Date(appt.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} —{" "}
                  {appt.dentist?.full_name || "Doctor"} ({appt.status})
                </option>
              ))}
            </select>
          </div>

          {/* Amounts: Total & Discount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Total Treatment Fee (₱) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-400" />
                Discount / Voucher (₱)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Net Amount Auto-Calculation Card */}
          <div className="p-3.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-medium text-teal-900 dark:text-teal-200">
                Net Payable (DB Computed)
              </span>
            </div>
            <span className="text-base font-extrabold text-teal-700 dark:text-teal-300 font-mono">
              ₱{calculatedNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Due Date & Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Payment Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Invoice Notes & Clinical Breakdown
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Composite restoration on tooth #14 + Scaling discount voucher applied"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? "Generating..." : "Generate Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  </ModalPortal>
  );
}
