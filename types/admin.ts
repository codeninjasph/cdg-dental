import { UserRole } from "./dental";

export const MASTER_ADMIN_ID = "00000000-0000-0000-0000-000000000030";
export const MASTER_ADMIN_EMAIL = "admin@gmail.com";

export interface StaffUserRecord {
  id: string;
  email: string | null;
  full_name: string;
  role: UserRole;
  branch_id: string | null;
  branch_name: string | null;
  phone: string | null;
  is_active: boolean;
  status: "active" | "revoked" | "pending_invite";
  created_at: string;
  last_sign_in_at: string | null;
  invited_at: string | null;
  invite_token?: string | null;
  recovery_token?: string | null;
}
