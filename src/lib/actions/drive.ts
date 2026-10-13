"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/organizations";
import { collectDescendantIds } from "@/lib/folder-tree";
import {
  cleanItemName,
  formatBytes,
  formatStoragePath,
  sanitizeFileName,
  validateDriveFile,
} from "@/lib/files";
import { effectiveMaxFileBytes, formatStorage, resolvePlan } from "@/lib/plans";
import { getOrganizationUsage } from "@/lib/usage";
import {
  getFileDetails,
  searchDrive,
  TRASH_RETENTION_DAYS,
  type FileDetails,
  type SearchResults,
} from "@/lib/drive";
import type { Organization } from "@/lib/types/database";

// =============================================================================
// Actions du Drive. Toutes s'exécutent avec la session de l'utilisateur : la
// RLS (lecture / écriture par espace) reste l'unique autorité. Aucune clé de
// service, aucun contournement.
// =============================================================================

const BUCKET = "documents";

export type ActionResult = { ok: true } | { ok: false; message: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function workspaceRef(supabase: Supabase, workspaceId: string) {
  const { data } = await supabase
    .from("workspaces")
    .select("id, organization_id, space_type")
    .eq("id", workspaceId)
    .maybeSingle<{ id: string; organization_id: string; space_type: string }>();
  return data;
}

async function canWrite(supabase: Supabase, workspaceId: string): Promise<boolean> {
  const { data } = await supabase.rpc("can_write_workspace", { p_workspace_id: workspaceId });
  return Boolean(data);
}

/** Message lisible pour une erreur Postgres (exceptions de nos fonctions). */
function dbMessage(error: { message?: string } | null, fallback: string): string {
  const msg = error?.message ?? "";
  if (msg.includes("Quota de stockage")) {
    return "Quota de stockage atteint : libérez de l'espace (corbeille comprise) ou passez au forfait supérieur.";
  }
  if (msg.includes("lecture seule")) return "Vous avez un accès en lecture seule à cet espace.";
  if (msg.includes("introuvable")) return msg.replace(/^.*?:\s*/, "");
  return fallback;
}

// -----------------------------------------------------------------------------
// Envoi de fichiers : préparation, enregistrement, nettoyage
// -----------------------------------------------------------------------------

export type PreparedUpload = { path: string } | { error: string };

export type PrepareUploadResult =
  | { ok: true; uploads: PreparedUpload[]; maxBytes: number }
  | { ok: false; message: string };

/**
 * Vérifie les droits, la taille et le quota, puis réserve un chemin Storage
 * par fichier. Le navigateur dépose ensuite directement dans le bucket privé.
 */
export async function prepareUploadAction(input: {
  workspaceId: string;
  files: { name: string; size: number }[];
}): Promise<PrepareUploadResult> {
  const { supabase } = await requireUser();

  const ws = await workspaceRef(supabase, input.workspaceId);
  if (!ws) return { ok: false, message: "Espace introuvable." };
  if (!(await canWrite(supabase, ws.id))) {
    return { ok: false, message: "Vous avez un accès en lecture seule à cet espace." };
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", ws.organization_id)
    .maybeSingle<Pick<Organization, "plan">>();
  const plan = resolvePlan(org);
  const maxBytes = effectiveMaxFileBytes(plan);

  // Quota global : le lot entier doit tenir dans l'espace restant (la base le
  // vérifie de nouveau à l'enregistrement de chaque fichier).
  const limit = plan.limits.storageBytes;
  if (limit !== null) {
    const usage = await getOrganizationUsage(ws.organization_id);
    const total = input.files.reduce((sum, f) => sum + Math.max(0, f.size), 0);
    if (usage.storageUsed + total > limit) {
      const left = Math.max(0, limit - usage.storageUsed);
      return {
        ok: false,
        message: `Stockage insuffisant : il reste ${formatBytes(left)} sur ${formatStorage(limit)}. Videz la corbeille ou passez au forfait supérieur.`,
      };
    }
  }

  const uploads: PreparedUpload[] = input.files.slice(0, 500).map((f) => {
    const error = validateDriveFile(f, maxBytes);
    if (error) return { error };
    return {
      path: formatStoragePath(ws.organization_id, ws.id, randomUUID(), sanitizeFileName(f.name)),
    };
  });

  return { ok: true, uploads, maxBytes };
}

export type RegisterUploadResult =
  | { ok: true; id: string; replaced: boolean }
  | { ok: false; message: string };

/** Enregistre un fichier déposé (ou une nouvelle version d'un fichier). */
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
    p_name: cleanItemName(input.name),
    p_type: input.type,
    p_replace_document_id: input.replaceDocumentId ?? null,
  });

  if (error || !data) {
    // Le fichier déposé n'est rattaché à rien : on le retire du Storage.
    await supabase.storage.from(BUCKET).remove([input.path]);
    return { ok: false, message: dbMessage(error, "Enregistrement impossible. Réessayez.") };
  }
  const result = data as { id: string; replaced: boolean };
  return { ok: true, id: result.id, replaced: result.replaced };
}

