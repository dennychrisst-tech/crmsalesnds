"use client";
import { useState, useEffect, useCallback } from "react";
import { v4 as uuid } from "uuid";
import { getSupabase } from "@/lib/supabase";
import { Client, Contact, Visit, Deal, Project, Task, Product, CRMDocument, Attachment } from "@/types";

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
}

export function useData() {
  const [data, setData] = useState<AppData>({
    clients: [], contacts: [], visits: [], deals: [], projects: [],
    tasks: [], products: [], documents: [], attachments: [],
  });
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("Memuat…");

  const load = useCallback(async () => {
    try {
      const [c, ct, v, d, p, t, pr, doc, att] = await Promise.all([
        getSupabase().from("clients").select("*").order("created_at"),
        getSupabase().from("contacts").select("*").order("created_at"),
        getSupabase().from("visits").select("*").order("date"),
        getSupabase().from("deals").select("*").order("created_at"),
        getSupabase().from("projects").select("*").order("created_at"),
        getSupabase().from("tasks").select("*").order("due_date"),
        getSupabase().from("products").select("*").order("name"),
        getSupabase().from("documents").select("*").order("created_at"),
        getSupabase().from("attachments").select("*").order("uploaded_at"),
      ]);
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
      });
      setSyncStatus("Tersimpan otomatis");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memuat data";
      setSyncStatus(msg.includes("env") ? "⚠ Set NEXT_PUBLIC_SUPABASE_URL & ANON_KEY" : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function upsertClient(client: Client) {
    const { error } = await getSupabase().from("clients").upsert(client);
    if (error) throw error;
    await load();
  }
  async function deleteClient(id: string) {
    const { error } = await getSupabase().from("clients").delete().eq("id", id);
    if (error) throw error;
    await load();
  }

  async function upsertContact(contact: Contact) {
    const { error } = await getSupabase().from("contacts").upsert(contact);
    if (error) throw error;
    await load();
  }
  async function deleteContact(id: string) {
    const { error } = await getSupabase().from("contacts").delete().eq("id", id);
    if (error) throw error;
    await load();
  }

  async function upsertVisit(visit: Visit) {
    const { error } = await getSupabase().from("visits").upsert(visit);
    if (error) throw error;
    await load();
  }
  async function deleteVisit(id: string) {
    const { error } = await getSupabase().from("visits").delete().eq("id", id);
    if (error) throw error;
    await load();
  }

  async function upsertDeal(deal: Deal) {
    const { error } = await getSupabase().from("deals").upsert(deal);
    if (error) throw error;
    await load();
  }
  async function deleteDeal(id: string) {
    const { error } = await getSupabase().from("deals").delete().eq("id", id);
    if (error) throw error;
    await load();
  }
  async function updateDealStage(id: string, stage: string) {
    const { error } = await getSupabase().from("deals").update({ stage }).eq("id", id);
    if (error) throw error;
    await load();
  }

  async function upsertProject(project: Project) {
    const { error } = await getSupabase().from("projects").upsert(project);
    if (error) throw error;
    await load();
  }
  async function deleteProject(id: string) {
    const { error } = await getSupabase().from("projects").delete().eq("id", id);
    if (error) throw error;
    await load();
  }

  async function upsertTask(task: Task) {
    const { error } = await getSupabase().from("tasks").upsert(task);
    if (error) throw error;
    await load();
  }
  async function deleteTask(id: string) {
    const { error } = await getSupabase().from("tasks").delete().eq("id", id);
    if (error) throw error;
    await load();
  }

  async function upsertProduct(product: Product) {
    const { error } = await getSupabase().from("products").upsert(product);
    if (error) throw error;
    await load();
  }
  async function deleteProduct(id: string) {
    const { error } = await getSupabase().from("products").delete().eq("id", id);
    if (error) throw error;
    await load();
  }

  async function upsertDocument(doc: CRMDocument) {
    const { error } = await getSupabase().from("documents").upsert(doc);
    if (error) throw error;
    await load();
  }
  async function deleteDocument(id: string) {
    const { error } = await getSupabase().from("documents").delete().eq("id", id);
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
    data, loading, syncStatus,
    upsertClient, deleteClient,
    upsertContact, deleteContact,
    upsertVisit, deleteVisit,
    upsertDeal, deleteDeal, updateDealStage,
    upsertProject, deleteProject,
    upsertTask, deleteTask,
    upsertProduct, deleteProduct,
    upsertDocument, deleteDocument,
    uploadAttachment, deleteAttachment,
  };
}
