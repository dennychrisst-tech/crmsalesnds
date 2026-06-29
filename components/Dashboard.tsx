"use client";
import { AppData } from "@/hooks/useData";
import { STAGE_PROB, fmtIDR, fmtDate, todayStr } from "@/lib/utils";
import { VisitBadge } from "./ui/Badge";

interface Props { data: AppData; }

export default function Dashboard({ data }: Props) {
  const { clients, visits, deals, projects } = data;
  const openDeals = deals.filter(d => d.stage !== "Won" && d.stage !== "Lost");
  const weighted = openDeals.reduce((s, d) => s + (d.value * STAGE_PROB[d.stage] / 100), 0);
  const won = deals.filter(d => d.stage === "Won").reduce((s, d) => s + d.value, 0);

  const kpis = [
    { label: "Pipeline aktif", num: openDeals.length, sub: "deal terbuka" },
    { label: "Weighted value", num: fmtIDR(Math.round(weighted)), sub: "prob. tertimbang" },
    { label: "Closed Won", num: fmtIDR(won), sub: `${deals.filter(d => d.stage === "Won").length} deal` },
    { label: "Client", num: clients.length, sub: "total akun" },
    { label: "Project berjalan", num: projects.filter(p => p.status === "In Progress").length, sub: "in progress" },
  ];

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";
  const today = todayStr();
  const upcoming = visits
    .filter(v => v.date >= today && v.status !== "Done" && v.status !== "No-go")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);
  const followups = visits.filter(v => v.status === "Follow-up");

  return (
    <section>
      <div className="kpis">
        {kpis.map((k, i) => (
          <div key={i} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-num">{k.num}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid2">
        <div className="panel">
          <h2>Visit mendatang <span className="count">({upcoming.length})</span></h2>
          {upcoming.length ? upcoming.map(v => (
            <div key={v.id} className="timeline-item">
              <div className="ti-date">{fmtDate(v.date)} · {clientName(v.client_id)}</div>
              <div className="ti-body">{v.purpose} <VisitBadge status={v.status} /></div>
            </div>
          )) : <div className="empty-state">Belum ada visit terjadwal.</div>}
        </div>
        <div className="panel">
          <h2>Butuh tindak lanjut</h2>
          {followups.length ? followups.map(v => (
            <div key={v.id} className="timeline-item">
              <div className="ti-date">{clientName(v.client_id)} · {fmtDate(v.date)}</div>
              <div className="ti-body">{v.summary || v.purpose}</div>
            </div>
          )) : <div className="empty-state">Tidak ada follow-up tertunda.</div>}
        </div>
      </div>
    </section>
  );
}
