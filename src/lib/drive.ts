import { createClient } from "@/lib/supabase/server";
import { buildBreadcrumb, type BreadcrumbItem } from "@/lib/folder-tree";
import type {
  ActivityEventType,
  DocumentVersion,
  DriveLink,
  TrashItem,
  Workspace,
} from "@/lib/types/database";

// =============================================================================
// Drive : lectures côté serveur. Toutes passent par la RLS (client Supabase de
// l'utilisateur) : chacun ne voit que les espaces auxquels il a accès.
// =============================================================================

/** Dossier tel qu'affiché dans l'explorateur. */
export interface DriveFolder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  /** Fichiers et sous-dossiers directs, octets de tout le sous-arbre. */
  files: number;
  folders: number;
  bytes: number;
  /** Un lien de partage actif cible ce dossier. */
  shared: boolean;
}

/** Fichier tel qu'affiché dans l'explorateur. */
export interface DriveFile {
  id: string;
  name: string;
  folder_id: string | null;
  file_type: string | null;
  file_size: number | null;
  version: number;
  file_updated_at: string;
  file_updated_by: string | null;
  created_at: string;
  created_by: string | null;
  is_visible_to_client: boolean;
  allow_download: boolean;
  shared: boolean;
}

/** Nœud de l'arborescence complète (déplacement, glisser-déposer). */
export interface FolderNode {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface DriveListing {
  workspace: Workspace;
  canWrite: boolean;
  folderId: string | null;
  breadcrumb: BreadcrumbItem[];
  folders: DriveFolder[];
  files: DriveFile[];
  tree: FolderNode[];
  /** Un lien de partage actif cible l'espace entier. */
  spaceShared: boolean;
  /** Noms des personnes citées (auteurs), par id. */
  people: Record<string, string>;
}

const FILE_COLUMNS =
  "id, title, folder_id, file_type, file_size, version, file_updated_at, file_updated_by, created_at, created_by, is_visible_to_client, allow_download";

type RawFile = {
  id: string;
  title: string;
  folder_id: string | null;
  file_type: string | null;
  file_size: number | string | null;
  version: number;
  file_updated_at: string;
  file_updated_by: string | null;
  created_at: string;
  created_by: string | null;
  is_visible_to_client: boolean;
  allow_download: boolean;
};

function toFile(row: RawFile, shared: Set<string>): DriveFile {
  return {
    id: row.id,
    name: row.title,
    folder_id: row.folder_id,
    file_type: row.file_type,
    file_size: row.file_size === null ? null : Number(row.file_size),
    version: row.version ?? 1,
    file_updated_at: row.file_updated_at ?? row.created_at,
    file_updated_by: row.file_updated_by ?? row.created_by,
    created_at: row.created_at,
    created_by: row.created_by,
    is_visible_to_client: row.is_visible_to_client,
    allow_download: row.allow_download,
    shared: shared.has(row.id),
  };
}

/** Noms affichables (nom complet, sinon e-mail) des profils visibles. */
export async function getPeopleNames(
  ids: (string | null | undefined)[]
): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", unique);
  const out: Record<string, string> = {};
  for (const p of (data ?? []) as { id: string; full_name: string | null; email: string | null }[]) {
    out[p.id] = p.full_name || p.email || "Utilisateur";
  }
  return out;
}

/** Liens actifs (non expirés) d'un espace : cibles partagées. */
async function activeLinkTargets(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("drive_links")
    .select("folder_id, document_id, expires_at")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true);
  const now = Date.now();
  const rows = ((data ?? []) as { folder_id: string | null; document_id: string | null; expires_at: string | null }[])
    .filter((l) => !l.expires_at || new Date(l.expires_at).getTime() > now);
  return {
    folders: new Set(rows.map((l) => l.folder_id).filter((v): v is string => Boolean(v))),
    files: new Set(rows.map((l) => l.document_id).filter((v): v is string => Boolean(v))),
    space: rows.some((l) => !l.folder_id && !l.document_id),
  };
}

