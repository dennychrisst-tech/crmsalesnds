"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { Client, Contact, Visit, Deal, Project, Task, Product, CRMDocument, Attachment, Activity, CalendarEvent, Profile } from "@/types";
import { STAGES } from "@/lib/utils";

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

type TableKey = "clients" | "contacts" | "visits" | "deals" | "projects" | "tasks" | "products" | "documents" | "attachments" | "activities" | "events";

// Prisma returns full ISO timestamps, but <input type="date"> and date logic
// throughout the app expect plain "YYYY-MM-DD" for these date-only columns.
const DATE_FIELDS: Partial<Record<TableKey, string[]>> = {
  visits: ["date", "followup_date"],
  deals: ["close_date"],
  projects: ["golive"],
  tasks: ["due_date"],
  activities: ["date"],
  events: ["date"],
};

function d10(v: unknown): unknown {
  return typeof v === "string" && v ? v.slice(0, 10) : v;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeRow(table: TableKey, row: any): any {
  const fields = DATE_FIELDS[table];
  if (!fields || !row) return row;
  const patched = { ...row };
  for (const f of fields) patched[f] = d10(patched[f]);
  return patched;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeRecord(list: any[], record: any): any[] {
  const idx = list.findIndex(item => item.id === record.id);
  if (idx === -1) return [...list, record];
  const next = [...list];
  next[idx] = record;
  return next;
}

const EMPTY_DATA: AppData = {
  clients: [], contacts: [], visits: [], deals: [], projects: [],
  tasks: [], products: [], documents: [], attachments: [], activities: [], events: [],
  profiles: [],
};

export function useData() {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  // Mirrors `data` synchronously so async flows (e.g. upsertVisit's dedup check)
  // can read the latest committed state without waiting for a re-render.
  const dataRef = useRef<AppData>(EMPTY_DATA);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("Memuat…");

  const commit = useCallback((updater: (prev: AppData) => AppData) => {
    setData(prev => {
      const next = updater(prev);
      dataRef.current = next;
      return next;
    });
  }, []);

  const load = useCallback(async (): Promise<AppData | null> => {
    try {
      const json = await api("/api/data");
      const fresh: AppData = {
        clients: json.clients ?? [],
        contacts: json.contacts ?? [],
        visits: (json.visits ?? []).map((v: Visit) => normalizeRow("visits", v)),
        deals: (json.deals ?? []).map((v: Deal) => normalizeRow("deals", v)),
        projects: (json.projects ?? []).map((v: Project) => normalizeRow("projects", v)),
        tasks: (json.tasks ?? []).map((v: Task) => normalizeRow("tasks", v)),
        products: (json.products ?? []) as Product[],
        documents: (json.documents ?? []) as CRMDocument[],
        attachments: (json.attachments ?? []) as Attachment[],
        activities: (json.activities ?? []).map((v: Activity) => normalizeRow("activities", v)),
        events: (json.events ?? []).map((v: CalendarEvent) => normalizeRow("events", v)),
        profiles: json.profiles ?? [],
      };
      commit(() => fresh);
      if (json.currentUser) {
        setCurrentProfile({ id: json.currentUser.id, name: json.currentUser.name, email: json.currentUser.email, role: json.currentUser.role });
      }
      setSyncStatus("Tersimpan otomatis");
      return fresh;
    } catch (e) {
      setSyncStatus(e instanceof Error ? e.message : "Gagal memuat data");
      return null;
    } finally {
      setLoading(false);
    }
  }, [commit]);

  useEffect(() => { load(); }, [load]);

  // Poll every 30s so idle tabs pick up changes made elsewhere without a manual refresh.
  // Skips while the tab is hidden/backgrounded to avoid wasted requests.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  // Mutations update local state directly from the server's response instead of
  // re-fetching all 12 tables — that used to happen after every single save/delete.
  async function upsert(table: TableKey, record: Record<string, unknown>) {
    if (!record.id) record.id = uuid();
    const result = await api(`/api/data/${table}`, "POST", record);
    const normalized = normalizeRow(table, result);
    commit(prev => ({ ...prev, [table]: mergeRecord(prev[table], normalized) }));
    return normalized;
  }

  async function remove(table: TableKey, id: string) {
    await api(`/api/data/${table}/${id}`, "DELETE");
    commit(prev => ({ ...prev, [table]: (prev[table] as { id: string }[]).filter(item => item.id !== id) }));
  }

  async function patch(table: TableKey, id: string, patchData: Record<string, unknown>) {
    const result = await api(`/api/data/${table}/${id}`, "PATCH", patchData);
    const normalized = normalizeRow(table, result);
    commit(prev => ({ ...prev, [table]: mergeRecord(prev[table], normalized) }));
    return normalized;
  }

  const upsertClient = (c: Client) => upsert("clients", c as unknown as Record<string, unknown>);
  const deleteClient = (id: string) => remove("clients", id);

  const upsertContact = (c: Contact) => upsert("contacts", c as unknown as Record<string, unknown>);
  const deleteContact = (id: string) => remove("contacts", id);

  async function upsertVisit(v: Visit) {
    await upsert("visits", v as unknown as Record<string, unknown>);
    if (v.approach === "First Meeting") {
      const fresh = dataRef.current;
      const dealName = (v.project && v.project.trim()) || fresh.clients.find(c => c.id === v.client_id)?.name || "";
      if (dealName) {
        const existing = fresh.deals.find(d => d.client_id === v.client_id && d.name.trim().toLowerCase() === dealName.trim().toLowerCase());
        if (!existing) {
          const owner = (v.pic || "").split(",")[0]?.trim() || "";
          await upsert("deals", {
            id: uuid(), name: dealName, client_id: v.client_id, value: 0,
            stage: "First Meeting", deal_type: "", product: "", close_date: "",
            notes: "", owner, win_loss_reason: "", competitor: "",
            stage_updated_at: new Date().toISOString(),
          });
        } else {
          const stageOrder = STAGES.indexOf(existing.stage as typeof STAGES[number]);
          const firstMeetingOrder = STAGES.indexOf("First Meeting");
          if (stageOrder !== -1 && stageOrder < firstMeetingOrder) {
            await patch("deals", existing.id, { stage: "First Meeting", stage_updated_at: new Date().toISOString() });
          }
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
    const attachment = await res.json();
    commit(prev => ({ ...prev, attachments: mergeRecord(prev.attachments, attachment) }));
  }

  async function deleteAttachment(id: string) {
    await api("/api/upload", "DELETE", { id });
    commit(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== id) }));
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
