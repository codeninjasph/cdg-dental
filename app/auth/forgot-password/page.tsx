import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata = {
  title: "Reset Password | CDG Dental Clinic",
  description: "Reset your CDG Dental staff portal password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset Staff Password"
      subtitle="Enter your clinic credentials to receive password recovery instructions."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
