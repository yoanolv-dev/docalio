import {
  CircleCheck,
  CircleX,
  Download,
  Eye,
  EyeOff,
  PencilLine,
  Send,
  type LucideIcon,
} from "lucide-react";
import type { DecisionType } from "@/lib/types/database";

// =============================================================================
// État de partage d'un document — DÉRIVÉ, jamais saisi à la main.
//
// L'ancien statut manuel (draft/sent/viewed/...) demandait à l'utilisateur de
// maintenir lui-même une information que le produit connaît déjà. Ici, l'état
// est calculé à partir de trois signaux réels :
//   1. la visibilité client (choisie par l'équipe),
//   2. l'activité du portail (ouvertures / téléchargements tracés),
//   3. la décision client (validation / modification / refus).
// Une seule source de vérité, toujours juste, zéro saisie.
// =============================================================================

export type DocumentShareState =
  | "private"
  | "shared"
  | "viewed"
  | "downloaded"
  | "approved"
  | "changes_requested"
  | "rejected";

export interface DocumentSignals {
  isVisible: boolean;
  decision: DecisionType | null;
  viewed: boolean;
  downloaded: boolean;
}

/** Priorité : décision client > téléchargé > consulté > partagé > privé. */
export function deriveDocumentState(s: DocumentSignals): DocumentShareState {
  if (!s.isVisible) return "private";
  if (s.decision) return s.decision;
  if (s.downloaded) return "downloaded";
  if (s.viewed) return "viewed";
  return "shared";
}

export type DocumentStateBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "info";

interface DocumentStateConfig {
  label: string;
  /** Ce que l'état signifie, côté équipe. */
  description: string;
  variant: DocumentStateBadgeVariant;
  icon: LucideIcon;
  /** Classes additionnelles quand la palette des variants ne suffit pas. */
  className?: string;
}

export const DOCUMENT_STATE_CONFIG: Record<
  DocumentShareState,
  DocumentStateConfig
> = {
  private: {
    label: "Privé",
    description: "Visible uniquement par votre équipe.",
    variant: "secondary",
    icon: EyeOff,
  },
  shared: {
    label: "Partagé",
    description: "Visible dans le portail, pas encore consulté.",
    variant: "default",
    icon: Send,
  },
  viewed: {
    label: "Consulté",
    description: "Votre client a ouvert ce document.",
    variant: "info",
    icon: Eye,
  },
  downloaded: {
    label: "Téléchargé",
    description: "Votre client a téléchargé ce document.",
    variant: "outline",
    icon: Download,
    className:
      "border-transparent bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
  },
  approved: {
    label: "Validé",
    description: "Votre client a validé ce document.",
    variant: "success",
    icon: CircleCheck,
  },
  changes_requested: {
    label: "Modif. demandée",
    description: "Votre client attend une nouvelle version.",
    variant: "warning",
    icon: PencilLine,
  },
  rejected: {
    label: "Refusé",
    description: "Votre client a refusé ce document.",
    variant: "destructive",
    icon: CircleX,
  },
};

// -----------------------------------------------------------------------------
// Filtres de l'explorateur de documents (regroupements produit, pas techniques)
// -----------------------------------------------------------------------------

export type DocumentFilter =
  | "all"
  | "private"
  | "awaiting"
  | "approved"
  | "to_fix";

export const DOCUMENT_FILTERS: { value: DocumentFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "awaiting", label: "En attente client" },
  { value: "approved", label: "Validés" },
  { value: "to_fix", label: "À retravailler" },
  { value: "private", label: "Privés" },
];

export function stateMatchesFilter(
  state: DocumentShareState,
  filter: DocumentFilter
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "private":
      return state === "private";
    case "awaiting":
      return state === "shared" || state === "viewed" || state === "downloaded";
    case "approved":
      return state === "approved";
    case "to_fix":
      return state === "changes_requested" || state === "rejected";
  }
}
