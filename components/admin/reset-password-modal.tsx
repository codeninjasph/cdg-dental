"use client";

import React, { useState } from "react";
import { StaffUserRecord } from "@/types/admin";
import { useClinic } from "@/context/clinic-context";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  X,
  KeyRound,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: StaffUserRecord | null;
  onSuccess?: () => void;
}

export function ResetPasswordModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: ResetPasswordModalProps) {
  const { showToast } = useClinic();

  const [activeTab, setActiveTab] = useState<"link" | "direct">("link");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Direct reset states
  const [directPassword, setDirectPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingDirect, setIsSubmittingDirect] = useState(false);
  const [directSuccess, setDirectSuccess] = useState(false);

  if (!isOpen || !user) return null;

  // Generate Reset Token & Link
  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: "generate_token" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate reset link.");

      setGeneratedLink(data.resetUrl);
      setGeneratedToken(data.token);
      showToast("Password reset link generated successfully!", "success");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showToast(err.message || "Failed to generate reset token.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopiedLink(true);
    showToast("Password reset URL copied to clipboard!", "info");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyToken = () => {
    if (!generatedToken) return;
    navigator.clipboard.writeText(generatedToken);
    setCopiedToken(true);
    showToast("Token copied to clipboard!", "info");
    setTimeout(() => setCopiedToken(false), 2500);
  };

  // Direct Reset
  const handleDirectReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (directPassword.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }
    if (directPassword !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }

    setIsSubmittingDirect(true);
    try {
      const res = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          action: "direct_reset",
          newPassword: directPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password.");

      setDirectSuccess(true);
      showToast(`Password updated for ${user.full_name}!`, "success");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showToast(err.message || "Failed to reset password directly.", "error");
    } finally {
      setIsSubmittingDirect(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  Reset Staff Credentials
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {user.full_name} • <span className="font-mono">{user.email}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs: Token Link vs Direct Override */}
          <div className="p-4 bg-slate-50 dark:bg-slate-850/50 border-b border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("link")}
                className={`py-2 px-3 rounded-lg transition-all cursor-pointer ${
                  activeTab === "link"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Reset Link & Token
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("direct")}
                className={`py-2 px-3 rounded-lg transition-all cursor-pointer ${
                  activeTab === "direct"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Direct Override
              </button>
            </div>
          </div>

          {/* Tab 1: Reset Link & Token */}
          {activeTab === "link" && (
            <div className="p-5 sm:p-6 space-y-5">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  One-Time Password Reset Link
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Generate a secure, single-use token URL for this practitioner. Share this link directly via messaging, chat, or in-person without needing email delivery.
                </p>
              </div>

              {!generatedLink ? (
                <div className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      No active reset token generated
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Click the button below to generate a new cryptographic recovery token.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateLink}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating Secure Token...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Reset Link & Token</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Generated URL Box */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Password Reset URL:
                    </label>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                      <p className="text-xs font-mono text-slate-800 dark:text-slate-200 break-all select-all">
                        {generatedLink}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Token active & ready
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedLink ? "Copied!" : "Copy Reset Link"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Token Breakdown */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Raw Token</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                        {generatedToken}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyToken}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 transition-colors cursor-pointer"
                      title="Copy raw token"
                    >
                      {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Regenerate Button */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleGenerateLink}
                      disabled={isGenerating}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 underline cursor-pointer"
                    >
                      Regenerate New Token
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Direct Override */}
          {activeTab === "direct" && (
            <form onSubmit={handleDirectReset} className="p-5 sm:p-6 space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Direct Password Override
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Directly specify a new password for this user. Recommended when assisting a doctor or secretary in-person.
                </p>
              </div>

              {directSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                    Password Successfully Updated!
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    The user can now sign in using the newly specified password immediately.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      New Password (min. 6 characters)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={directPassword}
                        onChange={(e) => setDirectPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-3 pr-10 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Confirm New Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingDirect || directPassword.length < 6}
                    className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  >
                    {isSubmittingDirect ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Save & Apply New Password</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Modal Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-850/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
