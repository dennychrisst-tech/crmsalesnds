import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || !["admin", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    userCount, clientCount, contactCount, visitCount,
    dealCount, projectCount, taskCount, activityCount,
    dealsByStage, dealValueAgg, recentActivities,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.contact.count(),
    prisma.visit.count(),
    prisma.deal.count(),
    prisma.project.count(),
    prisma.task.count(),
    prisma.activity.count(),
    prisma.deal.groupBy({ by: ["stage"], _count: { _all: true } }),
    prisma.deal.aggregate({ _sum: { value: true } }),
    prisma.activity.findMany({
      take: 10,
      orderBy: { created_at: "desc" },
      select: { id: true, type: true, description: true, created_by: true, created_at: true },
    }),
  ]);

  return NextResponse.json({
    counts: { userCount, clientCount, contactCount, visitCount, dealCount, projectCount, taskCount, activityCount },
    dealsByStage: dealsByStage.map(d => ({ stage: d.stage, count: d._count._all })),
    totalDealValue: Number(dealValueAgg._sum.value ?? 0),
    recentActivities: recentActivities.map(a => ({
      ...a,
      created_at: a.created_at.toISOString(),
    })),
  });
}
