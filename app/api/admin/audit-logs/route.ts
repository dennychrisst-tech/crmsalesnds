import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !["admin", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
  const limit = 50;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ take: limit, skip, orderBy: { created_at: "desc" } }),
    prisma.auditLog.count(),
  ]);

  return NextResponse.json({
    logs: logs.map(l => ({
      id: l.id,
      action: l.action,
      target: l.target,
      actor_name: l.actor_name,
      actor_email: l.actor_email,
      details: l.details,
      ip: l.ip,
      created_at: l.created_at.toISOString(),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
