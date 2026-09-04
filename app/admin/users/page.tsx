"use client";

import React, { useState, useEffect } from "react";
import { useClinic } from "@/context/clinic-context";
import { StaffUserRecord, MASTER_ADMIN_ID, MASTER_ADMIN_EMAIL } from "@/types/admin";
import { InviteStaffModal } from "@/components/admin/invite-staff-modal";
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
} from "lucide-react";

export default function AdminUsersPage() {
  const { currentRole, showToast } = useClinic();

  const [staffList, setStaffList] = useState<StaffUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
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
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-violet-500/15 text-violet-300 border border-violet-500/25">
              <Shield className="w-3 h-3 text-violet-400" />
              Administrative Control
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Staff & User Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Invite clinicians, provision front desk personnel, and manage role permissions.
          </p>
        </div>

        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="self-start sm:self-auto py-2.5 px-4 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-teal-400 via-teal-300 to-cyan-400 hover:opacity-95 shadow-lg shadow-teal-500/25 active:scale-[0.99] transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite New Staff</span>
        </button>
      </div>

      {/* ── Stat Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Total Staff</span>
            <div className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center text-slate-300">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{totalCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Practitioners & front-desk</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-300">Doctors / Dentists</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <Stethoscope className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{dentistCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Clinical chart access</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-cyan-300">Secretaries</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{secretaryCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Reception & queue desk</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-rose-300">Access Revoked</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{revokedCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Banned from system</div>
        </div>
      </div>

      {/* ── Search and Filter Toolbar ── */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/[0.06] backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-100 placeholder:text-slate-600 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400/30"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-xl px-2 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Roles</option>
              <option value="dentist" className="bg-slate-900">Dentists</option>
              <option value="secretary" className="bg-slate-900">Secretaries</option>
              <option value="admin" className="bg-slate-900">Admins</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-2 py-1 text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Statuses</option>
              <option value="active" className="bg-slate-900">Active</option>
              <option value="pending_invite" className="bg-slate-900">Pending Invite</option>
              <option value="revoked" className="bg-slate-900">Revoked</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Staff Directory Table ── */}
      <div className="rounded-2xl bg-slate-900/80 border border-white/[0.08] overflow-hidden shadow-xl shadow-black/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">Staff Practitioner</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Assigned Branch</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-400" />
                    <span>Loading staff directory...</span>
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
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
                      color: "text-emerald-300",
                      bg: "bg-emerald-500/10 border-emerald-500/25",
                      icon: Stethoscope,
                    },
                    secretary: {
                      label: "Secretary",
                      color: "text-cyan-300",
                      bg: "bg-cyan-500/10 border-cyan-500/25",
                      icon: UserCheck,
                    },
                    admin: {
                      label: "Admin",
                      color: "text-violet-300",
                      bg: "bg-violet-500/10 border-violet-500/25",
                      icon: Shield,
                    },
                  };
                  const rBadge = roleBadges[user.role] || roleBadges.dentist;
                  const RoleIcon = rBadge.icon;

                  // Status badge config
                  const statusBadges = {
                    active: {
                      label: "Active",
                      classes: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
                      dot: "bg-emerald-400 animate-pulse",
                    },
                    revoked: {
                      label: "Access Revoked",
                      classes: "bg-rose-500/15 text-rose-300 border-rose-500/30",
                      dot: "bg-rose-500",
                    },
                    pending_invite: {
                      label: "Pending Invite",
                      classes: "bg-amber-500/15 text-amber-300 border-amber-500/30",
                      dot: "bg-amber-400",
                    },
                  };
                  const sBadge = statusBadges[user.status];

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Name & Email */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/[0.08] flex items-center justify-center font-bold text-xs text-teal-300 shrink-0">
                            {user.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{user.full_name}</span>
                              {isMasterAdmin && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30">
                                  MASTER
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {user.email || "No email linked"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border ${rBadge.bg} ${rBadge.color}`}
                        >
                          <RoleIcon className="w-3.5 h-3.5" />
                          <span>{rBadge.label}</span>
                        </span>
                      </td>

                      {/* Branch */}
                      <td className="py-4 px-4 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>{user.branch_name || "All Branches"}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${sBadge.classes}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${sBadge.dot}`} />
                          <span>{sBadge.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isActionLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                          ) : isMasterAdmin ? (
                            <span className="text-[11px] text-slate-500 italic pr-2">
                              Protected Root
                            </span>
                          ) : (
                            <>
                              {/* Copy Invite Link if Pending */}
                              {user.status === "pending_invite" && user.invite_token && (
                                <button
                                  onClick={() => handleCopyInvite(user)}
                                  title="Copy activation invite link"
                                  className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 transition-colors cursor-pointer"
                                >
                                  {copiedTokenId === user.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}

                              {/* Revoke or Restore button */}
                              {user.status === "revoked" ? (
                                <button
                                  onClick={() => handleRestore(user)}
                                  title="Restore staff access"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 text-[11px] font-semibold transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Restore</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRevoke(user)}
                                  title="Revoke access immediately"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 text-[11px] font-semibold transition-colors cursor-pointer"
                                >
                                  <Ban className="w-3 h-3" />
                                  <span>Revoke</span>
                                </button>
                              )}

                              {/* Delete button */}
                              <button
                                onClick={() => handleDelete(user)}
                                title="Delete user"
                                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/[0.06] hover:border-rose-500/30 transition-colors cursor-pointer"
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
    </div>
  );
}
