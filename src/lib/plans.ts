// =============================================================================
// Docalio — Plans du Drive professionnel : Gratuit, Pro, Business, Entreprise
//
// Source de vérité des plans côté code. La colonne `plan` de `organizations`
// référence un de ces identifiants (les identifiants historiques starter /
// pro / business / enterprise sont conservés en base — aucune migration).
//
// Modèle : un forfait PAR ORGANISATION (jamais au siège), un plan Gratuit
// permanent de 5 Go, et 30 jours d'essai du plan Pro à l'inscription
// (`organizations.trial_ends_at`, posé par la base). Les quotas de stockage
// sont AUSSI appliqués en base (fonction plan_storage_quota + trigger).
//
// Architecture compatible facturation : quand Stripe sera branché, le webhook
// mettra à jour `plan` / `plan_status` côté serveur. Aucune limite n'est codée
// en dur ailleurs : tout passe par `resolvePlan()` et les helpers.
// =============================================================================

import type { Organization, OrganizationPlan } from "@/lib/types/database";

const MB = 1024 * 1024;
const GB = 1024 * MB;

/** Durée de l'essai Pro offert à l'inscription (jours). */
export const TRIAL_DAYS = 30;

/** `null` = illimité / sur mesure (offre Entreprise). */
export interface PlanLimits {
  /** Stockage total cumulé des fichiers (versions comprises), en octets. */
  storageBytes: number | null;
  /** Nombre d'espaces au statut « actif ». */
  activeWorkspaces: number | null;
  /** Nombre d'utilisateurs (membres de l'organisation, invités exclus). */
  users: number | null;
  /** Taille maximale d'un fichier uploadé, en octets. */
  maxFileBytes: number | null;
  /** Fenêtre d'historique d'activité conservée, en jours (informatif en V1). */
  historyDays: number | null;
}

export interface PlanDefinition {
  id: OrganizationPlan;
  /**
   * Prix mensuel HT PAR ORGANISATION (forfait, pas au siège).
   * `0` = gratuit, `null` = sur devis. Les invités et les destinataires de
   * liens ne sont jamais facturés.
   */
  priceEur: number | null;
  /** Équivalent mensuel en facturation annuelle (2 mois offerts). */
  priceYearlyEur: number | null;
  name: string;
  tagline: string;
  limits: PlanLimits;
  /** Pages de partage à vos couleurs, sans mention « Propulsé par Docalio ». */
  branding: boolean;
  /** Domaine personnalisé (drive.monentreprise.fr) en plus du sous-domaine. */
  customDomain: boolean;
  prioritySupport: boolean;
  /** Points clés affichés dans la grille des plans. */
  highlights: string[];
}

/**
 * Plafond Storage du bucket `documents` (cf. migration). Il borne tous les
 * uploads en défense en profondeur, y compris pour l'offre Entreprise dont la
 * limite applicative est « sur mesure ».
 */
export const BUCKET_MAX_FILE_BYTES = 1 * GB;

