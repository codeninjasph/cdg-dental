import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";
import { ROLE_COOKIE_NAME, normalizeRole } from "./get-user-role";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!hasEnvVars) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Helper to maintain cookies across redirects
  const makeRedirect = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  };

  // Securely retrieve user and claims
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // List of paths requiring authenticated clinic personnel
  const protectedPrefixes = [
    "/portal",
    "/secretary",
    "/patients",
    "/appointments",
    "/billing",
    "/protected",
    "/admin",
  ];

  const isProtectedRoute = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // 1. Unauthenticated user trying to access protected route
  if (isProtectedRoute && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("redirect", pathname);
    return makeRedirect(loginUrl);
  }

  // 2. Authenticated user logic
  if (user) {
    const rawCookieRole = request.cookies.get(ROLE_COOKIE_NAME)?.value;
    const metadataRole = (user.user_metadata?.role as string) || undefined;
    const isMasterAdmin =
      user.email === "admin@gmail.com" ||
      user.id === "00000000-0000-0000-0000-000000000030" ||
      metadataRole === "admin";

    const userRole = isMasterAdmin && rawCookieRole
      ? normalizeRole(rawCookieRole)
      : isMasterAdmin
      ? "admin"
      : normalizeRole(rawCookieRole || metadataRole);

    // If cookie was missing but metadata or master admin had role, set cookie in response
    if (!rawCookieRole) {
      supabaseResponse.cookies.set(ROLE_COOKIE_NAME, userRole, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
      });
    }

    // If logged in and visiting login page, redirect to default landing page
    if (pathname === "/auth/login") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname =
        isMasterAdmin
          ? "/admin/users"
          : userRole === "secretary"
          ? "/secretary"
          : "/portal";
      redirectUrl.search = "";
      return makeRedirect(redirectUrl);
    }

    // Administrators have full access across all views and cannot be locked out
    if (isMasterAdmin) {
      return supabaseResponse;
    }

    // Role-Based Access Control (RBAC) Rules for Non-Admins:
    // Rule A: /secretary is BLOCKED for dentists (secretary + admin allowed)
    if (pathname.startsWith("/secretary")) {
      if (userRole === "dentist") {
        const unauthUrl = request.nextUrl.clone();
        unauthUrl.pathname = "/auth/unauthorized";
        unauthUrl.searchParams.set("attempted", "/secretary");
        unauthUrl.searchParams.set("reason", "dentist_blocked");
        return makeRedirect(unauthUrl);
      }
    }

    // Rule B: /billing is BLOCKED for secretary (dentist + admin allowed)
    if (pathname.startsWith("/billing")) {
      if (userRole === "secretary") {
        const unauthUrl = request.nextUrl.clone();
        unauthUrl.pathname = "/auth/unauthorized";
        unauthUrl.searchParams.set("attempted", "/billing");
        unauthUrl.searchParams.set("reason", "billing_restricted");
        return makeRedirect(unauthUrl);
      }
    }

    // Rule C: /patients and /appointments are BLOCKED for secretary
    if (pathname.startsWith("/patients") || pathname.startsWith("/appointments")) {
      if (userRole === "secretary") {
        const unauthUrl = request.nextUrl.clone();
        unauthUrl.pathname = "/auth/unauthorized";
        unauthUrl.searchParams.set("attempted", pathname);
        unauthUrl.searchParams.set("reason", "clinical_restricted");
        return makeRedirect(unauthUrl);
      }
    }

    // Rule D: /admin is BLOCKED for non-admin roles (Admin only)
    if (pathname.startsWith("/admin")) {
      if (userRole !== "admin") {
        const unauthUrl = request.nextUrl.clone();
        unauthUrl.pathname = "/auth/unauthorized";
        unauthUrl.searchParams.set("attempted", "/admin/users");
        unauthUrl.searchParams.set("reason", "admin_restricted");
        return makeRedirect(unauthUrl);
      }
    }
  }

  return supabaseResponse;
}
