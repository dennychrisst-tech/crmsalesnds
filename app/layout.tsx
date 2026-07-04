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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
