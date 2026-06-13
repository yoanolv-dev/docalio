// =============================================================================
// Docalio — Secteurs & vocabulaire adaptatif
//
// Le profil de l'organisation (secteur + usage) personnalise l'app :
//  - le VOCABULAIRE (« espace client » vs « espace ») dépend de l'usage,
//  - les MODÈLES DE DOSSIERS et exemples dépendent du secteur métier.
// Tout est piloté ici : une seule source de vérité, aucune chaîne en dur.
// =============================================================================

import type { UsageType } from "@/lib/types/database";

export interface SectorDef {
  id: string;
  label: string;
  /** Modèle de dossiers proposé à la création d'un espace. */
  folderTemplate: string[];
  /** Exemple de nom d'espace (placeholder du champ). */
  nameExample: string;
}

/** Secteurs proposés à l'onboarding (ordre d'affichage). */
export const SECTORS: SectorDef[] = [
  {
    id: "comptable",
    label: "Cabinet comptable",
    folderTemplate: ["Bilans", "Liasses fiscales", "TVA", "Paie", "Juridique"],
    nameExample: "SARL Martin",
  },
  {
    id: "juridique",
    label: "Avocat / Notaire",
    folderTemplate: ["Contrats", "Procédures", "Pièces", "Correspondance"],
    nameExample: "Dossier Dupont",
  },
  {
    id: "agence",
    label: "Agence / Studio créatif",
    folderTemplate: ["Brief", "Création", "Validations", "Livrables", "Factures"],
    nameExample: "Projet site web",
  },
  {
    id: "conseil",
    label: "Conseil / Freelance",
    folderTemplate: ["Propositions", "Livrables", "Comptes-rendus", "Factures"],
    nameExample: "Mission Acme",
  },
  {
    id: "btp",
    label: "Bâtiment / Artisan",
    folderTemplate: ["Devis", "Plans", "Chantier", "Factures"],
    nameExample: "Chantier Rue des Lilas",
  },
  {
    id: "immobilier",
    label: "Immobilier",
    folderTemplate: ["Mandats", "Diagnostics", "Compromis", "Photos"],
    nameExample: "Appartement Centre-ville",
  },
  {
    id: "sante",
    label: "Santé / Paramédical",
    folderTemplate: ["Dossiers", "Comptes-rendus", "Administratif"],
    nameExample: "Dossier patient",
  },
  {
    id: "interne",
    label: "Communication interne d'entreprise",
    folderTemplate: [
      "Documentation",
      "Tarifs",
      "Contrats types",
      "Présentations",
      "RH",
    ],
    nameExample: "Documentation commerciale",
  },
  {
    id: "autre",
    label: "Autre",
    folderTemplate: ["Documents", "Échanges"],
    nameExample: "Mon espace",
  },
];

const FALLBACK_SECTOR = SECTORS[SECTORS.length - 1];

export function getSector(id: string | null | undefined): SectorDef {
  return SECTORS.find((s) => s.id === id) ?? FALLBACK_SECTOR;
}

// --- Vocabulaire adaptatif ----------------------------------------------------

export interface Vocabulary {
  /** « espace client » / « espace ». */
  singular: string;
  /** « espaces clients » / « espaces ». */
  plural: string;
  /** Bouton de création : « Nouvel espace client » / « Nouvel espace ». */
  newLabel: string;
  /** Titre de la liste : « Vos espaces clients » / « Vos espaces ». */
  listTitle: string;
  /** Titre de création : « Créer un espace client » / « Créer un espace ». */
  createTitle: string;
}

const VOCAB_EXTERNAL: Vocabulary = {
  singular: "espace client",
  plural: "espaces clients",
  newLabel: "Nouvel espace client",
  listTitle: "Vos espaces clients",
  createTitle: "Créer un espace client",
};

const VOCAB_GENERIC: Vocabulary = {
  singular: "espace",
  plural: "espaces",
  newLabel: "Nouvel espace",
  listTitle: "Vos espaces",
  createTitle: "Créer un espace",
};

/**
 * Vocabulaire selon l'usage déclaré. « external » assume une relation client ;
 * « internal » et « mixed » restent génériques (équipe + clients éventuels).
 */
export function vocabularyFor(usage: UsageType | null | undefined): Vocabulary {
  return usage === "external" ? VOCAB_EXTERNAL : VOCAB_GENERIC;
}

/** Type d'espace par défaut selon l'usage de l'organisation. */
export function defaultSpaceType(
  usage: UsageType | null | undefined
): "internal" | "external" {
  return usage === "internal" ? "internal" : "external";
}

/** L'utilisateur peut-il choisir le type d'espace (usage mixte) ? */
export function canChooseSpaceType(usage: UsageType | null | undefined): boolean {
  return usage === "mixed";
}

export const USAGE_OPTIONS: { value: UsageType; label: string; hint: string }[] = [
  {
    value: "external",
    label: "Avec mes clients",
    hint: "Partager des documents à l'externe via un lien sécurisé.",
  },
  {
    value: "internal",
    label: "En interne",
    hint: "Centraliser et partager des documents au sein de mon équipe.",
  },
  {
    value: "mixed",
    label: "Les deux",
    hint: "En interne et avec mes clients.",
  },
];
