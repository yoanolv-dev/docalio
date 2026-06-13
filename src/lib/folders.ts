import { createClient } from "@/lib/supabase/server";
import type { Folder } from "@/lib/types/database";

// Helpers d'arborescence purs (réexportés ici par commodité côté serveur).
export {
  buildBreadcrumb,
  collectDescendantIds,
  type BreadcrumbItem,
} from "@/lib/folder-tree";

/**
 * Liste tous les dossiers d'un workspace (RLS restreint à l'organisation).
 * On récupère l'arbre complet en une requête : il y a peu de dossiers par
 * espace, l'arborescence se construit côté application.
 */
export async function listWorkspaceFolders(
  workspaceId: string
): Promise<Folder[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("folders")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true });
  return (data as Folder[] | null) ?? [];
}
