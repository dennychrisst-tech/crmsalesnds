"use client";
import { useState, useRef, useEffect } from "react";
import { History } from "lucide-react";

interface LogEntry {
  id: string;
  action: string; // "<table>.create" | "<table>.update" | "<table>.delete"
  target: string;
  actor_name: string;
  created_at: string;
}

const TABLE_LABELS: Record<string, string> = {
  clients: "client", contacts: "kontak", visits: "visit", deals: "deal", projects: "project",
  tasks: "task", products: "produk", documents: "dokumen", attachments: "attachment",
  activities: "aktivitas", events: "event", talent_roles: "talent role",
  revenue_targets: "revenue target", revenue_lines: "revenue line",
  revenue_opportunities: "revenue opportunity", mandays_roles: "mandays role",
  mandays_client_rates: "mandays rate",
};

const VERB_LABELS: Record<string, string> = { create: "menambahkan", update: "mengubah", delete: "menghapus" };

function describeAction(action: string): { table: string; verb: string } {
  const idx = action.lastIndexOf(".");
  return { table: action.slice(0, idx), verb: action.slice(idx + 1) };
}

function timeAgo(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 1) return "baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} jam lalu`;
  return `${Math.floor(diffHr / 24)} hari lalu`;
}

// Last-seen timestamp lives in localStorage (mirrors RemindersBell's snooze
// storage) so the unread badge survives a refresh but is purely a per-device
// "have I opened this" marker, not synced anywhere.
const SEEN_KEY = "crm_logbook_last_seen";

export default function LogbookBell() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [lastSeen, setLastSeen] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(SEEN_KEY) ?? "0");
    setLastSeen(stored);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/activity-log");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setLogs(json);
      } catch {
        // best-effort widget — a failed fetch just leaves the last-known list showing
      }
    }
    load();
    const interval = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function updatePosition() {
    if (!bellRef.current) return;
    const rect = bellRef.current.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 20);
    const left = Math.max(10, Math.min(rect.right - width, window.innerWidth - width - 10));
    setPos({ top: rect.bottom + 6, left, width });
  }

  function toggle() {
    if (!open) {
      updatePosition();
      const now = Date.now();
      window.localStorage.setItem(SEEN_KEY, String(now));
      setLastSeen(now);
    }
    setOpen(o => !o);
  }

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [open]);

  const unseenCount = logs.filter(l => new Date(l.created_at).getTime() > lastSeen).length;

  return (
    <div ref={ref} className="rb-wrap">
      <button ref={bellRef} className="rb-bell" onClick={toggle} title="Logbook" aria-label="Logbook">
        <History size={17} />
        {unseenCount > 0 && <span className="rb-badge">{unseenCount > 9 ? "9+" : unseenCount}</span>}
      </button>
      {open && pos && (
        <div className="rb-dropdown" style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}>
          <div className="rb-header"><span>Logbook</span></div>
          {logs.length === 0 ? (
            <div className="rb-empty">Belum ada aktivitas.</div>
          ) : logs.map(l => {
            const { table, verb } = describeAction(l.action);
            const tableLabel = TABLE_LABELS[table] ?? table;
            const verbLabel = VERB_LABELS[verb] ?? verb;
            return (
              <div key={l.id} className="rb-item">
                <div className="rb-item-text">
                  <div className="rb-item-title">
                    {l.actor_name || "Seseorang"} {verbLabel} {tableLabel}{l.target ? ` "${l.target}"` : ""}
                  </div>
                  <div className="rb-item-sub">{timeAgo(l.created_at)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
