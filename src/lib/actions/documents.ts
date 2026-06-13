"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  formatBytes,
  formatStoragePath,
  sanitizeFileName,
  validateFile,
} from "@/lib/files";
import {
  effectiveMaxFileBytes,
  formatStorage,
  resolvePlan,
} from "@/lib/plans";
import { getOrganizationUsage } from "@/lib/usage";
import type { Organization, Workspace } from "@/lib/types/database";

export type DocumentFormState = { ok: boolean; message?: string } | null;

const STORAGE_BUCKET = "documents";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function nullable(formData: FormData, key: string): string | null {
  return text(formData, key) || null;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/**
 * Upload : valide le fichier, l'envoie dans le bucket privé puis crée la ligne
 * documents. Si l'insertion échoue, le fichier uploadé est supprimé (pas
 * d'orphelin). Le chemin est entièrement construit côté serveur.
 */
export async function uploadDocumentAction(
  _prev: DocumentFormState,
  formData: FormData
): Promise<DocumentFormState> {
  const { supabase, user } = await requireUser();

  const workspaceId = text(formData, "workspace_id");
  if (!workspaceId) return { ok: false, message: "Espace client introuvable." };

  // Le workspace est lu via RLS : s'il n'appartient pas à l'organisation de
  // l'utilisateur, il est invisible et l'upload est refusé.
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, organization_id")
    .eq("id", workspaceId)
    .maybeSingle<Pick<Workspace, "id" | "organization_id">>();
  if (!workspace) return { ok: false, message: "Espace client introuvable." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Sélectionnez un fichier à envoyer." };
  }

  // Plan de l'organisation : pilote la taille max par fichier et le quota global.
  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", workspace.organization_id)
    .maybeSingle<Pick<Organization, "plan">>();
  const plan = resolvePlan(org);

  // Limite 1 : taille du fichier (selon le plan).
  const validationError = validateFile(file, effectiveMaxFileBytes(plan));
  if (validationError) return { ok: false, message: validationError };

  // Limite 2 : quota de stockage total de l'organisation.
  const storageLimit = plan.limits.storageBytes;
  if (storageLimit !== null) {
    const usage = await getOrganizationUsage(workspace.organization_id);
    if (usage.storageUsed + file.size > storageLimit) {
      const left = Math.max(0, storageLimit - usage.storageUsed);
      return {
        ok: false,
        message: `Stockage insuffisant : votre plan ${plan.name} est limité à ${formatStorage(storageLimit)} (il reste ${formatBytes(left)}). Supprimez des fichiers ou passez à un plan supérieur.`,
      };
    }
  }

  const title = text(formData, "title") || file.name.replace(/\.[^.]+$/, "");
  const folderId = nullable(formData, "folder_id");
  const documentId = randomUUID();
  const safeName = sanitizeFileName(file.name);
  const filePath = formatStoragePath(
    workspace.organization_id,
    workspace.id,
    documentId,
    safeName
  );

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return {
      ok: false,
      message: "L'envoi du fichier a échoué. Veuillez réessayer.",
    };
  }

  const { error: insertError } = await supabase.from("documents").insert({
    id: documentId,
    organization_id: workspace.organization_id,
    workspace_id: workspace.id,
    folder_id: folderId,
    created_by: user.id,
    title,
    description: nullable(formData, "description"),
    category: nullable(formData, "category"),
    file_path: filePath,
    file_type: file.type || null,
    file_size: file.size,
  });

  if (insertError) {
    // Nettoyage : pas de fichier orphelin si la ligne n'a pas pu être créée.
    await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
    return {
      ok: false,
      message: "Enregistrement impossible. Veuillez réessayer.",
    };
  }

  revalidatePath(`/dashboard/workspaces/${workspace.id}`);
  revalidatePath("/dashboard");
  return { ok: true, message: `« ${title} » a été ajouté.` };
}

/**
 * Modifie titre / description / catégorie. La visibilité et le téléchargement
 * passent par les actions rapides dédiées ; l'état de partage est dérivé
 * (cf. src/lib/document-state.ts), il n'est plus saisi à la main.
 */
