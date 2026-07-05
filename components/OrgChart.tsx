"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core";
import { Client, Contact } from "@/types";
import { DEFAULT_ORG_LEVELS } from "@/lib/utils";
import { toast } from "./ui/Toast";

interface Props {
  client: Client;
  contacts: Contact[];
  isViewer?: boolean;
  onSaveClient: (c: Client) => Promise<void>;
  onSaveContact: (c: Contact) => Promise<void>;
  onOpenContact: (contact: Contact) => void;
}

const CHIP_PREFIX = "chip:";
const LEVEL_PREFIX = "level:";
const UNASSIGNED = "__unassigned__";

// True if assigning child.reports_to_id = newParentId would create a cycle —
// i.e. newParentId already (directly or transitively) reports to child.
function wouldCreateCycle(contacts: Contact[], childId: string, newParentId: string): boolean {
  if (childId === newParentId) return true;
  const byId = new Map(contacts.map(c => [c.id, c]));
  const seen = new Set<string>();
  let cur: string | null | undefined = newParentId;
  while (cur) {
    if (cur === childId) return true;
    if (seen.has(cur)) break;
    seen.add(cur);
    cur = byId.get(cur)?.reports_to_id;
  }
  return false;
}

function ContactChip({ contact, isViewer, onOpenContact, registerRef }: {
  contact: Contact; isViewer?: boolean; onOpenContact: (c: Contact) => void; registerRef: (id: string, node: HTMLElement | null) => void;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id: contact.id, disabled: isViewer });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `${CHIP_PREFIX}${contact.id}` });

  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, opacity: isDragging ? 0.4 : 1 }
    : {};

  return (
    <div
      ref={node => { setDragRef(node); setDropRef(node); registerRef(contact.id, node); }}
      {...(!isViewer ? { ...listeners, ...attributes } : {})}
      style={style}
      className={`orgchart-chip${isOver ? " orgchart-chip-over" : ""}`}
      onClick={() => onOpenContact(contact)}
    >
      <div className="orgchart-chip-name">{contact.name || "(tanpa nama)"}</div>
      {contact.title && <div className="orgchart-chip-title">{contact.title}</div>}
    </div>
  );
}

