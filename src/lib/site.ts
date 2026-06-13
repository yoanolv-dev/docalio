// Configuration du site public (source unique pour SEO, nav et footer).

export const SITE = {
  name: "Docalio",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://docalio.app",
  tagline: "Le portail documentaire client sécurisé",
  description:
    "Docalio transforme vos fichiers sensibles en un portail client sécurisé, traçable et actionnable. Partagez vos documents, suivez les ouvertures et recueillez les décisions.",
} as const;

export const MARKETING_NAV: { label: string; href: string }[] = [
  { label: "Fonctionnalités", href: "/fonctionnalites" },
  { label: "Tarifs", href: "/tarifs" },
  { label: "Sécurité", href: "/securite" },
  { label: "Cas d'usage", href: "/cas-usage" },
];
