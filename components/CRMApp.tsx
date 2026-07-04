"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, Building2, CalendarDays, FolderKanban, Briefcase,
  ListChecks, TrendingUp, ClipboardList, CalendarRange, Wallet, Users, MoreHorizontal, Calculator,
  BarChart3, ChevronDown, Sun, Moon,
  type LucideIcon,
} from "lucide-react";
import { useData } from "@/hooks/useData";
import { useTheme } from "@/hooks/useTheme";

import { ActiveView } from "@/types";
import Dashboard from "./Dashboard";
import CalendarView from "./CalendarView";
import Clients from "./Clients";
import Pipeline from "./Pipeline";
import Projects from "./Projects";
import TasksView from "./TasksView";
import ProductsView from "./ProductsView";
import GlobalSearch from "./GlobalSearch";
import RemindersBell from "./RemindersBell";
import SummaryView from "./SummaryView";
import VisitReport from "./VisitReport";
import WeeklyReport from "./WeeklyReport";
import RevenueForecastView from "./RevenueForecastView";
import TalentFillRateView from "./TalentFillRateView";
import MandaysRateView from "./MandaysRateView";
import ToastHost, { toast } from "./ui/Toast";
import Logo from "./ui/Logo";

const TABS: { id: ActiveView; label: string; icon: LucideIcon }[] = [
  { id: "dashboard",    label: "Dashboard",         icon: LayoutDashboard },
  { id: "clients",     label: "Client",             icon: Building2 },
  { id: "calendar",    label: "Calendar Visit",     icon: CalendarDays },
  { id: "projects",    label: "Project",            icon: FolderKanban },
  { id: "pipeline",    label: "Pipeline",           icon: Briefcase },
  { id: "tasks",       label: "Tasks",              icon: ListChecks },
  { id: "summary",     label: "Summary Activity",   icon: TrendingUp },
  { id: "visit-report",label: "Laporan Visit",      icon: ClipboardList },
  { id: "weekly-report",label: "Laporan Mingguan",  icon: CalendarRange },
  { id: "revenue-forecast", label: "Revenue Forecast", icon: Wallet },
  { id: "talent-fill-rate", label: "Talent Fill Rate", icon: Users },
  { id: "mandays-rate", label: "Mandays Rate", icon: Calculator },
];

// Bottom nav (mobile only) surfaces the 4 most-used views + a "Lainnya" sheet for the rest.
const PRIMARY_VIEWS: ActiveView[] = ["dashboard", "clients", "calendar", "pipeline"];
const MORE_TABS = TABS.filter(t => !PRIMARY_VIEWS.includes(t.id));
// Groups the "Lainnya" sheet under short headers instead of one flat list —
// it's grown to 8 items as the app added more menus, and was becoming hard
// to scan on mobile. Anything not listed here falls into "Lainnya" so new
// tabs never silently disappear from the sheet.
const MORE_GROUPS: { label: string; ids: ActiveView[] }[] = [
  { label: "Kerja", ids: ["projects", "tasks"] },
  { label: "Laporan", ids: ["summary", "visit-report", "weekly-report"] },
  { label: "Analitik", ids: ["revenue-forecast", "talent-fill-rate", "mandays-rate"] },
];

// Desktop tab row: keeps the 6 most-used views inline, and groups the rest
// under two dropdowns instead of letting the row wrap to a ragged second
// line once it doesn't fit (it was already right at the edge at 12 tabs).
const DESKTOP_PRIMARY_IDS: ActiveView[] = ["dashboard", "clients", "calendar", "projects", "pipeline", "tasks"];
const DESKTOP_DROPDOWN_GROUPS: { label: string; icon: LucideIcon; ids: ActiveView[] }[] = [
  { label: "Laporan", icon: ClipboardList, ids: ["summary", "visit-report", "weekly-report"] },
  { label: "Analitik", icon: BarChart3, ids: ["revenue-forecast", "talent-fill-rate", "mandays-rate"] },
];

// All views the app can render — used to validate the "?view=" deep-link
// param (e.g. from Admin Dashboard/Tim linking straight to Summary Activity)
// so an unknown/typo'd value falls back to the default view instead of
// rendering nothing.
const ALL_VIEW_IDS: ActiveView[] = [
  "dashboard", "calendar", "clients", "pipeline", "projects", "tasks", "catalog",
  "summary", "visit-report", "weekly-report", "revenue-forecast", "talent-fill-rate", "mandays-rate",
];

