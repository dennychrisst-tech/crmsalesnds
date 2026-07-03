// Shared NDS mark — used in the post-login header (CRMApp) and on the login
// page (big + mobile-hero variants). Previously this was a hand-coded SVG
// approximation of the brand mark (wrong letter spacing, wrong D position,
// wrong font) — now it's the actual logo asset (public/logo-white.png,
// recolored from the official public/logo.png for dark backgrounds).
export default function Logo({ height = 44 }: { height?: number }) {
  return (
    // Sized via the `height` attribute (not inline style) so the mobile
    // ".header-brand img" CSS override can still shrink it — an inline
    // style would beat that stylesheet rule regardless of specificity.
    // Plain <img> (not next/image) since this is a small, already-tiny
    // static asset with no responsive/CLS concerns worth the extra config.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-white.png"
      alt="NDS – Nusantara Duta Solusindo"
      height={height}
      style={{ display: "inline-block" }}
    />
  );
}
