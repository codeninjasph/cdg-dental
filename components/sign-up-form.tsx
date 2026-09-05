"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { setRoleCookie, normalizeRole } from "@/lib/supabase/get-user-role";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, ShieldCheck, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface SignUpFormProps extends React.ComponentPropsWithoutRef<"div"> {
  invitedEmail?: string;
  inviteToken?: string;
}

export function SignUpForm({
  className,
  invitedEmail = "",
  inviteToken = "",
  ...props
}: SignUpFormProps) {
  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (invitedEmail) {
      setEmail(invitedEmail);
    }
  }, [invitedEmail]);

  const isInviteFlow = !!invitedEmail || !!inviteToken;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setIsLoading(false);
      return;
    }

    if (password !== repeatPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      // 1. If this is an invited user flow, activate via server-side database validation
      if (inviteToken) {
        const res = await fetch("/api/auth/activate-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            token: inviteToken.trim(),
            password,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to activate invitation.");
        }

        setIsSuccess(true);

        // 2. Automatically sign in with newly set credentials
        const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (!signInErr && authData.user) {
          const role = normalizeRole(data.role || "secretary");
          setRoleCookie(role);

          // Route to proper role dashboard
          setTimeout(() => {
            if (role === "secretary") {
              router.push("/secretary");
            } else if (role === "admin") {
              router.push("/admin/users");
            } else {
              router.push("/portal");
            }
          }, 800);
          return;
        }

        // If auto-login fails, redirect to login page with prefilled email
        setTimeout(() => {
          router.push(`/auth/login?activated=true&email=${encodeURIComponent(email)}`);
        }, 1000);
        return;
      }

      // 2. Standard Public Sign-up Fallback (if enabled)
      const { error: signUpErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/protected`,
        },
      });

      if (signUpErr) throw signUpErr;
      router.push("/auth/sign-up-success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred during registration.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-0 shadow-none">
        <CardHeader className="p-0 pb-6">
          <CardTitle className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
            {isInviteFlow ? "Activate Practitioner Account" : "Sign up"}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            {isInviteFlow
              ? "Set up your private login password to activate your staff profile."
              : "Create a new CDG Dental account."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isSuccess ? (
            <div className="p-6 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-center space-y-3 animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-300 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-teal-900 dark:text-teal-100">
                Account Activated Successfully!
              </h3>
              <p className="text-xs text-teal-700 dark:text-teal-300">
                Logging you into the CDG Dental Clinic portal...
              </p>
              <div className="flex justify-center pt-2">
                <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSignUp}>
              <div className="flex flex-col gap-4">
                {/* Email Field with Locked State */}
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="email"
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      {isInviteFlow ? "Invited Work Email" : "Email"}
                    </Label>
                    {isInviteFlow && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                        <Lock className="w-3 h-3 text-teal-600" />
                        <span>Locked to Invitation</span>
                      </span>
                    )}
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    readOnly={!!invitedEmail}
                    value={email}
                    onChange={(e) => !invitedEmail && setEmail(e.target.value)}
                    className={
                      invitedEmail
                        ? "bg-slate-100/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 cursor-not-allowed font-medium border-slate-200 dark:border-slate-700 select-none"
                        : ""
                    }
                  />
                  {isInviteFlow && (
                    <p className="text-[11px] text-slate-500">
                      This registration is securely bound to the administrator invite sent to this address.
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label
                      htmlFor="password"
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      New Password
                    </Label>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {/* Repeat Password Field */}
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label
                      htmlFor="repeat-password"
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Confirm Password
                    </Label>
                  </div>
                  <Input
                    id="repeat-password"
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                  />
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2 text-rose-800 dark:text-rose-200 text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full mt-2 font-bold text-xs bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-2.5 transition-all cursor-pointer shadow-sm hover:shadow"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isInviteFlow ? "Activating Profile..." : "Creating Account..."}</span>
                    </span>
                  ) : (
                    <span>{isInviteFlow ? "Activate & Complete Setup" : "Sign up"}</span>
                  )}
                </Button>
              </div>

              <div className="mt-5 text-center text-xs text-slate-500">
                Already have an account?{" "}
                <Link
                  href="/auth/login"
                  className="font-bold text-teal-600 dark:text-teal-400 hover:underline"
                >
                  Sign In
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
