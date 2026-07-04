"use client";
import { useState, useEffect, useCallback } from "react";
import { UserRole } from "@/types";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

const ROLES: UserRole[] = ["viewer", "employee", "admin", "super_admin"];
const ROLE_LABEL: Record<UserRole, string> = {
  viewer: "Viewer",
  employee: "Employee",
  admin: "Admin",
  super_admin: "Super Admin",
};
const PRIVILEGED: UserRole[] = ["admin", "super_admin"];

// Client-side, crypto-backed generator for the "Reset Password" action — a
// plain Math.random() string would be predictable and this never leaves the
// browser except over the same PATCH call a manual password change already uses.
function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join("");
}

export default function UsersClient({ currentRole, currentUserId }: { currentRole: UserRole; currentUserId: string }) {
  const isSuperAdmin = currentRole === "super_admin";
  const assignableRoles = isSuperAdmin ? ROLES : (ROLES.filter(r => !PRIVILEGED.includes(r)) as UserRole[]);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", name: "", role: "employee" as UserRole, password: "" });
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetFor, setResetFor] = useState<UserRow | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function canManage(u: UserRow): boolean {
    return isSuperAdmin || !PRIVILEGED.includes(u.role);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess(""); setInviting(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invite),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); setInviting(false); return; }
    setSuccess(`User ${invite.email} berhasil dibuat`);
    setInvite({ email: "", name: "", role: "employee", password: "" });
    setInviting(false);
    setInviteOpen(false);
    fetchUsers();
  }

  async function handleRoleChange(id: string, role: UserRole) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) { const json = await res.json().catch(() => ({})); alert(json.error || "Gagal mengubah role"); }
    fetchUsers();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus akun "${name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) { alert(json.error); return; }
    fetchUsers();
  }

  function openReset(u: UserRow) {
    setResetFor(u);
    setGeneratedPassword(generatePassword());
    setCopied(false);
  }

  async function confirmReset() {
    if (!resetFor) return;
    setResetting(true);
    const res = await fetch(`/api/admin/users/${resetFor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: generatedPassword }),
    });
    const json = await res.json();
    setResetting(false);
    if (!res.ok) { alert(json.error || "Gagal reset password"); return; }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1px solid var(--line)",
    borderRadius: "7px", fontSize: "13px", background: "var(--paper)", color: "var(--ink)",
    boxSizing: "border-box",
  };
  const selectStyle: React.CSSProperties = { ...inputStyle };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>Manajemen User</h1>
          <p style={{ fontSize: "13px", color: "var(--ink-soft)", marginTop: "4px" }}>
            Kelola akun anggota tim dan hak akses mereka
            {!isSuperAdmin && " — akun Admin/Super Admin hanya bisa dikelola oleh Super Admin"}
          </p>
        </div>
        <button
          onClick={() => { setInviteOpen(true); setError(""); setSuccess(""); }}
          style={{
            background: "var(--surface-strong)", color: "#fff", border: "none", padding: "10px 18px",
            borderRadius: "8px", fontWeight: 700, fontSize: "13px", cursor: "pointer",
          }}
        >
          + Tambah User
        </button>
      </div>

      {success && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px", color: "#15803d" }}>
          {success}
        </div>
      )}

      {/* Invite modal */}
      {inviteOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
        }}>
          <div style={{
            background: "var(--card)", borderRadius: "14px", padding: "28px", width: "100%",
            maxWidth: "420px", border: "1px solid var(--line)", boxShadow: "var(--shadow)",
          }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 20px" }}>Tambah Anggota Tim</h2>
            <form onSubmit={handleInvite} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--ink-soft)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: ".08em" }}>Nama Lengkap</label>
                <input style={inputStyle} value={invite.name} onChange={e => setInvite(i => ({ ...i, name: e.target.value }))} required placeholder="Denny Pratama" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--ink-soft)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: ".08em" }}>Email</label>
                <input type="email" style={inputStyle} value={invite.email} onChange={e => setInvite(i => ({ ...i, email: e.target.value }))} required placeholder="nama@nds.co.id" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--ink-soft)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: ".08em" }}>Role</label>
                <select style={selectStyle} value={invite.role} onChange={e => setInvite(i => ({ ...i, role: e.target.value as UserRole }))}>
                  {assignableRoles.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
                {!isSuperAdmin && (
                  <p style={{ fontSize: "11px", color: "var(--ink-soft)", marginTop: "5px" }}>Hanya Super Admin yang bisa membuat akun Admin/Super Admin.</p>
                )}
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--ink-soft)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: ".08em" }}>Password</label>
                <input type="password" style={inputStyle} value={invite.password} onChange={e => setInvite(i => ({ ...i, password: e.target.value }))} required minLength={6} placeholder="Min. 6 karakter" />
              </div>
              {error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "7px", padding: "9px 12px", fontSize: "12px", color: "#b91c1c" }}>{error}</div>
              )}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "4px" }}>
                <button type="button" onClick={() => setInviteOpen(false)} style={{ padding: "9px 16px", borderRadius: "7px", border: "1px solid var(--line)", background: "transparent", cursor: "pointer", fontSize: "13px" }}>Batal</button>
                <button type="submit" disabled={inviting} style={{ padding: "9px 18px", borderRadius: "7px", background: "var(--surface-strong)", color: "#fff", border: "none", cursor: inviting ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "13px" }}>
                  {inviting ? "Menyimpan…" : "Buat User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset password modal — admin-assisted: generates a password here, admin
          relays it to the user manually (no email provider is wired up yet). */}
      {resetFor && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
        }}>
          <div style={{
            background: "var(--card)", borderRadius: "14px", padding: "28px", width: "100%",
            maxWidth: "420px", border: "1px solid var(--line)", boxShadow: "var(--shadow)",
          }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 8px" }}>Reset Password</h2>
            <p style={{ fontSize: "13px", color: "var(--ink-soft)", margin: "0 0 18px" }}>
              Untuk akun <strong>{resetFor.name || resetFor.email}</strong>. Password baru di bawah ini akan langsung aktif setelah disimpan — sampaikan ke user secara manual (chat/WA/telepon), lalu minta mereka menggantinya setelah login.
            </p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
              <input readOnly value={generatedPassword} style={{ ...inputStyle, fontFamily: "monospace", fontSize: "15px", fontWeight: 700 }} />
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(generatedPassword); setCopied(true); }}
                style={{ padding: "9px 14px", borderRadius: "7px", border: "1px solid var(--line)", background: "transparent", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" }}
              >
                {copied ? "Tersalin" : "Salin"}
              </button>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setResetFor(null)} style={{ padding: "9px 16px", borderRadius: "7px", border: "1px solid var(--line)", background: "transparent", cursor: "pointer", fontSize: "13px" }}>Batal</button>
              <button
                type="button"
                disabled={resetting}
                onClick={async () => { await confirmReset(); setResetFor(null); }}
                style={{ padding: "9px 18px", borderRadius: "7px", background: "var(--surface-strong)", color: "#fff", border: "none", cursor: resetting ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "13px" }}
              >
                {resetting ? "Menyimpan…" : "Simpan Password Baru"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--ink-soft)", fontSize: "13px" }}>Memuat data…</div>
        ) : users.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--ink-soft)", fontSize: "13px" }}>Belum ada user.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                {["Nama", "Email", "Role", "Bergabung", "Aksi"].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-soft)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const locked = !canManage(u);
                return (
                  <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? "1px solid var(--line)" : "none" }}>
                    <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600 }}>{u.name || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--ink-soft)" }}>{u.email}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <select
                        value={u.role}
                        disabled={locked}
                        onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                        title={locked ? "Hanya Super Admin yang bisa mengubah role akun ini" : undefined}
                        style={{ ...selectStyle, width: "auto", padding: "5px 10px", fontSize: "12px", opacity: locked ? 0.6 : 1, cursor: locked ? "not-allowed" : "pointer" }}
                      >
                        {(locked ? ROLES : assignableRoles).map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "12px", color: "var(--ink-soft)" }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      <button
                        onClick={() => openReset(u)}
                        disabled={locked}
                        title={locked ? "Hanya Super Admin yang bisa reset password akun ini" : undefined}
                        style={{ fontSize: "12px", color: locked ? "var(--ink-soft)" : "var(--ink)", background: "none", border: "none", cursor: locked ? "not-allowed" : "pointer", padding: "4px 8px", borderRadius: "5px", opacity: locked ? 0.5 : 1 }}
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.name)}
                        disabled={locked || u.id === currentUserId}
                        title={locked ? "Hanya Super Admin yang bisa hapus akun ini" : u.id === currentUserId ? "Tidak bisa hapus akun sendiri" : undefined}
                        style={{ fontSize: "12px", color: "var(--danger)", background: "none", border: "none", cursor: (locked || u.id === currentUserId) ? "not-allowed" : "pointer", padding: "4px 8px", borderRadius: "5px", opacity: (locked || u.id === currentUserId) ? 0.5 : 1 }}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