/** Retire des dépôts interrompus (annulation, erreur réseau). */
export async function discardUploadsAction(paths: string[]): Promise<void> {
  const { supabase } = await requireUser();
  const clean = paths.filter((p) => typeof p === "string" && p.startsWith("organizations/")).slice(0, 500);
  if (clean.length) await supabase.storage.from(BUCKET).remove(clean);
}

/** Crée (au besoin) une arborescence de dossiers : import d'un dossier entier. */
export async function ensureFolderPathAction(
  workspaceId: string,
  parentId: string | null,
  names: string[]
): Promise<{ ok: true; folderId: string | null } | { ok: false; message: string }> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("drive_ensure_folder_path", {
    p_workspace_id: workspaceId,
    p_parent_id: parentId,
    p_names: names.map((n) => cleanItemName(n, 120)).filter(Boolean).slice(0, 40),
  });
  if (error) return { ok: false, message: dbMessage(error, "Création des dossiers impossible.") };
  return { ok: true, folderId: (data as string | null) ?? null };
}

/** Rafraîchit la page courante (fin d'un lot d'envois). */
export async function refreshDriveAction(): Promise<void> {
  refresh();
}

// -----------------------------------------------------------------------------
// Dossiers et fichiers : créer, renommer, déplacer
// -----------------------------------------------------------------------------

export async function createFolderAction(
  workspaceId: string,
  parentId: string | null,
  rawName: string
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const { supabase, user } = await requireUser();
  const name = cleanItemName(rawName, 120);
  if (!name) return { ok: false, message: "Le nom du dossier est requis." };

  const ws = await workspaceRef(supabase, workspaceId);
  if (!ws) return { ok: false, message: "Espace introuvable." };

  let dup = supabase
    .from("folders")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .ilike("name", name.replace(/[\\%_]/g, (c) => `\\${c}`));
  dup = parentId ? dup.eq("parent_id", parentId) : dup.is("parent_id", null);
  const { count } = await dup;
  if (count) return { ok: false, message: "Un dossier porte déjà ce nom ici." };

  const { data, error } = await supabase
    .from("folders")
    .insert({
      organization_id: ws.organization_id,
      workspace_id: ws.id,
      parent_id: parentId,
      name,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, message: dbMessage(error, "Création impossible. Vérifiez vos droits sur cet espace.") };
  }
  refresh();
  return { ok: true, id: data.id };
}

export async function renameItemAction(
  kind: "file" | "folder",
  id: string,
  rawName: string
): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const name = cleanItemName(rawName, kind === "folder" ? 120 : 255);
  if (!name) return { ok: false, message: "Le nom est requis." };

  const table = kind === "folder" ? "folders" : "documents";
  const column = kind === "folder" ? "name" : "title";
  const { data, error } = await supabase
    .from(table)
    .update({ [column]: name })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    return { ok: false, message: "Renommage impossible. Vérifiez vos droits sur cet espace." };
  }
  refresh();
  return { ok: true };
}

/**
 * Déplace des dossiers et des fichiers vers un dossier du même espace (ou sa
 * racine). Refuse de placer un dossier dans lui-même ou un de ses descendants.
 */
export async function moveItemsAction(input: {
  workspaceId: string;
  folderIds: string[];
  documentIds: string[];
  targetFolderId: string | null;
}): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const target = input.targetFolderId;

  if (input.folderIds.length) {
    const { data: all } = await supabase
      .from("folders")
      .select("id, parent_id")
      .eq("workspace_id", input.workspaceId)
      .is("deleted_at", null);
    const tree = (all ?? []) as { id: string; parent_id: string | null }[];
    if (target) {
      if (!tree.some((f) => f.id === target)) return { ok: false, message: "Dossier de destination introuvable." };
      for (const id of input.folderIds) {
        if (collectDescendantIds(tree, id).has(target)) {
          return { ok: false, message: "Impossible de déplacer un dossier dans lui-même ou l'un de ses sous-dossiers." };
        }
      }
    }
    const { error } = await supabase
      .from("folders")
      .update({ parent_id: target })
      .eq("workspace_id", input.workspaceId)
      .in("id", input.folderIds);
    if (error) return { ok: false, message: "Déplacement impossible. Vérifiez vos droits sur cet espace." };
  }

  if (input.documentIds.length) {
    const { error } = await supabase
      .from("documents")
      .update({ folder_id: target })
      .eq("workspace_id", input.workspaceId)
      .in("id", input.documentIds);
    if (error) return { ok: false, message: "Déplacement impossible. Vérifiez vos droits sur cet espace." };
  }

  refresh();
  return { ok: true };
}

