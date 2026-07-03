"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, CalendarDays, TrendingUp, Mail, Lock, Eye, EyeOff, type LucideIcon } from "lucide-react";
import Logo from "@/components/ui/Logo";

const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Briefcase, title: "Pipeline Project", desc: "Kelola dan pantau progress setiap project dalam satu papan kanban." },
  { icon: CalendarDays, title: "Tracking Kunjungan", desc: "Catat setiap visit dan reschedule otomatis ke kalender tim." },
  { icon: TrendingUp, title: "Laporan Aktivitas", desc: "Ringkasan performa sales per periode dengan data real-time." },
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
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "52px 60px",
      }}>
        {/* Decorative rings — centered */}
        <div style={{
          position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
          width: 560, height: 560, borderRadius: "50%",
          border: "1px solid rgba(255,255,255,.05)", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
          width: 380, height: 380, borderRadius: "50%",
          border: "1px solid rgba(0,175,160,.10)", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
          width: 200, height: 200, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,175,160,.10) 0%, transparent 70%)", pointerEvents: "none",
        }} />

        {/* Center content */}
        <div style={{ position: "relative", textAlign: "center", maxWidth: 400 }}>
          {/* Big logo */}
          <div style={{ marginBottom: 20 }}>
            <Logo height={72} />
          </div>

          {/* Divider */}
          <div style={{ width: 40, height: 2, background: "#00AFA0", borderRadius: 999, margin: "0 auto 20px" }} />

          <div style={{
            display: "inline-block", fontSize: 10, fontWeight: 800, letterSpacing: ".22em",
            textTransform: "uppercase", background: "#00AFA0", color: "#fff",
            padding: "4px 14px", borderRadius: 6, marginBottom: 22,
          }}>Sales CRM</div>

          <h2 style={{
            fontSize: 28, fontWeight: 800, color: "#fff", margin: "0 0 12px",
            lineHeight: 1.25, letterSpacing: "-.5px",
          }}>
            Satu platform untuk<br />semua aktivitas sales
          </h2>
          <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.5)", lineHeight: 1.7, margin: "0 0 36px" }}>
            Pipeline · Kunjungan · Laporan · Project
          </p>

          {/* Feature cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                display: "flex", alignItems: "center", gap: 14,
                background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 12, padding: "12px 16px",
              }}>
                <span style={{ flexShrink: 0, color: "#00AFA0", display: "inline-flex" }}><f.icon size={19} /></span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{f.title}</div>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.45)", lineHeight: 1.4, marginTop: 1 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Copyright */}
        <div style={{ position: "absolute", bottom: 28, fontSize: 11, color: "rgba(255,255,255,.25)" }}>
          © {new Date().getFullYear()} PT Nusantara Duta Solusindo
        </div>
      </div>

      {/* ── Right: Form panel ── */}
      <div className="lp-form" style={{
        flex: 1, background: "#F2F0E9",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px 40px",
      }}>
        {/* Mobile-only hero — fills the gradient area above the form card */}
        <div className="lp-mobile-hero" style={{
          display: "none", position: "relative", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "36px 24px 24px", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
            width: 230, height: 230, borderRadius: "50%",
            border: "1px solid rgba(255,255,255,.07)", pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
            width: 150, height: 150, borderRadius: "50%",
            border: "1px solid rgba(0,175,160,.16)", pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
            width: 90, height: 90, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,175,160,.18) 0%, transparent 70%)", pointerEvents: "none",
          }} />

          <div style={{ position: "relative", textAlign: "center" }}>
            <Logo height={48} />
            <div style={{ width: 32, height: 2, background: "#00AFA0", borderRadius: 999, margin: "14px auto 12px" }} />
            <div style={{
              display: "inline-block", fontSize: 9.5, fontWeight: 800, letterSpacing: ".2em",
              textTransform: "uppercase", background: "#00AFA0", color: "#fff",
              padding: "3px 12px", borderRadius: 6,
            }}>Sales CRM</div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.55)", marginTop: 12, lineHeight: 1.5 }}>
              Pipeline · Kunjungan · Laporan · Project
            </p>
          </div>
        </div>

        <div className="lp-form-card" style={{ width: "100%", maxWidth: 360 }}>
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
                  display: "inline-flex", color: "#94A3B8", pointerEvents: "none",
                }}><Mail size={15} /></span>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required autoComplete="email" placeholder="nama@nds.co.id"
                  style={{
                    width: "100%", padding: "12px 12px 12px 38px",
                    border: "1.5px solid #D8D3C6", borderRadius: 10,
                    fontSize: 14, background: "#fff", color: "#0B1B2B",
                    outline: "none", boxSizing: "border-box", transition: "border-color .15s, box-shadow .15s",
                    fontFamily: "inherit",
                  }}
                  onFocus={e => { e.target.style.borderColor = "#0A6E5C"; e.target.style.boxShadow = "0 0 0 3px rgba(0,175,160,.12)"; }}
                  onBlur={e => { e.target.style.borderColor = "#D8D3C6"; e.target.style.boxShadow = "none"; }}
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
                  display: "inline-flex", color: "#94A3B8", pointerEvents: "none",
                }}><Lock size={15} /></span>
                <input
                  type={showPass ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password" placeholder="••••••••"
                  style={{
                    width: "100%", padding: "12px 40px 12px 38px",
                    border: "1.5px solid #D8D3C6", borderRadius: 10,
                    fontSize: 14, background: "#fff", color: "#0B1B2B",
                    outline: "none", boxSizing: "border-box", transition: "border-color .15s, box-shadow .15s",
                    fontFamily: "inherit",
                  }}
                  onFocus={e => { e.target.style.borderColor = "#0A6E5C"; e.target.style.boxShadow = "0 0 0 3px rgba(0,175,160,.12)"; }}
                  onBlur={e => { e.target.style.borderColor = "#D8D3C6"; e.target.style.boxShadow = "none"; }}
                />
                <button type="button" onClick={() => setShowPass(s => !s)} tabIndex={-1} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  display: "inline-flex", color: "#94A3B8", padding: 0, lineHeight: 1,
                }}>{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
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
              © {new Date().getFullYear()} PT Nusantara Duta Solusindo · Internal use only
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes lpFadeIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .lp-brand { animation: lpFadeIn .45s ease; }
        .lp-form-card { animation: lpFadeIn .45s ease .08s both; }

        @media (max-width: 720px) {
          .lp-brand { display: none !important; }
          .lp-form {
            background: linear-gradient(145deg, #0A6E5C 0%, #0B2540 55%, #081624 100%) !important;
            align-items: stretch !important;
            flex-direction: column !important;
            padding: 0 !important;
          }
          .lp-mobile-hero { display: flex !important; flex: 1; min-height: 160px; }
          .lp-form-card {
            background: #F2F0E9;
            border-radius: 20px 20px 0 0;
            margin-top: auto;
            padding: 32px 24px 44px;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
