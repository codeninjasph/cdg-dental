"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { ClinicNavbar } from "./clinic-navbar";
import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicFooter } from "@/components/public/public-footer";

export function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAuthRoute = pathname?.startsWith("/auth");

  if (isAuthRoute) {
    return <>{children}</>;
  }

  const isPortalRoute =
    pathname?.startsWith("/portal") ||
    pathname?.startsWith("/secretary") ||
    pathname?.startsWith("/patients") ||
    pathname?.startsWith("/appointments") ||
    pathname?.startsWith("/billing") ||
    pathname?.startsWith("/reports") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/protected");

  if (isPortalRoute) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-slate-950">
        <Suspense fallback={<div className="h-[60px] bg-slate-950/95" />}>
          <ClinicNavbar />
        </Suspense>
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6">
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
