import { NextResponse, type NextRequest } from "next/server";
import { revokeStaffAccess } from "@/lib/db/admin";
import { ROLE_COOKIE_NAME } from "@/lib/supabase/get-user-role";

function checkAdminRole(request: NextRequest): boolean {
  const role = request.cookies.get(ROLE_COOKIE_NAME)?.value;
  return role === "admin";
}

export async function POST(request: NextRequest) {
  if (!checkAdminRole(request)) {
    return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
  }

  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    await revokeStaffAccess(userId);
    return NextResponse.json({ success: true, message: "Staff access revoked. Active sessions terminated." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to revoke staff access." }, { status: 400 });
  }
}
