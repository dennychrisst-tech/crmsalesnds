"use client";
import { useState } from "react";
import { AppData } from "@/hooks/useData";
import { Client, Visit } from "@/types";
import { fmtDate, isoWeekLabel, visitStatusClass } from "@/lib/utils";
import { VisitBadge } from "./ui/Badge";
import ClientModal from "./ClientModal";
import VisitModal from "./VisitModal";

interface Props {
  data: AppData;
  onSaveClient: (c: Client) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
  onSaveVisit: (v: Visit) => Promise<void>;
  onDeleteVisit: (id: string) => Promise<void>;
}

export default function Clients({ data, onSaveClient, onDeleteClient, onSaveVisit, onDeleteVisit }: Props) {
  const { clients, visits, deals } = data;
  const [search, setSearch] = useState("");
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [editVisit, setEditVisit] = useState<Visit | null>(null);
  const [preClientId, setPreClientId] = useState<string | undefined>();

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  function openClientNew() { setEditClient(null); setClientModalOpen(true); }
  function openClientEdit(c: Client) { setEditClient(c); setClientModalOpen(true); }
  function openVisitNew(clientId: string) { setEditVisit(null); setPreClientId(clientId); setVisitModalOpen(true); }
  function openVisitEdit(v: Visit) { setEditVisit(v); setPreClientId(undefined); setVisitModalOpen(true); }

  return (
    <section>
      <div className="toolbar">
        <input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari client…" />
        <button className="btn" onClick={openClientNew}>+ Client Baru</button>
      </div>

      {filtered.length ? filtered.map(c => {
        const openDeals = deals.filter(d => d.client_id === c.id && d.stage !== "Won" && d.stage !== "Lost").length;
        const clientVisits = visits.filter(v => v.client_id === c.id).sort((a, b) => b.date.localeCompare(a.date));
        const groups: Record<string, { label: string; items: Visit[] }> = {};
        clientVisits.forEach(v => {
          const w = isoWeekLabel(v.date);
          if (!groups[w.key]) groups[w.key] = { label: w.label, items: [] };
          groups[w.key].items.push(v);
        });
        const groupKeys = Object.keys(groups).sort().reverse();
        const last = clientVisits[0];

        return (
          <div key={c.id} className="ccard">
            <div className="ccard-head">
              <div>
                <div className="cname">{c.name}</div>
                <div className="cmeta">{c.sector} · {(Array.isArray(c.pic) ? c.pic : [c.pic]).filter(Boolean).join(", ") || "—"} {c.contact ? `· ${c.contact}` : ""}</div>
                {c.notes && <div className="cmeta">{c.notes}</div>}
              </div>
              <div className="cright">
                <span className="chip">{c.status || "—"}</span>
                <span className="chip">{openDeals} deal aktif</span>
                <button className="btn btn-ghost btn-sm" onClick={() => openClientEdit(c)}>Edit</button>
              </div>
            </div>
            <div className="visit-track">
              <div className="vt-title">
                Tracking approach per minggu {last && <><span style={{ marginRight: 4 }}>· terakhir:</span><VisitBadge status={last.status} /></>}
                <button className="btn btn-ghost btn-sm vt-add" style={{ float: "right" }} onClick={() => openVisitNew(c.id)}>+ Visit</button>
              </div>
              {!clientVisits.length ? (
                <div className="vt-empty">Belum ada visit tercatat.</div>
              ) : groupKeys.map(k => (
                <div key={k} className="week-group">
                  <div className="week-label">{groups[k].label}</div>
                  {groups[k].items.map(v => (
                    <div key={v.id} className="vt-row" onClick={() => openVisitEdit(v)}>
                      <span className="vt-date">{fmtDate(v.date)}</span>
                      <span className="vt-approach">{v.approach || "—"}{v.purpose ? ` · ${v.purpose}` : ""}</span>
                      <VisitBadge status={v.status} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      }) : <div className="panel"><div className="empty-state">Belum ada client.</div></div>}

      <ClientModal open={clientModalOpen} client={editClient}
        onSave={onSaveClient} onDelete={onDeleteClient} onClose={() => setClientModalOpen(false)} />
      <VisitModal open={visitModalOpen} visit={editVisit} preClientId={preClientId} clients={clients}
        onSave={onSaveVisit} onDelete={onDeleteVisit} onClose={() => setVisitModalOpen(false)} />
    </section>
  );
}
