"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Branch, Profile, UserRole } from "@/types/dental";
import { createClient } from "@/lib/supabase/client";
import {
  normalizeRole,
  setRoleCookie,
  getRoleFromCookie,
} from "@/lib/supabase/get-user-role";

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
  setCurrentRole: (role: UserRole) => void;
  currentStaff: Profile | null;
  setCurrentStaff: (staff: Profile) => void;
  toasts: ToastNotification[];
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [currentRole, setCurrentRole] = useState<UserRole>("dentist");
  const [currentStaff, setCurrentStaff] = useState<Profile | null>(null);
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

  useEffect(() => {
    async function loadMeta() {
      try {
        // 1. Fetch branches
        const { data: bData } = await supabase.from("branches").select("*").order("name");
        if (bData && bData.length > 0) {
          setBranches(bData);
          setActiveBranch(bData[0]);
        }

        // 2. Fetch staff profiles
        const { data: sData } = await supabase.from("profiles").select("*").order("full_name");
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

        if (user) {
          // Find matching profile for this logged-in auth user
          const matchingProfile = normalizedStaff.find(
            (s: any) => s.auth_id === user.id || s.id === user.id
          );

          if (matchingProfile) {
            setCurrentStaff(matchingProfile);
            setCurrentRole(matchingProfile.role);
            setRoleCookie(matchingProfile.role);
            return;
          }
        }

        // Fallback: check existing role cookie or pick first staff
        const savedCookieRole = getRoleFromCookie();
        if (savedCookieRole) {
          setCurrentRole(savedCookieRole);
          const match = normalizedStaff.find((s) => s.role === savedCookieRole);
          if (match) setCurrentStaff(match);
        } else if (normalizedStaff.length > 0) {
          const defaultStaff = normalizedStaff.find((s) => s.role === "dentist") || normalizedStaff[0];
          setCurrentStaff(defaultStaff);
          setCurrentRole(defaultStaff.role);
          setRoleCookie(defaultStaff.role);
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
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole);
    setRoleCookie(newRole);
    const match = staffList.find((s) => s.role === newRole);
    if (match) {
      setCurrentStaff(match);
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
        setCurrentRole: handleRoleChange,
        currentStaff,
        setCurrentStaff,
        toasts,
        showToast,
        removeToast,
        refreshTrigger,
        triggerRefresh,
      }}
    >
      {children}

      {/* ── Global Toast Notifications — bottom-right ── */}
      <div
        style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999 }}
        className="flex flex-col-reverse gap-2.5 pointer-events-none max-w-xs w-full"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === "success";
          const isError   = toast.type === "error";
          const isInfo    = toast.type === "info";

          const colors = isError
            ? { wrap: "bg-slate-950 border-rose-500/50",   text: "text-rose-300",   sub: "text-rose-400/60",  bar: "bg-rose-500",    icon: "🚨" }
            : isInfo
            ? { wrap: "bg-slate-950 border-slate-600/60",  text: "text-slate-100",  sub: "text-slate-400",   bar: "bg-slate-400",   icon: "ℹ️" }
            : { wrap: "bg-slate-950 border-teal-500/50",   text: "text-teal-300",   sub: "text-teal-400/60", bar: "bg-teal-500",    icon: "✅" };

          return (
            <div
              key={toast.id}
              style={{
                animation: "toastSlideIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both",
                pointerEvents: "auto",
              }}
              className={`relative flex items-start gap-3 px-4 py-3.5 rounded-2xl border shadow-2xl shadow-black/50 overflow-hidden ${colors.wrap}`}
            >
              {/* Icon */}
              <span className="text-base mt-0.5 shrink-0 leading-none">{colors.icon}</span>

              {/* Message */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold leading-snug ${colors.text}`}>
                  {toast.message}
                </p>
              </div>

              {/* Close */}
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors text-base leading-none mt-0.5 cursor-pointer"
              >
                ×
              </button>

              {/* Auto-dismiss progress bar */}
              <div
                className="absolute bottom-0 left-0 h-[2px] rounded-full"
                style={{
                  background: isError ? "#f43f5e" : isInfo ? "#94a3b8" : "#14b8a6",
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
