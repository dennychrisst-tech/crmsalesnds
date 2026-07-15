"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { Client, Contact, Visit, Deal, Project, Task, CRMDocument, Attachment, Activity, CalendarEvent, Profile, TalentRole, RevenueTarget, RevenueLine, RevenueOpportunity, MandaysRole, MandaysClientRate } from "@/types";
import { STAGES, dealYear, isWonStage } from "@/lib/utils";
import { toast } from "@/components/ui/Toast";
import { enqueue, getQueue, removeFromQueue } from "@/lib/offlineQueue";

// Thrown only when fetch() itself rejects (browser offline/DNS failure) — as
// opposed to a real HTTP error status, which keeps throwing a plain Error.
// Lets upsert() tell "queue this for later" apart from "show the user a real
// server/validation error".
class NetworkError extends Error {}

export interface AppData {
  clients: Client[];
  contacts: Contact[];
  visits: Visit[];
  deals: Deal[];
  projects: Project[];
  tasks: Task[];
  documents: CRMDocument[];
  attachments: Attachment[];
  activities: Activity[];
  events: CalendarEvent[];
  profiles: Profile[];
  // Named to match the table key exactly (like every other AppData field) since
  // load() indexes this object generically via next[tableKey].
  talent_roles: TalentRole[];
  revenue_targets: RevenueTarget[];
  revenue_lines: RevenueLine[];
  revenue_opportunities: RevenueOpportunity[];
  mandays_roles: MandaysRole[];
  mandays_client_rates: MandaysClientRate[];
}

type TableKey = "clients" | "contacts" | "visits" | "deals" | "projects" | "tasks" | "documents" | "attachments" | "activities" | "events" | "talent_roles" | "revenue_targets" | "revenue_lines" | "revenue_opportunities" | "mandays_roles" | "mandays_client_rates";

// Fetched immediately on mount — needed by the header (search/reminders) and/or
// most views, so the app can't usefully render without them.
const CORE_TABLES: TableKey[] = ["clients", "contacts", "deals", "tasks", "visits", "projects"];
// Fetched right after CORE resolves, in the background — mostly deal-detail-modal
// and Calendar specific, not needed for the app's first paint.
const LAZY_TABLES: TableKey[] = ["documents", "attachments", "activities", "events", "talent_roles", "revenue_targets", "revenue_lines", "revenue_opportunities", "mandays_roles", "mandays_client_rates"];
const ALL_TABLES: TableKey[] = [...CORE_TABLES, ...LAZY_TABLES];

// Prisma returns full ISO timestamps, but <input type="date"> and date logic
// throughout the app expect plain "YYYY-MM-DD" for these date-only columns.
const DATE_FIELDS: Partial<Record<TableKey, string[]>> = {
  visits: ["date", "followup_date"],
  deals: ["close_date"],
  projects: ["golive"],
  tasks: ["due_date"],
  activities: ["date"],
  events: ["date", "followup_date"],
  talent_roles: ["deadline"],
  revenue_opportunities: ["target_closing_date"],
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
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new NetworkError("Tidak ada koneksi internet");
  }
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
  tasks: [], documents: [], attachments: [], activities: [], events: [],
  profiles: [], talent_roles: [],
  revenue_targets: [], revenue_lines: [], revenue_opportunities: [],
  mandays_roles: [], mandays_client_rates: [],
};

