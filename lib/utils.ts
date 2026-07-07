// Sequential pipeline funnel — mirrors the sales team's own Excel tracker.
// "On Hold" and "Dropped" are deliberately NOT in this list: they're side
// states a deal can be moved into from any point (see isClosedStage below),
// not steps in the linear sequence.
export const STAGES = [
  "Approching", "Present Solution", "RFI", "RFP/BRD", "Clarification/Requirement",
  "Proposal Teknis", "Presentasi Proposal", "POC/Demo", "Offering Letter",
  "Proposal Clarification", "Negotiation", "Dealed", "PO", "Kontrak",
] as const;
export const STAGE_COLOR: Record<string, string> = {
  Approching: "#94A3B8", "Present Solution": "#60A5FA", RFI: "#38BDF8", "RFP/BRD": "#6366F1",
  "Clarification/Requirement": "#378ADD", "Proposal Teknis": "#8B5CF6", "Presentasi Proposal": "#C026D3",
  "POC/Demo": "#E11D48", "Offering Letter": "#0D9488", "Proposal Clarification": "#F59E0B",
  Negotiation: "#DB2777", Dealed: "#16A34A", PO: "#CA8A04", Kontrak: "#D97706",
  "On Hold": "#78716C", Dropped: "#DC2626",
};
// Dealed/PO/Kontrak are all "won" — PO and Kontrak are post-win paperwork
// stages, not a fresh win/loss determination. Dropped is the only "lost" stage.
export const CLOSED_WON_STAGES = ["Dealed", "PO", "Kontrak"] as const;
export function isWonStage(stage: string): boolean {
  return (CLOSED_WON_STAGES as readonly string[]).includes(stage);
}
export function isClosedStage(stage: string): boolean {
  return isWonStage(stage) || stage === "Dropped";
}
// Days since this deal last moved stage — shared by Pipeline's AgingBadge and
// the Dashboard's "at-risk" KPI so both use the exact same threshold.
export function dealAgingDays(deal: { stage_updated_at?: string | null; created_at?: string }): number {
  const ref = deal.stage_updated_at || deal.created_at || todayStr();
  return Math.floor((Date.now() - new Date(ref).getTime()) / 86_400_000);
}
// A deal is "at risk" once it's sat 30+ days in the same active stage —
// "On Hold" is deliberately excluded since parking a deal there is intentional,
// not neglect.
export function isDealAtRisk(deal: { stage: string; stage_updated_at?: string | null; created_at?: string }): boolean {
  return !isClosedStage(deal.stage) && deal.stage !== "On Hold" && dealAgingDays(deal) >= 30;
}
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
export const EVENT_STATUS = VISIT_STATUS; // same vocabulary, reused for Event.status
export const PROJ_STATUS = ["Initiation", "In Progress", "On Hold", "Delivered", "Closed"] as const;
export const PROJECT_STATUS_COLOR: Record<string, string> = {
  Initiation: "#94A3B8", "In Progress": "#3B82F6", "On Hold": "#F59E0B", Delivered: "#16A34A", Closed: "#6B7280",
};
export const TALENT_LEVELS = ["Junior", "Middle", "Senior", "Lead"] as const;
export const TALENT_ROLE_STATUS = ["Open", "Close"] as const;
export const REVENUE_LINE_CATEGORIES = ["Project", "Maintenance", "Other"] as const;
export const REVENUE_MILESTONE_STATUS = ["Paid", "Billed", "To be billed", "Can't be billed this year"] as const;
// Matches the forecast sheet's legend: green/blue/yellow/red for Paid/Billed/
// to-be-billed/can't-be-billed.
export const REVENUE_MILESTONE_STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  Paid: { bg: "#DCFCE7", fg: "#15803D" },
  Billed: { bg: "#DBEAFE", fg: "#1D4ED8" },
  "To be billed": { bg: "#FEF3C7", fg: "#B45309" },
  "Can't be billed this year": { bg: "#FEE2E2", fg: "#991B1B" },
};
// H/M/L opportunity category — H = segera closing, M = proses sudah lebih
// serius, L = masih lama (per the forecast sheet's own legend).
export const REVENUE_OPP_CATEGORIES = ["H", "M", "L"] as const;
export const REVENUE_OPP_CATEGORY_COLOR: Record<string, { bg: string; fg: string }> = {
  H: { bg: "#DCFCE7", fg: "#15803D" },
  M: { bg: "#FEF3C7", fg: "#B45309" },
  L: { bg: "#EAE6DA", fg: "#5C5440" },
};
export const REVENUE_OPP_STATUS = ["Active", "Hold", "Drop"] as const;
export const REVENUE_OPP_STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  Active: { bg: "#DCFCE7", fg: "#15803D" },
  Hold: { bg: "#FEF3C7", fg: "#B45309" },
  Drop: { bg: "#FEE2E2", fg: "#991B1B" },
};
export const SECTORS = ["Banking", "Multifinance", "Insurance", "Health Care", "Industrial", "Technology", "Telekomunikasi", "Infrastruktur", "Transportasi", "Energy", "Lainnya"] as const;
export const TEAM = ["Denny", "Dova", "Rio", "Cris"] as const;

