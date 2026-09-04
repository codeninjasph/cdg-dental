import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Admin Staff & Access Control | CDG Dental Clinic",
  description:
    "Clinic staff directory, user invitation, role assignment, and access revocation for CDG Dental Clinic.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="w-full">{children}</div>;
}
