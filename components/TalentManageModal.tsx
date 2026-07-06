"use client";
import { useState } from "react";
import Modal, { ModalActions } from "./ui/Modal";
import TalentRoleModal from "./TalentRoleModal";
import { Project, TalentRole } from "@/types";
import { fmtIDR, fmtDate } from "@/lib/utils";

interface Props {
  open: boolean;
  project: Project | null;
  roles: TalentRole[];
  team: string[];
  onSaveRole: (r: TalentRole) => Promise<void>;
  onDeleteRole: (id: string) => Promise<void>;
  onClose: () => void;
}

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  Open: { bg: "#DCFCE7", fg: "#15803D" },
  Close: { bg: "#E7E5E4", fg: "#57534E" },
};

function CountChip({ label, value, tone }: { label: string; value: number; tone?: "warn" | "danger" | "brand" }) {
  if (!value) return null;
  const style = tone === "danger" ? { bg: "#FEE2E2", fg: "#991B1B" }
    : tone === "warn" ? { bg: "#FEF3C7", fg: "#B45309" }
    : tone === "brand" ? { bg: "var(--brand-soft)", fg: "var(--brand)" }
    : { bg: "var(--paper)", fg: "var(--ink-soft)" };
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: style.bg, color: style.fg }}>
      {value} {label}
    </span>
  );
}

function RoleCard({ role: r, onClick }: { role: TalentRole; onClick: () => void }) {
  const statusStyle = STATUS_STYLE[r.status] || { bg: "#EAE6DA", fg: "#5C5440" };
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, cursor: "pointer" }}
      onClick={onClick}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{r.role_name}{r.level ? ` · ${r.level}` : ""}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>
            {r.ratecard ? `${fmtIDR(r.ratecard)}/bln` : "—"}
            {r.pic ? ` · PIC: ${r.pic}` : ""}
            {r.deadline ? ` · Deadline: ${fmtDate(r.deadline)}` : ""}
          </div>
        </div>
        <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: statusStyle.bg, color: statusStyle.fg, whiteSpace: "nowrap" }}>
          {r.status}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
        <CountChip label="Req CV" value={r.req_cv} />
        <CountChip label="Submitted" value={r.cv_submitted} />
        <CountChip label="Reject" value={r.cv_reject} tone="danger" />
        <CountChip label="Not Response" value={r.cv_not_response} tone="warn" />
        <CountChip label="PO Issued" value={r.po_issued} tone="brand" />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onClick(); }}>Edit</button>
      </div>
    </div>
  );
}

// Collapsible group header — click to expand/collapse the roles under it, so
// a project with many old "Close" requisitions doesn't push "Open" ones (the
// ones that actually need attention) far down the list.
function RoleGroup({ label, roles, expanded, onToggle, onEditRole }: {
  label: string; roles: TalentRole[]; expanded: boolean; onToggle: () => void; onEditRole: (r: TalentRole) => void;
}) {
  if (!roles.length) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
          background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8,
          padding: "8px 12px", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "var(--ink)",
        }}
      >
        <span>{label} <span style={{ color: "var(--ink-soft)", fontWeight: 500 }}>({roles.length})</span></span>
        <span style={{ fontSize: 11 }}>{expanded ? "▾" : "▸"}</span>
      </button>
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          {roles.map(r => <RoleCard key={r.id} role={r} onClick={() => onEditRole(r)} />)}
        </div>
      )}
    </div>
  );
}

export default function TalentManageModal({ open, project, roles, team, onSaveRole, onDeleteRole, onClose }: Props) {
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<TalentRole | null>(null);
  // Open requisitions need attention, so they're expanded by default; Close
  // ones are history and start collapsed to keep the list short.
  const [openExpanded, setOpenExpanded] = useState(true);
  const [closeExpanded, setCloseExpanded] = useState(false);

  if (!project) return null;

  function openNewRole() { setEditingRole(null); setRoleModalOpen(true); }
  function openEditRole(r: TalentRole) { setEditingRole(r); setRoleModalOpen(true); }

  const openRoles = roles.filter(r => r.status === "Open");
  const closeRoles = roles.filter(r => r.status !== "Open");

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Talent: ${project.name}`}>
        {!roles.length ? (
          <div className="empty-state" style={{ marginBottom: 14 }}>Belum ada requisition di project ini.</div>
        ) : (
          <div style={{ marginBottom: 14 }}>
            <RoleGroup label="Open" roles={openRoles} expanded={openExpanded} onToggle={() => setOpenExpanded(v => !v)} onEditRole={openEditRole} />
            <RoleGroup label="Close" roles={closeRoles} expanded={closeExpanded} onToggle={() => setCloseExpanded(v => !v)} onEditRole={openEditRole} />
          </div>
        )}

        <button className="btn" onClick={openNewRole}>+ Tambah Requisition</button>

        <ModalActions>
          <button className="btn btn-ghost" onClick={onClose}>Tutup</button>
        </ModalActions>
      </Modal>

      <TalentRoleModal
        open={roleModalOpen} role={editingRole} projectId={project.id} team={team}
        onSave={onSaveRole} onDelete={onDeleteRole} onClose={() => setRoleModalOpen(false)}
      />
    </>
  );
}
