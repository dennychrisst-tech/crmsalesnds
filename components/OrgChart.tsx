"use client";
import { useEffect, useMemo, useState } from "react";
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

const NODE_W = 170;
const NODE_H = 50;
const H_GAP = 20;       // horizontal gap between sibling subtrees in row mode
const ROW_STEP = 90;    // vertical distance from a parent's row to its children's row (row mode)
const BUS_GAP = 20;     // vertical drop from a parent's bottom edge to the row-mode "bus" line
const LIST_GAP = 30;    // horizontal gap between a node and its compact child list
const LIST_ROW_GAP = 8; // vertical gap between stacked items in a compact list

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

// Hybrid org-chart layout: a node whose children are all leaves (no
// grandchildren) stacks them as a compact vertical list beside itself —
// exactly how a "director with plain staff" branch reads in a real chart —
// while a node whose children have their own subordinates spreads them out
// as a centered horizontal row (since those branches need the extra width
// for their own descendants anyway). Only contacts already assigned to one
// of `levels` participate — unassigned contacts don't show in the diagram
// at all (they're edited via the list above it instead).
function layoutTree(contacts: Contact[], levels: string[]) {
  const assigned = contacts.filter(c => levels.includes(c.org_level || ""));
  const assignedIds = new Set(assigned.map(c => c.id));
  const childrenMap = new Map<string, Contact[]>();
  const roots: Contact[] = [];
  for (const c of assigned) {
    const parentId = c.reports_to_id && assignedIds.has(c.reports_to_id) ? c.reports_to_id : null;
    if (parentId) {
      if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
      childrenMap.get(parentId)!.push(c);
    } else {
      roots.push(c);
    }
  }
  for (const kids of childrenMap.values()) kids.sort((a, b) => (a.org_order || 0) - (b.org_order || 0));
  roots.sort((a, b) => (levels.indexOf(a.org_level || "") - levels.indexOf(b.org_level || "")) || ((a.org_order || 0) - (b.org_order || 0)));

  const isLeaf = (id: string) => !childrenMap.has(id);
  const listMode = new Set<string>(); // parent ids whose children render as a compact vertical list
  for (const [parentId, kids] of childrenMap.entries()) {
    if (kids.every(k => isLeaf(k.id))) listMode.add(parentId);
  }

  const positions = new Map<string, { x: number; y: number }>();
  const visiting = new Set<string>();
  let cursor = 0;

  // Places `node` and its whole subtree; returns { x, width } — x is this
  // node's own left edge, width is the total horizontal footprint an
  // ancestor must reserve for this subtree (wider than NODE_W for a node
  // that itself renders a compact list, since that list sticks out to the side).
  function place(node: Contact, y: number): { x: number; width: number } {
    if (visiting.has(node.id)) { const x = cursor; cursor += NODE_W + H_GAP; return { x, width: NODE_W }; }
    visiting.add(node.id);
    const kids = childrenMap.get(node.id) || [];

    let result: { x: number; width: number };
    if (kids.length === 0) {
      const x = cursor;
      cursor += NODE_W + H_GAP;
      positions.set(node.id, { x, y });
      result = { x, width: NODE_W };
    } else if (listMode.has(node.id)) {
      const width = NODE_W + LIST_GAP + NODE_W;
      const x = cursor;
      cursor += width + H_GAP;
      positions.set(node.id, { x, y });
      const listX = x + NODE_W + LIST_GAP;
      kids.forEach((k, i) => positions.set(k.id, { x: listX, y: y + i * (NODE_H + LIST_ROW_GAP) }));
      result = { x, width };
    } else {
      let leftMost = Infinity, rightMost = -Infinity;
      for (const k of kids) {
        const { x: kx, width: kw } = place(k, y + ROW_STEP);
        leftMost = Math.min(leftMost, kx);
        rightMost = Math.max(rightMost, kx + kw);
      }
      const span = Math.max(rightMost - leftMost, NODE_W);
      const x = leftMost + (rightMost - leftMost) / 2 - NODE_W / 2;
      positions.set(node.id, { x, y });
      result = { x, width: span };
    }
    visiting.delete(node.id);
    return result;
  }

  for (const r of roots) place(r, 0);

  let maxX = NODE_W, maxY = NODE_H;
  for (const pos of positions.values()) {
    maxX = Math.max(maxX, pos.x + NODE_W);
    maxY = Math.max(maxY, pos.y + NODE_H);
  }
  return { positions, childrenMap, listMode, width: maxX, height: maxY };
}

