"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

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
      minHeight: "100vh",
      display: "flex",
      background: "linear-gradient(135deg, #0A6E5C 0%, #0B1B2B 60%, #1a2d45 100%)",
    }}>
      {/* Left panel — branding */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "60px 56px", color: "#fff",
      }} className="login-brand-panel">
        <svg viewBox="0 0 210 72" height="52" aria-label="NDS" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: 28 }}>
          <text x="0" y="48" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="52" fontWeight="800" fill="#fff">N</text>
          <path d="M68 6 C90 6 104 20 104 36 C104 52 90 66 68 66" stroke="#00AFA0" strokeWidth="7" fill="none" strokeLinecap="round"/>
          <text x="108" y="48" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="52" fontWeight="800" fill="#fff">S</text>
          <text x="148" y="28" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="rgba(255,255,255,.75)">NUSANTARA</text>
          <text x="148" y="42" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="rgba(255,255,255,.75)">
            <tspan fill="#00AFA0">D</tspan>UTA
          </text>
          <text x="148" y="56" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="rgba(255,255,255,.75)">SOLUSINDO</text>
        </svg>

        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: ".22em", textTransform: "uppercase",
          background: "#00AFA0", color: "#fff", display: "inline-block",
          padding: "4px 12px", borderRadius: 6, marginBottom: 28, alignSelf: "flex-start",
        }}>Sales CRM</div>

        <h2 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 12px", lineHeight: 1.2, letterSpacing: "-.5px" }}>
          Kelola pipeline<br />& aktivitas tim
        </h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.65)", lineHeight: 1.65, maxWidth: 320, margin: 0 }}>
          Platform CRM internal NDS untuk tracking kunjungan, deal, project, dan laporan aktivitas sales.
        </p>

        <div style={{ marginTop: 48, display: "flex", gap: 28 }}>
          {[["💼", "Pipeline"], ["📅", "Kunjungan"], ["📊", "Laporan"]].map(([icon, label]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)", fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        width: 420, flexShrink: 0, background: "#F2F0E9",
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "48px 44px",
      }} className="login-form-panel">
        {/* Mobile-only logo */}
        <div className="login-mobile-logo" style={{ display: "none", marginBottom: 28, textAlign: "center" }}>
          <svg viewBox="0 0 210 72" height="36" aria-label="NDS" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block" }}>
            <text x="0" y="48" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="52" fontWeight="800" fill="#58595B">N</text>
            <path d="M68 6 C90 6 104 20 104 36 C104 52 90 66 68 66" stroke="#00AFA0" strokeWidth="7" fill="none" strokeLinecap="round"/>
            <text x="108" y="48" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="52" fontWeight="800" fill="#58595B">S</text>
            <text x="148" y="28" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="#58595B">NUSANTARA</text>
            <text x="148" y="42" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="#58595B"><tspan fill="#00AFA0">D</tspan>UTA</text>
            <text x="148" y="56" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="#58595B">SOLUSINDO</text>
          </svg>
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{ width: 36, height: 4, background: "#0A6E5C", borderRadius: 999, marginBottom: 20 }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0B1B2B", margin: "0 0 6px", letterSpacing: "-.3px" }}>
            Selamat datang
          </h1>
          <p style={{ fontSize: 13, color: "#3A4D60", margin: 0 }}>
            Masuk dengan akun yang diberikan admin
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 28 }}>
          {/* Email */}
          <div>
            <label style={{
              display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".08em",
              textTransform: "uppercase", color: "#3A4D60", marginBottom: 6,
            }}>Email</label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                fontSize: 15, color: "#3A4D60", pointerEvents: "none",
              }}>✉</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="nama@nds.co.id"
                style={{
                  width: "100%", padding: "11px 12px 11px 36px",
                  border: "1.5px solid #D8D3C6", borderRadius: 10,
                  fontSize: 14, background: "#fff", color: "#0B1B2B",
                  outline: "none", boxSizing: "border-box", transition: "border-color .15s",
                  fontFamily: "inherit",
                }}
                onFocus={e => e.target.style.borderColor = "#0A6E5C"}
                onBlur={e => e.target.style.borderColor = "#D8D3C6"}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{
              display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".08em",
              textTransform: "uppercase", color: "#3A4D60", marginBottom: 6,
            }}>Password</label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                fontSize: 15, color: "#3A4D60", pointerEvents: "none",
              }}>🔒</span>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  width: "100%", padding: "11px 40px 11px 36px",
                  border: "1.5px solid #D8D3C6", borderRadius: 10,
                  fontSize: 14, background: "#fff", color: "#0B1B2B",
                  outline: "none", boxSizing: "border-box", transition: "border-color .15s",
                  fontFamily: "inherit",
                }}
                onFocus={e => e.target.style.borderColor = "#0A6E5C"}
                onBlur={e => e.target.style.borderColor = "#D8D3C6"}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", fontSize: 14,
                  color: "#3A4D60", padding: 0, lineHeight: 1,
                }}
                tabIndex={-1}
              >{showPass ? "🙈" : "👁"}</button>
            </div>
          </div>

          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8,
              padding: "10px 12px", fontSize: 13, color: "#B23A3A",
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4, padding: "13px", borderRadius: 10,
              background: loading ? "#3A4D60" : "#0B1B2B",
              color: "#fff", border: "none", fontSize: 14, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background .15s, transform .1s",
              letterSpacing: ".03em", fontFamily: "inherit",
            }}
            onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.background = "#0A6E5C"; }}
            onMouseLeave={e => { if (!loading) (e.target as HTMLButtonElement).style.background = "#0B1B2B"; }}
          >
            {loading ? "⏳ Memproses…" : "Masuk →"}
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: 12, color: "#3A4D60", textAlign: "center" }}>
          Lupa password? Hubungi administrator.
        </p>

        <div style={{ paddingTop: 32, borderTop: "1px solid #D8D3C6", marginTop: 40 }}>
          <p style={{ fontSize: 11, color: "#3A4D60", textAlign: "center", margin: 0, opacity: .6 }}>
            © 2025 PT Nusantara Duta Solusindo · Internal use only
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 680px) {
          .login-brand-panel { display: none !important; }
          .login-form-panel { width: 100% !important; padding: 36px 28px !important; }
          .login-mobile-logo { display: block !important; }
        }
      `}</style>
    </div>
  );
}
