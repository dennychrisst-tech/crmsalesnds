"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Login gagal");
      setLoading(false);
    } else {
      router.replace("/");
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--paper)", padding: "24px",
    }}>
      <div style={{
        width: "100%", maxWidth: "400px", background: "var(--card)",
        border: "1px solid var(--line)", borderRadius: "16px",
        padding: "40px 36px", boxShadow: "var(--shadow)",
      }}>
        {/* Logo */}
        <div style={{ marginBottom: "32px", textAlign: "center" }}>
          <svg viewBox="0 0 210 72" height="40" aria-label="NDS" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block" }}>
            <text x="0" y="48" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="52" fontWeight="800" fill="#58595B">N</text>
            <path d="M68 6 C90 6 104 20 104 36 C104 52 90 66 68 66" stroke="#00AFA0" strokeWidth="7" fill="none" strokeLinecap="round"/>
            <text x="108" y="48" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="52" fontWeight="800" fill="#58595B">S</text>
            <text x="148" y="28" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="#58595B">NUSANTARA</text>
            <text x="148" y="42" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="#58595B"><tspan fill="#00AFA0">D</tspan>UTA</text>
            <text x="148" y="56" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="#58595B">SOLUSINDO</text>
          </svg>
          <div style={{
            marginTop: "10px", fontSize: "11px", fontWeight: 800, letterSpacing: ".2em",
            textTransform: "uppercase", color: "#fff", background: "var(--brand)",
            display: "inline-block", padding: "3px 10px", borderRadius: "6px",
          }}>Sales CRM</div>
        </div>

        <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--ink)", marginBottom: "6px", textAlign: "center" }}>
          Masuk ke Akun
        </h1>
        <p style={{ fontSize: "13px", color: "var(--ink-soft)", textAlign: "center", marginBottom: "28px" }}>
          Gunakan email dan password yang diberikan admin
        </p>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--ink-soft)", marginBottom: "6px" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="nama@nds.co.id"
              style={{
                width: "100%", padding: "10px 12px", border: "1px solid var(--line)",
                borderRadius: "8px", fontSize: "14px", background: "var(--paper)",
                color: "var(--ink)", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--ink-soft)", marginBottom: "6px" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={{
                width: "100%", padding: "10px 12px", border: "1px solid var(--line)",
                borderRadius: "8px", fontSize: "14px", background: "var(--paper)",
                color: "var(--ink)", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{
              background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px",
              padding: "10px 12px", fontSize: "13px", color: "var(--danger)",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "4px", padding: "11px", background: loading ? "var(--ink-soft)" : "var(--ink)",
              color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px",
              fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", transition: "background .15s",
            }}
          >
            {loading ? "Memproses…" : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
