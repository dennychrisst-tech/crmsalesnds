import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { getSession, isPrivilegedRole, SessionUser } from "@/lib/auth";
import { logAudit, recordLabel } from "@/lib/audit";

type TableName = "clients" | "contacts" | "visits" | "deals" | "projects" | "tasks" | "products" | "documents" | "attachments" | "activities" | "events" | "talent_roles" | "revenue_targets" | "revenue_lines" | "revenue_opportunities" | "mandays_roles" | "mandays_client_rates";

const ALLOWED: TableName[] = ["clients", "contacts", "visits", "deals", "projects", "tasks", "products", "documents", "attachments", "activities", "events", "talent_roles", "revenue_targets", "revenue_lines", "revenue_opportunities", "mandays_roles", "mandays_client_rates"];

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
    table === "mandays_roles" ? "mandaysRole" :
    table === "mandays_client_rates" ? "mandaysClientRate" :
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

// Fire-and-forget push to every admin/super_admin (other than whoever just
// created the client) so the team notices new clients without polling the
// list. Silently no-ops if VAPID isn't configured — same as the reminders
// cron route, which owns the actual daily notification schedule.
async function notifyAdminsNewClient(client: { id: string; name: string }, creator: SessionUser) {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) return;

  const admins = await prisma.user.findMany({ where: { id: { not: creator.id } }, select: { id: true, role: true } });
  const adminIds = admins.filter(u => isPrivilegedRole(u.role)).map(u => u.id);
  if (adminIds.length === 0) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { user_id: { in: adminIds } } });
  if (subscriptions.length === 0) return;

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const payload = JSON.stringify({
    title: "Client baru ditambahkan",
    body: `"${client.name}" ditambahkan oleh ${creator.name}`,
    url: "/clients",
    tag: "crm-new-client",
  });

  const staleEndpoints: string[] = [];
  await Promise.all(subscriptions.map(async sub => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
    } catch (e: unknown) {
      const statusCode = (e as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) staleEndpoints.push(sub.endpoint);
    }
  }));

  if (staleEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: staleEndpoints } } });
  }
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
  if (body.ratecard !== undefined) body.ratecard = BigInt(body.ratecard);
  if (body.target_revenue !== undefined) body.target_revenue = BigInt(body.target_revenue);
  if (table === "revenue_targets" && body.rate !== undefined) body.rate = BigInt(body.rate);
  if (body.amount !== undefined) body.amount = BigInt(body.amount);
  if (body.potentially_billed_amount !== undefined) body.potentially_billed_amount = BigInt(body.potentially_billed_amount);
  if (body.cogs !== undefined) body.cogs = BigInt(body.cogs);
  if (body.low_rate !== undefined) body.low_rate = BigInt(body.low_rate);
  if (body.med_rate !== undefined) body.med_rate = BigInt(body.med_rate);
  if (body.max_price !== undefined) body.max_price = BigInt(body.max_price);
  if (body.rate_value !== undefined) body.rate_value = BigInt(body.rate_value);

  // Convert date strings to Date objects for Prisma DateTime @db.Date fields
  const DATE_FIELDS: Record<string, string[]> = {
    visits: ["date", "followup_date"],
    deals: ["close_date"],
    tasks: ["due_date"],
    activities: ["date"],
    events: ["date", "followup_date"],
    projects: ["golive"],
    talent_roles: ["deadline"],
    revenue_opportunities: ["target_closing_date"],
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
    const existedBefore = !!(await model.findUnique({ where: { id: body.id }, select: { id: true } }));

    const result = await model.upsert({
      where: { id: body.id },
      create: body,
      update: { ...body, created_by_id: undefined }, // don't overwrite creator on update
    });

    // Awaited (not fire-and-forget) — Vercel can freeze/kill the function the
    // instant the response is sent, so an un-awaited write here would be a
    // coin flip on whether it actually lands. Push failures are swallowed
    // internally so they can't turn a successful save into a 500.
    await Promise.all([
      logAudit({ actor: session, action: `${table}.${existedBefore ? "update" : "create"}`, target: recordLabel(table, result) }),
      table === "clients" && !existedBefore ? notifyAdminsNewClient(result, session).catch(() => {}) : Promise.resolve(),
    ]);

    return NextResponse.json(serializeDates(result));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DB error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
