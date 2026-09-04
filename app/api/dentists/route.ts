import { NextResponse } from "next/server";
import { listDentists } from "@/lib/db/admin";
import { CDO_DENTISTS_DATA } from "@/lib/cdo-clinic-data";

export async function GET() {
  try {
    const dentists = await listDentists(true);
    return NextResponse.json({
      success: true,
      dentists: dentists.length > 0 ? dentists : CDO_DENTISTS_DATA,
    });
  } catch (error: any) {
    console.error("Error fetching public dentists:", error);
    // Graceful fallback to static data if database is temporarily unavailable
    return NextResponse.json({
      success: true,
      dentists: CDO_DENTISTS_DATA,
    });
  }
}
