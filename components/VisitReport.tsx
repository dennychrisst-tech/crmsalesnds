"use client";
import { useState, useMemo } from "react";
import { AppData } from "@/hooks/useData";
import { Visit } from "@/types";
import { fmtDate, todayStr } from "@/lib/utils";
import { exportVisitReport } from "@/lib/export";

interface Props {
  data: AppData;
}

type SortKey = "date" | "client" | "pic" | "status";

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
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";

  // All months that have done visits
  const availableMonths = useMemo(() => {
    const done = visits.filter(v => v.status === "Done" && v.date);
    const months = Array.from(new Set(done.map(v => v.date.slice(0, 7)))).sort().reverse();
    return months;
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
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = a.date.localeCompare(b.date);
      else if (sortKey === "client") cmp = clientName(a.client_id).localeCompare(clientName(b.client_id));
      else if (sortKey === "pic") cmp = (a.pic || "").localeCompare(b.pic || "");
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [visits, filterMonth, filterSales, search, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  function toggleExpand(id: string) {
    setExpanded(e => e === id ? null : id);
  }

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ink-soft)",
    cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
    background: sortKey === key ? "var(--bg)" : "transparent",
  });

  const arrow = (key: SortKey) => sortKey === key ? (sortAsc ? " ↑" : " ↓") : "";

  // Summary stats
  const total = filtered.length;
  const byPic: Record<string, number> = {};
  filtered.forEach(v => { byPic[v.pic || "—"] = (byPic[v.pic || "—"] || 0) + 1; });

  return (
    <section>
      {/* ── Toolbar ── */}
      <div className="toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
        <input
          className="search" value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari client, PIC, tujuan, summary…"
        />
        <select
          className="search" style={{ flex: "none", width: "auto" }}
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
        >
          <option value="">Semua bulan</option>
          {availableMonths.map(m => (
            <option key={m} value={m}>
              {new Date(m + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
            </option>
          ))}
        </select>
        <select
          className="search" style={{ flex: "none", width: "auto" }}
          value={filterSales}
          onChange={e => setFilterSales(e.target.value)}
        >
          <option value="all">Semua Sales</option>
          {salesList.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => exportVisitReport(filtered, clientName)}
        >
          ↓ Export CSV
        </button>
      </div>

      {/* ── Summary strip ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{
          background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10,
          padding: "10px 18px", minWidth: 120,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".06em" }}>Total Visit Done</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--brand)", marginTop: 4 }}>{total}</div>
        </div>
        {Object.entries(byPic).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
          <div key={name} style={{
            background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10,
            padding: "10px 18px", minWidth: 110,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".06em" }}>{name}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--ink)", marginTop: 4 }}>{count}</div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      {!filtered.length ? (
        <div className="panel"><div className="empty-state">Belum ada visit selesai pada periode ini.</div></div>
      ) : (
        <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--line)" }}>
                <th style={thStyle("date")} onClick={() => toggleSort("date")}>Tanggal{arrow("date")}</th>
                <th style={thStyle("client")} onClick={() => toggleSort("client")}>Client{arrow("client")}</th>
                <th style={{ ...thStyle("pic"), width: 100 }} onClick={() => toggleSort("pic")}>Sales{arrow("pic")}</th>
                <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ink-soft)" }}>Jenis Approach</th>
                <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ink-soft)" }}>Tujuan Visit</th>
                <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ink-soft)" }}>PIC Client</th>
                <th style={{ padding: "10px 14px", width: 32 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => (
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
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {fmtDate(v.date)}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700 }}>
                      {clientName(v.client_id)}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13 }}>
                      <span style={{
                        background: "var(--bg)", border: "1px solid var(--line)",
                        borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                      }}>{v.pic || "—"}</span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--ink-soft)" }}>
                      {v.approach || <span className="muted">—</span>}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13 }}>
                      {v.purpose || <span className="muted">—</span>}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--ink-soft)" }}>
                      {v.pic_client || <span className="muted">—</span>}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "center", fontSize: 14, color: "var(--ink-soft)" }}>
                      {expanded === v.id ? "▲" : "▼"}
                    </td>
                  </tr>
                  {expanded === v.id && (
                    <tr key={v.id + "-detail"} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td colSpan={7} style={{ padding: "0 14px 16px 14px", background: "var(--bg)" }}>
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
                              borderRadius: 8, padding: "10px 14px", minHeight: 60,
                              whiteSpace: "pre-wrap",
                            }}>
                              {v.summary || <span className="muted" style={{ fontStyle: "italic" }}>Belum ada summary.</span>}
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Detail Visit</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {[
                                  ["Tanggal", fmtDate(v.date)],
                                  ["Client", clientName(v.client_id)],
                                  ["PIC NDS", v.pic || "—"],
                                  ["PIC Client", v.pic_client || "—"],
                                  ["Jenis Approach", v.approach || "—"],
                                  ["Tujuan Visit", v.purpose || "—"],
                                  ["Status", v.status],
                                ].map(([label, value]) => (
                                  <div key={label} style={{ display: "flex", gap: 8, fontSize: 12 }}>
                                    <span style={{ color: "var(--ink-soft)", width: 110, flexShrink: 0 }}>{label}</span>
                                    <span style={{ fontWeight: 600, color: "var(--ink)" }}>{value}</span>
                                  </div>
                                ))}
                              </div>
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
        </div>
      )}
    </section>
  );
}
