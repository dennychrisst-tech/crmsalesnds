import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { role, name, password } = await req.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  if (role) data.role = role;
  if (name) data.name = name;
  if (password) {
    if (password.length < 6) return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    data.password_hash = await bcrypt.hash(password, 12);
  }

  await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [admin, session] = await Promise.all([requireAdmin(), getSession()]);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (id === session?.id) return NextResponse.json({ error: "Tidak bisa hapus akun sendiri" }, { status: 400 });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
