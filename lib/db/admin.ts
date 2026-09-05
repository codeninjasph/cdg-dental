import { Pool } from "pg";
import crypto from "crypto";
import { normalizeRole } from "@/lib/supabase/get-user-role";
import { UserRole, BranchSchedule } from "@/types/dental";
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
      u.recovery_token,
      b.name AS branch_name,
      (SELECT COUNT(*) FROM public.treatments t WHERE t.dentist_id = p.id) AS treatment_count,
      (SELECT COUNT(*) FROM public.payment_logs pl WHERE pl.logged_by = p.id) AS payment_count,
      (SELECT COUNT(*) FROM public.appointments a WHERE a.dentist_id = p.id) AS appointment_count
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
      recovery_token: r.recovery_token || null,
      treatment_count: Number(r.treatment_count || 0),
      payment_count: Number(r.payment_count || 0),
      appointment_count: Number(r.appointment_count || 0),
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
      recovery_token,
      email_change_token_new,
      email_change_token_current,
      email_change,
      phone_change,
      phone_change_token,
      reauthentication_token,
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
      '',
      '',
      '',
      '',
      '',
      '',
      '',
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

  // 2b. Insert into auth.identities for GoTrue schema compatibility
  await db.query(
    `
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      $1::uuid,
      $2::jsonb,
      'email',
      $1::text,
      now(),
      now(),
      now()
    )
    ON CONFLICT (provider, provider_id) DO UPDATE SET
      identity_data = EXCLUDED.identity_data,
      updated_at = now();
    `,
    [
      userId,
      JSON.stringify({
        sub: userId,
        role: dbRole,
        email: cleanEmail,
        full_name: fullName.trim(),
        email_verified: false,
        phone_verified: false,
      }),
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

  // 4. Automatically harmonize invited dentists into public.dentists
  if (role === "dentist") {
    await db.query(
      `
      INSERT INTO public.dentists (
        id, name, title, prc_license, photo_url, specialty, education,
        certifications, experience_years, bio, clinic_days, display_order, is_active
      ) VALUES (
        $1, $2, 'Attending Dental Specialist', 'PRC Verified', '/images/dentist-dr-kenneth.jpg',
        'General Dental Medicine & Patient Care', 'Doctor of Dental Medicine', '[]'::jsonb,
        5, 'Dedicated dental specialist at CDG Dental Clinic delivering gentle, modern clinical care.',
        '[]'::jsonb, 99, true
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        is_active = true;
      `,
      [userId, fullName.trim()]
    );
  }

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
 * Activate invited staff user by validating confirmation_token and setting password
 */
export async function activateInvitedStaffUser({
  email,
  token,
  password,
}: {
  email: string;
  token: string;
  password: string;
}): Promise<{ success: boolean; role: string; fullName: string; email: string }> {
  const db = getPool();
  const cleanEmail = email.trim().toLowerCase();
  const cleanToken = token.trim();

  if (!cleanEmail || !cleanToken || !password) {
    throw new Error("Email, invitation token, and password are required.");
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  // 1. Find user in auth.users by email
  const userQuery = await db.query(
    `
    SELECT 
      u.id, 
      u.email, 
      u.confirmation_token, 
      u.email_confirmed_at,
      p.full_name, 
      p.role
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE LOWER(u.email) = $1
    `,
    [cleanEmail]
  );

  if (userQuery.rows.length === 0) {
    throw new Error("No staff invitation found for this email address. Please contact your clinic administrator.");
  }

  const row = userQuery.rows[0];

  // If already activated and confirmed with no pending token
  if (row.email_confirmed_at && (!row.confirmation_token || row.confirmation_token === "")) {
    throw new Error("This account is already activated. Please sign in with your email and password.");
  }

  // Check confirmation token matches
  if (!row.confirmation_token || row.confirmation_token !== cleanToken) {
    throw new Error("Invalid or expired invitation link. Please request a new invitation from your administrator.");
  }

  // 2. Set permanent password and confirm email in auth.users
  await db.query(
    `
    UPDATE auth.users
    SET 
      encrypted_password = extensions.crypt($1, extensions.gen_salt('bf', 10)),
      email_confirmed_at = now(),
      confirmation_token = '',
      recovery_token = '',
      email_change_token_new = '',
      email_change_token_current = '',
      email_change = '',
      reauthentication_token = '',
      updated_at = now()
    WHERE id = $2::uuid
    `,
    [password, row.id]
  );

  // 2b. Ensure identity exists and is verified in auth.identities
  await db.query(
    `
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      $1::uuid,
      $2::jsonb,
      'email',
      $1::text,
      now(),
      now(),
      now()
    )
    ON CONFLICT (provider, provider_id) DO UPDATE SET
      identity_data = EXCLUDED.identity_data,
      updated_at = now();
    `,
    [
      row.id,
      JSON.stringify({
        sub: row.id,
        role: row.role || "secretary",
        email: cleanEmail,
        full_name: row.full_name || cleanEmail,
        email_verified: true,
        phone_verified: false,
      }),
    ]
  );

  // 3. Ensure profile is marked active in public.profiles
  await db.query(
    `
    UPDATE public.profiles
    SET is_active = true
    WHERE id = $1::uuid
    `,
    [row.id]
  );

  return {
    success: true,
    role: row.role || "secretary",
    fullName: row.full_name || cleanEmail,
    email: cleanEmail,
  };
}

/**
 * Generate a password reset recovery token and reset URL for a staff user
 */
export async function generatePasswordResetToken({
  userId,
  origin,
}: {
  userId: string;
  origin: string;
}): Promise<{ token: string; resetUrl: string; email: string; fullName: string }> {
  const db = getPool();

  const userQuery = await db.query(
    `
    SELECT u.id, u.email, p.full_name
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.id = $1::uuid
    `,
    [userId]
  );

  if (userQuery.rows.length === 0) {
    throw new Error("Staff user not found.");
  }

  const row = userQuery.rows[0];
  const email = row.email;
  if (!email) {
    throw new Error("This user does not have a linked email address.");
  }

  const token = crypto.randomBytes(24).toString("hex");

  await db.query(
    `
    UPDATE auth.users
    SET 
      recovery_token = $1,
      recovery_sent_at = now(),
      updated_at = now()
    WHERE id = $2::uuid
    `,
    [token, userId]
  );

  const resetUrl = `${origin}/auth/update-password?token=${token}&email=${encodeURIComponent(email)}`;

  return {
    token,
    resetUrl,
    email,
    fullName: row.full_name || email,
  };
}

/**
 * Reset staff password using the recovery token
 */
export async function resetStaffPasswordWithToken({
  email,
  token,
  password,
}: {
  email: string;
  token: string;
  password: string;
}): Promise<{ success: boolean; role: string; fullName: string; email: string }> {
  const db = getPool();
  const cleanEmail = email.trim().toLowerCase();
  const cleanToken = token.trim();

  if (!cleanEmail || !cleanToken || !password) {
    throw new Error("Email, reset token, and new password are required.");
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  const userQuery = await db.query(
    `
    SELECT u.id, u.email, u.recovery_token, p.full_name, p.role
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE LOWER(u.email) = $1
    `,
    [cleanEmail]
  );

  if (userQuery.rows.length === 0) {
    throw new Error("No account found for this email address.");
  }

  const row = userQuery.rows[0];

  if (!row.recovery_token || row.recovery_token !== cleanToken) {
    throw new Error("Invalid or expired password reset token. Please request a new link from your administrator.");
  }

  // Update password in auth.users
  await db.query(
    `
    UPDATE auth.users
    SET 
      encrypted_password = extensions.crypt($1, extensions.gen_salt('bf', 10)),
      recovery_token = '',
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = $2::uuid
    `,
    [password, row.id]
  );

  return {
    success: true,
    role: row.role || "dentist",
    fullName: row.full_name || cleanEmail,
    email: cleanEmail,
  };
}

/**
 * Direct admin password reset (override)
 */
export async function directAdminPasswordReset({
  userId,
  password,
}: {
  userId: string;
  password: string;
}): Promise<{ success: boolean; fullName: string; email: string }> {
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  const db = getPool();

  const userQuery = await db.query(
    `
    SELECT u.id, u.email, p.full_name
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.id = $1::uuid
    `,
    [userId]
  );

  if (userQuery.rows.length === 0) {
    throw new Error("User not found.");
  }

  const row = userQuery.rows[0];

  await db.query(
    `
    UPDATE auth.users
    SET 
      encrypted_password = extensions.crypt($1, extensions.gen_salt('bf', 10)),
      recovery_token = '',
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = $2::uuid
    `,
    [password, userId]
  );

  return {
    success: true,
    fullName: row.full_name || row.email,
    email: row.email,
  };
}

/**
 * Revoke staff access (bans user, deactivates doctor directory entry, and kills active sessions)
 */
export async function revokeStaffAccess(userId: string): Promise<void> {
  if (userId === MASTER_ADMIN_ID) {
    throw new Error("Master administrator account cannot be revoked.");
  }

  const db = getPool();

  // Safety check: do not revoke admin accounts
  const check = await db.query(
    "SELECT role, email FROM public.profiles p LEFT JOIN auth.users u ON p.id = u.id WHERE p.id = $1",
    [userId]
  );
  if (check.rows.length > 0) {
    if (check.rows[0].role === "admin" || check.rows[0].email === MASTER_ADMIN_EMAIL) {
      throw new Error("Administrator accounts cannot be revoked.");
    }
  }

  // 1. Mark inactive in public.profiles
  await db.query("UPDATE public.profiles SET is_active = false WHERE id = $1::uuid", [userId]);

  // 2. Synchronize with public.dentists so revoked doctors are immediately hidden from public booking
  await db.query("UPDATE public.dentists SET is_active = false WHERE id = $1", [userId]);

  // 3. Ban in auth.users until year 3000
  await db.query(
    "UPDATE auth.users SET banned_until = '3000-01-01 00:00:00+00', updated_at = now() WHERE id = $1::uuid",
    [userId]
  );

  // 4. Clear active auth sessions
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

  // 1. Mark active in public.profiles
  await db.query("UPDATE public.profiles SET is_active = true WHERE id = $1::uuid", [userId]);

  // 2. Restore active status in public.dentists
  await db.query("UPDATE public.dentists SET is_active = true WHERE id = $1", [userId]);

  // 3. Clear ban in auth.users
  await db.query(
    "UPDATE auth.users SET banned_until = NULL, updated_at = now() WHERE id = $1::uuid",
    [userId]
  );
}

/**
 * Permanently delete a staff user
 * Protects medical and financial audit history: if the practitioner has recorded clinical treatments
 * or cashier payment transactions, deletion is rejected with instructions to Revoke instead.
 */
export async function deleteStaffUser(userId: string): Promise<void> {
  if (userId === MASTER_ADMIN_ID) {
    throw new Error("Master administrator account cannot be deleted.");
  }

  const db = getPool();

  // 1. Verify not master admin or admin role
  const check = await db.query(
    "SELECT p.role, p.full_name, u.email FROM public.profiles p LEFT JOIN auth.users u ON p.id = u.id WHERE p.id = $1",
    [userId]
  );
  if (check.rows.length > 0 && (check.rows[0].role === "admin" || check.rows[0].email === MASTER_ADMIN_EMAIL)) {
    throw new Error("Administrator accounts cannot be deleted.");
  }

  const staffName = check.rows[0]?.full_name || "this staff member";

  // 2. Audit Safety Check: check for clinical treatments and cashier payment logs
  const treatmentsCheck = await db.query(
    "SELECT COUNT(*) AS count FROM public.treatments WHERE dentist_id = $1::uuid",
    [userId]
  );
  const treatmentsCount = parseInt(treatmentsCheck.rows[0]?.count || "0", 10);

  const paymentsCheck = await db.query(
    "SELECT COUNT(*) AS count FROM public.payment_logs WHERE logged_by = $1::uuid",
    [userId]
  );
  const paymentsCount = parseInt(paymentsCheck.rows[0]?.count || "0", 10);

  if (treatmentsCount > 0 || paymentsCount > 0) {
    const reasons: string[] = [];
    if (treatmentsCount > 0) reasons.push(`${treatmentsCount} medical treatment record(s)`);
    if (paymentsCount > 0) reasons.push(`${paymentsCount} financial payment transaction(s)`);
    throw new Error(
      `Cannot permanently delete "${staffName}" because they have ${reasons.join(" and ")} recorded in the clinic audit ledger. In compliance with clinical governance and legal records retention regulations, please click "Revoke" instead to disable their account while keeping clinical history intact.`
    );
  }

  // 3. Clean up non-audit dependencies (unstarted appointments, documents, bills)
  // Delete draft / empty appointments assigned to this staff
  await db.query("DELETE FROM public.appointments WHERE dentist_id = $1::uuid", [userId]);

  // Disassociate document uploaded_by
  await db.query("UPDATE public.patient_documents SET uploaded_by = NULL WHERE uploaded_by = $1::uuid", [userId]);

  // Disassociate any blank bills
  await db.query("UPDATE public.treatment_bills SET dentist_id = NULL WHERE dentist_id = $1::uuid", [userId]);

  // 4. Remove from public.dentists (to prevent ghost doctors on website)
  await db.query("DELETE FROM public.dentists WHERE id = $1", [userId]);

  // 5. Delete profile, auth identities, and auth user
  await db.query("DELETE FROM public.profiles WHERE id = $1::uuid", [userId]);
  await db.query("DELETE FROM auth.identities WHERE user_id = $1::uuid", [userId]);
  await db.query("DELETE FROM auth.users WHERE id = $1::uuid", [userId]);
}

/**
 * Update staff branch assignment
 */
export async function updateStaffBranch(
  userId: string,
  branchId: string | null
): Promise<StaffUserRecord> {
  const db = getPool();

  // 1. If branchId is provided, verify it exists and is active
  if (branchId) {
    const branchCheck = await db.query(
      "SELECT id, name FROM public.branches WHERE id = $1::uuid",
      [branchId]
    );
    if (branchCheck.rows.length === 0) {
      throw new Error("Specified clinic branch does not exist.");
    }
  }

  // 2. Update public.profiles
  const profileRes = await db.query(
    `UPDATE public.profiles
     SET branch_id = $1::uuid
     WHERE id = $2::uuid
     RETURNING id, full_name, role, branch_id, phone, is_active, created_at;`,
    [branchId || null, userId]
  );

  if (profileRes.rows.length === 0) {
    throw new Error("Staff user profile not found.");
  }

  // 3. Sync metadata in auth.users
  try {
    if (branchId) {
      await db.query(
        `UPDATE auth.users
         SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('branch_id', $1::text),
             updated_at = now()
         WHERE id = $2::uuid;`,
        [branchId, userId]
      );
    } else {
      await db.query(
        `UPDATE auth.users
         SET raw_user_meta_data = (COALESCE(raw_user_meta_data, '{}'::jsonb) - 'branch_id') || jsonb_build_object('branch_id', null),
             updated_at = now()
         WHERE id = $1::uuid;`,
        [userId]
      );
    }
  } catch (e) {
    console.warn("Could not sync auth.users metadata for branch:", e);
  }

  // 4. Return updated staff record
  const updatedUserQuery = `
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
    WHERE p.id = $1::uuid;
  `;

  const { rows } = await db.query(updatedUserQuery, [userId]);
  if (rows.length === 0) {
    throw new Error("Staff user profile not found after update.");
  }

  const r = rows[0];
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
}

export interface BranchWithStats {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  appointment_count: number;
  staff_count: number;
}

/**
 * List all clinic branches joined with dependent appointment & staff counts
 */
export async function listBranchesWithStatsAdmin(): Promise<BranchWithStats[]> {
  const db = getPool();
  const query = `
    SELECT 
      b.id,
      b.name,
      b.address,
      b.phone,
      b.email,
      b.is_active,
      b.created_at,
      COUNT(DISTINCT a.id)::int AS appointment_count,
      COUNT(DISTINCT p.id)::int AS staff_count
    FROM public.branches b
    LEFT JOIN public.appointments a ON a.branch_id = b.id
    LEFT JOIN public.profiles p ON p.branch_id = b.id
    GROUP BY b.id
    ORDER BY b.created_at ASC;
  `;

  const { rows } = await db.query(query);
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    address: r.address || null,
    phone: r.phone || null,
    email: r.email || null,
    is_active: Boolean(r.is_active),
    created_at: r.created_at,
    appointment_count: Number(r.appointment_count || 0),
    staff_count: Number(r.staff_count || 0),
  }));
}

/**
 * Create a new clinic branch
 */
export async function createBranchAdmin(data: {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
}): Promise<BranchWithStats> {
  const db = getPool();

  const query = `
    INSERT INTO public.branches (name, address, phone, email, is_active)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, name, address, phone, email, is_active, created_at;
  `;

  const { rows } = await db.query(query, [
    data.name.trim(),
    data.address?.trim() || null,
    data.phone?.trim() || null,
    data.email?.trim()?.toLowerCase() || null,
    data.is_active !== undefined ? data.is_active : true,
  ]);

  const created = rows[0];
  return {
    id: created.id,
    name: created.name,
    address: created.address,
    phone: created.phone,
    email: created.email,
    is_active: Boolean(created.is_active),
    created_at: created.created_at,
    appointment_count: 0,
    staff_count: 0,
  };
}

/**
 * Update an existing clinic branch
 */
export async function updateBranchAdmin(
  id: string,
  data: Partial<{
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    is_active: boolean;
  }>
): Promise<BranchWithStats> {
  const db = getPool();

  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(data.name.trim());
  }
  if (data.address !== undefined) {
    setClauses.push(`address = $${paramIndex++}`);
    values.push(data.address ? data.address.trim() : null);
  }
  if (data.phone !== undefined) {
    setClauses.push(`phone = $${paramIndex++}`);
    values.push(data.phone ? data.phone.trim() : null);
  }
  if (data.email !== undefined) {
    setClauses.push(`email = $${paramIndex++}`);
    values.push(data.email ? data.email.trim().toLowerCase() : null);
  }
  if (data.is_active !== undefined) {
    setClauses.push(`is_active = $${paramIndex++}`);
    values.push(Boolean(data.is_active));
  }

  if (setClauses.length === 0) {
    throw new Error("No fields provided to update.");
  }

  values.push(id);
  const query = `
    UPDATE public.branches
    SET ${setClauses.join(", ")}
    WHERE id = $${paramIndex}::uuid
    RETURNING id, name, address, phone, email, is_active, created_at;
  `;

  const { rows } = await db.query(query, values);
  if (rows.length === 0) {
    throw new Error("Branch not found.");
  }

  // Get current stats
  const statsQuery = `
    SELECT 
      COUNT(DISTINCT a.id)::int AS appointment_count,
      COUNT(DISTINCT p.id)::int AS staff_count
    FROM public.branches b
    LEFT JOIN public.appointments a ON a.branch_id = b.id
    LEFT JOIN public.profiles p ON p.branch_id = b.id
    WHERE b.id = $1::uuid
    GROUP BY b.id;
  `;
  const statsRes = await db.query(statsQuery, [id]);
  const stats = statsRes.rows[0] || { appointment_count: 0, staff_count: 0 };

  const updated = rows[0];
  return {
    id: updated.id,
    name: updated.name,
    address: updated.address,
    phone: updated.phone,
    email: updated.email,
    is_active: Boolean(updated.is_active),
    created_at: updated.created_at,
    appointment_count: Number(stats.appointment_count || 0),
    staff_count: Number(stats.staff_count || 0),
  };
}

