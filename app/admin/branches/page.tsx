"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useClinic } from "@/context/clinic-context";
import { BranchWithStats } from "@/lib/db/admin";
import { BranchModal } from "@/components/admin/branch-modal";
import {
  Building2,
  Plus,
  Search,
  Users,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Power,
  CheckCircle2,
  XCircle,
  Shield,
  Loader2,
  AlertTriangle,
  Clock,
  Sparkles,
} from "lucide-react";

export default function AdminBranchesPage() {
  const { showToast, refreshBranches } = useClinic();

  const [branches, setBranches] = useState<BranchWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchWithStats | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Fetch branches from API
  const fetchBranches = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/branches");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load clinic branches.");
      setBranches(data.branches || []);
    } catch (err: any) {
      showToast(err.message || "Could not load clinic branches.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  // Quick toggle active / inactive
  const handleToggleStatus = async (branch: BranchWithStats) => {
    setActionLoadingId(branch.id);
    try {
      const newStatus = !branch.is_active;
      const res = await fetch("/api/admin/branches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: branch.id,
          is_active: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update branch status.");

      showToast(
        `Branch "${branch.name}" is now ${newStatus ? "ACTIVE" : "INACTIVE"}.`,
        "info"
      );
      await refreshBranches();
      await fetchBranches();
    } catch (err: any) {
      showToast(err.message || "Failed to toggle branch status.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete or archive branch
  const handleDelete = async (branch: BranchWithStats) => {
    const hasAppointments = branch.appointment_count > 0;
    const confirmMessage = hasAppointments
      ? `"${branch.name}" has ${branch.appointment_count} scheduled/completed appointment(s).\n\nTo preserve medical records and historical audit logs, this branch will be DEACTIVATED and hidden from public booking. Continue?`
      : `Are you sure you want to permanently delete "${branch.name}"? This action cannot be undone.`;

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    setActionLoadingId(branch.id);
    try {
      const res = await fetch(`/api/admin/branches?id=${branch.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove branch.");

      showToast(data.message || `Branch "${branch.name}" updated.`, "info");
      await refreshBranches();
      await fetchBranches();
    } catch (err: any) {
      showToast(err.message || "Failed to remove branch.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter branches
  const filteredBranches = branches.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.address && b.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.phone && b.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.email && b.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? b.is_active
        : !b.is_active;

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const totalBranches = branches.length;
  const activeCount = branches.filter((b) => b.is_active).length;
  const totalStaffCount = branches.reduce((acc, b) => acc + (b.staff_count || 0), 0);
  const totalAppointmentsCount = branches.reduce(
    (acc, b) => acc + (b.appointment_count || 0),
    0
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Admin Navigation Suite Tabs ── */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl w-fit border border-slate-200/80 dark:border-slate-800">
        <Link
          href="/admin/users"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <span>Staff Directory & Access</span>
        </Link>
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
          <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Clinic Branches & Locations</span>
        </div>
        <Link
          href="/admin/hours"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Dental Hours & Open Days</span>
        </Link>
        <Link
          href="/admin/dentists"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-slate-500" />
          <span>Dentist Directory & Content</span>
        </Link>
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
              Branch & Facility Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            Clinic Branches & Facilities
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Register new clinic branches, update facilities contact information, and manage operating statuses.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedBranch(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Clinic Branch</span>
        </button>
      </div>

      {/* ── Stat Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Branches */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Locations
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {totalBranches}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Branches</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Registered clinic facilities</p>
        </div>

        {/* Card 2: Active Operating Branches */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Active Branches
            </span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {activeCount}
            </span>
            <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">Operating</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Open for booking & scheduling</p>
        </div>

        {/* Card 3: Assigned Staff */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Assigned Staff
            </span>
            <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {totalStaffCount}
            </span>
            <span className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">Team Members</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Dentists & front-desk staff</p>
        </div>

        {/* Card 4: Appointments Scheduled */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Appointments
            </span>
            <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {totalAppointmentsCount}
            </span>
            <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">Patient Visits</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Historical & active bookings</p>
        </div>
      </div>

      {/* ── Toolbar: Search & Status Filter ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search branch name, address, phone or email..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
          />
        </div>

        {/* Status selector */}
        <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "all"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            All ({branches.length})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "active"
                ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter("inactive")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "inactive"
                ? "bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Inactive ({branches.length - activeCount})
          </button>
        </div>
      </div>

      {/* ── Branch Directory List ── */}
      {isLoading ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-3">Loading clinic branches...</p>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-3">
            No Clinic Branches Found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchTerm || statusFilter !== "all"
              ? "No branches match your current filter criteria."
              : "No clinic branches registered yet. Click 'Add Clinic Branch' to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBranches.map((branch) => {
            const isLoadingThis = actionLoadingId === branch.id;

            return (
              <div
                key={branch.id}
                className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-200 flex flex-col justify-between ${
                  branch.is_active
                    ? "border-slate-200/80 dark:border-slate-800 hover:shadow-md hover:border-teal-200 dark:hover:border-teal-900"
                    : "border-slate-200/50 dark:border-slate-800/50 opacity-75 bg-slate-50/50 dark:bg-slate-950/30"
                }`}
              >
                <div>
                  {/* Top line: Name & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          branch.is_active
                            ? "bg-teal-50 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base line-clamp-1">
                          {branch.name}
                        </h3>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          ID: {branch.id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        branch.is_active
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                          : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                      }`}
                    >
                      {branch.is_active ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>Paused / Archived</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Branch Details */}
                  <div className="mt-4 space-y-2 text-xs">
                    {/* Address */}
                    <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        {branch.address || "No address specified."}
                      </span>
                    </div>

                    {/* Phone & Email Row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 dark:text-slate-400">
                      {branch.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{branch.phone}</span>
                        </span>
                      )}
                      {branch.email && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{branch.email}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dependency Stats Pills */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-50/80 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/60">
                      <Users className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                      <span>{branch.staff_count} Staff</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-violet-50/80 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/60">
                      <Calendar className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                      <span>{branch.appointment_count} Bookings</span>
                    </span>
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleStatus(branch)}
                    disabled={isLoadingThis}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      branch.is_active
                        ? "text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                        : "text-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/80 dark:text-teal-300"
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{branch.is_active ? "Deactivate" : "Activate"}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedBranch(branch);
                        setIsModalOpen(true);
                      }}
                      disabled={isLoadingThis}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(branch)}
                      disabled={isLoadingThis}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-400 dark:hover:bg-rose-950 transition-colors cursor-pointer"
                    >
                      {isLoadingThis ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Branch Modal (Add / Edit) ── */}
      {isModalOpen && (
        <BranchModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedBranch(null);
          }}
          onSuccess={fetchBranches}
          branchToEdit={selectedBranch}
        />
      )}
    </div>
  );
}
