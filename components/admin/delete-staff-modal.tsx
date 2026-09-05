"use client";

import React, { useState } from "react";
import { StaffUserRecord, MASTER_ADMIN_ID, MASTER_ADMIN_EMAIL } from "@/types/admin";
import { useClinic } from "@/context/clinic-context";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  Trash2,
  X,
  AlertTriangle,
  Ban,
  ShieldAlert,
  Loader2,
  FileText,
  CreditCard,
  Calendar,
} from "lucide-react";

interface DeleteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: StaffUserRecord | null;
  onSuccess: () => void;
}

export function DeleteStaffModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: DeleteStaffModalProps) {
  const { showToast } = useClinic();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const isMasterAdmin =
    user.id === MASTER_ADMIN_ID || user.email === MASTER_ADMIN_EMAIL;

  const treatmentsCount = user.treatment_count || 0;
  const paymentsCount = user.payment_count || 0;
  const appointmentsCount = user.appointment_count || 0;

  const hasAuditRecords = treatmentsCount > 0 || paymentsCount > 0;

  // Handle Permanent Delete
  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user.");

      showToast(`Staff member "${user.full_name}" has been permanently deleted.`, "info");
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || "Failed to delete user.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Revoke Instead (when audit records exist)
  const handleRevokeInstead = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/users/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke access.");

      showToast(`Access revoked for "${user.full_name}". Active sessions terminated.`, "info");
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || "Failed to revoke access.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-2xl ${
                  hasAuditRecords
                    ? "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                    : "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                }`}
              >
                {hasAuditRecords ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {hasAuditRecords ? "Clinical Audit Records Protected" : "Delete Staff Member"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Account management for {user.full_name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-4 text-xs">
            {isMasterAdmin ? (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Protected Master Administrator
                </div>
                <p>
                  The root system administrator account ({MASTER_ADMIN_EMAIL}) cannot be deleted or revoked.
                </p>
              </div>
            ) : hasAuditRecords ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 space-y-2">
                  <div className="font-bold flex items-center gap-2 text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    Medical & Financial Retention Policy
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    <strong>{user.full_name}</strong> is associated with historical clinical and financial records in the clinic database:
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    {treatmentsCount > 0 && (
                      <div className="flex items-center gap-1.5 bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl border border-amber-200/60 dark:border-amber-900">
                        <FileText className="w-3.5 h-3.5 text-teal-600" />
                        <span><strong>{treatmentsCount}</strong> treatment record(s)</span>
                      </div>
                    )}
                    {paymentsCount > 0 && (
                      <div className="flex items-center gap-1.5 bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl border border-amber-200/60 dark:border-amber-900">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                        <span><strong>{paymentsCount}</strong> payment log(s)</span>
                      </div>
                    )}
                    {appointmentsCount > 0 && (
                      <div className="flex items-center gap-1.5 bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl border border-amber-200/60 dark:border-amber-900">
                        <Calendar className="w-3.5 h-3.5 text-cyan-600" />
                        <span><strong>{appointmentsCount}</strong> appointment(s)</span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                  Under healthcare clinical governance standards, practitioner identities cannot be deleted from finalized patient charts or cashier transaction logs.
                </p>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Recommended Action: Revoke Access
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Revoking immediately disables their credentials, signs them out of all devices, and hides them from public appointments while keeping audit trails legal and intact.
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Are you sure you want to permanently delete the staff account for{" "}
                  <strong className="text-slate-900 dark:text-slate-100">{user.full_name}</strong>{" "}
                  ({user.email || "No email"})?
                </p>
                <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-[11px] leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Permanent Action
                  </div>
                  <p>
                    This practitioner has no locked patient treatment or payment records. Deleting will permanently erase their credentials, invitation token, and user profile. This cannot be undone.
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
            ) : hasAuditRecords ? (
              user.status === "revoked" ? (
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                >
                  Account Already Revoked
                </button>
              ) : (
                <button
                  onClick={handleRevokeInstead}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-sm cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Ban className="w-3.5 h-3.5" />
                  )}
                  <span>Revoke Access Instead</span>
                </button>
              )
            ) : (
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-sm cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Permanently Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
