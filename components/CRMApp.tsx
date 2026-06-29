"use client";
import { useState } from "react";
import { useData } from "@/hooks/useData";
import { ActiveView } from "@/types";
import Dashboard from "./Dashboard";
import CalendarView from "./CalendarView";
import Clients from "./Clients";
import Pipeline from "./Pipeline";
import Projects from "./Projects";

const TABS: { id: ActiveView; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "calendar", label: "Calendar Visit" },
  { id: "clients", label: "Client" },
  { id: "pipeline", label: "Pipeline" },
  { id: "projects", label: "Project" },
];

export default function CRMApp() {
  const [view, setView] = useState<ActiveView>("dashboard");
  const {
    data, loading, syncStatus,
    upsertClient, deleteClient,
    upsertVisit, deleteVisit,
    upsertDeal, deleteDeal, updateDealStage,
    upsertProject, deleteProject,
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
              onSaveVisit={upsertVisit} onDeleteVisit={deleteVisit} />
          )}
          {view === "pipeline" && (
            <Pipeline data={data}
              onSaveDeal={upsertDeal} onDeleteDeal={deleteDeal} onUpdateStage={updateDealStage} />
          )}
          {view === "projects" && (
            <Projects data={data} onSaveProject={upsertProject} onDeleteProject={deleteProject} />
          )}
        </>
      )}
    </div>
  );
}
