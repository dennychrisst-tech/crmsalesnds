import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || !["admin", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [users, dealGroups, visitGroups, activityGroups, clientGroups] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, created_at: true },
      orderBy: { created_at: "asc" },
    }),
    prisma.deal.groupBy({ by: ["created_by_id"], _count: { _all: true }, _sum: { value: true } }),
    prisma.visit.groupBy({ by: ["created_by_id"], _count: { _all: true } }),
    prisma.activity.groupBy({ by: ["created_by_id"], _count: { _all: true } }),
    prisma.client.groupBy({ by: ["created_by_id"], _count: { _all: true } }),
  ]);

  const toMap = <T extends { created_by_id: string | null }>(
    groups: (T & { _count: { _all: number } })[]
  ) => Object.fromEntries(groups.filter(g => g.created_by_id).map(g => [g.created_by_id!, g._count._all]));

  const dealMap = toMap(dealGroups);
  const visitMap = toMap(visitGroups);
  const activityMap = toMap(activityGroups);
  const clientMap = toMap(clientGroups);
  const dealValueMap = Object.fromEntries(
    dealGroups.filter(g => g.created_by_id).map(g => [g.created_by_id!, Number(g._sum.value ?? 0)])
  );

  const team = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    created_at: u.created_at.toISOString(),
    clients: clientMap[u.id] ?? 0,
    deals: dealMap[u.id] ?? 0,
    dealValue: dealValueMap[u.id] ?? 0,
    visits: visitMap[u.id] ?? 0,
    activities: activityMap[u.id] ?? 0,
  }));

  return NextResponse.json(team);
}
