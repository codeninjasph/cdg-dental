import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { Suspense } from "react";

export const metadata = {
  title: "Staff Login | CDG Dental Clinic",
  description: "Secure login portal for CDG Dental Clinic practitioners and staff.",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Staff Portal Sign In"
      subtitle="Access clinical charts, secretary appointments, and clinic operations."
    >
      <Suspense fallback={<div className="text-slate-400 text-xs text-center py-10">Loading portal...</div>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