// Row-mode branches get the classic elbow (trunk down → horizontal bus →
// drop into each child). List-mode branches get a bracket: a line out of the
// parent's right edge into a vertical spine, with a short tick into each
// stacked child.
function buildConnectors(childrenMap: Map<string, Contact[]>, listMode: Set<string>, positions: Map<string, { x: number; y: number }>) {
  const paths: { key: string; d: string }[] = [];
  for (const [parentId, kids] of childrenMap.entries()) {
    const parentPos = positions.get(parentId);
    if (!parentPos) continue;
    const validKids = kids.filter(k => positions.has(k.id));
    if (!validKids.length) continue;

    if (listMode.has(parentId)) {
      const spineX = parentPos.x + NODE_W + LIST_GAP / 2;
      const outY = parentPos.y + NODE_H / 2;
      paths.push({ key: `${parentId}-out`, d: `M ${parentPos.x + NODE_W} ${outY} L ${spineX} ${outY}` });
      const kYs = validKids.map(k => positions.get(k.id)!.y + NODE_H / 2);
      const spineTop = Math.min(outY, ...kYs), spineBottom = Math.max(outY, ...kYs);
      paths.push({ key: `${parentId}-spine`, d: `M ${spineX} ${spineTop} L ${spineX} ${spineBottom}` });
      for (const k of validKids) {
        const ky = positions.get(k.id)!.y + NODE_H / 2;
        const kx = positions.get(k.id)!.x;
        paths.push({ key: `${parentId}-${k.id}-tick`, d: `M ${spineX} ${ky} L ${kx} ${ky}` });
      }
    } else {
      const trunkX = parentPos.x + NODE_W / 2;
      const trunkY1 = parentPos.y + NODE_H;
      const busY = trunkY1 + BUS_GAP;
      paths.push({ key: `${parentId}-trunk`, d: `M ${trunkX} ${trunkY1} L ${trunkX} ${busY}` });
      const childXs = validKids.map(k => positions.get(k.id)!.x + NODE_W / 2);
      const minX = Math.min(...childXs, trunkX), maxX = Math.max(...childXs, trunkX);
      if (minX !== maxX) paths.push({ key: `${parentId}-bus`, d: `M ${minX} ${busY} L ${maxX} ${busY}` });
      for (const k of validKids) {
        const kPos = positions.get(k.id)!;
        const kx = kPos.x + NODE_W / 2, ky = kPos.y;
        paths.push({ key: `${parentId}-${k.id}-drop`, d: `M ${kx} ${busY} L ${kx} ${ky}` });
      }
    }
  }
  return paths;
}

function depthOf(contact: Contact, byId: Map<string, Contact>): number {
  let d = 0;
  let cur = contact;
  const seen = new Set<string>();
  while (cur.reports_to_id && byId.has(cur.reports_to_id) && d < 30) {
    if (seen.has(cur.id)) break;
    seen.add(cur.id);
    cur = byId.get(cur.reports_to_id)!;
    d++;
  }
  return d;
}

function TreeNode({ contact, x, y, onOpenContact }: {
  contact: Contact; x: number; y: number; onOpenContact: (c: Contact) => void;
}) {
  return (
    <div
      style={{ position: "absolute", left: x, top: y, width: NODE_W, height: NODE_H }}
      className="orgchart-chip"
      onClick={() => onOpenContact(contact)}
    >
      <div className="orgchart-chip-name">{contact.name || "(tanpa nama)"}</div>
      {contact.title && <div className="orgchart-chip-title">{contact.title}</div>}
    </div>
  );
}

