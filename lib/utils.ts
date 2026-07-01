export const STAGES = ["Cold Call", "First Meeting", "Discovery", "Proposal", "Negotiation", "Contract", "PO", "Won", "On Hold"] as const;
export const STAGE_PROB: Record<string, number> = {
  "Cold Call": 5, "First Meeting": 15, Discovery: 30, Proposal: 45, Negotiation: 65,
  Contract: 80, PO: 95, Won: 100, "On Hold": 10, Lost: 0,
};
export const STAGE_COLOR: Record<string, string> = {
  "Cold Call": "#94A3B8", "First Meeting": "#60A5FA", Discovery: "#378ADD", Proposal: "#8B5CF6",
  Negotiation: "#DB2777", Contract: "#D97706", PO: "#CA8A04", Won: "#16A34A",
  "On Hold": "#78716C", Lost: "#DC2626",
};
export const TASK_STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  Open: { bg: "#FEF3C7", fg: "#B45309" },
  Done: { bg: "#DCFCE7", fg: "#15803D" },
};
export const CLIENT_STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  "Prospect": { bg: "#DBEAFE", fg: "#1D4ED8" },
  "Existing Active": { bg: "#DCFCE7", fg: "#15803D" },
  "Existing Inactive": { bg: "#F1EFE8", fg: "#5C5440" },
};
export const VISIT_STATUS = ["Planned", "Done", "Cancel", "Reschedule"] as const;
export const PROJ_STATUS = ["Initiation", "In Progress", "On Hold", "Delivered", "Closed"] as const;
export const SECTORS = ["Banking", "Multifinance", "Insurance", "Health Care", "Industrial", "Technology", "Telekomunikasi", "Infrastruktur", "Transportasi", "Energy", "Lainnya"] as const;
export const TEAM = ["Denny", "Dova", "Rio", "Cris"] as const;
export const DOC_TYPES = ["RFI", "RFP/BRD", "Proposal Teknis", "Offering Letter", "Kontrak", "PO", "NDA", "Lainnya"] as const;
export const DOC_STATUSES = ["Draft", "Sent", "Received", "Approved", "Rejected"] as const;
export const PRODUCT_CATEGORIES = ["ECM / BPM", "AI / Analytics", "Security", "Cloud", "Managed Service", "Outsourcing", "Lainnya"] as const;
export const EVENT_TYPES = ["Training Internal", "Training Eksternal", "Meeting Online", "Internal Meeting", "Demo / Presentasi", "Webinar", "Pameran / Conference", "Lainnya"] as const;
export const DEAL_TYPES = ["New Business", "Renewal", "Upsell", "Cross-sell", "Lainnya"] as const;
export const ACTIVITY_TYPES = ["Note", "Call", "Meeting", "Email", "Demo", "Follow-up", "Proposal Sent", "Lainnya"] as const;
export const COMPANY_SIZES = ["< 50 karyawan", "50–200 karyawan", "200–1000 karyawan", "> 1000 karyawan", "> 10.000 karyawan", "> 100.000 karyawan"] as const;

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
    "Cold Call": "badge-cold-call", "First Meeting": "badge-first-meeting", Discovery: "badge-discovery",
    Proposal: "badge-proposal", Negotiation: "badge-negotiation", Contract: "badge-contract",
    PO: "badge-po", Won: "badge-won", "On Hold": "badge-on-hold", Lost: "badge-lost",
  };
  return map[stage] || "";
}

export function visitStatusClass(status: string): string {
  const map: Record<string, string> = {
    Planned: "st-planned", Done: "st-done", Cancel: "st-nogo", Reschedule: "st-followup",
  };
  return map[status] || "";
}
