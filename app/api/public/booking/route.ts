import { NextResponse, type NextRequest } from "next/server";
import { createPublicBooking } from "@/lib/db/booking";

/**
 * POST: Create an appointment directly in PostgreSQL database for online public booking
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await createPublicBooking({
      branch_id: body.branch_id,
      service_id: body.service_id,
      service_title: body.service_title,
      dentist_id: body.dentist_id,
      date: body.date,
      time: body.time,
      first_name: body.first_name,
      last_name: body.last_name,
      phone: body.phone,
      email: body.email,
      notes: body.notes,
      has_medical_alert: Boolean(body.has_medical_alert),
      medical_alert_details: body.medical_alert_details,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process appointment booking." },
      { status: 400 }
    );
  }
}
