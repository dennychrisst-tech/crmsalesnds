"use client";
import { useState, useRef, useEffect } from "react";
import { AppData } from "@/hooks/useData";
import { ActiveView } from "@/types";

interface Props {
  data: AppData;
  onNavigate: (view: ActiveView) => void;
}

interface Result {
  type: "Client" | "Project" | "Task";
  label: string;
  sub: string;
  view: ActiveView;
}

export default function GlobalSearch({ data, onNavigate }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const term = q.trim().toLowerCase();
  const results: Result[] = [];

  if (term.length >= 2) {
    data.clients
      .filter(c => c.name.toLowerCase().includes(term) || c.sector.toLowerCase().includes(term))
      .slice(0, 4)
      .forEach(c => results.push({ type: "Client", label: c.name, sub: `${c.sector} · ${c.status}`, view: "clients" }));

    data.deals
      .filter(d => d.name.toLowerCase().includes(term) || (d.product || "").toLowerCase().includes(term))
      .slice(0, 4)
      .forEach(d => {
        const cn = data.clients.find(c => c.id === d.client_id)?.name || "—";
        results.push({ type: "Project", label: d.name, sub: `${cn} · ${d.stage}`, view: "pipeline" });
      });

    data.tasks
      .filter(t => t.title.toLowerCase().includes(term))
      .slice(0, 3)
      .forEach(t => results.push({ type: "Task", label: t.title, sub: `${t.due_date || "—"} · ${t.assigned_to || "—"}`, view: "tasks" }));
  }

  function pick(view: ActiveView) {
    onNavigate(view);
    setQ("");
    setOpen(false);
  }

  const typeCls: Record<string, string> = { Client: "gs-type-client", Project: "gs-type-deal", Task: "gs-type-task" };

  return (
    <div ref={ref} className="gs-wrap">
      <div className="gs-input-wrap">
        <span className="gs-icon">⌕</span>
        <input
          className="gs-input"
          value={q}
          placeholder="Cari client, project, task…"
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {q && <button className="gs-clear" onClick={() => { setQ(""); setOpen(false); }}>×</button>}
      </div>
      {open && term.length >= 2 && (
        <div className="gs-dropdown">
          {results.length === 0 ? (
            <div className="gs-empty">Tidak ada hasil untuk "{q}"</div>
          ) : results.map((r, i) => (
            <div key={i} className="gs-item" onClick={() => pick(r.view)}>
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
