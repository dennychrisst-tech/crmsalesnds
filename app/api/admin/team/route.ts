import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Roster only — per-sales performance metrics (client/deal/visit/activity
// counts) used to be duplicated here too, but that's the same data Summary
// Activity already shows with period filters, so this endpoint stays a plain
// team-roster list and the admin/team page links to Summary Activity instead.
export async function GET() {
  const session = await getSession();
  if (!session || !["admin", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, created_at: true },
    orderBy: { created_at: "asc" },
  });

  return NextResponse.json(users.map(u => ({ ...u, created_at: u.created_at.toISOString() })));
}
