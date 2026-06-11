"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/organizations";
import type { Workspace } from "@/lib/types/database";

export type ShareLinkState = { ok: boolean; message?: string } | null;

const EXPIRY_DAYS: Record<string, number | null> = {
  never: null,
  "7": 7,
  "30": 30,
  "90": 90,
};

function generateToken(): string {
  // 24 octets → ~32 caractères URL-safe, non devinable (192 bits).
  return randomBytes(24).toString("base64url");
}

function expiresAtFrom(value: string): string | null {
  const days = EXPIRY_DAYS[value] ?? null;
  if (days === null) return null;
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

async function authedWorkspace(workspaceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, organization_id")
    .eq("id", workspaceId)
    .maybeSingle<Pick<Workspace, "id" | "organization_id">>();

  return { supabase, user, workspace };
}

/** Crée un lien de portail pour le workspace (désactive un éventuel lien actif). */
export async function createShareLinkAction(
  _prev: ShareLinkState,
  formData: FormData
): Promise<ShareLinkState> {
  const workspaceId = String(formData.get("workspace_id") ?? "");
  const expiry = String(formData.get("expiry") ?? "never");
  if (!workspaceId) return { ok: false, message: "Espace introuvable." };

  const { supabase, user, workspace } = await authedWorkspace(workspaceId);
  if (!workspace) return { ok: false, message: "Espace introuvable." };

  // Un seul lien actif par workspace : on désactive l'éventuel précédent.
  await supabase
    .from("share_links")
    .update({ is_active: false })
    .eq("workspace_id", workspace.id)
    .eq("is_active", true);

  const { error } = await supabase.from("share_links").insert({
    organization_id: workspace.organization_id,
    workspace_id: workspace.id,
    token: generateToken(),
    expires_at: expiresAtFrom(expiry),
    created_by: user.id,
  });

  if (error) {
    return { ok: false, message: "Création du lien impossible. Réessayez." };
  }

  revalidatePath(`/dashboard/workspaces/${workspace.id}`);
  return { ok: true, message: "Lien de portail créé." };
}

/** Désactive le lien actif d'un workspace (form action). */
export async function deactivateShareLinkAction(
  formData: FormData
): Promise<void> {
  const workspaceId = String(formData.get("workspace_id") ?? "");
  if (!workspaceId) return;

  const { supabase, workspace } = await authedWorkspace(workspaceId);
  if (!workspace) return;

  await supabase
    .from("share_links")
    .update({ is_active: false })
    .eq("workspace_id", workspace.id)
    .eq("is_active", true);

  revalidatePath(`/dashboard/workspaces/${workspace.id}`);
}

/** Régénère le lien : désactive l'actif puis en crée un nouveau (form action). */
export async function regenerateShareLinkAction(
  formData: FormData
): Promise<void> {
  const workspaceId = String(formData.get("workspace_id") ?? "");
  if (!workspaceId) return;

  const { supabase, user, workspace } = await authedWorkspace(workspaceId);
  if (!workspace) return;

  await supabase
    .from("share_links")
    .update({ is_active: false })
    .eq("workspace_id", workspace.id)
    .eq("is_active", true);

  await supabase.from("share_links").insert({
    organization_id: workspace.organization_id,
    workspace_id: workspace.id,
    token: generateToken(),
    created_by: user.id,
  });

  revalidatePath(`/dashboard/workspaces/${workspace.id}`);
}

export type PortalDownloadResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/**
 * Génère une URL signée (60 s) pour télécharger un document depuis le portail
 * public. Le chemin n'est résolu (RPC) que si le document est visible,
 * téléchargeable et rattaché à un lien actif. Aucune authentification requise.
 */
export async function getPortalDownloadUrl(
  token: string,
  documentId: string
): Promise<PortalDownloadResult> {
  const supabase = await createClient();

  const { data: path } = await supabase.rpc("get_portal_document_path", {
    p_token: token,
    p_document_id: documentId,
  });

  if (!path || typeof path !== "string") {
    return { ok: false, message: "Document indisponible." };
  }

  const storedName = path.split("/").pop() ?? "document";
  const downloadName =
    storedName.length > 37 ? storedName.slice(37) : storedName;

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, 60, { download: downloadName });

  if (error || !data?.signedUrl) {
    return { ok: false, message: "Téléchargement indisponible. Réessayez." };
  }
  return { ok: true, url: data.signedUrl };
}
