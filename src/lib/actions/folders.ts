"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { collectDescendantIds } from "@/lib/folder-tree";
import { formatBytes, formatStoragePath } from "@/lib/files";
import { formatStorage, resolvePlan } from "@/lib/plans";
import { getOrganizationUsage } from "@/lib/usage";
import type { Folder, Organization } from "@/lib/types/database";

const STORAGE_BUCKET = "documents";

export type DriveResult = { ok: boolean; message?: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Lit le workspace (et son organisation) via RLS, ou null si hors périmètre. */
async function getWorkspaceRef(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string
) {
  const { data } = await supabase
    .from("workspaces")
    .select("id, organization_id")
    .eq("id", workspaceId)
    .maybeSingle<{ id: string; organization_id: string }>();
  return data;
}

// -----------------------------------------------------------------------------
// Dossiers
// -----------------------------------------------------------------------------

/** Crée un dossier (à la racine ou dans un dossier parent du même espace). */
export async function createFolderAction(
  workspaceId: string,
  parentId: string | null,
  rawName: string
): Promise<DriveResult> {
  const { supabase, user } = await requireUser();

  const name = rawName.trim();
  if (!name) return { ok: false, message: "Le nom du dossier est requis." };
  if (name.length > 120) return { ok: false, message: "Nom trop long." };

  const workspace = await getWorkspaceRef(supabase, workspaceId);
  if (!workspace) return { ok: false, message: "Espace introuvable." };

  const { error } = await supabase.from("folders").insert({
    organization_id: workspace.organization_id,
    workspace_id: workspace.id,
    parent_id: parentId,
    name,
    created_by: user.id,
  });

  if (error) return { ok: false, message: "Création impossible. Réessayez." };

  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  return { ok: true };
}

/** Renomme un dossier. */
export async function renameFolderAction(
  folderId: string,
  rawName: string
): Promise<DriveResult> {
  const { supabase } = await requireUser();

  const name = rawName.trim();
  if (!name) return { ok: false, message: "Le nom est requis." };
  if (name.length > 120) return { ok: false, message: "Nom trop long." };

  const { data: folder } = await supabase
    .from("folders")
    .select("id, workspace_id")
    .eq("id", folderId)
    .maybeSingle<Pick<Folder, "id" | "workspace_id">>();
  if (!folder) return { ok: false, message: "Dossier introuvable." };

  const { error } = await supabase
    .from("folders")
    .update({ name })
    .eq("id", folderId);
  if (error) return { ok: false, message: "Renommage impossible. Réessayez." };

  revalidatePath(`/dashboard/workspaces/${folder.workspace_id}`);
  return { ok: true };
}

/**
 * Déplace un dossier sous un autre (ou à la racine si target null).
 * Refuse de déplacer un dossier dans lui-même ou l'un de ses descendants
 * (sinon cycle). Le même-espace est garanti par la FK composite en base.
 */
export async function moveFolderAction(
  folderId: string,
  targetParentId: string | null
): Promise<DriveResult> {
  const { supabase } = await requireUser();

  if (folderId === targetParentId) {
    return { ok: false, message: "Destination invalide." };
  }

  const { data: folder } = await supabase
    .from("folders")
    .select("id, workspace_id, parent_id")
    .eq("id", folderId)
    .maybeSingle<Pick<Folder, "id" | "workspace_id" | "parent_id">>();
  if (!folder) return { ok: false, message: "Dossier introuvable." };

  if ((folder.parent_id ?? null) === (targetParentId ?? null)) {
    return { ok: true }; // déjà au bon endroit
  }

  const { data: all } = await supabase
    .from("folders")
    .select("id, parent_id, name, workspace_id, organization_id, created_by, created_at, updated_at")
    .eq("workspace_id", folder.workspace_id);
  const folders = (all as Folder[] | null) ?? [];

  if (targetParentId) {
    const descendants = collectDescendantIds(folders, folderId);
    if (descendants.has(targetParentId)) {
      return {
        ok: false,
        message: "Impossible de déplacer un dossier dans l'un de ses sous-dossiers.",
      };
    }
  }

  const { error } = await supabase
    .from("folders")
    .update({ parent_id: targetParentId })
    .eq("id", folderId);
  if (error) return { ok: false, message: "Déplacement impossible. Réessayez." };

  revalidatePath(`/dashboard/workspaces/${folder.workspace_id}`);
  return { ok: true };
}

/**
 * Supprime un dossier et tout son contenu (sous-dossiers + documents).
 * Les fichiers Storage du sous-arbre sont retirés avant la suppression de la
 * ligne (la cascade SQL supprime ensuite dossiers et documents).
 */
export async function deleteFolderAction(
  folderId: string
): Promise<DriveResult> {
  const { supabase } = await requireUser();

  const { data: folder } = await supabase
    .from("folders")
    .select("id, workspace_id")
    .eq("id", folderId)
    .maybeSingle<Pick<Folder, "id" | "workspace_id">>();
  if (!folder) return { ok: false, message: "Dossier introuvable." };

  const { data: all } = await supabase
    .from("folders")
    .select("id, parent_id, name, workspace_id, organization_id, created_by, created_at, updated_at")
    .eq("workspace_id", folder.workspace_id);
  const folders = (all as Folder[] | null) ?? [];
  const subtree = [...collectDescendantIds(folders, folderId)];

  // Chemins Storage de tous les documents du sous-arbre.
  const { data: docs } = await supabase
    .from("documents")
    .select("file_path")
    .in("folder_id", subtree);
  const paths = ((docs as { file_path: string }[] | null) ?? []).map(
    (d) => d.file_path
  );

  const { error } = await supabase.from("folders").delete().eq("id", folderId);
  if (error) return { ok: false, message: "Suppression impossible. Réessayez." };

  if (paths.length > 0) {
    await supabase.storage.from(STORAGE_BUCKET).remove(paths);
  }

  revalidatePath(`/dashboard/workspaces/${folder.workspace_id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

// -----------------------------------------------------------------------------
// Documents : déplacer / dupliquer
// -----------------------------------------------------------------------------

/** Déplace un document vers un dossier (ou la racine si target null). */
export async function moveDocumentAction(
  documentId: string,
  targetFolderId: string | null
): Promise<DriveResult> {
  const { supabase } = await requireUser();

  const { data: doc } = await supabase
    .from("documents")
    .select("id, workspace_id")
    .eq("id", documentId)
    .maybeSingle<{ id: string; workspace_id: string }>();
  if (!doc) return { ok: false, message: "Document introuvable." };

  const { error } = await supabase
    .from("documents")
    .update({ folder_id: targetFolderId })
    .eq("id", documentId);
  // Une violation de FK signifie un dossier d'un autre espace : on le dit clairement.
  if (error) return { ok: false, message: "Déplacement impossible. Réessayez." };

  revalidatePath(`/dashboard/workspaces/${doc.workspace_id}`);
  return { ok: true };
}

/**
 * Duplique un document : copie le fichier dans le bucket privé puis crée une
 * nouvelle ligne. La copie démarre privée (non visible client) par sécurité.
 * Respecte le quota de stockage de l'organisation.
 */
export async function duplicateDocumentAction(
  documentId: string
): Promise<DriveResult> {
  const { supabase, user } = await requireUser();

  const { data: doc } = await supabase
    .from("documents")
    .select(
      "id, organization_id, workspace_id, folder_id, title, description, category, file_path, file_type, file_size, allow_download"
    )
    .eq("id", documentId)
    .maybeSingle<{
      id: string;
      organization_id: string;
      workspace_id: string;
      folder_id: string | null;
      title: string;
      description: string | null;
      category: string | null;
      file_path: string;
      file_type: string | null;
      file_size: number | null;
    }>();
  if (!doc) return { ok: false, message: "Document introuvable." };

  // Quota : la copie consomme l'équivalent de la taille du fichier.
  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", doc.organization_id)
    .maybeSingle<Pick<Organization, "plan">>();
  const plan = resolvePlan(org);
  const storageLimit = plan.limits.storageBytes;
  if (storageLimit !== null && doc.file_size) {
    const usage = await getOrganizationUsage(doc.organization_id);
    if (usage.storageUsed + doc.file_size > storageLimit) {
      const left = Math.max(0, storageLimit - usage.storageUsed);
      return {
        ok: false,
        message: `Stockage insuffisant pour dupliquer (il reste ${formatBytes(left)} sur ${formatStorage(storageLimit)}).`,
      };
    }
  }

  // Nom de fichier d'origine (sans le préfixe uuid-) pour reconstruire un chemin.
  const storedName = doc.file_path.split("/").pop() ?? "document";
  const safeName = storedName.length > 37 ? storedName.slice(37) : storedName;
  const newId = randomUUID();
  const newPath = formatStoragePath(
    doc.organization_id,
    doc.workspace_id,
    newId,
    safeName
  );

  const { error: copyError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .copy(doc.file_path, newPath);
  if (copyError) {
    return { ok: false, message: "Duplication du fichier impossible. Réessayez." };
  }

  const { error: insertError } = await supabase.from("documents").insert({
    id: newId,
    organization_id: doc.organization_id,
    workspace_id: doc.workspace_id,
    folder_id: doc.folder_id,
    created_by: user.id,
    title: `${doc.title} (copie)`,
    description: doc.description,
    category: doc.category,
    file_path: newPath,
    file_type: doc.file_type,
    file_size: doc.file_size,
    is_visible_to_client: false,
  });

  if (insertError) {
    await supabase.storage.from(STORAGE_BUCKET).remove([newPath]);
    return { ok: false, message: "Duplication impossible. Réessayez." };
  }

  revalidatePath(`/dashboard/workspaces/${doc.workspace_id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
