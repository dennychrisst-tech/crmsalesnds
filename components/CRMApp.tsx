"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
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

const TABS: { id: ActiveView; label: string; icon: string }[] = [
  { id: "dashboard",    label: "Dashboard",         icon: "📊" },
  { id: "clients",     label: "Client",             icon: "🏢" },
  { id: "calendar",    label: "Calendar Visit",     icon: "📅" },
  { id: "pipeline",    label: "Pipeline",           icon: "💼" },
  { id: "projects",    label: "Project",            icon: "🏗️" },
  { id: "tasks",       label: "Tasks",              icon: "✅" },
  { id: "summary",     label: "Summary Activity",   icon: "📈" },
  { id: "visit-report",label: "Laporan Visit",      icon: "📋" },
];

export default function CRMApp() {
  const router = useRouter();
  const [view, setView] = useState<ActiveView>("dashboard");

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }
  const {
    data, loading, syncStatus, currentProfile,
    upsertClient, deleteClient,
    upsertContact, deleteContact,
    upsertVisit, deleteVisit,
    upsertDeal, deleteDeal, updateDealStage,
    upsertProject, deleteProject,
    upsertTask, deleteTask,
    upsertProduct, deleteProduct,
    upsertDocument, deleteDocument,
    uploadAttachment, deleteAttachment,
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
      <header className="top">
        <div className="header-brand">
          <svg viewBox="0 0 210 72" height="44" aria-label="NDS – Nusantara Duta Solusindo" xmlns="http://www.w3.org/2000/svg">
            <text x="0" y="48" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="52" fontWeight="800" fill="#58595B">N</text>
            <path d="M68 6 C90 6 104 20 104 36 C104 52 90 66 68 66" stroke="#00AFA0" strokeWidth="7" fill="none" strokeLinecap="round"/>
            <text x="108" y="48" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="52" fontWeight="800" fill="#58595B">S</text>
            <text x="148" y="28" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="#58595B">NUSANTARA</text>
            <text x="148" y="42" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="#58595B">
              <tspan fill="#00AFA0">D</tspan>UTA
            </text>
            <text x="148" y="56" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="#58595B">SOLUSINDO</text>
          </svg>
          <div className="header-crm-tag">Sales CRM</div>
        </div>
        {!loading && <GlobalSearch data={data} onNavigate={setView} />}
        {!loading && (
          <RemindersBell data={data} currentUserName={currentProfile?.name ?? ""} isAdmin={isAdmin} onNavigate={setView} />
        )}
        <div className="sync-status">{syncStatus}</div>
        {currentProfile && ["super_admin", "admin"].includes(currentProfile.role) && (
          <a href="/admin/users" className="btn-admin">Admin</a>
        )}
        <button onClick={handleLogout} className="btn-logout">Keluar</button>
      </header>

      <nav className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={view === t.id ? "active" : ""} onClick={() => setView(t.id)}>
            <span className="tab-icon">{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="empty-state">Memuat data…</div>
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
                    onCreateTask={ro(upsertTask)} />
                )}
                {view === "clients" && (
                  <Clients data={data} currentUserName={currentUserName} isViewer={isViewer} onNavigate={setView}
                    onSaveClient={ro(upsertClient)} onDeleteClient={ro(deleteClient)}
                    onSaveContact={ro(upsertContact)} onDeleteContact={ro(deleteContact)}
                    onSaveVisit={ro(upsertVisit)} onDeleteVisit={ro(deleteVisit)} />
                )}
                {view === "pipeline" && (
                  <Pipeline data={data} currentUserName={currentUserName} isViewer={isViewer}
                    onSaveDeal={ro(upsertDeal)} onDeleteDeal={ro(deleteDeal)} onUpdateStage={ro(updateDealStage)}
                    onAddDocument={ro(upsertDocument)} onDeleteDocument={ro(deleteDocument)}
                    onUploadAttachment={ro(uploadAttachment)} onDeleteAttachment={ro(deleteAttachment)}
                    onAddActivity={ro(upsertActivity)} onDeleteActivity={ro(deleteActivity)} />
                )}
                {view === "projects" && (
                  <Projects data={data} isViewer={isViewer} onSaveProject={ro(upsertProject)} onDeleteProject={ro(deleteProject)} />
                )}
                {view === "tasks" && (
                  <TasksView data={data} currentUserName={currentUserName} isViewer={isViewer} onSaveTask={ro(upsertTask)} onDeleteTask={ro(deleteTask)} />
                )}
                {view === "catalog" && (
                  <ProductsView data={data} isViewer={isViewer} onSaveProduct={ro(upsertProduct)} onDeleteProduct={ro(deleteProduct)} />
                )}
                {view === "summary" && <SummaryView data={data} />}
                {view === "visit-report" && <VisitReport data={data} />}
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
