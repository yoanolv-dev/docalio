import { createClient } from "@/lib/supabase/server";
import type { Organization, OrganizationRole } from "@/lib/types/database";

export interface CurrentMembership {
  organization: Organization;
  role: OrganizationRole;
}

/**
 * Retourne l'organisation active de l'utilisateur connecté et son rôle,
 * ou null s'il n'appartient à aucune organisation.
 *
 * La RLS garantit qu'on ne peut récupérer que sa propre organisation.
 */
export async function getCurrentMembership(): Promise<CurrentMembership | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("organization_members")
    .select("role, organizations(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data || !data.organizations) return null;

  return {
    role: data.role as OrganizationRole,
    organization: data.organizations as unknown as Organization,
  };
}
