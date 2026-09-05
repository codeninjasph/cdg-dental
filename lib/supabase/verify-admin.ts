import { type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ROLE_COOKIE_NAME } from "@/lib/supabase/get-user-role";
import { MASTER_ADMIN_ID, MASTER_ADMIN_EMAIL } from "@/types/admin";

/**
 * Verify whether an incoming request comes from an authenticated Administrator.
 * Checks both the active role cookie AND the underlying Supabase Auth session/metadata,
 * ensuring administrators are never locked out even if they temporarily previewed another role.
 */
export async function verifyAdminAuth(request: NextRequest): Promise<boolean> {
  const roleCookie = request.cookies.get(ROLE_COOKIE_NAME)?.value;
  if (roleCookie === "admin") return true;

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
    } = await supabase.auth.getUser();

    if (user) {
      if (
        user.email === MASTER_ADMIN_EMAIL ||
        user.id === MASTER_ADMIN_ID ||
        user.user_metadata?.role === "admin"
      ) {
        return true;
      }
    }
  } catch {
    // fallback
  }

  return false;
}
