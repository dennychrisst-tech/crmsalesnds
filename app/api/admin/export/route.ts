import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}`
      : s;
  };
  return [
    headers.join(","),
    ...rows.map(r => headers.map(h => escape(r[h])).join(",")),
  ].join("\n");
}

const TABLES = ["clients", "contacts", "visits", "deals", "projects", "tasks", "products", "activities", "events"] as const;
type TableName = typeof TABLES[number];

async function fetchRows(table: TableName): Promise<Record<string, unknown>[]> {
  switch (table) {
    case "clients":
      return (await prisma.client.findMany({ orderBy: { created_at: "asc" } }))
        .map(r => ({ ...r, pic: JSON.stringify(r.pic) }));
    case "contacts":
      return prisma.contact.findMany({ orderBy: { created_at: "asc" } });
    case "visits":
      return prisma.visit.findMany({ orderBy: { date: "asc" } });
    case "deals":
      return (await prisma.deal.findMany({ orderBy: { created_at: "asc" } }))
        .map(r => ({ ...r, value: Number(r.value) }));
    case "projects":
      return (await prisma.project.findMany({ orderBy: { created_at: "asc" } }))
        .map(r => ({ ...r, value: Number(r.value) }));
    case "tasks":
      return prisma.task.findMany({ orderBy: { created_at: "asc" } });
    case "products":
      return prisma.product.findMany({ orderBy: { created_at: "asc" } });
    case "activities":
      return prisma.activity.findMany({ orderBy: { created_at: "desc" } });
    case "events":
      return prisma.event.findMany({ orderBy: { date: "asc" } });
    default:
      return [];
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !["admin", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const table = req.nextUrl.searchParams.get("table") as TableName | null;
  if (!table || !TABLES.includes(table)) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }

  const rows = await fetchRows(table);
  const csv = toCSV(rows as Record<string, unknown>[]);
  const filename = `${table}_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