/**
 * Remove or safely archive a clinic branch
 */
export async function deleteBranchAdmin(
  id: string,
  force = false
): Promise<{ deleted: boolean; deactivated: boolean; message: string }> {
  const db = getPool();

  // Check dependencies
  const depQuery = `
    SELECT 
      COUNT(DISTINCT a.id)::int AS appointment_count,
      COUNT(DISTINCT p.id)::int AS staff_count
    FROM public.branches b
    LEFT JOIN public.appointments a ON a.branch_id = b.id
    LEFT JOIN public.profiles p ON p.branch_id = b.id
    WHERE b.id = $1::uuid
    GROUP BY b.id;
  `;
  const depRes = await db.query(depQuery, [id]);
  const stats = depRes.rows[0] || { appointment_count: 0, staff_count: 0 };

  const apptCount = Number(stats.appointment_count || 0);
  const staffCount = Number(stats.staff_count || 0);

  // If there are existing appointments, we MUST NOT delete hard (foreign key violation + loss of medical record audit)
  if (apptCount > 0 && !force) {
    await db.query("UPDATE public.branches SET is_active = false WHERE id = $1::uuid", [id]);
    return {
      deleted: false,
      deactivated: true,
      message: `Branch has ${apptCount} historical appointments and was safely deactivated/archived to preserve clinical audit trails.`,
    };
  }

  // Unlink assigned staff if any
  if (staffCount > 0) {
    await db.query("UPDATE public.profiles SET branch_id = NULL WHERE branch_id = $1::uuid", [id]);
  }

  // If appointments exist and force is true, we still archive to preserve schema integrity
  if (apptCount > 0) {
    await db.query("UPDATE public.branches SET is_active = false WHERE id = $1::uuid", [id]);
    return {
      deleted: false,
      deactivated: true,
      message: `Branch unlinked from ${staffCount} staff and deactivated. Historical appointment references preserved.`,
    };
  }

  // 0 appointments -> Safe for permanent deletion
  const delRes = await db.query("DELETE FROM public.branches WHERE id = $1::uuid RETURNING id", [id]);
  if (delRes.rows.length === 0) {
    throw new Error("Branch not found.");
  }

  return {
    deleted: true,
    deactivated: false,
    message: "Branch permanently deleted.",
  };
}

