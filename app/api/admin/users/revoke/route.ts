import { NextResponse, type NextRequest } from "next/server";
import { revokeStaffAccess } from "@/lib/db/admin";
import { verifyAdminAuth } from "@/lib/supabase/verify-admin";

export async function POST(request: NextRequest) {
  const isAdmin = await verifyAdminAuth(request);
  if (!isAdmin) {
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
