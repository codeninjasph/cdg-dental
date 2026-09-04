import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Clinical Operatory & Practice Portal | CDG Dental Clinic",
  description:
    "Doctor treatment queue, 32-tooth odontogram records, appointments, and clinical operatory management.",
};

export default function ClinicalPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="w-full">{children}</div>;
}