export interface DentistRecord {
  id: string;
  name: string;
  title: string;
  prc_license: string;
  photo_url: string;
  specialty: string;
  education: string | null;
  certifications: string[];
  experience_years: number;
  bio: string | null;
  clinic_days: { branchName: string; days: string; hours: string }[];
  display_order: number;
  is_active: boolean;
  created_at: string;
}

/**
 * Ensures public.dentists table exists and is populated with initial specialist profiles
 */
export async function ensureDentistsTable(): Promise<void> {
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS public.dentists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      prc_license TEXT NOT NULL,
      photo_url TEXT NOT NULL,
      specialty TEXT NOT NULL,
      education TEXT,
      certifications JSONB DEFAULT '[]'::jsonb,
      experience_years INT DEFAULT 5,
      bio TEXT,
      clinic_days JSONB DEFAULT '[]'::jsonb,
      display_order INT DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  const countRes = await db.query("SELECT COUNT(*)::int AS count FROM public.dentists;");
  if (countRes.rows[0]?.count === 0) {
    const initialDentists = [
      {
        id: "3cb85fbe-8060-4347-915a-1d400aa160ca",
        name: "Dr. Kenneth Galve, DDM, FICOI",
        title: "Lead Dental Surgeon & Cosmetic Dentistry Specialist",
        prc_license: "0074218",
        photo_url: "/images/dentist-dr-kenneth.jpg",
        specialty: "Cosmetic Smile Design, Porcelain Veneers & Full Mouth Rehabilitation",
        education: "Doctor of Dental Medicine, University of the Philippines Manila (UPM)",
        certifications: [
          "Fellow, International Congress of Oral Implantologists (FICOI)",
          "Certified Digital Smile Design (DSD) Clinician",
          "Active Member, Philippine Dental Association (PDA - CDO Chapter)",
        ],
        experience_years: 14,
        bio: "A native of Northern Mindanao, Dr. Galve combines clinical rigor with artistic precision. Known for transformative porcelain veneers and complex full-arch rehabilitation, he is dedicated to delivering hospital-grade, pain-free dental care to Cagayan de Oro families.",
        clinic_days: [
          { branchName: "Downtown (Limketkai)", days: "Mon, Wed, Fri", hours: "9:00 AM – 5:00 PM" },
          { branchName: "Uptown (Pueblo de Oro)", days: "Tue, Thu, Sat", hours: "9:00 AM – 6:00 PM" },
        ],
        display_order: 1,
      },
      {
        id: "00000000-0000-0000-0000-000000000011",
        name: "Dr. Andrea Reyes, DDM, MS (Ortho)",
        title: "Specialist Orthodontist & Clear Aligner Provider",
        prc_license: "0081943",
        photo_url: "/images/dentist-dr-andrea.jpg",
        specialty: "Clear Invisible Aligners, Self-Ligating Braces & Adolescent Orthodontics",
        education: "Master of Science in Orthodontics, Centro Escolar University; DDM, University of the East",
        certifications: [
          "Certified Clear Aligner Provider",
          "Member, Association of Philippine Orthodontists (APO)",
          "Specialist in Low-Friction Damon Self-Ligating Systems",
        ],
        experience_years: 11,
        bio: "Dr. Reyes has straightened over 1,500 smiles across Mindanao. Her philosophy centers on gentle, non-extraction orthodontic planning whenever possible, harmonizing facial aesthetics with long-term bite stability.",
        clinic_days: [
          { branchName: "Downtown (Limketkai)", days: "Tue, Thu, Sat", hours: "9:00 AM – 5:00 PM" },
        ],
        display_order: 2,
      },
      {
        id: "00000000-0000-0000-0000-000000000012",
        name: "Dr. Marcus Lim, DDM, MSc (Perio)",
        title: "Periodontist & Oral Implantologist",
        prc_license: "0069312",
        photo_url: "/images/dentist-dr-marcus.jpg",
        specialty: "Advanced Gum Disease Laser Surgery, Bone Grafting & Dental Implants",
        education: "Residency in Periodontal Surgery, University of the Philippines - PGH; DDM, CEU",
        certifications: [
          "Diplomate Eligible, Philippine Society of Periodontology (PSP)",
          "Advanced Guided Bone Regeneration (GBR) Specialist",
          "Minimally Invasive Microsurgical Periodontist",
        ],
        experience_years: 16,
        bio: "Dr. Lim is Northern Mindanao's premier specialist for severe periodontitis and missing tooth replacement. Utilizing dental lasers and 3D computer-guided implant planning, he saves natural teeth and restores chewing function with zero discomfort.",
        clinic_days: [
          { branchName: "Uptown (Pueblo de Oro)", days: "Mon, Wed, Fri", hours: "9:30 AM – 5:30 PM" },
        ],
        display_order: 3,
      },
      {
        id: "00000000-0000-0000-0000-000000000013",
        name: "Dr. Sophia Valdez, DDM",
        title: "General Dental Practitioner & Endodontist",
        prc_license: "0092410",
        photo_url: "/images/dentist-dr-sophia.jpg",
        specialty: "Rotary Root Canal Therapy, Ultrasonic Prophylaxis & Aesthetic Bonding",
        education: "Doctor of Dental Medicine, Davao Medical School Foundation",
        certifications: [
          "Certified in Rotary Nickel-Titanium Endodontics",
          "Pediatric Gentle Handling Certificate",
          "Active Member, PDA CDO Chapter",
        ],
        experience_years: 8,
        bio: "Celebrated for her remarkably gentle touch, Dr. Valdez is the favorite doctor of anxious patients and young children in CDO. She specializes in single-visit root canal therapy and preventive oral health.",
        clinic_days: [
          { branchName: "Downtown (Limketkai)", days: "Daily", hours: "9:00 AM – 5:00 PM" },
          { branchName: "Centrio (Ayala Mall)", days: "Tue, Thu, Sat", hours: "10:00 AM – 8:00 PM" },
        ],
        display_order: 4,
      },
    ];

    for (const d of initialDentists) {
      await db.query(
        `INSERT INTO public.dentists (
          id, name, title, prc_license, photo_url, specialty, education,
          certifications, experience_years, bio, clinic_days, display_order, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
        ON CONFLICT (id) DO NOTHING;`,
        [
          d.id,
          d.name,
          d.title,
          d.prc_license,
          d.photo_url,
          d.specialty,
          d.education,
          JSON.stringify(d.certifications),
          d.experience_years,
          d.bio,
          JSON.stringify(d.clinic_days),
          d.display_order,
        ]
      );
    }
  }

  // Bidirectional Synchronization:
  // 1. Ensure all rows in public.dentists exist in public.profiles (to satisfy foreign keys on appointments/treatments)
  await db.query(`
    INSERT INTO public.profiles (id, full_name, role, is_active, created_at)
    SELECT d.id::uuid, d.name, 'dentist'::public.user_role, d.is_active, now()
    FROM public.dentists d
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      role = 'dentist'::public.user_role,
      is_active = EXCLUDED.is_active;
  `);

  // 2. Ensure all active dentist profiles exist in public.dentists (so invited dentists appear in public booking & catalog)
  await db.query(`
    INSERT INTO public.dentists (
      id, name, title, prc_license, photo_url, specialty, education, certifications,
      experience_years, bio, clinic_days, display_order, is_active
    )
    SELECT 
      p.id::text,
      p.full_name,
      'Attending Dental Specialist',
      'PRC Verified',
      '/images/dentist-dr-kenneth.jpg',
      'General Dental Medicine & Patient Care',
      'Doctor of Dental Medicine',
      '[]'::jsonb,
      5,
      'Dedicated dental specialist at CDG Dental Clinic delivering gentle, modern clinical care.',
      '[]'::jsonb,
      99,
      p.is_active
    FROM public.profiles p
    WHERE p.role = 'dentist'
    ON CONFLICT (id) DO NOTHING;
  `);
}

