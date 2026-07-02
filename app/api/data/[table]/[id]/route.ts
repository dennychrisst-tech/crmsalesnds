import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type TableName = "clients" | "contacts" | "visits" | "deals" | "projects" | "tasks" | "products" | "documents" | "attachments" | "activities" | "events" | "talent_roles" | "revenue_targets" | "revenue_lines" | "revenue_opportunities";

const ALLOWED: TableName[] = ["clients", "contacts", "visits", "deals", "projects", "tasks", "products", "documents", "attachments", "activities", "events", "talent_roles", "revenue_targets", "revenue_lines", "revenue_opportunities"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getModel(table: TableName): any {
  return (prisma as unknown as Record<string, unknown>)[
    table === "documents" ? "document" :
    table === "activities" ? "activity" :
    table === "events" ? "event" :
    table === "talent_roles" ? "talentRole" :
    table === "revenue_targets" ? "revenueTarget" :
    table === "revenue_lines" ? "revenueLine" :
    table === "revenue_opportunities" ? "revenueOpportunity" :
    table.slice(0, -1)
  ];
}

function serializeDates(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (typeof obj === "bigint") return Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeDates);
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, serializeDates(v)])
    );
  }
  return obj;
}

function denyViewer(session: { role: string }) {
  if (session.role === "viewer") return NextResponse.json({ error: "Forbidden: akses view only" }, { status: 403 });
  return null;
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ table: string; id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = denyViewer(session); if (denied) return denied;

  const { table, id } = await params;
  if (!ALLOWED.includes(table as TableName)) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }

  try {
    await getModel(table as TableName).delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DB error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ table: string; id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = denyViewer(session); if (denied) return denied;

  const { table, id } = await params;
  if (!ALLOWED.includes(table as TableName)) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }

  const body = await req.json();
  if (body.value !== undefined) body.value = BigInt(body.value);

  try {
    const result = await getModel(table as TableName).update({ where: { id }, data: body });
    return NextResponse.json(serializeDates(result));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DB error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