// -----------------------------------------------------------------------------
// Corbeille
// -----------------------------------------------------------------------------

export async function trashItemsAction(input: {
  folderIds: string[];
  documentIds: string[];
}): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("drive_trash", {
    p_folder_ids: input.folderIds,
    p_document_ids: input.documentIds,
  });
  if (error) return { ok: false, message: dbMessage(error, "Suppression impossible. Réessayez.") };
  const r = data as { folders: number; documents: number };
  if (!r.folders && !r.documents) {
    return { ok: false, message: "Rien n'a été supprimé : vérifiez vos droits sur cet espace." };
  }
  refresh();
  return { ok: true, count: input.folderIds.length + input.documentIds.length };
}

export async function restoreItemsAction(input: {
  folderIds: string[];
  documentIds: string[];
}): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("drive_restore", {
    p_folder_ids: input.folderIds,
    p_document_ids: input.documentIds,
  });
  if (error) return { ok: false, message: dbMessage(error, "Restauration impossible. Réessayez.") };
  refresh();
  return { ok: true };
}

/**
 * Suppression définitive d'éléments de la corbeille : lignes supprimées sous
 * RLS (le contenu des dossiers part en cascade), puis fichiers et anciennes
 * versions effacés du Storage.
 */
async function purge(
  supabase: Supabase,
  folderIds: string[],
  documentIds: string[]
): Promise<ActionResult> {
  const { data, error } = await supabase.rpc("drive_purge_plan", {
    p_folder_ids: folderIds,
    p_document_ids: documentIds,
  });
  if (error || !data) return { ok: false, message: "Suppression impossible. Réessayez." };
  const plan = data as { folder_ids: string[]; document_ids: string[]; paths: string[] };

  if (plan.folder_ids.length) {
    const { error: e } = await supabase.from("folders").delete().in("id", plan.folder_ids);
    if (e) return { ok: false, message: "Suppression impossible. Vérifiez vos droits sur cet espace." };
  }
  if (plan.document_ids.length) {
    const { error: e } = await supabase.from("documents").delete().in("id", plan.document_ids);
    if (e) return { ok: false, message: "Suppression impossible. Vérifiez vos droits sur cet espace." };
  }
  for (let i = 0; i < plan.paths.length; i += 100) {
    await supabase.storage.from(BUCKET).remove(plan.paths.slice(i, i + 100));
  }
  return { ok: true };
}

export async function purgeItemsAction(input: {
  folderIds: string[];
  documentIds: string[];
}): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const result = await purge(supabase, input.folderIds, input.documentIds);
  if (result.ok) refresh();
  return result;
}

/** Vide la corbeille de l'organisation active (éléments accessibles). */
export async function emptyTrashAction(): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const membership = await getCurrentMembership();
  if (!membership) return { ok: false, message: "Organisation introuvable." };

  const { data } = await supabase
    .from("drive_trash_items")
    .select("kind, id")
    .eq("organization_id", membership.organization.id)
    .limit(1000);
  const rows = (data ?? []) as { kind: string; id: string }[];
  const result = await purge(
    supabase,
    rows.filter((r) => r.kind === "folder").map((r) => r.id),
    rows.filter((r) => r.kind === "file").map((r) => r.id)
  );
  if (result.ok) refresh();
  return result;
}

/**
 * Suppression automatique des éléments restés plus de 30 jours dans la
 * corbeille (appelée à l'ouverture de la corbeille).
 */
export async function purgeExpiredTrash(organizationId: string): Promise<void> {
  const supabase = await createClient();
  const limit = new Date(Date.now() - TRASH_RETENTION_DAYS * 86_400_000).toISOString();
  const { data } = await supabase
    .from("drive_trash_items")
    .select("kind, id")
    .eq("organization_id", organizationId)
    .lt("deleted_at", limit)
    .limit(500);
  const rows = (data ?? []) as { kind: string; id: string }[];
  if (rows.length === 0) return;
  await purge(
    supabase,
    rows.filter((r) => r.kind === "folder").map((r) => r.id),
    rows.filter((r) => r.kind === "file").map((r) => r.id)
  );
}

// -----------------------------------------------------------------------------
// Ouvrir, télécharger, ZIP
// -----------------------------------------------------------------------------

