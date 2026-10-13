import { createClient } from "@/lib/supabase/server";
import { getPeopleNames } from "@/lib/drive";
import { ACTIVITY_FILTERS } from "@/lib/activity-labels";
import type { ActivityEventType } from "@/lib/types/database";

// Journal d'activité de l'organisation (lecture sous RLS : membres, espaces
// accessibles uniquement).

export interface AuditFilters {
  workspaceId?: string | null;
  actorId?: string | null;
  family?: string | null;
  /** Nombre de jours d'historique (7, 30, 90…). */
  days?: number | null;
  /** Pagination : événements antérieurs à cette date. */
  before?: string | null;
}

export interface AuditEvent {
  id: string;
  event_type: ActivityEventType;
  created_at: string;
  workspace_id: string;
  workspace_name: string;
  actor_id: string | null;
  actor_name: string | null;
  visitor_id: string | null;
  metadata: Record<string, unknown>;
}

export async function listAuditEvents(
  organizationId: string,
  filters: AuditFilters,
  limit = 60
): Promise<AuditEvent[]> {
  const supabase = await createClient();
  let q = supabase
    .from("activity_events")
    .select("id, event_type, created_at, workspace_id, actor_id, visitor_id, metadata, workspaces(name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.workspaceId) q = q.eq("workspace_id", filters.workspaceId);
  if (filters.actorId) q = q.eq("actor_id", filters.actorId);
  const family = ACTIVITY_FILTERS.find((f) => f.id === filters.family);
  if (family) q = q.in("event_type", family.types);
  if (filters.days) q = q.gte("created_at", new Date(Date.now() - filters.days * 86_400_000).toISOString());
  if (filters.before) q = q.lt("created_at", filters.before);

  const { data } = await q;
  const rows = (data ?? []) as {
    id: string;
    event_type: ActivityEventType;
    created_at: string;
    workspace_id: string;
    actor_id: string | null;
    visitor_id: string | null;
    metadata: Record<string, unknown> | null;
    workspaces: { name: string } | { name: string }[] | null;
  }[];
  const people = await getPeopleNames(rows.map((r) => r.actor_id));

  return rows.map((r) => {
    const ws = Array.isArray(r.workspaces) ? r.workspaces[0] : r.workspaces;
    return {
      id: r.id,
      event_type: r.event_type,
      created_at: r.created_at,
      workspace_id: r.workspace_id,
      workspace_name: ws?.name ?? "Espace",
      actor_id: r.actor_id,
      actor_name: r.actor_id ? people[r.actor_id] ?? null : null,
      visitor_id: r.visitor_id,
      metadata: r.metadata ?? {},
    };
  });
}
