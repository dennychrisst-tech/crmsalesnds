// Shared NDS mark — used in the post-login header (CRMApp) and on the login
// page (big + mobile-hero variants). Previously this was a hand-coded SVG
// approximation of the brand mark (wrong letter spacing, wrong D position,
// wrong font) — now it's the actual logo asset (public/logo-white.png,
// recolored from the official public/logo.png for dark backgrounds).
export default function Logo({ height = 44 }: { height?: number }) {
  return (
    // Height set via inline style, not just the HTML attribute — Tailwind's
    // preflight resets `img { height: auto }`, which otherwise wins over the
    // bare attribute and lets the image stretch to its container's width
    // instead of respecting the intended height. The mobile ".header-brand
    // img" override uses !important for the same reason (inline style would
    // otherwise beat it).
    // Plain <img> (not next/image) since this is a small, already-tiny
    // static asset with no responsive/CLS concerns worth the extra config.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-white.png"
      alt="NDS – Nusantara Duta Solusindo"
      style={{ height, width: "auto", display: "inline-block" }}
    />
  );
}
