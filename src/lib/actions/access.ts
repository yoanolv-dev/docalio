"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/organizations";

export type AccessResult = { ok: boolean; message?: string };

/** Garde commune : renvoie l'organisation si l'utilisateur est admin/owner. */
async function requireAdminOrg(): Promise<
  | { ok: true; organizationId: string }
  | { ok: false; message: string }
> {
  const membership = await getCurrentMembership();
  if (!membership) return { ok: false, message: "Session expirée." };
  if (membership.role === "member") {
    return { ok: false, message: "Action réservée aux administrateurs." };
  }
  return { ok: true, organizationId: membership.organization.id };
}

// --- Groupes ------------------------------------------------------------------

export async function createGroupAction(rawName: string): Promise<AccessResult> {
  const guard = await requireAdminOrg();
  if (!guard.ok) return guard;

  const name = rawName.trim();
  if (!name) return { ok: false, message: "Le nom du groupe est requis." };
  if (name.length > 60) return { ok: false, message: "Nom trop long." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("organization_groups").insert({
    organization_id: guard.organizationId,
    name,
    created_by: user?.id ?? null,
  });
  if (error) return { ok: false, message: "Création impossible. Réessayez." };

  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function deleteGroupAction(groupId: string): Promise<AccessResult> {
  const guard = await requireAdminOrg();
  if (!guard.ok) return guard;

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_groups")
    .delete()
    .eq("id", groupId);
  if (error) return { ok: false, message: "Suppression impossible. Réessayez." };

  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function addGroupMemberAction(
  groupId: string,
  userId: string
): Promise<AccessResult> {
  const guard = await requireAdminOrg();
  if (!guard.ok) return guard;

  const supabase = await createClient();
  const { error } = await supabase.from("organization_group_members").insert({
    group_id: groupId,
    user_id: userId,
    organization_id: guard.organizationId,
  });
  if (error && error.code !== "23505") {
    return { ok: false, message: "Ajout impossible. Réessayez." };
  }

  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function removeGroupMemberAction(
  groupId: string,
  userId: string
): Promise<AccessResult> {
  const guard = await requireAdminOrg();
  if (!guard.ok) return guard;

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) return { ok: false, message: "Retrait impossible. Réessayez." };

  revalidatePath("/dashboard/settings");
  return { ok: true };
}

// --- Accès par espace ---------------------------------------------------------

export async function grantWorkspaceAccessAction(
  workspaceId: string,
  kind: "group" | "user",
  targetId: string
): Promise<AccessResult> {
  const guard = await requireAdminOrg();
  if (!guard.ok) return guard;

  const supabase = await createClient();
  const { error } = await supabase.from("workspace_access").insert({
    organization_id: guard.organizationId,
    workspace_id: workspaceId,
    group_id: kind === "group" ? targetId : null,
    user_id: kind === "user" ? targetId : null,
  });
  if (error && error.code !== "23505") {
    return { ok: false, message: "Autorisation impossible. Réessayez." };
  }

  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  return { ok: true };
}

export async function revokeWorkspaceAccessAction(
  accessId: string,
  workspaceId: string
): Promise<AccessResult> {
  const guard = await requireAdminOrg();
  if (!guard.ok) return guard;

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_access")
    .delete()
    .eq("id", accessId);
  if (error) return { ok: false, message: "Révocation impossible. Réessayez." };

  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  return { ok: true };
}
