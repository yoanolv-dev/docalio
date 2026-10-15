"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DriveLink } from "@/lib/types/database";

// =============================================================================
// Actions du Drive Pro : corbeille, versions, upload direct, liens de partage,
// recherche globale. La logique sensible vit dans les RPC SQL (SECURITY
// DEFINER + RLS) ; ces actions sont de minces passerelles typées.
// =============================================================================

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

function revalidateWorkspace(workspaceId: string) {
  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  revalidatePath("/dashboard");
}

function friendly(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  // Les RPC lèvent des messages en français prêts à afficher ; le reste
  // (erreurs Postgres techniques) est remplacé par le libellé générique.
  return /^[A-ZÀ-Ü]/.test(message) && message.length < 120 ? message : fallback;
}

// -----------------------------------------------------------------------------
// Corbeille
// -----------------------------------------------------------------------------

/** Met à la corbeille des dossiers et/ou fichiers (sous-arbres compris). */
export async function trashItemsAction(
  workspaceId: string,
  folderIds: string[],
  documentIds: string[]
): Promise<DriveResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("drive_trash", {
    p_folder_ids: folderIds,
    p_document_ids: documentIds,
  });
  if (error) {
    return { ok: false, message: friendly(error.message, "Suppression impossible.") };
  }
  revalidateWorkspace(workspaceId);
  return { ok: true };
}

/** Restaure des éléments de la corbeille (sous-arbres compris). */
export async function restoreItemsAction(
  workspaceId: string,
  folderIds: string[],
  documentIds: string[]
): Promise<DriveResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("drive_restore", {
    p_folder_ids: folderIds,
    p_document_ids: documentIds,
  });
  if (error) {
    return { ok: false, message: friendly(error.message, "Restauration impossible.") };
  }
  revalidateWorkspace(workspaceId);
  return { ok: true };
}

/**
 * Suppression définitive d'éléments de la corbeille : la RPC calcule le
 * périmètre exact (ids + chemins Storage, versions comprises), puis on
 * supprime les lignes et enfin les fichiers.
 */
export async function purgeItemsAction(
  workspaceId: string,
  folderIds: string[],
  documentIds: string[]
): Promise<DriveResult> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc("drive_purge_plan", {
    p_folder_ids: folderIds,
    p_document_ids: documentIds,
  });
  if (error || !data) {
    return { ok: false, message: "Suppression impossible. Réessayez." };
  }

  const plan = data as {
    folder_ids: string[];
    document_ids: string[];
    paths: string[];
  };

  if (plan.folder_ids.length > 0) {
    const { error: e } = await supabase
      .from("folders")
      .delete()
      .in("id", plan.folder_ids);
    if (e) return { ok: false, message: "Suppression impossible. Réessayez." };
  }
  if (plan.document_ids.length > 0) {
    const { error: e } = await supabase
      .from("documents")
      .delete()
      .in("id", plan.document_ids);
    if (e) return { ok: false, message: "Suppression impossible. Réessayez." };
  }

  // Fichiers retirés en dernier : en cas d'échec, ils ne sont plus référencés.
  if (plan.paths.length > 0) {
    await supabase.storage.from(STORAGE_BUCKET).remove(plan.paths);
  }

  revalidateWorkspace(workspaceId);
  return { ok: true };
}

/** Vide entièrement la corbeille d'un espace. */
export async function emptyTrashAction(
  workspaceId: string
): Promise<DriveResult> {
  const { supabase } = await requireUser();

  const { data } = await supabase
    .from("drive_trash_items")
    .select("kind, id")
    .eq("workspace_id", workspaceId);
  const items = (data as { kind: "folder" | "file"; id: string }[] | null) ?? [];
  if (items.length === 0) return { ok: true };

  return purgeItemsAction(
    workspaceId,
    items.filter((i) => i.kind === "folder").map((i) => i.id),
    items.filter((i) => i.kind === "file").map((i) => i.id)
  );
}

// -----------------------------------------------------------------------------
// Aperçu (visionneuse intégrée)
// -----------------------------------------------------------------------------

export type PreviewUrlResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/** URL signée temporaire pour l'aperçu inline (sans forcer le téléchargement). */
export async function getDocumentPreviewUrl(
  documentId: string
): Promise<PreviewUrlResult> {
  const { supabase } = await requireUser();

  const { data: doc } = await supabase
    .from("documents")
    .select("file_path")
    .eq("id", documentId)
    .maybeSingle<{ file_path: string }>();
  if (!doc) return { ok: false, message: "Fichier introuvable." };

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(doc.file_path, 600);
  if (error || !data?.signedUrl) {
    return { ok: false, message: "Aperçu indisponible. Réessayez." };
  }
  return { ok: true, url: data.signedUrl };
}

