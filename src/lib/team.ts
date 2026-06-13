import { createClient } from "@/lib/supabase/server";
import type { OrganizationRole } from "@/lib/types/database";

export interface OrgMember {
  id: string;
  user_id: string;
  role: OrganizationRole;
  created_at: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface PendingInvite {
  id: string;
  email: string | null;
  role: "admin" | "member";
  token: string;
  expires_at: string;
  created_at: string;
}

type RawProfile = {
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

interface RawMember {
  id: string;
  user_id: string;
  role: OrganizationRole;
  created_at: string;
  profiles: RawProfile | RawProfile[] | null;
}

/** Membres de l'organisation, avec profil joint (RLS : même org uniquement). */
export async function listOrgMembers(
  organizationId: string
): Promise<OrgMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("id, user_id, role, created_at, profiles(email, full_name, avatar_url)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  const rows = (data as RawMember[] | null) ?? [];
  return rows.map((m) => {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return {
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      created_at: m.created_at,
      email: p?.email ?? null,
      full_name: p?.full_name ?? null,
      avatar_url: p?.avatar_url ?? null,
    };
  });
}

/** Invitations en attente (RLS : visibles uniquement par les admins de l'org). */
export async function listPendingInvites(
  organizationId: string
): Promise<PendingInvite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_invites")
    .select("id, email, role, token, expires_at, created_at")
    .eq("organization_id", organizationId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });
  return (data as PendingInvite[] | null) ?? [];
}
