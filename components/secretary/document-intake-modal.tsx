"use client";

import React, { useState, useEffect } from "react";
import { Patient } from "@/types/dental";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/clinic-context";
import { X, Upload, FileText, CheckCircle2, AlertCircle, Shield } from "lucide-react";

interface DocumentIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedPatientId?: string;
}

export function DocumentIntakeModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedPatientId,
}: DocumentIntakeModalProps) {
  const { showToast, currentStaff } = useClinic();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState(preselectedPatientId || "");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<"consent_form" | "photo" | "lab_result" | "xray" | "prescription" | "other">("consent_form");
  const [fileUrl, setFileUrl] = useState("");
  const [notes, setNotes] = useState("");
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
      setErrorMessage(null);
    }
  }, [isOpen, preselectedPatientId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      setErrorMessage("Please select a patient.");
      return;
    }
    if (!title.trim()) {
      setErrorMessage("Document title is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Fallback demo URL if file not uploaded to external bucket
      const finalUrl = fileUrl.trim() || `https://cdgdental.com/docs/intake-${Date.now()}.pdf`;

      const { data, error } = await supabase.from("patient_documents").insert({
        patient_id: patientId,
        title: title.trim(),
        category,
        file_url: finalUrl,
        notes: notes.trim() || null,
        uploaded_by: currentStaff?.id || null,
      });

      if (error) throw error;

      showToast(`Document "${title}" recorded to patient records!`, "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save document.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Intake Document Upload
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Record signed consent forms, photo IDs & medical waivers
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
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select Patient *
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
                  {p.last_name}, {p.first_name}
                </option>
              ))}
            </select>
          </div>

          {/* Document Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Document Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Signed Dental Consent & Medical History Form"
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Category (PostgreSQL Check Constraint)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="consent_form">Consent Form (Signed Waiver)</option>
              <option value="photo">Patient Photo / Valid ID</option>
              <option value="lab_result">Lab Result / Bloodwork</option>
              <option value="xray">X-Ray Panoramic / Periapical</option>
              <option value="prescription">Prescription Slip</option>
              <option value="other">Other Document</option>
            </select>
          </div>

          {/* File URL or Reference */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              File URL / Cloud Document Path
            </label>
            <input
              type="text"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://... or leave blank for digital intake record"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Intake Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Patient physically signed at front-desk on arrival"
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
              {isSubmitting ? "Uploading..." : "Save Document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