// Fallback org-chart tiers for clients whose org_levels hasn't loaded yet /
// was somehow cleared to empty — mirrors the DB column default.
export const DEFAULT_ORG_LEVELS = ["Komisaris", "Direksi", "General Manager", "Manager", "Staff"];

// Deterministic name -> color mapping so a salesperson keeps the same color
// everywhere (Calendar visit pills, Pipeline deal cards) without a lookup table.
export const SALES_COLOR_PALETTE = [
  { bg: "#2563EB", fg: "#FFFFFF" },
  { bg: "#16A34A", fg: "#FFFFFF" },
  { bg: "#F59E0B", fg: "#1F2937" },
  { bg: "#DB2777", fg: "#FFFFFF" },
  { bg: "#7C3AED", fg: "#FFFFFF" },
  { bg: "#0D9488", fg: "#FFFFFF" },
  { bg: "#E11D48", fg: "#FFFFFF" },
  { bg: "#EA580C", fg: "#FFFFFF" },
  { bg: "#0891B2", fg: "#FFFFFF" },
  { bg: "#65A30D", fg: "#FFFFFF" },
  { bg: "#9333EA", fg: "#FFFFFF" },
  { bg: "#CA8A04", fg: "#1F2937" },
];
export function colorForSales(name: string) {
  const key = name || "—";
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return SALES_COLOR_PALETTE[hash % SALES_COLOR_PALETTE.length];
}
export const DOC_TYPES = ["RFI", "RFP/BRD", "Proposal Teknis", "Offering Letter", "Kontrak", "PO", "NDA", "Lainnya"] as const;
export const DOC_STATUSES = ["Draft", "Sent", "Received", "Approved", "Rejected"] as const;
export const PRODUCT_CATEGORIES = ["ECM / BPM", "AI / Analytics", "Security", "Cloud", "Managed Service", "Outsourcing", "Lainnya"] as const;
export const EVENT_TYPES = ["Training Internal", "Training Eksternal", "Meeting Online", "Internal Meeting", "Demo / Presentasi", "Webinar", "Pameran / Conference", "WFO", "Cuti", "Lainnya"] as const;
export const DEAL_TYPES = ["New Business", "Renewal", "Upsell", "Cross-sell", "Lainnya"] as const;
export const ACTIVITY_TYPES = ["Note", "Call", "Meeting", "Email", "Demo", "Follow-up", "Proposal Sent", "Visit", "Lainnya"] as const;
export const COMPANY_SIZES = ["< 50 karyawan", "50–200 karyawan", "200–1000 karyawan", "> 1000 karyawan", "> 10.000 karyawan", "> 100.000 karyawan"] as const;

export function picList(pic: string | null | undefined): string[] {
  return (pic || "").split(",").map(s => s.trim()).filter(Boolean);
}

