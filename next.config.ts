import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Supabase realtime requires this header to be absent during prerender
  // All pages are already client-side ("use client"), so static export is fine
  // Remove if you add server components / API routes later
};

export default nextConfig;
