"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCRMData } from "@/contexts/CRMDataContext";
import { ActiveView, DateRange } from "@/types";
import { VIEW_HREF, clientHref, dealHref, visitHref, stageHref, calendarWeekHref, pipelineWeekHref } from "@/lib/nav";
import Dashboard from "./Dashboard";
import CalendarView from "./CalendarView";
import Clients from "./Clients";
import Pipeline from "./Pipeline";
import Projects from "./Projects";
import Talent from "./Talent";
import TasksView from "./TasksView";
import SummaryView from "./SummaryView";
import VisitReport from "./VisitReport";
import WeeklyReport from "./WeeklyReport";
import RevenueForecastView from "./RevenueForecastView";
import TalentFillRateView from "./TalentFillRateView";
import MandaysRateView from "./MandaysRateView";

// Views not yet split into their own app/(crm)/<x>/page.tsx — shrinks phase
// by phase as each one graduates (see the route-migration plan). Catalog and
// Opty already graduated in Phase 1, so they're deliberately absent here.
export type LegacyView =
  | "dashboard" | "calendar" | "clients" | "pipeline" | "projects" | "talent" | "tasks"
  | "summary" | "visit-report" | "weekly-report" | "revenue-forecast" | "talent-fill-rate" | "mandays-rate";

export default function LegacyViewSwitch({ view }: { view: LegacyView }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    data, currentProfile, isViewer, ro,
    upsertClient, deleteClient,
    upsertContact, deleteContact,
    upsertVisit, deleteVisit,
    upsertDeal, deleteDeal, updateDealStage,
    upsertProject, deleteProject,
    upsertTalentRole, deleteTalentRole,
    upsertRevenueTarget, upsertRevenueLine, deleteRevenueLine,
    upsertTask, deleteTask,
    upsertDocument, deleteDocument,
    uploadAttachment, deleteAttachment,
    uploadClientLogo, deleteClientLogo,
    upsertActivity, deleteActivity,
    upsertEvent, deleteEvent,
    upsertMandaysRole, deleteMandaysRole,
    upsertMandaysClientRate, deleteMandaysClientRate,
  } = useCRMData();

  const currentUserName = currentProfile?.name ?? "";

  // Strips one or more query params from the current URL, keeping the rest —
  // replaces the old setPendingXHandled(null) React-state clear.
  function clearParams(...keys: string[]) {
    const next = new URLSearchParams(searchParams.toString());
    keys.forEach(k => next.delete(k));
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function navigate(v: ActiveView) { router.push(VIEW_HREF[v]); }
  function openClient(id: string) { router.push(clientHref(id)); }
  function openDeal(id: string) { router.push(dealHref(id)); }
  function openVisit(id: string) { router.push(visitHref(id)); }
  function openStage(stage: string) { router.push(stageHref(stage)); }
  function openCalendarWeek(range: DateRange) { router.push(calendarWeekHref(range)); }
  function openPipelineWeek(range: DateRange, stage?: string) { router.push(pipelineWeekHref(range, stage)); }

  const weekStart = searchParams.get("weekStart");
  const weekEnd = searchParams.get("weekEnd");
  const weekFocus: DateRange | null = weekStart && weekEnd ? { start: weekStart, end: weekEnd } : null;

  switch (view) {
    case "dashboard":
      return (
        <Dashboard data={data} onNavigate={navigate} onOpenStage={openStage}
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
      );
    case "calendar":
      return (
        <CalendarView data={data} currentUserName={currentUserName} isViewer={isViewer}
          onSaveVisit={ro(upsertVisit)} onDeleteVisit={ro(deleteVisit)}
          onSaveEvent={ro(upsertEvent)} onDeleteEvent={ro(deleteEvent)}
          onCreateTask={ro(upsertTask)} onCreateDeal={ro(upsertDeal)} onSaveContact={ro(upsertContact)}
          openVisitId={searchParams.get("openVisitId")} onOpenVisitHandled={() => clearParams("openVisitId")}
          weekFocus={weekFocus} onWeekFocusHandled={() => clearParams("weekStart", "weekEnd")} />
      );
    case "clients":
      return (
        <Clients data={data} currentUserName={currentUserName} isViewer={isViewer} onNavigate={navigate}
          onSaveClient={ro(upsertClient)} onDeleteClient={ro(deleteClient)}
          onUploadLogo={uploadClientLogo} onDeleteLogo={deleteClientLogo}
          onSaveContact={ro(upsertContact)} onDeleteContact={ro(deleteContact)}
          onSaveVisit={ro(upsertVisit)} onDeleteVisit={ro(deleteVisit)} onCreateDeal={ro(upsertDeal)}
          openClientId={searchParams.get("openClientId")} onOpenClientHandled={() => clearParams("openClientId")} />
      );
    case "pipeline":
      return (
        <Pipeline data={data} currentUserName={currentUserName} isViewer={isViewer}
          onSaveDeal={ro(upsertDeal)} onDeleteDeal={ro(deleteDeal)} onUpdateStage={ro(updateDealStage)}
          onAddDocument={ro(upsertDocument)} onDeleteDocument={ro(deleteDocument)}
          onUploadAttachment={ro(uploadAttachment)} onDeleteAttachment={ro(deleteAttachment)}
          onAddActivity={ro(upsertActivity)} onDeleteActivity={ro(deleteActivity)}
          openDealId={searchParams.get("openDealId")} onOpenDealHandled={() => clearParams("openDealId")}
          openStage={searchParams.get("openStage")} onOpenStageHandled={() => clearParams("openStage")}
          weekFocus={weekFocus} onWeekFocusHandled={() => clearParams("weekStart", "weekEnd")} />
      );
    case "projects":
      return (
        <Projects data={data} isViewer={isViewer} onSaveProject={ro(upsertProject)} onDeleteProject={ro(deleteProject)}
          onAddActivity={ro(upsertActivity)} onDeleteActivity={ro(deleteActivity)}
          onOpenClient={openClient} />
      );
    case "talent":
      return (
        <Talent data={data} currentUserName={currentUserName} isViewer={isViewer}
          onSaveProject={ro(upsertProject)} onDeleteProject={ro(deleteProject)}
          onSaveTalentRole={ro(upsertTalentRole)} onDeleteTalentRole={ro(deleteTalentRole)}
          onSaveDeal={ro(upsertDeal)} onDeleteDeal={ro(deleteDeal)}
          onAddDocument={ro(upsertDocument)} onDeleteDocument={ro(deleteDocument)}
          onUploadAttachment={ro(uploadAttachment)} onDeleteAttachment={ro(deleteAttachment)}
          onAddActivity={ro(upsertActivity)} onDeleteActivity={ro(deleteActivity)}
          onOpenClient={openClient} />
      );
    case "tasks":
      return (
        <TasksView data={data} currentUserName={currentUserName} isViewer={isViewer} onSaveTask={ro(upsertTask)} onDeleteTask={ro(deleteTask)} onCreateDeal={ro(upsertDeal)}
          openTaskId={searchParams.get("openTaskId")} onOpenTaskHandled={() => clearParams("openTaskId")} />
      );
    case "summary":
      return (
        <SummaryView data={data} onOpenVisit={openVisit}
          onOpenCalendarWeek={openCalendarWeek} onOpenPipelineWeek={openPipelineWeek} />
      );
    case "visit-report":
      return <VisitReport data={data} />;
    case "weekly-report":
      return (
        <WeeklyReport data={data} onOpenDeal={openDeal}
          onOpenCalendarWeek={openCalendarWeek} onOpenPipelineWeek={openPipelineWeek} />
      );
    case "revenue-forecast":
      return (
        <RevenueForecastView data={data} isViewer={isViewer}
          onSaveTarget={ro(upsertRevenueTarget)}
          onSaveLine={ro(upsertRevenueLine)} onDeleteLine={ro(deleteRevenueLine)}
          onSaveDeal={ro(upsertDeal)} onDeleteDeal={ro(deleteDeal)} />
      );
    case "talent-fill-rate":
      return <TalentFillRateView data={data} onOpenClient={openClient} />;
    case "mandays-rate":
      return (
        <MandaysRateView data={data} isViewer={isViewer}
          onSaveRole={ro(upsertMandaysRole)} onDeleteRole={ro(deleteMandaysRole)}
          onSaveClientRate={ro(upsertMandaysClientRate)} onDeleteClientRate={ro(deleteMandaysClientRate)} />
      );
  }
}
