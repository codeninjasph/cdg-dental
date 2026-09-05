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
      <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-slate-950 w-full max-w-full overflow-x-hidden">
        <Suspense fallback={<div className="hidden lg:block h-[60px] bg-slate-950/95" />}>
          <ClinicNavbar />
        </Suspense>
        <main className="flex-1 w-full max-w-full overflow-x-hidden px-3.5 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 pb-mobile-nav lg:pb-8">
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