/**
 * Contenu d'un dossier (ou de la racine) d'un espace, avec l'arborescence
 * complète pour le déplacement. Renvoie null si l'espace est inaccessible.
 */
export async function getDriveListing(
  workspaceId: string,
  folderId: string | null
): Promise<DriveListing | null> {
  const supabase = await createClient();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .maybeSingle<Workspace>();
  if (!workspace) return null;

  const [canWriteRes, foldersRes, links] = await Promise.all([
    supabase.rpc("can_write_workspace", { p_workspace_id: workspaceId }),
    supabase
      .from("folders")
      .select("id, name, parent_id, created_at, updated_at, created_by")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    activeLinkTargets(workspaceId),
  ]);

  const allFolders = (foldersRes.data ?? []) as Omit<DriveFolder, "files" | "folders" | "bytes" | "shared">[];
  const current = folderId && allFolders.some((f) => f.id === folderId) ? folderId : null;

  let filesQuery = supabase
    .from("documents")
    .select(FILE_COLUMNS)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("title", { ascending: true });
  filesQuery = current ? filesQuery.eq("folder_id", current) : filesQuery.is("folder_id", null);

  const children = allFolders.filter((f) => (f.parent_id ?? null) === current);
  const [filesRes, statsRes] = await Promise.all([
    filesQuery,
    children.length
      ? supabase.rpc("drive_folder_stats", { p_folder_ids: children.map((f) => f.id) })
      : Promise.resolve({ data: [] }),
  ]);

  const stats = new Map(
    ((statsRes.data ?? []) as { folder_id: string; files: number; folders: number; bytes: number | string }[]).map(
      (s) => [s.folder_id, s]
    )
  );

  const files = ((filesRes.data ?? []) as RawFile[]).map((row) => toFile(row, links.files));
  const folders: DriveFolder[] = children.map((f) => {
    const s = stats.get(f.id);
    return {
      ...f,
      files: s?.files ?? 0,
      folders: s?.folders ?? 0,
      bytes: Number(s?.bytes ?? 0),
      shared: links.folders.has(f.id),
    };
  });

  const people = await getPeopleNames([
    ...files.map((f) => f.file_updated_by),
    ...folders.map((f) => f.created_by),
  ]);

  const tree: FolderNode[] = allFolders.map((f) => ({ id: f.id, name: f.name, parent_id: f.parent_id }));

  return {
    workspace,
    canWrite: Boolean(canWriteRes.data),
    folderId: current,
    breadcrumb: buildBreadcrumb(allFolders, current),
    folders,
    files,
    tree,
    spaceShared: links.space,
    people,
  };
}

/** Espace accessible et visible dans la navigation. */
export interface NavSpace {
  id: string;
  name: string;
  space_type: Workspace["space_type"];
  status: Workspace["status"];
  primary_color: string | null;
  logo_url: string | null;
}

/** Espaces de l'organisation active, pour la barre latérale. */
export async function listNavSpaces(organizationId: string): Promise<NavSpace[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workspaces")
    .select("id, name, space_type, status, primary_color, logo_url")
    .eq("organization_id", organizationId)
    .neq("status", "archived")
    .order("name", { ascending: true });
  return (data ?? []) as NavSpace[];
}

/** Carte d'espace de l'accueil. */
export interface SpaceCard extends Workspace {
  files: number;
  bytes: number;
  lastFileAt: string | null;
}

export async function listSpaceCards(organizationId: string): Promise<SpaceCard[]> {
  const supabase = await createClient();
  const [spaces, stats] = await Promise.all([
    supabase
      .from("workspaces")
      .select("*")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false }),
    supabase.rpc("drive_workspace_stats", { p_org: organizationId }),
  ]);
  const byId = new Map(
    ((stats.data ?? []) as { workspace_id: string; files: number; bytes: number | string; last_file_at: string | null }[]).map(
      (s) => [s.workspace_id, s]
    )
  );
  return ((spaces.data ?? []) as Workspace[])
    .map((w) => {
      const s = byId.get(w.id);
      return {
        ...w,
        files: s?.files ?? 0,
        bytes: Number(s?.bytes ?? 0),
        lastFileAt: s?.last_file_at ?? null,
      };
    })
    .sort((a, b) => {
      const ta = new Date(a.lastFileAt ?? a.updated_at).getTime();
      const tb = new Date(b.lastFileAt ?? b.updated_at).getTime();
      return tb - ta;
    });
}

