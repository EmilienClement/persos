import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dressing",
    short_name: "Dressing",
    description: "Mon dressing connecté",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f0e8",
    theme_color: "#1c1b19",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
