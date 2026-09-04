import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { ClinicProvider } from "@/context/clinic-context";
import { AppLayoutShell } from "@/components/layout/app-layout-shell";
import { CdoJsonLd } from "@/components/seo/cdo-json-ld";
import { Suspense } from "react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://cdgdental.ph"),
  title: "CDG Dental Clinic — Premier Dental Clinic in Cagayan de Oro City | Cosmetic, Ortho & Implants",
  description:
    "Trusted modern dental clinic in Cagayan de Oro City (CDO), Northern Mindanao. Advanced smile makeovers, clear aligners, dental implants, and gentle general dentistry in Limketkai Downtown and Pueblo de Oro Uptown.",
  keywords: [
    "dental clinic Cagayan de Oro",
    "dentist CDO",
    "orthodontist Cagayan de Oro",
    "clear aligners CDO",
    "porcelain veneers CDO",
    "teeth whitening Cagayan de Oro",
    "Limketkai dental clinic",
    "Pueblo de Oro dentist",
    "dental implants Northern Mindanao",
  ],
  authors: [{ name: "CDG Dental Clinic Cagayan de Oro" }],
  openGraph: {
    title: "CDG Dental Clinic — Premier Dental Care in Cagayan de Oro City",
    description:
      "Hospital-grade, pain-free dental medicine in CDO. Cosmetic dentistry, clear aligners, dental implants, and family preventive care.",
    url: "https://cdgdental.ph",
    siteName: "CDG Dental Clinic CDO",
    images: [
      {
        url: "/images/hero-clinic.jpg",
        width: 1200,
        height: 675,
        alt: "CDG Dental Clinic Cagayan de Oro Operatory",
      },
    ],
    locale: "en_PH",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <CdoJsonLd />
      </head>
      <body className="font-sans antialiased bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col selection:bg-teal-500 selection:text-white">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ClinicProvider>
            <Suspense fallback={<div className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800" />}>
              <AppLayoutShell>{children}</AppLayoutShell>
            </Suspense>
          </ClinicProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
