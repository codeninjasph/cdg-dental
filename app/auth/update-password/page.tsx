import { Suspense } from "react";
import { UpdatePasswordForm } from "@/components/update-password-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading form...</div>}>
          <UpdatePasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
