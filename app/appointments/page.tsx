"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/clinic-context";
import { Appointment } from "@/types/dental";
import { AppointmentModal } from "@/components/appointments/appointment-modal";
import { ConfirmRescheduleModal } from "@/components/secretary/confirm-reschedule-modal";
import { Pagination } from "@/components/ui/pagination";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  ShieldAlert,
  ChevronRight,
  Filter,
} from "lucide-react";

export default function AppointmentsPage() {
  const { staffList, activeBranch, branches, showToast, refreshTrigger, triggerRefresh } = useClinic();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedDentist, setSelectedDentist] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isConfirmRescheduleOpen, setIsConfirmRescheduleOpen] = useState(false);
  const [selectedApptForConfirm, setSelectedApptForConfirm] = useState<any | null>(null);

  const handleOpenConfirmReschedule = (appt: any) => {
    setSelectedApptForConfirm(appt);
    setIsConfirmRescheduleOpen(true);
  };

  const supabase = createClient();
  const dentists = staffList.filter((s) => s.role === "dentist" || s.role === "admin");

  useEffect(() => {
    async function loadAppointments() {
      setIsLoading(true);
      try {
        let q = supabase
          .from("appointments")
          .select(`
            *,
            patient:patients(*),
            dentist:profiles(*)
          `)
          .order("start_time", { ascending: true });

        if (activeBranch?.id) {
          q = q.eq("branch_id", activeBranch.id);
        }

        const { data, error } = await q;

        if (data) setAppointments(data);
      } catch (err) {
        console.error("Error loading appointments:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAppointments();
  }, [refreshTrigger, activeBranch]);

  const handleUpdateStatus = async (apptId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", apptId);

      if (error) throw error;
      showToast(`Appointment status updated to ${newStatus.toUpperCase()}`, "success");
      triggerRefresh();
    } catch (err: any) {
      showToast(err?.message || "Failed to update appointment", "error");
    }
  };

  const filtered = appointments.filter((a) => {
    if (activeBranch?.id && a.branch_id && a.branch_id !== activeBranch.id) return false;
    if (selectedDentist !== "all" && a.dentist_id !== selectedDentist) return false;
    if (selectedStatus !== "all" && a.status !== selectedStatus) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedAppointments = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200",
    confirmed: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-200",
    arrived: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200",
    in_treatment: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 animate-pulse",
    completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-200",
    cancelled: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-300",
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <CalendarIcon className="w-6 h-6 text-teal-600" />
            Clinic Appointment Scheduler
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated conflict-free scheduling with instant double-booking prevention.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Book Appointment</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Statuses ({appointments.length})</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="arrived">Arrived (Waiting)</option>
              <option value="in_treatment">In Treatment</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Dentist filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Dentist:</span>
            <select
              value={selectedDentist}
              onChange={(e) => {
                setSelectedDentist(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Attending Doctors</option>
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-slate-400 font-mono text-[11px]">
          Showing {filtered.length} appointment slots
        </span>
      </div>

      {/* Appointment Cards Grid / Timeline */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-xs">Loading appointments schedule...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
            No appointments found for the selected filters.
          </div>
        ) : (
          paginatedAppointments.map((appt) => {
            const startDate = new Date(appt.start_time);
            const endDate = new Date(appt.end_time);

            return (
              <div
                key={appt.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Time & Patient details */}
                <div className="flex items-start gap-4">
                  {/* Time Badge */}
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 text-center min-w-[90px]">
                    <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400">
                      {startDate.toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                    <span className="text-sm font-extrabold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                      {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      to {endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  {/* Patient Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <Link
                        href={`/patients/${appt.patient?.id}`}
                        className="font-bold text-base text-slate-900 dark:text-slate-100 hover:text-teal-600 transition-colors flex items-center gap-1.5"
                      >
                        {appt.patient?.first_name} {appt.patient?.last_name}
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </Link>
                      <span
                        className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${
                          statusColors[appt.status] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {appt.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        Doctor: <strong className="text-slate-700 dark:text-slate-300">{appt.dentist?.full_name}</strong>
                      </span>
                      {appt.patient?.phone && (
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {appt.patient.phone}
                        </span>
                      )}
                    </div>

                    {appt.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1.5 rounded-lg max-w-xl">
                        "{appt.notes}"
                      </p>
                    )}

                    {appt.patient?.medical_alerts && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 text-[10px] font-bold">
                        <ShieldAlert className="w-3 h-3 text-rose-600" />
                        <span>Medical Alert: {appt.patient.medical_alerts}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Quick Status Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
                  {appt.status === "scheduled" && (
                    <button
                      onClick={() => handleOpenConfirmReschedule(appt)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call & Confirm</span>
                    </button>
                  )}
                  {(appt.status === "scheduled" || appt.status === "confirmed") && (
                    <button
                      onClick={() => handleOpenConfirmReschedule(appt)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      Reschedule
                    </button>
                  )}
                  {appt.status === "confirmed" && (
                    <button
                      onClick={() => handleUpdateStatus(appt.id, "arrived")}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors cursor-pointer"
                    >
                      Patient Arrived
                    </button>
                  )}
                  {appt.status === "arrived" && (
                    <button
                      onClick={() => handleUpdateStatus(appt.id, "in_treatment")}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-100 hover:bg-purple-200 text-purple-900 transition-colors"
                    >
                      In Operatory
                    </button>
                  )}
                  {appt.status === "in_treatment" && (
                    <button
                      onClick={() => handleUpdateStatus(appt.id, "completed")}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 transition-colors"
                    >
                      Treatment Done
                    </button>
                  )}
                  {appt.status !== "completed" && appt.status !== "cancelled" && (
                    <button
                      onClick={() => handleUpdateStatus(appt.id, "cancelled")}
                      className="px-2.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <Link
                    href={`/patients/${appt.patient?.id}`}
                    className="p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Open Dental Odontogram"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            );
          })
        )}

        {/* Pagination Bar */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50]}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemName="appointments"
        />
      </div>

      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={triggerRefresh}
      />
      <ConfirmRescheduleModal
        isOpen={isConfirmRescheduleOpen}
        onClose={() => {
          setIsConfirmRescheduleOpen(false);
          setSelectedApptForConfirm(null);
        }}
        onSuccess={triggerRefresh}
        appointment={selectedApptForConfirm}
        dentists={dentists}
        branches={branches}
      />
    </div>
  );
}
