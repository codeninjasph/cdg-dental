"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/clinic-context";
import { X, Sparkles, FileText, CheckCircle2, Tag } from "lucide-react";
import { TOOTH_METADATA } from "@/lib/tooth-data";
import { ModalPortal } from "@/components/ui/modal-portal";
import { DentalService } from "@/lib/db/services";

interface AddTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patientId: string;
  initialToothNumber?: number | null;
  appointmentId?: string | null;
}

const FALLBACK_PROCEDURES = [
  { name: "Ultrasonic Scaling & Polishing", cost: 2500 },
  { name: "Light-Cure Composite Restoration (Anterior)", cost: 2800 },
  { name: "Light-Cure Composite Restoration (Posterior MOD)", cost: 3200 },
  { name: "Simple Tooth Extraction", cost: 2000 },
  { name: "Surgical Odontectomy (Wisdom Tooth)", cost: 8500 },
  { name: "Root Canal Therapy (Single Canal)", cost: 6500 },
  { name: "Root Canal Therapy (Molar)", cost: 12000 },
  { name: "All-Ceramic Zirconia Crown", cost: 14000 },
  { name: "Periapical Digital X-Ray", cost: 600 },
  { name: "Topical Fluoride Application", cost: 1500 },
];

export function AddTreatmentModal({
  isOpen,
  onClose,
  onSuccess,
  patientId,
  initialToothNumber,
  appointmentId,
}: AddTreatmentModalProps) {
  const { currentStaff, staffList, showToast, activeBranch } = useClinic();
  const [catalogServices, setCatalogServices] = useState<DentalService[]>([]);
  const [procedureName, setProcedureName] = useState("");
  const [toothNumber, setToothNumber] = useState<string>(
    initialToothNumber ? String(initialToothNumber) : ""
  );
  const [cost, setCost] = useState<string>("2500");
  const [dentistId, setDentistId] = useState(currentStaff?.id || "");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [immediateInvoice, setImmediateInvoice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load catalog services dynamically
  useEffect(() => {
    if (isOpen) {
      fetch("/api/admin/services?onlyActive=true")
        .then((res) => res.json())
        .then((data) => {
          if (data.services && data.services.length > 0) {
            setCatalogServices(data.services);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const dentists = staffList.filter((s) => s.role === "dentist" || s.role === "admin");

  if (!isOpen) return null;

  const handleQuickProcedure = (proc: { name: string; cost: number; description?: string | null }) => {
    setProcedureName(proc.name);
    setCost(String(proc.cost));
    if (!clinicalNotes && proc.description) {
      setClinicalNotes(proc.description);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const numCost = Number(cost) || 0;
      const tNum = toothNumber ? Number(toothNumber) : null;
      const effectiveDentistId = dentistId || dentists[0]?.id || "3cb85fbe-8060-4347-915a-1d400aa160ca";

      // 1. Insert treatment as pending checkout
      const { data: treatment, error: tErr } = await supabase
        .from("treatments")
        .insert({
          patient_id: patientId,
          dentist_id: effectiveDentistId,
          appointment_id: appointmentId || null,
          tooth_number: tNum,
          procedure_name: procedureName.trim(),
          clinical_notes: clinicalNotes.trim() || null,
          cost: numCost,
          billing_status: immediateInvoice ? "billed" : "pending",
        })
        .select()
        .single();

      if (tErr) throw tErr;

      // 2. Optionally generate immediate standalone treatment bill if requested
      if (immediateInvoice && numCost > 0) {
        const { data: newBill, error: bErr } = await supabase
          .from("treatment_bills")
          .insert({
            patient_id: patientId,
            branch_id: activeBranch?.id || currentStaff?.branch_id || null,
            appointment_id: appointmentId || null,
            dentist_id: effectiveDentistId,
            total_amount: numCost,
            discount_amount: 0.00,
            due_date: new Date().toISOString().split("T")[0],
            notes: `Invoice generated for: ${procedureName.trim()}${tNum ? ` (Tooth #${tNum})` : ""}`,
          })
          .select()
          .single();

        if (bErr) throw bErr;

        // Link treatment to the newly created bill
        if (newBill && treatment) {
          await supabase
            .from("treatments")
            .update({ bill_id: newBill.id, billing_status: "billed" })
            .eq("id", treatment.id);
        }
      }

      // Log to immutable audit trail
      fetch("/api/admin/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorId: currentStaff?.id || null,
          actorName: currentStaff?.full_name || "Doctor",
          actorRole: currentStaff?.role || "dentist",
          actionCategory: "treatment",
          actionType: "TREATMENT_RECORDED",
          entityType: "treatment",
          entityId: treatment?.id,
          description: `Recorded clinical treatment: '${procedureName.trim()}'${tNum ? ` (Tooth #${tNum})` : ""} at ₱${numCost.toLocaleString()}.`,
          metadata: {
            patient_id: patientId,
            tooth_number: tNum,
            cost: numCost,
            immediate_invoice: immediateInvoice,
          },
          branchName: activeBranch?.name || "Main Clinic Hub",
        }),
      }).catch(() => {});

      showToast(
        immediateInvoice
          ? `Recorded and invoiced: ${procedureName.trim()}`
          : `Recorded: ${procedureName.trim()} (Queued for Front-Desk Checkout)`,
        "success"
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err?.message || "Failed to add treatment.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Record Clinical Treatment Procedure
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log completed work, clinical notes, and billable items
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* Master Fee Schedule Catalog Picker */}
          <div className="space-y-1.5 p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-900/60">
            <label className="text-xs font-bold text-teal-950 dark:text-teal-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Select from Master Fee Schedule</span>
              </span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-normal">
                Standardizes pricing & POS invoice
              </span>
            </label>
            <select
              value=""
              onChange={(e) => {
                const found = catalogServices.find((s) => s.name === e.target.value);
                if (found) {
                  handleQuickProcedure({
                    name: found.name,
                    cost: found.base_price,
                    description: found.description,
                  });
                }
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 cursor-pointer"
            >
              <option value="">-- Choose from Master Catalog (Autofills Price) --</option>
              {Array.from(new Set(catalogServices.map((s) => s.category))).map((cat) => (
                <optgroup key={cat} label={cat}>
                  {catalogServices
                    .filter((s) => s.category === cat)
                    .map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.code ? `[${s.code}] ` : ""}{s.name} — ₱{Number(s.base_price).toLocaleString()}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Quick Procedure Presets */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Quick Select Common Procedures
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(catalogServices.length > 0 ? catalogServices.slice(0, 8) : FALLBACK_PROCEDURES).map((p) => {
                const pCost = 'base_price' in p ? p.base_price : p.cost;
                const pDesc = 'description' in p ? p.description : undefined;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleQuickProcedure({ name: p.name, cost: Number(pCost), description: pDesc })}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:border-teal-300 dark:hover:border-teal-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {p.name.split("(")[0].trim()} (₱{Number(pCost).toLocaleString()})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Procedure Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Procedure Name *
            </label>
            <input
              type="text"
              required
              value={procedureName}
              onChange={(e) => setProcedureName(e.target.value)}
              placeholder="e.g. Light-Cure Composite Restoration, Prophylaxis..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>

          {/* Tooth # and Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Tooth Involved (Optional)
              </label>
              <select
                value={toothNumber}
                onChange={(e) => setToothNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              >
                <option value="">Full Mouth / General Work</option>
                {Array.from({ length: 32 }, (_, i) => i + 1).map((num) => {
                  const meta = TOOTH_METADATA[num];
                  return (
                    <option key={num} value={num}>
                      Tooth #{num} ({meta?.name.split(" ")[0]} {meta?.side} {meta?.type})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Procedure Fee (PHP ₱) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                  ₱
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full pl-7 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 font-mono font-bold text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Attending Dentist */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Attending Dentist *
            </label>
            <select
              value={dentistId}
              onChange={(e) => setDentistId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            >
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name} ({d.role})
                </option>
              ))}
            </select>
          </div>

          {/* Clinical Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Clinical Observations & Materials Used
            </label>
            <textarea
              rows={3}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="e.g. Cavity excavated under 2% Lidocaine with 1:100k epi. Layered with shade A3 composite, cured for 40s. Occlusion checked with articulating paper."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 resize-none"
            />
          </div>

          {/* Checkout Queue Notice & Optional Direct Billing */}
          <div className="space-y-2">
            <div className="p-3.5 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/70 flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 shrink-0 mt-0.5">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-teal-900 dark:text-teal-200 block">
                  Queued for Front-Desk Checkout & Billing
                </span>
                <p className="text-teal-700 dark:text-teal-400 mt-0.5 leading-relaxed">
                  This procedure will be routed to the front desk reception slip so the secretary can bundle all visit treatments into a single invoice with Senior Citizen (20%), PWD, or clinic package discounts.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 px-1 cursor-pointer select-none">
              <input
                type="checkbox"
                id="immediateInvoice"
                checked={immediateInvoice}
                onChange={(e) => setImmediateInvoice(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Direct Invoicing: Finalize bill immediately without secretary review
              </span>
            </label>
          </div>

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
              {isSubmitting ? "Saving Procedure..." : "Save Treatment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  </ModalPortal>
  );
}
