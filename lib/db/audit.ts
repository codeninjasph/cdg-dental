import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/client";

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
  const newLog: AuditLogRecord = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    created_at: new Date().toISOString(),
    actor_id: entry.actorId || null,
    actor_name: entry.actorName,
    actor_role: entry.actorRole,
    action_category: entry.actionCategory,
    action_type: entry.actionType,
    entity_type: entry.entityType || null,
    entity_id: entry.entityId || null,
    description: entry.description,
    metadata: entry.metadata || {},
    branch_id: entry.branchId || null,
    branch_name: entry.branchName || null,
  };

  try {
    const supabase = createClient();
    await supabase.from("audit_logs").insert(newLog);
  } catch {
    // Fall back to local store
  }

  // Always write to persistent local file store
  const logs = readLocalAuditLogs();
  logs.unshift(newLog);
  // Cap at 2,000 logs locally
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
    const supabase = createClient();
    let query = supabase.from("audit_logs").select("*").order("created_at", { ascending: false });

    if (options?.category && options.category !== "all") {
      query = query.eq("action_category", options.category);
    }
    if (options?.actorId && options.actorId !== "all") {
      query = query.eq("actor_id", options.actorId);
    }
    if (options?.startDate) {
      query = query.gte("created_at", `${options.startDate}T00:00:00Z`);
    }
    if (options?.endDate) {
      query = query.lte("created_at", `${options.endDate}T23:59:59Z`);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      let results = data as AuditLogRecord[];
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
  } catch {
    // fallback
  }

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
