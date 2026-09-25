"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/organizations";
import { isLimitReached, resolvePlan } from "@/lib/plans";
import { getOrganizationUsage } from "@/lib/usage";

export type TeamResult = { ok: boolean; message?: string; token?: string };

type MemberRole = "owner" | "admin" | "member";
type InviteRole = "admin" | "member";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Crée une invitation (lien à jeton). Réservé aux owner/admin. */
export async function inviteMemberAction(
  role: InviteRole,
  email?: string
): Promise<TeamResult> {
  const { supabase, user } = await requireUser();
  const membership = await getCurrentMembership();
  if (!membership) return { ok: false, message: "Organisation introuvable." };
  if (membership.role === "member") {
    return { ok: false, message: "Réservé aux administrateurs." };
  }
  if (role !== "admin" && role !== "member") {
    return { ok: false, message: "Rôle invalide." };
  }

  // Limite d'utilisateurs du forfait (membres actuels + invitations en attente).
  const plan = resolvePlan(membership.organization);
  if (plan.limits.users !== null) {
    const [usage, invites] = await Promise.all([
      getOrganizationUsage(membership.organization.id),
      supabase
        .from("organization_invites")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", membership.organization.id)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString()),
    ]);
    const seats = usage.members + (invites.error ? 0 : invites.count ?? 0);
    if (isLimitReached(seats, plan.limits.users)) {
      return {
        ok: false,
        message: `Votre forfait ${plan.name} inclut ${plan.limits.users} utilisateur${plan.limits.users > 1 ? "s" : ""}. Passez au forfait supérieur pour agrandir l'équipe.`,
      };
    }
  }

  const token = randomBytes(24).toString("base64url");
  const { error } = await supabase.from("organization_invites").insert({
    organization_id: membership.organization.id,
    email: email?.trim() || null,
    role,
    token,
    invited_by: user.id,
  });
  if (error) return { ok: false, message: "Création de l'invitation impossible." };

  revalidatePath("/dashboard/settings/equipe");
  return { ok: true, token };
}

/** Révoque une invitation en attente. */
export async function revokeInviteAction(inviteId: string): Promise<TeamResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("organization_invites")
    .delete()
    .eq("id", inviteId);
  if (error) return { ok: false, message: "Suppression impossible." };
  revalidatePath("/dashboard/settings/equipe");
  return { ok: true };
}

/** Modifie le rôle d'un membre (garde-fous côté base). */
export async function setMemberRoleAction(
  memberId: string,
  role: MemberRole
): Promise<TeamResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("set_member_role", {
    p_member_id: memberId,
    p_role: role,
  });
  if (error) return { ok: false, message: error.message || "Action impossible." };
  revalidatePath("/dashboard/settings/equipe");
  return { ok: true };
}

/** Retire un membre de l'organisation. */
export async function removeMemberAction(memberId: string): Promise<TeamResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("remove_org_member", {
    p_member_id: memberId,
  });
  if (error) return { ok: false, message: error.message || "Action impossible." };
  revalidatePath("/dashboard/settings/equipe");
  return { ok: true };
}
