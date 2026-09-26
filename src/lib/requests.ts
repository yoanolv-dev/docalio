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

export interface RequestStats {
  total: number;
  /** Validées par le cabinet. */
  validated: number;
  /** Déposées par le client, à vérifier. */
  toReview: number;
  /** Encore attendues du client (en attente ou refusées). */
  waiting: number;
}

/** Statistiques de pièces par espace (une seule requête, agrégée ici). */
export async function getRequestStatsByWorkspace(): Promise<Map<string, RequestStats>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_requests")
    .select("workspace_id, status");
  const out = new Map<string, RequestStats>();
  if (error || !data) return out;
  for (const r of data as { workspace_id: string; status: string }[]) {
    const s = out.get(r.workspace_id) ?? { total: 0, validated: 0, toReview: 0, waiting: 0 };
    s.total++;
    if (r.status === "validated") s.validated++;
    else if (r.status === "received") s.toReview++;
    else s.waiting++;
    out.set(r.workspace_id, s);
  }
  return out;
}
