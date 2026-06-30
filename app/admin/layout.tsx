import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) redirect("/login");
  if (!["super_admin", "admin"].includes(session.role)) redirect("/");

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <header style={{
        background: "var(--ink)", color: "#fff", padding: "14px 24px",
        display: "flex", alignItems: "center", gap: "16px",
      }}>
        <Link href="/" style={{ color: "#94a3b8", fontSize: "13px", textDecoration: "none" }}>
          ← CRM
        </Link>
        <span style={{ color: "#334155" }}>|</span>
        <span style={{ fontWeight: 700, fontSize: "14px" }}>Admin Panel</span>
        <nav style={{ display: "flex", gap: "4px", marginLeft: "8px" }}>
          <Link href="/admin/users" style={{
            color: "#cbd5e1", fontSize: "13px", textDecoration: "none",
            padding: "5px 12px", borderRadius: "6px", background: "#1e293b",
          }}>
            Manajemen User
          </Link>
        </nav>
        <div style={{ marginLeft: "auto", fontSize: "12px", color: "#64748b" }}>
          {session.name || session.email} · <span style={{ color: "#00AFA0" }}>{session.role}</span>
        </div>
      </header>
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" }}>
        {children}
      </main>
    </div>
  );
}
