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
  visibleToClient: number;
  /** Documents partagés qui n'ont pas encore reçu de décision client. */
  awaitingDecision: number;
}

/** Statistiques documents pour le dashboard principal. */
export async function getDocumentStats(): Promise<DocumentStats> {
  const supabase = await createClient();
  const [docs, decisions] = await Promise.all([
    supabase.from("documents").select("id, is_visible_to_client"),
    supabase.from("document_decisions").select("document_id"),
  ]);

  const rows =
    (docs.data as Pick<Document, "id" | "is_visible_to_client">[] | null) ??
    [];
  const decided = new Set(
    ((decisions.data as { document_id: string }[] | null) ?? []).map(
      (d) => d.document_id
    )
  );

  const visible = rows.filter((d) => d.is_visible_to_client);
  return {
    total: rows.length,
    visibleToClient: visible.length,
    awaitingDecision: visible.filter((d) => !decided.has(d.id)).length,
  };
}
