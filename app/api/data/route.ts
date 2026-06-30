import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function serializeDates(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (typeof obj === "bigint") return Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeDates);
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, serializeDates(v)])
    );
  }
  return obj;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [clients, contacts, visits, deals, projects, tasks, products, documents, attachments, activities, events, users] = await Promise.all([
    prisma.client.findMany({ orderBy: { created_at: "asc" } }),
    prisma.contact.findMany({ orderBy: { created_at: "asc" } }),
    prisma.visit.findMany({ orderBy: { date: "asc" } }),
    prisma.deal.findMany({ orderBy: { created_at: "asc" } }),
    prisma.project.findMany({ orderBy: { created_at: "asc" } }),
    prisma.task.findMany({ orderBy: { due_date: "asc" } }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.document.findMany({ orderBy: { created_at: "asc" } }),
    prisma.attachment.findMany({ orderBy: { uploaded_at: "asc" } }),
    prisma.activity.findMany({ orderBy: { created_at: "desc" } }),
    prisma.event.findMany({ orderBy: { date: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true, role: true, created_at: true } }),
  ]);

  return NextResponse.json(serializeDates({
    clients, contacts, visits, deals, projects, tasks,
    products, documents, attachments, activities, events,
    profiles: users,
    currentUser: { id: session.id, name: session.name, email: session.email, role: session.role },
  }));
}
