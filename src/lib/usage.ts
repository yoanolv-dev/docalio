import { createClient } from "@/lib/supabase/server";

/**
 * Usage courant d'une organisation, calculé côté base via la RPC
 * `get_organization_usage` (SECURITY DEFINER, agrégats serveur — pas de
 * remontée de lignes). Voir migration `20260611500000_org_usage.sql`.
 */
export interface OrganizationUsage {
  /** Octets cumulés des fichiers (somme de documents.file_size). */
  storageUsed: number;
  /** Espaces clients au statut « actif ». */
  activeWorkspaces: number;
  /** Membres de l'organisation. */
  members: number;
}

interface UsageRow {
  storage_used: number | string | null;
  active_workspaces: number | null;
  members_count: number | null;
}

const EMPTY_USAGE: OrganizationUsage = {
  storageUsed: 0,
  activeWorkspaces: 0,
  members: 0,
};

/**
 * Usage de l'organisation `orgId`. La RPC ne renvoie de ligne que si
 * l'utilisateur courant est membre (sinon l'usage est considéré comme vide).
 */
export async function getOrganizationUsage(
  orgId: string
): Promise<OrganizationUsage> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_organization_usage", { org_id: orgId })
    .maybeSingle<UsageRow>();

  if (error || !data) return EMPTY_USAGE;

  return {
    // file_size est un bigint → peut arriver en string ; on normalise en number.
    storageUsed: Number(data.storage_used ?? 0),
    activeWorkspaces: Number(data.active_workspaces ?? 0),
    members: Number(data.members_count ?? 0),
  };
}
