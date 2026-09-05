"use client";

import React, { useState, useEffect } from "react";
import { useClinic } from "@/context/clinic-context";
import { StaffUserRecord } from "@/types/admin";
import {
  Building2,
  X,
  MapPin,
  Stethoscope,
  UserCheck,
  Shield,
  Loader2,
  CheckCircle2,
  Info,
  Layers,
} from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";

interface EditStaffBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffUser: StaffUserRecord | null;
  onSuccess: () => void;
}

export function EditStaffBranchModal({
  isOpen,
  onClose,
  staffUser,
  onSuccess,
}: EditStaffBranchModalProps) {
  const { branches, showToast, refreshBranches } = useClinic();

  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state whenever modal opens or target staff changes
  useEffect(() => {
    if (staffUser) {
      setSelectedBranchId(staffUser.branch_id || "");
      setError(null);
    }
  }, [staffUser, isOpen]);

  if (!isOpen || !staffUser) return null;

  const roleConfigs = {
    dentist: {
      label: "Dentist",
      icon: Stethoscope,
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
      avatarBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      description: "Sets practitioner's home facility for patient intake, staff directory records, and duty rosters.",
    },
    secretary: {
      label: "Secretary / Receptionist",
      icon: UserCheck,
      badge: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800",
      avatarBg: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
      description: "Sets the default lobby reception queue, walk-in check-in, and POS cashier workstation branch.",
    },
    admin: {
      label: "Clinic Administrator",
      icon: Shield,
      badge: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800",
      avatarBg: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 border-violet-200 dark:border-violet-800",
      description: "Administrators manage multi-facility operations; branch assignment specifies their primary station.",
    },
  };

  const roleInfo = roleConfigs[staffUser.role] || roleConfigs.dentist;
  const RoleIcon = roleInfo.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: staffUser.id,
          branchId: selectedBranchId ? selectedBranchId : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update branch assignment.");
      }

      const assignedBranchObj = branches.find((b) => b.id === selectedBranchId);
      const branchDisplay = assignedBranchObj ? assignedBranchObj.name : "All Branches (Floating)";

      showToast(
        `Branch assigned to "${branchDisplay}" for ${staffUser.full_name}.`,
        "success"
      );

      await refreshBranches();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred while saving branch assignment.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-950/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200/80 dark:border-teal-800 flex items-center justify-center shrink-0 shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Edit Branch Assignment
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Reassign staff member to a primary clinic location
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Form */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
            {/* Error banner */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}

            {/* Target Staff Member Profile Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl border flex items-center justify-center font-extrabold text-sm shrink-0 ${roleInfo.avatarBg}`}
              >
                {staffUser.full_name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {staffUser.full_name}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${roleInfo.badge}`}
                  >
                    <RoleIcon className="w-3 h-3" />
                    <span>{roleInfo.label}</span>
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {staffUser.email || "No email on record"}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-1 flex items-center gap-1">
                  <span className="text-slate-400">Current Assignment:</span>
                  <span className="font-semibold text-teal-700 dark:text-teal-300">
                    {staffUser.branch_name || "All Branches / Floating"}
                  </span>
                </div>
              </div>
            </div>

            {/* Branch Selection List */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Assign Clinic Branch
              </label>

              <div className="space-y-2">
                {/* Option: All Branches / Floating */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedBranchId === ""
                      ? "bg-teal-50/60 dark:bg-teal-950/40 border-teal-500/80 ring-1 ring-teal-500/30 text-slate-900 dark:text-slate-100"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="assignedBranch"
                    value=""
                    checked={selectedBranchId === ""}
                    onChange={() => setSelectedBranchId("")}
                    className="mt-1 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span className="font-bold text-xs">All Branches / Floating Staff</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      No fixed primary branch. Staff can operate across all clinic locations.
                    </p>
                  </div>
                </label>

                {/* Specific active branches */}
                {branches
                  .filter((b) => b.is_active)
                  .map((branch) => {
                    const isSelected = selectedBranchId === branch.id;
                    const isCurrent = staffUser.branch_id === branch.id;

                    return (
                      <label
                        key={branch.id}
                        className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-teal-50/60 dark:bg-teal-950/40 border-teal-500/80 ring-1 ring-teal-500/30 text-slate-900 dark:text-slate-100"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="assignedBranch"
                          value={branch.id}
                          checked={isSelected}
                          onChange={() => setSelectedBranchId(branch.id)}
                          className="mt-1 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                              <span className="font-bold text-xs">{branch.name}</span>
                            </div>
                            {isCurrent && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                                Current
                              </span>
                            )}
                          </div>
                          {branch.address && (
                            <div className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                              <span className="truncate">{branch.address}</span>
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
              </div>
            </div>

            {/* Role Context Hint */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
              <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                <strong className="text-slate-800 dark:text-slate-200">{roleInfo.label}:</strong>{" "}
                {roleInfo.description}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs hover:shadow-teal-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Save Assignment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
