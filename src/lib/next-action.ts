import type { DecisionType } from "@/lib/types/database";

// =============================================================================
// Docalio — Sprint 10 — Relances manuelles intelligentes (sans IA)
//
// Fonction pure qui dérive l'état d'un dossier (activité + décisions + docs +
// lien) et propose : ce qui se passe, l'engagement client, l'action à faire et
// un message prêt à copier — contextualisé (workspace, organisation, signal).
// Templates statiques mais intelligents. Aucune IA, aucun appel réseau.
// =============================================================================

export type NextActionTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "attention";

export interface NextActionContext {
  workspaceName: string;
  organizationName: string;
  /** Lien du portail si actif, sinon null. */
  portalUrl: string | null;
  hasDocuments: boolean;
  hasVisibleDocuments: boolean;
  hasActiveLink: boolean;
  opens: number;
  downloads: number;
  decisionsApproved: number;
  decisionsChangesRequested: number;
  decisionsRejected: number;
  decisionsPending: number;
  /** Commentaire client le plus récent, si présent. */
  lastComment: string | null;
  lastCommentDecision: DecisionType | null;
}

export interface NextAction {
  state: string;
  tone: NextActionTone;
  /** Intitulé court de la carte. */
  title: string;
  /** Ce qui vient de se passer / l'engagement client. */
  headline: string;
  /** Ce qu'il faut faire maintenant. */
  recommendation: string;
  /** Message prêt à copier, ou null (étapes de configuration). */
  message: string | null;
}

function link(ctx: NextActionContext): string {
  return ctx.portalUrl ?? "[votre lien Docalio]";
}

function commentLine(ctx: NextActionContext): string {
  return ctx.lastComment
    ? ` Vous avez indiqué : « ${ctx.lastComment} ».`
    : "";
}

function signoff(ctx: NextActionContext): string {
  return `\n\nBien à vous,\nL'équipe ${ctx.organizationName}`;
}

