import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isPrivilegedRole, getClientIp } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id }, select: { email: true, role: true } });
  if (!target) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  const { role, name, password } = await req.json();

  // A plain Admin can't touch an account that's already Admin/Super Admin,
  // nor promote anyone into that tier — only Super Admin can act here.
  const targetIsPrivileged = isPrivilegedRole(target.role);
  const newRoleIsPrivileged = role ? isPrivilegedRole(role) : targetIsPrivileged;
  if ((targetIsPrivileged || newRoleIsPrivileged) && session.role !== "super_admin") {
    return NextResponse.json({ error: "Hanya Super Admin yang bisa mengubah akun Admin/Super Admin" }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  if (role) data.role = role;
  if (name) data.name = name;
  if (password) {
    if (password.length < 6) return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    data.password_hash = await bcrypt.hash(password, 12);
  }

  await prisma.user.update({ where: { id }, data });

  const ip = getClientIp(req);
  if (role && role !== target.role) {
    await logAudit({ actor: session, action: "user.update_role", target: target.email, details: { from: target.role, to: role }, ip });
  }
  if (password) {
    await logAudit({ actor: session, action: "user.reset_password", target: target.email, ip });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (id === session.id) return NextResponse.json({ error: "Tidak bisa hapus akun sendiri" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id }, select: { email: true, role: true } });
  if (!target) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  if (isPrivilegedRole(target.role) && session.role !== "super_admin") {
    return NextResponse.json({ error: "Hanya Super Admin yang bisa menghapus akun Admin/Super Admin" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id } });
  await logAudit({ actor: session, action: "user.delete", target: target.email, details: { role: target.role }, ip: getClientIp(req) });

  return NextResponse.json({ ok: true });
}
