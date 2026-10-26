import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gopal Picture Palace – Billing",
    short_name: "GPP Billing",
    description: "E-bills, customers and payment tracking",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f5f3",
    theme_color: "#2c3d57",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
