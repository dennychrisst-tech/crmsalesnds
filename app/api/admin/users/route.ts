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

// GET /api/admin/users — list all profiles
export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const admin = getAdminClient();
  const { data, error } = await admin.from("profiles").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/users — invite user by email
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { email, name, role } = await req.json();
  if (!email || !name || !role) {
    return NextResponse.json({ error: "email, name, role wajib diisi" }, { status: 400 });
  }

  const admin = getAdminClient();

  // Invite via Supabase Admin API (sends email invitation)
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Set role in profiles (trigger auto-created profile on invite, we update role)
  if (data.user) {
    await admin.from("profiles").upsert({
      id: data.user.id, email, name, role,
    });
  }

  return NextResponse.json({ ok: true });
}