export function picMatches(pic: string | null | undefined, filter: string): boolean {
  return filter === "all" || filter === "" || picList(pic).includes(filter);
}

export function fmtIDR(n: number): string {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

export function fmtDate(d: string): string {
  if (!d) return "-";
  return new Date(d + "T00:00:00").toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

/** Formats a Date using its local (browser) calendar date — never UTC. */
export function fmtDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return fmtDateStr(new Date());
}

// Source: SKB 3 Menteri — Hari Libur Nasional dan Cuti Bersama Tahun 2026
// (Kemenko PMK, https://www.kemenkopmk.go.id/pemerintah-tetapkan-17-hari-libur-nasional-dan-8-hari-cuti-bersama-tahun-2026).
// Update this list each year — there's no calendar-computation for movable
// religious holidays (Idulfitri, Iduladha, Nyepi, Imlek, Waisak, Easter, etc.).
export const NATIONAL_HOLIDAYS_2026: { date: string; name: string }[] = [
  { date: "2026-01-01", name: "Tahun Baru Masehi" },
  { date: "2026-01-16", name: "Isra Mikraj" },
  { date: "2026-02-16", name: "Cuti Bersama Imlek" },
  { date: "2026-02-17", name: "Tahun Baru Imlek" },
  { date: "2026-03-18", name: "Cuti Bersama Nyepi" },
  { date: "2026-03-19", name: "Hari Suci Nyepi" },
  { date: "2026-03-20", name: "Cuti Bersama Idulfitri" },
  { date: "2026-03-21", name: "Idulfitri" },
  { date: "2026-03-22", name: "Idulfitri" },
  { date: "2026-03-23", name: "Cuti Bersama Idulfitri" },
  { date: "2026-03-24", name: "Cuti Bersama Idulfitri" },
  { date: "2026-04-03", name: "Wafat Yesus Kristus" },
  { date: "2026-04-05", name: "Paskah" },
  { date: "2026-05-01", name: "Hari Buruh Internasional" },
  { date: "2026-05-14", name: "Kenaikan Yesus Kristus" },
  { date: "2026-05-15", name: "Cuti Bersama Kenaikan Yesus Kristus" },
  { date: "2026-05-27", name: "Iduladha" },
  { date: "2026-05-28", name: "Cuti Bersama Iduladha" },
  { date: "2026-05-31", name: "Hari Raya Waisak" },
  { date: "2026-06-01", name: "Hari Lahir Pancasila" },
  { date: "2026-06-16", name: "Tahun Baru Islam" },
  { date: "2026-08-17", name: "Proklamasi Kemerdekaan RI" },
  { date: "2026-08-25", name: "Maulid Nabi Muhammad" },
  { date: "2026-12-24", name: "Cuti Bersama Natal" },
  { date: "2026-12-25", name: "Hari Raya Natal" },
];

const HOLIDAY_MAP_2026 = new Map(NATIONAL_HOLIDAYS_2026.map(h => [h.date, h.name]));

export function holidayName(ds: string): string | undefined {
  return HOLIDAY_MAP_2026.get(ds);
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
    Approching: "badge-approching", "Present Solution": "badge-present-solution", RFI: "badge-rfi",
    "RFP/BRD": "badge-rfp-brd", "Clarification/Requirement": "badge-clarification-requirement",
    "Proposal Teknis": "badge-proposal-teknis", "Presentasi Proposal": "badge-presentasi-proposal",
    "POC/Demo": "badge-poc-demo", "Offering Letter": "badge-offering-letter",
    "Proposal Clarification": "badge-proposal-clarification", Negotiation: "badge-negotiation",
    Dealed: "badge-dealed", PO: "badge-po", Kontrak: "badge-kontrak",
    "On Hold": "badge-on-hold", Dropped: "badge-dropped",
  };
  return map[stage] || "";
}

export function visitStatusClass(status: string): string {
  const map: Record<string, string> = {
    Planned: "st-planned", Done: "st-done", Cancel: "st-nogo", Reschedule: "st-followup",
  };
  return map[status] || "";
}
