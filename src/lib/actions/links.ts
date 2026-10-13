"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DriveLink } from "@/lib/types/database";

// =============================================================================
// Liens de partage d'un fichier, d'un dossier ou d'un espace. La création et
// la modification passent par des fonctions SQL qui vérifient le droit
// d'écriture sur l'espace et hachent le mot de passe (jamais stocké en clair).
// =============================================================================

export type LinkPermission = "view" | "download" | "upload" | "download_upload";

export interface LinkTarget {
  workspaceId: string;
  folderId: string | null;
  documentId: string | null;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return supabase;
}

function flags(permission: LinkPermission) {
  return {
    can_view: permission !== "upload",
    can_download: permission === "download" || permission === "download_upload",
    can_upload: permission === "upload" || permission === "download_upload",
  };
}

function friendly(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  for (const known of [
    "Mot de passe trop court",
    "Date d'expiration passée",
    "Choisissez au moins une permission",
    "Dossier introuvable",
    "Fichier introuvable",
  ]) {
    if (message.includes(known)) return `${known}.`;
  }
  return fallback;
}

/** Liens actifs ciblant exactement cet élément (fichier, dossier ou espace). */
export async function listItemLinksAction(target: LinkTarget): Promise<DriveLink[]> {
  const supabase = await requireUser();
  let q = supabase
    .from("drive_links")
    .select("*")
    .eq("workspace_id", target.workspaceId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (target.documentId) q = q.eq("document_id", target.documentId);
  else if (target.folderId) q = q.eq("folder_id", target.folderId).is("document_id", null);
  else q = q.is("folder_id", null).is("document_id", null);
  const { data } = await q;
  return (data ?? []) as DriveLink[];
}

export async function createLinkAction(input: LinkTarget & {
  permission: LinkPermission;
  expiresAt: string | null;
  password: string | null;
  label: string | null;
}): Promise<{ ok: true; token: string } | { ok: false; message: string }> {
  const supabase = await requireUser();
  const f = flags(input.permission);
  const { data, error } = await supabase.rpc("create_drive_link", {
    p_workspace_id: input.workspaceId,
    p_folder_id: input.folderId,
    p_document_id: input.documentId,
    p_can_view: f.can_view,
    p_can_download: f.can_download,
    p_can_upload: input.documentId ? false : f.can_upload,
    p_expires_at: input.expiresAt,
    p_password: input.password?.trim() || null,
    p_label: input.label?.trim() || null,
  });
  if (error || !data) {
    return { ok: false, message: friendly(error?.message, "Création du lien impossible. Vérifiez vos droits sur cet espace.") };
  }
  refresh();
  return { ok: true, token: (data as { token: string }).token };
}

export async function updateLinkAction(
  linkId: string,
  input: {
    permission?: LinkPermission;
    expiresAt?: string | null;
    clearExpiry?: boolean;
    /** null = inchangé, "" = retirer le mot de passe. */
    password?: string | null;
    label?: string | null;
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await requireUser();
  const f = input.permission ? flags(input.permission) : null;
  const { error } = await supabase.rpc("update_drive_link", {
    p_link_id: linkId,
    p_can_view: f?.can_view ?? null,
    p_can_download: f?.can_download ?? null,
    p_can_upload: f?.can_upload ?? null,
    p_expires_at: input.expiresAt ?? null,
    p_clear_expiry: Boolean(input.clearExpiry),
    p_password: input.password === undefined ? null : input.password,
    p_label: input.label === undefined ? null : input.label ?? "",
  });
  if (error) return { ok: false, message: friendly(error.message, "Modification impossible. Réessayez.") };
  refresh();
  return { ok: true };
}

/** Révoque un lien : il cesse immédiatement de fonctionner. */
export async function revokeLinkAction(linkId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await requireUser();
  const { data, error } = await supabase
    .from("drive_links")
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq("id", linkId)
    .select("id");
  if (error || !data?.length) return { ok: false, message: "Révocation impossible. Vérifiez vos droits sur cet espace." };
  refresh();
  return { ok: true };
}
