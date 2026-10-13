import { supabase } from "./supabase";
import { BUCKET, SITE_URL } from "./env";
import {
  buildBreadcrumb,
  cleanItemName,
  collectDescendantIds,
  previewKind,
  type BreadcrumbItem,
  type DriveLink,
  type TrashItem,
  type Workspace,
} from "./shared";

// =============================================================================
// Accès aux données du Drive depuis le mobile. Mêmes requêtes et fonctions SQL
// que le site (src/lib/drive.ts, src/lib/actions/*) : tout passe par la RLS
// avec la session de l'utilisateur, aucune clé de service n'est embarquée.
// =============================================================================

export type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };

/** Message lisible pour une erreur Postgres (exceptions de nos fonctions). */
export function dbMessage(error: { message?: string } | null | undefined, fallback: string): string {
  const msg = error?.message ?? "";
  if (msg.includes("Quota de stockage")) {
    return "Quota de stockage atteint : libérez de l'espace (corbeille comprise) ou passez au forfait supérieur.";
  }
  if (msg.includes("lecture seule")) return "Vous avez un accès en lecture seule à cet espace.";
  if (msg.includes("introuvable")) return msg.replace(/^.*?:\s*/, "");
  return fallback;
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface DriveFolder {
  id: string;
  name: string;
  parent_id: string | null;
  updated_at: string;
  files: number;
  folders: number;
  bytes: number;
  shared: boolean;
}

export interface DriveFile {
  id: string;
  name: string;
  folder_id: string | null;
  file_type: string | null;
  file_size: number | null;
  version: number;
  file_updated_at: string;
  shared: boolean;
}

export interface FolderNode {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface Listing {
  workspace: Workspace;
  canWrite: boolean;
  folderId: string | null;
  breadcrumb: BreadcrumbItem[];
  folders: DriveFolder[];
  files: DriveFile[];
  tree: FolderNode[];
}

export interface LocatedFile extends DriveFile {
  workspace_id: string;
  workspace_name: string;
  location: string;
}

export interface SpaceCard extends Workspace {
  files: number;
  bytes: number;
  lastFileAt: string | null;
}

const FILE_COLUMNS = "id, title, folder_id, file_type, file_size, version, file_updated_at, created_at";

type RawFile = {
  id: string;
  title: string;
  folder_id: string | null;
  file_type: string | null;
  file_size: number | string | null;
  version: number | null;
  file_updated_at: string | null;
  created_at: string;
};

function toFile(row: RawFile, shared?: Set<string>): DriveFile {
  return {
    id: row.id,
    name: row.title,
    folder_id: row.folder_id,
    file_type: row.file_type,
    file_size: row.file_size === null ? null : Number(row.file_size),
    version: row.version ?? 1,
    file_updated_at: row.file_updated_at ?? row.created_at,
    shared: shared?.has(row.id) ?? false,
  };
}

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

// -----------------------------------------------------------------------------
// Lectures
// -----------------------------------------------------------------------------

/** Espaces de l'organisation, du plus récemment alimenté au plus ancien. */
export async function fetchSpaces(organizationId: string): Promise<SpaceCard[]> {
  const [spaces, stats] = await Promise.all([
    supabase.from("workspaces").select("*").eq("organization_id", organizationId).neq("status", "archived"),
    supabase.rpc("drive_workspace_stats", { p_org: organizationId }),
  ]);
  if (spaces.error) throw spaces.error;
  const byId = new Map(
    ((stats.data ?? []) as { workspace_id: string; files: number; bytes: number | string; last_file_at: string | null }[]).map(
      (s) => [s.workspace_id, s],
    ),
  );
  return ((spaces.data ?? []) as Workspace[])
    .map((w) => {
      const s = byId.get(w.id);
      return { ...w, files: s?.files ?? 0, bytes: Number(s?.bytes ?? 0), lastFileAt: s?.last_file_at ?? null };
    })
    .sort((a, b) => new Date(b.lastFileAt ?? b.updated_at).getTime() - new Date(a.lastFileAt ?? a.updated_at).getTime());
}

/** Contenu d'un dossier (ou de la racine) d'un espace. null : espace inaccessible. */
export async function fetchListing(workspaceId: string, folderId: string | null): Promise<Listing | null> {
  const { data: workspace, error } = await supabase.from("workspaces").select("*").eq("id", workspaceId).maybeSingle<Workspace>();
  if (error) throw error;
  if (!workspace) return null;

  const [canWriteRes, foldersRes, linksRes] = await Promise.all([
    supabase.rpc("can_write_workspace", { p_workspace_id: workspaceId }),
    supabase
      .from("folders")
      .select("id, name, parent_id, updated_at")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase.from("drive_links").select("folder_id, document_id, expires_at").eq("workspace_id", workspaceId).eq("is_active", true),
  ]);
  if (foldersRes.error) throw foldersRes.error;

  const now = Date.now();
  const links = ((linksRes.data ?? []) as { folder_id: string | null; document_id: string | null; expires_at: string | null }[]).filter(
    (l) => !l.expires_at || new Date(l.expires_at).getTime() > now,
  );
  const sharedFolders = new Set(links.map((l) => l.folder_id).filter((v): v is string => Boolean(v)));
  const sharedFiles = new Set(links.map((l) => l.document_id).filter((v): v is string => Boolean(v)));

  const all = (foldersRes.data ?? []) as (FolderNode & { updated_at: string })[];
  const current = folderId && all.some((f) => f.id === folderId) ? folderId : null;
  const children = all.filter((f) => (f.parent_id ?? null) === current);

  let filesQuery = supabase
    .from("documents")
    .select(FILE_COLUMNS)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("title", { ascending: true });
  filesQuery = current ? filesQuery.eq("folder_id", current) : filesQuery.is("folder_id", null);

  const [filesRes, statsRes] = await Promise.all([
    filesQuery,
    children.length ? supabase.rpc("drive_folder_stats", { p_folder_ids: children.map((f) => f.id) }) : Promise.resolve({ data: [] }),
  ]);
  if (filesRes.error) throw filesRes.error;

  const stats = new Map(
    ((statsRes.data ?? []) as { folder_id: string; files: number; folders: number; bytes: number | string }[]).map((s) => [s.folder_id, s]),
  );

  return {
    workspace,
    canWrite: Boolean(canWriteRes.data),
    folderId: current,
    breadcrumb: buildBreadcrumb(all, current),
    folders: children.map((f) => {
      const s = stats.get(f.id);
      return {
        id: f.id,
        name: f.name,
        parent_id: f.parent_id,
        updated_at: f.updated_at,
        files: s?.files ?? 0,
        folders: s?.folders ?? 0,
        bytes: Number(s?.bytes ?? 0),
        shared: sharedFolders.has(f.id),
      };
    }),
    files: ((filesRes.data ?? []) as RawFile[]).map((r) => toFile(r, sharedFiles)),
    tree: all.map((f) => ({ id: f.id, name: f.name, parent_id: f.parent_id })),
  };
}

/** Miniatures des images (URL signées 10 min). */
export async function fetchThumbnails(files: DriveFile[]): Promise<Record<string, string>> {
  const images = files.filter(
    (f) => previewKind(f.name, f.file_type, f.file_size) === "image" && Number(f.file_size ?? 0) <= 15 * 1024 * 1024,
  );
  if (images.length === 0) return {};
  const { data: rows } = await supabase
    .from("documents")
    .select("id, file_path")
    .in("id", images.slice(0, 120).map((f) => f.id));
  const list = (rows ?? []) as { id: string; file_path: string }[];
  if (list.length === 0) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(list.map((r) => r.file_path), 600);
  const out: Record<string, string> = {};
  (data ?? []).forEach((s, i) => {
    if (s.signedUrl) out[list[i].id] = s.signedUrl;
  });
  return out;
}

function folderPath(folderId: string | null, byId: Map<string, FolderNode>): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  let cur = folderId ? byId.get(folderId) : undefined;
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    parts.unshift(cur.name);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return parts.join(" › ");
}

async function folderIndex(workspaceIds: string[]) {
  if (workspaceIds.length === 0) return new Map<string, FolderNode>();
  const { data } = await supabase.from("folders").select("id, name, parent_id").in("workspace_id", workspaceIds).is("deleted_at", null);
  return new Map(((data ?? []) as FolderNode[]).map((f) => [f.id, f]));
}

type RawLocated = RawFile & { workspace_id: string; workspaces: { name: string } | { name: string }[] | null };

async function locate(rows: RawLocated[]): Promise<LocatedFile[]> {
  const index = await folderIndex([...new Set(rows.map((r) => r.workspace_id))]);
  return rows.map((r) => ({
    ...toFile(r),
    workspace_id: r.workspace_id,
    workspace_name: one(r.workspaces)?.name ?? "Espace",
    location: folderPath(r.folder_id, index),
  }));
}

export async function fetchRecents(organizationId: string, limit = 40): Promise<LocatedFile[]> {
  const { data, error } = await supabase
    .from("documents")
    .select(`${FILE_COLUMNS}, workspace_id, workspaces(name)`)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("file_updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return locate((data ?? []) as RawLocated[]);
}

export interface SearchResults {
  spaces: { id: string; name: string; space_type: Workspace["space_type"] }[];
  folders: { id: string; name: string; workspace_id: string; workspace_name: string; location: string }[];
  files: LocatedFile[];
}

const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export async function searchDrive(organizationId: string, raw: string): Promise<SearchResults> {
  const query = raw.trim().slice(0, 100);
  if (query.length < 2) return { spaces: [], folders: [], files: [] };
  const pattern = likePattern(query);
  const [spaces, folders, files] = await Promise.all([
    supabase.from("workspaces").select("id, name, space_type").eq("organization_id", organizationId).ilike("name", pattern).limit(8),
    supabase
      .from("folders")
      .select("id, name, parent_id, workspace_id, workspaces(name)")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .ilike("name", pattern)
      .limit(30),
    supabase
      .from("documents")
      .select(`${FILE_COLUMNS}, workspace_id, workspaces(name)`)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .ilike("title", pattern)
      .order("file_updated_at", { ascending: false })
      .limit(40),
  ]);
  const folderRows = (folders.data ?? []) as (FolderNode & { workspace_id: string; workspaces: { name: string } | { name: string }[] | null })[];
  const fileRows = (files.data ?? []) as RawLocated[];
  const index = await folderIndex([...new Set([...folderRows, ...fileRows].map((r) => r.workspace_id))]);
  return {
    spaces: (spaces.data ?? []) as SearchResults["spaces"],
    folders: folderRows.map((f) => ({
      id: f.id,
      name: f.name,
      workspace_id: f.workspace_id,
      workspace_name: one(f.workspaces)?.name ?? "Espace",
      location: folderPath(f.parent_id, index),
    })),
    files: fileRows.map((r) => ({
      ...toFile(r),
      workspace_id: r.workspace_id,
      workspace_name: one(r.workspaces)?.name ?? "Espace",
      location: folderPath(r.folder_id, index),
    })),
  };
}

export interface TrashEntry extends TrashItem {
  workspace_name: string;
  purge_at: string;
}

export const TRASH_RETENTION_DAYS = 30;

export async function fetchTrash(organizationId: string): Promise<TrashEntry[]> {
  const { data, error } = await supabase
    .from("drive_trash_items")
    .select("*")
    .eq("organization_id", organizationId)
    .order("deleted_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  const rows = (data ?? []) as TrashItem[];
  const ids = [...new Set(rows.map((r) => r.workspace_id))];
  const { data: spaces } = ids.length ? await supabase.from("workspaces").select("id, name").in("id", ids) : { data: [] };
  const names = new Map(((spaces ?? []) as { id: string; name: string }[]).map((w) => [w.id, w.name]));
  return rows.map((r) => ({
    ...r,
    size: Number(r.size ?? 0),
    workspace_name: names.get(r.workspace_id) ?? "Espace",
    purge_at: new Date(new Date(r.deleted_at).getTime() + TRASH_RETENTION_DAYS * 86_400_000).toISOString(),
  }));
}

export interface FileMeta {
  id: string;
  name: string;
  file_type: string | null;
  file_size: number | null;
  version: number;
  workspace_id: string;
  folder_id: string | null;
  file_updated_at: string;
}

export async function fetchFile(documentId: string): Promise<FileMeta | null> {
  const { data } = await supabase
    .from("documents")
    .select("id, title, file_type, file_size, version, workspace_id, folder_id, file_updated_at, created_at")
    .eq("id", documentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return null;
  const r = data as RawFile & { workspace_id: string };
  return { ...toFile(r), workspace_id: r.workspace_id };
}

/**
 * URL signée de courte durée pour afficher ou télécharger un fichier.
 * Le téléchargement est inscrit au journal, comme sur le site.
 */
export async function fileUrl(documentId: string, download: boolean): Promise<Result<{ url: string; name: string; type: string | null }>> {
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
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, download ? 120 : 600);
  if (error || !data?.signedUrl) return { ok: false, message: "Fichier indisponible. Réessayez." };
  const { data: auth } = download ? await supabase.auth.getSession() : { data: { session: null } };
  if (download && auth.session) {
    await supabase.from("activity_events").insert({
      organization_id: doc.organization_id,
      workspace_id: doc.workspace_id,
      document_id: doc.id,
      folder_id: doc.folder_id,
      actor_id: auth.session.user.id,
      event_type: "file_downloaded",
      metadata: { title: doc.title, file_size: doc.file_size, mobile: true },
    });
  }
  return { ok: true, url: data.signedUrl, name: doc.title, type: doc.file_type };
}

// -----------------------------------------------------------------------------
// Écritures
// -----------------------------------------------------------------------------

export async function createSpace(input: {
  organizationId: string;
  userId: string;
  name: string;
  private: boolean;
}): Promise<Result<{ id: string }>> {
  const name = input.name.trim().slice(0, 120);
  if (!name) return { ok: false, message: "Indiquez le nom de l'espace." };
  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      organization_id: input.organizationId,
      created_by: input.userId,
      name,
      space_type: input.private ? "internal" : "external",
      status: "active",
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: "Création impossible. Vérifiez vos droits." };
  return { ok: true, id: (data as { id: string }).id };
}

export async function createFolder(input: {
  organizationId: string;
  workspaceId: string;
  parentId: string | null;
  userId: string;
  name: string;
}): Promise<Result<{ id: string }>> {
  const name = cleanItemName(input.name, 120);
  if (!name) return { ok: false, message: "Le nom du dossier est requis." };
  let dup = supabase
    .from("folders")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", input.workspaceId)
    .is("deleted_at", null)
    .ilike("name", name.replace(/[\\%_]/g, (c) => `\\${c}`));
  dup = input.parentId ? dup.eq("parent_id", input.parentId) : dup.is("parent_id", null);
  const { count } = await dup;
  if (count) return { ok: false, message: "Un dossier porte déjà ce nom ici." };
  const { data, error } = await supabase
    .from("folders")
    .insert({
      organization_id: input.organizationId,
      workspace_id: input.workspaceId,
      parent_id: input.parentId,
      name,
      created_by: input.userId,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: dbMessage(error, "Création impossible. Vérifiez vos droits sur cet espace.") };
  return { ok: true, id: (data as { id: string }).id };
}

export async function renameItem(kind: "file" | "folder", id: string, raw: string): Promise<Result> {
  const name = cleanItemName(raw, kind === "folder" ? 120 : 255);
  if (!name) return { ok: false, message: "Le nom est requis." };
  const { data, error } = await supabase
    .from(kind === "folder" ? "folders" : "documents")
    .update({ [kind === "folder" ? "name" : "title"]: name })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { ok: false, message: "Renommage impossible. Vérifiez vos droits sur cet espace." };
  return { ok: true };
}

export async function moveItems(input: {
  workspaceId: string;
  tree: FolderNode[];
  folderIds: string[];
  documentIds: string[];
  targetFolderId: string | null;
}): Promise<Result> {
  const target = input.targetFolderId;
  if (target) {
    for (const id of input.folderIds) {
      if (collectDescendantIds(input.tree, id).has(target)) {
        return { ok: false, message: "Impossible de déplacer un dossier dans lui-même ou l'un de ses sous-dossiers." };
      }
    }
  }
  if (input.folderIds.length) {
    const { error } = await supabase.from("folders").update({ parent_id: target }).eq("workspace_id", input.workspaceId).in("id", input.folderIds);
    if (error) return { ok: false, message: "Déplacement impossible. Vérifiez vos droits sur cet espace." };
  }
  if (input.documentIds.length) {
    const { error } = await supabase.from("documents").update({ folder_id: target }).eq("workspace_id", input.workspaceId).in("id", input.documentIds);
    if (error) return { ok: false, message: "Déplacement impossible. Vérifiez vos droits sur cet espace." };
  }
  return { ok: true };
}

export async function trashItems(input: { folderIds: string[]; documentIds: string[] }): Promise<Result> {
  const { data, error } = await supabase.rpc("drive_trash", { p_folder_ids: input.folderIds, p_document_ids: input.documentIds });
  if (error) return { ok: false, message: dbMessage(error, "Suppression impossible. Réessayez.") };
  const r = data as { folders: number; documents: number };
  if (!r.folders && !r.documents) return { ok: false, message: "Rien n'a été supprimé : vérifiez vos droits sur cet espace." };
  return { ok: true };
}

export async function restoreItems(input: { folderIds: string[]; documentIds: string[] }): Promise<Result> {
  const { error } = await supabase.rpc("drive_restore", { p_folder_ids: input.folderIds, p_document_ids: input.documentIds });
  if (error) return { ok: false, message: dbMessage(error, "Restauration impossible. Réessayez.") };
  return { ok: true };
}

/** Suppression définitive : lignes supprimées sous RLS, puis fichiers et versions effacés du Storage. */
export async function purgeItems(input: { folderIds: string[]; documentIds: string[] }): Promise<Result> {
  const { data, error } = await supabase.rpc("drive_purge_plan", { p_folder_ids: input.folderIds, p_document_ids: input.documentIds });
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

export type LinkPermission = "view" | "download" | "upload";

export function linkUrl(token: string): string {
  return `${SITE_URL}/s/${token}`;
}

export async function listLinks(target: { workspaceId: string; folderId: string | null; documentId: string | null }): Promise<DriveLink[]> {
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
  const now = Date.now();
  return ((data ?? []) as DriveLink[]).filter((l) => !l.expires_at || new Date(l.expires_at).getTime() > now);
}

export async function createLink(input: {
  workspaceId: string;
  folderId: string | null;
  documentId: string | null;
  permission: LinkPermission;
  expiresAt: string | null;
  password: string | null;
}): Promise<Result<{ url: string }>> {
  const { data, error } = await supabase.rpc("create_drive_link", {
    p_workspace_id: input.workspaceId,
    p_folder_id: input.folderId,
    p_document_id: input.documentId,
    p_can_view: input.permission !== "upload",
    p_can_download: input.permission === "download",
    p_can_upload: input.documentId ? false : input.permission === "upload",
    p_expires_at: input.expiresAt,
    p_password: input.password?.trim() || null,
    p_label: "Mobile",
  });
  if (error || !data) {
    const known = ["Mot de passe trop court", "Date d'expiration passée"].find((k) => error?.message?.includes(k));
    return { ok: false, message: known ? `${known}.` : "Création du lien impossible. Vérifiez vos droits sur cet espace." };
  }
  return { ok: true, url: linkUrl((data as { token: string }).token) };
}

export async function revokeLink(linkId: string): Promise<Result> {
  const { data, error } = await supabase.from("drive_links").update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq("id", linkId).select("id");
  if (error || !data?.length) return { ok: false, message: "Révocation impossible. Vérifiez vos droits sur cet espace." };
  return { ok: true };
}
