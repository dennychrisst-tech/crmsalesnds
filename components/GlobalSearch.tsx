"use client";
import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { AppData } from "@/hooks/useData";
import { ActiveView } from "@/types";

interface Props {
  data: AppData;
  onNavigate: (view: ActiveView) => void;
  onOpenClient: (id: string) => void;
  onOpenDeal: (id: string) => void;
  onOpenTask: (id: string) => void;
}

const RESULT_VIEW: Record<Result["type"], ActiveView> = { Client: "clients", Project: "pipeline", Task: "tasks" };
const RESULT_LABEL: Record<Result["type"], string> = { Client: "client", Project: "project", Task: "task" };

interface Result {
  type: "Client" | "Project" | "Task";
  label: string;
  sub: string;
  go: () => void;
}

export default function GlobalSearch({ data, onNavigate, onOpenClient, onOpenDeal, onOpenTask }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Ctrl+K / Cmd+K focuses the search from anywhere.
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const term = q.trim().toLowerCase();
  const results: Result[] = [];
  // How many matches exist beyond what's shown per category — surfaced as a
  // "+N lainnya" line so a truncated list doesn't read as "no more results".
  const moreCounts: Record<Result["type"], number> = { Client: 0, Project: 0, Task: 0 };

  if (term.length >= 2) {
    const clientMatches = data.clients.filter(c => c.name.toLowerCase().includes(term) || c.sector.toLowerCase().includes(term));
    clientMatches.slice(0, 4).forEach(c => results.push({
      type: "Client", label: c.name, sub: `${c.sector} · ${c.status}`,
      go: () => onOpenClient(c.id),
    }));
    moreCounts.Client = Math.max(0, clientMatches.length - 4);

    const dealMatches = data.deals.filter(d => d.name.toLowerCase().includes(term) || (d.product || "").toLowerCase().includes(term));
    dealMatches.slice(0, 4).forEach(d => {
      const cn = data.clients.find(c => c.id === d.client_id)?.name || "—";
      results.push({
        type: "Project", label: d.name, sub: `${cn} · ${d.stage}`,
        go: () => onOpenDeal(d.id),
      });
    });
    moreCounts.Project = Math.max(0, dealMatches.length - 4);

    const taskMatches = data.tasks.filter(t => t.title.toLowerCase().includes(term));
    taskMatches.slice(0, 3).forEach(t => results.push({
      type: "Task", label: t.title, sub: `${t.due_date || "—"} · ${t.assigned_to || "—"}`,
      go: () => onOpenTask(t.id),
    }));
    moreCounts.Task = Math.max(0, taskMatches.length - 3);
  }

  function seeMore(type: Result["type"]) {
    onNavigate(RESULT_VIEW[type]);
    setQ("");
    setOpen(false);
  }

  function pick(r: Result) {
    r.go();
    setQ("");
    setOpen(false);
    setActiveIdx(0);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results.length) {
      e.preventDefault();
      pick(results[Math.min(activeIdx, results.length - 1)]);
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const typeCls: Record<string, string> = { Client: "gs-type-client", Project: "gs-type-deal", Task: "gs-type-task" };

  return (
    <div ref={ref} className="gs-wrap">
      <div className="gs-input-wrap">
        <span className="gs-icon"><Search size={15} /></span>
        <input
          ref={inputRef}
          className="gs-input"
          value={q}
          placeholder="Cari client, project, task…"
          onChange={e => { setQ(e.target.value); setOpen(true); setActiveIdx(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {q
          ? <button className="gs-clear" onClick={() => { setQ(""); setOpen(false); }}>×</button>
          : <span className="gs-kbd">Ctrl K</span>}
      </div>
      {open && term.length >= 2 && (
        <div className="gs-dropdown">
          {results.length === 0 ? (
            <div className="gs-empty">Tidak ada hasil untuk &quot;{q}&quot;</div>
          ) : results.map((r, i) => {
            const isLastOfType = i === results.length - 1 || results[i + 1].type !== r.type;
            const more = isLastOfType ? moreCounts[r.type] : 0;
            return (
              <div key={i}>
                <div className={`gs-item${i === activeIdx ? " gs-item-active" : ""}`}
                  onClick={() => pick(r)} onMouseEnter={() => setActiveIdx(i)}>
                  <span className={`gs-type ${typeCls[r.type]}`}>{r.type}</span>
                  <div className="gs-item-text">
                    <div className="gs-item-label">{r.label}</div>
                    <div className="gs-item-sub">{r.sub}</div>
                  </div>
                </div>
                {more > 0 && (
                  <div className="gs-more" onClick={() => seeMore(r.type)}>
                    +{more} {RESULT_LABEL[r.type]} lainnya →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
