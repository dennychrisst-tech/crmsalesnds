import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth";

function getStorageClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Client logos live in the same bucket as attachments but aren't tracked as
// Attachment rows — they're just a URL stored directly on Client.logo_url.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const clientId = formData.get("clientId") as string | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "File harus berupa gambar" }, { status: 400 });

  const path = `logos/${clientId}/${Date.now()}-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const sb = getStorageClient();
  const { error: upErr } = await sb.storage.from("crm-attachments").upload(path, buffer, { contentType: file.type });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: { publicUrl } } = sb.storage.from("crm-attachments").getPublicUrl(path);
  return NextResponse.json({ url: publicUrl });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/crm-attachments/");
    if (parts[1]) {
      await getStorageClient().storage.from("crm-attachments").remove([decodeURIComponent(parts[1])]);
    }
  } catch {}

  return NextResponse.json({ ok: true });
}
