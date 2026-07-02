import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type TableName = "clients" | "contacts" | "visits" | "deals" | "projects" | "tasks" | "products" | "documents" | "attachments" | "activities" | "events";

const ALLOWED: TableName[] = ["clients", "contacts", "visits", "deals", "projects", "tasks", "products", "documents", "attachments", "activities", "events"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getModel(table: TableName): any {
  return (prisma as unknown as Record<string, unknown>)[
    table === "documents" ? "document" :
    table === "activities" ? "activity" :
    table === "events" ? "event" :
    table.slice(0, -1) // remove trailing 's'
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ table: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = denyViewer(session); if (denied) return denied;

  const { table } = await params;
  if (!ALLOWED.includes(table as TableName)) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }

  const body = await req.json();
  const model = getModel(table as TableName);

  // created_by_id intentionally not auto-set — FK references auth.users which
  // is not managed by this app's auth layer; leave null to avoid constraint errors

  // Handle BigInt fields
  if (body.value !== undefined) body.value = BigInt(body.value);
  if (body.file_size !== undefined) body.file_size = BigInt(body.file_size);
  if (body.talent_ratecard !== undefined) body.talent_ratecard = BigInt(body.talent_ratecard);

  // Convert date strings to Date objects for Prisma DateTime @db.Date fields
  const DATE_FIELDS: Record<string, string[]> = {
    visits: ["date", "followup_date"],
    deals: ["close_date"],
    tasks: ["due_date"],
    activities: ["date"],
    events: ["date", "followup_date"],
    projects: ["golive", "talent_submit_cv_date", "talent_interview_date", "talent_hired_date", "talent_po_date"],
  };
  for (const field of DATE_FIELDS[table] ?? []) {
    if (typeof body[field] === "string") {
      if (body[field] === "") {
        body[field] = null;
      } else {
        // Accept "YYYY-MM-DD" or full ISO string
        const d = new Date(body[field]);
        body[field] = isNaN(d.getTime()) ? null : d;
      }
    }
  }

  try {
    const result = await model.upsert({
      where: { id: body.id },
      create: body,
      update: { ...body, created_by_id: undefined }, // don't overwrite creator on update
    });
    return NextResponse.json(serializeDates(result));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DB error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
