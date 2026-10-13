import type { ActivityEventType } from "@/lib/types/database";

// Libellés du journal d'activité (fichier, espace, organisation).

type Meta = Record<string, unknown>;

function q(value: unknown): string {
  return typeof value === "string" && value ? `« ${value} »` : "un élément";
}

/** Auteur affiché : la personne, sinon un visiteur (lien) ou le client (portail). */
export function activityActor(type: ActivityEventType, actorName: string | null): string {
  if (actorName) return actorName;
  if (type.startsWith("share_")) return "Un visiteur";
  if (["portal_opened", "document_opened", "document_downloaded", "request_fulfilled"].includes(type)) return "Le client";
  return "Quelqu'un";
}

/** Action (sans l'auteur) : « a ajouté « Contrat.pdf » ». */
export function activityAction(type: ActivityEventType, meta: Meta): string {
  const title = q(meta.title);
  switch (type) {
    case "file_uploaded":
      return `a ajouté ${title}`;
    case "file_version_uploaded":
      return `a déposé la version ${meta.version ?? ""} de ${title}`.replace("  ", " ");
    case "file_version_restored":
      return `a restauré une ancienne version de ${title}`;
    case "file_renamed":
    case "folder_renamed":
      return `a renommé ${q(meta.previous_title)} en ${title}`;
    case "file_moved":
    case "folder_moved":
      return `a déplacé ${title} vers ${meta.to_folder ? q(meta.to_folder) : "la racine"}`;
    case "file_trashed":
      return `a mis ${title} à la corbeille`;
    case "folder_trashed":
      return `a mis le dossier ${title} à la corbeille`;
    case "file_restored":
      return `a restauré ${title}`;
    case "folder_restored":
      return `a restauré le dossier ${title}`;
    case "file_deleted":
      return `a supprimé définitivement ${title}`;
    case "folder_deleted":
      return `a supprimé définitivement le dossier ${title}`;
    case "folder_created":
      return `a créé le dossier ${title}`;
    case "file_downloaded":
      return meta.zip ? `a téléchargé ${meta.files ?? ""} fichiers (ZIP)` : `a téléchargé ${title}`;
    case "share_created":
      return meta.portal ? "a activé le portail client" : `a créé un lien de partage sur ${title}`;
    case "share_revoked":
      return `a révoqué un lien de partage sur ${title}`;
    case "share_opened":
      return meta.label ? `a ouvert le lien ${q(meta.label)}` : "a ouvert un lien de partage";
    case "share_downloaded":
      return meta.zip ? `a téléchargé ${meta.files ?? ""} fichiers (ZIP) via un lien` : `a téléchargé ${title} via un lien`;
    case "share_uploaded":
      return `a déposé ${title} via un lien`;
    case "access_granted":
      return `a ouvert l'accès à ${meta.title ?? "une personne"}${meta.access_level === "viewer" ? " (lecture seule)" : ""}`;
    case "access_revoked":
      return `a retiré l'accès de ${meta.title ?? "une personne"}`;
    case "portal_opened":
      return "a ouvert le portail";
    case "document_opened":
      return `a consulté ${title}`;
    case "document_downloaded":
      return `a téléchargé ${title}`;
    case "request_fulfilled":
      return `a déposé la pièce ${q(meta.request_title)}`;
    default:
      return "a effectué une action";
  }
}

/** Familles pour les filtres du journal. */
export const ACTIVITY_FILTERS: { id: string; label: string; types: ActivityEventType[] }[] = [
  { id: "files", label: "Fichiers", types: ["file_uploaded", "file_version_uploaded", "file_version_restored", "file_renamed", "file_moved", "folder_created", "folder_renamed", "folder_moved"] },
  { id: "downloads", label: "Téléchargements", types: ["file_downloaded", "share_downloaded", "document_downloaded"] },
  { id: "trash", label: "Suppressions", types: ["file_trashed", "folder_trashed", "file_restored", "folder_restored", "file_deleted", "folder_deleted"] },
  { id: "sharing", label: "Partages", types: ["share_created", "share_revoked", "share_opened", "share_uploaded", "access_granted", "access_revoked"] },
  { id: "clients", label: "Portail client", types: ["portal_opened", "document_opened", "document_downloaded", "request_fulfilled"] },
];
