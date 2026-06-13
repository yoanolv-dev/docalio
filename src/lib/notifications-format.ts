import type { AppNotification } from "@/lib/types/database";

// Helpers PURS de présentation des notifications — sans import serveur, donc
// utilisables aussi bien côté serveur que dans des composants client (cloche).
// Le wording vit ici : changer un libellé ne touche jamais la base.

export interface NotificationDescriptor {
  title: string;
  message: string;
}

/** Rendu textuel d'une notification, contextualisé (workspace, document). */
export function describeNotification(n: AppNotification): NotificationDescriptor {
  const ws = n.workspace_name ?? "Espace client";
  const doc = n.metadata.document_title ?? "un document";

  switch (n.type) {
    case "portal_opened":
      return {
        title: "Portail ouvert",
        message: `${ws} — votre client a ouvert le portail.`,
      };
    case "document_downloaded":
      return {
        title: "Document téléchargé",
        message: `${ws} — « ${doc} » a été téléchargé.`,
      };
    case "document_opened":
      return {
        title: "Document consulté",
        message: `${ws} — « ${doc} » a été prévisualisé.`,
      };
    case "decision_received": {
      const base =
        n.metadata.decision === "approved"
          ? {
              title: "Document approuvé",
              message: `${ws} — « ${doc} » a été approuvé.`,
            }
          : n.metadata.decision === "rejected"
            ? {
                title: "Document refusé",
                message: `${ws} — « ${doc} » a été refusé.`,
              }
            : {
                title: "Modification demandée",
                message: `${ws} — modification demandée sur « ${doc} ».`,
              };
      const comment = n.metadata.comment?.trim();
      return comment
        ? { title: base.title, message: `${base.message} « ${comment} »` }
        : base;
    }
  }
}

/** Lien de destination d'une notification (le workspace concerné). */
export function notificationHref(n: AppNotification): string {
  return `/dashboard/workspaces/${n.workspace_id}`;
}
