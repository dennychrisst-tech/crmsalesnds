"use client";
import { useState } from "react";
import { AppData } from "@/hooks/useData";
import { Client, Contact, Visit, PIC, Activity } from "@/types";
import { fmtDate, isoWeekLabel, todayStr } from "@/lib/utils";
import { VisitBadge } from "./ui/Badge";
import ClientModal from "./ClientModal";
import ContactModal from "./ContactModal";
import VisitModal from "./VisitModal";
import { exportClients } from "@/lib/export";

interface Props {
  data: AppData;
  currentUserName: string;
  onSaveClient: (c: Client) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
  onSaveContact: (c: Contact) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
  onSaveVisit: (v: Visit) => Promise<void>;
  onDeleteVisit: (id: string) => Promise<void>;
}

function toWANumber(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("62")) return d;
  if (d.startsWith("0")) return "62" + d.slice(1);
  return "62" + d;
}

function relativeTime(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr + "T00:00:00").getTime()) / 86_400_000);
  if (days === 0) return "hari ini";
  if (days === 1) return "kemarin";
  if (days < 30) return `${days} hari lalu`;
  if (days < 365) return `${Math.floor(days / 30)} bulan lalu`;
  return `${Math.floor(days / 365)} tahun lalu`;
}

function lastContactDate(clientId: string, visits: Visit[], activities: Activity[]): string | null {
  const dates = [
    ...visits.filter(v => v.client_id === clientId).map(v => v.date),
    ...activities.filter(a => a.client_id === clientId).map(a => (a.created_at || "").slice(0, 10)),
  ].filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : null;
}

export default function Clients({ data, currentUserName, onSaveClient, onDeleteClient, onSaveContact, onDeleteContact, onSaveVisit, onDeleteVisit }: Props) {
  const { clients, contacts, visits, deals, activities, profiles } = data;
  const team = profiles.map(p => p.name).filter(Boolean);
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
  const openDealsCount = (id: string) => deals.filter(d => d.client_id === id && d.stage !== "Won" && d.stage !== "Lost").length;

  function openContactNew(clientId: string) { setEditContact(null); setContactClientId(clientId); setContactModalOpen(true); }
  function openContactEdit(contact: Contact) { setEditContact(contact); setContactClientId(contact.client_id); setContactModalOpen(true); }

  return (
    <section>
      <div className="toolbar">
        <input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari client…" />
        <button className="btn btn-ghost btn-sm" onClick={() => exportClients(clients, openDealsCount)}>↓ Export CSV</button>
        <button className="btn" onClick={() => { setEditClient(null); setClientModalOpen(true); }}>+ Client Baru</button>
      </div>

      {filtered.length ? filtered.map(c => {
        const clientVisits = visits.filter(v => v.client_id === c.id).sort((a, b) => b.date.localeCompare(a.date));
        const clientContacts = contacts.filter(ct => ct.client_id === c.id);
        const pics = (Array.isArray(c.pic) ? c.pic : []) as PIC[];
        const last = clientVisits[0];
        const lastContact = lastContactDate(c.id, visits, activities);

        const groups: Record<string, { label: string; items: Visit[] }> = {};
        clientVisits.forEach(v => {
          const w = isoWeekLabel(v.date);
          if (!groups[w.key]) groups[w.key] = { label: w.label, items: [] };
          groups[w.key].items.push(v);
        });
        const groupKeys = Object.keys(groups).sort().reverse();

        const daysSince = lastContact
          ? Math.floor((Date.now() - new Date(lastContact + "T00:00:00").getTime()) / 86_400_000)
          : null;
        const lastContactCls = daysSince === null ? "last-contact-none"
          : daysSince > 60 ? "last-contact-cold"
          : daysSince > 30 ? "last-contact-warm"
          : "last-contact-fresh";

        return (
          <div key={c.id} className="ccard">
            <div className="ccard-head">
              <div>
                <div className="cname">{c.name}</div>
                <div className="cmeta">
                  {c.sector}{c.company_size && ` · ${c.company_size}`}
                </div>

                {/* PIC dengan WA & Call links */}
                {pics.length > 0 && (
                  <div className="pic-list">
                    {pics.map((p, i) => (
                      <div key={i} className="pic-row">
                        <span className="pic-name">{p.name}</span>
                        {p.phone && (
                          <span className="pic-actions">
                            <a className="pic-action-btn pic-call" href={`tel:${p.phone}`} title="Telepon" onClick={e => e.stopPropagation()}>
                              ☎
                            </a>
                            <a className="pic-action-btn pic-wa" href={`https://wa.me/${toWANumber(p.phone)}`} target="_blank" rel="noreferrer" title="WhatsApp" onClick={e => e.stopPropagation()}>
                              WA
                            </a>
                            <span className="pic-phone">{p.phone}</span>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Last contact */}
                <div className={`last-contact ${lastContactCls}`}>
                  {lastContact
                    ? <>Kontak terakhir: <strong>{relativeTime(lastContact)}</strong> · {fmtDate(lastContact)}</>
                    : "Belum pernah dihubungi"}
                </div>

                {c.website && (
                  <div className="cmeta">
                    <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" style={{ color: "var(--brand)" }}>{c.website}</a>
                  </div>
                )}
                {c.address && (
                  <div className="cmeta">
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(c.address)}`} target="_blank" rel="noreferrer" className="maps-link">
                      📍 {c.address}
                    </a>
                  </div>
                )}
                {c.notes && <div className="cmeta">{c.notes}</div>}
              </div>
              <div className="cright">
                <span className="chip">{c.status || "—"}</span>
                <span className="chip">{openDealsCount(c.id)} deal aktif</span>
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
                        {ct.phone && (
                          <span className="pic-actions" style={{ marginTop: 2 }}>
                            <a className="pic-action-btn pic-call" href={`tel:${ct.phone}`} title="Telepon" onClick={e => e.stopPropagation()}>☎</a>
                            <a className="pic-action-btn pic-wa" href={`https://wa.me/${toWANumber(ct.phone)}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>WA</a>
                            <span>{ct.phone}</span>
                          </span>
                        )}
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
      <VisitModal open={visitModalOpen} visit={editVisit} preClientId={preClientId} clients={clients} team={team} defaultPic={currentUserName}
        onSave={onSaveVisit} onDelete={onDeleteVisit} onClose={() => setVisitModalOpen(false)} />
    </section>
  );
}
