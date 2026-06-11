import { createClient } from "@/lib/supabase/server";
import type { PortalData, ShareLink } from "@/lib/types/database";

/**
 * Lien de partage actif d'un workspace (au plus un, garanti par index unique).
 * RLS : ne renvoie que les liens de l'organisation de l'utilisateur.
 */
export async function getActiveShareLink(
  workspaceId: string
): Promise<ShareLink | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("share_links")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .maybeSingle();
  return (data as ShareLink | null) ?? null;
}

/**
 * Données publiques du portail à partir d'un token (RPC SECURITY DEFINER).
 * Renvoie null si le token est inconnu, inactif ou expiré.
 */
export async function getPortalData(token: string): Promise<PortalData | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_portal", { p_token: token });
  if (error || !data) return null;
  return data as PortalData;
}
