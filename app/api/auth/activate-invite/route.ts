import { NextResponse, type NextRequest } from "next/server";
import { activateInvitedStaffUser } from "@/lib/db/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token, password } = body;

    if (!email || !token || !password) {
      return NextResponse.json(
        { error: "Email, invitation token, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const result = await activateInvitedStaffUser({ email, token, password });

    return NextResponse.json({
      success: true,
      message: `Account activated for ${result.fullName}!`,
      role: result.role,
      email: result.email,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to activate invitation." },
      { status: 400 }
    );
  }
}