/**
 * List all dentists
 */
export async function listDentists(onlyActive = false): Promise<DentistRecord[]> {
  await ensureDentistsTable();
  const db = getPool();

  const query = `
    SELECT 
      id, name, title, prc_license, photo_url, specialty, education,
      certifications, experience_years, bio, clinic_days, display_order, is_active, created_at
    FROM public.dentists
    ${onlyActive ? "WHERE is_active = true" : ""}
    ORDER BY display_order ASC, name ASC;
  `;

  const { rows } = await db.query(query);
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    title: r.title,
    prc_license: r.prc_license,
    photo_url: r.photo_url,
    specialty: r.specialty,
    education: r.education || null,
    certifications: Array.isArray(r.certifications) ? r.certifications : [],
    experience_years: Number(r.experience_years || 0),
    bio: r.bio || null,
    clinic_days: Array.isArray(r.clinic_days) ? r.clinic_days : [],
    display_order: Number(r.display_order || 0),
    is_active: Boolean(r.is_active),
    created_at: r.created_at,
  }));
}

/**
 * Create a new dentist profile
 */
export async function createDentistAdmin(data: {
  name: string;
  title: string;
  prc_license: string;
  photo_url: string;
  specialty: string;
  education?: string | null;
  certifications?: string[];
  experience_years?: number;
  bio?: string | null;
  clinic_days?: { branchName: string; days: string; hours: string }[];
  display_order?: number;
  is_active?: boolean;
}): Promise<DentistRecord> {
  await ensureDentistsTable();
  const db = getPool();

  const id = crypto.randomUUID();
  const isActive = data.is_active !== undefined ? data.is_active : true;

  // 1. Ensure dentist profile exists in public.profiles first so foreign keys never fail
  await db.query(`
    INSERT INTO public.profiles (id, full_name, role, is_active, created_at)
    VALUES ($1::uuid, $2, 'dentist'::public.user_role, $3, now())
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      role = 'dentist'::public.user_role,
      is_active = EXCLUDED.is_active;
  `, [id, data.name.trim(), isActive]);

  // 2. Insert into public.dentists
  const query = `
    INSERT INTO public.dentists (
      id, name, title, prc_license, photo_url, specialty, education,
      certifications, experience_years, bio, clinic_days, display_order, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *;
  `;

  const { rows } = await db.query(query, [
    id,
    data.name.trim(),
    data.title.trim(),
    data.prc_license.trim(),
    data.photo_url.trim(),
    data.specialty.trim(),
    data.education?.trim() || null,
    JSON.stringify(data.certifications || []),
    data.experience_years !== undefined ? data.experience_years : 5,
    data.bio?.trim() || null,
    JSON.stringify(data.clinic_days || []),
    data.display_order !== undefined ? data.display_order : 0,
    isActive,
  ]);

  const created = rows[0];
  return {
    ...created,
    certifications: Array.isArray(created.certifications) ? created.certifications : [],
    clinic_days: Array.isArray(created.clinic_days) ? created.clinic_days : [],
  };
}

