import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { ClinicProvider } from "@/context/clinic-context";
import { ClinicNavbar } from "@/components/layout/clinic-navbar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CDG Dental Clinic — Comprehensive Practice Management",
  description: "Next.js & Supabase Clinical Practice Management, 32-Tooth Odontogram, Scheduling, and Financial Ledger.",
};

import { Suspense } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ClinicProvider>
            <Suspense fallback={<div className="h-16 border-b border-slate-200 dark:border-slate-800" />}>
              <ClinicNavbar />
            </Suspense>
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <Suspense fallback={<div className="p-8 text-center text-slate-500 text-xs">Loading CDG Dental Workspace...</div>}>
                {children}
              </Suspense>
            </main>
          </ClinicProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