/** Fichier avec sa localisation (récents, recherche). */
export interface LocatedFile extends DriveFile {
  workspace_id: string;
  workspace_name: string;
  /** « Dossier › Sous-dossier » (vide à la racine de l'espace). */
  location: string;
}

/** Chemin lisible d'un dossier à partir d'une table id → nœud. */
function folderPath(
  folderId: string | null,
  byId: Map<string, FolderNode>
): string {
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
  const supabase = await createClient();
  const { data } = await supabase
    .from("folders")
    .select("id, name, parent_id")
    .in("workspace_id", workspaceIds)
    .is("deleted_at", null);
  return new Map(((data ?? []) as FolderNode[]).map((f) => [f.id, f]));
}

type RawLocatedFile = RawFile & {
  workspace_id: string;
  workspaces: { name: string } | { name: string }[] | null;
};

async function locate(rows: RawLocatedFile[]): Promise<LocatedFile[]> {
  const index = await folderIndex([...new Set(rows.map((r) => r.workspace_id))]);
  const empty = new Set<string>();
  return rows.map((r) => {
    const ws = Array.isArray(r.workspaces) ? r.workspaces[0] : r.workspaces;
    return {
      ...toFile(r, empty),
      workspace_id: r.workspace_id,
      workspace_name: ws?.name ?? "Espace",
      location: folderPath(r.folder_id, index),
    };
  });
}

/** Derniers fichiers déposés ou modifiés dans l'organisation active. */
export async function listRecentFiles(
  organizationId: string,
  limit = 30
): Promise<LocatedFile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select(`${FILE_COLUMNS}, workspace_id, workspaces(name)`)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("file_updated_at", { ascending: false })
    .limit(limit);
  return locate((data ?? []) as RawLocatedFile[]);
}

export interface SearchFolderResult {
  id: string;
  name: string;
  workspace_id: string;
  workspace_name: string;
  location: string;
}

export interface SearchResults {
  query: string;
  spaces: { id: string; name: string; space_type: Workspace["space_type"] }[];
  folders: SearchFolderResult[];
  files: LocatedFile[];
}

/** Échappe les jokers SQL d'une saisie utilisateur pour un ILIKE. */
function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** Recherche par nom dans les espaces, dossiers et fichiers accessibles. */
export async function searchDrive(
  organizationId: string,
  rawQuery: string,
  limit = 40
): Promise<SearchResults> {
  const query = rawQuery.trim().slice(0, 100);
  if (query.length < 2) return { query, spaces: [], folders: [], files: [] };

  const supabase = await createClient();
  const pattern = likePattern(query);
  const [spaces, folders, files] = await Promise.all([
    supabase
      .from("workspaces")
      .select("id, name, space_type")
      .eq("organization_id", organizationId)
      .ilike("name", pattern)
      .limit(8),
    supabase
      .from("folders")
      .select("id, name, parent_id, workspace_id, workspaces(name)")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .ilike("name", pattern)
      .limit(limit),
    supabase
      .from("documents")
      .select(`${FILE_COLUMNS}, workspace_id, workspaces(name)`)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .ilike("title", pattern)
      .order("file_updated_at", { ascending: false })
      .limit(limit),
  ]);

  const folderRows = (folders.data ?? []) as (FolderNode & {
    workspace_id: string;
    workspaces: { name: string } | { name: string }[] | null;
  })[];
  const fileRows = (files.data ?? []) as RawLocatedFile[];
  const index = await folderIndex([
    ...new Set([...folderRows.map((f) => f.workspace_id), ...fileRows.map((f) => f.workspace_id)]),
  ]);

  return {
    query,
    spaces: (spaces.data ?? []) as SearchResults["spaces"],
    folders: folderRows.map((f) => {
      const ws = Array.isArray(f.workspaces) ? f.workspaces[0] : f.workspaces;
      return {
        id: f.id,
        name: f.name,
        workspace_id: f.workspace_id,
        workspace_name: ws?.name ?? "Espace",
        location: folderPath(f.parent_id, index),
      };
    }),
    files: fileRows.map((r) => {
      const ws = Array.isArray(r.workspaces) ? r.workspaces[0] : r.workspaces;
      return {
        ...toFile(r, new Set()),
        workspace_id: r.workspace_id,
        workspace_name: ws?.name ?? "Espace",
        location: folderPath(r.folder_id, index),
      };
    }),
  };
}