/**
 * Update an existing dentist profile (name, title, photo, bio, credentials, etc.)
 */
export async function updateDentistAdmin(
  id: string,
  data: Partial<{
    name: string;
    title: string;
    prc_license: string;
    photo_url: string;
    specialty: string;
    education: string | null;
    certifications: string[];
    experience_years: number;
    bio: string | null;
    clinic_days: { branchName: string; days: string; hours: string }[];
    display_order: number;
    is_active: boolean;
  }>
): Promise<DentistRecord> {
  await ensureDentistsTable();
  const db = getPool();

  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(data.name.trim());
  }
  if (data.title !== undefined) {
    setClauses.push(`title = $${paramIndex++}`);
    values.push(data.title.trim());
  }
  if (data.prc_license !== undefined) {
    setClauses.push(`prc_license = $${paramIndex++}`);
    values.push(data.prc_license.trim());
  }
  if (data.photo_url !== undefined) {
    setClauses.push(`photo_url = $${paramIndex++}`);
    values.push(data.photo_url.trim());
  }
  if (data.specialty !== undefined) {
    setClauses.push(`specialty = $${paramIndex++}`);
    values.push(data.specialty.trim());
  }
  if (data.education !== undefined) {
    setClauses.push(`education = $${paramIndex++}`);
    values.push(data.education ? data.education.trim() : null);
  }
  if (data.certifications !== undefined) {
    setClauses.push(`certifications = $${paramIndex++}`);
    values.push(JSON.stringify(data.certifications));
  }
  if (data.experience_years !== undefined) {
    setClauses.push(`experience_years = $${paramIndex++}`);
    values.push(Number(data.experience_years));
  }
  if (data.bio !== undefined) {
    setClauses.push(`bio = $${paramIndex++}`);
    values.push(data.bio ? data.bio.trim() : null);
  }
  if (data.clinic_days !== undefined) {
    setClauses.push(`clinic_days = $${paramIndex++}`);
    values.push(JSON.stringify(data.clinic_days));
  }
  if (data.display_order !== undefined) {
    setClauses.push(`display_order = $${paramIndex++}`);
    values.push(Number(data.display_order));
  }
  if (data.is_active !== undefined) {
    setClauses.push(`is_active = $${paramIndex++}`);
    values.push(Boolean(data.is_active));
  }

  setClauses.push(`updated_at = now()`);

  if (values.length === 0) {
    throw new Error("No fields provided to update.");
  }

  values.push(id);
  const query = `
    UPDATE public.dentists
    SET ${setClauses.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING *;
  `;

  const { rows } = await db.query(query, values);
  if (rows.length === 0) {
    throw new Error("Dentist record not found.");
  }

  // Synchronize name and active status to public.profiles
  if (data.name !== undefined || data.is_active !== undefined) {
    await db.query(`
      UPDATE public.profiles
      SET full_name = COALESCE($1, full_name),
          is_active = COALESCE($2, is_active)
      WHERE id = $3::uuid;
    `, [
      data.name !== undefined ? data.name.trim() : null,
      data.is_active !== undefined ? Boolean(data.is_active) : null,
      id,
    ]);
  }

  const updated = rows[0];
  return {
    ...updated,
    certifications: Array.isArray(updated.certifications) ? updated.certifications : [],
    clinic_days: Array.isArray(updated.clinic_days) ? updated.clinic_days : [],
  };
}

