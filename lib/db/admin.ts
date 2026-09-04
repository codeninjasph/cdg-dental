import { Pool } from "pg";
import crypto from "crypto";
import { normalizeRole } from "@/lib/supabase/get-user-role";
import { UserRole } from "@/types/dental";
import { StaffUserRecord, MASTER_ADMIN_ID, MASTER_ADMIN_EMAIL } from "@/types/admin";

export { MASTER_ADMIN_ID, MASTER_ADMIN_EMAIL };
export type { StaffUserRecord };

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const password = process.env.SUPABASE_DB_PASSWORD || "Hv2KRnXT1xS2IdEQ";
    const connectionString = `postgresql://postgres.zgtcgpfbhfuwwuiqdlcc:${password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

/**
 * List all staff profiles joined with auth metadata
 */
export async function listStaffUsers(): Promise<StaffUserRecord[]> {
  const db = getPool();
  const query = `
    SELECT 
      p.id,
      p.full_name,
      p.role,
      p.branch_id,
      p.phone,
      p.is_active,
      p.created_at,
      u.email,
      u.banned_until,
      u.email_confirmed_at,
      u.last_sign_in_at,
      u.invited_at,
      u.confirmation_token,
      b.name AS branch_name
    FROM public.profiles p
    LEFT JOIN auth.users u ON p.id = u.id
    LEFT JOIN public.branches b ON p.branch_id = b.id
    ORDER BY p.created_at DESC;
  `;

  const { rows } = await db.query(query);

  return rows.map((r: any) => {
    const isBanned = r.banned_until && new Date(r.banned_until) > new Date();
    const isPending = !r.email_confirmed_at && (r.invited_at || r.confirmation_token);

    let status: "active" | "revoked" | "pending_invite" = "active";
    if (r.is_active === false || isBanned) {
      status = "revoked";
    } else if (isPending) {
      status = "pending_invite";
    }

    return {
      id: r.id,
      email: r.email || null,
      full_name: r.full_name,
      role: normalizeRole(r.role),
      branch_id: r.branch_id || null,
      branch_name: r.branch_name || null,
      phone: r.phone || null,
      is_active: r.is_active !== false && !isBanned,
      status,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      last_sign_in_at: r.last_sign_in_at ? new Date(r.last_sign_in_at).toISOString() : null,
      invited_at: r.invited_at ? new Date(r.invited_at).toISOString() : null,
      invite_token: r.confirmation_token || null,
    };
  });
}

/**
 * Invite a new staff user (Doctor or Secretary)
 */
export async function inviteStaffUser({
  email,
  fullName,
  role,
  branchId,
  origin,
}: {
  email: string;
  fullName: string;
  role: "dentist" | "secretary";
  branchId?: string | null;
  origin: string;
}): Promise<{ user: StaffUserRecord; inviteUrl: string }> {
  const db = getPool();
  const cleanEmail = email.trim().toLowerCase();

  // 1. Verify email does not already exist
  const existingCheck = await db.query(
    "SELECT id FROM auth.users WHERE LOWER(email) = $1",
    [cleanEmail]
  );
  if (existingCheck.rows.length > 0) {
    throw new Error(`A staff user with email "${cleanEmail}" already exists.`);
  }

  const userId = crypto.randomUUID();
  const token = crypto.randomBytes(24).toString("hex");

  // DB role enum expectation: 'dentist' | 'secretary'
  const dbRole = role;

  const userMetaData = {
    sub: userId,
    email: cleanEmail,
    role: dbRole,
    full_name: fullName.trim(),
    branch_id: branchId || null,
  };

  // 2. Insert into auth.users as invited user
  await db.query(
    `
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      confirmation_token,
      confirmation_sent_at,
      invited_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      $1::uuid,
      'authenticated',
      'authenticated',
      $2,
      extensions.crypt($3, extensions.gen_salt('bf', 10)),
      $4,
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      $5::jsonb,
      now(),
      now()
    );
  `,
    [
      userId,
      cleanEmail,
      crypto.randomBytes(16).toString("hex"), // temporary random password
      token,
      JSON.stringify(userMetaData),
    ]
  );

  // 3. Insert into public.profiles
  await db.query(
    `
    INSERT INTO public.profiles (
      id,
      full_name,
      role,
      branch_id,
      is_active,
      created_at
    ) VALUES ($1::uuid, $2, $3::public.user_role, $4::uuid, true, now())
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      branch_id = EXCLUDED.branch_id,
      is_active = true;
  `,
    [userId, fullName.trim(), dbRole, branchId || null]
  );

  const inviteUrl = `${origin}/auth/sign-up?token=${token}&type=invite&email=${encodeURIComponent(
    cleanEmail
  )}`;

  const user: StaffUserRecord = {
    id: userId,
    email: cleanEmail,
    full_name: fullName.trim(),
    role,
    branch_id: branchId || null,
    branch_name: null,
    phone: null,
    is_active: true,
    status: "pending_invite",
    created_at: new Date().toISOString(),
    last_sign_in_at: null,
    invited_at: new Date().toISOString(),
    invite_token: token,
  };

  return { user, inviteUrl };
}

/**
 * Revoke staff access (bans user and kills active sessions)
 */
export async function revokeStaffAccess(userId: string): Promise<void> {
  if (userId === MASTER_ADMIN_ID) {
    throw new Error("Master administrator account cannot be revoked.");
  }

  const db = getPool();

  // Safety check: do not revoke admin accounts
  const check = await db.query("SELECT role, email FROM public.profiles p LEFT JOIN auth.users u ON p.id = u.id WHERE p.id = $1", [userId]);
  if (check.rows.length > 0) {
    if (check.rows[0].role === "admin" || check.rows[0].email === MASTER_ADMIN_EMAIL) {
      throw new Error("Administrator accounts cannot be revoked.");
    }
  }

  // 1. Mark inactive in profiles
  await db.query("UPDATE public.profiles SET is_active = false WHERE id = $1::uuid", [userId]);

  // 2. Ban in auth.users until year 3000
  await db.query(
    "UPDATE auth.users SET banned_until = '3000-01-01 00:00:00+00', updated_at = now() WHERE id = $1::uuid",
    [userId]
  );

  // 3. Clear active auth sessions
  try {
    await db.query("DELETE FROM auth.sessions WHERE user_id = $1::uuid", [userId]);
  } catch (e) {
    // Ignore if sessions table structure differs
  }
}

/**
 * Restore previously revoked staff access
 */
export async function restoreStaffAccess(userId: string): Promise<void> {
  const db = getPool();

  await db.query("UPDATE public.profiles SET is_active = true WHERE id = $1::uuid", [userId]);
  await db.query("UPDATE auth.users SET banned_until = NULL, updated_at = now() WHERE id = $1::uuid", [userId]);
}

/**
 * Permanently delete a staff user
 */
export async function deleteStaffUser(userId: string): Promise<void> {
  if (userId === MASTER_ADMIN_ID) {
    throw new Error("Master administrator account cannot be deleted.");
  }

  const db = getPool();

  // Verify not admin
  const check = await db.query("SELECT role FROM public.profiles WHERE id = $1", [userId]);
  if (check.rows.length > 0 && check.rows[0].role === "admin") {
    throw new Error("Administrator accounts cannot be deleted.");
  }

  // Delete profile and auth user
  await db.query("DELETE FROM public.profiles WHERE id = $1::uuid", [userId]);
  await db.query("DELETE FROM auth.identities WHERE user_id = $1::uuid", [userId]);
  await db.query("DELETE FROM auth.users WHERE id = $1::uuid", [userId]);
}
