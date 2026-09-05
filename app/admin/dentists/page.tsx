"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useClinic } from "@/context/clinic-context";
import { DentistModal, DentistProfileData } from "@/components/admin/dentist-modal";
import {
  Users,
  Building2,
  Sparkles,
  Plus,
  Search,
  Award,
  GraduationCap,
  Calendar,
  Building,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Shield,
  Loader2,
  Clock,
  UserCheck,
  Power,
  Image as ImageIcon,
  Check,
} from "lucide-react";

export default function AdminDentistsPage() {
  const { showToast } = useClinic();

  const [dentists, setDentists] = useState<DentistProfileData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDentist, setSelectedDentist] = useState<DentistProfileData | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchDentists = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/dentists");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load dentists.");
      setDentists(data.dentists || []);
    } catch (err: any) {
      showToast(err.message || "Could not load dentists.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDentists();
  }, []);

  const handleToggleStatus = async (dentist: DentistProfileData) => {
    if (!dentist.id) return;
    setActionLoadingId(dentist.id);
    try {
      const newStatus = !dentist.is_active;
      const res = await fetch("/api/admin/dentists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: dentist.id,
          is_active: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update doctor status.");

      showToast(
        `Dr. ${dentist.name} is now ${newStatus ? "ACTIVE" : "INACTIVE"}.`,
        "info"
      );
      await fetchDentists();
    } catch (err: any) {
      showToast(err.message || "Failed to toggle status.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (dentist: DentistProfileData) => {
    if (!dentist.id) return;
    const confirmed = window.confirm(
      `Are you sure you want to remove the doctor profile for "${dentist.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setActionLoadingId(dentist.id);
    try {
      const res = await fetch(`/api/admin/dentists?id=${dentist.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete doctor profile.");

      showToast(`Doctor profile removed.`, "info");
      await fetchDentists();
    } catch (err: any) {
      showToast(err.message || "Failed to remove doctor.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter
  const filteredDentists = dentists.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.prc_license && d.prc_license.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? d.is_active
        : !d.is_active;

    return matchesSearch && matchesStatus;
  });

  // Stats
  const totalDoctors = dentists.length;
  const activeDoctors = dentists.filter((d) => d.is_active).length;
  const totalExperienceYears = dentists.reduce(
    (acc, d) => acc + (d.experience_years || d.experienceYears || 0),
    0
  );
  const branchesCovered = new Set(
    dentists.flatMap((d) => (d.clinic_days || d.cdoClinicDays || []).map((s) => s.branchName))
  ).size;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Admin Navigation Tabs ── */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl w-fit border border-slate-200/80 dark:border-slate-800">
        <Link
          href="/admin/users"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <span>Staff Directory & Access</span>
        </Link>
        <Link
          href="/admin/branches"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Clinic Branches & Locations</span>
        </Link>
        <Link
          href="/admin/hours"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Dental Hours & Open Days</span>
        </Link>
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
          <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Dentist Directory & Content</span>
        </div>
      </div>

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800">
              <Shield className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              Clinic Administration
            </span>
            <span className="text-xs text-slate-300 dark:text-slate-600">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Doctor Profiles & Public Content
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            Dentist Directory & Content Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Update doctor credentials, clinical scope, portrait photos, biographies, and branch operating days displayed on the public /dentists page.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <Link
            href="/dentists"
            target="_blank"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            View Public Page
          </Link>
          <button
            onClick={() => {
              setSelectedDentist(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Doctor Profile</span>
          </button>
        </div>
      </div>

      {/* ── Stat Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Doctors */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Specialists
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {totalDoctors}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Doctors</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">In roster & directory</p>
        </div>

        {/* Card 2: Active Doctors */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Active Attending
            </span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {activeDoctors}
            </span>
            <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">Publicly Visible</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Accepting online bookings</p>
        </div>

        {/* Card 3: Experience */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Combined Experience
            </span>
            <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {totalExperienceYears}
            </span>
            <span className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">Years</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Clinical excellence in CDO</p>
        </div>

        {/* Card 4: Branches Covered */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Branches Covered
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {branchesCovered}
            </span>
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Facilities</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">With active attending rotations</p>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by doctor name, specialty, title, or PRC license..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl shrink-0">
          {(["all", "active", "inactive"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                statusFilter === filter
                  ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* ── Doctors Grid ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-xs font-medium">Loading dentist directory...</p>
        </div>
      ) : filteredDentists.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Users className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            No doctors found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm
              ? `No doctor profiles match "${searchTerm}".`
              : "No doctor profiles registered yet."}
          </p>
          <button
            onClick={() => {
              setSelectedDentist(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Doctor Profile</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredDentists.map((doctor) => {
            const photo =
              doctor.photo_url || doctor.photoUrl || "/images/dentist-dr-kenneth.jpg";
            const prc = doctor.prc_license || doctor.prcLicense || "PRC Registered";
            const expYears =
              doctor.experience_years !== undefined
                ? doctor.experience_years
                : doctor.experienceYears !== undefined
                ? doctor.experienceYears
                : 5;
            const certs = doctor.certifications || [];
            const schedules = doctor.clinic_days || doctor.cdoClinicDays || [];

            return (
              <div
                key={doctor.id || doctor.name}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 group"
              >
                <div>
                  {/* Top Row: Photo, Name, PRC, and Status badge */}
                  <div className="flex items-start gap-4">
                    <div className="relative w-20 h-24 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800">
                      <img
                        src={photo}
                        alt={doctor.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/images/dentist-dr-kenneth.jpg";
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            doctor.is_active
                              ? "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {doctor.is_active ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-teal-600" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" />
                              <span>Inactive</span>
                            </>
                          )}
                        </span>

                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          PRC: {prc}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-snug truncate">
                        {doctor.name}
                      </h3>
                      <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 line-clamp-1">
                        {doctor.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                        <Award className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{expYears} Years Clinical Experience</span>
                      </p>
                    </div>
                  </div>

                  {/* Specialty */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Specialization
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
                      {doctor.specialty}
                    </p>
                  </div>

                  {/* Clinic Schedules */}
                  {schedules.length > 0 && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Clinic Availability
                      </span>
                      <div className="space-y-1 text-[11px]">
                        {schedules.map((s, sIdx) => (
                          <div
                            key={sIdx}
                            className="flex items-center justify-between text-slate-600 dark:text-slate-300"
                          >
                            <span className="font-semibold">{s.branchName}</span>
                            <span className="text-slate-400">
                              {s.days} • {s.hours}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleStatus(doctor)}
                    disabled={actionLoadingId === doctor.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      doctor.is_active
                        ? "text-slate-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        : "text-teal-700 bg-teal-50 dark:bg-teal-950 dark:text-teal-300 hover:bg-teal-100"
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{doctor.is_active ? "Deactivate" : "Activate"}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedDentist(doctor);
                        setIsModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 border border-teal-200 dark:border-teal-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Profile</span>
                    </button>

                    <button
                      onClick={() => handleDelete(doctor)}
                      disabled={actionLoadingId === doctor.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Remove Doctor Profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Dentist Modal */}
      <DentistModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchDentists}
        dentistToEdit={selectedDentist}
      />
    </div>
  );
}
