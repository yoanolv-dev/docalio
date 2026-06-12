// =============================================================================
// Docalio — Sprint 9 — Définitions des plans, quotas & limites (sans Stripe)
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
  name: string;
  /** Prix mensuel en euros, ou `null` pour « sur devis ». */
  priceEur: number | null;
  tagline: string;
  limits: PlanLimits;
  /** Personnalisation du portail (logo/couleurs) mise en avant à partir de Pro. */
  branding: boolean;
  prioritySupport: boolean;
  /** Points clés affichés dans la grille des plans. */
  highlights: string[];
}

/**
 * Plafond Storage du bucket `documents` (cf. migration). Il borne tous les
 * uploads en défense en profondeur, y compris pour l'offre Enterprise dont la
 * limite applicative est « sur mesure ».
 */
export const BUCKET_MAX_FILE_BYTES = 1 * GB;

export const PLANS: Record<OrganizationPlan, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceEur: 19,
    tagline: "Pour lancer votre activité documentaire.",
    limits: {
      storageBytes: 10 * GB,
      activeWorkspaces: 10,
      users: 1,
      maxFileBytes: 250 * MB,
      historyDays: 30,
    },
    branding: false,
    prioritySupport: false,
    highlights: [
      "10 Go de stockage",
      "10 espaces clients actifs",
      "1 utilisateur",
      "Fichiers jusqu'à 250 Mo",
      "Historique 30 jours",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceEur: 39,
    tagline: "Pour les indépendants et petites équipes.",
    limits: {
      storageBytes: 50 * GB,
      activeWorkspaces: 50,
      users: 3,
      maxFileBytes: 500 * MB,
      historyDays: 180,
    },
    branding: true,
    prioritySupport: false,
    highlights: [
      "50 Go de stockage",
      "50 espaces clients actifs",
      "3 utilisateurs",
      "Fichiers jusqu'à 500 Mo",
      "Historique 6 mois",
      "Branding léger du portail",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    priceEur: 79,
    tagline: "Pour les équipes qui montent en charge.",
    limits: {
      storageBytes: 200 * GB,
      activeWorkspaces: 150,
      users: 10,
      maxFileBytes: 1 * GB,
      historyDays: 365,
    },
    branding: true,
    prioritySupport: true,
    highlights: [
      "200 Go de stockage",
      "150 espaces clients actifs",
      "10 utilisateurs",
      "Fichiers jusqu'à 1 Go",
      "Historique 12 mois",
      "Support prioritaire",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    priceEur: null,
    tagline: "Limites personnalisées et accompagnement dédié.",
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
      "Espaces clients illimités",
      "Utilisateurs illimités",
      "Historique sur mesure",
      "Support dédié & SLA",
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
 * Taille de fichier réellement autorisée pour un plan. Pour Enterprise (limite
 * applicative « sur mesure »), on retombe sur le plafond du bucket.
 */
export function effectiveMaxFileBytes(plan: PlanDefinition): number {
  return plan.limits.maxFileBytes ?? BUCKET_MAX_FILE_BYTES;
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

/** Prix mensuel lisible ("19 €/mois", "Sur devis"). */
export function formatPlanPrice(plan: PlanDefinition): string {
  return plan.priceEur === null ? "Sur devis" : `${plan.priceEur} €/mois`;
}