export function useData() {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  // Mirrors `data` synchronously so async flows (e.g. upsertVisit's dedup check)
  // can read the latest committed state without waiting for a re-render.
  const dataRef = useRef<AppData>(EMPTY_DATA);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("Memuat…");
  // Visit/Task saves made while offline — getQueue() returns [] on the server
  // (no window), so this is already hydration-safe without an effect.
  const [pendingSyncCount, setPendingSyncCount] = useState(() => getQueue().length);

  const commit = useCallback((updater: (prev: AppData) => AppData) => {
    setData(prev => {
      const next = updater(prev);
      dataRef.current = next;
      return next;
    });
  }, []);

  // Replays queued offline Visit/Task saves in order once back online. Stops
  // at the first item that still fails on a network error (leaving the rest
  // queued for the next attempt); a non-network failure (e.g. the record was
  // invalid) instead drops that one item so it can't block the queue forever.
  const flushQueue = useCallback(async () => {
    for (const item of getQueue()) {
      try {
        const result = await api(`/api/data/${item.table}`, "POST", item.record);
        const normalized = normalizeRow(item.table, result);
        commit(prev => ({ ...prev, [item.table]: mergeRecord(prev[item.table], normalized) }));
        removeFromQueue(item.queueId);
      } catch (e) {
        if (e instanceof NetworkError) break;
        removeFromQueue(item.queueId);
        toast(`Gagal sinkron data offline: ${e instanceof Error ? e.message : "error"}`, { type: "error" });
      }
    }
    setPendingSyncCount(getQueue().length);
  }, [commit]);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.onLine) flushQueue();
    window.addEventListener("online", flushQueue);
    return () => window.removeEventListener("online", flushQueue);
  }, [flushQueue]);

  // Fetches only `tables` (defaults to everything) and merges the result into
  // local state, leaving any table not included in this call untouched.
  // skipProfiles=true omits the users DB query on the server — safe to use
  // on any call after the initial load where profiles are already in state.
  const load = useCallback(async (tables?: TableKey[], opts?: { skipProfiles?: boolean }): Promise<AppData | null> => {
    const requested = tables ?? ALL_TABLES;
    const qs = opts?.skipProfiles ? "&skipProfiles=1" : "";
    try {
      const json = await api(`/api/data?tables=${requested.join(",")}${qs}`);
      let result: AppData = dataRef.current;
      commit(prev => {
        const next = { ...prev };
        for (const t of requested) {
          next[t] = (json[t] ?? []).map((row: unknown) => normalizeRow(t, row));
        }
        // Only overwrite profiles when the server actually sent them.
        if (json.profiles) next.profiles = json.profiles;
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
    // Core tables unblock the UI first; lazy tables fill in right after.
    // Profiles are only fetched on the core call — they change rarely and
    // skipping them on the lazy call saves one DB round-trip.
    load(CORE_TABLES).then(() => load(LAZY_TABLES, { skipProfiles: true }));
  }, [load]);

  // Poll only core tables every 30s — these are the ones users interact with
  // most (clients, deals, tasks, visits, projects, contacts). Lazy tables are
  // less time-sensitive and would add unnecessary load on frequent polls.
  // Profiles are skipped — they change only when an admin modifies users.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") load(CORE_TABLES, { skipProfiles: true });
    }, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  // The poll above skips while hidden, so returning to the tab (or resuming the
  // installed PWA from the background) could show stale data — refresh all
  // tables immediately, but still skip the profiles query.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") load(ALL_TABLES, { skipProfiles: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  // Mutations update local state directly from the server's response instead of
  // re-fetching all tables — that used to happen after every single save/delete.
  // Each one reports success/failure via toast; patch stays silent on success
  // because its main caller (pipeline stage move) shows its own undo toast.
  async function upsert(table: TableKey, record: Record<string, unknown>, successMessage?: string) {
    if (!record.id) record.id = uuid();
    try {
      const result = await api(`/api/data/${table}`, "POST", record);
      const normalized = normalizeRow(table, result);
      commit(prev => ({ ...prev, [table]: mergeRecord(prev[table], normalized) }));
      toast(successMessage ?? "Tersimpan");
      return normalized;
    } catch (e) {
      // Only Visit/Task saves — the field-capture entry points — get queued
      // for later sync; every other table still surfaces the error as before.
      if (e instanceof NetworkError && (table === "visits" || table === "tasks")) {
        const pending = { ...record, _pending: true };
        commit(prev => ({ ...prev, [table]: mergeRecord(prev[table], pending) }));
        enqueue(table, record);
        setPendingSyncCount(getQueue().length);
        toast("Tersimpan offline — akan disinkronkan otomatis");
        return pending;
      }
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

  async function upsertClient(c: Client) {
    const isNew = !dataRef.current.clients.some(x => x.id === c.id);
    return upsert("clients", c as unknown as Record<string, unknown>, isNew ? `Client baru "${c.name}" berhasil ditambahkan` : undefined);
  }
  const deleteClient = makeRemove("clients");

  const upsertContact = makeUpsert<Contact>("contacts");
  const deleteContact = makeRemove("contacts");

  async function upsertVisit(v: Visit) {
    const result = await upsert("visits", v as unknown as Record<string, unknown>);
    // Offline-queued — defer the deal-stage-advance/activity-mirror side
    // effects below until this visit actually syncs (they'd otherwise run
    // against local `deals`/`activities` state that may itself be stale).
    if ((result as { _pending?: boolean } | null)?._pending) return;

    // Advance the linked deal to Present Solution if it's still earlier in the
    // pipeline (visit approach "First Meeting" is a Visit-side label, distinct
    // from the Deal stage vocabulary — it just marks the first client contact).
    if (v.approach === "First Meeting" && v.deal_id) {
      const deal = dataRef.current.deals.find(d => d.id === v.deal_id);
      if (deal) {
        const stageOrder = STAGES.indexOf(deal.stage as typeof STAGES[number]);
        const presentSolutionOrder = STAGES.indexOf("Present Solution");
        if (stageOrder !== -1 && stageOrder < presentSolutionOrder) {
          await patch("deals", deal.id, { stage: "Present Solution", stage_updated_at: new Date().toISOString() });
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

  // Auto-hands a Deal off to Revenue Forecast the moment it first becomes Won
  // (Dealed/PO/Kontrak are all "won" — see isWonStage) — previously someone
  // had to remember to separately create a RevenueLine for billing/invoicing
  // at exactly the point the two systems should meet. Firing on Dealed rather
  // than waiting for Kontrak specifically matters: yearOpps (RevenueForecastView)
  // drops a deal the moment it's Won, so without this it goes uncounted
  // anywhere in the forecast for however long it sits in Dealed/PO before
  // someone formalizes the contract. Only fires on the transition into Won
  // (not every re-save while already Won, and not again when e.g. Dealed
  // advances to PO), and only once per deal (checked via RevenueLine.deal_id)
  // so re-entering a won stage later doesn't spawn a second draft.
  // The single starter milestone carries the deal's full value over so it
  // doesn't silently drop to Rp0 in "Contracted" until someone splits it into
  // real billing milestones.
  async function handleWonHandOff(deal: Deal, prevStage: string | undefined) {
    if (!isWonStage(deal.stage) || isWonStage(prevStage || "")) return;
    if (dataRef.current.revenue_lines.some(l => l.deal_id === deal.id)) return;
    await upsert("revenue_lines", {
      id: uuid(), year: dealYear(deal), category: "Project",
      project_name: deal.name, pic: deal.owner || "",
      milestones: deal.value
        ? [{ id: uuid(), label: "Full Value (auto)", percent: 100, amount: deal.value, target_month: null, status: "To be billed" }]
        : [],
      notes: `Auto-dibuat dari Pipeline saat deal masuk stage ${deal.stage} — sesuaikan milestone invoicing.`,
      deal_id: deal.id,
    });
    toast(`"${deal.name}" ditambahkan ke Revenue Forecast — sesuaikan milestone invoicing`);
  }

  async function upsertDeal(d: Deal) {
    const prevStage = dataRef.current.deals.find(x => x.id === d.id)?.stage;
    await upsert("deals", d as unknown as Record<string, unknown>);
    await handleWonHandOff(d, prevStage);
  }
  const deleteDeal = makeRemove("deals");
  async function updateDealStage(id: string, stage: string) {
    const prev = dataRef.current.deals.find(d => d.id === id);
    const result = await patch("deals", id, { stage, stage_updated_at: new Date().toISOString() });
    if (prev) await handleWonHandOff({ ...prev, stage: stage as Deal["stage"] }, prev.stage);
    return result;
  }

  const upsertProject = makeUpsert<Project>("projects");
  const deleteProject = makeRemove("projects");

  const upsertTalentRole = makeUpsert<TalentRole>("talent_roles");
  const deleteTalentRole = makeRemove("talent_roles");

  const upsertRevenueTarget = makeUpsert<RevenueTarget>("revenue_targets");
  const deleteRevenueTarget = makeRemove("revenue_targets");

  const upsertRevenueLine = makeUpsert<RevenueLine>("revenue_lines");
  const deleteRevenueLine = makeRemove("revenue_lines");

  const upsertRevenueOpportunity = makeUpsert<RevenueOpportunity>("revenue_opportunities");
  const deleteRevenueOpportunity = makeRemove("revenue_opportunities");

  const upsertMandaysRole = makeUpsert<MandaysRole>("mandays_roles");
  const deleteMandaysRole = makeRemove("mandays_roles");

  const upsertMandaysClientRate = makeUpsert<MandaysClientRate>("mandays_client_rates");
  const deleteMandaysClientRate = makeRemove("mandays_client_rates");

  const upsertTask = makeUpsert<Task>("tasks");
  const deleteTask = makeRemove("tasks");

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
    data, loading, syncStatus, currentProfile, pendingSyncCount,
    upsertClient, deleteClient,
    upsertContact, deleteContact,
    upsertVisit, deleteVisit,
    upsertDeal, deleteDeal, updateDealStage,
    upsertProject, deleteProject,
    upsertTalentRole, deleteTalentRole,
    upsertRevenueTarget, deleteRevenueTarget,
    upsertRevenueLine, deleteRevenueLine,
    upsertRevenueOpportunity, deleteRevenueOpportunity,
    upsertMandaysRole, deleteMandaysRole,
    upsertMandaysClientRate, deleteMandaysClientRate,
    upsertTask, deleteTask,
    upsertDocument, deleteDocument,
    uploadAttachment, deleteAttachment,
    uploadClientLogo, deleteClientLogo,
    upsertActivity, deleteActivity,
    upsertEvent, deleteEvent,
  };
}
