"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { v4 as uuid } from "uuid";
import { getSupabase } from "@/lib/supabase";
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

export function useData() {
  const [data, setData] = useState<AppData>({
    clients: [], contacts: [], visits: [], deals: [], projects: [],
    tasks: [], products: [], documents: [], attachments: [], activities: [], events: [],
    profiles: [],
  });
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const userIdRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("Memuat…");

  const load = useCallback(async () => {
    try {
      const sb = getSupabase();
      const [c, ct, v, d, p, t, pr, doc, att, act, ev, prof, { data: { user } }] = await Promise.all([
        sb.from("clients").select("*").order("created_at"),
        sb.from("contacts").select("*").order("created_at"),
        sb.from("visits").select("*").order("date"),
        sb.from("deals").select("*").order("created_at"),
        sb.from("projects").select("*").order("created_at"),
        sb.from("tasks").select("*").order("due_date"),
        sb.from("products").select("*").order("name"),
        sb.from("documents").select("*").order("created_at"),
        sb.from("attachments").select("*").order("uploaded_at"),
        sb.from("activities").select("*").order("created_at", { ascending: false }),
        sb.from("events").select("*").order("date"),
        sb.from("profiles").select("id, name, email, role").order("name"),
        sb.auth.getUser(),
      ]);
      const profiles = (prof.data || []) as Profile[];
      userIdRef.current = user?.id ?? null;
      setData({
        clients: (c.data || []) as Client[],
        contacts: (ct.data || []) as Contact[],
        visits: (v.data || []) as Visit[],
        deals: (d.data || []) as Deal[],
        projects: (p.data || []) as Project[],
        tasks: (t.data || []) as Task[],
        products: (pr.data || []) as Product[],
        documents: (doc.data || []) as CRMDocument[],
        attachments: (att.data || []) as Attachment[],
        activities: (act.data || []) as Activity[],
        events: (ev.data || []) as CalendarEvent[],
        profiles,
      });
      setCurrentProfile(profiles.find(p => p.id === user?.id) ?? null);
      setSyncStatus("Tersimpan otomatis");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memuat data";
      setSyncStatus(msg.includes("env") ? "⚠ Set NEXT_PUBLIC_SUPABASE_URL & ANON_KEY" : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Tags a new record with the current user's ID if not already set
  function withCreator<T extends { created_by_id?: string }>(record: T): T {
    if (!record.created_by_id && userIdRef.current) {
      return { ...record, created_by_id: userIdRef.current };
    }
    return record;
  }

  async function upsertClient(client: Client) {
    const { error } = await getSupabase().from("clients").upsert(withCreator(client));
    if (error) throw error;
    await load();
  }
  async function deleteClient(id: string) {
    const { error } = await getSupabase().from("clients").delete().eq("id", id);
    if (error) throw error;
    await load();
  }

  async function upsertContact(contact: Contact) {
    const { error } = await getSupabase().from("contacts").upsert(withCreator(contact));
    if (error) throw error;
    await load();
  }
  async function deleteContact(id: string) {
    const { error } = await getSupabase().from("contacts").delete().eq("id", id);
    if (error) throw error;
    await load();
  }

  async function upsertVisit(visit: Visit) {
    const payload = withCreator({
      ...visit,
      date: visit.date ? new Date(visit.date + "T00:00:00").toISOString() : visit.date,
    });
    const { error } = await getSupabase().from("visits").upsert(payload);
    if (error) throw error;
    await load();
  }
  async function deleteVisit(id: string) {
    const { error } = await getSupabase().from("visits").delete().eq("id", id);
    if (error) throw error;
    await load();
  }

  async function upsertDeal(deal: Deal) {
    const { error } = await getSupabase().from("deals").upsert(withCreator(deal));
    if (error) throw error;
    await load();
  }
  async function deleteDeal(id: string) {
    const { error } = await getSupabase().from("deals").delete().eq("id", id);
    if (error) throw error;
    await load();
  }
  async function updateDealStage(id: string, stage: string) {
    const { error } = await getSupabase().from("deals").update({ stage, stage_updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    await load();
  }

  async function upsertProject(project: Project) {
    const { error } = await getSupabase().from("projects").upsert(withCreator(project));
    if (error) throw error;
    await load();
  }
  async function deleteProject(id: string) {
    const { error } = await getSupabase().from("projects").delete().eq("id", id);
    if (error) throw error;
    await load();
  }

  async function upsertTask(task: Task) {
    const { error } = await getSupabase().from("tasks").upsert(withCreator(task));
    if (error) throw error;
    await load();
  }
  async function deleteTask(id: string) {
    const { error } = await getSupabase().from("tasks").delete().eq("id", id);
    if (error) throw error;
    await load();
  }

  async function upsertProduct(product: Product) {
    const { error } = await getSupabase().from("products").upsert(withCreator(product));
    if (error) throw error;
    await load();
  }
  async function deleteProduct(id: string) {
    const { error } = await getSupabase().from("products").delete().eq("id", id);
    if (error) throw error;
    await load();
  }

  async function upsertDocument(doc: CRMDocument) {
    const { error } = await getSupabase().from("documents").upsert(withCreator(doc));
    if (error) throw error;
    await load();
  }
  async function deleteDocument(id: string) {
    const { error } = await getSupabase().from("documents").delete().eq("id", id);
    if (error) throw error;
    await load();
  }

  async function upsertEvent(event: CalendarEvent) {
    const { error } = await getSupabase().from("events").upsert(withCreator(event));
    if (error) throw error;
    await load();
  }
  async function deleteEvent(id: string) {
    const { error } = await getSupabase().from("events").delete().eq("id", id);
    if (error) throw error;
    await load();
  }

  async function upsertActivity(activity: Activity) {
    const { error } = await getSupabase().from("activities").upsert(withCreator(activity));
    if (error) throw error;
    await load();
  }
  async function deleteActivity(id: string) {
    const { error } = await getSupabase().from("activities").delete().eq("id", id);
    if (error) throw error;
    await load();
  }

  async function uploadAttachment(file: File, dealId?: string, clientId?: string) {
    const sb = getSupabase();
    const folder = dealId || clientId || "misc";
    const path = `${folder}/${Date.now()}-${file.name}`;

    const { error: upErr } = await sb.storage.from("crm-attachments").upload(path, file);
    if (upErr) throw upErr;

    const { data: { publicUrl } } = sb.storage.from("crm-attachments").getPublicUrl(path);

    const { error } = await sb.from("attachments").insert({
      id: uuid(),
      deal_id: dealId || null,
      client_id: clientId || null,
      file_name: file.name,
      file_url: publicUrl,
      file_size: file.size,
      created_by_id: userIdRef.current ?? undefined,
    });
    if (error) throw error;
    await load();
  }

  async function deleteAttachment(id: string) {
    const sb = getSupabase();
    const { data: att } = await sb.from("attachments").select("file_url").eq("id", id).single();
    if (att?.file_url) {
      try {
        const url = new URL(att.file_url);
        const parts = url.pathname.split("/crm-attachments/");
        if (parts[1]) await sb.storage.from("crm-attachments").remove([decodeURIComponent(parts[1])]);
      } catch (_) {}
    }
    const { error } = await sb.from("attachments").delete().eq("id", id);
    if (error) throw error;
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