export type FileUrlResult =
  | { ok: true; url: string; name: string; type: string | null; size: number | null }
  | { ok: false; message: string };

/**
 * URL signée de courte durée pour afficher (aperçu) ou télécharger un
 * fichier, ou l'une de ses anciennes versions. Le téléchargement est inscrit
 * au journal.
 */
export async function getFileUrlAction(
  documentId: string,
  options: { download: boolean; versionId?: string | null }
): Promise<FileUrlResult> {
  const { supabase, user } = await requireUser();

  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, file_path, file_type, file_size, workspace_id, organization_id, folder_id")
    .eq("id", documentId)
    .maybeSingle<{
      id: string;
      title: string;
      file_path: string;
      file_type: string | null;
      file_size: number | null;
      workspace_id: string;
      organization_id: string;
      folder_id: string | null;
    }>();
  if (!doc) return { ok: false, message: "Fichier introuvable." };

  let path = doc.file_path;
  let type = doc.file_type;
  let size = doc.file_size;
  if (options.versionId) {
    const { data: ver } = await supabase
      .from("document_versions")
      .select("file_path, file_type, file_size, version")
      .eq("id", options.versionId)
      .eq("document_id", documentId)
      .maybeSingle<{ file_path: string; file_type: string | null; file_size: number | null; version: number }>();
    if (!ver) return { ok: false, message: "Version introuvable." };
    path = ver.file_path;
    type = ver.file_type;
    size = ver.file_size;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, options.download ? 60 : 300, options.download ? { download: doc.title } : undefined);
  if (error || !data?.signedUrl) return { ok: false, message: "Fichier indisponible. Réessayez." };

  if (options.download) {
    await supabase.from("activity_events").insert({
      organization_id: doc.organization_id,
      workspace_id: doc.workspace_id,
      document_id: doc.id,
      folder_id: doc.folder_id,
      actor_id: user.id,
      event_type: "file_downloaded",
      metadata: { title: doc.title, file_size: size, version: options.versionId ? "ancienne" : undefined },
    });
  }

  return { ok: true, url: data.signedUrl, name: doc.title, type, size: size === null ? null : Number(size) };
}

export type ZipEntry = { name: string; url: string; size: number };

const ZIP_MAX_FILES = 1000;
const ZIP_MAX_BYTES = 4 * 1024 * 1024 * 1024;

/**
 * Liste des fichiers d'une sélection (dossiers compris, récursivement) avec
 * une URL signée chacun : le navigateur assemble le ZIP lui-même.
 */