/** Calcule la prochaine action recommandée selon l'état du dossier. */
export function computeNextAction(ctx: NextActionContext): NextAction {
  // --- Étapes de configuration (pas encore de message client) --------------
  if (!ctx.hasDocuments) {
    return {
      state: "no_documents",
      tone: "neutral",
      title: "Prochaine action",
      headline: "Cet espace ne contient encore aucun document.",
      recommendation:
        "Ajoutez vos premiers documents (devis, contrat, rapport…) pour pouvoir les partager avec votre client.",
      message: null,
    };
  }

  if (!ctx.hasVisibleDocuments) {
    return {
      state: "no_visible_docs",
      tone: "neutral",
      title: "Prochaine action",
      headline: "Aucun document n'est encore visible par le client.",
      recommendation:
        "Marquez au moins un document comme « visible client » pour le partager dans le portail.",
      message: null,
    };
  }

  if (!ctx.hasActiveLink) {
    return {
      state: "no_link",
      tone: "info",
      title: "Prochaine action",
      headline: "Vos documents sont prêts à être partagés.",
      recommendation:
        "Générez un lien de portail sécurisé, puis envoyez-le à votre client pour qu'il consulte le dossier.",
      message: null,
    };
  }

  // --- Décisions client (réponses explicites → priorité) -------------------
  if (ctx.decisionsChangesRequested > 0) {
    return {
      state: "changes_requested",
      tone: "warning",
      title: "Relance recommandée",
      headline: "Votre client a demandé une modification.",
      recommendation:
        "Préparez une version corrigée et republiez-la dans l'espace, puis prévenez votre client.",
      message:
        `Bonjour,\n\nMerci pour votre retour sur ${ctx.workspaceName}.${commentLine(ctx)} Je prépare une version corrigée et reviens vers vous rapidement.\n\nVous la retrouverez au même endroit : ${link(ctx)}` +
        signoff(ctx),
    };
  }

  if (ctx.decisionsRejected > 0) {
    return {
      state: "rejected",
      tone: "attention",
      title: "Relance recommandée",
      headline: "Votre client a refusé un document.",
      recommendation:
        "Proposez un échange pour comprendre les attentes et débloquer le dossier.",
      message:
        `Bonjour,\n\nJ'ai bien noté votre retour concernant ${ctx.workspaceName}.${commentLine(ctx)} Je souhaiterais en échanger avec vous afin de mieux comprendre vos attentes et vous proposer une solution adaptée.\n\nSeriez-vous disponible pour un court échange cette semaine ?` +
        signoff(ctx),
    };
  }

  if (ctx.decisionsPending === 0 && ctx.decisionsApproved > 0) {
    return {
      state: "all_approved",
      tone: "success",
      title: "Dossier validé",
      headline: "Votre client a validé l'ensemble des documents.",
      recommendation:
        "Remerciez votre client et enchaînez sur les prochaines étapes du projet.",
      message:
        `Bonjour,\n\nMerci pour votre validation concernant ${ctx.workspaceName}, c'est bien noté de notre côté.\n\nNous enchaînons sur les prochaines étapes et revenons vers vous très vite.` +
        signoff(ctx),
    };
  }

  if (ctx.decisionsApproved > 0 && ctx.decisionsPending > 0) {
    return {
      state: "partially_approved",
      tone: "info",
      title: "Relance recommandée",
      headline: "Une partie des documents est validée, d'autres sont en attente.",
      recommendation:
        "Relancez votre client sur les documents qui n'ont pas encore reçu de réponse.",
      message:
        `Bonjour,\n\nMerci pour vos premières validations sur ${ctx.workspaceName}. Il reste quelques documents en attente de votre retour.\n\nVous pouvez les valider ou les commenter directement ici : ${link(ctx)}` +
        signoff(ctx),
    };
  }

  // --- Engagement sans décision encore -------------------------------------
  if (ctx.downloads > 0) {
    return {
      state: "downloaded_no_response",
      tone: "info",
      title: "Relance recommandée",
      headline: "Votre client a téléchargé des documents mais n'a pas répondu.",
      recommendation:
        "Invitez votre client à valider, commenter ou poser ses questions.",
      message:
        `Bonjour,\n\nJ'espère que les documents de ${ctx.workspaceName} ont répondu à vos attentes. Avez-vous pu en prendre connaissance ?\n\nVous pouvez valider, demander une modification ou laisser un commentaire directement depuis l'espace : ${link(ctx)}\n\nJe reste disponible pour en échanger.` +
        signoff(ctx),
    };
  }

  if (ctx.opens > 0) {
    return {
      state: "opened_no_download",
      tone: "info",
      title: "Relance recommandée",
      headline: "Votre client a ouvert le portail sans consulter les documents.",
      recommendation:
        "Assurez-vous qu'il a bien trouvé les documents et proposez votre aide.",
      message:
        `Bonjour,\n\nMerci d'avoir ouvert l'espace dédié à ${ctx.workspaceName}. Je voulais m'assurer que vous aviez bien pu accéder aux documents.\n\nL'espace reste accessible ici : ${link(ctx)}\n\nN'hésitez pas à me dire si vous avez besoin d'un complément d'information.` +
        signoff(ctx),
    };
  }

  // Lien actif mais jamais ouvert.
  return {
    state: "not_opened",
    tone: "attention",
    title: "Relance recommandée",
    headline: "Votre client n'a pas encore ouvert le portail.",
    recommendation:
      "Renvoyez le lien du portail avec un court message d'introduction.",
    message:
      `Bonjour,\n\nJe me permets de revenir vers vous concernant ${ctx.workspaceName}. J'ai mis à votre disposition un espace sécurisé regroupant les documents de votre dossier.\n\nVous pouvez le consulter ici : ${link(ctx)}\n\nJe reste à votre disposition pour toute question.` +
      signoff(ctx),
  };
}
