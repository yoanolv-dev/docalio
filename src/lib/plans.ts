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
  /**
   * Prix mensuel PAR UTILISATEUR (siège) en euros. `0` = gratuit,
   * `null` = sur devis. Les destinataires externes (portail client) ne sont
   * jamais facturés : seuls les sièges internes comptent.
   */
  priceEur: number | null;
  name: string;
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
    name: "Solo",
    priceEur: 0,
    tagline: "Pour démarrer, en solo ou à deux.",
    limits: {
      storageBytes: 5 * GB,
      activeWorkspaces: null,
      users: 2,
      maxFileBytes: 100 * MB,
      historyDays: 30,
    },
    branding: false,
    prioritySupport: false,
    highlights: [
      "Jusqu'à 2 utilisateurs",
      "Espaces internes & clients illimités",
      "Partages externes illimités — gratuits",
      "5 Go de stockage",
      "Fichiers jusqu'à 100 Mo",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceEur: 9,
    tagline: "Pour les équipes qui collaborent au quotidien.",
    limits: {
      storageBytes: 100 * GB,
      activeWorkspaces: null,
      users: null,
      maxFileBytes: 1 * GB,
      historyDays: 180,
    },
    branding: true,
    prioritySupport: false,
    highlights: [
      "Utilisateurs illimités (au siège)",
      "Espaces internes & clients illimités",
      "Partages externes illimités — gratuits",
      "Groupes & accès par espace",
      "100 Go de stockage · fichiers 1 Go",
      "Branding du portail client",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    priceEur: 18,
    tagline: "Pour les organisations qui montent en charge.",
    limits: {
      storageBytes: 500 * GB,
      activeWorkspaces: null,
      users: null,
      maxFileBytes: 1 * GB,
      historyDays: 365,
    },
    branding: true,
    prioritySupport: true,
    highlights: [
      "Tout le plan Pro",
      "500 Go de stockage",
      "Historique 12 mois",
      "Contrôle d'accès avancé par groupe",
      "Support prioritaire",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    priceEur: null,
    tagline: "Sécurité, conformité et accompagnement dédié.",
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
      "Utilisateurs illimités",
      "SSO, exigences de conformité",
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

/**
 * Prix lisible. Tarification au siège : "Gratuit", "9 €/utilisateur/mois",
 * ou "Sur devis".
 */
export function formatPlanPrice(plan: PlanDefinition): string {
  if (plan.priceEur === null) return "Sur devis";
  if (plan.priceEur === 0) return "Gratuit";
  return `${plan.priceEur} €/utilisateur/mois`;
}
