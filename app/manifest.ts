import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NDS Sales CRM",
    short_name: "NDS CRM",
    description: "Sales Pipeline · Banking / Multifinance / Insurance",
    start_url: "/",
    display: "standalone",
    background_color: "#F2F0E9",
    theme_color: "#00AFA0",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