export const PLANS: Record<OrganizationPlan, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Gratuit",
    priceEur: 0,
    priceYearlyEur: 0,
    tagline: "Le drive complet, offert. Pour toujours.",
    limits: {
      storageBytes: 5 * GB,
      activeWorkspaces: null,
      users: 3,
      maxFileBytes: 100 * MB,
      historyDays: 30,
    },
    branding: false,
    customDomain: false,
    prioritySupport: false,
    highlights: [
      "5 Go offerts, sans limite de durée",
      "Jusqu'à 3 utilisateurs",
      "Espaces et dossiers illimités",
      "Sous-domaine inclus : vous.docalio.com",
      "Liens sécurisés (mot de passe, expiration)",
      "Corbeille 30 jours & versions de fichiers",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceEur: 29,
    priceYearlyEur: 24,
    tagline: "Pour les équipes qui travaillent avec leurs clients.",
    limits: {
      storageBytes: 200 * GB,
      activeWorkspaces: null,
      users: 10,
      maxFileBytes: 1 * GB,
      historyDays: 365,
    },
    branding: true,
    customDomain: false,
    prioritySupport: false,
    highlights: [
      "200 Go de stockage",
      "Jusqu'à 10 utilisateurs — prix par organisation",
      "Pages de partage à votre marque, sans mention Docalio",
      "Collecte de pièces & validation de documents",
      "Fichiers jusqu'à 1 Go",
      "Invités illimités — gratuits",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    priceEur: 79,
    priceYearlyEur: 66,
    tagline: "Pour les structures qui exigent contrôle et conformité.",
    limits: {
      storageBytes: 1024 * GB,
      activeWorkspaces: null,
      users: null,
      maxFileBytes: 1 * GB,
      historyDays: null,
    },
    branding: true,
    customDomain: true,
    prioritySupport: true,
    highlights: [
      "1 To de stockage",
      "Utilisateurs illimités",
      "Domaine personnalisé : drive.votre-entreprise.fr",
      "Groupes, droits par espace & double authentification exigible",
      "Journal d'activité illimité",
      "Support prioritaire",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Entreprise",
    priceEur: null,
    priceYearlyEur: null,
    tagline: "Volumes, conformité et accompagnement dédiés.",
    limits: {
      storageBytes: null,
      activeWorkspaces: null,
      users: null,
      maxFileBytes: null,
      historyDays: null,
    },
    branding: true,
    customDomain: true,
    prioritySupport: true,
    highlights: [
      "Stockage & utilisateurs sur mesure",
      "SSO, DPA & exigences de conformité",
      "Import de votre existant (Drive, Dropbox, serveur)",
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
const FREE_PLAN: OrganizationPlan = "starter";

/** Récupère la définition d'un plan (retombe sur Pro si valeur inconnue). */
export function getPlan(id: OrganizationPlan | null | undefined): PlanDefinition {
  return PLANS[(id ?? DEFAULT_PLAN) as OrganizationPlan] ?? PLANS[DEFAULT_PLAN];
}

type PlanFields = Partial<
  Pick<Organization, "plan" | "plan_status" | "trial_ends_at">
>;

/** Vrai si l'organisation est en période d'essai expirée (non convertie). */
export function isTrialExpired(org: PlanFields | null | undefined): boolean {
  return (
    org?.plan_status === "trial" &&
    !!org.trial_ends_at &&
    new Date(org.trial_ends_at).getTime() < Date.now()
  );
}

/** Jours restants d'essai (0 si expiré, null si pas en essai). */
export function trialDaysLeft(org: PlanFields | null | undefined): number | null {
  if (org?.plan_status !== "trial" || !org.trial_ends_at) return null;
  const ms = new Date(org.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

/**
 * Plan EFFECTIF d'une organisation : un essai expiré retombe sur le plan
 * Gratuit (5 Go) — les données restent accessibles, seules les limites
 * s'appliquent. Tolère un objet partiel (seule la colonne `plan` connue).
 */
export function resolvePlan(org: PlanFields | null | undefined): PlanDefinition {
  if (isTrialExpired(org)) return PLANS[FREE_PLAN];
  return getPlan(org?.plan);
}

/**
 * Taille de fichier réellement autorisée pour un plan. Pour Entreprise (limite
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

/** Libellé compact d'une capacité de stockage : "1 To", "200 Go", "Sur mesure". */
export function formatStorage(bytes: number | null): string {
  if (bytes === null) return "Sur mesure";
  if (bytes >= 1024 * GB) {
    const v = bytes / (1024 * GB);
    return `${Number.isInteger(v) ? v : Number(v.toFixed(1))} To`;
  }
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

/** Prix mensuel lisible ("29 €/mois", "Sur devis"). */
export function formatPlanPrice(plan: PlanDefinition): string {
  if (plan.priceEur === null) return "Sur devis";
  if (plan.priceEur === 0) return "Gratuit";
  return `${plan.priceEur} €/mois`;
}
