"use client";

import React, { useState } from "react";
import { useClinic } from "@/context/clinic-context";
import {
  X,
  UserPlus,
  Mail,
  User,
  Building2,
  Stethoscope,
  UserCheck,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Sparkles,
  Link2,
} from "lucide-react";

interface InviteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteStaffModal({ isOpen, onClose, onSuccess }: InviteStaffModalProps) {
  const { branches, showToast } = useClinic();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"dentist" | "secretary">("dentist");
  const [branchId, setBranchId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [invitedUserName, setInvitedUserName] = useState<string>("");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          role,
          branchId: branchId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate staff invitation.");
      }

      setGeneratedInviteUrl(data.inviteUrl);
      setInvitedUserName(fullName);
      showToast(`Invitation created for ${fullName}!`, "success");
      onSuccess();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedInviteUrl) return;
    navigator.clipboard.writeText(generatedInviteUrl);
    setCopied(true);
    showToast("Activation link copied to clipboard!", "info");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleResetAndClose = () => {
    setFullName("");
    setEmail("");
    setRole("dentist");
    setBranchId("");
    setError(null);
    setGeneratedInviteUrl(null);
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-white/10 shadow-2xl shadow-black/80 overflow-hidden text-slate-100">
        {/* Neon Glow Header Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-teal-500 via-cyan-400 to-violet-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/20 to-teal-500/20 border border-white/10 flex items-center justify-center text-teal-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Invite Staff Member
              </h3>
              <p className="text-xs text-slate-400">
                Provision a Doctor or Secretary access token
              </p>
            </div>
          </div>

          <button
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {generatedInviteUrl ? (
            // Success Step: Activation Link Display
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center mx-auto text-teal-400">
                <Sparkles className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
                  Invitation Ready
                </span>
                <h4 className="text-lg font-bold text-white mt-2">
                  Account Provisioned for {invitedUserName}
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  Share this secure activation link with the staff member. They will set their private practitioner password to begin.
                </p>
              </div>

              {/* Link Box */}
              <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.08] text-left">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Link2 className="w-3.5 h-3.5 text-teal-400" />
                    Direct Activation URL:
                  </span>
                  <span className="text-[10px] text-teal-400 font-mono">Token valid</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] font-mono text-xs text-slate-300 break-all select-all">
                  {generatedInviteUrl}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-teal-400 via-teal-300 to-cyan-400 hover:opacity-95 shadow-lg shadow-teal-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-slate-950" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-950" />
                      <span>Copy Invitation Link</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="py-2.5 px-5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            // Form Step
            <form onSubmit={handleInvite} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Role Selector Tabs */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Staff Role Assignment
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRole("dentist")}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      role === "dentist"
                        ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-300 shadow-md shadow-emerald-500/10"
                        : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Doctor / Dentist</div>
                      <div className="text-[10px] text-slate-500">Charts, Rx & Dental Treatments</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("secretary")}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      role === "secretary"
                        ? "bg-cyan-500/15 border-cyan-400/40 text-cyan-300 shadow-md shadow-cyan-500/10"
                        : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Front Desk Secretary</div>
                      <div className="text-[10px] text-slate-500">Queue, Intake & Patient Booking</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Full Name & Title
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={role === "dentist" ? "Dr. Maria Santos, DDM" : "Elena Bautista"}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-100 placeholder:text-slate-600 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400/50"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Clinic Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="practitioner@cdgdental.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-100 placeholder:text-slate-600 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400/50"
                  />
                </div>
              </div>

              {/* Assigned Branch */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Assigned Clinic Branch
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-white/[0.08] text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400/50 cursor-pointer"
                  >
                    <option value="">All Branches / Float</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-teal-400 via-teal-300 to-cyan-400 hover:opacity-95 shadow-lg shadow-teal-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Generating Staff Invitation...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Send Official Invitation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
