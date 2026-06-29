export const STAGES = ["Lead", "Discovery", "Proposal", "Negotiation", "Won"] as const;
export const STAGE_PROB: Record<string, number> = {
  Lead: 10, Discovery: 30, Proposal: 60, Negotiation: 80, Won: 100, Lost: 0,
};
export const VISIT_STATUS = ["Planned", "Done", "Follow-up", "No-go"] as const;
export const PROJ_STATUS = ["Initiation", "In Progress", "On Hold", "Delivered", "Closed"] as const;
export const SECTORS = ["Banking", "Multifinance", "Insurance", "Lainnya"] as const;

export function fmtIDR(n: number): string {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

export function fmtDate(d: string): string {
  if (!d) return "-";
  return new Date(d + "T00:00:00").toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isoWeekLabel(dateStr: string): { key: string; label: string } {
  const d = new Date(dateStr + "T00:00:00");
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(t.getFullYear(), 0, 4);
  const wk = 1 + Math.round(((t.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (x: Date) => x.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  return { key: `${t.getFullYear()}-W${String(wk).padStart(2, "0")}`, label: `Minggu ${wk} · ${fmt(mon)}–${fmt(sun)}` };
}

export function stageBadgeClass(stage: string): string {
  const map: Record<string, string> = {
    Lead: "badge-lead", Discovery: "badge-discovery", Proposal: "badge-proposal",
    Negotiation: "badge-negotiation", Won: "badge-won", Lost: "badge-lost",
  };
  return map[stage] || "";
}

export function visitStatusClass(status: string): string {
  const map: Record<string, string> = {
    Planned: "st-planned", Done: "st-done", "Follow-up": "st-followup", "No-go": "st-nogo",
  };
  return map[status] || "";
}
