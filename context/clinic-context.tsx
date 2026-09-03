"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Branch, Profile, UserRole } from "@/types/dental";
import { createClient } from "@/lib/supabase/client";

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
        const { data: bData } = await supabase.from("branches").select("*").order("name");
        if (bData && bData.length > 0) {
          setBranches(bData);
          setActiveBranch(bData[0]);
        }

        const { data: sData } = await supabase.from("profiles").select("*").order("full_name");
        if (sData && sData.length > 0) {
          setStaffList(sData);
          // Default to dentist
          const dentist = sData.find((s) => s.role === "dentist") || sData[0];
          setCurrentStaff(dentist);
          setCurrentRole(dentist.role);
        }
      } catch (err) {
        console.error("Failed to load clinic metadata:", err);
      }
    }
    loadMeta();
  }, []);

  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole);
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

      {/* Global Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-lg border text-sm animate-in slide-in-from-bottom-3 duration-200 ${
              toast.type === "error"
                ? "bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
                : toast.type === "info"
                ? "bg-slate-900 border-slate-700 text-white"
                : "bg-teal-50 dark:bg-teal-950 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200"
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 text-xs opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
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
