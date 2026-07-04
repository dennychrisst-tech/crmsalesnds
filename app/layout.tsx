import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Self-hosted via next/font (no runtime request to Google Fonts, no CLS) —
// exposed as a CSS variable so globals.css can layer system-font fallbacks
// after it instead of hard-depending on the font object being in scope there.
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "NDS Sales CRM",
  description: "Sales Pipeline · Banking / Multifinance / Insurance",
  applicationName: "NDS Sales CRM",
  appleWebApp: {
    capable: true,
    title: "NDS CRM",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#00AFA0",
};

// Sets data-theme before first paint (from localStorage, falling back to the
// OS preference) so switching pages/reloading never flashes the wrong theme
// while React hydrates — this has to run as a plain blocking script, not a
// useEffect, since useEffect only fires after the initial paint.
const THEME_BOOTSTRAP = `
(function () {
  try {
    var stored = localStorage.getItem("crm_theme");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
