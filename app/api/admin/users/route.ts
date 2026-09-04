import { NextResponse, type NextRequest } from "next/server";
import { listStaffUsers, deleteStaffUser } from "@/lib/db/admin";
import { ROLE_COOKIE_NAME } from "@/lib/supabase/get-user-role";

function checkAdminRole(request: NextRequest): boolean {
  const role = request.cookies.get(ROLE_COOKIE_NAME)?.value;
  return role === "admin";
}

export async function GET(request: NextRequest) {
  if (!checkAdminRole(request)) {
    return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
  }

  try {
    const users = await listStaffUsers();
    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch staff directory" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!checkAdminRole(request)) {
    return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
  }

  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    await deleteStaffUser(userId);
    return NextResponse.json({ success: true, message: "Staff user removed successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete user." }, { status: 500 });
  }
}