/**
 * Delete a dentist record (with foreign-key protection)
 */
export async function deleteDentistAdmin(id: string): Promise<void> {
  await ensureDentistsTable();
  const db = getPool();

  // Check if appointments or treatments exist referencing this dentist
  const { rows: apptCheck } = await db.query(
    "SELECT id FROM public.appointments WHERE dentist_id = $1::uuid LIMIT 1;",
    [id]
  );
  const { rows: treatCheck } = await db.query(
    "SELECT id FROM public.treatments WHERE dentist_id = $1::uuid LIMIT 1;",
    [id]
  );

  if (apptCheck.length > 0 || treatCheck.length > 0) {
    // Soft delete to protect relational data integrity and foreign keys
    await db.query("UPDATE public.dentists SET is_active = false, updated_at = now() WHERE id = $1;", [id]);
    await db.query("UPDATE public.profiles SET is_active = false WHERE id = $1::uuid;", [id]);
    return;
  }

  const res = await db.query("DELETE FROM public.dentists WHERE id = $1 RETURNING id;", [id]);
  await db.query("DELETE FROM public.profiles WHERE id = $1::uuid;", [id]);

  if (res.rows.length === 0) {
    throw new Error("Dentist record not found.");
  }
}

export interface BranchScheduleInput {
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
  has_break: boolean;
  break_start?: string | null;
  break_end?: string | null;
  slot_duration_minutes: number;
}

