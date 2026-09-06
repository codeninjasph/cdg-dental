import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminAuth } from "@/lib/supabase/verify-admin";
import {
  getDentalServices,
  createDentalService,
  updateDentalService,
  deleteDentalService,
  DentalService,
} from "@/lib/db/services";
import { logAuditEvent } from "@/lib/db/audit";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || undefined;
  const onlyActive = searchParams.get("onlyActive") === "true";

  try {
    const services = await getDentalServices({ category, onlyActive });
    return NextResponse.json({ services });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch dental services" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const isAdmin = await verifyAdminAuth(request);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized. Administrator role required." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { code, category, name, description, base_price, min_price, max_price, default_duration_minutes, is_active, bookable_online, actorName, actorId, branchName } = body;

    if (!name || !category || base_price === undefined) {
      return NextResponse.json(
        { error: "Name, category, and base price are required." },
        { status: 400 }
      );
    }

    const created = await createDentalService({
      code,
      category,
      name,
      description,
      base_price: Number(base_price),
      min_price: min_price ? Number(min_price) : null,
      max_price: max_price ? Number(max_price) : null,
      default_duration_minutes: Number(default_duration_minutes) || 45,
      is_active: is_active !== undefined ? !!is_active : true,
      bookable_online: bookable_online !== undefined ? !!bookable_online : true,
    });

    // Log to immutable audit trail
    await logAuditEvent({
      actorId: actorId || null,
      actorName: actorName || "Clinic Administrator",
      actorRole: "admin",
      actionCategory: "pricing",
      actionType: "SERVICE_CREATED",
      entityType: "dental_service",
      entityId: created.id,
      description: `Added new clinical service: '${created.name}' (${created.category}) with standard base fee ₱${Number(created.base_price).toLocaleString()}.`,
      metadata: {
        service_id: created.id,
        code: created.code,
        category: created.category,
        base_price: created.base_price,
        duration: created.default_duration_minutes,
      },
      branchName: branchName || "Clinic-wide",
    });

    return NextResponse.json({ success: true, service: created });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create service" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const isAdmin = await verifyAdminAuth(request);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized. Administrator role required." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { id, actorName, actorId, branchName, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Service ID is required." }, { status: 400 });
    }

    const updated = await updateDentalService(id, updates);

    // Log to immutable audit trail
    await logAuditEvent({
      actorId: actorId || null,
      actorName: actorName || "Clinic Administrator",
      actorRole: "admin",
      actionCategory: "pricing",
      actionType: "SERVICE_UPDATED",
      entityType: "dental_service",
      entityId: id,
      description: `Modified service: '${updated.name}' — base price set to ₱${Number(updated.base_price).toLocaleString()}, status: ${updated.is_active ? "ACTIVE" : "INACTIVE"}.`,
      metadata: {
        service_id: id,
        updated_fields: Object.keys(updates),
        new_base_price: updated.base_price,
        is_active: updated.is_active,
      },
      branchName: branchName || "Clinic-wide",
    });

    return NextResponse.json({ success: true, service: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update service" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const isAdmin = await verifyAdminAuth(request);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized. Administrator role required." },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const actorName = searchParams.get("actorName") || "Clinic Administrator";

    if (!id) {
      return NextResponse.json({ error: "Service ID is required." }, { status: 400 });
    }

    await deleteDentalService(id);

    await logAuditEvent({
      actorName,
      actorRole: "admin",
      actionCategory: "pricing",
      actionType: "SERVICE_DELETED",
      entityType: "dental_service",
      entityId: id,
      description: `Removed clinical service (ID: ${id}) from master fee schedule.`,
      branchName: "Clinic-wide",
    });

    return NextResponse.json({ success: true, message: "Service deleted successfully." });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete service" },
      { status: 500 }
    );
  }
}