export async function getZipEntriesAction(input: {
  workspaceId: string;
  folderIds: string[];
  documentIds: string[];
}): Promise<{ ok: true; entries: ZipEntry[] } | { ok: false; message: string }> {
  const { supabase, user } = await requireUser();

  const [{ data: folderRows }, ws] = await Promise.all([
    supabase
      .from("folders")
      .select("id, name, parent_id")
      .eq("workspace_id", input.workspaceId)
      .is("deleted_at", null),
    workspaceRef(supabase, input.workspaceId),
  ]);
  if (!ws) return { ok: false, message: "Espace introuvable." };
  const folders = (folderRows ?? []) as { id: string; name: string; parent_id: string | null }[];
  const byId = new Map(folders.map((f) => [f.id, f]));

  // Chemin relatif de chaque dossier sélectionné et de ses descendants.
  const relPath = new Map<string, string>();
  for (const root of input.folderIds) {
    const node = byId.get(root);
    if (!node) continue;
    for (const id of collectDescendantIds(folders, root)) {
      const parts: string[] = [];
      let cur = byId.get(id);
      while (cur) {
        parts.unshift(cur.name);
        if (cur.id === root) break;
        cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
      }
      relPath.set(id, parts.join("/"));
    }
  }

  const selectCols = "id, title, file_path, file_size, folder_id";
  const [inFolders, direct] = await Promise.all([
    relPath.size
      ? supabase
          .from("documents")
          .select(selectCols)
          .eq("workspace_id", input.workspaceId)
          .is("deleted_at", null)
          .in("folder_id", [...relPath.keys()])
      : Promise.resolve({ data: [] }),
    input.documentIds.length
      ? supabase
          .from("documents")
          .select(selectCols)
          .eq("workspace_id", input.workspaceId)
          .is("deleted_at", null)
          .in("id", input.documentIds)
      : Promise.resolve({ data: [] }),
  ]);

  type Row = { id: string; title: string; file_path: string; file_size: number | null; folder_id: string | null };
  const rows: { name: string; path: string; size: number }[] = [];
  const seen = new Set<string>();
  for (const r of (inFolders.data ?? []) as Row[]) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    rows.push({ name: `${relPath.get(r.folder_id ?? "") ?? ""}/${r.title}`.replace(/^\//, ""), path: r.file_path, size: Number(r.file_size ?? 0) });
  }
  for (const r of (direct.data ?? []) as Row[]) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    rows.push({ name: r.title, path: r.file_path, size: Number(r.file_size ?? 0) });
  }

  if (rows.length === 0) return { ok: false, message: "Aucun fichier à télécharger." };
  if (rows.length > ZIP_MAX_FILES) {
    return { ok: false, message: `Trop de fichiers pour un seul ZIP (maximum ${ZIP_MAX_FILES}).` };
  }
  const total = rows.reduce((s, r) => s + r.size, 0);
  if (total > ZIP_MAX_BYTES) {
    return { ok: false, message: `Sélection trop volumineuse pour un ZIP (${formatBytes(total)}, maximum ${formatBytes(ZIP_MAX_BYTES)}).` };
  }

  // Noms uniques dans l'archive.
  const used = new Set<string>();
  for (const r of rows) {
    let name = r.name;
    let i = 1;
    while (used.has(name.toLowerCase())) {
      const dot = r.name.lastIndexOf(".");
      name = dot > 0 ? `${r.name.slice(0, dot)} (${i})${r.name.slice(dot)}` : `${r.name} (${i})`;
      i++;
    }
    used.add(name.toLowerCase());
    r.name = name;
  }

  const entries: ZipEntry[] = [];
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(chunk.map((r) => r.path), 600);
    (data ?? []).forEach((d, j) => {
      if (d.signedUrl) entries.push({ name: chunk[j].name, url: d.signedUrl, size: chunk[j].size });
    });
  }

  await supabase.from("activity_events").insert({
    organization_id: ws.organization_id,
    workspace_id: ws.id,
    actor_id: user.id,
    event_type: "file_downloaded",
    metadata: { zip: true, files: entries.length, file_size: total },
  });

  return { ok: true, entries };
}

// -----------------------------------------------------------------------------
// Versions, visibilité client, détails, recherche
// -----------------------------------------------------------------------------

export async function restoreVersionAction(versionId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("drive_restore_version", { p_version_id: versionId });
  if (error) return { ok: false, message: dbMessage(error, "Restauration impossible. Réessayez.") };
  refresh();
  return { ok: true };
}

export async function deleteVersionAction(versionId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("document_versions")
    .delete()
    .eq("id", versionId)
    .select("file_path");
  if (error || !data?.length) {
    return { ok: false, message: "Suppression impossible. Vérifiez vos droits sur cet espace." };
  }
  await supabase.storage.from(BUCKET).remove((data as { file_path: string }[]).map((d) => d.file_path));
  refresh();
  return { ok: true };
}

/** Rend des fichiers visibles (ou non) sur le portail client de l'espace. */
export async function setClientVisibilityAction(
  documentIds: string[],
  visible: boolean
): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("documents")
    .update({ is_visible_to_client: visible })
    .in("id", documentIds)
    .select("id");
  if (error || !data?.length) return { ok: false, message: "Mise à jour impossible. Réessayez." };
  refresh();
  return { ok: true };
}

export async function getFileDetailsAction(documentId: string): Promise<FileDetails> {
  await requireUser();
  return getFileDetails(documentId);
}

/** Recherche instantanée (palette Ctrl K). */
export async function searchDriveAction(query: string): Promise<SearchResults> {
  await requireUser();
  const membership = await getCurrentMembership();
  if (!membership) return { query, spaces: [], folders: [], files: [] };
  return searchDrive(membership.organization.id, query, 8);
}

/** Miniatures de la vue grille (images uniquement, URL signées 10 min). */
export async function getThumbnailsAction(documentIds: string[]): Promise<Record<string, string>> {
  const { supabase } = await requireUser();
  if (documentIds.length === 0) return {};
  const { data } = await supabase
    .from("documents")
    .select("id, file_path, file_size")
    .in("id", documentIds.slice(0, 120))
    .is("deleted_at", null);
  const rows = ((data ?? []) as { id: string; file_path: string; file_size: number | null }[]).filter(
    (r) => Number(r.file_size ?? 0) <= 15 * 1024 * 1024
  );
  if (rows.length === 0) return {};
  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(rows.map((r) => r.file_path), 600);
  const out: Record<string, string> = {};
  (signed ?? []).forEach((s, i) => {
    if (s.signedUrl) out[rows[i].id] = s.signedUrl;
  });
  return out;
}
