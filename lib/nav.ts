import {
  LayoutDashboard, Building2, CalendarDays, FolderKanban, Briefcase, Target, UserSearch,
  ListChecks, TrendingUp, ClipboardList, CalendarRange, Wallet, Users, Calculator, BarChart3,
  type LucideIcon,
} from "lucide-react";
import { ActiveView, DateRange } from "@/types";

export interface NavTab {
  href: string;
  label: string;
  icon: LucideIcon;
}

// One entry per menu tab, keyed by the route it now owns (see the route
// migration plan — each tab is becoming its own app/(crm)/<x>/page.tsx).
// Order here drives the desktop tab row and the mobile "Lainnya" sheet.
export const TABS: NavTab[] = [
  { href: "/",                 label: "Dashboard",         icon: LayoutDashboard },
  { href: "/clients",          label: "Client",            icon: Building2 },
  { href: "/calendar",         label: "Calendar Visit",    icon: CalendarDays },
  { href: "/projects",         label: "Project",           icon: FolderKanban },
  { href: "/opty",             label: "Oppty",             icon: Target },
  { href: "/talent",           label: "Talent",            icon: UserSearch },
  { href: "/pipeline",         label: "Pipeline",          icon: Briefcase },
  { href: "/tasks",            label: "Tasks",             icon: ListChecks },
  { href: "/summary",          label: "Summary Activity",  icon: TrendingUp },
  { href: "/visit-report",     label: "Laporan Visit",     icon: ClipboardList },
  { href: "/weekly-report",    label: "Laporan Mingguan",  icon: CalendarRange },
  { href: "/revenue-forecast", label: "Revenue Forecast",  icon: Wallet },
  { href: "/talent-fill-rate", label: "Talent Fill Rate",  icon: Users },
  { href: "/mandays-rate",     label: "Mandays Rate",      icon: Calculator },
];

// Bottom nav (mobile only) surfaces the 4 most-used views + a "Lainnya" sheet for the rest.
export const PRIMARY_HREFS = ["/", "/clients", "/calendar", "/pipeline"];
export const MORE_TABS = TABS.filter(t => !PRIMARY_HREFS.includes(t.href));
// Groups the "Lainnya" sheet under short headers instead of one flat list.
// Anything not listed here falls into "Lainnya" so new tabs never silently
// disappear from the sheet.
export const MORE_GROUPS: { label: string; hrefs: string[] }[] = [
  { label: "Kerja", hrefs: ["/projects", "/opty", "/talent", "/tasks"] },
  { label: "Laporan", hrefs: ["/summary", "/visit-report", "/weekly-report"] },
  { label: "Analitik", hrefs: ["/revenue-forecast", "/talent-fill-rate", "/mandays-rate"] },
];

// Desktop tab row: keeps the 8 most-used views inline, groups the rest under
// two dropdowns instead of letting the row wrap to a ragged second line.
export const DESKTOP_PRIMARY_HREFS = ["/", "/clients", "/calendar", "/projects", "/opty", "/talent", "/pipeline", "/tasks"];
export const DESKTOP_DROPDOWN_GROUPS: { label: string; icon: LucideIcon; hrefs: string[] }[] = [
  { label: "Laporan", icon: ClipboardList, hrefs: ["/summary", "/visit-report", "/weekly-report"] },
  { label: "Analitik", icon: BarChart3, hrefs: ["/revenue-forecast", "/talent-fill-rate", "/mandays-rate"] },
];

// Maps the legacy ActiveView vocabulary (still used internally by views not
// yet split into their own route, e.g. Dashboard's onNavigate prop) to the
// route that now serves it. Retire this once every view owns its own page
// and reads usePathname/useSearchParams directly instead of taking an
// ActiveView — see components/LegacyViewSwitch.tsx.
export const VIEW_HREF: Record<ActiveView, string> = {
  dashboard: "/", clients: "/clients", calendar: "/calendar", projects: "/projects",
  opty: "/opty", talent: "/talent", pipeline: "/pipeline", tasks: "/tasks",
  catalog: "/catalog", summary: "/summary", "visit-report": "/visit-report",
  "weekly-report": "/weekly-report", "revenue-forecast": "/revenue-forecast",
  "talent-fill-rate": "/talent-fill-rate", "mandays-rate": "/mandays-rate",
};

// Deep-link hrefs — replace the old pendingClientId/pendingDealId/etc. React
// state that used to live in CRMApp.tsx. Each target page reads its own
// query param via useSearchParams() instead of receiving it as a prop.
export const clientHref = (id: string) => `/clients?openClientId=${id}`;
export const dealHref = (id: string) => `/pipeline?openDealId=${id}`;
export const visitHref = (id: string) => `/calendar?openVisitId=${id}`;
export const taskHref = (id: string) => `/tasks?openTaskId=${id}`;
export const stageHref = (stage: string) => `/pipeline?openStage=${encodeURIComponent(stage)}`;
export const calendarWeekHref = (range: DateRange) => `/calendar?weekStart=${range.start}&weekEnd=${range.end}`;
export function pipelineWeekHref(range: DateRange, stage?: string): string {
  const params = new URLSearchParams({ weekStart: range.start, weekEnd: range.end });
  if (stage) params.set("openStage", stage);
  return `/pipeline?${params.toString()}`;
}
