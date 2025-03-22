import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reddit Mobile",
    short_name: "Reddit",
    description: "A mobile-friendly Reddit client",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ff4500",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  }
}

