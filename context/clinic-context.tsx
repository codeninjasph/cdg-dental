"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Branch, Profile, UserRole } from "@/types/dental";
import { createClient } from "@/lib/supabase/client";
import {
  normalizeRole,
  setRoleCookie,
  getRoleFromCookie,
} from "@/lib/supabase/get-user-role";
import { getDentistDutyForDate, DentistDutyStatus } from "@/lib/duty-schedule";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

interface ToastNotification {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ClinicContextType {
  branches: Branch[];
  activeBranch: Branch | null;
  setActiveBranch: (b: Branch) => void;
  staffList: Profile[];
  currentRole: UserRole;
  actualRole: UserRole;
  isAdmin: boolean;
  setCurrentRole: (role: UserRole) => void;
  currentStaff: Profile | null;
  setCurrentStaff: (staff: Profile) => void;
  dentistDuty: DentistDutyStatus | null;
  toasts: ToastNotification[];
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
  refreshBranches: () => Promise<Branch[]>;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

/**
 * Auto-detects the clinic branch where a dentist is rostered on duty today
 */
async function resolveDentistDutyBranch(
  staff: Profile,
  branchList: Branch[]
): Promise<{ branch: Branch | null; duty: DentistDutyStatus | null }> {
  try {
    const res = await fetch("/api/dentists");
    const json = await res.json();
    const dentists: any[] = json.dentists || [];

    const cleanStaffName = (staff.full_name || "").toLowerCase().trim();
    const matchedDentist = dentists.find(
      (d) =>
        d.id === staff.id ||
        (d.name && cleanStaffName && d.name.toLowerCase().includes(cleanStaffName)) ||
        (cleanStaffName && d.name && cleanStaffName.includes(d.name.toLowerCase()))
    );

    if (!matchedDentist) {
      const fallback =
        (staff.branch_id && branchList.find((b) => b.id === staff.branch_id)) ||
        branchList[0] ||
        null;
      return { branch: fallback, duty: null };
    }

    const today = new Date();

    // 1. Check if scheduled on duty today at any active branch
    for (const b of branchList) {
      const status = getDentistDutyForDate(matchedDentist, b.name, today);
      if (status.isOnDuty) {
        return { branch: b, duty: status };
      }
    }

    // 2. Off duty today: return primary/assigned branch with off duty reason
    const primary =
      (staff.branch_id && branchList.find((b) => b.id === staff.branch_id)) ||
      branchList[0] ||
      null;
    const offDutyStatus = primary
      ? getDentistDutyForDate(matchedDentist, primary.name, today)
      : null;

    return { branch: primary, duty: offDutyStatus };
  } catch (err) {
    console.warn("Could not auto-detect doctor duty branch:", err);
    const fallback =
      (staff.branch_id && branchList.find((b) => b.id === staff.branch_id)) ||
      branchList[0] ||
      null;
    return { branch: fallback, duty: null };
  }
}

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [currentRole, setCurrentRole] = useState<UserRole>("dentist");
  const [actualRole, setActualRole] = useState<UserRole>("dentist");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [currentStaff, setCurrentStaff] = useState<Profile | null>(null);
  const [dentistDuty, setDentistDuty] = useState<DentistDutyStatus | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const supabase = createClient();

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshBranches = async (): Promise<Branch[]> => {
    try {
      const { data: bData } = await supabase
        .from("branches")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (bData && bData.length > 0) {
        setBranches(bData);
        setActiveBranch((prev) => {
          if (!prev) return bData[0];
          const match = bData.find((b) => b.id === prev.id);
          return match || bData[0];
        });
        return bData;
      }
      return [];
    } catch (e) {
      console.error("Failed to refresh branches:", e);
      return [];
    }
  };

