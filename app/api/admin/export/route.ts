import { NextRequest, NextResponse } from "next/server";
import { getSession, getClientIp } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

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

const TABLES = ["clients", "contacts", "visits", "deals", "projects", "tasks", "products", "activities", "events", "talent_roles", "revenue_targets", "revenue_lines", "revenue_opportunities", "mandays_roles", "mandays_client_rates"] as const;
type TableName = typeof TABLES[number];

async function fetchRows(table: TableName): Promise<Record<string, unknown>[]> {
  switch (table) {
    case "clients":
      return (await prisma.client.findMany({ orderBy: { created_at: "asc" } }))
        .map(r => ({
          ...r,
          // r.pic is PIC[] ({name, phone}) as JSON — export the names Excel-
          // readable instead of raw JSON.stringify output.
          pic: (Array.isArray(r.pic) ? r.pic as unknown as { name?: string }[] : [])
            .map(p => p?.name || "").filter(Boolean).join("; "),
        }));
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
    case "talent_roles":
      return (await prisma.talentRole.findMany({ orderBy: { created_at: "asc" } }))
        .map(r => ({ ...r, ratecard: Number(r.ratecard) }));
    case "revenue_targets":
      return (await prisma.revenueTarget.findMany({ orderBy: { year: "asc" } }))
        .map(r => ({ ...r, target_revenue: Number(r.target_revenue), rate: Number(r.rate) }));
    case "revenue_lines":
      return (await prisma.revenueLine.findMany({ orderBy: { year: "asc" } }))
        .map(r => ({ ...r, milestones: JSON.stringify(r.milestones) }));
    case "revenue_opportunities":
      return (await prisma.revenueOpportunity.findMany({ orderBy: { year: "asc" } }))
        .map(r => ({ ...r, amount: Number(r.amount), potentially_billed_amount: Number(r.potentially_billed_amount) }));
    case "mandays_roles":
      return (await prisma.mandaysRole.findMany({ orderBy: { role_name: "asc" } }))
        .map(r => ({ ...r, cogs: Number(r.cogs), low_rate: Number(r.low_rate), med_rate: Number(r.med_rate), max_price: Number(r.max_price) }));
    case "mandays_client_rates":
      return (await prisma.mandaysClientRate.findMany({ orderBy: { created_at: "asc" } }))
        .map(r => ({ ...r, rate_value: Number(r.rate_value) }));
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

  await logAudit({ actor: session, action: "data.export", target: table, details: { rows: rows.length }, ip: getClientIp(req) });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
