"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const NDS_LOGO = (
  <svg viewBox="0 0 210 72" height="44" aria-label="NDS" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="48" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="52" fontWeight="800" fill="#fff">N</text>
    <path d="M68 6 C90 6 104 20 104 36 C104 52 90 66 68 66" stroke="#00AFA0" strokeWidth="7" fill="none" strokeLinecap="round"/>
    <text x="108" y="48" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="52" fontWeight="800" fill="#fff">S</text>
    <text x="148" y="28" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="rgba(255,255,255,.6)">NUSANTARA</text>
    <text x="148" y="42" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="rgba(255,255,255,.6)">
      <tspan fill="#00AFA0">D</tspan>UTA
    </text>
    <text x="148" y="56" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="rgba(255,255,255,.6)">SOLUSINDO</text>
  </svg>
);

const FEATURES = [
  { icon: "💼", title: "Pipeline Deal", desc: "Kelola dan pantau progress setiap deal dalam satu papan kanban." },
  { icon: "📅", title: "Tracking Kunjungan", desc: "Catat setiap visit dan reschedule otomatis ke kalender tim." },
  { icon: "📊", title: "Laporan Aktivitas", desc: "Ringkasan performa sales per periode dengan data real-time." },
];

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
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Left: Branding panel ── */}
      <div className="lp-brand" style={{
        flex: "0 0 52%", position: "relative", overflow: "hidden",
        background: "linear-gradient(145deg, #0A6E5C 0%, #0B2540 55%, #081624 100%)",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "52px 64px",
      }}>
        {/* Decorative rings */}
        <div style={{
          position: "absolute", right: -120, top: "50%", transform: "translateY(-50%)",
          width: 480, height: 480, borderRadius: "50%",
          border: "1px solid rgba(255,255,255,.06)", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", right: -60, top: "50%", transform: "translateY(-50%)",
          width: 320, height: 320, borderRadius: "50%",
          border: "1px solid rgba(0,175,160,.14)", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          width: 160, height: 160, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,175,160,.12) 0%, transparent 70%)", pointerEvents: "none",
        }} />

        {/* Top: Logo */}
        <div>{NDS_LOGO}</div>

        {/* Middle: Headline */}
        <div>
          <div style={{
            display: "inline-block", fontSize: 10, fontWeight: 800, letterSpacing: ".22em",
            textTransform: "uppercase", background: "#00AFA0", color: "#fff",
            padding: "4px 12px", borderRadius: 6, marginBottom: 20,
          }}>Sales CRM</div>
          <h2 style={{
            fontSize: 34, fontWeight: 800, color: "#fff", margin: "0 0 14px",
            lineHeight: 1.2, letterSpacing: "-.6px", maxWidth: 380,
          }}>
            Satu platform untuk semua aktivitas sales
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.55)", lineHeight: 1.7, maxWidth: 380, margin: 0 }}>
            Dari pipeline deal hingga laporan mingguan — semua tersedia dalam satu dashboard yang terintegrasi.
          </p>

          {/* Feature cards */}
          <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 12 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                display: "flex", alignItems: "flex-start", gap: 14,
                background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 12, padding: "14px 16px",
              }}>
                <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Copyright */}
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>
          © 2025 PT Nusantara Duta Solusindo
        </div>
      </div>

      {/* ── Right: Form panel ── */}
      <div className="lp-form" style={{
        flex: 1, background: "#F2F0E9",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px 40px",
      }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          {/* Mobile-only logo */}
          <div className="lp-mobile-logo" style={{ display: "none", marginBottom: 28 }}>
            <svg viewBox="0 0 210 72" height="36" aria-label="NDS" xmlns="http://www.w3.org/2000/svg">
              <text x="0" y="48" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="52" fontWeight="800" fill="#58595B">N</text>
              <path d="M68 6 C90 6 104 20 104 36 C104 52 90 66 68 66" stroke="#00AFA0" strokeWidth="7" fill="none" strokeLinecap="round"/>
              <text x="108" y="48" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="52" fontWeight="800" fill="#58595B">S</text>
              <text x="148" y="28" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="#58595B">NUSANTARA</text>
              <text x="148" y="42" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="#58595B"><tspan fill="#00AFA0">D</tspan>UTA</text>
              <text x="148" y="56" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill="#58595B">SOLUSINDO</text>
            </svg>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ width: 32, height: 3, background: "#0A6E5C", borderRadius: 999, marginBottom: 18 }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0B1B2B", margin: "0 0 6px", letterSpacing: "-.4px" }}>
              Selamat datang
            </h1>
            <p style={{ fontSize: 13, color: "#3A4D60", margin: 0, lineHeight: 1.5 }}>
              Masuk dengan akun yang diberikan admin
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Email */}
            <div>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".08em",
                textTransform: "uppercase", color: "#3A4D60", marginBottom: 7,
              }}>Email</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
                  fontSize: 14, color: "#94A3B8", pointerEvents: "none",
                }}>✉</span>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required autoComplete="email" placeholder="nama@nds.co.id"
                  style={{
                    width: "100%", padding: "12px 12px 12px 38px",
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
                textTransform: "uppercase", color: "#3A4D60", marginBottom: 7,
              }}>Password</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
                  fontSize: 14, color: "#94A3B8", pointerEvents: "none",
                }}>🔒</span>
                <input
                  type={showPass ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password" placeholder="••••••••"
                  style={{
                    width: "100%", padding: "12px 40px 12px 38px",
                    border: "1.5px solid #D8D3C6", borderRadius: 10,
                    fontSize: 14, background: "#fff", color: "#0B1B2B",
                    outline: "none", boxSizing: "border-box", transition: "border-color .15s",
                    fontFamily: "inherit",
                  }}
                  onFocus={e => e.target.style.borderColor = "#0A6E5C"}
                  onBlur={e => e.target.style.borderColor = "#D8D3C6"}
                />
                <button type="button" onClick={() => setShowPass(s => !s)} tabIndex={-1} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", fontSize: 14,
                  color: "#94A3B8", padding: 0, lineHeight: 1,
                }}>{showPass ? "🙈" : "👁"}</button>
              </div>
            </div>

            {error && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8,
                padding: "10px 13px", fontSize: 13, color: "#B23A3A",
              }}>⚠ {error}</div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                marginTop: 2, padding: "14px", borderRadius: 10,
                background: loading ? "#3A4D60" : "#0B1B2B",
                color: "#fff", border: "none", fontSize: 14, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background .2s", letterSpacing: ".04em", fontFamily: "inherit",
              }}
              onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.background = "#0A6E5C"; }}
              onMouseLeave={e => { if (!loading) (e.target as HTMLButtonElement).style.background = "#0B1B2B"; }}
            >{loading ? "⏳ Memproses…" : "Masuk →"}</button>
          </form>

          <p style={{ marginTop: 20, fontSize: 12, color: "#94A3B8", textAlign: "center" }}>
            Lupa password?{" "}
            <span style={{ color: "#0A6E5C", fontWeight: 600, cursor: "default" }}>Hubungi administrator.</span>
          </p>

          <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #D8D3C6" }}>
            <p style={{ fontSize: 11, color: "#94A3B8", textAlign: "center", margin: 0 }}>
              © 2025 PT Nusantara Duta Solusindo · Internal use only
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .lp-brand { display: none !important; }
          .lp-form {
            background: linear-gradient(145deg, #0A6E5C 0%, #0B2540 55%, #081624 100%) !important;
            align-items: stretch !important;
            padding: 0 !important;
          }
          .lp-form > div {
            background: #F2F0E9;
            border-radius: 20px 20px 0 0;
            margin-top: auto;
            padding: 32px 24px 44px;
            max-width: 100% !important;
          }
          .lp-mobile-logo { display: block !important; }
        }
      `}</style>
    </div>
  );
}
