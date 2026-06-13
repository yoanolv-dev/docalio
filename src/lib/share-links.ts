import { createClient } from "@/lib/supabase/server";
import type {
  DecisionType,
  PortalData,
  ShareLink,
} from "@/lib/types/database";

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

/** Branding d'un espace pour la page d'accueil de marque (sous-domaine). */
export interface PortalLanding {
  organization: {
    name: string;
    logo_url: string | null;
    primary_color: string | null;
  };
  workspace: {
    name: string;
    client_company: string | null;
    logo_url: string | null;
    primary_color: string | null;
    slug: string | null;
  };
  has_active_link: boolean;
  document_count: number;
}

/**
 * Branding d'un espace à partir de son slug (page d'accueil de sous-domaine).
 * Ne renvoie jamais le jeton du lien : le sous-domaine est un habillage, pas
 * une autorisation. Renvoie null si le slug est inconnu.
 */
export async function getPortalLanding(
  slug: string
): Promise<PortalLanding | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_portal_landing", {
    p_slug: slug,
  });
  if (error || !data) return null;
  return data as PortalLanding;
}

export interface PortalDecision {
  decision: DecisionType;
  comment: string | null;
}

/**
 * Décisions courantes du client pour le workspace d'un lien (RPC publique),
 * indexées par document_id. Reflète l'état des décisions dans le portail.
 */
export async function getPortalDecisions(
  token: string
): Promise<Record<string, PortalDecision>> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_portal_decisions", {
    p_token: token,
  });

  const rows =
    (data as
      | { document_id: string; decision: DecisionType; comment: string | null }[]
      | null) ?? [];

  return Object.fromEntries(
    rows.map((r) => [r.document_id, { decision: r.decision, comment: r.comment }])
  );
}
