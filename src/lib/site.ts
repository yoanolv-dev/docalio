// Configuration du site public (source unique pour SEO, nav et footer).

export const SITE = {
  name: "Docalio",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://docalio.app",
  tagline: "Le portail client qui récupère vos pièces et fait valider vos documents",
  description:
    "Docalio est le portail client sécurisé des cabinets et agences : demandez les pièces, votre client les dépose sans compte, fait valider vos documents et vous suivez tout en temps réel. Hébergé en Europe, sans engagement.",
  email: "contact@docalio.app",
} as const;

/**
 * Mentions légales. À compléter avant la mise en ligne publique : ces champs
 * sont affichés tels quels sur /mentions-legales (aucune donnée inventée).
 */
export const LEGAL = {
  publisher: process.env.NEXT_PUBLIC_LEGAL_PUBLISHER ?? "Docalio",
  legalForm: process.env.NEXT_PUBLIC_LEGAL_FORM ?? "Entreprise en cours d'immatriculation",
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS ?? "Adresse communiquée sur demande",
  siren: process.env.NEXT_PUBLIC_LEGAL_SIREN ?? null,
  director: process.env.NEXT_PUBLIC_LEGAL_DIRECTOR ?? null,
  appHost: process.env.NEXT_PUBLIC_LEGAL_APP_HOST ?? null,
  dataHost: "Supabase — base de données et fichiers hébergés dans l'Union européenne (région Francfort, Allemagne)",
} as const;

export interface NavLink {
  label: string;
  href: string;
  description?: string;
}

export const SOLUTIONS_NAV: NavLink[] = [
  { label: "Experts-comptables", href: "/solutions/experts-comptables", description: "Collecte des pièces et bilans validés" },
  { label: "Avocats & notaires", href: "/solutions/avocats", description: "Dossiers clients confidentiels" },
  { label: "Agences & studios", href: "/solutions/agences", description: "Briefs, livrables, validations" },
  { label: "Immobilier", href: "/solutions/immobilier", description: "Dossiers locataires et acquéreurs" },
  { label: "Conseil & freelances", href: "/solutions/conseil", description: "Missions et comptes-rendus" },
  { label: "Bâtiment & artisans", href: "/solutions/btp", description: "Devis, plans, chantiers" },
];

export const COMPARE_NAV: NavLink[] = [
  { label: "Docalio vs SharePoint", href: "/comparatif/sharepoint" },
  { label: "Docalio vs J-Doc", href: "/comparatif/j-doc" },
  { label: "Docalio vs e-mail & WeTransfer", href: "/comparatif/email-wetransfer" },
  { label: "Docalio vs Google Drive", href: "/comparatif/google-drive" },
];

export const MARKETING_NAV: NavLink[] = [
  { label: "Fonctionnalités", href: "/fonctionnalites" },
  { label: "Tarifs", href: "/tarifs" },
  { label: "Sécurité", href: "/securite" },
];

export const LEGAL_NAV: NavLink[] = [
  { label: "Mentions légales", href: "/mentions-legales" },
  { label: "Confidentialité", href: "/confidentialite" },
  { label: "Conditions d'utilisation", href: "/conditions" },
];
