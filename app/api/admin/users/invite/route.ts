import { NextResponse, type NextRequest } from "next/server";
import { inviteStaffUser } from "@/lib/db/admin";
import { verifyAdminAuth } from "@/lib/supabase/verify-admin";

export async function POST(request: NextRequest) {
  const isAdmin = await verifyAdminAuth(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, fullName, role, branchId } = body;

    if (!email || !fullName || !role) {
      return NextResponse.json(
        { error: "Email, full name, and role are required." },
        { status: 400 }
      );
    }

    if (role !== "dentist" && role !== "secretary") {
      return NextResponse.json(
        { error: "Invalid role. Role must be 'dentist' or 'secretary'." },
        { status: 400 }
      );
    }

    const origin = request.nextUrl.origin;
    const { user, inviteUrl } = await inviteStaffUser({
      email,
      fullName,
      role,
      branchId,
      origin,
    });

    return NextResponse.json({
      success: true,
      user,
      inviteUrl,
      message: `Invitation generated successfully for ${fullName} (${role.toUpperCase()}).`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to invite staff member." },
      { status: 400 }
    );
  }
}
