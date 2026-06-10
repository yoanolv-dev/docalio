import { createClient } from "@/lib/supabase/server";
import type { Document } from "@/lib/types/database";

/**
 * Liste les documents d'un workspace (du plus récent au plus ancien).
 * La RLS restreint automatiquement aux documents de l'organisation.
 */
export async function listWorkspaceDocuments(
  workspaceId: string
): Promise<Document[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  return (data as Document[] | null) ?? [];
}

export interface DocumentStats {
  total: number;
  draft: number;
  visibleToClient: number;
}

/** Statistiques documents pour le dashboard principal. */
export async function getDocumentStats(): Promise<DocumentStats> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("status, is_visible_to_client");

  const rows =
    (data as Pick<Document, "status" | "is_visible_to_client">[] | null) ?? [];

  return {
    total: rows.length,
    draft: rows.filter((d) => d.status === "draft").length,
    visibleToClient: rows.filter((d) => d.is_visible_to_client).length,
  };
}
