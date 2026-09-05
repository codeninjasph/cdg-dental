"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useClinic } from "@/context/clinic-context";
import { StaffUserRecord, MASTER_ADMIN_ID, MASTER_ADMIN_EMAIL } from "@/types/admin";
import { InviteStaffModal } from "@/components/admin/invite-staff-modal";
import { EditStaffBranchModal } from "@/components/admin/edit-staff-branch-modal";
import {
  Users,
  UserPlus,
  Stethoscope,
  UserCheck,
  Shield,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  RotateCcw,
  Trash2,
  Copy,
  Check,
  Building2,
  Loader2,
  AlertTriangle,
  Sparkles,
  Pencil,
} from "lucide-react";

export default function AdminUsersPage() {
  const { currentRole, showToast } = useClinic();

  const [staffList, setStaffList] = useState<StaffUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingStaffUser, setEditingStaffUser] = useState<StaffUserRecord | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // Fetch staff directory from API
  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load staff list.");
      setStaffList(data.users || []);
    } catch (err: any) {
      showToast(err.message || "Could not load staff users.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Revoke staff access
  const handleRevoke = async (user: StaffUserRecord) => {
    if (user.id === MASTER_ADMIN_ID || user.email === MASTER_ADMIN_EMAIL) {
      showToast("Cannot revoke master administrator account.", "error");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to revoke access for ${user.full_name}? They will be immediately signed out and banned from accessing the clinic system.`
    );
    if (!confirmed) return;

    setActionLoadingId(user.id);
    try {
      const res = await fetch("/api/admin/users/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke access.");

      showToast(`Access revoked for ${user.full_name}.`, "info");
      await fetchStaff();
    } catch (err: any) {
      showToast(err.message || "Failed to revoke access.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Restore staff access
  const handleRestore = async (user: StaffUserRecord) => {
    setActionLoadingId(user.id);
    try {
      const res = await fetch("/api/admin/users/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restore access.");

      showToast(`Access restored for ${user.full_name}.`, "success");
      await fetchStaff();
    } catch (err: any) {
      showToast(err.message || "Failed to restore access.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete staff user
  const handleDelete = async (user: StaffUserRecord) => {
    if (user.id === MASTER_ADMIN_ID || user.email === MASTER_ADMIN_EMAIL) {
      showToast("Cannot delete master administrator account.", "error");
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete account for ${user.full_name}? This action cannot be undone.`
    );
    if (!confirmed) return;

    setActionLoadingId(user.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user.");

      showToast(`User ${user.full_name} deleted.`, "info");
      await fetchStaff();
    } catch (err: any) {
      showToast(err.message || "Failed to delete user.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Copy pending invite link
  const handleCopyInvite = (user: StaffUserRecord) => {
    if (!user.invite_token || !user.email) return;
    const origin = window.location.origin;
    const url = `${origin}/auth/sign-up?token=${user.invite_token}&type=invite&email=${encodeURIComponent(
      user.email
    )}`;
    navigator.clipboard.writeText(url);
    setCopiedTokenId(user.id);
    showToast(`Copied invitation link for ${user.full_name}!`, "info");
    setTimeout(() => setCopiedTokenId(null), 2500);
  };

  // Filter staff list
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === "all" || s.role === roleFilter;
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate stats
  const totalCount = staffList.length;
  const dentistCount = staffList.filter((s) => s.role === "dentist").length;
  const secretaryCount = staffList.filter((s) => s.role === "secretary").length;
  const revokedCount = staffList.filter((s) => s.status === "revoked").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Admin Navigation Suite Tabs ── */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl w-fit border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
          <Users className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Staff Directory & Access</span>
        </div>
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
              Role Provisioning & Access Control
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            Staff Directory & User Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage practitioner credentials, role permissions, branch assignments, and invitations.
          </p>
        </div>

        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite New Staff</span>
        </button>
      </div>

      {/* ── Stat Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Staff */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Staff
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {totalCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Team Members</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Practitioners & front-desk</p>
        </div>

        {/* Card 2: Doctors / Dentists */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Doctors / Dentists
            </span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
              <Stethoscope className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {dentistCount}
            </span>
            <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">Clinicians</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Clinical charting & treatment</p>
        </div>

        {/* Card 3: Secretaries */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Secretaries
            </span>
            <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {secretaryCount}
            </span>
            <span className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">Front Desk</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Queue & cashier desk</p>
        </div>

        {/* Card 4: Access Revoked */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Access Revoked
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
              {revokedCount}
            </span>
            <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">Banned</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Restricted from system</p>
        </div>
      </div>

      {/* ── Search and Filter Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Roles ({totalCount})</option>
              <option value="dentist">Dentists ({dentistCount})</option>
              <option value="secretary">Secretaries ({secretaryCount})</option>
              <option value="admin">Admins</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending_invite">Pending Invite</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Staff Directory Table ── */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4 sm:px-6">Staff Practitioner</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Assigned Branch</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    <span>Loading staff directory...</span>
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                    <span>No staff members match the selected filters.</span>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((user) => {
                  const isMasterAdmin =
                    user.id === MASTER_ADMIN_ID || user.email === MASTER_ADMIN_EMAIL;
                  const isActionLoading = actionLoadingId === user.id;

                  // Role badge config
                  const roleBadges = {
                    dentist: {
                      label: "Dentist",
                      color: "text-emerald-700 dark:text-emerald-300",
                      bg: "bg-emerald-50 border-emerald-200/80 dark:bg-emerald-950/60 dark:border-emerald-800/60",
                      avatarBg: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300",
                      icon: Stethoscope,
                    },
                    secretary: {
                      label: "Secretary",
                      color: "text-cyan-700 dark:text-cyan-300",
                      bg: "bg-cyan-50 border-cyan-200/80 dark:bg-cyan-950/60 dark:border-cyan-800/60",
                      avatarBg: "bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-950 dark:border-cyan-800 dark:text-cyan-300",
                      icon: UserCheck,
                    },
                    admin: {
                      label: "Admin",
                      color: "text-violet-700 dark:text-violet-300",
                      bg: "bg-violet-50 border-violet-200/80 dark:bg-violet-950/60 dark:border-violet-800/60",
                      avatarBg: "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950 dark:border-violet-800 dark:text-violet-300",
                      icon: Shield,
                    },
                  };
                  const rBadge = roleBadges[user.role] || roleBadges.dentist;
                  const RoleIcon = rBadge.icon;

                  // Status badge config
                  const statusBadges = {
                    active: {
                      label: "Active",
                      classes: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
                      dot: "bg-emerald-500",
                    },
                    revoked: {
                      label: "Access Revoked",
                      classes: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
                      dot: "bg-rose-500",
                    },
                    pending_invite: {
                      label: "Pending Invite",
                      classes: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
                      dot: "bg-amber-500 animate-pulse",
                    },
                  };
                  const sBadge = statusBadges[user.status];

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Name & Email */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 ${rBadge.avatarBg}`}
                          >
                            {user.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <span>{user.full_name}</span>
                              {isMasterAdmin && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 font-extrabold border border-violet-200 dark:border-violet-800">
                                  MASTER
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {user.email || "No email linked"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${rBadge.bg} ${rBadge.color}`}
                        >
                          <RoleIcon className="w-3.5 h-3.5" />
                          <span>{rBadge.label}</span>
                        </span>
                      </td>

                      {/* Branch */}
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                        {isMasterAdmin ? (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{user.branch_name || "All Branches"}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingStaffUser(user)}
                            title="Click to edit branch assignment"
                            className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/70 hover:bg-teal-50/80 dark:bg-slate-950/40 dark:hover:bg-teal-950/40 hover:border-teal-300 dark:hover:border-teal-800 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 transition-all cursor-pointer text-left"
                          >
                            <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 shrink-0" />
                            <span className="font-medium text-xs truncate max-w-[140px] sm:max-w-[180px]">
                              {user.branch_name || "All Branches"}
                            </span>
                            <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-teal-600 dark:text-teal-400 ml-0.5 shrink-0 transition-opacity" />
                          </button>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${sBadge.classes}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${sBadge.dot}`} />
                          <span>{sBadge.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isActionLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                          ) : isMasterAdmin ? (
                            <span className="text-[11px] text-slate-400 italic pr-2">
                              Protected Root
                            </span>
                          ) : (
                            <>
                              {/* Copy Invite Link if Pending */}
                              {user.status === "pending_invite" && user.invite_token && (
                                <button
                                  onClick={() => handleCopyInvite(user)}
                                  title="Copy activation invite link"
                                  className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 transition-colors cursor-pointer"
                                >
                                  {copiedTokenId === user.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}

                              {/* Edit Branch Assignment button */}
                              <button
                                onClick={() => setEditingStaffUser(user)}
                                title="Edit branch assignment"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800 text-xs font-semibold transition-colors cursor-pointer"
                              >
                                <Building2 className="w-3 h-3" />
                                <span>Branch</span>
                              </button>

                              {/* Revoke or Restore button */}
                              {user.status === "revoked" ? (
                                <button
                                  onClick={() => handleRestore(user)}
                                  title="Restore staff access"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs font-semibold transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Restore</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRevoke(user)}
                                  title="Revoke access immediately"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50 text-xs font-semibold transition-colors cursor-pointer"
                                >
                                  <Ban className="w-3 h-3" />
                                  <span>Revoke</span>
                                </button>
                              )}

                              {/* Delete button */}
                              <button
                                onClick={() => handleDelete(user)}
                                title="Delete user"
                                className="p-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-rose-950 dark:hover:text-rose-300 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Invite Staff Modal ── */}
      <InviteStaffModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={fetchStaff}
      />

      {/* ── Edit Staff Branch Assignment Modal ── */}
      <EditStaffBranchModal
        isOpen={Boolean(editingStaffUser)}
        onClose={() => setEditingStaffUser(null)}
        staffUser={editingStaffUser}
        onSuccess={fetchStaff}
      />
    </div>
  );
}