/**
 * Fetch 7-day operating schedule for a specific clinic branch
 */
export async function getBranchSchedulesAdmin(branchId: string): Promise<BranchSchedule[]> {
  const db = getPool();
  const query = `
    SELECT 
      id,
      branch_id,
      day_of_week,
      is_open,
      open_time::text,
      close_time::text,
      has_break,
      break_start::text,
      break_end::text,
      slot_duration_minutes,
      created_at,
      updated_at
    FROM public.branch_schedules
    WHERE branch_id = $1::uuid
    ORDER BY day_of_week ASC;
  `;

  const { rows } = await db.query(query, [branchId]);
  const rowMap = new Map<number, any>();
  for (const r of rows) {
    rowMap.set(r.day_of_week, r);
  }

  // Ensure all 7 days (0..6) are represented
  const fullWeek: BranchSchedule[] = [];
  for (let day = 0; day <= 6; day++) {
    const existing = rowMap.get(day);
    if (existing) {
      fullWeek.push({
        id: existing.id,
        branch_id: existing.branch_id,
        day_of_week: existing.day_of_week,
        is_open: Boolean(existing.is_open),
        open_time: existing.open_time ? existing.open_time.slice(0, 5) : "09:00",
        close_time: existing.close_time ? existing.close_time.slice(0, 5) : "18:00",
        has_break: Boolean(existing.has_break),
        break_start: existing.break_start ? existing.break_start.slice(0, 5) : "12:00",
        break_end: existing.break_end ? existing.break_end.slice(0, 5) : "13:00",
        slot_duration_minutes: Number(existing.slot_duration_minutes || 60),
        created_at: existing.created_at,
        updated_at: existing.updated_at,
      });
    } else {
      fullWeek.push({
        branch_id: branchId,
        day_of_week: day,
        is_open: day !== 0,
        open_time: "09:00",
        close_time: "18:00",
        has_break: true,
        break_start: "12:00",
        break_end: "13:00",
        slot_duration_minutes: 60,
      });
    }
  }

  return fullWeek;
}

