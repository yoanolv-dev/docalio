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
