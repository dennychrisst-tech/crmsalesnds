"use client";
import { useState } from "react";
import { useData } from "@/hooks/useData";
import { ActiveView } from "@/types";
import Dashboard from "./Dashboard";
import CalendarView from "./CalendarView";
import Clients from "./Clients";
import Pipeline from "./Pipeline";
import Projects from "./Projects";
import TasksView from "./TasksView";
import ProductsView from "./ProductsView";

const TABS: { id: ActiveView; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "calendar", label: "Calendar Visit" },
  { id: "clients", label: "Client" },
  { id: "pipeline", label: "Pipeline" },
  { id: "projects", label: "Project" },
  { id: "tasks", label: "Tasks" },
  { id: "catalog", label: "Catalog" },
];

export default function CRMApp() {
  const [view, setView] = useState<ActiveView>("dashboard");
  const {
    data, loading, syncStatus,
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
  } = useData();

  return (
    <div className="app">
      <header className="top">
        <div className="header-brand">
          <svg viewBox="0 0 210 72" height="44" aria-label="NDS – Nusantara Duta Solusindo" xmlns="http://www.w3.org/2000/svg">
            {/* N */}
            <text x="0" y="48" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="52" fontWeight="800" fill="#58595B">N</text>
            {/* Teal arc ) */}
            <path d="M68 6 C90 6 104 20 104 36 C104 52 90 66 68 66" stroke="#00AFA0" strokeWidth="7" fill="none" strokeLinecap="round"/>
            {/* S */}
            <text x="108" y="48" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="52" fontWeight="800" fill="#58595B">S</text>
            {/* Company name – three lines */}
            <text x="148" y="28" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="#58595B">NUSANTARA</text>
            <text x="148" y="42" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="#58595B">
              <tspan fill="#00AFA0">D</tspan>UTA
            </text>
            <text x="148" y="56" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="#58595B">SOLUSINDO</text>
          </svg>
          <div className="header-crm-tag">CRM</div>
        </div>
        <div className="sync-status">{syncStatus}</div>
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
          {view === "dashboard" && <Dashboard data={data} />}
          {view === "calendar" && <CalendarView data={data} onSaveVisit={upsertVisit} onDeleteVisit={deleteVisit} />}
          {view === "clients" && (
            <Clients data={data}
              onSaveClient={upsertClient} onDeleteClient={deleteClient}
              onSaveContact={upsertContact} onDeleteContact={deleteContact}
              onSaveVisit={upsertVisit} onDeleteVisit={deleteVisit} />
          )}
          {view === "pipeline" && (
            <Pipeline data={data}
              onSaveDeal={upsertDeal} onDeleteDeal={deleteDeal} onUpdateStage={updateDealStage}
              onAddDocument={upsertDocument} onDeleteDocument={deleteDocument}
              onUploadAttachment={uploadAttachment} onDeleteAttachment={deleteAttachment}
              onAddActivity={upsertActivity} onDeleteActivity={deleteActivity} />
          )}
          {view === "projects" && (
            <Projects data={data} onSaveProject={upsertProject} onDeleteProject={deleteProject} />
          )}
          {view === "tasks" && (
            <TasksView data={data} onSaveTask={upsertTask} onDeleteTask={deleteTask} />
          )}
          {view === "catalog" && (
            <ProductsView data={data} onSaveProduct={upsertProduct} onDeleteProduct={deleteProduct} />
          )}
        </>
      )}
    </div>
  );
}
