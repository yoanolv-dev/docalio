// =============================================================================
// Docalio : Définitions des plans (forfait par entreprise), quotas & limites
//
// Source de vérité des plans côté code. La colonne `plan` de `organizations`
// référence un de ces identifiants ; les limites/prix vivent ici.
//
// Architecture compatible facturation plus tard : quand Stripe sera branché,
// le webhook mettra à jour `plan` / `plan_status` côté serveur. Aucune limite
// n'est codée en dur ailleurs : tout passe par `getPlan()` et les helpers.
// =============================================================================

import type { Organization, OrganizationPlan } from "@/lib/types/database";

const MB = 1024 * 1024;
const GB = 1024 * MB;

/** `null` = illimité / sur mesure (offre Enterprise). */
export interface PlanLimits {
  /** Stockage total cumulé des fichiers, en octets. */
  storageBytes: number | null;
  /** Nombre d'espaces clients au statut « actif ». */
  activeWorkspaces: number | null;
  /** Nombre d'utilisateurs (membres de l'organisation). */
  users: number | null;
  /** Taille maximale d'un fichier uploadé, en octets. */
  maxFileBytes: number | null;
  /** Fenêtre d'historique conservée, en jours (informatif en V1). */
  historyDays: number | null;
}

export interface PlanDefinition {
  id: OrganizationPlan;
  /**
   * Prix mensuel HT PAR ORGANISATION (forfait entreprise, pas au siège).
   * `0` = gratuit, `null` = sur devis. Les invités et les clients du portail
   * ne sont jamais facturés.
   */
  priceEur: number | null;
  /** Équivalent mensuel en facturation annuelle (2 mois offerts). */
  priceYearlyEur: number | null;
  name: string;
  tagline: string;
  limits: PlanLimits;
  /** Portail à vos couleurs, sans mention « Propulsé par Docalio ». */
  branding: boolean;
  prioritySupport: boolean;
  /** Points clés affichés dans la grille des plans. */
  highlights: string[];
}

/**
 * Plafond technique par fichier, fixé par l'hébergement (limite globale du
 * Storage Supabase : 50 Mo sur l'offre gratuite, jusqu'à 500 Go sur les offres
 * payantes). À relever via NEXT_PUBLIC_MAX_UPLOAD_MB quand l'infrastructure
 * le permet. Il borne tous les forfaits, Entreprise compris.
 */
export const INFRA_MAX_FILE_BYTES =
  Math.max(1, Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB) || 50) * MB;

