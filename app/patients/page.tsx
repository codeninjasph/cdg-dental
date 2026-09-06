"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/clinic-context";
import { Patient } from "@/types/dental";
import { PatientRegistrationModal } from "@/components/patients/patient-registration-modal";
import { MergePatientModal } from "@/components/patients/merge-patient-modal";
import { ImportPatientsModal } from "@/components/patients/import-patients-modal";
import { BatchTranscriberModal } from "@/components/patients/batch-transcriber-modal";
import { EditPatientModal } from "@/components/patients/edit-patient-modal";
import { Pagination } from "@/components/ui/pagination";
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Mail,
  Calendar,
  ShieldAlert,
  ChevronRight,
  Filter,
  Merge,
  FileSpreadsheet,
  NotebookPen,
  Pencil,
} from "lucide-react";

export default function PatientsDirectoryPage() {
  const { refreshTrigger, triggerRefresh } = useClinic();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAlertsOnly, setFilterAlertsOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isTranscriberOpen, setIsTranscriberOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPatientForEdit, setSelectedPatientForEdit] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function loadPatients() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("*")
          .order("last_name", { ascending: true });

        if (data) setPatients(data);
      } catch (err) {
        console.error("Error loading patients:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPatients();
  }, [refreshTrigger]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredPatients = patients.filter((p) => {
    const query = searchTerm.toLowerCase();
    const matchesQuery =
      p.first_name.toLowerCase().includes(query) ||
      p.last_name.toLowerCase().includes(query) ||
      (p.phone && p.phone.toLowerCase().includes(query)) ||
      (p.medical_alerts && p.medical_alerts.toLowerCase().includes(query));

    if (filterAlertsOnly) {
      return matchesQuery && Boolean(p.medical_alerts && p.medical_alerts.trim());
    }
    return matchesQuery;
  });

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
  const paginatedPatients = filteredPatients.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-teal-600" />
            Patient Records & Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Electronic dental records, 32-tooth odontograms, medical histories, and clinical treatments.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200/80 dark:border-slate-700 shadow-sm hover:shadow transition-all cursor-pointer"
            title="Upload CSV or Excel roster"
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setIsTranscriberOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-bold text-xs border border-teal-200 dark:border-teal-800/80 shadow-sm hover:shadow transition-all cursor-pointer"
            title="High-speed continuous keyboard transcription for paper logbooks"
          >
            <NotebookPen className="w-4 h-4" />
            <span>Logbook Transcriber</span>
          </button>
          <button
            onClick={() => setIsMergeOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-violet-100 hover:bg-violet-200 dark:bg-violet-950 dark:hover:bg-violet-900 text-violet-700 dark:text-violet-300 font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Merge className="w-4 h-4" />
            <span>Merge Duplicate</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register New Patient</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, phone, medical alert..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setFilterAlertsOnly(!filterAlertsOnly);
              setPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              filterAlertsOnly
                ? "bg-rose-50 dark:bg-rose-950/60 border-rose-400 text-rose-700 dark:text-rose-300"
                : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span>With Medical Alerts Only</span>
          </button>
        </div>
      </div>

      {/* Patients Table & Mobile Card Views */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* ── MOBILE CARD LIST VIEW (Phones & Compact Screens) ── */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Loading patient records...
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No matching patient records found.
            </div>
          ) : (
            paginatedPatients.map((p) => {
              const age = p.dob
                ? Math.floor(
                    (new Date().getTime() - new Date(p.dob).getTime()) /
                      (365.25 * 24 * 60 * 60 * 1000)
                  )
                : null;

              return (
                <div key={p.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/patients/${p.id}`}
                        className="font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600 text-base"
                      >
                        {p.last_name}, {p.first_name}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span className="font-mono">#{p.id.slice(0, 8)}</span>
                        {age !== null && <span>• {age} yrs</span>}
                        {p.gender && <span>• {p.gender}</span>}
                      </div>
                    </div>

                    {p.medical_alerts && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 text-[10px] font-bold shrink-0">
                        <ShieldAlert className="w-3 h-3 text-rose-600" />
                        <span>Alert</span>
                      </span>
                    )}
                  </div>

                  {p.medical_alerts && (
                    <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-start gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span>{p.medical_alerts}</span>
                    </div>
                  )}

                  {/* Contact info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {p.phone && (
                      <a
                        href={`tel:${p.phone}`}
                        className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-teal-600 font-mono py-1"
                      >
                        <Phone className="w-3.5 h-3.5 text-teal-600" />
                        <span>{p.phone}</span>
                      </a>
                    )}
                    {p.email && (
                      <span className="inline-flex items-center gap-1.5 text-slate-500 truncate py-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{p.email}</span>
                      </span>
                    )}
                  </div>

                  {/* Direct Action Button */}
                  <Link
                    href={`/patients/${p.id}`}
                    className="w-full py-2.5 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/80 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-98"
                  >
                    <span>Open 32-Tooth Chart & History</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })
          )}
        </div>

        {/* ── DESKTOP & TABLET TABULAR VIEW ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4">Patient Name</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Demographics</th>
                <th className="py-3.5 px-4">Medical Contraindications</th>
                <th className="py-3.5 px-4">Emergency Contact</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading patient records...
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No matching patient records found.
                  </td>
                </tr>
              ) : (
                paginatedPatients.map((p) => {
                  const age = p.dob
                    ? Math.floor(
                        (new Date().getTime() - new Date(p.dob).getTime()) /
                          (365.25 * 24 * 60 * 60 * 1000)
                      )
                    : null;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/patients/${p.id}`}
                          className="font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 flex items-center gap-1.5"
                        >
                          {p.last_name}, {p.first_name}
                        </Link>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          ID: #{p.id.slice(0, 8)}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 space-y-0.5">
                        {p.phone && (
                          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {p.phone}
                          </span>
                        )}
                        {p.email && (
                          <span className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {p.email}
                          </span>
                        )}
                      </td>

                      {/* Demographics */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        <span>{p.gender || "—"}</span>
                        {age !== null && (
                          <span className="text-slate-400 ml-1.5">({age} yrs)</span>
                        )}
                        {p.address && (
                          <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                            {p.address}
                          </span>
                        )}
                      </td>

                      {/* Medical Alerts */}
                      <td className="py-3.5 px-4">
                        {p.medical_alerts ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 text-[11px] font-bold border border-rose-200 dark:border-rose-900">
                            <ShieldAlert className="w-3 h-3 text-rose-600" />
                            {p.medical_alerts}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">None recorded</span>
                        )}
                      </td>

                      {/* Emergency Contact */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {p.emergency_contact_name ? (
                          <div>
                            <span className="font-semibold block">{p.emergency_contact_name}</span>
                            <span className="text-[10px] font-mono">{p.emergency_contact_phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedPatientForEdit(p);
                              setIsEditOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer text-xs"
                            title="Edit patient personal info & contacts"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <Link
                            href={`/patients/${p.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950 dark:hover:bg-teal-900 dark:text-teal-300 font-semibold transition-colors"
                          >
                            <span>Chart & Records</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filteredPatients.length}
          pageSize={pageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemName="patients"
        />
      </div>

      <PatientRegistrationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={triggerRefresh}
      />
      <MergePatientModal
        isOpen={isMergeOpen}
        onClose={() => setIsMergeOpen(false)}
        onSuccess={() => {
          triggerRefresh();
          setIsMergeOpen(false);
        }}
      />
      <ImportPatientsModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => {
          triggerRefresh();
          setIsImportOpen(false);
        }}
      />
      <BatchTranscriberModal
        isOpen={isTranscriberOpen}
        onClose={() => setIsTranscriberOpen(false)}
        onSuccess={() => {
          triggerRefresh();
          setIsTranscriberOpen(false);
        }}
      />
      <EditPatientModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedPatientForEdit(null);
        }}
        patient={selectedPatientForEdit}
        onSuccess={() => {
          triggerRefresh();
        }}
      />
    </div>
  );
}
