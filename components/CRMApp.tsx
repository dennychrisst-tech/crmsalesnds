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
import SummaryView from "./SummaryView";

const TABS: { id: ActiveView; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "calendar", label: "Calendar Visit" },
  { id: "clients", label: "Client" },
  { id: "pipeline", label: "Pipeline" },
  { id: "projects", label: "Project" },
  { id: "tasks", label: "Tasks" },
  { id: "catalog", label: "Catalog" },
  { id: "summary", label: "Summary" },
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
  const readOnly = async () => { alert("Anda hanya memiliki akses lihat (view only)."); };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ro = <T,>(_fn: (v: T) => Promise<void>) => isViewer ? (readOnly as any) : _fn;
  const roDel = (fn: (id: string) => Promise<void>) => isViewer ? (readOnly as (id: string) => Promise<void>) : fn;
  const roUpload = (fn: (f: File, d?: string, c?: string) => Promise<void>) => isViewer ? (readOnly as typeof fn) : fn;

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
        <div className="sync-status">{syncStatus}</div>
        {currentProfile && ["super_admin", "admin"].includes(currentProfile.role) && (
          <a href="/admin/users" className="btn-admin">Admin</a>
        )}
        <button onClick={handleLogout} className="btn-logout">Keluar</button>
      </header>

      <nav className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={view === t.id ? "active" : ""} onClick={() => setView(t.id)}>
            {t.label}
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
                {view === "dashboard" && <Dashboard data={data} />}
                {view === "calendar" && (
                  <CalendarView data={data} currentUserName={currentUserName}
                    onSaveVisit={ro(upsertVisit)} onDeleteVisit={roDel(deleteVisit)}
                    onSaveEvent={ro(upsertEvent)} onDeleteEvent={roDel(deleteEvent)}
                    onCreateTask={ro(upsertTask)} />
                )}
                {view === "clients" && (
                  <Clients data={data} currentUserName={currentUserName}
                    onSaveClient={ro(upsertClient)} onDeleteClient={roDel(deleteClient)}
                    onSaveContact={ro(upsertContact)} onDeleteContact={roDel(deleteContact)}
                    onSaveVisit={ro(upsertVisit)} onDeleteVisit={roDel(deleteVisit)} />
                )}
                {view === "pipeline" && (
                  <Pipeline data={data} currentUserName={currentUserName}
                    onSaveDeal={ro(upsertDeal)} onDeleteDeal={roDel(deleteDeal)} onUpdateStage={roDel(updateDealStage)}
                    onAddDocument={ro(upsertDocument)} onDeleteDocument={roDel(deleteDocument)}
                    onUploadAttachment={roUpload(uploadAttachment)} onDeleteAttachment={roDel(deleteAttachment)}
                    onAddActivity={ro(upsertActivity)} onDeleteActivity={roDel(deleteActivity)} />
                )}
                {view === "projects" && (
                  <Projects data={data} onSaveProject={ro(upsertProject)} onDeleteProject={roDel(deleteProject)} />
                )}
                {view === "tasks" && (
                  <TasksView data={data} currentUserName={currentUserName} onSaveTask={ro(upsertTask)} onDeleteTask={roDel(deleteTask)} />
                )}
                {view === "catalog" && (
                  <ProductsView data={data} onSaveProduct={ro(upsertProduct)} onDeleteProduct={roDel(deleteProduct)} />
                )}
                {view === "summary" && <SummaryView data={data} />}
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
