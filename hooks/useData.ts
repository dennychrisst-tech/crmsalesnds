"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { Client, Contact, Visit, Deal, Project, Task, Product, CRMDocument, Attachment, Activity, CalendarEvent, Profile } from "@/types";
import { STAGES } from "@/lib/utils";
import { toast } from "@/components/ui/Toast";

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

// Fetched immediately on mount — needed by the header (search/reminders) and/or
// most views, so the app can't usefully render without them.
const CORE_TABLES: TableKey[] = ["clients", "contacts", "deals", "tasks", "visits", "projects"];
// Fetched right after CORE resolves, in the background — mostly deal-detail-modal
// and Calendar/catalog specific, not needed for the app's first paint.
const LAZY_TABLES: TableKey[] = ["products", "documents", "attachments", "activities", "events"];
const ALL_TABLES: TableKey[] = [...CORE_TABLES, ...LAZY_TABLES];

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
  if (res.status === 401) {
    // Session expired (JWT is valid for 24h) — force logout. The 30s poll goes
    // through here too, so an idle open tab/PWA lands on /login within ~30s.
    window.location.replace("/login");
    throw new Error("Sesi berakhir, silakan login ulang");
  }
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

  // Fetches only `tables` (defaults to everything) and merges the result into
  // local state, leaving any table not included in this call untouched.
  const load = useCallback(async (tables?: TableKey[]): Promise<AppData | null> => {
    const requested = tables ?? ALL_TABLES;
    try {
      const json = await api(`/api/data?tables=${requested.join(",")}`);
      let result: AppData = dataRef.current;
      commit(prev => {
        const next = { ...prev };
        for (const t of requested) {
          next[t] = (json[t] ?? []).map((row: unknown) => normalizeRow(t, row));
        }
        next.profiles = json.profiles ?? prev.profiles;
        result = next;
        return next;
      });
      if (json.currentUser) {
        setCurrentProfile({ id: json.currentUser.id, name: json.currentUser.name, email: json.currentUser.email, role: json.currentUser.role });
      }
      setSyncStatus("Tersimpan otomatis");
      return result;
    } catch (e) {
      setSyncStatus(e instanceof Error ? e.message : "Gagal memuat data");
      return null;
    } finally {
      setLoading(false);
    }
  }, [commit]);

  useEffect(() => {
    // Core tables unblock the UI first; secondary tables (mostly deal-detail-modal
    // and calendar/catalog specific) fill in a moment later in the background.
    load(CORE_TABLES).then(() => load(LAZY_TABLES));
  }, [load]);

  // Poll everything every 30s so idle tabs pick up changes made elsewhere without
  // a manual refresh. Skips while the tab is hidden/backgrounded to avoid waste.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  // The poll above skips while hidden, so returning to the tab (or resuming the
  // installed PWA from the background) could show stale data for up to 30s —
  // refresh immediately instead.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  // Mutations update local state directly from the server's response instead of
  // re-fetching all tables — that used to happen after every single save/delete.
  // Each one reports success/failure via toast; patch stays silent on success
  // because its main caller (pipeline stage move) shows its own undo toast.
  async function upsert(table: TableKey, record: Record<string, unknown>) {
    if (!record.id) record.id = uuid();
    try {
      const result = await api(`/api/data/${table}`, "POST", record);
      const normalized = normalizeRow(table, result);
      commit(prev => ({ ...prev, [table]: mergeRecord(prev[table], normalized) }));
      toast("Tersimpan");
      return normalized;
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menyimpan", { type: "error" });
      throw e;
    }
  }

  async function remove(table: TableKey, id: string) {
    try {
      await api(`/api/data/${table}/${id}`, "DELETE");
      commit(prev => ({ ...prev, [table]: (prev[table] as { id: string }[]).filter(item => item.id !== id) }));
      toast("Terhapus");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menghapus", { type: "error" });
      throw e;
    }
  }

  async function patch(table: TableKey, id: string, patchData: Record<string, unknown>) {
    try {
      const result = await api(`/api/data/${table}/${id}`, "PATCH", patchData);
      const normalized = normalizeRow(table, result);
      commit(prev => ({ ...prev, [table]: mergeRecord(prev[table], normalized) }));
      return normalized;
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menyimpan", { type: "error" });
      throw e;
    }
  }

  function makeUpsert<T extends { id: string }>(table: TableKey) {
    return (record: T) => upsert(table, record as unknown as Record<string, unknown>);
  }
  function makeRemove(table: TableKey) {
    return (id: string) => remove(table, id);
  }

  const upsertClient = makeUpsert<Client>("clients");
  const deleteClient = makeRemove("clients");

  const upsertContact = makeUpsert<Contact>("contacts");
  const deleteContact = makeRemove("contacts");

  async function upsertVisit(v: Visit) {
    await upsert("visits", v as unknown as Record<string, unknown>);

    // Advance the linked deal to First Meeting if it's still earlier in the pipeline.
    if (v.approach === "First Meeting" && v.deal_id) {
      const deal = dataRef.current.deals.find(d => d.id === v.deal_id);
      if (deal) {
        const stageOrder = STAGES.indexOf(deal.stage as typeof STAGES[number]);
        const firstMeetingOrder = STAGES.indexOf("First Meeting");
        if (stageOrder !== -1 && stageOrder < firstMeetingOrder) {
          await patch("deals", deal.id, { stage: "First Meeting", stage_updated_at: new Date().toISOString() });
        }
      }
    }

    // Keep an auto-generated Activity in sync with this visit's outcome, reusing
    // the visit's own id so re-saving always updates the same activity instead
    // of creating duplicates.
    const shouldHaveActivity = v.status === "Done" && v.summary.trim() && v.deal_id;
    if (shouldHaveActivity) {
      await upsert("activities", {
        id: v.id, deal_id: v.deal_id, client_id: null, type: "Visit",
        description: v.summary.trim(), date: v.date,
        created_by: (v.pic || "").split(",")[0]?.trim() || "",
      });
    } else if (dataRef.current.activities.some(a => a.id === v.id)) {
      await remove("activities", v.id);
    }
  }

  async function deleteVisit(id: string) {
    await remove("visits", id);
    if (dataRef.current.activities.some(a => a.id === id)) {
      await remove("activities", id);
    }
  }

  const upsertDeal = makeUpsert<Deal>("deals");
  const deleteDeal = makeRemove("deals");
  const updateDealStage = (id: string, stage: string) =>
    patch("deals", id, { stage, stage_updated_at: new Date().toISOString() });

  const upsertProject = makeUpsert<Project>("projects");
  const deleteProject = makeRemove("projects");

  const upsertTask = makeUpsert<Task>("tasks");
  const deleteTask = makeRemove("tasks");

  const upsertProduct = makeUpsert<Product>("products");
  const deleteProduct = makeRemove("products");

  const upsertDocument = makeUpsert<CRMDocument>("documents");
  const deleteDocument = makeRemove("documents");

  const upsertEvent = makeUpsert<CalendarEvent>("events");
  const deleteEvent = makeRemove("events");

  const upsertActivity = makeUpsert<Activity>("activities");
  const deleteActivity = makeRemove("activities");

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

  async function uploadClientLogo(file: File, clientId: string): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("clientId", clientId);
    const res = await fetch("/api/upload/logo", { method: "POST", body: formData });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || "Upload logo gagal");
    }
    const { url } = await res.json();
    return url as string;
  }

  async function deleteClientLogo(url: string) {
    await api("/api/upload/logo", "DELETE", { url });
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
    uploadClientLogo, deleteClientLogo,
    upsertActivity, deleteActivity,
    upsertEvent, deleteEvent,
  };
}