function LevelRow({ id, label, contacts, isViewer, onOpenContact, registerRef }: {
  id: string; label: string; contacts: Contact[]; isViewer?: boolean; onOpenContact: (c: Contact) => void; registerRef: (id: string, node: HTMLElement | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${LEVEL_PREFIX}${id}` });
  return (
    <div className="orgchart-level">
      <div className="orgchart-level-header">{label}</div>
      <div ref={setNodeRef} className={`orgchart-level-row${isOver ? " orgchart-level-row-over" : ""}`}>
        {contacts.length === 0
          ? <div className="orgchart-level-empty">Seret kontak ke sini</div>
          : contacts.map(ct => <ContactChip key={ct.id} contact={ct} isViewer={isViewer} onOpenContact={onOpenContact} registerRef={registerRef} />)}
      </div>
    </div>
  );
}

export default function OrgChart({ client, contacts, isViewer, onSaveClient, onSaveContact, onOpenContact }: Props) {
  const levels = client.org_levels && client.org_levels.length ? client.org_levels : DEFAULT_ORG_LEVELS;

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const byLevel = new Map<string, Contact[]>();
  for (const lvl of levels) byLevel.set(lvl, []);
  const unassigned: Contact[] = [];
  for (const c of contacts) {
    if (byLevel.has(c.org_level || "")) byLevel.get(c.org_level!)!.push(c);
    else unassigned.push(c);
  }
  for (const lvl of levels) byLevel.get(lvl)!.sort((a, b) => (a.org_order || 0) - (b.org_order || 0));
  unassigned.sort((a, b) => (a.org_order || 0) - (b.org_order || 0));

  async function addLevel() {
    const name = prompt("Nama level baru:");
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (levels.includes(trimmed)) { toast("Nama level sudah ada.", { type: "error" }); return; }
    await onSaveClient({ ...client, org_levels: [...levels, trimmed] });
  }

  async function renameLevel(oldName: string) {
    const name = prompt("Nama level baru:", oldName);
    if (!name || !name.trim() || name.trim() === oldName) return;
    const newName = name.trim();
    if (levels.includes(newName)) { toast("Nama level sudah ada.", { type: "error" }); return; }
    await onSaveClient({ ...client, org_levels: levels.map(l => l === oldName ? newName : l) });
    for (const ct of contacts.filter(c => c.org_level === oldName)) {
      await onSaveContact({ ...ct, org_level: newName });
    }
  }

  async function removeLevel(name: string) {
    const affected = contacts.filter(c => c.org_level === name);
    if (!confirm(`Hapus level "${name}"?${affected.length ? ` ${affected.length} kontak akan jadi belum dipetakan.` : ""}`)) return;
    await onSaveClient({ ...client, org_levels: levels.filter(l => l !== name) });
    for (const ct of affected) await onSaveContact({ ...ct, org_level: "", reports_to_id: null });
  }

  async function moveLevel(name: string, dir: -1 | 1) {
    const idx = levels.indexOf(name);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= levels.length) return;
    const next = [...levels];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    await onSaveClient({ ...client, org_levels: next });
  }

  async function setReportsTo(contact: Contact, newParentId: string | null) {
    if (newParentId && wouldCreateCycle(contacts, contact.id, newParentId)) {
      toast("Tidak bisa: akan membentuk lingkaran struktur lapor.", { type: "error" });
      return;
    }
    await onSaveContact({ ...contact, reports_to_id: newParentId });
  }

  // --- Desktop drag & drop ---
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const activeContact = contacts.find(c => c.id === activeId) || null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const draggedId = String(active.id);
    const overId = String(over.id);
    const dragged = contacts.find(c => c.id === draggedId);
    if (!dragged) return;

    if (overId.startsWith(CHIP_PREFIX)) {
      const targetId = overId.slice(CHIP_PREFIX.length);
      if (targetId === draggedId) return;
      const target = contacts.find(c => c.id === targetId);
      if (!target) return;
      if (wouldCreateCycle(contacts, draggedId, targetId)) {
        toast("Tidak bisa: akan membentuk lingkaran struktur lapor.", { type: "error" });
        return;
      }
      const targetLevelIdx = levels.indexOf(target.org_level || "");
      const newLevel = targetLevelIdx >= 0 && targetLevelIdx + 1 < levels.length ? levels[targetLevelIdx + 1] : (target.org_level || levels[levels.length - 1] || "");
      const siblingOrders = contacts.filter(c => c.org_level === newLevel).map(c => c.org_order || 0);
      const newOrder = siblingOrders.length ? Math.max(...siblingOrders) + 1 : 0;
      await onSaveContact({ ...dragged, org_level: newLevel, org_order: newOrder, reports_to_id: targetId });
      return;
    }

    if (overId.startsWith(LEVEL_PREFIX)) {
      const levelName = overId.slice(LEVEL_PREFIX.length);
      if (levelName === UNASSIGNED) {
        await onSaveContact({ ...dragged, org_level: "", reports_to_id: null });
        return;
      }
      const siblingOrders = contacts.filter(c => c.org_level === levelName).map(c => c.org_order || 0);
      const newOrder = siblingOrders.length ? Math.max(...siblingOrders) + 1 : 0;
      await onSaveContact({ ...dragged, org_level: levelName, org_order: newOrder, reports_to_id: null });
    }
  }

  // --- Reporting-line connectors (desktop only) ---
  const containerRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [lines, setLines] = useState<{ key: string; d: string }[]>([]);

  function registerRef(id: string, node: HTMLElement | null) {
    if (node) chipRefs.current.set(id, node); else chipRefs.current.delete(id);
  }

  function recomputeLines() {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const next: { key: string; d: string }[] = [];
    for (const ct of contacts) {
      if (!ct.reports_to_id) continue;
      const childEl = chipRefs.current.get(ct.id);
      const parentEl = chipRefs.current.get(ct.reports_to_id);
      if (!childEl || !parentEl) continue;
      const cr = childEl.getBoundingClientRect();
      const pr = parentEl.getBoundingClientRect();
      const x1 = pr.left + pr.width / 2 - cRect.left;
      const y1 = pr.bottom - cRect.top;
      const x2 = cr.left + cr.width / 2 - cRect.left;
      const y2 = cr.top - cRect.top;
      const midY = (y1 + y2) / 2;
      next.push({ key: ct.id, d: `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}` });
    }
    setLines(next);
  }

  useLayoutEffect(() => {
    if (isMobile) return;
    recomputeLines();
    const ro = new ResizeObserver(() => recomputeLines());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", recomputeLines);
    return () => { ro.disconnect(); window.removeEventListener("resize", recomputeLines); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, contacts, levels.join("|")]);

  return (
    <div className="orgchart-wrap">
      <div className="orgchart-levels-toolbar">
        {levels.map((lvl, i) => (
          <span key={lvl} className="orgchart-level-tag">
            {lvl}
            {!isViewer && (
              <>
                <button onClick={() => moveLevel(lvl, -1)} disabled={i === 0} title="Naikkan level">↑</button>
                <button onClick={() => moveLevel(lvl, 1)} disabled={i === levels.length - 1} title="Turunkan level">↓</button>
                <button onClick={() => renameLevel(lvl)} title="Ganti nama level">✏</button>
                <button onClick={() => removeLevel(lvl)} title="Hapus level">×</button>
              </>
            )}
          </span>
        ))}
        {!isViewer && <button className="btn btn-ghost btn-sm" onClick={addLevel}>+ Tambah Level</button>}
      </div>

      {isMobile ? (
        <div className="orgchart-mobile-list">
          {contacts.length === 0 ? (
            <div className="vt-empty">Belum ada kontak untuk dipetakan.</div>
          ) : contacts
            .slice()
            .sort((a, b) => levels.indexOf(a.org_level || "") - levels.indexOf(b.org_level || ""))
            .map(ct => (
              <div key={ct.id} className="orgchart-mobile-row">
                <div onClick={() => onOpenContact(ct)}>
                  <div className="orgchart-chip-name">{ct.name || "(tanpa nama)"}</div>
                  {ct.title && <div className="orgchart-chip-title">{ct.title}</div>}
                </div>
                {!isViewer && (
                  <>
                    <select className="select-sm" value={levels.includes(ct.org_level || "") ? ct.org_level : ""}
                      onChange={e => onSaveContact({ ...ct, org_level: e.target.value })}>
                      <option value="">Belum dipetakan</option>
                      {levels.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <select className="select-sm" value={ct.reports_to_id || ""}
                      onChange={e => setReportsTo(ct, e.target.value || null)}>
                      <option value="">Tidak lapor ke siapapun</option>
                      {contacts.filter(c => c.id !== ct.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </>
                )}
              </div>
            ))}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div ref={containerRef} className="orgchart-container">
            <svg className="orgchart-svg">
              {lines.map(l => <path key={l.key} d={l.d} className="orgchart-line" />)}
            </svg>
            {levels.map(lvl => (
              <LevelRow key={lvl} id={lvl} label={lvl} contacts={byLevel.get(lvl) || []} isViewer={isViewer} onOpenContact={onOpenContact} registerRef={registerRef} />
            ))}
            <LevelRow id={UNASSIGNED} label="Belum Dipetakan" contacts={unassigned} isViewer={isViewer} onOpenContact={onOpenContact} registerRef={registerRef} />
          </div>
          <DragOverlay>
            {activeContact ? (
              <div className="orgchart-chip orgchart-chip-overlay">
                <div className="orgchart-chip-name">{activeContact.name || "(tanpa nama)"}</div>
                {activeContact.title && <div className="orgchart-chip-title">{activeContact.title}</div>}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
