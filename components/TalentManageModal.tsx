"use client";
import { useState } from "react";
import Modal, { ModalActions } from "./ui/Modal";
import TalentRoleModal from "./TalentRoleModal";
import TalentCVModal from "./TalentCVModal";
import { Project, TalentRole, TalentCV } from "@/types";
import { fmtIDR, fmtDate } from "@/lib/utils";

interface Props {
  open: boolean;
  project: Project | null;
  roles: TalentRole[];
  cvs: TalentCV[];
  team: string[];
  onSaveRole: (r: TalentRole) => Promise<void>;
  onDeleteRole: (id: string) => Promise<void>;
  onSaveCV: (cv: TalentCV) => Promise<void>;
  onDeleteCV: (id: string) => Promise<void>;
  onClose: () => void;
}

const ROLE_STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  Active: { bg: "#DCFCE7", fg: "#15803D" },
  Hold: { bg: "#FEF3C7", fg: "#B45309" },
  "Closed - Filled": { bg: "var(--brand-soft)", fg: "var(--brand)" },
  "Closed - Cancel": { bg: "#FEE2E2", fg: "#991B1B" },
};

export default function TalentManageModal({ open, project, roles, cvs, team, onSaveRole, onDeleteRole, onSaveCV, onDeleteCV, onClose }: Props) {
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<TalentRole | null>(null);
  const [cvModalOpen, setCvModalOpen] = useState(false);
  const [cvRole, setCvRole] = useState<TalentRole | null>(null);

  if (!project) return null;

  function openNewRole() { setEditingRole(null); setRoleModalOpen(true); }
  function openEditRole(r: TalentRole) { setEditingRole(r); setRoleModalOpen(true); }
  function openCVs(r: TalentRole) { setCvRole(r); setCvModalOpen(true); }

  async function handleDeleteRole(id: string) {
    await onDeleteRole(id);
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Talent: ${project.name}`}>
        {!roles.length ? (
          <div className="empty-state" style={{ marginBottom: 14 }}>Belum ada role di project ini.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {roles.map(r => {
              const roleCvs = cvs.filter(cv => cv.role_id === r.id);
              const approved = roleCvs.filter(cv => cv.status === "Approved" || cv.status === "Interview" || cv.status === "Hired").length;
              const rejected = roleCvs.filter(cv => cv.status === "Rejected").length;
              const statusStyle = ROLE_STATUS_STYLE[r.status] || { bg: "#EAE6DA", fg: "#5C5440" };
              return (
                <div key={r.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 12 }}>
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
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--paper)", border: "1px solid var(--line)", color: "var(--ink-soft)" }}>
                      {roleCvs.length} CV
                    </span>
                    {approved > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "#DCFCE7", color: "#15803D" }}>
                        {approved} Approved
                      </span>
                    )}
                    {rejected > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "#FEE2E2", color: "#991B1B" }}>
                        {rejected} Rejected
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openCVs(r)}>Kelola CV ({roleCvs.length})</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEditRole(r)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteRole(r.id)}>Hapus</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button className="btn" onClick={openNewRole}>+ Tambah Role</button>

        <ModalActions>
          <button className="btn btn-ghost" onClick={onClose}>Tutup</button>
        </ModalActions>
      </Modal>

      <TalentRoleModal
        open={roleModalOpen} role={editingRole} projectId={project.id} team={team}
        onSave={onSaveRole} onDelete={onDeleteRole} onClose={() => setRoleModalOpen(false)}
      />

      <TalentCVModal
        open={cvModalOpen} role={cvRole} cvs={cvRole ? cvs.filter(cv => cv.role_id === cvRole.id) : []}
        onSave={onSaveCV} onDelete={onDeleteCV} onClose={() => setCvModalOpen(false)}
      />
    </>
  );
}
