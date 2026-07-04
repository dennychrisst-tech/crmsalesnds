import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { endpoint, p256dh, auth } = body;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Subscription tidak lengkap" }, { status: 400 });
  }

  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { user_id: session.id, endpoint, p256dh, auth },
      update: { user_id: session.id, p256dh, auth },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DB error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "endpoint wajib diisi" }, { status: 400 });

  await prisma.pushSubscription.deleteMany({ where: { endpoint, user_id: session.id } });
  return NextResponse.json({ ok: true });
}
