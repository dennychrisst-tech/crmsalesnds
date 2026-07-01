"use client";
import { useState, useEffect, useCallback } from "react";
import { v4 as uuid } from "uuid";
import { Client, Contact, Visit, Deal, Project, Task, Product, CRMDocument, Attachment, Activity, CalendarEvent, Profile } from "@/types";

export interface AppData {
  clients: Client[];
  contacts: Contact[];
  visits: Visit[];
  deals: Deal[];
  projects: Project[];
  tasks: Task[];
  products: Product[];
  documents: CRMDocument[];
  attachments: Attachment[];
  activities: Activity[];
  events: CalendarEvent[];
  profiles: Profile[];
}

async function api(path: string, method = "GET", body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function useData() {
  const [data, setData] = useState<AppData>({
    clients: [], contacts: [], visits: [], deals: [], projects: [],
    tasks: [], products: [], documents: [], attachments: [], activities: [], events: [],
    profiles: [],
  });
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("Memuat…");

  const load = useCallback(async () => {
    try {
      const json = await api("/api/data");
      // Normalize date fields back to "YYYY-MM-DD" — Prisma returns full ISO strings
      // but <input type="date"> and date logic throughout the app expect "YYYY-MM-DD"
      const d10 = (v: unknown) => (typeof v === "string" && v ? v.slice(0, 10) : v);
      setData({
        clients: json.clients ?? [],
        contacts: json.contacts ?? [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        visits: (json.visits ?? []).map((v: any) => ({ ...v, date: d10(v.date), followup_date: d10(v.followup_date) }) as Visit),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deals: (json.deals ?? []).map((v: any) => ({ ...v, close_date: d10(v.close_date) }) as Deal),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        projects: (json.projects ?? []).map((v: any) => ({ ...v, golive: d10(v.golive) }) as Project),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tasks: (json.tasks ?? []).map((v: any) => ({ ...v, due_date: d10(v.due_date) }) as Task),
        products: (json.products ?? []) as Product[],
        documents: (json.documents ?? []) as CRMDocument[],
        attachments: (json.attachments ?? []) as Attachment[],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activities: (json.activities ?? []).map((v: any) => ({ ...v, date: d10(v.date) }) as Activity),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        events: (json.events ?? []).map((v: any) => ({ ...v, date: d10(v.date) }) as CalendarEvent),
        profiles: json.profiles ?? [],
      });
      if (json.currentUser) {
        setCurrentProfile({ id: json.currentUser.id, name: json.currentUser.name, email: json.currentUser.email, role: json.currentUser.role });
      }
      setSyncStatus("Tersimpan otomatis");
    } catch (e) {
      setSyncStatus(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function upsert(table: string, record: Record<string, unknown>) {
    if (!record.id) record.id = uuid();
    await api(`/api/data/${table}`, "POST", record);
    await load();
  }

  async function remove(table: string, id: string) {
    await api(`/api/data/${table}/${id}`, "DELETE");
    await load();
  }

  async function patch(table: string, id: string, data: Record<string, unknown>) {
    await api(`/api/data/${table}/${id}`, "PATCH", data);
    await load();
  }

  const upsertClient = (c: Client) => upsert("clients", c as unknown as Record<string, unknown>);
  const deleteClient = (id: string) => remove("clients", id);

  const upsertContact = (c: Contact) => upsert("contacts", c as unknown as Record<string, unknown>);
  const deleteContact = (id: string) => remove("contacts", id);

  async function upsertVisit(v: Visit) {
    await upsert("visits", v as unknown as Record<string, unknown>);
    if (v.approach === "First Meeting") {
      const dealName = (v.project && v.project.trim()) || data.clients.find(c => c.id === v.client_id)?.name || "";
      if (dealName) {
        const exists = data.deals.some(d => d.client_id === v.client_id && d.name.trim().toLowerCase() === dealName.trim().toLowerCase());
        if (!exists) {
          const owner = (v.pic || "").split(",")[0]?.trim() || "";
          await upsert("deals", {
            id: uuid(), name: dealName, client_id: v.client_id, value: 0,
            stage: "First Meeting", deal_type: "", product: "", close_date: "",
            notes: "", owner, win_loss_reason: "", competitor: "",
            stage_updated_at: new Date().toISOString(),
          });
        }
      }
    }
  }
  const deleteVisit = (id: string) => remove("visits", id);

  const upsertDeal = (d: Deal) => upsert("deals", d as unknown as Record<string, unknown>);
  const deleteDeal = (id: string) => remove("deals", id);
  const updateDealStage = (id: string, stage: string) =>
    patch("deals", id, { stage, stage_updated_at: new Date().toISOString() });

  const upsertProject = (p: Project) => upsert("projects", p as unknown as Record<string, unknown>);
  const deleteProject = (id: string) => remove("projects", id);

  const upsertTask = (t: Task) => upsert("tasks", t as unknown as Record<string, unknown>);
  const deleteTask = (id: string) => remove("tasks", id);

  const upsertProduct = (p: Product) => upsert("products", p as unknown as Record<string, unknown>);
  const deleteProduct = (id: string) => remove("products", id);

  const upsertDocument = (d: CRMDocument) => upsert("documents", d as unknown as Record<string, unknown>);
  const deleteDocument = (id: string) => remove("documents", id);

  const upsertEvent = (e: CalendarEvent) => upsert("events", e as unknown as Record<string, unknown>);
  const deleteEvent = (id: string) => remove("events", id);

  const upsertActivity = (a: Activity) => upsert("activities", a as unknown as Record<string, unknown>);
  const deleteActivity = (id: string) => remove("activities", id);

  async function uploadAttachment(file: File, dealId?: string, clientId?: string) {
    const formData = new FormData();
    formData.append("file", file);
    if (dealId) formData.append("dealId", dealId);
    if (clientId) formData.append("clientId", clientId);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || "Upload gagal");
    }
    await load();
  }

  async function deleteAttachment(id: string) {
    await api("/api/upload", "DELETE", { id });
    await load();
  }

  return {
    data, loading, syncStatus, currentProfile,
    upsertClient, deleteClient,
    upsertContact, deleteContact,
    upsertVisit, deleteVisit,
    upsertDeal, deleteDeal, updateDealStage,
    upsertProject, deleteProject,
    upsertTask, deleteTask,
    upsertProduct, deleteProduct,
    upsertDocument, deleteDocument,
    uploadAttachment, deleteAttachment,
    upsertActivity, deleteActivity,
    upsertEvent, deleteEvent,
  };
}
