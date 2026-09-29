// =============================================================================
// Docalio : Définitions des plans (forfait par cabinet), quotas & limites
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
   * Prix mensuel HT PAR ORGANISATION (forfait cabinet, pas au siège).
   * `0` = gratuit, `null` = sur devis. Les clients invités sur le portail ne
   * sont jamais facturés.
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
 * Plafond Storage du bucket `documents` (cf. migration). Il borne tous les
 * uploads en défense en profondeur, y compris pour l'offre Enterprise dont la
 * limite applicative est « sur mesure ».
 */
export const BUCKET_MAX_FILE_BYTES = 1 * GB;

// Forfaits par cabinet : un prix lisible, qui ne pénalise pas l'embauche d'un
// collaborateur, et une montée en gamme naturelle (utilisateurs, marque, volume).
// Les identifiants restent ceux déjà stockés en base (aucune migration).
export const PLANS: Record<OrganizationPlan, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Découverte",
    priceEur: 0,
    priceYearlyEur: 0,
    tagline: "Pour tester avec vos premiers clients.",
    limits: {
      storageBytes: 2 * GB,
      activeWorkspaces: 3,
      users: 1,
      maxFileBytes: 20 * MB,
      historyDays: 30,
    },
    branding: false,
    prioritySupport: false,
    highlights: [
      "1 utilisateur",
      "3 espaces clients actifs",
      "Collecte de pièces & décisions client",
      "Suivi des ouvertures en temps réel",
      "2 Go de stockage",
    ],
  },
  pro: {
    id: "pro",
    name: "Essentiel",
    priceEur: 29,
    priceYearlyEur: 24,
    tagline: "Pour l'indépendant ou le petit cabinet.",
    limits: {
      storageBytes: 50 * GB,
      activeWorkspaces: null,
      users: 3,
      maxFileBytes: 200 * MB,
      historyDays: 365,
    },
    branding: true,
    prioritySupport: false,
    highlights: [
      "Jusqu'à 3 utilisateurs",
      "Espaces clients illimités",
      "Clients invités illimités, gratuits",
      "Portail à vos couleurs & votre logo",
      "Pièces types par métier en un clic",
      "50 Go de stockage",
    ],
  },
  business: {
    id: "business",
    name: "Cabinet",
    priceEur: 79,
    priceYearlyEur: 66,
    tagline: "Pour les équipes de 4 à 10 personnes.",
    limits: {
      storageBytes: 250 * GB,
      activeWorkspaces: null,
      users: 10,
      maxFileBytes: 1 * GB,
      historyDays: null,
    },
    branding: true,
    prioritySupport: true,
    highlights: [
      "Tout Essentiel, jusqu'à 10 utilisateurs",
      "Groupes & droits d'accès par espace",
      "Espaces internes (Drive d'équipe)",
      "Adresse de portail à votre nom",
      "Historique d'activité illimité",
      "250 Go · support prioritaire",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Entreprise",
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
      "Utilisateurs & stockage sur mesure",
      "SSO, DPA & exigences de conformité",
      "Import de votre existant",
      "Interlocuteur dédié & SLA",
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

/** Prix lisible (forfait) : "Gratuit", "29 € HT/mois" ou "Sur devis". */
export function formatPlanPrice(plan: PlanDefinition): string {
  if (plan.priceEur === null) return "Sur devis";
  if (plan.priceEur === 0) return "Gratuit";
  return `${plan.priceEur} € HT/mois`;
}
