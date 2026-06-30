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

export async function POST(req: NextRequest, { params }: { params: Promise<{ table: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { table } = await params;
  if (!ALLOWED.includes(table as TableName)) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }

  const body = await req.json();
  const model = getModel(table as TableName);

  // Auto-tag creator on new records
  if (!body.created_by_id) body.created_by_id = session.id;

  // Handle BigInt fields
  if (body.value !== undefined) body.value = BigInt(body.value);
  if (body.file_size !== undefined) body.file_size = BigInt(body.file_size);

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
