import { NextResponse, type NextRequest } from "next/server";
import { getBranchSchedulesAdmin } from "@/lib/db/admin";

/**
 * GET: Public endpoint to fetch active operating schedules and open days for a branch
 */
export async function GET(request: NextRequest) {
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

    // Map open days of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const openDays = schedules
      .filter((s) => s.is_open)
      .map((s) => s.day_of_week);

    return NextResponse.json({
      success: true,
      branch_id: branchId,
      schedules,
      open_days: openDays,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve clinic operating hours." },
      { status: 500 }
    );
  }
}
