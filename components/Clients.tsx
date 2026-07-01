"use client";
import { useMemo, useState } from "react";
import { AppData } from "@/hooks/useData";
import { Client, Contact, Visit, PIC, Activity, ActiveView } from "@/types";
import { fmtDate, fmtIDR, isoWeekLabel, CLIENT_STATUS_COLOR, SECTORS } from "@/lib/utils";
import EmptyState from "./ui/EmptyState";
import { VisitBadge } from "./ui/Badge";
import ClientModal from "./ClientModal";
import ContactModal from "./ContactModal";
import VisitModal from "./VisitModal";
import { exportClients } from "@/lib/export";

interface Props {
  data: AppData;
  currentUserName: string;
  isViewer?: boolean;
  onNavigate: (view: ActiveView) => void;
  onSaveClient: (c: Client) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
  onSaveContact: (c: Contact) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
  onSaveVisit: (v: Visit) => Promise<void>;
  onDeleteVisit: (id: string) => Promise<void>;
}

const CLIENT_STATUSES = Object.keys(CLIENT_STATUS_COLOR);
type SortBy = "name" | "contact_oldest" | "contact_newest" | "deal_value";
type ViewMode = "detail" | "compact";

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

export default function Clients({ data, currentUserName, isViewer, onNavigate, onSaveClient, onDeleteClient, onSaveContact, onDeleteContact, onSaveVisit, onDeleteVisit }: Props) {
  const { clients, contacts, visits, deals, activities, profiles, projects } = data;
  const team = profiles.filter(p => !["super_admin","admin","viewer"].includes(p.role)).map(p => p.name).filter(Boolean);
  const [search, setSearch] = useState("");
  const [salesFilter, setSalesFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("detail");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [contactClientId, setContactClientId] = useState("");

  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [editVisit, setEditVisit] = useState<Visit | null>(null);
  const [preClientId, setPreClientId] = useState<string | undefined>();

  const openDealsCount = (id: string) => deals.filter(d => d.client_id === id && d.stage !== "Won" && d.stage !== "Lost").length;
  const openDealsValue = (id: string) => deals.filter(d => d.client_id === id && d.stage !== "Won" && d.stage !== "Lost").reduce((s, d) => s + d.value, 0);

  function toggleCollapsed(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Base set: respects search + sales filter, used both for the status/sector summary chips and as the pool to further narrow.
  const bySearchAndSales = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) &&
    (salesFilter === "all" || (Array.isArray(c.pic) ? c.pic : []).some((p: PIC) => p.name === salesFilter))
  );

  const statusCounts: Record<string, number> = {};
  bySearchAndSales.forEach(c => { statusCounts[c.status || "—"] = (statusCounts[c.status || "—"] || 0) + 1; });

  const enriched = useMemo(() => {
    return bySearchAndSales
      .filter(c => statusFilter === "all" || c.status === statusFilter)
      .filter(c => sectorFilter === "all" || c.sector === sectorFilter)
      .map(c => {
        const lastContact = lastContactDate(c.id, visits, activities);
        const daysSince = lastContact
          ? Math.floor((Date.now() - new Date(lastContact + "T00:00:00").getTime()) / 86_400_000)
          : null;
        return { client: c, lastContact, daysSince, dealValue: openDealsValue(c.id), dealCount: openDealsCount(c.id) };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bySearchAndSales, statusFilter, sectorFilter, visits, activities, deals]);

  const sorted = [...enriched].sort((a, b) => {
    if (sortBy === "name") return a.client.name.localeCompare(b.client.name);
    if (sortBy === "deal_value") return b.dealValue - a.dealValue;
    const aKey = a.lastContact || "0000-00-00";
    const bKey = b.lastContact || "0000-00-00";
    return sortBy === "contact_oldest" ? aKey.localeCompare(bKey) : bKey.localeCompare(aKey);
  });

  function openContactNew(clientId: string) { setEditContact(null); setContactClientId(clientId); setContactModalOpen(true); }
  function openContactEdit(contact: Contact) { setEditContact(contact); setContactClientId(contact.client_id); setContactModalOpen(true); }

  return (
    <section>
      <div className="toolbar">
        <input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari client…" />
        <select value={salesFilter} onChange={e => setSalesFilter(e.target.value)} className="select-sm">
          <option value="all">Semua Sales</option>
          {team.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} className="select-sm">
          <option value="all">Semua Sektor</option>
          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)} className="select-sm">
          <option value="name">Urutkan: Nama (A-Z)</option>
          <option value="contact_oldest">Urutkan: Kontak Terlama</option>
          <option value="contact_newest">Urutkan: Kontak Terbaru</option>
          <option value="deal_value">Urutkan: Nilai Project Tertinggi</option>
        </select>
        <div className="view-toggle">
          <button className={viewMode === "detail" ? "active" : ""} onClick={() => setViewMode("detail")} title="Tampilan detail">☰ Detail</button>
          <button className={viewMode === "compact" ? "active" : ""} onClick={() => setViewMode("compact")} title="Tampilan tabel ringkas">▦ Tabel</button>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => exportClients(clients, openDealsCount)}>↓ Export CSV</button>
        {!isViewer && <button className="btn" onClick={() => { setEditClient(null); setClientModalOpen(true); }}>+ Client Baru</button>}
      </div>

      {/* Summary bar */}
      <div className="client-summary">
        <button className={`csum-chip${statusFilter === "all" ? " active" : ""}`} onClick={() => setStatusFilter("all")}>
          Semua <b>{bySearchAndSales.length}</b>
        </button>
        {CLIENT_STATUSES.map(s => {
          const sc = CLIENT_STATUS_COLOR[s];
          return (
            <button key={s} className={`csum-chip${statusFilter === s ? " active" : ""}`}
              style={{ background: statusFilter === s ? sc.bg : undefined, color: statusFilter === s ? sc.fg : undefined }}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}>
              {s} <b>{statusCounts[s] || 0}</b>
            </button>
          );
        })}
      </div>

      {!sorted.length ? (
        <div className="panel"><EmptyState icon="🏢" label="Belum ada client" sub="Coba ubah filter, atau tambah client pertama Anda" /></div>
      ) : viewMode === "compact" ? (
        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>Nama</th><th>Sektor</th><th>Status</th><th>PIC</th><th>Kontak Terakhir</th><th>Project Aktif</th><th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ client: c, lastContact, daysSince, dealValue, dealCount }) => {
                const sc = c.status ? CLIENT_STATUS_COLOR[c.status] : null;
                const pics = (Array.isArray(c.pic) ? c.pic : []) as PIC[];
                return (
                  <tr key={c.id} style={{ cursor: isViewer ? "default" : "pointer" }} onClick={() => { if (!isViewer) { setEditClient(c); setClientModalOpen(true); } }}>
                    <td style={{ fontWeight: 700 }}>{c.name}</td>
                    <td>{c.sector}</td>
                    <td><span className="chip" style={sc ? { background: sc.bg, color: sc.fg } : undefined}>{c.status || "—"}</span></td>
                    <td>{pics[0]?.name || <span className="muted">—</span>}{pics.length > 1 && ` +${pics.length - 1}`}</td>
                    <td>{lastContact ? `${relativeTime(lastContact)}${daysSince !== null && daysSince > 60 ? " ⚠" : ""}` : <span className="muted">belum pernah</span>}</td>
                    <td>{dealCount > 0 ? `${fmtIDR(dealValue)} (${dealCount})` : <span className="muted">—</span>}</td>
                    <td>{!isViewer && <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setEditClient(c); setClientModalOpen(true); }}>Edit</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : sorted.map(({ client: c, lastContact, daysSince, dealValue, dealCount }) => {
        const clientVisits = visits.filter(v => v.client_id === c.id).sort((a, b) => b.date.localeCompare(a.date));
        const clientContacts = contacts.filter(ct => ct.client_id === c.id);
        const clientProjects = projects.filter(p => p.client_id === c.id);
        const pics = (Array.isArray(c.pic) ? c.pic : []) as PIC[];
        const last = clientVisits[0];
        const isCollapsed = collapsed.has(c.id);

        const groups: Record<string, { label: string; items: Visit[] }> = {};
        clientVisits.forEach(v => {
          const w = isoWeekLabel(v.date);
          if (!groups[w.key]) groups[w.key] = { label: w.label, items: [] };
          groups[w.key].items.push(v);
        });
        const groupKeys = Object.keys(groups).sort().reverse();

        const lastContactCls = daysSince === null ? "last-contact-none"
          : daysSince > 60 ? "last-contact-cold"
          : daysSince > 30 ? "last-contact-warm"
          : "last-contact-fresh";
        const edgeColor = daysSince === null ? "#94897A" : daysSince > 60 ? "#991B1B" : daysSince > 30 ? "#854D0E" : "#0A6E5C";

        return (
          <div key={c.id} className="ccard" style={{ borderLeft: `4px solid ${edgeColor}` }}>
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
                    ? <>{daysSince !== null && daysSince > 60 ? "⚠ " : ""}Kontak terakhir: <strong>{relativeTime(lastContact)}</strong> · {fmtDate(lastContact)}</>
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
                {(() => {
                  const sc = c.status ? CLIENT_STATUS_COLOR[c.status] : null;
                  return (
                    <span className="chip" style={sc ? { background: sc.bg, color: sc.fg } : undefined}>
                      {c.status || "—"}
                    </span>
                  );
                })()}
                <span className="chip">{dealCount} project aktif</span>
                {dealCount > 0 && <span className="chip chip-value">{fmtIDR(dealValue)}</span>}
                {!isViewer && <button className="btn btn-ghost btn-sm" onClick={() => { setEditClient(c); setClientModalOpen(true); }}>Edit</button>}
              </div>
            </div>

            <button className="ccard-collapse-toggle" onClick={() => toggleCollapsed(c.id)}>
              {isCollapsed ? "▸" : "▾"} {clientContacts.length} kontak · {clientProjects.length} project · {clientVisits.length} visit
            </button>

            {!isCollapsed && (
              <>
                {/* Contact Persons */}
                <div className="contact-section">
                  <div className="vt-title">
                    Kontak Person
                    {!isViewer && <button className="btn btn-ghost btn-sm vt-add" style={{ marginLeft: "auto" }} onClick={() => openContactNew(c.id)}>+ Kontak</button>}
                  </div>
                  {!clientContacts.length ? (
                    <div className="vt-empty">👤 Belum ada kontak person.</div>
                  ) : (
                    <div className="contact-grid">
                      {clientContacts.map(ct => (
                        <div key={ct.id} className="contact-card" onClick={() => { if (!isViewer) openContactEdit(ct); }}>
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

                {/* Projects */}
                {clientProjects.length > 0 && (
                  <div className="contact-section">
                    <div className="vt-title">
                      Project
                      <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto", fontSize: 12 }} onClick={() => onNavigate("projects")}>
                        Lihat semua →
                      </button>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "6px 0" }}>
                      {clientProjects.map(p => (
                        <div key={p.id}
                          onClick={() => onNavigate("projects")}
                          style={{
                            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                            background: "var(--bg)", border: "1px solid var(--line)",
                            borderRadius: 8, padding: "6px 12px",
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{p.name}</span>
                          <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>{p.status}</span>
                          {p.product && <span style={{ fontSize: 11, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 4, padding: "1px 6px", color: "var(--ink-soft)" }}>{p.product}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Visit tracking */}
                <div className="visit-track">
                  <div className="vt-title">
                    Tracking approach per minggu {last && <><span style={{ marginRight: 4 }}>· terakhir:</span><VisitBadge status={last.status} /></>}
                    {!isViewer && <button className="btn btn-ghost btn-sm vt-add" style={{ marginLeft: "auto" }} onClick={() => { setEditVisit(null); setPreClientId(c.id); setVisitModalOpen(true); }}>+ Visit</button>}
                  </div>
                  {!clientVisits.length ? (
                    <div className="vt-empty">🚗 Belum ada visit tercatat.</div>
                  ) : groupKeys.map(k => (
                    <div key={k} className="week-group">
                      <div className="week-label">{groups[k].label}</div>
                      {groups[k].items.map(v => (
                        <div key={v.id} className="vt-row" onClick={() => { if (!isViewer) { setEditVisit(v); setPreClientId(undefined); setVisitModalOpen(true); } }}>
                          <span className="vt-date">{fmtDate(v.date)}</span>
                          <span className="vt-approach">{v.approach || "—"}{v.purpose ? ` · ${v.purpose}` : ""}</span>
                          <VisitBadge status={v.status} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}

      <ClientModal open={clientModalOpen} client={editClient} team={team}
        onSave={onSaveClient} onDelete={onDeleteClient} onClose={() => setClientModalOpen(false)} />
      <ContactModal open={contactModalOpen} contact={editContact} clientId={contactClientId}
        onSave={onSaveContact} onDelete={onDeleteContact} onClose={() => setContactModalOpen(false)} />
      <VisitModal open={visitModalOpen} visit={editVisit} preClientId={preClientId} clients={clients} contacts={contacts} projects={data.projects} team={team} defaultPic={currentUserName}
        onSave={onSaveVisit} onDelete={onDeleteVisit} onClose={() => setVisitModalOpen(false)} />
    </section>
  );
}
