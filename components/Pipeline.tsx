"use client";
import { useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { AppData } from "@/hooks/useData";
import { useUndoableDelete } from "@/hooks/useUndoableDelete";
import { Deal, CRMDocument, Attachment, Activity, Project } from "@/types";
import { STAGES, STAGE_COLOR, fmtIDR, isClosedStage, colorForSales, dealAgingDays, isDealAtRisk } from "@/lib/utils";
import { exportDeals } from "@/lib/export";
import { toast } from "./ui/Toast";
import Modal, { Field, ModalActions, inputCls, textareaCls } from "./ui/Modal";
import FilterSheet, { FilterField } from "./ui/FilterSheet";
import { Download, User } from "lucide-react";

const PROJECT_DRAG_PREFIX = "project:";

function projectKey(name: string, clientId: string): string {
  return `${name.trim().toLowerCase()}::${clientId}`;
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
  openStage?: string | null;
  onOpenStageHandled?: () => void;
}

// draggable=false on mobile's plain vertical list — dnd-kit's pointer listeners
// otherwise capture every touch-scroll gesture over a card as a drag attempt,
// fighting the page's own scroll. The desktop kanban board still drags normally;
// mobile already has the "Pindah stage" button as its touch alternative to drag.
function DealCard({ deal, clientName, onClick, onMoveStage, isViewer, draggable = true, selectMode = false, selected = false, onToggleSelect }: {
  deal: Deal; clientName: string; onClick: () => void; onMoveStage: (stage: string) => void; isViewer?: boolean; draggable?: boolean;
  selectMode?: boolean; selected?: boolean; onToggleSelect?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id, disabled: !draggable || selectMode });
  const style = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, opacity: isDragging ? 0.4 : 1 } : {};
  const days = dealAgingDays(deal);
  const isClosed = isClosedStage(deal.stage);
  const stageColor = STAGE_COLOR[deal.stage] || "var(--brand)";
  const ownerColor = deal.owner ? colorForSales(deal.owner).bg : null;
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div ref={draggable && !selectMode ? setNodeRef : undefined} {...(draggable && !selectMode ? { ...listeners, ...attributes } : {})}
      style={{ ...style, borderLeft: `3px solid ${stageColor}`, borderRight: ownerColor ? `3px solid ${ownerColor}` : undefined }}
      className={`deal${selected ? " deal-selected" : ""}`} onClick={() => selectMode ? onToggleSelect?.() : onClick()}>
      {selectMode && (
        <input type="checkbox" className="deal-select-checkbox" checked={selected}
          onChange={() => onToggleSelect?.()} onClick={e => e.stopPropagation()} />
      )}
      <div className="deal-top">
        <div className="dn">{deal.name}</div>
        {!isClosed && <AgingBadge days={days} />}
      </div>
      <div className="dc">{clientName}{deal.product ? ` · ${deal.product}` : ""}</div>
      {deal.owner && (
        <div className="dc" style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", flex: "none", background: colorForSales(deal.owner).bg }} />
          <User size={11} /> {deal.owner}
        </div>
      )}
      <div className="dv">{fmtIDR(deal.value)}</div>
      {!isViewer && !selectMode && (
        <div className="stage-move-wrap">
          <button type="button" className="btn btn-ghost btn-sm stage-move-btn"
            onClick={e => { e.stopPropagation(); setPickerOpen(o => !o); }}>
            Pindah stage →
          </button>
          {pickerOpen && (
            <div className="stage-move-sheet-backdrop" onClick={e => { e.stopPropagation(); setPickerOpen(false); }}>
              <div className="stage-move-sheet" onClick={e => e.stopPropagation()}>
                <div className="stage-move-sheet-handle" />
                <div className="stage-move-sheet-title">Pindah stage: {deal.name}</div>
                {[...STAGES, "On Hold", "Dropped"].filter(s => s !== deal.stage).map(s => (
                  <button key={s} type="button" className="stage-move-sheet-item"
                    onClick={() => { onMoveStage(s); setPickerOpen(false); }}>{s}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProjectChip({ project, clientName, onAddToStage }: { project: Project; clientName: string; onAddToStage: (project: Project, stage: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `${PROJECT_DRAG_PREFIX}${project.id}` });
  const style = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, opacity: isDragging ? 0.4 : 1 } : {};
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style} className="project-chip">
      <div className="dn">{project.name}</div>
      <div className="dc">{clientName}{project.product ? ` · ${project.product}` : ""}</div>
      {/* Drag works on desktop; mobile has no droppable column here (single-list
          layout), so this tap alternative is the only way to add a project there
          — same pattern as DealCard's "Pindah stage" button (CSS-hidden on desktop). */}
      <div className="stage-move-wrap">
        <button type="button" className="btn btn-ghost btn-sm stage-move-btn"
          onClick={e => { e.stopPropagation(); setPickerOpen(o => !o); }}>
          + Tambah ke stage →
        </button>
        {pickerOpen && (
          <div className="stage-move-sheet-backdrop" onClick={e => { e.stopPropagation(); setPickerOpen(false); }}>
            <div className="stage-move-sheet" onClick={e => e.stopPropagation()}>
              <div className="stage-move-sheet-handle" />
              <div className="stage-move-sheet-title">Tambah ke stage: {project.name}</div>
              {STAGES.map(s => (
                <button key={s} type="button" className="stage-move-sheet-item"
                  onClick={() => { onAddToStage(project, s); setPickerOpen(false); }}>{s}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectPanel({ projects, clientName, search, onSearchChange, onAddToStage }: { projects: Project[]; clientName: (id: string) => string; search: string; onSearchChange: (v: string) => void; onAddToStage: (project: Project, stage: string) => void }) {
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
        {filtered.map(p => <ProjectChip key={p.id} project={p} clientName={clientName(p.client_id)} onAddToStage={onAddToStage} />)}
      </div>
    </div>
  );
}

// Compact Rupiah for the narrow funnel labels (fmtIDR's full "Rp 1.250.000.000"
// doesn't fit 9 columns) — full value is still in the segment's tooltip.
function fmtCompact(n: number): string {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
  return fmtIDR(n);
}

// Horizontal sales funnel — desktop only (see Pipeline's render). The shape of
// each segment is driven by "cumulative reach" (deals currently at this stage
// or any stage past it), which tapers correctly even though we only ever know
// a deal's *current* stage, not its history. The number under each segment is
// the stage's own current count/value, matching the kanban column below it.
function PipelineFunnel({ deals, onStageClick }: { deals: Deal[]; onStageClick: (stage: string) => void }) {
  const [hoverStage, setHoverStage] = useState<string | null>(null);
  const funnelStages = STAGES;
  const activeDeals = deals.filter(d => d.stage !== "Dropped" && d.stage !== "On Hold");
  const onHold = deals.filter(d => d.stage === "On Hold");
  const dropped = deals.filter(d => d.stage === "Dropped");

  if (activeDeals.length + onHold.length + dropped.length === 0) return null;

  const idx = (stage: string) => funnelStages.indexOf(stage as (typeof funnelStages)[number]);
  const n = funnelStages.length;
  const cumCount = funnelStages.map((_, i) => activeDeals.filter(d => idx(d.stage) >= i).length);
  const ownCount = funnelStages.map(stage => activeDeals.filter(d => d.stage === stage).length);
  const ownValue = funnelStages.map(stage => activeDeals.filter(d => d.stage === stage).reduce((s, d) => s + d.value, 0));
  const maxCount = Math.max(cumCount[0], 1);
  const dealedIdx = idx("Dealed");
  const winRate = cumCount[0] > 0 ? Math.round((cumCount[dealedIdx] / cumCount[0]) * 100) : 0;

  const W = 900, H = 120, colW = W / n, midY = H / 2, maxHalf = 48;

  return (
    <div className="pl-funnel">
      <div className="pl-funnel-head">
        <div className="pl-funnel-headline"><b>{activeDeals.length}</b> deal aktif di funnel</div>
        <div className="pl-funnel-winrate">Win rate: <b style={{ color: "var(--brand)" }}>{winRate}%</b> ({cumCount[dealedIdx]} Dealed dari {cumCount[0]})</div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="pl-funnel-svg" preserveAspectRatio="none">
        {funnelStages.map((stage, i) => {
          const x0 = i * colW, x1 = (i + 1) * colW;
          const leftH = (cumCount[i] / maxCount) * maxHalf;
          const rightCount = i < n - 1 ? cumCount[i + 1] : cumCount[i];
          const rightH = (rightCount / maxCount) * maxHalf;
          const color = STAGE_COLOR[stage] || "var(--brand)";
          const dimmed = !!hoverStage && hoverStage !== stage;
          const points = `${x0},${midY - leftH} ${x1},${midY - rightH} ${x1},${midY + rightH} ${x0},${midY + leftH}`;
          return (
            <polygon key={stage} points={points} fill={color}
              opacity={dimmed ? 0.35 : 1}
              stroke="var(--card)" strokeWidth={2}
              style={{ cursor: "pointer", transition: "opacity .15s" }}
              onMouseEnter={() => setHoverStage(stage)}
              onMouseLeave={() => setHoverStage(null)}
              onClick={() => onStageClick(stage)}
            >
              <title>{`${stage}: ${ownCount[i]} deal saat ini (${fmtIDR(ownValue[i])}) · ${cumCount[i]} deal telah capai tahap ini`}</title>
            </polygon>
          );
        })}
      </svg>

      <div className="pl-funnel-labels">
        {funnelStages.map((stage, i) => (
          <div key={stage} className={`pl-funnel-label${hoverStage === stage ? " pl-funnel-label-active" : ""}`}
            onMouseEnter={() => setHoverStage(stage)} onMouseLeave={() => setHoverStage(null)}
            onClick={() => onStageClick(stage)}>
            <div className="pl-funnel-label-stage stage-text" style={{ color: STAGE_COLOR[stage] }}>{stage}</div>
            <div className="pl-funnel-label-count">{ownCount[i]}</div>
            <div className="pl-funnel-label-value">{ownValue[i] > 0 ? fmtCompact(ownValue[i]) : "—"}</div>
          </div>
        ))}
      </div>

      {(onHold.length > 0 || dropped.length > 0) && (
        <div className="pl-funnel-side">
          {onHold.length > 0 && (
            <span className="pl-funnel-chip pl-funnel-chip-hold" onClick={() => onStageClick("On Hold")}>
              ⏸ {onHold.length} On Hold · {fmtCompact(onHold.reduce((s, d) => s + d.value, 0))}
            </span>
          )}
          {dropped.length > 0 && (
            <span className="pl-funnel-chip pl-funnel-chip-lost" onClick={() => onStageClick("Dropped")}>
              ✕ {dropped.length} Dropped · {fmtCompact(dropped.reduce((s, d) => s + d.value, 0))}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Column({ stage, deals, clientName, onDealClick, onMoveStage, isViewer, selectMode, selectedIds, onToggleSelect }: {
  stage: string; deals: Deal[]; clientName: (id: string) => string; onDealClick: (d: Deal) => void; onMoveStage: (dealId: string, stage: string) => void; isViewer?: boolean;
  selectMode?: boolean; selectedIds?: Set<string>; onToggleSelect?: (id: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage, disabled: selectMode });
  const val = deals.reduce((s, d) => s + d.value, 0);
  const stageColor = STAGE_COLOR[stage] || "var(--brand)";
  return (
    <div ref={setNodeRef} className={`col${isOver ? " over" : ""}${deals.length === 0 ? " col-empty" : ""}`} data-stage={stage} style={{ borderTop: `3px solid ${stageColor}` }}>
      <div className="col-head">
        <h3 className="stage-text" style={{ color: stageColor }}>{stage}</h3>
        <div className="colval">{deals.length} · {fmtIDR(val)}</div>
      </div>
      <div className="col-list">
        {deals.map(d => (
          <DealCard key={d.id} deal={d} clientName={clientName(d.client_id)} onClick={() => onDealClick(d)}
            onMoveStage={s => onMoveStage(d.id, s)} isViewer={isViewer}
            selectMode={selectMode} selected={selectedIds?.has(d.id)} onToggleSelect={() => onToggleSelect?.(d.id)} />
        ))}
      </div>
    </div>
  );
}

export default function Pipeline({ data, currentUserName, isViewer, onSaveDeal, onDeleteDeal, onUpdateStage, onAddDocument, onDeleteDocument, onUploadAttachment, onDeleteAttachment, onAddActivity, onDeleteActivity, openDealId, onOpenDealHandled, openStage, onOpenStageHandled }: Props) {
  const { clients, products, documents, attachments, activities, profiles, projects } = data;
  // Soft-delete: a deal "Hapus" (from DealModal) hides it immediately, real
  // delete happens after the Undo window passes — see useUndoableDelete.
  // Bulk delete below is unaffected — it already has its own confirm() step.
  const { isPending, requestDelete } = useUndoableDelete(onDeleteDeal);
  const deals = data.deals.filter(d => !isPending(d.id));
  async function handleDeleteDeal(id: string) {
    const d = data.deals.find(x => x.id === id);
    requestDelete(id, d ? `Deal "${d.name}"` : "Deal");
  }
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
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [atRiskOnly, setAtRiskOnly] = useState(false);
  // Deal being dropped into Won/Lost — prompts for win/loss reason before saving
  const [closing, setClosing] = useState<{ deal: Deal; stage: string } | null>(null);
  const [closeReason, setCloseReason] = useState("");
  const [closeCompetitor, setCloseCompetitor] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [pendingProjectIds, setPendingProjectIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
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
  // Funnel height above the board shifts with these filters (side chips
  // appear/disappear), which moves boardRef's top and must re-trigger a measure.
  }, [showPanel, ownerFilter, showArchived]);

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

  // Closed deals older than 30 days move to the archive (hidden by default) so
  // the Dealed/PO/Kontrak/Dropped columns don't accumulate dead cards forever.
  const archiveCutoff = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString(); })();
  const isArchived = (d: Deal) =>
    isClosedStage(d.stage) && (d.stage_updated_at || d.created_at || "") < archiveCutoff;

  const ownedDeals = ownerFilter === "all" ? deals : deals.filter(d => d.owner === ownerFilter);
  const archivedCount = ownedDeals.filter(isArchived).length;
  // Deals stuck 30+ days in the same active stage — same threshold AgingBadge
  // already flags as "critical", just surfaced here as a filterable count too.
  const atRiskCount = ownedDeals.filter(isDealAtRisk).length;
  let visibleDeals = showArchived ? ownedDeals : ownedDeals.filter(d => !isArchived(d));
  if (atRiskOnly) visibleDeals = visibleDeals.filter(isDealAtRisk);

  // On Hold always gets a column (deals parked there aren't "closed", so they're
  // never archived); Dropped only appears once the archive toggle reveals it.
  const boardStages = showArchived ? [...STAGES, "On Hold", "Dropped"] : [...STAGES, "On Hold"];

  // Funnel segments are clickable — scroll the board to that stage's column.
  function scrollToStage(stage: string) {
    const col = boardRef.current?.querySelector(`[data-stage="${CSS.escape(stage)}"]`);
    col?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }

  // Deep-link from Dashboard's "Pipeline per Stage" rows — jump straight to
  // that stage instead of just landing on the board's default scroll position.
  useEffect(() => {
    if (!openStage) return;
    setMobileStage(openStage);
    scrollToStage(openStage);
    onOpenStageHandled?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openStage]);

  // Single path for every stage change (drag, picker menu, mobile list) so the
  // undo toast is offered consistently. Only Dealed/Dropped are a fresh win/loss
  // determination (prompted for a reason) — PO/Kontrak are just later paperwork
  // steps on a deal that's already Dealed, so they skip the prompt.
  async function moveStage(deal: Deal, stage: string) {
    if (isViewer || deal.stage === stage) return;
    if (stage === "Dealed" || stage === "Dropped") {
      setCloseReason(deal.win_loss_reason || "");
      setCloseCompetitor(deal.competitor || "");
      setClosing({ deal, stage });
      return;
    }
    const prevStage = deal.stage;
    await onUpdateStage(deal.id, stage);
    toast(`${deal.name} → ${stage}`, {
      action: { label: "Undo", onClick: () => onUpdateStage(deal.id, prevStage) },
    });
  }

  function toggleSelectMode() {
    setSelectMode(s => !s);
    setSelectedIds(new Set());
  }
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Bulk moves skip the Dealed/Dropped reason prompt (that flow is per-deal,
  // one modal at a time) — users can still add a reason later by editing an
  // individual deal. Kept simple since bulk actions are mainly for
  // quarter-end cleanup (moving several stale deals at once).
  async function bulkMoveStage(stage: string) {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      for (const id of ids) await onUpdateStage(id, stage);
      toast(`${ids.length} deal dipindah ke ${stage}`);
    } finally {
      setBulkBusy(false);
      setSelectedIds(new Set());
      setSelectMode(false);
    }
  }

  async function bulkDelete() {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (!confirm(`Hapus ${ids.length} deal terpilih? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBulkBusy(true);
    try {
      for (const id of ids) await onDeleteDeal(id);
      toast(`${ids.length} deal dihapus`);
    } finally {
      setBulkBusy(false);
      setSelectedIds(new Set());
      setSelectMode(false);
    }
  }

  async function confirmClose(withReason: boolean) {
    if (!closing) return;
    const { deal, stage } = closing;
    const prevStage = deal.stage;
    setClosing(null);
    try {
      if (withReason) {
        await onSaveDeal({
          ...deal, stage: stage as Deal["stage"],
          win_loss_reason: closeReason, competitor: closeCompetitor,
          stage_updated_at: new Date().toISOString(),
        });
      } else {
        await onUpdateStage(deal.id, stage);
      }
      toast(`${deal.name} → ${stage}`, {
        action: { label: "Undo", onClick: () => onUpdateStage(deal.id, prevStage) },
      });
    } catch {
      // useData's mutation helpers already surface the failure via error toast.
    }
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

  // Converts an available Project into a Deal at the given stage — shared by
  // both the desktop drag-and-drop drop target and the mobile tap-to-add
  // button (dnd-kit drag has no droppable target on mobile's single-column
  // list, so ProjectChip needs a non-drag path there — see ProjectChip below).
  async function addProjectToStage(project: Project, stage: string) {
    if (!(STAGES as readonly string[]).includes(stage)) return;
    if (pendingProjectIds.has(project.id)) return;
    const key = projectKey(project.name, project.client_id);
    if (usedProjectKeys.has(key)) {
      toast("Project ini sudah ada di pipeline.", { type: "error" });
      return;
    }
    setPendingProjectIds(prev => new Set(prev).add(project.id));
    try {
      await onSaveDeal({
        id: uuid(), name: project.name, client_id: project.client_id, value: project.value,
        stage: stage as Deal["stage"], deal_type: "", product: project.product, close_date: "",
        notes: "", owner: currentUserName, win_loss_reason: "", competitor: "",
        stage_updated_at: new Date().toISOString(),
      });
    } finally {
      setPendingProjectIds(prev => { const next = new Set(prev); next.delete(project.id); return next; });
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
        const projectId = id.slice(PROJECT_DRAG_PREFIX.length);
        const project = projects.find(p => p.id === projectId);
        if (project) await addProjectToStage(project, stage);
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
        <span className="filter-inline">
          <select className="select-sm" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
            <option value="all">Semua Sales</option>
            {team.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </span>
        <FilterSheet>
          <FilterField label="Sales">
            <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
              <option value="all">Semua Sales</option>
              {team.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </FilterField>
        </FilterSheet>
        {archivedCount > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowArchived(s => !s)}>
            {showArchived ? "Sembunyikan arsip" : `Arsip closed (${archivedCount})`}
          </button>
        )}
        {atRiskCount > 0 && (
          <button
            className={`btn btn-sm${atRiskOnly ? "" : " btn-ghost"}`}
            style={atRiskOnly ? undefined : { color: "var(--danger)", borderColor: "var(--danger)" }}
            onClick={() => setAtRiskOnly(s => !s)}
            title="Deal yang belum berpindah stage 30+ hari"
          >
            ⚠ Deal Macet ({atRiskCount})
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => exportDeals(deals, clientName)}><Download size={13} /> Export Excel</button>
        {!isViewer && (
          <button className="btn btn-ghost btn-sm" onClick={toggleSelectMode}>
            {selectMode ? "Batal Pilih" : "Pilih Banyak"}
          </button>
        )}
        {!isViewer && (
          <button className="btn add-btn-desktop" onClick={() => setShowPanel(s => !s)}>
            {showPanel ? "Tutup Panel Proyek" : "+ Tambah dari Proyek"}
          </button>
        )}
      </div>

      {!isViewer && <button className="fab" onClick={() => setShowPanel(s => !s)} aria-label="Tambah dari Proyek">+</button>}

      {team.length > 0 && (
        <div className="cal-legend">
          {team.map(name => (
            <span key={name} className="cal-legend-item">
              <span className="cal-dot" style={{ background: colorForSales(name).bg, border: "1px solid rgba(0,0,0,0.15)" }} />
              {name}
            </span>
          ))}
        </div>
      )}

      {isMobile && (
        <div className="pipeline-stage-tabs">
          {boardStages.map(stage => {
            const count = visibleDeals.filter(d => d.stage === stage).length;
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

      {!isMobile && <PipelineFunnel deals={visibleDeals} onStageClick={scrollToStage} />}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {showPanel && !isViewer && (
          <ProjectPanel projects={availableProjects} clientName={clientName} search={projectSearch} onSearchChange={setProjectSearch} onAddToStage={addProjectToStage} />
        )}
        {isMobile ? (
          <div className="pipeline-mobile-list">
            {visibleDeals.filter(d => d.stage === mobileStage).length === 0 ? (
              <div className="empty-state">Belum ada deal di stage ini.</div>
            ) : visibleDeals.filter(d => d.stage === mobileStage).map(d => (
              <DealCard key={d.id} deal={d} clientName={clientName(d.client_id)}
                onClick={() => { if (!isViewer) { setEditDeal(d); setModalOpen(true); } }}
                onMoveStage={s => moveStage(d, s)} isViewer={isViewer} draggable={false}
                selectMode={selectMode} selected={selectedIds.has(d.id)} onToggleSelect={() => toggleSelect(d.id)} />
            ))}
          </div>
        ) : (
          <div ref={boardRef} className="board" style={boardHeight ? { height: boardHeight } : undefined}>
            {boardStages.map(stage => (
              <Column key={stage} stage={stage} deals={visibleDeals.filter(d => d.stage === stage)}
                clientName={clientName} onDealClick={d => { if (!isViewer) { setEditDeal(d); setModalOpen(true); } }}
                onMoveStage={(dealId, s) => { const d = deals.find(x => x.id === dealId); if (d) moveStage(d, s); }} isViewer={isViewer}
                selectMode={selectMode} selectedIds={selectedIds} onToggleSelect={toggleSelect} />
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

      {selectMode && (
        <div className="pipeline-bulk-bar">
          <span className="pipeline-bulk-count">{selectedIds.size} dipilih</span>
          <select disabled={!selectedIds.size || bulkBusy}
            onChange={e => { const v = e.target.value; if (v) bulkMoveStage(v); e.target.value = ""; }} defaultValue="">
            <option value="" disabled>Pindah ke stage…</option>
            {[...STAGES, "On Hold", "Dropped"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-danger btn-sm" disabled={!selectedIds.size || bulkBusy} onClick={bulkDelete}>Hapus</button>
          <button className="btn btn-ghost btn-sm" onClick={toggleSelectMode} style={{ color: "#fff", borderColor: "rgba(255,255,255,.4)" }}>Selesai</button>
        </div>
      )}

      <Modal open={!!closing} onClose={() => setClosing(null)}
        title={closing?.stage === "Dropped" ? "Project Dropped" : "Project Dealed"}>
        {closing && (
          <>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 14px", lineHeight: 1.5 }}>
              <b>{closing.deal.name}</b> · {clientName(closing.deal.client_id)} — catat alasannya
              supaya bisa dipakai saat review pipeline.
            </p>
            <Field label={`Alasan ${closing.stage}`}>
              <textarea className={textareaCls} value={closeReason} autoFocus
                onChange={e => setCloseReason(e.target.value)}
                placeholder={`Kenapa project ini ${closing.stage}?`} />
            </Field>
            {closing.stage === "Dropped" && (
              <Field label="Kompetitor">
                <input className={inputCls} value={closeCompetitor}
                  onChange={e => setCloseCompetitor(e.target.value)}
                  placeholder="Nama vendor / kompetitor yang menang" />
              </Field>
            )}
            <ModalActions>
              <button className="btn btn-ghost" onClick={() => confirmClose(false)}>Lewati</button>
              <button className="btn" onClick={() => confirmClose(true)}>Simpan</button>
            </ModalActions>
          </>
        )}
      </Modal>

      <DealModal
        open={modalOpen} deal={editDeal} clients={clients} products={products} team={team} defaultOwner={currentUserName}
        documents={dealDocuments} attachments={dealAttachments} activities={dealActivities}
        onSave={onSaveDeal} onDelete={handleDeleteDeal}
        onAddDocument={onAddDocument} onDeleteDocument={onDeleteDocument}
        onUploadAttachment={onUploadAttachment} onDeleteAttachment={onDeleteAttachment}
        onAddActivity={onAddActivity} onDeleteActivity={onDeleteActivity}
        onClose={() => setModalOpen(false)}
      />
    </section>
  );
}
