import { createClient } from "@/lib/supabase/server";

/**
 * « À traiter » : ce qui attend une réaction du cabinet, tous espaces
 * confondus. Tout est lu sous RLS (espaces accessibles uniquement) et chaque
 * source est tolérante (migration absente → liste vide, jamais d'erreur).
 */
export type ActionKind =
  | "request_to_review"
  | "request_overdue"
  | "decision_changes"
  | "decision_rejected";

export interface ActionItem {
  id: string;
  kind: ActionKind;
  title: string;
  workspaceId: string;
  workspaceName: string;
  /** Date de référence (dépôt, échéance ou décision). */
  at: string;
  detail: string | null;
}

type WsJoin = { name: string } | { name: string }[] | null;
const wsName = (w: WsJoin) => (Array.isArray(w) ? w[0]?.name : w?.name) ?? "Espace";

export async function getActionItems(limit = 12): Promise<ActionItem[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [toReview, overdue, decisions] = await Promise.all([
    supabase
      .from("document_requests")
      .select("id, title, workspace_id, fulfilled_at, file_name, workspaces(name)")
      .eq("status", "received")
      .order("fulfilled_at", { ascending: false })
      .limit(limit),
    supabase
      .from("document_requests")
      .select("id, title, workspace_id, due_date, status, workspaces(name)")
      .in("status", ["pending", "rejected"])
      .lt("due_date", today)
      .order("due_date", { ascending: true })
      .limit(limit),
    supabase
      .from("document_decisions")
      .select("id, decision, comment, updated_at, workspace_id, documents(title), workspaces(name)")
      .in("decision", ["changes_requested", "rejected"])
      .order("updated_at", { ascending: false })
      .limit(limit),
  ]);

  const items: ActionItem[] = [];

  for (const r of (toReview.data ?? []) as {
    id: string; title: string; workspace_id: string; fulfilled_at: string | null;
    file_name: string | null; workspaces: WsJoin;
  }[]) {
    items.push({
      id: `rv-${r.id}`,
      kind: "request_to_review",
      title: r.title,
      workspaceId: r.workspace_id,
      workspaceName: wsName(r.workspaces),
      at: r.fulfilled_at ?? new Date().toISOString(),
      detail: r.file_name,
    });
  }
  for (const r of (overdue.data ?? []) as {
    id: string; title: string; workspace_id: string; due_date: string; workspaces: WsJoin;
  }[]) {
    items.push({
      id: `od-${r.id}`,
      kind: "request_overdue",
      title: r.title,
      workspaceId: r.workspace_id,
      workspaceName: wsName(r.workspaces),
      at: r.due_date,
      detail: null,
    });
  }
  for (const d of (decisions.data ?? []) as {
    id: string; decision: string; comment: string | null; updated_at: string;
    workspace_id: string; documents: { title: string } | { title: string }[] | null;
    workspaces: WsJoin;
  }[]) {
    const doc = Array.isArray(d.documents) ? d.documents[0] : d.documents;
    items.push({
      id: `dc-${d.id}`,
      kind: d.decision === "rejected" ? "decision_rejected" : "decision_changes",
      title: doc?.title ?? "Document",
      workspaceId: d.workspace_id,
      workspaceName: wsName(d.workspaces),
      at: d.updated_at,
      detail: d.comment,
    });
  }

  // Priorité : à valider, puis modifications demandées, refus, retards.
  const rank: Record<ActionKind, number> = {
    request_to_review: 0,
    decision_changes: 1,
    decision_rejected: 2,
    request_overdue: 3,
  };
  return items
    .sort((a, b) => rank[a.kind] - rank[b.kind] || b.at.localeCompare(a.at))
    .slice(0, limit);
}
