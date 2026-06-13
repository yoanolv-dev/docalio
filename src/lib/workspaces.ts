import { createClient } from "@/lib/supabase/server";
import type { Workspace } from "@/lib/types/database";

/**
 * Liste les workspaces accessibles à l'utilisateur courant.
 * La RLS restreint automatiquement aux workspaces de son organisation.
 */
export async function listWorkspaces(): Promise<Workspace[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Workspace[] | null) ?? [];
}

/** Récupère un workspace par id (null si introuvable ou hors organisation). */
export async function getWorkspace(id: string): Promise<Workspace | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Workspace | null) ?? null;
}

/** Workspace enrichi pour les cartes de la liste (compteurs réels). */
export interface WorkspaceListItem extends Workspace {
  documentCount: number;
  visibleCount: number;
  hasActiveLink: boolean;
  /** Documents visibles sans décision client. */
  pendingDecisions: number;
  lastActivityAt: string | null;
}

/**
 * Liste les workspaces avec leurs métadonnées d'engagement (documents,
 * lien actif, décisions en attente, dernière activité). Quatre requêtes
 * RLS-scopées agrégées côté serveur — pas de N+1.
 */
export async function listWorkspacesWithMeta(): Promise<WorkspaceListItem[]> {
  const supabase = await createClient();

  const [workspaces, docs, links, decisions, events] = await Promise.all([
    listWorkspaces(),
    supabase.from("documents").select("id, workspace_id, is_visible_to_client"),
    supabase.from("share_links").select("workspace_id").eq("is_active", true),
    supabase.from("document_decisions").select("document_id, workspace_id"),
    supabase
      .from("activity_events")
      .select("workspace_id, created_at")
      .order("created_at", { ascending: false })
      .limit(400),
  ]);

  const docRows =
    (docs.data as
      | { id: string; workspace_id: string; is_visible_to_client: boolean }[]
      | null) ?? [];
  const activeLinks = new Set(
    ((links.data as { workspace_id: string }[] | null) ?? []).map(
      (l) => l.workspace_id
    )
  );
  const decidedDocs = new Set(
    ((decisions.data as { document_id: string }[] | null) ?? []).map(
      (d) => d.document_id
    )
  );
  const lastActivity = new Map<string, string>();
  for (const e of (events.data as
    | { workspace_id: string; created_at: string }[]
    | null) ?? []) {
    if (!lastActivity.has(e.workspace_id)) {
      lastActivity.set(e.workspace_id, e.created_at);
    }
  }

  return workspaces.map((w) => {
    const wsDocs = docRows.filter((d) => d.workspace_id === w.id);
    const visible = wsDocs.filter((d) => d.is_visible_to_client);
    return {
      ...w,
      documentCount: wsDocs.length,
      visibleCount: visible.length,
      hasActiveLink: activeLinks.has(w.id),
      pendingDecisions: visible.filter((d) => !decidedDocs.has(d.id)).length,
      lastActivityAt: lastActivity.get(w.id) ?? null,
    };
  });
}

export interface WorkspaceStats {
  total: number;
  prospect: number;
  active: number;
  archived: number;
}

/** Statistiques simples pour le dashboard principal. */
export async function getWorkspaceStats(): Promise<WorkspaceStats> {
  const workspaces = await listWorkspaces();
  return {
    total: workspaces.length,
    prospect: workspaces.filter((w) => w.status === "prospect").length,
    active: workspaces.filter((w) => w.status === "active").length,
    archived: workspaces.filter((w) => w.status === "archived").length,
  };
}
