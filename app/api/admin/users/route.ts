import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, created_at: true },
  });

  return NextResponse.json(users.map(u => ({ ...u, created_at: u.created_at.toISOString() })));
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email, name, role, password } = await req.json();
  if (!email || !name || !role || !password) {
    return NextResponse.json({ error: "email, name, role, dan password wajib diisi" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });

  const password_hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { email, name, role, password_hash } });

  return NextResponse.json({ ok: true, id: user.id });
}
