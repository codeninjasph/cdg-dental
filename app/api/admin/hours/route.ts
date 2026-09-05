import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  getBranchSchedulesAdmin,
  saveBranchSchedulesAdmin,
  copySchedulesToAllBranches,
  BranchScheduleInput,
} from "@/lib/db/admin";
import { ROLE_COOKIE_NAME } from "@/lib/supabase/get-user-role";

async function verifyAdminAuth(request: NextRequest): Promise<boolean> {
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
        user.email === "admin@cdgdental.com" ||
        user.email === "admin@gmail.com" ||
        user.id === "00000000-0000-0000-0000-000000000030" ||
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

/**
 * GET: Retrieve 7-day operating schedule for a branch
 */
export async function GET(request: NextRequest) {
  const isAdmin = await verifyAdminAuth(request);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized. Admin privileges required." },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branch_id");

    if (!branchId) {
      return NextResponse.json(
        { error: "branch_id parameter is required." },
        { status: 400 }
      );
    }

    const schedules = await getBranchSchedulesAdmin(branchId);
    return NextResponse.json({ schedules });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch branch operating schedule." },
      { status: 500 }
    );
  }
}

/**
 * PUT: Save/update 7-day operating schedule for a branch
 */
export async function PUT(request: NextRequest) {
  const isAdmin = await verifyAdminAuth(request);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized. Admin privileges required." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { branch_id, schedules, copy_to_all } = body;

    if (!branch_id) {
      return NextResponse.json(
        { error: "branch_id is required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(schedules) || schedules.length === 0) {
      return NextResponse.json(
        { error: "schedules array is required." },
        { status: 400 }
      );
    }

    const updated = await saveBranchSchedulesAdmin(
      branch_id,
      schedules as BranchScheduleInput[]
    );

    let replicatedCount = 0;
    if (copy_to_all) {
      replicatedCount = await copySchedulesToAllBranches(branch_id);
    }

    return NextResponse.json({
      success: true,
      schedules: updated,
      replicated_count: replicatedCount,
      message: copy_to_all
        ? `Operating schedule saved and replicated to ${replicatedCount} other branch(es).`
        : "Operating schedule saved successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save branch operating schedule." },
      { status: 500 }
    );
  }
}
