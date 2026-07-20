"use client";
import { useEffect, useMemo, useState } from "react";
import { AppData } from "@/hooks/useData";
import { useUndoableDelete } from "@/hooks/useUndoableDelete";
import { Client, Contact, Visit, Deal, PIC, Activity, ActiveView } from "@/types";
import { fmtDate, fmtIDR, isoWeekLabel, CLIENT_STATUS_COLOR, SECTORS, isClosedStage, onActivateKey } from "@/lib/utils";
import EmptyState from "./ui/EmptyState";
import { VisitBadge } from "./ui/Badge";
import ClientModal from "./ClientModal";
import ContactModal from "./ContactModal";
import OrgChart from "./OrgChart";
import VisitModal from "./VisitModal";
import { exportClients } from "@/lib/export";
import FilterSheet, { FilterField } from "./ui/FilterSheet";
import SortableTh from "./ui/SortableTh";
import Pagination from "./ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { Download } from "lucide-react";

interface Props {
  data: AppData;
  currentUserName: string;
  isViewer?: boolean;
  onNavigate: (view: ActiveView) => void;
  onSaveClient: (c: Client) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
  onUploadLogo: (file: File, clientId: string) => Promise<string>;
  onDeleteLogo: (url: string) => Promise<void>;
  onSaveContact: (c: Contact) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
  onSaveVisit: (v: Visit) => Promise<void>;
  onDeleteVisit: (id: string) => Promise<void>;
  onCreateDeal: (d: Deal) => Promise<void>;
  openClientId?: string | null;
  onOpenClientHandled?: () => void;
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

function extractDomain(website: string): string {
  return website.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
}

function ClientLogo({ name, website, logoUrl, size = 36 }: { name: string; website?: string; logoUrl?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const domain = website ? extractDomain(website) : "";
  const src = logoUrl || (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : "");

  if (!src || failed) {
    return (
      <div className="client-logo client-logo-fallback" style={{ width: size, height: size, fontSize: size * 0.42 }}>
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="client-logo"
      src={src}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
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
    ...activities.filter(a => a.client_id === clientId).map(a => (a.date || a.created_at || "").slice(0, 10)),
  ].filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : null;
}

export default function Clients({ data, currentUserName, isViewer, onNavigate, onSaveClient, onDeleteClient, onUploadLogo, onDeleteLogo, onSaveContact, onDeleteContact, onSaveVisit, onDeleteVisit, onCreateDeal, openClientId, onOpenClientHandled }: Props) {
  const { contacts, visits, deals, activities, profiles, projects } = data;
  // Soft-delete: a client "Hapus" hides it here immediately and only really
  // deletes it after the Undo window passes — see useUndoableDelete.
  const { isPending, requestDelete } = useUndoableDelete(onDeleteClient);
  const clients = data.clients.filter(c => !isPending(c.id));
  async function handleDeleteClient(id: string) {
    const c = data.clients.find(x => x.id === id);
    requestDelete(id, c ? `Client "${c.name}"` : "Client");
  }
  const team = profiles.filter(p => !["super_admin","admin","viewer"].includes(p.role)).map(p => p.name).filter(Boolean);
  const [search, setSearch] = useState("");
  const [salesFilter, setSalesFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("detail");
  const hasActiveFilters = search !== "" || salesFilter !== "all" || sectorFilter !== "all" || sortBy !== "name";
  function clearFilters() {
    setSearch(""); setSalesFilter("all"); setSectorFilter("all"); setSortBy("name");
  }

  // Force card view on mobile — the compact table doesn't fit small screens.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => { if (mq.matches) setViewMode("detail"); };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hiddenTracking, setHiddenTracking] = useState<Set<string>>(new Set());

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [contactClientId, setContactClientId] = useState("");

  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [editVisit, setEditVisit] = useState<Visit | null>(null);
  const [preClientId, setPreClientId] = useState<string | undefined>();

  useEffect(() => {
    if (!openClientId) return;
    const client = clients.find(c => c.id === openClientId);
    if (client) { setEditClient(client); setClientModalOpen(true); }
    onOpenClientHandled?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openClientId]);

  const openDealsCount = (id: string) => deals.filter(d => d.client_id === id && !isClosedStage(d.stage)).length;
  const openDealsValue = (id: string) => deals.filter(d => d.client_id === id && !isClosedStage(d.stage)).reduce((s, d) => s + d.value, 0);

  function toggleCollapsed(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleTracking(id: string) {
    setHiddenTracking(prev => {
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

  const { page, setPage, totalPages, totalItems, pageSize, paged } = usePagination(sorted, 25);

  function openContactNew(clientId: string) { setEditContact(null); setContactClientId(clientId); setContactModalOpen(true); }
  function openContactEdit(contact: Contact) { setEditContact(contact); setContactClientId(contact.client_id); setContactModalOpen(true); }

  return (
    <section>
      <div className="toolbar">
        <input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari client…" />
        <span className="filter-inline">
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
          {hasActiveFilters && (
            <button className="btn-clear-filters" onClick={clearFilters} title="Bersihkan semua filter">× Bersihkan filter</button>
          )}
        </span>
        <FilterSheet>
          <FilterField label="Sales">
            <select value={salesFilter} onChange={e => setSalesFilter(e.target.value)}>
              <option value="all">Semua Sales</option>
              {team.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FilterField>
          <FilterField label="Sektor">
            <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)}>
              <option value="all">Semua Sektor</option>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FilterField>
          <FilterField label="Urutkan">
            <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)}>
              <option value="name">Nama (A-Z)</option>
              <option value="contact_oldest">Kontak Terlama</option>
              <option value="contact_newest">Kontak Terbaru</option>
              <option value="deal_value">Nilai Project Tertinggi</option>
            </select>
          </FilterField>
          {hasActiveFilters && (
            <button className="btn-clear-filters" onClick={clearFilters}>× Bersihkan filter</button>
          )}
        </FilterSheet>
        <div className="view-toggle">
          <button className={viewMode === "detail" ? "active" : ""} onClick={() => setViewMode("detail")} title="Tampilan detail" aria-label="Tampilan detail">☰ Detail</button>
          <button className={viewMode === "compact" ? "active" : ""} onClick={() => setViewMode("compact")} title="Tampilan tabel ringkas" aria-label="Tampilan tabel ringkas">▦ Tabel</button>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => exportClients(clients, openDealsCount)}><Download size={13} /> Export Excel</button>
        {!isViewer && <button className="btn add-btn-desktop" onClick={() => { setEditClient(null); setClientModalOpen(true); }}>+ Client Baru</button>}
      </div>

      {!isViewer && <button className="fab" onClick={() => { setEditClient(null); setClientModalOpen(true); }} aria-label="Tambah Client">+</button>}

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
          <table className="data-table">
            <thead>
              <tr>
                <SortableTh active={sortBy === "name"} dir="asc" onClick={() => setSortBy("name")}>Nama</SortableTh>
                <th>Sektor</th><th>Status</th><th>PIC</th>
                <SortableTh active={sortBy === "contact_newest" || sortBy === "contact_oldest"} dir={sortBy === "contact_oldest" ? "asc" : "desc"}
                  onClick={() => setSortBy(sortBy === "contact_newest" ? "contact_oldest" : "contact_newest")}>Kontak Terakhir</SortableTh>
                <SortableTh active={sortBy === "deal_value"} dir="desc" onClick={() => setSortBy("deal_value")}>Project Aktif</SortableTh>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map(({ client: c, lastContact, daysSince, dealValue, dealCount }) => {
                const sc = c.status ? CLIENT_STATUS_COLOR[c.status] : null;
                const pics = (Array.isArray(c.pic) ? c.pic : []) as PIC[];
                const openClientRow = () => { if (!isViewer) { setEditClient(c); setClientModalOpen(true); } };
                return (
                  <tr key={c.id} style={{ cursor: isViewer ? "default" : "pointer" }} onClick={openClientRow}
                    onKeyDown={onActivateKey(openClientRow)} role="button" tabIndex={0}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <ClientLogo name={c.name} website={c.website} logoUrl={c.logo_url} size={24} />
                        <span className="client-name-cell">{c.name}</span>
                      </div>
                    </td>
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
          <div className="mobile-cards">
            {paged.map(({ client: c, lastContact, daysSince, dealValue, dealCount }) => {
              const sc = c.status ? CLIENT_STATUS_COLOR[c.status] : null;
              const pics = (Array.isArray(c.pic) ? c.pic : []) as PIC[];
              const openClient = () => { if (!isViewer) { setEditClient(c); setClientModalOpen(true); } };
              return (
                <div key={c.id} className="mcard" onClick={openClient} onKeyDown={onActivateKey(openClient)} role="button" tabIndex={0}>
                  <div className="mcard-head">
                    <div className="mcard-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ClientLogo name={c.name} website={c.website} logoUrl={c.logo_url} size={20} />
                      {c.name}
                    </div>
                    <span className="chip" style={sc ? { background: sc.bg, color: sc.fg } : undefined}>{c.status || "—"}</span>
                  </div>
                  <div className="mcard-row"><span>Sektor</span><b>{c.sector || "—"}</b></div>
                  <div className="mcard-row"><span>PIC</span><b>{pics[0]?.name || "—"}{pics.length > 1 ? ` +${pics.length - 1}` : ""}</b></div>
                  <div className="mcard-row"><span>Kontak Terakhir</span><b>{lastContact ? `${relativeTime(lastContact)}${daysSince !== null && daysSince > 60 ? " ⚠" : ""}` : "belum pernah"}</b></div>
                  <div className="mcard-row"><span>Project Aktif</span><b>{dealCount > 0 ? `${fmtIDR(dealValue)} (${dealCount})` : "—"}</b></div>
                  {!isViewer && (
                    <div className="mcard-actions">
                      <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setEditClient(c); setClientModalOpen(true); }}>Edit</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : paged.map(({ client: c, lastContact, daysSince, dealValue, dealCount }) => {
        const clientVisits = visits.filter(v => v.client_id === c.id).sort((a, b) => b.date.localeCompare(a.date));
        const clientContacts = contacts.filter(ct => ct.client_id === c.id);
        const clientProjects = projects.filter(p => p.client_id === c.id);
        const pics = (Array.isArray(c.pic) ? c.pic : []) as PIC[];
        const last = clientVisits[0];
        const isCollapsed = collapsed.has(c.id);
        const trackingHidden = hiddenTracking.has(c.id);

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
              <ClientLogo name={c.name} website={c.website} logoUrl={c.logo_url} size={44} />
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
                    <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                      <OrgChart
                        client={c}
                        contacts={clientContacts}
                        isViewer={isViewer}
                        onSaveClient={onSaveClient}
                        onSaveContact={onSaveContact}
                        onOpenContact={openContactEdit}
                      />
                      {!isViewer && <button className="btn btn-ghost btn-sm vt-add" onClick={() => openContactNew(c.id)}>+ Kontak</button>}
                    </span>
                  </div>
                  {!clientContacts.length ? (
                    <div className="vt-empty">👤 Belum ada kontak person.</div>
                  ) : (
                    <div className="contact-grid">
                      {clientContacts.map(ct => {
                        const openContact = () => { if (!isViewer) openContactEdit(ct); };
                        return (
                        <div key={ct.id} className="contact-card" onClick={openContact}
                          onKeyDown={onActivateKey(openContact)} role="button" tabIndex={0}>
                          <div className="contact-name">{ct.name}</div>
                          {ct.title && <div className="contact-title">{ct.title}</div>}
                          <div className="contact-meta">
                            {ct.email && (
                              <span className="pic-actions">
                                <a className="pic-action-btn pic-email" href={`mailto:${ct.email}`} title="Kirim email" onClick={e => e.stopPropagation()}>✉</a>
                                <span>{ct.email}</span>
                              </span>
                            )}
                            {ct.phone && (
                              <span className="pic-actions" style={{ marginTop: 2 }}>
                                <a className="pic-action-btn pic-call" href={`tel:${ct.phone}`} title="Telepon" onClick={e => e.stopPropagation()}>☎</a>
                                <a className="pic-action-btn pic-wa" href={`https://wa.me/${toWANumber(ct.phone)}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>WA</a>
                                <span>{ct.phone}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        );
                      })}
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
                  <div className="vt-title vt-title-toggle" onClick={() => toggleTracking(c.id)}
                    onKeyDown={onActivateKey(() => toggleTracking(c.id))} role="button" tabIndex={0}>
                    <span className="week-label-chevron">{trackingHidden ? "▸" : "▾"}</span>
                    Tracking approach per minggu {last && <><span style={{ marginRight: 4 }}>· terakhir:</span><VisitBadge status={last.status} /></>}
                    {!isViewer && (
                      <button className="btn btn-ghost btn-sm vt-add" style={{ marginLeft: "auto" }}
                        onClick={e => { e.stopPropagation(); setEditVisit(null); setPreClientId(c.id); setVisitModalOpen(true); }}>
                        + Visit
                      </button>
                    )}
                  </div>
                  {!trackingHidden && (!clientVisits.length ? (
                    <div className="vt-empty">🚗 Belum ada visit tercatat.</div>
                  ) : groupKeys.map(k => (
                    <div key={k} className="week-group">
                      <div className="week-label">{groups[k].label}</div>
                      {groups[k].items.map(v => {
                        const openVisit = () => { if (!isViewer) { setEditVisit(v); setPreClientId(undefined); setVisitModalOpen(true); } };
                        return (
                        <div key={v.id} className="vt-row" onClick={openVisit}
                          onKeyDown={onActivateKey(openVisit)} role="button" tabIndex={0}>
                          <span className="vt-date">{fmtDate(v.date)}</span>
                          <span className="vt-approach">{v.approach || "—"}{v.purpose ? ` · ${v.purpose}` : ""}</span>
                          <VisitBadge status={v.status} />
                        </div>
                        );
                      })}
                    </div>
                  )))}
                </div>
              </>
            )}
          </div>
        );
      })}

      <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />

      <ClientModal open={clientModalOpen} client={editClient} team={team}
        onSave={onSaveClient} onDelete={handleDeleteClient}
        onUploadLogo={onUploadLogo} onDeleteLogo={onDeleteLogo}
        onClose={() => setClientModalOpen(false)} />
      <ContactModal open={contactModalOpen} contact={editContact} clientId={contactClientId}
        onSave={onSaveContact} onDelete={onDeleteContact} onClose={() => setContactModalOpen(false)} />
      <VisitModal open={visitModalOpen} visit={editVisit} preClientId={preClientId} clients={clients} contacts={contacts} deals={deals} projects={projects} visits={visits} team={team} defaultPic={currentUserName}
        onSave={onSaveVisit} onDelete={onDeleteVisit} onCreateDeal={onCreateDeal} onSaveContact={onSaveContact} onClose={() => setVisitModalOpen(false)} />
    </section>
  );
}
