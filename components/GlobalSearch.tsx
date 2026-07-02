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
}

interface Result {
  type: "Client" | "Project" | "Task";
  label: string;
  sub: string;
  go: () => void;
}

export default function GlobalSearch({ data, onNavigate, onOpenClient, onOpenDeal }: Props) {
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

  if (term.length >= 2) {
    data.clients
      .filter(c => c.name.toLowerCase().includes(term) || c.sector.toLowerCase().includes(term))
      .slice(0, 4)
      .forEach(c => results.push({
        type: "Client", label: c.name, sub: `${c.sector} · ${c.status}`,
        go: () => onOpenClient(c.id),
      }));

    data.deals
      .filter(d => d.name.toLowerCase().includes(term) || (d.product || "").toLowerCase().includes(term))
      .slice(0, 4)
      .forEach(d => {
        const cn = data.clients.find(c => c.id === d.client_id)?.name || "—";
        results.push({
          type: "Project", label: d.name, sub: `${cn} · ${d.stage}`,
          go: () => onOpenDeal(d.id),
        });
      });

    data.tasks
      .filter(t => t.title.toLowerCase().includes(term))
      .slice(0, 3)
      .forEach(t => results.push({
        type: "Task", label: t.title, sub: `${t.due_date || "—"} · ${t.assigned_to || "—"}`,
        go: () => onNavigate("tasks"),
      }));
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
          ) : results.map((r, i) => (
            <div key={i} className={`gs-item${i === activeIdx ? " gs-item-active" : ""}`}
              onClick={() => pick(r)} onMouseEnter={() => setActiveIdx(i)}>
              <span className={`gs-type ${typeCls[r.type]}`}>{r.type}</span>
              <div className="gs-item-text">
                <div className="gs-item-label">{r.label}</div>
                <div className="gs-item-sub">{r.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
