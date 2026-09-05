"use client";

import React, { useState } from "react";
import { StaffUserRecord, MASTER_ADMIN_ID, MASTER_ADMIN_EMAIL } from "@/types/admin";
import { useClinic } from "@/context/clinic-context";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  Ban,
  RotateCcw,
  X,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

interface RevokeStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: StaffUserRecord | null;
  mode: "revoke" | "restore";
  onSuccess: () => void;
}

export function RevokeStaffModal({
  isOpen,
  onClose,
  user,
  mode,
  onSuccess,
}: RevokeStaffModalProps) {
  const { showToast } = useClinic();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const isMasterAdmin =
    user.id === MASTER_ADMIN_ID || user.email === MASTER_ADMIN_EMAIL;

  const handleAction = async () => {
    setIsSubmitting(true);
    try {
      const endpoint =
        mode === "revoke" ? "/api/admin/users/revoke" : "/api/admin/users/restore";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${mode} staff access.`);

      showToast(
        mode === "revoke"
          ? `Access revoked for ${user.full_name}. Active sessions terminated.`
          : `Access restored for ${user.full_name}. They can now sign in.`,
        mode === "revoke" ? "info" : "success"
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || `Failed to ${mode} access.`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-2xl ${
                  mode === "revoke"
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                }`}
              >
                {mode === "revoke" ? (
                  <Ban className="w-5 h-5" />
                ) : (
                  <RotateCcw className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {mode === "revoke" ? "Revoke Staff Access" : "Restore Staff Access"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {user.full_name} ({user.role.toUpperCase()})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-3 text-xs">
            {isMasterAdmin ? (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Master Admin Protected
                </div>
                <p>Cannot revoke access for the master administrator account.</p>
              </div>
            ) : mode === "revoke" ? (
              <div className="space-y-3">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Are you sure you want to revoke access for{" "}
                  <strong className="text-slate-900 dark:text-slate-100">{user.full_name}</strong>?
                </p>
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 space-y-1.5 text-[11px] leading-relaxed">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Security & Clinical Impact
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Immediate termination of all active login sessions.</li>
                    <li>Account banned from signing in to the clinic workstation.</li>
                    <li>Hidden from public website booking and doctor rosters.</li>
                    <li>All past treatments and financial logs remain securely intact.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Restore access for{" "}
                  <strong className="text-slate-900 dark:text-slate-100">{user.full_name}</strong>?
                </p>
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 space-y-1.5 text-[11px] leading-relaxed">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Reinstatement
                  </div>
                  <p>
                    The account ban will be lifted immediately and the practitioner will be able to sign in and resume their clinic duties.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {isMasterAdmin ? (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
              >
                Close
              </button>
            ) : (
              <button
                onClick={handleAction}
                disabled={isSubmitting}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm cursor-pointer ${
                  mode === "revoke"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : mode === "revoke" ? (
                  <Ban className="w-3.5 h-3.5" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>{mode === "revoke" ? "Revoke Access" : "Restore Access"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
