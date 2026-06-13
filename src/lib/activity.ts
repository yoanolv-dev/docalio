import { createClient } from "@/lib/supabase/server";
import type { ActivityEvent, ActivityEventType } from "@/lib/types/database";

export interface WorkspaceActivity {
  totalOpens: number;
  totalDownloads: number;
  documentsDownloaded: number;
  lastOpenAt: string | null;
  lastDownloadAt: string | null;
  timeline: ActivityEvent[];
  /** Documents consultés (aperçu) par le client — pour dériver leur état. */
  viewedDocumentIds: string[];
  /** Documents téléchargés par le client — pour dériver leur état. */
  downloadedDocumentIds: string[];
}

type TimelineRow = {
  id: string;
  event_type: ActivityEventType;
  document_id: string | null;
  visitor_id: string | null;
  created_at: string;
  documents: { title: string } | null;
};

/**
 * Activité client d'un workspace (stats d'engagement + timeline récente).
 * RLS : ne renvoie que les évènements de l'organisation de l'utilisateur.
 */
export async function getWorkspaceActivity(
  workspaceId: string
): Promise<WorkspaceActivity> {
  const supabase = await createClient();

  const [opensCount, downloads, opened, lastOpen, timeline] = await Promise.all([
    supabase
      .from("activity_events")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("event_type", "portal_opened"),
    supabase
      .from("activity_events")
      .select("document_id, created_at")
      .eq("workspace_id", workspaceId)
      .eq("event_type", "document_downloaded")
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_events")
      .select("document_id")
      .eq("workspace_id", workspaceId)
      .eq("event_type", "document_opened")
      .not("document_id", "is", null),
    supabase
      .from("activity_events")
      .select("created_at")
      .eq("workspace_id", workspaceId)
      .eq("event_type", "portal_opened")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("activity_events")
      .select("id, event_type, document_id, visitor_id, created_at, documents(title)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const downloadRows =
    (downloads.data as { document_id: string | null; created_at: string }[] | null) ??
    [];
  const distinctDocs = new Set(
    downloadRows
      .map((r) => r.document_id)
      .filter((id): id is string => Boolean(id))
  );
  const openedRows =
    (opened.data as { document_id: string | null }[] | null) ?? [];
  const viewedDocs = new Set(
    openedRows
      .map((r) => r.document_id)
      .filter((id): id is string => Boolean(id))
  );

  const timelineRows = (timeline.data as TimelineRow[] | null) ?? [];

  return {
    totalOpens: opensCount.count ?? 0,
    totalDownloads: downloadRows.length,
    documentsDownloaded: distinctDocs.size,
    viewedDocumentIds: [...viewedDocs],
    downloadedDocumentIds: [...distinctDocs],
    lastOpenAt: (lastOpen.data as { created_at: string } | null)?.created_at ?? null,
    lastDownloadAt: downloadRows[0]?.created_at ?? null,
    timeline: timelineRows.map((row) => ({
      id: row.id,
      event_type: row.event_type,
      document_id: row.document_id,
      document_title: row.documents?.title ?? null,
      visitor_id: row.visitor_id,
      created_at: row.created_at,
    })),
  };
}
