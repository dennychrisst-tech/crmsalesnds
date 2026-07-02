"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Building2, CalendarDays, FolderKanban, Briefcase,
  ListChecks, TrendingUp, ClipboardList, CalendarRange, Wallet, MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import { useData } from "@/hooks/useData";

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
import ToastHost from "./ui/Toast";

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
];

// Bottom nav (mobile only) surfaces the 4 most-used views + a "Lainnya" sheet for the rest.
const PRIMARY_VIEWS: ActiveView[] = ["dashboard", "clients", "calendar", "pipeline"];
const MORE_TABS = TABS.filter(t => !PRIMARY_VIEWS.includes(t.id));

export default function CRMApp() {
  const router = useRouter();
  const [view, setView] = useState<ActiveView>("dashboard");
  const [pendingClientId, setPendingClientId] = useState<string | null>(null);
  const [pendingDealId, setPendingDealId] = useState<string | null>(null);
  const [pendingVisitId, setPendingVisitId] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

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
    upsertRevenueOpportunity, deleteRevenueOpportunity,
    upsertTask, deleteTask,
    upsertProduct, deleteProduct,
    upsertDocument, deleteDocument,
    uploadAttachment, deleteAttachment,
    uploadClientLogo, deleteClientLogo,
    upsertActivity, deleteActivity,
    upsertEvent, deleteEvent,
  } = useData();

  const isViewer = currentProfile?.role === "viewer";
  const isAdmin = !!currentProfile && ["super_admin", "admin"].includes(currentProfile.role);
  const warnViewer = () => { alert("Anda hanya memiliki akses lihat (view only)."); return Promise.resolve(); };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ro = (fn: any) => isViewer ? (() => warnViewer()) : fn;

  return (
    <div className="app">
      <ToastHost />
      <header className="top">
        <div className="header-brand">
          <svg viewBox="0 0 210 72" height="44" aria-label="NDS – Nusantara Duta Solusindo" xmlns="http://www.w3.org/2000/svg">
            <text x="0" y="48" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="52" fontWeight="800" fill="#fff">N</text>
            <path d="M68 6 C90 6 104 20 104 36 C104 52 90 66 68 66" stroke="#00AFA0" strokeWidth="7" fill="none" strokeLinecap="round"/>
            <text x="108" y="48" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="52" fontWeight="800" fill="#fff">S</text>
            <text x="148" y="28" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="rgba(255,255,255,.6)">NUSANTARA</text>
            <text x="148" y="42" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="rgba(255,255,255,.6)">
              <tspan fill="#00AFA0">D</tspan>UTA
            </text>
            <text x="148" y="56" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="rgba(255,255,255,.6)">SOLUSINDO</text>
          </svg>
          <div className="header-crm-tag">Sales CRM</div>
        </div>
        <div className="header-search-row">
          {!loading && <GlobalSearch data={data} onNavigate={setView} onOpenClient={openClient} onOpenDeal={openDeal} />}
          {!loading && (
            <RemindersBell data={data} currentUserName={currentProfile?.name ?? ""} isAdmin={isAdmin} onNavigate={setView} />
          )}
        </div>
        {currentProfile && ["super_admin", "admin"].includes(currentProfile.role) && (
          <a href="/admin/users" className="btn-admin">Admin</a>
        )}
        <button onClick={handleLogout} className="btn-logout">Log Out</button>
      </header>

      <nav className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={view === t.id ? "active" : ""} onClick={() => setView(t.id)}>
            <span className="tab-icon"><t.icon size={15} /></span>{t.label}
          </button>
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
            {MORE_TABS.map(t => (
              <button key={t.id} className={`more-sheet-item${view === t.id ? " active" : ""}`}
                onClick={() => { setView(t.id); setMoreOpen(false); }}>
                <span className="bottom-nav-icon"><t.icon size={18} /></span>{t.label}
              </button>
            ))}
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
                {view === "dashboard" && <Dashboard data={data} onNavigate={setView} />}
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
                    openDealId={pendingDealId} onOpenDealHandled={() => setPendingDealId(null)} />
                )}
                {view === "projects" && (
                  <Projects data={data} isViewer={isViewer} onSaveProject={ro(upsertProject)} onDeleteProject={ro(deleteProject)}
                    onSaveTalentRole={ro(upsertTalentRole)} onDeleteTalentRole={ro(deleteTalentRole)}
                    onOpenClient={openClient} />
                )}
                {view === "tasks" && (
                  <TasksView data={data} currentUserName={currentUserName} isViewer={isViewer} onSaveTask={ro(upsertTask)} onDeleteTask={ro(deleteTask)} onCreateDeal={ro(upsertDeal)} />
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
                    onSaveOpportunity={ro(upsertRevenueOpportunity)} onDeleteOpportunity={ro(deleteRevenueOpportunity)} />
                )}
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
