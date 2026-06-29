import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NDS Sales CRM",
  description: "Sales Pipeline · Banking / Multifinance / Insurance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
