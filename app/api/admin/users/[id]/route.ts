import { NextRequest, NextResponse } from "next/server";
import { getServerClient, getAdminClient } from "@/lib/supabase-server";

async function requireAdmin() {
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["super_admin", "admin"].includes(profile.role)) return null;
  return user;
}

// PATCH /api/admin/users/[id] — update role or name
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireAdmin();
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const allowed = ["role", "name"] as const;
  const update = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k as typeof allowed[number]))
  );
  if (!Object.keys(update).length) {
    return NextResponse.json({ error: "Tidak ada field yang valid untuk diupdate" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { error } = await admin.from("profiles").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/users/[id] — remove user from Auth + profiles
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireAdmin();
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // Prevent self-deletion
  if (caller.id === id) {
    return NextResponse.json({ error: "Tidak dapat menghapus akun sendiri" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
