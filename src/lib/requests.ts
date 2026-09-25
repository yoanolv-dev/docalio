import { createClient } from "@/lib/supabase/server";
import type { DocumentRequest, PortalRequest } from "@/lib/types/database";

/**
 * Pièces demandées pour un espace (RLS : espaces accessibles uniquement).
 * Tolérant : renvoie [] si la migration « document_requests » n'est pas encore
 * appliquée, pour ne jamais casser le détail d'espace.
 */
export async function listWorkspaceRequests(
  workspaceId: string
): Promise<DocumentRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_requests")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data as DocumentRequest[] | null) ?? [];
}

/** Pièces demandées exposées au portail (RPC publique, token validé en base). */
export async function getPortalRequests(token: string): Promise<PortalRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_portal_requests", {
    p_token: token,
  });
  if (error || !Array.isArray(data)) return [];
  return data as PortalRequest[];
}

/** Compte par espace des pièces encore attendues côté client (pending/rejected). */
export async function countOpenRequestsByWorkspace(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_requests")
    .select("workspace_id, status")
    .in("status", ["pending", "rejected", "received"]);
  const out = new Map<string, number>();
  if (error || !data) return out;
  for (const r of data as { workspace_id: string; status: string }[]) {
    // « received » = à valider côté cabinet ; les deux comptent comme ouvertes.
    out.set(r.workspace_id, (out.get(r.workspace_id) ?? 0) + 1);
  }
  return out;
}
