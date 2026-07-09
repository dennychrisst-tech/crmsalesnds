import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SessionUser } from "@/lib/auth";

// Logging is best-effort: a failed audit write must never break the actual
// request (user create/delete, login, export, etc.), so errors are swallowed
// here rather than propagated.
export async function logAudit(params: {
  actor: SessionUser | null;
  action: string;
  target?: string;
  details?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actor_id: params.actor?.id ?? null,
        actor_name: params.actor?.name ?? "",
        actor_email: params.actor?.email ?? "",
        action: params.action,
        target: params.target ?? "",
        details: (params.details ?? {}) as Prisma.InputJsonValue,
        ip: params.ip ?? "",
      },
    });
  } catch (e) {
    console.error("[audit] failed to write log", e);
  }
}

// Field(s) tried in order to build a human-readable `target` for the generic
// CRUD entries logged from app/api/data/[table]/route.ts and its [id] route
// (action = "<table>.create/update/delete") — reuses the same audit_logs
// table as the security trail above rather than a separate schema, since the
// columns already fit. Keys double as the whitelist of tables the "logbook"
// widget (GET /api/activity-log) is allowed to surface.
const LABEL_FIELDS: Record<string, string[]> = {
  clients: ["name"],
  contacts: ["name"],
  visits: ["purpose"],
  deals: ["name"],
  projects: ["name"],
  tasks: ["title"],
  products: ["name"],
  documents: ["name"],
  attachments: ["file_name"],
  activities: ["description"],
  events: ["title"],
  talent_roles: ["role_name"],
  revenue_targets: ["year"],
  revenue_lines: ["project_name"],
  revenue_opportunities: ["project_name"],
  mandays_roles: ["role_name"],
  mandays_client_rates: ["client_label", "rate_label"],
};

export const AUDITABLE_TABLES = Object.keys(LABEL_FIELDS);

export function recordLabel(table: string, record: Record<string, unknown>): string {
  const fields = LABEL_FIELDS[table] ?? [];
  const parts = fields
    .map(f => record[f])
    .filter((v): v is string | number => v !== undefined && v !== null && v !== "");
  return parts.map(String).join(" — ");
}

const FAILED_LOGIN_WINDOW_MINUTES = 15;
const MAX_FAILED_PER_EMAIL = 5;
const MAX_FAILED_PER_IP = 20;

// Rate-limit check derived from audit_logs' own "login.failed" rows instead of
// a separate counter table — no extra schema needed, and the window naturally
// self-clears since old rows simply age out of the query.
export async function isLoginRateLimited(email: string, ip: string): Promise<boolean> {
  try {
    const since = new Date(Date.now() - FAILED_LOGIN_WINDOW_MINUTES * 60_000);
    const [byEmail, byIp] = await Promise.all([
      prisma.auditLog.count({ where: { action: "login.failed", target: email, created_at: { gte: since } } }),
      ip !== "unknown"
        ? prisma.auditLog.count({ where: { action: "login.failed", ip, created_at: { gte: since } } })
        : Promise.resolve(0),
    ]);
    return byEmail >= MAX_FAILED_PER_EMAIL || byIp >= MAX_FAILED_PER_IP;
  } catch (e) {
    console.error("[audit] rate-limit check failed, allowing request", e);
    return false;
  }
}
