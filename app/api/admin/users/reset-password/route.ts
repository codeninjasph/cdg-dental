import { NextResponse, type NextRequest } from "next/server";
import { generatePasswordResetToken, directAdminPasswordReset } from "@/lib/db/admin";
import { verifyAdminAuth } from "@/lib/supabase/verify-admin";

export async function POST(request: NextRequest) {
  const isAdmin = await verifyAdminAuth(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, action, newPassword } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    const origin = request.nextUrl.origin;

    if (action === "direct_reset") {
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters long." },
          { status: 400 }
        );
      }

      const result = await directAdminPasswordReset({ userId, password: newPassword });
      return NextResponse.json({
        success: true,
        message: `Password has been reset directly for ${result.fullName}.`,
      });
    }

    // Default action: generate reset token & link
    const result = await generatePasswordResetToken({ userId, origin });

    return NextResponse.json({
      success: true,
      token: result.token,
      resetUrl: result.resetUrl,
      email: result.email,
      fullName: result.fullName,
      message: `Password reset link generated for ${result.fullName}.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process password reset." },
      { status: 400 }
    );
  }
}
