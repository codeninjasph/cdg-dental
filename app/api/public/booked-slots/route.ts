import { NextResponse, type NextRequest } from "next/server";
import { getPublicBookedSlots } from "@/lib/db/booking";

/**
 * GET: Retrieve occupied time slots from the database for conflict checking
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branch_id");
    const date = searchParams.get("date");
    const dentistId = searchParams.get("dentist_id");

    if (!branchId || !date) {
      return NextResponse.json(
        { error: "branch_id and date parameters are required." },
        { status: 400 }
      );
    }

    const bookedSlots = await getPublicBookedSlots(branchId, date, dentistId);
    return NextResponse.json({
      success: true,
      booked_slots: bookedSlots,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve booked slots from database." },
      { status: 500 }
    );
  }
}
