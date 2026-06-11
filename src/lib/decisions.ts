import { createClient } from "@/lib/supabase/server";
import type { DocumentDecision } from "@/lib/types/database";

/**
 * Décisions client courantes d'un workspace, indexées par document_id.
 * RLS : ne renvoie que les décisions de l'organisation de l'utilisateur.
 */
export async function getWorkspaceDecisions(
  workspaceId: string
): Promise<Record<string, DocumentDecision>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_decisions")
    .select("document_id, decision, comment, updated_at")
    .eq("workspace_id", workspaceId);

  const rows = (data as DocumentDecision[] | null) ?? [];
  return Object.fromEntries(rows.map((r) => [r.document_id, r]));
}