/** Élément de corbeille enrichi (espace, auteur de la suppression). */
export interface TrashEntry extends TrashItem {
  workspace_name: string;
  deleted_by_name: string | null;
  /** Date de suppression définitive automatique. */
  purge_at: string;
}

export const TRASH_RETENTION_DAYS = 30;

export async function listTrash(organizationId: string): Promise<TrashEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("drive_trash_items")
    .select("*")
    .eq("organization_id", organizationId)
    .order("deleted_at", { ascending: false })
    .limit(500);
  const rows = (data ?? []) as TrashItem[];

  const wsIds = [...new Set(rows.map((r) => r.workspace_id))];
  const [spaces, people] = await Promise.all([
    wsIds.length
      ? supabase.from("workspaces").select("id, name").in("id", wsIds)
      : Promise.resolve({ data: [] }),
    getPeopleNames(rows.map((r) => r.deleted_by)),
  ]);
  const names = new Map(((spaces.data ?? []) as { id: string; name: string }[]).map((w) => [w.id, w.name]));

  return rows.map((r) => ({
    ...r,
    size: Number(r.size ?? 0),
    workspace_name: names.get(r.workspace_id) ?? "Espace",
    deleted_by_name: r.deleted_by ? people[r.deleted_by] ?? null : null,
    purge_at: new Date(new Date(r.deleted_at).getTime() + TRASH_RETENTION_DAYS * 86_400_000).toISOString(),
  }));
}

/** Détails d'un fichier : versions, liens et activité. */
export interface FileDetails {
  versions: (DocumentVersion & { created_by_name: string | null })[];
  links: DriveLink[];
  activity: {
    id: string;
    event_type: ActivityEventType;
    actor_name: string | null;
    visitor: boolean;
    metadata: Record<string, unknown>;
    created_at: string;
  }[];
}

export async function getFileDetails(documentId: string): Promise<FileDetails> {
  const supabase = await createClient();
  const [versions, links, events] = await Promise.all([
    supabase
      .from("document_versions")
      .select("id, document_id, workspace_id, version, file_path, file_size, file_type, created_by, created_at")
      .eq("document_id", documentId)
      .order("version", { ascending: false }),
    supabase
      .from("drive_links")
      .select("*")
      .eq("document_id", documentId)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_events")
      .select("id, event_type, actor_id, visitor_id, metadata, created_at")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const versionRows = (versions.data ?? []) as DocumentVersion[];
  const eventRows = (events.data ?? []) as {
    id: string;
    event_type: ActivityEventType;
    actor_id: string | null;
    visitor_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }[];
  const people = await getPeopleNames([
    ...versionRows.map((v) => v.created_by),
    ...eventRows.map((e) => e.actor_id),
  ]);

  return {
    versions: versionRows.map((v) => ({
      ...v,
      file_size: v.file_size === null ? null : Number(v.file_size),
      created_by_name: v.created_by ? people[v.created_by] ?? null : null,
    })),
    links: (links.data ?? []) as DriveLink[],
    activity: eventRows.map((e) => ({
      id: e.id,
      event_type: e.event_type,
      actor_name: e.actor_id ? people[e.actor_id] ?? null : null,
      visitor: !e.actor_id,
      metadata: e.metadata ?? {},
      created_at: e.created_at,
    })),
  };
}
