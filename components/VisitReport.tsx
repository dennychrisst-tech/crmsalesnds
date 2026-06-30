"use client";
import { useState, useMemo } from "react";
import { AppData } from "@/hooks/useData";
import { fmtDate, todayStr } from "@/lib/utils";
import { exportVisitReport } from "@/lib/export";

interface Props { data: AppData; }

export default function VisitReport({ data }: Props) {
  const { clients, visits, profiles } = data;
  const today = todayStr();
  const [thisYear, thisMonth] = today.slice(0, 7).split("-");

  const salesList = profiles
    .filter(p => !["super_admin", "admin", "viewer"].includes(p.role))
    .map(p => p.name).filter(Boolean) as string[];

  const [search, setSearch] = useState("");
  const [filterSales, setFilterSales] = useState("all");
  const [filterMonth, setFilterMonth] = useState(`${thisYear}-${thisMonth}`);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [collapsedClients, setCollapsedClients] = useState<Set<string>>(new Set());

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";

  const availableMonths = useMemo(() => {
    const done = visits.filter(v => v.status === "Done" && v.date);
    return Array.from(new Set(done.map(v => v.date.slice(0, 7)))).sort().reverse();
  }, [visits]);

  const filtered = useMemo(() => {
    let list = visits.filter(v => v.status === "Done");
    if (filterMonth) list = list.filter(v => v.date?.startsWith(filterMonth));
    if (filterSales !== "all") list = list.filter(v => v.pic === filterSales);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(v =>
        clientName(v.client_id).toLowerCase().includes(q) ||
        (v.purpose || "").toLowerCase().includes(q) ||
        (v.summary || "").toLowerCase().includes(q) ||
        (v.approach || "").toLowerCase().includes(q) ||
        (v.pic || "").toLowerCase().includes(q) ||
        (v.pic_client || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [visits, filterMonth, filterSales, search]);

  // Group by client, sorted by client name
  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    filtered.forEach(v => {
      const key = v.client_id;
      if (!map[key]) map[key] = [];
      map[key].push(v);
    });
    // sort visits within each group by date desc
    Object.values(map).forEach(arr => arr.sort((a, b) => b.date.localeCompare(a.date)));
    return Object.entries(map).sort((a, b) => clientName(a[0]).localeCompare(clientName(b[0])));
  }, [filtered]);

  function toggleExpand(id: string) {
    setExpanded(e => e === id ? null : id);
  }

  function toggleClient(clientId: string) {
    setCollapsedClients(prev => {
      const next = new Set(prev);
      next.has(clientId) ? next.delete(clientId) : next.add(clientId);
      return next;
    });
  }

  function collapseAll() {
    setCollapsedClients(new Set(grouped.map(([id]) => id)));
  }

  function expandAll() {
    setCollapsedClients(new Set());
  }

  // Summary stats
  const total = filtered.length;
  const byPic: Record<string, number> = {};
  filtered.forEach(v => { byPic[v.pic || "—"] = (byPic[v.pic || "—"] || 0) + 1; });

  const thSt: React.CSSProperties = {
    padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ink-soft)",
  };

  return (
    <section>
      {/* ── Toolbar ── */}
      <div className="toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
        <input className="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari client, PIC, tujuan, summary…" />
        <select className="search" style={{ flex: "none", width: "auto" }}
          value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          <option value="">Semua bulan</option>
          {availableMonths.map(m => (
            <option key={m} value={m}>
              {new Date(m + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
            </option>
          ))}
        </select>
        <select className="search" style={{ flex: "none", width: "auto" }}
          value={filterSales} onChange={e => setFilterSales(e.target.value)}>
          <option value="all">Semua Sales</option>
          {salesList.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={expandAll}>Buka Semua</button>
        <button className="btn btn-ghost btn-sm" onClick={collapseAll}>Tutup Semua</button>
        <button className="btn btn-ghost btn-sm" onClick={() => exportVisitReport(filtered, clientName)}>
          ↓ Export CSV
        </button>
      </div>

      {/* ── Summary strip ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 18px", minWidth: 120 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".06em" }}>Total Visit Done</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--brand)", marginTop: 4 }}>{total}</div>
        </div>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 18px", minWidth: 120 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".06em" }}>Jumlah Client</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--ink)", marginTop: 4 }}>{grouped.length}</div>
        </div>
        {Object.entries(byPic).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
          <div key={name} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 18px", minWidth: 110 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".06em" }}>{name}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--ink)", marginTop: 4 }}>{count}</div>
          </div>
        ))}
      </div>

      {/* ── Grouped by client ── */}
      {!grouped.length ? (
        <div className="panel"><div className="empty-state">Belum ada visit selesai pada periode ini.</div></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {grouped.map(([clientId, cvs]) => {
            const isCollapsed = collapsedClients.has(clientId);
            const name = clientName(clientId);
            const lastVisit = cvs[0];

            return (
              <div key={clientId} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
                {/* Client header */}
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", cursor: "pointer",
                    background: "var(--bg)", borderBottom: isCollapsed ? "none" : "1px solid var(--line)",
                  }}
                  onClick={() => toggleClient(clientId)}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", background: "var(--brand)",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 800, flexShrink: 0,
                  }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>{name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                      {cvs.length} visit · Terakhir: {fmtDate(lastVisit.date)}
                      {lastVisit.pic && ` · Sales: ${lastVisit.pic}`}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, color: "var(--ink-soft)" }}>{isCollapsed ? "▼" : "▲"}</span>
                </div>

                {/* Visit rows */}
                {!isCollapsed && (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--line)" }}>
                        <th style={thSt}>Tanggal</th>
                        <th style={thSt}>Sales</th>
                        <th style={thSt}>Jenis Approach</th>
                        <th style={thSt}>Tujuan Visit</th>
                        <th style={thSt}>PIC Client</th>
                        <th style={thSt}>Jabatan</th>
                        <th style={{ ...thSt, width: 32 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cvs.map((v, i) => (
                        <>
                          <tr
                            key={v.id}
                            style={{
                              borderBottom: expanded === v.id ? "none" : "1px solid var(--line)",
                              cursor: "pointer",
                              background: expanded === v.id ? "var(--bg)" : i % 2 === 0 ? "transparent" : "var(--paper)",
                            }}
                            onClick={() => toggleExpand(v.id)}
                          >
                            <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                              {fmtDate(v.date)}
                            </td>
                            <td style={{ padding: "10px 14px", fontSize: 13 }}>
                              <span style={{
                                background: "var(--bg)", border: "1px solid var(--line)",
                                borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                              }}>{v.pic || "—"}</span>
                            </td>
                            <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--ink-soft)" }}>
                              {v.approach || <span className="muted">—</span>}
                            </td>
                            <td style={{ padding: "10px 14px", fontSize: 13 }}>
                              {v.purpose || <span className="muted">—</span>}
                            </td>
                            <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--ink-soft)" }}>
                              {v.pic_client || <span className="muted">—</span>}
                            </td>
                            <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--ink-soft)" }}>
                              {v.jabatan || <span className="muted">—</span>}
                            </td>
                            <td style={{ padding: "10px 14px", textAlign: "center", fontSize: 13, color: "var(--ink-soft)" }}>
                              {expanded === v.id ? "▲" : "▼"}
                            </td>
                          </tr>
                          {expanded === v.id && (
                            <tr key={v.id + "-detail"} style={{ borderBottom: "1px solid var(--line)" }}>
                              <td colSpan={7} style={{ padding: "0 16px 16px 16px", background: "var(--bg)" }}>
                                <div style={{
                                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
                                  paddingTop: 14, borderTop: "1px dashed var(--line)",
                                }}>
                                  <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
                                      Summary / Hasil Pertemuan
                                    </div>
                                    <div style={{
                                      fontSize: 13, color: "var(--ink)", lineHeight: 1.6,
                                      background: "var(--card)", border: "1px solid var(--line)",
                                      borderRadius: 8, padding: "10px 14px", minHeight: 70,
                                      whiteSpace: "pre-wrap",
                                    }}>
                                      {v.summary || <span style={{ fontStyle: "italic", color: "var(--ink-soft)" }}>Belum ada summary.</span>}
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
                                      Detail Visit
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                      {([
                                        ["Tanggal", fmtDate(v.date)],
                                        ["PIC NDS", v.pic || "—"],
                                        ["PIC Client", v.pic_client || "—"],
                                        ["Jabatan", v.jabatan || "—"],
                                        ["Jenis Approach", v.approach || "—"],
                                        ["Tujuan Visit", v.purpose || "—"],
                                        ["Status", v.status],
                                      ] as [string, string][]).map(([label, value]) => (
                                        <div key={label} style={{ display: "flex", gap: 8, fontSize: 12 }}>
                                          <span style={{ color: "var(--ink-soft)", width: 110, flexShrink: 0 }}>{label}</span>
                                          <span style={{ fontWeight: 600, color: "var(--ink)" }}>{value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
