"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/organizations";
import type { WorkspaceStatus } from "@/lib/types/database";

export type WorkspaceFormState = { ok: boolean; message?: string } | null;

const STATUSES: WorkspaceStatus[] = ["prospect", "active", "archived"];

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function nullable(formData: FormData, key: string): string | null {
  return text(formData, key) || null;
}

export async function createWorkspaceAction(
  _prev: WorkspaceFormState,
  formData: FormData
): Promise<WorkspaceFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");

  const name = text(formData, "name");
  if (!name) return { ok: false, message: "Le nom de l'espace est requis." };

  const status = text(formData, "status") as WorkspaceStatus;
  if (!STATUSES.includes(status)) {
    return { ok: false, message: "Statut invalide." };
  }

  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      organization_id: membership.organization.id,
      created_by: user.id,
      name,
      client_company: nullable(formData, "client_company"),
      client_email: nullable(formData, "client_email"),
      client_phone: nullable(formData, "client_phone"),
      status,
      primary_color: nullable(formData, "primary_color"),
      internal_note: nullable(formData, "internal_note"),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, message: "Création impossible. Veuillez réessayer." };
  }

  revalidatePath("/dashboard/workspaces");
  revalidatePath("/dashboard");
  redirect(`/dashboard/workspaces/${data.id}`);
}

export async function updateWorkspaceAction(
  _prev: WorkspaceFormState,
  formData: FormData
): Promise<WorkspaceFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = text(formData, "workspace_id");
  if (!id) return { ok: false, message: "Espace introuvable." };

  const name = text(formData, "name");
  if (!name) return { ok: false, message: "Le nom de l'espace est requis." };

  const status = text(formData, "status") as WorkspaceStatus;
  if (!STATUSES.includes(status)) {
    return { ok: false, message: "Statut invalide." };
  }

  const { error } = await supabase
    .from("workspaces")
    .update({
      name,
      client_company: nullable(formData, "client_company"),
      client_email: nullable(formData, "client_email"),
      client_phone: nullable(formData, "client_phone"),
      status,
      primary_color: nullable(formData, "primary_color"),
      internal_note: nullable(formData, "internal_note"),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, message: "Mise à jour impossible. Veuillez réessayer." };
  }

  revalidatePath("/dashboard/workspaces");
  revalidatePath(`/dashboard/workspaces/${id}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Modifications enregistrées." };
}

/** Archive (status = archived) — appelée depuis un <form action>. */
export async function archiveWorkspaceAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = text(formData, "workspace_id");
  if (!id) return;

  await supabase.from("workspaces").update({ status: "archived" }).eq("id", id);

  revalidatePath("/dashboard/workspaces");
  revalidatePath(`/dashboard/workspaces/${id}`);
  revalidatePath("/dashboard");
}

/**
 * Suppression définitive — appelée depuis un <form action>.
 * Les documents sont supprimés en cascade (FK) ; on nettoie aussi les
 * fichiers Storage du workspace pour ne pas laisser d'orphelins.
 */
export async function deleteWorkspaceAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = text(formData, "workspace_id");
  if (!id) return;

  // Lecture via RLS : hors organisation → introuvable, rien n'est supprimé.
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, organization_id")
    .eq("id", id)
    .maybeSingle<{ id: string; organization_id: string }>();
  if (!workspace) return;

  const prefix = `organizations/${workspace.organization_id}/workspaces/${workspace.id}`;
  const { data: files } = await supabase.storage.from("documents").list(prefix);
  if (files && files.length > 0) {
    await supabase.storage
      .from("documents")
      .remove(files.map((f) => `${prefix}/${f.name}`));
  }

  await supabase.from("workspaces").delete().eq("id", id);

  revalidatePath("/dashboard/workspaces");
  revalidatePath("/dashboard");
  redirect("/dashboard/workspaces");
}
