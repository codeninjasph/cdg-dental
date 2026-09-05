import { NextResponse } from "next/server";
import { getPublicClinicData } from "@/lib/db/booking";

/**
 * GET: Retrieve active branches, registered dentists, and service catalog directly from database
 */
export async function GET() {
  try {
    const data = await getPublicClinicData();
    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load clinic information from database." },
      { status: 500 }
    );
  }
}