/**
 * Save or update 7-day operating schedule for a branch
 */
export async function saveBranchSchedulesAdmin(
  branchId: string,
  schedules: BranchScheduleInput[]
): Promise<BranchSchedule[]> {
  const db = getPool();

  for (const item of schedules) {
    const query = `
      INSERT INTO public.branch_schedules (
        branch_id, day_of_week, is_open, open_time, close_time,
        has_break, break_start, break_end, slot_duration_minutes, updated_at
      )
      VALUES ($1::uuid, $2, $3, $4::time, $5::time, $6, $7::time, $8::time, $9, NOW())
      ON CONFLICT (branch_id, day_of_week) DO UPDATE SET
        is_open = EXCLUDED.is_open,
        open_time = EXCLUDED.open_time,
        close_time = EXCLUDED.close_time,
        has_break = EXCLUDED.has_break,
        break_start = EXCLUDED.break_start,
        break_end = EXCLUDED.break_end,
        slot_duration_minutes = EXCLUDED.slot_duration_minutes,
        updated_at = NOW();
    `;

    await db.query(query, [
      branchId,
      item.day_of_week,
      item.is_open,
      item.open_time,
      item.close_time,
      item.has_break !== undefined ? item.has_break : true,
      item.break_start || null,
      item.break_end || null,
      item.slot_duration_minutes || 60,
    ]);
  }

  return getBranchSchedulesAdmin(branchId);
}

/**
 * Replicate one branch's operating hours across all other registered branches
 */
export async function copySchedulesToAllBranches(sourceBranchId: string): Promise<number> {
  const db = getPool();
  const sourceSchedules = await getBranchSchedulesAdmin(sourceBranchId);

  const { rows: otherBranches } = await db.query(
    "SELECT id FROM public.branches WHERE id != $1::uuid AND is_active = true;",
    [sourceBranchId]
  );

  for (const b of otherBranches) {
    await saveBranchSchedulesAdmin(b.id, sourceSchedules);
  }

  return otherBranches.length;
}

