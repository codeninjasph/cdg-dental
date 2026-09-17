import { Pool } from "pg";

let pool: Pool | null = null;

/**
 * Get or initialize the direct PostgreSQL connection pool for Supabase.
 * Strictly uses environment variables for secure database connectivity.
 */
export function getPool(): Pool {
  if (!pool) {
    const password = process.env.SUPABASE_DB_PASSWORD;
    if (!password) {
      throw new Error("SUPABASE_DB_PASSWORD is not configured in environment variables.");
    }
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid RFC 4122 UUID.
 */
export function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id.trim());
}
