import { type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { MASTER_ADMIN_ID, MASTER_ADMIN_EMAIL } from "@/types/admin";

/**
 * Verify whether an incoming request comes from an authenticated Administrator.
 * Validates the Supabase Auth session, checking master admin credentials, user metadata,
 * or the database profiles record to guarantee authenticity without trusting unverified cookies.
 */
export async function verifyAdminAuth(request: NextRequest): Promise<boolean> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return false;
    }

    // 1. Master administrator check by email or ID
    if (user.email === MASTER_ADMIN_EMAIL || user.id === MASTER_ADMIN_ID) {
      return true;
    }

    // 2. Auth user metadata check
    if (user.user_metadata?.role === "admin") {
      return true;
    }

    // 3. Database profile role check
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin") {
      return true;
    }
  } catch (err) {
    console.error("verifyAdminAuth error:", err);
  }

  return false;
}

