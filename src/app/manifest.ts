import type { MetadataRoute } from "next";

// Application installable (Android, iOS, ordinateur) : l'espace de travail
// s'ouvre en plein écran, sans barre d'adresse, depuis l'écran d'accueil.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "Docalio : le drive de votre entreprise",
    short_name: "Docalio",
    description: "Vos fichiers, vos espaces clients et vos partages sécurisés, partout.",
    lang: "fr",
    dir: "ltr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f5f7fb",
    theme_color: "#ffffff",
    categories: ["business", "productivity"],
    launch_handler: { client_mode: "focus-existing" },
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Fichiers récents", url: "/dashboard/recents", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Rechercher", url: "/dashboard/recherche", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Liens de partage", url: "/dashboard/partages", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
