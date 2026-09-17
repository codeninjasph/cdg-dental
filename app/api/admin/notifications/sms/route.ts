import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  sendSms,
  sendAppointmentReminderSms,
  sendPaymentReceiptSms,
  normalizePhilippinePhone,
} from "@/lib/sms/semaphore";
import { logAuditEvent } from "@/lib/db/audit";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authenticated user
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
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to dispatch SMS notifications." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, phone, patient_name } = body;

    if (!phone) {
      return NextResponse.json(
        { error: "Missing required parameter: phone number." },
        { status: 400 }
      );
    }

    const normalized = normalizePhilippinePhone(phone);
    if (!normalized) {
      return NextResponse.json(
        { error: `Invalid Philippine mobile number "${phone}". Format must be 09XXXXXXXXX.` },
        { status: 400 }
      );
    }

    let result;

    if (type === "reminder") {
      result = await sendAppointmentReminderSms({
        phone: normalized,
        patientName: patient_name || "Valued Patient",
        date: body.date || "Tomorrow",
        time: body.time || "Scheduled Time",
        branchName: body.branch_name || "CDG Dental Clinic",
        dentistName: body.dentist_name,
      });
    } else if (type === "receipt") {
      result = await sendPaymentReceiptSms({
        phone: normalized,
        patientName: patient_name || "Valued Patient",
        amount: Number(body.amount || 0),
        billNumber: body.bill_number || "INV-001",
        branchName: body.branch_name || "CDG Dental Clinic",
        balanceRemaining: body.balance_remaining !== undefined ? Number(body.balance_remaining) : undefined,
      });
    } else if (type === "custom") {
      if (!body.message) {
        return NextResponse.json(
          { error: "Missing message body for custom SMS notification." },
          { status: 400 }
        );
      }
      result = await sendSms({
        to: normalized,
        message: body.message,
      });
    } else {
      return NextResponse.json(
        { error: `Unsupported SMS type: "${type}". Allowed: reminder, receipt, custom.` },
        { status: 400 }
      );
    }

    // Record action into audit log
    await logAuditEvent({
      actorId: user.id,
      actorName: user.user_metadata?.full_name || user.email || "Staff User",
      actorRole: user.user_metadata?.role || "staff",
      actionCategory: "system",
      actionType: "sms_dispatch",
      entityType: "notification",
      entityId: normalized,
      description: `Dispatched ${type} SMS notification to ${normalized} (${result.status})`,
      metadata: {
        sms_type: type,
        recipient: normalized,
        status: result.status,
        success: result.success,
        simulated: result.status === "simulated",
      },
    });

    return NextResponse.json({
      success: result.success,
      status: result.status,
      recipient: result.recipient,
      messageId: result.messageId,
      error: result.error,
    });
  } catch (err: any) {
    console.error("[SMS Notification Route Error]:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error dispatching SMS." },
      { status: 500 }
    );
  }
}
