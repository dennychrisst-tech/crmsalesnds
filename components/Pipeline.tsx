"use client";
import { useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { AppData } from "@/hooks/useData";
import { Deal, CRMDocument, Attachment, Activity, Project } from "@/types";
import { STAGES, STAGE_COLOR, fmtIDR, todayStr } from "@/lib/utils";
import { exportDeals } from "@/lib/export";
import { toast } from "./ui/Toast";

const PROJECT_DRAG_PREFIX = "project:";

function projectKey(name: string, clientId: string): string {
  return `${name.trim().toLowerCase()}::${clientId}`;
}

function agingDays(deal: Deal): number {
  const ref = deal.stage_updated_at || deal.created_at || todayStr();
  return Math.floor((Date.now() - new Date(ref).getTime()) / 86_400_000);
}

function AgingBadge({ days }: { days: number }) {
  let cls = "aging-fresh";
  if (days >= 30) cls = "aging-critical";
  else if (days >= 14) cls = "aging-warn";
  else if (days >= 7)  cls = "aging-caution";
  return <span className={`aging-badge ${cls}`}>{days}h</span>;
}
import DealModal from "./DealModal";

interface Props {
  data: AppData;
  currentUserName: string;
  isViewer?: boolean;
  onSaveDeal: (d: Deal) => Promise<void>;
  onDeleteDeal: (id: string) => Promise<void>;
  onUpdateStage: (id: string, stage: string) => Promise<void>;
  onAddDocument: (d: CRMDocument) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onUploadAttachment: (file: File, dealId: string) => Promise<void>;
  onDeleteAttachment: (id: string) => Promise<void>;
  onAddActivity: (a: Activity) => Promise<void>;
  onDeleteActivity: (id: string) => Promise<void>;
  openDealId?: string | null;
  onOpenDealHandled?: () => void;
}

function DealCard({ deal, clientName, onClick, onMoveStage, isViewer }: { deal: Deal; clientName: string; onClick: () => void; onMoveStage: (stage: string) => void; isViewer?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id });
  const style = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, opacity: isDragging ? 0.4 : 1 } : {};
  const days = agingDays(deal);
  const isClosed = deal.stage === "Won" || deal.stage === "Lost";
  const stageColor = STAGE_COLOR[deal.stage] || "var(--brand)";
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!pickerOpen) return;
    const close = () => setPickerOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [pickerOpen]);

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ ...style, borderLeft: `3px solid ${stageColor}` }} className="deal" onClick={onClick}>
      <div className="deal-top">
        <div className="dn">{deal.name}</div>
        {!isClosed && <AgingBadge days={days} />}
      </div>
      <div className="dc">{clientName}{deal.product ? ` · ${deal.product}` : ""}</div>
      {deal.owner && <div className="dc">👤 {deal.owner}</div>}
      <div className="dv">{fmtIDR(deal.value)}</div>
      {!isViewer && (
        <div className="stage-move-wrap">
          <button type="button" className="btn btn-ghost btn-sm stage-move-btn"
            onClick={e => { e.stopPropagation(); setPickerOpen(o => !o); }}>
            Pindah stage →
          </button>
          {pickerOpen && (
            <div className="stage-move-menu" onClick={e => e.stopPropagation()}>
              {STAGES.filter(s => s !== deal.stage).map(s => (
                <button key={s} type="button" className="stage-move-item"
                  onClick={() => { onMoveStage(s); setPickerOpen(false); }}>{s}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProjectChip({ project, clientName }: { project: Project; clientName: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `${PROJECT_DRAG_PREFIX}${project.id}` });
  const style = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, opacity: isDragging ? 0.4 : 1 } : {};
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style} className="project-chip">
      <div className="dn">{project.name}</div>
      <div className="dc">{clientName}{project.product ? ` · ${project.product}` : ""}</div>
    </div>
  );
}

function ProjectPanel({ projects, clientName, search, onSearchChange }: { projects: Project[]; clientName: (id: string) => string; search: string; onSearchChange: (v: string) => void }) {
  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <div className="project-panel">
      <input
        className="project-panel-search"
        placeholder="Cari proyek…"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
      />
      <div className="project-panel-list">
        {filtered.length === 0 && <div className="empty-state" style={{ padding: "8px 0" }}>Tidak ada proyek tersedia.</div>}
        {filtered.map(p => <ProjectChip key={p.id} project={p} clientName={clientName(p.client_id)} />)}
      </div>
    </div>
  );
}

function Column({ stage, deals, clientName, onDealClick, onMoveStage, isViewer }: { stage: string; deals: Deal[]; clientName: (id: string) => string; onDealClick: (d: Deal) => void; onMoveStage: (dealId: string, stage: string) => void; isViewer?: boolean }) {
  const { isOver, setNodeRef } = useDroppable({ id: stage });
  const val = deals.reduce((s, d) => s + d.value, 0);
  const stageColor = STAGE_COLOR[stage] || "var(--brand)";
  return (
    <div ref={setNodeRef} className={`col${isOver ? " over" : ""}`} data-stage={stage} style={{ borderTop: `3px solid ${stageColor}` }}>
      <div className="col-head">
        <h3 style={{ color: stageColor }}>{stage}</h3>
        <div className="colval">{deals.length} · {fmtIDR(val)}</div>
      </div>
      <div className="col-list">
        {deals.map(d => (
          <DealCard key={d.id} deal={d} clientName={clientName(d.client_id)} onClick={() => onDealClick(d)}
            onMoveStage={s => onMoveStage(d.id, s)} isViewer={isViewer} />
        ))}
      </div>
    </div>
  );
}

export default function Pipeline({ data, currentUserName, isViewer, onSaveDeal, onDeleteDeal, onUpdateStage, onAddDocument, onDeleteDocument, onUploadAttachment, onDeleteAttachment, onAddActivity, onDeleteActivity, openDealId, onOpenDealHandled }: Props) {
  const { clients, deals, products, documents, attachments, activities, profiles, projects } = data;
  const team = profiles.filter(p => !["super_admin","admin","viewer"].includes(p.role)).map(p => p.name).filter(Boolean);
  const [modalOpen, setModalOpen] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);

  useEffect(() => {
    if (!openDealId) return;
    const deal = deals.find(d => d.id === openDealId);
    if (deal) { setEditDeal(deal); setModalOpen(true); }
    onOpenDealHandled?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDealId]);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [pendingProjectIds, setPendingProjectIds] = useState<Set<string>>(new Set());
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardHeight, setBoardHeight] = useState<number | null>(null);

  useEffect(() => {
    function measure() {
      if (!boardRef.current) return;
      const top = boardRef.current.getBoundingClientRect().top;
      // .app has 80px bottom padding — subtract it too so the board doesn't overshoot and leave a page-level scrollbar
      setBoardHeight(Math.max(window.innerHeight - top - 80 - 16, 240));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [showPanel]);

  // Mobile swaps the multi-column board (one huge card-column per screen, easy
  // to overshoot while swiping) for a stage-tab bar + a single vertical list.
  const [isMobile, setIsMobile] = useState(false);
  const [mobileStage, setMobileStage] = useState<string>(STAGES[0]);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";

  // Single path for every stage change (drag, picker menu, mobile list) so the
  // undo toast is offered consistently.
  async function moveStage(deal: Deal, stage: string) {
    if (isViewer || deal.stage === stage) return;
    const prevStage = deal.stage;
    await onUpdateStage(deal.id, stage);
    toast(`${deal.name} → ${stage}`, {
      action: { label: "Undo", onClick: () => onUpdateStage(deal.id, prevStage) },
    });
  }

  const usedProjectKeys = new Set(deals.map(d => projectKey(d.name, d.client_id)));
  const availableProjects = projects.filter(p => !usedProjectKeys.has(projectKey(p.name, p.client_id)) && !pendingProjectIds.has(p.id));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith(PROJECT_DRAG_PREFIX)) {
      setActiveProject(projects.find(p => p.id === id.slice(PROJECT_DRAG_PREFIX.length)) || null);
      setActiveDeal(null);
    } else {
      setActiveDeal(deals.find(d => d.id === id) || null);
      setActiveProject(null);
    }
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveDeal(null);
    setActiveProject(null);
    const { over, active } = e;
    if (!over) return;
    const id = String(active.id);
    const stage = String(over.id);

    try {
      if (id.startsWith(PROJECT_DRAG_PREFIX)) {
        if (!(STAGES as readonly string[]).includes(stage)) return;
        const projectId = id.slice(PROJECT_DRAG_PREFIX.length);
        if (pendingProjectIds.has(projectId)) return;
        const project = projects.find(p => p.id === projectId);
        if (!project) return;
        const key = projectKey(project.name, project.client_id);
        if (usedProjectKeys.has(key)) {
          toast("Project ini sudah ada di pipeline.", { type: "error" });
          return;
        }
        setPendingProjectIds(prev => new Set(prev).add(projectId));
        try {
          await onSaveDeal({
            id: uuid(), name: project.name, client_id: project.client_id, value: project.value,
            stage: stage as Deal["stage"], deal_type: "", product: project.product, close_date: "",
            notes: "", owner: currentUserName, win_loss_reason: "", competitor: "",
            stage_updated_at: new Date().toISOString(),
          });
        } finally {
          setPendingProjectIds(prev => { const next = new Set(prev); next.delete(projectId); return next; });
        }
        return;
      }

      const deal = deals.find(d => d.id === id);
      if (deal) await moveStage(deal, stage);
    } catch {
      // useData's mutation helpers already surface the failure via error toast.
    }
  }

  const dealDocuments = editDeal ? documents.filter(d => d.deal_id === editDeal.id) : [];
  const dealAttachments = editDeal ? attachments.filter(a => a.deal_id === editDeal.id) : [];
  const dealActivities = editDeal ? activities.filter(a => a.deal_id === editDeal.id) : [];

  return (
    <section>
      <div className="toolbar">
        <span className="muted desktop-only">Tarik proyek atau kartu antar kolom untuk ubah stage.</span>
        <button className="btn btn-ghost btn-sm" onClick={() => exportDeals(deals, clientName)}>↓ Export CSV</button>
        {!isViewer && (
          <button className="btn add-btn-desktop" onClick={() => setShowPanel(s => !s)}>
            {showPanel ? "Tutup Panel Proyek" : "+ Tambah dari Proyek"}
          </button>
        )}
      </div>

      {!isViewer && <button className="fab" onClick={() => setShowPanel(s => !s)} aria-label="Tambah dari Proyek">+</button>}

      {isMobile && (
        <div className="pipeline-stage-tabs">
          {STAGES.map(stage => {
            const count = deals.filter(d => d.stage === stage).length;
            const stageColor = STAGE_COLOR[stage] || "var(--brand)";
            return (
              <button key={stage} type="button"
                className={`pipeline-stage-tab${mobileStage === stage ? " active" : ""}`}
                style={mobileStage === stage ? { background: stageColor, borderColor: stageColor } : { borderColor: stageColor, color: stageColor }}
                onClick={() => setMobileStage(stage)}>
                {stage} <span className="pipeline-stage-tab-count">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {showPanel && !isViewer && (
          <ProjectPanel projects={availableProjects} clientName={clientName} search={projectSearch} onSearchChange={setProjectSearch} />
        )}
        {isMobile ? (
          <div className="pipeline-mobile-list">
            {deals.filter(d => d.stage === mobileStage).length === 0 ? (
              <div className="empty-state">Belum ada deal di stage ini.</div>
            ) : deals.filter(d => d.stage === mobileStage).map(d => (
              <DealCard key={d.id} deal={d} clientName={clientName(d.client_id)}
                onClick={() => { if (!isViewer) { setEditDeal(d); setModalOpen(true); } }}
                onMoveStage={s => moveStage(d, s)} isViewer={isViewer} />
            ))}
          </div>
        ) : (
          <div ref={boardRef} className="board" style={boardHeight ? { height: boardHeight } : undefined}>
            {STAGES.map(stage => (
              <Column key={stage} stage={stage} deals={deals.filter(d => d.stage === stage)}
                clientName={clientName} onDealClick={d => { if (!isViewer) { setEditDeal(d); setModalOpen(true); } }}
                onMoveStage={(dealId, s) => { const d = deals.find(x => x.id === dealId); if (d) moveStage(d, s); }} isViewer={isViewer} />
            ))}
          </div>
        )}
        <DragOverlay>
          {activeDeal && (
            <div className="deal" style={{ opacity: 0.9, cursor: "grabbing" }}>
              <div className="dn">{activeDeal.name}</div>
              <div className="dc">{clientName(activeDeal.client_id)}</div>
              <div className="dv">{fmtIDR(activeDeal.value)}</div>
            </div>
          )}
          {activeProject && (
            <div className="project-chip" style={{ opacity: 0.9, cursor: "grabbing" }}>
              <div className="dn">{activeProject.name}</div>
              <div className="dc">{clientName(activeProject.client_id)}</div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <DealModal
        open={modalOpen} deal={editDeal} clients={clients} products={products} team={team} defaultOwner={currentUserName}
        documents={dealDocuments} attachments={dealAttachments} activities={dealActivities}
        onSave={onSaveDeal} onDelete={onDeleteDeal}
        onAddDocument={onAddDocument} onDeleteDocument={onDeleteDocument}
        onUploadAttachment={onUploadAttachment} onDeleteAttachment={onDeleteAttachment}
        onAddActivity={onAddActivity} onDeleteActivity={onDeleteActivity}
        onClose={() => setModalOpen(false)}
      />
    </section>
  );
}
