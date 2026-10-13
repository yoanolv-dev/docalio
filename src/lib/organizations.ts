import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Organization, OrganizationRole } from "@/lib/types/database";

export interface CurrentMembership {
  organization: Organization;
  role: OrganizationRole;
}

/** Cookie de l'organisation active (utilisateur membre ou invité de plusieurs). */
export const ACTIVE_ORG_COOKIE = "docalio-org";

/**
 * Toutes les organisations de l'utilisateur connecté (membre ou invité), de la
 * plus ancienne à la plus récente. La RLS ne renvoie que les siennes.
 */
export async function listMemberships(): Promise<CurrentMembership[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("organization_members")
    .select("role, created_at, organizations(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return ((data ?? []) as { role: string; organizations: unknown }[])
    .filter((row) => row.organizations)
    .map((row) => ({
      role: row.role as OrganizationRole,
      organization: row.organizations as Organization,
    }));
}

/**
 * Organisation active de l'utilisateur et son rôle, ou null s'il n'appartient
 * à aucune organisation. L'organisation choisie (cookie) prime ; sinon la
 * première dont il est membre, puis la première où il est invité.
 */
export async function getCurrentMembership(): Promise<CurrentMembership | null> {
  const memberships = await listMemberships();
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const chosen = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  const fromCookie = chosen
    ? memberships.find((m) => m.organization.id === chosen)
    : undefined;

  return (
    fromCookie ??
    memberships.find((m) => m.role !== "guest") ??
    memberships[0]
  );
}

/** L'utilisateur est-il un invité (et non un membre) de l'organisation active ? */
export function isGuest(membership: CurrentMembership | null): boolean {
  return membership?.role === "guest";
}

/** Administrateur de l'organisation active (propriétaire ou admin). */
export function isAdmin(membership: CurrentMembership | null): boolean {
  return membership?.role === "owner" || membership?.role === "admin";
}