// Forfaits par entreprise : un prix fixe, utilisateurs illimités dès l'offre
// payante, et une montée en gamme par le stockage et les fonctions de
// contrôle. Les quotas de stockage sont aussi vérifiés en base (fonction
// plan_storage_quota) : garder les deux en phase.
// Les identifiants restent ceux déjà stockés en base (aucune migration).
export const PLANS: Record<OrganizationPlan, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Gratuit",
    priceEur: 0,
    priceYearlyEur: 0,
    tagline: "Pour démarrer avec une petite équipe.",
    limits: {
      storageBytes: 2 * GB,
      activeWorkspaces: null,
      users: 3,
      maxFileBytes: 50 * MB,
      historyDays: 30,
    },
    branding: false,
    prioritySupport: false,
    highlights: [
      "Jusqu'à 3 utilisateurs",
      "2 Go de stockage",
      "Liens de partage et dépôt de fichiers",
      "Corbeille 30 jours",
    ],
  },
  pro: {
    id: "pro",
    name: "Équipe",
    priceEur: 29,
    priceYearlyEur: 24,
    tagline: "Le Drive de toute l'entreprise, sans compter les utilisateurs.",
    limits: {
      storageBytes: 200 * GB,
      activeWorkspaces: null,
      users: null,
      maxFileBytes: 5 * GB,
      historyDays: 365,
    },
    branding: true,
    prioritySupport: false,
    highlights: [
      "Utilisateurs illimités",
      "200 Go de stockage",
      "Invités externes illimités et gratuits",
      "Liens avec mot de passe et expiration",
      "Historique des versions",
      "Portail client à vos couleurs",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    priceEur: 79,
    priceYearlyEur: 66,
    tagline: "Pour les entreprises qui veulent tout contrôler.",
    limits: {
      storageBytes: 1024 * GB,
      activeWorkspaces: null,
      users: null,
      maxFileBytes: 20 * GB,
      historyDays: null,
    },
    branding: true,
    prioritySupport: true,
    highlights: [
      "Tout Équipe, avec 1 To de stockage",
      "Espaces privés, groupes et droits par espace",
      "Double authentification obligatoire",
      "Journal d'activité exportable",
      "Support prioritaire",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Sur mesure",
    priceEur: null,
    priceYearlyEur: null,
    tagline: "Volumes, conformité et accompagnement dédié.",
    limits: {
      storageBytes: null,
      activeWorkspaces: null,
      users: null,
      maxFileBytes: null,
      historyDays: null,
    },
    branding: true,
    prioritySupport: true,
    highlights: [
      "Stockage sur mesure",
      "SSO, DPA et exigences de conformité",
      "Import de votre existant",
      "Interlocuteur dédié et SLA",
    ],
  },
};

/** Ordre d'affichage (du plus petit au plus grand). */
export const PLAN_ORDER: OrganizationPlan[] = [
  "starter",
  "pro",
  "business",
  "enterprise",
];

const DEFAULT_PLAN: OrganizationPlan = "pro";

/** Récupère la définition d'un plan (retombe sur Pro si valeur inconnue). */
export function getPlan(id: OrganizationPlan | null | undefined): PlanDefinition {
  return PLANS[(id ?? DEFAULT_PLAN) as OrganizationPlan] ?? PLANS[DEFAULT_PLAN];
}

/** Plan effectif d'une organisation (tolère une migration non encore appliquée). */
export function resolvePlan(
  organization: Pick<Organization, "plan"> | null | undefined
): PlanDefinition {
  return getPlan(organization?.plan);
}

/**
 * Taille de fichier réellement autorisée : celle du forfait, bornée par le
 * plafond technique de l'hébergement.
 */
export function effectiveMaxFileBytes(plan: PlanDefinition): number {
  return Math.min(plan.limits.maxFileBytes ?? INFRA_MAX_FILE_BYTES, INFRA_MAX_FILE_BYTES);
}

// --- Helpers de quota (purs, réutilisés côté actions et UI) ------------------

/** Une limite `null` (illimité) n'est jamais atteinte. */
export function isLimitReached(used: number, limit: number | null): boolean {
  return limit !== null && used >= limit;
}

/** Reste disponible avant la limite (`null` = illimité). */
export function remaining(used: number, limit: number | null): number | null {
  return limit === null ? null : Math.max(0, limit - used);
}

/** Pourcentage d'utilisation borné à [0, 100] (`0` si illimité). */
export function usagePercent(used: number, limit: number | null): number {
  if (limit === null || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

// --- Formatage ---------------------------------------------------------------

/** Libellé compact d'une capacité de stockage : "10 Go", "250 Mo", "Sur mesure". */
export function formatStorage(bytes: number | null): string {
  if (bytes === null) return "Sur mesure";
  if (bytes >= GB) {
    const v = bytes / GB;
    return `${Number.isInteger(v) ? v : Number(v.toFixed(1))} Go`;
  }
  const v = bytes / MB;
  return `${Number.isInteger(v) ? v : Number(v.toFixed(0))} Mo`;
}

/** Libellé d'une limite numérique simple ("10", "Illimité"). */
export function formatCount(limit: number | null): string {
  return limit === null ? "Illimité" : String(limit);
}

/** Prix lisible (forfait) : "Gratuit", "29 € HT/mois" ou "Sur devis". */
export function formatPlanPrice(plan: PlanDefinition): string {
  if (plan.priceEur === null) return "Sur devis";
  if (plan.priceEur === 0) return "Gratuit";
  return `${plan.priceEur} € HT/mois`;
}
