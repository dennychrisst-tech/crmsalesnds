"use client";
import { useState } from "react";
import { AppData } from "@/hooks/useData";
import { Client, Contact, Visit } from "@/types";
import { fmtDate, isoWeekLabel } from "@/lib/utils";
import { VisitBadge } from "./ui/Badge";
import ClientModal from "./ClientModal";
import ContactModal from "./ContactModal";
import VisitModal from "./VisitModal";

interface Props {
  data: AppData;
  onSaveClient: (c: Client) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
  onSaveContact: (c: Contact) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
  onSaveVisit: (v: Visit) => Promise<void>;
  onDeleteVisit: (id: string) => Promise<void>;
}

export default function Clients({ data, onSaveClient, onDeleteClient, onSaveContact, onDeleteContact, onSaveVisit, onDeleteVisit }: Props) {
  const { clients, contacts, visits, deals } = data;
  const [search, setSearch] = useState("");

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [contactClientId, setContactClientId] = useState("");

  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [editVisit, setEditVisit] = useState<Visit | null>(null);
  const [preClientId, setPreClientId] = useState<string | undefined>();

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  function openContactNew(clientId: string) { setEditContact(null); setContactClientId(clientId); setContactModalOpen(true); }
  function openContactEdit(contact: Contact) { setEditContact(contact); setContactClientId(contact.client_id); setContactModalOpen(true); }

  return (
    <section>
      <div className="toolbar">
        <input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari client…" />
        <button className="btn" onClick={() => { setEditClient(null); setClientModalOpen(true); }}>+ Client Baru</button>
      </div>

      {filtered.length ? filtered.map(c => {
        const openDeals = deals.filter(d => d.client_id === c.id && d.stage !== "Won" && d.stage !== "Lost").length;
        const clientVisits = visits.filter(v => v.client_id === c.id).sort((a, b) => b.date.localeCompare(a.date));
        const clientContacts = contacts.filter(ct => ct.client_id === c.id);

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
            {/* Header */}
            <div className="ccard-head">
              <div>
                <div className="cname">{c.name}</div>
                <div className="cmeta">
                  {c.sector}
                  {c.company_size && ` · ${c.company_size}`}
                  {" · "}
                  {(Array.isArray(c.pic) && c.pic.length > 0
                    ? c.pic.map((p: { name: string; phone?: string } | string) =>
                        typeof p === "string" ? p : `${p.name}${p.phone ? ` (${p.phone})` : ""}`
                      ).filter(Boolean).join(" · ")
                    : null) || "—"}
                </div>
                {c.website && (
                  <div className="cmeta">
                    <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" style={{ color: "var(--brand)" }}>{c.website}</a>
                  </div>
                )}
                {c.address && <div className="cmeta">📍 {c.address}</div>}
                {c.notes && <div className="cmeta">{c.notes}</div>}
              </div>
              <div className="cright">
                <span className="chip">{c.status || "—"}</span>
                <span className="chip">{openDeals} deal aktif</span>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditClient(c); setClientModalOpen(true); }}>Edit</button>
              </div>
            </div>

            {/* Contact Persons */}
            <div className="contact-section">
              <div className="vt-title">
                Kontak Person
                <button className="btn btn-ghost btn-sm vt-add" style={{ marginLeft: "auto" }} onClick={() => openContactNew(c.id)}>+ Kontak</button>
              </div>
              {!clientContacts.length ? (
                <div className="vt-empty">Belum ada kontak person.</div>
              ) : (
                <div className="contact-grid">
                  {clientContacts.map(ct => (
                    <div key={ct.id} className="contact-card" onClick={() => openContactEdit(ct)}>
                      <div className="contact-name">{ct.name}</div>
                      {ct.title && <div className="contact-title">{ct.title}</div>}
                      <div className="contact-meta">
                        {ct.email && <span>✉ {ct.email}</span>}
                        {ct.phone && <span>📞 {ct.phone}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Visit tracking */}
            <div className="visit-track">
              <div className="vt-title">
                Tracking approach per minggu {last && <><span style={{ marginRight: 4 }}>· terakhir:</span><VisitBadge status={last.status} /></>}
                <button className="btn btn-ghost btn-sm vt-add" style={{ marginLeft: "auto" }} onClick={() => { setEditVisit(null); setPreClientId(c.id); setVisitModalOpen(true); }}>+ Visit</button>
              </div>
              {!clientVisits.length ? (
                <div className="vt-empty">Belum ada visit tercatat.</div>
              ) : groupKeys.map(k => (
                <div key={k} className="week-group">
                  <div className="week-label">{groups[k].label}</div>
                  {groups[k].items.map(v => (
                    <div key={v.id} className="vt-row" onClick={() => { setEditVisit(v); setPreClientId(undefined); setVisitModalOpen(true); }}>
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
      <ContactModal open={contactModalOpen} contact={editContact} clientId={contactClientId}
        onSave={onSaveContact} onDelete={onDeleteContact} onClose={() => setContactModalOpen(false)} />
      <VisitModal open={visitModalOpen} visit={editVisit} preClientId={preClientId} clients={clients}
        onSave={onSaveVisit} onDelete={onDeleteVisit} onClose={() => setVisitModalOpen(false)} />
    </section>
  );
}
