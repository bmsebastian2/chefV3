import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GetChef - Chefs Privados de Élite",
    short_name: "GetChef",
    description: "Reserva chefs privados de élite para tu próxima experiencia gastronómica",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAFAFA",
    theme_color: "#18181B",
    categories: ["food", "lifestyle", "business"],
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Solicitar chef",
        short_name: "Solicitar",
        description: "Inicia una solicitud de chef privado",
        url: "/wizard",
        icons: [{ src: "/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Mi dashboard",
        short_name: "Dashboard",
        description: "Ve tu panel de control",
        url: "/client-dashboard",
        icons: [{ src: "/icon-192x192.png", sizes: "192x192" }],
      },
    ],
    screenshots: [],
  };
}
