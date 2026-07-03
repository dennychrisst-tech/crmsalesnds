"use client";
import { useState } from "react";
import { AppData } from "@/hooks/useData";
import { MandaysRole, MandaysClientRate } from "@/types";
import { fmtIDR } from "@/lib/utils";
import EmptyState from "./ui/EmptyState";
import MandaysRoleModal from "./MandaysRoleModal";
import MandaysClientRateModal from "./MandaysClientRateModal";

interface Props {
  data: AppData;
  isViewer?: boolean;
  onSaveRole: (r: MandaysRole) => Promise<void>;
  onDeleteRole: (id: string) => Promise<void>;
  onSaveClientRate: (r: MandaysClientRate) => Promise<void>;
  onDeleteClientRate: (id: string) => Promise<void>;
}

// Zone color is derived from where a value actually falls against the role's
// own COGS/Low/Med/Max bands — not from the (sometimes inconsistently worded,
// e.g. "< Medium" vs "Low") classification text stored on the record — so the
// gauge and every marker stay visually consistent no matter how a rate was
// originally labeled in the source spreadsheet.
function zoneFor(value: number, role: MandaysRole) {
  if (value < role.low_rate) return { key: "< Low", bg: "#DBEAFE", fg: "#1D4ED8" };
  if (value < role.med_rate) return { key: "Low–Medium", bg: "#DCFCE7", fg: "#15803D" };
  if (value < role.max_price) return { key: "Medium–Max", bg: "#FEF3C7", fg: "#B45309" };
  return { key: "> Max", bg: "#FEE2E2", fg: "#B91C1C" };
}

