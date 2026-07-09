import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { AUDITABLE_TABLES } from "@/lib/audit";

// Lightweight "who changed what" feed for the logbook widget in the header.
// Unlike /api/admin/audit-logs (admin-only; also carries security actions
// like failed logins, user management, IP addresses), this is visible to
// every signed-in role and only surfaces ordinary record create/update/delete
// activity — hence the explicit action whitelist instead of returning
// everything in audit_logs.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actions = AUDITABLE_TABLES.flatMap(t => [`${t}.create`, `${t}.update`, `${t}.delete`]);
  const logs = await prisma.auditLog.findMany({
    where: { action: { in: actions } },
    orderBy: { created_at: "desc" },
    take: 30,
    select: { id: true, action: true, target: true, actor_name: true, created_at: true },
  });

  return NextResponse.json(logs.map(l => ({ ...l, created_at: l.created_at.toISOString() })));
}
