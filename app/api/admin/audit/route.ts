import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !["admin", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
  const limit = 50;
  const skip = (page - 1) * limit;

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      take: limit,
      skip,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        type: true,
        description: true,
        created_by: true,
        created_at: true,
        client: { select: { name: true } },
        deal: { select: { name: true } },
      },
    }),
    prisma.activity.count(),
  ]);

  return NextResponse.json({
    activities: activities.map(a => ({
      id: a.id,
      type: a.type,
      description: a.description,
      created_by: a.created_by,
      created_at: a.created_at.toISOString(),
      client_name: a.client?.name ?? null,
      deal_name: a.deal?.name ?? null,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
