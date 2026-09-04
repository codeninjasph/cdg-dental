"use client";

import React, { useState, useEffect } from "react";
import { Patient, Profile, Branch, Appointment } from "@/types/dental";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/clinic-context";
import {
  Calendar,
  Clock,
  User,
  AlertCircle,
  X,
  FileText,
  MapPin,
} from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialPatientId?: string;
}

export function AppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  initialPatientId,
}: AppointmentModalProps) {
  const { branches, staffList, showToast, activeBranch } = useClinic();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState(initialPatientId || "");
  const [dentistId, setDentistId] = useState("");
  const [branchId, setBranchId] = useState(activeBranch?.id || "");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();
  const dentists = staffList.filter((s) => s.role === "dentist" || s.role === "admin");

  useEffect(() => {
    if (dentists.length > 0 && !dentistId) {
      setDentistId(dentists[0].id);
    }
    if (activeBranch && !branchId) {
      setBranchId(activeBranch.id);
    }
  }, [dentists, activeBranch]);

  useEffect(() => {
    async function loadPatients() {
      const { data } = await supabase.from("patients").select("*").order("last_name");
      if (data) {
        setPatients(data);
        if (!patientId && data.length > 0) {
          setPatientId(initialPatientId || data[0].id);
        }
      }
    }
    if (isOpen) {
      if (!date) setDate(new Date().toISOString().split("T")[0]);
      loadPatients();
      setErrorMessage(null);
    }
  }, [isOpen, initialPatientId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Calculate start_time and end_time ISO strings
      const startDateTime = new Date(`${date}T${startTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

      const { data, error } = await supabase.from("appointments").insert({
        patient_id: patientId,
        dentist_id: dentistId,
        branch_id: branchId || branches[0]?.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: "scheduled",
        notes: notes.trim() || null,
      });

      if (error) {
        if (error.message.includes("no_dentist_double_booking") || error.code === "23P01") {
          setErrorMessage("Double-Booking Conflict: This dentist already has an active appointment scheduled during this exact time slot. Please choose another time or dentist.");
        } else {
          setErrorMessage(error.message);
        }
        return;
      }

      showToast("Appointment successfully booked!", "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred.");
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
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Book Clinic Appointment
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Schedule patient visit with automated conflict resolution
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Patient Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Select Patient *
            </label>
            <select
              required
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.last_name}, {p.first_name} {p.phone ? `(${p.phone})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Dentist & Branch Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Attending Dentist *
              </label>
              <select
                required
                value={dentistId}
                onChange={(e) => setDentistId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              >
                {dentists.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Branch Location *
              </label>
              <select
                required
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name.split("—")[1]?.trim() || b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date, Time & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Start Time *
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Duration
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              >
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>60 mins (1 hr)</option>
                <option value={90}>90 mins (1.5 hr)</option>
                <option value={120}>120 mins (2 hr)</option>
              </select>
            </div>
          </div>

          {/* Procedure Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Reason / Planned Procedure
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Routine Cleaning, Tooth #14 composite restoration, braces adjustment"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
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
              className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2"
            >
              {isSubmitting ? "Checking Schedule..." : "Confirm Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  </ModalPortal>
  );
}