// -----------------------------------------------------------------------------
// Upload direct (le fichier part du navigateur vers le Storage, puis est
// enregistré ici — aucune limite liée au serveur Next, progression réelle)
// -----------------------------------------------------------------------------

export type RegisterUploadResult =
  | { ok: true; id: string; version: number; replaced: boolean }
  | { ok: false; message: string };

export async function registerUploadAction(input: {
  workspaceId: string;
  folderId: string | null;
  path: string;
  name: string;
  type: string | null;
  replaceDocumentId?: string | null;
}): Promise<RegisterUploadResult> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc("drive_register_upload", {
    p_workspace_id: input.workspaceId,
    p_folder_id: input.folderId,
    p_path: input.path,
    p_name: input.name,
    p_type: input.type,
    p_replace_document_id: input.replaceDocumentId ?? null,
  });

  if (error || !data) {
    // Fichier orphelin retiré : la ligne n'a pas pu être créée.
    await supabase.storage.from(STORAGE_BUCKET).remove([input.path]);
    const message = error?.message?.includes("Quota")
      ? "Stockage insuffisant : votre plan est au maximum. Libérez de l'espace ou passez à un plan supérieur."
      : friendly(error?.message, "Enregistrement impossible. Réessayez.");
    return { ok: false, message };
  }

  const r = data as { id: string; version: number; replaced: boolean };
  revalidateWorkspace(input.workspaceId);
  return { ok: true, id: r.id, version: r.version, replaced: r.replaced };
}

/** Crée (ou retrouve) une chaîne de dossiers — import d'un dossier du poste. */
export async function ensureFolderPathAction(
  workspaceId: string,
  parentId: string | null,
  names: string[]
): Promise<{ ok: true; folderId: string | null } | { ok: false; message: string }> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("drive_ensure_folder_path", {
    p_workspace_id: workspaceId,
    p_parent_id: parentId,
    p_names: names,
  });
  if (error) {
    return { ok: false, message: friendly(error.message, "Création du dossier impossible.") };
  }
  return { ok: true, folderId: (data as string | null) ?? null };
}

// -----------------------------------------------------------------------------
// Versions
// -----------------------------------------------------------------------------

/** Rétablit une ancienne version d'un fichier (la version courante est archivée). */
export async function restoreVersionAction(
  workspaceId: string,
  versionId: string
): Promise<DriveResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("drive_restore_version", {
    p_version_id: versionId,
  });
  if (error) {
    return { ok: false, message: friendly(error.message, "Restauration impossible.") };
  }
  revalidateWorkspace(workspaceId);
  return { ok: true };
}

/** URL signée pour télécharger une version archivée. */
export async function getVersionDownloadUrl(
  versionId: string
): Promise<PreviewUrlResult> {
  const { supabase } = await requireUser();

  const { data: version } = await supabase
    .from("document_versions")
    .select("file_path, version, document_id")
    .eq("id", versionId)
    .maybeSingle<{ file_path: string; version: number; document_id: string }>();
  if (!version) return { ok: false, message: "Version introuvable." };

  const storedName = version.file_path.split("/").pop() ?? "document";
  const baseName = storedName.length > 37 ? storedName.slice(37) : storedName;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(version.file_path, 60, {
      download: `v${version.version}-${baseName}`,
    });
  if (error || !data?.signedUrl) {
    return { ok: false, message: "Téléchargement indisponible. Réessayez." };
  }
  return { ok: true, url: data.signedUrl };
}

/** Liste les versions archivées d'un fichier (pour l'historique). */
export async function listVersionsAction(documentId: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("document_versions")
    .select("id, version, file_size, file_type, created_at, created_by")
    .eq("document_id", documentId)
    .order("version", { ascending: false });
  return (data ?? []) as {
    id: string;
    version: number;
    file_size: number | null;
    file_type: string | null;
    created_at: string;
    created_by: string | null;
  }[];
}

// -----------------------------------------------------------------------------
// Liens de partage par fichier / dossier / espace
// -----------------------------------------------------------------------------

export type CreateLinkResult =
  | { ok: true; id: string; token: string }
  | { ok: false; message: string };

export async function createDriveLinkAction(input: {
  workspaceId: string;
  folderId?: string | null;
  documentId?: string | null;
  canView?: boolean;
  canDownload?: boolean;
  canUpload?: boolean;
  expiresAt?: string | null;
  password?: string | null;
  label?: string | null;
}): Promise<CreateLinkResult> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc("create_drive_link", {
    p_workspace_id: input.workspaceId,
    p_folder_id: input.folderId ?? null,
    p_document_id: input.documentId ?? null,
    p_can_view: input.canView ?? true,
    p_can_download: input.canDownload ?? true,
    p_can_upload: input.canUpload ?? false,
    p_expires_at: input.expiresAt ?? null,
    p_password: input.password ?? null,
    p_label: input.label ?? null,
  });
  if (error || !data) {
    return { ok: false, message: friendly(error?.message, "Création du lien impossible.") };
  }

  const r = data as { id: string; token: string };
  revalidatePath(`/dashboard/workspaces/${input.workspaceId}`);
  return { ok: true, id: r.id, token: r.token };
}