function RoleGauge({ role, entries, isViewer, onEditRate }: {
  role: MandaysRole; entries: MandaysClientRate[]; isViewer?: boolean; onEditRate: (r: MandaysClientRate) => void;
}) {
  const scaleMax = Math.max(role.max_price, ...entries.map(e => e.rate_value), 1) * 1.08;
  const pct = (v: number) => Math.min(100, (v / scaleMax) * 100);

  // Stack markers that land within ~2% of each other so they don't overlap.
  const sorted = [...entries].sort((a, b) => a.rate_value - b.rate_value);
  const placed: { e: MandaysClientRate; left: number; row: number }[] = [];
  for (const e of sorted) {
    const left = pct(e.rate_value);
    let row = 0;
    while (placed.some(p => p.row === row && Math.abs(p.left - left) < 2.2)) row++;
    placed.push({ e, left, row });
  }
  const maxRow = placed.reduce((m, p) => Math.max(m, p.row), 0);
  const trackHeight = 46 + maxRow * 20;

  return (
    <div className="panel">
      <h2 style={{ marginBottom: 4 }}>{role.role_name}</h2>
      <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 14 }}>
        COGS {fmtIDR(role.cogs)} · Low {fmtIDR(role.low_rate)} · Med {fmtIDR(role.med_rate)} · Max {fmtIDR(role.max_price)}
      </div>
      <div style={{ position: "relative", height: trackHeight, marginBottom: 22 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: maxRow * 20, height: 14, borderRadius: 7, overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${pct(role.low_rate)}%`, background: "#DBEAFE" }} />
          <div style={{ width: `${pct(role.med_rate) - pct(role.low_rate)}%`, background: "#DCFCE7" }} />
          <div style={{ width: `${pct(role.max_price) - pct(role.med_rate)}%`, background: "#FEF3C7" }} />
          <div style={{ flex: 1, background: "#FEE2E2" }} />
        </div>
        {/* COGS reference tick */}
        <div title={`COGS: ${fmtIDR(role.cogs)}`} style={{
          position: "absolute", left: `${pct(role.cogs)}%`, top: maxRow * 20 - 3, width: 2, height: 20,
          background: "var(--ink-soft)", opacity: 0.6,
        }} />
        {placed.map(({ e, left, row }) => {
          const zone = zoneFor(e.rate_value, role);
          return (
            <div
              key={e.id}
              title={`${e.client_label} — ${e.rate_label}: ${fmtIDR(e.rate_value)} (${zone.key})`}
              onClick={() => !isViewer && onEditRate(e)}
              style={{
                position: "absolute", left: `${left}%`, top: (maxRow - row) * 20, transform: "translateX(-50%)",
                width: 14, height: 14, borderRadius: "50%", background: zone.bg, border: `2px solid ${zone.fg}`,
                cursor: isViewer ? "default" : "pointer", boxShadow: "0 1px 2px rgba(0,0,0,.15)",
              }}
            />
          );
        })}
        <div style={{ position: "absolute", left: 0, right: 0, top: maxRow * 20 + 20, display: "flex", fontSize: 10.5, color: "var(--ink-soft)" }}>
          <span style={{ position: "absolute", left: 0 }}>Rp 0</span>
          <span style={{ position: "absolute", left: `${pct(role.low_rate)}%`, transform: "translateX(-50%)" }}>Low</span>
          <span style={{ position: "absolute", left: `${pct(role.med_rate)}%`, transform: "translateX(-50%)" }}>Medium</span>
          <span style={{ position: "absolute", left: `${pct(role.max_price)}%`, transform: "translateX(-50%)" }}>Max</span>
        </div>
      </div>

      {entries.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Belum ada rate client untuk role ini.</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {sorted.map(e => {
            const zone = zoneFor(e.rate_value, role);
            return (
              <span
                key={e.id}
                onClick={() => !isViewer && onEditRate(e)}
                style={{
                  fontSize: 11.5, padding: "3px 9px", borderRadius: 999, background: zone.bg, color: zone.fg,
                  cursor: isViewer ? "default" : "pointer", whiteSpace: "nowrap",
                }}
              >
                <b>{e.client_label}</b> · {e.rate_label}: {fmtIDR(e.rate_value)}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MandaysRateView({ data, isViewer, onSaveRole, onDeleteRole, onSaveClientRate, onDeleteClientRate }: Props) {
  const { mandays_roles, mandays_client_rates } = data;
  const [clientFilter, setClientFilter] = useState("all");
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editRole, setEditRole] = useState<MandaysRole | null>(null);
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [editRate, setEditRate] = useState<MandaysClientRate | null>(null);
  const [defaultRoleId, setDefaultRoleId] = useState<string | undefined>(undefined);

  const roles = [...mandays_roles].sort((a, b) => a.role_name.localeCompare(b.role_name));

  const clients = Array.from(new Set(mandays_client_rates.map(r => r.client_label))).sort();
  const filteredRates = clientFilter === "all" ? mandays_client_rates : mandays_client_rates.filter(r => r.client_label === clientFilter);

  const overCount = mandays_client_rates.filter(r => zoneFor(r.rate_value, roles.find(role => role.id === r.role_id) || roles[0]).key === "> Max").length;
  const underCount = mandays_client_rates.filter(r => zoneFor(r.rate_value, roles.find(role => role.id === r.role_id) || roles[0]).key === "< Low").length;

  function openNewRole() { setEditRole(null); setRoleModalOpen(true); }
  function openEditRole(r: MandaysRole) { if (isViewer) return; setEditRole(r); setRoleModalOpen(true); }
  function openNewRate(roleId?: string) { setEditRate(null); setDefaultRoleId(roleId); setRateModalOpen(true); }
  function openEditRate(r: MandaysClientRate) { if (isViewer) return; setEditRate(r); setDefaultRoleId(undefined); setRateModalOpen(true); }

  return (
    <section>
      <div className="toolbar">
        <select className="search" style={{ flex: "none", width: "auto" }} value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
          <option value="all">Semua Client</option>
          {clients.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {!isViewer && <button className="btn btn-sm" onClick={() => openNewRate()}>+ Tambah Rate Client</button>}
        {!isViewer && <button className="btn btn-ghost btn-sm" onClick={openNewRole}>+ Tambah Role</button>}
      </div>

      {roles.length === 0 ? (
        <EmptyState icon="💰" label="Belum ada Rate Card." sub="Tambahkan role beserta COGS/Low/Medium/Max Rate untuk mulai." />
      ) : (
        <>
          <div className="kpis">
            <div className="kpi-v2" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px", boxShadow: "var(--shadow)", borderTop: "2px solid var(--ink)" }}>
              <div className="kpi-label" style={{ marginBottom: 8 }}>Total Role</div>
              <div className="kpi-num" style={{ marginBottom: 2 }}>{roles.length}</div>
            </div>
            <div className="kpi-v2" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px", boxShadow: "var(--shadow)", borderTop: "2px solid var(--brand)" }}>
              <div className="kpi-label" style={{ marginBottom: 8 }}>Total Client</div>
              <div className="kpi-num" style={{ color: "var(--brand)", marginBottom: 2 }}>{clients.length}</div>
            </div>
            <div className="kpi-v2" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px", boxShadow: "var(--shadow)", borderTop: "2px solid var(--ink)" }}>
              <div className="kpi-label" style={{ marginBottom: 8 }}>Total Rate Entries</div>
              <div className="kpi-num" style={{ marginBottom: 2 }}>{mandays_client_rates.length}</div>
            </div>
            <div className="kpi-v2" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px", boxShadow: "var(--shadow)", borderTop: "2px solid #B91C1C" }}>
              <div className="kpi-label" style={{ marginBottom: 8 }}>{"Overpriced (> Max)"}</div>
              <div className="kpi-num" style={{ color: "#B91C1C", marginBottom: 2 }}>{overCount}</div>
            </div>
            <div className="kpi-v2" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px", boxShadow: "var(--shadow)", borderTop: "2px solid #1D4ED8" }}>
              <div className="kpi-label" style={{ marginBottom: 8 }}>{"Underpriced (< Low)"}</div>
              <div className="kpi-num" style={{ color: "#1D4ED8", marginBottom: 2 }}>{underCount}</div>
            </div>
          </div>

          <div className="panel">
            <h2 style={{ marginBottom: 12 }}>Rate Card Internal</h2>
            <table className="data-table">
              <thead>
                <tr><th>Role</th><th>COGS</th><th>Low Rate</th><th>Med Rate</th><th>Max Price</th></tr>
              </thead>
              <tbody>
                {roles.map(r => (
                  <tr key={r.id} style={{ cursor: isViewer ? "default" : "pointer" }} onClick={() => openEditRole(r)}>
                    <td><b>{r.role_name}</b></td>
                    <td>{fmtIDR(r.cogs)}</td>
                    <td>{fmtIDR(r.low_rate)}</td>
                    <td>{fmtIDR(r.med_rate)}</td>
                    <td>{fmtIDR(r.max_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mobile-cards">
              {roles.map(r => (
                <div key={r.id} className="mcard" onClick={() => openEditRole(r)}>
                  <div className="mcard-head"><div className="mcard-title">{r.role_name}</div></div>
                  <div className="mcard-row"><span>COGS</span><b>{fmtIDR(r.cogs)}</b></div>
                  <div className="mcard-row"><span>Low Rate</span><b>{fmtIDR(r.low_rate)}</b></div>
                  <div className="mcard-row"><span>Med Rate</span><b>{fmtIDR(r.med_rate)}</b></div>
                  <div className="mcard-row"><span>Max Price</span><b>{fmtIDR(r.max_price)}</b></div>
                </div>
              ))}
            </div>
          </div>

          {roles.map(role => (
            <RoleGauge
              key={role.id}
              role={role}
              entries={filteredRates.filter(e => e.role_id === role.id)}
              isViewer={isViewer}
              onEditRate={openEditRate}
            />
          ))}
        </>
      )}

      <MandaysRoleModal open={roleModalOpen} role={editRole} onSave={onSaveRole} onDelete={onDeleteRole} onClose={() => setRoleModalOpen(false)} />
      <MandaysClientRateModal open={rateModalOpen} rate={editRate} roles={roles} defaultRoleId={defaultRoleId} onSave={onSaveClientRate} onDelete={onDeleteClientRate} onClose={() => setRateModalOpen(false)} />
    </section>
  );
}
