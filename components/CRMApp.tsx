"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/hooks/useData";
import { getSupabase } from "@/lib/supabase";
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
    await getSupabase().auth.signOut();
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
                    onSaveVisit={upsertVisit} onDeleteVisit={deleteVisit}
                    onSaveEvent={upsertEvent} onDeleteEvent={deleteEvent}
                    onCreateTask={upsertTask} />
                )}
                {view === "clients" && (
                  <Clients data={data} currentUserName={currentUserName}
                    onSaveClient={upsertClient} onDeleteClient={deleteClient}
                    onSaveContact={upsertContact} onDeleteContact={deleteContact}
                    onSaveVisit={upsertVisit} onDeleteVisit={deleteVisit} />
                )}
                {view === "pipeline" && (
                  <Pipeline data={data} currentUserName={currentUserName}
                    onSaveDeal={upsertDeal} onDeleteDeal={deleteDeal} onUpdateStage={updateDealStage}
                    onAddDocument={upsertDocument} onDeleteDocument={deleteDocument}
                    onUploadAttachment={uploadAttachment} onDeleteAttachment={deleteAttachment}
                    onAddActivity={upsertActivity} onDeleteActivity={deleteActivity} />
                )}
                {view === "projects" && (
                  <Projects data={data} onSaveProject={upsertProject} onDeleteProject={deleteProject} />
                )}
                {view === "tasks" && (
                  <TasksView data={data} currentUserName={currentUserName} onSaveTask={upsertTask} onDeleteTask={deleteTask} />
                )}
                {view === "catalog" && (
                  <ProductsView data={data} onSaveProduct={upsertProduct} onDeleteProduct={deleteProduct} />
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
