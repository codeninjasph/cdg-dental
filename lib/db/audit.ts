import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getPool, isValidUuid } from "./pool";

export type AuditActionCategory =
  | "billing"
  | "appointment"
  | "patient"
  | "treatment"
  | "pricing"
  | "access_control"
  | "system";

export interface AuditLogRecord {
  id: string;
  created_at: string;
  actor_id?: string | null;
  actor_name: string;
  actor_role: string;
  action_category: AuditActionCategory;
  action_type: string;
  entity_type?: string | null;
  entity_id?: string | null;
  description: string;
  metadata?: Record<string, any>;
  branch_id?: string | null;
  branch_name?: string | null;
}

const AUDIT_FILE = path.join(process.cwd(), "data", "audit_logs.json");

function readLocalAuditLogs(): AuditLogRecord[] {
  try {
    if (fs.existsSync(AUDIT_FILE)) {
      const raw = fs.readFileSync(AUDIT_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading local audit_logs.json:", err);
  }
  return [];
}

function writeLocalAuditLogs(logs: AuditLogRecord[]): void {
  try {
    const dir = path.dirname(AUDIT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing local audit_logs.json:", err);
  }
}

/**
 * Log an immutable audit event
 */
export async function logAuditEvent(entry: {
  actorId?: string | null;
  actorName: string;
  actorRole: string;
  actionCategory: AuditActionCategory;
  actionType: string;
  entityType?: string | null;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, any>;
  branchId?: string | null;
  branchName?: string | null;
}): Promise<AuditLogRecord> {
  const auditId = crypto.randomUUID();
  const validActorUuid = isValidUuid(entry.actorId) ? entry.actorId : null;
  const validBranchUuid = isValidUuid(entry.branchId) ? entry.branchId : null;
  const metadata = {
    ...(entry.metadata || {}),
    ...(entry.actorId && !validActorUuid ? { raw_actor_id: entry.actorId } : {}),
    ...(entry.branchId && !validBranchUuid ? { raw_branch_id: entry.branchId } : {}),
  };

  const newLog: AuditLogRecord = {
    id: auditId,
    created_at: new Date().toISOString(),
    actor_id: validActorUuid,
    actor_name: entry.actorName,
    actor_role: entry.actorRole,
    action_category: entry.actionCategory,
    action_type: entry.actionType,
    entity_type: entry.entityType || null,
    entity_id: entry.entityId || null,
    description: entry.description,
    metadata,
    branch_id: validBranchUuid,
    branch_name: entry.branchName || null,
  };

  try {
    const db = getPool();
    const query = `
      INSERT INTO public.audit_logs (
        id, created_at, actor_id, actor_name, actor_role,
        action_category, action_type, entity_type, entity_id,
        description, metadata, branch_id, branch_name
      ) VALUES (
        $1::uuid, NOW(), $2::uuid, $3, $4,
        $5, $6, $7, $8,
        $9, $10::jsonb, $11::uuid, $12
      )
      RETURNING id, created_at, actor_id, actor_name, actor_role, action_category, action_type, entity_type, entity_id, description, metadata, branch_id, branch_name;
    `;
    const { rows } = await db.query(query, [
      auditId,
      validActorUuid,
      entry.actorName,
      entry.actorRole,
      entry.actionCategory,
      entry.actionType,
      entry.entityType || null,
      entry.entityId || null,
      entry.description,
      JSON.stringify(metadata),
      validBranchUuid,
      entry.branchName || null,
    ]);

    if (rows && rows.length > 0) {
      const inserted = rows[0];
      // Keep local file in sync
      const logs = readLocalAuditLogs();
      logs.unshift(inserted);
      if (logs.length > 2000) logs.length = 2000;
      writeLocalAuditLogs(logs);
      return inserted;
    }
  } catch (err) {
    console.error("Could not insert audit_log into DB, falling back to local file:", err);
  }

  // Always write to persistent local file store as fallback
  const logs = readLocalAuditLogs();
  logs.unshift(newLog);
  if (logs.length > 2000) {
    logs.length = 2000;
  }
  writeLocalAuditLogs(logs);

  return newLog;
}

/**
 * Fetch filtered audit logs
 */
export async function getAuditLogs(options?: {
  category?: string;
  actorId?: string;
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<AuditLogRecord[]> {
  try {
    const db = getPool();
    let query = `
      SELECT 
        id, created_at, actor_id, actor_name, actor_role,
        action_category, action_type, entity_type, entity_id,
        description, metadata, branch_id, branch_name
      FROM public.audit_logs
      WHERE 1=1
    `;
    const params: any[] = [];

    if (options?.category && options.category !== "all") {
      params.push(options.category);
      query += ` AND action_category = $${params.length}`;
    }
    if (options?.actorId && options.actorId !== "all") {
      if (isValidUuid(options.actorId)) {
        params.push(options.actorId);
        query += ` AND actor_id = $${params.length}::uuid`;
      }
    }
    if (options?.startDate) {
      params.push(`${options.startDate}T00:00:00Z`);
      query += ` AND created_at >= $${params.length}::timestamptz`;
    }
    if (options?.endDate) {
      params.push(`${options.endDate}T23:59:59Z`);
      query += ` AND created_at <= $${params.length}::timestamptz`;
    }

    query += ` ORDER BY created_at DESC`;

    const limit = options?.limit || 200;
    params.push(limit);
    query += ` LIMIT $${params.length};`;

    const { rows } = await db.query(query, params);
    if (rows && rows.length > 0) {
      let results = rows as AuditLogRecord[];
      if (options?.searchQuery?.trim()) {
        const q = options.searchQuery.toLowerCase();
        results = results.filter(
          (l) =>
            l.description.toLowerCase().includes(q) ||
            l.actor_name.toLowerCase().includes(q) ||
            l.action_type.toLowerCase().includes(q) ||
            JSON.stringify(l.metadata || {}).toLowerCase().includes(q)
        );
      }
      return results;
    }
  } catch (err) {
    console.warn("Could not read audit_logs from DB, falling back to local file:", err);
  }

  // Local fallback
  let logs = readLocalAuditLogs();

  if (options?.category && options.category !== "all") {
    logs = logs.filter((l) => l.action_category === options.category);
  }
  if (options?.actorId && options.actorId !== "all") {
    logs = logs.filter((l) => l.actor_id === options.actorId);
  }
  if (options?.startDate) {
    logs = logs.filter((l) => l.created_at >= `${options.startDate}T00:00:00Z`);
  }
  if (options?.endDate) {
    logs = logs.filter((l) => l.created_at <= `${options.endDate}T23:59:59Z`);
  }
  if (options?.searchQuery?.trim()) {
    const q = options.searchQuery.toLowerCase();
    logs = logs.filter(
      (l) =>
        l.description.toLowerCase().includes(q) ||
        l.actor_name.toLowerCase().includes(q) ||
        l.action_type.toLowerCase().includes(q) ||
        JSON.stringify(l.metadata || {}).toLowerCase().includes(q)
    );
  }

  if (options?.limit) {
    logs = logs.slice(0, options.limit);
  }

  return logs;
}
