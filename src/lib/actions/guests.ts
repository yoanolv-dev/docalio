"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AccessLevel } from "@/lib/types/database";

// =============================================================================
// Invités externes d'un espace : une personne extérieure (client, partenaire,
// prestataire) avec un compte, qui ne voit QUE les espaces ouverts à son nom.
// Gratuits et illimités. Tout membre qui peut écrire dans l'espace les gère
// (RLS : policies *_guest).
// =============================================================================

export interface SpaceGuest {
  accessId: string;
  userId: string;
  name: string;
  email: string | null;
  level: AccessLevel;
}

export interface PendingGuestInvite {
  id: string;
  email: string | null;
  level: AccessLevel;
  token: string;
  expires_at: string;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Invités ayant accès à l'espace, et invitations en attente. */
export async function listSpaceGuestsAction(workspaceId: string): Promise<{
  guests: SpaceGuest[];
  invites: PendingGuestInvite[];
}> {
  const { supabase } = await requireUser();

  const { data: ws } = await supabase
    .from("workspaces")
    .select("organization_id")
    .eq("id", workspaceId)
    .maybeSingle<{ organization_id: string }>();
  if (!ws) return { guests: [], invites: [] };

  const [access, guestsRes, invitesRes] = await Promise.all([
    supabase
      .from("workspace_access")
      .select("id, user_id, access_level")
      .eq("workspace_id", workspaceId)
      .not("user_id", "is", null),
    supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", ws.organization_id)
      .eq("role", "guest"),
    supabase
      .from("organization_invites")
      .select("id, email, access_level, token, expires_at, workspace_ids")
      .eq("organization_id", ws.organization_id)
      .eq("role", "guest")
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .contains("workspace_ids", [workspaceId])
      .order("created_at", { ascending: false }),
  ]);

  const guestIds = new Set(((guestsRes.data ?? []) as { user_id: string }[]).map((g) => g.user_id));
  const rows = ((access.data ?? []) as { id: string; user_id: string; access_level: AccessLevel }[]).filter((r) =>
    guestIds.has(r.user_id)
  );

  const { data: profiles } = rows.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", rows.map((r) => r.user_id))
    : { data: [] };
  const byId = new Map(
    ((profiles ?? []) as { id: string; full_name: string | null; email: string | null }[]).map((p) => [p.id, p])
  );

  return {
    guests: rows.map((r) => {
      const p = byId.get(r.user_id);
      return {
        accessId: r.id,
        userId: r.user_id,
        name: p?.full_name || p?.email || "Invité",
        email: p?.email ?? null,
        level: r.access_level,
      };
    }),
    invites: ((invitesRes.data ?? []) as unknown as {
      id: string;
      email: string | null;
      access_level: AccessLevel;
      token: string;
      expires_at: string;
    }[]).map((i) => ({
      id: i.id,
      email: i.email,
      level: i.access_level,
      token: i.token,
      expires_at: i.expires_at,
    })),
  };
}

/**
 * Invite une personne extérieure dans l'espace. Si elle est déjà invitée
 * ailleurs dans l'organisation, l'accès est ouvert directement ; sinon une
 * invitation (lien à envoyer) est créée.
 */
export async function inviteGuestAction(input: {
  workspaceId: string;
  email: string;
  level: AccessLevel;
}): Promise<
  | { ok: true; mode: "granted" }
  | { ok: true; mode: "invite"; token: string }
  | { ok: false; message: string }
> {
  const { supabase, user } = await requireUser();
  const email = input.email.trim().toLowerCase().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "Adresse e-mail invalide." };
  const level: AccessLevel = input.level === "viewer" ? "viewer" : "editor";

  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, organization_id")
    .eq("id", input.workspaceId)
    .maybeSingle<{ id: string; organization_id: string }>();
  if (!ws) return { ok: false, message: "Espace introuvable." };

  // Déjà membre de l'équipe ou invité de l'organisation ?
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, email")
    .ilike("email", email)
    .limit(1);
  const profile = (existing ?? [])[0] as { id: string } | undefined;
  if (profile) {
    const { data: member } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", ws.organization_id)
      .eq("user_id", profile.id)
      .maybeSingle<{ role: string }>();
    if (member && member.role !== "guest") {
      return { ok: false, message: "Cette personne fait déjà partie de votre équipe." };
    }
    if (member?.role === "guest") {
      const { data: current } = await supabase
        .from("workspace_access")
        .select("id")
        .eq("workspace_id", ws.id)
        .eq("user_id", profile.id)
        .maybeSingle<{ id: string }>();
      const { error } = current
        ? await supabase.from("workspace_access").update({ access_level: level }).eq("id", current.id)
        : await supabase.from("workspace_access").insert({
            organization_id: ws.organization_id,
            workspace_id: ws.id,
            user_id: profile.id,
            access_level: level,
          });
      if (error) return { ok: false, message: "Accès impossible à ouvrir. Vérifiez vos droits sur cet espace." };
      refresh();
      return { ok: true, mode: "granted" };
    }
  }

  const token = randomBytes(24).toString("base64url");
  const { error } = await supabase.from("organization_invites").insert({
    organization_id: ws.organization_id,
    email,
    role: "guest",
    token,
    invited_by: user.id,
    workspace_ids: [ws.id],
    access_level: level,
    expires_at: new Date(Date.now() + 14 * 86_400_000).toISOString(),
  });
  if (error) return { ok: false, message: "Invitation impossible. Vérifiez vos droits sur cet espace." };
  refresh();
  return { ok: true, mode: "invite", token };
}

export async function setGuestLevelAction(accessId: string, level: AccessLevel) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("workspace_access")
    .update({ access_level: level === "viewer" ? "viewer" : "editor" })
    .eq("id", accessId)
    .select("id");
  if (error || !data?.length) return { ok: false as const, message: "Modification impossible." };
  refresh();
  return { ok: true as const };
}

export async function removeGuestAccessAction(accessId: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("workspace_access").delete().eq("id", accessId).select("id");
  if (error || !data?.length) return { ok: false as const, message: "Retrait impossible." };
  refresh();
  return { ok: true as const };
}

export async function cancelGuestInviteAction(inviteId: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("organization_invites").delete().eq("id", inviteId).select("id");
  if (error || !data?.length) return { ok: false as const, message: "Annulation impossible." };
  refresh();
  return { ok: true as const };
}
