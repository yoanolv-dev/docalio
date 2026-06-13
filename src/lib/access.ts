import { createClient } from "@/lib/supabase/server";

// =============================================================================
// Accès interne : groupes d'utilisateurs + autorisations par espace.
// La RLS (cf. migration 20260613210000) garantit l'isolation ; ces requêtes
// alimentent l'UI d'administration.
// =============================================================================

export interface GroupMemberLite {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

export interface GroupWithMembers {
  id: string;
  name: string;
  members: GroupMemberLite[];
}

/** Groupes de l'organisation avec leurs membres (résolus via profiles). */
export async function listGroupsWithMembers(
  organizationId: string
): Promise<GroupWithMembers[]> {
  const supabase = await createClient();

  const [{ data: groups }, { data: links }] = await Promise.all([
    supabase
      .from("organization_groups")
      .select("id, name")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    supabase
      .from("organization_group_members")
      .select("group_id, user_id, profiles(full_name, email)")
      .eq("organization_id", organizationId),
  ]);

  const byGroup = new Map<string, GroupMemberLite[]>();
  for (const row of (links as
    | {
        group_id: string;
        user_id: string;
        profiles: { full_name: string | null; email: string | null } | null;
      }[]
    | null) ?? []) {
    const list = byGroup.get(row.group_id) ?? [];
    list.push({
      user_id: row.user_id,
      full_name: row.profiles?.full_name ?? null,
      email: row.profiles?.email ?? null,
    });
    byGroup.set(row.group_id, list);
  }

  return ((groups as { id: string; name: string }[] | null) ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    members: byGroup.get(g.id) ?? [],
  }));
}

export interface WorkspaceAccessEntry {
  id: string;
  group: { id: string; name: string } | null;
  user: { id: string; full_name: string | null; email: string | null } | null;
}

/** Autorisations explicites d'un espace (groupes + utilisateurs). */
export async function listWorkspaceAccess(
  workspaceId: string
): Promise<WorkspaceAccessEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workspace_access")
    .select(
      "id, group_id, user_id, organization_groups(id, name), profiles(id, full_name, email)"
    )
    .eq("workspace_id", workspaceId);

  return (
    (data as
      | {
          id: string;
          group_id: string | null;
          user_id: string | null;
          organization_groups: { id: string; name: string } | null;
          profiles: {
            id: string;
            full_name: string | null;
            email: string | null;
          } | null;
        }[]
      | null) ?? []
  ).map((row) => ({
    id: row.id,
    group: row.organization_groups
      ? { id: row.organization_groups.id, name: row.organization_groups.name }
      : null,
    user: row.profiles
      ? {
          id: row.profiles.id,
          full_name: row.profiles.full_name,
          email: row.profiles.email,
        }
      : null,
  }));
}