export async function updateDriveLinkAction(input: {
  workspaceId: string;
  linkId: string;
  canView?: boolean;
  canDownload?: boolean;
  canUpload?: boolean;
  expiresAt?: string | null;
  clearExpiry?: boolean;
  /** `""` retire le mot de passe, une valeur le remplace, null ne change rien. */
  password?: string | null;
  label?: string | null;
}): Promise<DriveResult> {
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("update_drive_link", {
    p_link_id: input.linkId,
    p_can_view: input.canView ?? null,
    p_can_download: input.canDownload ?? null,
    p_can_upload: input.canUpload ?? null,
    p_expires_at: input.expiresAt ?? null,
    p_clear_expiry: input.clearExpiry ?? false,
    p_password: input.password ?? null,
    p_label: input.label ?? null,
  });
  if (error) {
    return { ok: false, message: friendly(error.message, "Mise à jour impossible.") };
  }
  revalidatePath(`/dashboard/workspaces/${input.workspaceId}`);
  return { ok: true };
}

/** Révoque un lien : l'URL cesse de fonctionner immédiatement. */
export async function revokeDriveLinkAction(
  workspaceId: string,
  linkId: string
): Promise<DriveResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("drive_links")
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq("id", linkId);
  if (error) return { ok: false, message: "Révocation impossible. Réessayez." };
  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  return { ok: true };
}

/** Liens actifs d'un élément précis (fichier, dossier, ou espace entier). */
export async function listItemLinksAction(target: {
  workspaceId: string;
  folderId?: string | null;
  documentId?: string | null;
}): Promise<DriveLink[]> {
  const { supabase } = await requireUser();
  let query = supabase
    .from("drive_links")
    .select("*")
    .eq("workspace_id", target.workspaceId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (target.documentId) {
    query = query.eq("document_id", target.documentId);
  } else if (target.folderId) {
    query = query.eq("folder_id", target.folderId);
  } else {
    query = query.is("folder_id", null).is("document_id", null);
  }
  const { data } = await query;
  return (data as DriveLink[] | null) ?? [];
}

// -----------------------------------------------------------------------------
// Recherche globale (palette ⌘K)
// -----------------------------------------------------------------------------

export interface SearchResults {
  workspaces: { id: string; name: string; space_type: string }[];
  folders: { id: string; name: string; workspace_id: string; workspace_name: string }[];
  documents: {
    id: string;
    title: string;
    file_path: string;
    folder_id: string | null;
    workspace_id: string;
    workspace_name: string;
  }[];
}

/** Recherche instantanée dans les espaces, dossiers et fichiers accessibles. */
export async function searchDriveAction(rawQuery: string): Promise<SearchResults> {
  const empty: SearchResults = { workspaces: [], folders: [], documents: [] };
  const q = rawQuery.trim();
  if (q.length < 2) return empty;

  const { supabase } = await requireUser();
  // Échappe les métacaractères du motif LIKE.
  const pattern = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;

  const [ws, folders, docs] = await Promise.all([
    supabase
      .from("workspaces")
      .select("id, name, space_type")
      .ilike("name", pattern)
      .limit(5),
    supabase
      .from("folders")
      .select("id, name, workspace_id, workspaces!inner(name)")
      .is("deleted_at", null)
      .ilike("name", pattern)
      .limit(6),
    supabase
      .from("documents")
      .select("id, title, file_path, folder_id, workspace_id, workspaces!inner(name)")
      .is("deleted_at", null)
      .ilike("title", pattern)
      .limit(8),
  ]);

  type WithWs = { workspaces: { name: string } | { name: string }[] };
  const wsName = (row: WithWs) =>
    Array.isArray(row.workspaces) ? row.workspaces[0]?.name ?? "" : row.workspaces.name;

  return {
    workspaces:
      (ws.data as SearchResults["workspaces"] | null) ?? [],
    folders: ((folders.data as (SearchResults["folders"][number] & WithWs)[] | null) ?? []).map(
      (f) => ({
        id: f.id,
        name: f.name,
        workspace_id: f.workspace_id,
        workspace_name: wsName(f),
      })
    ),
    documents: ((docs.data as (SearchResults["documents"][number] & WithWs)[] | null) ?? []).map(
      (d) => ({
        id: d.id,
        title: d.title,
        file_path: d.file_path,
        folder_id: d.folder_id,
        workspace_id: d.workspace_id,
        workspace_name: wsName(d),
      })
    ),
  };
}