function NavDropdown({ label, icon: Icon, items, view, onSelect, open, onToggle, onCloseRequest }: {
  label: string; icon: LucideIcon; items: { id: ActiveView; label: string; icon: LucideIcon }[];
  view: ActiveView; onSelect: (id: ActiveView) => void;
  open: boolean; onToggle: () => void; onCloseRequest: () => void;
}) {
  const isActive = items.some(i => i.id === view);

  // Shared "which dropdown is open" state lives in the parent (see openNavDropdown
  // below) so opening one closes the other — each dropdown used to track its own
  // open state locally, so clicking a second one didn't close the first, letting
  // both stay open and overlap.
  useEffect(() => {
    if (!open) return;
    window.addEventListener("click", onCloseRequest);
    return () => window.removeEventListener("click", onCloseRequest);
  }, [open, onCloseRequest]);

  return (
    <div className="nav-dropdown-wrap" onClick={e => e.stopPropagation()}>
      <button className={`nav-dropdown-trigger${isActive ? " active" : ""}`} onClick={onToggle}>
        <span className="tab-icon"><Icon size={15} /></span>{label}
        <ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }} />
      </button>
      {open && (
        <div className="nav-dropdown-menu">
          {items.map(i => (
            <button key={i.id} className={`nav-dropdown-item${view === i.id ? " active" : ""}`}
              onClick={() => { onSelect(i.id); onCloseRequest(); }}>
              <span className="tab-icon"><i.icon size={14} /></span>{i.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CRMApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Deep-link support for "/?view=summary" etc. (e.g. Admin Dashboard/Tim
  // linking straight to Summary Activity instead of duplicating its tables).
  // Read once via lazy initial state — no effect/setState needed for this part.
  const [view, setView] = useState<ActiveView>(() => {
    const requested = searchParams.get("view") as ActiveView | null;
    return requested && ALL_VIEW_IDS.includes(requested) ? requested : "dashboard";
  });
  const [pendingClientId, setPendingClientId] = useState<string | null>(null);
  const [pendingDealId, setPendingDealId] = useState<string | null>(null);
  const [pendingVisitId, setPendingVisitId] = useState<string | null>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [pendingStage, setPendingStage] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [openNavDropdown, setOpenNavDropdown] = useState<string | null>(null);

  // Strip the "?view=" param once consumed above so it doesn't fight the
  // app's own tab-switching (e.g. clicking another tab shouldn't leave a
  // stale ?view= in the address bar).
  useEffect(() => {
    if (searchParams.get("view")) router.replace("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openClient(clientId: string) {
    setPendingClientId(clientId);
    setView("clients");
  }

  function openDeal(dealId: string) {
    setPendingDealId(dealId);
    setView("pipeline");
  }

  function openVisit(visitId: string) {
    setPendingVisitId(visitId);
    setView("calendar");
  }

  function openTask(taskId: string) {
    setPendingTaskId(taskId);
    setView("tasks");
  }

  function openStage(stage: string) {
    setPendingStage(stage);
    setView("pipeline");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }
  const {
    data, loading, currentProfile,
    upsertClient, deleteClient,
    upsertContact, deleteContact,
    upsertVisit, deleteVisit,
    upsertDeal, deleteDeal, updateDealStage,
    upsertProject, deleteProject,
    upsertTalentRole, deleteTalentRole,
    upsertRevenueTarget,
    upsertRevenueLine, deleteRevenueLine,
    upsertTask, deleteTask,
    upsertProduct, deleteProduct,
    upsertDocument, deleteDocument,
    uploadAttachment, deleteAttachment,
    uploadClientLogo, deleteClientLogo,
    upsertActivity, deleteActivity,
    upsertEvent, deleteEvent,
    upsertMandaysRole, deleteMandaysRole,
    upsertMandaysClientRate, deleteMandaysClientRate,
  } = useData();

  const { theme, toggle: toggleTheme } = useTheme();
  const isViewer = currentProfile?.role === "viewer";
  const isAdmin = !!currentProfile && ["super_admin", "admin"].includes(currentProfile.role);
  const warnViewer = () => { toast("Anda hanya memiliki akses lihat (view only).", { type: "error" }); return Promise.resolve(); };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ro = (fn: any) => isViewer ? (() => warnViewer()) : fn;

  return (
    <div className="app">
      <ToastHost />
      <header className="top">
        <div className="header-brand">
          <Logo height={44} />
          <div className="header-crm-tag">Sales CRM</div>
        </div>
        <div className="header-search-row">
          {!loading && <GlobalSearch data={data} onNavigate={setView} onOpenClient={openClient} onOpenDeal={openDeal} onOpenTask={openTask} />}
          {!loading && (
            <RemindersBell data={data} currentUserName={currentProfile?.name ?? ""} isAdmin={isAdmin} onNavigate={setView} onOpenTask={openTask} />
          )}
          <button onClick={toggleTheme} className="btn-theme-toggle" title={theme === "dark" ? "Mode Terang" : "Mode Gelap"} aria-label="Ganti tema">
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
        {currentProfile && ["super_admin", "admin"].includes(currentProfile.role) && (
          <a href="/admin/users" className="btn-admin">Admin</a>
        )}
        <button onClick={handleLogout} className="btn-logout">Log Out</button>
      </header>

      <nav className="tabs">
        {TABS.filter(t => DESKTOP_PRIMARY_IDS.includes(t.id)).map(t => (
          <button key={t.id} className={view === t.id ? "active" : ""} onClick={() => setView(t.id)}>
            <span className="tab-icon"><t.icon size={15} /></span>{t.label}
          </button>
        ))}
        {DESKTOP_DROPDOWN_GROUPS.map(g => (
          <NavDropdown key={g.label} label={g.label} icon={g.icon}
            items={g.ids.map(id => TABS.find(t => t.id === id)!).filter(Boolean)}
            view={view} onSelect={setView}
            open={openNavDropdown === g.label}
            onToggle={() => setOpenNavDropdown(o => o === g.label ? null : g.label)}
            onCloseRequest={() => setOpenNavDropdown(null)} />
        ))}
      </nav>

      {/* Bottom nav — mobile only (see globals.css). Desktop keeps the tab row above. */}
      <nav className="bottom-nav">
        {TABS.filter(t => PRIMARY_VIEWS.includes(t.id)).map(t => (
          <button key={t.id} className={view === t.id && !moreOpen ? "active" : ""} onClick={() => { setView(t.id); setMoreOpen(false); }}>
            <span className="bottom-nav-icon"><t.icon size={20} /></span>
            <span className="bottom-nav-label">{t.label}</span>
          </button>
        ))}
        <button className={moreOpen || MORE_TABS.some(t => t.id === view) ? "active" : ""} onClick={() => setMoreOpen(o => !o)}>
          <span className="bottom-nav-icon"><MoreHorizontal size={20} /></span>
          <span className="bottom-nav-label">Lainnya</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="more-sheet-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="more-sheet" onClick={e => e.stopPropagation()}>
            <div className="more-sheet-handle" />
            {(() => {
              const grouped = new Set(MORE_GROUPS.flatMap(g => g.ids));
              const ungrouped = MORE_TABS.filter(t => !grouped.has(t.id));
              const sections = [...MORE_GROUPS, ...(ungrouped.length ? [{ label: "Lainnya", ids: ungrouped.map(t => t.id) }] : [])];
              return sections.map(group => {
                const items = group.ids.map(id => MORE_TABS.find(t => t.id === id)).filter((t): t is typeof MORE_TABS[number] => !!t);
                if (items.length === 0) return null;
                return (
                  <div key={group.label} className="more-sheet-group">
                    <div className="more-sheet-group-label">{group.label}</div>
                    {items.map(t => (
                      <button key={t.id} className={`more-sheet-item${view === t.id ? " active" : ""}`}
                        onClick={() => { setView(t.id); setMoreOpen(false); }}>
                        <span className="bottom-nav-icon"><t.icon size={18} /></span>{t.label}
                      </button>
                    ))}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {loading ? (
        /* Skeleton mirrors the Dashboard layout (default view) while data loads */
        <div aria-label="Memuat data…" aria-busy="true">
          <div className="skeleton sk-bar" />
          <div className="kpis">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton sk-kpi" />)}
          </div>
          <div className="skeleton sk-panel" />
          <div className="grid2">
            <div className="skeleton sk-panel" />
            <div className="skeleton sk-panel" />
          </div>
        </div>
      ) : (
        <>
          {(() => {
            const currentUserName = currentProfile?.name ?? "";
            return (
              <>
                {view === "dashboard" && (
                  <Dashboard data={data} onNavigate={setView} onOpenStage={openStage}
                    onSaveClient={ro(upsertClient)} onDeleteClient={ro(deleteClient)}
                    onUploadLogo={uploadClientLogo} onDeleteLogo={deleteClientLogo}
                    onSaveDeal={ro(upsertDeal)} onDeleteDeal={ro(deleteDeal)}
                    onAddDocument={ro(upsertDocument)} onDeleteDocument={ro(deleteDocument)}
                    onUploadAttachment={ro(uploadAttachment)} onDeleteAttachment={ro(deleteAttachment)}
                    onAddActivity={ro(upsertActivity)} onDeleteActivity={ro(deleteActivity)}
                    onSaveVisit={ro(upsertVisit)} onDeleteVisit={ro(deleteVisit)}
                    onCreateTask={ro(upsertTask)} onCreateDeal={ro(upsertDeal)} onSaveContact={ro(upsertContact)}
                    onSaveProject={ro(upsertProject)} onDeleteProject={ro(deleteProject)}
                    onSaveTask={ro(upsertTask)} onDeleteTask={ro(deleteTask)} />
                )}
                {view === "calendar" && (
                  <CalendarView data={data} currentUserName={currentUserName} isViewer={isViewer}
                    onSaveVisit={ro(upsertVisit)} onDeleteVisit={ro(deleteVisit)}
                    onSaveEvent={ro(upsertEvent)} onDeleteEvent={ro(deleteEvent)}
                    onCreateTask={ro(upsertTask)} onCreateDeal={ro(upsertDeal)} onSaveContact={ro(upsertContact)}
                    openVisitId={pendingVisitId} onOpenVisitHandled={() => setPendingVisitId(null)} />
                )}
                {view === "clients" && (
                  <Clients data={data} currentUserName={currentUserName} isViewer={isViewer} onNavigate={setView}
                    onSaveClient={ro(upsertClient)} onDeleteClient={ro(deleteClient)}
                    onUploadLogo={uploadClientLogo} onDeleteLogo={deleteClientLogo}
                    onSaveContact={ro(upsertContact)} onDeleteContact={ro(deleteContact)}
                    onSaveVisit={ro(upsertVisit)} onDeleteVisit={ro(deleteVisit)} onCreateDeal={ro(upsertDeal)}
                    openClientId={pendingClientId} onOpenClientHandled={() => setPendingClientId(null)} />
                )}
                {view === "pipeline" && (
                  <Pipeline data={data} currentUserName={currentUserName} isViewer={isViewer}
                    onSaveDeal={ro(upsertDeal)} onDeleteDeal={ro(deleteDeal)} onUpdateStage={ro(updateDealStage)}
                    onAddDocument={ro(upsertDocument)} onDeleteDocument={ro(deleteDocument)}
                    onUploadAttachment={ro(uploadAttachment)} onDeleteAttachment={ro(deleteAttachment)}
                    onAddActivity={ro(upsertActivity)} onDeleteActivity={ro(deleteActivity)}
                    openDealId={pendingDealId} onOpenDealHandled={() => setPendingDealId(null)}
                    openStage={pendingStage} onOpenStageHandled={() => setPendingStage(null)} />
                )}
                {view === "projects" && (
                  <Projects data={data} isViewer={isViewer} onSaveProject={ro(upsertProject)} onDeleteProject={ro(deleteProject)}
                    onSaveTalentRole={ro(upsertTalentRole)} onDeleteTalentRole={ro(deleteTalentRole)}
                    onOpenClient={openClient} />
                )}
                {view === "tasks" && (
                  <TasksView data={data} currentUserName={currentUserName} isViewer={isViewer} onSaveTask={ro(upsertTask)} onDeleteTask={ro(deleteTask)} onCreateDeal={ro(upsertDeal)}
                    openTaskId={pendingTaskId} onOpenTaskHandled={() => setPendingTaskId(null)} />
                )}
                {view === "catalog" && (
                  <ProductsView data={data} isViewer={isViewer} onSaveProduct={ro(upsertProduct)} onDeleteProduct={ro(deleteProduct)} />
                )}
                {view === "summary" && <SummaryView data={data} onOpenVisit={openVisit} />}
                {view === "visit-report" && <VisitReport data={data} />}
                {view === "weekly-report" && <WeeklyReport data={data} onOpenDeal={openDeal} />}
                {view === "revenue-forecast" && (
                  <RevenueForecastView data={data} isViewer={isViewer}
                    onSaveTarget={ro(upsertRevenueTarget)}
                    onSaveLine={ro(upsertRevenueLine)} onDeleteLine={ro(deleteRevenueLine)}
                    onSaveDeal={ro(upsertDeal)} onDeleteDeal={ro(deleteDeal)} />
                )}
                {view === "talent-fill-rate" && (
                  <TalentFillRateView data={data} onOpenClient={openClient} />
                )}
                {view === "mandays-rate" && (
                  <MandaysRateView data={data} isViewer={isViewer}
                    onSaveRole={ro(upsertMandaysRole)} onDeleteRole={ro(deleteMandaysRole)}
                    onSaveClientRate={ro(upsertMandaysClientRate)} onDeleteClientRate={ro(deleteMandaysClientRate)} />
                )}
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
