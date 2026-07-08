import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const QUERIES: Record<string, () => Promise<any>> = {
  clients:     () => prisma.client.findMany({ orderBy: { created_at: "asc" } }),
  contacts:    () => prisma.contact.findMany({ orderBy: { created_at: "asc" } }),
  // Plain `take: 500` on the newest-by-date rows silently dropped old
  // still-open visits (Planned/Tentative/Reschedule) once total volume passed
  // 500 team-wide — they'd vanish from Calendar/Dashboard/Reminders with no
  // record ever having been closed out. Open statuses are fetched in full
  // (that set stays small by nature — people do eventually resolve them);
  // only Done/Cancel history is capped, since that's just for reporting.
  visits: async () => {
    const [open, closed] = await Promise.all([
      prisma.visit.findMany({ where: { status: { notIn: ["Done", "Cancel"] } }, orderBy: { date: "desc" } }),
      prisma.visit.findMany({ where: { status: { in: ["Done", "Cancel"] } }, take: 500, orderBy: { date: "desc" } }),
    ]);
    return [...open, ...closed];
  },
  deals:       () => prisma.deal.findMany({ orderBy: { created_at: "asc" } }),
  projects:    () => prisma.project.findMany({ orderBy: { created_at: "asc" } }),
  tasks:       () => prisma.task.findMany({ orderBy: { due_date: "asc" } }),
  products:    () => prisma.product.findMany({ orderBy: { name: "asc" } }),
  documents:   () => prisma.document.findMany({ take: 300, orderBy: { created_at: "desc" } }),
  attachments: () => prisma.attachment.findMany({ take: 200, orderBy: { uploaded_at: "desc" } }),
  activities:  () => prisma.activity.findMany({ take: 200, orderBy: { created_at: "desc" } }),
  events:      () => prisma.event.findMany({ orderBy: { date: "asc" } }),
  talent_roles:           () => prisma.talentRole.findMany({ orderBy: { created_at: "asc" } }),
  revenue_targets:        () => prisma.revenueTarget.findMany({ orderBy: { year: "asc" } }),
  revenue_lines:          () => prisma.revenueLine.findMany({ orderBy: { created_at: "asc" } }),
  revenue_opportunities:  () => prisma.revenueOpportunity.findMany({ orderBy: { created_at: "asc" } }),
  mandays_roles:          () => prisma.mandaysRole.findMany({ orderBy: { created_at: "asc" } }),
  mandays_client_rates:   () => prisma.mandaysClientRate.findMany({ orderBy: { created_at: "asc" } }),
};

const ALL_TABLES = Object.keys(QUERIES);

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const param = req.nextUrl.searchParams.get("tables");
  const requested = param
    ? param.split(",").map(t => t.trim()).filter(t => t in QUERIES)
    : ALL_TABLES;

  // skipProfiles=1 skips the users DB query — used by polls and lazy loads
  // where the client already has the profiles list from the initial load.
  const skipProfiles = req.nextUrl.searchParams.get("skipProfiles") === "1";

  const [entries, users] = await Promise.all([
    Promise.all(requested.map(async table => [table, await QUERIES[table]()] as const)),
    skipProfiles
      ? Promise.resolve(null)
      : prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true, role: true, created_at: true } }),
  ]);

  return NextResponse.json(serializeDates({
    ...Object.fromEntries(entries),
    ...(users ? { profiles: users } : {}),
    currentUser: { id: session.id, name: session.name, email: session.email, role: session.role },
  }));
}
