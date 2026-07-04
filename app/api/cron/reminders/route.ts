import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { computeReminders, todayStrInJakarta, VisitReminderInput, TaskReminderInput } from "@/lib/reminders";
import { isPrivilegedRole } from "@/lib/auth";

function d10(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

// Vercel Cron hits this route once daily (see vercel.json) with
// `Authorization: Bearer ${CRON_SECRET}` auto-attached — reject anything else.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    return NextResponse.json({ error: "VAPID env vars belum diset" }, { status: 500 });
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const [visitRows, taskRows, users, subscriptions] = await Promise.all([
    prisma.visit.findMany({ select: { id: true, date: true, status: true, pic: true } }),
    prisma.task.findMany({ select: { id: true, due_date: true, status: true, assigned_to: true } }),
    prisma.user.findMany({ select: { id: true, name: true, role: true } }),
    prisma.pushSubscription.findMany(),
  ]);

  const visits: VisitReminderInput[] = visitRows.map(v => ({ id: v.id, date: d10(v.date) ?? "", status: v.status, pic: v.pic }));
  const tasks: TaskReminderInput[] = taskRows.map(t => ({ id: t.id, due_date: d10(t.due_date), status: t.status, assigned_to: t.assigned_to }));

  const reminders = computeReminders(visits, tasks, todayStrInJakarta());
  if (reminders.length === 0) return NextResponse.json({ sent: 0, reason: "no reminders" });

  const subsByUser = new Map<string, typeof subscriptions>();
  for (const sub of subscriptions) {
    const list = subsByUser.get(sub.user_id) ?? [];
    list.push(sub);
    subsByUser.set(sub.user_id, list);
  }

  let sent = 0;
  const staleEndpoints: string[] = [];

  for (const user of users) {
    const userSubs = subsByUser.get(user.id);
    if (!userSubs || userSubs.length === 0) continue;

    // Admins see everyone's reminders in the in-app bell too — mirror that
    // here rather than matching by name for privileged roles.
    const mine = isPrivilegedRole(user.role)
      ? reminders
      : reminders.filter(r => normalizeName(r.owner) === normalizeName(user.name));

    if (mine.length === 0) continue;

    const overdue = mine.filter(r => r.severity === "overdue").length;
    const today = mine.filter(r => r.severity === "today").length;
    const parts = [];
    if (overdue > 0) parts.push(`${overdue} terlambat`);
    if (today > 0) parts.push(`${today} hari ini`);

    const payload = JSON.stringify({
      title: `${mine.length} reminder CRM`,
      body: parts.join(", "),
      url: "/",
      tag: "crm-reminder",
    });

    for (const sub of userSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (e: unknown) {
        const statusCode = (e as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) staleEndpoints.push(sub.endpoint);
      }
    }
  }

  if (staleEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: staleEndpoints } } });
  }

  return NextResponse.json({ sent, removedStale: staleEndpoints.length });
}