  useEffect(() => {
    async function loadMeta() {
      try {
        // 1. Fetch branches
        const branchList = await refreshBranches();

        // 2. Fetch active staff profiles for clinic operatory & scheduling
        const { data: sData } = await supabase
          .from("profiles")
          .select("*")
          .eq("is_active", true)
          .order("full_name");
        const normalizedStaff: Profile[] = (sData || []).map((s) => ({
          ...s,
          role: normalizeRole(s.role),
        }));

        if (normalizedStaff.length > 0) {
          setStaffList(normalizedStaff);
        }

        // 3. Sync with current Supabase Auth session
        const {
          data: { user },
        } = await supabase.auth.getUser();

        let detectedRole: UserRole = "dentist";
        let isUserAdmin = false;

        if (user) {
          // Find matching profile for this logged-in auth user
          const matchingProfile = normalizedStaff.find(
            (s: any) => s.auth_id === user.id || s.id === user.id
          );

          if (
            user.email === "admin@gmail.com" ||
            user.id === "00000000-0000-0000-0000-000000000030" ||
            (user.user_metadata?.role as string) === "admin" ||
            matchingProfile?.role === "admin"
          ) {
            isUserAdmin = true;
            detectedRole = "admin";
          } else if (matchingProfile) {
            detectedRole = matchingProfile.role;
          }

          setIsAdmin(isUserAdmin);
          setActualRole(isUserAdmin ? "admin" : detectedRole);

          // For admin users, prioritize explicit cookie preview role or default to admin
          const savedCookieRole = getRoleFromCookie();
          const activeRole: UserRole = isUserAdmin && savedCookieRole ? savedCookieRole : detectedRole;

          setCurrentRole(activeRole);
          setRoleCookie(activeRole);

          const activeStaff =
            matchingProfile ||
            normalizedStaff.find((s) => s.role === activeRole) ||
            normalizedStaff[0];

          if (activeStaff) {
            setCurrentStaff(activeStaff);

            if (activeRole === "dentist") {
              // Auto-detect doctor duty branch based on today's schedule
              const { branch, duty } = await resolveDentistDutyBranch(activeStaff, branchList);
              if (duty) setDentistDuty(duty);
              if (branch) {
                setActiveBranch(branch);
              } else if (activeStaff.branch_id) {
                const assignedBranch = (branchList || []).find((b) => b.id === activeStaff.branch_id);
                if (assignedBranch) setActiveBranch(assignedBranch);
              }
            } else if (activeStaff.branch_id) {
              const assignedBranch = (branchList || []).find((b) => b.id === activeStaff.branch_id);
              if (assignedBranch) {
                setActiveBranch(assignedBranch);
              }
            }
          }
          return;
        }

        // Fallback: check existing role cookie or pick first staff
        const savedCookieRole = getRoleFromCookie();
        if (savedCookieRole) {
          setCurrentRole(savedCookieRole);
          const match = normalizedStaff.find((s) => s.role === savedCookieRole);
          if (match) {
            setCurrentStaff(match);
            if (savedCookieRole === "dentist") {
              const { branch, duty } = await resolveDentistDutyBranch(match, branchList);
              if (duty) setDentistDuty(duty);
              if (branch) setActiveBranch(branch);
            } else if (match.branch_id) {
              const assignedBranch = (branchList || []).find((b) => b.id === match.branch_id);
              if (assignedBranch) setActiveBranch(assignedBranch);
            }
          }
        } else if (normalizedStaff.length > 0) {
          const defaultStaff = normalizedStaff.find((s) => s.role === "dentist") || normalizedStaff[0];
          setCurrentStaff(defaultStaff);
          setCurrentRole(defaultStaff.role);
          setRoleCookie(defaultStaff.role);
          if (defaultStaff.role === "dentist") {
            const { branch, duty } = await resolveDentistDutyBranch(defaultStaff, branchList);
            if (duty) setDentistDuty(duty);
            if (branch) setActiveBranch(branch);
          } else if (defaultStaff.branch_id) {
            const assignedBranch = (branchList || []).find((b) => b.id === defaultStaff.branch_id);
            if (assignedBranch) setActiveBranch(assignedBranch);
          }
        }
      } catch (err) {
        console.error("Failed to load clinic metadata:", err);
      }
    }

    loadMeta();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setCurrentStaff(null);
        setIsAdmin(false);
        setActualRole("dentist");
        setDentistDuty(null);
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        // Re-sync metadata and user role from live profile
        loadMeta();
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleRoleChange = async (newRole: UserRole) => {
    setCurrentRole(newRole);
    setRoleCookie(newRole);
    const match = staffList.find((s) => s.role === newRole);
    if (match) {
      setCurrentStaff(match);
      if (newRole === "dentist") {
        const { branch, duty } = await resolveDentistDutyBranch(match, branches);
        if (duty) setDentistDuty(duty);
        if (branch) setActiveBranch(branch);
      } else if (match.branch_id) {
        const assigned = branches.find((b) => b.id === match.branch_id);
        if (assigned) setActiveBranch(assigned);
      }
      showToast(`Switched active view to: ${match.full_name} (${newRole.toUpperCase()})`, "info");
    } else {
      showToast(`Switched active role to: ${newRole.toUpperCase()}`, "info");
    }
  };

  return (
    <ClinicContext.Provider
      value={{
        branches,
        activeBranch,
        setActiveBranch,
        staffList,
        currentRole,
        actualRole,
        isAdmin,
        setCurrentRole: handleRoleChange,
        currentStaff,
        setCurrentStaff,
        dentistDuty,
        toasts,
        showToast,
        removeToast,
        refreshTrigger,
        triggerRefresh,
        refreshBranches,
      }}
    >
      {children}

      {/* ── Global Toast Notifications — bottom-right ── */}
      <div
        style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 99999 }}
        className="flex flex-col-reverse gap-2.5 pointer-events-none max-w-sm sm:max-w-md w-full"
      >
        {toasts.map((toast) => {
          const isError = toast.type === "error";
          const isInfo = toast.type === "info";

          return (
            <div
              key={toast.id}
              style={{
                animation: "toastSlideIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both",
                pointerEvents: "auto",
              }}
              className={`relative flex items-start gap-3 p-4 rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-md transition-all ${
                isError
                  ? "bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/60 shadow-rose-950/10"
                  : isInfo
                  ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-slate-950/10"
                  : "bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/60 shadow-emerald-950/10"
              }`}
            >
              {/* Icon Pill */}
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  isError
                    ? "bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400"
                    : isInfo
                    ? "bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400"
                    : "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {isError ? (
                  <AlertCircle className="w-5 h-5" />
                ) : isInfo ? (
                  <Info className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>

              {/* Message Details */}
              <div className="flex-1 min-w-0 pr-1">
                <h5
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isError
                      ? "text-rose-600 dark:text-rose-400"
                      : isInfo
                      ? "text-teal-600 dark:text-teal-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {isError ? "Notification Alert" : isInfo ? "Information" : "Success"}
                </h5>
                <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-100 mt-0.5 break-words">
                  {toast.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Auto-dismiss progress bar */}
              <div
                className="absolute bottom-0 left-0 h-[3px] rounded-full"
                style={{
                  background: isError ? "#f43f5e" : isInfo ? "#0d9488" : "#10b981",
                  animation: "toastProgress 4s linear forwards",
                  width: "100%",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Keyframe definitions */}
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(24px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0)    scale(1);    }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%;   }
        }
      `}</style>
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error("useClinic must be used within a ClinicProvider");
  }
  return context;
}
