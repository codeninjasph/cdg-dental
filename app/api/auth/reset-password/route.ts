import { NextResponse, type NextRequest } from "next/server";
import { resetStaffPasswordWithToken } from "@/lib/db/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token, password } = body;

    if (!email || !token || !password) {
      return NextResponse.json(
        { error: "Email, reset token, and new password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const result = await resetStaffPasswordWithToken({ email, token, password });

    return NextResponse.json({
      success: true,
      message: `Password successfully updated for ${result.fullName}!`,
      role: result.role,
      email: result.email,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to reset password." },
      { status: 400 }
    );
  }
}
