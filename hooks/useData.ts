"use client";
import { useState, useEffect, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import { Client, Visit, Deal, Project } from "@/types";

export interface AppData {
  clients: Client[];
  visits: Visit[];
  deals: Deal[];
  projects: Project[];
}

export function useData() {
  const [data, setData] = useState<AppData>({ clients: [], visits: [], deals: [], projects: [] });
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("Memuat…");

  const load = useCallback(async () => {
    try {
      const [c, v, d, p] = await Promise.all([
        getSupabase().from("clients").select("*").order("created_at"),
        getSupabase().from("visits").select("*").order("date"),
        getSupabase().from("deals").select("*").order("created_at"),
        getSupabase().from("projects").select("*").order("created_at"),
      ]);
      setData({
        clients: (c.data || []) as Client[],
        visits: (v.data || []) as Visit[],
        deals: (d.data || []) as Deal[],
        projects: (p.data || []) as Project[],
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

  return {
    data, loading, syncStatus,
    upsertClient, deleteClient,
    upsertVisit, deleteVisit,
    upsertDeal, deleteDeal, updateDealStage,
    upsertProject, deleteProject,
  };
}
