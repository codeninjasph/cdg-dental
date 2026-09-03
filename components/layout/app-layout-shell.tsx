"use client";

import { usePathname } from "next/navigation";
import { ClinicNavbar } from "./clinic-navbar";
import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicFooter } from "@/components/public/public-footer";

export function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isPortalRoute =
    pathname?.startsWith("/portal") ||
    pathname?.startsWith("/patients") ||
    pathname?.startsWith("/appointments") ||
    pathname?.startsWith("/billing") ||
    pathname?.startsWith("/protected");

  if (isPortalRoute) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-slate-950">
        <ClinicNavbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <PublicNavbar />
      <main className="flex-1 w-full">{children}</main>
      <PublicFooter />
    </div>
  );
}
