import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminAuth } from "@/lib/supabase/verify-admin";
import { getAuditLogs, logAuditEvent, AuditActionCategory } from "@/lib/db/audit";

export async function GET(request: NextRequest) {
  const isAdmin = await verifyAdminAuth(request);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized. Administrator privileges required." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || undefined;
  const actorId = searchParams.get("actorId") || undefined;
  const searchQuery = searchParams.get("query") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 200;

  try {
    const logs = await getAuditLogs({
      category,
      actorId,
      searchQuery,
      startDate,
      endDate,
      limit,
    });
    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      actorId,
      actorName,
      actorRole,
      actionCategory,
      actionType,
      entityType,
      entityId,
      description,
      metadata,
      branchId,
      branchName,
    } = body;

    if (!actorName || !actionCategory || !actionType || !description) {
      return NextResponse.json(
        { error: "Missing required audit parameters" },
        { status: 400 }
      );
    }

    const created = await logAuditEvent({
      actorId,
      actorName,
      actorRole: actorRole || "staff",
      actionCategory: actionCategory as AuditActionCategory,
      actionType,
      entityType,
      entityId,
      description,
      metadata,
      branchId,
      branchName,
    });

    return NextResponse.json({ success: true, log: created });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to record audit log" },
      { status: 500 }
    );
  }
}
