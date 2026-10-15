import { createClient } from "@/lib/supabase/server";
import type {
  DocumentVersion,
  DriveLink,
  DriveTrashItem,
} from "@/lib/types/database";

/**
 * Éléments de premier niveau de la corbeille d'un espace (un dossier mis à la
 * corbeille masque son contenu — il se restaure d'un bloc).
 */
export async function listTrashItems(
  workspaceId: string
): Promise<DriveTrashItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("drive_trash_items")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("deleted_at", { ascending: false });
  return (data as DriveTrashItem[] | null) ?? [];
}

/** Versions archivées d'un fichier, de la plus récente à la plus ancienne. */
export async function listDocumentVersions(
  documentId: string
): Promise<DocumentVersion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_versions")
    .select("*")
    .eq("document_id", documentId)
    .order("version", { ascending: false });
  return (data as DocumentVersion[] | null) ?? [];
}

/** Liens de partage actifs d'un espace (fichiers, dossiers et espace entier). */
export async function listWorkspaceDriveLinks(
  workspaceId: string
): Promise<DriveLink[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("drive_links")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  return (data as DriveLink[] | null) ?? [];
}
