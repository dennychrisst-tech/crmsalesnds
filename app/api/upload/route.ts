import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { v4 as uuid } from "uuid";

function getStorageClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const dealId = formData.get("dealId") as string | null;
  const clientId = formData.get("clientId") as string | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const folder = dealId || clientId || "misc";
  const path = `${folder}/${Date.now()}-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const sb = getStorageClient();
  const { error: upErr } = await sb.storage.from("crm-attachments").upload(path, buffer, { contentType: file.type });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: { publicUrl } } = sb.storage.from("crm-attachments").getPublicUrl(path);

  const attachment = await prisma.attachment.create({
    data: {
      id: uuid(),
      deal_id: dealId || null,
      client_id: clientId || null,
      file_name: file.name,
      file_url: publicUrl,
      file_size: BigInt(file.size),
      created_by_id: session.id,
    },
  });

  return NextResponse.json({
    ...attachment,
    file_size: Number(attachment.file_size),
    uploaded_at: attachment.uploaded_at.toISOString(),
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (attachment.file_url) {
    try {
      const url = new URL(attachment.file_url);
      const parts = url.pathname.split("/crm-attachments/");
      if (parts[1]) {
        await getStorageClient().storage.from("crm-attachments").remove([decodeURIComponent(parts[1])]);
      }
    } catch {}
  }

  await prisma.attachment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