// The one guaranteed-to-work way to build the structure: a plain table, one
// row per contact, two dropdowns (level + who they report to). No dragging
// anywhere — this is the primary editor; the diagram below it is just a
// live-updating picture of whatever this table says.
function StructureTable({ contacts, levels, isViewer, byId, onOpenContact, onSaveContact, onSetReportsTo }: {
  contacts: Contact[]; levels: string[]; isViewer?: boolean; byId: Map<string, Contact>;
  onOpenContact: (c: Contact) => void; onSaveContact: (c: Contact) => Promise<void>; onSetReportsTo: (c: Contact, id: string | null) => void;
}) {
  const sorted = contacts
    .slice()
    .sort((a, b) => (levels.indexOf(a.org_level || "") - levels.indexOf(b.org_level || "")) || depthOf(a, byId) - depthOf(b, byId));

  return (
    <div className="orgchart-table">
      {sorted.length === 0 ? (
        <div className="vt-empty">Belum ada kontak untuk dipetakan.</div>
      ) : sorted.map(ct => (
        <div key={ct.id} className="orgchart-table-row" style={{ paddingLeft: 12 + depthOf(ct, byId) * 16 }}>
          <div className="orgchart-table-name" onClick={() => onOpenContact(ct)}>
            <div className="orgchart-chip-name-plain">{ct.name || "(tanpa nama)"}</div>
            {ct.title && <div className="orgchart-chip-title-plain">{ct.title}</div>}
          </div>
          {!isViewer && (
            <div className="orgchart-table-controls">
              <select className="select-sm" value={levels.includes(ct.org_level || "") ? ct.org_level : ""}
                onChange={e => onSaveContact({ ...ct, org_level: e.target.value })}>
                <option value="">Belum dipetakan</option>
                {levels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select className="select-sm" value={ct.reports_to_id || ""}
                onChange={e => onSetReportsTo(ct, e.target.value || null)}>
                <option value="">Tidak lapor ke siapapun</option>
                {contacts.filter(c => c.id !== ct.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function OrgChart({ client, contacts, isViewer, onSaveClient, onSaveContact, onOpenContact }: Props) {
  const levels = client.org_levels && client.org_levels.length ? client.org_levels : DEFAULT_ORG_LEVELS;

  const [modalOpen, setModalOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setModalOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [modalOpen]);

  const byId = useMemo(() => new Map(contacts.map(c => [c.id, c])), [contacts]);
  const layout = useMemo(() => layoutTree(contacts, levels), [contacts, levels]);
  const connectorPaths = useMemo(() => buildConnectors(layout.childrenMap, layout.listMode, layout.positions), [layout]);

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

  const levelToolbar = (
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
      <span className="orgchart-zoom-controls">
        <button onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2)))} title="Perkecil">−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(1.5, +(z + 0.1).toFixed(2)))} title="Perbesar">+</button>
      </span>
    </div>
  );

  return (
    <>
      <button className="btn btn-ghost btn-sm vt-add" onClick={() => setModalOpen(true)}>🏢 Struktur Organisasi</button>

      {modalOpen && (
        <div className="orgchart-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="orgchart-modal-card">
            <div className="orgchart-modal-header">
              <h3>🏢 Struktur Organisasi — {client.name}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModalOpen(false)}>✕ Tutup</button>
            </div>
            {levelToolbar}
            <div className="orgchart-modal-body">
              <div className="orgchart-table-section">
                <div className="orgchart-table-title">1. Atur di sini — pilih level &amp; atasan tiap kontak</div>
                <StructureTable contacts={contacts} levels={levels} isViewer={isViewer} byId={byId}
                  onOpenContact={onOpenContact} onSaveContact={onSaveContact} onSetReportsTo={setReportsTo} />
              </div>
              <div className="orgchart-diagram-section">
                <div className="orgchart-table-title">2. Hasilnya (otomatis, tidak perlu diapa-apakan)</div>
                {layout.positions.size === 0 ? (
                  <div className="orgchart-empty-hint">📊 Diagram akan muncul di sini setelah minimal satu kontak diberi level di tabel atas.</div>
                ) : (
                  <div className="orgchart-scroll-area">
                    <div style={{ width: layout.width * zoom, height: layout.height * zoom }}>
                      <div className="orgchart-canvas" style={{ width: layout.width, height: layout.height, transform: `scale(${zoom})` }}>
                        <svg className="orgchart-svg" width={layout.width} height={layout.height}>
                          {connectorPaths.map(p => <path key={p.key} d={p.d} className="orgchart-line" />)}
                        </svg>
                        {contacts.map(ct => {
                          const pos = layout.positions.get(ct.id);
                          if (!pos) return null;
                          return <TreeNode key={ct.id} contact={ct} x={pos.x} y={pos.y} onOpenContact={onOpenContact} />;
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
