import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  listDentists,
  createDentistAdmin,
  updateDentistAdmin,
  deleteDentistAdmin,
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
        user.email === "admin@gmail.com" ||
        user.id === "00000000-0000-0000-0000-000000000030" ||
        user.user_metadata?.role === "admin"
      ) {
        return true;
      }
    }
  } catch {
    // fallback to false
  }

  return false;
}

/**
 * GET: List all dentists for administration (both active and inactive)
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
    const dentists = await listDentists(false);
    return NextResponse.json({ dentists });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch dentists." },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new dentist profile
 */
export async function POST(request: NextRequest) {
  const isAdmin = await verifyAdminAuth(request);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized. Admin privileges required." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      name,
      title,
      prc_license,
      photo_url,
      specialty,
      education,
      certifications,
      experience_years,
      bio,
      clinic_days,
      display_order,
      is_active,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Doctor full name is required." },
        { status: 400 }
      );
    }
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Doctor title/role is required." },
        { status: 400 }
      );
    }
    if (!specialty || !specialty.trim()) {
      return NextResponse.json(
        { error: "Primary clinical specialty is required." },
        { status: 400 }
      );
    }

    const dentist = await createDentistAdmin({
      name,
      title,
      prc_license: prc_license || "Pending PRC",
      photo_url: photo_url || "/images/dentist-dr-kenneth.jpg",
      specialty,
      education,
      certifications: Array.isArray(certifications) ? certifications : [],
      experience_years: experience_years ? Number(experience_years) : 5,
      bio,
      clinic_days: Array.isArray(clinic_days) ? clinic_days : [],
      display_order: display_order ? Number(display_order) : 0,
      is_active: is_active !== undefined ? is_active : true,
    });

    return NextResponse.json({
      success: true,
      dentist,
      message: `Doctor profile for "${dentist.name}" created successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create doctor profile." },
      { status: 500 }
    );
  }
}

/**
 * PUT: Update dentist profile details and photo
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
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Dentist ID is required." },
        { status: 400 }
      );
    }

    const updated = await updateDentistAdmin(id, data);

    return NextResponse.json({
      success: true,
      dentist: updated,
      message: `Doctor profile "${updated.name}" updated successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update dentist profile." },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Remove a dentist profile
 */
export async function DELETE(request: NextRequest) {
  const isAdmin = await verifyAdminAuth(request);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized. Admin privileges required." },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Dentist ID parameter is required." },
        { status: 400 }
      );
    }

    await deleteDentistAdmin(id);

    return NextResponse.json({
      success: true,
      message: "Dentist profile removed successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete dentist profile." },
      { status: 500 }
    );
  }
}
