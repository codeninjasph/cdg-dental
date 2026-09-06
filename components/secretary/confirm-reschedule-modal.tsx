"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/clinic-context";
import { Profile, Branch } from "@/types/dental";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  X,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  ShieldAlert,
  CalendarCheck,
  CalendarX,
  ArrowRight,
  Sparkles,
  PhoneCall,
  PhoneOff,
} from "lucide-react";

interface ConfirmRescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointment: any | null;
  dentists: Profile[];
  branches?: Branch[];
}

const TIME_OPTIONS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00"
];

function format12Hour(time24: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export function ConfirmRescheduleModal({
  isOpen,
  onClose,
  onSuccess,
  appointment,
  dentists,
  branches = [],
}: ConfirmRescheduleModalProps) {
  const { showToast } = useClinic();
  const supabase = createClient();

  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [dentistId, setDentistId] = useState("");
  const [callNotes, setCallNotes] = useState("");
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionType, setActionType] = useState<"confirm" | "reschedule_only" | "cancel" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Original Values for comparison (in Asia/Manila PST UTC+8)
  const original = useMemo(() => {
    if (!appointment) return null;
    const startDate = new Date(appointment.start_time);
    const endDate = new Date(appointment.end_time);

    const manilaDateFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const manilaTimeFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const origDate = manilaDateFormatter.format(startDate);
    const origTime = manilaTimeFormatter.format(startDate);
    const diffMins = Math.max(15, Math.round((endDate.getTime() - startDate.getTime()) / 60000)) || 60;

    return {
      date: origDate,
      time: origTime,
      durationMinutes: diffMins,
      dentistId: appointment.dentist_id,
      notes: appointment.notes || "",
    };
  }, [appointment]);

  // Populate form on open
  useEffect(() => {
    if (appointment && original) {
      setDate(original.date);
      setTime(original.time);
      setDurationMinutes(original.durationMinutes);
      setDentistId(original.dentistId || (dentists[0]?.id || ""));
      setCallNotes("");
      setErrorMessage(null);
      setCopiedPhone(false);
    }
  }, [appointment, original, dentists]);

  if (!isOpen || !appointment) return null;

  const patient = appointment.patient;
  const currentDentist = dentists.find((d) => d.id === dentistId) || appointment.dentist;

  // Has secretary modified the original date, time, or doctor?
  const isScheduleChanged =
    original &&
    (date !== original.date ||
      time !== original.time ||
      durationMinutes !== original.durationMinutes ||
      dentistId !== original.dentistId);

  const handleCopyPhone = () => {
    if (!patient?.phone) return;
    navigator.clipboard.writeText(patient.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2500);
  };

  // Revert all form changes to initial booking state
  const handleReset = () => {
    if (!original) return;
    setDate(original.date);
    setTime(original.time);
    setDurationMinutes(original.durationMinutes);
    setDentistId(original.dentistId);
    setCallNotes("");
    setErrorMessage(null);
  };

  const handleSaveAppointment = async (newStatus: "confirmed" | "scheduled" | "cancelled") => {
    setIsSubmitting(true);
    setActionType(newStatus === "confirmed" ? "confirm" : newStatus === "cancelled" ? "cancel" : "reschedule_only");
    setErrorMessage(null);

    try {
      const startDateTime = new Date(`${date}T${time}:00+08:00`);
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

      // Build updated notes
      let finalNotes = appointment.notes || "";
      if (callNotes.trim()) {
        const timestampStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const noteEntry = `[Call Verification ${timestampStr}]: ${callNotes.trim()}`;
        finalNotes = finalNotes ? `${finalNotes}\n${noteEntry}` : noteEntry;
      }

      if (isScheduleChanged) {
        const rescheduleNote = `[Rescheduled by Secretary]: Moved from ${original?.date} ${format12Hour(original?.time || "")} to ${date} ${format12Hour(time)}.`;
        finalNotes = finalNotes ? `${finalNotes}\n${rescheduleNote}` : rescheduleNote;
      }

      // Check double booking if status != cancelled
      if (newStatus !== "cancelled") {
        const { data: conflictData, error: conflictErr } = await supabase
          .from("appointments")
          .select("id, start_time, end_time")
          .eq("dentist_id", dentistId)
          .neq("status", "cancelled")
          .neq("id", appointment.id)
          .lte("start_time", endDateTime.toISOString())
          .gte("end_time", startDateTime.toISOString());

        if (conflictErr) throw conflictErr;

        if (conflictData && conflictData.length > 0) {
          throw new Error(
            `Double-Booking Conflict: Dr. ${currentDentist?.full_name || "Doctor"} already has an appointment during this time window. Please choose another slot or practitioner.`
          );
        }
      }

      // Update appointment in database
      const { error: updateError } = await supabase
        .from("appointments")
        .update({
          dentist_id: dentistId,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: newStatus,
          notes: finalNotes,
        })
        .eq("id", appointment.id);

      if (updateError) {
        if (updateError.message?.includes("no_dentist_double_booking") || updateError.code === "23P01") {
          throw new Error("Double-Booking Conflict: This dentist already has an appointment during this time window.");
        }
        throw updateError;
      }

      const statusLabels = {
        confirmed: isScheduleChanged ? "Rescheduled and CONFIRMED successfully!" : "Appointment CONFIRMED successfully!",
        scheduled: "Schedule updated! Appointment remains pending verification.",
        cancelled: "Appointment has been CANCELLED.",
      };

      showToast(statusLabels[newStatus], newStatus === "cancelled" ? "info" : "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update appointment.");
    } finally {
      setIsSubmitting(false);
      setActionType(null);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/15 text-white">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold">
                  Patient Phone Verification & Rescheduling
                </h2>
                <p className="text-xs text-teal-100">
                  Call the patient to verify schedule accuracy, adjust date & time if requested, and confirm the booking.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {errorMessage && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5 animate-shake">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Patient Call Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                    {patient?.first_name} {patient?.last_name}
                  </span>
                  {patient?.medical_alerts && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 text-[10px] font-bold">
                      <ShieldAlert className="w-3 h-3 text-rose-600" />
                      Medical Alert
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  {patient?.phone ? (
                    <span className="font-mono font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {patient.phone}
                    </span>
                  ) : (
                    <span className="italic text-slate-400">No phone provided</span>
                  )}
                  {patient?.email && (
                    <span>• {patient.email}</span>
                  )}
                </div>

                {patient?.medical_alerts && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                    Alert Note: {patient.medical_alerts}
                  </p>
                )}
              </div>

              {/* Quick Call & Copy Actions */}
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                {patient?.phone && (
                  <a
                    href={`tel:${patient.phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs hover:shadow transition-all cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Patient</span>
                  </a>
                )}
                {patient?.phone && (
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Copy phone number"
                  >
                    {copiedPhone ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[11px] text-emerald-600 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px]">Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Original vs Modified Schedule Comparison Banner */}
            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Initial Patient Booking Request
                </span>
                {isScheduleChanged && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Reschedule Applied
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Originally requested: <strong>{original?.date}</strong> at <strong>{format12Hour(original?.time || "")}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Doctor: <strong>{appointment.dentist?.full_name || "Assigned Doctor"}</strong>
                  </span>
                </div>
              </div>

              {appointment.notes && (
                <div className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-850 p-2 rounded-lg italic">
                  "{appointment.notes}"
                </div>
              )}
            </div>

            {/* Interactive Reschedule Editor */}
            <div className="p-4 rounded-2xl border border-teal-200/80 dark:border-teal-900/60 bg-teal-50/30 dark:bg-teal-950/15 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-200">
                    Reschedule Appointment Date & Time
                  </span>
                </div>
                {isScheduleChanged && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to Initial</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirmed Date *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Time Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirmed Time Slot *
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {format12Hour(t)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Attending Dentist */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Attending Dentist
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={dentistId}
                      onChange={(e) => setDentistId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                      {dentists.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Session Duration */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Session Duration
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes (Standard)</option>
                    <option value={90}>90 Minutes (Long Procedure)</option>
                    <option value={120}>120 Minutes (Surgery / Multi-Unit)</option>
                  </select>
                </div>
              </div>

              {/* Call Notes Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Secretary Phone Call Notes (Logged to Audit History)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Patient called; agreed to change time to 2:00 PM due to work conflict. Pre-screened with no contraindications."
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="bg-slate-50 dark:bg-slate-800/50 px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left helper: Cancel Booking Option */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                const confirmed = window.confirm(
                  `Cancel this appointment for ${patient?.first_name} ${patient?.last_name}?`
                );
                if (confirmed) handleSaveAppointment("cancelled");
              }}
              className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <CalendarX className="w-3.5 h-3.5" />
              <span>Cancel Booking</span>
            </button>

            {/* Right: Reschedule Only vs Confirm */}
            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
              {isScheduleChanged && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSaveAppointment("scheduled")}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  {isSubmitting && actionType === "reschedule_only" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Save Reschedule as Pending"
                  )}
                </button>
              )}

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveAppointment("confirmed")}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
              >
                {isSubmitting && actionType === "confirm" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Schedule...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isScheduleChanged
                        ? "Save Reschedule & Confirm Call"
                        : "Confirm Call & Verify Booking"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
