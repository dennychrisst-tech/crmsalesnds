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
  } = useData();

  return (
    <div className="app">
      <header className="top">
        <div className="logo">NDS<span>·</span>CRM</div>
        <div className="tag">Sales Pipeline · Banking / Multifinance / Insurance</div>
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
              onUploadAttachment={uploadAttachment} onDeleteAttachment={deleteAttachment} />
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
