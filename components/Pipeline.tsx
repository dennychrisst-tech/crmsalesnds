"use client";
import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { AppData } from "@/hooks/useData";
import { Deal, CRMDocument, Attachment, Activity } from "@/types";
import { STAGES, STAGE_PROB, fmtIDR } from "@/lib/utils";
import DealModal from "./DealModal";

interface Props {
  data: AppData;
  onSaveDeal: (d: Deal) => Promise<void>;
  onDeleteDeal: (id: string) => Promise<void>;
  onUpdateStage: (id: string, stage: string) => Promise<void>;
  onAddDocument: (d: CRMDocument) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onUploadAttachment: (file: File, dealId: string) => Promise<void>;
  onDeleteAttachment: (id: string) => Promise<void>;
  onAddActivity: (a: Activity) => Promise<void>;
  onDeleteActivity: (id: string) => Promise<void>;
}

function DealCard({ deal, clientName, onClick }: { deal: Deal; clientName: string; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id });
  const style = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, opacity: isDragging ? 0.4 : 1 } : {};
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style} className="deal" onClick={onClick}>
      <div className="dn">{deal.name}</div>
      <div className="dc">{clientName} · {deal.product}</div>
      {deal.owner && <div className="dc">👤 {deal.owner}</div>}
      <div className="dv">{fmtIDR(deal.value)}</div>
    </div>
  );
}

function Column({ stage, deals, clientName, onDealClick }: { stage: string; deals: Deal[]; clientName: (id: string) => string; onDealClick: (d: Deal) => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: stage });
  const val = deals.reduce((s, d) => s + d.value, 0);
  return (
    <div ref={setNodeRef} className={`col${isOver ? " over" : ""}`} data-stage={stage}>
      <h3>{stage}</h3>
      <div className="colval">{deals.length} · {fmtIDR(val)}</div>
      {deals.map(d => <DealCard key={d.id} deal={d} clientName={clientName(d.client_id)} onClick={() => onDealClick(d)} />)}
    </div>
  );
}

export default function Pipeline({ data, onSaveDeal, onDeleteDeal, onUpdateStage, onAddDocument, onDeleteDocument, onUploadAttachment, onDeleteAttachment, onAddActivity, onDeleteActivity }: Props) {
  const { clients, deals, products, documents, attachments, activities } = data;
  const [modalOpen, setModalOpen] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || "—";
  const open = deals.filter(d => d.stage !== "Lost");
  const weighted = open.filter(d => d.stage !== "Won").reduce((s, d) => s + (d.value * STAGE_PROB[d.stage] / 100), 0);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragStart(e: DragStartEvent) {
    setActiveDeal(deals.find(d => d.id === e.active.id) || null);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveDeal(null);
    const { over, active } = e;
    if (!over) return;
    const deal = deals.find(d => d.id === active.id);
    if (deal && deal.stage !== over.id) await onUpdateStage(deal.id, String(over.id));
  }

  const dealDocuments = editDeal ? documents.filter(d => d.deal_id === editDeal.id) : [];
  const dealAttachments = editDeal ? attachments.filter(a => a.deal_id === editDeal.id) : [];
  const dealActivities = editDeal ? activities.filter(a => a.deal_id === editDeal.id) : [];

  return (
    <section>
      <div className="toolbar">
        <span className="muted">Tarik kartu antar kolom untuk ubah stage. Weighted pipeline: <b>{fmtIDR(Math.round(weighted))}</b></span>
        <button className="btn" style={{ marginLeft: "auto" }} onClick={() => { setEditDeal(null); setModalOpen(true); }}>+ Deal Baru</button>
      </div>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="board">
          {STAGES.map(stage => (
            <Column key={stage} stage={stage} deals={deals.filter(d => d.stage === stage)}
              clientName={clientName} onDealClick={d => { setEditDeal(d); setModalOpen(true); }} />
          ))}
        </div>
        <DragOverlay>
          {activeDeal && (
            <div className="deal" style={{ opacity: 0.9, cursor: "grabbing" }}>
              <div className="dn">{activeDeal.name}</div>
              <div className="dc">{clientName(activeDeal.client_id)}</div>
              <div className="dv">{fmtIDR(activeDeal.value)}</div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <DealModal
        open={modalOpen} deal={editDeal} clients={clients} products={products}
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
