import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
