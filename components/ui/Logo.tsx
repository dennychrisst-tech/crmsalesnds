// Shared NDS mark — used in the post-login header (CRMApp) and on the login
// page (big + mobile-hero variants). Previously each spot hand-copied the
// same SVG with viewBox="0 0 210 72"; at font-size 10.5 + letterSpacing 1.5,
// "NUSANTARA" and "SOLUSINDO" (9 chars each) run past x=210 and get clipped.
// Widened the viewBox and trimmed the spacing so both words render in full.
export default function Logo({ height = 44 }: { height?: number }) {
  return (
    <svg viewBox="0 0 230 72" height={height} aria-label="NDS – Nusantara Duta Solusindo" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block" }}>
      <text x="0" y="48" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="52" fontWeight="800" fill="#fff">N</text>
      <path d="M48 6 C70 6 84 20 84 36 C84 52 70 66 48 66" stroke="#00AFA0" strokeWidth="7" fill="none" strokeLinecap="round" />
      <text x="108" y="48" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="52" fontWeight="800" fill="#fff">S</text>
      <text x="148" y="28" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.2" fill="rgba(255,255,255,.58)">NUSANTARA</text>
      <text x="148" y="42" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.2" fill="rgba(255,255,255,.58)">
        <tspan fill="#00AFA0">D</tspan>UTA
      </text>
      <text x="148" y="56" fontFamily="'Segoe UI',system-ui,sans-serif" fontSize="10.5" fontWeight="700" letterSpacing="1.2" fill="rgba(255,255,255,.58)">SOLUSINDO</text>
    </svg>
  );
}
