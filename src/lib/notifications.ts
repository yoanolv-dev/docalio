import { createClient } from "@/lib/supabase/server";
import type {
  AppNotification,
  NotificationMetadata,
  NotificationType,
} from "@/lib/types/database";

// Helpers de présentation (purs, client-safe) ré-exportés pour confort.
export {
  describeNotification,
  notificationHref,
} from "@/lib/notifications-format";
export type { NotificationDescriptor } from "@/lib/notifications-format";

const SELECT =
  "id, organization_id, workspace_id, type, metadata, read_at, created_at, workspaces(name)";

interface NotificationRow {
  id: string;
  organization_id: string;
  workspace_id: string;
  type: NotificationType;
  metadata: NotificationMetadata | null;
  read_at: string | null;
  created_at: string;
  workspaces: { name: string } | null;
}

function mapRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    organization_id: row.organization_id,
    workspace_id: row.workspace_id,
    type: row.type,
    metadata: row.metadata ?? {},
    read_at: row.read_at,
    created_at: row.created_at,
    workspace_name: row.workspaces?.name ?? null,
  };
}

/** Nombre de notifications non lues (RLS : organisation courante). */
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return count ?? 0;
}

/** Notifications les plus récentes (pour la cloche et le dashboard). */
export async function getRecentNotifications(
  limit = 8
): Promise<AppNotification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data as NotificationRow[] | null) ?? []).map(mapRow);
}

/** Liste complète paginée (page Notifications). */
export async function listNotifications(limit = 100): Promise<AppNotification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data as NotificationRow[] | null) ?? []).map(mapRow);
}