export async function updateDocumentAction(
  _prev: DocumentFormState,
  formData: FormData
): Promise<DocumentFormState> {
  const { supabase } = await requireUser();

  const id = text(formData, "document_id");
  if (!id) return { ok: false, message: "Document introuvable." };

  const title = text(formData, "title");
  if (!title) return { ok: false, message: "Le titre est requis." };

  const { error } = await supabase
    .from("documents")
    .update({
      title,
      description: nullable(formData, "description"),
      category: nullable(formData, "category"),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, message: "Mise à jour impossible. Veuillez réessayer." };
  }

  const workspaceId = text(formData, "workspace_id");
  if (workspaceId) revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Modifications enregistrées." };
}

export type QuickToggleResult = { ok: boolean; message?: string };

/**
 * Action rapide : rend un document visible (ou non) dans le portail client.
 * Lecture via RLS : hors organisation → introuvable, rien n'est modifié.
 */
export async function setDocumentVisibilityAction(
  documentId: string,
  visible: boolean
): Promise<QuickToggleResult> {
  const { supabase } = await requireUser();

  const { data: doc } = await supabase
    .from("documents")
    .select("id, workspace_id")
    .eq("id", documentId)
    .maybeSingle<{ id: string; workspace_id: string }>();
  if (!doc) return { ok: false, message: "Document introuvable." };

  const { error } = await supabase
    .from("documents")
    .update({ is_visible_to_client: visible })
    .eq("id", documentId);

  if (error) {
    return { ok: false, message: "Mise à jour impossible. Réessayez." };
  }

  revalidatePath(`/dashboard/workspaces/${doc.workspace_id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Action rapide : autorise (ou non) le téléchargement côté client. */
export async function setDocumentDownloadAction(
  documentId: string,
  allow: boolean
): Promise<QuickToggleResult> {
  const { supabase } = await requireUser();

  const { data: doc } = await supabase
    .from("documents")
    .select("id, workspace_id")
    .eq("id", documentId)
    .maybeSingle<{ id: string; workspace_id: string }>();
  if (!doc) return { ok: false, message: "Document introuvable." };

  const { error } = await supabase
    .from("documents")
    .update({ allow_download: allow })
    .eq("id", documentId);

  if (error) {
    return { ok: false, message: "Mise à jour impossible. Réessayez." };
  }

  revalidatePath(`/dashboard/workspaces/${doc.workspace_id}`);
  return { ok: true };
}

/** Supprime le document et son fichier Storage associé. */
export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();

  const id = text(formData, "document_id");
  if (!id) return;

  // Lecture via RLS : hors organisation → introuvable, rien n'est supprimé.
  const { data: doc } = await supabase
    .from("documents")
    .select("id, file_path, workspace_id")
    .eq("id", id)
    .maybeSingle<{ id: string; file_path: string; workspace_id: string }>();
  if (!doc) return;

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return;

  // Après suppression de la ligne, on retire le fichier. En cas d'échec
  // Storage, le document n'est plus référencé (fichier orphelin inoffensif).
  await supabase.storage.from(STORAGE_BUCKET).remove([doc.file_path]);

  revalidatePath(`/dashboard/workspaces/${doc.workspace_id}`);
  revalidatePath("/dashboard");
}

export type DownloadUrlResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/**
 * Génère une URL signée temporaire (60 s) pour télécharger un document.
 * Le bucket est privé : c'est l'unique voie d'accès aux fichiers.
 */
export async function getDocumentDownloadUrl(
  documentId: string
): Promise<DownloadUrlResult> {
  const { supabase } = await requireUser();

  const { data: doc } = await supabase
    .from("documents")
    .select("file_path")
    .eq("id", documentId)
    .maybeSingle<{ file_path: string }>();
  if (!doc) return { ok: false, message: "Document introuvable." };

  // Nom de téléchargement : nom assaini stocké dans le chemin (uuid retiré).
  const storedName = doc.file_path.split("/").pop() ?? "document";
  const downloadName = storedName.length > 37 ? storedName.slice(37) : storedName;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(doc.file_path, 60, { download: downloadName });

  if (error || !data?.signedUrl) {
    return { ok: false, message: "Téléchargement indisponible. Réessayez." };
  }
  return { ok: true, url: data.signedUrl };
}
