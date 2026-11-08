import type { MetadataRoute } from "next";

// Installable customer app (PWA first, APK via Capacitor only if time remains: plan assumption A1).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SiCart",
    short_name: "SiCart",
    description: "Smart shopping cart: no checkout queues, personal offers, in-store navigation and a voice assistant.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f6f3",
    theme_color: "#12b76a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
