import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Secretary & Reception Station | CDG Dental Clinic",
  description:
    "Patient triage, queue tracking, walk-in registration, and billing cashier station for CDG Dental Clinic Cagayan de Oro.",
};

export default function SecretaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="w-full">{children}</div>;
}
