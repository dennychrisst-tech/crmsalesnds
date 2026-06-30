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
      setData({
        clients: json.clients ?? [],
        contacts: json.contacts ?? [],
        visits: json.visits ?? [],
        deals: json.deals ?? [],
        projects: json.projects ?? [],
        tasks: json.tasks ?? [],
        products: json.products ?? [],
        documents: json.documents ?? [],
        attachments: json.attachments ?? [],
        activities: json.activities ?? [],
        events: json.events ?? [],
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

  const upsertVisit = (v: Visit) => upsert("visits", v as unknown as Record<string, unknown>);
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
